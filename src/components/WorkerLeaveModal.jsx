import { useState, useMemo } from "react";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import {
  X,
  Palmtree,
  Bandage,
  ShieldCheck,
  Calendar as CalendarIcon,
  User,
  Calculator,
  FileCheck,
  AlertCircle,
  Stethoscope,
  Building,
} from "lucide-react";

export const LEAVE_TYPES = [
  {
    id: "vacation",
    code: "GO",
    compensationPercent: 100,
    paidBy: "poslodavac",
    badgeClass:
      "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    icon: Palmtree,
    defaultDocPrefix: "RES-GO-",
  },
  {
    id: "sick_65",
    code: "B",
    compensationPercent: 65,
    paidBy: "poslodavac",
    badgeClass:
      "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700",
    icon: Bandage,
    defaultDocPrefix: "DOZ-MED-",
  },
  {
    id: "sick_100",
    code: "B100",
    compensationPercent: 100,
    paidBy: "poslodavac",
    badgeClass:
      "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    icon: Stethoscope,
    defaultDocPrefix: "BZR-POV-",
  },
  {
    id: "sick_rfzo",
    code: "RFZO",
    compensationPercent: 65,
    paidBy: "rfzo",
    badgeClass:
      "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    icon: Building,
    defaultDocPrefix: "RFZO-DZ-",
  },
];

