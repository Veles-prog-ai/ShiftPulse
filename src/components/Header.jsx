import { useState, useRef, useEffect } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
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
  Download,
  Package,
} from "lucide-react";
import { usePWAInstall } from "../utils/usePWAInstall";
import { DataManagementModal } from "./DataManagementModal";
import { CommunicationHubModal } from "./CommunicationHubModal";
import { LegalPrivacyModal } from "./LegalPrivacyModal";
import { LanguageImportModal } from "./LanguageImportModal";
import { SubscriptionModal } from "./SubscriptionModal";
import { CircadianWellnessModal } from "./CircadianWellnessModal";
import { B2BLicenseManagementModal } from "./B2BLicenseManagementModal";
import { InstallPackagesModal } from "./InstallPackagesModal";
export const Header = () => {
  const {
    companies,
    activeCompany,
    setActiveCompany,
    jobs,
    activeJobFilter,
    setActiveJobFilter,
    darkMode,
    toggleDarkMode,
    mobileFrameMode,
    setMobileFrameMode,
    activeClock,
    clockOut,
    setIsAddModalOpen,
    setAddModalDefaultDate,
    selectedDate,
    isPremium,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    openSubscriptionModal,
    isCircadianModalOpen,
    setIsCircadianModalOpen,
    openCircadianModal,
  } = useShift();
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false);
  const [isCommHubOpen, setIsCommHubOpen] = useState(false);
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
          valid: Boolean(data.valid || (data.success && !data.isDemo)),
          isDemo: Boolean(data.isDemo || !data.valid),
        });
      })
      .catch(() => {
        setLicense({ valid: false, isDemo: true });
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
  const getElapsedString = () => {
    if (!activeClock) return "";
    const start = new Date(activeClock.clockInTime);
    const now = /* @__PURE__ */ new Date();
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalMins = Math.floor(diffMs / 6e4);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };
  const activeJob = activeClock
    ? jobs.find((j) => j.id === activeClock.jobId)
    : null;
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
        {/* DEMO režim banner */}
        {license && !license.valid && (
          <div className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 text-center py-1.5 px-3 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 flex-wrap">
            <span>
              🔒 Pokrenut je ShiftPulse Ledger Pro DEMO režim. Funkcije ePorezi
              XML izvoza su zaključane.
            </span>
            <button
              onClick={() => setIsLicenseModalOpen(true)}
              className="ml-2 underline font-black hover:text-black cursor-pointer"
            >
              Unesi licencni ključ ➔
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & App Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {t.header.appName}
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                  <Shield className="w-3 h-3 text-indigo-500" />
                  <span>Enterprise B2B</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden xs:block">
                {t.header.subtitle}
              </p>
            </div>
          </div>

          {/* Active Client Company Selector in Header */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-slate-400 hidden md:inline">
              Klijent:
            </span>
            <select
              value={activeCompany?.id || ""}
              onChange={(e) =>
                setActiveCompany(
                  companies.find((c) => c.id === e.target.value) || null,
                )
              }
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientType === "freelancer" ? "\u{1F4BB} " : "\u{1F3ED} "}{" "}
                  {c.naziv}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons Right Side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Multi-Language Selector Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
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
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto">
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
                          {lang.isCustom && (
                            <span className="px-1 py-0.2 rounded text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                              Custom
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {/* Option of importing more languages on client request */}
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

            {/* Separate Installation Packages (Windows, Linux, ChromeOS) */}
            <button
              onClick={() => setIsPackagesModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="Preuzmite odvojene instalacione pakete za Windows, Linux i ChromeOS (Live Testing)"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">📦 Instalacioni Paketi</span>
              <span className="sm:hidden">📦 Paketi</span>
            </button>

            {/* Dark / Light (Day / Night) Theme Switcher */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-xs shadow-xs cursor-pointer"
              title={
                darkMode
                  ? "Prebaci na svetli (dnevni) re\u017Eim"
                  : "Prebaci na tamni (no\u0107ni) re\u017Eim"
              }
              aria-label="Prebaci temu"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline text-[11px]">
                    Dnevni režim
                  </span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden md:inline text-[11px]">
                    Noćni režim
                  </span>
                </>
              )}
            </button>

            {/* Circadian Rhythm & Sleep Recovery (Pro Content) */}
            <button
              onClick={openCircadianModal}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors relative"
              title={t.premium.circadianTitle}
              aria-label={t.premium.circadianTitle}
            >
              <Coffee className="w-4 h-4 text-amber-500" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* B2B Kripto Licenca & Admin Generator */}
            <button
              onClick={() => setIsLicenseModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold text-xs shadow-xs cursor-pointer transition-colors ${license && !license.valid ? "border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100" : "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"}`}
              title={
                license && !license.valid
                  ? "DEMO Re\u017Eim \u2013 Kliknite za unos B2B licence"
                  : "B2B Kriptografska Licenca & Master Generator"
              }
              aria-label="B2B Licenca"
            >
              <Shield
                className={`w-3.5 h-3.5 ${license && !license.valid ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}
              />
              <span className="hidden sm:inline">
                {license && !license.valid ? "DEMO Re\u017Eim" : "B2B Licenca"}
              </span>
            </button>

            {/* Pravni Centar / ZZPL, Uslovi i Zakon o radu */}
            <button
              onClick={() => {
                setLegalTab("privacy");
                setIsLegalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-xs shadow-xs cursor-pointer"
              title="Pravni centar: Politika privatnosti (ZZPL/GDPR), Uslovi korišćenja i Zakon o radu RS"
              aria-label="Pravni centar"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Pravni centar</span>
            </button>

            {/* Backup / Reset Data */}
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t.header.dataSettings}
              aria-label={t.header.dataSettings}
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      {isDataModalOpen && (
        <DataManagementModal onClose={() => setIsDataModalOpen(false)} />
      )}

      {isLicenseModalOpen && (
        <B2BLicenseManagementModal
          onClose={() => setIsLicenseModalOpen(false)}
        />
      )}

      {isCommHubOpen && (
        <CommunicationHubModal
          onClose={() => setIsCommHubOpen(false)}
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

      {isPackagesModalOpen && (
        <InstallPackagesModal
          isOpen={isPackagesModalOpen}
          onClose={() => setIsPackagesModalOpen(false)}
        />
      )}
    </>
  );
};
