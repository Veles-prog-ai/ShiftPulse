import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { AlertTriangle, CheckCircle, Copy, Mail, Check } from "lucide-react";

export const ConflictMonitor = () => {
  const { shifts, jobs } = useShift();
  const { t } = useLanguage();
  const h = t.ui.aiCopilotHitl;
  const [messageText, setMessageText] = useState(t.aiCopilot.defaultMessage);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCheckConflicts = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setLoading(true);
    setResult(null);
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
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReply = () => {
    if (!result?.suggestedReplyTemplate) return;
    navigator.clipboard.writeText(result.suggestedReplyTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
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
          placeholder={h.legacyPlaceholder}
          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans focus:outline-none focus:border-indigo-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
        >
          {loading ? h.legacyLoading : t.aiCopilot.checkConflict}
        </button>
      </form>

      {result && (
        <div className="space-y-3 animate-fade-in text-xs font-mono">
          {result.conflictDetected ? (
            <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                {t.aiCopilot.conflictFound}
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                {result.conflictDetails}
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4" />
              <span>{h.legacyNoOverlap}</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 relative group">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              {t.aiCopilot.suggestedReply}
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-sans italic whitespace-pre-line">
              {result.suggestedReplyTemplate}
            </p>
            <button
              onClick={handleCopyReply}
              className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:text-indigo-600 transition-colors"
              title={t.aiCopilot.copyReply}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
