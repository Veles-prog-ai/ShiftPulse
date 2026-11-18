import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import {
  computeContentHash,
  getCachedAiResponse,
  setCachedAiResponse,
  redactSensitiveTextForAi,
} from "../utils/localAccountsEngine";
import {
  FileText,
  AlertTriangle,
  Check,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";

export const DocumentScanner = () => {
  const { addJobFromAi, activeOperator, recordAiUsageStats, logHitlDecision } =
    useShift();
  const { t } = useLanguage();
  const s = t.ui.scannerModal;
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editableDoc, setEditableDoc] = useState(null);
  const [error, setError] = useState(null);
  const [hitlStatus, setHitlStatus] = useState(null);

  const policy = activeOperator?.hitlPolicy || {};
  const canScan = policy.allowAiDocumentScan !== false;

  const setParsedResult = (data) => {
    setAnalysisResult(data);
    setEditableDoc({
      employerName: data?.contractAnalysis?.employerName || "",
      detectedRole: data?.contractAnalysis?.detectedRole || "",
      baseHourlyRate: Number(data?.contractAnalysis?.baseHourlyRate) || 0,
      currency: data?.contractAnalysis?.currency || "RSD",
      nightDiffValue: Number(data?.extractedRules?.nightDiffValue) || 26,
    });
    setHitlStatus(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canScan) {
      setError(
        interpolate(s.permissionErr, { name: activeOperator?.displayName || "" }),
      );
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setEditableDoc(null);
    setHitlStatus(null);

    try {
      const isTextLike =
        file.type.startsWith("text/") || /\.(txt|csv|xml)$/i.test(file.name);

      if (isTextLike) {
        let snippet = await file.text();
        if (policy.redactCompanyIdentity !== false) {
          snippet = redactSensitiveTextForAi(snippet);
        }
        const cacheKey = `doc:${await computeContentHash(snippet)}`;
        const cached = getCachedAiResponse(cacheKey);
        if (cached) {
          setParsedResult({
            ...cached,
            aiMeta: {
              ...(cached.aiMeta || {}),
              executionSource: "local_cache",
              totalTokens: 0,
            },
          });
          recordAiUsageStats({ source: "local_cache", totalTokens: 0, savedTokens: 650 });
          return;
        }
        const response = await fetch("/api/legal/analyze-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractedTextSnippet: snippet.slice(0, 8000),
            mimeType: file.type || "text/plain",
          }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setCachedAiResponse(cacheKey, data);
          setParsedResult(data);
          recordAiUsageStats({
            source: "gemini_api",
            totalTokens: data?.aiMeta?.totalTokens || 0,
          });
        } else {
          setError(data.error || s.analysisErr);
        }
        return;
      }

      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const cacheKey = `doc-bin:${await computeContentHash(base64String.slice(0, 12000) + file.size)}`;
      const cached = getCachedAiResponse(cacheKey);
      if (cached) {
        setParsedResult({
          ...cached,
          aiMeta: {
            ...(cached.aiMeta || {}),
            executionSource: "local_cache",
            totalTokens: 0,
          },
        });
        recordAiUsageStats({ source: "local_cache", totalTokens: 0, savedTokens: 900 });
        return;
      }

      const response = await fetch("/api/legal/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: base64String,
          mimeType: file.type || "application/pdf",
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCachedAiResponse(cacheKey, data);
        setParsedResult(data);
        recordAiUsageStats({
          source: "gemini_api",
          totalTokens: data?.aiMeta?.totalTokens || 0,
        });
      } else {
        setError(data.error || s.analysisErr);
      }
    } catch {
      setError(s.serverErr);
    } finally {
      setLoading(false);
    }
  };

  const handleHitlDecision = async (decision) => {
    if (!analysisResult || !editableDoc) return;

    if (decision === "rejected") {
      await logHitlDecision({
        module: "document_scanner",
        decision: "rejected",
        aiModel: analysisResult?.aiMeta?.model || "gemini-4-hydrogen",
        executionSource: analysisResult?.aiMeta?.executionSource || "gemini_api",
        totalTokens: analysisResult?.aiMeta?.totalTokens || 0,
        localSummary: s.rejectedSummary,
      });
      setHitlStatus("rejected");
      return;
    }

    const orig = analysisResult.contractAnalysis || {};
    const wasEdited =
      editableDoc.employerName !== orig.employerName ||
      editableDoc.detectedRole !== orig.detectedRole ||
      Number(editableDoc.baseHourlyRate) !== Number(orig.baseHourlyRate);

    addJobFromAi({
      ...analysisResult,
      contractAnalysis: {
        ...orig,
        employerName: editableDoc.employerName,
        detectedRole: editableDoc.detectedRole,
        baseHourlyRate: Number(editableDoc.baseHourlyRate) || 0,
        currency: editableDoc.currency || "RSD",
      },
      extractedRules: {
        ...(analysisResult.extractedRules || {}),
        nightDiffValue: Number(editableDoc.nightDiffValue) || 26,
      },
    });

    const finalDecision = wasEdited ? "edited_approved" : "approved";
    await logHitlDecision({
      module: "document_scanner",
      decision: finalDecision,
      aiModel: analysisResult?.aiMeta?.model || "gemini-4-hydrogen",
      executionSource: analysisResult?.aiMeta?.executionSource || "gemini_api",
      totalTokens: analysisResult?.aiMeta?.totalTokens || 0,
      localSummary: interpolate(s.approvedSummary, {
        decision: finalDecision,
        employer: editableDoc.employerName,
      }),
    });
    setHitlStatus(finalDecision);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          {s.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {interpolate(s.subtitle, { name: activeOperator?.displayName || "" })}
        </p>
      </div>

      {!canScan ? (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200">
          {interpolate(s.disabledNotice, { name: activeOperator?.displayName || "" })}
        </div>
      ) : (
        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-950/40">
          <input
            type="file"
            accept="image/*,application/pdf,text/plain,.csv,.xml"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={loading}
          />
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {loading ? s.dropLoading : s.dropIdle}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900 rounded-lg text-xs">
          {error}
        </div>
      )}

      {analysisResult && editableDoc && (
        <div className="space-y-3 text-xs">
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {s.sourceLabel}{" "}
            {analysisResult?.aiMeta?.executionSource === "local_cache"
              ? s.sourceCache
              : interpolate(s.sourceGemini, { tokens: analysisResult?.aiMeta?.totalTokens || 0 })}
          </div>

          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              {s.hitlTitle}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={editableDoc.employerName}
                onChange={(e) =>
                  setEditableDoc((prev) => ({ ...prev, employerName: e.target.value }))
                }
                placeholder={s.employerPh}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={editableDoc.detectedRole}
                onChange={(e) =>
                  setEditableDoc((prev) => ({ ...prev, detectedRole: e.target.value }))
                }
                placeholder={s.positionPh}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="number"
                value={editableDoc.baseHourlyRate}
                onChange={(e) =>
                  setEditableDoc((prev) => ({ ...prev, baseHourlyRate: e.target.value }))
                }
                placeholder={s.hourlyPh}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
              <input
                type="number"
                value={editableDoc.nightDiffValue}
                onChange={(e) =>
                  setEditableDoc((prev) => ({ ...prev, nightDiffValue: e.target.value }))
                }
                placeholder={s.nightPctPh}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>

            {!hitlStatus ? (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleHitlDecision("rejected")}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {s.rejectBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleHitlDecision("approved")}
                  className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {s.approveBtn}
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {interpolate(s.hitlStatusLine, {
                  status: hitlStatus,
                  username: activeOperator?.username || "",
                })}
              </div>
            )}
          </div>

          {analysisResult.legalComplianceAlerts &&
            analysisResult.legalComplianceAlerts.length > 0 && (
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  {s.legalReviewTitle}
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  {analysisResult.legalComplianceAlerts.map((alert, idx) => (
                    <li key={idx}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
