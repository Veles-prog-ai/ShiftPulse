export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
export function minutesToTime(minutes) {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
export function getShiftCategory(startTime, endTime, crossesMidnight) {
  if (crossesMidnight) return "night";
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (
    startMin >= 18 * 60 ||
    startMin < 6 * 60 ||
    endMin > 23 * 60 ||
    endMin < startMin
  ) {
    return "night";
  }
  if (startMin >= 13 * 60 && endMin >= 21 * 60) {
    return "swing";
  }
  return "day";
}
export function formatHoursFriendly(hours) {
  const rounded = Math.round(hours * 100) / 100;
  const h = Math.floor(rounded);
  const m = Math.round((rounded - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
export function formatCurrency(amount, currency = "$") {
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  return `${isNeg ? "-" : ""}${currency}${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function getIntervalOverlapMinutes(s1, e1, s2, e2) {
  const start = Math.max(s1, s2);
  const end = Math.min(e1, e2);
  return Math.max(0, end - start);
}
export function calculateNightDifferentialHours(
  shiftStartMinutes,
  shiftEndMinutes,
  nightStartTime = "22:00",
  nightEndTime = "06:00",
) {
  const nightStart = timeToMinutes(nightStartTime);
  const nightEnd = timeToMinutes(nightEndTime);
  let endMin = shiftEndMinutes;
  if (endMin <= shiftStartMinutes) {
    endMin += 1440;
  }
  const windows = [
    [0, nightEnd],
    [nightStart, 1440],
    [1440, 1440 + nightEnd],
    [1440 + nightStart, 2880],
  ];
  let totalOverlapMinutes = 0;
  for (const [wStart, wEnd] of windows) {
    totalOverlapMinutes += getIntervalOverlapMinutes(
      shiftStartMinutes,
      endMin,
      wStart,
      wEnd,
    );
  }
  return Math.max(0, totalOverlapMinutes / 60);
}
export function resolveShiftBreaks(shiftBreaks, shiftTotalHours, job) {
  let unpaidBreakMinutes = 0;
  let paidBreakMinutes = 0;
  const resolvedBreaks = shiftBreaks ? [...shiftBreaks] : [];
  if (resolvedBreaks.length > 0) {
    for (const b of resolvedBreaks) {
      if (b.isPaid) {
        paidBreakMinutes += b.durationMinutes || 0;
      } else {
        unpaidBreakMinutes += b.durationMinutes || 0;
      }
    }
  } else if (
    job.routineBreakRules?.enabled &&
    job.routineBreakRules.autoDeduct
  ) {
    if (shiftTotalHours >= job.routineBreakRules.thresholdHours) {
      const routineMins = job.routineBreakRules.durationMinutes || 30;
      if (job.routineBreakRules.isPaid) {
        paidBreakMinutes += routineMins;
      } else {
        unpaidBreakMinutes += routineMins;
      }
      resolvedBreaks.push({
        id: `auto-routine-${Date.now()}`,
        type: "routine",
        name: `Auto Routine Meal Break (${routineMins}m)`,
        durationMinutes: routineMins,
        isPaid: job.routineBreakRules.isPaid,
      });
    }
  }
  return { unpaidBreakMinutes, paidBreakMinutes, resolvedBreaks };
}
export function calculateShiftEarnings(shift, job) {
  const startMin = timeToMinutes(shift.startTime);
  let endMin = timeToMinutes(shift.endTime);
  if (endMin <= startMin || shift.crossesMidnight) {
    endMin += 1440;
  }
  const totalSpanMinutes = Math.max(0, endMin - startMin);
  const totalSpanHours = totalSpanMinutes / 60;
  const { unpaidBreakMinutes, paidBreakMinutes } = resolveShiftBreaks(
    shift.breaks,
    totalSpanHours,
    job,
  );
  const netWorkedHours = Math.max(0, totalSpanHours - unpaidBreakMinutes / 60);
  const baseRate = shift.hourlyRateOverride ?? job.baseHourlyRate;
  const otRules = job.overtimeRules;
  let regularHours = netWorkedHours;
  let dailyOtHours = 0;
  let doubleTimeHours = 0;
  if (otRules?.enabled) {
    const dailyThresh = otRules.dailyThresholdHours || 8;
    const doubleThresh = otRules.doubleTimeThresholdHours || 12;
    if (netWorkedHours > doubleThresh && doubleThresh > dailyThresh) {
      regularHours = dailyThresh;
      dailyOtHours = doubleThresh - dailyThresh;
      doubleTimeHours = netWorkedHours - doubleThresh;
    } else if (netWorkedHours > dailyThresh) {
      regularHours = dailyThresh;
      dailyOtHours = netWorkedHours - dailyThresh;
      doubleTimeHours = 0;
    }
  }
  let nightDifferentialHours = 0;
  let nightDiffPay = 0;
  const diffRules = job.differentialRules;
  if (diffRules?.nightDiffEnabled) {
    const rawNightHours = calculateNightDifferentialHours(
      startMin,
      endMin,
      diffRules.nightStartTime,
      diffRules.nightEndTime,
    );
    nightDifferentialHours = Math.min(rawNightHours, netWorkedHours);
    if (diffRules.nightDiffType === "percentage") {
      const extraPerHr = baseRate * (diffRules.nightDiffValue / 100);
      nightDiffPay = nightDifferentialHours * extraPerHr;
    } else {
      nightDiffPay = nightDifferentialHours * diffRules.nightDiffValue;
    }
  }
  const shiftDate = /* @__PURE__ */ new Date(`${shift.date}T12:00:00`);
  const dayOfWeek = shiftDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  let weekendBonusPay = 0;
  if (
    isWeekend &&
    diffRules?.weekendBonusMultiplier &&
    diffRules.weekendBonusMultiplier > 1
  ) {
    const weekendExtraRate = baseRate * (diffRules.weekendBonusMultiplier - 1);
    weekendBonusPay = netWorkedHours * weekendExtraRate;
  }
  const dailyOtMultiplier = otRules?.dailyOtMultiplier || 1.5;
  const doubleTimeMultiplier = otRules?.doubleTimeMultiplier || 2;
  const regularPay = regularHours * baseRate;
  const dailyOtPay = dailyOtHours * (baseRate * dailyOtMultiplier);
  const doubleTimePay = doubleTimeHours * (baseRate * doubleTimeMultiplier);
  const grossPay =
    regularPay + dailyOtPay + doubleTimePay + nightDiffPay + weekendBonusPay;
  return {
    shiftId: shift.id,
    date: shift.date,
    totalSpanHours,
    unpaidBreakMinutes,
    paidBreakMinutes,
    netWorkedHours,
    regularHours,
    dailyOtHours,
    doubleTimeHours,
    nightDifferentialHours,
    isWeekend,
    baseRate,
    regularPay,
    dailyOtPay,
    doubleTimePay,
    nightDiffPay,
    weekendBonusPay,
    grossPay,
  };
}
export function calculateJobPayPeriod(job, shifts, periodStart, periodEnd) {
  const filteredShifts = shifts.filter((s) => {
    if (s.jobId !== job.id) return false;
    if (s.status === "cancelled") return false;
    return s.date >= periodStart && s.date <= periodEnd;
  });
  let totalNetHours = 0;
  let totalRegularHours = 0;
  let totalDailyOtHours = 0;
  let totalDoubleTimeHours = 0;
  let totalNightDiffHours = 0;
  let totalUnpaidBreakMinutes = 0;
  let totalPaidBreakMinutes = 0;
  let grossRegularPay = 0;
  let grossOtPay = 0;
  let grossNightDiffPay = 0;
  let grossWeekendPay = 0;
  for (const shift of filteredShifts) {
    const calc = calculateShiftEarnings(shift, job);
    totalNetHours += calc.netWorkedHours;
    totalRegularHours += calc.regularHours;
    totalDailyOtHours += calc.dailyOtHours;
    totalDoubleTimeHours += calc.doubleTimeHours;
    totalNightDiffHours += calc.nightDifferentialHours;
    totalUnpaidBreakMinutes += calc.unpaidBreakMinutes;
    totalPaidBreakMinutes += calc.paidBreakMinutes;
    grossRegularPay += calc.regularPay;
    grossOtPay += calc.dailyOtPay + calc.doubleTimePay;
    grossNightDiffPay += calc.nightDiffPay;
    grossWeekendPay += calc.weekendBonusPay;
  }
  let weeklyOtHours = 0;
  if (job.overtimeRules?.enabled && job.overtimeRules.weeklyThresholdHours) {
    const weeklyThreshold = job.overtimeRules.weeklyThresholdHours;
    const weeklyHoursMap = /* @__PURE__ */ new Map();
    for (const shift of filteredShifts) {
      const calc = calculateShiftEarnings(shift, job);
      const weekKey = getWeekKey(shift.date);
      const current = weeklyHoursMap.get(weekKey) || 0;
      weeklyHoursMap.set(weekKey, current + calc.regularHours);
    }
    for (const regularWeekHours of weeklyHoursMap.values()) {
      if (regularWeekHours > weeklyThreshold) {
        const excess = regularWeekHours - weeklyThreshold;
        weeklyOtHours += excess;
      }
    }
    if (weeklyOtHours > totalDailyOtHours) {
      const extraOtHours = weeklyOtHours - totalDailyOtHours;
      const extraOtPay =
        extraOtHours *
        (job.baseHourlyRate *
          ((job.overtimeRules.weeklyOtMultiplier || 1.5) - 1));
      grossOtPay += extraOtPay;
    }
  }
  const totalGrossPay =
    grossRegularPay + grossOtPay + grossNightDiffPay + grossWeekendPay;
  const taxPercent = job.taxAndDeductions?.estimatedTaxRatePercent || 0;
  const fixedDeduction = job.taxAndDeductions?.fixedDeductionPerPeriod || 0;
  const estimatedTaxAmount = totalGrossPay * (taxPercent / 100);
  const deductionsAmount = filteredShifts.length > 0 ? fixedDeduction : 0;
  const estimatedNetPay = Math.max(
    0,
    totalGrossPay - estimatedTaxAmount - deductionsAmount,
  );
  return {
    job,
    periodStart,
    periodEnd,
    shiftsCount: filteredShifts.length,
    totalNetHours,
    regularHours: totalRegularHours,
    weeklyOtHours,
    dailyOtHours: totalDailyOtHours,
    doubleTimeHours: totalDoubleTimeHours,
    nightDiffHours: totalNightDiffHours,
    unpaidBreakMinutes: totalUnpaidBreakMinutes,
    paidBreakMinutes: totalPaidBreakMinutes,
    grossRegularPay,
    grossOtPay,
    grossNightDiffPay,
    grossWeekendPay,
    totalGrossPay,
    estimatedTaxAmount,
    deductionsAmount,
    estimatedNetPay,
  };
}
function getWeekKey(dateStr) {
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}
export function formatDateFriendly(dateStr) {
  if (!dateStr) return "";
  const d = /* @__PURE__ */ new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
export function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Računa fond sati, odmore i bolovanja za zaposlenog u zadatom mesecu
 */
export function calculateMonthlyWorkerHours(employee, year, month) {
  const targetYear = year ?? new Date().getFullYear();
  const targetMonth = month ?? new Date().getMonth();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();

  let regularHours = 0;
  let vacationHours = 0;
  let sick65Hours = 0;
  let sick100Hours = 0;
  let sickRfzoHours = 0;
  let nightHours = 0;
  let overtimeHours = 0;

  const regime = employee.smenskiRezim || "8h_regular";
  const overrides = employee.manualOverrides || {};

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dateObj = new Date(targetYear, targetMonth, d);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const override = overrides[dateStr];
    if (override) {
      overtimeHours += Number(override.overtimeHours) || 0;
      switch (override.code) {
        case "GO":
          vacationHours += Number(override.vacationHours || override.dayHours || 8);
          break;
        case "B":
          sick65Hours += Number(override.sickHours || override.dayHours || 8);
          break;
        case "B100":
          sick100Hours += Number(override.sickHours || override.dayHours || 8);
          break;
        case "RFZO":
          sickRfzoHours += Number(override.sickHours || override.dayHours || 8);
          break;
        case "R":
        case "I":
        case "II":
          regularHours += Number(override.dayHours) || 8;
          break;
        case "III":
          nightHours += Number(override.nightHours) || 8;
          break;
        case "D":
          regularHours += Number(override.dayHours) || 12;
          break;
        case "N":
          nightHours += Number(override.nightHours) || 12;
          break;
        case "P":
          regularHours += Number(override.dayHours) || 8;
          break;
        case "O":
          // slobodan dan
          break;
        default:
          regularHours += Number(override.dayHours) || 0;
          nightHours += Number(override.nightHours) || 0;
          break;
      }
    } else {
      // Automatski raspored po izabranom režimu
      switch (regime) {
        case "8h_regular":
          if (!isWeekend) {
            regularHours += 8;
          }
          break;
        case "8h_three_shift":
          if (!isWeekend) {
            const step = (d - 1) % 3;
            if (step === 0 || step === 1) {
              regularHours += 8;
            } else {
              nightHours += 8;
            }
          }
          break;
        case "8h_two_shift":
          if (!isWeekend) {
            regularHours += 8;
          }
          break;
        case "12h_turnus": {
          const cycleDay = (d - 1) % 4;
          if (cycleDay === 0) {
            regularHours += 12;
          } else if (cycleDay === 1) {
            nightHours += 12;
          }
          break;
        }
        case "12h_continuous": {
          const contStep = (d - 1) % 8;
          if (contStep === 0 || contStep === 1) {
            regularHours += 12;
          } else if (contStep === 2 || contStep === 3) {
            nightHours += 12;
          }
          break;
        }
        default:
          if (!isWeekend) {
            regularHours += 8;
          }
          break;
      }
    }
  }

  // Ako zaposleni ima fiksne unete sate u poljima:
  if (employee.prekovremeniSati && overtimeHours === 0) {
    overtimeHours = Number(employee.prekovremeniSati) || 0;
  }
  if (employee.nocniSati && nightHours === 0) {
    nightHours = Number(employee.nocniSati) || 0;
  }

  const totalPaidHours = regularHours + vacationHours + sick65Hours + sick100Hours + nightHours + overtimeHours;
  const totalWorkedAndLeaveHours = totalPaidHours + sickRfzoHours;

  return {
    regularHours,
    vacationHours,
    sick65Hours,
    sick100Hours,
    sickRfzoHours,
    nightHours,
    overtimeHours,
    totalPaidHours,
    totalWorkedAndLeaveHours,
  };
}

/**
 * Obračunava zakonsku platu za zaposlenog u Republici Srbiji
 * prema Zakonu o radu i Zakonu o porezu na dohodak građana
 */
export function calculateSerbianWorkerPayroll(employee, hoursOverride = null) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const hours = hoursOverride || calculateMonthlyWorkerHours(employee, currentYear, currentMonth);

  const satnica = Number(employee.satnica) || (Number(employee.brutoBaza) ? Math.round(Number(employee.brutoBaza) / 176) : 550);
  const baseSalary = Number(employee.brutoBaza) || (satnica * 176);

  // 1. Zarada za redovan rad (efektivni radni sati)
  const regularPay = Math.round(hours.regularHours * satnica * 100) / 100;

  // 2. Naknada za godišnji odmor (čl. 114 ZOR - 100% prosečne satnice)
  const vacationPay = Math.round(hours.vacationHours * satnica * 1.0 * 100) / 100;

  // 3. Naknada za bolovanje do 30 dana - obična bolest (čl. 115 st. 1 t. 1 ZOR - 65% na teret poslodavca)
  const sickPay65 = Math.round(hours.sick65Hours * satnica * 0.65 * 100) / 100;

  // 4. Naknada za bolovanje do 30 dana - povreda na radu / prof. bolest (100% na teret poslodavca)
  const sickPay100 = Math.round(hours.sick100Hours * satnica * 1.0 * 100) / 100;

  // 5. Uvećanja zarade (čl. 108 ZOR)
  const nightPay = Math.round(hours.nightHours * satnica * 0.26 * 100) / 100; // +26%
  const overtimePay = Math.round(hours.overtimeHours * satnica * 0.26 * 100) / 100; // +26%
  const holidayHours = Number(employee.praznikSati) || 0;
  const holidayPay = Math.round(holidayHours * satnica * 1.10 * 100) / 100; // +110%

  // 6. Ukupna Bruto I zarada
  // Ako radnik nema evidentiranih sati kroz kalendar, koristi osnovnu bruto bazu
  const hasCalendarActivity = (hours.regularHours + hours.vacationHours + hours.sick65Hours + hours.sick100Hours + hours.nightHours) > 0;
  
  let bruto = 0;
  if (hasCalendarActivity) {
    bruto = regularPay + vacationPay + sickPay65 + sickPay100 + nightPay + overtimePay + holidayPay;
  } else {
    bruto = baseSalary + nightPay + overtimePay + holidayPay;
  }
  bruto = Math.round(bruto * 100) / 100;

  // 7. Poresko oslobođenje i porez (10%)
  const neoporeziviIznos = 25000;
  const poreskaOsnovica = Math.max(0, bruto - neoporeziviIznos);
  const porez = Math.round(poreskaOsnovica * 0.10 * 100) / 100;

  // 8. Doprinosi na teret zaposlenog (19.9%)
  const pioRadnik = Math.round(bruto * 0.14 * 100) / 100; // 14%
  const zdravstvoRadnik = Math.round(bruto * 0.0515 * 100) / 100; // 5.15%
  const nezaposlenostRadnik = Math.round(bruto * 0.0075 * 100) / 100; // 0.75%
  const doprinosiRadnik = Math.round((pioRadnik + zdravstvoRadnik + nezaposlenostRadnik) * 100) / 100;

  // 9. Neto plata za isplatu
  const neto = Math.round((bruto - porez - doprinosiRadnik) * 100) / 100;

  // 10. Doprinosi na teret poslodavca (15.15%)
  const pioPoslodavac = Math.round(bruto * 0.10 * 100) / 100; // 10%
  const zdravstvoPoslodavac = Math.round(bruto * 0.0515 * 100) / 100; // 5.15%
  const doprinosiFirma = Math.round((pioPoslodavac + zdravstvoPoslodavac) * 100) / 100;

  // 11. Ukupan trošak zarade za poslodavca (Bruto II)
  const ukupnoZaIsplatuFirme = Math.round((bruto + doprinosiFirma) * 100) / 100;

  return {
    osnovniBruto: baseSalary,
    satnica,
    hours,
    uvecanja: {
      nocniRad: nightPay,
      prekovremeniRad: overtimePay,
      praznicniRad: holidayPay,
    },
    naknade: {
      godisnjiOdmor: vacationPay,
      bolovanje65: sickPay65,
      bolovanje100: sickPay100,
      bolovanjeRfzoSati: hours.sickRfzoHours,
    },
    bruto,
    poreskaOsnovica,
    neoporeziviIznos,
    porez,
    doprinosiRadnik,
    doprinosiFirma,
    neto,
    ukupnoZaIsplatuFirme,
    detaljiDoprinosa: {
      pioRadnik,
      zdravstvoRadnik,
      nezaposlenostRadnik,
      pioPoslodavac,
      zdravstvoPoslodavac,
    },
  };
}

