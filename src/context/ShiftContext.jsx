import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { INITIAL_JOBS, INITIAL_SHIFTS } from "../data/mockData";
import { calculateSerbianWorkerPayroll } from "../utils/payrollCalculator";
import { pluginManager } from "../plugins/PluginManager";
import {
  WORKSPACE_ROOT_NAME,
  restoreSavedWorkspaceHandle,
  verifyWorkspacePermission,
  pickAndInitializeWorkspace,
  clearSavedWorkspaceHandle,
  scanBrowserInputFiles,
  saveOutputToBrowserWorkspace,
} from "../utils/localWorkspaceEngine";
import {
  ACTIVE_OPERATOR_ID_KEY,
  DEFAULT_HITL_POLICY,
  DEFAULT_LOCAL_ACCOUNTS,
  hashPinSha256,
  loadLocalAccounts,
  saveLocalAccounts,
  loadLocalHitlLogs,
  saveLocalHitlLogs,
  loadAiUsageStats,
  saveAiUsageStats,
  clearAiResponseCache,
  buildMinimizedHitlServerPayload,
} from "../utils/localAccountsEngine";
const JOBS_STORAGE_KEY = "shiftpulse_jobs_v1";
const SHIFTS_STORAGE_KEY = "shiftpulse_shifts_v1";
const DARK_MODE_STORAGE_KEY = "shiftpulse_dark_mode_v1";
const CLOCK_STORAGE_KEY = "shiftpulse_active_clock_v1";
const COMPANIES_STORAGE_KEY = "shiftpulse_ledger_companies_v1";
const EMPLOYEES_STORAGE_KEY = "shiftpulse_ledger_employees_v1";
const EVENTS_STORAGE_KEY = "shiftpulse_professional_events_v2";
const LEAVES_STORAGE_KEY = "shiftpulse_leaves_v1";
const FINANCIAL_STORAGE_KEY = "shiftpulse_financial_ledger_v1";
const ShiftContext = createContext(void 0);
const COUNTRY_STORAGE_KEY = "shiftpulse_country_jurisdiction_v1";
const START_MENU_PREF_KEY = "shiftpulse_show_start_menu_v1";
const DEMO_CLEANUP_FLAG_KEY = "shiftpulse_prod_clean_v1";
const EULA_ACCEPTED_KEY = "shiftpulse_eula_accepted_v1";
const BYO_API_CONFIG_KEY = "shiftpulse_enterprise_byo_api_v1";
const LICENSE_KEY_STORAGE_KEY = "shiftpulse_license_key_v1";

const DEFAULT_BYO_API_CONFIG = {
  enabled: false,
  endpoint: "",
  apiKey: "",
  model: "gemini-4-hydrogen",
};

function mapServerLicenseSnapshot(data = {}, cachedKey = "") {
  return {
    valid: Boolean(data.valid ?? data.success),
    trial: Boolean(data.trial),
    expired: Boolean(data.expired),
    readOnlyLock: Boolean(data.readOnlyLock),
    corePerpetual: Boolean(data.corePerpetual),
    licenseId: data.licenseId || "",
    licenseType: data.licenseType || (data.valid ? "MID_MARKET_ANNUAL" : "UNLICENSED_SANDBOX"),
    tier: data.tier || "Sandbox Preview",
    licenciraniPravniSubjekat:
      data.licenciraniPravniSubjekat || "Accounting Workstation",
    pibAgencije: data.pibAgencije || "",
    issuedAt: data.issuedAt || null,
    datumIsteka: data.datumIsteka ?? null,
    coreExpiry: data.coreExpiry ?? data.core_expiry ?? null,
    lawTrackerSlaExpiry:
      data.lawTrackerSlaExpiry ?? data.law_tracker_sla_expiry ?? null,
    lawTrackerSlaActive: data.lawTrackerSlaActive !== false,
    lawTrackerSlaExpired: Boolean(data.lawTrackerSlaExpired),
    byoApiAllowed: Boolean(data.byoApiAllowed),
    boundFingerprint: data.boundFingerprint || null,
    boundHost: data.boundHost || null,
    workstationFingerprint: data.workstationFingerprint || "",
    maksimalnoRadnika: Number(data.maksimalnoRadnika) || 3,
    maxClientCompanies: Number(data.maxClientCompanies) || 3,
    maxOperatorSeats: Number(data.maxOperatorSeats) || 2,
    features: Array.isArray(data.features) ? data.features : [],
    antiClockTampering: data.antiClockTampering || { isTimeValid: true },
    kljuc: cachedKey || data.licenseId || "STATION-KEY",
    poruka: data.poruka || "",
  };
}

export const COUNTRY_JURISDICTIONS = [
  {
    code: "RS",
    name: "Republic of Serbia",
    nativeName: "Republika Srbija",
    currency: "RSD",
    status: "active",
    badge: "Launch v1.0 Active",
    lawScope: "Labor Law RS (Art. 57, 66–68, 108, 115), ZPDG, ZDOSO, PPP-PD XML, SEF eFaktura, NBS IPS",
  },
  {
    code: "HR",
    name: "Croatia",
    nativeName: "Hrvatska (EU)",
    currency: "EUR",
    status: "expansion",
    badge: "Expansion Phase",
    lawScope: "JOPPD, eRačun EU & Croatia Labor Act (coming in regional expansion)",
  },
  {
    code: "BA",
    name: "Bosnia & Herzegovina",
    nativeName: "Bosna i Hercegovina",
    currency: "BAM",
    status: "expansion",
    badge: "Expansion Phase",
    lawScope: "MIP-1023 & entity payroll frameworks (coming in regional expansion)",
  },
  {
    code: "ME",
    name: "Montenegro",
    nativeName: "Crna Gora",
    currency: "EUR",
    status: "expansion",
    badge: "Expansion Phase",
    lawScope: "IOPPD & Montenegro fiscalization rules (coming in regional expansion)",
  },
  {
    code: "SI",
    name: "Slovenia",
    nativeName: "Slovenija (EU)",
    currency: "EUR",
    status: "expansion",
    badge: "Expansion Phase",
    lawScope: "REK-O & EU Working Time Directive 2003/88/EC (coming in regional expansion)",
  },
  {
    code: "EU",
    name: "European Union (General)",
    nativeName: "EU Framework",
    currency: "EUR",
    status: "expansion",
    badge: "Expansion Phase",
    lawScope: "EU VAT OSS & 2003/88/EC rest compliance (coming in expansion)",
  },
];

