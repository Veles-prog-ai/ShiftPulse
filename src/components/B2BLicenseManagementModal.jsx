import { useState, useEffect } from "react";
import { useLanguage, interpolate } from "../i18n/LanguageContext";
import {
  ShieldCheck,
  Key,
  Building2,
  Calendar,
  Users,
  Check,
  RefreshCw,
  Lock,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";

export const B2BLicenseManagementModal = ({ onClose, onLicenseUpdated }) => {
  const { t } = useLanguage();
  const s = t.ui.licenseModalFull;
  const [activeTab, setActiveTab] = useState("status");
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [inputKey, setInputKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/license/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setErrorMsg(s.errReachService);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleActivateKey = async (keyToActivate) => {
    const key = (keyToActivate || inputKey).trim();
    if (!key) {
      setErrorMsg(s.errEmptyKey);
      return;
    }
    setIsActivating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kljucLicence: key }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || s.okActivated);
        setInputKey("");
        await fetchStatus();
        if (onLicenseUpdated) onLicenseUpdated();
      } else {
        setErrorMsg(data.error || s.errActivate);
      }
    } catch {
      setErrorMsg(s.errServer);
    } finally {
      setIsActivating(false);
    }
  };

  const getRemainingDays = () => {
    if (
      !status?.datumIsteka ||
      status.datumIsteka === "EXPIRED" ||
      status.datumIsteka === "UNLICENSED" ||
      status.datumIsteka === "ISTEKLA" ||
      status.datumIsteka === "TRIAL"
    )
      return 0;
    const exp = new Date(status.datumIsteka + "T23:59:59");
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const remainingDays = getRemainingDays();
  const isLicensed = Boolean(status?.valid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${isLicensed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}
            >
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                {s.headerTitle}
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {status?.licenseId ? "RSA-2048" : "AES-256-CBC"}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {s.headerSub}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("status")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer ${activeTab === "status" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{s.tabStatus}</span>
          </button>

          <button
            onClick={() => setActiveTab("activate")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer ${activeTab === "activate" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <Key className="w-4 h-4" />
            <span>{s.tabActivate}</span>
          </button>
        </div>

        {/* Notices */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === "status" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>{s.loadingText}</span>
                </div>
              ) : (
                <>
                  {status?.antiClockTampering &&
                    !status.antiClockTampering.isTimeValid && (
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-sm">
                              {s.clockViolationTitle}
                            </h4>
                            <p className="text-xs mt-1 leading-relaxed">
                              {status.antiClockTampering.reason || s.clockViolationDefault}
                            </p>
                            <div className="text-[11px] font-mono mt-2 bg-rose-100 dark:bg-rose-900/60 p-2 rounded-lg">
                              {s.lastVerifiedLabel} {status.antiClockTampering.lastRecorded || s.unknown}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Status Card */}
                  <div
                    className={`p-4 rounded-xl border ${isLicensed ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl text-white flex items-center justify-center ${
                            isLicensed ? "bg-emerald-600" : "bg-amber-600"
                          }`}
                        >
                          {isLicensed ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                              {isLicensed ? s.statusActiveTitle : s.statusTrialTitle}
                            </h4>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {status?.licenseId || s.unlicensedTag}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            {status?.poruka}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={fetchStatus}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title={s.reverifyTitle}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Active Features */}
                  {isLicensed && status?.features?.length > 0 && (
                    <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30">
                      <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{s.unlockedTitle}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {status.features.map((feat) => {
                          const item = s.features?.[feat];
                          return (
                            <div
                              key={feat}
                              className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                            >
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                                  {item?.label || feat}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {item?.desc || ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* License Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{s.entityTitle}</span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {status?.licenciraniPravniSubjekat || "—"}
                      </div>
                      {status?.tier && (
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                          {interpolate(s.tierPrefix, { tier: status.tier })}
                        </div>
                      )}
                      {status?.pibAgencije && (
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {interpolate(s.pibPrefix, { pib: status.pibAgencije })}
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{s.expTitle}</span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between font-mono tabular-nums">
                        <span>{status?.datumIsteka || "—"}</span>
                        {isLicensed && remainingDays > 0 && (
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {interpolate(s.daysLeft, { days: remainingDays })}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {status?.issuedAt
                          ? interpolate(s.issuedPrefix, { date: status.issuedAt })
                          : s.autoVerified}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{s.capacityTitle}</span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white font-mono tabular-nums">
                        {status?.maksimalnoRadnika
                          ? interpolate(s.workersCount, { count: status.maksimalnoRadnika })
                          : s.unlimited}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {!isLicensed ? s.trialLimit : s.aggregateLimit}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Lock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{s.cryptoTitle}</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white font-mono truncate">
                        {status?.licenseId ? s.rsaToken : s.aesToken}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {s.pinnedNote}
                      </div>
                    </div>
                  </div>

                  {/* Anti-Clock Tampering */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {s.antiClockTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {s.lastClockPrefix}{" "}
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {status?.antiClockTampering?.lastRecorded || new Date().toISOString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {s.adminNoteTitle}
                    </p>
                    <p>
                      {s.adminNoteBody} (<code className="font-mono">B2B_LICENSE_KEY</code>)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "activate" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span>{s.enterKeyTitle}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {s.enterKeyDesc}
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {s.payloadLabel}
                  </label>
                  <textarea
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder={s.payloadPh}
                    rows={4}
                    className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {s.instantNote}
                  </span>
                  <button
                    onClick={() => handleActivateKey()}
                    disabled={isActivating || !inputKey.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isActivating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{s.validatingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{s.activateBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            {s.cryptoFooter} <code className="font-mono">crypto</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
