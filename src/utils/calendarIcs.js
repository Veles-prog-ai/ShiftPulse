import { getShiftCategory } from "./payrollCalculator";
function toIcsDate(date) {
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}
function escapeIcsText(text) {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
export function generateShiftsIcs(shifts, jobs) {
  const now = /* @__PURE__ */ new Date();
  const dtStamp = toIcsDate(now);
  const jobMap = /* @__PURE__ */ new Map();
  jobs.forEach((j) => jobMap.set(j.id, j));
  const events = shifts.map((shift) => {
    const job = jobMap.get(shift.jobId);
    const jobName = job ? job.name : "Work Shift";
    const role = job?.role ? ` (${job.role})` : "";
    const isNight =
      getShiftCategory(
        shift.startTime,
        shift.endTime,
        shift.crossesMidnight,
      ) === "night";
    const shiftType = isNight
      ? "\u{1F319} Night Shift"
      : "\u2600\uFE0F Day Shift";
    const summary = `${shiftType} - ${jobName}${role}`;
    const [startH, startM] = shift.startTime
      .split(":")
      .map((n) => parseInt(n, 10));
    const [endH, endM] = shift.endTime.split(":").map((n) => parseInt(n, 10));
    const startDate = new Date(shift.date);
    startDate.setHours(startH, startM, 0, 0);
    const endDate = new Date(shift.date);
    if (shift.crossesMidnight || shift.endTime < shift.startTime) {
      endDate.setDate(endDate.getDate() + 1);
    }
    endDate.setHours(endH, endM, 0, 0);
    const description = `Shift details:
Employer: ${jobName}
Time: ${shift.startTime} - ${shift.endTime}
Location: ${shift.location || "Assigned Station"}
Notes: ${shift.notes || "None"}`;
    return [
      "BEGIN:VEVENT",
      `UID:shiftpulse-${shift.id}@shiftpulse.app`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${toIcsDate(startDate)}`,
      `DTEND:${toIcsDate(endDate)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(shift.location || jobName)}`,
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT60M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder: Work shift starts in 1 hour",
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ShiftPulse//Work Shift Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ShiftPulse Roster",
    "X-WR-TIMEZONE:UTC",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
export function downloadShiftsIcsFile(
  shifts,
  jobs,
  filename = "shiftpulse_schedule.ics",
) {
  const icsData = generateShiftsIcs(shifts, jobs);
  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
