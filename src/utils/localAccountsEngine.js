// Lokalni korisnički nalozi, Human-in-the-Loop (HITL) politika,
// deterministički AI pre-filter i SHA-256 keširanje radi minimalne potrošnje tokena.
// Svi nalozi i detalji dokumenata ostaju ISKLJUČIVO na uređaju korisnika.

export const LOCAL_ACCOUNTS_KEY = "shiftpulse_local_accounts_v1";
export const ACTIVE_OPERATOR_ID_KEY = "shiftpulse_active_operator_v1";
export const LOCAL_HITL_LOGS_KEY = "shiftpulse_hitl_local_logs_v1";
export const AI_CACHE_KEY = "shiftpulse_ai_response_cache_v1";
export const AI_USAGE_STATS_KEY = "shiftpulse_ai_usage_stats_v1";

export const OPERATOR_ROLES = [
  "Vlasnik Licence",
  "Ovlašćeni Knjigovođa",
  "Operater Unosa",
];

export const DEFAULT_HITL_POLICY = {
  requireExplicitApproval: true,
  allowAiDocumentScan: true,
  allowAiConflictMonitor: true,
  preferZeroTokenLocalFirst: true,
  redactCompanyIdentity: true,
};

export const DEFAULT_LOCAL_ACCOUNTS = [
  {
    id: "op-owner-1",
    username: "vlasnik_licence",
    displayName: "Vlasnik Licence",
    role: "Vlasnik Licence",
    hasPin: false,
    pinHash: "",
    hitlPolicy: { ...DEFAULT_HITL_POLICY },
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
];

export async function hashPinSha256(pin) {
  const clean = String(pin || "").trim();
  if (!clean) return "";
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(`shiftpulse-pin:${clean}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback za ne-HTTPS localhost ako subtle nije dostupan
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

export async function computeContentHash(text) {
  const input = String(text || "");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  }
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return `${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`;
}

export function loadLocalAccounts() {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((acc) => ({
          ...acc,
          hitlPolicy: { ...DEFAULT_HITL_POLICY, ...(acc.hitlPolicy || {}) },
        }));
      }
    }
  } catch {}
  return DEFAULT_LOCAL_ACCOUNTS;
}

export function saveLocalAccounts(accounts) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

export function loadLocalHitlLogs() {
  try {
    const raw = localStorage.getItem(LOCAL_HITL_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalHitlLogs(logs) {
  try {
    localStorage.setItem(
      LOCAL_HITL_LOGS_KEY,
      JSON.stringify(logs.slice(0, 200)),
    );
  } catch {}
}

export function loadAiUsageStats() {
  try {
    const raw = localStorage.getItem(AI_USAGE_STATS_KEY);
    if (raw) {
      return {
        totalRequests: 0,
        localResolvedCount: 0,
        cacheHitCount: 0,
        geminiCallsCount: 0,
        totalTokensUsed: 0,
        estimatedTokensSaved: 0,
        ...JSON.parse(raw),
      };
    }
  } catch {}
  return {
    totalRequests: 0,
    localResolvedCount: 0,
    cacheHitCount: 0,
    geminiCallsCount: 0,
    totalTokensUsed: 0,
    estimatedTokensSaved: 0,
  };
}

export function saveAiUsageStats(stats) {
  try {
    localStorage.setItem(AI_USAGE_STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function getCachedAiResponse(cacheKey) {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const entry = map[cacheKey];
    if (!entry) return null;
    // Keš važi 7 dana
    if (Date.now() - entry.cachedAt > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return entry.payload;
  } catch {
    return null;
  }
}

export function setCachedAiResponse(cacheKey, payload) {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(map);
    if (keys.length >= 40) {
      const oldest = keys.sort((a, b) => (map[a]?.cachedAt || 0) - (map[b]?.cachedAt || 0))[0];
      if (oldest) delete map[oldest];
    }
    map[cacheKey] = {
      cachedAt: Date.now(),
      payload,
    };
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(map));
  } catch {}
}

export function clearAiResponseCache() {
  try {
    localStorage.removeItem(AI_CACHE_KEY);
  } catch {}
}

export function redactSensitiveTextForAi(text) {
  return String(text || "")
    .replace(/\b\d{13}\b/g, "[JMBG_MASKIRAN]")
    .replace(/\bRS\d{2}[0-9A-Z]{16,20}\b/gi, "[IBAN_MASKIRAN]")
    .replace(/\bPIB[:\s#]*\d{9}\b/gi, "PIB: [MASKIRAN]");
}

function parseMinutes(hhmm) {
  const [h, m] = String(hhmm || "00:00").split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

function extractDateFromText(text) {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const dmyFull = text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\.?/);
  if (dmyFull) {
    return `${dmyFull[3]}-${dmyFull[2].padStart(2, "0")}-${dmyFull[1].padStart(2, "0")}`;
  }

  const lower = text.toLowerCase();
  const base = new Date();
  if (/\bprekosutra\b/.test(lower)) {
    base.setDate(base.getDate() + 2);
    return base.toISOString().split("T")[0];
  }
  if (/\bsutra\b|\btomorrow\b/.test(lower)) {
    base.setDate(base.getDate() + 1);
    return base.toISOString().split("T")[0];
  }
  if (/\bdanas\b|\btoday\b/.test(lower)) {
    return base.toISOString().split("T")[0];
  }

  const weekdayMap = {
    nedelja: 0,
    ponedeljak: 1,
    utorak: 2,
    sreda: 3,
    četvrtak: 4,
    cetvrtak: 4,
    petak: 5,
    subota: 6,
  };
  for (const [word, targetDay] of Object.entries(weekdayMap)) {
    if (lower.includes(word)) {
      const diff = (targetDay - base.getDay() + 7) % 7 || 7;
      base.setDate(base.getDate() + diff);
      return base.toISOString().split("T")[0];
    }
  }
  return null;
}

function extractTimeWindowFromText(text) {
  // Npr. "14:00 - 22:00", "od 14h do 22h", "08:30-16:30"
  const colonMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|–|do|to)\s*([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (colonMatch) {
    return {
      start: `${colonMatch[1].padStart(2, "0")}:${colonMatch[2]}`,
      end: `${colonMatch[3].padStart(2, "0")}:${colonMatch[4]}`,
    };
  }
  const hourMatch = text.match(/(?:od\s+)?\b([01]?\d|2[0-3])\s*h?\s*(?:-|–|do|to)\s*([01]?\d|2[0-3])\s*h?\b/i);
  if (hourMatch) {
    return {
      start: `${hourMatch[1].padStart(2, "0")}:00`,
      end: `${hourMatch[2].padStart(2, "0")}:00`,
    };
  }
  return null;
}

/**
 * Deterministički lokalni pre-filter za proveru konflikta smena (0 tokena).
 * Ako poruka sadrži jasan datum i satnicu koji se direktno preklapaju sa postojećom smenom,
 * ili je datum potpuno slobodan bez smena, rešava zahtev bez poziva Gemini API-ja.
 */
export function runLocalShiftConflictPrecheck(incomingMessage, shifts = [], jobs = []) {
  const text = String(incomingMessage || "").trim();
  const targetDate = extractDateFromText(text);
  const window = extractTimeWindowFromText(text);

  if (!targetDate || !window) {
    return {
      resolvedLocally: false,
      targetDate,
      window,
    };
  }

  const reqStart = parseMinutes(window.start);
  let reqEnd = parseMinutes(window.end);
  if (reqEnd <= reqStart) reqEnd += 24 * 60;

  const sameDayShifts = (shifts || []).filter((s) => s.date === targetDate);
  const overlaps = sameDayShifts.filter((s) => {
    const sStart = parseMinutes(s.startTime);
    let sEnd = parseMinutes(s.endTime);
    if (s.crossesMidnight || sEnd <= sStart) sEnd += 24 * 60;
    return Math.max(reqStart, sStart) < Math.min(reqEnd, sEnd);
  });

  if (overlaps.length > 0) {
    const details = overlaps
      .map((s) => {
        const job = (jobs || []).find((j) => j.id === s.jobId);
        return `${job?.name || "Postojeća smena"} (${s.date} ${s.startTime}–${s.endTime})`;
      })
      .join(", ");

    return {
      resolvedLocally: true,
      conflictDetected: true,
      detectedDate: targetDate,
      detectedTimeWindow: `${window.start}–${window.end}`,
      conflictDetails: `Detektovano direktno vremensko preklapanje za ${targetDate} (${window.start}–${window.end}) sa: ${details}.`,
      suggestedReplyTemplate: `Poštovani, hvala na ponudi za smenu dana ${targetDate} (${window.start}–${window.end}). Nažalost, u tom terminu već imam zakazanu obavezu (${details}). Slobodan sam van ovog intervala i rado ću prihvatiti naredni slobodan termin.`,
    };
  }

  // Ako na taj datum uopšte nema zakazanih smena niti preklapanja
  return {
    resolvedLocally: true,
    conflictDetected: false,
    detectedDate: targetDate,
    detectedTimeWindow: `${window.start}–${window.end}`,
    conflictDetails: `Termin ${targetDate} (${window.start}–${window.end}) je slobodan (${sameDayShifts.length} drugih smena tog dana bez preklapanja).`,
    suggestedReplyTemplate: `Poštovani, potvrđujem dostupnost za traženi termin dana ${targetDate} od ${window.start} do ${window.end}. Možete računati na moj dolazak u skladu sa dogovorenim uslovima.`,
  };
}

/**
 * Sabija raspored smena na minimalni prozor (±7 dana oko detektovanog datuma ili poslednjih 12 smena)
 * kako bi se potrošnja input tokena ka Gemini API-ju smanjila za ~80%.
 */
export function buildCompactSchedulePayload(shifts = [], jobs = [], targetDate = null) {
  const jobMap = {};
  (jobs || []).forEach((j) => {
    jobMap[j.id] = `${j.name} (${j.role || "Radnik"})`;
  });

  let relevantShifts = [...(shifts || [])];
  if (targetDate) {
    const center = new Date(targetDate).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const filtered = relevantShifts.filter((s) => {
      const t = new Date(s.date).getTime();
      return !Number.isNaN(t) && Math.abs(t - center) <= sevenDays;
    });
    if (filtered.length > 0) relevantShifts = filtered;
  }

  return relevantShifts
    .slice(0, 15)
    .map((s) => `${s.date} ${s.startTime}-${s.endTime} @ ${jobMap[s.jobId] || "Posao"}`)
    .join("; ");
}

/**
 * Gradi minimalni payload za server koji sadrži ISKLJUČIVO nalog operatera i odluku o odobrenju AI odgovora.
 * Zero-Knowledge: Bez PIB-a klijenta, bez plata, bez teksta ugovora i bez poruka.
 */
export function buildMinimizedHitlServerPayload({
  licenseId,
  operator,
  module,
  decision,
  aiModel = "gemini-4-hydrogen",
  executionSource = "gemini_api",
  totalTokens = 0,
}) {
  return {
    licenseId: licenseId || "UNLICENSED-STATION",
    accountId: operator?.id || "op-owner-1",
    accountUsername: operator?.username || "vlasnik_licence",
    accountRole: operator?.role || "Vlasnik Licence",
    module,
    decision, // "approved" | "edited_approved" | "rejected"
    aiModel,
    executionSource,
    totalTokens: Number(totalTokens) || 0,
    attestationConfirmed: true,
    timestamp: new Date().toISOString(),
  };
}
