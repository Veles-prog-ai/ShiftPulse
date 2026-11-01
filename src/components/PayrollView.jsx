import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  DollarSign,
  Printer,
  Moon,
  Sun,
  FileSpreadsheet,
  Shield,
  Crown,
} from "lucide-react";
import { LegalPrivacyModal } from "./LegalPrivacyModal";
import { NativeAdCard } from "./AdBanner";
import {
  calculateJobPayPeriod,
  calculateShiftEarnings,
  formatCurrency,
  formatHoursFriendly,
  getShiftCategory,
} from "../utils/payrollCalculator";
export const PayrollView = () => {
  const {
    jobs,
    shifts,
    activeJobFilter,
    setActiveJobFilter,
    isPremium,
    openSubscriptionModal,
  } = useShift();
  const { t, formatDate } = useLanguage();
  const [periodPreset, setPeriodPreset] = useState("all_october");
  const [customStart, setCustomStart] = useState("2026-10-01");
  const [customEnd, setCustomEnd] = useState("2026-10-31");
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (periodPreset === "all_october") {
      return {
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        periodLabel: t.payroll.allOctober,
      };
    } else if (periodPreset === "biweekly_current") {
      return {
        startDate: "2026-10-12",
        endDate: "2026-10-25",
        periodLabel: t.payroll.biweeklyCurrent,
      };
    } else if (periodPreset === "current_month") {
      const now = /* @__PURE__ */ new Date();
      const y = now.getFullYear();
      const m = (now.getMonth() + 1).toString().padStart(2, "0");
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      return {
        startDate: `${y}-${m}-01`,
        endDate: `${y}-${m}-${lastDay}`,
        periodLabel: t.payroll.currentMonth,
      };
    } else {
      return {
        startDate: customStart,
        endDate: customEnd,
        periodLabel: `${customStart} - ${customEnd}`,
      };
    }
  }, [periodPreset, customStart, customEnd, t]);
  const jobSummaries = useMemo(() => {
    return jobs.map((job) =>
      calculateJobPayPeriod(job, shifts, startDate, endDate),
    );
  }, [jobs, shifts, startDate, endDate]);
  const displayedJobSummaries = useMemo(() => {
    if (activeJobFilter === "all") return jobSummaries;
    return jobSummaries.filter((js) => js.job.id === activeJobFilter);
  }, [jobSummaries, activeJobFilter]);
  const combinedTotals = useMemo(() => {
    let grossPay = 0;
    let netPay = 0;
    let totalHours = 0;
    let regularHours = 0;
    let otHours = 0;
    let nightDiffHours = 0;
    let unpaidBreakMins = 0;
    let totalShifts = 0;
    let estimatedTax = 0;
    let deductions = 0;
    for (const js of displayedJobSummaries) {
      grossPay += js.totalGrossPay;
      netPay += js.estimatedNetPay;
      totalHours += js.totalNetHours;
      regularHours += js.regularHours;
      otHours += js.dailyOtHours + js.doubleTimeHours + js.weeklyOtHours;
      nightDiffHours += js.nightDiffHours;
      unpaidBreakMins += js.unpaidBreakMinutes;
      totalShifts += js.shiftsCount;
      estimatedTax += js.estimatedTaxAmount;
      deductions += js.deductionsAmount;
    }
    return {
      grossPay,
      netPay,
      totalHours,
      regularHours,
      otHours,
      nightDiffHours,
      unpaidBreakMins,
      totalShifts,
      estimatedTax,
      deductions,
    };
  }, [displayedJobSummaries]);
  const itemizedShifts = useMemo(() => {
    const list = [];
    const validJobs =
      activeJobFilter === "all"
        ? jobs
        : jobs.filter((j) => j.id === activeJobFilter);
    for (const job of validJobs) {
      const jobShifts = shifts.filter(
        (s) =>
          s.jobId === job.id &&
          s.date >= startDate &&
          s.date <= endDate &&
          s.status !== "cancelled",
      );
      for (const shift of jobShifts) {
        const calc = calculateShiftEarnings(shift, job);
        list.push({ shift, job, calc });
      }
    }
    return list.sort((a, b) => a.shift.date.localeCompare(b.shift.date));
  }, [jobs, shifts, activeJobFilter, startDate, endDate]);
  const handleExportCsv = () => {
    if (!isPremium) {
      openSubscriptionModal();
      return;
    }
    const headers = [
      "Date",
      "Job Name",
      "Role",
      "Start Time",
      "End Time",
      "Span Hours",
      "Unpaid Break (mins)",
      "Net Hours",
      "Regular Hours",
      "Overtime Hours",
      "Night Diff Hours",
      "Base Hourly Rate",
      "Gross Pay",
    ];
    const rows = itemizedShifts.map((item) => [
      item.shift.date,
      `"${item.job.name}"`,
      `"${item.job.role}"`,
      item.shift.startTime,
      item.shift.endTime,
      item.calc.totalSpanHours.toFixed(2),
      item.calc.unpaidBreakMinutes,
      item.calc.netWorkedHours.toFixed(2),
      item.calc.regularHours.toFixed(2),
      (item.calc.dailyOtHours + item.calc.doubleTimeHours).toFixed(2),
      item.calc.nightDifferentialHours.toFixed(2),
      item.calc.baseRate.toFixed(2),
      item.calc.grossPay.toFixed(2),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `payroll-report-${startDate}-to-${endDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handlePrint = () => {
    window.print();
  };
  return (
    <div className="space-y-6">
      {/* View Header with Period Filter & Actions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>{t.payroll.badge}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {t.payroll.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.payroll.period}:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {periodLabel}
            </span>
          </p>
        </div>

        {/* Period Selector & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value)}
            className="text-xs sm:text-sm font-medium py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all_october">{t.payroll.allOctober}</option>
            <option value="biweekly_current">
              {t.payroll.biweeklyCurrent}
            </option>
            <option value="current_month">{t.payroll.currentMonth}</option>
            <option value="custom">{t.payroll.customRange}</option>
          </select>

          <button
            onClick={handleExportCsv}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors shadow-2xs ${isPremium ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"}`}
            title={
              isPremium ? "Download CSV report" : t.premium.exportCsvLocked
            }
          >
            {isPremium ? (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Crown className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>
              {t.common.export} CSV {!isPremium && "(PRO)"}
            </span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title="Print Paystub / PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.payroll.printReport}</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers if selected */}
      {periodPreset === "custom" && (
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              {t.payroll.startDate}
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              {t.payroll.endDate}
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>
      )}

      {/* Native Sponsor Ad Card for Free users */}
      {!isPremium && <NativeAdCard />}

      {/* High-Level Consolidated KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Gross Pay */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            {t.payroll.totalGross}
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {formatCurrency(combinedTotals.grossPay)}
          </div>
          <span className="text-[11px] text-slate-400 block">
            {combinedTotals.totalShifts} {t.payroll.shiftsWorked}
          </span>
        </div>

        {/* Estimated Net Pay */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            {t.payroll.totalNet}
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
            {formatCurrency(combinedTotals.netPay)}
          </div>
          <span className="text-[11px] text-slate-400 block">
            {t.payroll.taxDeductions}:{" "}
            {formatCurrency(
              combinedTotals.estimatedTax + combinedTotals.deductions,
            )}
          </span>
        </div>

        {/* Total Net Hours */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            {t.payroll.hoursWorked}
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatHoursFriendly(combinedTotals.totalHours)}
          </div>
          <span className="text-[11px] text-slate-400 block">
            -{combinedTotals.unpaidBreakMins}m {t.calendar.unpaidBreaks}
          </span>
        </div>

        {/* Premiums (OT + Night Diff) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            {t.payroll.overtimePay} & {t.payroll.nightDiffPay}
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {formatHoursFriendly(
              combinedTotals.otHours + combinedTotals.nightDiffHours,
            )}
          </div>
          <span className="text-[11px] text-slate-400 block">
            {formatHoursFriendly(combinedTotals.otHours)} OT ·{" "}
            {formatHoursFriendly(combinedTotals.nightDiffHours)}{" "}
            {t.calendar.nightShift}
          </span>
        </div>
      </div>

      {/* Individual Job Breakdown Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {t.payroll.perJobBreakdown}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {displayedJobSummaries.length}{" "}
            {displayedJobSummaries.length === 1 ? t.jobs.badge : t.jobs.badge}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedJobSummaries.map((summary) => {
            const { job } = summary;
            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Job Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: job.color }}
                      />
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {job.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {job.role} · {job.currency}
                          {job.baseHourlyRate.toFixed(2)}/h
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {job.payCycle}
                    </span>
                  </div>

                  {/* Hours Breakdown List */}
                  <div className="py-3 space-y-2 text-xs border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t.calendar.netHours}:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                        {formatHoursFriendly(summary.totalNetHours)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t.payroll.regularPay}:
                      </span>
                      <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {formatCurrency(summary.grossRegularPay, job.currency)}
                      </span>
                    </div>

                    {summary.grossOtPay > 0 && (
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span>
                          {t.payroll.overtimePay} (
                          {formatHoursFriendly(
                            summary.dailyOtHours +
                              summary.doubleTimeHours +
                              summary.weeklyOtHours,
                          )}
                          ):
                        </span>
                        <span className="font-bold font-mono tabular-nums">
                          +{formatCurrency(summary.grossOtPay, job.currency)}
                        </span>
                      </div>
                    )}

                    {summary.grossNightDiffPay > 0 && (
                      <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                        <span>
                          {t.payroll.nightDiffPay} (
                          {formatHoursFriendly(summary.nightDiffHours)}):
                        </span>
                        <span className="font-bold font-mono tabular-nums">
                          +
                          {formatCurrency(
                            summary.grossNightDiffPay,
                            job.currency,
                          )}
                        </span>
                      </div>
                    )}

                    {summary.grossWeekendPay > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>{t.payroll.weekendBonus}:</span>
                        <span className="font-bold font-mono tabular-nums">
                          +
                          {formatCurrency(
                            summary.grossWeekendPay,
                            job.currency,
                          )}
                        </span>
                      </div>
                    )}

                    {summary.unpaidBreakMinutes > 0 && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{t.calendar.unpaidBreaks}:</span>
                        <span className="font-mono tabular-nums">
                          -{summary.unpaidBreakMinutes}m
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Taxes & Deductions */}
                  <div className="py-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>
                        {t.jobModal.taxRate} (
                        {job.taxAndDeductions.estimatedTaxRatePercent}%):
                      </span>
                      <span className="font-mono tabular-nums text-rose-500">
                        -
                        {formatCurrency(
                          summary.estimatedTaxAmount,
                          job.currency,
                        )}
                      </span>
                    </div>
                    {summary.deductionsAmount > 0 && (
                      <div className="flex justify-between">
                        <span>{t.jobModal.fixedDeduction}:</span>
                        <span className="font-mono tabular-nums text-rose-500">
                          -
                          {formatCurrency(
                            summary.deductionsAmount,
                            job.currency,
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Totals */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {t.payroll.totalGross}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatCurrency(summary.totalGrossPay, job.currency)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {t.payroll.totalNet}
                    </span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                      {formatCurrency(summary.estimatedNetPay, job.currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Itemized Shift Paystub Table (Zero-pill, high tabular rigor) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.payroll.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.payroll.subtitle}
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-400">
            {itemizedShifts.length} {t.shifts.shiftsCount}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-2.5 px-3">{t.common.date}</th>
                <th className="py-2.5 px-3">
                  {t.jobs.badge} / {t.jobModal.role}
                </th>
                <th className="py-2.5 px-3">{t.common.status}</th>
                <th className="py-2.5 px-3">{t.calendar.workingHours}</th>
                <th className="py-2.5 px-3 text-right">
                  {t.calendar.unpaidBreaks}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {t.calendar.netHours}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {t.payroll.nightDiffPay}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {t.payroll.overtimePay}
                </th>
                <th className="py-2.5 px-3 text-right font-bold">
                  {t.payroll.totalGross}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {itemizedShifts.map(({ shift, job, calc }) => {
                const shiftCategory = getShiftCategory(
                  shift.startTime,
                  shift.endTime,
                  shift.crossesMidnight,
                );
                const isNight = shiftCategory === "night";
                return (
                  <tr
                    key={shift.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {formatDate(shift.date, {
                        includeDayOfWeek: true,
                        short: true,
                      })}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-sans">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: job.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {job.name}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-sans">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isNight ? "bg-slate-900 text-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-700/60" : "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700"}`}
                      >
                        {isNight ? (
                          <Moon className="w-2.5 h-2.5" />
                        ) : (
                          <Sun className="w-2.5 h-2.5" />
                        )}
                        {isNight ? t.calendar.nightShift : t.calendar.dayShift}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {shift.startTime} - {shift.endTime}{" "}
                      {shift.crossesMidnight ? "(+1d)" : ""}
                    </td>

                    <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                      {calc.unpaidBreakMinutes > 0
                        ? `-${calc.unpaidBreakMinutes}m`
                        : "0m"}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {calc.netWorkedHours.toFixed(2)}h
                    </td>

                    <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400">
                      {calc.nightDifferentialHours > 0
                        ? `+${calc.nightDifferentialHours.toFixed(1)}h`
                        : "-"}
                    </td>

                    <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">
                      {calc.dailyOtHours + calc.doubleTimeHours > 0
                        ? `+${formatCurrency(calc.dailyOtPay + calc.doubleTimePay, job.currency)}`
                        : "-"}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(calc.grossPay, job.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legal & Payroll Estimation Disclaimer Footer Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400">
        <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t.legal.tabDisclaimer}:
          </span>{" "}
          {t.legal.disclaimerSection1Body.slice(0, 160)}...
          <button
            onClick={() => setIsLegalModalOpen(true)}
            className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-block"
          >
            {t.legal.openPolicy}
          </button>
        </div>
      </div>

      {isLegalModalOpen && (
        <LegalPrivacyModal onClose={() => setIsLegalModalOpen(false)} />
      )}
    </div>
  );
};
