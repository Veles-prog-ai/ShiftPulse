import { useState } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  HardDrive,
  Scale,
  FileSearch,
  Landmark,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { parseRawDocumentText } from "../utils/documentAnalyzerEngine";

const ONBOARDING_STORAGE_KEY = "shiftpulse_onboarding_v1";

const SAMPLE_INVOICE_TEXT = [
  "RACUN BR: INV-RS-2026-0041",
  "Datum prometa: 15.05.2026",
  "Dobavljac: VELEPRODAJA ALFA DOO BEOGRAD",
  "PIB: 100001019",
  "Poreska osnovica: 100.000,00 RSD",
  "PDV 20%: 20.000,00 RSD",
  "Ukupno za uplatu: 120.000,00 RSD",
  "Svrha: Nabavka kancelarijske opreme i materijala",
].join("\n");

function loadCompletedSteps() {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return { step1: false, step2: false, step3: false, step4: false };
}

export const OnboardingChecklistModal = () => {
  const {
    isOnboardingOpen,
    closeOnboarding,
    workspaceConnected,
    workspaceDisplayName,
    activeCompany,
    openDataModal,
    openAccountsHitl,
    setCurrentTab,
  } = useShift();
  const { t } = useLanguage();
  const c = t.ui?.onboardingChecklist || {};

  const [completed, setCompleted] = useState(() => loadCompletedSteps());
  const [sampleResult, setSampleResult] = useState(null);

  if (!isOnboardingOpen) return null;

  const persistSteps = (next) => {
    setCompleted(next);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const markStepDone = (key) => {
    persistSteps({ ...completed, [key]: true });
  };

  const toggleStep = (key) => {
    persistSteps({ ...completed, [key]: !completed[key] });
  };

  const resetSteps = () => {
    setSampleResult(null);
    persistSteps({ step1: false, step2: false, step3: false, step4: false });
  };

  const effectiveStep1 = Boolean(completed.step1 || workspaceConnected);
  const doneCount = [effectiveStep1, completed.step2, completed.step3, completed.step4].filter(Boolean).length;

  const handleStep1Action = () => {
    markStepDone("step1");
    closeOnboarding();
    openDataModal();
  };

  const handleStep2Action = () => {
    markStepDone("step2");
    closeOnboarding();
    openAccountsHitl();
  };

  const handleRunSampleAnalysis = () => {
    const parsed = parseRawDocumentText(SAMPLE_INVOICE_TEXT, activeCompany || null);
    setSampleResult(parsed);
    markStepDone("step3");
  };

  const handleStep4Action = () => {
    markStepDone("step4");
    closeOnboarding();
    setCurrentTab("bank-orders");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-950 text-white border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                <Sparkles className="w-3 h-3" />
                {c.badge}
              </span>
              {doneCount === 4 && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                  {c.completedBadge}
                </span>
              )}
            </div>
            <h2 className="text-lg font-extrabold">{c.title}</h2>
            <p className="text-xs text-slate-300 mt-0.5">{c.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={closeOnboarding}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={c.dismissBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
              {String(c.progressLabel || "{{done}} / {{total}}")
                .replace("{{done}}", String(doneCount))
                .replace("{{total}}", "4")}
            </span>
            <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(doneCount / 4) * 100}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={resetSteps}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            {c.resetBtn}
          </button>
        </div>

        <div className="p-6 space-y-3.5 overflow-y-auto">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleStep("step1")}
                className="mt-0.5 text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0"
              >
                {effectiveStep1 ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-slate-400" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{c.step1Title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.step1Desc}</p>
                <div className="mt-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                  {workspaceConnected
                    ? `${c.step1StatusOk}${workspaceDisplayName ? ` (${workspaceDisplayName})` : ""}`
                    : c.step1StatusBrowser}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStep1Action}
              className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
            >
              {workspaceConnected ? c.step1CtaManage : c.step1CtaConnect}
            </button>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleStep("step2")}
                className="mt-0.5 text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0"
              >
                {completed.step2 ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-slate-400" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{c.step2Title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.step2Desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStep2Action}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              {c.step2Cta}
            </button>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleStep("step3")}
                  className="mt-0.5 text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0"
                >
                  {completed.step3 ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-slate-400" />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{c.step3Title}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.step3Desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRunSampleAnalysis}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                {c.step3CtaRun}
              </button>
            </div>

            {sampleResult && (
              <div className="ml-8 p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs space-y-1.5">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{c.step3SampleHeading}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500">{c.step3DocLabel}: </span>
                    <span className="font-bold text-slate-900 dark:text-white">{sampleResult.docNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{c.step3PibLabel}: </span>
                    <span className="font-bold text-slate-900 dark:text-white">{sampleResult.partnerPib}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{c.step3KontoLabel}: </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{sampleResult.konto}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{c.step3NetLabel}: </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {Number(sampleResult.netAmount || 0).toLocaleString()} {sampleResult.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">{c.step3VatLabel}: </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {Number(sampleResult.vatAmount || 0).toLocaleString()} {sampleResult.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">{c.step3GrossLabel}: </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {Number(sampleResult.grossAmount || 0).toLocaleString()} {sampleResult.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleStep("step4")}
                className="mt-0.5 text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0"
              >
                {completed.step4 ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-slate-400" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{c.step4Title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.step4Desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStep4Action}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              {c.step4Cta}
            </button>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.reopenHint}</span>
          <button
            type="button"
            onClick={closeOnboarding}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {c.dismissBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
