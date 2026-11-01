import { useState } from "react";
import {
  X,
  Calendar as CalendarIcon,
  User,
  Building,
  ShieldCheck,
  RotateCcw,
  Check,
  FileEdit,
} from "lucide-react";
const PRESETS = [
  {
    code: "R",
    label: "R (8h)",
    fullTitle: "Redovno radno vreme (8h)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "08:00",
    endTime: "16:00",
    colorClass:
      "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    description: "Puno radno vreme 40h nedeljno, \u010Dl. 51 Zakona o radu",
  },
  {
    code: "I",
    label: "I (8h)",
    fullTitle: "I Jutarnja smena (8h)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "06:00",
    endTime: "14:00",
    colorClass:
      "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    description: "Prva jutarnja smena u pogonu",
  },
  {
    code: "II",
    label: "II (8h)",
    fullTitle: "II Popodnevna smena (8h)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "14:00",
    endTime: "22:00",
    colorClass:
      "bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700",
    description: "Druga popodnevna smena",
  },
  {
    code: "III",
    label: "III (8h)",
    fullTitle: "III No\u0107na smena (8h +26%)",
    dayHours: 0,
    nightHours: 8,
    overtimeHours: 0,
    startTime: "22:00",
    endTime: "06:00",
    colorClass:
      "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
    description:
      "Zakonski dodatak na no\u0107ni rad +26%, \u010Dl. 108 Zakona o radu",
  },
  {
    code: "D",
    label: "D (12h)",
    fullTitle: "Turnus 12h Dan",
    dayHours: 12,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "07:00",
    endTime: "19:00",
    colorClass:
      "bg-yellow-100 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
    description: "Dnevna smena u turnusnom re\u017Eimu",
  },
  {
    code: "N",
    label: "N (12h)",
    fullTitle: "Turnus 12h No\u0107 (+26%)",
    dayHours: 0,
    nightHours: 12,
    overtimeHours: 0,
    startTime: "19:00",
    endTime: "07:00",
    colorClass:
      "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    description:
      "No\u0107na turnusna smena sa ura\u010Dunatim uve\u0107anjem od 26%",
  },
  {
    code: "O",
    label: "O (0h)",
    fullTitle: "Slobodan dan / Nedeljni odmor",
    dayHours: 0,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "",
    endTime: "",
    colorClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    description: "Zakon o radu \u010Dl. 67 (dnevni/nedeljni odmor)",
  },
  {
    code: "GO",
    label: "GO",
    fullTitle: "Godišnji odmor (Plaćeno odsustvo 100%)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "08:00",
    endTime: "16:00",
    colorClass:
      "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    description: "Rešenje o korišćenju godišnjeg odmora (čl. 114 ZOR - 100% naknada)",
  },
  {
    code: "B",
    label: "B (65%)",
    fullTitle: "Bolovanje do 30 dana (Opšta bolest 65%)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "08:00",
    endTime: "16:00",
    colorClass:
      "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700",
    description: "Do 30 dana na teret poslodavca (65% osnovice, čl. 115 ZOR)",
  },
  {
    code: "B100",
    label: "B (100%)",
    fullTitle: "Bolovanje - povreda na radu (100%)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "08:00",
    endTime: "16:00",
    colorClass:
      "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    description: "Povreda na radu ili profesionalna bolest (100% naknada)",
  },
  {
    code: "RFZO",
    label: "RFZO",
    fullTitle: "Bolovanje preko 30 dana (RFZO)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 0,
    startTime: "08:00",
    endTime: "16:00",
    colorClass:
      "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    description: "Preko 30 dana - naknada na teret zdravstvenog fonda RFZO",
  },
  {
    code: "P",
    label: "P (+OT)",
    fullTitle: "Prekovremeni rad (+26%)",
    dayHours: 8,
    nightHours: 0,
    overtimeHours: 4,
    startTime: "08:00",
    endTime: "20:00",
    colorClass:
      "bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
    description:
      "Rad preko punog radnog vremena sa uvećanjem od minimum 26%",
  },
];
export const WorkerCalendarOverrideModal = ({
  employee,
  date,
  companyName,
  existingOverride,
  onClose,
  onSave,
}) => {
  const [selectedCode, setSelectedCode] = useState(
    existingOverride?.code || "R",
  );
  const [doznakaBroj, setDoznakaBroj] = useState(
    existingOverride?.doznakaBroj || "",
  );
  const [notes, setNotes] = useState(existingOverride?.notes || "");
  const [customStartTime, setCustomStartTime] = useState(
    existingOverride?.startTime || "08:00",
  );
  const [customEndTime, setCustomEndTime] = useState(
    existingOverride?.endTime || "16:00",
  );
  const [customDayHours, setCustomDayHours] = useState(
    existingOverride?.dayHours ?? 8,
  );
  const [customNightHours, setCustomNightHours] = useState(
    existingOverride?.nightHours ?? 0,
  );
  const [customOvertimeHours, setCustomOvertimeHours] = useState(
    existingOverride?.overtimeHours ?? 0,
  );
  const dateFormatted = new Date(date).toLocaleDateString("sr-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const handleSelectPreset = (p) => {
    setSelectedCode(p.code);
    setCustomStartTime(p.startTime);
    setCustomEndTime(p.endTime);
    setCustomDayHours(p.dayHours);
    setCustomNightHours(p.nightHours);
    setCustomOvertimeHours(p.overtimeHours);
    if (!doznakaBroj) {
      if (p.code === "GO") setDoznakaBroj(`REŠ-GO-${new Date().getFullYear()}/01`);
      else if (["B", "B100", "RFZO"].includes(p.code)) setDoznakaBroj(`DZ-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };
  const handleSave = () => {
    const preset = PRESETS.find((p) => p.code === selectedCode);
    const label = preset?.label || selectedCode;
    const isLeave = ["GO", "B", "B100", "RFZO"].includes(selectedCode);
    const hoursNum = Number(customDayHours) || 8;
    const override = {
      date,
      code: selectedCode,
      label,
      startTime: customStartTime,
      endTime: customEndTime,
      dayHours: isLeave ? 0 : (Number(customDayHours) || 0),
      vacationHours: selectedCode === "GO" ? hoursNum : 0,
      sickHours: ["B", "B100", "RFZO"].includes(selectedCode) ? hoursNum : 0,
      leaveType:
        selectedCode === "GO"
          ? "vacation"
          : selectedCode === "B"
            ? "sick_65"
            : selectedCode === "B100"
              ? "sick_100"
              : selectedCode === "RFZO"
                ? "sick_rfzo"
                : null,
      compensationPercentage:
        selectedCode === "GO" || selectedCode === "B100"
          ? 100
          : selectedCode === "B" || selectedCode === "RFZO"
            ? 65
            : null,
      doznakaBroj: doznakaBroj.trim(),
      nightHours: Number(customNightHours) || 0,
      overtimeHours: Number(customOvertimeHours) || 0,
      notes: notes.trim(),
      isManualOverride: true,
      modifiedAt: /* @__PURE__ */ new Date().toISOString(),
    };
    onSave(override);
    onClose();
  };
  const handleResetToDefault = () => {
    onSave(null);
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
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <FileEdit className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Manuelna prepravka smene u kalendaru
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                {employee.ime} ({employee.pozicija})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {companyName}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Target Date banner */}
          <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider block">
                  Izabrani datum
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {dateFormatted}
                </span>
              </div>
            </div>

            {existingOverride && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                Aktivna manuelna izmena
              </span>
            )}
          </div>

          {/* Quick Preset Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Izaberite smenu ili status za ovaj dan:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESETS.map((p) => {
                const isSelected = selectedCode === p.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${isSelected ? `${p.colorClass} ring-2 ring-indigo-500 shadow-sm scale-[1.02]` : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black font-mono">
                        {p.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                      {p.fullTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Preset Detail & Time Inputs */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Podešavanje satnice za {selectedCode}:
              </span>
              <span className="text-[11px] text-slate-500">
                {PRESETS.find((p) => p.code === selectedCode)?.description}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Početak
                </label>
                <input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Kraj
                </label>
                <input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Dnevni sati
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={customDayHours}
                  onChange={(e) => setCustomDayHours(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  Noćni sati (+26%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={customNightHours}
                  onChange={(e) => setCustomNightHours(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Doznaka / Rešenje input if Leave */}
          {["GO", "B", "B100", "RFZO"].includes(selectedCode) && (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300">
                {selectedCode === "GO" ? "Broj rešenja o godišnjem odmoru:" : "Broj lekarske doznake (DZ):"}
              </label>
              <input
                type="text"
                placeholder={selectedCode === "GO" ? "npr. REŠ-GO-2026/01" : "npr. DZ-2026/8912"}
                value={doznakaBroj}
                onChange={(e) => setDoznakaBroj(e.target.value)}
                className="w-full p-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>
          )}

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Razlog manuelne izmene / Napomena za knjigovodstvo:</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Opciono
              </span>
            </label>
            <input
              type="text"
              placeholder="npr. Zamena za odsutnog radnika, havarija na CNC mašini, odobren prekovremeni rad..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400"
            />
          </div>

          {/* Statutory Notice */}
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 text-[11px] text-purple-900 dark:text-purple-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>
              Manuelna izmena direktno utiče na obračun ukupnih radnih sati i
              virmane za isplatu plate. Usklađeno sa Zakonom o radu RS.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            {existingOverride && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Vrati na difoltni raspored</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Otkaži
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Sačuvaj prepravku</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
