import { useState, useEffect, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import { downloadShiftsIcsFile } from "../utils/calendarIcs";
import { calculateClientProfitAndTax } from "../utils/profitTaxEngine";
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
  ShieldCheck,
  FileText,
} from "lucide-react";

const CONTACTS_STORAGE_KEY = "shiftpulse_contacts_v1";

export const CommunicationHubModal = ({
  onClose,
  onOpenPrivacyPolicy,
  initialTab = "email",
  initialTemplate = "profit-tax",
}) => {
  const {
    shifts,
    jobs,
    activeCompany,
    employees,
    financialRecords,
    workspaceConnected,
    saveOutputDocumentToWorkspace,
  } = useShift();
  const { t, formatDate, intlLocale } = useLanguage();
  const c = t.ui.commsExtra;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [emlSavedNote, setEmlSavedNote] = useState("");

  const companyEmployees = useMemo(() => {
    if (!activeCompany) return [];
    return employees.filter((e) => e.companyId === activeCompany.id);
  }, [employees, activeCompany]);

  const companyRecords = useMemo(() => {
    if (!activeCompany) return [];
    return financialRecords.filter((r) => r.companyId === activeCompany.id);
  }, [financialRecords, activeCompany]);

  const profitSummary = useMemo(() => {
    if (!activeCompany) return null;
    return calculateClientProfitAndTax({
      company: activeCompany,
      records: companyRecords,
      employees: companyEmployees,
      period: "all",
      includePayrollCost: true,
      inVatSystem: activeCompany.poreskiModel !== "pausal",
    });
  }, [activeCompany, companyRecords, companyEmployees]);

  const companyPayrollTotals = useMemo(() => {
    let totalBrutoI = 0;
    let totalNeto = 0;
    let totalBrutoII = 0;
    let totalPorezDoprinosi = 0;
    companyEmployees.forEach((emp) => {
      if (emp.obracun) {
        totalBrutoI += emp.obracun.bruto || 0;
        totalNeto += emp.obracun.neto || 0;
        totalBrutoII += emp.obracun.ukupnoZaIsplatuFirme || 0;
        totalPorezDoprinosi +=
          (emp.obracun.porez || 0) +
          (emp.obracun.doprinosiRadnik || 0) +
          (emp.obracun.doprinosiFirma || 0);
      }
    });
    return {
      workers: companyEmployees.length,
      totalBrutoI,
      totalNeto,
      totalBrutoII,
      totalPorezDoprinosi,
    };
  }, [companyEmployees]);

  const shiftStats = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    const completedShifts = shifts.filter((s) => s.status !== "cancelled");
    completedShifts.forEach((shift) => {
      const job = jobs.find((j) => j.id === shift.jobId);
      if (job) {
        const calc = calculateShiftEarnings(shift, job);
        totalGross += calc.grossPay;
        totalNet += calc.netWorkedHours;
      }
    });
    return { shiftsCount: completedShifts.length, totalNet, totalGross };
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
      teamsEmail: "",
    };
  });

  const [recipientEmail, setRecipientEmail] = useState(
    activeCompany?.kontaktEmail || contacts.supervisorEmail || "",
  );

  useEffect(() => {
    if (activeCompany?.kontaktEmail) {
      setRecipientEmail(activeCompany.kontaktEmail);
    }
  }, [activeCompany?.kontaktEmail]);

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
    return job ? job.name : c.defaultJobName;
  };

  const fmtRsd = (val) =>
    `${Number(val || 0).toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`;

  const getEmailContent = () => {
    const clientTitle = activeCompany?.naziv || c.clientFallback;
    const contactPerson = activeCompany?.kontaktOsoba || contacts.supervisorName || c.greetingFallback;

    if (selectedTemplate === "profit-tax" && profitSummary) {
      const subject = interpolate(c.tplProfitSubject, { client: clientTitle });
      const body = interpolate(c.tplProfitBody, {
        contact: contactPerson,
        client: clientTitle,
        pib: activeCompany?.pib || "-",
        rev: fmtRsd(profitSummary.totalRevenueNet),
        exp: fmtRsd(profitSummary.totalExpenses),
        gp: fmtRsd(profitSummary.grossProfit),
        taxLabel: profitSummary.taxRateLabel,
        tax: fmtRsd(profitSummary.incomeTax),
        np: fmtRsd(profitSummary.netProfit),
        margin: profitSummary.profitMarginPercent,
        vat: fmtRsd(profitSummary.vatBalance),
        vatStatus: profitSummary.vatStatus,
      });
      return { subject, body };
    }

    if (selectedTemplate === "payroll") {
      const subject = interpolate(c.tplPayrollSubject, { client: clientTitle });
      const body = interpolate(c.tplPayrollBody, {
        contact: contactPerson,
        client: clientTitle,
        workers: companyPayrollTotals.workers,
        net: fmtRsd(companyPayrollTotals.totalNeto),
        gross1: fmtRsd(companyPayrollTotals.totalBrutoI),
        taxes: fmtRsd(companyPayrollTotals.totalPorezDoprinosi),
        gross2: fmtRsd(companyPayrollTotals.totalBrutoII),
      });
      return { subject, body };
    }

    if (selectedTemplate === "schedule") {
      const subject = interpolate(c.tplScheduleSubject, { client: clientTitle });
      let body = interpolate(c.tplScheduleIntro, { contact: contactPerson });
      if (upcomingShifts.length === 0) {
        body += c.tplScheduleEmpty;
      } else {
        upcomingShifts.forEach((s) => {
          const isNight =
            getShiftCategory(s.startTime, s.endTime, s.crossesMidnight) === "night";
          body += `• ${formatDate(s.date)}: ${s.startTime} - ${s.endTime} (${isNight ? c.nightWord : c.dayWord}) @ ${getJobName(s.jobId)}\n`;
        });
      }
      body += interpolate(c.tplScheduleTotal, { count: shifts.length });
      return { subject, body };
    }

    if (selectedTemplate === "swap") {
      const targetShift = upcomingShifts[0];
      const subject = interpolate(c.tplSwapSubject, {
        date: targetShift ? ` – ${formatDate(targetShift.date)}` : "",
      });
      const details = targetShift
        ? interpolate(c.tplSwapDetails, {
            date: formatDate(targetShift.date),
            start: targetShift.startTime,
            end: targetShift.endTime,
            job: getJobName(targetShift.jobId),
          })
        : "";
      const body = interpolate(c.tplSwapBody, {
        colleague: contacts.colleagueName || c.colleagueFallback,
        details,
      });
      return { subject, body };
    }

    const subject = interpolate(c.tplSickSubject, { client: clientTitle });
    const body = interpolate(c.tplSickBody, {
      supervisor: contacts.supervisorName || c.supervisorFallback,
    });
    return { subject, body };
  };

  const { subject, body } = getEmailContent();

  const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail || "")}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(recipientEmail || "")}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const whatsappPhone =
    contacts.colleaguePhone.replace(/[^0-9]/g, "") ||
    contacts.supervisorPhone.replace(/[^0-9]/g, "");
  const whatsappText = encodeURIComponent(`*${subject}*\n\n${body}`);
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${whatsappText}`
    : `https://wa.me/?text=${whatsappText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent("https://shiftpulse.local")}&text=${whatsappText}`;
  const viberUrl = `viber://forward?text=${whatsappText}`;
  const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(
    contacts.teamsEmail || recipientEmail || "",
  )}&message=${encodeURIComponent(`${subject}\n\n${body}`)}`;
  const linkedInMessageUrl = "https://www.linkedin.com/messaging/";
  const linkedInProfileUrl =
    contacts.linkedInUrl.trim() || "https://www.linkedin.com/feed/";
  const linkedInShareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(
    interpolate(c.linkedInShareTemplate, {
      client: activeCompany?.naziv || c.clientFallback,
      workers: companyPayrollTotals.workers,
      shifts: shiftStats.shiftsCount,
    }),
  )}`;

  const googleCalendarUrl = useMemo(() => {
    if (upcomingShifts.length === 0) return "https://calendar.google.com";
    const s = upcomingShifts[0];
    const job = jobs.find((j) => j.id === s.jobId);
    const title = encodeURIComponent(`${c.defaultJobName} – ${job ? job.name : ""}`);
    const details = encodeURIComponent(`${activeCompany?.naziv || "ShiftPulse"}`);
    const dateFormatted = s.date.replace(/-/g, "");
    const startHour = s.startTime.replace(/:/g, "") + "00";
    const endHour = s.endTime.replace(/:/g, "") + "00";
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dateFormatted}T${startHour}/${dateFormatted}T${endHour}`;
  }, [upcomingShifts, jobs, activeCompany, c]);

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportEmlDraft = async () => {
    const safeFilename = `Nacrt_${(activeCompany?.pib || "klijent").replace(/[^a-zA-Z0-9_-]/g, "")}_${new Date().toISOString().slice(0, 10)}.eml`;
    const emlContent = [
      `To: ${recipientEmail || ""}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      "",
      body,
    ].join("\r\n");

    const blob = new Blob([emlContent], { type: "message/rfc822;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (workspaceConnected) {
      const saved = await saveOutputDocumentToWorkspace({
        topFolder: "02_Izlaz_Dokumenta",
        subFolder: "Arhiva_Ugovori",
        filename: safeFilename,
        content: emlContent,
      });
      if (saved?.ok) {
        setEmlSavedNote(interpolate(c.emlSavedOk, { filename: safeFilename }));
        setTimeout(() => setEmlSavedNote(""), 3500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.communication.hubTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {interpolate(c.subInfo, {
                  client: activeCompany?.naziv || c.clientFallback,
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto py-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "email" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{c.tabEmailEml}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("linkedin")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "linkedin" ? "bg-[#0077b5] text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("messaging")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "messaging" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{c.tabTeamsSlackChat}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "calendar" ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t.communication.tabCalendar}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === "contacts" ? "bg-slate-800 dark:bg-slate-700 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.communication.tabContacts}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: EMAIL */}
          {activeTab === "email" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {c.selectTplLabel}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("profit-tax")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${selectedTemplate === "profit-tax" ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    {c.tplProfitTax}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("payroll")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${selectedTemplate === "payroll" ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    {c.tplPayroll}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("schedule")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${selectedTemplate === "schedule" ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    {t.communication.tplSchedule}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("swap")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${selectedTemplate === "swap" ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    {t.communication.tplSwap}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.communication.recipientEmail}
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={c.recipientPh}
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.communication.previewMessage}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyText(`Subject: ${subject}\n\n${body}`)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? t.communication.copiedToClipboard : t.common.copy}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700/80 leading-relaxed">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                    Subject: {subject}
                  </div>
                  {body}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                <a
                  href={mailtoUrl}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{c.openMailDefault}</span>
                </a>
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>{c.openGmailWeb}</span>
                </a>
                <a
                  href={outlookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>{c.openOutlookWeb}</span>
                </a>
                <button
                  type="button"
                  onClick={handleExportEmlDraft}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>{c.saveEmlBtn}</span>
                </button>
              </div>
              {emlSavedNote && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  {emlSavedNote}
                </div>
              )}
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
                    {c.linkedInTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {c.linkedInDesc}
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
                    placeholder="https://www.linkedin.com/in/client-name"
                    className="flex-1 px-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={saveContacts}
                    className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 cursor-pointer"
                  >
                    {t.common.save}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <a
                  href={linkedInProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white text-xs font-bold"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{c.openLinkedInProfile}</span>
                </a>

                <a
                  href={linkedInMessageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[#0077b5]/40 text-[#0077b5] dark:text-sky-400 hover:bg-[#0077b5]/10 text-xs font-bold"
                >
                  <Send className="w-4 h-4" />
                  <span>{c.openLinkedInMessages}</span>
                </a>

                <a
                  href={linkedInShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  <Linkedin className="w-4 h-4" />
                  <span>{c.shareLinkedInNews}</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: TEAMS, SLACK, WHATSAPP, TELEGRAM, VIBER */}
          {activeTab === "messaging" && (
            <div className="space-y-3">
              {/* Microsoft Teams */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.teamsTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {interpolate(c.teamsDesc, {
                      target: contacts.teamsEmail || recipientEmail || c.teamsMissingEmail,
                    })}
                  </p>
                </div>
                <a
                  href={teamsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl whitespace-nowrap"
                >
                  {c.openTeamsBtn}
                </a>
              </div>

              {/* WhatsApp */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.communication.whatsappTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {c.whatsappDesc}
                  </p>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl whitespace-nowrap"
                >
                  {t.communication.sendViaWhatsApp}
                </a>
              </div>

              {/* Telegram & Viber */}
              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.telegramViberTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {c.telegramViberDesc}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl"
                  >
                    {c.telegramBtn}
                  </a>
                  <a
                    href={viberUrl}
                    className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl"
                  >
                    {c.viberBtn}
                  </a>
                </div>
              </div>

              {/* Slack / Handover */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.communication.teamsSlackTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {c.slackDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(`[${subject}]\n${body}`)}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                >
                  {copied ? t.communication.copiedToClipboard : c.copySlackBtn}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CALENDAR SYNC */}
          {activeTab === "calendar" && (
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.communication.calendarSyncTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {t.communication.calendarSyncDesc}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => downloadShiftsIcsFile(shifts, jobs)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.communication.downloadIcs}</span>
                </button>

                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-bold rounded-xl"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t.communication.googleCalendar}</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 5: CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {c.contactPersonLabel}
                  </label>
                  <input
                    type="text"
                    value={contacts.supervisorName}
                    onChange={(e) =>
                      setContacts({ ...contacts, supervisorName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {c.reportEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={contacts.supervisorEmail}
                    onChange={(e) =>
                      setContacts({ ...contacts, supervisorEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {c.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={contacts.supervisorPhone}
                    onChange={(e) =>
                      setContacts({ ...contacts, supervisorPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {c.teamsEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={contacts.teamsEmail || ""}
                    onChange={(e) =>
                      setContacts({ ...contacts, teamsEmail: e.target.value })
                    }
                    placeholder={c.recipientPh}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={saveContacts}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
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

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{c.footerZeroCreds}</span>
          </div>
          <div className="flex items-center gap-3">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacyPolicy();
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                {t.legal.openPolicy}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold cursor-pointer"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
