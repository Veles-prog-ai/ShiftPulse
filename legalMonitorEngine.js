import crypto from "crypto";
import fs from "fs";
import path from "path";

export const DEFAULT_WATCHED_LAWS = [
  {
    id: "rs-zor",
    code: "ZOR RS",
    title: "Zakon o radu Republike Srbije",
    citation: "Sl. glasnik RS br. 24/2005 ... 95/2018",
    officialUrl: "https://www.paragraf.rs/propisi/zakon_o_radu.html",
    category: "Radni odnosi i smene",
    baselineClauseTitle: "Čl. 57, 66–68, 108 i 115 (Normativi rada i uvećanja)",
    baselineText: [
      "Član 57: Prekovremeni rad ne može da traje duže od 8 časova nedeljno.",
      "Član 66: Zaposleni ima pravo na dnevni odmor od najmanje 12 časova neprekidno u okviru 24 časa.",
      "Član 67: Zaposleni ima pravo na nedeljni odmor od najmanje 24 časa neprekidno.",
      "Član 68: Minimalno trajanje godišnjeg odmora iznosi 20 radnih dana u kalendarskoj godini (100% naknade).",
      "Član 108: Zaposleni ima pravo na uvećanu zaradu za rad na dan praznika najmanje 110%, za rad noću (22h-06h) najmanje 26%, za prekovremeni rad najmanje 26%.",
      "Član 115: Naknada zarade za bolovanje do 30 dana (teret poslodavca) iznosi najmanje 65% prosečne zarade, a za povredu na radu 100%.",
    ].join("\n"),
    etag: null,
    lastModified: null,
    lastCheckedAt: null,
    lastHttpStatus: null,
    lastCheckResult: "baseline_initialized",
  },
  {
    id: "rs-zpdg",
    code: "ZPDG RS",
    title: "Zakon o porezu na dohodak građana",
    citation: "Sl. glasnik RS br. 24/2001 ... 92/2023",
    officialUrl: "https://www.paragraf.rs/propisi/zakon_o_porezu_na_dohodak_gradjana.html",
    category: "Porez na zarade, paušal i frilenseri",
    baselineClauseTitle: "Čl. 15a, 16, 40 i 85 (Neoporezivi iznos, stopa i limiti)",
    baselineText: [
      "Član 15a: Neoporezivi iznos zarade iznosi 25.000 RSD mesečno za puno radno vreme.",
      "Član 16: Stopa poreza na zarade iznosi 10% na oporezivu osnovicu.",
      "Član 40: Pravo na paušalno oporezivanje ima preduzetnik čiji ukupan promet u godini ne prelazi 6.000.000 RSD.",
      "Član 85: Samooporezivanje prihoda fizičkih lica (frilenseri) vrši se kvartalno po Modelu A ili Modelu B uz prijavu PP OPO-K.",
    ].join("\n"),
    etag: null,
    lastModified: null,
    lastCheckedAt: null,
    lastHttpStatus: null,
    lastCheckResult: "baseline_initialized",
  },
  {
    id: "rs-zdoso",
    code: "ZDOSO RS",
    title: "Zakon o doprinosima za obavezno socijalno osiguranje",
    citation: "Sl. glasnik RS br. 84/2004 ... 92/2023",
    officialUrl: "https://www.paragraf.rs/propisi/zakon_o_doprinosima_za_obavezno_socijalno_osiguranje.html",
    category: "Doprinosi (PIO, Zdravstvo, Nezaposlenost)",
    baselineClauseTitle: "Član 44 (Stope doprinosa na teret zaposlenog i poslodavca)",
    baselineText: [
      "Doprinos za PIO na teret zaposlenog iznosi 14,00%, a na teret poslodavca iznosi 10,00%.",
      "Doprinos za zdravstveno osiguranje na teret zaposlenog iznosi 5,15%, a na teret poslodavca 5,15%.",
      "Doprinos za osiguranje za slučaj nezaposlenosti na teret zaposlenog iznosi 0,75%, a na teret poslodavca 0,00%.",
    ].join("\n"),
    etag: null,
    lastModified: null,
    lastCheckedAt: null,
    lastHttpStatus: null,
    lastCheckResult: "baseline_initialized",
  },
  {
    id: "rs-zpdv",
    code: "ZPDV & SEF",
    title: "Zakon o PDV i Elektronsko fakturisanje",
    citation: "Sl. glasnik RS br. 84/2004 ... 138/2022",
    officialUrl: "https://www.efaktura.gov.rs/",
    category: "PDV pragmatika i eFaktura UBL",
    baselineClauseTitle: "Čl. 23 i 38 (Stope PDV-a i prag za evidenciju)",
    baselineText: [
      "Član 23: Opšta stopa PDV iznosi 20%, a posebna stopa PDV iznosi 10%.",
      "Član 38: Obaveza evidentiranja u sistem PDV nastaje kada ukupan promet u prethodnih 12 meseci pređe 8.000.000 RSD.",
      "eFaktura (SEF): Obavezna razmena UBL 2.1 XML faktura u B2B i B2G prometu i rok za PP PDV prijavu do 15. u mesecu.",
    ].join("\n"),
    etag: null,
    lastModified: null,
    lastCheckedAt: null,
    lastHttpStatus: null,
    lastCheckResult: "baseline_initialized",
  },
  {
    id: "rs-zpdpl",
    code: "ZPDPL RS",
    title: "Zakon o porezu na dobit pravnih lica",
    citation: "Sl. glasnik RS br. 25/2001 ... 118/2021",
    officialUrl: "https://www.purs.gov.rs/",
    category: "Porez na dobit d.o.o.",
    baselineClauseTitle: "Čl. 39 i 63 (Stopa poreza na dobit i podnošenje prijave)",
    baselineText: [
      "Član 39: Stopa poreza na dobit pravnih lica je proporcionalna i jednoobrazna i iznosi 15%.",
      "Član 63: Poreska prijava i poreski bilans (PDP) podnose se u roku od 180 dana od dana isteka perioda za koji se utvrđuje porez.",
    ].join("\n"),
    etag: null,
    lastModified: null,
    lastCheckedAt: null,
    lastHttpStatus: null,
    lastCheckResult: "baseline_initialized",
  },
];

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

  // Ako su redovi predugački, direktan fallback bez O(m*n) alokacije
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
 * Pure-JS paralelni (side-by-side) diff engine za zakonske odredbe.
 * Poredi stare i nove članove zakona sa minimalnom upotrebom memorije.
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

  // Upari uzastopne removed + added u "modified" redove za pravi paralelni prikaz
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

