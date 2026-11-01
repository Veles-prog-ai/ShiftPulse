import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import {
  Building,
  Users,
  FileCode,
  Download,
  Printer,
  Plus,
  Trash2,
  Edit3,
  Search,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  FileSpreadsheet,
  Sparkles,
  Eye,
  X,
  RefreshCw,
  Landmark,
  Palmtree,
  Bandage,
} from "lucide-react";
import { DocumentScanner } from "./DocumentScanner";
import { calculateSerbianWorkerPayroll } from "../utils/payrollCalculator";
import { WorkerLeaveModal } from "./WorkerLeaveModal";
export const LedgerDashboardView = () => {
  const {
    companies,
    activeCompany,
    setActiveCompany,
    addCompany,
    updateCompany,
    deleteCompany,
    employees,
    setEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    calculatePayrollForCompany,
    openLeaveModal,
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    leaveModalInitialWorkerId,
    leaveModalInitialDate,
    addWorkerLeave,
    setCurrentTab,
  } = useShift();
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [printTargetRadnik, setPrintTargetRadnik] = useState(null);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [generatedXmlString, setGeneratedXmlString] = useState("");
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [companyForm, setCompanyForm] = useState({
    naziv: "",
    pib: "",
    maticniBroj: "",
    adresa: "",
    opstina_kod: "011",
    iban: "",
    delatnost: "6920 - Ra\u010Dunovodstveni i revizorski poslovi",
    kontaktEmail: "",
  });
  const [empForm, setEmpForm] = useState({
    ime: "",
    jmbg: "",
    pozicija: "",
    brutoBaza: 9e4,
    satnica: 520,
    prekovremeniSati: 0,
    nocniSati: 0,
    praznikSati: 0,
    bankRacun: "",
    opstinaPrebivalista: "011",
  });
  const currentEmployees = useMemo(() => {
    if (!activeCompany) return [];
    return employees.filter((e) => e.companyId === activeCompany.id);
  }, [employees, activeCompany]);
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return currentEmployees;
    const term = searchTerm.toLowerCase();
    return currentEmployees.filter(
      (e) =>
        e.ime.toLowerCase().includes(term) ||
        e.jmbg.includes(term) ||
        e.pozicija.toLowerCase().includes(term),
    );
  }, [currentEmployees, searchTerm]);
  const companyMetrics = useMemo(() => {
    let ukupnoBrutoI = 0;
    let ukupnoNeto = 0;
    let ukupnoPorez = 0;
    let ukupnoDoprinosiRadnik = 0;
    let ukupnoDoprinosiPoslodavac = 0;
    let ukupnoBrutoII = 0;
    let obracunatoBroj = 0;
    currentEmployees.forEach((emp) => {
      if (emp.obracun) {
        ukupnoBrutoI += emp.obracun.bruto;
        ukupnoNeto += emp.obracun.neto;
        ukupnoPorez += emp.obracun.porez;
        ukupnoDoprinosiRadnik += emp.obracun.doprinosiRadnik;
        ukupnoDoprinosiPoslodavac += emp.obracun.doprinosiFirma;
        ukupnoBrutoII += emp.obracun.ukupnoZaIsplatuFirme;
        obracunatoBroj++;
      } else {
        ukupnoBrutoI += emp.brutoBaza;
      }
    });
    return {
      ukupnoBrutoI,
      ukupnoNeto,
      ukupnoPorez,
      ukupnoDoprinosiRadnik,
      ukupnoDoprinosiPoslodavac,
      ukupnoBrutoII,
      obracunatoBroj,
      ukupnoRadnika: currentEmployees.length,
    };
  }, [currentEmployees]);
  const handleRunBulkPayroll = async () => {
    if (!activeCompany) return;
    setLoadingCalculation(true);
    await calculatePayrollForCompany(activeCompany.id);
    setLoadingCalculation(false);
  };
  const handleCalculateSingle = async (employeeId) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return;
    try {
      const statutory = calculateSerbianWorkerPayroll(target);
      updateEmployee(target.id, {
        obracun: statutory,
        kompletan: true,
      });

      await fetch("/api/ledger/calculate-payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: target.id,
          brutoBaza: target.brutoBaza,
          satnica: target.satnica,
          regularHours: statutory.hours.regularHours,
          vacationHours: statutory.hours.vacationHours,
          sickHours65: statutory.hours.sick65Hours,
          sickHours100: statutory.hours.sick100Hours,
          prekovremeniSati: statutory.hours.overtimeHours || target.prekovremeniSati,
          nocniSati: statutory.hours.nightHours || target.nocniSati,
          praznikSati: target.praznikSati,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };
  const handleDownloadXml = async () => {
    if (!activeCompany) return;
    try {
      const response = await fetch("/api/ledger/generate-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firma: activeCompany,
          radnici: currentEmployees,
          periodObracuna: /* @__PURE__ */ new Date().toISOString().slice(0, 7),
        }),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PPP-PD_${activeCompany.pib}_${/* @__PURE__ */ new Date().toISOString().slice(0, 7)}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Gre\u0161ka pri preuzimanju XML-a:", err);
    }
  };
  const handlePreviewXml = async () => {
    if (!activeCompany) return;
    try {
      const response = await fetch("/api/ledger/generate-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firma: activeCompany,
          radnici: currentEmployees,
          periodObracuna: /* @__PURE__ */ new Date().toISOString().slice(0, 7),
        }),
      });
      const xmlText = await response.text();
      setGeneratedXmlString(xmlText);
      setIsXmlModalOpen(true);
    } catch (err) {
      console.error("Gre\u0161ka pri generisanju XML pregleda:", err);
    }
  };
  const handlePrintPayslip = (radnik) => {
    setPrintTargetRadnik(radnik);
    setTimeout(() => {
      window.print();
    }, 150);
  };
  const handleCreateCompany = (e) => {
    e.preventDefault();
    if (!companyForm.naziv.trim() || !companyForm.pib.trim()) return;
    addCompany({
      naziv: companyForm.naziv,
      pib: companyForm.pib,
      maticniBroj: companyForm.maticniBroj,
      adresa: companyForm.adresa,
      opstina_kod: companyForm.opstina_kod,
      radniciBroj: 0,
      iban: companyForm.iban,
      delatnost: companyForm.delatnost,
      kontaktEmail: companyForm.kontaktEmail,
    });
    setIsAddCompanyOpen(false);
    setCompanyForm({
      naziv: "",
      pib: "",
      maticniBroj: "",
      adresa: "",
      opstina_kod: "011",
      iban: "",
      delatnost: "6920 - Ra\u010Dunovodstveni poslovi",
      kontaktEmail: "",
    });
  };
  const handleCreateEmployee = (e) => {
    e.preventDefault();
    if (!activeCompany || !empForm.ime.trim() || !empForm.jmbg.trim()) return;
    if (editingEmp) {
      updateEmployee(editingEmp.id, {
        ime: empForm.ime,
        jmbg: empForm.jmbg,
        pozicija: empForm.pozicija,
        brutoBaza: Number(empForm.brutoBaza),
        satnica: Number(empForm.satnica),
        prekovremeniSati: Number(empForm.prekovremeniSati),
        nocniSati: Number(empForm.nocniSati),
        praznikSati: Number(empForm.praznikSati),
        bankRacun: empForm.bankRacun,
        opstinaPrebivalista: empForm.opstinaPrebivalista,
      });
      setEditingEmp(null);
    } else {
      addEmployee({
        companyId: activeCompany.id,
        ime: empForm.ime,
        jmbg: empForm.jmbg,
        pozicija: empForm.pozicija,
        brutoBaza: Number(empForm.brutoBaza),
        satnica: Number(empForm.satnica),
        prekovremeniSati: Number(empForm.prekovremeniSati),
        nocniSati: Number(empForm.nocniSati),
        praznikSati: Number(empForm.praznikSati),
        bankRacun: empForm.bankRacun || "265-0000000000000-00",
        opstinaPrebivalista:
          empForm.opstinaPrebivalista || activeCompany.opstina_kod,
        kompletan: false,
      });
    }
    setIsAddEmployeeOpen(false);
    setEmpForm({
      ime: "",
      jmbg: "",
      pozicija: "",
      brutoBaza: 9e4,
      satnica: 520,
      prekovremeniSati: 0,
      nocniSati: 0,
      praznikSati: 0,
      bankRacun: "",
      opstinaPrebivalista: "011",
    });
  };
  const handleStartEdit = (emp) => {
    setEditingEmp(emp);
    setEmpForm({
      ime: emp.ime,
      jmbg: emp.jmbg,
      pozicija: emp.pozicija,
      brutoBaza: emp.brutoBaza,
      satnica: emp.satnica,
      prekovremeniSati: emp.prekovremeniSati,
      nocniSati: emp.nocniSati,
      praznikSati: emp.praznikSati,
      bankRacun: emp.bankRacun || "",
      opstinaPrebivalista: emp.opstinaPrebivalista || "011",
    });
    setIsAddEmployeeOpen(true);
  };
  const handleExportCsv = () => {
    if (!activeCompany || currentEmployees.length === 0) return;
    const headers = [
      "Ime i prezime",
      "JMBG",
      "Pozicija",
      "Bruto I (RSD)",
      "Neto Isplata (RSD)",
      "Porez 10%",
      "Doprinosi Radnik",
      "Doprinosi Firma",
      "Ukupan Tro\u0161ak Bruto II",
    ];
    const rows = currentEmployees.map((e) => [
      `"${e.ime}"`,
      `"${e.jmbg}"`,
      `"${e.pozicija}"`,
      e.obracun ? Math.round(e.obracun.bruto) : e.brutoBaza,
      e.obracun ? Math.round(e.obracun.neto) : 0,
      e.obracun ? Math.round(e.obracun.porez) : 0,
      e.obracun ? Math.round(e.obracun.doprinosiRadnik) : 0,
      e.obracun ? Math.round(e.obracun.doprinosiFirma) : 0,
      e.obracun ? Math.round(e.obracun.ukupnoZaIsplatuFirme) : 0,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Obracun_Zarada_${activeCompany.pib}_${/* @__PURE__ */ new Date().toISOString().slice(0, 7)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* ======================================================== */}
      {/* SCREEN INTERFACE (Hidden during window.print A4 output)   */}
      {/* ======================================================== */}
      <div className="space-y-6 no-print">
        {/* 1. DESKTOP WORKSTATION HEADER: COMPANY SELECTOR & CLIENT MANAGEMENT */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title & Badge */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0 ring-1 ring-white/20">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    ShiftPulse Ledger Pro
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    B2B Knjigovodstvo & ePorezi v2.4
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Profesionalni obračunski centar za zarade, poreze i doprinose
                  (Zakon o radu & Poreska uprava RS)
                </p>
              </div>
            </div>

            {/* Company Switcher & Add Client Action */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[260px] flex-1 sm:flex-none">
                <select
                  value={activeCompany?.id || ""}
                  onChange={(e) =>
                    setActiveCompany(
                      companies.find((c) => c.id === e.target.value) || null,
                    )
                  }
                  className="w-full text-xs font-bold py-2.5 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-xs appearance-none cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.naziv} (PIB: {c.pib})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>

              <button
                onClick={() => setIsAddCompanyOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                title="Dodaj novu firmu / klijenta u bazu"
              >
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Nova Firma</span>
              </button>

              {activeCompany && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Da li ste sigurni da \u017Eelite da uklonite firmu "${activeCompany.naziv}"?`,
                      )
                    ) {
                      deleteCompany(activeCompany.id);
                    }
                  }}
                  className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors"
                  title="Obriši firmu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Client Details Bar */}
          {activeCompany && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="text-slate-400">PIB:</span>
                <strong className="text-slate-900 dark:text-white font-bold">
                  {activeCompany.pib}
                </strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="text-slate-400">MB:</span>
                <strong className="text-slate-900 dark:text-white font-bold">
                  {activeCompany.maticniBroj}
                </strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
                <span className="text-slate-400">Opština:</span>
                <strong className="text-slate-900 dark:text-white font-bold">
                  {activeCompany.opstina_kod}
                </strong>
                <span className="text-slate-400 truncate hidden md:inline">
                  ({activeCompany.adresa})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="text-slate-400">Zaposleni:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {currentEmployees.length} radnika
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. EXECUTIVE KPI CARDS: FINANCIAL ACCUMULATOR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Total Gross Earnings (Bruto I) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Fond Bruto I Zarada</span>
              <DollarSign className="w-4 h-4 text-indigo-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              RSD {Math.round(companyMetrics.ukupnoBrutoI).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Osnovica pre odbitaka i poreza
            </div>
          </div>

          {/* Card 2: Net Payout (Neto isplata na račun) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm relative overflow-hidden group bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>Neto Isplata Radnicima</span>
              <TrendingUp className="w-4 h-4 text-emerald-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              RSD {Math.round(companyMetrics.ukupnoNeto).toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              {companyMetrics.obracunatoBroj} od {companyMetrics.ukupnoRadnika}{" "}
              obračunato
            </div>
          </div>

          {/* Card 3: Tax & Contributions (Fiskalni odbici) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center justify-between">
              <span>Porez & Doprinosi Radnik</span>
              <ShieldCheck className="w-4 h-4 text-rose-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              RSD{" "}
              {Math.round(
                companyMetrics.ukupnoPorez +
                  companyMetrics.ukupnoDoprinosiRadnik,
              ).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Porez 10% + PIO/ZDR/NEZ (19.9%)
            </div>
          </div>

          {/* Card 4: Total Employer Cost (Bruto II / Super-bruto) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm relative overflow-hidden group bg-gradient-to-b from-white to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>Ukupan Trošak Firme (Bruto II)</span>
              <Building className="w-4 h-4 text-indigo-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
              RSD {Math.round(companyMetrics.ukupnoBrutoII).toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">
              Uključuje doprinose firme (15.15%)
            </div>
          </div>
        </div>

        {/* 3. DESKTOP ACTION BAR & WORKFLOW BUTTONS */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pretraži radnika po imenu, JMBG ili poziciji..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Button Strip */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Run Bulk Payroll */}
            <button
              onClick={handleRunBulkPayroll}
              disabled={loadingCalculation || currentEmployees.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingCalculation ? "animate-spin" : ""}`}
              />
              <span>
                {loadingCalculation
                  ? "Obra\u010Dunavanje..."
                  : "\u26A1 Pokreni masovni obra\u010Dun"}
              </span>
            </button>

            {/* ePorezi XML Download */}
            <button
              onClick={handleDownloadXml}
              disabled={companyMetrics.obracunatoBroj === 0}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
              title="Preuzmi validiran XML fajl za uvoz u ePorezi (PPP-PD prijava)"
            >
              <FileCode className="w-4 h-4 text-amber-600" />
              <span>PPP-PD XML</span>
            </button>

            {/* Bank Payment Orders & Virmani */}
            <button
              onClick={() => setCurrentTab("bank-orders")}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Automatska izrada naloga za banku i virmana na osnovu obračunate satnice"
            >
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>🏦 Nalozi za Banku (Virmani)</span>
            </button>

            {/* XML Preview */}
            <button
              onClick={handlePreviewXml}
              disabled={companyMetrics.obracunatoBroj === 0}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
              title="Pregledaj strukturu XML koda"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pregled XML</span>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportCsv}
              disabled={currentEmployees.length === 0}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
              title="Izvoz u Excel kompatibilan CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel CSV</span>
            </button>

            {/* Add Employee */}
            <button
              onClick={() => {
                setEditingEmp(null);
                setEmpForm({
                  ime: "",
                  jmbg: "",
                  pozicija: "",
                  brutoBaza: 9e4,
                  satnica: 520,
                  prekovremeniSati: 0,
                  nocniSati: 0,
                  praznikSati: 0,
                  bankRacun: "",
                  opstinaPrebivalista: activeCompany?.opstina_kod || "011",
                });
                setIsAddEmployeeOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novi Radnik</span>
            </button>

            {/* AI Document Scan Batch */}
            <button
              onClick={() => setIsAiScanOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
              title="Skeniraj papirni ugovor ili platnu listu kamerom ili PDF-om"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Ugovor</span>
            </button>
          </div>
        </div>

        {/* 4. MAIN BOOKKEEPING LEDGER TABLE (RIGOROUS & SCANNABLE) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono min-w-[1100px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 py-3.5">
                <tr>
                  <th className="p-3.5">Zaposleni / JMBG</th>
                  <th className="p-3.5">Pozicija & Račun</th>
                  <th className="p-3.5 text-center">Smenski Parametri</th>
                  <th className="p-3.5 text-right">Osnovni Bruto</th>
                  <th className="p-3.5 text-right font-sans font-bold text-emerald-600">
                    Neto Isplata
                  </th>
                  <th className="p-3.5 text-right">Porez (10%)</th>
                  <th className="p-3.5 text-right">Doprinosi Radnik (19.9%)</th>
                  <th className="p-3.5 text-right">Doprinosi Firma (15.15%)</th>
                  <th className="p-3.5 text-right font-bold text-indigo-600">
                    Ukupan Trošak (Bruto II)
                  </th>
                  <th className="p-3.5 text-center">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-slate-400 font-sans"
                    >
                      Nema pronađenih radnika za odabranu firmu. Kliknite na "+
                      Novi Radnik" ili "AI Ugovor" za masovni unos.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((r) => {
                    const hasCalc = !!r.obracun;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Employee Name & JMBG */}
                        <td className="p-3.5 font-sans">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${hasCalc ? "bg-emerald-500" : "bg-amber-400"}`}
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {r.ime}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono tracking-tight">
                                {r.jmbg}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Bank Account */}
                        <td className="p-3.5 font-sans">
                          <div className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[160px]">
                            {r.pozicija}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                            {r.bankRacun || "Nije unet ra\u010Dun"}
                          </div>
                        </td>

                        {/* Hours breakdown: OT, Night, Holiday, GO, Sick Leave */}
                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-mono">
                              <span title="Satnica">{r.satnica} RSD/h</span>
                              <span className="text-slate-300 dark:text-slate-600">
                                |
                              </span>
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                title="Prekovremeni sati (+26%)"
                              >
                                OT:{r.obracun?.hours?.overtimeHours ?? r.prekovremeniSati}h
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">
                                |
                              </span>
                              <span
                                className="text-indigo-600 dark:text-indigo-400"
                                title="Noćni rad (+26%)"
                              >
                                Noć:{r.obracun?.hours?.nightHours ?? r.nocniSati}h
                              </span>
                              {r.praznikSati > 0 && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">
                                    |
                                  </span>
                                  <span
                                    className="text-rose-600"
                                    title="Praznik (+110%)"
                                  >
                                    Praz:{r.praznikSati}h
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Vacation & Sick Leave badges if recorded */}
                            {(r.obracun?.hours?.vacationHours > 0 || (r.obracun?.hours?.sick65Hours || 0) + (r.obracun?.hours?.sick100Hours || 0) > 0) && (
                              <div className="flex items-center gap-1.5 text-[9px] font-bold">
                                {r.obracun?.hours?.vacationHours > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                    <Palmtree className="w-2.5 h-2.5 text-amber-600" />
                                    GO: {r.obracun.hours.vacationHours}h
                                  </span>
                                )}
                                {((r.obracun?.hours?.sick65Hours || 0) + (r.obracun?.hours?.sick100Hours || 0) > 0) && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                                    <Bandage className="w-2.5 h-2.5 text-rose-600" />
                                    Bolovanje: {(r.obracun?.hours?.sick65Hours || 0) + (r.obracun?.hours?.sick100Hours || 0)}h
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Base Gross */}
                        <td className="p-3.5 text-right font-medium text-slate-900 dark:text-slate-200">
                          RSD {r.brutoBaza.toLocaleString()}
                        </td>

                        {/* Net Pay */}
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {hasCalc ? (
                            `RSD ${Math.round(r.obracun.neto).toLocaleString()}`
                          ) : (
                            <span className="text-xs text-amber-500 font-sans font-semibold">
                              Čeka obračun
                            </span>
                          )}
                        </td>

                        {/* Wage Tax 10% */}
                        <td className="p-3.5 text-right text-rose-500">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.porez).toLocaleString()}`
                            : "---"}
                        </td>

                        {/* Employee Contributions */}
                        <td className="p-3.5 text-right text-amber-600 dark:text-amber-400">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.doprinosiRadnik).toLocaleString()}`
                            : "---"}
                        </td>

                        {/* Employer Contributions */}
                        <td className="p-3.5 text-right text-blue-500">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.doprinosiFirma).toLocaleString()}`
                            : "---"}
                        </td>

                        {/* Total Cost (Bruto II) */}
                        <td className="p-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.ukupnoZaIsplatuFirme).toLocaleString()}`
                            : "---"}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Leave & Vacation Modal Trigger */}
                            <button
                              onClick={() => openLeaveModal(r.id)}
                              className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                              title="Unesi bolovanje ili godišnji odmor radniku"
                            >
                              <Palmtree className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            {/* Calculate Button */}
                            <button
                              onClick={() => handleCalculateSingle(r.id)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Obračunaj ovog radnika"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Payslip */}
                            <button
                              onClick={() => handlePrintPayslip(r)}
                              disabled={!hasCalc}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-30 cursor-pointer"
                              title="Štampaj službeni obračunski listić zarade (A4 / PDF)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleStartEdit(r)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title="Izmeni parametre radnika"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => {
                                if (confirm(`Ukloniti radnika ${r.ime}?`))
                                  deleteEmployee(r.id);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Obriši"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. OFFICIAL PRINTABLE A4 PAYSLIP TEMPLATE                 */}
      {/* (Rendered exclusively during window.print)               */}
      {/* ======================================================== */}
      {printTargetRadnik && activeCompany && (
        <div className="print-only-container text-black bg-white p-8 space-y-6 font-sans text-xs">
          {/* Header Poslodavac */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <h1 className="text-base font-black uppercase tracking-tight">
                {activeCompany.naziv}
              </h1>
              <p className="text-[11px] text-gray-700">
                {activeCompany.adresa}
              </p>
              <p className="text-[11px] font-mono mt-0.5">
                PIB: <strong>{activeCompany.pib}</strong> | Matični broj:{" "}
                <strong>{activeCompany.maticniBroj}</strong>
              </p>
              {activeCompany.iban && (
                <p className="text-[10px] font-mono text-gray-600">
                  Tekući račun: {activeCompany.iban}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                Obrazac OZ-1 (PURS)
              </span>
              <div className="text-sm font-black text-black uppercase mt-1">
                Obračunski list zarade
              </div>
              <div className="text-[11px] font-mono">
                Period:{" "}
                <strong>
                  {/* @__PURE__ */ new Date()
                    .toLocaleString("sr-RS", { month: "long", year: "numeric" })
                    .toUpperCase()}
                </strong>
              </div>
              <div className="text-[10px] text-gray-500">
                Datum obračuna:{" "}
                {/* @__PURE__ */ new Date().toLocaleDateString("sr-RS")}
              </div>
            </div>
          </div>

          {/* Podaci o zaposlenom */}
          <div className="bg-gray-50 border border-gray-300 p-3.5 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">
                Zaposleni (Primalac):
              </div>
              <div className="text-sm font-black text-black">
                {printTargetRadnik.ime}
              </div>
              <div className="text-[11px] text-gray-700">
                {printTargetRadnik.pozicija}
              </div>
              <div className="text-[10px] font-mono mt-0.5 text-gray-600">
                Tekući račun: {printTargetRadnik.bankRacun || "Po vi\u0111enju"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">
                Identifikacione oznake:
              </div>
              <div className="text-[11px] font-mono">
                JMBG: <strong>{printTargetRadnik.jmbg}</strong>
              </div>
              <div className="text-[11px] font-mono">
                Šifra opštine:{" "}
                <strong>
                  {printTargetRadnik.opstinaPrebivalista ||
                    activeCompany.opstina_kod}
                </strong>
              </div>
              <div className="text-[11px] font-mono">
                Šifra vrste prihoda (SVP): <strong>101000</strong> (Zarada)
              </div>
            </div>
          </div>

          {/* Finansijska specifikacija - 1. BRUTO */}
          <div className="space-y-1">
            <div className="font-bold text-black border-b border-gray-400 pb-1 uppercase tracking-wide">
              1. Specifikacija bruto zarade i uvećanja (Zakon o radu RS)
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>Osnovna ugovorena zarada (bruto):</span>
              <span className="text-right font-mono">
                RSD {printTargetRadnik.brutoBaza.toLocaleString()}.00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>
                Uvećanje za prekovremeni rad (+26% /{" "}
                {printTargetRadnik.prekovremeniSati}h):
              </span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.uvecanja.prekovremeniRad,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>
                Uvećanje za noćni rad (+26% / {printTargetRadnik.nocniSati}h):
              </span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.uvecanja.nocniRad,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            {printTargetRadnik.praznikSati > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200">
                <span>
                  Uvećanje za rad na državni praznik (+110% /{" "}
                  {printTargetRadnik.praznikSati}h):
                </span>
                <span className="text-right font-mono">
                  RSD{" "}
                  {printTargetRadnik.obracun
                    ? Math.round(
                        printTargetRadnik.obracun.uvecanja.praznicniRad,
                      ).toLocaleString()
                    : "0"}
                  .00
                </span>
              </div>
            )}
            {printTargetRadnik.obracun?.naknade?.godisnjiOdmor > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-amber-900 bg-amber-50/50">
                <span>
                  Naknada zarade za godišnji odmor (čl. 114 ZOR - 100% /{" "}
                  {printTargetRadnik.obracun.hours?.vacationHours || 0}h):
                </span>
                <span className="text-right font-mono font-bold">
                  RSD{" "}
                  {Math.round(
                    printTargetRadnik.obracun.naknade.godisnjiOdmor,
                  ).toLocaleString()}
                  .00
                </span>
              </div>
            )}
            {printTargetRadnik.obracun?.naknade?.bolovanje65 > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-rose-900 bg-rose-50/50">
                <span>
                  Naknada zarade za bolovanje do 30 dana (čl. 115 ZOR - 65% /{" "}
                  {printTargetRadnik.obracun.hours?.sick65Hours || 0}h):
                </span>
                <span className="text-right font-mono font-bold">
                  RSD{" "}
                  {Math.round(
                    printTargetRadnik.obracun.naknade.bolovanje65,
                  ).toLocaleString()}
                  .00
                </span>
              </div>
            )}
            {printTargetRadnik.obracun?.naknade?.bolovanje100 > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-rose-900 bg-rose-50/50">
                <span>
                  Naknada zarade za bolovanje - povreda na radu (čl. 115 ZOR - 100% /{" "}
                  {printTargetRadnik.obracun.hours?.sick100Hours || 0}h):
                </span>
                <span className="text-right font-mono font-bold">
                  RSD{" "}
                  {Math.round(
                    printTargetRadnik.obracun.naknade.bolovanje100,
                  ).toLocaleString()}
                  .00
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 py-1.5 font-bold bg-gray-100 px-2 rounded">
              <span>UKUPNO OSTVARENA BRUTO ZARADA (BRUTO I):</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(printTargetRadnik.obracun.bruto).toLocaleString()
                  : printTargetRadnik.brutoBaza.toLocaleString()}
                .00
              </span>
            </div>
          </div>

          {/* 2. ODBICI NA TERET ZAPOSLENOG */}
          <div className="space-y-1">
            <div className="font-bold text-black border-b border-gray-400 pb-1 uppercase tracking-wide">
              2. Porez i doprinosi na teret zaposlenog
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-gray-700">
              <span>Zakonski neoporezivi iznos osnovice (odbijeno):</span>
              <span className="text-right font-mono">- RSD 25,000.00</span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>Porez na zarade (10% na oporezivu osnovicu):</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(printTargetRadnik.obracun.porez).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>
                Doprinos za penzijsko i invalidsko osiguranje (PIO 14.00%):
              </span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa.pioRadnik,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>Doprinos za zdravstveno osiguranje (5.15%):</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa
                        .zdravstvoRadnik,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>Doprinos za osiguranje od nezaposlenosti (0.75%):</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa
                        .nezaposlenostRadnik,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1.5 font-bold bg-gray-100 px-2 rounded">
              <span>UKUPNI ZAKONSKI ODBICI OD BRUTO ZARADE:</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.doprinosiRadnik +
                        printTargetRadnik.obracun.porez,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
          </div>

          {/* 3. NETO ISPLATA - FINALE */}
          <div className="border-2 border-black p-4 rounded-xl flex items-center justify-between bg-gray-50">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Neto zarada za isplatu (Na tekući račun radnika)
              </div>
              <div className="text-[11px] text-gray-500">
                Iznos koji se nalogom za prenos uplaćuje zaposlenom
              </div>
            </div>
            <div className="text-2xl font-black font-mono">
              RSD{" "}
              {printTargetRadnik.obracun
                ? Math.round(printTargetRadnik.obracun.neto).toLocaleString()
                : "0"}
              .00
            </div>
          </div>

          {/* 4. TROŠAK POSLODAVCA (Bruto II) */}
          <div className="space-y-1 text-gray-700">
            <div className="font-bold text-black border-b border-gray-400 pb-1 uppercase tracking-wide">
              3. Doprinosi na teret poslodavca (Dodatni fiskalni trošak firme)
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>PIO na teret poslodavca (10.00%):</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa.pioPoslodavac,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>Zdravstvo na teret poslodavca (5.15%):</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa
                        .zdravstvoPoslodavac,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1.5 font-bold bg-gray-100 px-2 rounded text-black">
              <span>UKUPAN TROŠAK ZARADE ZA POSLODAVCA (BRUTO II):</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.ukupnoZaIsplatuFirme,
                    ).toLocaleString()
                  : "0"}
                .00
              </span>
            </div>
          </div>

          {/* Potpisi i M.P. */}
          <div className="pt-10 flex justify-between items-end text-center">
            <div className="space-y-12">
              <div className="text-[11px] text-gray-500">M.P.</div>
              <div className="border-t border-black w-48 pt-1 text-[11px] font-bold">
                Odgovorno lice / Knjigovođa
              </div>
            </div>
            <div className="space-y-12">
              <div className="text-[11px] text-gray-500">
                Primio dana:{" "}
                {/* @__PURE__ */ new Date().toLocaleDateString("sr-RS")}
              </div>
              <div className="border-t border-black w-48 pt-1 text-[11px] font-bold">
                Potpis zaposlenog
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: NOVA FIRMA (KLIJENT)                           */}
      {/* ======================================================== */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dodaj novu firmu / klijenta
                </h3>
              </div>
              <button
                onClick={() => setIsAddCompanyOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCompany}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Puni naziv pravnog lica
                </label>
                <input
                  type="text"
                  required
                  placeholder="npr. Adria Metalurgija d.o.o."
                  value={companyForm.naziv}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, naziv: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    PIB (Poreski broj)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    placeholder="npr. 109876543"
                    value={companyForm.pib}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, pib: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Matični broj (MB)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="npr. 08765432"
                    value={companyForm.maticniBroj}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        maticniBroj: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Sedište i adresa
                </label>
                <input
                  type="text"
                  placeholder="npr. Kneza Miloša 45, 11000 Beograd"
                  value={companyForm.adresa}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, adresa: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Šifra opštine (PURS)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="011"
                    value={companyForm.opstina_kod}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        opstina_kod: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Tekući račun (IBAN)
                  </label>
                  <input
                    type="text"
                    placeholder="RS35160000000..."
                    value={companyForm.iban}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, iban: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCompanyOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  Sačuvaj Firmu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: NOVI / IZMENI RADNIKA                          */}
      {/* ======================================================== */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingEmp
                    ? "Izmeni podatke radnika"
                    : "Dodaj novog zaposlenog"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEmployeeOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateEmployee}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Ime i prezime
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="npr. Jovan Simić"
                    value={empForm.ime}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, ime: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    JMBG (13 cifara)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    placeholder="1508991710023"
                    value={empForm.jmbg}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, jmbg: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Radno mesto / Pozicija
                </label>
                <input
                  type="text"
                  placeholder="npr. Glavni elektro-mehaničar"
                  value={empForm.pozicija}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, pozicija: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Osnovna ugovorena plata (Bruto RSD)
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={empForm.brutoBaza}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        brutoBaza: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Satnica za proračun (RSD/h)
                  </label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={empForm.satnica}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        satnica: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Evidencija smena i dodataka za tekući mesec:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-0.5">
                      Prekovremeni (+26%)
                    </label>
                    <input
                      type="number"
                      value={empForm.prekovremeniSati}
                      onChange={(e) =>
                        setEmpForm({
                          ...empForm,
                          prekovremeniSati: Number(e.target.value),
                        })
                      }
                      className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-0.5">
                      Noćni rad (+26%)
                    </label>
                    <input
                      type="number"
                      value={empForm.nocniSati}
                      onChange={(e) =>
                        setEmpForm({
                          ...empForm,
                          nocniSati: Number(e.target.value),
                        })
                      }
                      className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-0.5">
                      Državni praznik (+110%)
                    </label>
                    <input
                      type="number"
                      value={empForm.praznikSati}
                      onChange={(e) =>
                        setEmpForm({
                          ...empForm,
                          praznikSati: Number(e.target.value),
                        })
                      }
                      className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Tekući račun za isplatu plate
                </label>
                <input
                  type="text"
                  placeholder="265-0000001234567-88"
                  value={empForm.bankRacun}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, bankRacun: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  {editingEmp ? "Sa\u010Duvaj Izmene" : "Dodaj Radnika"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL: PREGLED ePorezi PPP-PD XML KODA                 */}
      {/* ======================================================== */}
      {isXmlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ePorezi PPP-PD XML pregled (Poreska uprava RS)
                </h3>
              </div>
              <button
                onClick={() => setIsXmlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 text-emerald-400 rounded-xl overflow-x-auto max-h-96 text-[11px] font-mono leading-relaxed">
              <pre>{generatedXmlString}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Ovaj fajl je u potpunosti kompatibilan sa validacionom šemom na
                portalu ePorezi.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsXmlModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Zatvori
                </button>
                <button
                  onClick={handleDownloadXml}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" /> Preuzmi XML
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. MODAL: AI SKENER UGOVORA ZA MASOVNI UVOZ              */}
      {/* ======================================================== */}
      {isAiScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Skener ugovora o radu / platne liste
                </h3>
              </div>
              <button
                onClick={() => setIsAiScanOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DocumentScanner />

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAiScanOpen(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs"
              >
                Zatvori skener
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EVIDENCIJA BOLOVANJA I GODIŠNJEG ODMORA */}
      <WorkerLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={currentEmployees}
        initialWorkerId={leaveModalInitialWorkerId}
        initialDate={leaveModalInitialDate || new Date().toISOString().slice(0, 10)}
        onSaveLeave={(leaveData) => addWorkerLeave(leaveData)}
      />

      {/* ======================================================== */}
      {/* 10. STYLESHEET INJECTION FOR CLEAN PRINT ISOLATION       */}
      {/* ======================================================== */}
      <style>{`
        @media print {
          .no-print, header, nav, footer, button, select, input, .fixed {
            display: none !important;
          }
          body, min-h-screen, main, #root {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-only-container {
            display: block !important;
            width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            padding: 24px !important;
          }
        }
        @media screen {
          .print-only-container {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
