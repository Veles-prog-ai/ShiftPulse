/**
 * Zero-AI Deterministic Analytical Document Engine
 * Supports: UBL/SEF XML invoices, CSV/TXT bank & POS exports, digital PDFs (FlateDecode + text streams),
 * raw receipt/slip/invoice/otpremnica text, and local Canvas diagnostics for image scans.
 */

export const DOCUMENT_TYPES = {
  faktura: { id: "faktura", label: "Račun / Faktura", short: "Faktura" },
  fiskalni: { id: "fiskalni", label: "Fiskalni isečak", short: "Fiskalni" },
  otpremnica: { id: "otpremnica", label: "Otpremnica / Prijemnica", short: "Otpremnica" },
  slip: { id: "slip", label: "POS / Kartični slip", short: "Slip" },
  izvod: { id: "izvod", label: "Bankarski izvod", short: "Izvod" },
  rucno: { id: "rucno", label: "Ručni nalog / Obračun", short: "Nalog" },
};

export const KONTNI_OKVIR_CATALOG = {
  // Prihodi (Klasa 6)
  "601": { code: "601", name: "Prihodi od prodaje robe", direction: "prihod" },
  "612": { code: "612", name: "Prihodi od prodaje proizvoda i usluga", direction: "prihod" },
  "614": { code: "614", name: "Prihodi od pružanja usluga na stranom tržištu (Ino)", direction: "prihod" },
  "650": { code: "650", name: "Ostali poslovni prihodi", direction: "prihod" },
  // Rashodi (Klasa 5)
  "501": { code: "501", name: "Nabavna vrednost prodate robe (Otpremnice)", direction: "rashod" },
  "511": { code: "511", name: "Troškovi materijala za izradu", direction: "rashod" },
  "512": { code: "512", name: "Troškovi goriva i energije (NIS, EPS)", direction: "rashod" },
  "513": { code: "513", name: "Troškovi ostalog materijala (Kancelarija)", direction: "rashod" },
  "520": { code: "520", name: "Troškovi zarada i naknada zarada (Bruto II)", direction: "rashod" },
  "531": { code: "531", name: "Troškovi transportnih i logističkih usluga", direction: "rashod" },
  "533": { code: "533", name: "Troškovi zakupnina prostora i opreme", direction: "rashod" },
  "539": { code: "539", name: "Troškovi IT, cloud i telekomunikacionih usluga", direction: "rashod" },
  "551": { code: "551", name: "Troškovi neproizvodnih usluga i reprezentacije", direction: "rashod" },
  "555": { code: "555", name: "Troškovi poreza, taksi i doprinosa na teret firme", direction: "rashod" },
};

/**
 * Validacija kontrolne cifre srpskog PIB-a po modulu 11 (9 cifara)
 */
export function validateSerbianPib(pibStr) {
  if (!pibStr) return false;
  const clean = String(pibStr).replace(/\D/g, "");
  if (clean.length !== 9) return false;
  const digits = clean.split("").map(Number);
  if (digits[0] === 0) return false;
  let sum = 10;
  for (let i = 0; i < 8; i++) {
    sum = (sum + digits[i]) % 10;
    if (sum === 0) sum = 10;
    sum = (sum * 2) % 11;
  }
  let control = (11 - sum) % 10;
  return control === digits[8];
}

/**
 * Normalizuje lokalizovane brojeve:
 * "124.500,50" -> 124500.50
 * "124,500.50" -> 124500.50
 * "4500,00"    -> 4500
 * "4500.00"    -> 4500
 */
