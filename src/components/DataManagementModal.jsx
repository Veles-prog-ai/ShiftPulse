import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import {
  Database,
  Download,
  RotateCcw,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
export const DataManagementModal = ({ onClose }) => {
  const { exportDataJson, importDataJson, resetToDemoData } = useShift();
  const { t } = useLanguage();
  const [importJsonText, setImportJsonText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [importStatus, setImportStatus] = useState("idle");
  const handleCopyJson = () => {
    const json = exportDataJson();
    navigator.clipboard.writeText(json);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2e3);
  };
  const handleDownloadJson = () => {
    const json = exportDataJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shiftpulse-backup-${/* @__PURE__ */ new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleImport = () => {
    if (!importJsonText.trim()) return;
    const ok = importDataJson(importJsonText);
    if (ok) {
      setImportStatus("success");
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setImportStatus("error");
    }
  };
  const handleReset = () => {
    if (confirm(t.dataModal.resetConfirm)) {
      resetToDemoData();
      onClose();
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            <h3
              id="data-modal-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              {t.dataModal.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Export */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">
              {t.dataModal.exportTitle}
            </span>
            <p className="text-slate-500 dark:text-slate-400">
              {t.dataModal.exportDesc}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDownloadJson}
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.dataModal.exportBtn}</span>
              </button>
              <button
                onClick={handleCopyJson}
                className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
              >
                {copySuccess ? "\u2713" : "JSON"}
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">
              {t.dataModal.importTitle}
            </span>
            <textarea
              rows={3}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="{ ... }"
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-[11px]"
            />
            {importStatus === "success" && (
              <p className="text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {t.dataModal.importSuccess}
              </p>
            )}
            {importStatus === "error" && (
              <p className="text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />{" "}
                {t.dataModal.importError}
              </p>
            )}
            <button
              onClick={handleImport}
              disabled={!importJsonText.trim()}
              className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {t.dataModal.importBtn}
            </button>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2 flex justify-between items-center">
            <span className="text-slate-500">{t.dataModal.resetDesc}</span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.dataModal.resetBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
