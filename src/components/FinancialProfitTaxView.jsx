import { useState, useMemo, useRef, useEffect } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import { PluginActionButtons } from "../plugins/PluginContext";
import { pluginManager } from "../plugins/PluginManager";
import {
  analyzeUploadedDocument,
  parseRawDocumentText,
  DOCUMENT_TYPES,
  KONTNI_OKVIR_CATALOG,
  validateSerbianPib,
} from "../utils/documentAnalyzerEngine";
import {
  calculateClientProfitAndTax,
  exportFinancialLedgerCsv,
  toRsdAmount,
} from "../utils/profitTaxEngine";
import {
  Upload,
  FileText,
  Receipt,
  PackageCheck,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Search,
  Calculator,
  Cpu,
  Layers,
  X,
  ArrowUpRight,
  ArrowDownRight,
  FolderOpen,
  Send,
} from "lucide-react";

const formatRsd = (val, locale = "sr-Latn-RS") =>
  Number(val || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DOC_TYPE_ICONS = {
  faktura: FileText,
  fiskalni: Receipt,
  otpremnica: PackageCheck,
  slip: CreditCard,
  izvod: Layers,
  rucno: Calculator,
};

export const FinancialProfitTaxView = () => {
  const {
    companies,
    activeCompany,
    setActiveCompany,
    employees,
    financialRecords,
    addFinancialRecord,
    addFinancialRecordsBatch,
    updateFinancialRecord,
    deleteFinancialRecord,
    setCurrentTab,
    workspaceConnected,
    workspaceDisplayName,
    scanWorkspaceInputDocuments,
    loadWorkspaceInputFileObject,
    saveOutputDocumentToWorkspace,
    openCommHub,
  } = useShift();
  const { t, intlLocale } = useLanguage();
  const p = t.ui.profitTaxFull;
  const fmtRsd = (val) => formatRsd(val, intlLocale);

  const fileInputRef = useRef(null);
  const [workspaceInboxFiles, setWorkspaceInboxFiles] = useState([]);
  const [showInboxPicker, setShowInboxPicker] = useState(false);

  // Scoped period & accounting switches
  const [period, setPeriod] = useState("all");
  const [inVatSystem, setInVatSystem] = useState(
    activeCompany?.poreskiModel !== "pausal" && activeCompany?.poreskiModel !== "inostrani_priliv",
  );
  useEffect(() => {
    setInVatSystem(
      activeCompany?.poreskiModel !== "pausal" && activeCompany?.poreskiModel !== "inostrani_priliv",
    );
  }, [activeCompany?.id, activeCompany?.poreskiModel]);
  const [includePayrollCost, setIncludePayrollCost] = useState(true);
  const [pausalMonthlyTax, setPausalMonthlyTax] = useState(42500);

  // Filters for table
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all"); // all | prihod | rashod | otpremnica | slip
  const [showKontoSummary, setShowKontoSummary] = useState(false);

  // Analytical Scanner state
  const [scannerOpen, setScannerOpen] = useState(true);
  const [rawPasteText, setRawPasteText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { mode: 'single'|'batch', records: [...], rawText, imageDiagnostics, needsManualCheck }
  const [draftRecord, setDraftRecord] = useState(null);
  const [scanNotice, setScanNotice] = useState(null);

  // Manual Entry / Edit Modal state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split("T")[0],
    direction: "rashod",
    docType: "faktura",
    docNumber: "",
    partnerName: "",
    partnerPib: "",
    currency: "RSD",
    netAmount: "",
    vatRate: 20,
    vatAmount: "",
    grossAmount: "",
    konto: "511",
    description: "",
  });

  const companyEmployees = useMemo(() => {
    if (!activeCompany) return [];
    return employees.filter((e) => e.companyId === activeCompany.id);
  }, [employees, activeCompany]);

  const companyRecords = useMemo(() => {
    if (!activeCompany) return [];
    return financialRecords
      .filter((r) => r.companyId === activeCompany.id)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [financialRecords, activeCompany]);

  const summary = useMemo(() => {
    return calculateClientProfitAndTax({
      company: activeCompany,
      records: companyRecords,
      employees: companyEmployees,
      period,
      includePayrollCost,
      inVatSystem,
      pausalMonthlyTax,
    });
  }, [
    activeCompany,
    companyRecords,
    companyEmployees,
    period,
    includePayrollCost,
    inVatSystem,
    pausalMonthlyTax,
  ]);

  const filteredRecords = useMemo(() => {
    return companyRecords.filter((rec) => {
      if (directionFilter === "prihod" && rec.direction !== "prihod") return false;
      if (directionFilter === "rashod" && rec.direction !== "rashod") return false;
      if (directionFilter === "otpremnica" && rec.docType !== "otpremnica") return false;
      if (directionFilter === "slip" && rec.docType !== "slip" && rec.docType !== "fiskalni")
        return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${rec.docNumber || ""} ${rec.partnerName || ""} ${rec.partnerPib || ""} ${rec.konto || ""} ${rec.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [companyRecords, directionFilter, searchQuery]);

  // Synchronize net / vat / gross on draft edits
  const updateDraftNumeric = (field, rawVal) => {
    setDraftRecord((prev) => {
      if (!prev) return null;
      const val = parseFloat(rawVal);
      const num = Number.isFinite(val) ? val : 0;
      const next = { ...prev, [field]: num };

      if (field === "netAmount" || field === "vatRate") {
        const rate = field === "vatRate" ? num : Number(next.vatRate || 0);
        const net = field === "netAmount" ? num : Number(next.netAmount || 0);
        next.vatAmount = Math.round(net * (rate / 100) * 100) / 100;
        next.grossAmount = Math.round((net + next.vatAmount) * 100) / 100;
      } else if (field === "grossAmount") {
        const rate = Number(next.vatRate || 0);
        next.netAmount = Math.round((num / (1 + rate / 100)) * 100) / 100;
        next.vatAmount = Math.round((num - next.netAmount) * 100) / 100;
      }
      next.mathVerified =
        next.grossAmount > 0 &&
        Math.abs(next.netAmount + next.vatAmount - next.grossAmount) <= 2;
      return next;
    });
  };

  const handleAnalyzeFile = async (file) => {
    if (!file) return;
    setIsAnalyzing(true);
    setScanNotice(null);
    try {
      const result = await analyzeUploadedDocument(file, activeCompany);
      setScanResult(result);
      if (result.mode === "single" && result.records[0]) {
        setDraftRecord(result.records[0]);
      } else {
        setDraftRecord(null);
      }
    } catch (err) {
      setScanNotice({
        type: "error",
        text: interpolate(p.parseErr, { msg: err?.message || "" }),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeRawText = (textToParse = rawPasteText) => {
    if (!textToParse || !textToParse.trim()) {
      setScanNotice({
        type: "error",
        text: p.emptyTextErr,
      });
      return;
    }
    setScanNotice(null);
    const parsed = parseRawDocumentText(textToParse, activeCompany, {});
    setScanResult({ mode: "single", records: [parsed], rawText: textToParse });
    setDraftRecord(parsed);
  };

  const handleBookDraftRecord = () => {
    if (!draftRecord) return;
    if (!draftRecord.grossAmount || Number(draftRecord.grossAmount) <= 0) {
      setScanNotice({
        type: "error",
        text: p.grossZeroErr,
      });
      return;
    }
    const kontoInfo = KONTNI_OKVIR_CATALOG[draftRecord.konto];
    addFinancialRecord({
      ...draftRecord,
      companyId: activeCompany?.id,
      pibValid: validateSerbianPib(draftRecord.partnerPib),
      kontoLabel: kontoInfo?.name || draftRecord.kontoLabel || "Business Transaction",
    });
    setScanNotice({
      type: "success",
      text: interpolate(p.postedOk, {
        docNum: draftRecord.docNumber,
        amount: fmtRsd(draftRecord.grossAmount),
        currency: draftRecord.currency,
      }),
    });
    setDraftRecord(null);
    setScanResult(null);
    setRawPasteText("");
  };

  const handleBookBatch = () => {
    if (!scanResult?.records?.length) return;
    const prepared = scanResult.records.map((r) => ({
      ...r,
      companyId: activeCompany?.id,
    }));
    addFinancialRecordsBatch(prepared);
    setScanNotice({
      type: "success",
      text: interpolate(p.batchPostedOk, { count: prepared.length }),
    });
    setScanResult(null);
  };

  const openManualCreate = () => {
    setEditingRecordId(null);
    setManualForm({
      date: new Date().toISOString().split("T")[0],
      direction: "rashod",
      docType: "faktura",
      docNumber: `DOC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      partnerName: "",
      partnerPib: "",
      currency: "RSD",
      netAmount: "",
      vatRate: inVatSystem ? 20 : 0,
      vatAmount: "",
      grossAmount: "",
      konto: "511",
      description: "",
    });
    setManualModalOpen(true);
  };

  const openEditRecord = (rec) => {
    setEditingRecordId(rec.id);
    setManualForm({
      date: rec.date || new Date().toISOString().split("T")[0],
      direction: rec.direction || "rashod",
      docType: rec.docType || "faktura",
      docNumber: rec.docNumber || "",
      partnerName: rec.partnerName || "",
      partnerPib: rec.partnerPib || "",
      currency: rec.currency || "RSD",
      netAmount: String(rec.netAmount ?? ""),
      vatRate: Number(rec.vatRate ?? 20),
      vatAmount: String(rec.vatAmount ?? ""),
      grossAmount: String(rec.grossAmount ?? ""),
      konto: rec.konto || "511",
      description: rec.description || "",
    });
    setManualModalOpen(true);
  };

  const updateManualAmount = (field, rawVal) => {
    setManualForm((prev) => {
      const next = { ...prev, [field]: rawVal };
      const num = parseFloat(rawVal);
      const validNum = Number.isFinite(num) ? num : 0;
      if (field === "netAmount" || field === "vatRate") {
        const net = field === "netAmount" ? validNum : parseFloat(next.netAmount) || 0;
        const rate = field === "vatRate" ? validNum : Number(next.vatRate) || 0;
        const vat = Math.round(net * (rate / 100) * 100) / 100;
        next.vatAmount = String(vat);
        next.grossAmount = String(Math.round((net + vat) * 100) / 100);
      } else if (field === "grossAmount") {
        const rate = Number(next.vatRate) || 0;
        const net = Math.round((validNum / (1 + rate / 100)) * 100) / 100;
        const vat = Math.round((validNum - net) * 100) / 100;
        next.netAmount = String(net);
        next.vatAmount = String(vat);
      }
      return next;
    });
  };

  const handleSaveManual = (e) => {
    e.preventDefault();
    const net = parseFloat(manualForm.netAmount) || 0;
    const vat = parseFloat(manualForm.vatAmount) || 0;
    const gross = parseFloat(manualForm.grossAmount) || Math.round((net + vat) * 100) / 100;
    const kontoInfo = KONTNI_OKVIR_CATALOG[manualForm.konto];
    const payload = {
      ...manualForm,
      companyId: activeCompany?.id,
      netAmount: net,
      vatRate: Number(manualForm.vatRate) || 0,
      vatAmount: vat,
      grossAmount: gross,
      pibValid: validateSerbianPib(manualForm.partnerPib),
      kontoLabel: kontoInfo?.name || `Konto ${manualForm.konto}`,
      mathVerified: gross > 0 && Math.abs(net + vat - gross) <= 2,
      sourceEngine: p.manualSourceTag,
    };

    if (editingRecordId) {
      updateFinancialRecord(editingRecordId, payload);
    } else {
      addFinancialRecord(payload);
    }
    setManualModalOpen(false);
    setEditingRecordId(null);
  };

  const handleRefreshWorkspaceInbox = async () => {
    try {
      const files = await scanWorkspaceInputDocuments();
      setWorkspaceInboxFiles(files);
      setShowInboxPicker(true);
      if (files.length === 0) {
        setScanNotice({
          type: "error",
          text: p.inboxEmpty,
        });
      }
    } catch (err) {
      setScanNotice({
        type: "error",
        text: err?.message || p.inboxReadErr,
      });
    }
  };

  const handleAnalyzeInboxItem = async (item) => {
    try {
      const fileObj = await loadWorkspaceInputFileObject(item);
      await handleAnalyzeFile(fileObj);
      setShowInboxPicker(false);
    } catch (err) {
      setScanNotice({
        type: "error",
        text: err?.message || p.inboxLoadErr,
      });
    }
  };

  const handleExportCsv = async () => {
    await pluginManager.runBeforeReportExportHooks({
      reportType: "profit-tax-csv",
      activeCompany,
      period,
      recordCount: filteredRecords.length,
      summary,
    });
    const csv = exportFinancialLedgerCsv(activeCompany, filteredRecords, summary);
    const filename = `Profit_Loss_Statement_${activeCompany?.pib || "client"}_${period}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    if (workspaceConnected) {
      const saved = await saveOutputDocumentToWorkspace({
        topFolder: "02_Izlaz_Dokumenta",
        subFolder: "Bilansi_Porezi_CSV",
        filename,
        content: csv,
      });
      if (saved.ok) {
        setScanNotice({
          type: "success",
          text: interpolate(p.exportedWorkspaceOk, { path: saved.relativePath }),
        });
      }
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Empty Company Onboarding State */}
      {!activeCompany && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {p.emptyTitle}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {p.emptyDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab("clients")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{p.emptyCta}</span>
          </button>
        </div>
      )}

      {/* Top Toolbar & Client Scope */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{p.badge}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {p.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {p.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeCompany?.id || ""}
              onChange={(e) => {
                const found = companies.find((c) => c.id === e.target.value);
                if (found) {
                  setActiveCompany(found);
                  setInVatSystem(
                    found.poreskiModel !== "pausal" && found.poreskiModel !== "inostrani_priliv",
                  );
                }
              }}
              aria-label={p.noClient}
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              {companies.length === 0 ? (
                <option value="">{p.noClient}</option>
              ) : (
                companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.naziv} (PIB: {c.pib})
                  </option>
                ))
              )}
            </select>

            <button
              onClick={openManualCreate}
              disabled={!activeCompany}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{p.manualBtn}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={!activeCompany}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{p.csvBtn}</span>
            </button>

            <button
              onClick={handlePrintSummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer print:hidden"
            >
              <Printer className="w-4 h-4" />
              <span>{p.printBtn}</span>
            </button>

            <button
              onClick={() => openCommHub("email", "profit-tax")}
              disabled={!activeCompany}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors cursor-pointer print:hidden"
              title={p.sendTitle}
            >
              <Send className="w-4 h-4" />
              <span>{p.sendBtn}</span>
            </button>

            <PluginActionButtons
              slot="profit-tax-toolbar"
              context={{ activeCompany, filteredRecords, summary, period }}
            />
          </div>
        </div>

        {/* Calculation Scope Controls */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">{p.periodLabel}</span>
            {[
              { id: "month", label: p.periodMonth },
              { id: "quarter", label: p.periodQuarter },
              { id: "year", label: p.periodYear },
              { id: "all", label: p.periodAll },
            ].map((per) => (
              <button
                key={per.id}
                onClick={() => setPeriod(per.id)}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  period === per.id
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {per.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={inVatSystem}
                onChange={(e) => setInVatSystem(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600"
              />
              <span>{p.vatRegLabel}</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={includePayrollCost}
                onChange={(e) => setIncludePayrollCost(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600"
              />
              <span>{interpolate(p.includePayrollLabel, { count: companyEmployees.length })}</span>
            </label>

            {summary.taxModel === "pausal" && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">{p.monthlyFlatLabel}</span>
                <input
                  type="number"
                  value={pausalMonthlyTax}
                  onChange={(e) => setPausalMonthlyTax(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-right font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <span className="text-slate-500">RSD</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{p.revTitle} {inVatSystem ? p.exclVat : p.grossTag}</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmtRsd(summary.totalRevenueNet)} <span className="text-xs font-normal">RSD</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {p.grossBilled} {fmtRsd(summary.totalRevenueGross)} RSD
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{p.expTitle}</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {fmtRsd(summary.totalExpenses)} <span className="text-xs font-normal">RSD</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums flex items-center justify-between">
            <span>{p.docsShort} {fmtRsd(summary.totalDocsExpenseNet)}</span>
            <button
              onClick={() => setCurrentTab("ledger")}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {p.payrollShort} {fmtRsd(summary.payrollCostTotal)}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{p.vatTitle}</span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {inVatSystem ? p.vatRegistered : p.vatExempt}
            </span>
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              !inVatSystem
                ? "text-slate-500 dark:text-slate-400"
                : summary.vatBalance > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {inVatSystem ? fmtRsd(summary.vatBalance) : "0.00"}{" "}
            <span className="text-xs font-normal">RSD</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {p.outputLabel} {fmtRsd(summary.outputVat)} | {p.inputLabel} {fmtRsd(summary.inputVat)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{p.profitTitle}</span>
            <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {interpolate(p.marginLabel, { pct: summary.profitMarginPercent })}
            </span>
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              summary.netProfit >= 0
                ? "text-slate-900 dark:text-slate-100"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {fmtRsd(summary.netProfit)} <span className="text-xs font-normal">RSD</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate" title={summary.taxRateLabel}>
            {p.taxPrefix} {fmtRsd(summary.incomeTax)} RSD ({summary.taxModel.toUpperCase()})
          </div>
        </div>
      </div>

      {/* Statutory Limits & Tax Breakdown Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              {p.flatLimitLabel}
            </span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {summary.pausalLimitPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                summary.pausalLimitPercent >= 85 ? "bg-amber-500" : "bg-indigo-600"
              }`}
              style={{ width: `${summary.pausalLimitPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              {p.vatLimitLabel}
            </span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {summary.pdvLimitPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                summary.pdvLimitPercent >= 85 ? "bg-rose-500" : "bg-emerald-600"
              }`}
              style={{ width: `${summary.pdvLimitPercent}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 md:text-right font-mono tabular-nums">
          <div>
            {p.grossProfitLabel}{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {fmtRsd(summary.grossProfit)} RSD
            </span>
          </div>
          <div>
            {summary.taxRateLabel}
            {summary.dividendTaxPreview > 0 && (
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                {p.dividendTaxLabel} {fmtRsd(summary.dividendTaxPreview)} RSD
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Zero-AI Analytical Document Scanner Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {p.scannerTitle}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {workspaceConnected && (
              <button
                type="button"
                onClick={handleRefreshWorkspaceInbox}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
                title={`${workspaceDisplayName}/01_Ulaz_Dokumenta`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{p.loadInboxBtn}</span>
              </button>
            )}
            <button
              onClick={() => setScannerOpen((v) => !v)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {scannerOpen ? p.hideScanner : p.openScanner}
            </button>
          </div>
        </div>

        {scannerOpen && (
          <div className="p-4 sm:p-5 space-y-4">
            {scanNotice && (
              <div
                className={`px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-2 ${
                  scanNotice.type === "error"
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                <span>{scanNotice.text}</span>
                <button
                  onClick={() => setScanNotice(null)}
                  className="p-0.5 hover:opacity-75 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {showInboxPicker && workspaceInboxFiles.length > 0 && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>
                    {interpolate(p.inboxFound, { count: workspaceInboxFiles.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInboxPicker(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                  {workspaceInboxFiles.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAnalyzeInboxItem(item)}
                      className="text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        {item.subfolder}/
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {(item.size / 1024).toFixed(1)} KB
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: File dropzone */}
              <div className="space-y-3 flex flex-col justify-center">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleAnalyzeFile(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/70 dark:bg-slate-800/40"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,.csv,.txt,.pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAnalyzeFile(f);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <Upload className="w-6 h-6 mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {isAnalyzing ? p.dropLoading : p.dropIdle}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {p.dropFormats}
                  </p>
                </div>
              </div>

              {/* Right: Raw text paste & trigger */}
              <div className="flex flex-col justify-between space-y-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {p.rawTextLabel}
                </label>
                <textarea
                  rows={5}
                  value={rawPasteText}
                  onChange={(e) => setRawPasteText(e.target.value)}
                  placeholder={p.rawTextPh}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-end gap-2">
                  {rawPasteText && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawPasteText("");
                        setDraftRecord(null);
                        setScanResult(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {p.clearBtn}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAnalyzeRawText()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{p.analyzeBtn}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Single Parsed Document Verification Card */}
            {draftRecord && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {draftRecord.mathVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span>{p.mathCardTitle}</span>
                    <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400">
                      {interpolate(p.confidenceMeta, {
                        source: draftRecord.sourceEngine,
                        pct: draftRecord.confidence,
                      })}
                    </span>
                  </div>

                  {draftRecord.imageDiagnostics && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {interpolate(p.imgMeta, {
                        w: draftRecord.imageDiagnostics.width,
                        h: draftRecord.imageDiagnostics.height,
                        score: draftRecord.imageDiagnostics.sharpnessScore,
                      })}
                    </span>
                  )}
                </div>

                {scanResult?.needsManualCheck && (
                  <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    {p.manualCheckWarn}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.directionLabel}</label>
                    <select
                      value={draftRecord.direction}
                      onChange={(e) => setDraftRecord({ ...draftRecord, direction: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="prihod">{p.dirRevOpt}</option>
                      <option value="rashod">{p.dirExpOpt}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.docTypeLabel}</label>
                    <select
                      value={draftRecord.docType}
                      onChange={(e) => setDraftRecord({ ...draftRecord, docType: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {Object.values(DOCUMENT_TYPES).map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {p.docTypes?.[dt.id] || dt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.docNumLabel}</label>
                    <input
                      type="text"
                      value={draftRecord.docNumber || ""}
                      onChange={(e) => setDraftRecord({ ...draftRecord, docNumber: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.txDateLabel}</label>
                    <input
                      type="date"
                      value={draftRecord.date || ""}
                      onChange={(e) => setDraftRecord({ ...draftRecord, date: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.partnerLabel}</label>
                    <input
                      type="text"
                      value={draftRecord.partnerName || ""}
                      onChange={(e) => setDraftRecord({ ...draftRecord, partnerName: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">
                      {p.partnerPibLabel}{" "}
                      {draftRecord.partnerPib && (
                        <span
                          className={
                            validateSerbianPib(draftRecord.partnerPib)
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          ({validateSerbianPib(draftRecord.partnerPib) ? p.mod11Ok : p.mod11Check})
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={draftRecord.partnerPib || ""}
                      onChange={(e) => setDraftRecord({ ...draftRecord, partnerPib: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.kontoLabel}</label>
                    <select
                      value={draftRecord.konto}
                      onChange={(e) => setDraftRecord({ ...draftRecord, konto: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {Object.values(KONTNI_OKVIR_CATALOG).map((k) => (
                        <option key={k.code} value={k.code}>
                          {k.code} — {k.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.netBaseLabel} ({draftRecord.currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftRecord.netAmount}
                      onChange={(e) => updateDraftNumeric("netAmount", e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.vatRateLabel}</label>
                    <select
                      value={draftRecord.vatRate}
                      onChange={(e) => updateDraftNumeric("vatRate", e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    >
                      <option value={20}>{p.vatStd}</option>
                      <option value={10}>{p.vatRed}</option>
                      <option value={0}>{p.vatZero}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.vatAmountLabel}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftRecord.vatAmount}
                      onChange={(e) => updateDraftNumeric("vatAmount", e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.grossTotalLabel} ({draftRecord.currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftRecord.grossAmount}
                      onChange={(e) => updateDraftNumeric("grossAmount", e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold tabular-nums text-right"
                    />
                  </div>
                </div>

                {draftRecord.lineItems?.length > 0 && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {interpolate(p.lineItemsLabel, { count: draftRecord.lineItems.length })}{" "}
                    </span>
                    {draftRecord.lineItems
                      .slice(0, 4)
                      .map((li) => `${li.name} (${li.quantity} × ${fmtRsd(li.unitPrice)})`)
                      .join(" · ")}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftRecord(null);
                      setScanResult(null);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleBookDraftRecord}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{p.postLedgerBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {/* CSV Batch Preview */}
            {scanResult?.mode === "batch" && scanResult.records.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {interpolate(p.csvBatchTitle, { count: scanResult.records.length })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScanResult(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {p.discardBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleBookBatch}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      {interpolate(p.postAllBtn, { count: scanResult.records.length })}
                    </button>
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2">{p.colDate}</th>
                        <th className="px-3 py-2">{p.colDir}</th>
                        <th className="px-3 py-2">{p.colCounterparty}</th>
                        <th className="px-3 py-2 text-right">{p.colGrossAmt}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {scanResult.records.slice(0, 20).map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-1.5 font-mono tabular-nums">{r.date}</td>
                          <td className="px-3 py-1.5 font-semibold">
                            {r.direction === "prihod" ? p.revWord : p.expWord}
                          </td>
                          <td className="px-3 py-1.5">{r.partnerName}</td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                            {fmtRsd(r.grossAmount)} {r.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ledger & Kontni Okvir Table Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: interpolate(p.filterAll, { count: companyRecords.length }) },
              {
                id: "prihod",
                label: interpolate(p.filterRev, { count: companyRecords.filter((r) => r.direction === "prihod").length }),
              },
              {
                id: "rashod",
                label: interpolate(p.filterExp, { count: companyRecords.filter((r) => r.direction === "rashod").length }),
              },
              {
                id: "otpremnica",
                label: interpolate(p.filterDeliv, { count: companyRecords.filter((r) => r.docType === "otpremnica").length }),
              },
              {
                id: "slip",
                label: interpolate(p.filterSlip, { count: companyRecords.filter((r) => r.docType === "slip" || r.docType === "fiskalni").length }),
              },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDirectionFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  directionFilter === f.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={p.searchPh}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-56"
              />
            </div>

            <button
              onClick={() => setShowKontoSummary((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showKontoSummary
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {showKontoSummary ? p.showListBtn : p.acctBreakdownBtn}
            </button>
          </div>
        </div>

        {showKontoSummary ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">{p.colAcctCode}</th>
                  <th className="px-4 py-3">{p.colAcctTitle}</th>
                  <th className="px-4 py-3">{p.colDir}</th>
                  <th className="px-4 py-3 text-right">{p.colItems}</th>
                  <th className="px-4 py-3 text-right">{p.colNetRsd}</th>
                  <th className="px-4 py-3 text-right">{p.colGrossRsd}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {summary.kontoBreakdown.map((k) => (
                  <tr key={k.konto} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {k.konto}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{k.label}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`font-mono text-xs font-semibold ${
                          k.direction === "prihod"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {k.direction === "prihod" ? p.dirBadgeRev : p.dirBadgeExp}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{k.count}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                      {fmtRsd(k.netAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {fmtRsd(k.grossAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">{p.colDate}</th>
                  <th className="px-4 py-3">{p.colDocument}</th>
                  <th className="px-4 py-3">{p.colPartnerDesc}</th>
                  <th className="px-4 py-3">{p.colAcctShort}</th>
                  <th className="px-4 py-3 text-right">{p.colNetBase}</th>
                  <th className="px-4 py-3 text-right">{p.colVat}</th>
                  <th className="px-4 py-3 text-right">{p.colGrossRsd}</th>
                  <th className="px-4 py-3 text-right print:hidden">{p.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {/* Auto-linked Employee Payroll Bruto II row */}
                {includePayrollCost && summary.payrollCostTotal > 0 && directionFilter !== "prihod" && directionFilter !== "otpremnica" && directionFilter !== "slip" && (
                  <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {p.autoLinked}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {p.pppPdPayroll}
                      </span>
                      <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {interpolate(p.employeesCount, { count: companyEmployees.length })}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {p.totalPayrollDesc}
                      </div>
                      <button
                        onClick={() => setCurrentTab("ledger")}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {p.openPayrollLink}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300">520</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      -{fmtRsd(summary.payrollCostTotal)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-400">0.00</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                      -{fmtRsd(summary.payrollCostTotal)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px] text-slate-400 print:hidden">
                      {p.linkedBadge}
                    </td>
                  </tr>
                )}

                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                      {p.emptyTable}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const Icon = DOC_TYPE_ICONS[rec.docType] || FileText;
                    const grossRsd = toRsdAmount(rec.grossAmount, rec.currency);
                    const isRev = rec.direction === "prihod";
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                            <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{p.docTypes?.[rec.docType] || DOCUMENT_TYPES[rec.docType]?.short || rec.docType}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {rec.docNumber}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 max-w-xs">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {rec.partnerName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {rec.partnerPib ? `PIB ${rec.partnerPib} · ` : ""}
                            {rec.description}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                          {rec.konto}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {fmtRsd(rec.netAmount)} {rec.currency !== "RSD" ? rec.currency : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {fmtRsd(rec.vatAmount)}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                            isRev
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isRev ? "+" : "-"}
                          {fmtRsd(grossRsd)}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap print:hidden">
                          <button
                            onClick={() => openEditRecord(rec)}
                            title={p.editEntryTitle}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteFinancialRecord(rec.id)}
                            title={p.deleteEntryTitle}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry / Edit Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <form
            onSubmit={handleSaveManual}
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {editingRecordId ? p.modalEditTitle : p.modalNewTitle}
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.colDir}</label>
                <select
                  value={manualForm.direction}
                  onChange={(e) => setManualForm({ ...manualForm, direction: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="prihod">{p.modalDirRev}</option>
                  <option value="rashod">{p.modalDirExp}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.docTypeLabel}</label>
                <select
                  value={manualForm.docType}
                  onChange={(e) => setManualForm({ ...manualForm, docType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {Object.values(DOCUMENT_TYPES).map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {p.docTypes?.[dt.id] || dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalDate}</label>
                <input
                  type="date"
                  required
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.docNumLabel}</label>
                <input
                  type="text"
                  required
                  value={manualForm.docNumber}
                  onChange={(e) => setManualForm({ ...manualForm, docNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalPartner}</label>
                <input
                  type="text"
                  required
                  value={manualForm.partnerName}
                  onChange={(e) => setManualForm({ ...manualForm, partnerName: e.target.value })}
                  placeholder={p.modalPartnerPh}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalPib}</label>
                <input
                  type="text"
                  value={manualForm.partnerPib}
                  onChange={(e) => setManualForm({ ...manualForm, partnerPib: e.target.value })}
                  placeholder="109876543"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalKonto}</label>
                <select
                  value={manualForm.konto}
                  onChange={(e) => setManualForm({ ...manualForm, konto: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {Object.values(KONTNI_OKVIR_CATALOG).map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.code} — {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalCurrency}</label>
                <select
                  value={manualForm.currency}
                  onChange={(e) => setManualForm({ ...manualForm, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                >
                  <option value="RSD">RSD</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.netBaseLabel}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={manualForm.netAmount}
                  onChange={(e) => updateManualAmount("netAmount", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums text-right"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalVatRate}</label>
                <select
                  value={manualForm.vatRate}
                  onChange={(e) => updateManualAmount("vatRate", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                >
                  <option value={20}>20%</option>
                  <option value={10}>10%</option>
                  <option value={0}>0%</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.vatAmountLabel}</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualForm.vatAmount}
                  onChange={(e) => updateManualAmount("vatAmount", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums text-right"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalGrossTotal}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={manualForm.grossAmount}
                  onChange={(e) => updateManualAmount("grossAmount", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold tabular-nums text-right"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 dark:text-slate-400 mb-1">{p.modalDesc}</label>
                <input
                  type="text"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  placeholder={p.modalDescPh}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                {editingRecordId ? p.modalSave : p.modalPost}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