export function createLegalMonitorService(dataDir) {
  const stateFilePath = path.join(dataDir, "legal_monitor_state.json");

  const loadState = () => {
    try {
      if (fs.existsSync(stateFilePath)) {
        const parsed = JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
        if (parsed && Array.isArray(parsed.laws)) {
          return parsed;
        }
      }
    } catch {}
    return {
      laws: DEFAULT_WATCHED_LAWS.map((law) => ({
        ...law,
        baselineHash: sha256Text(law.baselineText),
      })),
      notifications: [],
      telemetry: {
        checksRun: 0,
        lastCheckAt: null,
        lastCheckDurationMs: 0,
        intervalHours: 12,
      },
    };
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

  const getStatus = () => {
    const mem = process.memoryUsage();
    const unreadCount = state.notifications.filter((n) => !n.acknowledged).length;
    return {
      success: true,
      engineMode: "low-resource-http-head-and-lcs-diff",
      telemetry: {
        ...state.telemetry,
        unreadCount,
        totalNotifications: state.notifications.length,
        rssMemoryMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      },
      laws: state.laws.map((l) => ({
        id: l.id,
        code: l.code,
        title: l.title,
        citation: l.citation,
        officialUrl: l.officialUrl,
        category: l.category,
        baselineClauseTitle: l.baselineClauseTitle,
        baselineText: l.baselineText,
        baselineHash: l.baselineHash,
        etag: l.etag,
        lastModified: l.lastModified,
        lastCheckedAt: l.lastCheckedAt,
        lastHttpStatus: l.lastHttpStatus,
        lastCheckResult: l.lastCheckResult,
      })),
      notifications: state.notifications.slice(0, 50),
    };
  };

  /**
   * Lagana provera zvaničnih izvora (HTTP HEAD sa timeout-om od 3.5s, bez DOM parsiranja ili AI troškova).
   */
  const runLightweightHttpChecks = async () => {
    const startMs = Date.now();
    const results = [];

    for (const law of state.laws) {
      const checkedAt = new Date().toISOString();
      try {
        const headers = { "User-Agent": "ShiftPulse-LegalMonitor/1.0 (+lightweight-head)" };
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
            lawId: law.id,
            lawCode: law.code,
            lawTitle: law.title,
            articleLabel: "Detektovana izmena zaglavlja zvaničnog izvora (HTTP ETag / Last-Modified)",
            severity: "medium",
            detectedAt: checkedAt,
            acknowledged: false,
            sourceUrl: law.officialUrl,
            summary: `Zvanični izvor za ${law.code} je vratio izmenjeni ETag / Last-Modified zaglavlje (HTTP ${res.status}). Preporučena verifikacija izmena teksta.`,
            baselineText: law.baselineText,
            amendedText: law.baselineText,
            sideBySideDiff: computeSideBySideDiff(law.baselineText, law.baselineText),
          });
        } else {
          law.lastCheckResult = `http_${res.status}_verified`;
        }

        results.push({ id: law.id, status: res.status, result: law.lastCheckResult });
      } catch (err) {
        law.lastCheckedAt = checkedAt;
        law.lastHttpStatus = null;
        law.lastCheckResult = "offline_or_timeout_skipped";
        results.push({ id: law.id, status: null, result: "offline_or_timeout_skipped" });
      }
    }

    state.telemetry.checksRun += 1;
    state.telemetry.lastCheckAt = new Date().toISOString();
    state.telemetry.lastCheckDurationMs = Date.now() - startMs;
    saveState();

    return {
      success: true,
      durationMs: state.telemetry.lastCheckDurationMs,
      results,
      telemetry: getStatus().telemetry,
    };
  };

  /**
   * Poređenje važeće baze zakona sa novim/predloženim tekstom zakonskog akta
   * i generisanje Admin notifikacije sa paralelnim prikazom izmenjenih delova.
   */
  const compareClauseAndNotifyAdmin = ({
    lawId,
    updatedText,
    articleLabel = "Izmena zakonske odredbe",
    summaryNote = "",
    severity = "high",
  }) => {
    const law = state.laws.find((l) => l.id === lawId);
    if (!law) {
      return { success: false, error: "Zakon nije pronađen u monitor registru." };
    }
    const cleanNew = String(updatedText || "").trim();
    if (!cleanNew) {
      return { success: false, error: "Nedostaje novi tekst zakonske odredbe za poređenje." };
    }

    const diff = computeSideBySideDiff(law.baselineText, cleanNew);
    if (!diff.hasChanges) {
      return {
        success: true,
        hasChanges: false,
        message: "Nisu uočene razlike u odnosu na trenutno aktivnu bazu zakona.",
        sideBySideDiff: diff,
      };
    }

    const notification = {
      id: `leg-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
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
        `Uočena izmena (${diff.stats.modifiedCount} izmenjenih, ${diff.stats.addedCount} dodatih, ${diff.stats.removedCount} uklonjenih odredbi) u ${law.code}.`,
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

  const acknowledgeNotification = (notificationId, { adoptAsBaseline = false } = {}) => {
    const target = state.notifications.find((n) => n.id === notificationId);
    if (!target) {
      return { success: false, error: "Notifikacija nije pronađena." };
    }
    target.acknowledged = true;
    target.acknowledgedAt = new Date().toISOString();

    if (adoptAsBaseline && target.amendedText) {
      const law = state.laws.find((l) => l.id === target.lawId);
      if (law) {
        law.baselineText = target.amendedText;
        law.baselineHash = sha256Text(target.amendedText);
        law.lastCheckResult = "baseline_updated_by_admin";
      }
    }
    saveState();
    return { success: true, notification: target };
  };

  // Pokreni laganu periodičnu proveru svakih 12 sati bez blokiranja gašenja procesa
  const timer = setInterval(() => {
    runLightweightHttpChecks().catch(() => {});
  }, 12 * 60 * 60 * 1000);
  if (typeof timer.unref === "function") timer.unref();

  return {
    getStatus,
    runLightweightHttpChecks,
    compareClauseAndNotifyAdmin,
    acknowledgeNotification,
  };
}
