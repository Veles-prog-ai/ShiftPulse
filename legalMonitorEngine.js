import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  COUNTRY_PACK_DEFINITIONS,
  SUPPORTED_COUNTRY_CODES,
  cloneCountryPacksMap,
  getCountryPackDefinition,
} from "./countryPacks/index.js";

export const DEFAULT_WATCHED_LAWS = COUNTRY_PACK_DEFINITIONS.RS.laws;

export function sha256Text(input) {
  return crypto
    .createHash("sha256")
    .update(String(input || "").trim())
    .digest("hex");
}

function tokenizeWordsWithWhitespace(line) {
  return String(line || "").split(/(\s+)/).filter((t) => t.length > 0);
}

function computeInlineTokenDiff(beforeLine, afterLine) {
  const a = tokenizeWordsWithWhitespace(beforeLine);
  const b = tokenizeWordsWithWhitespace(afterLine);
  const m = a.length;
  const n = b.length;

  // Fallback directly if line pairs are too large for O(m*n) matrix allocation
  if (m * n > 4000) {
    return {
      beforeTokens: [{ text: beforeLine, changed: true }],
      afterTokens: [{ text: afterLine, changed: true }],
    };
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const beforeTokens = [];
  const afterTokens = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      beforeTokens.unshift({ text: a[i - 1], changed: false });
      afterTokens.unshift({ text: b[j - 1], changed: false });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      afterTokens.unshift({ text: b[j - 1], changed: true });
      j--;
    } else {
      beforeTokens.unshift({ text: a[i - 1], changed: true });
      i--;
    }
  }

  return { beforeTokens, afterTokens };
}

/**
 * Pure-JS side-by-side diff engine for statutory legal clauses.
 * Compares baseline and amended provisions with minimal memory overhead.
 */
