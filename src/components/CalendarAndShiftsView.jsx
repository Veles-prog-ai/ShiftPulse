import { useState, useMemo } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Building,
  Plus,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Search,
  Check,
  Edit2,
  Trash2,
  Laptop,
  Landmark,
  Stethoscope,
  Briefcase,
  MapPin,
  Palmtree,
  Bandage,
} from "lucide-react";
import { ProfessionalEventModal } from "./ProfessionalEventModal";
import { WorkerCalendarOverrideModal } from "./WorkerCalendarOverrideModal";
import { AddClientWorkerShiftModal } from "./AddClientWorkerShiftModal";
import { WorkerLeaveModal } from "./WorkerLeaveModal";
export const CalendarAndShiftsView = () => {
  const {
    activeCompany,
    companies,
    setActiveCompany,
    employees,
    shifts,
    jobs,
    leaves,
    addWorkerLeave,
    deleteWorkerLeave,
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    leaveModalInitialWorkerId,
    leaveModalInitialDate,
    openLeaveModal,
    professionalEvents,
    updateProfessionalEvent,
    deleteProfessionalEvent,
    updateWorkerRegime,
    updateWorkerDayOverride,
    setIsAddModalOpen,
    setIsRosterModalOpen,
    selectedDate,
    setSelectedDate,
    setCurrentTab,
  } = useShift();
  const { t } = useLanguage();
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [turnusShiftType, setTurnusShiftType] = useState("12h");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("calendar");
  const [currentCalendarDate, setCurrentCalendarDate] = useState(
    () => new Date(selectedDate || /* @__PURE__ */ new Date()),
  );
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [modalDefaultCategory, setModalDefaultCategory] = useState("meeting");
  const [modalDefaultDate, setModalDefaultDate] = useState(selectedDate);
  const [isAddWorkerShiftOpen, setIsAddWorkerShiftOpen] = useState(false);
  const [overrideModalData, setOverrideModalData] = useState(null);
  const filteredCompanies = useMemo(() => {
    if (clientTypeFilter === "all") return companies;
    return companies.filter(
      (c) => (c.clientType || "company") === clientTypeFilter,
    );
  }, [companies, clientTypeFilter]);
  const currentClient = useMemo(() => {
    if (!activeCompany) return companies[0] || null;
    return activeCompany;
  }, [activeCompany, companies]);
  const activeCompanyEmployees = useMemo(() => {
    if (!currentClient) return employees;
    return employees.filter((e) => e.companyId === currentClient.id);
  }, [currentClient, employees]);
  const filteredEvents = useMemo(() => {
    return professionalEvents.filter((ev) => {
      if (clientTypeFilter !== "all" && ev.clientType !== clientTypeFilter) {
        return false;
      }
      if (
        activeCompany &&
        ev.clientId !== activeCompany.id &&
        clientTypeFilter !== "all"
      ) {
      }
      if (
        selectedCategoryFilter !== "all" &&
        ev.category !== selectedCategoryFilter
      ) {
        return false;
      }
      if (
        selectedStatusFilter !== "all" &&
        ev.status !== selectedStatusFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesClient = ev.clientName.toLowerCase().includes(q);
        const matchesWorker = ev.workerName?.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q);
        const matchesTag = ev.tags?.some((t2) => t2.toLowerCase().includes(q));
        if (
          !matchesTitle &&
          !matchesClient &&
          !matchesWorker &&
          !matchesDesc &&
          !matchesTag
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    professionalEvents,
    clientTypeFilter,
    activeCompany,
    selectedCategoryFilter,
    selectedStatusFilter,
    searchQuery,
  ]);
  const monthDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = prevDate.toISOString().split("T")[0];
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = nextDate.toISOString().split("T")[0];
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }
    return days;
  }, [currentCalendarDate]);
  const daysInCurrentMonthForRoster = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = new Date(year, month, d).toLocaleDateString("sr-RS", {
        weekday: "narrow",
      });
      return { day: d, dateStr, dayOfWeek };
    });
  }, [currentCalendarDate]);
  const eventsByDate = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const ev of filteredEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [filteredEvents]);
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((ev) => ev.date === selectedDate);
  }, [filteredEvents, selectedDate]);
  const selectedDateShifts = useMemo(() => {
    return shifts.filter((s) => s.date === selectedDate);
  }, [shifts, selectedDate]);
  const selectedDateLeaves = useMemo(() => {
    return activeCompanyEmployees.flatMap((emp) => {
      const ov = emp.manualOverrides?.[selectedDate];
      if (ov && ["GO", "B", "B100", "RFZO"].includes(ov.code)) {
        return [{ emp, override: ov }];
      }
      return [];
    });
  }, [activeCompanyEmployees, selectedDate]);
  const summaryStats = useMemo(() => {
    const corporateClients = companies.filter(
      (c) => c.clientType !== "freelancer",
    ).length;
    const freelanceClients = companies.filter(
      (c) => c.clientType === "freelancer",
    ).length;
    const upcomingMeetings = professionalEvents.filter(
      (e) =>
        (e.category === "meeting" || e.category === "negotiation") &&
        e.status !== "completed",
    ).length;
    const taxDeadlines = professionalEvents.filter(
      (e) => e.category === "tax_deadline" && e.status !== "completed",
    ).length;
    const medicalBZR = professionalEvents.filter(
      (e) => e.category === "medical_bzr",
    ).length;
    return {
      corporateClients,
      freelanceClients,
      upcomingMeetings,
      taxDeadlines,
      medicalBZR,
    };
  }, [companies, professionalEvents]);
  const getCategoryBadge = (category) => {
    switch (category) {
      case "meeting":
        return {
          label: "Sastanak",
          bg: "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "negotiation":
        return {
          label: "Pregovori",
          bg: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "tax_deadline":
        return {
          label: "Poreski rok",
          bg: "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        };
      case "medical_bzr":
        return {
          label: "Medicina rada",
          bg: "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        };
      case "inspection":
        return {
          label: "Inspekcija",
          bg: "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
        };
      case "freelance_consulting":
        return {
          label: "Freelance sati",
          bg: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      case "shift":
        return {
          label: "Smena",
          bg: "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        };
      default:
        return {
          label: "Obaveza",
          bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        };
    }
  };
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return {
          label: "HITAN ZAKONSKI ROK",
          bg: "bg-rose-600 text-white animate-pulse",
        };
      case "high":
        return { label: "Visok prioritet", bg: "bg-amber-500 text-white" };
      case "normal":
        return {
          label: "Redovan",
          bg: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
        };
      case "low":
        return {
          label: "Nizak",
          bg: "bg-slate-100 dark:bg-slate-800 text-slate-500",
        };
    }
  };
  const handleOpenNewEventModal = (category = "meeting", targetDate) => {
    setEventToEdit(null);
    setModalDefaultCategory(category);
    setModalDefaultDate(targetDate || selectedDate);
    setIsEventModalOpen(true);
  };
  const handleEditEvent = (ev) => {
    setEventToEdit(ev);
    setIsEventModalOpen(true);
  };
  const handleToggleComplete = (ev) => {
    const nextStatus = ev.status === "completed" ? "scheduled" : "completed";
    updateProfessionalEvent(ev.id, { status: nextStatus });
  };
  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full pb-12">
      {/* 1. TOP SERVICE KPI STRIP & HEADLINE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Servis Evidencije Smena, Freelance Klijenata i Poslovnih
                  Obaveza
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Knjigovodstveno-uslužni centar
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Centralizovano praćenje turnusa radnika klijentskih preduzeća,
                freelance honorara, poslovnih pregovora, poreskih rokova
                (ePorezi) i medicine rada (čl. 62 ZOR)
              </p>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentTab("bank-orders")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              title="Automatska izrada virmana za banku na osnovu obračunate satnice"
            >
              <Landmark className="w-4 h-4" />
              <span>🏦 Nalozi za Banku (Virmani)</span>
            </button>

            <button
              onClick={() => handleOpenNewEventModal("meeting")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Zakaži Sastanak / Obavezu</span>
            </button>

            <button
              onClick={() => setIsRosterModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Automatski generiši standardno 8h radno vreme ili 12h turnus"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Generator Smena (8h / 12h)</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>Pojedinačna Smena</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
              <span>Preduzeća u turnusu</span>
              <Building className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {summaryStats.corporateClients}{" "}
              <span className="text-xs font-normal text-slate-400">
                firmi ({employees.length} radnika)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
              <span>Freelance klijenti</span>
              <Laptop className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
              {summaryStats.freelanceClients}{" "}
              <span className="text-xs font-normal text-slate-400">
                paušalaca/IT
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
              <span>Poreski rokovi (ePorezi)</span>
              <Landmark className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="mt-1 text-lg font-black text-rose-600 dark:text-rose-400">
              {summaryStats.taxDeadlines}{" "}
              <span className="text-xs font-normal text-slate-400">
                aktivnih
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
              <span>Medicina rada (čl. 62)</span>
              <Stethoscope className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="mt-1 text-lg font-black text-purple-600 dark:text-purple-400">
              {summaryStats.medicalBZR}{" "}
              <span className="text-xs font-normal text-slate-400">
                pregleda
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
              <span>Sastanci i pregovori</span>
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="mt-1 text-lg font-black text-blue-600 dark:text-blue-400">
              {summaryStats.upcomingMeetings}{" "}
              <span className="text-xs font-normal text-slate-400">
                zakazano
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & CLIENT CATEGORY CONTROL BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Client Type Filter Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button
            onClick={() => setClientTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${clientTypeFilter === "all" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            Svi Klijenti ({companies.length})
          </button>
          <button
            onClick={() => setClientTypeFilter("company")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${clientTypeFilter === "company" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <Building className="w-3.5 h-3.5 text-indigo-500" />
            <span>Preduzeća (Smenski Rad)</span>
          </button>
          <button
            onClick={() => setClientTypeFilter("freelancer")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${clientTypeFilter === "freelancer" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <Laptop className="w-3.5 h-3.5 text-emerald-500" />
            <span>Freelance & Konsultanti</span>
          </button>
        </div>

        {/* Client Dropdown Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-medium">Aktivni klijent:</span>
            <select
              value={activeCompany?.id || ""}
              onChange={(e) =>
                setActiveCompany(
                  companies.find((c) => c.id === e.target.value) || null,
                )
              }
              className="bg-transparent font-bold text-slate-900 dark:text-white outline-none cursor-pointer max-w-[220px] truncate"
            >
              {filteredCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientType === "freelancer" ? "\u{1F4BB} " : "\u{1F3ED} "}
                  {c.naziv}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. SUB-VIEW TABS SELECTOR */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl text-xs font-bold">
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${viewMode === "calendar" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Objedinjeni Kalendar & Agenda</span>
          </button>

          <button
            onClick={() => setViewMode("roster-grid")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${viewMode === "roster-grid" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Turnusi Radnika (12h Matrica)</span>
          </button>

          <button
            onClick={() => setViewMode("freelance-ledger")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${viewMode === "freelance-ledger" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <Laptop className="w-3.5 h-3.5 text-emerald-500" />
            <span>Freelance Klijenti & Honorari</span>
          </button>

          <button
            onClick={() => setViewMode("agenda-list")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${viewMode === "agenda-list" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              Sastanci, Pregovori i Poreski Rokovi ({filteredEvents.length})
            </span>
          </button>
        </div>

        {/* Date Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setCurrentCalendarDate(
                new Date(
                  currentCalendarDate.getFullYear(),
                  currentCalendarDate.getMonth() - 1,
                  1,
                ),
              )
            }
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-black uppercase text-slate-900 dark:text-white min-w-[130px] text-center">
            {currentCalendarDate.toLocaleString("sr-RS", {
              month: "long",
              year: "numeric",
            })}
          </span>

          <button
            onClick={() =>
              setCurrentCalendarDate(
                new Date(
                  currentCalendarDate.getFullYear(),
                  currentCalendarDate.getMonth() + 1,
                  1,
                ),
              )
            }
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. MODE 1: UNIFIED CALENDAR & DAY AGENDA */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          {/* Left Column: Full Interactive Calendar Matrix (7 columns) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Prikaz rasporeda smena radnika, godišnjih odmora i bolovanja
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Smena
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Godišnji odmor (100%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Bolovanje (65%)
                </span>
                <button
                  type="button"
                  onClick={() => openLeaveModal()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-xs transition-colors cursor-pointer"
                >
                  <Palmtree className="w-3 h-3" />
                  <span>+ Unos odmora / bolovanja</span>
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase py-1">
              <div>Pon</div>
              <div>Uto</div>
              <div>Sre</div>
              <div>Čet</div>
              <div>Pet</div>
              <div className="text-rose-500">Sub</div>
              <div className="text-rose-500">Ned</div>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((item, idx) => {
                const dayEvents = eventsByDate.get(item.dateStr) || [];
                const dayShifts = shifts.filter((s) => s.date === item.dateStr);
                const dayLeaves = activeCompanyEmployees.flatMap((emp) => {
                  const ov = emp.manualOverrides?.[item.dateStr];
                  if (ov && ["GO", "B", "B100", "RFZO"].includes(ov.code)) {
                    return [{ emp, override: ov }];
                  }
                  return [];
                });
                const isSelected = item.dateStr === selectedDate;
                const isToday =
                  item.dateStr ===
                  /* @__PURE__ */ new Date().toISOString().split("T")[0];
                return (
                  <button
                    key={`${item.dateStr}-${idx}`}
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`min-h-[96px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${isSelected ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20" : item.isCurrentMonth ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700" : "bg-transparent border-slate-100 dark:border-slate-800/40 text-slate-400 opacity-40"}`}
                  >
                    {/* Top Row: Date Number & Badges */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-mono font-bold ${isToday ? "w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center" : isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200"}`}
                      >
                        {item.day}
                      </span>

                      {/* Shift & Leave Count Indicator */}
                      <div className="flex items-center gap-1">
                        {dayLeaves.length > 0 && (
                          <span className="px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[8px] font-bold">
                            {dayLeaves.length} ods.
                          </span>
                        )}
                        {dayShifts.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[9px] font-mono font-bold">
                            {dayShifts.length} sm.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Event indicators & tags */}
                    <div className="space-y-1 w-full my-1">
                      {/* Priority Leave Badges (Godišnji odmor & Bolovanja) */}
                      {dayLeaves.map(({ emp, override }) => {
                        const isVacation = override.code === "GO";
                        const isSick65 = override.code === "B";
                        const isSick100 = override.code === "B100";
                        const bg = isVacation
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                          : isSick65
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                            : isSick100
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                              : "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700";
                        return (
                          <div
                            key={`leave-${emp.id}-${item.dateStr}`}
                            title={`${override.label}: ${emp.ime} (${override.doznakaBroj || override.notes || "Odsustvo"})`}
                            className={`px-1 py-0.5 rounded text-[8.5px] font-bold truncate flex items-center gap-1 border ${bg}`}
                          >
                            <span>{isVacation ? "🏖️" : "🩹"}</span>
                            <span className="truncate">
                              {override.code}: {emp.ime.split(" ")[0]}
                            </span>
                          </div>
                        );
                      })}

                      {dayEvents.slice(0, 2).map((ev) => {
                        const badge = getCategoryBadge(ev.category);
                        return (
                          <div
                            key={ev.id}
                            title={`${ev.title} (${ev.clientName})`}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium truncate flex items-center gap-1 border ${badge.bg}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[8px] text-slate-500 font-mono font-bold pl-1">
                          +{dayEvents.length - 2} još
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator Dot for Urgent Obligations */}
                    <div className="w-full flex items-center justify-between pt-0.5">
                      {dayEvents.some((e) => e.priority === "urgent") && (
                        <span className="flex items-center gap-0.5 text-[8px] text-rose-600 dark:text-rose-400 font-bold uppercase">
                          <AlertTriangle className="w-2.5 h-2.5" /> Hitno
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Day Agenda & Shift Details (5 columns) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              {/* Header for Day Agenda */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs uppercase font-mono text-slate-400 font-bold">
                    Dnevna agenda klijenta
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {new Date(selectedDate).toLocaleDateString("sr-RS", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                </div>
                <button
                  onClick={() =>
                    handleOpenNewEventModal("meeting", selectedDate)
                  }
                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                  title="Dodaj novu obavezu za ovaj datum"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Day's Content List */}
              <div className="space-y-3 mt-3 max-h-[520px] overflow-y-auto pr-1">
                {/* 0. Evidentirana odsustva (Godišnji odmori i bolovanja) */}
                {selectedDateLeaves.length > 0 && (
                  <div className="space-y-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
                    <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Palmtree className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Odsustva Radnika ({selectedDateLeaves.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => openLeaveModal("", selectedDate)}
                        className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Dodaj
                      </button>
                    </div>

                    {selectedDateLeaves.map(({ emp, override }) => {
                      const isVacation = override.code === "GO";
                      const isSick = ["B", "B100", "RFZO"].includes(override.code);
                      return (
                        <div
                          key={`drawer-leave-${emp.id}-${selectedDate}`}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs">
                                {emp.ime}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {emp.pozicija}
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                isVacation
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              }`}
                            >
                              {isVacation ? "🏖️ GO (100%)" : `🩹 ${override.code} (${override.compensationPercentage || 65}%)`}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              Broj akta:{" "}
                              <strong className="text-slate-900 dark:text-white">
                                {override.doznakaBroj || "Nije uneto"}
                              </strong>
                            </div>
                            <div>
                              Fond:{" "}
                              <strong className="text-indigo-600 dark:text-indigo-400">
                                {override.vacationHours || override.sickHours || 8}h
                              </strong>
                            </div>
                          </div>

                          {override.notes && (
                            <div className="text-[10px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-1 rounded">
                              "{override.notes}"
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                setOverrideModalData({
                                  employee: emp,
                                  date: selectedDate,
                                  existingOverride: override,
                                })
                              }
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" /> Izmeni
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateWorkerDayOverride(emp.id, selectedDate, null)
                              }
                              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Ukloni
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 1. Radne smene zakazane za ovaj dan */}
                {selectedDateShifts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        Evidentirane Smene Radnika ({selectedDateShifts.length})
                      </span>
                    </div>

                    {selectedDateShifts.map((shift) => {
                      const isNight =
                        shift.startTime >= "20:00" ||
                        shift.startTime <= "06:00" ||
                        shift.crossesMidnight;
                      return (
                        <div
                          key={shift.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isNight ? "bg-indigo-950 text-indigo-400 border border-indigo-800" : "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"}`}
                            >
                              {isNight ? (
                                <Moon className="w-3.5 h-3.5" />
                              ) : (
                                <Sun className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {shift.location || "Smena radnika"}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {shift.startTime} – {shift.endTime}{" "}
                                {shift.crossesMidnight && "(+1 dan)"}
                              </div>
                            </div>
                          </div>

                          {isNight && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-mono text-[10px] font-bold">
                              +26% noćni
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Poslovni sastanci, pregovori, poreski rokovi i medicina rada */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      Poslovne Obaveze & Sastanci ({selectedDateEvents.length})
                    </span>
                  </div>

                  {selectedDateEvents.length === 0 &&
                  selectedDateShifts.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                      <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-500">
                        Nema zakazanih smena ili profesionalnih obaveza za ovaj
                        dan.
                      </p>
                      <button
                        onClick={() =>
                          handleOpenNewEventModal("meeting", selectedDate)
                        }
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-500 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Zakaži obavezu
                      </button>
                    </div>
                  ) : (
                    selectedDateEvents.map((ev) => {
                      const badge = getCategoryBadge(ev.category);
                      const priorityInfo = getPriorityBadge(ev.priority);
                      const isCompleted = ev.status === "completed";
                      return (
                        <div
                          key={ev.id}
                          className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${isCompleted ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-70" : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                              {ev.priority === "urgent" && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${priorityInfo.bg}`}
                                >
                                  {priorityInfo.label}
                                </span>
                              )}
                            </div>

                            {/* Status Toggle & Edit */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleComplete(ev)}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${isCompleted ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "text-slate-400 hover:text-slate-600"}`}
                                title={
                                  isCompleted
                                    ? "Ozna\u010Di kao nezavr\u0161eno"
                                    : "Ozna\u010Di kao obavljeno"
                                }
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditEvent(ev)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Izmeni"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteProfessionalEvent(ev.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Obriši"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <div
                              className={`font-bold text-slate-900 dark:text-white ${isCompleted ? "line-through text-slate-400" : ""}`}
                            >
                              {ev.title}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {ev.clientName}
                              </span>
                              {ev.workerName && (
                                <>
                                  <span>•</span>
                                  <span>{ev.workerName}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Time & Location */}
                          {(ev.startTime || ev.location) && (
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                              {ev.startTime && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {ev.startTime}{" "}
                                  {ev.endTime ? `\u2013 ${ev.endTime}` : ""}
                                </span>
                              )}
                              {ev.location && (
                                <span className="flex items-center gap-1 truncate max-w-[180px]">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {ev.location}
                                </span>
                              )}
                              {ev.financialAmount && (
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                  {ev.financialAmount} {ev.currency || "RSD"}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Statutory Note callout */}
                          {ev.complianceNote && (
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-[10px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{ev.complianceNote}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action bar at bottom of drawer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Izabrani datum: <strong>{selectedDate}</strong>
              </span>
              <button
                onClick={() =>
                  handleOpenNewEventModal("medical_bzr", selectedDate)
                }
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>+ Medicina rada</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODE 2: EVIDENCIJA RADNOG VREMENA (Individualni smenski režimi radnika i manuelne prepravke) */}
      {viewMode === "roster-grid" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Evidencija smena i radnog vremena:{" "}
                  {currentClient?.naziv || "Sve firme"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pojedinačni radnici u istoj firmi mogu imati različite smenske
                režime (8h redovno, 8h trosemenski, 12h turnus). Kliknite na
                bilo koje polje za <strong>manuelnu prepravku smene</strong>.
              </p>
            </div>

            {/* Action Buttons: Add Worker Shift CTA & Statutory note */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => openLeaveModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Palmtree className="w-4 h-4" />
                <span>+ Unos bolovanja / odmora</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddWorkerShiftOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Dodaj smenu radniku</span>
              </button>

              {/* Statutory Compliance Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Član 51, 62, 114 & 115 ZOR:</strong> Fond sati, naknade za bolovanje (65%) i godišnji odmor (100%)
                </span>
              </div>
            </div>
          </div>

          {/* Roster matrix table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 uppercase">
                  <th className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 w-60 font-sans font-bold">
                    Zaposleni / Dodeljeni režim rada
                  </th>
                  {daysInCurrentMonthForRoster.map((d) => (
                    <th
                      key={d.day}
                      className={`p-1 text-center w-7 border-l border-slate-200 dark:border-slate-800 ${d.dayOfWeek === "Sub" || d.dayOfWeek === "Ned" ? "bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold" : ""}`}
                    >
                      <div>{d.day}</div>
                      <div className="text-[8px] font-sans">{d.dayOfWeek}</div>
                    </th>
                  ))}
                  <th className="p-2 text-right font-sans font-bold w-14 text-slate-700 dark:text-slate-300">
                    Redovan
                  </th>
                  <th className="p-2 text-right font-sans font-bold w-14 text-emerald-600 dark:text-emerald-400">
                    GO (100%)
                  </th>
                  <th className="p-2 text-right font-sans font-bold w-14 text-rose-600 dark:text-rose-400">
                    Bolov. (65%)
                  </th>
                  <th className="p-2 text-right font-sans font-bold w-14 text-indigo-600 dark:text-indigo-400">
                    Noćni
                  </th>
                  <th className="p-2 text-right font-sans font-bold w-16">
                    Ukupno
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeCompanyEmployees.map((emp, idx) => {
                  let dayHours = 0;
                  let vacationHours = 0;
                  let sickHours = 0;
                  let nightHours = 0;
                  const workerRegime =
                    emp.smenskiRezim ||
                    (idx % 4 === 0
                      ? "12h_turnus"
                      : idx % 4 === 1
                        ? "8h_regular"
                        : idx % 4 === 2
                          ? "8h_three_shift"
                          : "8h_two_shift");
                  const phaseShift = idx * 2;
                  const isNightJob =
                    workerRegime === "12h_turnus" ||
                    workerRegime === "12h_continuous" ||
                    workerRegime === "8h_three_shift";
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="p-2.5 sticky left-0 bg-white dark:bg-slate-900 z-10 font-sans border-r border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {emp.ime}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mb-1">
                          {emp.pozicija}
                        </div>

                        {/* Interactive Regime Selector per worker */}
                        <div className="flex items-center gap-1">
                          <select
                            value={workerRegime}
                            onChange={(e) =>
                              updateWorkerRegime(emp.id, e.target.value)
                            }
                            className="w-full text-[10px] font-bold py-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer outline-none hover:border-indigo-400"
                            title="Kliknite za promenu smenskog režima ovog radnika"
                          >
                            <option value="8h_regular">
                              🕒 8h Redovno (08-16)
                            </option>
                            <option value="8h_three_shift">
                              🔄 8h Trosemenski (I/II/III)
                            </option>
                            <option value="8h_two_shift">
                              ⛅ 8h Dvosmenski (I/II)
                            </option>
                            <option value="12h_turnus">
                              ⏳ 12h Turnus (D-N-O-O)
                            </option>
                            <option value="12h_continuous">
                              ⚡ 12h Kontinualni (2D-2N-4O)
                            </option>
                            <option value="custom_flexible">
                              📌 Prilagođeno / Fleksibilno
                            </option>
                          </select>
                        </div>

                        {/* Night work medical check badge */}
                        {isNightJob && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] text-purple-600 dark:text-purple-400">
                            <Stethoscope className="w-2.5 h-2.5 shrink-0" />
                            <span>Lekarsko uverenje važi (čl. 62)</span>
                          </div>
                        )}
                      </td>
                      {daysInCurrentMonthForRoster.map((d, dayIdx) => {
                        let cellContent = "\u2014";
                        let cellBg = "text-slate-300 dark:text-slate-600";
                        let isOverridden = false;
                        const isWeekend =
                          d.dayOfWeek === "Sub" || d.dayOfWeek === "Ned";
                        const override = emp.manualOverrides?.[d.dateStr];
                        if (override) {
                          isOverridden = true;
                          cellContent = override.code;
                          switch (override.code) {
                            case "R":
                              dayHours += Number(override.dayHours) || 8;
                              cellBg =
                                "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-black";
                              break;
                            case "I":
                              dayHours += Number(override.dayHours) || 8;
                              cellBg =
                                "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-black";
                              break;
                            case "II":
                              dayHours += Number(override.dayHours) || 8;
                              cellBg =
                                "bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 font-black";
                              break;
                            case "III":
                              nightHours += Number(override.nightHours) || 8;
                              cellBg =
                                "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black";
                              break;
                            case "D":
                              dayHours += Number(override.dayHours) || 12;
                              cellBg =
                                "bg-yellow-100 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-300 font-black";
                              break;
                            case "N":
                              nightHours += Number(override.nightHours) || 12;
                              cellBg =
                                "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-black";
                              break;
                            case "GO":
                              vacationHours += Number(override.vacationHours || override.dayHours || 8);
                              cellBg =
                                "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black border border-emerald-300 dark:border-emerald-700";
                              break;
                            case "B":
                              sickHours += Number(override.sickHours || override.dayHours || 8);
                              cellBg =
                                "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-black border border-rose-300 dark:border-rose-700";
                              break;
                            case "B100":
                              sickHours += Number(override.sickHours || override.dayHours || 8);
                              cellBg =
                                "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-black border border-amber-300 dark:border-amber-700";
                              break;
                            case "RFZO":
                              sickHours += Number(override.sickHours || override.dayHours || 8);
                              cellBg =
                                "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-black border border-purple-300 dark:border-purple-700";
                              break;
                            case "P":
                              dayHours += Number(override.dayHours) || 8;
                              cellBg =
                                "bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 font-black";
                              break;
                            default:
                              dayHours += Number(override.dayHours) || 0;
                              nightHours += Number(override.nightHours) || 0;
                              cellBg =
                                "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold";
                              break;
                          }
                        } else {
                          switch (workerRegime) {
                            case "8h_regular":
                              if (isWeekend) {
                                cellContent = "O";
                                cellBg =
                                  "text-slate-400 bg-slate-50/50 dark:bg-slate-800/20";
                              } else {
                                cellContent = "R";
                                cellBg =
                                  "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold";
                                dayHours += 8;
                              }
                              break;
                            case "8h_three_shift":
                              if (isWeekend) {
                                cellContent = "O";
                                cellBg =
                                  "text-slate-400 bg-slate-50/50 dark:bg-slate-800/20";
                              } else {
                                const shiftStep = (dayIdx + phaseShift) % 3;
                                if (shiftStep === 0) {
                                  cellContent = "I";
                                  cellBg =
                                    "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold";
                                  dayHours += 8;
                                } else if (shiftStep === 1) {
                                  cellContent = "II";
                                  cellBg =
                                    "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold";
                                  dayHours += 8;
                                } else {
                                  cellContent = "III";
                                  cellBg =
                                    "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold";
                                  nightHours += 8;
                                }
                              }
                              break;
                            case "8h_two_shift":
                              if (isWeekend) {
                                cellContent = "O";
                                cellBg =
                                  "text-slate-400 bg-slate-50/50 dark:bg-slate-800/20";
                              } else {
                                const step = (dayIdx + phaseShift) % 2;
                                if (step === 0) {
                                  cellContent = "I";
                                  cellBg =
                                    "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold";
                                  dayHours += 8;
                                } else {
                                  cellContent = "II";
                                  cellBg =
                                    "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold";
                                  dayHours += 8;
                                }
                              }
                              break;
                            case "12h_turnus":
                              const cycleDay = (dayIdx + phaseShift) % 4;
                              if (cycleDay === 0) {
                                cellContent = "D";
                                cellBg =
                                  "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 font-bold";
                                dayHours += 12;
                              } else if (cycleDay === 1) {
                                cellContent = "N";
                                cellBg =
                                  "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold";
                                nightHours += 12;
                              } else {
                                cellContent = "O";
                                cellBg =
                                  "text-slate-400 bg-slate-50/50 dark:bg-slate-800/20";
                              }
                              break;
                            case "12h_continuous":
                              const contStep = (dayIdx + phaseShift) % 8;
                              if (contStep === 0 || contStep === 1) {
                                cellContent = "D";
                                cellBg =
                                  "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 font-bold";
                                dayHours += 12;
                              } else if (contStep === 2 || contStep === 3) {
                                cellContent = "N";
                                cellBg =
                                  "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold";
                                nightHours += 12;
                              } else {
                                cellContent = "O";
                                cellBg =
                                  "text-slate-400 bg-slate-50/50 dark:bg-slate-800/20";
                              }
                              break;
                            default:
                              if (isWeekend) {
                                cellContent = "O";
                                cellBg =
                                  "text-slate-400 bg-slate-50/50 dark:bg-slate-800/20";
                              } else {
                                cellContent = "R";
                                cellBg =
                                  "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold";
                                dayHours += 8;
                              }
                              break;
                          }
                        }
                        return (
                          <td
                            key={d.day}
                            className="p-0.5 text-center border-l border-slate-100 dark:border-slate-800"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOverrideModalData({
                                  employee: emp,
                                  date: d.dateStr,
                                  existingOverride:
                                    emp.manualOverrides?.[d.dateStr],
                                })
                              }
                              title={
                                isOverridden
                                  ? `Manuelna izmena: ${override?.label} ${override?.doznakaBroj ? `(Dokument: ${override.doznakaBroj})` : ""} ${override?.notes ? `("${override.notes}")` : ""} - Klikni za izmenu/brisanje`
                                  : `Smena: ${cellContent} (${d.dayOfWeek}, ${d.day}. ${currentCalendarDate.toLocaleString("sr-RS", { month: "short" })}) - Klikni za manuelnu prepravku`
                              }
                              className={`inline-block w-6 h-6 leading-6 rounded text-[10px] transition-transform hover:scale-110 cursor-pointer relative ${cellBg} ${isOverridden ? "ring-2 ring-indigo-500 font-black shadow-xs" : ""}`}
                            >
                              {cellContent}
                              {isOverridden && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-600 ring-1 ring-white dark:ring-slate-900" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="p-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        {dayHours}h
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {vacationHours}h
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {sickHours}h
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {nightHours}h
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {dayHours + vacationHours + sickHours + nightHours}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Legend & Quick Help */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-[11px] font-sans text-slate-500 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-200 dark:bg-emerald-900" />
                <strong>GO</strong> Godišnji odmor (100%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-200 dark:bg-rose-900" />
                <strong>B</strong> Bolovanje do 30d (65%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-200 dark:bg-blue-900" />
                <strong>R</strong> 8h Redovno
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-200 dark:bg-amber-900" />
                <strong>I</strong> 8h Jutarnja
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-orange-200 dark:bg-orange-900" />
                <strong>II</strong> 8h Popodnevna
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-indigo-200 dark:bg-indigo-900" />
                <strong>III</strong> 8h Noćna (+26%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-yellow-200 dark:bg-yellow-900" />
                <strong>D</strong> 12h Dan
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-purple-200 dark:bg-purple-900" />
                <strong>N</strong> 12h Noć (+26%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-200 dark:bg-emerald-900" />
                <strong>GO</strong> Odmor
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-200 dark:bg-rose-900" />
                <strong>B</strong> Bolovanje
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-red-200 dark:bg-red-900" />
                <strong>P</strong> Prekovremeno
              </span>
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Manuelna izmena
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddWorkerShiftOpen(true)}
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Dodaj smenu radniku</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenNewEventModal("medical_bzr")}
                className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer ml-3"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Zakaži periodični lekarski pregled</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODE 3: FREELANCE KLIJENTI & HONORARI */}
      {viewMode === "freelance-ledger" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Knjigovodstveno Praćenje Freelance Klijenata & Konsultanata
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evidencija ugovorenih konsultantskih sati, fakturisanja
                inostranim klijentima, limita paušala (6M RSD) i poreskih
                prijava (PP OPO-K)
              </p>
            </div>

            <button
              onClick={() => handleOpenNewEventModal("freelance_consulting")}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Evidentiraj Konsultantske Sate / Fakturu</span>
            </button>
          </div>

          {/* Cards of Freelance Clients */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies
              .filter((c) => c.clientType === "freelancer")
              .map((fc) => {
                const clientEvents = professionalEvents.filter(
                  (e) => e.clientId === fc.id,
                );
                const consultingEvents = clientEvents.filter(
                  (e) => e.category === "freelance_consulting",
                );
                const totalBilled = consultingEvents.reduce(
                  (acc, curr) => acc + (curr.financialAmount || 0),
                  0,
                );
                return (
                  <div
                    key={fc.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {fc.poreskiModel === "pausal"
                            ? "Pau\u0161alac (KPO)"
                            : fc.poreskiModel || "Freelance"}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm">
                          {fc.naziv}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fc.kontaktOsoba || "Samostalni konsultant"} • PIB:{" "}
                          <strong className="font-mono">{fc.pib}</strong>
                        </p>
                      </div>

                      {/* Hourly rate & Delatnost */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">
                            Ugovorena satnica:
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {fc.satnicaUgovorena
                              ? `${fc.satnicaUgovorena} ${fc.valuta || "EUR"}/h`
                              : "Nije definisana"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">
                            Fakturisano ovog meseca:
                          </span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {totalBilled > 0
                              ? `${totalBilled} ${fc.valuta || "EUR"}`
                              : "0 EUR"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-slate-400">
                            Limit paušala (6M RSD):
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                            U okviru limita
                          </span>
                        </div>
                      </div>

                      {/* Associated events for this freelancer */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">
                          Aktivnosti & Rokovi ({clientEvents.length})
                        </div>
                        {clientEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                              {ev.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {ev.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions for this Freelancer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleOpenNewEventModal(
                            "freelance_consulting",
                            selectedDate,
                          )
                        }
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs text-center transition-colors cursor-pointer"
                      >
                        + Obračun sati
                      </button>
                      <button
                        onClick={() =>
                          handleOpenNewEventModal("meeting", selectedDate)
                        }
                        className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                        title="Zakaži poresko savetovanje"
                      >
                        Sastanak
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 7. MODE 4: AGENDA LIST (REGISTAR SASTANAKA, PREGOVORA I ROKOVA) */}
      {viewMode === "agenda-list" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
          {/* Filters & Search Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži po nazivu, klijentu, radniku ili oznaci..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">Sve kategorije obaveza</option>
                <option value="meeting">🤝 Poslovni sastanci</option>
                <option value="negotiation">💼 Poslovni pregovori</option>
                <option value="tax_deadline">
                  🏛️ Poreski rokovi (ePorezi)
                </option>
                <option value="medical_bzr">🩺 Medicina rada & BZR</option>
                <option value="inspection">🔍 Inspekcija rada</option>
                <option value="freelance_consulting">💻 Freelance sati</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">Svi statusi</option>
                <option value="scheduled">📅 Zakazano</option>
                <option value="completed">✅ Obavljeno</option>
              </select>

              <button
                onClick={() => handleOpenNewEventModal("meeting")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova obaveza</span>
              </button>
            </div>
          </div>

          {/* Table / Cards of Events */}
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                Nema obaveza koje odgovaraju postavljenim filterima.
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const badge = getCategoryBadge(ev.category);
                const priorityInfo = getPriorityBadge(ev.priority);
                const isCompleted = ev.status === "completed";
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCompleted ? "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60" : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs"}`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${priorityInfo.bg}`}
                        >
                          {priorityInfo.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {ev.date} {ev.startTime ? `u ${ev.startTime}` : ""}
                        </span>
                        {ev.financialAmount && (
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {ev.financialAmount} {ev.currency || "RSD"}
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {ev.title}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Building className="w-3 h-3 text-indigo-500" />
                          {ev.clientName}
                        </span>
                        {ev.workerName && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {ev.workerName}
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {ev.location}
                          </span>
                        )}
                      </div>

                      {ev.complianceNote && (
                        <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>{ev.complianceNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions on event */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleToggleComplete(ev)}
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${isCompleted ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600"}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {isCompleted ? "Obavljeno" : "Ozna\u010Di obavljeno"}
                        </span>
                      </button>

                      <button
                        onClick={() => handleEditEvent(ev)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Izmeni"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteProfessionalEvent(ev.id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                        title="Obriši"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: PROFESSIONAL EVENT SCHEDULER & EDITOR */}
      <ProfessionalEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        defaultDate={modalDefaultDate}
        defaultCategory={modalDefaultCategory}
        defaultClientId={activeCompany?.id}
      />

      {/* MODAL: MANUELNA PREPRAVKA SMENE RADNIKA U KALENDARU */}
      {overrideModalData && (
        <WorkerCalendarOverrideModal
          employee={overrideModalData.employee}
          date={overrideModalData.date}
          companyName={currentClient?.naziv || "Preduze\u0107e"}
          existingOverride={overrideModalData.existingOverride}
          onClose={() => setOverrideModalData(null)}
          onSave={(override) => {
            updateWorkerDayOverride(
              overrideModalData.employee.id,
              overrideModalData.date,
              override,
            );
            setOverrideModalData(null);
          }}
        />
      )}

      {/* MODAL: DODAJ SMENU RADNIKU KLIJENTA */}
      {isAddWorkerShiftOpen && (
        <AddClientWorkerShiftModal
          isOpen={isAddWorkerShiftOpen}
          onClose={() => setIsAddWorkerShiftOpen(false)}
          initialCompanyId={activeCompany?.id}
          initialDate={selectedDate}
        />
      )}

      {/* MODAL: EVIDENCIJA BOLOVANJA I GODIŠNJEG ODMORA */}
      <WorkerLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={activeCompanyEmployees}
        initialWorkerId={leaveModalInitialWorkerId}
        initialDate={leaveModalInitialDate || selectedDate}
        onSaveLeave={(leaveData) => addWorkerLeave(leaveData)}
      />
    </div>
  );
};
