import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Key,
  Building2,
  Calendar,
  Users,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";
const FEATURE_DETAILS = {
  ai_scanner: {
    label: "AI Skeniranje & OCR ugovora",
    desc: "Gemini OCR ekstrakcija radnih sati i klauzula ugovora",
  },
  conflict_monitor: {
    label: "Zakon o radu & Monitor odmora",
    desc: "Provera \u010Dl. 66 i 67 ZOR, 12h dnevni i 24h nedeljni odmor",
  },
  b2b_shift_management: {
    label: "Vi\u0161ekorisni\u010Dki raspored smena",
    desc: "Upravljanje vi\u0161e klijentskih firmi i profila radnika",
  },
  eporezi_xml: {
    label: "PPP-PD ePorezi XML Izvoz",
    desc: "Zvani\u010Dni XML format Poreske uprave Republike Srbije",
  },
};
export const B2BLicenseManagementModal = ({ onClose, onLicenseUpdated }) => {
  const [activeTab, setActiveTab] = useState("status");
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [inputKey, setInputKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [genNaziv, setGenNaziv] = useState(
    "Knjigovodstveni Biro Primer d.o.o.",
  );
  const [genPib, setGenPib] = useState("109876543");
  const [genMaksRadnika, setGenMaksRadnika] = useState(250);
  const [genDatumIsteka, setGenDatumIsteka] = useState(() => {
    const d = /* @__PURE__ */ new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [generatedKey, setGeneratedKey] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const fetchStatus = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/license/status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setErrorMsg("Neuspe\u0161no povezivanje sa lokalnim servisom licenci.");
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
      setErrorMsg(
        "Molimo unesite formatiran licencni klju\u010D ili promo kod.",
      );
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
        setSuccessMsg(
          data.message || "Licenca je uspe\u0161no autorizovana i aktivirana!",
        );
        setInputKey("");
        await fetchStatus();
        if (onLicenseUpdated) onLicenseUpdated();
      } else {
        setErrorMsg(data.error || "Aktivacija licence nije uspela.");
      }
    } catch (err) {
      setErrorMsg(
        "Gre\u0161ka pri komunikaciji sa serverom prilikom aktivacije.",
      );
    } finally {
      setIsActivating(false);
    }
  };
  const handleGenerateLicense = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setGeneratedKey(null);
    try {
      const res = await fetch("/api/license/admin-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nazivAgencije: genNaziv,
          pibAgencije: genPib,
          maksimalnoRadnika: Number(genMaksRadnika),
          datumIsteka: genDatumIsteka,
        }),
      });
      const data = await res.json();
      if (data.success && data.kljujcZaKlijenta) {
        setGeneratedKey(data.kljujcZaKlijenta);
        setSuccessMsg("Kriptovani B2B klju\u010D uspe\u0161no generisan!");
      } else {
        setErrorMsg(data.error || "Neuspe\u0161no generisanje licence.");
      }
    } catch (err) {
      setErrorMsg("Serverska gre\u0161ka prilikom generisanja licence.");
    } finally {
      setIsGenerating(false);
    }
  };
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const getPreostaloDana = () => {
    if (
      !status?.datumIsteka ||
      status.datumIsteka === "ISTEKLA" ||
      status.datumIsteka === "DEMO RE\u017DIM"
    )
      return 0;
    const exp = /* @__PURE__ */ new Date(status.datumIsteka + "T23:59:59");
    const now = /* @__PURE__ */ new Date();
    const diff = exp.getTime() - now.getTime();
    return Math.ceil(diff / (1e3 * 60 * 60 * 24));
  };
  const preostaloDana = getPreostaloDana();
  const isEnterprisePromo =
    status?.licenseId === "SPL-PROMO-2026-01" ||
    status?.tier?.includes("Enterprise");
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
              className={`p-2 rounded-xl ${status?.valid || status?.success ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}
            >
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                ShiftPulse Ledger Pro – Sistem Licenci
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {status?.licenseId ? "RSA-2048" : "AES-256-CBC"}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Kriptografska autentifikacija & Anti-Tampering zaštita
                sistemskog sata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("status")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${activeTab === "status" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Status licence ove stanice
          </button>

          <button
            onClick={() => setActiveTab("activate")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${activeTab === "activate" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <Key className="w-4 h-4" />
            Aktiviraj novi ključ / Promo
          </button>

          <button
            onClick={() => setActiveTab("generator")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${activeTab === "generator" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Master Admin Generator
          </button>
        </div>

        {/* Obaveštenja */}
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

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: STATUS LICENCE */}
          {activeTab === "status" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>
                    Provera kriptografskog potpisa i integriteta vremena...
                  </span>
                </div>
              ) : (
                <>
                  {/* UPOZORENJE NA MANIPULACIJU SISTEMSKIM SATOM */}
                  {status?.antiClockTampering &&
                    !status.antiClockTampering.isTimeValid && (
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-sm">
                              Sistemska greška: Detektovana manipulacija
                              vremenom!
                            </h4>
                            <p className="text-xs mt-1 leading-relaxed">
                              {status.antiClockTampering.reason ||
                                "Sistemski sat je pomeren unazad kako bi se zaobi\u0161ao rok va\u017Eenja licence. Pristup obra\u010Dunima je zaklju\u010Dan."}
                            </p>
                            <div className="text-[11px] font-mono mt-2 bg-rose-100 dark:bg-rose-900/60 p-2 rounded-lg">
                              Poslednje verifikovano vreme:{" "}
                              {status.antiClockTampering.lastRecorded ||
                                "Nepoznato"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* PROMO ENTERPRISE KARTICA - KADA JE U DEMO REŽIMU */}
                  {status?.isDemo && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-2 border-indigo-500/40 p-4 sm:p-5 text-white shadow-xl">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                              Zvanični promotivni period (3 meseca)
                            </span>
                            <h4 className="font-black text-base text-white">
                              Enterprise / Full Content Licenca
                            </h4>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-800/80 border border-indigo-600 text-xs font-mono text-indigo-200">
                          <span>ID:</span>
                          <span className="font-bold text-white">
                            SPL-PROMO-2026-01
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-indigo-200/90 leading-relaxed mb-3">
                        Iskoristite besplatan tromesečni promo paket za
                        ovlašćene knjigovođe sa punim pristupom svim Enterprise
                        modulima, bez ograničenja na broj radnika:
                      </p>

                      {/* Lista otključanih funkcija */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        {[
                          "ai_scanner",
                          "conflict_monitor",
                          "b2b_shift_management",
                          "eporezi_xml",
                        ].map((fKey) => {
                          const item = FEATURE_DETAILS[fKey];
                          return (
                            <div
                              key={fKey}
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-xs"
                            >
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-bold text-white text-[11px] truncate">
                                  {item?.label || fKey}
                                </div>
                                <div className="text-[10px] text-indigo-300 truncate">
                                  {item?.desc || ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-indigo-800/60">
                        <div className="text-[11px] text-indigo-300">
                          Period važenja:{" "}
                          <span className="font-bold text-white">
                            30.10.2026 – 30.01.2027
                          </span>
                        </div>
                        <button
                          onClick={() => handleActivateKey("SPL-PROMO-2026-01")}
                          disabled={isActivating}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isActivating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Aktivacija u toku...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>
                                Aktiviraj Enterprise Promo Licencu (1-Klik)
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border ${status?.valid || (status?.success && !status?.isDemo) ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {status?.valid ||
                        (status?.success && !status?.isDemo) ? (
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                            <Lock className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                              {status?.valid ||
                              (status?.success && !status?.isDemo)
                                ? "Licenca je aktivna i autorizovana"
                                : "Pokrenut je DEMO re\u017Eim softvera"}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${status?.valid || (status?.success && !status?.isDemo) ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"}`}
                            >
                              {status?.valid ||
                              (status?.success && !status?.isDemo)
                                ? "Autorizovano"
                                : "Demo re\u017Eim"}
                            </span>
                            {status?.licenseId && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                                {status.licenseId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {status?.poruka}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={fetchStatus}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Ponovo validiraj licencu"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* OTKLJUČANE FUNKCIJE KADA JE LICENCA AKTIVNA */}
                  {(status?.valid || (status?.success && !status?.isDemo)) &&
                    status?.features &&
                    status.features.length > 0 && (
                      <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30">
                        <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>
                            Aktivni moduli i otključane funkcije sistema:
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {status.features.map((feat) => {
                            const item = FEATURE_DETAILS[feat];
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

                  {/* Parametri licence */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Licencirani pravni subjekat</span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {status?.licenciraniPravniSubjekat || "\u2014"}
                      </div>
                      {status?.tier && (
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                          Paket: {status.tier}
                        </div>
                      )}
                      {status?.pibAgencije && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          PIB:{" "}
                          <span className="font-mono font-semibold">
                            {status.pibAgencije}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Važenje licence</span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{status?.datumIsteka || "\u2014"}</span>
                        {status?.valid && preostaloDana > 0 && (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${preostaloDana > 30 ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"}`}
                          >
                            Još {preostaloDana} dana
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {status?.issuedAt
                          ? `Izdato: ${status.issuedAt}`
                          : "Automatska provera pri svakom pokretanju servera"}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Maksimalan broj radnika pod ugovorom</span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {status?.maksimalnoRadnika
                          ? `${status.maksimalnoRadnika} radnika`
                          : "Neograni\u010Deno"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {status?.isDemo
                          ? "Ograni\u010Deno u demo re\u017Eimu (max 3 radnika)"
                          : "Zbir svih radnika klijentskih firmi"}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Lock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Kriptografska autentifikacija</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white font-mono truncate">
                        {status?.licenseId
                          ? "RSA-2048 Asimetri\u010Dna dekripcija"
                          : "AES-256-CBC + Scrypt (32B)"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Asimetrični javni ključ ugrađen u radnu stanicu
                      </div>
                    </div>
                  </div>

                  {/* KARTICA: ANTI-CLOCK TAMPERING ZAŠTITA */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>
                            Zaštita sistemskog sata (Anti-Clock Tampering)
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                            sys_metadata: Aktivno
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Poslednji zabeleženi timestamp:{" "}
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {status?.antiClockTampering?.lastRecorded ||
                              /* @__PURE__ */ new Date().toISOString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      Zaštita od vraćanja sistemskog sata unazad
                    </span>
                  </div>

                  <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Napomena za knjigovođu i administratora:
                    </p>
                    <p>
                      Licenca se može uneti trajnim upisom u fajl{" "}
                      <code className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        .env
                      </code>{" "}
                      promenljivom{" "}
                      <code className="font-mono">B2B_LICENSE_KEY</code> ili
                      uneti u tabu "Aktiviraj novi ključ / Promo".
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: AKTIVACIJA KLJUČA */}
          {activeTab === "activate" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600" />
                  Unos B2B licencnog ključa ili Promo koda
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Sistem podržava tri formata autorizacije: Zvanični 3-mesečni
                  promotivni kod, RSA-2048 Base64 asimetrični ključ, ili
                  AES-256-CBC simetrični ključ.
                </p>

                {/* Brzi promo kod selector */}
                <div className="mb-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-indigo-900 dark:text-indigo-200">
                    <span className="font-bold">
                      Zvanični promo kod (3 meseca Enterprise):
                    </span>
                    <span className="ml-2 font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-700">
                      SPL-PROMO-2026-01
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInputKey("SPL-PROMO-2026-01");
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shrink-0"
                  >
                    Umetni kod
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Licencni ključ ili kod:
                  </label>
                  <textarea
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Unesite SPL-PROMO-2026-01 ili nalepite RSA/AES ključ dobijen od autora softvera..."
                    rows={4}
                    className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Ključ se momentalno validira preko Node.js{" "}
                    <code className="font-mono">crypto</code> jezgra.
                  </span>
                  <button
                    onClick={() => handleActivateKey()}
                    disabled={isActivating || !inputKey.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isActivating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Validacija...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Aktiviraj licencu</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MASTER ADMIN GENERATOR */}
          {activeTab === "generator" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">
                    Master Generator licenci (Vlasnik softvera / Prodaja):
                  </span>
                  <p className="mt-0.5">
                    Ovaj alat koristi tvoj tajni ključ{" "}
                    <code className="font-mono font-semibold">
                      LEDGER_MASTER_SECRET
                    </code>{" "}
                    sa servera da zaključa podatke o klijentskoj agenciji.
                    Generisani ključ šalješ agenciji.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerateLicense} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Naziv knjigovodstvene agencije / firme:
                    </label>
                    <input
                      type="text"
                      required
                      value={genNaziv}
                      onChange={(e) => setGenNaziv(e.target.value)}
                      placeholder="npr. Agencija Saldo Pro d.o.o."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      PIB agencije (9 cifara):
                    </label>
                    <input
                      type="text"
                      required
                      value={genPib}
                      onChange={(e) => setGenPib(e.target.value)}
                      placeholder="npr. 108765432"
                      className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Maksimalno radnika pod nadzorom:
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={99999}
                      value={genMaksRadnika}
                      onChange={(e) =>
                        setGenMaksRadnika(Number(e.target.value))
                      }
                      className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Datum isteka licence (YYYY-MM-DD):
                    </label>
                    <input
                      type="date"
                      required
                      value={genDatumIsteka}
                      onChange={(e) => setGenDatumIsteka(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Kriptovanje u toku...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        <span>Generiši B2B licencni ključ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Prikaz generisanog ključa */}
              {generatedKey && (
                <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Kriptovani klijentski ključ spreman za slanje:
                    </span>
                    <button
                      onClick={() => copyToClipboard(generatedKey)}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? "Kopirano!" : "Kopiraj"}</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-all">
                    {generatedKey}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pošaljite ovaj tekst agenciji za unos u .env ili
                      aktivaciju.
                    </span>
                    <button
                      onClick={() => handleActivateKey(generatedKey)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aktiviraj odmah na ovom sistemu</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Kripto-jezgro: Node.js <code className="font-mono">crypto</code>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};
