/**
 * Frontend browser ESM entrypoint for example-export-extension.
 * Loaded dynamically by PluginManager only when the active workstation license
 * tier satisfies manifest.requiredLicenseTier.
 */
export function activate(api) {
  const h = api.createElement;
  const recentLogs = [];

  const pushLog = (message) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${message}`;
    recentLogs.unshift(entry);
    if (recentLogs.length > 8) recentLogs.pop();
    api.log(message);
  };

  pushLog(
    `Activated cleanly (tier="${api.activeTier}", version=${api.manifest.version}).`,
  );

  // Hook 1: Observe newly created financial ledger entries
  api.onLedgerEntryCreate((entry) => {
    pushLog(
      `onLedgerEntryCreate hook fired for document "${entry?.docNumber || entry?.id || "entry"}" (${entry?.grossAmount || 0} ${entry?.currency || "RSD"}).`,
    );
    return {
      ...entry,
      auditExtensionTag: `${api.pluginId}@${api.manifest.version}`,
    };
  });

  // Hook 2: Enrich report context before CSV / XML export
  api.onBeforeReportExport((reportContext) => {
    pushLog(
      `onBeforeReportExport hook fired for "${reportContext?.reportType || "statement"}" (${reportContext?.recordCount ?? 0} rows).`,
    );
    return {
      ...reportContext,
      auditStampedBy: api.pluginId,
      auditStampedAt: new Date().toISOString(),
    };
  });

  const downloadAuditSnapshot = (ctx = {}) => {
    const companyName = ctx.activeCompany?.naziv || "Unassigned Client";
    const companyPib = ctx.activeCompany?.pib || "N/A";
    const snapshot = {
      pluginId: api.pluginId,
      pluginVersion: api.manifest.version,
      exportedAt: new Date().toISOString(),
      activeLicenseTier: api.activeTier,
      company: {
        id: ctx.activeCompany?.id || null,
        name: companyName,
        pib: companyPib,
      },
      recordCount: Array.isArray(ctx.filteredRecords)
        ? ctx.filteredRecords.length
        : Array.isArray(ctx.currentEmployees)
          ? ctx.currentEmployees.length
          : 0,
      summary: ctx.summary || null,
      recentPluginEvents: [...recentLogs],
    };

    pushLog(`Audit Snapshot exported to console & JSON for "${companyName}" (PIB: ${companyPib}).`);
    console.info("[Plugin:example-export-extension] Audit Snapshot Payload:", snapshot);

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Audit_Snapshot_${companyPib}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // UI Injection 1: Profit & Tax view toolbar action button
  api.registerActionButton({
    id: "audit-snapshot-profit-tax",
    slot: "profit-tax-toolbar",
    label: "Audit Snapshot",
    title: "Export JSON Audit Snapshot via example-export-extension plugin",
    onClick: (ctx) => downloadAuditSnapshot(ctx),
  });

  // UI Injection 2: Payroll Ledger toolbar action button
  api.registerActionButton({
    id: "audit-snapshot-ledger",
    slot: "ledger-toolbar",
    label: "Audit Snapshot",
    title: "Export Payroll Audit Snapshot via example-export-extension plugin",
    onClick: (ctx) => downloadAuditSnapshot(ctx),
  });

  // UI Injection 3: Workspace Sidebar / Extension Strip Widget
  api.registerSidebarWidget({
    id: "audit-extension-widget",
    title: "Audit Snapshot Extension",
    badge: `v${api.manifest.version}`,
    render: (ctx = {}) =>
      h(
        "div",
        { className: "flex flex-wrap items-center justify-between gap-2 text-xs" },
        h(
          "div",
          { className: "text-slate-600 dark:text-slate-300" },
          "Active on ",
          h(
            "span",
            { className: "font-semibold text-slate-900 dark:text-slate-100" },
            ctx.activeCompany?.naziv || "Global Workstation",
          ),
          " · Tier: ",
          h("span", { className: "font-mono font-semibold" }, api.activeTier),
        ),
        h(
          "div",
          { className: "flex items-center gap-2" },
          h(
            "button",
            {
              type: "button",
              onClick: () => downloadAuditSnapshot(ctx),
              className:
                "px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer transition-colors",
            },
            "Run Audit Snapshot",
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () => ctx.navigateToCustomRoute?.("/plugin/audit-extension"),
              className:
                "px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors",
            },
            "Inspect Extension",
          ),
        ),
      ),
  });

  // UI Injection 4: Custom Plugin Route View
  api.registerCustomRoute({
    path: "/plugin/audit-extension",
    title: "Audit Extension",
    render: (ctx = {}) =>
      h(
        "div",
        {
          className:
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4",
        },
        h(
          "div",
          { className: "flex flex-wrap items-center justify-between gap-3" },
          h(
            "div",
            null,
            h(
              "div",
              { className: "text-xs font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400" },
              `Plugin Route · ${api.pluginId}`,
            ),
            h(
              "h2",
              { className: "text-lg font-bold text-slate-900 dark:text-white mt-0.5" },
              api.manifest.name,
            ),
            h(
              "p",
              { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" },
              api.manifest.description,
            ),
          ),
          h(
            "div",
            { className: "flex items-center gap-2" },
            h(
              "button",
              {
                type: "button",
                onClick: () => downloadAuditSnapshot(ctx),
                className:
                  "px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer",
              },
              "Export Audit Snapshot",
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => ctx.navigateBack?.(),
                className:
                  "px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer",
              },
              "Back to Ledger",
            ),
          ),
        ),
        h(
          "div",
          { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono" },
          h(
            "div",
            { className: "p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700" },
            h("div", { className: "text-slate-400" }, "Required Tier"),
            h("div", { className: "font-bold text-slate-900 dark:text-white mt-1" }, api.manifest.requiredLicenseTier),
          ),
          h(
            "div",
            { className: "p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700" },
            h("div", { className: "text-slate-400" }, "Active Tier"),
            h("div", { className: "font-bold text-emerald-600 dark:text-emerald-400 mt-1" }, api.activeTier),
          ),
          h(
            "div",
            { className: "p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700" },
            h("div", { className: "text-slate-400" }, "Permissions"),
            h("div", { className: "font-bold text-slate-900 dark:text-white mt-1 truncate" }, api.permissions.join(", ")),
          ),
        ),
        h(
          "div",
          { className: "border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-950 text-emerald-400 font-mono text-xs space-y-1" },
          h("div", { className: "text-slate-400 font-semibold mb-1" }, "Recent Isolated Plugin Logs"),
          ...(recentLogs.length > 0
            ? recentLogs.map((line, i) => h("div", { key: i }, line))
            : [h("div", { key: "empty" }, "No plugin events recorded yet.")]),
        ),
      ),
  });
}
