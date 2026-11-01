import crypto from "crypto";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();
const MASTER_ENCRYPTION_KEY =
  process.env.LEDGER_MASTER_SECRET ||
  "359b8c642f883f3e8f85f1c2b5e913a47d2b8e3a5f6c8d7b1a2c3d4e5f6a7b8c";
const ALGORITAM = "aes-256-cbc";
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
function pitajKorisnika(pitanje) {
  return new Promise((resolve) => rl.question(pitanje, resolve));
}
function izradiKriptovaniKljuc(pib, naziv, radnici, datum) {
  const payload = {
    pibAgencije: pib.trim(),
    nazivAgencije: naziv.trim(),
    maksimalnoRadnika: Number(radnici),
    datumIsteka: datum.trim(),
    // Format: YYYY-MM-DD
  };
  const tekstZaEnkripciju = JSON.stringify(payload);
  const iv = crypto.randomBytes(16);
  const kljucBafer = crypto.scryptSync(MASTER_ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITAM, kljucBafer, iv);
  let kriptovanTekst = cipher.update(tekstZaEnkripciju, "utf8", "hex");
  kriptovanTekst += cipher.final("hex");
  return `${iv.toString("hex")}:${kriptovanTekst}`;
}
async function pokreniGenerator() {
  if (!process.env.LEDGER_MASTER_SECRET) {
    console.log("\n\u274C Sistemska gre\u0161ka: Pristup odbijen!");
    console.log(
      "Ova skripta se mo\u017Ee pokrenuti isklju\u010Divo na autorizovanoj developerskoj stanici vlasnika softvera.",
    );
    rl.close();
    return;
  }
  console.log("\n======================================================");
  console.log("   SHIFTPULSE LEDGER PRO - B2B GENERATOR LICENCI      ");
  console.log("======================================================\n");
  const naziv = await pitajKorisnika(
    "1. Unesite NAZIV knjigovodstvene agencije: ",
  );
  const pib = await pitajKorisnika("2. Unesite PIB agencije (9 cifara): ");
  const radnici = await pitajKorisnika(
    "3. Unesite MAKSIMALAN BROJ radnika (npr. 250): ",
  );
  const datum = await pitajKorisnika(
    "4. Unesite DATUM ISTEKA licence (Format: YYYY-MM-DD): ",
  );
  if (!naziv || !pib || !datum) {
    console.log(
      "\n\u274C Gre\u0161ka: Sva polja (osim broja radnika) su obavezna!",
    );
    rl.close();
    return;
  }
  const limitRadnika = Number(radnici) || 9999;
  const licencniKljuc = izradiKriptovaniKljuc(pib, naziv, limitRadnika, datum);
  console.log("\n======================================================");
  console.log("\u2705 LICENCA USPE\u0160NO GENERISANA!");
  console.log("======================================================\n");
  console.log("Klijent: ", naziv);
  console.log("PIB:     ", pib);
  console.log("Isti\u010De:  ", datum);
  console.log("Radnika: ", limitRadnika);
  console.log("\n--- KOPIRAJTE KLJU\u010C ISPOD OVE LINIJE ---");
  console.log("\n" + licencniKljuc + "\n");
  console.log("----------------------------------------");
  console.log(
    "Po\u0161aljite ovaj klju\u010D klijentu da ga upi\u0161e kao B2B_LICENSE_KEY u .env",
  );
  console.log("======================================================\n");
  rl.close();
}
pokreniGenerator();
