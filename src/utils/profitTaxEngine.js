/**
 * Deterministic Profit, Loss, VAT (PDV) & Corporate/Entrepreneur Tax Engine
 * Zero-AI local analytical computation engine compliant with RS accounting rules.
 */

export const DEFAULT_EXCHANGE_RATES = {
  RSD: 1,
  EUR: 117.1,
  USD: 108.5,
};

export function toRsdAmount(amount, currency = "RSD", customRates = DEFAULT_EXCHANGE_RATES) {
  const num = Number(amount) || 0;
  const rate = customRates[currency] || 1;
  return Math.round(num * rate * 100) / 100;
}

export function filterRecordsByPeriod(records, periodKey = "all", referenceDate = new Date()) {
  if (!Array.isArray(records)) return [];
  if (periodKey === "all") return records;

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-11
  const currentQuarter = Math.floor(month / 3);

  return records.filter((rec) => {
    if (!rec.date) return false;
    const d = new Date(rec.date + "T12:00:00");
    if (Number.isNaN(d.getTime())) return false;

    if (periodKey === "month") {
      return d.getFullYear() === year && d.getMonth() === month;
    }
    if (periodKey === "quarter") {
      return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === currentQuarter;
    }
    if (periodKey === "year") {
      return d.getFullYear() === year;
    }
    return true;
  });
}

/**
 * Glavni obračun prihoda, rashoda, PDV bilansa, poreza i neto dobiti klijenta
 */
