import { useState, useRef, useEffect } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { usePlugins } from "../plugins/PluginContext";
import {
  Clock,
  Coffee,
  Building,
  Moon,
  Sun,
  Database,
  Check,
  Shield,
  Scale,
  Upload,
  Mail,
  UserCheck,
  Compass,
  Globe,
  Puzzle,
} from "lucide-react";
import { DataManagementModal } from "./DataManagementModal";
import { CommunicationHubModal } from "./CommunicationHubModal";
import { LegalPrivacyModal } from "./LegalPrivacyModal";
import { LanguageImportModal } from "./LanguageImportModal";
import { SubscriptionModal } from "./SubscriptionModal";
import { CircadianWellnessModal } from "./CircadianWellnessModal";
import { B2BLicenseManagementModal } from "./B2BLicenseManagementModal";
import { LocalAccountsHitlModal } from "./LocalAccountsHitlModal";
import { StartMenuModal } from "./StartMenuModal";

export const Header = () => {
  const {
    companies,
    activeCompany,
    setActiveCompany,
    darkMode,
    toggleDarkMode,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    isCircadianModalOpen,
    setIsCircadianModalOpen,
    openCircadianModal,
    commHubConfig,
    openCommHub,
    closeCommHub,
    activeOperator,
    countryCode,
    isStartMenuOpen,
    openStartMenu,
    closeStartMenu,
    setCurrentTab,
  } = useShift();
  const { customRoutes, reloadPlugins } = usePlugins();
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isAccountsHitlOpen, setIsAccountsHitlOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState("privacy");
  const [isLangImportOpen, setIsLangImportOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [license, setLicense] = useState(null);
  const langMenuRef = useRef(null);

  useEffect(() => {
    fetch("/api/license/status")
      .then((res) => res.json())
      .then((data) => {
        setLicense({
          valid: Boolean(data.valid && data.success),
        });
      })
      .catch(() => {
        setLicense({ valid: false });
      });
  }, [isLicenseModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLangObj =
    supportedLanguages.find((l) => l.code === language) ||
    supportedLanguages[0];

  const getLangBadge = (code) => {
    if (code === "sr-Cyrl") return "\u0421\u0420";
    if (code === "zh") return "\u4E2D\u6587";
    if (code === "ja") return "\u65E5\u672C\u8A9E";
    if (code === "ru") return "\u0420\u0423";
    return code.toUpperCase().slice(0, 3);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate whitespace-nowrap">
                {t.ui.header.brandTitle} {t.ui.header.brandPro}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {t.ui.header.subtitle} · {countryCode}
              </p>
            </div>
          </div>

          {/* Active Client Company Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-0">
            <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden md:inline">
              {t.ui.header.activeClient}:
            </span>
            <select
              value={activeCompany?.id || ""}
              onChange={(e) =>
                setActiveCompany(
                  companies.find((c) => c.id === e.target.value) || null,
                )
              }
              aria-label={t.ui.header.activeClient}
              className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
            >
              {companies.length === 0 ? (
                <option value="">{t.ui.header.noClients}</option>
              ) : (
                companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.naziv}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Start Menu / Tool Guide & Country Settings */}
            <button
              type="button"
              onClick={openStartMenu}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
              title={t.ui.startMenu.title}
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden lg:inline">{t.ui.header.startMenu}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <Globe className="w-3 h-3 hidden sm:inline" />
                {countryCode}
              </span>
            </button>

            {/* Multi-Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title={t.header.selectLanguage}
                aria-label={t.header.selectLanguage}
                aria-expanded={isLangMenuOpen}
              >
                <span className="text-sm">{currentLangObj.flag}</span>
                <span className="uppercase text-[11px] font-bold tracking-wider">
                  {getLangBadge(language)}
                </span>
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 max-h-80 overflow-y-auto">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t.header.selectLanguage}
                  </div>
                  {supportedLanguages.map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{lang.flag}</span>
                          <span className="truncate">{lang.nativeLabel}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setIsLangMenuOpen(false);
                        setIsLangImportOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t.header.importLanguage}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Client Business Communication Hub */}
            <button
              onClick={() => openCommHub("email", "profit-tax")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={t.ui.comms.title}
              aria-label={t.ui.header.commsHub}
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.ui.header.commsHub}</span>
            </button>

            {/* Dark / Light Theme Switcher */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
              title={darkMode ? t.ui.header.themeLight : t.ui.header.themeDark}
              aria-label={darkMode ? t.ui.header.themeLight : t.ui.header.themeDark}
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden xl:inline text-[11px]">{t.ui.header.themeLight}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden xl:inline text-[11px]">{t.ui.header.themeDark}</span>
                </>
              )}
            </button>

            {/* Circadian Rhythm & Shift Recovery */}
            <button
              onClick={openCircadianModal}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
              title={t.premium.circadianTitle}
              aria-label={t.premium.circadianTitle}
            >
              <Coffee className="w-4 h-4 text-amber-500" />
            </button>

            {/* Plugin-Registered Custom Routes */}
            {customRoutes.map((route) => (
              <button
                key={`${route.pluginId}:${route.path}`}
                type="button"
                onClick={() => setCurrentTab(`plugin:${route.path}`)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
                title={`${route.title} (${route.pluginId})`}
              >
                <Puzzle className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{route.title}</span>
              </button>
            ))}

            {/* B2B Commercial License Status */}
            <button
              onClick={() => setIsLicenseModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                license && license.valid
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              title={t.ui.license.title}
              aria-label={t.ui.header.license}
            >
              <Shield
                className={`w-3.5 h-3.5 ${
                  license && license.valid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              />
              <span className="hidden sm:inline">
                {license && license.valid ? t.ui.header.license : t.ui.common.inactive}
              </span>
            </button>

            {/* Legal Center */}
            <button
              onClick={() => {
                setLegalTab("privacy");
                setIsLegalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
              title={t.ui.legalCenter.title}
              aria-label={t.ui.legalCenter.title}
            >
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden xl:inline">{t.ui.header.license && t.ui.footer.launchVersion ? t.ui.legalCenter.tabPrivacy.split(" ")[0] : "Legal"}</span>
            </button>

            {/* Local Operators & HITL Control */}
            <button
              onClick={() => setIsAccountsHitlOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-semibold text-xs cursor-pointer max-w-[140px] whitespace-nowrap shrink-0"
              title={t.ui.accountsHitl.title}
              aria-label={t.ui.header.accounts}
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden md:inline truncate">
                {activeOperator?.displayName || t.ui.header.operator}
              </span>
            </button>

            {/* Local Workspace & Cloud Backup */}
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={t.ui.header.workspace}
              aria-label={t.ui.header.workspace}
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      {isStartMenuOpen && (
        <StartMenuModal
          onClose={closeStartMenu}
          onOpenWorkspace={() => setIsDataModalOpen(true)}
          onOpenOperators={() => setIsAccountsHitlOpen(true)}
          onOpenLicense={() => setIsLicenseModalOpen(true)}
          onOpenLegal={() => {
            setLegalTab("compliance");
            setIsLegalModalOpen(true);
          }}
        />
      )}

      {isAccountsHitlOpen && (
        <LocalAccountsHitlModal onClose={() => setIsAccountsHitlOpen(false)} />
      )}
      {isDataModalOpen && (
        <DataManagementModal onClose={() => setIsDataModalOpen(false)} />
      )}

      {isLicenseModalOpen && (
        <B2BLicenseManagementModal
          onClose={() => setIsLicenseModalOpen(false)}
          onLicenseUpdated={() => reloadPlugins()}
        />
      )}

      {commHubConfig.isOpen && (
        <CommunicationHubModal
          key={`${commHubConfig.tab}-${commHubConfig.template}`}
          initialTab={commHubConfig.tab}
          initialTemplate={commHubConfig.template}
          onClose={closeCommHub}
          onOpenPrivacyPolicy={() => {
            setLegalTab("privacy");
            setIsLegalModalOpen(true);
          }}
        />
      )}

      {isLegalModalOpen && (
        <LegalPrivacyModal
          onClose={() => setIsLegalModalOpen(false)}
          initialTab={legalTab}
        />
      )}

      {isLangImportOpen && (
        <LanguageImportModal onClose={() => setIsLangImportOpen(false)} />
      )}

      {isSubscriptionModalOpen && (
        <SubscriptionModal
          onClose={() => setIsSubscriptionModalOpen(false)}
          onOpenCircadian={() => setIsCircadianModalOpen(true)}
        />
      )}

      {isCircadianModalOpen && (
        <CircadianWellnessModal
          onClose={() => setIsCircadianModalOpen(false)}
        />
      )}
    </>
  );
};
