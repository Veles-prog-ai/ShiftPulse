import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  X,
  TrendingUp,
  FileSpreadsheet,
  Landmark,
  Calendar,
  Users,
  Sparkles,
  Globe,
  Languages,
  FolderOpen,
  UserCheck,
  Mail,
  Shield,
  Scale,
  ArrowRight,
  Check,
  Info,
  ClipboardCheck,
} from "lucide-react";

const COUNTRY_FLAGS = {
  RS: "🇷🇸",
  HR: "🇭🇷",
  BA: "🇧🇦",
  ME: "🇲🇪",
  SI: "🇸🇮",
  EU: "🇪🇺",
};

const TOOL_ITEMS_CONFIG = [
  { tabId: "profit-tax", toolKey: "profitTax", icon: TrendingUp },
  { tabId: "ledger", toolKey: "ledger", icon: FileSpreadsheet },
  { tabId: "bank-orders", toolKey: "bankOrders", icon: Landmark },
  { tabId: "calendar-shifts", toolKey: "calShifts", icon: Calendar },
  { tabId: "clients", toolKey: "clients", icon: Users },
  { tabId: "ai-copilot", toolKey: "aiCopilot", icon: Sparkles },
];

export const StartMenuModal = ({
  onClose,
  onOpenWorkspace,
  onOpenOperators,
  onOpenLicense,
  onOpenLegal,
  onOpenOnboarding,
}) => {
  const {
    setCurrentTab,
    countryCode,
    setCountryCode,
    countryJurisdictions,
    showStartMenuOnLaunch,
    setShowStartMenuOnLaunch,
    openCommHub,
    workspaceConnected,
    workspaceDisplayName,
    activeOperator,
  } = useShift();
  const { t, language, setLanguage, supportedLanguages } = useLanguage();

  const selectedCountry =
    countryJurisdictions.find((c) => c.code === countryCode) ||
    countryJurisdictions[0];
  const selectedCountryTrans =
    t.ui.countries[selectedCountry?.code || "RS"] || {};
  const currentLangObj =
    supportedLanguages.find((l) => l.code === language) ||
    supportedLanguages[0];

  const handleOpenTool = (tabId) => {
    setCurrentTab(tabId);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-menu-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2
              id="start-menu-title"
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              {t.ui.startMenu.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.ui.startMenu.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.ui.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Initial Language & Jurisdiction Setup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="start-language-select"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-2"
                >
                  <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t.ui.startMenu.langSectionTitle}</span>
                </label>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  {currentLangObj?.nativeLabel}
                </span>
              </div>
              <select
                id="start-language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeLabel} ({lang.code.toUpperCase()})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t.ui.startMenu.activeLangHint}
              </p>
            </div>

            {/* Country / Statutory Jurisdiction Selection */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="start-country-select"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-2"
                >
                  <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.ui.startMenu.countrySectionTitle}</span>
                </label>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                  {selectedCountryTrans.badge ||
                    (selectedCountry?.status === "active"
                      ? t.ui.countries.activePill
                      : t.ui.countries.expansionPill)}
                </span>
              </div>
              <select
                id="start-country-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {countryJurisdictions.map((c) => {
                  const meta = t.ui.countries[c.code];
                  const pill =
                    c.status === "active"
                      ? t.ui.countries.activePill
                      : t.ui.countries.expansionPill;
                  return (
                    <option key={c.code} value={c.code}>
                      {c.flag || COUNTRY_FLAGS[c.code] || "🌐"}{" "}
                      {meta?.name || c.name} ({c.currency}) — {pill}
                    </option>
                  );
                })}
              </select>
              <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  {countryCode === "RS"
                    ? t.ui.startMenu.v1NoticeBody
                    : `${selectedCountryTrans.name || selectedCountry?.name}: ${t.ui.countries.launchV1Note}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Quick Guide to Workspace Tools & Modules */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.ui.startMenu.toolsGuideTitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TOOL_ITEMS_CONFIG.map((item) => {
                const Icon = item.icon;
                const copy = t.ui.startMenu.tools[item.toolKey] || {};
                return (
                  <button
                    key={item.tabId}
                    type="button"
                    onClick={() => handleOpenTool(item.tabId)}
                    className="group text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {copy.title}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {copy.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Workstation Readiness & Utilities */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.ui.startMenu.operatorTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenWorkspace) onOpenWorkspace();
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.ui.header.workspace}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {workspaceConnected
                    ? workspaceDisplayName || t.ui.startMenu.connected
                    : t.ui.startMenu.notConnected}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenOperators) onOpenOperators();
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t.ui.header.accounts}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {activeOperator?.displayName || t.ui.header.operator}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  openCommHub("email", "profit-tax");
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{t.ui.header.commsHub}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t.ui.startMenu.tools.commsHub.desc}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenLicense) onOpenLicense();
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t.ui.header.license}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t.ui.license.statusActive}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showStartMenuOnLaunch}
                onChange={(e) => setShowStartMenuOnLaunch(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600"
              />
              <span>{t.ui.startMenu.showOnLaunchLabel}</span>
            </label>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenLegal) onOpenLegal();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{t.ui.footer.compliance}</span>
            </button>

            {onOpenOnboarding && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOnboarding();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{t.ui.startMenu.onboardingBtn}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Check className="w-4 h-4" />
            <span>{t.ui.startMenu.enterBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
