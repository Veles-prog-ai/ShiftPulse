import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

/**
 * Returns a configured server-side Gemini client using process.env.GEMINI_API_KEY.
 * The API key is never exposed to client bundles.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
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
}) {
  const ai = getGeminiClient();
  if (!ai) {
    const err = new Error(
      "GEMINI_API_KEY is not configured on the server. Use the deterministic 0-token local document parser.",
    );
    err.status = 503;
    err.code = "GEMINI_KEY_MISSING";
    throw err;
  }

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
    model: "gemini-4-hydrogen",
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
      model: "gemini-4-hydrogen",
      thinkingLevel: "LOW",
      executionSource: "gemini_api",
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
}) {
  const ai = getGeminiClient();
  if (!ai) {
    const err = new Error(
      "GEMINI_API_KEY is not configured on the server for complex shift message analysis.",
    );
    err.status = 503;
    err.code = "GEMINI_KEY_MISSING";
    throw err;
  }

  const scheduleSummary = compactScheduleSummary
    ? String(compactScheduleSummary).slice(0, 1500)
    : Array.isArray(existingShifts)
      ? existingShifts
          .slice(0, 15)
          .map((s) => `${s.date} ${s.startTime}-${s.endTime}`)
          .join("; ")
      : "No shifts scheduled";

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
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
      model: "gemini-4-hydrogen",
      thinkingLevel: "LOW",
      executionSource: "gemini_api",
      promptTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    },
  };
}
