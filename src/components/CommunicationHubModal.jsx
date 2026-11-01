import { useState, useEffect, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { downloadShiftsIcsFile } from "../utils/calendarIcs";
import {
  calculateShiftEarnings,
  getShiftCategory,
} from "../utils/payrollCalculator";
import {
  X,
  Mail,
  Linkedin,
  MessageCircle,
  Calendar,
  Users,
  Send,
  ExternalLink,
  Copy,
  Check,
  Download,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
const CONTACTS_STORAGE_KEY = "shiftpulse_contacts_v1";
export const CommunicationHubModal = ({ onClose, onOpenPrivacyPolicy }) => {
  const { shifts, jobs } = useShift();
  const { t, formatDate } = useLanguage();
  const [activeTab, setActiveTab] = useState("email");
  const [selectedTemplate, setSelectedTemplate] = useState("schedule");
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const payrollStats = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let regularPay = 0;
    let overtimePay = 0;
    let nightDiffPay = 0;
    const completedShifts = shifts.filter((s) => s.status !== "cancelled");
    completedShifts.forEach((shift) => {
      const job = jobs.find((j) => j.id === shift.jobId);
      if (job) {
        const calc = calculateShiftEarnings(shift, job);
        totalGross += calc.grossPay;
        totalNet += calc.netWorkedHours;
        regularPay += calc.regularPay;
        overtimePay += calc.dailyOtPay + calc.doubleTimePay;
        nightDiffPay += calc.nightDiffPay;
      }
    });
    return {
      shiftsCount: completedShifts.length,
      totalNet,
      totalGross,
      regularPay,
      overtimePay,
      nightDiffPay,
    };
  }, [shifts, jobs]);
  const [contacts, setContacts] = useState(() => {
    try {
      const saved = localStorage.getItem(CONTACTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      supervisorName: "",
      supervisorEmail: "",
      supervisorPhone: "",
      colleagueName: "",
      colleaguePhone: "",
      linkedInUrl: "",
    };
  });
  const [recipientEmail, setRecipientEmail] = useState(
    contacts.supervisorEmail || "",
  );
  useEffect(() => {
    if (contacts.supervisorEmail && !recipientEmail) {
      setRecipientEmail(contacts.supervisorEmail);
    }
  }, [contacts.supervisorEmail, recipientEmail]);
  const saveContacts = () => {
    try {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };
  const upcomingShifts = [...shifts]
    .filter((s) => s.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7);
  const getJobName = (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    return job ? job.name : "Work Shift";
  };
  const getEmailContent = () => {
    let subject2 = "";
    let body2 = "";
    if (selectedTemplate === "schedule") {
      subject2 = `ShiftPulse Schedule Update - ${contacts.supervisorName ? `For ${contacts.supervisorName}` : "Work Roster"}`;
      body2 = `Hello ${contacts.supervisorName || "Supervisor / Team"},

Here is my upcoming shift work schedule recorded via ShiftPulse:

`;
      if (upcomingShifts.length === 0) {
        body2 += "No upcoming shifts currently scheduled.\n";
      } else {
        upcomingShifts.forEach((s) => {
          const isNight =
            getShiftCategory(s.startTime, s.endTime, s.crossesMidnight) ===
            "night";
          const type = isNight
            ? "\u{1F319} Night Shift"
            : "\u2600\uFE0F Day Shift";
          body2 += `\u2022 ${formatDate(s.date)}: ${s.startTime} - ${s.endTime} (${type}) @ ${getJobName(s.jobId)}${s.location ? ` [${s.location}]` : ""}
`;
        });
      }
      body2 += `
Total scheduled shifts: ${shifts.length}
Thank you,
Generated with ShiftPulse App`;
    } else if (selectedTemplate === "payroll") {
      subject2 = `Work Hours & Compensation Statement - October 2026`;
      body2 = `Hello,

Please find my itemized work hours and estimated compensation summary:

`;
      body2 += `\u2022 Total Shifts Worked: ${payrollStats.shiftsCount}
`;
      body2 += `\u2022 Effective Net Hours: ${payrollStats.totalNet.toFixed(1)} hrs
`;
      body2 += `\u2022 Regular Base Pay: $${payrollStats.regularPay.toFixed(2)}
`;
      body2 += `\u2022 Overtime Pay: $${payrollStats.overtimePay.toFixed(2)}
`;
      body2 += `\u2022 Night Differential: $${payrollStats.nightDiffPay.toFixed(2)}
`;
      body2 += `\u2022 Estimated Gross Total: $${payrollStats.totalGross.toFixed(2)}

`;
      body2 += `*Note: Calculated for verification and budgeting purposes.

Best regards,
ShiftPulse User`;
    } else if (selectedTemplate === "swap") {
      const targetShift = upcomingShifts[0];
      subject2 = `Shift Coverage / Swap Request${targetShift ? ` for ${formatDate(targetShift.date)}` : ""}`;
      body2 = `Hi ${contacts.colleagueName || "Teammate"},

Would it be possible to arrange a shift swap or coverage for my upcoming shift?

`;
      if (targetShift) {
        const isNight =
          getShiftCategory(
            targetShift.startTime,
            targetShift.endTime,
            targetShift.crossesMidnight,
          ) === "night";
        body2 += `Shift Date: ${formatDate(targetShift.date)}
Time: ${targetShift.startTime} - ${targetShift.endTime} (${isNight ? "Night" : "Day"})
Location: ${getJobName(targetShift.jobId)}

`;
      } else {
        body2 += `Upcoming shift details to be discussed.

`;
      }
      body2 += `Please let me know if your schedule allows, and I will gladly cover a future shift for you in return!

Thank you,
ShiftPulse Team`;
    } else {
      subject2 = `Urgent: Formal Notice of Absence / Sick Leave - Medical Notice`;
      body2 = `Dear ${contacts.supervisorName || "Manager / Human Resources"},

I am writing to formally notify you that due to unexpected illness / medical circumstances, I will be unable to attend my scheduled shift today.

`;
      if (upcomingShifts[0]) {
        body2 += `Scheduled Shift: ${formatDate(upcomingShifts[0].date)} from ${upcomingShifts[0].startTime} to ${upcomingShifts[0].endTime}
Employer: ${getJobName(upcomingShifts[0].jobId)}

`;
      }
      body2 += `I apologize for any disruption and will provide any required medical documentation and keep you updated on my recovery and return-to-work availability.

Sincerely,
ShiftPulse User`;
    }
    return { subject: subject2, body: body2 };
  };
  const { subject, body } = getEmailContent();
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const openDefaultMail = () => {
    const to = encodeURIComponent(recipientEmail || contacts.supervisorEmail);
    const sub = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    window.location.href = `mailto:${to}?subject=${sub}&body=${b}`;
  };
  const openGmailWeb = () => {
    const to = encodeURIComponent(recipientEmail || contacts.supervisorEmail);
    const sub = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${sub}&body=${b}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const openOutlookWeb = () => {
    const to = encodeURIComponent(recipientEmail || contacts.supervisorEmail);
    const sub = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    const url = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${sub}&body=${b}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const sendWhatsApp = () => {
    const text = encodeURIComponent(`*${subject}*

${body}`);
    const phone =
      contacts.colleaguePhone.replace(/[^0-9]/g, "") ||
      contacts.supervisorPhone.replace(/[^0-9]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const sendTelegram = () => {
    const text = encodeURIComponent(`*${subject}*

${body}`);
    const url = `https://t.me/share/url?url=https://shiftpulse.app&text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const shareLinkedIn = () => {
    const postTitle = encodeURIComponent(
      `Celebrating another milestone of dedicated shift work with ShiftPulse! Organized ${payrollStats.shiftsCount} shifts and ${payrollStats.totalNet.toFixed(1)} hours across my workplaces.`,
    );
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://shiftpulse.app")}&summary=${postTitle}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const openLinkedInProfile = () => {
    const target = contacts.linkedInUrl.trim() || "https://www.linkedin.com";
    window.open(target, "_blank", "noopener,noreferrer");
  };
  const openGoogleCalendar = () => {
    if (upcomingShifts.length === 0) return;
    const s = upcomingShifts[0];
    const job = jobs.find((j) => j.id === s.jobId);
    const isNight =
      getShiftCategory(s.startTime, s.endTime, s.crossesMidnight) === "night";
    const title = encodeURIComponent(
      `${isNight ? "\u{1F319} Night" : "\u2600\uFE0F Day"} Shift - ${job ? job.name : "Work"}`,
    );
    const details = encodeURIComponent(`Shift scheduled in ShiftPulse
Location: ${s.location || "Assigned Station"}`);
    const dateFormatted = s.date.replace(/-/g, "");
    const startHour = s.startTime.replace(/:/g, "") + "00";
    const endHour = s.endTime.replace(/:/g, "") + "00";
    const dates = `${dateFormatted}T${startHour}/${dateFormatted}T${endHour}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.communication.hubTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.communication.hubSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto py-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
          <button
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${activeTab === "email" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{t.communication.tabEmail}</span>
          </button>

          <button
            onClick={() => setActiveTab("linkedin")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${activeTab === "linkedin" ? "bg-[#0077b5] text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>{t.communication.tabLinkedIn}</span>
          </button>

          <button
            onClick={() => setActiveTab("messaging")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${activeTab === "messaging" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{t.communication.tabMessaging}</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${activeTab === "calendar" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t.communication.tabCalendar}</span>
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${activeTab === "contacts" ? "bg-slate-800 dark:bg-slate-700 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.communication.tabContacts}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: EMAIL */}
          {activeTab === "email" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.communication.emailTemplate}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("schedule")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${selectedTemplate === "schedule" ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    📅 {t.communication.tplSchedule}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("payroll")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${selectedTemplate === "payroll" ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    💰 {t.communication.tplPayroll}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("swap")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${selectedTemplate === "swap" ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    🔄 {t.communication.tplSwap}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("sick")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${selectedTemplate === "sick" ? "border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    🏥 {t.communication.tplSickLeave}
                  </button>
                </div>
              </div>

              {/* Recipient Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.communication.recipientEmail}
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={t.communication.recipientEmailPlaceholder}
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Subject & Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.communication.previewMessage}
                  </label>
                  <button
                    onClick={() =>
                      handleCopyText(`Subject: ${subject}

${body}`)
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copied ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>
                      {copied
                        ? t.communication.copiedToClipboard
                        : t.common.copy}
                    </span>
                  </button>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700/80 leading-relaxed">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                    Subject: {subject}
                  </div>
                  {body}
                </div>
              </div>

              {/* 3 Mail Action Launchers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  onClick={openDefaultMail}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  <Mail className="w-4 h-4" />
                  <span>{t.communication.openDefaultMail}</span>
                </button>
                <button
                  onClick={openGmailWeb}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t.communication.openGmail}</span>
                </button>
                <button
                  onClick={openOutlookWeb}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t.communication.openOutlook}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LINKEDIN */}
          {activeTab === "linkedin" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0077b5]/10 border border-[#0077b5]/20 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0077b5] text-white flex items-center justify-center shrink-0">
                  <Linkedin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.communication.linkedInTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {t.communication.linkedInDesc}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.communication.linkedInProfileUrl}
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={contacts.linkedInUrl}
                    onChange={(e) =>
                      setContacts({ ...contacts, linkedInUrl: e.target.value })
                    }
                    placeholder={t.communication.linkedInPlaceholder}
                    className="flex-1 px-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    onClick={saveContacts}
                    className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {t.common.save}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={shareLinkedIn}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white text-xs font-bold shadow-md transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t.communication.shareShiftStatus}</span>
                </button>

                <button
                  onClick={openLinkedInProfile}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t.communication.openLinkedInProfile}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MESSAGING (WHATSAPP, TELEGRAM, TEAMS) */}
          {activeTab === "messaging" && (
            <div className="space-y-4">
              {/* WhatsApp Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.communication.whatsappTitle}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {t.communication.whatsappDesc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={sendWhatsApp}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  {t.communication.sendViaWhatsApp}
                </button>
              </div>

              {/* Telegram Card */}
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.communication.telegramTitle}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {t.communication.telegramDesc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={sendTelegram}
                  className="w-full sm:w-auto px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  {t.communication.sendViaTelegram}
                </button>
              </div>

              {/* Teams & Slack Card */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.communication.teamsSlackTitle}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {t.communication.teamsSlackDesc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleCopyText(`[Shift Handover Note]
${body}`)
                  }
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  {copied
                    ? t.communication.copiedToClipboard
                    : t.communication.copyHandover}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CALENDAR SYNC (.ICS & GOOGLE) */}
          {activeTab === "calendar" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.communication.calendarSyncTitle}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {t.communication.calendarSyncDesc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => downloadShiftsIcsFile(shifts, jobs)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.communication.downloadIcs}</span>
                  </button>

                  <button
                    onClick={openGoogleCalendar}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-bold rounded-xl transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t.communication.googleCalendar}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SAVED CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {t.communication.contactsTitle}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.communication.supervisorName}
                  </label>
                  <input
                    type="text"
                    value={contacts.supervisorName}
                    onChange={(e) =>
                      setContacts({
                        ...contacts,
                        supervisorName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.communication.supervisorEmail}
                  </label>
                  <input
                    type="email"
                    value={contacts.supervisorEmail}
                    onChange={(e) =>
                      setContacts({
                        ...contacts,
                        supervisorEmail: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.communication.supervisorPhone}
                  </label>
                  <input
                    type="tel"
                    value={contacts.supervisorPhone}
                    onChange={(e) =>
                      setContacts({
                        ...contacts,
                        supervisorPhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.communication.colleagueName}
                  </label>
                  <input
                    type="text"
                    value={contacts.colleagueName}
                    onChange={(e) =>
                      setContacts({
                        ...contacts,
                        colleagueName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.communication.colleaguePhone}
                  </label>
                  <input
                    type="tel"
                    value={contacts.colleaguePhone}
                    onChange={(e) =>
                      setContacts({
                        ...contacts,
                        colleaguePhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={saveContacts}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {t.communication.saveContact}
                </button>
                {savedSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {t.communication.savedSuccessfully}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Privacy Policy & Legal Disclaimers link */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Zero credentials stored. Client-side intent redirection only.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenPrivacyPolicy();
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              {t.legal.openPolicy}
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
