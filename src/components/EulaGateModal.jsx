import { useState } from "react";
import { ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";

export const EulaGateModal = ({ onOpenLegal }) => {
  const { eulaAccepted, acceptEula } = useShift();
  const { t } = useLanguage();
  const [checked, setChecked] = useState(false);
  const [showError, setShowError] = useState(false);

  if (eulaAccepted) return null;

  const g = t.ui?.eulaGate || {};
  const bullets = Array.isArray(g.ipBullets) ? g.ipBullets : [];
  const metaFields = Array.isArray(g.metadataFields)
    ? g.metadataFields
    : ["client_id", "operator_id", "ai_action", "operator_decision"];

  const handleAccept = () => {
    if (!checked) {
      setShowError(true);
      return;
    }
    acceptEula();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-1">
              {g.badge}
            </span>
            <h2 className="text-lg font-extrabold leading-tight">{g.title}</h2>
            <p className="text-xs text-slate-300 mt-1">{g.subtitle}</p>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-sm">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{g.ipTitle}</span>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {bullets.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{g.privacyTitle}</span>
            </div>
            <p className="text-xs text-emerald-900/90 dark:text-emerald-200 leading-relaxed">
              {g.privacyBody}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {metaFields.map((field) => (
                <code
                  key={field}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-[11px] font-mono text-emerald-800 dark:text-emerald-300"
                >
                  {field}
                </code>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => onOpenLegal?.("privacy")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              {g.readFullPrivacy}
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal?.("terms")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              {g.readFullTerms}
            </button>
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                setChecked(e.target.checked);
                if (e.target.checked) setShowError(false);
              }}
              className="mt-0.5 w-4 h-4 rounded accent-emerald-600 shrink-0"
            />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
              {g.checkboxLabel}
            </span>
          </label>

          {showError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{g.hintMustCheck}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleAccept}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            {g.acceptBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
