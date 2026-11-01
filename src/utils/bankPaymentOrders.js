export const SERBIAN_TREASURY_ACCOUNTS = {
  porezNaZarade: "840-711111843-83",
  pioDoprinosi: "840-711121843-90",
  zdravstvoDoprinosi: "840-711131843-97",
  nezaposlenostDoprinosi: "840-711141843-07",
};
export const SERBIAN_BANKS_CATALOG = [
  {
    id: "intesa",
    name: "Banca Intesa a.d. Beograd",
    prefix: "160",
    swift: "DBDBRSBG",
  },
  {
    id: "otp",
    name: "OTP Banka Srbija a.d. Novi Sad",
    prefix: "325",
    swift: "OTPVRS22",
  },
  {
    id: "unicredit",
    name: "UniCredit Bank Srbija a.d.",
    prefix: "170",
    swift: "BACXRSBG",
  },
  {
    id: "nlb_komercijalna",
    name: "NLB Komercijalna Banka a.d.",
    prefix: "205",
    swift: "KOBBRSBG",
  },
  {
    id: "raiffeisen",
    name: "Raiffeisen Banka a.d. Beograd",
    prefix: "265",
    swift: "RZBSRSBG",
  },
  {
    id: "postanska",
    name: "Banka Po\u0161tanska \u0160tedionica a.d.",
    prefix: "200",
    swift: "PSBSRSBG",
  },
  {
    id: "aik",
    name: "AIK Banka a.d. Beograd",
    prefix: "105",
    swift: "AIKBRSBG",
  },
  {
    id: "erste",
    name: "Erste Bank a.d. Novi Sad",
    prefix: "340",
    swift: "ESBCRS22",
  },
  {
    id: "other",
    name: "Ostale poslovne banke u RS",
    prefix: "000",
    swift: "COMMRSBG",
  },
];
export const sanitizeBankAccount = (acc) => {
  if (!acc) return "160000000000000000";
  const digits = acc.replace(/[^0-9]/g, "");
  if (digits.length >= 18) return digits.substring(0, 18);
  const parts = acc.split("-");
  if (parts.length === 3) {
    const p1 = parts[0].padStart(3, "0");
    const p2 = parts[1].padStart(13, "0");
    const p3 = parts[2].padStart(2, "0");
    return `${p1}${p2}${p3}`;
  }
  return digits.padEnd(18, "0");
};
export const generateNbsIpsQrString = (
  recipientAccount,
  recipientName,
  amount,
  purposeCode,
  purposeDescription,
  referenceNumber,
) => {
  const cleanAcc = sanitizeBankAccount(recipientAccount);
  const formattedAmount = amount.toFixed(2);
  const cleanRecipient = recipientName
    .replace(/[\r\n|]/g, " ")
    .substring(0, 70)
    .trim();
  const cleanPurpose = purposeDescription
    .replace(/[\r\n|]/g, " ")
    .substring(0, 35)
    .trim();
  const cleanRef = referenceNumber
    .replace(/[^0-9A-Za-z-]/g, "")
    .substring(0, 23);
  return `K:PR|V:01|C:1|R:${cleanAcc}|N:${cleanRecipient}|I:RSD${formattedAmount}|SF:${purposeCode}|S:${cleanPurpose}|RO:97${cleanRef}`;
};
export const generateMockBop = (pib, periodMonthYear) => {
  const cleanPib = pib
    .replace(/[^0-9]/g, "")
    .padEnd(9, "0")
    .slice(0, 9);
  const now = /* @__PURE__ */ new Date();
  const ym =
    periodMonthYear ||
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
  return `011-${cleanPib}-${ym}-${randomSuffix}`;
};
export const generatePayrollPaymentOrders = (
  company,
  employees,
  periodMonthYear = `${/* @__PURE__ */ new Date().getFullYear()}-${String(/* @__PURE__ */ new Date().getMonth() + 1).padStart(2, "0")}`,
) => {
  const dateStr = /* @__PURE__ */ new Date().toISOString().split("T")[0];
  const bopNumber = generateMockBop(
    company.pib,
    periodMonthYear.replace("-", ""),
  );
  const payerAcc = company.iban || "160-0000000123456-78";
  const orders = [];
  let totalNetSalaries = 0;
  let totalTaxesAndContributions = 0;
  employees.forEach((emp, index) => {
    const obracun = emp.obracun;
    const netoAmount = obracun
      ? obracun.neto
      : Math.round(emp.satnica * 176 * 0.72);
    const empAcc =
      emp.bankRacun || `160-000000${String(index + 1).padStart(7, "0")}-99`;
    totalNetSalaries += netoAmount;
    const qrStr = generateNbsIpsQrString(
      empAcc,
      emp.ime,
      netoAmount,
      "240",
      `Zarada za ${periodMonthYear}`,
      emp.jmbg || bopNumber,
    );
    orders.push({
      id: `nalog-neto-${emp.id}-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.ime,
      payerName: company.naziv,
      payerAccount: payerAcc,
      purposeCode: "240",
      paymentDescription: `Isplata zarade za ${periodMonthYear} (${emp.ime})`,
      recipientName: emp.ime,
      recipientAccount: empAcc,
      model: "97",
      referenceNumber: emp.jmbg || bopNumber,
      amount: netoAmount,
      currency: "RSD",
      date: dateStr,
      status: "draft",
      ipsQrString: qrStr,
      orderType: "net_salary",
    });
  });
  let totalPorez = 0;
  let totalPio = 0;
  let totalZdravstvo = 0;
  let totalNezaposlenost = 0;
  employees.forEach((emp) => {
    if (emp.obracun) {
      totalPorez += emp.obracun.porez;
      totalPio +=
        emp.obracun.detaljiDoprinosa.pioRadnik +
        emp.obracun.detaljiDoprinosa.pioPoslodavac;
      totalZdravstvo +=
        emp.obracun.detaljiDoprinosa.zdravstvoRadnik +
        emp.obracun.detaljiDoprinosa.zdravstvoPoslodavac;
      totalNezaposlenost += emp.obracun.detaljiDoprinosa.nezaposlenostRadnik;
    } else {
      const bruto = emp.satnica * 176;
      totalPorez += bruto * 0.1;
      totalPio += bruto * 0.24;
      totalZdravstvo += bruto * 0.103;
      totalNezaposlenost += bruto * 75e-4;
    }
  });
  totalPorez = Math.round(totalPorez);
  totalPio = Math.round(totalPio);
  totalZdravstvo = Math.round(totalZdravstvo);
  totalNezaposlenost = Math.round(totalNezaposlenost);
  totalTaxesAndContributions =
    totalPorez + totalPio + totalZdravstvo + totalNezaposlenost;
  if (totalPorez > 0) {
    orders.push({
      id: `nalog-porez-${Date.now()}`,
      payerName: company.naziv,
      payerAccount: payerAcc,
      purposeCode: "253",
      paymentDescription: `Porez na zarade za ${periodMonthYear} po PPP-PD`,
      recipientName: "Poreska uprava RS - Porez na zarade",
      recipientAccount: SERBIAN_TREASURY_ACCOUNTS.porezNaZarade,
      model: "97",
      referenceNumber: bopNumber,
      amount: totalPorez,
      currency: "RSD",
      date: dateStr,
      status: "draft",
      ipsQrString: generateNbsIpsQrString(
        SERBIAN_TREASURY_ACCOUNTS.porezNaZarade,
        "Poreska uprava RS - Porez na zarade",
        totalPorez,
        "253",
        `Porez na zarade ${periodMonthYear}`,
        bopNumber,
      ),
      orderType: "tax",
    });
  }
  if (totalPio > 0) {
    orders.push({
      id: `nalog-pio-${Date.now()}`,
      payerName: company.naziv,
      payerAccount: payerAcc,
      purposeCode: "253",
      paymentDescription: `Doprinosi za PIO za ${periodMonthYear} po PPP-PD`,
      recipientName: "Poreska uprava RS - Doprinosi za PIO",
      recipientAccount: SERBIAN_TREASURY_ACCOUNTS.pioDoprinosi,
      model: "97",
      referenceNumber: bopNumber,
      amount: totalPio,
      currency: "RSD",
      date: dateStr,
      status: "draft",
      ipsQrString: generateNbsIpsQrString(
        SERBIAN_TREASURY_ACCOUNTS.pioDoprinosi,
        "Poreska uprava RS - Doprinosi za PIO",
        totalPio,
        "253",
        `Doprinosi za PIO ${periodMonthYear}`,
        bopNumber,
      ),
      orderType: "pio",
    });
  }
  if (totalZdravstvo > 0) {
    orders.push({
      id: `nalog-zdravstvo-${Date.now()}`,
      payerName: company.naziv,
      payerAccount: payerAcc,
      purposeCode: "253",
      paymentDescription: `Doprinosi za zdravstvo za ${periodMonthYear} po PPP-PD`,
      recipientName: "Poreska uprava RS - Doprinosi za zdravstvo",
      recipientAccount: SERBIAN_TREASURY_ACCOUNTS.zdravstvoDoprinosi,
      model: "97",
      referenceNumber: bopNumber,
      amount: totalZdravstvo,
      currency: "RSD",
      date: dateStr,
      status: "draft",
      ipsQrString: generateNbsIpsQrString(
        SERBIAN_TREASURY_ACCOUNTS.zdravstvoDoprinosi,
        "Poreska uprava RS - Doprinosi za zdravstvo",
        totalZdravstvo,
        "253",
        `Doprinosi za zdravstvo ${periodMonthYear}`,
        bopNumber,
      ),
      orderType: "health",
    });
  }
  if (totalNezaposlenost > 0) {
    orders.push({
      id: `nalog-nezaposlenost-${Date.now()}`,
      payerName: company.naziv,
      payerAccount: payerAcc,
      purposeCode: "253",
      paymentDescription: `Doprinosi za nezaposlenost za ${periodMonthYear} po PPP-PD`,
      recipientName: "Poreska uprava RS - Nezaposlenost",
      recipientAccount: SERBIAN_TREASURY_ACCOUNTS.nezaposlenostDoprinosi,
      model: "97",
      referenceNumber: bopNumber,
      amount: totalNezaposlenost,
      currency: "RSD",
      date: dateStr,
      status: "draft",
      ipsQrString: generateNbsIpsQrString(
        SERBIAN_TREASURY_ACCOUNTS.nezaposlenostDoprinosi,
        "Poreska uprava RS - Nezaposlenost",
        totalNezaposlenost,
        "253",
        `Nezaposlenost ${periodMonthYear}`,
        bopNumber,
      ),
      orderType: "unemployment",
    });
  }
  return {
    id: `batch-${company.id}-${Date.now()}`,
    companyId: company.id,
    companyName: company.naziv,
    pib: company.pib,
    payerAccount: payerAcc,
    periodMonthYear,
    totalNetSalaries,
    totalTaxesAndContributions,
    totalGrandPayroll: totalNetSalaries + totalTaxesAndContributions,
    ordersCount: orders.length,
    orders,
    generatedAt: /* @__PURE__ */ new Date().toISOString(),
    bankFormat: "halcom_txt",
  };
};
export const generateHalcomTxtExport = (batch) => {
  const lines = [];
  const cleanPayerAcc = sanitizeBankAccount(batch.payerAccount);
  batch.orders.forEach((order) => {
    const cleanRecAcc = sanitizeBankAccount(order.recipientAccount);
    const amountInParas = Math.round(order.amount * 100);
    const amountStr = String(amountInParas).padStart(15, "0");
    const payerNameTrunc = order.payerName.padEnd(35, " ").substring(0, 35);
    const recNameTrunc = order.recipientName.padEnd(35, " ").substring(0, 35);
    const descTrunc = order.paymentDescription.padEnd(35, " ").substring(0, 35);
    const refTrunc = order.referenceNumber.padEnd(20, " ").substring(0, 20);
    const line = `01${cleanPayerAcc}${cleanRecAcc}${amountStr}${order.purposeCode}${payerNameTrunc}${recNameTrunc}${descTrunc}97${refTrunc}`;
    lines.push(line);
  });
  return lines.join("\r\n");
};
export const generateIso20022PainXml = (batch) => {
  const msgId = `MSG-${batch.pib}-${Date.now()}`;
  const creationDate = /* @__PURE__ */ new Date().toISOString();
  const cleanPayerAcc = sanitizeBankAccount(batch.payerAccount);
  const txElements = batch.orders
    .map(
      (o, idx) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>E2E-${o.id}-${idx + 1}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${o.currency}">${o.amount.toFixed(2)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${escapeXml(o.recipientName)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <Othr>
              <Id>${sanitizeBankAccount(o.recipientAccount)}</Id>
            </Othr>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(o.paymentDescription)} (Poziv: 97 ${o.referenceNumber})</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creationDate}</CreDtTm>
      <NbOfTxs>${batch.orders.length}</NbOfTxs>
      <CtrlSum>${batch.totalGrandPayroll.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(batch.companyName)}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${batch.pib}</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-${batch.companyId}-${Date.now()}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${batch.orders.length}</NbOfTxs>
      <CtrlSum>${batch.totalGrandPayroll.toFixed(2)}</CtrlSum>
      <Dbtr>
        <Nm>${escapeXml(batch.companyName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>${cleanPayerAcc}</Id>
          </Othr>
        </Id>
      </DbtrAcct>
      ${txElements}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
};
const escapeXml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};
