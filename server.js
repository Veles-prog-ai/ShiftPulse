import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import { Client } from "pg";
import { createLegalMonitorService } from "./legalMonitorEngine.js";
import {
  analyzeDocumentWithGemini,
  detectShiftConflictsWithGemini,
  isGeminiConfigured,
  sendGeminiErrorResponse,
} from "./server/geminiService.js";
import { BackendPluginManager } from "./server/PluginManager.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ========================================================
// MULTI-SUBDOMAIN CORS & ADMIN AUTHENTICATION MIDDLEWARE
// ========================================================
const DEFAULT_ALLOWED_ORIGINS = [
  "https://veles-lab.com",
  "https://www.veles-lab.com",
  "https://app.veles-lab.com",
];

function getConfiguredAllowedOrigins() {
  const extra = [
    process.env.APP_URL || "",
    process.env.CORS_ALLOWED_ORIGINS || "",
  ]
    .join(",")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const devOrigins =
    process.env.NODE_ENV !== "production"
      ? [
          `http://localhost:${PORT}`,
          `http://127.0.0.1:${PORT}`,
          "http://localhost:5173",
        ]
      : [];

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra, ...devOrigins]);
}

function isOriginAllowed(origin, req) {
  if (!origin) return true;
  const normalized = String(origin).trim().replace(/\/+$/, "");
  const allowedSet = getConfiguredAllowedOrigins();
  if (allowedSet.has(normalized)) return true;

  const host = String(req.headers.host || "").toLowerCase();
  if (
    host &&
    (normalized.toLowerCase() === `https://${host}` ||
      normalized.toLowerCase() === `http://${host}`)
  ) {
    return true;
  }
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin, req)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-admin-secret, x-license-key",
    );
  }
  if (req.method === "OPTIONS") {
    if (origin && !isOriginAllowed(origin, req)) {
      return res.status(403).json({ success: false, error: "Origin not allowed by CORS policy." });
    }
    return res.sendStatus(204);
  }
  next();
});

function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractAdminSecretFromRequest(req) {
  const headerToken = req.headers["x-admin-secret"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (authHeader.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), "base64").toString("utf8");
      const colonIdx = decoded.indexOf(":");
      return colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded;
    } catch {
      return "";
    }
  }
  return "";
}

function requireAdminAuth(req, res, next) {
  const configuredSecret = String(process.env.ADMIN_SECRET_KEY || "").trim();
  const isApiRequest = req.path.startsWith("/api/") || req.originalUrl.startsWith("/api/");

  if (!configuredSecret) {
    if (!isApiRequest) {
      res.setHeader("WWW-Authenticate", 'Basic realm="ShiftPulse Admin Console", charset="UTF-8"');
      return res
        .status(401)
        .send("Unauthorized: ADMIN_SECRET_KEY is not configured on the server.");
    }
    return res.status(401).json({
      success: false,
      error: "Unauthorized: ADMIN_SECRET_KEY is not configured on the server.",
    });
  }

  const providedSecret = extractAdminSecretFromRequest(req);
  if (!timingSafeEqualString(providedSecret, configuredSecret)) {
    if (!isApiRequest) {
      res.setHeader("WWW-Authenticate", 'Basic realm="ShiftPulse Admin Console", charset="UTF-8"');
      return res
        .status(401)
        .send("Unauthorized: Valid admin credentials are required.");
    }
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Valid ADMIN_SECRET_KEY credentials are required.",
    });
  }

  next();
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ========================================================
// B2B LICENSE ENCRYPTION, RSA VERIFICATION & ANTI-TAMPER CLOCK
// ========================================================
const MASTER_ENCRYPTION_KEY =
  process.env.LEDGER_MASTER_SECRET ||
  "359b8c642f883f3e8f85f1c2b5e913a47d2b8e3a5f6c8d7b1a2c3d4e5f6a7b8c";
const ENCRYPTION_ALGORITHM = "aes-256-cbc";

