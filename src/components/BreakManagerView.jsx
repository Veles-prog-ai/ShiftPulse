import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Coffee, Play, Square, Trash2, Info } from "lucide-react";
import {
  formatHoursFriendly,
  formatCurrency,
  calculateShiftEarnings,
} from "../utils/payrollCalculator";
export const BreakManagerView = () => {
  const {
    jobs,
    shifts,
    activeClock,
    clockIn,
    clockOut,
    startLiveBreak,
    endLiveBreak,
    addBreakToShift,
    removeBreakFromShift,
    updateBreakInShift,
  } = useShift();
  const { t, formatDate } = useLanguage();
  const [selectedShiftId, setSelectedShiftId] = useState(() => {
    return shifts[0]?.id || "";
  });
  const [manualType, setManualType] = useState("irregular");
  const [breakName, setBreakName] = useState("Unplanned Equipment Downtime");
  const [breakStartTime, setBreakStartTime] = useState("13:00");
  const [breakEndTime, setBreakEndTime] = useState("13:30");
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(30);
  const [isPaid, setIsPaid] = useState(false);
  const [useTimeRange, setUseTimeRange] = useState(true);
  const [liveBreakPreset, setLiveBreakPreset] = useState("Rest Break");
  const [liveBreakPaid, setLiveBreakPaid] = useState(false);
  const targetShift = shifts.find((s) => s.id === selectedShiftId) || shifts[0];
  const targetJob = targetShift
    ? jobs.find((j) => j.id === targetShift.jobId)
    : null;
  const targetCalc =
    targetShift && targetJob
      ? calculateShiftEarnings(targetShift, targetJob)
      : null;
  const handleAddManualBreak = (e) => {
    e.preventDefault();
    if (!targetShift) return;
    let duration = Number(breakDurationMinutes) || 15;
    if (useTimeRange && breakStartTime && breakEndTime) {
      const [sh, sm] = breakStartTime.split(":").map(Number);
      const [eh, em] = breakEndTime.split(":").map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff <= 0) diff += 1440;
      duration = diff;
    }
    addBreakToShift(targetShift.id, {
      type: manualType,
      name:
        breakName.trim() ||
        (manualType === "routine" ? "Routine Meal Break" : "Irregular Break"),
      startTime: useTimeRange ? breakStartTime : void 0,
      endTime: useTimeRange ? breakEndTime : void 0,
      durationMinutes: duration,
      isPaid,
    });
    setBreakName("");
  };
  return (
    <div className="space-y-6">
      {/* View Header with Domain Context */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Coffee className="w-4 h-4 text-amber-500" />
            <span>{t.breaks.badge}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {t.breaks.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            {t.breaks.subtitle}
          </p>
        </div>
      </div>

      {/* 1. Live Shift & Break Clock Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-800/60">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
              {t.breaks.liveClock}
            </span>
            <h3 className="text-lg sm:text-xl font-bold mt-0.5">
              {activeClock ? t.header.clockedIn : t.breaks.clockInNow}
            </h3>
          </div>

          {/* Clock In / Out Toggle */}
          {activeClock ? (
            <div className="flex items-center gap-2">
              <button
                onClick={clockOut}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
              >
                <Square className="w-4 h-4" />
                {t.breaks.clockOut}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-indigo-200">
                {t.breaks.clockInNow}:
              </span>
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => clockIn(job.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3 h-3 text-indigo-600" />
                  {job.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Break Status or Presets */}
        {activeClock && (
          <div className="mt-4 pt-2 space-y-4">
            {activeClock.activeBreak ? (
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-bold">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block">
                      {t.header.onBreak}
                    </span>
                    <span className="text-base font-bold text-white">
                      {activeClock.activeBreak.name}
                    </span>
                    <span className="text-xs text-amber-200 block">
                      {t.common.status}:{" "}
                      {activeClock.activeBreak.isPaid
                        ? t.common.paid
                        : t.common.unpaid}
                    </span>
                  </div>
                </div>

                <button
                  onClick={endLiveBreak}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 font-bold text-xs sm:text-sm shadow-sm transition-all self-start sm:self-auto"
                >
                  {t.breaks.endCurrentBreak}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-indigo-300 block">
                  {t.breaks.liveClock}:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: `15m ${t.breaks.irregularRest}`, isPaid: true },
                    { name: `30m ${t.breaks.routineMeal}`, isPaid: false },
                    { name: `45m ${t.breaks.routineMeal}`, isPaid: false },
                    { name: `20m ${t.breaks.irregularRest}`, isPaid: true },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => startLiveBreak(preset.name, preset.isPaid)}
                      className="p-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-800/80 border border-indigo-700/60 text-left transition-all"
                    >
                      <div className="text-xs font-bold text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-indigo-300 font-mono mt-0.5">
                        {preset.isPaid
                          ? t.common.paid.toUpperCase()
                          : t.common.unpaid.toUpperCase()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Manual Input for Irregular and Routine Breaks on Any Shift */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Add Manual Break */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.breaks.manualLogTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.breaks.subtitle}
            </p>
          </div>

          {/* Select Target Shift */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.breaks.selectShift}
            </label>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {shifts.map((s) => {
                const j = jobs.find((job) => job.id === s.jobId);
                return (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.date, {
                      includeDayOfWeek: false,
                      short: true,
                    })}{" "}
                    · {j?.name || "Shift"} ({s.startTime} - {s.endTime})
                  </option>
                );
              })}
            </select>
          </div>

          <form onSubmit={handleAddManualBreak} className="space-y-3.5">
            {/* Break Classification (Routine vs Irregular) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.common.status}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setManualType("irregular");
                    setBreakName(t.breaks.irregularRest);
                  }}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-all ${manualType === "irregular" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                >
                  <div>{t.breaks.irregularType}</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManualType("routine");
                    setBreakName(t.breaks.routineMeal);
                  }}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-all ${manualType === "routine" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                >
                  <div>{t.breaks.routineType}</div>
                </button>
              </div>
            </div>

            {/* Break Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.calendar.breakName}
              </label>
              <input
                type="text"
                value={breakName}
                onChange={(e) => setBreakName(e.target.value)}
                placeholder="e.g. Lunch, Coffee"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Input by Exact Time Range vs Simple Duration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.breaks.useTimeRange}
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setUseTimeRange(true)}
                    className={`text-[11px] font-medium underline ${useTimeRange ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}
                  >
                    {t.common.time}
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setUseTimeRange(false)}
                    className={`text-[11px] font-medium underline ${!useTimeRange ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}
                  >
                    {t.common.duration}
                  </button>
                </div>
              </div>

              {useTimeRange ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      {t.breaks.startTime}
                    </span>
                    <input
                      type="time"
                      value={breakStartTime}
                      onChange={(e) => setBreakStartTime(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      {t.breaks.endTime}
                    </span>
                    <input
                      type="time"
                      value={breakEndTime}
                      onChange={(e) => setBreakEndTime(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex gap-1.5 mb-2">
                    {[15, 20, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setBreakDurationMinutes(mins)}
                        className={`text-xs px-2.5 py-1 rounded font-medium border ${breakDurationMinutes === mins ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={breakDurationMinutes}
                    onChange={(e) =>
                      setBreakDurationMinutes(Number(e.target.value))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              )}
            </div>

            {/* Compensation Designation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.common.status}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`p-2.5 rounded-xl border text-left ${!isPaid ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                >
                  <div className="font-bold">{t.calendar.unpaidBreak}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`p-2.5 rounded-xl border text-left ${isPaid ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                >
                  <div className="font-bold">{t.calendar.paidBreak}</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
            >
              {t.breaks.saveBreak}
            </button>
          </form>
        </div>

        {/* Right Panel: Shift Break Roster & Real-time Pay Calculation Impact */}
        <div className="lg:col-span-7 space-y-4">
          {targetShift && targetJob && targetCalc ? (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {/* Selected Shift Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {formatDate(targetShift.date)}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: targetJob.color }}
                    />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {targetJob.name}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">
                    {t.calendar.estGross}
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {formatCurrency(targetCalc.grossPay, targetJob.currency)}
                  </span>
                </div>
              </div>

              {/* Time & Break Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-center">
                <div>
                  <span className="text-slate-400 block">
                    {t.calendar.workingHours}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {formatHoursFriendly(targetCalc.totalSpanHours)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {t.calendar.unpaidBreaks}
                  </span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    -{targetCalc.unpaidBreakMinutes}m
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {t.calendar.netHours}
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatHoursFriendly(targetCalc.netWorkedHours)}
                  </span>
                </div>
              </div>

              {/* Breaks List for this shift */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>
                    {t.breaks.breakHistory} ({targetShift.breaks?.length || 0})
                  </span>
                </div>

                {!targetShift.breaks || targetShift.breaks.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    {t.breaks.noBreaksYet}
                    {targetJob.routineBreakRules?.autoDeduct && (
                      <p className="mt-1 text-slate-500">
                        * {targetJob.routineBreakRules.durationMinutes}m (
                        {t.jobModal.autoDeductBreak})
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {targetShift.breaks.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${b.isPaid ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}
                          >
                            <Coffee className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {b.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${b.isPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                              >
                                {b.isPaid ? t.common.paid : t.common.unpaid}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                              {b.startTime && b.endTime
                                ? `${b.startTime} - ${b.endTime} \xB7 `
                                : ""}
                              {b.durationMinutes} {t.common.minutes}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              removeBreakFromShift(targetShift.id, b.id)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={t.common.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automated Routine Policy Explanation */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {targetJob.name} · {t.jobs.routineBreakRule}
                  </div>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    {targetJob.routineBreakRules?.enabled
                      ? `${targetJob.routineBreakRules.durationMinutes} ${t.common.minutes} (${targetJob.routineBreakRules.isPaid ? t.common.paid : t.common.unpaid}) ${targetJob.routineBreakRules.thresholdHours}h.`
                      : t.common.none}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              {t.shifts.noShiftsFound}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
