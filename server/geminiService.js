import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import net from "net";

function isPrivateOrLoopbackHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) return true;
  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    host === "[::1]"
  ) {
    return true;
  }

  const cleanIp = host.replace(/^\[|\]$/g, "");
  const ipVersion = net.isIP(cleanIp);
  if (ipVersion === 4) {
    const parts = cleanIp.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  } else if (ipVersion === 6) {
    const lower = cleanIp.toLowerCase();
    if (
      lower === "::1" ||
      lower === "::" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80") ||
      lower.startsWith("::ffff:127.") ||
      lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:192.168.")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Strictly validates Enterprise BYO-API base endpoint URLs to prevent SSRF attacks.
 * Only external HTTPS URLs without credentials or private/loopback addresses are permitted.
 */
export function validateSafeExternalHttpsEndpoint(rawEndpoint) {
  if (!rawEndpoint) return null;
  const trimmed = String(rawEndpoint).trim();
  if (!trimmed) return null;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    const err = new Error("BYO-API endpoint must be a valid HTTPS URL.");
    err.status = 400;
    err.code = "INVALID_BYO_ENDPOINT";
    throw err;
  }

  if (parsed.protocol !== "https:") {
    const err = new Error("BYO-API endpoint must strictly use HTTPS protocol.");
    err.status = 400;
    err.code = "INVALID_BYO_ENDPOINT";
    throw err;
  }

  if (parsed.username || parsed.password) {
    const err = new Error("BYO-API endpoint URL must not embed credentials.");
    err.status = 400;
    err.code = "INVALID_BYO_ENDPOINT";
    throw err;
  }

  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    const err = new Error("BYO-API endpoint cannot target localhost, loopback, or private network addresses.");
    err.status = 400;
    err.code = "INVALID_BYO_ENDPOINT";
    throw err;
  }

  return parsed.toString().replace(/\/+$/, "");
}

/**
 * Returns a configured server-side Gemini client.
 * Enterprise BYO-API licenses may supply validated local overrides (key / HTTPS baseUrl / model);
 * otherwise falls back to server environment variables without exposing secrets to browser bundles.
 */
export function getGeminiClient(byoOverride = null) {
  const overrideKey = byoOverride?.apiKey ? String(byoOverride.apiKey).trim() : "";
  const overrideEndpoint = byoOverride?.endpoint
    ? validateSafeExternalHttpsEndpoint(byoOverride.endpoint)
    : null;
  const overrideModel = byoOverride?.model ? String(byoOverride.model).trim() : "";

  const envByoEndpoint = process.env.BYO_AI_ENDPOINT
    ? validateSafeExternalHttpsEndpoint(process.env.BYO_AI_ENDPOINT)
    : null;

  const resolvedApiKey = overrideKey || process.env.BYO_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!resolvedApiKey) return null;

  const resolvedEndpoint = overrideEndpoint || envByoEndpoint;
  const resolvedModel = overrideModel || process.env.BYO_AI_MODEL || "gemini-4-hydrogen";

  const httpOptions = {
    headers: {
      "User-Agent": "aistudio-build",
    },
  };
  if (resolvedEndpoint) {
    httpOptions.baseUrl = resolvedEndpoint;
  }

  return {
    client: new GoogleGenAI({
      apiKey: resolvedApiKey,
      httpOptions,
    }),
    model: resolvedModel,
    executionSource: overrideKey || overrideEndpoint ? "enterprise_byo_api" : "gemini_api",
  };
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.BYO_AI_API_KEY);
}

/**
 * Sends normalized HTTP error payloads for server-side Gemini failures.
 */
export function sendGeminiErrorResponse(res, error, fallbackMessage) {
  const rawStatus = error?.status || error?.code || 500;
  const httpStatus =
    rawStatus === 429
      ? 429
      : rawStatus >= 400 && rawStatus < 500
        ? rawStatus
        : 502;
  res.status(httpStatus).json({
    success: false,
    error: fallbackMessage,
    details: error?.message || "Unknown AI gateway error.",
  });
}

/**
 * Analyzes an employment contract or payslip via Gemini on the server side.
 */
