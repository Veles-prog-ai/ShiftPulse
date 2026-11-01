import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Handshake, Calendar, Users, Sparkles, Landmark } from "lucide-react";
export const BottomTabBar = () => {
  const { currentTab, setCurrentTab, activeClock } = useShift();
  const { t } = useLanguage();
  const tabs = [
    { id: "ledger", label: "Aktivni Oglasi", icon: Handshake },
    {
      id: "calendar-shifts",
      label: "Smene & Kalendar",
      icon: Calendar,
      matchTabs: ["calendar-shifts", "calendar", "shifts"],
      badgeCount: activeClock ? 1 : void 0,
    },
    { id: "bank-orders", label: "Banka & Virmani", icon: Landmark },
    { id: "clients", label: "Dosijei Firmi", icon: Users },
    { id: "ai-copilot", label: t.nav.aiCopilot, icon: Sparkles },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors pb-safe"
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="max-w-xl mx-auto grid grid-cols-5 items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.matchTabs
            ? tab.matchTabs.includes(currentTab)
            : currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all rounded-lg ${isActive ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              aria-selected={isActive}
              role="tab"
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? "scale-110" : ""}`}
                />
                {tab.badgeCount !== void 0 && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight mt-1 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