export const WorkerLeaveModal = ({
  isOpen,
  onClose,
  employees = [],
  initialWorkerId = "",
  initialDate = "",
  onSaveLeave,
}) => {
  const { t, intlLocale } = useLanguage();
  const lm = t.ui.leaveModal;
  const cm = t.ui.common;

  const todayStr = initialDate || new Date().toISOString().split("T")[0];

  const [selectedWorkerId, setSelectedWorkerId] = useState(
    initialWorkerId || employees[0]?.id || ""
  );
  const [leaveTypeId, setLeaveTypeId] = useState("vacation");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [doznakaBroj, setDoznakaBroj] = useState(
    () => `DOZ-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [dijagnoza, setDijagnoza] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const selectedWorker = useMemo(() => {
    return employees.find((e) => e.id === selectedWorkerId) || employees[0] || null;
  }, [employees, selectedWorkerId]);

  const selectedLeaveType = useMemo(() => {
    return LEAVE_TYPES.find((item) => item.id === leaveTypeId) || LEAVE_TYPES[0];
  }, [leaveTypeId]);

  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const list = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = current.toISOString().split("T")[0];

      if (!skipWeekends || !isWeekend) {
        list.push({
          dateStr,
          dayOfWeek,
          isWeekend,
          formatted: current.toLocaleDateString(intlLocale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return list;
  }, [startDate, endDate, skipWeekends, intlLocale]);

  if (!isOpen) return null;

  const totalLeaveHours = calculatedDays.length * (Number(hoursPerDay) || 8);
  const satnica = selectedWorker
    ? Number(selectedWorker.satnica) ||
      Math.round((Number(selectedWorker.brutoBaza) || 95000) / 176)
    : 550;
  const compensationRate = selectedLeaveType.compensationPercent / 100;
  const hourlyCompensation = Math.round(satnica * compensationRate * 100) / 100;
  const estimatedTotalCompensation = Math.round(totalLeaveHours * hourlyCompensation);

  const selectedTypeCopy = lm.types?.[selectedLeaveType.id] || {};

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    if (!selectedWorker) {
      setFormError(lm.errNoWorker);
      return;
    }
    if (calculatedDays.length === 0) {
      setFormError(lm.errNoDays);
      return;
    }

    const payload = {
      id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workerId: selectedWorker.id,
      workerName: selectedWorker.ime,
      companyId: selectedWorker.companyId,
      leaveType: selectedLeaveType.id,
      code: selectedLeaveType.code,
      label: selectedTypeCopy.label || selectedLeaveType.code,
      startDate,
      endDate,
      daysList: calculatedDays.map((d) => d.dateStr),
      daysCount: calculatedDays.length,
      hoursPerDay: Number(hoursPerDay) || 8,
      totalHours: totalLeaveHours,
      compensationPercent: selectedLeaveType.compensationPercent,
      paidBy: selectedLeaveType.paidBy,
      doznakaBroj: doznakaBroj.trim(),
      dijagnoza: dijagnoza.trim(),
      notes: notes.trim(),
      satnica,
      estimatedTotalCompensation,
      createdAt: new Date().toISOString(),
    };

    onSaveLeave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {lm.title}
              </h3>
              <p className="text-xs text-slate-500">
                {lm.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={cm.close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Employee selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              {lm.employeeLabel}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.ime} — {emp.pozicija} ({emp.satnica || 550} RSD{cm.perHour})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Leave Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {lm.leaveTypeLabel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEAVE_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = leaveTypeId === type.id;
                const typeCopy = lm.types?.[type.id] || {};
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setLeaveTypeId(type.id);
                      if (
                        !doznakaBroj ||
                        doznakaBroj.startsWith("DOZ-") ||
                        doznakaBroj.startsWith("RES-") ||
                        doznakaBroj.startsWith("BZR-") ||
                        doznakaBroj.startsWith("RFZO-")
                      ) {
                        setDoznakaBroj(
                          `${type.defaultDocPrefix}${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`
                        );
                      }
                    }}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {typeCopy.label || type.code}
                        </span>
                        <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {type.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {typeCopy.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Date Range */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lm.startDate}:
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lm.endDate}:
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipWeekends"
                  checked={skipWeekends}
                  onChange={(e) => setSkipWeekends(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor="skipWeekends"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {lm.skipWeekends}
                </label>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {lm.hoursPerDay}:
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-16 p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center font-mono font-bold text-xs"
                />
              </div>
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-600 dark:text-slate-400">
                  {lm.totalDays}:
                </span>
                <strong className="text-slate-900 dark:text-white font-bold">
                  {calculatedDays.length} {cm.daysShort}
                </strong>
              </div>
              <div className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                {totalLeaveHours} {cm.hoursShort} ({selectedLeaveType.code})
              </div>
            </div>
          </div>

          {/* 4. Document Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {leaveTypeId === "vacation" ? lm.docRefGo : lm.docRefSick}
              </label>
              <input
                type="text"
                required
                value={doznakaBroj}
                onChange={(e) => setDoznakaBroj(e.target.value)}
                placeholder="DOZ-2026/889"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {leaveTypeId === "vacation" ? lm.portionGo : lm.diagnosisSick}
              </label>
              <input
                type="text"
                value={dijagnoza}
                onChange={(e) => setDijagnoza(e.target.value)}
                placeholder={leaveTypeId === "vacation" ? "I / II" : "J06"}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lm.noteLabel}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="..."
              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* 5. Compensation Estimate */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Calculator className="w-4 h-4" />
                <span>{lm.estTitle}</span>
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {interpolate(lm.statutoryBase, {
                  pct: selectedLeaveType.compensationPercent,
                })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                <span className="text-[9px] text-slate-500 block uppercase">
                  {lm.hourlyBase}:
                </span>
                <strong>{satnica} RSD{cm.perHour}</strong>
              </div>
              <div className="p-2 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                <span className="text-[9px] text-slate-500 block uppercase">
                  {lm.leaveRate}:
                </span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {hourlyCompensation} RSD{cm.perHour}
                </strong>
              </div>
              <div className="p-2 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                <span className="text-[9px] text-slate-500 block uppercase">
                  {lm.totalEst}:
                </span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-black text-xs">
                  {estimatedTotalCompensation.toLocaleString(intlLocale)} RSD
                </strong>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {selectedLeaveType.paidBy === "poslodavac"
                  ? lm.paidByEmployerNote
                  : lm.paidByRfzoNote}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {cm.cancel}
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>{lm.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

