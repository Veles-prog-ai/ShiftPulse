import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { generateRosterShifts } from "../utils/rosterGenerator";
import {
  Calendar,
  Sun,
  Moon,
  BedDouble,
  Coffee,
  Sparkles,
  RotateCw,
  X,
} from "lucide-react";
export const RosterPatternModal = ({ onClose }) => {
  const {
    jobs,
    addShiftsBatch,
    deleteShiftsByJobAndRange,
    selectedDate,
    isPremium,
    openSubscriptionModal,
  } = useShift();
  const { t, formatDate, getWeekdayName } = useLanguage();
  const [model, setModel] = useState("day_night_2rest");
  const [jobId, setJobId] = useState(() => jobs[0]?.id || "");
  const [startDate, setStartDate] = useState(() => {
    return selectedDate || "2026-10-24";
  });
  const [startPhaseIndex, setStartPhaseIndex] = useState(0);
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [dayStartTime, setDayStartTime] = useState("07:00");
  const [dayEndTime, setDayEndTime] = useState("19:30");
  const [nightStartTime, setNightStartTime] = useState("19:00");
  const [nightEndTime, setNightEndTime] = useState("07:30");
  const [includeRoutineMealBreak, setIncludeRoutineMealBreak] = useState(true);
  const [routineMealDurationMinutes, setRoutineMealDurationMinutes] =
    useState(30);
  const [routineMealIsPaid, setRoutineMealIsPaid] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const modelPhases = useMemo(() => {
    if (model === "8h_regular_mon_fri") {
      return [
        {
          index: 0,
          type: "day",
          label: "8h Standardno (08:00 - 16:00)",
          desc: "Pon-Pet",
          icon: Sun,
        },
      ];
    } else if (model === "8h_two_shift") {
      return [
        {
          index: 0,
          type: "day",
          label: "I Smena (06:00 - 14:00)",
          desc: "Jutarnja 8h",
          icon: Sun,
        },
        {
          index: 1,
          type: "day",
          label: "II Smena (14:00 - 22:00)",
          desc: "Popodnevna 8h",
          icon: Sun,
        },
      ];
    } else if (model === "8h_three_shift") {
      return [
        {
          index: 0,
          type: "day",
          label: "I Smena (06:00 - 14:00)",
          desc: "Jutarnja 8h",
          icon: Sun,
        },
        {
          index: 1,
          type: "day",
          label: "II Smena (14:00 - 22:00)",
          desc: "Popodnevna 8h",
          icon: Sun,
        },
        {
          index: 2,
          type: "night",
          label: "III Smena (22:00 - 06:00)",
          desc: "No\u0107na 8h (+26%)",
          icon: Moon,
        },
      ];
    } else if (model === "day_night_2rest") {
      return [
        {
          index: 0,
          type: "day",
          label: t.roster.phaseDay,
          desc: "1/4",
          icon: Sun,
        },
        {
          index: 1,
          type: "night",
          label: t.roster.phaseNight,
          desc: "2/4",
          icon: Moon,
        },
        {
          index: 2,
          type: "rest",
          label: t.roster.phaseRest1,
          desc: "3/4",
          icon: BedDouble,
        },
        {
          index: 3,
          type: "rest",
          label: t.roster.phaseRest2,
          desc: "4/4",
          icon: BedDouble,
        },
      ];
    } else if (model === "day_night_3rest") {
      return [
        {
          index: 0,
          type: "day",
          label: t.roster.phaseDay,
          desc: "1/5",
          icon: Sun,
        },
        {
          index: 1,
          type: "night",
          label: t.roster.phaseNight,
          desc: "2/5",
          icon: Moon,
        },
        {
          index: 2,
          type: "rest",
          label: t.roster.phaseRest1,
          desc: "3/5",
          icon: BedDouble,
        },
        {
          index: 3,
          type: "rest",
          label: t.roster.phaseRest2,
          desc: "4/5",
          icon: BedDouble,
        },
        {
          index: 4,
          type: "rest",
          label: t.roster.phaseRest3,
          desc: "5/5",
          icon: BedDouble,
        },
      ];
    } else {
      return [
        {
          index: 0,
          type: "day",
          label: `${t.roster.phaseDay} 1`,
          desc: "1/8",
          icon: Sun,
        },
        {
          index: 1,
          type: "day",
          label: `${t.roster.phaseDay} 2`,
          desc: "2/8",
          icon: Sun,
        },
        {
          index: 2,
          type: "night",
          label: `${t.roster.phaseNight} 1`,
          desc: "3/8",
          icon: Moon,
        },
        {
          index: 3,
          type: "night",
          label: `${t.roster.phaseNight} 2`,
          desc: "4/8",
          icon: Moon,
        },
        {
          index: 4,
          type: "rest",
          label: `${t.roster.phaseRest1} 1`,
          desc: "5/8",
          icon: BedDouble,
        },
        {
          index: 5,
          type: "rest",
          label: `${t.roster.phaseRest1} 2`,
          desc: "6/8",
          icon: BedDouble,
        },
        {
          index: 6,
          type: "rest",
          label: `${t.roster.phaseRest1} 3`,
          desc: "7/8",
          icon: BedDouble,
        },
        {
          index: 7,
          type: "rest",
          label: `${t.roster.phaseRest1} 4`,
          desc: "8/8",
          icon: BedDouble,
        },
      ];
    }
  }, [model, t]);
  const safeStartPhase =
    startPhaseIndex >= modelPhases.length ? 0 : startPhaseIndex;
  const currentConfig = useMemo(
    () => ({
      model,
      jobId,
      startDate,
      startPhaseIndex: safeStartPhase,
      durationWeeks,
      dayStartTime,
      dayEndTime,
      nightStartTime,
      nightEndTime,
      includeRoutineMealBreak,
      routineMealDurationMinutes,
      routineMealIsPaid,
    }),
    [
      model,
      jobId,
      startDate,
      safeStartPhase,
      durationWeeks,
      dayStartTime,
      dayEndTime,
      nightStartTime,
      nightEndTime,
      includeRoutineMealBreak,
      routineMealDurationMinutes,
      routineMealIsPaid,
    ],
  );
  const { shiftsToCreate, stats } = useMemo(() => {
    return generateRosterShifts(currentConfig);
  }, [currentConfig]);
  const endDateStr = useMemo(() => {
    const d = /* @__PURE__ */ new Date(`${startDate}T00:00:00`);
    d.setDate(d.getDate() + durationWeeks * 7 - 1);
    return d.toISOString().split("T")[0];
  }, [startDate, durationWeeks]);
  const previewDays = useMemo(() => {
    const list = [];
    const start = /* @__PURE__ */ new Date(`${startDate}T00:00:00`);
    const previewLength = Math.min(14, durationWeeks * 7);
    for (let i = 0; i < previewLength; i++) {
      const cur = new Date(start);
      cur.setDate(cur.getDate() + i);
      const dateStr = cur.toISOString().split("T")[0];
      const shiftOnDay = shiftsToCreate.find((s) => s.date === dateStr);
      list.push({
        dateStr,
        dayNum: cur.getDate(),
        weekday: getWeekdayName(cur.getDay(), true),
        shift: shiftOnDay,
      });
    }
    return list;
  }, [startDate, shiftsToCreate, durationWeeks, getWeekdayName]);
  const targetJob = jobs.find((j) => j.id === jobId) || jobs[0];
  const handleGenerate = (e) => {
    e.preventDefault();
    if (!jobId || !startDate) return;
    if (overwriteExisting) {
      deleteShiftsByJobAndRange(jobId, startDate, endDateStr);
    }
    addShiftsBatch(shiftsToCreate);
    onClose();
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="roster-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                {t.roster.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.roster.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          onSubmit={handleGenerate}
          className="p-6 space-y-6 overflow-y-auto"
        >
          {/* STEP 1: Select Routine Model (8h Standard & 12h Turnusi) */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Izaberite model radnog vremena (Standardno 8h ili Turnus 12h)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Puno radno vreme 40h nedeljno po čl. 51 Zakona o radu RS ili 12h
                rotacioni turnusi
              </p>
            </div>

            {/* SECTION A: Standard 8h shifts */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                <span>A. Standardno 8h Radno Vreme i 8h Smenski Rad</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 8h Model 1: Regular 8h (Mon-Fri) */}
                <button
                  type="button"
                  onClick={() => {
                    setModel("8h_regular_mon_fri");
                    setStartPhaseIndex(0);
                    setDayStartTime("08:00");
                    setDayEndTime("16:00");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${model === "8h_regular_mon_fri" ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      8h Standardno (40h/ned)
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      Pon-Pet
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    08:00 – 16:00 (30 min plaćena pauza)
                  </p>
                  <div className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Redovno puno radno vreme
                  </div>
                </button>

                {/* 8h Model 2: Two Shifts (06-14h / 14-22h) */}
                <button
                  type="button"
                  onClick={() => {
                    setModel("8h_two_shift");
                    setStartPhaseIndex(0);
                    setDayStartTime("06:00");
                    setDayEndTime("14:00");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${model === "8h_two_shift" ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Dvosmenski rad 8h
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      I i II smena
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    I (06:00-14:00) ➔ II (14:00-22:00)
                  </p>
                  <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    Rotacija jutarnja / popodnevna
                  </div>
                </button>

                {/* 8h Model 3: Three Shifts (06-14h / 14-22h / 22-06h night) */}
                <button
                  type="button"
                  onClick={() => {
                    setModel("8h_three_shift");
                    setStartPhaseIndex(0);
                    setDayStartTime("06:00");
                    setDayEndTime("14:00");
                    setNightStartTime("22:00");
                    setNightEndTime("06:00");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${model === "8h_three_shift" ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Trosmenski rad 8h
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      I, II i III noćna
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    06-14h ➔ 14-22h ➔ 22-06h (+26% noć)
                  </p>
                  <div className="mt-2 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                    Kontinuirana proizvodnja
                  </div>
                </button>
              </div>
            </div>

            {/* SECTION B: 12-Hour Turnuses */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" />
                <span>
                  B. Turnusni 12-Časovni Rotacioni Ciklusi (12h Dan / 12h Noć)
                </span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Model 1: Day / Night / 2 Days Rest (4-Day Cycle) */}
                <button
                  type="button"
                  onClick={() => {
                    setModel("day_night_2rest");
                    setStartPhaseIndex(0);
                    setDayStartTime("07:00");
                    setDayEndTime("19:30");
                    setNightStartTime("19:00");
                    setNightEndTime("07:30");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${model === "day_night_2rest" ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      12h Dan/Noć/2 Odmor
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                      4 dana
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Dan 12h ➔ Noć 12h ➔ 2 dana odmor
                  </p>
                </button>

                {/* Model 2: Day / Night / 3 Days Rest (5-Day Cycle) */}
                <button
                  type="button"
                  onClick={() => {
                    setModel("day_night_3rest");
                    setStartPhaseIndex(0);
                    setDayStartTime("07:00");
                    setDayEndTime("19:30");
                    setNightStartTime("19:00");
                    setNightEndTime("07:30");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${model === "day_night_3rest" ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      12h Dan/Noć/3 Odmor
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      5 dana
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Dan 12h ➔ Noć 12h ➔ 3 dana odmor
                  </p>
                </button>

                {/* Model 3: 2 Days / 2 Nights / 4 Rest (8-Day Continental Cycle) */}
                <button
                  type="button"
                  onClick={() => {
                    setModel("2day_2night_4rest");
                    setStartPhaseIndex(0);
                    setDayStartTime("07:00");
                    setDayEndTime("19:30");
                    setNightStartTime("19:00");
                    setNightEndTime("07:30");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${model === "2day_2night_4rest" ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      2D / 2N / 4 Odmor
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      8 dana
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    2× Dan 12h ➔ 2× Noć 12h ➔ 4 dana odmor
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: User-Configurable Beginning (Date + Starting Phase!) */}

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>2. {t.roster.startPhase}</span>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.roster.startPhaseDesc}
              </p>
            </div>

            {/* Start Date Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.roster.startDate} *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.roster.duration}
                </label>
                <select
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value={4}>
                    4 {t.calendar.week} (to{" "}
                    {formatDate(endDateStr, { short: true })})
                  </option>
                  <option value={8}>
                    8 {t.calendar.week} (to{" "}
                    {formatDate(endDateStr, { short: true })})
                  </option>
                  <option value={12}>
                    12 {t.calendar.week} (to{" "}
                    {formatDate(endDateStr, { short: true })})
                  </option>
                  <option value={26}>
                    26 {t.calendar.week} (to{" "}
                    {formatDate(endDateStr, { short: true })})
                  </option>
                </select>
              </div>
            </div>

            {/* Custom Rotation Phase (Which shift/rest does user start on?) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.roster.startPhase} (
                {formatDate(startDate, { includeDayOfWeek: true })}):
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {modelPhases.map((phase) => {
                  const Icon = phase.icon;
                  const isSelected = safeStartPhase === phase.index;
                  return (
                    <button
                      key={phase.index}
                      type="button"
                      onClick={() => setStartPhaseIndex(phase.index)}
                      className={`p-3 rounded-xl border text-left transition-all ${isSelected ? "border-indigo-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-600" : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon
                          className={`w-4 h-4 ${phase.type === "day" ? "text-amber-500" : phase.type === "night" ? "text-indigo-400" : "text-emerald-500"}`}
                        />
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {phase.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {phase.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 3: 12-Hour Shift Block Timing & Routine Breaks */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. 12h {t.roster.dayHours} & {t.roster.nightHours}
            </label>

            {/* 12h Day and 12h Night Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Day shift block */}
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10 space-y-2">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  12h {t.calendar.dayShift}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      {t.shiftModal.startTime}
                    </span>
                    <input
                      type="time"
                      value={dayStartTime}
                      onChange={(e) => setDayStartTime(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      {t.shiftModal.endTime}
                    </span>
                    <input
                      type="time"
                      value={dayEndTime}
                      onChange={(e) => setDayEndTime(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Night shift block */}
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-2">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  12h {t.calendar.nightShift} (+1d)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      {t.shiftModal.startTime}
                    </span>
                    <input
                      type="time"
                      value={nightStartTime}
                      onChange={(e) => setNightStartTime(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      {t.shiftModal.endTime} (+1d)
                    </span>
                    <input
                      type="time"
                      value={nightEndTime}
                      onChange={(e) => setNightEndTime(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Routine Meal Break Option */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={includeRoutineMealBreak}
                  onChange={(e) => setIncludeRoutineMealBreak(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.roster.includeMeal}</span>
              </label>

              {includeRoutineMealBreak && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[30, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRoutineMealDurationMinutes(m)}
                        className={`px-2 py-0.5 rounded font-mono font-medium border ${routineMealDurationMinutes === m ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-500">
                    <input
                      type="checkbox"
                      checked={routineMealIsPaid}
                      onChange={(e) => setRoutineMealIsPaid(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>{t.common.paid}</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* STEP 4: Target Employer / Job */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              4. {t.roster.chooseJob}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setJobId(job.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${jobId === job.id ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-600" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: job.color }}
                  />
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {job.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {job.currency}
                      {job.baseHourlyRate}/h
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 14-Day Interactive Sequence Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>{t.roster.preview}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-normal">
                {stats.dayShiftsCount} {t.calendar.dayShift} ·{" "}
                {stats.nightShiftsCount} {t.calendar.nightShift} ·{" "}
                {stats.restDaysCount} {t.calendar.restDay}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              {previewDays.map((d) => {
                const isWork = Boolean(d.shift);
                const isNight = d.shift?.crossesMidnight;
                return (
                  <div
                    key={d.dateStr}
                    className={`p-2 rounded-xl text-xs flex flex-col justify-between min-h-[64px] border ${isWork ? (isNight ? "bg-slate-900 text-indigo-200 border-indigo-700/60 dark:bg-indigo-950" : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700") : "bg-emerald-50/60 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/40"}`}
                  >
                    <div className="text-[10px] font-semibold opacity-70">
                      {d.weekday} {d.dayNum}
                    </div>
                    <div className="my-1 flex items-center justify-center">
                      {isWork ? (
                        isNight ? (
                          <Moon className="w-3.5 h-3.5 text-indigo-300" />
                        ) : (
                          <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        )
                      ) : (
                        <BedDouble className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider">
                      {isWork
                        ? isNight
                          ? "12h N"
                          : "12h D"
                        : t.calendar.restDay}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overwrite existing option */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>
                {t.roster.overwrite} ({targetJob?.name})
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {t.roster.generate} ({shiftsToCreate.length})
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