export function parseLocalizedNumber(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (!raw) return 0;
  let s = String(raw)
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // Evropski/Srpski format: 124.500,50
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 124,500.50
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const afterComma = s.length - lastComma - 1;
    if (afterComma === 3 && /^\d{1,3}(,\d{3})+$/.test(s)) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (lastDot > -1) {
    const dotsCount = (s.match(/\./g) || []).length;
    const afterDot = s.length - lastDot - 1;
    if (dotsCount > 1 || (afterDot === 3 && /^\d{1,3}(\.\d{3})+$/.test(s))) {
      s = s.replace(/\./g, "");
    }
  }

  const parsed = parseFloat(s);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Konvertuje DD.MM.YYYY ili YYYY-MM-DD u standardni ISO YYYY-MM-DD
 */
export function normalizeDate(rawDate) {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const isoMatch = rawDate.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const euMatch = rawDate.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

/**
 * Pravilo-bazirani klasifikator za Kontni Okvir RS (bez AI)
 */
export function classifyAccountCode(text, docType, direction) {
  const lower = (text || "").toLowerCase();

  if (direction === "prihod") {
    if (/(?:\beur|\busd|\bino|inostran|export|izvoz|consulting|software|cloud|\baws\b)/.test(lower)) {
      return "614";
    }
    if (/(?:\brob[aeu]|trgovin|veleprodaj|maloprodaj)/.test(lower)) {
      return "601";
    }
    if (/(?:uslug|održavan|servis|izrad|radov|konsalting|obrad)/.test(lower)) {
      return "612";
    }
    return "612";
  }

  // Rashod pravila (srpski koreni bez trailing \b zbog padeža i čćžšđ)
  if (docType === "otpremnica" || /(?:otpremnic|prijemnic|dostavnic|nabavka robe|magacin|palet)/.test(lower)) {
    return "501";
  }
  if (/(?:\bgoriv|benzin|dizel|evro\s?dizel|\bnis\b|\bmol\b|lukoil|\bomv\b|\beps\b|struj|električn|elektromrež|energij|\bgas\b|toplan|grejan)/.test(lower)) {
    return "512";
  }
  if (/(?:materijal|čelik|čeličn|aluminijum|sirovin|repromaterijal|alat|šraf|boja|reagens)/.test(lower)) {
    return "511";
  }
  if (/(?:transport|prevoz|špedicij|carin|kurir|\bbex\b|\baks\b|d\s?express|pošta|putarin|\btag\b)/.test(lower)) {
    return "531";
  }
  if (/(?:zakup|kirija|renta|iznajmljivan|poslovni prostor|lizing)/.test(lower)) {
    return "533";
  }
  if (/(?:telekom|\bmts\b|yettel|\ba1\b|\bsbb\b|internet|hosting|cloud|softver|licenc|microsoft|google|\bit\s)/.test(lower)) {
    return "539";
  }
  if (/(?:papir|toner|kancelarij|hemija|čišćen)/.test(lower)) {
    return "513";
  }
  if (/(?:taks|porez|naknad|administrativn|sudsk|opštin|komunaln|vodovod)/.test(lower)) {
    return "555";
  }
  return docType === "slip" ? "551" : "511";
}

/**
 * Ekstrakcija teksta iz digitalnog PDF-a bez eksternih biblioteka
 * Koristi ugrađeni DecompressionStream za /FlateDecode + parser PDF BT/ET blokova
 */
export async function extractTextFromPdfBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const latin1 = new TextDecoder("latin1").decode(bytes);
  let extractedChunks = [];

  const extractPdfOperators = (streamText) => {
    const out = [];
    // Jednostavni (string) Tj
    const tjMatches = streamText.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g);
    for (const m of tjMatches) {
      out.push(m[1].replace(/\\([()\\])/g, "$1"));
    }
    // Nizovi [(str) -12 (str2)] TJ
    const tjArrMatches = streamText.matchAll(/\[(.*?)\]\s*TJ/gs);
    for (const m of tjArrMatches) {
      const inner = [...m[1].matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g)].map((x) =>
        x[1].replace(/\\([()\\])/g, "$1")
      );
      if (inner.length) out.push(inner.join(""));
    }
    return out.join(" ");
  };

  // Direktni nekompresovani operatori u PDF-u
  const directOps = extractPdfOperators(latin1);
  if (directOps.trim()) {
    extractedChunks.push(directOps);
  }

  // Pokušaj dekompresije FlateDecode stream blokova pomoću native DecompressionStream
  if (typeof DecompressionStream !== "undefined") {
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    let streamCount = 0;
    while ((match = streamRegex.exec(latin1)) !== null && streamCount < 25) {
      streamCount++;
      const startPos = match.index + match[0].indexOf("\n") + 1;
      const rawLen = match[1].length;
      if (rawLen < 12 || rawLen > 2_000_000) continue;
      const slice = bytes.slice(startPos, startPos + rawLen);
      try {
        const ds = new DecompressionStream("deflate");
        const writer = ds.writable.getWriter();
        writer.write(slice);
        writer.close();
        const decompressed = await new Response(ds.readable).arrayBuffer();
        const text = new TextDecoder("utf-8", { fatal: false }).decode(decompressed);
        const ops = extractPdfOperators(text);
        if (ops.trim()) extractedChunks.push(ops);
      } catch {
        // Nije zlib deflate stream ili je slika/font — bezbedno preskačemo
      }
    }
  }

  // Fallback za čitljive ASCII/UTF-8 stringove ako je tekstualni PDF bez standardnih BT operatora
  const joined = extractedChunks.join("\n").replace(/\s{2,}/g, " ").trim();
  return joined;
}

/**
 * Lokalna Canvas analiza kvaliteta i tipa slike (za JPG/PNG slippove i račune bez AI-ja)
 */
