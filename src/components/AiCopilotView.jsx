import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Upload,
  Mail,
  Copy,
  Send,
  Check,
  ShieldCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
export const AiCopilotView = () => {
  const { shifts, jobs, addJobFromAi, activeCompany } = useShift();
  const { t } = useLanguage();
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [docError, setDocError] = useState(null);
  const [jobSaved, setJobSaved] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [messageText, setMessageText] = useState(t.aiCopilot.defaultMessage);
  const [loadingConflict, setLoadingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState(null);
  const [copiedReply, setCopiedReply] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoadingDoc(true);
    setDocError(null);
    setDocResult(null);
    setJobSaved(false);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(",")[1];
      try {
        const response = await fetch("/api/legal/analyze-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: base64String,
            mimeType: file.type,
          }),
        });
        const data = await response.json();
        if (data.success) {
          setDocResult(data);
        } else {
          setDocError(data.error || "Gre\u0161ka tokom AI analize.");
        }
      } catch {
        setDocError("Server connection error.");
      } finally {
        setLoadingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const handleLoadDemoContract = async () => {
    setLoadingDoc(true);
    setDocError(null);
    setJobSaved(false);
    setFileName("Ugovor_O_Radu_Primer.pdf");
    try {
      const response = await fetch("/api/legal/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: "demo-sample-data",
          mimeType: "application/pdf",
        }),
      });
      const data = await response.json();
      setDocResult(data);
    } catch {
      setDocResult({
        success: true,
        contractAnalysis: {
          employerName: "General Logistics / Hospital",
          detectedRole: "Charge Nurse / Operator",
          baseHourlyRate: 450,
          currency: "RSD",
        },
        extractedRules: {
          dailyOvertimeThreshold: 8,
          overtimeMultiplier: 1.26,
          nightDiffEnabled: true,
          nightShiftWindow: { start: "22:00", end: "06:00" },
          nightDiffValue: 26,
        },
        legalComplianceAlerts: [
          "Otkazni rok u ugovoru iznosi 45 dana, \u0161to je iznad zakonskog maksimuma od 30 dana.",
          "No\u0107ni rad tarifiran sa zakonskim bonusom od 26%.",
        ],
      });
    } finally {
      setLoadingDoc(false);
    }
  };
  const handleSaveAiJob = async () => {
    if (!docResult) return;
    addJobFromAi(docResult);
    try {
      await fetch("/api/legal/log-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pibKompanije: activeCompany?.pib || "102345678",
          operaterIme: "Ovla\u0161\u0107eni Knjigovo\u0111a",
          aiPredlog: docResult,
          konacniPodaci: docResult.contractAnalysis,
          akcija: "odobreno_skeniranje",
        }),
      });
    } catch (err) {
      console.error("Log server nije dostupan, podaci sa\u010Duvani lokalno.");
    }
    setJobSaved(true);
  };
  const handleCheckConflicts = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setLoadingConflict(true);
    setConflictResult(null);
    try {
      const response = await fetch("/api/schedule/detect-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMessage: messageText,
          existingShifts: shifts,
          jobs,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setConflictResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConflict(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-800/60 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-indigo-300">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{t.aiCopilot.badge}</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
            AI Studio Intelligence
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
          {t.aiCopilot.title}
        </h2>
        <p className="text-xs text-indigo-200/90 max-w-xl">
          {t.aiCopilot.subtitle}
        </p>
      </div>

      {/* MODUL A: Pametni AI Skener Dokumenata */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {t.aiCopilot.modulA}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.aiCopilot.uploadPrompt}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadDemoContract}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shrink-0"
          >
            {t.aiCopilot.testSample}
          </button>
        </div>

        {/* Upload Dropzone */}
        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950/40 cursor-pointer transition-colors group">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            disabled={loadingDoc}
          />
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mx-auto mb-2 transition-colors" />
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {loadingDoc ? (
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                {t.aiCopilot.analyzing}
              </span>
            ) : fileName ? (
              <span className="text-slate-900 dark:text-white font-mono">
                {fileName} ({t.common.edit})
              </span>
            ) : (
              t.aiCopilot.selectFile
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            JPG, PNG, PDF · Google Gemini Multimodal
          </p>
        </div>

        {docError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-mono">
            {docError}
          </div>
        )}

        {/* Analizirani Rezultat */}
        {docResult && (
          <div className="space-y-3 font-mono text-xs animate-fade-in pt-1">
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-sans">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {t.aiCopilot.modulA}
                </span>
                {!jobSaved ? (
                  <button
                    onClick={handleSaveAiJob}
                    type="button"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold rounded-xl text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{t.aiCopilot.saveAsJob}</span>
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-sans font-bold bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {t.aiCopilot.jobSaved}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {t.aiCopilot.detectedEmployer}:
                  </span>
                  <strong className="text-slate-900 dark:text-white font-sans">
                    {docResult.contractAnalysis.employerName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {t.aiCopilot.detectedRole}:
                  </span>
                  <strong className="text-slate-900 dark:text-white font-sans">
                    {docResult.contractAnalysis.detectedRole}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {t.aiCopilot.baseRate}:
                  </span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {docResult.contractAnalysis.baseHourlyRate}{" "}
                    {docResult.contractAnalysis.currency}/h
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {t.aiCopilot.nightDiffBonus}:
                  </span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                    +{docResult.extractedRules.nightDiffValue}%
                  </strong>
                </div>
              </div>
            </div>

            {/* Pravna Upozorenja i Usklađenost */}
            {docResult.legalComplianceAlerts &&
              docResult.legalComplianceAlerts.length > 0 && (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2">
                  <div className="text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2 font-sans">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{t.aiCopilot.legalAlerts}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-xs">
                    {docResult.legalComplianceAlerts.map((alert, i) => (
                      <li key={i}>{alert}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </div>

      {/* MODUL B: Pametni Monitor Konflikata u Smenama (LinkedIn / Email / Poruke) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t.aiCopilot.modulB}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.aiCopilot.messageLabel}
          </p>
        </div>

        <form onSubmit={handleCheckConflicts} className="space-y-3">
          <textarea
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={t.aiCopilot.defaultMessage}
            className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={loadingConflict}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {loadingConflict ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{t.aiCopilot.checking}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{t.aiCopilot.checkConflict}</span>
              </>
            )}
          </button>
        </form>

        {conflictResult && (
          <div className="space-y-3 font-mono text-xs animate-fade-in pt-1">
            {/* Status Konflikta */}
            {conflictResult.conflictDetected ? (
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-1">
                <div className="text-rose-800 dark:text-rose-400 font-bold flex items-center gap-2 font-sans">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{t.aiCopilot.conflictFound}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-xs">
                  {conflictResult.conflictDetails}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 font-sans text-emerald-800 dark:text-emerald-300 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.aiCopilot.noConflict}</span>
              </div>
            )}

            {/* Predloženi Odgovor */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 relative group">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">
                {t.aiCopilot.suggestedReply}:
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-sans italic whitespace-pre-line text-xs leading-relaxed pr-8">
                "{conflictResult.suggestedReplyTemplate}"
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    conflictResult.suggestedReplyTemplate,
                  );
                  setCopiedReply(true);
                  setTimeout(() => setCopiedReply(false), 2e3);
                }}
                className="absolute top-3 right-3 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:text-indigo-600 transition-colors shadow-2xs"
                title={t.aiCopilot.copyReply}
              >
                {copiedReply ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODUL C: Pravni Okvir & Uslovi Korišćenja (Terms of Service / Privacy) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <button
          type="button"
          onClick={() => setShowTerms(!showTerms)}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>{t.aiCopilot.termsTitle}</span>
          </div>
          {showTerms ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showTerms && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed font-sans animate-fade-in">
            <div>
              <p className="mt-0.5">{t.aiCopilot.termsNotice1}</p>
            </div>
            <div>
              <p className="mt-0.5">{t.aiCopilot.termsNotice2}</p>
            </div>
            <div>
              <p className="mt-0.5">{t.aiCopilot.termsNotice3}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
