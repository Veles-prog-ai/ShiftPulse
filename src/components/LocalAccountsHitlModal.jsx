import { useState, useEffect } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import {
  DEFAULT_HITL_POLICY,
  OPERATOR_ROLES,
} from "../utils/localAccountsEngine";
import {
  X,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Lock,
  Trash2,
  Cpu,
  History,
  RefreshCw,
  Check,
  AlertTriangle,
} from "lucide-react";

export const LocalAccountsHitlModal = ({ onClose }) => {
  const {
    localAccounts,
    activeOperator,
    localHitlLogs,
    aiUsageStats,
    createLocalAccount,
    updateLocalAccount,
    deleteLocalAccount,
    switchLocalAccount,
    clearLocalAiCache,
  } = useShift();
  const { t, intlLocale } = useLanguage();
  const a = t.ui.accountsHitlFull;
  const translateRole = (role) => a.roles?.[role] || role;

  const [activeTab, setActiveTab] = useState("accounts");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState("Ovlašćeni Knjigovođa");
  const [newPin, setNewPin] = useState("");
  const [newPolicy, setNewPolicy] = useState({ ...DEFAULT_HITL_POLICY });

  const [pinPromptForId, setPinPromptForId] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [serverLogs, setServerLogs] = useState([]);
  const [serverTotalCount, setServerTotalCount] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchServerHitlLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/hitl/logs");
      const data = await res.json();
      if (data?.success) {
        setServerLogs(data.logs || []);
        setServerTotalCount(data.totalCount || 0);
      }
    } catch {
      // Offline režim - zadrži lokalne logove
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs") {
      fetchServerHitlLogs();
    }
  }, [activeTab]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;
    const created = await createLocalAccount({
      displayName: newDisplayName,
      username: newUsername || newDisplayName,
      role: newRole,
      pin: newPin.trim(),
      hitlPolicy: newPolicy,
    });
    setNewDisplayName("");
    setNewUsername("");
    setNewPin("");
    setNewPolicy({ ...DEFAULT_HITL_POLICY });
    setFeedback({
      type: "success",
      text: interpolate(a.msgCreated, {
        name: created.displayName,
        role: translateRole(created.role),
      }),
    });
  };

  const handleSwitchAccount = async (acc) => {
    if (acc.id === activeOperator?.id) return;
    if (acc.hasPin) {
      setPinPromptForId(acc.id);
      setPinInput("");
      setFeedback(null);
      return;
    }
    const res = await switchLocalAccount(acc.id);
    if (res.ok) {
      setFeedback({
        type: "success",
        text: interpolate(a.msgSwitched, { name: acc.displayName }),
      });
    }
  };

  const handleConfirmPinSwitch = async (e) => {
    e.preventDefault();
    if (!pinPromptForId) return;
    const res = await switchLocalAccount(pinPromptForId, pinInput);
    if (res.ok) {
      setPinPromptForId(null);
      setPinInput("");
      setFeedback({
        type: "success",
        text: interpolate(a.msgUnlocked, { name: res.account.displayName }),
      });
    } else {
      setFeedback({
        type: "error",
        text: res.reason || a.errBadPin,
      });
    }
  };

  const handleTogglePolicy = (accountId, field, currentVal) => {
    const target = localAccounts.find((a) => a.id === accountId);
    if (!target) return;
    updateLocalAccount(accountId, {
      hitlPolicy: {
        ...target.hitlPolicy,
        [field]: !currentVal,
      },
    });
  };

  const tokenSavingsRate =
    aiUsageStats.totalTokensUsed + aiUsageStats.estimatedTokensSaved > 0
      ? Math.round(
          (aiUsageStats.estimatedTokensSaved /
            (aiUsageStats.totalTokensUsed + aiUsageStats.estimatedTokensSaved)) *
            100,
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {a.headerTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {interpolate(a.activeOpInfo, {
                name: activeOperator?.displayName || "",
                role: translateRole(activeOperator?.role),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === "accounts"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {interpolate(a.tabAccounts, { count: localAccounts.length })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("optimization")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === "optimization"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {a.tabOptimization}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === "logs"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {interpolate(a.tabLogs, { count: localHitlLogs.length })}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                feedback.type === "error"
                  ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-[11px] underline cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="space-y-6">
              {/* Postojeći nalozi */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {a.sectionTitle}
                </h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {localAccounts.map((acc) => {
                    const isActive = acc.id === activeOperator?.id;
                    return (
                      <div
                        key={acc.id}
                        className={`p-4 space-y-3 ${
                          isActive
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                            : "bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{acc.displayName}</span>
                              {acc.hasPin && (
                                <Lock
                                  className="w-3.5 h-3.5 text-slate-400"
                                  title={a.pinTitle}
                                />
                              )}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                              @{acc.username} · {translateRole(acc.role)} ·{" "}
                              {isActive ? a.activeStatus : a.inactiveStatus}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isActive ? (
                              <button
                                type="button"
                                onClick={() => handleSwitchAccount(acc)}
                                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                              >
                                {a.switchBtn}
                              </button>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-4 h-4" /> {a.activeCheck}
                              </span>
                            )}

                            {localAccounts.length > 1 &&
                              (confirmDeleteId === acc.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteLocalAccount(acc.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                                  >
                                    {a.confirmDel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                  >
                                    {a.cancelDel}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(acc.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                  title={a.deleteTitle}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* PIN Prompt za prebacivanje */}
                        {pinPromptForId === acc.id && (
                          <form
                            onSubmit={handleConfirmPinSwitch}
                            className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800"
                          >
                            <input
                              type="password"
                              value={pinInput}
                              onChange={(e) => setPinInput(e.target.value)}
                              placeholder={a.pinPromptPh}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer"
                            >
                              {a.unlockBtn}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPinPromptForId(null)}
                              className="px-2.5 py-1.5 text-slate-500 cursor-pointer"
                            >
                              {a.cancelDel}
                            </button>
                          </form>
                        )}

                        {/* HITL pravila po nalogu */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={acc.hitlPolicy?.requireExplicitApproval ?? true}
                              onChange={() =>
                                handleTogglePolicy(
                                  acc.id,
                                  "requireExplicitApproval",
                                  acc.hitlPolicy?.requireExplicitApproval ?? true,
                                )
                              }
                            />
                            <span>{a.policyRequireHitl}</span>
                          </label>
                          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={acc.hitlPolicy?.allowAiDocumentScan ?? true}
                              onChange={() =>
                                handleTogglePolicy(
                                  acc.id,
                                  "allowAiDocumentScan",
                                  acc.hitlPolicy?.allowAiDocumentScan ?? true,
                                )
                              }
                            />
                            <span>{a.policyAllowScan}</span>
                          </label>
                          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={acc.hitlPolicy?.allowAiConflictMonitor ?? true}
                              onChange={() =>
                                handleTogglePolicy(
                                  acc.id,
                                  "allowAiConflictMonitor",
                                  acc.hitlPolicy?.allowAiConflictMonitor ?? true,
                                )
                              }
                            />
                            <span>{a.policyAllowConflict}</span>
                          </label>
                          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={acc.hitlPolicy?.redactCompanyIdentity ?? true}
                              onChange={() =>
                                handleTogglePolicy(
                                  acc.id,
                                  "redactCompanyIdentity",
                                  acc.hitlPolicy?.redactCompanyIdentity ?? true,
                                )
                              }
                            />
                            <span>{a.policyRedact}</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kreiraj novi lokalni nalog */}
              <form
                onSubmit={handleCreateAccount}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  {a.createHeading}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      {a.displayNameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder={a.displayNamePh}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      {a.usernameLabel}
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={a.usernamePh}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      {a.roleLabel}
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    >
                      {OPERATOR_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {translateRole(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      {a.pinLabel}
                    </label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder={a.pinPh}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {a.localOnlyNote}
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                  >
                    {a.createBtn}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "optimization" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400">
                    {a.optLocalResolved}
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
                    {aiUsageStats.localResolvedCount + aiUsageStats.cacheHitCount}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400">
                    {a.optApiCalls}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                    {aiUsageStats.geminiCallsCount}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400">
                    {a.optTokensUsed}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                    {aiUsageStats.totalTokensUsed.toLocaleString(intlLocale)}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400">
                    {a.optSavedPct}
                  </div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-1">
                    {tokenSavingsRate}%
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  {a.optArchTitle}
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {(a.optBullets || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearLocalAiCache();
                      setFeedback({
                        type: "success",
                        text: a.msgCacheCleared,
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                  >
                    {a.clearCacheBtn}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  {a.zeroKnowledgeNote}
                </div>
              </div>

              {/* Server HITL Log */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    {interpolate(a.serverLogTitle, { count: serverTotalCount })}
                  </h4>
                  <button
                    type="button"
                    onClick={fetchServerHitlLogs}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`}
                    />
                    {a.refreshBtn}
                  </button>
                </div>

                {serverLogs.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 py-3">
                    {a.noServerLogs}
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                          <th className="py-2 px-3">{a.colTime}</th>
                          <th className="py-2 px-3">{a.colAccount}</th>
                          <th className="py-2 px-3">{a.colModule}</th>
                          <th className="py-2 px-3">{a.colDecision}</th>
                          <th className="py-2 px-3 text-right">{a.colTokens}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                        {serverLogs.slice(0, 20).map((log) => (
                          <tr key={log.logId}>
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(log.timestamp).toLocaleString(intlLocale)}
                            </td>
                            <td className="py-2 px-3 text-slate-900 dark:text-white font-sans">
                              @{log.accountUsername} ({translateRole(log.accountRole)})
                            </td>
                            <td className="py-2 px-3">{log.module}</td>
                            <td
                              className={`py-2 px-3 font-semibold ${
                                log.decision === "rejected"
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {log.decision}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {log.totalTokens}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Lokalni detaljni log na uređaju */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {interpolate(a.localLogTitle, { count: localHitlLogs.length })}
                </h4>
                {localHitlLogs.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400">
                    {a.noLocalLogs}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {localHitlLogs.slice(0, 10).map((item) => (
                      <div
                        key={item.localId}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.displayName} · {item.module} · {item.decision}
                          </div>
                          {item.localSummary && (
                            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                              {interpolate(a.localNotePrefix, { summary: item.localSummary })}
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {item.serverSyncStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>{a.footerWarning}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer"
          >
            {a.doneBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
