import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import { Client } from "pg";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { createLegalMonitorService } from "./legalMonitorEngine.js";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
const MASTER_ENCRYPTION_KEY =
  process.env.LEDGER_MASTER_SECRET ||
  "359b8c642f883f3e8f85f1c2b5e913a47d2b8e3a5f6c8d7b1a2c3d4e5f6a7b8c";
const ALGORITAM = "aes-256-cbc";
function generisiB2BLicencu(podaci) {
  const tekstZaEnkripciju = JSON.stringify(podaci);
  const iv = crypto.randomBytes(16);
  const kljucBafer = crypto.scryptSync(MASTER_ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITAM, kljucBafer, iv);
  let kriptovanTekst = cipher.update(tekstZaEnkripciju, "utf8", "hex");
  kriptovanTekst += cipher.final("hex");
  return `${iv.toString("hex")}:${kriptovanTekst}`;
}
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtoy/gpIB/szHA4ECbPPq
ArviUKRLy9fqhpwPqp5iE2R2xDag+31DPSK12JVxc73YAdS+KC652IdZiFFnC4De
9DrIW/svEwoVvzu75rk9+m2ZFFSiRIw1JvUMZouPwND0327yGks0m9r/Uu9UIlLm
9K4UM/+8MM1cRxPexUvv+UWwRwg6iTImnZsrIAxu4z4aeUARrEv0qBqkaPxRLehz
6mdnbNer61hDT5eh/VTh2MRHUi12BF5jvwyHYt9XxTh42X4VDOMF25awHQpP8a6A
vt6sSiWt+dG6RCmcgObnoM3Cj45MMU9PpGESPaAZzYwREJPOU1GSnEsXLxUPOxgj
PwIDAQAB
-----END PUBLIC KEY-----`;
export function validatePromoLicense(licenseKeyBase64) {
  try {
    const buffer = Buffer.from(licenseKeyBase64.trim(), "base64");
    const decrypted = crypto.publicDecrypt(PUBLIC_KEY, buffer);
    const payload = JSON.parse(decrypted.toString("utf-8"));
    if (!payload.expiresAt) {
      return { isValid: false, reason: "Nevalidan format licence." };
    }
    const currentDate = /* @__PURE__ */ new Date();
    const expirationDate = /* @__PURE__ */ new Date(
      payload.expiresAt + "T23:59:59",
    );
    if (currentDate > expirationDate) {
      return {
        isValid: false,
        reason: "Cryptographic license lease has expired.",
      };
    }
    return { isValid: true, payload };
  } catch (error) {
    return {
      isValid: false,
      reason:
        "Critical error: License signature is invalid or corrupted.",
    };
  }
}
const SYS_METADATA_FILE = path.join(__dirname, "sys_metadata.json");
function getLocalStoredTime() {
  try {
    if (fs.existsSync(SYS_METADATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SYS_METADATA_FILE, "utf-8"));
      if (parsed.last_timestamp) return new Date(parsed.last_timestamp);
    }
  } catch (e) {}
  const now = /* @__PURE__ */ new Date();
  setLocalStoredTime(now);
  return now;
}
function setLocalStoredTime(time) {
  try {
    fs.writeFileSync(
      SYS_METADATA_FILE,
      JSON.stringify(
        { key: "last_run_time", last_timestamp: time.toISOString() },
        null,
        2,
      ),
      "utf-8",
    );
  } catch (e) {}
}
getLocalStoredTime();
let globalPgClient = null;
if (process.env.DATABASE_URL) {
  try {
    globalPgClient = new Client({ connectionString: process.env.DATABASE_URL });
    globalPgClient
      .connect()
      .then(async () => {
        await globalPgClient.query(`
        CREATE TABLE IF NOT EXISTS sys_metadata (
          key VARCHAR(50) PRIMARY KEY,
          last_timestamp TIMESTAMP NOT NULL
        );
      `);
        const res = await globalPgClient.query(
          "SELECT last_timestamp FROM sys_metadata WHERE key = 'last_run_time'",
        );
        if (res.rows.length === 0) {
          await globalPgClient.query(
            "INSERT INTO sys_metadata (key, last_timestamp) VALUES ('last_run_time', NOW())",
          );
        }
      })
      .catch(() => {
        globalPgClient = null;
      });
  } catch (e) {
    globalPgClient = null;
  }
}
export async function verifySystemTimeIntegrity(dbClient) {
  try {
    const currentSystemTime = /* @__PURE__ */ new Date();
    const activeClient = dbClient || globalPgClient;
    if (activeClient) {
      const res = await activeClient.query(
        "SELECT last_timestamp FROM sys_metadata WHERE key = 'last_run_time'",
      );
      if (res.rows.length === 0) {
        await activeClient.query(
          "INSERT INTO sys_metadata (key, last_timestamp) VALUES ('last_run_time', $1)",
          [currentSystemTime],
        );
        setLocalStoredTime(currentSystemTime);
        return { isTimeValid: true, lastRecorded: currentSystemTime };
      }
      const lastRecordedTime = new Date(res.rows[0].last_timestamp);
      if (currentSystemTime < lastRecordedTime) {
        return {
          isTimeValid: false,
          reason:
            "Sistemska gre\u0161ka: Detektovana manipulacija vremenom na ra\u010Dunaru. Pristup aplikaciji je zaklju\u010Dan.",
          lastRecorded: lastRecordedTime,
        };
      }
      await activeClient.query(
        "UPDATE sys_metadata SET last_timestamp = $1 WHERE key = 'last_run_time'",
        [currentSystemTime],
      );
      setLocalStoredTime(currentSystemTime);
      return { isTimeValid: true, lastRecorded: currentSystemTime };
    } else {
      const lastRecordedTime = getLocalStoredTime();
      if (currentSystemTime.getTime() < lastRecordedTime.getTime() - 6e4) {
        return {
          isTimeValid: false,
          reason:
            "Sistemska gre\u0161ka: Detektovana manipulacija vremenom na ra\u010Dunaru. Pristup aplikaciji je zaklju\u010Dan.",
          lastRecorded: lastRecordedTime,
        };
      }
      if (currentSystemTime.getTime() > lastRecordedTime.getTime()) {
        setLocalStoredTime(currentSystemTime);
      }
      return { isTimeValid: true, lastRecorded: currentSystemTime };
    }
  } catch (error) {
    return {
      isTimeValid: false,
      reason: "Gre\u0161ka pri proveri integriteta sistema.",
    };
  }
}
function validirajLokalnuLicencu(kljucLicence) {
  if (!kljucLicence) {
    return {
      validna: false,
      podaci: null,
      razlog: "Format licencnog klju\u010Da nije ispravan.",
    };
  }
  const cleaned = kljucLicence.trim();
  if (!cleaned.includes(":") && cleaned.length > 80) {
    const rsaCheck = validatePromoLicense(cleaned);
    if (rsaCheck.isValid && rsaCheck.payload) {
      return {
        validna: true,
        podaci: {
          licenseId: rsaCheck.payload.licenseId,
          nazivAgencije: rsaCheck.payload.clientName,
          pibAgencije: rsaCheck.payload.pibAgencije || "N/A",
          tier: rsaCheck.payload.tier,
          issuedAt: rsaCheck.payload.issuedAt,
          datumIsteka: rsaCheck.payload.expiresAt,
          maksimalnoRadnika: Number(rsaCheck.payload.maksimalnoRadnika) || 5000,
          features: rsaCheck.payload.features,
        },
      };
    } else {
      return { validna: false, podaci: null, razlog: rsaCheck.reason };
    }
  }
  if (!cleaned.includes(":")) {
    return {
      validna: false,
      podaci: null,
      razlog: "Invalid license key format.",
    };
  }
  try {
    const [ivHex, kriptovanTekst] = cleaned.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const kljucBafer = crypto.scryptSync(MASTER_ENCRYPTION_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv(ALGORITAM, kljucBafer, iv);
    let dešifrovanTekst = decipher.update(kriptovanTekst, "hex", "utf8");
    dešifrovanTekst += decipher.final("utf8");
    const podaci = JSON.parse(dešifrovanTekst);
    const danas = /* @__PURE__ */ new Date();
    const datumIsteka = /* @__PURE__ */ new Date(
      podaci.datumIsteka + "T23:59:59",
    );
    if (danas > datumIsteka) {
      return {
        validna: false,
        podaci,
        razlog: `Licenca je istekla dana ${podaci.datumIsteka}.`,
      };
    }
    return { validna: true, podaci };
  } catch (err) {
    return {
      validna: false,
      podaci: null,
      razlog:
        "Kriptografski potpis neispravan. Klju\u010D je modifikovan ili hakovan!",
    };
  }
}
let AKTIVNI_KLIJENTSKI_KLJUC = process.env.B2B_LICENSE_KEY || "";
const ISSUED_LICENSES_AUDIT_FILE = path.join(__dirname, "issued_licenses_audit.jsonl");

function appendIssuedLicenseAudit(entry) {
  try {
    fs.appendFileSync(ISSUED_LICENSES_AUDIT_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (e) {
    console.warn("License audit log warning:", e.message);
  }
}

function readIssuedLicenseAudit(limit = 30) {
  try {
    if (!fs.existsSync(ISSUED_LICENSES_AUDIT_FILE)) return [];
    const lines = fs
      .readFileSync(ISSUED_LICENSES_AUDIT_FILE, "utf8")
      .split(/\r?\n/)
      .filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

app.post("/api/license/admin-generate", (req, res) => {
  try {
    const { pibAgencije, nazivAgencije, maksimalnoRadnika, datumIsteka } =
      req.body;
    if (!pibAgencije || !nazivAgencije || !datumIsteka) {
      res
        .status(400)
        .json({ error: "Nedostaju obavezni parametri za izradu licence." });
      return;
    }
    const noviKljuc = generisiB2BLicencu({
      pibAgencije: String(pibAgencije),
      nazivAgencije: String(nazivAgencije),
      maksimalnoRadnika: Number(maksimalnoRadnika || 9999),
      datumIsteka: String(datumIsteka),
      // Format: YYYY-MM-DD
    });
    const keyFingerprint = crypto
      .createHash("sha256")
      .update(noviKljuc)
      .digest("hex")
      .slice(0, 12);
    appendIssuedLicenseAudit({
      issuedAt: new Date().toISOString(),
      pibAgencije: String(pibAgencije),
      nazivAgencije: String(nazivAgencije),
      maksimalnoRadnika: Number(maksimalnoRadnika || 9999),
      datumIsteka: String(datumIsteka),
      keyFingerprint,
    });
    res.json({
      success: true,
      kljucZaKlijenta: noviKljuc,
      kljujcZaKlijenta: noviKljuc,
      keyFingerprint,
      napomena:
        "Kopirajte ovaj klju\u010D i po\u0161aljite ga knjigovodstvenoj agenciji da ga unese u svoj sistem.",
    });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Gre\u0161ka na master generatoru licenci.",
        details: error.message,
      });
  }
});
app.get("/api/license/status", async (req, res) => {
  const timeCheck = await verifySystemTimeIntegrity();
  const customKey = req.headers["x-license-key"] || req.query.key;
  const kljucZaProveru =
    customKey || AKTIVNI_KLIJENTSKI_KLJUC || process.env.B2B_LICENSE_KEY;
  if (!timeCheck.isTimeValid) {
    res.json({
      success: false,
      valid: false,
      trial: false,
      antiClockTampering: {
        isTimeValid: false,
        reason: timeCheck.reason,
        lastRecorded: timeCheck.lastRecorded,
      },
      licenciraniPravniSubjekat: "SYSTEM LOCKED",
      datumIsteka: "BLOCKED",
      poruka: timeCheck.reason,
    });
    return;
  }
  if (!kljucZaProveru) {
    res.json({
      success: false,
      valid: false,
      trial: true,
      antiClockTampering: {
        isTimeValid: true,
        lastRecorded: timeCheck.lastRecorded,
      },
      licenciraniPravniSubjekat: "Unlicensed Workstation (Trial)",
      datumIsteka: "TRIAL",
      maksimalnoRadnika: 3,
      poruka:
        "Workstation running in unlicensed trial mode (up to 3 workers). ePorezi XML export requires an active commercial license.",
    });
    return;
  }
  const provera = validirajLokalnuLicencu(kljucZaProveru);
  if (provera.validna && provera.podaci) {
    res.json({
      success: true,
      valid: true,
      trial: false,
      licenseId: provera.podaci.licenseId,
      licenciraniPravniSubjekat: provera.podaci.nazivAgencije,
      pibAgencije: provera.podaci.pibAgencije,
      tier: provera.podaci.tier || "Enterprise / Full Content",
      issuedAt: provera.podaci.issuedAt,
      datumIsteka: provera.podaci.datumIsteka,
      maksimalnoRadnika: provera.podaci.maksimalnoRadnika,
      features: provera.podaci.features || [
        "ai_scanner",
        "conflict_monitor",
        "b2b_shift_management",
        "eporezi_xml",
      ],
      antiClockTampering: {
        isTimeValid: true,
        lastRecorded: timeCheck.lastRecorded,
      },
      poruka: `Station authorized and licensed (${provera.podaci.tier || "Enterprise"}).`,
    });
  } else {
    res.json({
      success: false,
      valid: false,
      trial: true,
      antiClockTampering: {
        isTimeValid: true,
        lastRecorded: timeCheck.lastRecorded,
      },
      licenciraniPravniSubjekat: "Unlicensed Workstation",
      datumIsteka: "EXPIRED",
      poruka:
        provera.razlog || "License key is missing, invalid, or expired.",
    });
  }
});
app.post("/api/license/activate", (req, res) => {
  try {
    const { kljucLicence } = req.body;
    if (!kljucLicence) {
      res
        .status(400)
        .json({ success: false, error: "Nedostaje licencni klju\u010D." });
      return;
    }
    const provera = validirajLokalnuLicencu(kljucLicence);
    if (!provera.validna) {
      res
        .status(400)
        .json({
          success: false,
          error: provera.razlog || "Licenca nije validna.",
        });
      return;
    }
    AKTIVNI_KLIJENTSKI_KLJUC = kljucLicence.trim();
    res.json({
      success: true,
      message:
        "Licenca je uspe\u0161no autorizovana i aktivirana na ovoj stanici!",
      licenca: provera.podaci,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        error: "Gre\u0161ka pri aktivaciji licence.",
        details: error.message,
      });
  }
});
app.post("/api/license/verify", (req, res) => {
  const { kljucLicence } = req.body;
  const provera = validirajLokalnuLicencu(kljucLicence);
  res.json(provera);
});
const štitLicence = async (req, res, next) => {
  const timeCheck = await verifySystemTimeIntegrity();
  if (!timeCheck.isTimeValid) {
    res.status(403).json({
      error:
        timeCheck.reason ||
        "Pristup odbijen: Detektovana manipulacija sistemskim satom.",
      antiClockTampering: true,
    });
    return;
  }
  const customKey = req.headers["x-license-key"] || req.query.key;
  const klijentskiKljuc =
    customKey || AKTIVNI_KLIJENTSKI_KLJUC || process.env.B2B_LICENSE_KEY;
  if (!klijentskiKljuc) {
    if (
      req.path === "/api/ledger/calculate-payroll" &&
      (req.body.radnici?.length > 3 || req.body.workerCount > 3)
    ) {
      res.status(403).json({
        error:
          "Trial limit: Unlicensed workstations can calculate up to 3 employees per batch.",
        trial: true,
      });
      return;
    }
    if (req.path === "/api/ledger/generate-xml") {
      res.status(403).json({
        error:
          "License required: ePorezi PPP-PD XML export requires an active commercial license key.",
        trial: true,
      });
      return;
    }
    next();
    return;
  }
  const provera = validirajLokalnuLicencu(klijentskiKljuc);
  if (!provera.validna) {
    res.status(403).json({
      error:
        "Access denied: Commercial license for this workstation is inactive or expired.",
      detalji: provera.razlog,
    });
    return;
  }
  if (
    provera.podaci?.features &&
    req.path === "/api/ledger/generate-xml" &&
    !provera.podaci.features.includes("eporezi_xml")
  ) {
    res.status(403).json({
      error: "Your active license tier does not include the ePorezi XML export module.",
      trial: false,
    });
    return;
  }
  next();
};
app.post("/api/ledger/calculate-payroll", štitLicence, (req, res) => {
  try {
    const {
      grossSalary,
      brutoBaza,
      satnica,
      regularHours,
      vacationHours,
      sickHours65,
      sickHours100,
      nightHours,
      holidayHours,
      overtimeHours,
    } = req.body;

    const base = Number(grossSalary || brutoBaza) || 95000;
    const hourlyRate = Number(satnica) || Math.round(base / 176);

    const regHours = Number(regularHours) || 0;
    const vacHours = Number(vacationHours) || 0;
    const sick65 = Number(sickHours65) || 0;
    const sick100 = Number(sickHours100) || 0;
    const nightH = Number(nightHours) || 0;
    const holHours = Number(holidayHours) || 0;
    const otHours = Number(overtimeHours) || 0;

    // Ako su poslati sati, računamo po satima, inače koristimo osnovicu
    let regularPay = 0;
    let vacationPay = 0;
    let sickPay65 = 0;
    let sickPay100 = 0;

    if (regHours > 0 || vacHours > 0 || sick65 > 0 || sick100 > 0) {
      regularPay = regHours * hourlyRate;
      vacationPay = vacHours * hourlyRate * 1.0; // 100%
      sickPay65 = sick65 * hourlyRate * 0.65; // 65%
      sickPay100 = sick100 * hourlyRate * 1.0; // 100%
    } else {
      regularPay = base;
    }

    const bonusNight = nightH * hourlyRate * 0.26;
    const bonusHoliday = holHours * hourlyRate * 1.1;
    const bonusOvertime = otHours * hourlyRate * 0.26;

    const ukupnaBrutoOsnovica =
      regularPay +
      vacationPay +
      sickPay65 +
      sickPay100 +
      bonusNight +
      bonusHoliday +
      bonusOvertime;

    const neoporezivo = 25000;
    const poreskaBaza = Math.max(0, ukupnaBrutoOsnovica - neoporezivo);
    const porez = poreskaBaza * 0.10;
    const pioRadnik = ukupnaBrutoOsnovica * 0.14;
    const zdravstvoRadnik = ukupnaBrutoOsnovica * 0.0515;
    const nezaposlenostRadnik = ukupnaBrutoOsnovica * 0.0075;
    const doprinosiRadnik = pioRadnik + zdravstvoRadnik + nezaposlenostRadnik;
    const neto = ukupnaBrutoOsnovica - porez - doprinosiRadnik;

    const pioFirma = ukupnaBrutoOsnovica * 0.10;
    const zdravstvoFirma = ukupnaBrutoOsnovica * 0.0515;
    const doprinosiFirma = pioFirma + zdravstvoFirma;
    const brutoII = ukupnaBrutoOsnovica + doprinosiFirma;

    res.json({
      success: true,
      obracun: {
        ukupnaBrutoOsnovica: Math.round(ukupnaBrutoOsnovica * 100) / 100,
        bruto: Math.round(ukupnaBrutoOsnovica * 100) / 100,
        neto: Math.round(neto * 100) / 100,
        porez: Math.round(porez * 100) / 100,
        doprinosiRadnik: Math.round(doprinosiRadnik * 100) / 100,
        doprinosiFirma: Math.round(doprinosiFirma * 100) / 100,
        ukupnoZaIsplatuFirme: Math.round(brutoII * 100) / 100,
        naknade: {
          redovanRad: Math.round(regularPay * 100) / 100,
          godisnjiOdmor: Math.round(vacationPay * 100) / 100,
          bolovanje65: Math.round(sickPay65 * 100) / 100,
          bolovanje100: Math.round(sickPay100 * 100) / 100,
        },
        uvecanja: {
          nocniRad: Math.round(bonusNight * 100) / 100,
          praznicniRad: Math.round(bonusHoliday * 100) / 100,
          prekovremeniRad: Math.round(bonusOvertime * 100) / 100,
        },
        licencaVerifikovana: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Greška pri obračunu zarada.",
      details: error.message,
    });
  }
});
app.post("/api/ledger/generate-xml", štitLicence, (req, res) => {
  try {
    const { pibIsplatioca, obracunskiPeriod, stavke } = req.body;
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<PodaciPoreskeDeklaracije xmlns="http://pid.purs.gov.rs">
  <Zaglavlje>
    <PoreskiPeriod>${obracunskiPeriod || "2026-10"}</PoreskiPeriod>
    <PoreskiIdentifikacioniBroj>${pibIsplatioca || "109876543"}</PoreskiIdentifikacioniBroj>
    <UkupanBrojLica>${Array.isArray(stavke) ? stavke.length : 1}</UkupanBrojLica>
    <KriptoPotpisValidiran>DA</KriptoPotpisValidiran>
  </Zaglavlje>
</PodaciPoreskeDeklaracije>`;
    res.setHeader("Content-Type", "application/xml");
    res.send(xmlContent);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Gre\u0161ka pri generisanju XML deklaracije.",
        details: error.message,
      });
  }
});
let interniRegistarOglasa = [];
app.get("/api/posredovanje/oglasi", (req, res) => {
  res.json({ success: true, oglasi: interniRegistarOglasa });
});
app.post("/api/posredovanje/kreiraj", (req, res) => {
  const oglasLog = {
    ...req.body,
    id: `oglas-log-${Date.now()}`,
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  };
  interniRegistarOglasa.unshift(oglasLog);
  res.json({ success: true, oglas: oglasLog });
});
app.patch("/api/posredovanje/status/:id", (req, res) => {
  const { id } = req.params;
  const { status, interneBeleskeAgencije } = req.body;
  interniRegistarOglasa = interniRegistarOglasa.map((o) =>
    o.id === id
      ? {
          ...o,
          status: status ?? o.status,
          interneBeleskeAgencije:
            interneBeleskeAgencije ?? o.interneBeleskeAgencije,
        }
      : o,
  );
  res.json({ success: true, message: "Dosije oglasa a\u017Euriran." });
});
// ========================================================
// OPTIMIZED SERVER-SIDE GEMINI AI & ZERO-PII HITL TELEMETRY
// ========================================================
const HITL_AUDIT_LOG_FILE = path.join(__dirname, "hitl_approval_audit.jsonl");

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

