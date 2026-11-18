import { useEffect, useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { ShieldCheck, HardDrive, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

export const BootSplashScreen = ({ onReady }) => {
  const { workspaceConnected, workspaceDisplayName, isOnline, countryCode } = useShift();
  const { t } = useLanguage();
  const [progress, setProgress] = useState(25);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(65), 160);
    const t2 = setTimeout(() => setProgress(100), 360);
    const t3 = setTimeout(() => {
      setFading(true);
    }, 620);
    const t4 = setTimeout(() => {
      setVisible(false);
      if (onReady) onReady();
    }, 820);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onReady]);

  const handleDismissNow = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      if (onReady) onReady();
    }, 140);
  };

  if (!visible) return null;

  const loadingText =
    progress < 50
      ? t.ui.splash.loadingStep1
      : progress < 90
        ? t.ui.splash.loadingStep2
        : t.ui.splash.loadingStep4;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[70] bg-slate-950 text-slate-100 flex items-center justify-center p-6 transition-opacity duration-200 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-md border border-slate-800 bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
            SP
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {t.ui.header.brandTitle} {t.ui.header.brandPro}
            </h1>
            <p className="text-xs text-slate-400">
              {t.ui.splash.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs border-t border-b border-slate-800 py-4">
          <div className="flex items-center justify-between text-slate-300">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t.ui.splash.badgeLocal}</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="inline-flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>{t.ui.startMenu.workspaceStatusLabel}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
              {workspaceConnected
                ? workspaceDisplayName || t.ui.dataSync.statusConnected
                : t.ui.startMenu.notConnected}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>{t.ui.footer.jurisdiction} · {t.ui.splash.badgeGateway}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {countryCode} · {isOnline ? t.ui.common.online : t.ui.common.offline}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
            <span className="truncate">{loadingText}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDismissNow}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{t.ui.startMenu.enterBtn}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
