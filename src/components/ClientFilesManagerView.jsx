import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import {
  Building,
  Users,
  FileText,
  Download,
  Upload,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Search,
  ArrowRight,
  X,
  Palmtree,
  Bandage,
} from "lucide-react";
import { AddClientWorkerShiftModal } from "./AddClientWorkerShiftModal";
import { WorkerLeaveModal } from "./WorkerLeaveModal";
export const ClientFilesManagerView = () => {
  const {
    companies,
    activeCompany,
    setActiveCompany,
    addCompany,
    updateCompany,
    deleteCompany,
    exportCompanyDossierJson,
    importCompanyDossierJson,
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    updateWorkerRegime,
    openLeaveModal,
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    leaveModalInitialWorkerId,
    leaveModalInitialDate,
    addWorkerLeave,
    setCurrentTab,
  } = useShift();
  const { t, intlLocale } = useLanguage();
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    activeCompany?.id || companies[0]?.id || "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPersonModal, setSelectedPersonModal] = useState(null);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [shiftTargetWorkerId, setShiftTargetWorkerId] = useState(void 0);
  const [confirmDeleteWorkerId, setConfirmDeleteWorkerId] = useState(null);
  const currentCompany = useMemo(() => {
    return (
      companies.find((c) => c.id === selectedCompanyId) || companies[0] || null
    );
  }, [companies, selectedCompanyId]);
  const companyEmployees = useMemo(() => {
    if (!currentCompany) return [];
    return employees.filter((e) => e.companyId === currentCompany.id);
  }, [employees, currentCompany]);
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return companyEmployees;
    const term = searchTerm.toLowerCase();
    return companyEmployees.filter(
      (e) =>
        e.ime.toLowerCase().includes(term) ||
        e.jmbg.includes(term) ||
        e.pozicija.toLowerCase().includes(term),
    );
  }, [companyEmployees, searchTerm]);
  const [personForm, setPersonForm] = useState({
    ime: "",
    jmbg: "",
    pozicija: "",
    brutoBaza: 95e3,
    satnica: 550,
    prekovremeniSati: 0,
    nocniSati: 0,
    praznikSati: 0,
    bankRacun: "",
    opstinaPrebivalista: "011",
    ugovorDatum: /* @__PURE__ */ new Date().toISOString().split("T")[0],
    smenskiRezim: "8h_regular",
  });
  const [companyForm, setCompanyForm] = useState({
    naziv: "",
    pib: "",
    maticniBroj: "",
    adresa: "",
    opstina_kod: "011",
    iban: "",
    delatnost: t.ui.aiCopilotHitl.defaultCompanyActivity,
    kontaktEmail: "",
  });
  const handleExportDossier = (companyId) => {
    const jsonStr = exportCompanyDossierJson(companyId);
    const targetComp = companies.find((c) => c.id === companyId);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dosije_Klijenta_${targetComp?.pib || companyId}_${/* @__PURE__ */ new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const handleImportDossier = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      const success = importCompanyDossierJson(content);
      if (success) {
        setImportStatus(t.ui.clients.importSuccess);
        setTimeout(() => setImportStatus(null), 3e3);
      } else {
        setImportStatus(t.ui.clients.importError);
        setTimeout(() => setImportStatus(null), 4e3);
      }
    };
    reader.readAsText(file);
  };
  const handleSavePerson = (e) => {
    e.preventDefault();
    if (!currentCompany || !personForm.ime.trim()) return;
    addEmployee({
      companyId: currentCompany.id,
      ime: personForm.ime,
      jmbg: personForm.jmbg || "0000000000000",
      pozicija: personForm.pozicija || t.ui.aiCopilotHitl.defaultWorkerPosition,
      brutoBaza: Number(personForm.brutoBaza),
      satnica: Number(personForm.satnica),
      prekovremeniSati: Number(personForm.prekovremeniSati),
      nocniSati: Number(personForm.nocniSati),
      praznikSati: Number(personForm.praznikSati),
      bankRacun: personForm.bankRacun || "265-0000000000000-00",
      opstinaPrebivalista:
        personForm.opstinaPrebivalista || currentCompany.opstina_kod,
      ugovorDatum: personForm.ugovorDatum,
      smenskiRezim: personForm.smenskiRezim,
      manualOverrides: {},
    });
    setIsAddPersonOpen(false);
    setPersonForm({
      ime: "",
      jmbg: "",
      pozicija: "",
      brutoBaza: 95e3,
      satnica: 550,
      prekovremeniSati: 0,
      nocniSati: 0,
      praznikSati: 0,
      bankRacun: "",
      opstinaPrebivalista: "011",
      ugovorDatum: /* @__PURE__ */ new Date().toISOString().split("T")[0],
      smenskiRezim: "8h_regular",
    });
  };
  const handleSaveCompany = (e) => {
    e.preventDefault();
    if (!companyForm.naziv.trim() || !companyForm.pib.trim()) return;
    const created = addCompany({
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
    setSelectedCompanyId(created.id);
    setIsNewCompanyOpen(false);
    setCompanyForm({
      naziv: "",
      pib: "",
      maticniBroj: "",
      adresa: "",
      opstina_kod: "011",
      iban: "",
      delatnost: t.ui.aiCopilotHitl.defaultCompanyActivity,
      kontaktEmail: "",
    });
  };
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. TOP HEADER: DOSSIER WORKSTATION OVERVIEW */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {t.ui.clients.title}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {t.ui.clients.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.ui.clients.subtitle}
            </p>
          </div>
        </div>

        {/* Global dossier export / import actions */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.ui.clients.importDossier}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportDossier}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setIsNewCompanyOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.ui.clients.newCompanyBtn}</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold animate-in fade-in">
          {importStatus}
        </div>
      )}

      {/* 2. CLIENT COMPANIES SELECTOR CARDS (HORIZONTALLY SCROLLABLE / GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {companies.map((comp) => {
          const isSelected = comp.id === currentCompany?.id;
          const compWorkerCount = employees.filter(
            (e) => e.companyId === comp.id,
          ).length;
          return (
            <div
              key={comp.id}
              onClick={() => {
                setSelectedCompanyId(comp.id);
                setActiveCompany(comp);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${isSelected ? "bg-gradient-to-br from-indigo-50/80 via-white to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 border-indigo-500 shadow-md ring-2 ring-indigo-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                  >
                    {comp.naziv.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[180px]">
                      {comp.naziv}
                    </h3>
                    <div className="text-[10px] font-mono text-slate-500">
                      {t.ui.ledger.slip.pib}: <strong>{comp.pib}</strong> | {t.ui.ledger.slip.mb}: {comp.maticniBroj}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {interpolate(t.ui.clients.workersCount, { count: compWorkerCount })}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span className="truncate max-w-[180px]">
                  {comp.adresa || t.ui.common.notSpecified}
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {t.ui.clients.municipality}: {comp.opstina_kod}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. DEDICATED COMPANY DOSSIER VIEW & PERSON ROSTER */}
      {currentCompany && (
        <div className="space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Dossier Banner for current selected company */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {t.ui.clients.companyDossierPrefix}: {currentCompany.naziv}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {t.ui.clients.activeClientBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {t.ui.ledger.slip.pib}: <strong>{currentCompany.pib}</strong> | {t.ui.ledger.slip.mb}:{" "}
                <strong>{currentCompany.maticniBroj}</strong> | {t.ui.clients.ibanLabel}:{" "}
                {currentCompany.iban || t.ui.common.notSpecified}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShiftTargetWorkerId(void 0);
                  setIsAddShiftOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.ui.clients.addShiftBtn}</span>
              </button>

              <button
                onClick={() => handleExportDossier(currentCompany.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{t.ui.clients.downloadDossier}</span>
              </button>

              <button
                onClick={() => {
                  setActiveCompany(currentCompany);
                  setCurrentTab("calendar-shifts");
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{t.ui.clients.openCalendar}</span>
              </button>

              <button
                onClick={() => {
                  setActiveCompany(currentCompany);
                  setCurrentTab("ledger");
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                <span>{t.ui.clients.payrollShortcut}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Add Person bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.ui.clients.searchPlaceholder}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => setIsAddPersonOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.ui.clients.newWorkerBtn}</span>
            </button>
          </div>

          {/* 4. INDIVIDUAL PERSON / WORKER DOSSIER CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-slate-400 text-xs font-sans">
                {t.ui.clients.emptyWorkers}
              </div>
            ) : (
              filteredEmployees.map((person) => {
                const hasCalc = !!person.obracun;
                return (
                  <div
                    key={person.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all space-y-3"
                  >
                    {/* Header Person Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {person.ime}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          {person.pozicija}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {t.ui.ledger.slip.jmbg}: <strong>{person.jmbg}</strong> | {t.ui.clients.ibanLabel}:{" "}
                          {person.bankRacun || t.ui.common.notSpecified}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${hasCalc ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"}`}
                      >
                        {hasCalc ? t.ui.clients.calculatedBadge : t.ui.clients.pendingBadge}
                      </span>
                    </div>

                    {/* Wage parameters and hours matrix */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg text-[11px] font-mono border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">
                          {t.ui.clients.grossBase}:
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          RSD {person.brutoBaza.toLocaleString(intlLocale)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">
                          {t.ui.clients.hourlyRate}:
                        </span>
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {person.satnica} RSD{t.ui.common.perHour}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">
                          {t.ui.clients.otNight}:
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          OT: {person.obracun?.hours?.overtimeHours ?? person.prekovremeniSati}{t.ui.common.hoursShort} | N:{" "}
                          {person.obracun?.hours?.nightHours ?? person.nocniSati}{t.ui.common.hoursShort}
                        </span>
                      </div>
                    </div>

                    {/* Vacation & Sick Leave badges if recorded */}
                    {(person.obracun?.hours?.vacationHours > 0 || (person.obracun?.hours?.sick65Hours || 0) + (person.obracun?.hours?.sick100Hours || 0) > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        {person.obracun?.hours?.vacationHours > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <Palmtree className="w-3 h-3 text-amber-600" />
                            {t.ui.clients.vacationBadge}: {person.obracun.hours.vacationHours}{t.ui.common.hoursShort}
                          </span>
                        )}
                        {((person.obracun?.hours?.sick65Hours || 0) + (person.obracun?.hours?.sick100Hours || 0) > 0) && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                            <Bandage className="w-3 h-3 text-rose-600" />
                            {t.ui.clients.sickBadge}: {(person.obracun?.hours?.sick65Hours || 0) + (person.obracun?.hours?.sick100Hours || 0)}{t.ui.common.hoursShort}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Financial outcome if calculated */}
                    {hasCalc && (
                      <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-500 font-sans text-[11px]">
                          {t.ui.clients.netForPayout}:
                        </span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                          RSD {Math.round(person.obracun.neto).toLocaleString(intlLocale)}
                        </strong>
                      </div>
                    )}

                    {/* Shift Regime & Overrides Count */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {t.ui.clients.regimeLabel}:
                        </span>
                        <select
                          value={person.smenskiRezim || "8h_regular"}
                          onChange={(e) =>
                            updateWorkerRegime(person.id, e.target.value)
                          }
                          className="text-[10px] font-bold p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer outline-none"
                        >
                          <option value="8h_regular">
                            {t.ui.calShifts.regimes["8h_regular"]}
                          </option>
                          <option value="8h_three_shift">
                            {t.ui.calShifts.regimes["8h_three_shift"]}
                          </option>
                          <option value="8h_two_shift">
                            {t.ui.calShifts.regimes["8h_two_shift"]}
                          </option>
                          <option value="12h_turnus">
                            {t.ui.calShifts.regimes["12h_turnus"]}
                          </option>
                          <option value="12h_continuous">
                            {t.ui.calShifts.regimes["12h_continuous"]}
                          </option>
                          <option value="custom_flexible">
                            {t.ui.calShifts.regimes["custom_flexible"]}
                          </option>
                        </select>
                      </div>

                      {person.manualOverrides &&
                        Object.keys(person.manualOverrides).length > 0 && (
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                            {interpolate(t.ui.clients.overridesCount, {
                              count: Object.keys(person.manualOverrides).length,
                            })}
                          </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => setSelectedPersonModal(person)}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer mr-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{t.ui.clients.dossierBtn}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openLeaveModal(person.id)}
                          className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800"
                        >
                          <Palmtree className="w-3 h-3 text-amber-600" />
                          <span>{t.ui.clients.leaveBtn}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShiftTargetWorkerId(person.id);
                            setIsAddShiftOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t.ui.clients.shiftBtn}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {confirmDeleteWorkerId === person.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deleteEmployee(person.id);
                                setConfirmDeleteWorkerId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 transition-colors cursor-pointer"
                            >
                              {t.ui.clients.confirmRemoveWorker}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteWorkerId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                            >
                              {t.ui.common.cancel}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteWorkerId(person.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title={t.ui.clients.deleteWorkerBtn}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: DETALJNI DOSIJE ZAPOSLENOG (PERSONNEL DOSSIER) */}
      {/* ======================================================== */}
      {selectedPersonModal && currentCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.ui.clients.workerModalTitle}: {selectedPersonModal.ime}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPersonModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div>
                    {t.ui.clients.employer}:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {currentCompany.naziv}
                    </strong>
                  </div>
                  <div>
                    {t.ui.clients.companyPib}:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {currentCompany.pib}
                    </strong>
                  </div>
                  <div>
                    {t.ui.clients.position}:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedPersonModal.pozicija}
                    </strong>
                  </div>
                  <div>
                    {t.ui.ledger.slip.jmbg}:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedPersonModal.jmbg}
                    </strong>
                  </div>
                  <div>
                    {t.ui.clients.contractDate}:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedPersonModal.ugovorDatum || t.ui.clients.permanentContract}
                    </strong>
                  </div>
                  <div>
                    {t.ui.clients.ibanLabel}:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedPersonModal.bankRacun || "265-0000000000000-00"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl space-y-1.5 border border-indigo-200 dark:border-indigo-800">
                <span className="font-bold text-indigo-900 dark:text-indigo-300 uppercase text-[10px] block">
                  {t.ui.clients.contractTermsTitle}:
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-800 dark:text-slate-200">
                  <div>
                    {t.ui.clients.baseSalary}:{" "}
                    <strong>
                      RSD {selectedPersonModal.brutoBaza.toLocaleString(intlLocale)}
                    </strong>
                  </div>
                  <div>
                    {t.ui.clients.hourlyPrice}:{" "}
                    <strong>{selectedPersonModal.satnica} RSD{t.ui.common.perHour}</strong>
                  </div>
                  <div>
                    {t.ui.clients.nightSupplement}:{" "}
                    <strong>{selectedPersonModal.nocniSati}{t.ui.common.hoursShort}</strong>
                  </div>
                  <div>
                    {t.ui.clients.otSupplement}:{" "}
                    <strong>{selectedPersonModal.prekovremeniSati}{t.ui.common.hoursShort}</strong>
                  </div>
                </div>
              </div>

              {selectedPersonModal.obracun && (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl space-y-1.5 border border-emerald-200 dark:border-emerald-800">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] block">
                    {t.ui.clients.periodCalcTitle}:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-800 dark:text-slate-200">
                    <div>
                      {t.ui.clients.gross1Label}:{" "}
                      <strong>
                        RSD{" "}
                        {Math.round(
                          selectedPersonModal.obracun.bruto,
                        ).toLocaleString(intlLocale)}
                      </strong>
                    </div>
                    <div>
                      {t.ui.clients.netLabel}:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        RSD{" "}
                        {Math.round(
                          selectedPersonModal.obracun.neto,
                        ).toLocaleString(intlLocale)}
                      </strong>
                    </div>
                    <div>
                      {t.ui.clients.tax10Label}:{" "}
                      <strong>
                        RSD{" "}
                        {Math.round(
                          selectedPersonModal.obracun.porez,
                        ).toLocaleString(intlLocale)}
                      </strong>
                    </div>
                    <div>
                      {t.ui.clients.workerContribLabel}:{" "}
                      <strong>
                        RSD{" "}
                        {Math.round(
                          selectedPersonModal.obracun.doprinosiRadnik,
                        ).toLocaleString(intlLocale)}
                      </strong>
                    </div>
                    <div>
                      {t.ui.clients.employerTotalLabel}:{" "}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        RSD{" "}
                        {Math.round(
                          selectedPersonModal.obracun.ukupnoZaIsplatuFirme,
                        ).toLocaleString(intlLocale)}
                      </strong>
                    </div>
                  </div>

                  {/* Statutory leave compensation breakdown if present */}
                  {(selectedPersonModal.obracun.naknade?.godisnjiOdmor > 0 ||
                    selectedPersonModal.obracun.naknade?.bolovanje65 > 0 ||
                    selectedPersonModal.obracun.naknade?.bolovanje100 > 0) && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 space-y-1">
                      <span className="font-bold text-amber-800 dark:text-amber-300 uppercase text-[9px] block">
                        {t.ui.clients.leaveCompTitle}:
                      </span>
                      {selectedPersonModal.obracun.naknade?.godisnjiOdmor > 0 && (
                        <div className="flex justify-between items-center text-amber-900 dark:text-amber-200">
                          <span>
                            {interpolate(t.ui.clients.leaveGoLine, {
                              hours: selectedPersonModal.obracun.hours?.vacationHours || 0,
                            })}:
                          </span>
                          <strong>RSD {Math.round(selectedPersonModal.obracun.naknade.godisnjiOdmor).toLocaleString(intlLocale)}</strong>
                        </div>
                      )}
                      {selectedPersonModal.obracun.naknade?.bolovanje65 > 0 && (
                        <div className="flex justify-between items-center text-rose-800 dark:text-rose-300">
                          <span>
                            {interpolate(t.ui.clients.leaveSick65Line, {
                              hours: selectedPersonModal.obracun.hours?.sick65Hours || 0,
                            })}:
                          </span>
                          <strong>RSD {Math.round(selectedPersonModal.obracun.naknade.bolovanje65).toLocaleString(intlLocale)}</strong>
                        </div>
                      )}
                      {selectedPersonModal.obracun.naknade?.bolovanje100 > 0 && (
                        <div className="flex justify-between items-center text-rose-800 dark:text-rose-300">
                          <span>
                            {interpolate(t.ui.clients.leaveSick100Line, {
                              hours: selectedPersonModal.obracun.hours?.sick100Hours || 0,
                            })}:
                          </span>
                          <strong>RSD {Math.round(selectedPersonModal.obracun.naknade.bolovanje100).toLocaleString(intlLocale)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const workerId = selectedPersonModal.id;
                  setSelectedPersonModal(null);
                  openLeaveModal(workerId);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Palmtree className="w-3.5 h-3.5" />
                <span>{t.ui.clients.addLeaveAction}</span>
              </button>

              <button
                onClick={() => setSelectedPersonModal(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                {t.ui.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddPersonOpen && currentCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.ui.clients.newWorkerModalTitle}: {currentCompany.naziv}
                </h3>
              </div>
              <button
                onClick={() => setIsAddPersonOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t.ui.clients.fullName}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.ui.clients.fullNamePlaceholder}
                    value={personForm.ime}
                    onChange={(e) =>
                      setPersonForm({ ...personForm, ime: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t.ui.clients.jmbgLabel}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    placeholder="1203994710023"
                    value={personForm.jmbg}
                    onChange={(e) =>
                      setPersonForm({ ...personForm, jmbg: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {t.ui.clients.positionLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.ui.clients.positionPlaceholder}
                  value={personForm.pozicija}
                  onChange={(e) =>
                    setPersonForm({ ...personForm, pozicija: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t.ui.clients.contractGrossLabel}
                  </label>
                  <input
                    type="number"
                    step="500"
                    required
                    value={personForm.brutoBaza}
                    onChange={(e) =>
                      setPersonForm({
                        ...personForm,
                        brutoBaza: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t.ui.clients.hourlyRateLabel}
                  </label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={personForm.satnica}
                    onChange={(e) =>
                      setPersonForm({
                        ...personForm,
                        satnica: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {t.ui.clients.workerAccountLabel}
                </label>
                <input
                  type="text"
                  placeholder="265-0000001234567-88"
                  value={personForm.bankRacun}
                  onChange={(e) =>
                    setPersonForm({ ...personForm, bankRacun: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPersonOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  {t.ui.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  {t.ui.clients.saveWorkerBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNewCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.ui.clients.newCompanyModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsNewCompanyOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {t.ui.clients.companyFullName}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.ui.clients.companyPlaceholder}
                  value={companyForm.naziv}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, naziv: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t.ui.clients.pibLabel}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    placeholder="108923412"
                    value={companyForm.pib}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, pib: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t.ui.clients.mbLabel}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="20459812"
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
                  {t.ui.clients.addressLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.ui.clients.addressPlaceholder}
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
                    {t.ui.clients.municipalityCodeLabel}
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
                    {t.ui.clients.companyBankLabel}
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
                  onClick={() => setIsNewCompanyOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  {t.ui.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  {t.ui.clients.createCompanyBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dodaj smenu radniku klijenta */}
      {isAddShiftOpen && (
        <AddClientWorkerShiftModal
          isOpen={isAddShiftOpen}
          onClose={() => {
            setIsAddShiftOpen(false);
            setShiftTargetWorkerId(void 0);
          }}
          initialCompanyId={currentCompany?.id}
          initialWorkerId={shiftTargetWorkerId}
        />
      )}

      {/* Modal: Evidencija bolovanja i godišnjeg odmora */}
      <WorkerLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={companyEmployees}
        initialWorkerId={leaveModalInitialWorkerId}
        initialDate={leaveModalInitialDate || new Date().toISOString().slice(0, 10)}
        onSaveLeave={(leaveData) => addWorkerLeave(leaveData)}
      />
    </div>
  );
};
