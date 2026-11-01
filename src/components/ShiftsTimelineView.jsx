import React, { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  Clock,
  Plus,
  Moon,
  Sun,
  Coffee,
  Edit3,
  Copy,
  Trash2,
  RotateCw,
} from "lucide-react";
import {
  calculateShiftEarnings,
  formatCurrency,
  formatHoursFriendly,
  getShiftCategory,
} from "../utils/payrollCalculator";
import { NativeAdCard } from "./AdBanner";
export const ShiftsTimelineView = () => {
  const {
    jobs,
    shifts,
    activeJobFilter,
    deleteShift,
    duplicateShift,
    setEditingShift,
    setIsAddModalOpen,
    setIsRosterModalOpen,
    setAddModalDefaultDate,
    updateShift,
    isPremium,
  } = useShift();
  const { t, formatDate } = useLanguage();
  const [statusFilter, setStatusFilter] = useState("all");
  const [shiftTypeFilter, setShiftTypeFilter] = useState("all");
  const filteredShifts = useMemo(() => {
    return shifts
      .filter((s) => {
        if (activeJobFilter !== "all" && s.jobId !== activeJobFilter)
          return false;
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (shiftTypeFilter !== "all") {
          const type = getShiftCategory(
            s.startTime,
            s.endTime,
            s.crossesMidnight,
          );
          if (type !== shiftTypeFilter) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [shifts, activeJobFilter, statusFilter, shiftTypeFilter]);
  return (
    <div className="space-y-5">
      {/* View Header with Filters */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{t.shifts.badge}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {t.shifts.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.shifts.subtitle}
          </p>
        </div>

        {/* Action + Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Night Filter */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setShiftTypeFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-all ${shiftTypeFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-600 dark:text-slate-400"}`}
            >
              {t.common.all}
            </button>
            <button
              onClick={() => setShiftTypeFilter("day")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${shiftTypeFilter === "day" ? "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 shadow-2xs font-bold" : "text-slate-600 dark:text-slate-400"}`}
            >
              <Sun className="w-3 h-3 text-amber-500" />
              {t.common.day}
            </button>
            <button
              onClick={() => setShiftTypeFilter("night")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${shiftTypeFilter === "night" ? "bg-indigo-900 text-indigo-100 shadow-2xs font-bold" : "text-slate-600 dark:text-slate-400"}`}
            >
              <Moon className="w-3 h-3 text-indigo-300" />
              {t.common.night}
            </button>
          </div>

          <button
            onClick={() => setIsRosterModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all shadow-2xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
            title={t.calendar.routineModels}
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t.calendar.routineModels}</span>
          </button>

          <button
            onClick={() => {
              setAddModalDefaultDate(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.shifts.addNewShift}</span>
          </button>
        </div>
      </div>

      {/* Shifts Timeline List */}
      {filteredShifts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Clock className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {t.shifts.noShiftsFound}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.shifts.subtitle}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShifts.map((shift, idx) => {
            const job = jobs.find((j) => j.id === shift.jobId);
            if (!job) return null;
            const calc = calculateShiftEarnings(shift, job);
            const category = getShiftCategory(
              shift.startTime,
              shift.endTime,
              shift.crossesMidnight,
            );
            const isNight = category === "night";
            return (
              <React.Fragment key={shift.id}>
                {idx === 2 && !isPremium && <NativeAdCard />}
                <div
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-3 ${isNight ? "border-indigo-200 dark:border-indigo-900/60" : "border-slate-200 dark:border-slate-800"}`}
                >
                  {/* Header Row: Date + Job + Day/Night badge + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: job.color }}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {formatDate(shift.date)}
                          </span>

                          {/* Distinct Day / Night Indicator */}
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isNight ? "bg-slate-900 text-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-700/60" : "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700"}`}
                          >
                            {isNight ? (
                              <>
                                <Moon className="w-3 h-3 text-indigo-300" />
                                {t.calendar.nightShift}
                              </>
                            ) : (
                              <>
                                <Sun className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                {t.calendar.dayShift}
                              </>
                            )}
                          </span>

                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {job.name} ({job.role})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Toggle & Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <select
                        value={shift.status}
                        onChange={(e) =>
                          updateShift(shift.id, { status: e.target.value })
                        }
                        className="text-xs font-semibold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <option value="scheduled">{t.shifts.scheduled}</option>
                        <option value="active">{t.shifts.active}</option>
                        <option value="completed">{t.shifts.completed}</option>
                        <option value="cancelled">{t.shifts.cancelled}</option>
                        <option value="sick">{t.shifts.sick}</option>
                      </select>

                      <button
                        onClick={() => setEditingShift(shift)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t.calendar.editShift}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          const nextDay = new Date(shift.date);
                          nextDay.setDate(nextDay.getDate() + 1);
                          duplicateShift(
                            shift.id,
                            nextDay.toISOString().split("T")[0],
                          );
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t.calendar.duplicateTomorrow}
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteShift(shift.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t.calendar.deleteShift}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Row: Hours + Breaks + Financials */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">
                        {t.calendar.workingHours}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                        {shift.startTime} → {shift.endTime}{" "}
                        {shift.crossesMidnight ? "(+1d)" : ""}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">
                        {t.calendar.netHours}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                        {formatHoursFriendly(calc.netWorkedHours)}
                        <span className="text-slate-400 text-[11px] ml-1">
                          ({calc.unpaidBreakMinutes}m{" "}
                          {t.common.unpaid.toLowerCase()})
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">
                        {t.calendar.nightBonus}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                        {calc.nightDifferentialHours > 0
                          ? `${calc.nightDifferentialHours.toFixed(1)}h ${t.calendar.nightShift} `
                          : ""}
                        {calc.dailyOtHours > 0
                          ? `${calc.dailyOtHours.toFixed(1)}h OT`
                          : ""}
                        {calc.nightDifferentialHours === 0 &&
                        calc.dailyOtHours === 0
                          ? "Standard"
                          : ""}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">
                        {t.calendar.estGross}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                        {formatCurrency(calc.grossPay, job.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Logged Breaks Tags */}
                  {shift.breaks && shift.breaks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                        <Coffee className="w-3 h-3 text-amber-500" />
                        {t.calendar.breaksCount}:
                      </span>
                      {shift.breaks.map((b) => (
                        <span
                          key={b.id}
                          className={`text-[11px] px-2 py-0.5 rounded border font-medium ${b.isPaid ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
                        >
                          {b.name} ({b.durationMinutes}m{" "}
                          {b.isPaid
                            ? t.common.paid.toUpperCase()
                            : t.common.unpaid.toUpperCase()}
                          )
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
