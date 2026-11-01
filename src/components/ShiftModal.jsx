import { useState, useMemo, useEffect } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { X, DollarSign, Moon, Sun, Plus, Trash2, Coffee } from "lucide-react";
import {
  calculateShiftEarnings,
  formatCurrency,
  formatHoursFriendly,
  getShiftCategory,
} from "../utils/payrollCalculator";
export const ShiftModal = ({ shift, defaultDate, onClose }) => {
  const { jobs, addShift, updateShift, selectedDate } = useShift();
  const { t } = useLanguage();
  const [jobId, setJobId] = useState(shift?.jobId || jobs[0]?.id || "");
  const [date, setDate] = useState(
    shift?.date ||
      defaultDate ||
      selectedDate ||
      /* @__PURE__ */ new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState(shift?.startTime || "07:00");
  const [endTime, setEndTime] = useState(shift?.endTime || "15:30");
  const [crossesMidnight, setCrossesMidnight] = useState(
    shift?.crossesMidnight ?? false,
  );
  const [status, setStatus] = useState(shift?.status || "scheduled");
  const [notes, setNotes] = useState(shift?.notes || "");
  const [location, setLocation] = useState(shift?.location || "");
  const [hourlyRateOverride, setHourlyRateOverride] = useState(
    shift?.hourlyRateOverride ? String(shift.hourlyRateOverride) : "",
  );
  const [breaks, setBreaks] = useState(() => {
    if (shift?.breaks && shift.breaks.length > 0) return [...shift.breaks];
    return [];
  });
  const [newBreakName, setNewBreakName] = useState(t.breaks.irregularRest);
  const [newBreakDuration, setNewBreakDuration] = useState(15);
  const [newBreakType, setNewBreakType] = useState("irregular");
  const [newBreakIsPaid, setNewBreakIsPaid] = useState(false);
  const [showAddBreakForm, setShowAddBreakForm] = useState(false);
  useEffect(() => {
    const [sh] = startTime.split(":").map(Number);
    const [eh] = endTime.split(":").map(Number);
    if (eh < sh) {
      setCrossesMidnight(true);
    }
  }, [startTime, endTime]);
  const selectedJob = jobs.find((j) => j.id === jobId) || jobs[0];
  const applyPreset = (preset) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
    setCrossesMidnight(preset.midnight);
    if (preset.is12h && breaks.length === 0) {
      setBreaks([
        {
          id: `break-${Date.now()}`,
          type: "routine",
          name: `12h ${t.breaks.routineMeal} (30m)`,
          durationMinutes: 30,
          isPaid: false,
        },
      ]);
    }
  };
  const provisionalCalculation = useMemo(() => {
    if (!selectedJob) return null;
    const tempShift = {
      id: shift?.id || "temp",
      jobId,
      date,
      startTime,
      endTime,
      crossesMidnight,
      status,
      breaks,
      hourlyRateOverride: hourlyRateOverride
        ? Number(hourlyRateOverride)
        : void 0,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    return calculateShiftEarnings(tempShift, selectedJob);
  }, [
    jobId,
    date,
    startTime,
    endTime,
    crossesMidnight,
    status,
    breaks,
    hourlyRateOverride,
    selectedJob,
  ]);
  const shiftCategory = getShiftCategory(startTime, endTime, crossesMidnight);
  const isNight = shiftCategory === "night";
  const handleAddBreak = (e) => {
    e.preventDefault();
    const newBreak = {
      id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: newBreakType,
      name: newBreakName.trim() || t.calendar.breakName,
      durationMinutes: Number(newBreakDuration) || 15,
      isPaid: newBreakIsPaid,
    };
    setBreaks((prev) => [...prev, newBreak]);
    setNewBreakName(t.breaks.irregularRest);
    setNewBreakDuration(15);
    setShowAddBreakForm(false);
  };
  const removeBreak = (breakId) => {
    setBreaks((prev) => prev.filter((b) => b.id !== breakId));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!jobId || !date || !startTime || !endTime) return;
    const shiftData = {
      jobId,
      date,
      startTime,
      endTime,
      crossesMidnight,
      status,
      breaks,
      notes: notes.trim(),
      location: location.trim(),
      hourlyRateOverride: hourlyRateOverride
        ? Number(hourlyRateOverride)
        : void 0,
    };
    if (shift) {
      updateShift(shift.id, shiftData);
    } else {
      addShift(shiftData);
    }
    onClose();
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: selectedJob?.color || "#6366f1" }}
            />
            <h3
              id="shift-modal-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              {shift ? t.shiftModal.titleEdit : t.shiftModal.titleNew}
            </h3>

            {/* Visual Day / Night Tag */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isNight ? "bg-slate-900 text-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-700/60" : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700"}`}
            >
              {isNight ? (
                <Moon className="w-3 h-3 text-indigo-300" />
              ) : (
                <Sun className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              )}
              {isNight ? t.calendar.nightShift : t.calendar.dayShift}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Employer / Job Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.shiftModal.job} *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setJobId(job.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${jobId === job.id ? "border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 font-semibold" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: job.color }}
                  />
                  <div className="truncate">
                    <div className="text-xs text-slate-900 dark:text-white truncate font-bold">
                      {job.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {job.currency}
                      {job.baseHourlyRate}/h · {job.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Shift Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.shiftModal.date} *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.shiftModal.status}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="scheduled">{t.shifts.scheduled}</option>
                <option value="active">{t.shifts.active}</option>
                <option value="completed">{t.shifts.completed}</option>
                <option value="cancelled">{t.shifts.cancelled}</option>
                <option value="sick">{t.shifts.sick}</option>
              </select>
            </div>
          </div>

          {/* Quick Shift Templates / Presets (8h standard & 12h turnusi) */}
          <div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Brzi šabloni smena (Standardne 8h smene & 12h turnusi):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    start: "08:00",
                    end: "16:00",
                    midnight: false,
                    name: "Standardno 8h radno vreme",
                  })
                }
                className="p-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold text-left truncate flex items-center gap-1.5"
              >
                <Sun className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>8h Standard (08-16)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    start: "06:00",
                    end: "14:00",
                    midnight: false,
                    name: "I jutarnja smena 8h",
                  })
                }
                className="p-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold text-left truncate flex items-center gap-1.5"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>I Smena 8h (06-14)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    start: "14:00",
                    end: "22:00",
                    midnight: false,
                    name: "II popodnevna smena 8h",
                  })
                }
                className="p-2 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-bold text-left truncate flex items-center gap-1.5"
              >
                <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>II Smena 8h (14-22)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    start: "22:00",
                    end: "06:00",
                    midnight: true,
                    name: "III no\u0107na smena 8h (+26%)",
                  })
                }
                className="p-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-slate-900 text-indigo-200 dark:bg-indigo-950 font-bold text-left truncate flex items-center gap-1.5"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>III Noćna 8h (22-06)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    start: "07:00",
                    end: "19:30",
                    midnight: false,
                    name: "12h Dnevni turnus",
                    is12h: true,
                  })
                }
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-left truncate flex items-center gap-1.5"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Turnus 12h Dan</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    start: "19:00",
                    end: "07:30",
                    midnight: true,
                    name: "12h No\u0107ni turnus",
                    is12h: true,
                  })
                }
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-left truncate flex items-center gap-1.5"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Turnus 12h Noć</span>
              </button>
            </div>
          </div>

          {/* Shift Time Window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.shiftModal.startTime} *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.shiftModal.endTime} *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
          </div>

          {/* Midnight crossing checkbox */}
          <div className="flex items-center justify-between text-xs py-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={crossesMidnight}
                onChange={(e) => setCrossesMidnight(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                {t.shiftModal.overnight}
              </span>
            </label>
          </div>

          {/* BREAKS SECTION: Manual Input for Irregular & Routine Break Times */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Coffee className="w-4 h-4 text-amber-500" />
                <span>
                  {t.shiftModal.breaksInShift} ({breaks.length})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBreakForm(!showAddBreakForm)}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.shiftModal.addManualBreak}</span>
              </button>
            </div>

            {/* List of currently attached breaks */}
            {breaks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {t.breaks.noBreaksYet}
                {selectedJob?.routineBreakRules?.autoDeduct && (
                  <span className="block text-slate-500">
                    * {selectedJob.routineBreakRules.durationMinutes}m (
                    {t.jobModal.autoDeductBreak})
                  </span>
                )}
              </p>
            ) : (
              <div className="space-y-1.5">
                {breaks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {b.name}
                      </span>
                      <span className="font-mono text-slate-500">
                        ({b.durationMinutes}m)
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${b.isPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                      >
                        {b.isPaid
                          ? t.common.paid.toUpperCase()
                          : t.common.unpaid.toUpperCase()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeBreak(b.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* In-Modal Add Break Sub-form */}
            {showAddBreakForm && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-2.5 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {t.calendar.addBreakModalTitle}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-0.5">
                      {t.common.status}
                    </label>
                    <select
                      value={newBreakType}
                      onChange={(e) => setNewBreakType(e.target.value)}
                      className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="irregular">
                        {t.breaks.irregularType}
                      </option>
                      <option value="routine">{t.breaks.routineType}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-0.5">
                      {t.calendar.breakDuration}
                    </label>
                    <div className="flex gap-1">
                      {[15, 30, 45].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setNewBreakDuration(m)}
                          className={`px-2 py-1 rounded text-[11px] border ${newBreakDuration === m ? "bg-indigo-600 text-white border-indigo-600 font-bold" : "border-slate-200 text-slate-700 dark:text-slate-300"}`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">
                    {t.calendar.breakName}
                  </label>
                  <input
                    type="text"
                    value={newBreakName}
                    onChange={(e) => setNewBreakName(e.target.value)}
                    placeholder="e.g. Lunch, Incident Stand-down"
                    className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBreakIsPaid}
                      onChange={(e) => setNewBreakIsPaid(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>{t.common.paid}</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddBreak}
                    className="px-3 py-1 bg-indigo-600 text-white rounded font-semibold text-xs"
                  >
                    {t.breaks.saveBreak}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Real-Time Live Payroll Calculation Preview Card */}
          {provisionalCalculation && (
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {t.calendar.estGross}
                </span>
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                  {formatCurrency(
                    provisionalCalculation.grossPay,
                    selectedJob?.currency,
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {t.calendar.netHours}:
                  </span>
                  <span>
                    {formatHoursFriendly(provisionalCalculation.netWorkedHours)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {t.calendar.unpaidBreaks}:
                  </span>
                  <span className="text-rose-600 dark:text-rose-400">
                    -{provisionalCalculation.unpaidBreakMinutes}m
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {t.payroll.nightDiffPay}:
                  </span>
                  <span>
                    {formatHoursFriendly(
                      provisionalCalculation.nightDifferentialHours,
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes & Location */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.shiftModal.location}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. ICU West Wing, Depot 4"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.shiftModal.notes}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Handover notes, specific coverage, client details..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            >
              {t.shiftModal.saveShift}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