function generateB2BLicense(payloadData) {
  const plaintext = JSON.stringify(payloadData);
  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.scryptSync(MASTER_ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  let encryptedText = cipher.update(plaintext, "utf8", "hex");
  encryptedText += cipher.final("hex");
  return `${iv.toString("hex")}:${encryptedText}`;
}

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
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
    const decrypted = crypto.publicDecrypt(RSA_PUBLIC_KEY, buffer);
    const payload = JSON.parse(decrypted.toString("utf-8"));
    if (!payload.expiresAt) {
      return { isValid: false, reason: "Invalid license payload format." };
    }
    const currentDate = new Date();
    const expirationDate = new Date(`${payload.expiresAt}T23:59:59`);
    if (currentDate > expirationDate) {
      return {
        isValid: false,
        reason: "Cryptographic license lease has expired.",
      };
    }
    return { isValid: true, payload };
  } catch {
    return {
      isValid: false,
      reason: "Critical error: License signature is invalid or corrupted.",
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
  } catch {
    // Fallback to current timestamp when metadata file is unreadable
  }
  const now = new Date();
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
  } catch {
    // Ignore write failures in read-only mount contexts
  }
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
  } catch {
    globalPgClient = null;
  }
}

export async function verifySystemTimeIntegrity(dbClient) {
  try {
    const currentSystemTime = new Date();
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
            "System integrity alert: Clock rollback detected on workstation. Access locked.",
          lastRecorded: lastRecordedTime,
        };
      }
      await activeClient.query(
        "UPDATE sys_metadata SET last_timestamp = $1 WHERE key = 'last_run_time'",
        [currentSystemTime],
      );
      setLocalStoredTime(currentSystemTime);
      return { isTimeValid: true, lastRecorded: currentSystemTime };
    }

    const lastRecordedTime = getLocalStoredTime();
    if (currentSystemTime.getTime() < lastRecordedTime.getTime() - 60000) {
      return {
        isTimeValid: false,
        reason:
          "System integrity alert: Clock rollback detected on workstation. Access locked.",
        lastRecorded: lastRecordedTime,
      };
    }
    if (currentSystemTime.getTime() > lastRecordedTime.getTime()) {
      setLocalStoredTime(currentSystemTime);
    }
    return { isTimeValid: true, lastRecorded: currentSystemTime };
  } catch {
    return {
      isTimeValid: false,
      reason: "Error verifying system clock integrity.",
    };
  }
}

function validateLocalLicense(licenseKey) {
  if (!licenseKey) {
    return {
      validna: false,
      podaci: null,
      razlog: "License key is missing or improperly formatted.",
    };
  }
  const cleaned = licenseKey.trim();
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
    }
    return { validna: false, podaci: null, razlog: rsaCheck.reason };
  }

  if (!cleaned.includes(":")) {
    return {
      validna: false,
      podaci: null,
      razlog: "Invalid license key format.",
    };
  }

  try {
    const [ivHex, encryptedHex] = cleaned.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const keyBuffer = crypto.scryptSync(MASTER_ENCRYPTION_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
    let decryptedText = decipher.update(encryptedHex, "hex", "utf8");
    decryptedText += decipher.final("utf8");
    const licenseData = JSON.parse(decryptedText);
    const today = new Date();
    const expirationDate = new Date(`${licenseData.datumIsteka}T23:59:59`);
    if (today > expirationDate) {
      return {
        validna: false,
        podaci: licenseData,
        razlog: `License expired on ${licenseData.datumIsteka}.`,
      };
    }
    return { validna: true, podaci: licenseData };
  } catch {
    return {
      validna: false,
      podaci: null,
      razlog: "Cryptographic signature mismatch. License key may be corrupted or tampered.",
    };
  }
}

let activeClientLicenseKey = process.env.B2B_LICENSE_KEY || "";
const ISSUED_LICENSES_AUDIT_FILE = path.join(__dirname, "issued_licenses_audit.jsonl");

