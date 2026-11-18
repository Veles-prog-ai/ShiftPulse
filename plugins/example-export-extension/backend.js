/**
 * Server-side plugin entrypoint for example-export-extension.
 * Executed inside BackendPluginManager try/catch isolation boundaries.
 */
export async function activateBackend(api) {
  api.log("Backend extension initialized cleanly.");

  api.onLedgerEntryCreate((entry) => {
    api.log(
      `Observed ledger entry creation (${entry?.docNumber || entry?.id || "draft"}).`,
    );
    return {
      ...entry,
      pluginVerifiedBy: api.pluginId,
    };
  });

  api.onBeforeReportExport((reportContext) => {
    api.log(
      `Preparing report export (${reportContext?.reportType || "ledger"}) with audit metadata.`,
    );
    return {
      ...reportContext,
      auditExtensionVersion: api.manifest.version,
      auditTimestamp: new Date().toISOString(),
    };
  });

  api.registerCustomRoute({
    method: "GET",
    path: "/audit-ping",
    title: "Audit Snapshot Backend Status",
    handler: async (_req, res) => {
      res.json({
        success: true,
        pluginId: api.pluginId,
        version: api.manifest.version,
        requiredLicenseTier: api.manifest.requiredLicenseTier,
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    },
  });
}
