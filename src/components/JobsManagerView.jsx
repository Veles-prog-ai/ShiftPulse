import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Briefcase, Plus, Edit3, Trash2, Crown } from "lucide-react";
import { JobModal } from "./JobModal";
export const JobsManagerView = () => {
  const { jobs, deleteJob, shifts, isPremium, openSubscriptionModal } =
    useShift();
  const { t } = useLanguage();
  const [editingJob, setEditingJob] = useState(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const getShiftCountForJob = (jobId) => {
    return shifts.filter((s) => s.jobId === jobId).length;
  };
  const isAtFreeLimit = !isPremium && jobs.length >= 2;
  const handleCreateJobClick = () => {
    if (isAtFreeLimit) {
      openSubscriptionModal();
    } else {
      setIsCreatingJob(true);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            <span>{t.jobs.badge}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPremium ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
            >
              {isPremium ? "Unlimited (PRO)" : `${jobs.length} / 2 (Free Tier)`}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {t.jobs.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.jobs.subtitle}
          </p>
        </div>

        <button
          onClick={handleCreateJobClick}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white shadow-sm transition-all self-start sm:self-auto ${isAtFreeLimit ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold" : "bg-indigo-600 hover:bg-indigo-500"}`}
          title={isAtFreeLimit ? t.premium.unlimitedJobsLocked : t.jobs.addJob}
        >
          {isAtFreeLimit ? (
            <Crown className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>
            {isAtFreeLimit ? "Unlock Unlimited (PRO)" : t.jobs.addJob}
          </span>
        </button>
      </div>

      {/* Jobs Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {jobs.map((job) => {
          const shiftCount = getShiftCountForJob(job.id);
          return (
            <div
              key={job.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Color Indicator + Title + Actions */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: job.color }}
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {job.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {job.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingJob(job)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t.jobs.editJob}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {jobs.length > 1 && (
                      <button
                        onClick={() => {
                          if (
                            confirm(`${t.jobs.deleteConfirm} (${job.name})`)
                          ) {
                            deleteJob(job.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t.jobs.deleteJob}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Compensation Rate Badge */}
                <div className="py-3 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t.payroll.baseRate}
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                    {job.currency}
                    {job.baseHourlyRate.toFixed(2)}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      /h
                    </span>
                  </div>
                </div>

                {/* Rules List */}
                <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  {/* Pay Cycle */}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">
                      {t.payroll.payCycle}:
                    </span>
                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      {job.payCycle}
                    </span>
                  </div>

                  {/* Overtime Policy */}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">
                      {t.jobs.overtimeRule}:
                    </span>
                    <span className="font-medium">
                      {job.overtimeRules?.enabled
                        ? `>${job.overtimeRules.dailyThresholdHours}h (${job.overtimeRules.dailyOtMultiplier}x)`
                        : t.common.none}
                    </span>
                  </div>

                  {/* Night Differential Policy */}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">
                      {t.jobs.nightDiffRule}:
                    </span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {job.differentialRules?.nightDiffEnabled
                        ? `${job.differentialRules.nightStartTime}-${job.differentialRules.nightEndTime} (+${job.differentialRules.nightDiffValue}${job.differentialRules.nightDiffType === "percentage" ? "%" : job.currency + "/h"})`
                        : t.common.none}
                    </span>
                  </div>

                  {/* Weekend Differential */}
                  {job.differentialRules?.weekendBonusMultiplier > 1 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">
                        {t.payroll.weekendBonus}:
                      </span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {(
                          (job.differentialRules.weekendBonusMultiplier - 1) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  )}

                  {/* Routine Break Policy */}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">
                      {t.jobs.routineBreakRule}:
                    </span>
                    <span className="font-medium">
                      {job.routineBreakRules?.enabled
                        ? `${job.routineBreakRules.durationMinutes}m ${job.routineBreakRules.isPaid ? t.common.paid : t.common.unpaid} (>${job.routineBreakRules.thresholdHours}h)`
                        : t.common.none}
                    </span>
                  </div>

                  {/* Tax Withholding */}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">{t.jobs.taxesRule}:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {job.taxAndDeductions?.estimatedTaxRatePercent || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer: Shifts on Record */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{t.jobs.shiftsLogged}:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {shiftCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Job Modal */}
      {editingJob && (
        <JobModal job={editingJob} onClose={() => setEditingJob(null)} />
      )}

      {/* Add New Job Modal */}
      {isCreatingJob && (
        <JobModal job={null} onClose={() => setIsCreatingJob(false)} />
      )}
    </div>
  );
};
