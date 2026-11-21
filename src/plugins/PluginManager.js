import React from "react";

const TIER_RANK = {
  locked: -1,
  free: 0,
  trial: 1,
  starter: 2,
  pro: 3,
  enterprise: 4,
};

/**
 * Frontend PluginManager for ShiftPulse Ledger.
 * Synchronizes authorized plugin manifests against /api/plugins and
 * sys_metadata clock status, loads browser ESM entrypoints dynamically,
 * and isolates every lifecycle hook and UI slot inside try/catch wrappers.
 */
export class PluginManager {
  constructor() {
    this.authorizedPlugins = [];
    this.blockedPlugins = [];
    this.pluginErrors = [];
    this.activeTier = "trial";
    this.clockValid = true;
    this.sysMetadata = null;
    this.loading = false;

    this.eventListeners = new Map();
    this.hooks = {
      onLedgerEntryCreate: [],
      onBeforeReportExport: [],
    };
    this.actionButtons = [];
    this.sidebarWidgets = [];
    this.customRoutes = [];
    this.subscribers = new Set();
  }

  static isLicenseTierSufficient(activeTier, requiredTier) {
    const activeKey = String(activeTier || "free").toLowerCase();
    const requiredKey = String(requiredTier || "free").toLowerCase();
    const activeRank = TIER_RANK[activeKey] ?? 0;
    const requiredRank = TIER_RANK[requiredKey] ?? TIER_RANK.enterprise;
    return activeRank >= 0 && activeRank >= requiredRank;
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify() {
    const snapshot = this.getStateSnapshot();
    for (const listener of this.subscribers) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error("[PluginManager:Client] Subscriber notification error:", err);
      }
    }
  }

  clearRegistrations() {
    this.eventListeners.clear();
    this.hooks.onLedgerEntryCreate = [];
    this.hooks.onBeforeReportExport = [];
    this.actionButtons = [];
    this.sidebarWidgets = [];
    this.customRoutes = [];
  }

  recordError(pluginId, phase, error) {
    const message = error?.message || String(error);
    console.error(
      `[PluginManager:Client] Isolated error in plugin "${pluginId}" (${phase}):`,
      message,
    );
    this.pluginErrors = [
      ...this.pluginErrors.slice(-24),
      {
        pluginId,
        phase,
        message,
        timestamp: new Date().toISOString(),
      },
    ];
    this.notify();
  }

  on(eventName, handler, pluginId = "unknown") {
    if (typeof handler !== "function") return () => {};
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    const wrapped = { pluginId, handler };
    this.eventListeners.get(eventName).push(wrapped);
    return () => {
      const list = this.eventListeners.get(eventName) || [];
      this.eventListeners.set(
        eventName,
        list.filter((item) => item !== wrapped),
      );
    };
  }

  async emit(eventName, payload) {
    const listeners = this.eventListeners.get(eventName) || [];
    for (const { pluginId, handler } of listeners) {
      try {
        await handler(payload);
      } catch (error) {
        this.recordError(pluginId, `event:${eventName}`, error);
      }
    }
  }

  onLedgerEntryCreate(handler, pluginId = "unknown") {
    if (typeof handler !== "function") return;
    this.hooks.onLedgerEntryCreate.push({ pluginId, handler });
  }

  onBeforeReportExport(handler, pluginId = "unknown") {
    if (typeof handler !== "function") return;
    this.hooks.onBeforeReportExport.push({ pluginId, handler });
  }

  registerSidebarWidget(widgetConfig, pluginId = "unknown") {
    if (!widgetConfig || typeof widgetConfig !== "object") return;
    this.sidebarWidgets.push({
      id: widgetConfig.id || `${pluginId}-widget-${this.sidebarWidgets.length + 1}`,
      title: widgetConfig.title || pluginId,
      badge: widgetConfig.badge || "",
      render: widgetConfig.render,
      pluginId,
    });
  }

  registerActionButton(buttonConfig, pluginId = "unknown") {
    if (!buttonConfig || typeof buttonConfig !== "object" || typeof buttonConfig.onClick !== "function") {
      return;
    }
    this.actionButtons.push({
      id: buttonConfig.id || `${pluginId}-btn-${this.actionButtons.length + 1}`,
      slot: buttonConfig.slot || "profit-tax-toolbar",
      label: buttonConfig.label || "Plugin Action",
      title: buttonConfig.title || "",
      onClick: buttonConfig.onClick,
      pluginId,
    });
  }

  registerCustomRoute(routeConfig, pluginId = "unknown") {
    if (!routeConfig || !routeConfig.path || typeof routeConfig.render !== "function") {
      return;
    }
    const normalizedPath = routeConfig.path.startsWith("/")
      ? routeConfig.path
      : `/${routeConfig.path}`;
    this.customRoutes.push({
      pluginId,
      path: normalizedPath,
      title: routeConfig.title || pluginId,
      render: routeConfig.render,
    });
  }

  createScopedApi(manifest) {
    const pluginId = manifest.id;
    return {
      pluginId,
      manifest,
      activeTier: this.activeTier,
      permissions: Array.isArray(manifest.permissions) ? [...manifest.permissions] : [],
      React,
      createElement: React.createElement,
      on: (eventName, fn) => this.on(eventName, fn, pluginId),
      emit: (eventName, payload) => this.emit(eventName, payload),
      onLedgerEntryCreate: (fn) => this.onLedgerEntryCreate(fn, pluginId),
      onBeforeReportExport: (fn) => this.onBeforeReportExport(fn, pluginId),
      registerSidebarWidget: (cfg) => this.registerSidebarWidget(cfg, pluginId),
      registerActionButton: (cfg) => this.registerActionButton(cfg, pluginId),
      registerCustomRoute: (cfg) => this.registerCustomRoute(cfg, pluginId),
      log: (...args) => console.log(`[Plugin:${pluginId}]`, ...args),
    };
  }

  async syncAndLoadPlugins({ licenseKeyOverride = "" } = {}) {
    this.loading = true;
    this.notify();

    try {
      const headers = {};
      if (licenseKeyOverride) {
        headers["x-license-key"] = licenseKeyOverride;
      }
      const res = await fetch("/api/plugins", { headers });
      if (!res.ok) {
        throw new Error(`Plugin registry returned HTTP ${res.status}.`);
      }
      const snapshot = await res.json();

      this.clearRegistrations();
      this.activeTier = snapshot.activeTier || "trial";
      this.clockValid = snapshot.clockValid !== false;
      this.sysMetadata = snapshot.sysMetadata || null;
      this.blockedPlugins = Array.isArray(snapshot.blockedPlugins)
        ? snapshot.blockedPlugins
        : [];
      this.pluginErrors = Array.isArray(snapshot.errors) ? snapshot.errors : [];

      const authorizedList = Array.isArray(snapshot.authorizedPlugins)
        ? snapshot.authorizedPlugins
        : [];
      const loaded = [];

      for (const manifest of authorizedList) {
        if (
          !this.clockValid ||
          !PluginManager.isLicenseTierSufficient(
            this.activeTier,
            manifest.requiredLicenseTier,
          )
        ) {
          this.blockedPlugins.push({
            id: manifest.id,
            name: manifest.name,
            requiredLicenseTier: manifest.requiredLicenseTier,
            activeTier: this.activeTier,
            reason: "Blocked by workstation license tier or clock integrity validation.",
          });
          continue;
        }

        try {
          const entryUrl = `${manifest.entryUrl}?v=${encodeURIComponent(manifest.version || "1.0.0")}`;
          const pluginModule = await import(/* @vite-ignore */ entryUrl);
          const activateFn = pluginModule.activate || pluginModule.default;
          if (typeof activateFn !== "function") {
            throw new Error(`Entry point "${manifest.entryPoint}" does not export an activate() function.`);
          }
          await activateFn(this.createScopedApi(manifest));
          loaded.push(manifest);
        } catch (err) {
          this.recordError(manifest.id, "frontendLoad", err);
        }
      }

      this.authorizedPlugins = loaded;
      console.log(
        `[PluginManager:Client] Loaded ${loaded.length} plugin(s) (blocked: ${this.blockedPlugins.length}, activeTier=${this.activeTier}).`,
      );
    } catch (error) {
      console.warn(
        "[PluginManager:Client] Unable to reach plugin registry:",
        error?.message || error,
      );
      this.clearRegistrations();
      this.authorizedPlugins = [];
    } finally {
      this.loading = false;
      this.notify();
    }

    return this.getStateSnapshot();
  }

  runLedgerEntryCreateHooks(entry) {
    let current = entry;
    for (const { pluginId, handler } of this.hooks.onLedgerEntryCreate) {
      try {
        const result = handler(current);
        if (result && typeof result === "object" && typeof result.then !== "function") {
          current = result;
        }
      } catch (error) {
        this.recordError(pluginId, "onLedgerEntryCreate", error);
      }
    }
    // Notify backend hooks asynchronously without blocking local UI responsiveness
    fetch("/api/plugins/hooks/onLedgerEntryCreate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: current?.id,
        docNumber: current?.docNumber,
        docType: current?.docType,
        currency: current?.currency,
      }),
    }).catch(() => {});
    return current;
  }

  async runBeforeReportExportHooks(reportContext) {
    let current = reportContext;
    for (const { pluginId, handler } of this.hooks.onBeforeReportExport) {
      try {
        const result = await handler(current);
        if (result && typeof result === "object") {
          current = result;
        }
      } catch (error) {
        this.recordError(pluginId, "onBeforeReportExport", error);
      }
    }
    try {
      await fetch("/api/plugins/hooks/onBeforeReportExport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: current?.reportType || "statement",
          recordCount: current?.recordCount || 0,
        }),
      });
    } catch {
      // Ignore offline backend notification failures
    }
    return current;
  }

  executeActionButton(button, context = {}) {
    try {
      const maybePromise = button.onClick(context);
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch((err) =>
          this.recordError(button.pluginId, `action:${button.id}`, err),
        );
      }
    } catch (error) {
      this.recordError(button.pluginId, `action:${button.id}`, error);
    }
  }

  getActionButtons(slot) {
    if (!slot) return [...this.actionButtons];
    return this.actionButtons.filter((btn) => btn.slot === slot);
  }

  getSidebarWidgets() {
    return [...this.sidebarWidgets];
  }

  getCustomRoutes() {
    return [...this.customRoutes];
  }

  getStateSnapshot() {
    return {
      loading: this.loading,
      activeTier: this.activeTier,
      clockValid: this.clockValid,
      sysMetadata: this.sysMetadata,
      authorizedPlugins: [...this.authorizedPlugins],
      blockedPlugins: [...this.blockedPlugins],
      pluginErrors: [...this.pluginErrors],
      actionButtons: [...this.actionButtons],
      sidebarWidgets: [...this.sidebarWidgets],
      customRoutes: [...this.customRoutes],
    };
  }
}

export const pluginManager = new PluginManager();
