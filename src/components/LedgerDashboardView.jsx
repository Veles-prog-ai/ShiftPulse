import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import { PluginActionButtons } from "../plugins/PluginContext";
import { pluginManager } from "../plugins/PluginManager";
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
  Send,
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
    workspaceConnected,
    saveOutputDocumentToWorkspace,
    openCommHub,
  } = useShift();
  const { t, intlLocale } = useLanguage();
  const l = t.ui.ledgerFull;
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [printTargetRadnik, setPrintTargetRadnik] = useState(null);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [generatedXmlString, setGeneratedXmlString] = useState("");
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [confirmDeleteCompanyId, setConfirmDeleteCompanyId] = useState(null);
  const [confirmDeleteEmpId, setConfirmDeleteEmpId] = useState(null);
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
      // Zero-Knowledge: obračun se vrši isključivo lokalno na uređaju korisnika
      const statutory = calculateSerbianWorkerPayroll(target);
      updateEmployee(target.id, {
        obracun: statutory,
        kompletan: true,
      });
    } catch (err) {
      console.error(err);
    }
  };
  const buildLocalPppPdXml = () => {
    const periodObracuna = new Date().toISOString().slice(0, 7);
    const stavkeXml = currentEmployees
      .map(
        (emp, idx) => `    <PodatakOPrihodu>
      <RedniBroj>${idx + 1}</RedniBroj>
      <JMBG>${emp.jmbg || "0000000000000"}</JMBG>
      <ImePrezime>${(emp.ime || "").replace(/[<>&]/g, "")}</ImePrezime>
      <Bruto>${(emp.obracun?.bruto || emp.brutoBaza || 0).toFixed(2)}</Bruto>
      <Porez>${(emp.obracun?.porez || 0).toFixed(2)}</Porez>
      <DoprinosiZaposleni>${(emp.obracun?.doprinosiRadnik || 0).toFixed(2)}</DoprinosiZaposleni>
      <DoprinosiPoslodavac>${(emp.obracun?.doprinosiFirma || 0).toFixed(2)}</DoprinosiPoslodavac>
    </PodatakOPrihodu>`,
      )
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<PodaciPoreskeDeklaracije xmlns="http://pid.purs.gov.rs">
  <Zaglavlje>
    <PoreskiPeriod>${periodObracuna}</PoreskiPeriod>
    <PoreskiIdentifikacioniBroj>${activeCompany?.pib || "109876543"}</PoreskiIdentifikacioniBroj>
    <UkupanBrojLica>${currentEmployees.length}</UkupanBrojLica>
    <LokalniZeroKnowledgeObracun>DA</LokalniZeroKnowledgeObracun>
  </Zaglavlje>
  <DeklarisaniPrihodi>
${stavkeXml}
  </DeklarisaniPrihodi>
</PodaciPoreskeDeklaracije>`;
  };
  const handleDownloadXml = async () => {
    if (!activeCompany) return;
    try {
      await pluginManager.runBeforeReportExportHooks({
        reportType: "ppp-pd-xml",
        activeCompany,
        recordCount: currentEmployees.length,
      });
      const xmlText = buildLocalPppPdXml();
      const filename = `PPP-PD_${activeCompany.pib}_${new Date().toISOString().slice(0, 7)}.xml`;
      const blob = new Blob([xmlText], { type: "application/xml;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (workspaceConnected) {
        await saveOutputDocumentToWorkspace({
          topFolder: "02_Izlaz_Dokumenta",
          subFolder: "Zarade_ePorezi_XML",
          filename,
          content: xmlText,
        });
      }
    } catch (err) {
      console.error("Gre\u0161ka pri preuzimanju XML-a:", err);
    }
  };
  const handlePreviewXml = async () => {
    if (!activeCompany) return;
    try {
      const xmlText = buildLocalPppPdXml();
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
  const handleExportCsv = async () => {
    if (!activeCompany || currentEmployees.length === 0) return;
    await pluginManager.runBeforeReportExportHooks({
      reportType: "payroll-csv",
      activeCompany,
      recordCount: currentEmployees.length,
    });
    const ch = t.ui.ledger?.csvHeaders || {};
    const headers = [
      ch.worker || "Employee",
      ch.jmbg || "JMBG",
      ch.position || "Position",
      ch.gross1 || "Gross I (RSD)",
      ch.net || "Net Payout (RSD)",
      ch.tax || "Income Tax 10% (RSD)",
      l.colEmpContrib,
      l.colErContrib,
      ch.gross2 || "Gross II (RSD)",
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
    const rawCsv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `Obracun_Zarada_${activeCompany.pib}_${/* @__PURE__ */ new Date().toISOString().slice(0, 7)}.csv`;
    const csvContent = "data:text/csv;charset=utf-8," + rawCsv;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (workspaceConnected) {
      saveOutputDocumentToWorkspace({
        topFolder: "02_Izlaz_Dokumenta",
        subFolder: "Zarade_ePorezi_XML",
        filename,
        content: rawCsv,
      });
    }
  };
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* ======================================================== */}
      {/* SCREEN INTERFACE (Hidden during window.print A4 output)   */}
      {/* ======================================================== */}
      <div className="space-y-6 no-print">
        {!activeCompany && (
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {l.emptyTitle}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {l.emptyDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCompanyOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{l.emptyCta}</span>
            </button>
          </div>
        )}

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
                    {l.headerTitle}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {l.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {l.headerSub}
                </p>
              </div>
            </div>

            {/* Company Switcher & Add Client Action */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[260px] flex-1 sm:flex-none">
                <select
                  value={activeCompany?.id || ""}
                  onChange={(e) => {
                    setConfirmDeleteCompanyId(null);
                    setActiveCompany(
                      companies.find((c) => c.id === e.target.value) || null,
                    );
                  }}
                  className="w-full text-xs font-bold py-2.5 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-xs appearance-none cursor-pointer"
                >
                  {companies.length === 0 ? (
                    <option value="">{l.noClientOpt}</option>
                  ) : (
                    companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.naziv} (PIB: {c.pib})
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>

              <button
                onClick={() => setIsAddCompanyOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
                title={l.companyModalTitle}
              >
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{l.newClientBtn}</span>
              </button>

              {activeCompany &&
                (confirmDeleteCompanyId === activeCompany.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        deleteCompany(activeCompany.id);
                        setConfirmDeleteCompanyId(null);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      {l.confirmDelete}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCompanyId(null)}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteCompanyId(activeCompany.id)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                    title={l.confirmDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ))}
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
                <span className="text-slate-400">{l.municipalityLabel}</span>
                <strong className="text-slate-900 dark:text-white font-bold">
                  {activeCompany.opstina_kod}
                </strong>
                <span className="text-slate-400 truncate hidden md:inline">
                  ({activeCompany.adresa})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="text-slate-400">{l.headcountLabel}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {interpolate(l.employeesSuffix, { count: currentEmployees.length })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. EXECUTIVE KPI CARDS: FINANCIAL ACCUMULATOR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>{l.kpi1Title}</span>
              <DollarSign className="w-4 h-4 text-indigo-500 opacity-70" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              RSD {Math.round(companyMetrics.ukupnoBrutoI).toLocaleString(intlLocale)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {l.kpi1Sub}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>{l.kpi2Title}</span>
              <TrendingUp className="w-4 h-4 text-emerald-500 opacity-70" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              RSD {Math.round(companyMetrics.ukupnoNeto).toLocaleString(intlLocale)}
            </div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              {interpolate(l.kpi2Sub, {
                calc: companyMetrics.obracunatoBroj,
                total: companyMetrics.ukupnoRadnika,
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center justify-between">
              <span>{l.kpi3Title}</span>
              <ShieldCheck className="w-4 h-4 text-rose-500 opacity-70" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              RSD{" "}
              {Math.round(
                companyMetrics.ukupnoPorez +
                  companyMetrics.ukupnoDoprinosiRadnik,
              ).toLocaleString(intlLocale)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {l.kpi3Sub}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>{l.kpi4Title}</span>
              <Building className="w-4 h-4 text-indigo-500 opacity-70" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono tabular-nums">
              RSD {Math.round(companyMetrics.ukupnoBrutoII).toLocaleString(intlLocale)}
            </div>
            <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">
              {l.kpi4Sub}
            </div>
          </div>
        </div>

        {/* 3. DESKTOP ACTION BAR & WORKFLOW BUTTONS */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={l.searchPh}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunBulkPayroll}
              disabled={loadingCalculation || currentEmployees.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingCalculation ? "animate-spin" : ""}`}
              />
              <span>
                {loadingCalculation ? l.calculatingBtn : l.runBulkBtn}
              </span>
            </button>

            <button
              onClick={handleDownloadXml}
              disabled={companyMetrics.obracunatoBroj === 0}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
              title={l.pppPdTitle}
            >
              <FileCode className="w-4 h-4 text-amber-600" />
              <span>{l.pppPdBtn}</span>
            </button>

            <button
              onClick={() => setCurrentTab("bank-orders")}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title={l.bankOrdersTitle}
            >
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{l.bankOrdersBtn}</span>
            </button>

            <button
              onClick={handlePreviewXml}
              disabled={companyMetrics.obracunatoBroj === 0}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              title={l.xmlPreviewTitle}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{l.previewXmlBtn}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={currentEmployees.length === 0}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              title={l.excelCsvBtn}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{l.excelCsvBtn}</span>
            </button>

            <button
              disabled={!activeCompany}
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
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{l.addEmpBtn}</span>
            </button>

            <button
              onClick={() => setIsAiScanOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
              title={l.aiScannerModalTitle}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{l.aiContractBtn}</span>
            </button>

            <button
              onClick={() => openCommHub("email", "payroll")}
              disabled={!activeCompany}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              title={l.sendClientBtn}
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{l.sendClientBtn}</span>
            </button>

            <PluginActionButtons
              slot="ledger-toolbar"
              context={{ activeCompany, currentEmployees, companyMetrics }}
            />
          </div>
        </div>

        {/* 4. MAIN BOOKKEEPING LEDGER TABLE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono min-w-[1100px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 py-3.5">
                <tr>
                  <th className="p-3.5">{l.colEmpJmbg}</th>
                  <th className="p-3.5">{l.colRoleBank}</th>
                  <th className="p-3.5 text-center">{l.colShiftParams}</th>
                  <th className="p-3.5 text-right">{l.colBaseGross}</th>
                  <th className="p-3.5 text-right font-sans font-bold text-emerald-600">
                    {l.colNetPayout}
                  </th>
                  <th className="p-3.5 text-right">{l.colTax10}</th>
                  <th className="p-3.5 text-right">{l.colEmpContrib}</th>
                  <th className="p-3.5 text-right">{l.colErContrib}</th>
                  <th className="p-3.5 text-right font-bold text-indigo-600">
                    {l.colTotalGross2}
                  </th>
                  <th className="p-3.5 text-center">{l.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-slate-400 font-sans"
                    >
                      {l.emptyWorkers}
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

                        <td className="p-3.5 font-sans">
                          <div className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[160px]">
                            {r.pozicija}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                            {r.bankRacun || l.noBankAcc}
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-mono">
                              <span title={l.hourlyRateLabel}>{r.satnica} RSD/h</span>
                              <span className="text-slate-300 dark:text-slate-600">|</span>
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                title={l.otLabel}
                              >
                                {l.otShort}:{r.obracun?.hours?.overtimeHours ?? r.prekovremeniSati}h
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">|</span>
                              <span
                                className="text-indigo-600 dark:text-indigo-400"
                                title={l.nightLabel}
                              >
                                {l.nightShort}:{r.obracun?.hours?.nightHours ?? r.nocniSati}h
                              </span>
                              {r.praznikSati > 0 && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">|</span>
                                  <span
                                    className="text-rose-600"
                                    title={l.holLabel}
                                  >
                                    {l.holShort}:{r.praznikSati}h
                                  </span>
                                </>
                              )}
                            </div>

                            {(r.obracun?.hours?.vacationHours > 0 || (r.obracun?.hours?.sick65Hours || 0) + (r.obracun?.hours?.sick100Hours || 0) > 0) && (
                              <div className="flex items-center gap-1.5 text-[9px] font-bold">
                                {r.obracun?.hours?.vacationHours > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                    <Palmtree className="w-2.5 h-2.5 text-amber-600" />
                                    {l.leaveTag}: {r.obracun.hours.vacationHours}h
                                  </span>
                                )}
                                {((r.obracun?.hours?.sick65Hours || 0) + (r.obracun?.hours?.sick100Hours || 0) > 0) && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                                    <Bandage className="w-2.5 h-2.5 text-rose-600" />
                                    {l.sickTag}: {(r.obracun?.hours?.sick65Hours || 0) + (r.obracun?.hours?.sick100Hours || 0)}h
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-medium text-slate-900 dark:text-slate-200 tabular-nums">
                          RSD {r.brutoBaza.toLocaleString(intlLocale)}
                        </td>

                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                          {hasCalc ? (
                            `RSD ${Math.round(r.obracun.neto).toLocaleString(intlLocale)}`
                          ) : (
                            <span className="text-xs text-amber-500 font-sans font-semibold">
                              {l.pendingStatus}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right text-rose-500 tabular-nums">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.porez).toLocaleString(intlLocale)}`
                            : "---"}
                        </td>

                        <td className="p-3.5 text-right text-amber-600 dark:text-amber-400 tabular-nums">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.doprinosiRadnik).toLocaleString(intlLocale)}`
                            : "---"}
                        </td>

                        <td className="p-3.5 text-right text-blue-500 tabular-nums">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.doprinosiFirma).toLocaleString(intlLocale)}`
                            : "---"}
                        </td>

                        <td className="p-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {hasCalc
                            ? `RSD ${Math.round(r.obracun.ukupnoZaIsplatuFirme).toLocaleString(intlLocale)}`
                            : "---"}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openLeaveModal(r.id)}
                              className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                              title={l.btnLeaveTitle}
                            >
                              <Palmtree className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            <button
                              onClick={() => handleCalculateSingle(r.id)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title={l.btnCalcTitle}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handlePrintPayslip(r)}
                              disabled={!hasCalc}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-30 cursor-pointer"
                              title={l.btnPrintTitle}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleStartEdit(r)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title={l.btnEditTitle}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {confirmDeleteEmpId === r.id ? (
                              <button
                                onClick={() => {
                                  deleteEmployee(r.id);
                                  setConfirmDeleteEmpId(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                title={l.confirmRemoveBtn}
                              >
                                {l.confirmRemoveBtn}
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteEmpId(r.id)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title={l.btnDeleteTitle}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                {l.pibLabel}: <strong>{activeCompany.pib}</strong> | {l.mbLabel}:{" "}
                <strong>{activeCompany.maticniBroj}</strong>
              </p>
              {activeCompany.iban && (
                <p className="text-[10px] font-mono text-gray-600">
                  {l.ibanLabel}: {activeCompany.iban}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                {l.slipFormLabel}
              </span>
              <div className="text-sm font-black text-black uppercase mt-1">
                {l.slipDocTitle}
              </div>
              <div className="text-[11px] font-mono">
                {l.slipPeriod}{" "}
                <strong>
                  {/* @__PURE__ */ new Date()
                    .toLocaleString(intlLocale, { month: "long", year: "numeric" })
                    .toUpperCase()}
                </strong>
              </div>
              <div className="text-[10px] text-gray-500">
                {l.slipCalcDate}{" "}
                {/* @__PURE__ */ new Date().toLocaleDateString(intlLocale)}
              </div>
            </div>
          </div>

          {/* Podaci o zaposlenom */}
          <div className="bg-gray-50 border border-gray-300 p-3.5 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">
                {l.slipWorkerHeading}
              </div>
              <div className="text-sm font-black text-black">
                {printTargetRadnik.ime}
              </div>
              <div className="text-[11px] text-gray-700">
                {printTargetRadnik.pozicija}
              </div>
              <div className="text-[10px] font-mono mt-0.5 text-gray-600">
                {l.bankAccLabel}: {printTargetRadnik.bankRacun || l.noBankAcc}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">
                {l.slipIdHeading}
              </div>
              <div className="text-[11px] font-mono">
                JMBG: <strong>{printTargetRadnik.jmbg}</strong>
              </div>
              <div className="text-[11px] font-mono">
                {l.slipMuniCode}{" "}
                <strong>
                  {printTargetRadnik.opstinaPrebivalista ||
                    activeCompany.opstina_kod}
                </strong>
              </div>
              <div className="text-[11px] font-mono">
                {l.slipSvp}
              </div>
            </div>
          </div>

          {/* Finansijska specifikacija - 1. BRUTO */}
          <div className="space-y-1">
            <div className="font-bold text-black border-b border-gray-400 pb-1 uppercase tracking-wide">
              {l.slipSec1}
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>{l.slipBaseGross}</span>
              <span className="text-right font-mono">
                RSD {printTargetRadnik.brutoBaza.toLocaleString(intlLocale)}.00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>
                {interpolate(l.slipOtLine, {
                  h: printTargetRadnik.prekovremeniSati,
                })}
              </span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.uvecanja.prekovremeniRad,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>
                {interpolate(l.slipNightLine, {
                  h: printTargetRadnik.nocniSati,
                })}
              </span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.uvecanja.nocniRad,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            {printTargetRadnik.praznikSati > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200">
                <span>
                  {interpolate(l.slipHolLine, {
                    h: printTargetRadnik.praznikSati,
                  })}
                </span>
                <span className="text-right font-mono">
                  RSD{" "}
                  {printTargetRadnik.obracun
                    ? Math.round(
                        printTargetRadnik.obracun.uvecanja.praznicniRad,
                      ).toLocaleString(intlLocale)
                    : "0"}
                  .00
                </span>
              </div>
            )}
            {printTargetRadnik.obracun?.naknade?.godisnjiOdmor > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-amber-900 bg-amber-50/50">
                <span>
                  {interpolate(l.slipVacLine, {
                    h: printTargetRadnik.obracun.hours?.vacationHours || 0,
                  })}
                </span>
                <span className="text-right font-mono font-bold">
                  RSD{" "}
                  {Math.round(
                    printTargetRadnik.obracun.naknade.godisnjiOdmor,
                  ).toLocaleString(intlLocale)}
                  .00
                </span>
              </div>
            )}
            {printTargetRadnik.obracun?.naknade?.bolovanje65 > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-rose-900 bg-rose-50/50">
                <span>
                  {interpolate(l.slipSick65Line, {
                    h: printTargetRadnik.obracun.hours?.sick65Hours || 0,
                  })}
                </span>
                <span className="text-right font-mono font-bold">
                  RSD{" "}
                  {Math.round(
                    printTargetRadnik.obracun.naknade.bolovanje65,
                  ).toLocaleString(intlLocale)}
                  .00
                </span>
              </div>
            )}
            {printTargetRadnik.obracun?.naknade?.bolovanje100 > 0 && (
              <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-rose-900 bg-rose-50/50">
                <span>
                  {interpolate(l.slipSick100Line, {
                    h: printTargetRadnik.obracun.hours?.sick100Hours || 0,
                  })}
                </span>
                <span className="text-right font-mono font-bold">
                  RSD{" "}
                  {Math.round(
                    printTargetRadnik.obracun.naknade.bolovanje100,
                  ).toLocaleString(intlLocale)}
                  .00
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 py-1.5 font-bold bg-gray-100 px-2 rounded">
              <span>{l.slipTotalGross1}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(printTargetRadnik.obracun.bruto).toLocaleString(intlLocale)
                  : printTargetRadnik.brutoBaza.toLocaleString(intlLocale)}
                .00
              </span>
            </div>
          </div>

          {/* 2. ODBICI NA TERET ZAPOSLENOG */}
          <div className="space-y-1">
            <div className="font-bold text-black border-b border-gray-400 pb-1 uppercase tracking-wide">
              {l.slipSec2}
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200 text-gray-700">
              <span>{l.slipNonTaxable}</span>
              <span className="text-right font-mono">- RSD 25,000.00</span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>{l.slipTax10}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(printTargetRadnik.obracun.porez).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>{l.slipPioEmp}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa.pioRadnik,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>{l.slipHealthEmp}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa
                        .zdravstvoRadnik,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>{l.slipUnempEmp}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa
                        .nezaposlenostRadnik,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1.5 font-bold bg-gray-100 px-2 rounded">
              <span>{l.slipTotalDeductions}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.doprinosiRadnik +
                        printTargetRadnik.obracun.porez,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
          </div>

          {/* 3. NETO ISPLATA - FINALE */}
          <div className="border-2 border-black p-4 rounded-xl flex items-center justify-between bg-gray-50">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-700">
                {l.slipNetTitle}
              </div>
              <div className="text-[11px] text-gray-500">
                {l.slipNetSub}
              </div>
            </div>
            <div className="text-2xl font-black font-mono">
              RSD{" "}
              {printTargetRadnik.obracun
                ? Math.round(printTargetRadnik.obracun.neto).toLocaleString(intlLocale)
                : "0"}
              .00
            </div>
          </div>

          {/* 4. TROŠAK POSLODAVCA (Bruto II) */}
          <div className="space-y-1 text-gray-700">
            <div className="font-bold text-black border-b border-gray-400 pb-1 uppercase tracking-wide">
              {l.slipSec3}
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>{l.slipPioEr}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa.pioPoslodavac,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1 border-b border-gray-200">
              <span>{l.slipHealthEr}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.detaljiDoprinosa
                        .zdravstvoPoslodavac,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
            <div className="grid grid-cols-2 py-1.5 font-bold bg-gray-100 px-2 rounded text-black">
              <span>{l.slipTotalGross2}</span>
              <span className="text-right font-mono">
                RSD{" "}
                {printTargetRadnik.obracun
                  ? Math.round(
                      printTargetRadnik.obracun.ukupnoZaIsplatuFirme,
                    ).toLocaleString(intlLocale)
                  : "0"}
                .00
              </span>
            </div>
          </div>

          {/* Potpisi i M.P. */}
          <div className="pt-10 flex justify-between items-end text-center">
            <div className="space-y-12">
              <div className="text-[11px] text-gray-500">{l.slipMp}</div>
              <div className="border-t border-black w-48 pt-1 text-[11px] font-bold">
                {l.slipSignEmployer}
              </div>
            </div>
            <div className="space-y-12">
              <div className="text-[11px] text-gray-500">
                {l.slipReceivedDate}{" "}
                {/* @__PURE__ */ new Date().toLocaleDateString(intlLocale)}
              </div>
              <div className="border-t border-black w-48 pt-1 text-[11px] font-bold">
                {l.slipSignWorker}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: NEW CLIENT COMPANY                              */}
      {/* ======================================================== */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {l.companyModalTitle}
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
                  {l.companyNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={l.companyNamePh}
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
                    {l.pibLabel}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    placeholder="109876543"
                    value={companyForm.pib}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, pib: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {l.mbLabel}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="08765432"
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
                  {l.addressLabel}
                </label>
                <input
                  type="text"
                  placeholder={l.addressPh}
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
                    {l.muniCodeLabel}
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
                    {l.ibanLabel}
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
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  {l.saveClientBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: ADD / EDIT EMPLOYEE                            */}
      {/* ======================================================== */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingEmp ? l.empModalEditTitle : l.empModalNewTitle}
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
                    {l.fullNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={l.fullNamePh}
                    value={empForm.ime}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, ime: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {l.jmbgLabel}
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
                  {l.roleLabel}
                </label>
                <input
                  type="text"
                  placeholder={l.rolePh}
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
                    {l.contractGrossLabel}
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
                    {l.hourlyRateLabel}
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
                  {l.shiftHoursHeading}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-0.5">
                      {l.otLabel}
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
                      {l.nightLabel}
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
                      {l.holLabel}
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
                  {l.bankAccLabel}
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
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  {editingEmp ? l.saveChangesSubmit : l.addEmpSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL: ePorezi PPP-PD XML PREVIEW                     */}
      {/* ======================================================== */}
      {isXmlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {l.xmlPreviewTitle}
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
                {l.xmlSchemaNote}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsXmlModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                >
                  {t.common.close}
                </button>
                <button
                  onClick={handleDownloadXml}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" /> {l.downloadXmlBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. MODAL: AI CONTRACT SCANNER                            */}
      {/* ======================================================== */}
      {isAiScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {l.aiScannerModalTitle}
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
                {l.closeScannerBtn}
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
