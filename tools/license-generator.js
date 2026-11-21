import crypto from "crypto";
import readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const MASTER_ENCRYPTION_KEY =
  process.env.LEDGER_MASTER_SECRET ||
  "359b8c642f883f3e8f85f1c2b5e913a47d2b8e3a5f6c8d7b1a2c3d4e5f6a7b8c";
const ENCRYPTION_ALGORITHM = "aes-256-cbc";

export const LICENSE_TYPES = {
  TRIAL_14D: "TRIAL_14D",
  MID_MARKET_ANNUAL: "MID_MARKET_ANNUAL",
  ENTERPRISE_PERPETUAL_BYO_API: "ENTERPRISE_PERPETUAL_BYO_API",
};

function addDaysIso(days) {
  const d = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function normalizeLicenseType(licenseType, tier) {
  const rawType = String(licenseType || "").trim().toUpperCase();
  if (LICENSE_TYPES[rawType]) return rawType;

  const rawTier = String(tier || "").trim().toLowerCase();
  if (rawTier.includes("enterprise") || rawTier.includes("perpetual") || rawTier.includes("byo")) {
    return LICENSE_TYPES.ENTERPRISE_PERPETUAL_BYO_API;
  }
  if (rawTier.includes("trial")) {
    return LICENSE_TYPES.TRIAL_14D;
  }
  return LICENSE_TYPES.MID_MARKET_ANNUAL;
}

export function createEncryptedLicenseKey({
  companyTaxId,
  companyName,
  licenseType = LICENSE_TYPES.MID_MARKET_ANNUAL,
  maxEmployees,
  maxClientCompanies,
  maxOperatorSeats,
  expiresAt,
  coreExpiry,
  lawTrackerSlaExpiry,
  boundFingerprint = null,
  boundHost = null,
  tier,
}) {
  const resolvedType = normalizeLicenseType(licenseType, tier);
  const issuedAt = new Date().toISOString();

  let resolvedTier = tier;
  let resolvedExpiry = expiresAt ? String(expiresAt).trim() : null;
  let resolvedCoreExpiry = coreExpiry ?? null;
  let resolvedSlaExpiry = lawTrackerSlaExpiry ? String(lawTrackerSlaExpiry).trim() : null;
  let resolvedMaxCompanies = Number(maxClientCompanies) || 25;
  let resolvedMaxSeats = Number(maxOperatorSeats) || 5;
  let resolvedMaxEmployees = Number(maxEmployees) || 500;
  let features = [
    "ai_scanner",
    "conflict_monitor",
    "b2b_shift_management",
    "eporezi_xml",
  ];

  if (resolvedType === LICENSE_TYPES.TRIAL_14D) {
    resolvedTier = resolvedTier || "Trial 14D";
    resolvedExpiry = resolvedExpiry || addDaysIso(14);
    resolvedCoreExpiry = resolvedExpiry;
    resolvedSlaExpiry = resolvedExpiry;
    resolvedMaxCompanies = Number(maxClientCompanies) || 3;
    resolvedMaxSeats = Number(maxOperatorSeats) || 2;
    resolvedMaxEmployees = Number(maxEmployees) || 15;
  } else if (resolvedType === LICENSE_TYPES.ENTERPRISE_PERPETUAL_BYO_API) {
    resolvedTier = resolvedTier || "Enterprise Perpetual BYO-API";
    // Perpetual core never expires; Law Tracker SLA tracks the 20% annual update cycle
    resolvedCoreExpiry = null;
    resolvedExpiry = null;
    resolvedSlaExpiry = resolvedSlaExpiry || addDaysIso(365);
    resolvedMaxCompanies = Number(maxClientCompanies) || 9999;
    resolvedMaxSeats = Number(maxOperatorSeats) || 999;
    resolvedMaxEmployees = Number(maxEmployees) || 99999;
    features = [...features, "byo_api", "country_packs", "unlimited_scale"];
  } else {
    resolvedTier = resolvedTier || "Mid-Market Annual";
    resolvedExpiry = resolvedExpiry || addDaysIso(365);
    resolvedCoreExpiry = resolvedExpiry;
    resolvedSlaExpiry = resolvedSlaExpiry || resolvedExpiry;
    features = [...features, "country_packs"];
  }

  const payload = {
    licenseId: `SPL-${resolvedType === "TRIAL_14D" ? "TRL" : resolvedType === "ENTERPRISE_PERPETUAL_BYO_API" ? "ENT" : "MID"}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    licenseType: resolvedType,
    pibAgencije: String(companyTaxId).trim(),
    nazivAgencije: String(companyName).trim(),
    maksimalnoRadnika: resolvedMaxEmployees,
    max_client_companies: resolvedMaxCompanies,
    max_operator_seats: resolvedMaxSeats,
    issuedAt,
    datumIsteka: resolvedExpiry,
    core_expiry: resolvedCoreExpiry,
    law_tracker_sla_expiry: resolvedSlaExpiry,
    byo_api_allowed: resolvedType === LICENSE_TYPES.ENTERPRISE_PERPETUAL_BYO_API,
    boundFingerprint: boundFingerprint ? String(boundFingerprint).trim() : null,
    boundHost: boundHost ? String(boundHost).trim() : null,
    tier: resolvedTier,
    features,
  };

  const plaintext = JSON.stringify(payload);
  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.scryptSync(MASTER_ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

async function runCliGenerator() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const promptUser = (question) => new Promise((resolve) => rl.question(question, resolve));

  if (!process.env.LEDGER_MASTER_SECRET) {
    console.log("\n[ERROR] Access denied: LEDGER_MASTER_SECRET is not set.");
    console.log(
      "This script may only run on an authorized developer workstation with LEDGER_MASTER_SECRET configured.",
    );
    rl.close();
    return;
  }

  console.log("\n==============================================================");
  console.log("   SHIFTPULSE LEDGER - B2B TWO-TIER LICENSE GENERATOR         ");
  console.log("==============================================================\n");

  const companyName = await promptUser("1. Accounting Firm / Client Name: ");
  const companyTaxId = await promptUser("2. Company Tax ID (PIB): ");
  const typeInput = await promptUser(
    "3. License Type (1=TRIAL_14D, 2=MID_MARKET_ANNUAL, 3=ENTERPRISE_PERPETUAL_BYO_API) [2]: ",
  );

  const typeChoice = typeInput.trim();
  const licenseType =
    typeChoice === "1" || typeChoice.toUpperCase() === "TRIAL_14D"
      ? LICENSE_TYPES.TRIAL_14D
      : typeChoice === "3" || typeChoice.toUpperCase() === "ENTERPRISE_PERPETUAL_BYO_API"
        ? LICENSE_TYPES.ENTERPRISE_PERPETUAL_BYO_API
        : LICENSE_TYPES.MID_MARKET_ANNUAL;

  let maxEmployees;
  let maxClientCompanies;
  let maxOperatorSeats;
  let expiresAt;
  let lawTrackerSlaExpiry;
  let boundFingerprint = null;
  let boundHost = null;

  if (licenseType === LICENSE_TYPES.TRIAL_14D) {
    expiresAt = (await promptUser(`4. Trial Expiration Date (YYYY-MM-DD) [${addDaysIso(14)}]: `)).trim() || addDaysIso(14);
    boundFingerprint = (await promptUser("5. Optional Workstation Hardware Fingerprint: ")).trim() || null;
    boundHost = (await promptUser("6. Optional Domain / Host Binding (e.g. veles-lab.com): ")).trim() || null;
  } else if (licenseType === LICENSE_TYPES.MID_MARKET_ANNUAL) {
    maxClientCompanies = (await promptUser("4. Max Client Companies [25]: ")).trim() || 25;
    maxOperatorSeats = (await promptUser("5. Max Operator Seats [5]: ")).trim() || 5;
    maxEmployees = (await promptUser("6. Max Employees [500]: ")).trim() || 500;
    expiresAt = (await promptUser(`7. Annual Expiration Date (YYYY-MM-DD) [${addDaysIso(365)}]: `)).trim() || addDaysIso(365);
  } else {
    lawTrackerSlaExpiry = (await promptUser(`4. Law Tracker SLA Expiry (YYYY-MM-DD) [${addDaysIso(365)}]: `)).trim() || addDaysIso(365);
    maxClientCompanies = (await promptUser("5. Max Client Companies [9999]: ")).trim() || 9999;
    maxOperatorSeats = (await promptUser("6. Max Operator Seats [999]: ")).trim() || 999;
    maxEmployees = 99999;
    expiresAt = null;
  }

  if (!companyName || !companyTaxId) {
    console.log("\n[ERROR] Company name and Tax ID are required.");
    rl.close();
    return;
  }

  const licenseKey = createEncryptedLicenseKey({
    companyTaxId,
    companyName,
    licenseType,
    maxEmployees,
    maxClientCompanies,
    maxOperatorSeats,
    expiresAt,
    lawTrackerSlaExpiry,
    boundFingerprint,
    boundHost,
  });

  console.log("\n==============================================================");
  console.log("[OK] LICENSE KEY GENERATED SUCCESSFULLY");
  console.log("==============================================================\n");
  console.log("Client:             ", companyName);
  console.log("Tax ID:             ", companyTaxId);
  console.log("License Type:       ", licenseType);
  console.log("Core Expiry:        ", expiresAt || "PERPETUAL (null)");
  if (lawTrackerSlaExpiry) {
    console.log("Law Tracker SLA:    ", lawTrackerSlaExpiry);
  }
  console.log("\n--- COPY LICENSE KEY BELOW ---\n");
  console.log(licenseKey);
  console.log("\n--------------------------------------------------------------\n");
  rl.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCliGenerator();
}