export function calculateClientProfitAndTax({
  company,
  records = [],
  employees = [],
  period = "all",
  includePayrollCost = true,
  inVatSystem = true,
  monthsInPeriod = 1,
  pausalMonthlyTax = 42500,
  exchangeRates = DEFAULT_EXCHANGE_RATES,
}) {
  const scopedRecords = filterRecordsByPeriod(records, period);

  // 1. Prihodi i Rashodi iz dokumentacije (računi, otpremnice, slipovi, izvodi)
  let totalRevenueNet = 0; // Prihod bez PDV-a
  let totalRevenueGross = 0; // Prihod sa PDV-om
  let outputVat = 0; // Izlazni PDV

  let totalDocsExpenseNet = 0; // Rashod bez odbitnog PDV-a
  let totalDocsExpenseGross = 0; // Rashod sa PDV-om
  let inputVat = 0; // Ulazni PDV (odbitni)

  const kontoBreakdown = {};
  const docTypeCounts = {
    faktura: 0,
    fiskalni: 0,
    otpremnica: 0,
    slip: 0,
    izvod: 0,
    rucno: 0,
  };

  const addKonto = (konto, label, direction, netVal, grossVal) => {
    const key = konto || (direction === "prihod" ? "612" : "511");
    if (!kontoBreakdown[key]) {
      kontoBreakdown[key] = {
        konto: key,
        label: label || `Konto ${key}`,
        direction,
        netAmount: 0,
        grossAmount: 0,
        count: 0,
      };
    }
    kontoBreakdown[key].netAmount += netVal;
    kontoBreakdown[key].grossAmount += grossVal;
    kontoBreakdown[key].count += 1;
  };

  scopedRecords.forEach((rec) => {
    const netRsd = toRsdAmount(rec.netAmount, rec.currency, exchangeRates);
    const vatRsd = toRsdAmount(rec.vatAmount, rec.currency, exchangeRates);
    const grossRsd = toRsdAmount(rec.grossAmount, rec.currency, exchangeRates);

    if (rec.docType && docTypeCounts[rec.docType] !== undefined) {
      docTypeCounts[rec.docType] += 1;
    }

    if (rec.direction === "prihod") {
      // Ako firma NIJE u sistemu PDV-a, ceo bruto priliv je poslovni prihod
      const recognizedRevNet = inVatSystem ? netRsd : grossRsd;
      totalRevenueNet += recognizedRevNet;
      totalRevenueGross += grossRsd;
      if (inVatSystem) {
        outputVat += vatRsd;
      }
      addKonto(rec.konto, rec.kontoLabel, "prihod", recognizedRevNet, grossRsd);
    } else {
      // Ako firma JESTE u sistemu PDV-a i dokument ima odbitni PDV, u rashod ide osnovica
      // Ako nije u PDV-u, ceo bruto trošak ulazi u rashod
      const recognizedExpNet = inVatSystem && vatRsd > 0 ? netRsd : grossRsd;
      totalDocsExpenseNet += recognizedExpNet;
      totalDocsExpenseGross += grossRsd;
      if (inVatSystem) {
        inputVat += vatRsd;
      }
      addKonto(rec.konto, rec.kontoLabel, "rashod", recognizedExpNet, grossRsd);
    }
  });

  // 2. Automatsko povlačenje troška zarada radnika (Bruto II) za ovog klijenta
  let monthlyPayrollBrutoII = 0;
  let calculatedWorkersCount = 0;
  employees.forEach((emp) => {
    if (emp.obracun?.ukupnoZaIsplatuFirme) {
      monthlyPayrollBrutoII += Number(emp.obracun.ukupnoZaIsplatuFirme) || 0;
      calculatedWorkersCount++;
    } else {
      // Zakonska procena Bruto II za neobračunate radnike (~Bruto I * 1.1515)
      monthlyPayrollBrutoII += (Number(emp.brutoBaza) || 0) * 1.1515;
    }
  });

  const periodMultiplier =
    period === "quarter" ? 3 : period === "year" ? 12 : Math.max(1, monthsInPeriod);
  const payrollCostTotal = includePayrollCost
    ? Math.round(monthlyPayrollBrutoII * (period === "month" || period === "all" ? 1 : periodMultiplier) * 100) / 100
    : 0;

  if (includePayrollCost && payrollCostTotal > 0) {
    addKonto(
      "520",
      `Troškovi zarada i naknada (Bruto II · ${employees.length} radnika)`,
      "rashod",
      payrollCostTotal,
      payrollCostTotal
    );
  }

  // 3. Zbirni P&L (Bilans Uspeha)
  const totalExpenses = Math.round((totalDocsExpenseNet + payrollCostTotal) * 100) / 100;
  const grossProfit = Math.round((totalRevenueNet - totalExpenses) * 100) / 100;

  // 4. PDV Bilans (KIR - KPR)
  const vatBalance = inVatSystem ? Math.round((outputVat - inputVat) * 100) / 100 : 0;
  const vatStatus =
    !inVatSystem
      ? "van_pdv"
      : vatBalance > 0
      ? "duguje_drzavi"
      : vatBalance < 0
      ? "pdv_kredit"
      : "nula";

  // 5. Obračun poreza na dobit / prihod prema poreskom modelu klijenta
  const taxModel = company?.poreskiModel || "doo";
  let taxRateLabel = "15% (Porez na dobit pravnih lica)";
  let incomeTax = 0;
  let dividendTaxPreview = 0;

  if (taxModel === "pausal") {
    const months = period === "quarter" ? 3 : period === "year" ? 12 : 1;
    incomeTax = Math.round(pausalMonthlyTax * months);
    taxRateLabel = `Paušalno oporezivanje (${pausalMonthlyTax.toLocaleString()} RSD/mes)`;
  } else if (taxModel === "inostrani_priliv") {
    // Frilenseri Model B uprošćeno poređenje: 34% normirani + 96.000 RSD kvartalno neoporezivo
    const taxableFreelance = Math.max(0, totalRevenueNet * 0.66 - 96000);
    incomeTax = Math.round(taxableFreelance * 0.10);
    taxRateLabel = "10% Porez na dohodak (Frilenseri Model B)";
  } else if (taxModel === "knjigas") {
    incomeTax = grossProfit > 0 ? Math.round(grossProfit * 0.10 * 100) / 100 : 0;
    taxRateLabel = "10% (Preduzetnik knjigaš)";
  } else {
    // Standardni d.o.o.
    incomeTax = grossProfit > 0 ? Math.round(grossProfit * 0.15 * 100) / 100 : 0;
    taxRateLabel = "15% (Porez na dobit d.o.o.)";
  }

  const netProfit = Math.round((grossProfit - incomeTax) * 100) / 100;
  if (taxModel === "doo" && netProfit > 0) {
    dividendTaxPreview = Math.round(netProfit * 0.15 * 100) / 100;
  }

  const profitMarginPercent =
    totalRevenueNet > 0 ? Math.round((netProfit / totalRevenueNet) * 1000) / 10 : 0;

  // 6. Kontrola zakonskih limita (Paušal 6M RSD, PDV prag 8M RSD)
  const yearlyRevenueEstimate = records
    .filter((r) => r.direction === "prihod")
    .reduce((acc, r) => acc + toRsdAmount(r.grossAmount, r.currency, exchangeRates), 0);

  const pausalLimitPercent = Math.min(100, Math.round((yearlyRevenueEstimate / 6_000_000) * 100));
  const pdvLimitPercent = Math.min(100, Math.round((yearlyRevenueEstimate / 8_000_000) * 100));

  return {
    recordsCount: scopedRecords.length,
    docTypeCounts,
    totalRevenueNet: Math.round(totalRevenueNet * 100) / 100,
    totalRevenueGross: Math.round(totalRevenueGross * 100) / 100,
    totalDocsExpenseNet: Math.round(totalDocsExpenseNet * 100) / 100,
    totalDocsExpenseGross: Math.round(totalDocsExpenseGross * 100) / 100,
    payrollCostTotal,
    calculatedWorkersCount,
    totalWorkersCount: employees.length,
    totalExpenses,
    grossProfit,
    incomeTax,
    taxRateLabel,
    taxModel,
    netProfit,
    dividendTaxPreview,
    profitMarginPercent,
    inVatSystem,
    outputVat: Math.round(outputVat * 100) / 100,
    inputVat: Math.round(inputVat * 100) / 100,
    vatBalance,
    vatStatus,
    yearlyRevenueEstimate: Math.round(yearlyRevenueEstimate),
    pausalLimitPercent,
    pdvLimitPercent,
    kontoBreakdown: Object.values(kontoBreakdown).sort((a, b) => b.netAmount - a.netAmount),
  };
}

