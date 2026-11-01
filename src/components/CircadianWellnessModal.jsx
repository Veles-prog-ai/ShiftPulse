import { useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { getShiftCategory } from "../utils/payrollCalculator";
import {
  X,
  Moon,
  Sun,
  Coffee,
  BedDouble,
  Clock,
  Eye,
  HeartPulse,
  CheckCircle2,
  Crown,
  AlertTriangle,
} from "lucide-react";
export const CircadianWellnessModal = ({ onClose }) => {
  const { shifts, jobs, isPremium, openSubscriptionModal } = useShift();
  const { t, formatDate } = useLanguage();
  const nextShift = useMemo(() => {
    const today = /* @__PURE__ */ new Date().toISOString().split("T")[0];
    const upcoming = shifts
      .filter((s) => s.status !== "cancelled" && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] || shifts[0] || null;
  }, [shifts]);
  const targetJob = nextShift
    ? jobs.find((j) => j.id === nextShift.jobId)
    : null;
  const isNight = nextShift
    ? getShiftCategory(
        nextShift.startTime,
        nextShift.endTime,
        nextShift.crossesMidnight,
      ) === "night"
    : false;
  const consecutiveNightsCount = useMemo(() => {
    let count = 0;
    const sorted = [...shifts]
      .filter((s) => s.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((s) => {
      if (
        getShiftCategory(s.startTime, s.endTime, s.crossesMidnight) === "night"
      ) {
        count++;
      }
    });
    return Math.min(count, 4);
  }, [shifts]);
  const isHighFatigue = consecutiveNightsCount >= 3;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  {t.premium.circadianTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span>PRO Feature</span>
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                {t.premium.circadianSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Pro Lock Notice if user is in Free mode */}
          {!isPremium && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Premium Pro Exclusive Content
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Upgrade to ShiftPulse Pro to unlock live circadian timing
                    alerts and personalised sleep window schedules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  openSubscriptionModal();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shrink-0 transition-colors"
              >
                {t.premium.upgradeToPro}
              </button>
            </div>
          )}

          {/* Next Shift Status Card */}
          {nextShift && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Target Shift Rotation Context
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                  {isNight ? (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <span>
                    {formatDate(nextShift.date)} ({nextShift.startTime} -{" "}
                    {nextShift.endTime})
                  </span>
                  <span className="text-xs font-normal text-slate-500">
                    @ {targetJob ? targetJob.name : "Work"}
                  </span>
                </div>
              </div>

              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto ${isNight ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"}`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {isNight ? "12h Night Shift Cycle" : "Day Shift Cycle"}
                </span>
              </div>
            </div>
          )}

          {/* Biological Protocol Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t.premium.circadianOptimalRoutine}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Core Sleep Window */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {t.premium.circadianSleepWindow}
                </div>
                <div className="font-mono text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  {isNight ? "08:45 \u2013 15:30" : "22:30 \u2013 06:00"}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isNight
                    ? "Immediate morning sleep in 100% dark, cold room (18\xB0C) before cortisol peak."
                    : "Consistent nighttime deep sleep with 7.5 hours anchor window."}
                </p>
              </div>

              {/* Caffeine Cutoff */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {t.premium.circadianCaffeineCutoff}
                </div>
                <div className="font-mono text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {isNight ? "03:00 AM" : "14:00 PM"}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Caffeine half-life is 5-7 hours. Cut off stimulants 4-5 hours
                  before shift end to clear adenosine receptors.
                </p>
              </div>

              {/* Melatonin & Darkness Window */}
              <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {t.premium.circadianMelatoninWindow}
                </div>
                <div className="font-mono text-lg font-extrabold text-sky-600 dark:text-sky-400">
                  {isNight ? "07:15 AM Drive" : "21:00 PM"}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Wear dark sunglasses during morning commute home from night
                  shift to prevent morning sunlight from suppressing melatonin.
                </p>
              </div>
            </div>
          </div>

          {/* Fatigue Index Bar */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>{t.premium.circadianFatigueIndex}</span>
              </span>
              <span
                className={
                  isHighFatigue
                    ? "text-rose-600 font-bold"
                    : "text-emerald-600 font-bold"
                }
              >
                {isHighFatigue
                  ? "Elevated (Consecutive Nights)"
                  : "Balanced Routine"}
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${isHighFatigue ? "w-4/5 bg-gradient-to-r from-amber-500 to-rose-500" : "w-1/3 bg-gradient-to-r from-emerald-500 to-teal-500"}`}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              {isHighFatigue ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{t.premium.circadianScoreWarning}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.premium.circadianScoreGood}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
