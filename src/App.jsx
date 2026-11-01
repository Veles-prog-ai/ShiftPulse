import { useState } from "react";
import { ShiftProvider, useShift } from "./context/ShiftContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { Header } from "./components/Header";
import { BottomTabBar } from "./components/BottomTabBar";
import { OglasiDashboardView } from "./components/OglasiDashboardView";
import { CalendarAndShiftsView } from "./components/CalendarAndShiftsView";
import { ClientFilesManagerView } from "./components/ClientFilesManagerView";
import { BankPaymentOrdersView } from "./components/BankPaymentOrdersView";
import { JobsManagerView } from "./components/JobsManagerView";
import { AiCopilotView } from "./components/AiCopilotView";
import { ShiftModal } from "./components/ShiftModal";
import { RosterPatternModal } from "./components/RosterPatternModal";
import { LegalPrivacyModal } from "./components/LegalPrivacyModal";
import { ShieldCheck, FileText, Scale } from "lucide-react";
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
  } = useShift();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState("privacy");
  const openLegalWithTab = (tab) => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };
  const renderActiveView = () => {
    switch (currentTab) {
      case "ledger":
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
        return <OglasiDashboardView />;
    }
  };
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col items-center">
      <div
        className={`w-full transition-all duration-300 flex flex-col min-h-screen ${mobileFrameMode ? "max-w-md my-0 sm:my-6 rounded-none sm:rounded-[36px] border-0 sm:border-[8px] border-slate-800 shadow-2xl overflow-hidden bg-white dark:bg-slate-900 relative ring-1 ring-slate-900/10" : "max-w-7xl"}`}
      >
        <Header />
        <main className="flex-1 px-3.5 sm:px-6 py-5 pb-24 overflow-x-hidden flex flex-col justify-between">
          <div>{renderActiveView()}</div>

          {/* Pravna traka i usklađenost - Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ShiftPulse Ledger Pro
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[11px]">
                  B2B SaaS za knjigovodstvo i smenski rad
                </span>
              </div>

              {/* Direktni linkovi ka pravnim dokumentima */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 font-semibold text-[11px] sm:text-xs">
                <button
                  onClick={() => openLegalWithTab("privacy")}
                  className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Politika privatnosti (ZZPL / GDPR)</span>
                </button>

                <span className="text-slate-300 dark:text-slate-700">•</span>

                <button
                  onClick={() => openLegalWithTab("terms")}
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Uslovi korišćenja (B2B SaaS)</span>
                </button>

                <span className="text-slate-300 dark:text-slate-700">•</span>

                <button
                  onClick={() => openLegalWithTab("compliance")}
                  className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Zakonska usklađenost (ZOR RS čl. 108)</span>
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <p>
                Zaštićeno kriptografskim ključem (AES-256). Svi obračuni
                usklađeni sa Zakonom o radu RS i ePorezi PPP-PD specifikacijama.
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Pravni status: Verifikovano i važeće</span>
              </div>
            </div>
          </footer>
        </main>
        <BottomTabBar />

        {legalModalOpen && (
          <LegalPrivacyModal
            initialTab={legalModalTab}
            onClose={() => setLegalModalOpen(false)}
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
        <AppContent />
      </ShiftProvider>
    </LanguageProvider>
  );
}
