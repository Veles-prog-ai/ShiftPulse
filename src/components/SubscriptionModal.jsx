import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  X,
  Crown,
  Check,
  Sparkles,
  Calendar,
  FileSpreadsheet,
  Moon,
  Bell,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
} from "lucide-react";
export const SubscriptionModal = ({ onClose, onOpenCircadian }) => {
  const { isPremium, setIsPremium } = useShift();
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [justActivated, setJustActivated] = useState(false);
  const handleActivatePro = () => {
    setIsPremium(true);
    setJustActivated(true);
    setTimeout(() => {
      setJustActivated(false);
      onClose();
    }, 1500);
  };
  const handleRevertToFree = () => {
    setIsPremium(false);
  };
  const features = [
    {
      title: t.premium.featureNoAds,
      desc: t.premium.featureNoAdsDesc,
      icon: Crown,
      free: false,
      pro: true,
    },
    {
      title: t.premium.featureUnlimitedJobs,
      desc: t.premium.featureUnlimitedJobsDesc,
      icon: Briefcase,
      free: "2 Max",
      pro: "Unlimited",
    },
    {
      title: t.premium.featureCircadianSleep,
      desc: t.premium.featureCircadianSleepDesc,
      icon: Moon,
      free: false,
      pro: true,
    },
    {
      title: t.premium.featureAdvancedRosters,
      desc: t.premium.featureAdvancedRostersDesc,
      icon: Calendar,
      free: "Basic (4-5d)",
      pro: "Full 8d + Custom",
    },
    {
      title: t.premium.featureCsvExport,
      desc: t.premium.featureCsvExportDesc,
      icon: FileSpreadsheet,
      free: false,
      pro: true,
    },
    {
      title: t.premium.featureSmartAlarms,
      desc: t.premium.featureSmartAlarmsDesc,
      icon: Bell,
      free: false,
      pro: true,
    },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-amber-500 via-amber-600 to-indigo-700 text-white overflow-hidden shrink-0">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-indigo-900/30 rounded-full blur-xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-slate-950 flex items-center gap-1 shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>ShiftPulse Pro</span>
            </span>
            {isPremium && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400 text-emerald-950 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{t.premium.proActive}</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {t.premium.modalTitle}
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-lg leading-relaxed">
            {t.premium.modalSubtitle}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-800 dark:text-slate-100">
          {/* Quick Test Mode Switcher for Instant Testing */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{t.premium.testModeToggle}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t.premium.activeTier}:{" "}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {isPremium ? t.premium.proBadge : t.premium.freeBadge}
                </strong>
              </p>
            </div>
            <button
              onClick={() => setIsPremium(!isPremium)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm ${isPremium ? "bg-amber-500 hover:bg-amber-600 text-slate-950" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"}`}
            >
              {isPremium ? (
                <ToggleRight className="w-5 h-5 text-slate-950" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
              <span>
                {isPremium ? t.premium.proBadge : t.premium.freeBadge}
              </span>
            </button>
          </div>

          {/* Pricing Plans Toggle */}
          <div className="grid grid-cols-2 gap-3">
            {/* Annual Plan */}
            <div
              onClick={() => setSelectedPlan("annual")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${selectedPlan === "annual" ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
            >
              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 shadow-sm">
                {t.premium.savePercent}
              </span>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {t.premium.annual}
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  $2.49
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t.premium.perMonth}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                $29.99 {t.premium.perYear}
              </div>
            </div>

            {/* Monthly Plan */}
            <div
              onClick={() => setSelectedPlan("monthly")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === "monthly" ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
            >
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {t.premium.monthly}
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  $3.99
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t.premium.perMonth}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Features Comparison List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Free vs Pro Comparison
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden text-xs">
              {features.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 min-w-[50px]">
                        {typeof item.free === "boolean"
                          ? item.free
                            ? "\u2713"
                            : "\u2014"
                          : item.free}
                      </div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 min-w-[65px] flex items-center justify-end gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {typeof item.pro === "boolean"
                            ? "Included"
                            : item.pro}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            {isPremium ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                ShiftPulse Pro is currently active on this device.
              </span>
            ) : (
              <span>
                14-day free trial. Instant local unlock. No commitments.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isPremium ? (
              <button
                onClick={handleRevertToFree}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t.premium.cancelSubscription}
              </button>
            ) : (
              <button
                onClick={handleActivatePro}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all active:scale-98"
              >
                {justActivated ? (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Unlocked!</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>{t.premium.activateTrial}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