export function computeSideBySideDiff(beforeText, afterText) {
  const beforeLines = String(beforeText || "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd());
  const afterLines = String(afterText || "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd());

  const m = beforeLines.length;
  const n = afterLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        beforeLines[i - 1] === afterLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const rawOps = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      rawOps.unshift({ type: "unchanged", beforeLine: beforeLines[i - 1], afterLine: afterLines[j - 1], bIdx: i, aIdx: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawOps.unshift({ type: "added", beforeLine: "", afterLine: afterLines[j - 1], bIdx: null, aIdx: j });
      j--;
    } else {
      rawOps.unshift({ type: "removed", beforeLine: beforeLines[i - 1], afterLine: "", bIdx: i, aIdx: null });
      i--;
    }
  }

  // Pair consecutive removed + added operations into "modified" rows for true side-by-side display
  const rows = [];
  let idx = 0;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  while (idx < rawOps.length) {
    const cur = rawOps[idx];
    const next = rawOps[idx + 1];
    if (cur.type === "removed" && next && next.type === "added") {
      const tokenDiff = computeInlineTokenDiff(cur.beforeLine, next.afterLine);
      rows.push({
        type: "modified",
        lineNumberBefore: cur.bIdx,
        lineNumberAfter: next.aIdx,
        beforeText: cur.beforeLine,
        afterText: next.afterLine,
        beforeTokens: tokenDiff.beforeTokens,
        afterTokens: tokenDiff.afterTokens,
      });
      modifiedCount++;
      idx += 2;
    } else if (cur.type === "removed") {
      rows.push({
        type: "removed",
        lineNumberBefore: cur.bIdx,
        lineNumberAfter: null,
        beforeText: cur.beforeLine,
        afterText: "",
        beforeTokens: [{ text: cur.beforeLine, changed: true }],
        afterTokens: [],
      });
      removedCount++;
      idx += 1;
    } else if (cur.type === "added") {
      rows.push({
        type: "added",
        lineNumberBefore: null,
        lineNumberAfter: cur.aIdx,
        beforeText: "",
        afterText: cur.afterLine,
        beforeTokens: [],
        afterTokens: [{ text: cur.afterLine, changed: true }],
      });
      addedCount++;
      idx += 1;
    } else {
      rows.push({
        type: "unchanged",
        lineNumberBefore: cur.bIdx,
        lineNumberAfter: cur.aIdx,
        beforeText: cur.beforeLine,
        afterText: cur.afterLine,
        beforeTokens: [{ text: cur.beforeLine, changed: false }],
        afterTokens: [{ text: cur.afterLine, changed: false }],
      });
      idx += 1;
    }
  }

  return {
    hasChanges: addedCount + removedCount + modifiedCount > 0,
    stats: {
      totalRows: rows.length,
      addedCount,
      removedCount,
      modifiedCount,
    },
    rows,
  };
}

function hydratePackLaws(laws, countryCode) {
  return (laws || []).map((law) => ({
    ...law,
    countryCode: law.countryCode || countryCode,
    baselineHash: law.baselineHash || sha256Text(law.baselineText),
  }));
}

function buildDefaultV2State() {
  const cloned = cloneCountryPacksMap();
  const countryPacks = {};
  for (const code of SUPPORTED_COUNTRY_CODES) {
    const def = cloned[code];
    countryPacks[code] = {
      ...def,
      laws: hydratePackLaws(def.laws, code),
    };
  }
  return {
    schemaVersion: 2,
    activeCountryCode: "RS",
    countryPacks,
    notifications: [],
    telemetry: {
      checksRun: 0,
      lastCheckAt: null,
      lastCheckDurationMs: 0,
      intervalHours: 12,
    },
  };
}

function normalizeAndMigrateState(parsed) {
  const defaultV2 = buildDefaultV2State();

  // Case 1: Legacy v1.0 flat schema ({ laws: [...], notifications: [...], telemetry: {...} })
  if (parsed && Array.isArray(parsed.laws) && !parsed.countryPacks) {
    const legacyRsById = new Map(parsed.laws.map((l) => [l.id, l]));
    const mergedRsLaws = defaultV2.countryPacks.RS.laws.map((baseLaw) => {
      const existing = legacyRsById.get(baseLaw.id);
      if (!existing) return baseLaw;
      return {
        ...baseLaw,
        ...existing,
        countryCode: "RS",
        baselineHash: existing.baselineHash || sha256Text(existing.baselineText || baseLaw.baselineText),
      };
    });
    // Preserve any extra custom RS laws from v1
    for (const legacyLaw of parsed.laws) {
      if (!mergedRsLaws.some((l) => l.id === legacyLaw.id)) {
        mergedRsLaws.push({
          ...legacyLaw,
          countryCode: legacyLaw.countryCode || "RS",
          baselineHash: legacyLaw.baselineHash || sha256Text(legacyLaw.baselineText),
        });
      }
    }

    defaultV2.countryPacks.RS.laws = mergedRsLaws;
    defaultV2.notifications = Array.isArray(parsed.notifications)
      ? parsed.notifications.map((n) => ({ ...n, countryCode: n.countryCode || "RS" }))
      : [];
    if (parsed.telemetry && typeof parsed.telemetry === "object") {
      defaultV2.telemetry = {
        ...defaultV2.telemetry,
        ...parsed.telemetry,
      };
    }
    defaultV2.migratedFromSchemaVersion = 1;
    defaultV2.migratedAt = new Date().toISOString();
    return { state: defaultV2, migrated: true };
  }

  // Case 2: Already v2 schema — ensure newly added country packs exist and laws carry hashes
  if (parsed && parsed.countryPacks && typeof parsed.countryPacks === "object") {
    const countryPacks = {};
    for (const code of SUPPORTED_COUNTRY_CODES) {
      const def = defaultV2.countryPacks[code];
      const existingPack = parsed.countryPacks[code];
      if (!existingPack) {
        countryPacks[code] = def;
      } else {
        const existingLawMap = new Map(
          Array.isArray(existingPack.laws) ? existingPack.laws.map((l) => [l.id, l]) : [],
        );
        const mergedLaws = def.laws.map((baseLaw) => {
          const prev = existingLawMap.get(baseLaw.id);
          return prev
            ? {
                ...baseLaw,
                ...prev,
                countryCode: prev.countryCode || code,
                baselineHash: prev.baselineHash || sha256Text(prev.baselineText || baseLaw.baselineText),
              }
            : baseLaw;
        });
        if (Array.isArray(existingPack.laws)) {
          for (const extraLaw of existingPack.laws) {
            if (!mergedLaws.some((l) => l.id === extraLaw.id)) {
              mergedLaws.push({
                ...extraLaw,
                countryCode: extraLaw.countryCode || code,
                baselineHash: extraLaw.baselineHash || sha256Text(extraLaw.baselineText),
              });
            }
          }
        }
        countryPacks[code] = {
          ...def,
          ...existingPack,
          countryCode: code,
          requiredHitlVerification: existingPack.requiredHitlVerification ?? true,
          lastVerifiedByOperator: existingPack.lastVerifiedByOperator || def.lastVerifiedByOperator,
          laws: mergedLaws,
        };
      }
    }

    return {
      state: {
        schemaVersion: 2,
        activeCountryCode:
          parsed.activeCountryCode && countryPacks[parsed.activeCountryCode]
            ? parsed.activeCountryCode
            : "RS",
        countryPacks,
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications.map((n) => ({ ...n, countryCode: n.countryCode || "RS" }))
          : [],
        telemetry: {
          ...defaultV2.telemetry,
          ...(parsed.telemetry || {}),
        },
      },
      migrated: false,
    };
  }

  return { state: defaultV2, migrated: false };
}

export function createLegalMonitorService(
  dataDir,
  { isLawTrackerSlaActive = null } = {},
) {
  const stateFilePath = path.join(dataDir, "legal_monitor_state.json");

  const loadState = () => {
    try {
      if (fs.existsSync(stateFilePath)) {
        const parsed = JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
        const { state: migratedState, migrated } = normalizeAndMigrateState(parsed);
        if (migrated) {
          console.log(
            "[LegalMonitor] Automatically migrated v1.0 flat legal_monitor_state.json to v2 Country Pack architecture (RS).",
          );
        }
        return migratedState;
      }
    } catch (error) {
      console.warn("[LegalMonitor] Failed to load existing state, initializing clean Country Packs:", error.message);
    }
    return buildDefaultV2State();
  };

  let state = loadState();

  const saveState = () => {
    try {
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), "utf8");
    } catch (e) {
      console.warn("Legal monitor state save warning:", e.message);
    }
  };

  saveState();

  const resolveSlaStatus = async () => {
    if (typeof isLawTrackerSlaActive !== "function") {
      return {
        active: true,
        paused: false,
        expiresAt: null,
        reason: null,
      };
    }
    try {
      const outcome = await isLawTrackerSlaActive();
      if (typeof outcome === "boolean") {
        return {
          active: outcome,
          paused: !outcome,
          expiresAt: null,
          reason: outcome
            ? null
            : "Law Tracker SLA renewal required. Core deterministic rules remain operational offline.",
        };
      }
      return {
        active: outcome?.active !== false,
        paused: outcome?.active === false,
        expiresAt: outcome?.expiresAt || null,
        reason: outcome?.reason || null,
      };
    } catch {
      return { active: true, paused: false, expiresAt: null, reason: null };
    }
  };

  const findLawById = (lawId) => {
    for (const code of Object.keys(state.countryPacks)) {
      const pack = state.countryPacks[code];
      const match = (pack.laws || []).find((l) => l.id === lawId);
      if (match) {
        return { law: match, pack, countryCode: code };
      }
    }
    return { law: null, pack: null, countryCode: null };
  };

  const getAllLawsFlattened = (countryCodeFilter = "") => {
    const normalizedFilter = String(countryCodeFilter || "").trim().toUpperCase();
    const codesToInclude =
      normalizedFilter && normalizedFilter !== "ALL"
        ? SUPPORTED_COUNTRY_CODES.filter((c) => c === normalizedFilter)
        : SUPPORTED_COUNTRY_CODES;

    const list = [];
    for (const code of codesToInclude) {
      const pack = state.countryPacks[code];
      if (!pack) continue;
      for (const l of pack.laws || []) {
        list.push({
          ...l,
          countryCode: l.countryCode || code,
          packStatus: pack.status,
          taxRulesVersion: pack.taxRulesVersion,
        });
      }
    }
    return list;
  };

  const buildPackSummaries = () => {
    const summaries = {};
    for (const code of SUPPORTED_COUNTRY_CODES) {
      const pack = state.countryPacks[code] || getCountryPackDefinition(code);
      summaries[code] = {
        countryCode: pack.countryCode,
        countryName: pack.countryName,
        currency: pack.currency,
        status: pack.status,
        taxRulesVersion: pack.taxRulesVersion,
        requiredHitlVerification: pack.requiredHitlVerification !== false,
        officialGazetteSources: pack.officialGazetteSources || [],
        lastVerifiedByOperator: pack.lastVerifiedByOperator || null,
        lawsCount: Array.isArray(pack.laws) ? pack.laws.length : 0,
      };
    }
    return summaries;
  };

  const getStatus = ({ countryCode = "" } = {}) => {
    const mem = process.memoryUsage();
    const normalizedFilter = String(countryCode || "").trim().toUpperCase();
    const filteredNotifications =
      normalizedFilter && normalizedFilter !== "ALL"
        ? state.notifications.filter((n) => (n.countryCode || "RS") === normalizedFilter)
        : state.notifications;

    const unreadCount = filteredNotifications.filter((n) => !n.acknowledged).length;
    const packSummaries = buildPackSummaries();
    const selectedCode =
      normalizedFilter && normalizedFilter !== "ALL" && packSummaries[normalizedFilter]
        ? normalizedFilter
        : state.activeCountryCode || "RS";

    return {
      success: true,
      schemaVersion: state.schemaVersion || 2,
      engineMode: "modular-country-pack-http-head-and-lcs-diff",
      activeCountryCode: state.activeCountryCode || "RS",
      selectedJurisdiction: selectedCode,
      activePack: packSummaries[selectedCode] || packSummaries.RS,
      countryPacks: packSummaries,
      telemetry: {
        ...state.telemetry,
        unreadCount,
        totalNotifications: filteredNotifications.length,
        rssMemoryMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      },
      laws: getAllLawsFlattened(normalizedFilter || ""),
      notifications: filteredNotifications.slice(0, 50),
    };
  };

  const getStatusWithSla = async ({ countryCode = "" } = {}) => {
    const base = getStatus({ countryCode });
    const sla = await resolveSlaStatus();
    return {
      ...base,
      lawTrackerSla: sla,
    };
  };

  /**
   * Lightweight check of official regulatory sources (HTTP HEAD with 3.5s timeout; no DOM parsing or AI cost).
   * Pauses cleanly when Enterprise Law Tracker SLA has expired.
   */
  const runLightweightHttpChecks = async ({ countryCode = "", bypassSla = false } = {}) => {
    if (!bypassSla) {
      const sla = await resolveSlaStatus();
      if (!sla.active) {
        return {
          success: false,
          pausedBySla: true,
          lawTrackerSla: sla,
          renewalNotice:
            sla.reason ||
            "Annual Law Tracker SLA expired. Live regulatory checks are paused; core deterministic accounting continues running.",
          telemetry: getStatus({ countryCode }).telemetry,
        };
      }
    }

    const startMs = Date.now();
    const results = [];
    const targetCode = String(countryCode || state.activeCountryCode || "RS")
      .trim()
      .toUpperCase();

    const lawsToCheck =
      targetCode === "ALL"
        ? getAllLawsFlattened("ALL").filter((l) => state.countryPacks[l.countryCode]?.status === "active")
        : (state.countryPacks[targetCode]?.laws || []);

    for (const law of lawsToCheck) {
      const checkedAt = new Date().toISOString();
      try {
        const headers = { "User-Agent": "ShiftPulse-LegalMonitor/2.0 (+country-pack-head)" };
        if (law.etag) headers["If-None-Match"] = law.etag;
        if (law.lastModified) headers["If-Modified-Since"] = law.lastModified;

        const res = await fetch(law.officialUrl, {
          method: "HEAD",
          headers,
          signal: AbortSignal.timeout(3500),
        });

        const newEtag = res.headers.get("etag");
        const newLastMod = res.headers.get("last-modified");
        const headerChanged =
          (law.etag && newEtag && newEtag !== law.etag) ||
          (law.lastModified && newLastMod && newLastMod !== law.lastModified);

        law.lastCheckedAt = checkedAt;
        law.lastHttpStatus = res.status;
        if (newEtag) law.etag = newEtag;
        if (newLastMod) law.lastModified = newLastMod;

        if (res.status === 304) {
          law.lastCheckResult = "304_not_modified";
        } else if (headerChanged) {
          law.lastCheckResult = "header_changed_review_recommended";
          state.notifications.unshift({
            id: `leg-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
            countryCode: law.countryCode || targetCode,
            lawId: law.id,
            lawCode: law.code,
            lawTitle: law.title,
            articleLabel: "Official source header change detected (HTTP ETag / Last-Modified)",
            severity: "medium",
            detectedAt: checkedAt,
            acknowledged: false,
            sourceUrl: law.officialUrl,
            summary: `[${law.countryCode || targetCode}] Official source for ${law.code} returned modified ETag / Last-Modified headers (HTTP ${res.status}). Manual clause verification recommended.`,
            baselineText: law.baselineText,
            amendedText: law.baselineText,
            sideBySideDiff: computeSideBySideDiff(law.baselineText, law.baselineText),
          });
        } else {
          law.lastCheckResult = `http_${res.status}_verified`;
        }

        results.push({ id: law.id, countryCode: law.countryCode, status: res.status, result: law.lastCheckResult });
      } catch {
        law.lastCheckedAt = checkedAt;
        law.lastHttpStatus = null;
        law.lastCheckResult = "offline_or_timeout_skipped";
        results.push({ id: law.id, countryCode: law.countryCode, status: null, result: "offline_or_timeout_skipped" });
      }
    }

    state.telemetry.checksRun += 1;
    state.telemetry.lastCheckAt = new Date().toISOString();
    state.telemetry.lastCheckDurationMs = Date.now() - startMs;
    saveState();

    return {
      success: true,
      pausedBySla: false,
      durationMs: state.telemetry.lastCheckDurationMs,
      results,
      telemetry: getStatus({ countryCode: targetCode }).telemetry,
    };
  };

  /**
   * Compares current baseline text against proposed statutory text
   * and creates a notification with side-by-side diff highlighting.
   */
  const compareClauseAndNotifyAdmin = ({
    lawId,
    updatedText,
    articleLabel = "Statutory clause amendment",
    summaryNote = "",
    severity = "high",
  }) => {
    const { law, countryCode } = findLawById(lawId);
    if (!law) {
      return { success: false, error: "Law not found in Country Pack monitor registry." };
    }
    const cleanNew = String(updatedText || "").trim();
    if (!cleanNew) {
      return { success: false, error: "Missing updated statutory text for comparison." };
    }

    const diff = computeSideBySideDiff(law.baselineText, cleanNew);
    if (!diff.hasChanges) {
      return {
        success: true,
        hasChanges: false,
        message: "No differences detected compared to the currently active baseline.",
        sideBySideDiff: diff,
      };
    }

    const notification = {
      id: `leg-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
      countryCode: countryCode || law.countryCode || "RS",
      lawId: law.id,
      lawCode: law.code,
      lawTitle: law.title,
      articleLabel,
      severity,
      detectedAt: new Date().toISOString(),
      acknowledged: false,
      sourceUrl: law.officialUrl,
      beforeHash: law.baselineHash,
      afterHash: sha256Text(cleanNew),
      summary:
        summaryNote ||
        `[${countryCode || "RS"}] Amendment detected (${diff.stats.modifiedCount} modified, ${diff.stats.addedCount} added, ${diff.stats.removedCount} removed clauses) in ${law.code}.`,
      baselineText: law.baselineText,
      amendedText: cleanNew,
      sideBySideDiff: diff,
    };

    state.notifications.unshift(notification);
    state.notifications = state.notifications.slice(0, 100);
    saveState();

    return {
      success: true,
      hasChanges: true,
      notification,
    };
  };

  const acknowledgeNotification = (notificationId, { adoptAsBaseline = false, operatorName = "" } = {}) => {
    const target = state.notifications.find((n) => n.id === notificationId);
    if (!target) {
      return { success: false, error: "Notification not found." };
    }
    target.acknowledged = true;
    target.acknowledgedAt = new Date().toISOString();

    if (adoptAsBaseline && target.amendedText) {
      const { law, pack } = findLawById(target.lawId);
      if (law) {
        law.baselineText = target.amendedText;
        law.baselineHash = sha256Text(target.amendedText);
        law.lastCheckResult = "baseline_updated_by_admin";
      }
      if (pack && operatorName) {
        pack.lastVerifiedByOperator = {
          operatorId: "hitl-verifier",
          operatorName: String(operatorName).slice(0, 80),
          verifiedAt: new Date().toISOString(),
          note: `Adopted baseline amendment for ${target.lawCode}.`,
        };
      }
    }
    saveState();
    return { success: true, notification: target };
  };

  const verifyCountryPack = (
    countryCode,
    { operatorId = "op-owner-1", operatorName = "Certified Human Reviewer", taxRulesVersion = "", note = "" } = {},
  ) => {
    const code = String(countryCode || "RS").trim().toUpperCase();
    const pack = state.countryPacks[code];
    if (!pack) {
      return { success: false, error: `Country Pack "${code}" is not registered.` };
    }
    const nowIso = new Date().toISOString();
    if (taxRulesVersion) {
      pack.taxRulesVersion = String(taxRulesVersion).slice(0, 48);
    }
    pack.lastVerifiedByOperator = {
      operatorId: String(operatorId || "op-owner-1").slice(0, 64),
      operatorName: String(operatorName || "Certified Human Reviewer").slice(0, 80),
      verifiedAt: nowIso,
      note: String(note || `HITL verified rules for ${code} (${pack.taxRulesVersion}).`).slice(0, 240),
    };
    saveState();
    return {
      success: true,
      countryCode: code,
      pack: buildPackSummaries()[code],
    };
  };

  const setActiveCountryCode = (countryCode) => {
    const code = String(countryCode || "RS").trim().toUpperCase();
    if (!state.countryPacks[code]) {
      return { success: false, error: `Country Pack "${code}" is not registered.` };
    }
    state.activeCountryCode = code;
    saveState();
    return { success: true, activeCountryCode: code };
  };

  // Run lightweight periodic check every 12 hours without keeping the Node event loop alive
  const timer = setInterval(() => {
    runLightweightHttpChecks().catch(() => {});
  }, 12 * 60 * 60 * 1000);
  if (typeof timer.unref === "function") timer.unref();

  return {
    getStatus,
    getStatusWithSla,
    runLightweightHttpChecks,
    compareClauseAndNotifyAdmin,
    acknowledgeNotification,
    verifyCountryPack,
    setActiveCountryCode,
  };
}
