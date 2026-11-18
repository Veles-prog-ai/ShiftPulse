import crypto from "crypto";
import readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const MASTER_ENCRYPTION_KEY =
  process.env.LEDGER_MASTER_SECRET ||
  "359b8c642f883f3e8f85f1c2b5e913a47d2b8e3a5f6c8d7b1a2c3d4e5f6a7b8c";
const ENCRYPTION_ALGORITHM = "aes-256-cbc";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptUser(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

export function createEncryptedLicenseKey({
  companyTaxId,
  companyName,
  maxEmployees,
  expiresAt,
  tier = "Enterprise",
}) {
  const payload = {
    pibAgencije: String(companyTaxId).trim(),
    nazivAgencije: String(companyName).trim(),
    maksimalnoRadnika: Number(maxEmployees) || 9999,
    datumIsteka: String(expiresAt).trim(),
    tier,
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
  if (!process.env.LEDGER_MASTER_SECRET) {
    console.log("\n[ERROR] Access denied: LEDGER_MASTER_SECRET is not set.");
    console.log(
      "This script may only run on an authorized developer workstation with LEDGER_MASTER_SECRET configured.",
    );
    rl.close();
    return;
  }

  console.log("\n======================================================");
  console.log("   SHIFTPULSE LEDGER PRO - B2B LICENSE GENERATOR      ");
  console.log("======================================================\n");

  const companyName = await promptUser("1. Enter Accounting Firm / Client Name: ");
  const companyTaxId = await promptUser("2. Enter Company Tax ID (PIB, 9 digits): ");
  const maxEmployees = await promptUser("3. Enter MAX EMPLOYEES limit (e.g. 250): ");
  const expiresAt = await promptUser("4. Enter EXPIRATION DATE (YYYY-MM-DD): ");
  const tierInput = await promptUser(
    "5. Enter LICENSE TIER (Starter / Pro / Enterprise) [Enterprise]: ",
  );

  if (!companyName || !companyTaxId || !expiresAt) {
    console.log("\n[ERROR] Company name, Tax ID, and expiration date are required.");
    rl.close();
    return;
  }

  const resolvedLimit = Number(maxEmployees) || 9999;
  const resolvedTier = tierInput.trim() || "Enterprise";
  const licenseKey = createEncryptedLicenseKey({
    companyTaxId,
    companyName,
    maxEmployees: resolvedLimit,
    expiresAt,
    tier: resolvedTier,
  });

  console.log("\n======================================================");
  console.log("[OK] LICENSE KEY GENERATED SUCCESSFULLY");
  console.log("======================================================\n");
  console.log("Client:    ", companyName);
  console.log("Tax ID:    ", companyTaxId);
  console.log("Tier:      ", resolvedTier);
  console.log("Expires:   ", expiresAt);
  console.log("Max Staff: ", resolvedLimit);
  console.log("\n--- COPY LICENSE KEY BELOW ---\n");
  console.log(licenseKey);
  console.log("\n----------------------------------------");
  console.log("Assign this key to B2B_LICENSE_KEY in .env or activate via the Workstation UI.");
  console.log("======================================================\n");
  rl.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCliGenerator();
}
