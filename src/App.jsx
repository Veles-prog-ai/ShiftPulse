import { ShiftProvider, useShift } from "./context/ShiftContext";
import { PluginProvider, PluginSidebarWidgets, PluginCustomRouteView } from "./plugins/PluginContext";
import { LanguageProvider, useLanguage, interpolate } from "./i18n/LanguageContext";
import { Header } from "./components/Header";
import { BottomTabBar } from "./components/BottomTabBar";
import { BootSplashScreen } from "./components/BootSplashScreen";
import { FinancialProfitTaxView } from "./components/FinancialProfitTaxView";
import { LedgerDashboardView } from "./components/LedgerDashboardView";
import { OglasiDashboardView } from "./components/OglasiDashboardView";
import { CalendarAndShiftsView } from "./components/CalendarAndShiftsView";
import { ClientFilesManagerView } from "./components/ClientFilesManagerView";
import { BankPaymentOrdersView } from "./components/BankPaymentOrdersView";
import { JobsManagerView } from "./components/JobsManagerView";
import { AiCopilotView } from "./components/AiCopilotView";
import { ShiftModal } from "./components/ShiftModal";
import { RosterPatternModal } from "./components/RosterPatternModal";
import { LegalPrivacyModal } from "./components/LegalPrivacyModal";
import { EulaGateModal } from "./components/EulaGateModal";
import { OnboardingChecklistModal } from "./components/OnboardingChecklistModal";
import { ShieldCheck, FileText, Scale, Lock, AlertTriangle, X } from "lucide-react";

const AppContent = () => {
  const {
    currentTab,
    editingShift,
    setEditingShift,
    isAddModalOpen,
    setIsAddModalOpen,
    isRosterModalOpen,
    setIsRosterModalOpen,
    addModalDefaultDate,
    setAddModalDefaultDate,
    mobileFrameMode,
    countryCode,
    isReadOnlyLocked,
    licenseActionError,
    clearLicenseActionError,
    openLicenseModal,
    legalModalState,
    openLegalModal,
    closeLegalModal,
  } = useShift();
  const { t } = useLanguage();
  const licCopy = t.ui.licenseModalFull || {};

  const renderLicenseActionErrorText = () => {
    if (!licenseActionError) return "";
    if (licenseActionError.code === "READ_ONLY_LOCK") {
      return licCopy.blockedWriteErr;
    }
    if (licenseActionError.code === "LIMIT_CLIENTS") {
      return interpolate(licCopy.limitClientsErr || "", {
        max: licenseActionError.max || 25,
      });
    }
    if (licenseActionError.code === "LIMIT_SEATS") {
      return interpolate(licCopy.limitSeatsErr || "", {
        max: licenseActionError.max || 5,
      });
    }
    return licenseActionError.message || "";
  };

  const renderActiveView = () => {
    if (typeof currentTab === "string" && currentTab.startsWith("plugin:")) {
      const routePath = currentTab.slice("plugin:".length);
      return <PluginCustomRouteView routePath={routePath} />;
    }
    switch (currentTab) {
      case "profit-tax":
        return <FinancialProfitTaxView />;
      case "ledger":
        return <LedgerDashboardView />;
      case "oglasi":
        return <OglasiDashboardView />;
      case "calendar-shifts":
      case "calendar":
      case "shifts":
        return <CalendarAndShiftsView />;
      case "clients":
        return <ClientFilesManagerView />;
      case "bank-orders":
        return <BankPaymentOrdersView />;
      case "jobs":
        return <JobsManagerView />;
      case "ai-copilot":
        return <AiCopilotView />;
      default:
        return <FinancialProfitTaxView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col items-center">
      <BootSplashScreen />
      <div
        className={`w-full transition-all duration-300 flex flex-col min-h-screen ${mobileFrameMode ? "max-w-md my-0 sm:my-6 rounded-none sm:rounded-[36px] border-0 sm:border-[8px] border-slate-800 shadow-2xl overflow-hidden bg-white dark:bg-slate-900 relative ring-1 ring-slate-900/10" : "max-w-7xl"}`}
      >
        <Header />
        <main className="flex-1 px-3.5 sm:px-6 py-5 pb-24 overflow-x-hidden flex flex-col justify-between">
          <div>
            {isReadOnlyLocked && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">{licCopy.readOnlyBannerTitle}</div>
                    <div className="text-[11px] opacity-90 mt-0.5">{licCopy.readOnlyBannerDesc}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openLicenseModal}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition-colors cursor-pointer"
                >
                  {licCopy.unlockActionCta}
                </button>
              </div>
            )}

            {licenseActionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="font-semibold">{renderLicenseActionErrorText()}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      clearLicenseActionError();
                      openLicenseModal();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                  >
                    {licCopy.unlockActionCta}
                  </button>
                  <button
                    type="button"
                    onClick={clearLicenseActionError}
                    className="p-1 rounded-lg hover:bg-rose-200/50 dark:hover:bg-rose-900/50 cursor-pointer"
                    aria-label={licCopy.dismissErr}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <PluginSidebarWidgets />
            {renderActiveView()}
          </div>

          {/* Legal & Compliance Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs flex-wrap justify-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {t.ui.header.brandTitle} {t.ui.header.brandPro}
                </span>
                <span aria-hidden="true">·</span>
                <span>{t.ui.footer.tagline}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  {t.ui.footer.jurisdiction}: {countryCode} ({t.ui.footer.launchVersion})
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 font-semibold text-[11px] sm:text-xs">
                <button
                  onClick={() => openLegalModal("privacy")}
                  className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.ui.footer.privacy}</span>
                </button>

                <span aria-hidden="true">·</span>

                <button
                  onClick={() => openLegalModal("terms")}
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t.ui.footer.terms}</span>
                </button>

                <span aria-hidden="true">·</span>

                <button
                  onClick={() => openLegalModal("compliance")}
                  className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{t.ui.footer.compliance}</span>
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <p>{t.ui.footer.encryptionNote}</p>
              <span>{t.ui.footer.residency}</span>
            </div>
          </footer>
        </main>
        <BottomTabBar />

        <EulaGateModal onOpenLegal={openLegalModal} />
        <OnboardingChecklistModal />

        {legalModalState.isOpen && (
          <LegalPrivacyModal
            key={legalModalState.tab}
            initialTab={legalModalState.tab}
            onClose={closeLegalModal}
          />
        )}

        {(isAddModalOpen || editingShift) && (
          <ShiftModal
            shift={editingShift}
            defaultDate={addModalDefaultDate}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingShift(null);
              setAddModalDefaultDate(null);
            }}
          />
        )}

        {isRosterModalOpen && (
          <RosterPatternModal onClose={() => setIsRosterModalOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ShiftProvider>
        <PluginProvider>
          <AppContent />
        </PluginProvider>
      </ShiftProvider>
    </LanguageProvider>
  );
}

