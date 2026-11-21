import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const TIER_RANK = {
  locked: -1,
  free: 0,
  trial: 1,
  starter: 2,
  pro: 3,
  enterprise: 4,
};

const REQUIRED_MANIFEST_FIELDS = [
  "id",
  "name",
  "version",
  "requiredLicenseTier",
  "entryPoint",
  "permissions",
];

/**
 * Resolves a normalized tier string from the workstation license status.
 */
export function resolveNormalizedTier(licenseStatus = {}) {
  if (licenseStatus?.antiClockTampering?.isTimeValid === false) {
    return "locked";
  }
  if (licenseStatus?.readOnlyLock) {
    return "free";
  }
  const licenseType = String(licenseStatus?.licenseType || "").toUpperCase();
  if (licenseStatus?.valid) {
    if (licenseType === "ENTERPRISE_PERPETUAL_BYO_API") return "enterprise";
    if (licenseType === "MID_MARKET_ANNUAL") return "pro";
    if (licenseType === "TRIAL_14D") return "trial";
    const rawTier = String(licenseStatus.tier || "enterprise").toLowerCase();
    if (rawTier.includes("enterprise") || rawTier.includes("perpetual") || rawTier.includes("full")) {
      return "enterprise";
    }
    if (rawTier.includes("pro") || rawTier.includes("mid-market") || rawTier.includes("mid_market")) {
      return "pro";
    }
    if (rawTier.includes("starter") || rawTier.includes("basic")) return "starter";
    return "enterprise";
  }
  if (licenseStatus?.trial) {
    return "trial";
  }
  return "free";
}

export function isLicenseTierSufficient(activeTier, requiredTier) {
  const activeKey = String(activeTier || "free").toLowerCase();
  const requiredKey = String(requiredTier || "free").toLowerCase();
  const activeRank = TIER_RANK[activeKey] ?? 0;
  const requiredRank = TIER_RANK[requiredKey] ?? TIER_RANK.enterprise;
  return activeRank >= 0 && activeRank >= requiredRank;
}

/**
 * Backend PluginManager for ShiftPulse Ledger.
 * Scans /plugins manifests, validates license tier & sys_metadata clock integrity,
 * isolates plugin execution inside try/catch boundaries, and exposes hooks & custom routes.
 */
export class BackendPluginManager {
  constructor({ pluginsDir, sysMetadataPath, resolveLicenseStatus }) {
    this.pluginsDir = pluginsDir;
    this.sysMetadataPath = sysMetadataPath;
    this.resolveLicenseStatus = resolveLicenseStatus;

    this.manifests = [];
    this.loadedPlugins = new Map();
    this.blockedPlugins = [];
    this.pluginErrors = [];

    this.eventListeners = new Map();
    this.hooks = {
      onLedgerEntryCreate: [],
      onBeforeReportExport: [],
    };
    this.sidebarWidgets = [];
    this.customRoutes = [];
    this.activeTier = "trial";
    this.lastSyncAt = null;
  }

  /**
   * Reads sys_metadata.json directly to verify anti-clock integrity snapshot.
   */
  readSysMetadataSnapshot() {
    try {
      if (this.sysMetadataPath && fs.existsSync(this.sysMetadataPath)) {
        return JSON.parse(fs.readFileSync(this.sysMetadataPath, "utf-8"));
      }
    } catch (error) {
      console.warn("[PluginManager:Server] Failed to read sys_metadata.json:", error.message);
    }
    return null;
  }

  validateManifest(manifest, folderName) {
    if (!manifest || typeof manifest !== "object") {
      return { valid: false, reason: `Invalid JSON manifest in "${folderName}".` };
    }
    for (const field of REQUIRED_MANIFEST_FIELDS) {
      if (manifest[field] === undefined || manifest[field] === null || manifest[field] === "") {
        return {
          valid: false,
          reason: `Manifest in "${folderName}" is missing required field "${field}".`,
        };
      }
    }
    if (!Array.isArray(manifest.permissions)) {
      return {
        valid: false,
        reason: `Manifest "${manifest.id}" must declare permissions as an array.`,
      };
    }
    return { valid: true };
  }