const DEMO_COMPANY_IDS = new Set([
  "firma-1",
  "firma-2",
  "firma-3",
  "freelance-1",
  "freelance-2",
  "freelance-3",
]);
const DEMO_EMPLOYEE_IDS = new Set(["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"]);
const DEMO_FINANCIAL_IDS = new Set([
  "fin-demo-1",
  "fin-demo-2",
  "fin-demo-3",
  "fin-demo-4",
  "fin-demo-5",
  "fin-demo-6",
  "fin-demo-7",
  "fin-demo-8",
]);
const DEMO_LEAVE_IDS = new Set(["leave-demo-1", "leave-demo-2"]);
const DEMO_EVENT_IDS = new Set([
  "ev-1",
  "ev-2",
  "ev-3",
  "ev-4",
  "ev-5",
  "ev-6",
  "ev-7",
  "ev-8",
  "ev-9",
  "ev-10",
]);

function purgeLegacyDemoStorageOnce() {
  try {
    if (localStorage.getItem(DEMO_CLEANUP_FLAG_KEY) === "1") return;
    const stripDemo = (key, idSet) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const cleaned = arr.filter((item) => item && !idSet.has(item.id));
        localStorage.setItem(key, JSON.stringify(cleaned));
      }
    };
    stripDemo(COMPANIES_STORAGE_KEY, DEMO_COMPANY_IDS);
    stripDemo(EMPLOYEES_STORAGE_KEY, DEMO_EMPLOYEE_IDS);
    stripDemo(FINANCIAL_STORAGE_KEY, DEMO_FINANCIAL_IDS);
    stripDemo(LEAVES_STORAGE_KEY, DEMO_LEAVE_IDS);
    stripDemo(EVENTS_STORAGE_KEY, DEMO_EVENT_IDS);
    localStorage.setItem(DEMO_CLEANUP_FLAG_KEY, "1");
  } catch {}
}
purgeLegacyDemoStorageOnce();

