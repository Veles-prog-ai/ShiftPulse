import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Puzzle } from "lucide-react";
import { useShift } from "../context/ShiftContext";
import { pluginManager } from "./PluginManager";
import { PluginErrorBoundary } from "./PluginErrorBoundary";

const PluginContext = createContext(null);

export const PluginProvider = ({ children }) => {
  const { license } = useShift();
  const [pluginState, setPluginState] = useState(() =>
    pluginManager.getStateSnapshot(),
  );

  useEffect(() => {
    const unsubscribe = pluginManager.subscribe((nextSnapshot) => {
      setPluginState(nextSnapshot);
    });
    return unsubscribe;
  }, []);

  const reloadPlugins = useCallback(async (licenseKeyOverride = "") => {
    return pluginManager.syncAndLoadPlugins({ licenseKeyOverride });
  }, []);

  useEffect(() => {
    let cachedKey = "";
    try {
      cachedKey = localStorage.getItem("shiftpulse_license_key_v1") || "";
    } catch {}
    pluginManager.syncAndLoadPlugins({ licenseKeyOverride: cachedKey });
  }, [
    license?.valid,
    license?.licenseType,
    license?.readOnlyLock,
    license?.kljuc,
    license?.licenciraniPravniSubjekat,
  ]);

  return (
    <PluginContext.Provider
      value={{
        ...pluginState,
        pluginManager,
        reloadPlugins,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const ctx = useContext(PluginContext);
  if (!ctx) {
    throw new Error("usePlugins must be used within a PluginProvider");
  }
  return ctx;
};

/**
 * Renders action buttons injected by authorized plugins for a specific UI slot.
 */
export const PluginActionButtons = ({ slot, context = {} }) => {
  const { actionButtons } = usePlugins();
  const buttons = actionButtons.filter((btn) => btn.slot === slot);
  if (buttons.length === 0) return null;

  return buttons.map((btn) => (
    <PluginErrorBoundary key={`${btn.pluginId}:${btn.id}`} pluginId={btn.pluginId}>
      <button
        type="button"
        onClick={() => pluginManager.executeActionButton(btn, context)}
        title={btn.title || `${btn.label} (${btn.pluginId})`}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
      >
        <Puzzle className="w-3.5 h-3.5 shrink-0" />
        <span>{btn.label}</span>
      </button>
    </PluginErrorBoundary>
  ));
};

/**
 * Renders workspace widgets injected by authorized plugins.
 */
export const PluginSidebarWidgets = ({ context = {} }) => {
  const { sidebarWidgets } = usePlugins();
  const { activeCompany, setCurrentTab } = useShift();

  if (sidebarWidgets.length === 0) return null;

  const enrichedContext = {
    activeCompany,
    navigateToCustomRoute: (routePath) => setCurrentTab(`plugin:${routePath}`),
    ...context,
  };

  return (
    <div className="space-y-3 mb-5">
      {sidebarWidgets.map((widget) => {
        let renderedContent = null;
        try {
          if (typeof widget.render === "function") {
            renderedContent = widget.render(enrichedContext);
          }
        } catch (err) {
          pluginManager.recordError(widget.pluginId, `widget:${widget.id}`, err);
          return (
            <div
              key={`${widget.pluginId}:${widget.id}`}
              className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300"
            >
              Plugin widget &quot;{widget.title}&quot; was isolated due to an execution error.
            </div>
          );
        }

        return (
          <PluginErrorBoundary
            key={`${widget.pluginId}:${widget.id}`}
            pluginId={widget.pluginId}
          >
            <div className="bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Puzzle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{widget.title}</span>
                </div>
                {widget.badge && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {widget.badge}
                  </span>
                )}
              </div>
              {renderedContent}
            </div>
          </PluginErrorBoundary>
        );
      })}
    </div>
  );
};

/**
 * Renders a plugin-registered custom route when currentTab starts with "plugin:".
 */
export const PluginCustomRouteView = ({ routePath }) => {
  const { customRoutes } = usePlugins();
  const { activeCompany, setCurrentTab } = useShift();

  const target = customRoutes.find((r) => r.path === routePath);
  if (!target) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-3">
        <div className="text-sm font-bold text-slate-900 dark:text-white">
          Extension Route Unavailable
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested plugin route ({routePath}) is not active under the current workstation license.
        </p>
        <button
          type="button"
          onClick={() => setCurrentTab("profit-tax")}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  let viewContent = null;
  try {
    viewContent = target.render({
      activeCompany,
      navigateBack: () => setCurrentTab("profit-tax"),
    });
  } catch (err) {
    pluginManager.recordError(target.pluginId, `customRoute:${target.path}`, err);
    return (
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-5 text-xs text-amber-800 dark:text-amber-300 space-y-2">
        <div className="font-bold">Isolated Plugin Route Error ({target.pluginId})</div>
        <div>{err?.message || "Execution failed cleanly without affecting core app."}</div>
        <button
          type="button"
          onClick={() => setCurrentTab("profit-tax")}
          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer"
        >
          Return to Core App
        </button>
      </div>
    );
  }

  return (
    <PluginErrorBoundary pluginId={target.pluginId}>
      {viewContent}
    </PluginErrorBoundary>
  );
};