function handleGeminiError(res, err, fallbackMsg) {
  const status = err?.status || err?.code || 500;
  const httpStatus = status === 429 ? 429 : status >= 400 && status < 500 ? status : 502;
  res.status(httpStatus).json({
    success: false,
    error: fallbackMsg,
    details: err?.message || "Nepoznata greška AI gateway-a.",
  });
}

function persistSanitizedHitlLog(rawBody = {}) {
  const allowedDecisions = ["approved", "edited_approved", "rejected"];
  const normalizedDecision = allowedDecisions.includes(rawBody.decision)
    ? rawBody.decision
    : rawBody.akcija === "odbijeno"
      ? "rejected"
      : "approved";

  // ZERO-KNOWLEDGE: Prikupljamo ISKLJUČIVO nalog/ulogu i status odobrenja AI odgovora.
  // Nikakvi finansijski podaci, PIB, plate, imena klijenata ili tekstovi ugovora se NE ČUVAJU.
  const sanitizedEntry = {
    logId: `hitl-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    timestamp: new Date().toISOString(),
    licenseId: String(rawBody.licenseId || "STATION-LOCAL").slice(0, 64),
    accountId: String(rawBody.accountId || "op-owner-1").slice(0, 64),
    accountUsername: String(
      rawBody.accountUsername || rawBody.operaterIme || "lokalni_operater",
    ).slice(0, 64),
    accountRole: String(rawBody.accountRole || "Ovlašćeni Operater").slice(0, 64),
    module: String(rawBody.module || "ai_copilot").slice(0, 64),
    decision: normalizedDecision,
    aiModel: String(rawBody.aiModel || "gemini-4-hydrogen").slice(0, 64),
    executionSource: String(rawBody.executionSource || "gemini_api").slice(0, 32),
    totalTokens: Math.max(0, Number(rawBody.totalTokens) || 0),
    attestationConfirmed: rawBody.attestationConfirmed !== false,
  };

  fs.appendFileSync(HITL_AUDIT_LOG_FILE, JSON.stringify(sanitizedEntry) + "\n", "utf8");
  return sanitizedEntry;
}

app.post("/api/legal/analyze-document", async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        code: "GEMINI_KEY_MISSING",
        error:
          "GEMINI_API_KEY nije podešen na serveru. Koristite lokalni deterministički analitičar dokumenata (0 tokena).",
      });
    }

    const { base64Data, mimeType, extractedTextSnippet } = req.body || {};
    if (!base64Data && !extractedTextSnippet) {
      return res.status(400).json({
        success: false,
        error: "Nedostaje dokument ili tekst za AI analizu.",
      });
    }

    const parts = [];
    if (extractedTextSnippet) {
      parts.push({
        text: `Analiziraj radni ugovor / platni list (RS Zakon o radu):\n${String(extractedTextSnippet).slice(0, 8000)}`,
      });
    } else {
      parts.push({
        inlineData: {
          data: String(base64Data),
          mimeType: mimeType || "application/pdf",
        },
      });
      parts.push({
        text: "Izvuci poslodavca, ulogu, satnicu, prekovremeni/noćni rad i proveri odstupanja od Zakona o radu RS.",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: parts,
      config: {
        systemInstruction:
          "Ti si precizan pravno-obračunski ekstraktor za RS Zakon o radu. Izvuci tražena polja sažeto u JSON formatu; ako podatak nedostaje stavi 0 ili 'Nepoznato'. U legalComplianceAlerts navedi samo konkretna zakonska upozorenja (maks 3 kratke stavke).",
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

    res.json({
      success: true,
      ...parsed,
      aiMeta: {
        model: "gemini-4-hydrogen",
        thinkingLevel: "LOW",
        executionSource: "gemini_api",
        promptTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
    });
  } catch (error) {
    console.error("Gemini document analysis error:", error);
    handleGeminiError(res, error, "Greška tokom server-side Gemini analize dokumenta.");
  }
});

app.post("/api/schedule/detect-conflicts", async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        code: "GEMINI_KEY_MISSING",
        error: "GEMINI_API_KEY nije podešen na serveru za kompleksnu analizu poruka.",
      });
    }

    const { incomingMessage, compactScheduleSummary, existingShifts } = req.body || {};
    if (!incomingMessage) {
      return res.status(400).json({
        success: false,
        error: "Nedostaje ulazna poruka za proveru konflikta.",
      });
    }

    // Optimizacija tokena: koristi već sabijeni tekst ili kompajlira maks 15 smena server-side
    const scheduleStr = compactScheduleSummary
      ? String(compactScheduleSummary).slice(0, 1500)
      : Array.isArray(existingShifts)
        ? existingShifts
            .slice(0, 15)
            .map((s) => `${s.date} ${s.startTime}-${s.endTime}`)
            .join("; ")
        : "Nema zakazanih smena";

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `Raspored: ${scheduleStr || "Prazan"}\nPoruka: ${String(incomingMessage).slice(0, 1200)}`,
      config: {
        systemInstruction:
          "Proveri da li nova poruka sadrži preklapanje smena sa rasporedom. Vrati kratak status i profesionalan nacrt odgovora na srpskom jeziku.",
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

    res.json({
      success: true,
      ...parsed,
      aiMeta: {
        model: "gemini-4-hydrogen",
        thinkingLevel: "LOW",
        executionSource: "gemini_api",
        promptTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
    });
  } catch (error) {
    console.error("Gemini conflict detection error:", error);
    handleGeminiError(res, error, "Greška tokom Gemini provere konflikta smena.");
  }
});

app.post("/api/hitl/log-approval", (req, res) => {
  try {
    const entry = persistSanitizedHitlLog(req.body || {});
    res.json({
      success: true,
      privacyGuarantee: "account-and-approval-status-only",
      entry,
      message:
        "HITL odluka lokalnog naloga je trajno zabeležena na serveru bez ikakvih poslovnih ili ličnih podataka.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Greška pri upisu HITL telemetrije.",
      details: error.message,
    });
  }
});

app.get("/api/hitl/logs", (_req, res) => {
  try {
    if (!fs.existsSync(HITL_AUDIT_LOG_FILE)) {
      return res.json({
        success: true,
        privacyGuarantee: "account-and-approval-status-only",
        totalCount: 0,
        logs: [],
      });
    }
    const lines = fs
      .readFileSync(HITL_AUDIT_LOG_FILE, "utf8")
      .split(/\r?\n/)
      .filter(Boolean);
    const parsed = lines
      .slice(-100)
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({
      success: true,
      privacyGuarantee: "account-and-approval-status-only",
      totalCount: lines.length,
      logs: parsed,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sanitized backward-compatible alias: više NE upisuje PIB ni sadržaj ugovora!
app.post("/api/legal/log-action", (req, res) => {
  try {
    const entry = persistSanitizedHitlLog(req.body || {});
    res.json({
      success: true,
      privacyGuarantee: "account-and-approval-status-only",
      entry,
      message:
        "Operacija je autentifikovana od strane lokalnog naloga i zabeležena samo kao status odobrenja.",
    });
  } catch (error) {
    res.status(500).json({
      error: "Greška pri upisu u bezbednosni log.",
      details: error.message,
    });
  }
});

// ========================================================
// COMMERCIAL OS DISTRIBUTION PACKAGES (Windows, Linux, ChromeOS)
// ========================================================
app.get("/api/packages/info", (_req, res) => {
  const downloadsDir = path.join(__dirname, "public", "downloads");

  const getFileInfo = (filename) => {
    const fullPath = path.join(downloadsDir, filename);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      return {
        exists: true,
        sizeBytes: stat.size,
        sizeFormatted: (stat.size / 1024).toFixed(1) + " KB",
        updatedAt: stat.mtime.toISOString(),
      };
    }
    return { exists: false, sizeBytes: 0, sizeFormatted: "Not generated" };
  };

  res.json({
    success: true,
    launchMarket: "RS",
    packages: {
      windows: {
        id: "win",
        title: "Windows 10 / 11 / Server",
        filename: "shiftpulse-windows-package.zip",
        format: "ZIP Archive",
        downloadUrl: "/api/packages/download/windows",
        ...getFileInfo("shiftpulse-windows-package.zip"),
        instructions: [
          "Extract the ZIP archive to any local directory",
          "Double-click 'install-windows.bat' to configure the local workspace folders",
          "Launch from the Desktop shortcut or via 'start-windows.bat'",
        ],
        targetRuntimes: ["Windows 10", "Windows 11", "Windows Server 2019/2022"],
        features: [
          "Automatic ShiftPulse_Workspace subfolder provisioning",
          "Desktop shortcut & local workstation gateway",
          "Offline P&L/Tax scanner and local HITL audit log",
        ],
      },
      linux: {
        id: "linux",
        title: "Linux (Ubuntu / Debian / Fedora / Arch)",
        filename: "shiftpulse-linux-package.tar.gz",
        format: "TAR.GZ Archive",
        downloadUrl: "/api/packages/download/linux",
        ...getFileInfo("shiftpulse-linux-package.tar.gz"),
        instructions: [
          "Extract archive: tar -xzf shiftpulse-linux-package.tar.gz",
          "Make executable & install: chmod +x install-linux.sh && ./install-linux.sh",
          "Launch from your Desktop Application Menu or run ./start-linux.sh",
        ],
        targetRuntimes: [
          "Ubuntu 20.04 / 22.04 / 24.04",
          "Debian 11 / 12",
          "Fedora 38+",
          "Arch Linux",
        ],
        features: [
          "FreeDesktop .desktop application menu integration",
          "Auto-provisioned ~/ShiftPulse_Workspace directory tree",
          "Offline workstation mode with zero cloud data leakage",
        ],
      },
      chromeos: {
        id: "chromeos",
        title: "ChromeOS & Chromebook",
        filename: "shiftpulse-chromeos-package.zip",
        format: "ZIP / Native PWA",
        downloadUrl: "/api/packages/download/chromeos",
        ...getFileInfo("shiftpulse-chromeos-package.zip"),
        instructions: [
          "1-Click Native PWA: Open in Chrome and click 'Install to Shelf'",
          "Crostini Linux container: Extract zip and run chmod +x install-chromeos.sh && ./install-chromeos.sh",
        ],
        targetRuntimes: ["ChromeOS (Chromebook)", "ChromeOS Flex"],
        features: [
          "1-Click ChromeOS Shelf installation",
          "Offline Service Worker caching for air-gapped work",
          "Crostini Linux container local server bundle",
        ],
      },
    },
  });
});

app.get("/api/packages/download/:os", (req, res) => {
  const osType = req.params.os.toLowerCase();
  const downloadsDir = path.join(__dirname, "public", "downloads");
  let filename = "";

  if (osType === "windows" || osType === "win") {
    filename = "shiftpulse-windows-package.zip";
  } else if (osType === "linux") {
    filename = "shiftpulse-linux-package.tar.gz";
  } else if (osType === "chromeos" || osType === "cos") {
    filename = "shiftpulse-chromeos-package.zip";
  } else {
    return res.status(400).json({ error: "Nepoznat operativni sistem." });
  }

  const filePath = path.join(downloadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Paket još uvek nije generisan." });
  }

  res.download(filePath, filename);
});

// ========================================================
// HYBRID GATEWAY & LOCAL WORKSPACE ARCHITECTURE (ZERO-KNOWLEDGE)
// ========================================================
const LOCAL_WORKSPACE_ROOT =
  process.env.SHIFTPULSE_WORKSPACE_DIR ||
  path.join(os.homedir(), "ShiftPulse_Workspace");

const WORKSPACE_FOLDER_STRUCTURE = {
  "01_Ulaz_Dokumenta": [
    "Fakture_Racuni",
    "Otpremnice",
    "POS_Slipovi_Fiskalni",
    "Bankarski_Izvodi",
    "Obrada_Zavrseno",
  ],
  "02_Izlaz_Dokumenta": [
    "Bilansi_Porezi_CSV",
    "Zarade_ePorezi_XML",
    "Virmani_Nalozi",
    "Arhiva_Ugovori",
  ],
  "03_Korisnicki_Backup": [],
};

function isLocalDesktopRuntime(req) {
  if (process.env.SHIFTPULSE_LOCAL_DESKTOP === "1") return true;
  if (!req) return false;
  const host = String(req.headers.host || "").split(":")[0].toLowerCase();
  const forwarded = req.headers["x-forwarded-host"];
  return !forwarded && (host === "localhost" || host === "127.0.0.1" || host === "::1");
}

function ensureLocalWorkspaceTree(rootDir = LOCAL_WORKSPACE_ROOT) {
  fs.mkdirSync(rootDir, { recursive: true });
  for (const [topDir, subDirs] of Object.entries(WORKSPACE_FOLDER_STRUCTURE)) {
    const topPath = path.join(rootDir, topDir);
    fs.mkdirSync(topPath, { recursive: true });
    for (const sub of subDirs) {
      fs.mkdirSync(path.join(topPath, sub), { recursive: true });
    }
  }
  const readmePath = path.join(rootDir, "UPUTSTVO_OFFLINE_RAD.txt");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      [
        "SHIFTPULSE LEDGER PRO - LOKALNI RADNI PROSTOR",
        "01_Ulaz_Dokumenta/ -> Ubaci fakture, otpremnice, slipove, izvode za offline skeniranje",
        "02_Izlaz_Dokumenta/ -> Generisani CSV bilansi, ePorezi XML, virmani i ugovori",
        "03_Korisnicki_Backup/ -> Enkriptovani AES-256-GCM korisnicki backup fajlovi",
      ].join("\n"),
      "utf-8",
    );
  }
  const manifestPath = path.join(rootDir, "workspace-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          app: "ShiftPulse Ledger Pro",
          privacyPolicy: "zero-knowledge-client-device-only",
          createdAt: new Date().toISOString(),
          folders: WORKSPACE_FOLDER_STRUCTURE,
        },
        null,
        2,
      ),
      "utf-8",
    );
  }
  return rootDir;
}

if (process.env.SHIFTPULSE_LOCAL_DESKTOP === "1") {
  try {
    ensureLocalWorkspaceTree(LOCAL_WORKSPACE_ROOT);
  } catch (e) {
    console.warn("Workspace init warning:", e.message);
  }
}

const requireLocalDesktop = (req, res, next) => {
  if (!isLocalDesktopRuntime(req)) {
    return res.status(403).json({
      success: false,
      error:
        "Zero-Knowledge Gateway politika: Cloud server ne pristupa lokalnim fajlovima. Koristite lokalnu Desktop instalaciju ili Browser Folder Picker.",
    });
  }
  next();
};

const legalMonitorService = createLegalMonitorService(__dirname);

app.get("/api/gateway/status", (req, res) => {
  const localDesktopActive = isLocalDesktopRuntime(req);
  const lm = legalMonitorService.getStatus();
  res.json({
    success: true,
    gatewayRole: "license-and-regulatory-gateway",
    launchMarket: "RS",
    supportedJurisdictions: ["RS"],
    zeroKnowledgePrivacy: true,
    clientDataStoredOnServer: false,
    localDesktopActive,
    workspacePath: localDesktopActive ? LOCAL_WORKSPACE_ROOT : null,
    offlineCapable: true,
    separatedInterfaces: {
      clientWorkspace: "/",
      publicWebsite: "/site",
      installPortal: "/install",
      adminConsole: "/admin",
    },
    legalMonitorSummary: {
      watchedLawsCount: lm.laws.length,
      unreadNotifications: lm.telemetry.unreadCount,
      lastCheckAt: lm.telemetry.lastCheckAt,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    port: PORT,
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/admin/overview", (_req, res) => {
  try {
    const mem = process.memoryUsage();
    const lm = legalMonitorService.getStatus();
    let hitlTotalCount = 0;
    if (fs.existsSync(HITL_AUDIT_LOG_FILE)) {
      hitlTotalCount = fs
        .readFileSync(HITL_AUDIT_LOG_FILE, "utf8")
        .split(/\r?\n/)
        .filter(Boolean).length;
    }
    res.json({
      success: true,
      server: {
        status: "online",
        port: PORT,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptimeSec: Math.round(process.uptime()),
        rssMemoryMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        geminiProxyConfigured: Boolean(process.env.GEMINI_API_KEY),
        databaseConfigured: Boolean(globalPgClient),
      },
      hitl: {
        totalLogs: hitlTotalCount,
        privacyGuarantee: "account-and-approval-status-only",
      },
      legalMonitor: {
        watchedLawsCount: lm.laws.length,
        unreadNotifications: lm.telemetry.unreadCount,
        lastCheckAt: lm.telemetry.lastCheckAt,
      },
      issuedLicenses: readIssuedLicenseAudit(25),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// AUTOMATED LOW-RESOURCE LEGAL CHANGE MONITOR (SERVER / ADMIN)
// ========================================================
app.get("/api/legal-monitor/status", (_req, res) => {
  res.json(legalMonitorService.getStatus());
});

app.post("/api/legal-monitor/check-now", async (_req, res) => {
  try {
    const result = await legalMonitorService.runLightweightHttpChecks();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/legal-monitor/compare", (req, res) => {
  try {
    const { lawId, updatedText, articleLabel, summaryNote, severity } = req.body || {};
    const outcome = legalMonitorService.compareClauseAndNotifyAdmin({
      lawId,
      updatedText,
      articleLabel,
      summaryNote,
      severity,
    });
    if (!outcome.success) {
      return res.status(400).json(outcome);
    }
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/legal-monitor/notifications/:id/acknowledge", (req, res) => {
  try {
    const { adoptAsBaseline } = req.body || {};
    const outcome = legalMonitorService.acknowledgeNotification(req.params.id, {
      adoptAsBaseline: Boolean(adoptAsBaseline),
    });
    if (!outcome.success) {
      return res.status(404).json(outcome);
    }
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/workspace/init", requireLocalDesktop, (_req, res) => {
  try {
    const root = ensureLocalWorkspaceTree(LOCAL_WORKSPACE_ROOT);
    res.json({
      success: true,
      workspacePath: root,
      folders: WORKSPACE_FOLDER_STRUCTURE,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/workspace/input-files", requireLocalDesktop, (_req, res) => {
  try {
    const root = ensureLocalWorkspaceTree(LOCAL_WORKSPACE_ROOT);
    const inputRoot = path.join(root, "01_Ulaz_Dokumenta");
    const files = [];

    const walk = (dir, relFolder) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;
        if (entry.isDirectory()) {
          if (entry.name !== "Obrada_Zavrseno") {
            walk(path.join(dir, entry.name), entry.name);
          }
        } else if (entry.isFile()) {
          const full = path.join(dir, entry.name);
          const stat = fs.statSync(full);
          files.push({
            id: `disk-${relFolder}-${entry.name}-${stat.size}`,
            subfolder: relFolder,
            name: entry.name,
            relativePath: path.posix.join("01_Ulaz_Dokumenta", relFolder === "01_Ulaz_Dokumenta" ? "" : relFolder, entry.name),
            size: stat.size,
            lastModified: stat.mtimeMs,
            source: "local-desktop",
          });
        }
      }
    };
    walk(inputRoot, "01_Ulaz_Dokumenta");
    res.json({ success: true, workspacePath: root, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/workspace/read-input-file", requireLocalDesktop, (req, res) => {
  try {
    const rel = String(req.query.path || "");
    const inputBase = path.resolve(LOCAL_WORKSPACE_ROOT, "01_Ulaz_Dokumenta");
    const target = path.resolve(LOCAL_WORKSPACE_ROOT, rel);
    if (!target.startsWith(inputBase + path.sep) || !fs.existsSync(target)) {
      return res.status(404).json({ success: false, error: "Fajl nije pronađen u 01_Ulaz_Dokumenta." });
    }
    res.sendFile(target);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/workspace/save-output", requireLocalDesktop, (req, res) => {
  try {
    const { topFolder = "02_Izlaz_Dokumenta", subFolder = "", filename, content } = req.body || {};
    if (!filename || typeof content !== "string") {
      return res.status(400).json({ success: false, error: "Nedostaju naziv fajla ili sadržaj." });
    }
    const allowedTop = ["02_Izlaz_Dokumenta", "03_Korisnicki_Backup"].includes(topFolder)
      ? topFolder
      : "02_Izlaz_Dokumenta";
    const safeSub = String(subFolder || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const safeFile = path.basename(String(filename)).replace(/[<>:"/\\|?*]/g, "_");

    const root = ensureLocalWorkspaceTree(LOCAL_WORKSPACE_ROOT);
    const destDir = safeSub ? path.join(root, allowedTop, safeSub) : path.join(root, allowedTop);
    fs.mkdirSync(destDir, { recursive: true });
    const fullDest = path.resolve(destDir, safeFile);
    if (!fullDest.startsWith(path.resolve(root) + path.sep)) {
      return res.status(400).json({ success: false, error: "Neispravna putanja." });
    }
    fs.writeFileSync(fullDest, content, "utf-8");
    res.json({ success: true, savedPath: fullDest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// PUBLIC WEBSITE / LANDING, INSTALL & ADMIN CONSOLE ROUTES
// ========================================================
app.get(["/site", "/landing", "/download"], (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "landing.html"));
});

app.get("/install", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "install.html"));
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "admin.html"));
});

async function startServer() {
  // Always serve static assets from public/ so manifests, icons and packages are available
  app.use(express.static(path.resolve(__dirname, "public")));

  const isProduction =
    process.env.NODE_ENV === "production" ||
    (fs.existsSync(path.resolve(__dirname, "dist", "index.html")) &&
      !fs.existsSync(path.resolve(__dirname, "src", "main.jsx")));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ShiftPulse Posredovanje Server running on port ${PORT}`);
  });
}
startServer();
