import { useState, useEffect, useRef } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import {
  computeContentHash,
  getCachedAiResponse,
  setCachedAiResponse,
  redactSensitiveTextForAi,
  runLocalShiftConflictPrecheck,
  buildCompactSchedulePayload,
} from "../utils/localAccountsEngine";
import {
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Upload,
  Mail,
  Copy,
  Send,
  Check,
  ShieldCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  UserCheck,
  XCircle,
} from "lucide-react";

export const AiCopilotView = () => {
  const {
    shifts,
    jobs,
    addJobFromAi,
    activeOperator,
    recordAiUsageStats,
    logHitlDecision,
  } = useShift();
  const { t } = useLanguage();
  const h = t.ui.aiCopilotHitl;

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [editableDoc, setEditableDoc] = useState(null);
  const [docError, setDocError] = useState(null);
  const [docHitlStatus, setDocHitlStatus] = useState(null); // null | "approved" | "edited_approved" | "rejected"
  const [fileName, setFileName] = useState(null);

  const prevDefaultMsgRef = useRef(t.aiCopilot.defaultMessage);
  const [messageText, setMessageText] = useState(t.aiCopilot.defaultMessage);
  useEffect(() => {
    if (messageText === prevDefaultMsgRef.current) {
      setMessageText(t.aiCopilot.defaultMessage);
    }
    prevDefaultMsgRef.current = t.aiCopilot.defaultMessage;
  }, [t.aiCopilot.defaultMessage, messageText]);
  const [loadingConflict, setLoadingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState(null);
  const [conflictError, setConflictError] = useState(null);
  const [editableReply, setEditableReply] = useState("");
  const [conflictHitlStatus, setConflictHitlStatus] = useState(null);
  const [copiedReply, setCopiedReply] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const policy = activeOperator?.hitlPolicy || {};
  const canScanDoc = policy.allowAiDocumentScan !== false;
  const canCheckConflict = policy.allowAiConflictMonitor !== false;

  const applyDocResult = (resultData) => {
    setDocResult(resultData);
    setEditableDoc({
      employerName: resultData?.contractAnalysis?.employerName || "",
      detectedRole: resultData?.contractAnalysis?.detectedRole || "",
      baseHourlyRate: Number(resultData?.contractAnalysis?.baseHourlyRate) || 0,
      currency: resultData?.contractAnalysis?.currency || "RSD",
      nightDiffValue: Number(resultData?.extractedRules?.nightDiffValue) || 26,
    });
    setDocHitlStatus(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canScanDoc) {
      setDocError(
        interpolate(h.errNoScanPermission, { name: activeOperator?.displayName || "" }),
      );
      return;
    }

    setFileName(file.name);
    setLoadingDoc(true);
    setDocError(null);
    setDocResult(null);
    setEditableDoc(null);
    setDocHitlStatus(null);

    try {
      const isTextLike =
        file.type.startsWith("text/") ||
        /\.(txt|csv|xml|json)$/i.test(file.name);

      if (isTextLike) {
        let rawText = await file.text();
        if (policy.redactCompanyIdentity !== false) {
          rawText = redactSensitiveTextForAi(rawText);
        }
        const hashKey = `doc:${await computeContentHash(rawText)}`;
        const cached = getCachedAiResponse(hashKey);
        if (cached) {
          const cachedMeta = {
            ...cached,
            aiMeta: {
              ...(cached.aiMeta || {}),
              executionSource: "local_cache",
              totalTokens: 0,
            },
          };
          applyDocResult(cachedMeta);
          recordAiUsageStats({ source: "local_cache", totalTokens: 0, savedTokens: 650 });
          return;
        }

        const response = await fetch("/api/legal/analyze-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractedTextSnippet: rawText.slice(0, 8000),
            mimeType: file.type || "text/plain",
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setDocError(data.error || h.errDocAnalysis);
          return;
        }
        setCachedAiResponse(hashKey, data);
        applyDocResult(data);
        recordAiUsageStats({
          source: "gemini_api",
          totalTokens: data?.aiMeta?.totalTokens || 0,
        });
        return;
      }

      // Binarni format (JPG, PNG, PDF)
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const hashKey = `doc-bin:${await computeContentHash(base64String.slice(0, 12000) + file.size)}`;
      const cached = getCachedAiResponse(hashKey);
      if (cached) {
        const cachedMeta = {
          ...cached,
          aiMeta: {
            ...(cached.aiMeta || {}),
            executionSource: "local_cache",
            totalTokens: 0,
          },
        };
        applyDocResult(cachedMeta);
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
        setCachedAiResponse(hashKey, data);
        applyDocResult(data);
        recordAiUsageStats({
          source: "gemini_api",
          totalTokens: data?.aiMeta?.totalTokens || 0,
        });
      } else {
        setDocError(data.error || h.errDocAnalysis);
      }
    } catch {
      setDocError(h.errGateway);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleDocHitlDecision = async (decisionType) => {
    if (!docResult || !editableDoc) return;

    if (decisionType === "rejected") {
      await logHitlDecision({
        module: "ai_contract_scanner",
        decision: "rejected",
        aiModel: docResult?.aiMeta?.model || "gemini-4-hydrogen",
        executionSource: docResult?.aiMeta?.executionSource || "gemini_api",
        totalTokens: docResult?.aiMeta?.totalTokens || 0,
        localSummary: interpolate(h.rejectedDocSummary, { fileName: fileName || h.docFallbackName }),
      });
      setDocHitlStatus("rejected");
      return;
    }

    const orig = docResult.contractAnalysis || {};
    const wasEdited =
      editableDoc.employerName !== orig.employerName ||
      editableDoc.detectedRole !== orig.detectedRole ||
      Number(editableDoc.baseHourlyRate) !== Number(orig.baseHourlyRate) ||
      Number(editableDoc.nightDiffValue) !== Number(docResult?.extractedRules?.nightDiffValue);

    const finalPayload = {
      ...docResult,
      contractAnalysis: {
        ...orig,
        employerName: editableDoc.employerName,
        detectedRole: editableDoc.detectedRole,
        baseHourlyRate: Number(editableDoc.baseHourlyRate) || 0,
        currency: editableDoc.currency || "RSD",
      },
      extractedRules: {
        ...(docResult.extractedRules || {}),
        nightDiffValue: Number(editableDoc.nightDiffValue) || 26,
      },
    };

    addJobFromAi(finalPayload);

    const finalDecision = wasEdited ? "edited_approved" : "approved";
    await logHitlDecision({
      module: "ai_contract_scanner",
      decision: finalDecision,
      aiModel: docResult?.aiMeta?.model || "gemini-4-hydrogen",
      executionSource: docResult?.aiMeta?.executionSource || "gemini_api",
      totalTokens: docResult?.aiMeta?.totalTokens || 0,
      localSummary: interpolate(h.approvedDocSummary, {
        decision: finalDecision,
        employer: editableDoc.employerName,
        rate: editableDoc.baseHourlyRate,
        currency: editableDoc.currency,
      }),
    });
    setDocHitlStatus(finalDecision);
  };

  const handleCheckConflicts = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (!canCheckConflict) {
      setConflictError(
        interpolate(h.errNoConflictPermission, { name: activeOperator?.displayName || "" }),
      );
      return;
    }

    setLoadingConflict(true);
    setConflictError(null);
    setConflictResult(null);
    setConflictHitlStatus(null);

    try {
      // 1. Prvo pokrećemo deterministički lokalni pre-filter (0 tokena)
      const localPrecheck = runLocalShiftConflictPrecheck(messageText, shifts, jobs);
      if (policy.preferZeroTokenLocalFirst !== false && localPrecheck.resolvedLocally) {
        const resObj = {
          success: true,
          ...localPrecheck,
          aiMeta: {
            model: "local-deterministic-solver",
            executionSource: "local_prefilter",
            totalTokens: 0,
          },
        };
        setConflictResult(resObj);
        setEditableReply(resObj.suggestedReplyTemplate || "");
        recordAiUsageStats({ source: "local_prefilter", totalTokens: 0, savedTokens: 480 });
        return;
      }

      // 2. Provera SHA-256 lokalnog keša (0 tokena)
      const sanitizedMsg =
        policy.redactCompanyIdentity !== false
          ? redactSensitiveTextForAi(messageText)
          : messageText;
      const compactSchedule = buildCompactSchedulePayload(
        shifts,
        jobs,
        localPrecheck.targetDate,
      );
      const cacheKey = `conflict:${await computeContentHash(`${sanitizedMsg}||${compactSchedule}`)}`;
      const cached = getCachedAiResponse(cacheKey);
      if (cached) {
        const resObj = {
          ...cached,
          aiMeta: {
            ...(cached.aiMeta || {}),
            executionSource: "local_cache",
            totalTokens: 0,
          },
        };
        setConflictResult(resObj);
        setEditableReply(resObj.suggestedReplyTemplate || "");
        recordAiUsageStats({ source: "local_cache", totalTokens: 0, savedTokens: 480 });
        return;
      }

      // 3. Tek ako je poruka nejasna ili zahteva kompleksan kontekst, pozivamo optimizovani Gemini-4-Hydrogen
      const response = await fetch("/api/schedule/detect-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMessage: sanitizedMsg,
          compactScheduleSummary: compactSchedule,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCachedAiResponse(cacheKey, data);
        setConflictResult(data);
        setEditableReply(data.suggestedReplyTemplate || "");
        recordAiUsageStats({
          source: "gemini_api",
          totalTokens: data?.aiMeta?.totalTokens || 0,
        });
      } else {
        setConflictError(data.error || h.errConflictAnalysis);
      }
    } catch {
      setConflictError(h.errConflictGateway);
    } finally {
      setLoadingConflict(false);
    }
  };

  const handleConflictHitlDecision = async (decisionType) => {
    if (!conflictResult) return;

    if (decisionType === "rejected") {
      await logHitlDecision({
        module: "ai_conflict_monitor",
        decision: "rejected",
        aiModel: conflictResult?.aiMeta?.model || "gemini-4-hydrogen",
        executionSource: conflictResult?.aiMeta?.executionSource || "gemini_api",
        totalTokens: conflictResult?.aiMeta?.totalTokens || 0,
        localSummary: h.rejectedConflictSummary,
      });
      setConflictHitlStatus("rejected");
      return;
    }

    const wasEdited =
      editableReply.trim() !== String(conflictResult.suggestedReplyTemplate || "").trim();
    const finalDecision = wasEdited ? "edited_approved" : "approved";

    try {
      await navigator.clipboard.writeText(editableReply);
      setCopiedReply(true);
      setTimeout(() => setCopiedReply(false), 2000);
    } catch {}

    await logHitlDecision({
      module: "ai_conflict_monitor",
      decision: finalDecision,
      aiModel: conflictResult?.aiMeta?.model || "gemini-4-hydrogen",
      executionSource: conflictResult?.aiMeta?.executionSource || "gemini_api",
      totalTokens: conflictResult?.aiMeta?.totalTokens || 0,
      localSummary: interpolate(h.approvedConflictSummary, { decision: finalDecision }),
    });
    setConflictHitlStatus(finalDecision);
  };

  const renderSourceLine = (aiMeta) => {
    if (!aiMeta) return null;
    const isZero = !aiMeta.totalTokens;
    const sourceLabel =
      aiMeta.executionSource === "local_prefilter"
        ? h.srcLocalPrefilter
        : aiMeta.executionSource === "local_cache"
          ? h.srcLocalCache
          : interpolate(h.srcGemini, { level: aiMeta.thinkingLevel || "LOW" });

    return (
      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums flex flex-wrap items-center gap-2">
        <span>{h.sourcePrefix} {sourceLabel}</span>
        <span aria-hidden="true">·</span>
        <span className={isZero ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}>
          {isZero ? h.zeroTokens : interpolate(h.tokensCount, { count: aiMeta.totalTokens })}
        </span>
        <span aria-hidden="true">·</span>
        <span>{h.operatorPrefix} {activeOperator?.displayName}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-300">
          <div className="flex items-center gap-2 font-mono font-bold tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{t.aiCopilot.badge}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              {interpolate(h.hitlOperatorLabel, {
                name: activeOperator?.displayName || "",
                role: t.ui.accountsHitlFull?.roles?.[activeOperator?.role] || activeOperator?.role || "",
              })}
            </span>
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          {t.aiCopilot.title}
        </h2>
        <p className="text-xs text-slate-300 max-w-2xl">
          {t.aiCopilot.subtitle} {h.hitlSubtitleSuffix}
        </p>
      </div>

      {/* MODULE A: Contract Document Parser */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {t.aiCopilot.modulA}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.aiCopilot.uploadPrompt}
            </p>
          </div>
        </div>

        {!canScanDoc ? (
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200">
            {interpolate(h.disabledScanNotice, { name: activeOperator?.displayName || "" })}
          </div>
        ) : (
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950/40 cursor-pointer transition-colors group">
            <input
              type="file"
              accept="image/*,application/pdf,text/plain,.csv,.xml"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              disabled={loadingDoc}
            />
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mx-auto mb-2 transition-colors" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {loadingDoc ? (
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  {t.aiCopilot.analyzing}
                </span>
              ) : fileName ? (
                <span className="text-slate-900 dark:text-white font-mono">
                  {fileName}
                </span>
              ) : (
                t.aiCopilot.selectFile
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {h.uploadHint}
            </p>
          </div>
        )}

        {docError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900 rounded-xl text-xs">
            {docError}
          </div>
        )}

        {/* Parsed Result + Mandatory HITL Verification */}
        {docResult && editableDoc && (
          <div className="space-y-3 text-xs pt-1">
            {renderSourceLine(docResult.aiMeta)}

            <div className="p-4 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  {h.hitlVerifyHeading}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {t.aiCopilot.detectedEmployer}
                  </label>
                  <input
                    type="text"
                    value={editableDoc.employerName}
                    onChange={(e) =>
                      setEditableDoc((prev) => ({ ...prev, employerName: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {t.aiCopilot.detectedRole}
                  </label>
                  <input
                    type="text"
                    value={editableDoc.detectedRole}
                    onChange={(e) =>
                      setEditableDoc((prev) => ({ ...prev, detectedRole: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {t.aiCopilot.baseRate} ({editableDoc.currency}/h)
                  </label>
                  <input
                    type="number"
                    value={editableDoc.baseHourlyRate}
                    onChange={(e) =>
                      setEditableDoc((prev) => ({ ...prev, baseHourlyRate: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {t.aiCopilot.nightDiffBonus} (%)
                  </label>
                  <input
                    type="number"
                    value={editableDoc.nightDiffValue}
                    onChange={(e) =>
                      setEditableDoc((prev) => ({ ...prev, nightDiffValue: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                {!docHitlStatus ? (
                  <>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {h.hitlServerLogNote}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDocHitlDecision("rejected")}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{h.rejectAiProposalBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocHitlDecision("approved")}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{h.approveSaveHitlBtn}</span>
                      </button>
                    </div>
                  </>
                ) : docHitlStatus === "rejected" ? (
                  <div className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    {interpolate(h.proposalRejectedLine, { username: activeOperator?.username || "" })}
                  </div>
                ) : (
                  <div className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    {t.aiCopilot.jobSaved} · {interpolate(h.statusRecordedLine, {
                      status: docHitlStatus,
                      username: activeOperator?.username || "",
                    })}
                  </div>
                )}
              </div>
            </div>

            {docResult.legalComplianceAlerts &&
              docResult.legalComplianceAlerts.length > 0 && (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2">
                  <div className="text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{t.aiCopilot.legalAlerts}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    {docResult.legalComplianceAlerts.map((alert, i) => (
                      <li key={i}>{alert}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </div>

      {/* MODULE B: Smart Shift Conflict Monitor */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t.aiCopilot.modulB}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.aiCopilot.messageLabel} {h.conflictSubSuffix}
          </p>
        </div>

        {!canCheckConflict ? (
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200">
            {interpolate(h.disabledConflictNotice, { name: activeOperator?.displayName || "" })}
          </div>
        ) : (
          <form onSubmit={handleCheckConflicts} className="space-y-3">
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t.aiCopilot.defaultMessage}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={loadingConflict}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingConflict ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>{t.aiCopilot.checking}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{t.aiCopilot.checkConflict}</span>
                </>
              )}
            </button>
          </form>
        )}

        {conflictError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900 rounded-xl text-xs">
            {conflictError}
          </div>
        )}

        {conflictResult && (
          <div className="space-y-3 text-xs pt-1">
            {renderSourceLine(conflictResult.aiMeta)}

            {conflictResult.conflictDetected ? (
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-1">
                <div className="text-rose-800 dark:text-rose-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{t.aiCopilot.conflictFound}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                  {conflictResult.conflictDetails}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{conflictResult.conflictDetails || t.aiCopilot.noConflict}</span>
              </div>
            )}

            {/* HITL Review & Approval */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {t.aiCopilot.suggestedReply} {h.replyOperatorReviewSuffix}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(editableReply);
                    setCopiedReply(true);
                    setTimeout(() => setCopiedReply(false), 2000);
                  }}
                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:text-indigo-600 transition-colors cursor-pointer"
                  title={t.aiCopilot.copyReply}
                >
                  {copiedReply ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  )}
                </button>
              </div>

              <textarea
                rows={3}
                value={editableReply}
                onChange={(e) => setEditableReply(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                {!conflictHitlStatus ? (
                  <>
                    <span className="text-[11px] text-slate-500">
                      {interpolate(h.conflictAuditNote, { username: activeOperator?.username || "" })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConflictHitlDecision("rejected")}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer"
                      >
                        {h.rejectProposalBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConflictHitlDecision("approved")}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                      >
                        {h.approveCopyHitlBtn}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    {interpolate(h.decisionRecordedLine, {
                      decision: conflictHitlStatus,
                      username: activeOperator?.username || "",
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODUL C: Pravni Okvir */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <button
          type="button"
          onClick={() => setShowTerms(!showTerms)}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>{t.aiCopilot.termsTitle}</span>
          </div>
          {showTerms ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showTerms && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>{t.aiCopilot.termsNotice1}</p>
            <p>{t.aiCopilot.termsNotice2}</p>
            <p>{t.aiCopilot.termsNotice3}</p>
          </div>
        )}
      </div>
    </div>
  );
};
