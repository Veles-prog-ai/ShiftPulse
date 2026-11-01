import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import {
  Building,
  Landmark,
  Download,
  Printer,
  QrCode,
  CheckCircle2,
  FileText,
  RefreshCw,
  ArrowRight,
  Copy,
  Check,
  CreditCard,
} from "lucide-react";
import {
  SERBIAN_BANKS_CATALOG,
  generatePayrollPaymentOrders,
  generateHalcomTxtExport,
  generateIso20022PainXml,
} from "../utils/bankPaymentOrders";
export const BankPaymentOrdersView = () => {
  const {
    activeCompany,
    companies,
    setActiveCompany,
    employees,
    calculatePayrollForCompany,
    setCurrentTab,
  } = useShift();
  const [selectedBank, setSelectedBank] = useState("intesa");
  const [selectedSlipForQr, setSelectedSlipForQr] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentPeriod] = useState(() => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const activeClient = useMemo(() => {
    if (activeCompany) return activeCompany;
    return companies[0];
  }, [activeCompany, companies]);
  const activeEmployees = useMemo(() => {
    if (!activeClient) return [];
    return employees.filter((e) => e.companyId === activeClient.id);
  }, [activeClient, employees]);
  const payrollBatch = useMemo(() => {
    if (!activeClient || activeEmployees.length === 0) return null;
    return generatePayrollPaymentOrders(
      activeClient,
      activeEmployees,
      currentPeriod,
    );
  }, [activeClient, activeEmployees, currentPeriod]);
  const handleRecalculate = async () => {
    if (!activeClient) return;
    setIsCalculating(true);
    await calculatePayrollForCompany(activeClient.id);
    setIsCalculating(false);
  };
  const handleDownloadHalcom = () => {
    if (!payrollBatch) return;
    const txt = generateHalcomTxtExport(payrollBatch);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Nalozi_Zarada_${activeClient.pib}_${currentPeriod}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleDownloadXml = () => {
    if (!payrollBatch) return;
    const xml = generateIso20022PainXml(payrollBatch);
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ISO20022_pain001_${activeClient.pib}_${currentPeriod}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handlePrintSlips = () => {
    window.print();
  };
  const handleCopyAccount = (acc, id) => {
    navigator.clipboard.writeText(acc);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2e3);
  };
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. HEADER & BANK CONNECTION STATUS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Povezivanje sa Bankama i Izrada Naloga za Isplatu Plata
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Automatski Virmani (Šifra 240 / 253)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatska izrada naloga za prenos plata i poreza/doprinosa na
                osnovu evidencije satnice i noćnih smena (+26%)
              </p>
            </div>
          </div>

          {/* Client & Bank selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Company Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <select
                value={activeClient?.id || ""}
                onChange={(e) =>
                  setActiveCompany(
                    companies.find((c) => c.id === e.target.value) || null,
                  )
                }
                className="bg-transparent font-bold text-slate-900 dark:text-white outline-none cursor-pointer max-w-[200px] truncate"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientType === "freelancer"
                      ? "\u{1F4BB} "
                      : "\u{1F3ED} "}
                    {c.naziv}
                  </option>
                ))}
              </select>
            </div>

            {/* Bank Selector */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                {SERBIAN_BANKS_CATALOG.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recalculate CTA */}
            <button
              onClick={handleRecalculate}
              disabled={isCalculating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-indigo-500 ${isCalculating ? "animate-spin" : ""}`}
              />
              <span>Ažuriraj obračun</span>
            </button>
          </div>
        </div>

        {/* Bank Connection Details Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">
              Platni račun poslodavca
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
              {activeClient?.iban || "160-0000000123456-78"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">
              Format elektronskog bankarstva
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
              Halcom MultiCash TXT + ISO 20022 XML
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">
              NBS IPS Instant plaćanje
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Podržan
              zvanični NBS QR kod
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">
              Poreski period
            </span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
              {currentPeriod} (Zarade meseca)
            </span>
          </div>
        </div>
      </div>

      {/* 2. FINANCIAL SUMMARY & EXPORT BUTTONS */}
      {payrollBatch && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-900/60">
            <div>
              <div className="text-xs uppercase font-mono text-indigo-300 font-bold">
                Zbirni finansijski nalog za isplatu
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                {activeClient.naziv}
              </h2>
              <p className="text-xs text-indigo-200/80 mt-1">
                Generisano na osnovu zbira redovnih sati, noćnog rada (+26%) i
                prekovremenih sati za {activeEmployees.length} zaposlenih
              </p>
            </div>

            {/* Export & Download CTAs */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadHalcom}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                title="Preuzmi Halcom TXT platni fajl za uvoz u e-banking"
              >
                <Download className="w-4 h-4" />
                <span>Preuzmi Halcom E-Bank (.txt)</span>
              </button>

              <button
                onClick={handleDownloadXml}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Preuzmi zvanični ISO 20022 XML format za savremene banke"
              >
                <FileText className="w-4 h-4" />
                <span>ISO 20022 XML</span>
              </button>

              <button
                onClick={handlePrintSlips}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Štampaj virmane za šalter ili arhivu"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Štampaj Virmane</span>
              </button>
            </div>
          </div>

          {/* Grand Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-indigo-200 text-xs block">
                Neto zarade za isplatu radnicima
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1 block">
                {payrollBatch.totalNetSalaries.toLocaleString("sr-RS")} RSD
              </span>
              <span className="text-[11px] text-indigo-300 font-mono">
                Šifra plaćanja: 240
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-indigo-200 text-xs block">
                Porezi i socijalni doprinosi (Trezor)
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1 block">
                {payrollBatch.totalTaxesAndContributions.toLocaleString(
                  "sr-RS",
                )}{" "}
                RSD
              </span>
              <span className="text-[11px] text-indigo-300 font-mono">
                Šifra plaćanja: 253 (BOP)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-indigo-200 text-xs block">
                Ukupan teret poslodavca (Bruto II)
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1 block">
                {payrollBatch.totalGrandPayroll.toLocaleString("sr-RS")} RSD
              </span>
              <span className="text-[11px] text-indigo-300 font-mono">
                Ukupna uplata banke
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-indigo-200 text-xs block">
                Broj pripremljenih virmana
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-sky-400 mt-1 block">
                {payrollBatch.ordersCount} naloga
              </span>
              <span className="text-[11px] text-indigo-300 font-mono">
                Spremni za realizaciju
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. VISUAL VIRMANI (PLATNI NALOZI - OBRAZAC ZA PRENOS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Nalozi za prenos (Virmani) pripremljeni za banku
            </h3>
            <p className="text-xs text-slate-500">
              Svaki nalog sadrži propisane elemente platnog prometa NBS:
              uplatilac, primalac, račun, iznos, šifra plaćanja i model/poziv na
              broj
            </p>
          </div>

          <button
            onClick={() => setCurrentTab("clients")}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Pogledaj dosijee firmi i radnika</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid of Slips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payrollBatch?.orders.map((order, idx) => {
            const isSalary = order.orderType === "net_salary";
            const isTax = order.orderType === "tax";
            const isCopied = copiedId === order.id;
            return (
              <div
                key={order.id}
                className={`rounded-2xl border p-4 transition-all shadow-xs space-y-3 relative overflow-hidden ${isSalary ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60"}`}
              >
                {/* Visual Top Header of Slip */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isSalary ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"}`}
                    >
                      {isSalary
                        ? "Isplata zarade zaposlenom"
                        : "Poreska obaveza / Trezor"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSlipForQr(order)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                      title="Prikaži zvanični NBS IPS QR kod za skeniranje telefonom"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>NBS QR</span>
                    </button>
                  </div>
                </div>

                {/* Virman Standard Fields Grid */}
                <div className="grid grid-cols-12 gap-3 text-xs">
                  {/* Left Column: Payer & Purpose */}
                  <div className="col-span-12 sm:col-span-7 space-y-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Uplatilac
                      </span>
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {order.payerName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {order.payerAccount}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Svrha uplate
                      </span>
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-[11px]">
                        {order.paymentDescription}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Primalac
                      </span>
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {order.recipientName}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Code, Currency, Amount, Account, Reference */}
                  <div className="col-span-12 sm:col-span-5 space-y-2 sm:border-l sm:border-slate-100 sm:dark:border-slate-800 sm:pl-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Šifra
                        </span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {order.purposeCode}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Valuta & Iznos
                        </span>
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {order.amount.toLocaleString("sr-RS")}{" "}
                          {order.currency}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Račun primaoca
                      </span>
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200">
                        <span className="truncate">
                          {order.recipientAccount}
                        </span>
                        <button
                          onClick={() =>
                            handleCopyAccount(order.recipientAccount, order.id)
                          }
                          className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                          title="Kopiraj račun"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Model i poziv na broj
                      </span>
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <strong>{order.model}</strong> {order.referenceNumber}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. NBS IPS QR CODE MODAL */}
      {selectedSlipForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                NBS IPS QR Kod za Instant Plaćanje
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Zvanični standard Narodne Banke Srbije za mobilno bankarstvo
                (Banca Intesa Mobi, Raiffeisen, OTP, UniCredit)
              </p>
            </div>

            {/* Generated QR representation / Visual Frame */}
            <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-inner flex flex-col items-center justify-center mx-auto w-52 h-52">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedSlipForQr.ipsQrString || "")}`}
                alt="NBS IPS QR Kod"
                className="w-44 h-44 object-contain"
              />
            </div>

            <div className="text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1 font-mono">
              <div className="text-slate-500 text-[10px]">
                Primalac:{" "}
                <strong className="text-slate-900 dark:text-white font-sans">
                  {selectedSlipForQr.recipientName}
                </strong>
              </div>
              <div className="text-slate-500 text-[10px]">
                Račun:{" "}
                <strong className="text-slate-900 dark:text-white">
                  {selectedSlipForQr.recipientAccount}
                </strong>
              </div>
              <div className="text-slate-500 text-[10px]">
                Iznos:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-sans">
                  {selectedSlipForQr.amount.toLocaleString("sr-RS")} RSD
                </strong>
              </div>
              <div className="text-slate-500 text-[10px]">
                Poziv:{" "}
                <strong>
                  {selectedSlipForQr.model} {selectedSlipForQr.referenceNumber}
                </strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedSlipForQr(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Zatvori
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