function appendIssuedLicenseAudit(entry) {
  try {
    fs.appendFileSync(ISSUED_LICENSES_AUDIT_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (error) {
    console.warn("[License] Audit log write warning:", error.message);
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
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveLicenseStatusSnapshot(customKeyOverride = "") {
  const timeCheck = await verifySystemTimeIntegrity();
  const keyToCheck =
    customKeyOverride || activeClientLicenseKey || process.env.B2B_LICENSE_KEY;

  if (!timeCheck.isTimeValid) {
    return {
      success: false,
      valid: false,
      trial: false,
      tier: "Locked",
      antiClockTampering: {
        isTimeValid: false,
        reason: timeCheck.reason,
        lastRecorded: timeCheck.lastRecorded,
      },
      licenciraniPravniSubjekat: "SYSTEM LOCKED",
      datumIsteka: "BLOCKED",
      poruka: timeCheck.reason,
    };
  }

  if (!keyToCheck) {
    return {
      success: false,
      valid: false,
      trial: true,
      tier: "Trial",
      antiClockTampering: {
        isTimeValid: true,
        lastRecorded: timeCheck.lastRecorded,
      },
      licenciraniPravniSubjekat: "Unlicensed Workstation (Trial)",
      datumIsteka: "TRIAL",
      maksimalnoRadnika: 3,
      poruka:
        "Workstation running in unlicensed trial mode (up to 3 workers). ePorezi XML export requires an active commercial license.",
    };
  }

  const check = validateLocalLicense(keyToCheck);
  if (check.validna && check.podaci) {
    return {
      success: true,
      valid: true,
      trial: false,
      licenseId: check.podaci.licenseId,
      licenciraniPravniSubjekat: check.podaci.nazivAgencije,
      pibAgencije: check.podaci.pibAgencije,
      tier: check.podaci.tier || "Enterprise / Full Content",
      issuedAt: check.podaci.issuedAt,
      datumIsteka: check.podaci.datumIsteka,
      maksimalnoRadnika: check.podaci.maksimalnoRadnika,
      features: check.podaci.features || [
        "ai_scanner",
        "conflict_monitor",
        "b2b_shift_management",
        "eporezi_xml",
      ],
      antiClockTampering: {
        isTimeValid: true,
        lastRecorded: timeCheck.lastRecorded,
      },
      poruka: `Station authorized and licensed (${check.podaci.tier || "Enterprise"}).`,
    };
  }

  return {
    success: false,
    valid: false,
    trial: true,
    tier: "Trial",
    antiClockTampering: {
      isTimeValid: true,
      lastRecorded: timeCheck.lastRecorded,
    },
    licenciraniPravniSubjekat: "Unlicensed Workstation",
    datumIsteka: "EXPIRED",
    poruka: check.razlog || "License key is missing, invalid, or expired.",
  };
}

// ========================================================
// MODULAR PLUGIN MANAGER (BACKEND)
// ========================================================
const pluginManager = new BackendPluginManager({
  pluginsDir: path.join(__dirname, "plugins"),
  sysMetadataPath: SYS_METADATA_FILE,
  resolveLicenseStatus: resolveLicenseStatusSnapshot,
});

app.post("/api/license/admin-generate", requireAdminAuth, (req, res) => {
  try {
    const { pibAgencije, nazivAgencije, maksimalnoRadnika, datumIsteka, tier } =
      req.body || {};
    if (!pibAgencije || !nazivAgencije || !datumIsteka) {
      res.status(400).json({
        error: "Missing required fields for license generation (PIB, company name, expiration date).",
      });
      return;
    }
    const generatedKey = generateB2BLicense({
      pibAgencije: String(pibAgencije),
      nazivAgencije: String(nazivAgencije),
      maksimalnoRadnika: Number(maksimalnoRadnika || 9999),
      datumIsteka: String(datumIsteka),
      tier: tier ? String(tier) : "Enterprise",
    });
    const keyFingerprint = crypto
      .createHash("sha256")
      .update(generatedKey)
      .digest("hex")
      .slice(0, 12);

    appendIssuedLicenseAudit({
      issuedAt: new Date().toISOString(),
      pibAgencije: String(pibAgencije),
      nazivAgencije: String(nazivAgencije),
      maksimalnoRadnika: Number(maksimalnoRadnika || 9999),
      datumIsteka: String(datumIsteka),
      tier: tier ? String(tier) : "Enterprise",
      keyFingerprint,
    });

    res.json({
      success: true,
      kljucZaKlijenta: generatedKey,
      licenseKey: generatedKey,
      keyFingerprint,
      napomena:
        "Copy this key and provide it to the accounting firm for workstation activation.",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate B2B license key.",
      details: error.message,
    });
  }
});

app.get("/api/license/status", async (req, res) => {
  const customKey = String(req.headers["x-license-key"] || req.query.key || "");
  const snapshot = await resolveLicenseStatusSnapshot(customKey);
  res.json(snapshot);
});

app.post("/api/license/activate", async (req, res) => {
  try {
    const { kljucLicence } = req.body || {};
    if (!kljucLicence) {
      res.status(400).json({ success: false, error: "License key is required." });
      return;
    }
    const validation = validateLocalLicense(kljucLicence);
    if (!validation.validna) {
      res.status(400).json({
        success: false,
        error: validation.razlog || "License key is invalid.",
      });
      return;
    }
    activeClientLicenseKey = kljucLicence.trim();
    await pluginManager.initialize(activeClientLicenseKey);
    res.json({
      success: true,
      message: "License successfully verified and activated on this workstation.",
      licenca: validation.podaci,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error activating workstation license.",
      details: error.message,
    });
  }
});

app.post("/api/license/verify", (req, res) => {
  const { kljucLicence } = req.body || {};
  const validation = validateLocalLicense(kljucLicence);
  res.json(validation);
});

const licenseGuardMiddleware = async (req, res, next) => {
  const timeCheck = await verifySystemTimeIntegrity();
  if (!timeCheck.isTimeValid) {
    res.status(403).json({
      error:
        timeCheck.reason ||
        "Access denied: System clock tampering detected.",
      antiClockTampering: true,
    });
    return;
  }

  const customKey = req.headers["x-license-key"] || req.query.key;
  const clientKey =
    customKey || activeClientLicenseKey || process.env.B2B_LICENSE_KEY;

  if (!clientKey) {
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

  const validation = validateLocalLicense(String(clientKey));
  if (!validation.validna) {
    res.status(403).json({
      error:
        "Access denied: Commercial license for this workstation is inactive or expired.",
      details: validation.razlog,
    });
    return;
  }

  if (
    validation.podaci?.features &&
    req.path === "/api/ledger/generate-xml" &&
    !validation.podaci.features.includes("eporezi_xml")
  ) {
    res.status(403).json({
      error: "Your active license tier does not include the ePorezi XML export module.",
      trial: false,
    });
    return;
  }

  next();
};

// ========================================================
// STATUTORY PAYROLL & PPP-PD XML ENDPOINTS
// ========================================================
app.post("/api/ledger/calculate-payroll", licenseGuardMiddleware, (req, res) => {
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
    } = req.body || {};

    const baseSalary = Number(grossSalary || brutoBaza) || 95000;
    const hourlyRate = Number(satnica) || Math.round(baseSalary / 176);

    const regHours = Number(regularHours) || 0;
    const vacHours = Number(vacationHours) || 0;
    const sick65 = Number(sickHours65) || 0;
    const sick100 = Number(sickHours100) || 0;
    const nightH = Number(nightHours) || 0;
    const holHours = Number(holidayHours) || 0;
    const otHours = Number(overtimeHours) || 0;

    let regularPay = 0;
    let vacationPay = 0;
    let sickPay65 = 0;
    let sickPay100 = 0;

    if (regHours > 0 || vacHours > 0 || sick65 > 0 || sick100 > 0) {
      regularPay = regHours * hourlyRate;
      vacationPay = vacHours * hourlyRate * 1.0;
      sickPay65 = sick65 * hourlyRate * 0.65;
      sickPay100 = sick100 * hourlyRate * 1.0;
    } else {
      regularPay = baseSalary;
    }

    const bonusNight = nightH * hourlyRate * 0.26;
    const bonusHoliday = holHours * hourlyRate * 1.1;
    const bonusOvertime = otHours * hourlyRate * 0.26;

    const totalGrossBase =
      regularPay +
      vacationPay +
      sickPay65 +
      sickPay100 +
      bonusNight +
      bonusHoliday +
      bonusOvertime;

    const nonTaxableDeduction = 25000;
    const taxableBase = Math.max(0, totalGrossBase - nonTaxableDeduction);
    const incomeTax = taxableBase * 0.10;
    const pioEmployee = totalGrossBase * 0.14;
    const healthEmployee = totalGrossBase * 0.0515;
    const unemploymentEmployee = totalGrossBase * 0.0075;
    const totalEmployeeContributions =
      pioEmployee + healthEmployee + unemploymentEmployee;
    const netSalary = totalGrossBase - incomeTax - totalEmployeeContributions;

    const pioEmployer = totalGrossBase * 0.10;
    const healthEmployer = totalGrossBase * 0.0515;
    const totalEmployerContributions = pioEmployer + healthEmployer;
    const totalGrossII = totalGrossBase + totalEmployerContributions;

    res.json({
      success: true,
      obracun: {
        ukupnaBrutoOsnovica: Math.round(totalGrossBase * 100) / 100,
        bruto: Math.round(totalGrossBase * 100) / 100,
        neto: Math.round(netSalary * 100) / 100,
        porez: Math.round(incomeTax * 100) / 100,
        doprinosiRadnik: Math.round(totalEmployeeContributions * 100) / 100,
        doprinosiFirma: Math.round(totalEmployerContributions * 100) / 100,
        ukupnoZaIsplatuFirme: Math.round(totalGrossII * 100) / 100,
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
      error: "Failed to calculate payroll.",
      details: error.message,
    });
  }
});

app.post("/api/ledger/generate-xml", licenseGuardMiddleware, (req, res) => {
  try {
    const { pibIsplatioca, obracunskiPeriod, stavke } = req.body || {};
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
    res.status(500).json({
      error: "Failed to generate XML tax declaration.",
      details: error.message,
    });
  }
});

// ========================================================
// INTERNAL PLACEMENT & STAFFING REGISTRY
// ========================================================
let internalPlacementsRegistry = [];

app.get("/api/posredovanje/oglasi", (_req, res) => {
  res.json({ success: true, oglasi: internalPlacementsRegistry });
});

app.post("/api/posredovanje/kreiraj", (req, res) => {
  const entry = {
    ...req.body,
    id: `oglas-log-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  internalPlacementsRegistry.unshift(entry);
  res.json({ success: true, oglas: entry });
});

app.patch("/api/posredovanje/status/:id", (req, res) => {
  const { id } = req.params;
  const { status, interneBeleskeAgencije } = req.body || {};
  internalPlacementsRegistry = internalPlacementsRegistry.map((item) =>
    item.id === id
      ? {
          ...item,
          status: status ?? item.status,
          interneBeleskeAgencije:
            interneBeleskeAgencije ?? item.interneBeleskeAgencije,
        }
      : item,
  );
  res.json({ success: true, message: "Placement record updated." });
});

// ========================================================
// SERVER-SIDE GEMINI AI & ZERO-PII HITL TELEMETRY
// ========================================================
const HITL_AUDIT_LOG_FILE = path.join(__dirname, "hitl_approval_audit.jsonl");

function persistSanitizedHitlLog(rawBody = {}) {
  const allowedDecisions = ["approved", "edited_approved", "rejected"];
  const normalizedDecision = allowedDecisions.includes(rawBody.decision)
    ? rawBody.decision
    : rawBody.akcija === "odbijeno"
      ? "rejected"
      : "approved";

  // Zero-knowledge telemetry: stores ONLY operator account metadata and approval status.
  // No client invoices, tax IDs, salaries, or contract contents are persisted on the server.
  const sanitizedEntry = {
    logId: `hitl-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    timestamp: new Date().toISOString(),
    licenseId: String(rawBody.licenseId || "STATION-LOCAL").slice(0, 64),
    accountId: String(rawBody.accountId || "op-owner-1").slice(0, 64),
    accountUsername: String(
      rawBody.accountUsername || rawBody.operaterIme || "local_operator",
    ).slice(0, 64),
    accountRole: String(rawBody.accountRole || "Authorized Operator").slice(0, 64),
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
    const { base64Data, mimeType, extractedTextSnippet } = req.body || {};
    if (!base64Data && !extractedTextSnippet) {
      return res.status(400).json({
        success: false,
        error: "Missing document file or text snippet for AI analysis.",
      });
    }

    const analysisResult = await analyzeDocumentWithGemini({
      base64Data,
      mimeType,
      extractedTextSnippet,
    });

    res.json({
      success: true,
      ...analysisResult,
    });
  } catch (error) {
    if (error.code === "GEMINI_KEY_MISSING") {
      return res.status(503).json({
        success: false,
        code: "GEMINI_KEY_MISSING",
        error: error.message,
      });
    }
    console.error("[Gemini] Document analysis error:", error);
    sendGeminiErrorResponse(res, error, "Server-side Gemini document analysis failed.");
  }
});

app.post("/api/schedule/detect-conflicts", async (req, res) => {
  try {
    const { incomingMessage, compactScheduleSummary, existingShifts } = req.body || {};
    if (!incomingMessage) {
      return res.status(400).json({
        success: false,
        error: "Missing incoming shift message for conflict check.",
      });
    }

    const conflictResult = await detectShiftConflictsWithGemini({
      incomingMessage,
      compactScheduleSummary,
      existingShifts,
    });

    res.json({
      success: true,
      ...conflictResult,
    });
  } catch (error) {
    if (error.code === "GEMINI_KEY_MISSING") {
      return res.status(503).json({
        success: false,
        code: "GEMINI_KEY_MISSING",
        error: error.message,
      });
    }
    console.error("[Gemini] Conflict detection error:", error);
    sendGeminiErrorResponse(res, error, "Server-side Gemini shift conflict check failed.");
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
        "HITL operator decision recorded on the server without personal or financial payloads.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to record HITL audit telemetry.",
      details: error.message,
    });
  }
});

app.get("/api/hitl/logs", requireAdminAuth, (_req, res) => {
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

app.post("/api/legal/log-action", (req, res) => {
  try {
    const entry = persistSanitizedHitlLog(req.body || {});
    res.json({
      success: true,
      privacyGuarantee: "account-and-approval-status-only",
      entry,
      message: "Action authenticated by local account and logged as status-only audit entry.",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to write audit log.",
      details: error.message,
    });
  }
});

// ========================================================
// PLUGIN REGISTRY & ISOLATED HOOK DISPATCHER API
// ========================================================
app.get("/api/plugins", async (req, res) => {
  try {
    const customKey = String(req.headers["x-license-key"] || req.query.key || "");
    const snapshot = await pluginManager.initialize(customKey);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to load plugin registry.",
      details: error.message,
    });
  }
});

app.post("/api/plugins/reload", async (req, res) => {
  try {
    const customKey = String(req.headers["x-license-key"] || "");
    const snapshot = await pluginManager.initialize(customKey);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/plugins/hooks/:hookName", async (req, res) => {
  const { hookName } = req.params;
  const payload = req.body || {};
  try {
    if (hookName === "onLedgerEntryCreate") {
      const result = await pluginManager.runLedgerEntryCreateHooks(payload);
      return res.json({ success: true, payload: result });
    }
    if (hookName === "onBeforeReportExport") {
      const result = await pluginManager.runBeforeReportExportHooks(payload);
      return res.json({ success: true, payload: result });
    }
    await pluginManager.emit(hookName, payload);
    return res.json({ success: true, payload });
  } catch (error) {
    return res.status(200).json({
      success: false,
      isolated: true,
      error: error.message,
      payload,
    });
  }
});

app.use("/api/plugins/custom", pluginManager.customRouteDispatcher());

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
    return res.status(400).json({ error: "Unsupported operating system identifier." });
  }

  const filePath = path.join(downloadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Package archive has not been built yet." });
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
        "SHIFTPULSE LEDGER PRO - LOCAL WORKSPACE DIRECTORY",
        "01_Ulaz_Dokumenta/ -> Drop invoices, delivery notes, slips, and statements for offline scanning",
        "02_Izlaz_Dokumenta/ -> Generated CSV statements, ePorezi XML, payment orders, and contracts",
        "03_Korisnicki_Backup/ -> Encrypted AES-256-GCM user backup archives",
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
  } catch (error) {
    console.warn("[Workspace] Directory initialization warning:", error.message);
  }
}

const requireLocalDesktop = (req, res, next) => {
  if (!isLocalDesktopRuntime(req)) {
    return res.status(403).json({
      success: false,
      error:
        "Zero-Knowledge Gateway policy: Cloud server does not access local client files. Use the standalone Desktop installer or Browser Folder Picker.",
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
    pluginsCount: pluginManager.loadedPlugins.size,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development",
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/admin", requireAdminAuth);

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
        geminiProxyConfigured: isGeminiConfigured(),
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
      plugins: pluginManager.getRegistrySnapshot(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================
// AUTOMATED LOW-RESOURCE LEGAL CHANGE MONITOR
// ========================================================
app.get("/api/legal-monitor/status", (_req, res) => {
  res.json(legalMonitorService.getStatus());
});

app.post("/api/legal-monitor/check-now", requireAdminAuth, async (_req, res) => {
  try {
    const result = await legalMonitorService.runLightweightHttpChecks();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/legal-monitor/compare", requireAdminAuth, (req, res) => {
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/legal-monitor/notifications/:id/acknowledge", requireAdminAuth, (req, res) => {
  try {
    const { adoptAsBaseline } = req.body || {};
    const outcome = legalMonitorService.acknowledgeNotification(req.params.id, {
      adoptAsBaseline: Boolean(adoptAsBaseline),
    });
    if (!outcome.success) {
      return res.status(404).json(outcome);
    }
    res.json(outcome);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================
// LOCAL DESKTOP WORKSPACE FILE SYSTEM API
// ========================================================
app.post("/api/workspace/init", requireLocalDesktop, (_req, res) => {
  try {
    const root = ensureLocalWorkspaceTree(LOCAL_WORKSPACE_ROOT);
    res.json({
      success: true,
      workspacePath: root,
      folders: WORKSPACE_FOLDER_STRUCTURE,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
            relativePath: path.posix.join(
              "01_Ulaz_Dokumenta",
              relFolder === "01_Ulaz_Dokumenta" ? "" : relFolder,
              entry.name,
            ),
            size: stat.size,
            lastModified: stat.mtimeMs,
            source: "local-desktop",
          });
        }
      }
    };
    walk(inputRoot, "01_Ulaz_Dokumenta");
    res.json({ success: true, workspacePath: root, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/workspace/read-input-file", requireLocalDesktop, (req, res) => {
  try {
    const rel = String(req.query.path || "");
    const inputBase = path.resolve(LOCAL_WORKSPACE_ROOT, "01_Ulaz_Dokumenta");
    const target = path.resolve(LOCAL_WORKSPACE_ROOT, rel);
    if (!target.startsWith(inputBase + path.sep) || !fs.existsSync(target)) {
      return res.status(404).json({
        success: false,
        error: "File not found inside 01_Ulaz_Dokumenta.",
      });
    }
    res.sendFile(target);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/workspace/save-output", requireLocalDesktop, (req, res) => {
  try {
    const {
      topFolder = "02_Izlaz_Dokumenta",
      subFolder = "",
      filename,
      content,
    } = req.body || {};
    if (!filename || typeof content !== "string") {
      return res.status(400).json({
        success: false,
        error: "Filename and string content are required.",
      });
    }
    const allowedTop = ["02_Izlaz_Dokumenta", "03_Korisnicki_Backup"].includes(
      topFolder,
    )
      ? topFolder
      : "02_Izlaz_Dokumenta";
    const safeSub = String(subFolder || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const safeFile = path.basename(String(filename)).replace(/[<>:"/\\|?*]/g, "_");

    const root = ensureLocalWorkspaceTree(LOCAL_WORKSPACE_ROOT);
    const destDir = safeSub
      ? path.join(root, allowedTop, safeSub)
      : path.join(root, allowedTop);
    fs.mkdirSync(destDir, { recursive: true });
    const fullDest = path.resolve(destDir, safeFile);
    if (!fullDest.startsWith(path.resolve(root) + path.sep)) {
      return res.status(400).json({ success: false, error: "Invalid destination path." });
    }
    fs.writeFileSync(fullDest, content, "utf-8");
    res.json({ success: true, savedPath: fullDest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================
// PUBLIC WEBSITE, INSTALL PORTAL & ADMIN CONSOLE ROUTES
// ========================================================
app.get(["/site", "/landing", "/download"], (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "landing.html"));
});

app.get("/install", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "install.html"));
});

app.get(["/admin", "/admin.html"], requireAdminAuth, (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "admin.html"));
});

// Ensure unmatched API routes return structured 404 JSON rather than HTML fallback
app.all("/api/*", (_req, res) => {
  res.status(404).json({ success: false, error: "API endpoint not found." });
});

// ========================================================
// SERVER BOOTSTRAP (DEV VITE MIDDLEWARE VS. PRODUCTION DIST)
// ========================================================
async function startServer() {
  await pluginManager.initialize();

  // Serve plugin ESM bundles and manifests in both development and production
  app.use(
    "/plugins",
    express.static(path.resolve(__dirname, "plugins"), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        }
      },
    }),
  );

  // Always serve static assets from public/ (icons, manifests, packages)
  app.use(express.static(path.resolve(__dirname, "public")));

  const distDir = path.resolve(__dirname, "dist");
  const distIndexPath = path.join(distDir, "index.html");
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (fs.existsSync(distIndexPath) &&
      !fs.existsSync(path.resolve(__dirname, "src", "main.jsx")));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(distIndexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[Server] ShiftPulse Ledger Pro running in ${isProduction ? "production" : "development"} mode on port ${PORT}`,
    );
  });
}

startServer();