export async function analyzeDocumentWithGemini({
  base64Data,
  mimeType,
  extractedTextSnippet,
  byoOverride = null,
}) {
  const resolved = getGeminiClient(byoOverride);
  if (!resolved) {
    const err = new Error(
      "GEMINI_API_KEY is not configured on the server. Use the deterministic 0-token local document parser or Enterprise BYO-API.",
    );
    err.status = 503;
    err.code = "GEMINI_KEY_MISSING";
    throw err;
  }
  const { client: ai, model, executionSource } = resolved;

  const parts = [];
  if (extractedTextSnippet) {
    parts.push({
      text: `Analyze this employment contract or payslip for labor compliance:\n${String(extractedTextSnippet).slice(0, 8000)}`,
    });
  } else {
    parts.push({
      inlineData: {
        data: String(base64Data),
        mimeType: mimeType || "application/pdf",
      },
    });
    parts.push({
      text: "Extract employer name, employee role, base hourly rate, overtime/night work rules, and flag statutory compliance alerts.",
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: parts,
    config: {
      systemInstruction:
        "You are a concise payroll and labor-law extractor. Return the requested fields strictly in JSON; use 0 or 'Unknown' when missing. Keep legalComplianceAlerts to at most 3 short actionable items.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contractAnalysis: {
            type: Type.OBJECT,
            properties: {
              employerName: { type: Type.STRING },
              detectedRole: { type: Type.STRING },
              baseHourlyRate: { type: Type.NUMBER },
              currency: { type: Type.STRING },
            },
            required: ["employerName", "detectedRole", "baseHourlyRate", "currency"],
          },
          extractedRules: {
            type: Type.OBJECT,
            properties: {
              dailyOvertimeThreshold: { type: Type.NUMBER },
              overtimeMultiplier: { type: Type.NUMBER },
              nightDiffEnabled: { type: Type.BOOLEAN },
              nightShiftWindow: {
                type: Type.OBJECT,
                properties: {
                  start: { type: Type.STRING },
                  end: { type: Type.STRING },
                },
                required: ["start", "end"],
              },
              nightDiffValue: { type: Type.NUMBER },
            },
            required: [
              "dailyOvertimeThreshold",
              "overtimeMultiplier",
              "nightDiffEnabled",
              "nightShiftWindow",
              "nightDiffValue",
            ],
          },
          legalComplianceAlerts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["contractAnalysis", "extractedRules", "legalComplianceAlerts"],
      },
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  const usage = response.usageMetadata || {};

  return {
    ...parsed,
    aiMeta: {
      model,
      thinkingLevel: "LOW",
      executionSource,
      promptTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    },
  };
}

/**
 * Checks incoming shift proposal text against compact existing shift schedule.
 */
export async function detectShiftConflictsWithGemini({
  incomingMessage,
  compactScheduleSummary,
  existingShifts,
  byoOverride = null,
}) {
  const resolved = getGeminiClient(byoOverride);
  if (!resolved) {
    const err = new Error(
      "GEMINI_API_KEY is not configured on the server for complex shift message analysis.",
    );
    err.status = 503;
    err.code = "GEMINI_KEY_MISSING";
    throw err;
  }
  const { client: ai, model, executionSource } = resolved;

  const scheduleSummary = compactScheduleSummary
    ? String(compactScheduleSummary).slice(0, 1500)
    : Array.isArray(existingShifts)
      ? existingShifts
          .slice(0, 15)
          .map((s) => `${s.date} ${s.startTime}-${s.endTime}`)
          .join("; ")
      : "No shifts scheduled";

  const response = await ai.models.generateContent({
    model,
    contents: `Schedule: ${scheduleSummary || "Empty"}\nIncoming request: ${String(incomingMessage).slice(0, 1200)}`,
    config: {
      systemInstruction:
        "Check whether the incoming shift request conflicts with the scheduled shifts or rest rules. Respond in the same language as the incoming request with a brief conflict summary and a polite reply draft.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conflictDetected: { type: Type.BOOLEAN },
          detectedDate: { type: Type.STRING },
          detectedTimeWindow: { type: Type.STRING },
          conflictDetails: { type: Type.STRING },
          suggestedReplyTemplate: { type: Type.STRING },
        },
        required: ["conflictDetected", "conflictDetails", "suggestedReplyTemplate"],
      },
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  const usage = response.usageMetadata || {};

  return {
    ...parsed,
    aiMeta: {
      model,
      thinkingLevel: "LOW",
      executionSource,
      promptTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    },
  };
}
