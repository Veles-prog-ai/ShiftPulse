import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Coffee, Moon, X } from "lucide-react";
const PRESET_COLORS = [
  "#059669",
  // Emerald
  "#6366f1",
  // Indigo
  "#d97706",
  // Amber
  "#e11d48",
  // Rose
  "#0284c7",
  // Sky
  "#7c3aed",
  // Violet
  "#0d9488",
  // Teal
  "#ea580c",
  // Orange
];
export const JobModal = ({ job, onClose }) => {
  const { addJob, updateJob } = useShift();
  const { t } = useLanguage();
  const [name, setName] = useState(job?.name || "");
  const [role, setRole] = useState(job?.role || "");
  const [color, setColor] = useState(job?.color || PRESET_COLORS[0]);
  const [baseHourlyRate, setBaseHourlyRate] = useState(
    job?.baseHourlyRate ?? 35,
  );
  const [currency, setCurrency] = useState(job?.currency || "$");
  const [payCycle, setPayCycle] = useState(job?.payCycle || "bi-weekly");
  const [routineBreakEnabled, setRoutineBreakEnabled] = useState(
    job?.routineBreakRules?.enabled ?? true,
  );
  const [routineBreakThreshold, setRoutineBreakThreshold] = useState(
    job?.routineBreakRules?.thresholdHours ?? 5,
  );
  const [routineBreakDuration, setRoutineBreakDuration] = useState(
    job?.routineBreakRules?.durationMinutes ?? 30,
  );
  const [routineBreakIsPaid, setRoutineBreakIsPaid] = useState(
    job?.routineBreakRules?.isPaid ?? false,
  );
  const [routineBreakAutoDeduct, setRoutineBreakAutoDeduct] = useState(
    job?.routineBreakRules?.autoDeduct ?? true,
  );
  const [otEnabled, setOtEnabled] = useState(
    job?.overtimeRules?.enabled ?? true,
  );
  const [dailyOtThreshold, setDailyOtThreshold] = useState(
    job?.overtimeRules?.dailyThresholdHours ?? 8,
  );
  const [dailyOtMultiplier, setDailyOtMultiplier] = useState(
    job?.overtimeRules?.dailyOtMultiplier ?? 1.5,
  );
  const [doubleTimeThreshold, setDoubleTimeThreshold] = useState(
    job?.overtimeRules?.doubleTimeThresholdHours ?? 12,
  );
  const [doubleTimeMultiplier, setDoubleTimeMultiplier] = useState(
    job?.overtimeRules?.doubleTimeMultiplier ?? 2,
  );
  const [weeklyOtThreshold, setWeeklyOtThreshold] = useState(
    job?.overtimeRules?.weeklyThresholdHours ?? 40,
  );
  const [nightDiffEnabled, setNightDiffEnabled] = useState(
    job?.differentialRules?.nightDiffEnabled ?? true,
  );
  const [nightStartTime, setNightStartTime] = useState(
    job?.differentialRules?.nightStartTime || "22:00",
  );
  const [nightEndTime, setNightEndTime] = useState(
    job?.differentialRules?.nightEndTime || "06:00",
  );
  const [nightDiffType, setNightDiffType] = useState(
    job?.differentialRules?.nightDiffType || "percentage",
  );
  const [nightDiffValue, setNightDiffValue] = useState(
    job?.differentialRules?.nightDiffValue ?? 15,
  );
  const [weekendBonusMultiplier, setWeekendBonusMultiplier] = useState(
    job?.differentialRules?.weekendBonusMultiplier ?? 1.15,
  );
  const [taxRatePercent, setTaxRatePercent] = useState(
    job?.taxAndDeductions?.estimatedTaxRatePercent ?? 20,
  );
  const [fixedDeduction, setFixedDeduction] = useState(
    job?.taxAndDeductions?.fixedDeductionPerPeriod ?? 50,
  );
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const jobData = {
      name: name.trim(),
      role: role.trim() || "Employee",
      color,
      baseHourlyRate: Number(baseHourlyRate) || 0,
      currency,
      payCycle,
      payPeriodAnchorDate:
        job?.payPeriodAnchorDate ||
        /* @__PURE__ */ new Date().toISOString().split("T")[0],
      routineBreakRules: {
        enabled: routineBreakEnabled,
        thresholdHours: Number(routineBreakThreshold) || 5,
        durationMinutes: Number(routineBreakDuration) || 30,
        isPaid: routineBreakIsPaid,
        autoDeduct: routineBreakAutoDeduct,
      },
      overtimeRules: {
        enabled: otEnabled,
        dailyThresholdHours: Number(dailyOtThreshold) || 8,
        dailyOtMultiplier: Number(dailyOtMultiplier) || 1.5,
        doubleTimeThresholdHours: Number(doubleTimeThreshold) || 12,
        doubleTimeMultiplier: Number(doubleTimeMultiplier) || 2,
        weeklyThresholdHours: Number(weeklyOtThreshold) || 40,
        weeklyOtMultiplier: 1.5,
      },
      differentialRules: {
        nightDiffEnabled,
        nightStartTime,
        nightEndTime,
        nightDiffType,
        nightDiffValue: Number(nightDiffValue) || 0,
        weekendBonusMultiplier: Number(weekendBonusMultiplier) || 1,
      },
      taxAndDeductions: {
        estimatedTaxRatePercent: Number(taxRatePercent) || 0,
        fixedDeductionPerPeriod: Number(fixedDeduction) || 0,
      },
    };
    if (job) {
      updateJob(job.id, jobData);
    } else {
      addJob(jobData);
    }
    onClose();
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3
              id="job-modal-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              {job ? t.jobModal.titleEdit : t.jobModal.titleNew}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
          {/* 1. Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.jobModal.companyName} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hospital, Freight, Logistics"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.jobModal.role}
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Night Charge RN"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.payroll.payCycle}
                </label>
                <select
                  value={payCycle}
                  onChange={(e) => setPayCycle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="weekly">{t.payroll.weekly}</option>
                  <option value="bi-weekly">{t.payroll.biWeekly}</option>
                  <option value="semi-monthly">{t.payroll.semiMonthly}</option>
                  <option value="monthly">{t.payroll.monthly}</option>
                </select>
              </div>
            </div>

            {/* Base Hourly Rate & Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.jobModal.currency}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                >
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="RSD">RSD (Динар)</option>
                  <option value="CHF">CHF</option>
                  <option value="£">£ (GBP)</option>
                  <option value="A$">A$ (AUD)</option>
                  <option value="C$">C$ (CAD)</option>
                  <option value="¥">¥ (JPY)</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.jobModal.baseRate} *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={baseHourlyRate}
                    onChange={(e) => setBaseHourlyRate(Number(e.target.value))}
                    className="w-full text-xs p-2.5 pl-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Badge Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.jobModal.color}
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-offset-2 ring-slate-900 dark:ring-white" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2. Routine Break Policy */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                {t.jobModal.breakSettings}
              </h4>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={routineBreakEnabled}
                  onChange={(e) => setRoutineBreakEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{t.common.active}</span>
              </label>
            </div>

            {routineBreakEnabled && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.jobModal.threshold} (h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={routineBreakThreshold}
                      onChange={(e) =>
                        setRoutineBreakThreshold(Number(e.target.value))
                      }
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.jobModal.durationMin}
                    </label>
                    <input
                      type="number"
                      value={routineBreakDuration}
                      onChange={(e) =>
                        setRoutineBreakDuration(Number(e.target.value))
                      }
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routineBreakIsPaid}
                      onChange={(e) => setRoutineBreakIsPaid(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>{t.jobModal.isPaidBreak}</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routineBreakAutoDeduct}
                      onChange={(e) =>
                        setRoutineBreakAutoDeduct(e.target.checked)
                      }
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>{t.jobModal.autoDeductBreak}</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 3. Night Differential & Weekend Bonus */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                {t.jobModal.nightSettings}
              </h4>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={nightDiffEnabled}
                  onChange={(e) => setNightDiffEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>{t.jobModal.enableNight}</span>
              </label>
            </div>

            {nightDiffEnabled && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.jobModal.nightStart}
                    </label>
                    <input
                      type="time"
                      value={nightStartTime}
                      onChange={(e) => setNightStartTime(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.jobModal.nightEnd}
                    </label>
                    <input
                      type="time"
                      value={nightEndTime}
                      onChange={(e) => setNightEndTime(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.jobModal.diffType}
                    </label>
                    <select
                      value={nightDiffType}
                      onChange={(e) => setNightDiffType(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="percentage">
                        {t.jobModal.percentage} (+%)
                      </option>
                      <option value="fixed_hourly">
                        {t.jobModal.fixedHourly} (+/h)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.jobModal.diffValue}{" "}
                      {nightDiffType === "percentage"
                        ? "(%)"
                        : `(${currency}/h)`}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={nightDiffValue}
                      onChange={(e) =>
                        setNightDiffValue(Number(e.target.value))
                      }
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.jobModal.weekendBonus} (e.g. 1.15 = +15%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={weekendBonusMultiplier}
                    onChange={(e) =>
                      setWeekendBonusMultiplier(Number(e.target.value))
                    }
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Overtime & Taxes */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t.jobModal.otSettings}
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.jobModal.dailyThreshold} (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={dailyOtThreshold}
                  onChange={(e) => setDailyOtThreshold(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.jobModal.doubleThreshold} (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={doubleTimeThreshold}
                  onChange={(e) =>
                    setDoubleTimeThreshold(Number(e.target.value))
                  }
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.jobModal.taxRate} (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.jobModal.fixedDeduction} ({currency})
                </label>
                <input
                  type="number"
                  step="1"
                  value={fixedDeduction}
                  onChange={(e) => setFixedDeduction(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.jobModal.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            >
              {t.jobModal.saveJob}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
