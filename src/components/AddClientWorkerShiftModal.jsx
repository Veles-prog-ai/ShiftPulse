import React, { useState, useMemo } from "react";
import { X, ShieldCheck, Plus, Check, AlertCircle } from "lucide-react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";

export const AddClientWorkerShiftModal = ({
  isOpen,
  onClose,
  initialCompanyId,
  initialWorkerId,
  initialDate,
}) => {
  const {
    companies,
    activeCompany,
    employees,
    updateWorkerDayOverride,
    addShift,
    selectedDate,
  } = useShift();
  const { t } = useLanguage();

  const [companyId, setCompanyId] = useState(
    initialCompanyId || activeCompany?.id || companies[0]?.id || "",
  );
  const companyWorkers = useMemo(() => {
    return employees.filter((e) => e.companyId === companyId);
  }, [employees, companyId]);

  const [workerId, setWorkerId] = useState(
    initialWorkerId || companyWorkers[0]?.id || "",
  );

  React.useEffect(() => {
    if (
      companyWorkers.length > 0 &&
      !companyWorkers.some((w) => w.id === workerId)
    ) {
      setWorkerId(companyWorkers[0].id);
    }
  }, [companyId, companyWorkers, workerId]);

  const [date, setDate] = useState(
    initialDate ||
      selectedDate ||
      /* @__PURE__ */ new Date().toISOString().split("T")[0],
  );
  const [shiftPreset, setShiftPreset] = useState("R");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [dayHours, setDayHours] = useState(8);
  const [nightHours, setNightHours] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  const handleApplyPreset = (code) => {
    setShiftPreset(code);
    switch (code) {
      case "R":
        setStartTime("08:00");
        setEndTime("16:00");
        setDayHours(8);
        setNightHours(0);
        setOvertimeHours(0);
        break;
      case "I":
        setStartTime("06:00");
        setEndTime("14:00");
        setDayHours(8);
        setNightHours(0);
        setOvertimeHours(0);
        break;
      case "II":
        setStartTime("14:00");
        setEndTime("22:00");
        setDayHours(8);
        setNightHours(0);
        setOvertimeHours(0);
        break;
      case "III":
        setStartTime("22:00");
        setEndTime("06:00");
        setDayHours(0);
        setNightHours(8);
        setOvertimeHours(0);
        break;
      case "D":
        setStartTime("07:00");
        setEndTime("19:00");
        setDayHours(12);
        setNightHours(0);
        setOvertimeHours(0);
        break;
      case "N":
        setStartTime("19:00");
        setEndTime("07:00");
        setDayHours(0);
        setNightHours(12);
        setOvertimeHours(0);
        break;
      case "O":
        setStartTime("");
        setEndTime("");
        setDayHours(0);
        setNightHours(0);
        setOvertimeHours(0);
        break;
      case "GO":
        setStartTime("08:00");
        setEndTime("16:00");
        setDayHours(8);
        setNightHours(0);
        setOvertimeHours(0);
        break;
      case "B":
        setStartTime("08:00");
        setEndTime("16:00");
        setDayHours(8);
        setNightHours(0);
        setOvertimeHours(0);
        break;
      case "P":
        setStartTime("08:00");
        setEndTime("20:00");
        setDayHours(8);
        setNightHours(0);
        setOvertimeHours(4);
        break;
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setFormError("");
    if (!workerId) {
      setFormError(t.ui.addWorkerShiftModal.errSelectWorker);
      return;
    }
    const worker = employees.find((e2) => e2.id === workerId);
    const company = companies.find((c) => c.id === companyId);
    const crossesMidnight = startTime > endTime && endTime !== "";
    addShift({
      jobId: "agency-client-job",
      companyId,
      workerId,
      workerName: worker?.ime,
      date,
      startTime: startTime || "08:00",
      endTime: endTime || "16:00",
      crossesMidnight,
      status: "scheduled",
      breaks: [],
      location: location || company?.naziv || "",
      notes: notes || worker?.ime || "",
      cycleDayLabel: shiftPreset,
    });
    const override = {
      date,
      code: shiftPreset,
      label: shiftPreset,
      startTime,
      endTime,
      dayHours: Number(dayHours) || 0,
      nightHours: Number(nightHours) || 0,
      overtimeHours: Number(overtimeHours) || 0,
      notes: notes.trim(),
      isManualOverride: true,
      modifiedAt: /* @__PURE__ */ new Date().toISOString(),
    };
    updateWorkerDayOverride(workerId, date, override);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-900 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600/60 text-white border border-indigo-400/30">
                <Plus className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base">
                {t.ui.addWorkerShiftModal.title}
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {t.ui.addWorkerShiftModal.subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSave}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs"
        >
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Client & Worker Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.ui.addWorkerShiftModal.clientLabel}:
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.naziv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.ui.addWorkerShiftModal.employeeLabel}:
              </label>
              {companyWorkers.length === 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs">
                  {t.ui.addWorkerShiftModal.noWorkers}
                </div>
              ) : (
                <select
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {companyWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.ime} ({w.pozicija})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.ui.addWorkerShiftModal.dateLabel}:
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>

          {/* Shift Preset Buttons */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.ui.addWorkerShiftModal.templateLabel}:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {["R", "I", "II", "III", "D", "N", "O", "GO", "B", "P"].map(
                (code) => {
                  const presetCopy = t.ui.overrideModal.presets[code] || {};
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleApplyPreset(code)}
                      className={`p-2 rounded-xl border text-left font-bold transition-all cursor-pointer ${shiftPreset === code ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                    >
                      <div className="font-mono text-xs">{code}</div>
                      <div className="text-[10px] font-normal truncate">
                        {presetCopy.fullTitle || presetCopy.label || code}
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Time & Hours Configuration */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {t.ui.addWorkerShiftModal.startLabel}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {t.ui.addWorkerShiftModal.endLabel}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {t.ui.addWorkerShiftModal.dayHoursLabel}
              </label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={dayHours}
                onChange={(e) => setDayHours(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                {t.ui.addWorkerShiftModal.nightHoursLabel}
              </label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={nightHours}
                onChange={(e) => setNightHours(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-mono font-bold"
              />
            </div>
          </div>

          {/* Location & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.ui.addWorkerShiftModal.worksiteLabel}:
              </label>
              <input
                type="text"
                placeholder={t.ui.addWorkerShiftModal.worksitePlaceholder}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.ui.addWorkerShiftModal.noteLabel}:
              </label>
              <input
                type="text"
                placeholder={t.ui.addWorkerShiftModal.notePlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Compliance Info */}
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 text-[11px] text-purple-900 dark:text-purple-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>{t.ui.addWorkerShiftModal.complianceInfo}</span>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
            >
              {t.ui.common.cancel}
            </button>
            <button
              type="submit"
              disabled={companyWorkers.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t.ui.addWorkerShiftModal.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
