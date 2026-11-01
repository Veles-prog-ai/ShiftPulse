import { useState, useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  X,
  Globe,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from "lucide-react";
export const LanguageImportModal = ({ onClose }) => {
  const {
    t,
    supportedLanguages,
    customLanguages,
    importLanguagePack,
    deleteCustomLanguage,
    downloadTranslationTemplate,
    language,
    setLanguage,
  } = useLanguage();
  const fileInputRef = useRef(null);
  const [langCode, setLangCode] = useState("");
  const [langName, setLangName] = useState("");
  const [langFlag, setLangFlag] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        setJsonText(text);
        const parsed = JSON.parse(text);
        if (parsed.code) setLangCode(parsed.code);
        if (parsed.label || parsed.nativeLabel)
          setLangName(parsed.label || parsed.nativeLabel);
        if (parsed.flag) setLangFlag(parsed.flag);
        setFeedback({
          type: "success",
          message:
            "JSON file read successfully. Review metadata and click Import.",
        });
      } catch (err) {
        setFeedback({
          type: "error",
          message: "Could not parse JSON file. Please ensure it is valid JSON.",
        });
      }
    };
    reader.readAsText(file);
  };
  const handleImportSubmit = () => {
    try {
      if (!jsonText.trim()) {
        setFeedback({
          type: "error",
          message: "Please select a JSON file or paste translation JSON text.",
        });
        return;
      }
      const parsed = JSON.parse(jsonText);
      const code = (langCode || parsed.code || "").trim().toLowerCase();
      const name = (
        langName ||
        parsed.nativeLabel ||
        parsed.label ||
        ""
      ).trim();
      const flag = (langFlag || parsed.flag || "\u{1F310}").trim();
      const translations = parsed.translations || parsed;
      if (!code) {
        setFeedback({
          type: "error",
          message: 'Language code is required (e.g. "fr", "it", "es").',
        });
        return;
      }
      if (!name) {
        setFeedback({
          type: "error",
          message: 'Language name is required (e.g. "Fran\xE7ais").',
        });
        return;
      }
      const pack = {
        code,
        label: name,
        nativeLabel: name,
        flag,
        translations,
      };
      const result = importLanguagePack(pack);
      if (result.success) {
        setFeedback({
          type: "success",
          message: t.customLang.importSuccess,
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setFeedback({
          type: "error",
          message: result.error || t.customLang.importError,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: `${t.customLang.importError} (${err.message || "JSON parse error"})`,
      });
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.customLang.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.customLang.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Download Template Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FileCode className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.customLang.downloadTemplate}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Get the full boilerplate with all ~100 UI strings in English
                  ready to translate.
                </p>
              </div>
            </div>
            <button
              onClick={downloadTranslationTemplate}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* Upload Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t.customLang.importBtn}
            </h4>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-center"
            >
              <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {t.customLang.selectJson}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Click to select JSON translation file from your computer
                </p>
              </div>
            </button>

            {/* Language Metadata Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.customLang.langCode}
                </label>
                <input
                  type="text"
                  value={langCode}
                  onChange={(e) => setLangCode(e.target.value)}
                  placeholder="e.g. fr, es, it"
                  className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.customLang.langName}
                </label>
                <input
                  type="text"
                  value={langName}
                  onChange={(e) => setLangName(e.target.value)}
                  placeholder="e.g. Français"
                  className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.customLang.langFlag}
                </label>
                <input
                  type="text"
                  value={langFlag}
                  onChange={(e) => setLangFlag(e.target.value)}
                  placeholder="e.g. 🇫🇷"
                  className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Optional raw JSON preview / paste */}
            {jsonText && (
              <div className="pt-1">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  JSON Data Preview ({jsonText.length} bytes loaded)
                </div>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-mono text-slate-700 dark:text-slate-300 max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-700">
                  {jsonText.slice(0, 300)}...
                </div>
              </div>
            )}

            {feedback && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${feedback.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50" : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50"}`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <button
              onClick={handleImportSubmit}
              disabled={!jsonText}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98]"
            >
              {t.customLang.importBtn}
            </button>
          </div>

          {/* Installed Custom Languages List */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t.customLang.customLanguages} ({customLanguages.length})
            </h4>

            {customLanguages.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {t.customLang.noCustomLanguages}
              </p>
            ) : (
              <div className="space-y-1.5">
                {customLanguages.map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {c.nativeLabel} ({c.code})
                      </span>
                      {language === c.code && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setLanguage(c.code)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => deleteCustomLanguage(c.code)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title={t.customLang.deleteCustom}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            {t.customLang.validationNotice}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