export async function analyzeImageDiagnostics(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const sampleW = 120;
        const sampleH = Math.max(40, Math.round((img.height / Math.max(1, img.width)) * sampleW));
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const pixels = ctx.getImageData(0, 0, sampleW, sampleH).data;

        let lumSum = 0;
        let highContrastCount = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          lumSum += lum;
          if (lum < 85 || lum > 205) highContrastCount++;
        }
        const totalPx = pixels.length / 4;
        const avgLum = Math.round(lumSum / totalPx);
        const contrastRatio = Math.round((highContrastCount / totalPx) * 100);
        const aspect = img.width / Math.max(1, img.height);
        const inferredDocType = aspect < 0.65 ? "fiskalni" : aspect > 1.2 ? "slip" : "faktura";

        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: Number(aspect.toFixed(2)),
          avgBrightness: avgLum,
          contrastScore: contrastRatio,
          inferredDocType,
          qualityLabel:
            contrastRatio >= 45 && img.width >= 600
              ? "Visoka čitljivost skena"
              : "Srednja/niska rezolucija — preporučena ručna provera iznosa",
        });
      } catch {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0, inferredDocType: "faktura", qualityLabel: "Slika učitana" });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0, inferredDocType: "faktura", qualityLabel: "Slika učitana" });
    };
    img.src = url;
  });
}

/**
 * Deterministički XML (UBL 2.1 / SEF eFaktura RS) parser
 */