const DEFAULT_COMPANIES = [];
const DEFAULT_PROFESSIONAL_EVENTS = [];
const DEFAULT_LEAVES = [];
const DEFAULT_EMPLOYEES = [];
const DEFAULT_FINANCIAL_RECORDS = [];
export const ShiftProvider = ({ children }) => {
  const [eulaAccepted, setEulaAccepted] = useState(() => {
    try {
      return localStorage.getItem(EULA_ACCEPTED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const acceptEula = () => {
    setEulaAccepted(true);
    try {
      localStorage.setItem(EULA_ACCEPTED_KEY, "1");
    } catch {}
  };

  const [byoApiConfig, setByoApiConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(BYO_API_CONFIG_KEY);
      if (saved) {
        return { ...DEFAULT_BYO_API_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_BYO_API_CONFIG;
  });

  const saveByoApiConfig = (nextConfig = {}) => {
    const cleaned = {
      enabled: Boolean(nextConfig.enabled),
      endpoint: String(nextConfig.endpoint || "").trim(),
      apiKey: String(nextConfig.apiKey || "").trim(),
      model: String(nextConfig.model || "gemini-4-hydrogen").trim() || "gemini-4-hydrogen",
    };
    setByoApiConfig(cleaned);
    try {
      localStorage.setItem(BYO_API_CONFIG_KEY, JSON.stringify(cleaned));
    } catch {}
    return cleaned;
  };

  const clearByoApiConfig = () => {
    setByoApiConfig(DEFAULT_BYO_API_CONFIG);
    try {
      localStorage.removeItem(BYO_API_CONFIG_KEY);
    } catch {}
  };

  const [license, setLicense] = useState(() =>
    mapServerLicenseSnapshot({
      valid: false,
      trial: true,
      readOnlyLock: false,
      licenseType: "UNLICENSED_SANDBOX",
      tier: "Sandbox Preview",
      licenciraniPravniSubjekat: "ShiftPulse Workstation",
      poruka: "Checking workstation license...",
    }),
  );
  const [licenseActionError, setLicenseActionError] = useState(null);
  const clearLicenseActionError = () => setLicenseActionError(null);

  const isReadOnlyLocked = Boolean(license?.readOnlyLock);

  const refreshLicenseStatus = async (keyOverride = "") => {
    try {
      const storedKey =
        keyOverride || localStorage.getItem(LICENSE_KEY_STORAGE_KEY) || "";
      const headers = {};
      if (storedKey) headers["x-license-key"] = storedKey;
      const res = await fetch("/api/license/status", { headers });
      const data = await res.json();
      if (data) {
        const mapped = mapServerLicenseSnapshot(data, storedKey);
        setLicense(mapped);
        return mapped;
      }
    } catch {
      setLicense((prev) => ({
        ...prev,
        valid: false,
        byoApiAllowed: false,
        poruka: "Offline local workstation mode.",
      }));
    }
    return null;
  };

  const startTrial14d = async ({
    companyName = "Evaluation Agency",
    companyTaxId = "000000000",
  } = {}) => {
    if (!eulaAccepted) {
      return { ok: false, code: "EULA_REQUIRED", error: "EULA acceptance required." };
    }
    const res = await fetch("/api/license/start-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eulaAccepted: true,
        companyName,
        companyTaxId,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      return { ok: false, error: data?.error || "Failed to start 14-day trial.", code: data?.code };
    }
    if (data.licenseKey) {
      try {
        localStorage.setItem(LICENSE_KEY_STORAGE_KEY, data.licenseKey);
      } catch {}
    }
    const mapped = mapServerLicenseSnapshot(data.status || {}, data.licenseKey || "");
    setLicense(mapped);
    setLicenseActionError(null);
    return { ok: true, status: mapped, licenseKey: data.licenseKey };
  };

  const activateCommercialLicense = async (kljucLicence) => {
    if (!eulaAccepted) {
      return { ok: false, code: "EULA_REQUIRED", error: "EULA acceptance required." };
    }
    const trimmed = String(kljucLicence || "").trim();
    const res = await fetch("/api/license/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kljucLicence: trimmed,
        eulaAccepted: true,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      if (data?.readOnlyLock) {
        await refreshLicenseStatus(trimmed);
      }
      return {
        ok: false,
        error: data?.error || "License activation failed.",
        expired: Boolean(data?.expired),
        readOnlyLock: Boolean(data?.readOnlyLock),
      };
    }
    try {
      localStorage.setItem(LICENSE_KEY_STORAGE_KEY, trimmed);
    } catch {}
    const mapped = mapServerLicenseSnapshot(data.status || {}, trimmed);
    setLicense(mapped);
    setLicenseActionError(null);
    return { ok: true, status: mapped };
  };

  useEffect(() => {
    refreshLicenseStatus();
  }, []);
  const [companies, setCompanies] = useState(() => {
    try {
      const saved = localStorage.getItem(COMPANIES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COMPANIES;
  });
  const [activeCompany, setActiveCompany] = useState(
    () => companies[0] || null,
  );
  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((emp, idx) => ({
            ...emp,
            smenskiRezim:
              emp.smenskiRezim ||
              (idx % 4 === 0
                ? "12h_turnus"
                : idx % 4 === 1
                  ? "8h_regular"
                  : idx % 4 === 2
                    ? "8h_three_shift"
                    : "8h_two_shift"),
            manualOverrides: emp.manualOverrides || {},
          }));
        }
      }
    } catch {}
    return DEFAULT_EMPLOYEES;
  });
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = localStorage.getItem(JOBS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_JOBS;
  });
  const [shifts, setShifts] = useState(() => {
    try {
      const saved = localStorage.getItem(SHIFTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SHIFTS;
  });
  const [professionalEvents, setProfessionalEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROFESSIONAL_EVENTS;
  });
  const [activeClock, setActiveClock] = useState(() => {
    try {
      const saved = localStorage.getItem(CLOCK_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });
  const [mobileFrameMode, setMobileFrameMode] = useState(false);
  const [currentTab, setCurrentTab] = useState("profit-tax");
  const [activeJobFilter, setActiveJobFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = /* @__PURE__ */ new Date();
    return today.toISOString().split("T")[0];
  });
  const [editingShift, setEditingShift] = useState(null);
  const [leaves, setLeaves] = useState(() => {
    try {
      const saved = localStorage.getItem(LEAVES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_LEAVES;
  });
  const [financialRecords, setFinancialRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(FINANCIAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FINANCIAL_RECORDS;
  });
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveModalInitialWorkerId, setLeaveModalInitialWorkerId] = useState("");
  const [leaveModalInitialDate, setLeaveModalInitialDate] = useState("");

  const openLeaveModal = (workerId = "", date = "") => {
    setLeaveModalInitialWorkerId(workerId);
    setLeaveModalInitialDate(date);
    setIsLeaveModalOpen(true);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [addModalDefaultDate, setAddModalDefaultDate] = useState(null);
  const isPremium = true;
  const setIsPremium = () => {};
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCircadianModalOpen, setIsCircadianModalOpen] = useState(false);
  const [countryCode, setCountryCodeState] = useState(() => {
    try {
      const saved = localStorage.getItem(COUNTRY_STORAGE_KEY);
      if (saved === "RS") return "RS";
    } catch {}
    return "RS";
  });
  const setCountryCode = (code) => {
    const valid = COUNTRY_JURISDICTIONS.find((c) => c.code === code && c.status === "active");
    if (!valid) return;
    setCountryCodeState(valid.code);
    try {
      localStorage.setItem(COUNTRY_STORAGE_KEY, valid.code);
    } catch {}
  };

  const [showStartMenuOnLaunch, setShowStartMenuOnLaunchState] = useState(() => {
    try {
      const saved = localStorage.getItem(START_MENU_PREF_KEY);
      if (saved === "false") return false;
    } catch {}
    return true;
  });
  const setShowStartMenuOnLaunch = (enabled) => {
    setShowStartMenuOnLaunchState(Boolean(enabled));
    try {
      localStorage.setItem(START_MENU_PREF_KEY, enabled ? "true" : "false");
    } catch {}
  };
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(() => {
    try {
      return localStorage.getItem(START_MENU_PREF_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const openStartMenu = () => setIsStartMenuOpen(true);
  const closeStartMenu = () => setIsStartMenuOpen(false);

  const [isAccountsHitlOpen, setIsAccountsHitlOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [legalModalState, setLegalModalState] = useState({
    isOpen: false,
    tab: "privacy",
  });
  const openAccountsHitl = () => setIsAccountsHitlOpen(true);
  const closeAccountsHitl = () => setIsAccountsHitlOpen(false);
  const openLicenseModal = () => setIsLicenseModalOpen(true);
  const closeLicenseModal = () => setIsLicenseModalOpen(false);
  const openDataModal = () => setIsDataModalOpen(true);
  const closeDataModal = () => setIsDataModalOpen(false);
  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => setIsOnboardingOpen(false);
  const openLegalModal = (tab = "privacy") =>
    setLegalModalState({ isOpen: true, tab });
  const closeLegalModal = () =>
    setLegalModalState((prev) => ({ ...prev, isOpen: false }));

  const [commHubConfig, setCommHubConfig] = useState({
    isOpen: false,
    tab: "email",
    template: "profit-tax",
  });
  const openSubscriptionModal = () => setIsSubscriptionModalOpen(true);
  const openCircadianModal = () => setIsCircadianModalOpen(true);
  const openCommHub = (tab = "email", template = "profit-tax") =>
    setCommHubConfig({ isOpen: true, tab, template });
  const closeCommHub = () =>
    setCommHubConfig((prev) => ({ ...prev, isOpen: false }));

  // Hybrid Zero-Knowledge Local Workspace & Gateway State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [gatewayStatus, setGatewayStatus] = useState({
    gatewayRole: "license-and-regulatory-gateway",
    zeroKnowledgePrivacy: true,
    clientDataStoredOnServer: false,
    localDesktopActive: false,
    workspacePath: null,
  });
  const [workspaceHandle, setWorkspaceHandle] = useState(null);
  const [workspacePermissionState, setWorkspacePermissionState] = useState("none"); // 'none' | 'prompt' | 'granted'
  const [lastBackupAt, setLastBackupAt] = useState(() => {
    try {
      return localStorage.getItem("shiftpulse_last_backup_v1") || "";
    } catch {
      return "";
    }
  });

  // Lokalni korisnički nalozi & Human-in-the-Loop (HITL) podešavanja (isključivo na uređaju)
  const [localAccounts, setLocalAccounts] = useState(() => loadLocalAccounts());
  const [activeOperatorId, setActiveOperatorId] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_OPERATOR_ID_KEY);
      if (saved) return saved;
    } catch {}
    return DEFAULT_LOCAL_ACCOUNTS[0].id;
  });
  const [localHitlLogs, setLocalHitlLogs] = useState(() => loadLocalHitlLogs());
  const [aiUsageStats, setAiUsageStats] = useState(() => loadAiUsageStats());

  const activeOperator = useMemo(
    () =>
      localAccounts.find((a) => a.id === activeOperatorId) ||
      localAccounts[0] ||
      DEFAULT_LOCAL_ACCOUNTS[0],
    [localAccounts, activeOperatorId],
  );

  useEffect(() => {
    saveLocalAccounts(localAccounts);
  }, [localAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_OPERATOR_ID_KEY, activeOperator.id);
    } catch {}
  }, [activeOperator?.id]);

  useEffect(() => {
    saveLocalHitlLogs(localHitlLogs);
  }, [localHitlLogs]);

  useEffect(() => {
    saveAiUsageStats(aiUsageStats);
  }, [aiUsageStats]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    fetch("/api/gateway/status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setGatewayStatus(d);
      })
      .catch(() => {});

    restoreSavedWorkspaceHandle().then(async (handle) => {
      if (handle) {
        setWorkspaceHandle(handle);
        const granted = await verifyWorkspacePermission(handle, false);
        setWorkspacePermissionState(granted ? "granted" : "prompt");
      }
    });

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const connectWorkspaceFolder = async () => {
    const handle = await pickAndInitializeWorkspace();
    setWorkspaceHandle(handle);
    setWorkspacePermissionState("granted");
    return handle;
  };

  const reconnectWorkspaceFolder = async () => {
    if (!workspaceHandle) return connectWorkspaceFolder();
    const ok = await verifyWorkspacePermission(workspaceHandle, true);
    setWorkspacePermissionState(ok ? "granted" : "prompt");
    return ok;
  };

  const initLocalDesktopWorkspace = async () => {
    const res = await fetch("/api/workspace/init", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Lokalni desktop workspace nije dostupan.");
    }
    setGatewayStatus((prev) => ({
      ...prev,
      localDesktopActive: true,
      workspacePath: data.workspacePath,
    }));
    return data;
  };

  const disconnectWorkspaceFolder = async () => {
    await clearSavedWorkspaceHandle();
    setWorkspaceHandle(null);
    setWorkspacePermissionState("none");
  };

  const scanWorkspaceInputDocuments = async () => {
    const items = [];
    if (workspaceHandle && workspacePermissionState === "granted") {
      const browserItems = await scanBrowserInputFiles(workspaceHandle);
      items.push(...browserItems);
    }
    if (gatewayStatus.localDesktopActive) {
      try {
        const res = await fetch("/api/workspace/input-files");
        const data = await res.json();
        if (data?.success && Array.isArray(data.files)) {
          items.push(...data.files);
        }
      } catch {}
    }
    return items;
  };

  const loadWorkspaceInputFileObject = async (item) => {
    if (item.file) return item.file;
    if (item.source === "local-desktop" && item.relativePath) {
      const res = await fetch(
        `/api/workspace/read-input-file?path=${encodeURIComponent(item.relativePath)}`,
      );
      if (!res.ok) throw new Error("Nije moguće pročitati ulazni fajl sa diska.");
      const blob = await res.blob();
      return new File([blob], item.name, {
        type: blob.type || "application/octet-stream",
        lastModified: item.lastModified || Date.now(),
      });
    }
    throw new Error("Nepoznat izvor ulaznog fajla.");
  };

  const saveOutputDocumentToWorkspace = async ({
    topFolder = "02_Izlaz_Dokumenta",
    subFolder = "Bilansi_Porezi_CSV",
    filename,
    content,
  }) => {
    if (workspaceHandle) {
      const granted = await verifyWorkspacePermission(workspaceHandle, true);
      if (granted) {
        setWorkspacePermissionState("granted");
        return saveOutputToBrowserWorkspace(
          workspaceHandle,
          topFolder,
          subFolder,
          filename,
          content,
        );
      }
    }
    if (gatewayStatus.localDesktopActive) {
      const res = await fetch("/api/workspace/save-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topFolder, subFolder, filename, content }),
      });
      const data = await res.json();
      if (data?.success) {
        return { ok: true, relativePath: data.savedPath };
      }
    }
    return { ok: false, reason: "Nema povezanog lokalnog workspace foldera." };
  };

  const markBackupCompleted = () => {
    const now = new Date().toISOString();
    setLastBackupAt(now);
    try {
      localStorage.setItem("shiftpulse_last_backup_v1", now);
    } catch {}
  };

  const createLocalAccount = async ({
    username,
    displayName,
    role = "Operater Unosa",
    pin = "",
    hitlPolicy = DEFAULT_HITL_POLICY,
  }) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return { error: "READ_ONLY_LOCK" };
    }
    if (
      license?.valid &&
      license?.licenseType === "MID_MARKET_ANNUAL" &&
      localAccounts.length >= (Number(license?.maxOperatorSeats) || 5)
    ) {
      const maxSeats = Number(license?.maxOperatorSeats) || 5;
      setLicenseActionError({ code: "LIMIT_SEATS", max: maxSeats });
      return { error: "LIMIT_SEATS", max: maxSeats };
    }
    const cleanUser = String(username || displayName || "operater")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "_");
    const pinHash = pin ? await hashPinSha256(pin) : "";
    const newAcc = {
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUser || `op_${Date.now().toString().slice(-4)}`,
      displayName: String(displayName || username || "Novi Operater").trim(),
      role,
      hasPin: Boolean(pinHash),
      pinHash,
      hitlPolicy: { ...DEFAULT_HITL_POLICY, ...hitlPolicy },
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    setLocalAccounts((prev) => [...prev, newAcc]);
    setActiveOperatorId(newAcc.id);
    return newAcc;
  };

  const updateLocalAccount = async (accountId, updates = {}) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    let nextPinHash;
    if (typeof updates.newPin === "string") {
      nextPinHash = updates.newPin ? await hashPinSha256(updates.newPin) : "";
    }
    setLocalAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== accountId) return acc;
        const { newPin, ...rest } = updates;
        return {
          ...acc,
          ...rest,
          ...(nextPinHash !== undefined
            ? { hasPin: Boolean(nextPinHash), pinHash: nextPinHash }
            : {}),
          hitlPolicy: updates.hitlPolicy
            ? { ...DEFAULT_HITL_POLICY, ...acc.hitlPolicy, ...updates.hitlPolicy }
            : acc.hitlPolicy,
        };
      }),
    );
  };

  const deleteLocalAccount = (accountId) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return false;
    }
    if (localAccounts.length <= 1) return false;
    const remaining = localAccounts.filter((a) => a.id !== accountId);
    setLocalAccounts(remaining);
    if (activeOperator.id === accountId && remaining[0]) {
      setActiveOperatorId(remaining[0].id);
    }
    return true;
  };

  const verifyOperatorPin = async (accountId, pinInput) => {
    const target = localAccounts.find((a) => a.id === accountId);
    if (!target || !target.hasPin) return true;
    const enteredHash = await hashPinSha256(pinInput);
    return enteredHash === target.pinHash;
  };

  const switchLocalAccount = async (accountId, pinInput = "") => {
    const target = localAccounts.find((a) => a.id === accountId);
    if (!target) return { ok: false, reason: "Nalog nije pronađen." };
    if (target.hasPin) {
      const valid = await verifyOperatorPin(accountId, pinInput);
      if (!valid) {
        return { ok: false, reason: "Pogrešan PIN za izabrani lokalni nalog." };
      }
    }
    setActiveOperatorId(target.id);
    setLocalAccounts((prev) =>
      prev.map((a) =>
        a.id === target.id ? { ...a, lastActiveAt: new Date().toISOString() } : a,
      ),
    );
    return { ok: true, account: target };
  };

  const recordAiUsageStats = ({ source, totalTokens = 0, savedTokens = 0 }) => {
    setAiUsageStats((prev) => ({
      totalRequests: prev.totalRequests + 1,
      localResolvedCount:
        prev.localResolvedCount + (source === "local_prefilter" ? 1 : 0),
      cacheHitCount: prev.cacheHitCount + (source === "local_cache" ? 1 : 0),
      geminiCallsCount: prev.geminiCallsCount + (source === "gemini_api" ? 1 : 0),
      totalTokensUsed: prev.totalTokensUsed + (Number(totalTokens) || 0),
      estimatedTokensSaved: prev.estimatedTokensSaved + (Number(savedTokens) || 0),
    }));
  };

  const clearLocalAiCache = () => {
    clearAiResponseCache();
  };

  const logHitlDecision = async ({
    module,
    decision,
    aiModel = "gemini-4-hydrogen",
    executionSource = "gemini_api",
    totalTokens = 0,
    localSummary = "",
  }) => {
    const serverPayload = buildMinimizedHitlServerPayload({
      licenseId: license?.kljuc || license?.licenseId || "STATION-LOCAL",
      operator: activeOperator,
      module,
      decision,
      aiModel,
      executionSource,
      totalTokens,
    });

    const localEntry = {
      ...serverPayload,
      localId: `lhitl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      displayName: activeOperator?.displayName || "Lokalni Operater",
      localSummary,
      serverSyncStatus: "pending",
    };

    try {
      const res = await fetch("/api/hitl/log-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serverPayload),
      });
      const data = await res.json();
      localEntry.serverSyncStatus = data?.success ? "synced" : "local_only";
      if (data?.entry?.logId) localEntry.serverLogId = data.entry.logId;
    } catch {
      localEntry.serverSyncStatus = "offline_queued";
    }

    setLocalHitlLogs((prev) => [localEntry, ...prev].slice(0, 200));
    return localEntry;
  };

  const workspaceConnected =
    Boolean(workspaceHandle && workspacePermissionState === "granted") ||
    Boolean(gatewayStatus.localDesktopActive);

  const workspaceDisplayName =
    workspaceHandle?.name ||
    (gatewayStatus.localDesktopActive
      ? gatewayStatus.workspacePath || WORKSPACE_ROOT_NAME
      : "");
  useEffect(() => {
    try {
      localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
    } catch (e) {
      console.error(e);
    }
  }, [companies]);
  useEffect(() => {
    try {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
    } catch (e) {
      console.error(e);
    }
  }, [employees]);
  useEffect(() => {
    try {
      localStorage.setItem(LEAVES_STORAGE_KEY, JSON.stringify(leaves));
    } catch (e) {
      console.error(e);
    }
  }, [leaves]);
  useEffect(() => {
    try {
      localStorage.setItem(FINANCIAL_STORAGE_KEY, JSON.stringify(financialRecords));
    } catch (e) {
      console.error(e);
    }
  }, [financialRecords]);
  useEffect(() => {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch (e) {
      console.error(e);
    }
  }, [jobs]);
  useEffect(() => {
    try {
      localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
    } catch (e) {
      console.error(e);
    }
  }, [shifts]);
  useEffect(() => {
    try {
      localStorage.setItem(
        EVENTS_STORAGE_KEY,
        JSON.stringify(professionalEvents),
      );
    } catch (e) {
      console.error(e);
    }
  }, [professionalEvents]);
  useEffect(() => {
    try {
      if (activeClock) {
        localStorage.setItem(CLOCK_STORAGE_KEY, JSON.stringify(activeClock));
      } else {
        localStorage.removeItem(CLOCK_STORAGE_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeClock]);
  useEffect(() => {
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(darkMode));
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error(e);
    }
  }, [darkMode]);
  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const addCompany = (companyData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return null;
    }
    if (
      license?.valid &&
      license?.licenseType === "MID_MARKET_ANNUAL" &&
      companies.length >= (Number(license?.maxClientCompanies) || 25)
    ) {
      setLicenseActionError({
        code: "LIMIT_CLIENTS",
        max: Number(license?.maxClientCompanies) || 25,
      });
      return null;
    }
    const newCompany = {
      ...companyData,
      id: `firma-${Date.now()}`,
    };
    setCompanies((prev) => [...prev, newCompany]);
    setActiveCompany(newCompany);
    return newCompany;
  };
  const updateCompany = (id, updates) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
    if (activeCompany?.id === id) {
      setActiveCompany((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };
  const deleteCompany = (id) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setEmployees((prev) => prev.filter((e) => e.companyId !== id));
    if (activeCompany?.id === id) {
      const remaining = companies.filter((c) => c.id !== id);
      setActiveCompany(remaining[0] || null);
    }
  };
  const exportCompanyDossierJson = (companyId) => {
    const targetComp = companies.find((c) => c.id === companyId);
    if (!targetComp) return "{}";
    const compEmployees = employees.filter((e) => e.companyId === companyId);
    const compShifts = shifts.filter((s) => {
      const emp = compEmployees.find(
        (e) => e.id === s.notes || e.ime === s.location,
      );
      return !!emp;
    });
    const dossier = {
      company: targetComp,
      employees: compEmployees,
      shifts: compShifts,
      exportedAt: /* @__PURE__ */ new Date().toISOString(),
    };
    return JSON.stringify(dossier, null, 2);
  };
  const importCompanyDossierJson = (jsonStr) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return false;
    }
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.company && parsed.company.pib) {
        const existingCompIndex = companies.findIndex(
          (c) => c.pib === parsed.company.pib,
        );
        if (existingCompIndex >= 0) {
          setCompanies((prev) =>
            prev.map((c, idx) =>
              idx === existingCompIndex ? { ...c, ...parsed.company } : c,
            ),
          );
          setActiveCompany(parsed.company);
        } else {
          if (
            license?.valid &&
            license?.licenseType === "MID_MARKET_ANNUAL" &&
            companies.length >= (Number(license?.maxClientCompanies) || 25)
          ) {
            setLicenseActionError({
              code: "LIMIT_CLIENTS",
              max: Number(license?.maxClientCompanies) || 25,
            });
            return false;
          }
          setCompanies((prev) => [...prev, parsed.company]);
          setActiveCompany(parsed.company);
        }
        if (Array.isArray(parsed.employees)) {
          setEmployees((prev) => {
            const filtered = prev.filter(
              (e) => e.companyId !== parsed.company.id,
            );
            return [...filtered, ...parsed.employees];
          });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };
  const addEmployee = (empData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return null;
    }
    const newEmp = {
      ...empData,
      id: `r-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setEmployees((prev) => [...prev, newEmp]);
    updateCompany(newEmp.companyId, {
      radniciBroj:
        employees.filter((e) => e.companyId === newEmp.companyId).length + 1,
    });
    return newEmp;
  };
  const updateEmployee = (id, updates) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
  };
  const deleteEmployee = (id) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    const emp = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (emp) {
      updateCompany(emp.companyId, {
        radniciBroj: Math.max(
          0,
          employees.filter((e) => e.companyId === emp.companyId && e.id !== id)
            .length,
        ),
      });
    }
  };
  const updateWorkerRegime = (employeeId, regime) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, smenskiRezim: regime } : emp,
      ),
    );
  };
  const updateWorkerDayOverride = (employeeId, date, override) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const currentOverrides = { ...(emp.manualOverrides || {}) };
        if (override) {
          currentOverrides[date] = override;
        } else {
          delete currentOverrides[date];
        }
        const updated = {
          ...emp,
          manualOverrides: currentOverrides,
        };
        const statutory = calculateSerbianWorkerPayroll(updated);
        return {
          ...updated,
          obracun: statutory,
          kompletan: true,
        };
      }),
    );
  };
  const addWorkerLeave = (leaveData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setLeaves((prev) => [leaveData, ...prev]);

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== leaveData.workerId) return emp;
        const currentOverrides = { ...(emp.manualOverrides || {}) };

        leaveData.daysList.forEach((dateStr) => {
          currentOverrides[dateStr] = {
            date: dateStr,
            code: leaveData.code,
            label: `${leaveData.code} (${leaveData.hoursPerDay}h)`,
            dayHours: 0,
            vacationHours: leaveData.code === "GO" ? leaveData.hoursPerDay : 0,
            sickHours: ["B", "B100", "RFZO"].includes(leaveData.code) ? leaveData.hoursPerDay : 0,
            leaveType: leaveData.leaveType,
            compensationPercentage: leaveData.compensationPercent,
            doznakaBroj: leaveData.doznakaBroj,
            notes: leaveData.notes || leaveData.label,
            leaveId: leaveData.id,
            isManualOverride: true,
            modifiedAt: new Date().toISOString(),
          };
        });

        const updated = {
          ...emp,
          manualOverrides: currentOverrides,
        };
        const statutory = calculateSerbianWorkerPayroll(updated);
        return {
          ...updated,
          obracun: statutory,
          kompletan: true,
        };
      }),
    );
  };
  const deleteWorkerLeave = (leaveId) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setLeaves((prev) => prev.filter((l) => l.id !== leaveId));

    setEmployees((prev) =>
      prev.map((emp) => {
        const currentOverrides = { ...(emp.manualOverrides || {}) };
        let modified = false;
        Object.keys(currentOverrides).forEach((dateKey) => {
          if (currentOverrides[dateKey]?.leaveId === leaveId) {
            delete currentOverrides[dateKey];
            modified = true;
          }
        });
        if (!modified) return emp;
        const updated = {
          ...emp,
          manualOverrides: currentOverrides,
        };
        const statutory = calculateSerbianWorkerPayroll(updated);
        return {
          ...updated,
          obracun: statutory,
          kompletan: true,
        };
      }),
    );
  };
  const calculatePayrollForCompany = async (companyId) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    const targetEmployees = employees.filter((e) => e.companyId === companyId);
    if (targetEmployees.length === 0) return;
    try {
      // Zero-Knowledge: Sav obračun zarada ostaje isključivo lokalno na uređaju korisnika
      const calculated = targetEmployees.map((emp) => {
        const statutory = calculateSerbianWorkerPayroll(emp);
        return {
          ...emp,
          obracun: statutory,
          kompletan: true,
        };
      });

      setEmployees((prev) =>
        prev.map((orig) => {
          const updated = calculated.find((c) => c.id === orig.id);
          return updated || orig;
        }),
      );
    } catch (err) {
      console.error("Greška pri obračunu plata za firmu:", err);
    }
  };
  const addJob = (jobData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return null;
    }
    const newJob = {
      ...jobData,
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setJobs((prev) => [newJob, ...prev]);
    return newJob;
  };
  const updateJob = (id, updates) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    );
  };
  const deleteJob = (id) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setShifts((prev) => prev.filter((s) => s.jobId !== id));
  };
  const getJobById = (id) => jobs.find((j) => j.id === id);
  const addJobFromAi = (aiData) => {
    const contract = aiData.contractAnalysis || {};
    const rules = aiData.extractedRules || {};
    const presetColors = [
      "#059669",
      "#6366f1",
      "#d97706",
      "#e11d48",
      "#0284c7",
      "#7c3aed",
    ];
    const randomColor =
      presetColors[Math.floor(Math.random() * presetColors.length)];
    const newJobData = {
      name: contract.employerName || "Novi Poslodavac (AI Sken)",
      role: contract.detectedRole || "Zaposleni",
      color: randomColor,
      baseHourlyRate: Number(contract.baseHourlyRate) || 0,
      currency: contract.currency || "RSD",
      payCycle: "monthly",
      payPeriodAnchorDate: /* @__PURE__ */ new Date()
        .toISOString()
        .split("T")[0],
      routineBreakRules: {
        enabled: true,
        thresholdHours: 5,
        durationMinutes: 30,
        isPaid: false,
        autoDeduct: true,
      },
      overtimeRules: {
        enabled: true,
        dailyThresholdHours: Number(rules.dailyOvertimeThreshold) || 8,
        dailyOtMultiplier: Number(rules.overtimeMultiplier) || 1.26,
        doubleTimeThresholdHours: 12,
        doubleTimeMultiplier: 2,
        weeklyThresholdHours: 40,
        weeklyOtMultiplier: 1.26,
      },
      differentialRules: {
        nightDiffEnabled: rules.nightDiffEnabled ?? true,
        nightStartTime: rules.nightShiftWindow?.start || "22:00",
        nightEndTime: rules.nightShiftWindow?.end || "06:00",
        nightDiffType: "percentage",
        nightDiffValue: Number(rules.nightDiffValue) || 26,
        weekendBonusMultiplier: 1,
      },
      taxAndDeductions: {
        estimatedTaxRatePercent: 20,
        fixedDeductionPerPeriod: 0,
      },
    };
    return addJob(newJobData);
  };
  const addShift = (shiftData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return null;
    }
    const newShift = {
      ...shiftData,
      id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setShifts((prev) => [newShift, ...prev]);
    return newShift;
  };
  const updateShift = (id, updates) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };
  const deleteShift = (id) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setShifts((prev) => prev.filter((s) => s.id !== id));
  };
  const addShiftsBatch = (newShiftsData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    const timestamp = Date.now();
    const createdList = newShiftsData.map((s, idx) => ({
      ...s,
      id: `shift-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    }));
    setShifts((prev) => [...createdList, ...prev]);
  };
  const deleteShiftsByJobAndRange = (jobId, startDate, endDate) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setShifts((prev) =>
      prev.filter(
        (s) => !(s.jobId === jobId && s.date >= startDate && s.date <= endDate),
      ),
    );
  };
  const duplicateShift = (shiftId, targetDate) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    const existing = shifts.find((s) => s.id === shiftId);
    if (!existing) return;
    const duplicated = {
      ...existing,
      id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: targetDate,
      status: "scheduled",
      breaks: existing.breaks.map((b) => ({
        ...b,
        id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      })),
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setShifts((prev) => [duplicated, ...prev]);
  };
  const addBreakToShift = (shiftId, breakData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    const newBreak = {
      ...breakData,
      id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          breaks: [...(s.breaks || []), newBreak],
        };
      }),
    );
  };
  const removeBreakFromShift = (shiftId, breakId) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          breaks: (s.breaks || []).filter((b) => b.id !== breakId),
        };
      }),
    );
  };
  const updateBreakInShift = (shiftId, breakId, updates) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          breaks: (s.breaks || []).map((b) =>
            b.id === breakId ? { ...b, ...updates } : b,
          ),
        };
      }),
    );
  };
  const clockIn = (jobId) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const dateStr = now.toISOString().split("T")[0];
    const createdShift = addShift({
      jobId,
      date: dateStr,
      startTime: timeStr,
      endTime: timeStr,
      crossesMidnight: false,
      status: "active",
      breaks: [],
      notes: "Logged via live clock in",
    });
    if (!createdShift) return;
    setActiveClock({
      jobId,
      shiftId: createdShift.id,
      clockInTime: now.toISOString(),
      activeBreak: null,
    });
  };
  const clockOut = () => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    if (!activeClock) return;
    const now = /* @__PURE__ */ new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    if (activeClock.shiftId) {
      const existing = shifts.find((s) => s.id === activeClock.shiftId);
      if (existing) {
        const startH = parseInt(existing.startTime.split(":")[0], 10);
        const endH = now.getHours();
        const crossesMidnight = endH < startH;
        updateShift(activeClock.shiftId, {
          endTime: timeStr,
          status: "completed",
          crossesMidnight,
        });
      }
    }
    setActiveClock(null);
  };
  const startLiveBreak = (name, isPaid) => {
    if (!activeClock) return;
    setActiveClock({
      ...activeClock,
      activeBreak: {
        startTime: /* @__PURE__ */ new Date().toISOString(),
        name,
        isPaid,
      },
    });
  };
  const endLiveBreak = () => {
    if (!activeClock || !activeClock.activeBreak) return;
    const now = /* @__PURE__ */ new Date();
    const start = new Date(activeClock.activeBreak.startTime);
    const durationMinutes = Math.max(
      1,
      Math.round((now.getTime() - start.getTime()) / 6e4),
    );
    const startH = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
    const endH = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    if (activeClock.shiftId) {
      addBreakToShift(activeClock.shiftId, {
        type: "irregular",
        name: activeClock.activeBreak.name,
        startTime: startH,
        endTime: endH,
        durationMinutes,
        isPaid: activeClock.activeBreak.isPaid,
      });
    }
    setActiveClock({
      ...activeClock,
      activeBreak: null,
    });
  };
  const addProfessionalEvent = (eventData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return null;
    }
    const newEvent = {
      ...eventData,
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setProfessionalEvents((prev) => [newEvent, ...prev]);
    return newEvent;
  };
  const updateProfessionalEvent = (id, updates) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setProfessionalEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)),
    );
  };
  const deleteProfessionalEvent = (id) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setProfessionalEvents((prev) => prev.filter((ev) => ev.id !== id));
  };
  const addFinancialRecord = (recordData) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return null;
    }
    const draftRec = {
      ...recordData,
      id: recordData.id || `fin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId: recordData.companyId || activeCompany?.id || "firma-1",
      createdAt: recordData.createdAt || new Date().toISOString(),
    };
    const newRec = pluginManager.runLedgerEntryCreateHooks(draftRec);
    setFinancialRecords((prev) => [newRec, ...prev]);
    return newRec;
  };
  const addFinancialRecordsBatch = (recordsList = []) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return [];
    }
    const nowIso = new Date().toISOString();
    const prepared = recordsList.map((r, idx) =>
      pluginManager.runLedgerEntryCreateHooks({
        ...r,
        id: r.id || `fin-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        companyId: r.companyId || activeCompany?.id || "firma-1",
        createdAt: nowIso,
      }),
    );
    setFinancialRecords((prev) => [...prepared, ...prev]);
    return prepared;
  };
  const updateFinancialRecord = (id, updates) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setFinancialRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, ...updates } : rec)),
    );
  };
  const deleteFinancialRecord = (id) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setFinancialRecords((prev) => prev.filter((rec) => rec.id !== id));
  };
  const clearWorkspaceData = () => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return;
    }
    setCompanies([]);
    setActiveCompany(null);
    setEmployees([]);
    setJobs([]);
    setShifts([]);
    setProfessionalEvents([]);
    setLeaves([]);
    setFinancialRecords([]);
    setActiveClock(null);
  };
  const exportDataJson = () => {
    const data = {
      companies,
      employees,
      leaves,
      financialRecords,
      jobs,
      shifts,
      professionalEvents,
      localAccounts,
      localHitlLogs,
      exportedAt: /* @__PURE__ */ new Date().toISOString(),
      app: "ShiftPulse Ledger",
      version: "2.7",
    };
    return JSON.stringify(data, null, 2);
  };
  const importDataJson = (json) => {
    if (isReadOnlyLocked) {
      setLicenseActionError({ code: "READ_ONLY_LOCK" });
      return false;
    }
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed.companies)) setCompanies(parsed.companies);
      if (Array.isArray(parsed.employees)) setEmployees(parsed.employees);
      if (Array.isArray(parsed.leaves)) setLeaves(parsed.leaves);
      if (Array.isArray(parsed.financialRecords))
        setFinancialRecords(parsed.financialRecords);
      if (Array.isArray(parsed.jobs)) setJobs(parsed.jobs);
      if (Array.isArray(parsed.shifts)) setShifts(parsed.shifts);
      if (Array.isArray(parsed.professionalEvents))
        setProfessionalEvents(parsed.professionalEvents);
      if (Array.isArray(parsed.localAccounts) && parsed.localAccounts.length > 0)
        setLocalAccounts(parsed.localAccounts);
      if (Array.isArray(parsed.localHitlLogs))
        setLocalHitlLogs(parsed.localHitlLogs);
      return true;
    } catch {
      return false;
    }
  };
  const value = useMemo(
    () => ({
      license,
      refreshLicenseStatus,
      startTrial14d,
      activateCommercialLicense,
      isReadOnlyLocked,
      licenseActionError,
      setLicenseActionError,
      clearLicenseActionError,
      eulaAccepted,
      acceptEula,
      byoApiConfig,
      saveByoApiConfig,
      clearByoApiConfig,
      isAccountsHitlOpen,
      setIsAccountsHitlOpen,
      openAccountsHitl,
      closeAccountsHitl,
      isLicenseModalOpen,
      setIsLicenseModalOpen,
      openLicenseModal,
      closeLicenseModal,
      isDataModalOpen,
      setIsDataModalOpen,
      openDataModal,
      closeDataModal,
      isOnboardingOpen,
      setIsOnboardingOpen,
      openOnboarding,
      closeOnboarding,
      legalModalState,
      openLegalModal,
      closeLegalModal,
      companies,
      activeCompany,
      setActiveCompany,
      addCompany,
      updateCompany,
      deleteCompany,
      exportCompanyDossierJson,
      importCompanyDossierJson,
      employees,
      setEmployees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      calculatePayrollForCompany,
      updateWorkerRegime,
      updateWorkerDayOverride,
      leaves,
      addWorkerLeave,
      deleteWorkerLeave,
      financialRecords,
      addFinancialRecord,
      addFinancialRecordsBatch,
      updateFinancialRecord,
      deleteFinancialRecord,
      isLeaveModalOpen,
      setIsLeaveModalOpen,
      leaveModalInitialWorkerId,
      leaveModalInitialDate,
      openLeaveModal,
      jobs,
      shifts,
      professionalEvents,
      addProfessionalEvent,
      updateProfessionalEvent,
      deleteProfessionalEvent,
      currentTab,
      setCurrentTab,
      activeJobFilter,
      setActiveJobFilter,
      selectedDate,
      setSelectedDate,
      darkMode,
      toggleDarkMode,
      mobileFrameMode,
      setMobileFrameMode,
      activeClock,
      clockIn,
      clockOut,
      startLiveBreak,
      endLiveBreak,
      addJob,
      updateJob,
      deleteJob,
      getJobById,
      addJobFromAi,
      addShift,
      addShiftsBatch,
      deleteShiftsByJobAndRange,
      updateShift,
      deleteShift,
      duplicateShift,
      addBreakToShift,
      removeBreakFromShift,
      updateBreakInShift,
      clearWorkspaceData,
      exportDataJson,
      importDataJson,
      editingShift,
      setEditingShift,
      isAddModalOpen,
      setIsAddModalOpen,
      isRosterModalOpen,
      setIsRosterModalOpen,
      addModalDefaultDate,
      setAddModalDefaultDate,
      isPremium,
      setIsPremium,
      isSubscriptionModalOpen,
      setIsSubscriptionModalOpen,
      openSubscriptionModal,
      isCircadianModalOpen,
      setIsCircadianModalOpen,
      openCircadianModal,
      countryCode,
      setCountryCode,
      countryJurisdictions: COUNTRY_JURISDICTIONS,
      isStartMenuOpen,
      setIsStartMenuOpen,
      openStartMenu,
      closeStartMenu,
      showStartMenuOnLaunch,
      setShowStartMenuOnLaunch,
      commHubConfig,
      openCommHub,
      closeCommHub,
      isOnline,
      gatewayStatus,
      workspaceHandle,
      workspacePermissionState,
      workspaceConnected,
      workspaceDisplayName,
      lastBackupAt,
      connectWorkspaceFolder,
      reconnectWorkspaceFolder,
      initLocalDesktopWorkspace,
      disconnectWorkspaceFolder,
      scanWorkspaceInputDocuments,
      loadWorkspaceInputFileObject,
      saveOutputDocumentToWorkspace,
      markBackupCompleted,
      localAccounts,
      activeOperator,
      localHitlLogs,
      aiUsageStats,
      createLocalAccount,
      updateLocalAccount,
      deleteLocalAccount,
      verifyOperatorPin,
      switchLocalAccount,
      recordAiUsageStats,
      clearLocalAiCache,
      logHitlDecision,
    }),
    [
      license,
      isReadOnlyLocked,
      licenseActionError,
      eulaAccepted,
      byoApiConfig,
      isAccountsHitlOpen,
      isLicenseModalOpen,
      isDataModalOpen,
      isOnboardingOpen,
      legalModalState,
      companies,
      activeCompany,
      employees,
      leaves,
      financialRecords,
      isLeaveModalOpen,
      leaveModalInitialWorkerId,
      leaveModalInitialDate,
      jobs,
      shifts,
      professionalEvents,
      currentTab,
      activeJobFilter,
      selectedDate,
      darkMode,
      mobileFrameMode,
      activeClock,
      editingShift,
      isAddModalOpen,
      isRosterModalOpen,
      addModalDefaultDate,
      addJobFromAi,
      isSubscriptionModalOpen,
      isCircadianModalOpen,
      countryCode,
      isStartMenuOpen,
      showStartMenuOnLaunch,
      commHubConfig,
      isOnline,
      gatewayStatus,
      workspaceHandle,
      workspacePermissionState,
      workspaceConnected,
      workspaceDisplayName,
      lastBackupAt,
      localAccounts,
      activeOperator,
      localHitlLogs,
      aiUsageStats,
    ],
  );
  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
};
export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error("useShift must be used within a ShiftProvider");
  }
  return context;
};