  discoverManifests() {
    const discovered = [];
    try {
      if (!fs.existsSync(this.pluginsDir)) {
        fs.mkdirSync(this.pluginsDir, { recursive: true });
      }
      const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        const folderPath = path.join(this.pluginsDir, entry.name);
        const manifestPath = path.join(folderPath, "manifest.json");
        if (!fs.existsSync(manifestPath)) continue;

        try {
          const raw = fs.readFileSync(manifestPath, "utf-8");
          const parsed = JSON.parse(raw);
          const check = this.validateManifest(parsed, entry.name);
          if (!check.valid) {
            this.pluginErrors.push({
              pluginId: entry.name,
              phase: "manifest",
              message: check.reason,
              timestamp: new Date().toISOString(),
            });
            continue;
          }
          discovered.push({
            ...parsed,
            folderName: entry.name,
            folderPath,
            entryUrl: `/plugins/${entry.name}/${parsed.entryPoint}`,
          });
        } catch (err) {
          this.pluginErrors.push({
            pluginId: entry.name,
            phase: "manifest",
            message: `Failed to parse manifest.json: ${err.message}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("[PluginManager:Server] Failed to scan plugins directory:", error.message);
    }
    this.manifests = discovered;
    return discovered;
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
    this.sidebarWidgets.push({ ...widgetConfig, pluginId });
  }

  registerCustomRoute(routeConfig, pluginId = "unknown") {
    if (!routeConfig || !routeConfig.path || typeof routeConfig.handler !== "function") {
      return;
    }
    const normalizedPath = routeConfig.path.startsWith("/")
      ? routeConfig.path
      : `/${routeConfig.path}`;
    this.customRoutes.push({
      pluginId,
      method: String(routeConfig.method || "GET").toUpperCase(),
      path: normalizedPath,
      title: routeConfig.title || pluginId,
      handler: routeConfig.handler,
    });
  }

  recordError(pluginId, phase, error) {
    const message = error?.message || String(error);
    console.error(`[PluginManager:Server] Isolated error in plugin "${pluginId}" (${phase}):`, message);
    this.pluginErrors.push({
      pluginId,
      phase,
      message,
      timestamp: new Date().toISOString(),
    });
    if (this.pluginErrors.length > 50) {
      this.pluginErrors = this.pluginErrors.slice(-50);
    }
  }

  createScopedApi(manifest) {
    const pluginId = manifest.id;
    return {
      pluginId,
      manifest,
      permissions: [...manifest.permissions],
      on: (eventName, fn) => this.on(eventName, fn, pluginId),
      emit: (eventName, payload) => this.emit(eventName, payload),
      onLedgerEntryCreate: (fn) => this.onLedgerEntryCreate(fn, pluginId),
      onBeforeReportExport: (fn) => this.onBeforeReportExport(fn, pluginId),
      registerSidebarWidget: (cfg) => this.registerSidebarWidget(cfg, pluginId),
      registerCustomRoute: (cfg) => this.registerCustomRoute(cfg, pluginId),
      log: (...args) => console.log(`[Plugin:${pluginId}]`, ...args),
    };
  }

  async initialize(licenseKeyOverride = "") {
    this.loadedPlugins.clear();
    this.blockedPlugins = [];
    this.hooks.onLedgerEntryCreate = [];
    this.hooks.onBeforeReportExport = [];
    this.sidebarWidgets = [];
    this.customRoutes = [];
    this.eventListeners.clear();

    const licenseStatus = await this.resolveLicenseStatus(licenseKeyOverride);
    const sysMetadata = this.readSysMetadataSnapshot();
    this.activeTier = resolveNormalizedTier(licenseStatus);
    this.lastSyncAt = new Date().toISOString();

    const manifests = this.discoverManifests();

    for (const manifest of manifests) {
      const allowed = isLicenseTierSufficient(
        this.activeTier,
        manifest.requiredLicenseTier,
      );

      if (!allowed) {
        this.blockedPlugins.push({
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          requiredLicenseTier: manifest.requiredLicenseTier,
          activeTier: this.activeTier,
          reason:
            this.activeTier === "locked"
              ? "Workstation locked due to sys_metadata clock integrity check."
              : `Requires "${manifest.requiredLicenseTier}" license tier (current: "${this.activeTier}").`,
        });
        continue;
      }

      // Optional backend lifecycle hook if the plugin defines backendEntry
      if (manifest.backendEntry) {
        const backendFile = path.resolve(manifest.folderPath, manifest.backendEntry);
        if (fs.existsSync(backendFile)) {
          try {
            const mod = await import(pathToFileURL(backendFile).href);
            const initFn = mod.activateBackend || mod.activate || mod.default;
            if (typeof initFn === "function") {
              await initFn(this.createScopedApi(manifest));
            }
          } catch (error) {
            this.recordError(manifest.id, "backendInit", error);
          }
        }
      }

      this.loadedPlugins.set(manifest.id, {
        ...manifest,
        authorized: true,
        loadedAt: new Date().toISOString(),
      });
    }

    console.log(
      `[PluginManager:Server] Initialized (${this.loadedPlugins.size} authorized, ${this.blockedPlugins.length} gated, activeTier=${this.activeTier}, sysClock=${sysMetadata?.last_timestamp || "n/a"})`,
    );

    return this.getRegistrySnapshot(licenseStatus, sysMetadata);
  }

  async runLedgerEntryCreateHooks(entry) {
    let current = entry;
    for (const { pluginId, handler } of this.hooks.onLedgerEntryCreate) {
      try {
        const result = await handler(current);
        if (result && typeof result === "object") {
          current = result;
        }
      } catch (error) {
        this.recordError(pluginId, "onLedgerEntryCreate", error);
      }
    }
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
    return current;
  }

  /**
   * Express middleware dispatcher for plugin-registered custom backend routes.
   */
  customRouteDispatcher() {
    return async (req, res, next) => {
      const reqMethod = req.method.toUpperCase();
      const matched = this.customRoutes.find(
        (route) => route.method === reqMethod && route.path === req.path,
      );
      if (!matched) return next();

      try {
        await matched.handler(req, res);
      } catch (error) {
        this.recordError(matched.pluginId, `route:${matched.path}`, error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: `Isolated plugin route failure (${matched.pluginId}). Core application remains operational.`,
          });
        }
      }
    };
  }

  getRegistrySnapshot(licenseStatus = null, sysMetadata = null) {
    return {
      success: true,
      activeTier: this.activeTier,
      sysMetadata: sysMetadata || this.readSysMetadataSnapshot(),
      clockValid: licenseStatus?.antiClockTampering?.isTimeValid !== false,
      lastSyncAt: this.lastSyncAt,
      authorizedPlugins: Array.from(this.loadedPlugins.values()).map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description || "",
        requiredLicenseTier: p.requiredLicenseTier,
        entryPoint: p.entryPoint,
        entryUrl: p.entryUrl,
        permissions: p.permissions,
        authorized: true,
      })),
      blockedPlugins: this.blockedPlugins,
      customRoutes: this.customRoutes.map((r) => ({
        pluginId: r.pluginId,
        method: r.method,
        path: r.path,
        title: r.title,
      })),
      errors: this.pluginErrors.slice(-15),
    };
  }
}