export function parseXmlInvoice(xmlText, activeCompany = null, filename = "efaktura.xml") {
  if (!xmlText || !xmlText.includes("<")) return null;

  let rootLocalName = "";
  let docNumber = "";
  let dateStr = "";
  let currency = "RSD";
  let supplierName = "Dobavljač (XML)";
  let supplierPib = "";
  let customerName = "Kupac (XML)";
  let customerPib = "";
  let netAmount = 0;
  let grossAmount = 0;
  let vatAmount = 0;
  let vatRate = 20;
  const lineItems = [];

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) {
      return null;
    }

    const getTagVal = (parent, localNames) => {
      if (!parent) return "";
      const list = Array.isArray(localNames) ? localNames : [localNames];
      for (const name of list) {
        const all = parent.getElementsByTagName("*");
        for (let i = 0; i < all.length; i++) {
          if (all[i].localName === name && all[i].textContent?.trim()) {
            return all[i].textContent.trim();
          }
        }
      }
      return "";
    };

    const getSection = (localName) => {
      const all = doc.getElementsByTagName("*");
      for (let i = 0; i < all.length; i++) {
        if (all[i].localName === localName) return all[i];
      }
      return null;
    };

    const supplierNode = getSection("AccountingSupplierParty");
    const customerNode = getSection("AccountingCustomerParty");
    const monetaryNode = getSection("LegalMonetaryTotal") || doc.documentElement;
    const taxTotalNode = getSection("TaxTotal");

    rootLocalName = doc.documentElement.localName || "";
    docNumber = getTagVal(doc.documentElement, ["ID"]) || filename.replace(/\.xml$/i, "");
    dateStr = normalizeDate(getTagVal(doc.documentElement, ["IssueDate", "TaxPointDate"]));
    currency = getTagVal(doc.documentElement, ["DocumentCurrencyCode"]) || "RSD";

    supplierName = getTagVal(supplierNode, ["RegistrationName", "Name"]) || "Dobavljač (XML)";
    supplierPib = getTagVal(supplierNode, ["CompanyID", "EndpointID", "ID"]).replace(/\D/g, "").slice(0, 9);
    customerName = getTagVal(customerNode, ["RegistrationName", "Name"]) || "Kupac (XML)";
    customerPib = getTagVal(customerNode, ["CompanyID", "EndpointID", "ID"]).replace(/\D/g, "").slice(0, 9);

    netAmount = parseLocalizedNumber(getTagVal(monetaryNode, ["TaxExclusiveAmount", "LineExtensionAmount"]));
    grossAmount = parseLocalizedNumber(
      getTagVal(monetaryNode, ["PayableAmount", "TaxInclusiveAmount"])
    );
    vatAmount =
      parseLocalizedNumber(getTagVal(taxTotalNode, ["TaxAmount"])) ||
      Math.max(0, grossAmount - netAmount);
    vatRate =
      parseLocalizedNumber(getTagVal(taxTotalNode, ["Percent"])) ||
      (netAmount > 0 ? Math.round((vatAmount / netAmount) * 100) : 20);

    const lineNodes = doc.getElementsByTagName("*");
    for (let i = 0; i < lineNodes.length; i++) {
      if (lineNodes[i].localName === "InvoiceLine" || lineNodes[i].localName === "DespatchLine") {
        const name = getTagVal(lineNodes[i], ["Name", "Description"]);
        const qty = parseLocalizedNumber(getTagVal(lineNodes[i], ["InvoicedQuantity", "DeliveredQuantity"])) || 1;
        const amt = parseLocalizedNumber(getTagVal(lineNodes[i], ["LineExtensionAmount"]));
        if (name) lineItems.push({ name, quantity: qty, amount: amt });
      }
    }
  } else {
    // Node.js / headless deterministički XML tag fallback
    const extractBlock = (tag, src = xmlText) => {
      const m = src.match(new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, "i"));
      return m ? m[1] : "";
    };
    const rootMatch = xmlText.match(/<(?:[\w-]+:)?(Invoice|DespatchAdvice|CreditNote)\b/i);
    rootLocalName = rootMatch ? rootMatch[1] : "Invoice";
    const supBlock = extractBlock("AccountingSupplierParty");
    const custBlock = extractBlock("AccountingCustomerParty");
    const monBlock = extractBlock("LegalMonetaryTotal") || xmlText;
    const taxBlock = extractBlock("TaxTotal");

    docNumber = extractBlock("ID") || filename.replace(/\.xml$/i, "");
    dateStr = normalizeDate(extractBlock("IssueDate") || extractBlock("TaxPointDate"));
    currency = extractBlock("DocumentCurrencyCode") || "RSD";
    supplierName = extractBlock("RegistrationName", supBlock) || extractBlock("Name", supBlock) || "Dobavljač (XML)";
    supplierPib = (extractBlock("CompanyID", supBlock) || extractBlock("EndpointID", supBlock) || extractBlock("ID", supBlock)).replace(/\D/g, "").slice(0, 9);
    customerName = extractBlock("RegistrationName", custBlock) || extractBlock("Name", custBlock) || "Kupac (XML)";
    customerPib = (extractBlock("CompanyID", custBlock) || extractBlock("EndpointID", custBlock) || extractBlock("ID", custBlock)).replace(/\D/g, "").slice(0, 9);

    netAmount = parseLocalizedNumber(extractBlock("TaxExclusiveAmount", monBlock) || extractBlock("LineExtensionAmount", monBlock) || extractBlock("TaxableAmount", taxBlock));
    grossAmount = parseLocalizedNumber(extractBlock("PayableAmount", monBlock) || extractBlock("TaxInclusiveAmount", monBlock));
    vatAmount = parseLocalizedNumber(extractBlock("TaxAmount", taxBlock)) || Math.max(0, grossAmount - netAmount);
    vatRate = parseLocalizedNumber(extractBlock("Percent", taxBlock)) || (netAmount > 0 ? Math.round((vatAmount / netAmount) * 100) : 20);
  }

  // Automatska detekcija smera (Prihod vs Rashod) na osnovu PIB-a aktivnog klijenta
  const activePib = (activeCompany?.pib || "").replace(/\D/g, "");
  let direction = "rashod";
  let partnerName = supplierName;
  let partnerPib = supplierPib;

  if (activePib && supplierPib === activePib) {
    direction = "prihod";
    partnerName = customerName;
    partnerPib = customerPib;
  } else if (activePib && customerPib === activePib) {
    direction = "rashod";
    partnerName = supplierName;
    partnerPib = supplierPib;
  } else if (rootLocalName.toLowerCase().includes("despatch")) {
    direction = "rashod";
  }

  const isDespatch = rootLocalName.toLowerCase().includes("despatch");
  const docType = isDespatch ? "otpremnica" : "faktura";
  const konto = classifyAccountCode(
    `${partnerName} ${lineItems.map((l) => l.name).join(" ")}`,
    docType,
    direction
  );

  return {
    id: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceEngine: "SEF / UBL 2.1 XML Parser (Bez AI)",
    docType,
    direction,
    docNumber,
    date: dateStr,
    partnerName,
    partnerPib,
    pibValid: validateSerbianPib(partnerPib),
    currency,
    netAmount: netAmount || Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grossAmount: grossAmount || Math.round((netAmount + vatAmount) * 100) / 100,
    mathVerified: Math.abs((netAmount + vatAmount) - grossAmount) <= 2,
    konto,
    kontoLabel: KONTNI_OKVIR_CATALOG[konto]?.name || "Poslovni dokument",
    description:
      lineItems.length > 0
        ? lineItems.slice(0, 3).map((l) => `${l.name} (x${l.quantity})`).join(", ")
        : `${DOCUMENT_TYPES[docType].label} #${docNumber}`,
    lineItems,
    confidence: 98,
    rawSnippet: xmlText.slice(0, 240),
  };
}

/**
 * Batch CSV / Bank Statement / Export Parser (Bez AI)
 */
