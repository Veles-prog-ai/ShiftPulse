import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import {
  WORKSPACE_TREE,
  isFileSystemAccessSupported,
  encryptBackupPayload,
  decryptBackupPayload,
  uploadBackupToUserCloud,
} from "../utils/localWorkspaceEngine";
import {
  Database,
  Download,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  FolderSync,
  Lock,
  CloudUpload,
  Wifi,
  WifiOff,
  HardDrive,
  Upload,
} from "lucide-react";

export const DataManagementModal = ({ onClose }) => {
  const {
    exportDataJson,
    importDataJson,
    clearWorkspaceData,
    isOnline,
    gatewayStatus,
    workspaceHandle,
    workspacePermissionState,
    workspaceConnected,
    workspaceDisplayName,
    lastBackupAt,
    connectWorkspaceFolder,
    reconnectWorkspaceFolder,
    initLocalDesktopWorkspace,
    disconnectWorkspaceFolder,
    saveOutputDocumentToWorkspace,
    markBackupCompleted,
  } = useShift();
  const { t, intlLocale } = useLanguage();
  const s = t.ui.dataSyncExtra;

  const [activeSection, setActiveSection] = useState("workspace");
  const [statusBanner, setStatusBanner] = useState(null);

  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [cloudEndpointUrl, setCloudEndpointUrl] = useState(() => {
    try {
      return localStorage.getItem("shiftpulse_cloud_endpoint_v1") || "";
    } catch {
      return "";
    }
  });
  const [cloudAuthHeader, setCloudAuthHeader] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const [importJsonText, setImportJsonText] = useState("");
  const [decryptPassphrase, setDecryptPassphrase] = useState("");
  const [confirmResetStep, setConfirmResetStep] = useState(false);

  const fsSupported = isFileSystemAccessSupported();

  const handleConnectFolder = async () => {
    setStatusBanner(null);
    setIsWorking(true);
    try {
      const handle = await connectWorkspaceFolder();
      setStatusBanner({
        type: "success",
        text: interpolate(s.msgFolderCreated, { name: handle.name }),
      });
    } catch (err) {
      if (err?.name !== "AbortError") {
        setStatusBanner({
          type: "error",
          text: err?.message || s.errConnectFolder,
        });
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleInitDesktopFolders = async () => {
    setStatusBanner(null);
    setIsWorking(true);
    try {
      const res = await initLocalDesktopWorkspace();
      setStatusBanner({
        type: "success",
        text: interpolate(s.msgDesktopVerified, { path: res.workspacePath }),
      });
    } catch (err) {
      setStatusBanner({
        type: "error",
        text: err?.message || s.errDesktopInit,
      });
    } finally {
      setIsWorking(false);
    }
  };

  const buildBackupPayload = async () => {
    const rawJson = exportDataJson();
    return encryptBackupPayload(rawJson, backupPassphrase);
  };

  const handleDownloadBackup = async () => {
    setIsWorking(true);
    setStatusBanner(null);
    try {
      const payload = await buildBackupPayload();
      const dateStr = new Date().toISOString().split("T")[0];
      const isEncrypted = Boolean(backupPassphrase.trim());
      const filename = isEncrypted
        ? `shiftpulse-encrypted-backup-${dateStr}.spb.json`
        : `shiftpulse-backup-${dateStr}.json`;

      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (workspaceConnected) {
        await saveOutputDocumentToWorkspace({
          topFolder: "03_Korisnicki_Backup",
          subFolder: "",
          filename,
          content: payload,
        });
      }

      markBackupCompleted();
      const savedFolder = workspaceConnected ? s.savedFolderPart : "";
      setStatusBanner({
        type: "success",
        text: isEncrypted
          ? interpolate(s.msgSavedEnc, { filename, savedFolder })
          : interpolate(s.msgSavedPlain, { filename, savedFolder }),
      });
    } catch (err) {
      setStatusBanner({
        type: "error",
        text: err?.message || s.errGenerateBackup,
      });
    } finally {
      setIsWorking(false);
    }
  };

  const handleUploadUserCloud = async () => {
    setIsWorking(true);
    setStatusBanner(null);
    try {
      try {
        localStorage.setItem("shiftpulse_cloud_endpoint_v1", cloudEndpointUrl.trim());
      } catch {}
      const payload = await buildBackupPayload();
      await uploadBackupToUserCloud({
        targetUrl: cloudEndpointUrl,
        authHeader: cloudAuthHeader,
        payloadStr: payload,
      });
      markBackupCompleted();
      setStatusBanner({
        type: "success",
        text: s.msgCloudUploaded,
      });
    } catch (err) {
      setStatusBanner({
        type: "error",
        text: err?.message || s.errCloudUpload,
      });
    } finally {
      setIsWorking(false);
    }
  };

  const handleRestoreFromFile = async (file) => {
    if (!file) return;
    try {
      const content = await file.text();
      setImportJsonText(content);
      const plain = await decryptBackupPayload(content, decryptPassphrase);
      const ok = importDataJson(plain);
      if (ok) {
        setStatusBanner({
          type: "success",
          text: interpolate(s.msgRestoredFile, { filename: file.name }),
        });
      } else {
        setStatusBanner({
          type: "error",
          text: s.errInvalidFile,
        });
      }
    } catch (err) {
      setStatusBanner({
        type: "error",
        text: err?.message || s.errDecryptFile,
      });
    }
  };

  const handleRestorePaste = async () => {
    if (!importJsonText.trim()) return;
    setStatusBanner(null);
    try {
      const plain = await decryptBackupPayload(importJsonText, decryptPassphrase);
      const ok = importDataJson(plain);
      if (ok) {
        setStatusBanner({
          type: "success",
          text: t.dataModal.importSuccess,
        });
        setTimeout(() => onClose(), 1100);
      } else {
        setStatusBanner({
          type: "error",
          text: t.dataModal.importError,
        });
      }
    } catch (err) {
      setStatusBanner({
        type: "error",
        text: err?.message || t.dataModal.importError,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3
                id="data-modal-title"
                className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100"
              >
                {s.modalTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {s.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gateway & Offline Status Strip */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-mono text-slate-700 dark:text-slate-300">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{s.serverRole}</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isOnline
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? s.gatewayOnline : s.offlineMode}
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs">
          {[
            { id: "workspace", label: s.tabWorkspace },
            { id: "backup", label: s.tabBackup },
            { id: "restore", label: s.tabRestore },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id);
                setStatusBanner(null);
              }}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors cursor-pointer ${
                activeSection === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {statusBanner && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 ${
                statusBanner.type === "error"
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {statusBanner.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{statusBanner.text}</span>
            </div>
          )}

          {activeSection === "workspace" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {s.folderStatusTitle}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {workspaceConnected
                        ? interpolate(s.activePrefix, { path: workspaceDisplayName })
                        : workspacePermissionState === "prompt" && workspaceHandle
                        ? interpolate(s.awaitingPerm, { name: workspaceHandle.name })
                        : s.noFolderLinked}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {workspacePermissionState === "prompt" && workspaceHandle && (
                      <button
                        onClick={reconnectWorkspaceFolder}
                        className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                      >
                        {s.unlockBtn}
                      </button>
                    )}

                    {fsSupported && (
                      <button
                        onClick={handleConnectFolder}
                        disabled={isWorking}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>
                          {workspaceHandle ? s.changeFolderBtn : s.selectFolderBtn}
                        </span>
                      </button>
                    )}

                    {gatewayStatus.localDesktopActive && (
                      <button
                        onClick={handleInitDesktopFolders}
                        disabled={isWorking}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                      >
                        <FolderSync className="w-4 h-4 text-emerald-600" />
                        <span>{s.verifyDesktopBtn}</span>
                      </button>
                    )}

                    {workspaceHandle && (
                      <button
                        onClick={disconnectWorkspaceFolder}
                        className="px-2.5 py-2 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                      >
                        {s.unlinkBtn}
                      </button>
                    )}
                  </div>
                </div>

                {!fsSupported && !gatewayStatus.localDesktopActive && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                    {s.browserHint}
                  </p>
                )}
              </div>

              {/* Organized Subfolder Map */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {s.subfolderTreeTitle} (<code className="font-mono">ShiftPulse_Workspace</code>)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                  {Object.entries(WORKSPACE_TREE).map(([top, subs]) => (
                    <div
                      key={top}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">
                        {top}/
                      </div>
                      {subs.length > 0 ? (
                        <ul className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-300 pl-2">
                          {subs.map((sub) => (
                            <li key={sub}>├── {sub}/</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-1.5 text-slate-500 dark:text-slate-400">
                          ├── {s.aesBackupsSub}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {s.syncTip}
                </p>
              </div>
            </div>
          )}

          {activeSection === "backup" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {s.step1Title}
                  </span>
                  {lastBackupAt && (
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {interpolate(s.lastBackupLabel, {
                        date: new Date(lastBackupAt).toLocaleString(intlLocale),
                      })}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  {s.step1Desc}
                </p>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    {s.passOptLabel}
                  </label>
                  <input
                    type="password"
                    value={backupPassphrase}
                    onChange={(e) => setBackupPassphrase(e.target.value)}
                    placeholder={s.passOptPh}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <button
                  onClick={handleDownloadBackup}
                  disabled={isWorking}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {backupPassphrase.trim()
                      ? s.downloadEncBtn
                      : s.downloadPlainBtn}
                    {workspaceConnected ? s.saveFolderSuffix : ""}
                  </span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {s.step2Title}
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  {s.step2Desc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">
                      {s.endpointLabel}
                    </label>
                    <input
                      type="url"
                      value={cloudEndpointUrl}
                      onChange={(e) => setCloudEndpointUrl(e.target.value)}
                      placeholder="https://cloud.example.com/remote.php/dav/files/..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">
                      {s.authLabel}
                    </label>
                    <input
                      type="password"
                      value={cloudAuthHeader}
                      onChange={(e) => setCloudAuthHeader(e.target.value)}
                      placeholder="Bearer ... / Basic ..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUploadUserCloud}
                  disabled={isWorking || !cloudEndpointUrl.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{s.uploadCloudBtn}</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === "restore" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-sm">
                  {s.restoreTitle}
                </span>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">
                    {s.decryptLabel}
                  </label>
                  <input
                    type="password"
                    value={decryptPassphrase}
                    onChange={(e) => setDecryptPassphrase(e.target.value)}
                    placeholder={s.decryptPh}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <label className="block border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    accept=".json,.spb"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleRestoreFromFile(f);
                      e.target.value = "";
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                    <Upload className="w-4 h-4" />
                    <span>{s.selectFileBtn}</span>
                  </span>
                </label>

                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={s.pastePh}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                />

                <button
                  onClick={handleRestorePaste}
                  disabled={!importJsonText.trim()}
                  className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {s.importBtn}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {s.wipeDesc}
                </span>
                {!confirmResetStep ? (
                  <button
                    onClick={() => setConfirmResetStep(true)}
                    className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{s.clearDataBtn}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmResetStep(false)}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {s.cancelBtn}
                    </button>
                    <button
                      onClick={() => {
                        clearWorkspaceData();
                        setConfirmResetStep(false);
                        onClose();
                      }}
                      className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                    >
                      {s.confirmWipeBtn}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
