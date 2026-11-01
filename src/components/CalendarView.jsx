import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Moon,
  Sun,
  Coffee,
  Copy,
  Edit3,
  Trash2,
  Calendar as CalendarIcon,
  BedDouble,
  RotateCw,
  Download,
} from "lucide-react";
import { downloadShiftsIcsFile } from "../utils/calendarIcs";
import {
  calculateShiftEarnings,
  formatCurrency,
  formatHoursFriendly,
  getShiftCategory,
} from "../utils/payrollCalculator";
export const CalendarView = () => {
  const {
    jobs,
    shifts,
    activeJobFilter,
    selectedDate,
    setSelectedDate,
    deleteShift,
    duplicateShift,
    setEditingShift,
    setIsAddModalOpen,
    setIsRosterModalOpen,
    setAddModalDefaultDate,
    addBreakToShift,
    setCurrentTab,
    openCircadianModal,
  } = useShift();
  const { t, formatDate, formatMonthYear } = useLanguage();
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date(2026, 9, 1);
  });
  const [viewMode, setViewMode] = useState("month");
  const [breakShiftTarget, setBreakShiftTarget] = useState(null);
  const [breakName, setBreakName] = useState("Irregular Rest Break");
  const [breakDuration, setBreakDuration] = useState(15);
  const [breakIsPaid, setBreakIsPaid] = useState(false);
  const filteredShifts = useMemo(() => {
    if (activeJobFilter === "all") return shifts;
    return shifts.filter((s) => s.jobId === activeJobFilter);
  }, [shifts, activeJobFilter]);
  const shiftsByDate = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const shift of filteredShifts) {
      const list = map.get(shift.date) || [];
      list.push(shift);
      map.set(shift.date, list);
    }
    return map;
  }, [filteredShifts]);
  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };
  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };
  const jumpToday = () => {
    const today = /* @__PURE__ */ new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const todayStr = today.toISOString().split("T")[0];
    setSelectedDate(todayStr);
  };
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${(m + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: true,
      });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        const dateStr = `${y}-${(m + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
        days.push({
          dayNumber: i,
          dateStr,
          isCurrentMonth: false,
        });
      }
    }
    return days;
  }, [currentDate]);
  const selectedDayShifts = shiftsByDate.get(selectedDate) || [];
  const selectedDayCalculations = useMemo(() => {
    return selectedDayShifts
      .map((shift) => {
        const job = jobs.find((j) => j.id === shift.jobId);
        if (!job) return null;
        return {
          shift,
          job,
          calc: calculateShiftEarnings(shift, job),
        };
      })
      .filter(Boolean);
  }, [selectedDayShifts, jobs]);
  const dailyTotals = useMemo(() => {
    let hours = 0;
    let earnings = 0;
    let unpaidBreaks = 0;
    for (const item of selectedDayCalculations) {
      if (item) {
        hours += item.calc.netWorkedHours;
        earnings += item.calc.grossPay;
        unpaidBreaks += item.calc.unpaidBreakMinutes;
      }
    }
    return { hours, earnings, unpaidBreaks };
  }, [selectedDayCalculations]);
  const handleAddIrregularBreak = (e) => {
    e.preventDefault();
    if (!breakShiftTarget) return;
    addBreakToShift(breakShiftTarget.id, {
      type: "irregular",
      name: breakName.trim() || "Manual Irregular Break",
      durationMinutes: Number(breakDuration) || 15,
      isPaid: breakIsPaid,
    });
    setBreakShiftTarget(null);
  };
  const monthYearLabel = formatMonthYear(currentDate);
  return (
    <div className="space-y-5">
      {/* Visual Color Legend Bar (Day vs Night Shift vs Rest Day) */}
      <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
          <span>{t.calendar.legend}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Day Shift Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-medium">
            <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t.calendar.dayShift}</span>
          </div>

          {/* Night Shift Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/80 dark:bg-indigo-900/60 border border-indigo-700/60 dark:border-indigo-500/50 text-indigo-200 font-medium">
            <Moon className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t.calendar.nightShift}</span>
          </div>

          {/* Rest Day Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-medium">
            <BedDouble className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.calendar.restDay}</span>
          </div>
        </div>
      </div>

      {/* Calendar Controls & Month Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Month Title & Nav */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white min-w-[150px] text-center sm:text-left">
              {monthYearLabel}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={jumpToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t.calendar.today}
          </button>
        </div>

        {/* View Mode & Quick Add & 12h Routine Models */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 rounded-md transition-all ${viewMode === "month" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
            >
              {t.calendar.month}
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-md transition-all ${viewMode === "week" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
            >
              {t.calendar.week}
            </button>
          </div>

          {/* 12h Routine Roster Generator Button */}
          <button
            onClick={() => setIsRosterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs"
            title={t.calendar.routineModels}
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t.calendar.routineModels}</span>
          </button>

          {/* Circadian Recovery Pro Tool */}
          <button
            onClick={openCircadianModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs"
            title={t.premium.circadianTitle}
          >
            <Moon className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Circadian</span>
            <span className="px-1 py-0.2 text-[9px] font-black bg-amber-400 text-slate-950 rounded">
              PRO
            </span>
          </button>

          {/* Quick .ICS Calendar Sync Button */}
          <button
            onClick={() => downloadShiftsIcsFile(shifts, jobs)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title={t.communication.calendarSyncTitle}
          >
            <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>.ICS</span>
          </button>

          <button
            onClick={() => {
              setAddModalDefaultDate(selectedDate);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {t.calendar.shiftOn}{" "}
              {formatDate(selectedDate, {
                includeDayOfWeek: false,
                short: true,
              })}
            </span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t.calendar.daysOfWeek.map((dayName, idx) => (
            <div key={idx}>{dayName}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
          {monthDays.map((day) => {
            const dayShifts = shiftsByDate.get(day.dateStr) || [];
            const isSelected = day.dateStr === selectedDate;
            const isToday =
              day.dateStr ===
              /* @__PURE__ */ new Date().toISOString().split("T")[0];
            const isRestDay = day.isCurrentMonth && dayShifts.length === 0;
            const hasNightShift = dayShifts.some(
              (s) =>
                getShiftCategory(s.startTime, s.endTime, s.crossesMidnight) ===
                "night",
            );
            const hasDayShift = dayShifts.some(
              (s) =>
                getShiftCategory(s.startTime, s.endTime, s.crossesMidnight) ===
                "day",
            );
            let cellBgClass = "bg-white dark:bg-slate-900";
            if (!day.isCurrentMonth) {
              cellBgClass =
                "bg-slate-50/40 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600";
            } else if (isRestDay) {
              cellBgClass =
                "bg-emerald-50/30 dark:bg-emerald-950/15 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25";
            } else {
              cellBgClass = "hover:bg-slate-50 dark:hover:bg-slate-800/40";
            }
            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`min-h-[92px] sm:min-h-[115px] p-1.5 sm:p-2 cursor-pointer transition-all relative flex flex-col justify-between ${cellBgClass} ${isSelected ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40" : ""}`}
              >
                {/* Top of day cell: Day Number and Rest Tag or Day/Night icons */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center tabular-nums ${isToday ? "bg-indigo-600 text-white font-bold shadow-xs" : isSelected ? "text-indigo-600 dark:text-indigo-400 font-bold" : day.isCurrentMonth ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-600"}`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Rest Day Indicator Badge */}
                  {isRestDay && (
                    <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded text-emerald-700/80 dark:text-emerald-400/80 bg-emerald-100/60 dark:bg-emerald-900/40">
                      {t.common.rest}
                    </span>
                  )}

                  {/* Day vs Night Badges Header */}
                  {dayShifts.length > 0 && (
                    <div className="flex items-center gap-1">
                      {hasDayShift && (
                        <span title={t.calendar.dayShift}>
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                      {hasNightShift && (
                        <span title={t.calendar.nightShift}>
                          <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Shift Items Container */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {dayShifts.slice(0, 2).map((s) => {
                    const job = jobs.find((j) => j.id === s.jobId);
                    const category = getShiftCategory(
                      s.startTime,
                      s.endTime,
                      s.crossesMidnight,
                    );
                    const isNight = category === "night";
                    return (
                      <div
                        key={s.id}
                        className={`text-[10px] sm:text-[11px] leading-tight px-1.5 py-1 rounded font-semibold truncate flex items-center justify-between border shadow-2xs ${isNight ? "bg-slate-900 text-indigo-200 border-indigo-700/60 dark:bg-indigo-950 dark:border-indigo-500/60" : "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/70"}`}
                        title={`${job?.name || "Shift"} (${isNight ? t.common.night : t.common.day}): ${s.startTime} - ${s.endTime}`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {isNight ? (
                            <Moon className="w-2.5 h-2.5 text-indigo-300 shrink-0" />
                          ) : (
                            <Sun className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {s.cycleDayLabel
                              ? s.cycleDayLabel
                              : job?.name
                                ? job.name.split(" ")[0]
                                : t.common.day}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-[9px] shrink-0 font-normal">
                          {s.startTime.slice(0, 5)}
                        </span>
                      </div>
                    );
                  })}

                  {dayShifts.length > 2 && (
                    <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 pl-1">
                      +{dayShifts.length - 2}
                    </div>
                  )}
                </div>

                {/* Bottom Row inside Cell: Job Color Dot & Breaks marker */}
                <div className="flex items-center justify-between text-[9px] pt-0.5">
                  <div className="flex items-center gap-1">
                    {dayShifts.map((s) => {
                      const job = jobs.find((j) => j.id === s.jobId);
                      return (
                        <span
                          key={s.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: job?.color || "#6366f1" }}
                          title={job?.name}
                        />
                      );
                    })}
                  </div>

                  {dayShifts.some((s) => s.breaks && s.breaks.length > 0) && (
                    <span title={t.calendar.breaksCount}>
                      <Coffee className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        {/* Day Header & Daily Totals */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{t.calendar.shiftsScheduled}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {formatDate(selectedDate)}
              </h3>
              {selectedDayCalculations.length === 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {t.calendar.restDay}
                </span>
              )}
            </div>
          </div>

          {/* Daily Quick KPI strip */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400 block text-[11px]">
                {t.calendar.netHours}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums font-mono">
                {formatHoursFriendly(dailyTotals.hours)}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[11px]">
                {t.calendar.unpaidBreaks}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums font-mono">
                {dailyTotals.unpaidBreaks}m
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[11px]">
                {t.calendar.estGross}
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                {formatCurrency(dailyTotals.earnings)}
              </span>
            </div>
          </div>
        </div>

        {/* List of Shifts for this Day */}
        {selectedDayCalculations.length === 0 ? (
          <div className="py-8 text-center space-y-3 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-xl border border-dashed border-emerald-200/80 dark:border-emerald-900/40 p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t.calendar.noShiftsRest}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.calendar.restDaySub}
              </p>
            </div>
            <button
              onClick={() => {
                setAddModalDefaultDate(selectedDate);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              {t.calendar.logShiftForDate}{" "}
              {formatDate(selectedDate, {
                includeDayOfWeek: false,
                short: true,
              })}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDayCalculations.map((item) => {
              if (!item) return null;
              const { shift, job, calc } = item;
              const shiftType = getShiftCategory(
                shift.startTime,
                shift.endTime,
                shift.crossesMidnight,
              );
              const isNight = shiftType === "night";
              return (
                <div
                  key={shift.id}
                  className={`rounded-xl border p-4 transition-all space-y-3 ${isNight ? "border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/20 dark:bg-indigo-950/20" : "border-amber-200 dark:border-amber-800/60 bg-amber-50/15 dark:bg-amber-950/10"}`}
                >
                  {/* Shift Top Row: Job name + Status + Type Badge + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900"
                        style={{ backgroundColor: job.color }}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {job.name}
                          </h4>

                          {/* Distinct Day Shift / Night Shift Tag */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${isNight ? "bg-slate-900 text-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-700/60" : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700"}`}
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
                            · {job.role}
                          </span>
                        </div>

                        {shift.location && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            📍 {shift.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setBreakShiftTarget(shift)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                        title={t.calendar.addBreak}
                      >
                        <Coffee className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t.calendar.addBreak}</span>
                      </button>

                      <button
                        onClick={() => setEditingShift(shift)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title={t.calendar.editShift}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          const tomorrow = new Date(selectedDate);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const tomorrowStr = tomorrow
                            .toISOString()
                            .split("T")[0];
                          duplicateShift(shift.id, tomorrowStr);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title={t.calendar.duplicateTomorrow}
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteShift(shift.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title={t.calendar.deleteShift}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Shift Times & Financial Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                    <div>
                      <span className="text-slate-400 block">
                        {t.calendar.workingHours}
                      </span>
                      <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                        <span>{shift.startTime}</span>
                        <span>→</span>
                        <span>{shift.endTime}</span>
                        {shift.crossesMidnight && (
                          <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/30 px-1 rounded">
                            +1d
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block">
                        {t.calendar.netHours}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                        {formatHoursFriendly(calc.netWorkedHours)}
                        <span className="text-[11px] font-normal text-slate-400 ml-1">
                          ({calc.unpaidBreakMinutes}m{" "}
                          {t.common.unpaid.toLowerCase()})
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">
                        {t.calendar.nightBonus}
                      </span>
                      <div className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                        {job.currency}
                        {calc.baseRate.toFixed(2)}/h
                        {calc.nightDifferentialHours > 0 && (
                          <span className="text-[10px] text-indigo-400 ml-1 font-bold">
                            · {formatHoursFriendly(calc.nightDifferentialHours)}{" "}
                            {t.calendar.nightBonus}
                          </span>
                        )}
                        {calc.dailyOtHours > 0 && (
                          <span className="text-[10px] text-amber-500 ml-1 font-bold">
                            · {formatHoursFriendly(calc.dailyOtHours)} OT
                          </span>
                        )}
                      </div>
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

                  {/* Breaks Breakdown Section for this shift */}
                  <div className="bg-white dark:bg-slate-900/90 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-amber-500" />
                        {t.calendar.breaksCount} ({shift.breaks?.length || 0})
                      </span>
                      <span>
                        {t.common.unpaid}: {calc.unpaidBreakMinutes}m ·{" "}
                        {t.common.paid}: {calc.paidBreakMinutes}m
                      </span>
                    </div>

                    {!shift.breaks || shift.breaks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        {t.breaks.noBreaksYet}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {shift.breaks.map((b) => (
                          <div
                            key={b.id}
                            className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-2 ${b.isPaid ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
                          >
                            <span className="font-semibold">{b.name}</span>
                            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {b.durationMinutes} {t.common.minutes}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1 rounded bg-black/5 dark:bg-white/10">
                              {b.isPaid
                                ? t.common.paid.toUpperCase()
                                : t.common.unpaid.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {shift.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 p-2 rounded border border-slate-200/50 dark:border-slate-800/50">
                      📝 {shift.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Irregular Break Quick-Add Modal */}
      {breakShiftTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-break-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3
                id="quick-break-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {t.calendar.addBreakModalTitle}
              </h3>
              <button
                onClick={() => setBreakShiftTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddIrregularBreak} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.calendar.breakName}
                </label>
                <input
                  type="text"
                  value={breakName}
                  onChange={(e) => setBreakName(e.target.value)}
                  placeholder="e.g. Unplanned Downtime, Meal, Debrief"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.calendar.breakDuration}
                </label>
                <div className="flex gap-1.5 mb-2">
                  {[15, 20, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setBreakDuration(mins)}
                      className={`text-xs px-2 py-1 rounded font-medium border ${breakDuration === mins ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Paid vs Unpaid designation */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.common.status}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBreakIsPaid(false)}
                    className={`p-2 rounded-lg border text-left font-medium ${!breakIsPaid ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                  >
                    <div className="font-bold">{t.calendar.unpaidBreak}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBreakIsPaid(true)}
                    className={`p-2 rounded-lg border text-left font-medium ${breakIsPaid ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                  >
                    <div className="font-bold">{t.calendar.paidBreak}</div>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBreakShiftTarget(null)}
                  className="w-1/2 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {t.calendar.saveBreak}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
