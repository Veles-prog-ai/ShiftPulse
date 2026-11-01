export function generateRosterShifts(config) {
  const {
    model,
    jobId,
    startDate,
    startPhaseIndex = 0,
    durationWeeks,
    dayStartTime,
    dayEndTime,
    nightStartTime,
    nightEndTime,
    includeRoutineMealBreak,
    routineMealDurationMinutes,
    routineMealIsPaid,
  } = config;
  const totalDays = durationWeeks * 7;
  const shiftsToCreate = [];
  let dayShiftsCount = 0;
  let nightShiftsCount = 0;
  let restDaysCount = 0;
  const start = /* @__PURE__ */ new Date(`${startDate}T00:00:00`);
  if (model === "8h_regular_mon_fri") {
    const shiftStart = dayStartTime || "08:00";
    const shiftEnd = dayEndTime || "16:00";
    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const current = new Date(start);
      current.setDate(current.getDate() + dayOffset);
      const dateStr = current.toISOString().split("T")[0];
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        restDaysCount++;
      } else {
        dayShiftsCount++;
        const breaks = [];
        if (includeRoutineMealBreak) {
          breaks.push({
            id: `routine-meal-${dateStr}`,
            type: "routine",
            name: "Pauza za topli obrok (30 min)",
            durationMinutes: routineMealDurationMinutes || 30,
            isPaid: routineMealIsPaid ?? true,
            // Standard Serbian labor law: 30 min break is paid within 8h
          });
        }
        shiftsToCreate.push({
          jobId,
          date: dateStr,
          startTime: shiftStart,
          endTime: shiftEnd,
          crossesMidnight: false,
          status: "scheduled",
          breaks,
          notes:
            "Standardno radno vreme 8h (Puno radno vreme 40h nedeljno, \u010Dl. 51 ZOR)",
          cycleModel: model,
          cycleDayLabel: "8h Standard (08:00-16:00)",
          workTimeModel: "8h_regular",
        });
      }
    }
    const estimatedHours2 = dayShiftsCount * 8;
    return {
      shiftsToCreate,
      stats: {
        totalDays,
        dayShiftsCount,
        nightShiftsCount,
        restDaysCount,
        estimatedHours: estimatedHours2,
      },
    };
  }
  if (model === "8h_two_shift") {
    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const current = new Date(start);
      current.setDate(current.getDate() + dayOffset);
      const dateStr = current.toISOString().split("T")[0];
      const dayOfWeek = current.getDay();
      const weekIndex = Math.floor(dayOffset / 7);
      const shiftPhase = (startPhaseIndex + weekIndex) % 2;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        restDaysCount++;
      } else {
        dayShiftsCount++;
        const isMorning = shiftPhase === 0;
        const sStart = isMorning ? dayStartTime || "06:00" : "14:00";
        const sEnd = isMorning ? "14:00" : "22:00";
        const label = isMorning
          ? "I Smena (06:00-14:00)"
          : "II Smena (14:00-22:00)";
        const breaks = [];
        if (includeRoutineMealBreak) {
          breaks.push({
            id: `routine-meal-${dateStr}`,
            type: "routine",
            name: "Pauza u toku smene (30 min)",
            durationMinutes: routineMealDurationMinutes || 30,
            isPaid: true,
          });
        }
        shiftsToCreate.push({
          jobId,
          date: dateStr,
          startTime: sStart,
          endTime: sEnd,
          crossesMidnight: false,
          status: "scheduled",
          breaks,
          notes: `Dvosmenski 8h rad: ${label}`,
          cycleModel: model,
          cycleDayLabel: label,
          workTimeModel: isMorning ? "8h_shift_1" : "8h_shift_2",
        });
      }
    }
    const estimatedHours2 = dayShiftsCount * 8;
    return {
      shiftsToCreate,
      stats: {
        totalDays,
        dayShiftsCount,
        nightShiftsCount,
        restDaysCount,
        estimatedHours: estimatedHours2,
      },
    };
  }
  if (model === "8h_three_shift") {
    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const current = new Date(start);
      current.setDate(current.getDate() + dayOffset);
      const dateStr = current.toISOString().split("T")[0];
      const dayOfWeek = current.getDay();
      const weekIndex = Math.floor(dayOffset / 7);
      const shiftPhase = (startPhaseIndex + weekIndex) % 3;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        restDaysCount++;
      } else {
        const isMorning = shiftPhase === 0;
        const isAfternoon = shiftPhase === 1;
        const isNight = shiftPhase === 2;
        if (isNight) {
          nightShiftsCount++;
        } else {
          dayShiftsCount++;
        }
        const sStart = isMorning
          ? "06:00"
          : isAfternoon
            ? "14:00"
            : nightStartTime || "22:00";
        const sEnd = isMorning
          ? "14:00"
          : isAfternoon
            ? "22:00"
            : nightEndTime || "06:00";
        const label = isMorning
          ? "I Smena (06:00-14:00)"
          : isAfternoon
            ? "II Smena (14:00-22:00)"
            : "III No\u0107na Smena (22:00-06:00, +26%)";
        const breaks = [];
        if (includeRoutineMealBreak) {
          breaks.push({
            id: `routine-meal-${dateStr}`,
            type: "routine",
            name: isNight
              ? "Pauza u no\u0107noj smeni (30 min)"
              : "Pauza u smeni (30 min)",
            durationMinutes: routineMealDurationMinutes || 30,
            isPaid: true,
          });
        }
        shiftsToCreate.push({
          jobId,
          date: dateStr,
          startTime: sStart,
          endTime: sEnd,
          crossesMidnight: isNight,
          status: "scheduled",
          breaks,
          notes: `Trosmenski 8h rad: ${label}`,
          cycleModel: model,
          cycleDayLabel: label,
          workTimeModel: isMorning
            ? "8h_shift_1"
            : isAfternoon
              ? "8h_shift_2"
              : "8h_shift_3",
        });
      }
    }
    const estimatedHours2 = (dayShiftsCount + nightShiftsCount) * 8;
    return {
      shiftsToCreate,
      stats: {
        totalDays,
        dayShiftsCount,
        nightShiftsCount,
        restDaysCount,
        estimatedHours: estimatedHours2,
      },
    };
  }
  let patternSequence = [];
  let modelLabel = "";
  if (model === "day_night_2rest") {
    patternSequence = ["D", "N", "R", "R"];
    modelLabel = "12h Dan/No\u0107/2 Odmor";
  } else if (model === "day_night_3rest") {
    patternSequence = ["D", "N", "R", "R", "R"];
    modelLabel = "12h Dan/No\u0107/3 Odmor";
  } else if (model === "2day_2night_4rest") {
    patternSequence = ["D", "D", "N", "N", "R", "R", "R", "R"];
    modelLabel = "12h 2D/2N/4 Odmor";
  }
  const cycleLength = patternSequence.length || 4;
  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const current = new Date(start);
    current.setDate(current.getDate() + dayOffset);
    const dateStr = current.toISOString().split("T")[0];
    const cycleIndex = (startPhaseIndex + dayOffset) % cycleLength;
    const shiftType = patternSequence[cycleIndex] || "R";
    const cycleDayNumber = cycleIndex + 1;
    if (shiftType === "D") {
      dayShiftsCount++;
      const breaks = [];
      if (includeRoutineMealBreak) {
        breaks.push({
          id: `routine-meal-${dateStr}`,
          type: "routine",
          name: "12h Dnevna pauza",
          durationMinutes: routineMealDurationMinutes || 30,
          isPaid: routineMealIsPaid,
        });
      }
      shiftsToCreate.push({
        jobId,
        date: dateStr,
        startTime: dayStartTime || "07:00",
        endTime: dayEndTime || "19:30",
        crossesMidnight: false,
        status: "scheduled",
        breaks,
        notes: `Turnus 12h: ${modelLabel} (Dan ${cycleDayNumber}/${cycleLength})`,
        cycleModel: model,
        cycleDayLabel: `12h Dan (${cycleDayNumber}/${cycleLength})`,
        workTimeModel: "12h_day",
      });
    } else if (shiftType === "N") {
      nightShiftsCount++;
      const breaks = [];
      if (includeRoutineMealBreak) {
        breaks.push({
          id: `routine-meal-night-${dateStr}`,
          type: "routine",
          name: "12h No\u0107na pauza",
          durationMinutes: routineMealDurationMinutes || 30,
          isPaid: routineMealIsPaid,
        });
      }
      shiftsToCreate.push({
        jobId,
        date: dateStr,
        startTime: nightStartTime || "19:00",
        endTime: nightEndTime || "07:30",
        crossesMidnight: true,
        status: "scheduled",
        breaks,
        notes: `Turnus 12h: ${modelLabel} (No\u0107 ${cycleDayNumber}/${cycleLength})`,
        cycleModel: model,
        cycleDayLabel: `12h No\u0107 (${cycleDayNumber}/${cycleLength})`,
        workTimeModel: "12h_night",
      });
    } else {
      restDaysCount++;
    }
  }
  const estimatedHours =
    (dayShiftsCount + nightShiftsCount) *
    (12.5 - (routineMealIsPaid ? 0 : routineMealDurationMinutes / 60));
  return {
    shiftsToCreate,
    stats: {
      totalDays,
      dayShiftsCount,
      nightShiftsCount,
      restDaysCount,
      estimatedHours,
    },
  };
}