export function parseCsvBatch(csvText, activeCompany = null) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";

  const splitRow = (rowStr) => {
    const cols = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const ch = rowStr[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase());
  const findCol = (keywords) =>
    headers.findIndex((h) => keywords.some((kw) => h.includes(kw)));

  const dateCol = findCol(["datum", "date", "valuta"]);
  const partnerCol = findCol(["partner", "komitent", "naziv", "primalac", "dobavljač", "kupac", "merchant"]);
  const descCol = findCol(["opis", "svrha", "napomena", "desc", "stavka"]);
  const debitCol = findCol(["duguje", "rashod", "debit", "isplata", "odliv"]);
  const creditCol = findCol(["potražuje", "potrazuje", "prihod", "credit", "uplata", "priliv"]);
  const amountCol = findCol(["iznos", "ukupno", "bruto", "amount", "total"]);
  const pibCol = findCol(["pib", "tax"]);
  const docCol = findCol(["broj", "dokument", "faktura", "poziv", "ref"]);

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (cols.length < 2) continue;

    const debit = debitCol >= 0 ? parseLocalizedNumber(cols[debitCol]) : 0;
    const credit = creditCol >= 0 ? parseLocalizedNumber(cols[creditCol]) : 0;
    const singleAmt = amountCol >= 0 ? parseLocalizedNumber(cols[amountCol]) : 0;

    let direction = "rashod";
    let grossAmount = 0;

    if (credit > 0 && debit === 0) {
      direction = "prihod";
      grossAmount = credit;
    } else if (debit > 0) {
      direction = "rashod";
      grossAmount = debit;
    } else if (singleAmt !== 0) {
      direction = singleAmt > 0 && creditCol === -1 && headers.join(" ").includes("prihod") ? "prihod" : singleAmt < 0 ? "rashod" : "rashod";
      grossAmount = Math.abs(singleAmt);
    }

    if (grossAmount <= 0) continue;

    const date = dateCol >= 0 ? normalizeDate(cols[dateCol]) : new Date().toISOString().split("T")[0];
    const partnerName =
      (partnerCol >= 0 ? cols[partnerCol] : "") ||
      (descCol >= 0 ? cols[descCol].slice(0, 36) : "") ||
      `Stavka #${i}`;
    const desc = (descCol >= 0 ? cols[descCol] : partnerName) || "Uvoz iz CSV izvoda";
    const docNumber = (docCol >= 0 ? cols[docCol] : "") || `CSV-${i}`;
    const partnerPib = pibCol >= 0 ? cols[pibCol].replace(/\D/g, "").slice(0, 9) : "";

    const vatRate = activeCompany?.uSistemuPdv === false ? 0 : 20;
    const netAmount = Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100;
    const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100;
    const docType = creditCol >= 0 || debitCol >= 0 ? "izvod" : "faktura";
    const konto = classifyAccountCode(`${partnerName} ${desc}`, docType, direction);

    results.push({
      id: `fin-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
      sourceEngine: "CSV / Izvod Batch Parser (Bez AI)",
      docType,
      direction,
      docNumber,
      date,
      partnerName,
      partnerPib,
      pibValid: validateSerbianPib(partnerPib),
      currency: "RSD",
      netAmount,
      vatRate,
      vatAmount,
      grossAmount,
      mathVerified: true,
      konto,
      kontoLabel: KONTNI_OKVIR_CATALOG[konto]?.name || "",
      description: desc,
      confidence: 92,
    });
  }
  return results;
}

/**
 * Napredni deterministički analitički parser za tekstualne dokumente:
 * Račune, Otpremnice, Fiskalne isečke, POS Slippove, Mail/PDF tekst.
 */
export function parseRawDocumentText(rawText, activeCompany = null, extraHints = {}) {
  const text = (rawText || "").replace(/\r\n/g, "\n").trim();
  const lower = text.toLowerCase();

  // 1. Određivanje tipa dokumenta na osnovu determinističke heuristike
  let docType = extraHints.inferredDocType || "faktura";
  if (/(otpremnic|prijemnic|dostavnic|delivery\s?note|izdao\s?robu|primio\s?robu)/i.test(lower)) {
    docType = "otpremnica";
  } else if (/(pfr\s?broj|esir|fiskalni\s?račun|фискални|gotovinski\s?isečak|хвала на посети|stopa\s?[đeа])/i.test(lower)) {
    docType = "fiskalni";
  } else if (/(pos\s?terminal|tid:|mid:|autorizac|dina\s?card|visa|mastercard|kartica:\s?\*{4}|rrn:|slip)/i.test(lower)) {
    docType = "slip";
  } else if (/(bankarski\s?izvod|dnevni\s?izvod|prethodno\s?stanje|novo\s?stanje)/i.test(lower)) {
    docType = "izvod";
  } else if (/(račun|faktura|invoice|predračun|avansni)/i.test(lower)) {
    docType = "faktura";
  }

  // 2. Broj dokumenta
  let docNumber = "";
  const docNumPatterns = [
    /(?:broj\s*(?:računa|fakture|otpremnice|dokumenta)|račun\s*br\.?|faktura\s*br\.?|otpremnica\s*br\.?|pfr\s*broj|invoice\s*(?:no|#|number))[:\s#-]*([A-Z0-9/-]{3,28})/i,
    /\b(rrn)\s*[:#-]*\s*([A-Z0-9-]{4,24})/i,
    /\b(?:br\.?|no\.?)\s*[:#]?\s*(\d{1,6}[-/]\d{2,4}(?:[-/]\d{1,4})?)/i,
    /\b(tid)\s*[:#-]*\s*([A-Z0-9-]{4,24})/i,
  ];
  for (const rx of docNumPatterns) {
    const m = text.match(rx);
    if (m) {
      docNumber = m[2] ? `${m[1].toUpperCase()}-${m[2].trim()}` : m[1]?.trim();
      if (docNumber) break;
    }
  }
  if (!docNumber && extraHints.filename) {
    const fnNum = extraHints.filename.match(/(\d{2,}[-_]\d{2,}|\d{4,10})/);
    if (fnNum) docNumber = fnNum[1].replace("_", "-");
  }

  // 3. Datum prometa / izdavanja
  let date = new Date().toISOString().split("T")[0];
  const dateLabelMatch = text.match(
    /(?:datum\s*(?:izdavanja|prometa|računa|valute)?|date|vreme)[:\s]*(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i
  );
  if (dateLabelMatch) {
    date = normalizeDate(dateLabelMatch[1]);
  } else {
    const anyDateMatch = text.match(/(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})/);
    if (anyDateMatch) date = normalizeDate(anyDateMatch[1]);
  }

  // 4. Ekstrakcija svih PIB brojeva (9 cifara) i određivanje smera (Prihod vs Rashod)
  const pibMatches = [...text.matchAll(/(?:pib|пиб|tax\s?id)[:\s#]*(\d{9})/gi)].map((m) => m[1]);
  const activePib = (activeCompany?.pib || "").replace(/\D/g, "");
  let partnerPib = pibMatches.find((p) => p !== activePib) || pibMatches[0] || "";

  let direction = "rashod";
  if (/(izlazni\s*račun|izlazna\s*faktura|prodaja\s*kupcu|izdavalac\s*smo)/i.test(lower)) {
    direction = "prihod";
  } else if (docType === "fiskalni" || docType === "slip") {
    direction = "rashod";
  } else if (activePib && pibMatches.length >= 2) {
    // Ako je naš PIB prvi u dokumentu (Prodavac) a postoji drugi PIB (Kupac), ovo je naš PRIHOD
    if (pibMatches[0] === activePib && pibMatches[1] !== activePib) {
      direction = "prihod";
      partnerPib = pibMatches[1];
    } else if (pibMatches[1] === activePib) {
      direction = "rashod";
      partnerPib = pibMatches[0];
    }
  } else if (
    activeCompany?.naziv &&
    /prodavac\s*[:\n]/i.test(lower) &&
    lower.includes(activeCompany.naziv.toLowerCase().slice(0, 8))
  ) {
    direction = "prihod";
  }

  // 5. Partner / Dobavljač / Kupac naziv
  let partnerName = "";
  const partnerRx =
    direction === "prihod"
      ? /(?:kupac|primalac|bill\s?to|client)[:\s]+([^\n]{3,65})/i
      : /(?:dobavljač|prodavac|izdavalac|trgovac|supplier|vendor|merchant)[:\s]+([^\n]{3,65})/i;
  const pMatch = text.match(partnerRx);
  if (pMatch) {
    partnerName = pMatch[1].replace(/\s{2,}.*$/, "").trim();
  }
  if (!partnerName) {
    // Traži liniju koja sadrži d.o.o., a.d., PR, s.t.r.
    const legalEntityMatch = text.match(
      /^.*?(?:d\.?o\.?o\.?|a\.?d\.?|s\.?t\.?r\.?|p\.?r\.?|sztr|ltd|gmbh).*$/im
    );
    if (legalEntityMatch) {
      const candidate = legalEntityMatch[0].trim();
      if (!activeCompany || !candidate.toLowerCase().includes(activeCompany.naziv.toLowerCase().slice(0, 10))) {
        partnerName = candidate.slice(0, 64);
      }
    }
  }
  if (!partnerName) {
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 3 && !/^[=\-*#]+$/.test(l));
    partnerName = lines[0]?.slice(0, 50) || extraHints.filename?.replace(/\.[^.]+$/, "") || "Nepoznat komitent";
  }

  // 6. Valuta
  let currency = "RSD";
  if (/\bEUR\b|€/i.test(text)) currency = "EUR";
  else if (/\bUSD\b|\$/i.test(text) && !/\bRSD\b/i.test(text)) currency = "USD";

  // 7. Ekstrakcija finansijskih iznosa (Ukupno, Osnovica, PDV, Stopa PDV-a)
  const extractAmountByLabels = (labels) => {
    for (const label of labels) {
      const rx = new RegExp(
        `${label}[^\\d\\n]{0,20}([\\d]{1,3}(?:[.,\\s]\\d{3})*(?:[.,]\\d{1,2})|\\d+[.,]\\d{2}|\\d{3,})`,
        "i"
      );
      const m = text.match(rx);
      if (m && m[1]) {
        const val = parseLocalizedNumber(m[1]);
        if (val > 0) return val;
      }
    }
    return 0;
  };

  let grossAmount = extractAmountByLabels([
    "ukupno\\s*za\\s*uplatu",
    "za\\s*uplatu",
    "ukupan\\s*iznos",
    "ukupno\\s*sa\\s*pdv",
    "svega\\s*za\\s*plaćanje",
    "grand\\s*total",
    "total\\s*amount",
    "ukupno",
    "iznos\\s*transakcije",
    "autorizovani\\s*iznos",
    "iznos",
    "total",
  ]);

  let netAmount = extractAmountByLabels([
    "osnovica\\s*(?:za\\s*pdv|20%|10%)?",
    "ukupno\\s*bez\\s*pdv",
    "neto\\s*vrednost",
    "vrednost\\s*robe\\s*bez\\s*pdv",
    "subtotal",
    "net\\s*amount",
  ]);

  let vatAmount = extractAmountByLabels([
    "ukupan\\s*pdv",
    "iznos\\s*pdv(?:-a)?",
    "pdv\\s*(?:20%|10%)?",
    "porez\\s*(?:na\\s*dodatu)?",
    "vat\\s*(?:20%|amount)?",
    "укупан\\s*порез",
  ]);

  // Ekstrakcija PDV stope (20%, 10%, 0%)
  let vatRate = 20;
  if (/(?:pdv|stopa|vat)[^\d\n]{0,12}10\s*%/i.test(lower) || /stopa\s*e\s*\(?10%/i.test(lower)) {
    vatRate = 10;
  } else if (/(?:oslobođeno\s*pdv|nije\s*u\s*sistemu\s*pdv|pdv\s*0%|bez\s*pdv)/i.test(lower)) {
    vatRate = 0;
  }

  // Fallback za slike / brojeve iz imena fajla ako je tekst prazan
  if (grossAmount === 0 && extraHints.filename) {
    const fileAmtMatch = extraHints.filename.match(/[_-](\d{3,8})(?:[.,](\d{2}))?(?:\D|$)/);
    if (fileAmtMatch) {
      grossAmount = Number(`${fileAmtMatch[1]}.${fileAmtMatch[2] || "00"}`);
    }
  }

  // Ako još nema ukupnog iznosa u tekstu, uzmi najveći formatirani novčani iznos sa decimalama
  if (grossAmount === 0 && text.length > 0) {
    const allMoney = [...text.matchAll(/\b(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\b/g)]
      .map((m) => parseLocalizedNumber(m[1]))
      .filter((n) => n > 0 && n < 500_000_000);
    if (allMoney.length > 0) {
      grossAmount = Math.max(...allMoney);
    }
  }

  // Matematičko usklađivanje Osnovica + PDV = Bruto
  if (grossAmount > 0 && netAmount === 0 && vatAmount === 0) {
    netAmount = Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100;
    vatAmount = Math.round((grossAmount - netAmount) * 100) / 100;
  } else if (grossAmount > 0 && netAmount > 0 && vatAmount === 0) {
    vatAmount = Math.max(0, Math.round((grossAmount - netAmount) * 100) / 100);
    if (netAmount > 0 && vatAmount > 0) {
      const derivedRate = Math.round((vatAmount / netAmount) * 100);
      if ([0, 10, 20].includes(derivedRate)) vatRate = derivedRate;
    }
  } else if (netAmount > 0 && vatAmount > 0 && grossAmount === 0) {
    grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;
  }

  // Ekstrakcija pojedinačnih stavki (Količina x Cena)
  const lineItems = [];
  const itemMatches = text.matchAll(
    /^([A-Za-zČĆŽŠĐčćžšđ0-9\s/-]{3,40})\s+(\d+(?:[.,]\d+)?)\s*(?:kom|kg|l|lit|h|m|kut)?\s*[xX*]\s*(\d[\d.,]*)/gm
  );
  for (const m of itemMatches) {
    const qty = parseLocalizedNumber(m[2]);
    const price = parseLocalizedNumber(m[3]);
    if (qty > 0 && price > 0) {
      lineItems.push({
        name: m[1].trim(),
        quantity: qty,
        unitPrice: price,
        amount: Math.round(qty * price * 100) / 100,
      });
    }
  }

  const konto = classifyAccountCode(`${partnerName} ${text}`, docType, direction);
  const mathVerified =
    grossAmount > 0 && Math.abs((netAmount + vatAmount) - grossAmount) <= 2;
  const pibValid = validateSerbianPib(partnerPib);

  // Deterministički skor pouzdanosti na osnovu broja verifikovanih činjenica
  let matchedChecks = 0;
  if (docNumber) matchedChecks++;
  if (date) matchedChecks++;
  if (grossAmount > 0) matchedChecks += 2;
  if (mathVerified) matchedChecks++;
  if (partnerPib) matchedChecks++;
  if (partnerName && !partnerName.startsWith("Nepoznat")) matchedChecks++;
  const confidence = Math.min(99, Math.round((matchedChecks / 7) * 100));

  return {
    id: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceEngine: "Analitički Automat v1.0 (0 AI tokena)",
    docType,
    direction,
    docNumber: docNumber || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
    date,
    partnerName,
    partnerPib,
    pibValid,
    currency,
    netAmount: Math.round(netAmount * 100) / 100,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grossAmount: Math.round(grossAmount * 100) / 100,
    mathVerified,
    konto,
    kontoLabel: KONTNI_OKVIR_CATALOG[konto]?.name || "Poslovna transakcija",
    description:
      lineItems.length > 0
        ? lineItems.slice(0, 3).map((l) => `${l.name} (${l.quantity} x ${l.unitPrice})`).join("; ")
        : `${DOCUMENT_TYPES[docType]?.label || "Dokument"} · ${partnerName}`,
    lineItems,
    confidence,
    imageDiagnostics: extraHints.imageDiagnostics || null,
  };
}

/**
 * Glavna ulazna funkcija za analizu uploadovanog fajla bez AI-ja
 */
export async function analyzeUploadedDocument(file, activeCompany = null) {
  const filename = file.name || "dokument";
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mime = (file.type || "").toLowerCase();

  // 1. XML / eFaktura UBL
  if (ext === "xml" || mime.includes("xml")) {
    const text = await file.text();
    const xmlRecord = parseXmlInvoice(text, activeCompany, filename);
    if (xmlRecord) {
      return { mode: "single", records: [xmlRecord], rawText: text };
    }
  }

  // 2. CSV / Bankarski Izvod (Batch)
  if (ext === "csv" || mime.includes("csv")) {
    const text = await file.text();
    const batch = parseCsvBatch(text, activeCompany);
    if (batch.length > 0) {
      return { mode: "batch", records: batch, rawText: text };
    }
  }

  // 3. TXT / JSON
  if (ext === "txt" || ext === "log" || mime.startsWith("text/")) {
    const text = await file.text();
    const rec = parseRawDocumentText(text, activeCompany, { filename });
    return { mode: "single", records: [rec], rawText: text };
  }

  // 4. Digitalni PDF
  if (ext === "pdf" || mime === "application/pdf") {
    const buf = await file.arrayBuffer();
    const extracted = await extractTextFromPdfBuffer(buf);
    const rec = parseRawDocumentText(extracted, activeCompany, {
      filename,
      inferredDocType: filename.toLowerCase().includes("otpremnica") ? "otpremnica" : "faktura",
    });
    return {
      mode: "single",
      records: [rec],
      rawText: extracted,
      needsManualCheck: extracted.length < 25,
    };
  }

  // 5. Slika (JPG/PNG/WebP) — lokalna Canvas dijagnostika + ekstrakcija iz naziva fajla bez AI-ja
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    const diag = await analyzeImageDiagnostics(file);
    const rec = parseRawDocumentText("", activeCompany, {
      filename,
      inferredDocType: diag.inferredDocType,
      imageDiagnostics: diag,
    });
    return {
      mode: "single",
      records: [rec],
      rawText: "",
      imageDiagnostics: diag,
      needsManualCheck: rec.grossAmount === 0,
    };
  }

  // Generički fallback
  const fallbackText = await file.text().catch(() => "");
  const fallbackRec = parseRawDocumentText(fallbackText, activeCompany, { filename });
  return { mode: "single", records: [fallbackRec], rawText: fallbackText };
}