/**
 * Generiše CSV izvoz KPR / KIR / Bilansa uspeha za klijenta
 */
export function exportFinancialLedgerCsv(company, records, summary) {
  const headers = [
    "Datum",
    "Smer",
    "Tip Dokumenta",
    "Broj Dokumenta",
    "Konto",
    "Komitent / Partner",
    "PIB",
    "Valuta",
    "Osnovica",
    "PDV %",
    "Iznos PDV",
    "Ukupno Bruto",
    "Opis",
  ];

  const rows = records.map((r) => [
    r.date,
    r.direction === "prihod" ? "PRIHOD" : "RASHOD",
    r.docType,
    `"${(r.docNumber || "").replace(/"/g, '""')}"`,
    r.konto || "",
    `"${(r.partnerName || "").replace(/"/g, '""')}"`,
    r.partnerPib || "",
    r.currency || "RSD",
    Number(r.netAmount || 0).toFixed(2),
    Number(r.vatRate ?? 20),
    Number(r.vatAmount || 0).toFixed(2),
    Number(r.grossAmount || 0).toFixed(2),
    `"${(r.description || "").replace(/"/g, '""')}"`,
  ]);

  rows.push([]);
  rows.push(["REZIME BILANSA USPEHA", company?.naziv || "", `PIB: ${company?.pib || ""}`]);
  rows.push(["Ukupni Prihodi (RSD)", summary.totalRevenueNet.toFixed(2)]);
  rows.push(["Ukupni Rashodi (RSD)", summary.totalExpenses.toFixed(2)]);
  rows.push(["Trošak Zarada Bruto II (RSD)", summary.payrollCostTotal.toFixed(2)]);
  rows.push(["Bruto Dobit (RSD)", summary.grossProfit.toFixed(2)]);
  rows.push([summary.taxRateLabel, summary.incomeTax.toFixed(2)]);
  rows.push(["Neto Dobit (RSD)", summary.netProfit.toFixed(2)]);
  rows.push(["PDV Bilans (Izlazni - Ulazni)", summary.vatBalance.toFixed(2)]);

  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
