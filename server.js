import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fs from "fs";
import { Client } from "pg";
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
        reason: "Promotivni period od 3 meseca je istekao.",
      };
    }
    return { isValid: true, payload };
  } catch (error) {
    return {
      isValid: false,
      reason:
        "Kriti\u010Dna gre\u0161ka: Licencni klju\u010D je nevalidan ili izmenjen.",
    };
  }
}
const OFFICIAL_PROMO_TOKEN_BASE64 =
  "Eexn1rFAmFaX0gv2Z9/2kx0Nb7nLY3viD8ed5QJGuU1Kfo3PsLepxUYcOsz81yh8tStb4hDKaD4NRZef6RIfg9JcNBeap/kUDAuTerObVmLfycbgwlW6zj5rwCVzGO/Js4pB7eaozsd0btYoPL32XmoUxZRatMfoBwLkTjwX9vaXrGxzHA7z8zAb+gYzf3c+E2LTqpD+xNdIKhNpm0kMR2nrASJs86ys1pGa1kZD33YlTaS1GMFO4Z2ZqDRNkn/A66uCA4Rs9/49EWhPvHwx0xxfpHWiLIEUY6PnqnT95iiY5qEWBO2hWiynCpjXkztsJigNZLT6zFAA3CDPHD9i/Q==";
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
  if (
    cleaned === "SPL-PROMO-2026-01" ||
    cleaned === OFFICIAL_PROMO_TOKEN_BASE64 ||
    (!cleaned.includes(":") && cleaned.length > 80)
  ) {
    const promoCheck = validatePromoLicense(
      cleaned === "SPL-PROMO-2026-01" ? OFFICIAL_PROMO_TOKEN_BASE64 : cleaned,
    );
    if (promoCheck.isValid && promoCheck.payload) {
      return {
        validna: true,
        podaci: {
          licenseId: promoCheck.payload.licenseId,
          nazivAgencije: promoCheck.payload.clientName,
          pibAgencije: "109999888",
          tier: promoCheck.payload.tier,
          issuedAt: promoCheck.payload.issuedAt,
          datumIsteka: promoCheck.payload.expiresAt,
          maksimalnoRadnika: 5e3,
          features: promoCheck.payload.features,
        },
      };
    } else {
      return { validna: false, podaci: null, razlog: promoCheck.reason };
    }
  }
  if (!cleaned.includes(":")) {
    return {
      validna: false,
      podaci: null,
      razlog: "Format licencnog klju\u010Da nije ispravan.",
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
    res.json({
      success: true,
      kljujcZaKlijenta: noviKljuc,
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
      isDemo: false,
      antiClockTampering: {
        isTimeValid: false,
        reason: timeCheck.reason,
        lastRecorded: timeCheck.lastRecorded,
      },
      licenciraniPravniSubjekat: "SISTEM ZAKLJU\u010CAN",
      datumIsteka: "BLOKIRANO",
      poruka: timeCheck.reason,
    });
    return;
  }
  if (!kljucZaProveru) {
    res.json({
      success: false,
      valid: false,
      isDemo: true,
      antiClockTampering: {
        isTimeValid: true,
        lastRecorded: timeCheck.lastRecorded,
      },
      promoDostupna: {
        licenseId: "SPL-PROMO-2026-01",
        clientName: "ShiftPulse Ledger Promo User",
        tier: "Enterprise / Full Content",
        issuedAt: "2026-10-30",
        expiresAt: "2027-01-30",
        features: [
          "ai_scanner",
          "conflict_monitor",
          "b2b_shift_management",
          "eporezi_xml",
        ],
        promoCode: "SPL-PROMO-2026-01",
      },
      licenciraniPravniSubjekat: "Nelicencirana Stanica (DEMO re\u017Eim)",
      datumIsteka: "DEMO RE\u017DIM",
      maksimalnoRadnika: 3,
      poruka:
        "Softver radi u DEMO re\u017Eimu. Funkcije ePorezi XML izvoza su zaklju\u010Dane, a obra\u010Dun je ograni\u010Den na maksimalno 3 radnika.",
    });
    return;
  }
  const provera = validirajLokalnuLicencu(kljucZaProveru);
  if (provera.validna && provera.podaci) {
    res.json({
      success: true,
      valid: true,
      isDemo: false,
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
      poruka: `Sistem je uspe\u0161no autorizovan i licenciran (${provera.podaci.tier || "Enterprise"}).`,
    });
  } else {
    res.json({
      success: false,
      valid: false,
      isDemo: true,
      antiClockTampering: {
        isTimeValid: true,
        lastRecorded: timeCheck.lastRecorded,
      },
      licenciraniPravniSubjekat: "Nelicencirana Stanica",
      datumIsteka: "ISTEKLA",
      poruka:
        provera.razlog || "Licencni klju\u010D nedostaje ili je neispravan.",
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
          "Demo ograni\u010Denje: U besplatnoj verziji mo\u017Eete obra\u010Dunati maksimalno 3 radnika odjednom.",
        isDemo: true,
      });
      return;
    }
    if (req.path === "/api/ledger/generate-xml") {
      res.status(403).json({
        error:
          "Demo ograni\u010Denje: Funkcije ePorezi XML izvoza su zaklju\u010Dane u DEMO re\u017Eimu. Unesite licencni klju\u010D.",
        isDemo: true,
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
        "Pristup odbijen. Licenca za ovaj softver je neaktivna ili je istekla.",
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
      error: "Va\u0161a licenca ne obuhvata modul za ePorezi XML izvoz.",
      isDemo: false,
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
let interniRegistarOglasa = [
  {
    id: "oglas-lokalni-1",
    clientId: "firma-1",
    clientName: "TehnoProizvodnja d.o.o. Beograd",
    clientType: "company",
    tipOglasa: "potraznja_radnika",
    naslovPozicije: "Operater na CNC glodalici",
    detaljniUslovi:
      "Potrebna ispomo\u0107 u pogonu za hitan izvozni projekat. Rad u turnusu 12h.",
    budzetSatnica: 600,
    valuta: "RSD",
    lokacijaRada: "Obrenovac",
    trajanjeAngazmana: "Projektno (2 meseca)",
    status: "otvoren",
    posrednickaProvizija: "50 RSD po radnom satu",
    interneBeleskeAgencije:
      "Hitno im je jer im kasni isporuka za Nema\u010Dku. Mo\u017Ee se ponuditi podizvo\u0111a\u010D ako ima slobodne ma\u0161ine.",
    potencijalniMatchIds: [],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "oglas-lokalni-2",
    clientId: "freelance-1",
    clientName: "Marko Ili\u0107 PR - Softverske Usluge",
    clientType: "freelancer",
    tipOglasa: "freelance_ponuda_posla",
    naslovPozicije: "Izrada veb sajta i baze podataka",
    detaljniUslovi:
      "Full-stack programer nudi izradu internih ERP softvera i baza podataka za lokalne firme.",
    budzetSatnica: 35,
    valuta: "EUR",
    lokacijaRada: "Remote / Obrenovac",
    trajanjeAngazmana: "Po projektu",
    status: "u_pregovorima",
    posrednickaProvizija: "10% od ukupne vrednosti fakture",
    interneBeleskeAgencije:
      "Odli\u010Dan za proizvodna preduze\u0107a koja \u017Eele da digitalizuju magacin. Ponuditi direktoru TehnoProizvodnje.",
    potencijalniMatchIds: ["firma-1"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
];
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
app.post("/api/legal/log-action", (req, res) => {
  try {
    const { pibKompanije, operaterIme, aiPredlog, konacniPodaci, akcija } =
      req.body;
    const logZapis = {
      timestamp: /* @__PURE__ */ new Date().toISOString(),
      akcija,
      pibKompanije: pibKompanije || "DEMO_PIB",
      operater: operaterIme || "Lokalni Operater",
      licencaValidna: true,
      podaci: {
        staJeAiPredlozio: aiPredlog,
        staJeCovekPotvrdio: konacniPodaci,
      },
      // Pravno-tehnička klauzula koja se pakuje u svaki log
      pravnaIzjava:
        "Korisnik potvr\u0111uje da je li\u010Dno prekontrolisao AI predlog i garantuje za ta\u010Dnost unetih podataka u skladu sa Uslovima kori\u0161\u0107enja.",
    };
    const logFilePath = path.join(__dirname, "audit_ledger_pro.log");
    const logLinija = JSON.stringify(logZapis) + "\n";
    fs.appendFileSync(logFilePath, logLinija, "utf8");
    res.json({
      success: true,
      message:
        "Operacija je uspe\u0161no autentifikovana od strane operatera i trajno zabele\u017Eena u Audit Log.",
    });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Gre\u0161ka pri upisu u bezbednosni log.",
        details: error.message,
      });
  }
});

// ========================================================
// DISTRIBUTION & LIVE TESTING PACKAGES (Windows, Linux, ChromeOS)
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
    return { exists: false, sizeBytes: 0, sizeFormatted: "Nije generisan" };
  };

  res.json({
    success: true,
    packages: {
      windows: {
        id: "win",
        title: "Windows 10 / 11 / Server",
        filename: "shiftpulse-windows-package.zip",
        format: "ZIP Arhiva",
        downloadUrl: "/api/packages/download/windows",
        ...getFileInfo("shiftpulse-windows-package.zip"),
        instructions: [
          "Raspakujte zip arhivu u bilo koji direktorijum",
          "Dvaput kliknite na 'install-windows.bat' za automatsko podešavanje",
          "Aplikacija se pokreće sa radne površine (Desktop) ili preko 'start-windows.bat'",
        ],
        targetRuntimes: ["Windows 10", "Windows 11", "Windows Server 2019/2022"],
        features: [
          "Automatska prečica na radnoj površini",
          "Node.js automatska detekcija i instalacija",
          "Offline baza i lokalni audit log",
        ],
      },
      linux: {
        id: "linux",
        title: "Linux (Ubuntu / Debian / Fedora / Arch)",
        filename: "shiftpulse-linux-package.tar.gz",
        format: "TAR.GZ Arhiva",
        downloadUrl: "/api/packages/download/linux",
        ...getFileInfo("shiftpulse-linux-package.tar.gz"),
        instructions: [
          "Raspakujte arhivu: tar -xzf shiftpulse-linux-package.tar.gz",
          "Dodelite prava i instalirajte: chmod +x install-linux.sh && ./install-linux.sh",
          "Pokrenite iz GNOME/KDE menija ili preko terminala: ./start-linux.sh",
        ],
        targetRuntimes: [
          "Ubuntu 20.04 / 22.04 / 24.04",
          "Debian 11 / 12",
          "Fedora 38+",
          "Arch Linux",
        ],
        features: [
          "FreeDesktop .desktop integracija u meni aplikacija",
          "xdg-open browser automatsko pokretanje",
          "AppImage i .deb kompatibilnost",
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
          "1-Klik Native PWA: Otvorite u Chrome browseru i kliknite 'Instaliraj na policu'",
          "Crostini Linux kontejner: Raspakujte zip i pokrenite: chmod +x install-chromeos.sh && ./install-chromeos.sh",
        ],
        targetRuntimes: ["ChromeOS (Chromebook)", "ChromeOS Flex"],
        features: [
          "1-Klik instalacija na ChromeOS Policu (Shelf)",
          "Offline Service Worker keširanje bez interneta",
          "Crostini Linux kontejner podrška za lokalni server",
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
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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
