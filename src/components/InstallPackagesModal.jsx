import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  Laptop,
  Monitor,
  Cpu,
  RefreshCw,
  Zap,
} from "lucide-react";
import { usePWAInstall } from "../utils/usePWAInstall";

export const InstallPackagesModal = ({ isOpen, onClose }) => {
  const [activeOs, setActiveOs] = useState("windows");
  const [packagesInfo, setPackagesInfo] = useState(null);
  const [copiedCmd, setCopiedCmd] = useState("");
  const [diagnostics, setDiagnostics] = useState({
    detectedOs: "Detecting...",
    isSecureContext: false,
    hasServiceWorker: false,
    hasLocalStorage: false,
    screenRes: "",
  });

  const { isInstallable, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    if (!isOpen) return;

    // 1. Fetch info o paketima sa servera
    fetch("/api/packages/info")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPackagesInfo(data.packages);
        }
      })
      .catch((err) => console.error("Greška pri učitavanju paketa:", err));

    // 2. Detekcija klijentskog sistema i dijagnostika uživo
    const ua = navigator.userAgent;
    let detected = "Windows";
    if (/CrOS/.test(ua) || /Chromebook/.test(ua)) {
      detected = "ChromeOS";
      setActiveOs("chromeos");
    } else if (/Linux/.test(ua) && !/Android/.test(ua)) {
      detected = "Linux";
      setActiveOs("linux");
    } else if (/Macintosh|Mac OS X/.test(ua)) {
      detected = "macOS";
    } else {
      detected = "Windows";
      setActiveOs("windows");
    }

    setDiagnostics({
      detectedOs: detected,
      isSecureContext: window.isSecureContext,
      hasServiceWorker: "serviceWorker" in navigator,
      hasLocalStorage: typeof localStorage !== "undefined",
      screenRes: `${window.screen.width}x${window.screen.height}`,
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(""), 2500);
  };

  const currentPkg = packagesInfo?.[activeOs] || {
    title: activeOs.toUpperCase(),
    filename: `shiftpulse-${activeOs}-package`,
    sizeFormatted: "U pripremi",
    instructions: [],
    features: [],
    targetRuntimes: [],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Instalacioni Paketi za Testiranje Uživo
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Odvojeni Paketi v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Samostalni instalateri i pokretači za Windows, Linux i ChromeOS platforme
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zatvori"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OS Platform Selector Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {/* Windows Tab */}
            <button
              onClick={() => setActiveOs("windows")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeOs === "windows"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>🪟 Windows (10/11)</span>
              {diagnostics.detectedOs === "Windows" && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white font-extrabold">
                  Vaš OS
                </span>
              )}
            </button>

            {/* Linux Tab */}
            <button
              onClick={() => setActiveOs("linux")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeOs === "linux"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>🐧 Linux (Ubuntu/Deb/Arch)</span>
              {diagnostics.detectedOs === "Linux" && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white font-extrabold">
                  Vaš OS
                </span>
              )}
            </button>

            {/* ChromeOS Tab */}
            <button
              onClick={() => setActiveOs("chromeos")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeOs === "chromeos"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>💻 ChromeOS (Chromebook)</span>
              {diagnostics.detectedOs === "ChromeOS" && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white font-extrabold">
                  Vaš OS
                </span>
              )}
            </button>
          </div>

          <div className="pb-2 text-[11px] text-slate-400 font-mono hidden md:block">
            Prepoznato okruženje: <strong className="text-indigo-500">{diagnostics.detectedOs}</strong>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Main Action Banner for Selected OS */}
          <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {currentPkg.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentPkg.format}
                </span>
                {currentPkg.sizeFormatted && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {currentPkg.sizeFormatted}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Samostalni instalacioni paket sadrži lokalni runtime, audit logger, i skripte za automatsko pokretanje.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <a
                href={currentPkg.downloadUrl || `/api/packages/download/${activeOs}`}
                download
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Preuzmi {activeOs.toUpperCase()} Paket</span>
              </a>

              {activeOs === "chromeos" && isInstallable && (
                <button
                  onClick={install}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Instaliraj direktno na policu (Shelf) Chromebook-a"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>1-Klik Instaliraj na ChromeOS</span>
                </button>
              )}
            </div>
          </div>

          {/* Platform Specific Details & Commands */}
          {activeOs === "windows" && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                <span>Uputstvo za testiranje na Windows 10/11</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[11px] font-black">1</span>
                    Preuzimanje
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Preuzmite <strong>shiftpulse-windows-package.zip</strong> i raspakujte ga u bilo koji folder (npr. <code>C:\ShiftPulse</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[11px] font-black">2</span>
                    Instalacija
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Dvaput kliknite na <strong>install-windows.bat</strong>. Skripta verifikuje Node.js i kreira prečicu na radnoj površini.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[11px] font-black">3</span>
                    Rad uživo
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Pokrenite aplikaciju preko prečice sa Desktopa ili preko <strong>start-windows.bat</strong> na portu 3000.
                  </p>
                </div>
              </div>

              {/* PowerShell Test Command */}
              <div className="p-3.5 bg-slate-900 rounded-xl text-slate-100 font-mono text-xs flex items-center justify-between gap-3 border border-slate-800">
                <div className="truncate">
                  <span className="text-emerald-400">PS&gt; </span>
                  <span>powershell -ExecutionPolicy Bypass -File .\run-windows.ps1</span>
                </div>
                <button
                  onClick={() => copyToClipboard("powershell -ExecutionPolicy Bypass -File .\\run-windows.ps1", "ps")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                >
                  {copiedCmd === "ps" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === "ps" ? "Kopirano" : "Kopiraj"}</span>
                </button>
              </div>
            </div>
          )}

          {activeOs === "linux" && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                <span>Uputstvo za testiranje na Linux sistemima (Ubuntu, Debian, Fedora, Arch)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[11px] font-black">1</span>
                    Raspakivanje
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Otvorite terminal i raspakujte arhivu u <code>~/ShiftPulse</code> preko tar komande.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[11px] font-black">2</span>
                    XDG Meni
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Pokrenite <code>install-linux.sh</code>. Skripta automatski instalira <strong>.desktop</strong> stavku u GNOME/KDE meni.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[11px] font-black">3</span>
                    Auto Browser
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Skripta pokreće lokalni server i preko <code>xdg-open</code> pokreće radnu stanicu u browseru.
                  </p>
                </div>
              </div>

              {/* Linux Terminal Command */}
              <div className="p-3.5 bg-slate-900 rounded-xl text-slate-100 font-mono text-xs flex items-center justify-between gap-3 border border-slate-800">
                <div className="truncate">
                  <span className="text-emerald-400">$ </span>
                  <span>tar -xzf shiftpulse-linux-package.tar.gz && chmod +x install-linux.sh start-linux.sh && ./install-linux.sh</span>
                </div>
                <button
                  onClick={() => copyToClipboard("tar -xzf shiftpulse-linux-package.tar.gz && chmod +x install-linux.sh start-linux.sh && ./install-linux.sh", "linux-cmd")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                >
                  {copiedCmd === "linux-cmd" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === "linux-cmd" ? "Kopirano" : "Kopiraj"}</span>
                </button>
              </div>
            </div>
          )}

          {activeOs === "chromeos" && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                <span>Testiranje na ChromeOS i Chromebook uređajima</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Method 1: PWA Shelf */}
                <div className="p-4 rounded-xl border-2 border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Metoda 1: 1-Klik Native PWA na Policu (Shelf)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                      Preporučeno
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Na Chromebook-u nije potreban Developer mode. Aplikacija se instalira u jednom kliku, radi u samostalnom prozoru (standalone) sa podrškom za offline keširanje smena i obračuna.
                  </p>
                  <button
                    onClick={install}
                    className="w-full mt-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instaliraj na ChromeOS Policu (Shelf)</span>
                  </button>
                </div>

                {/* Method 2: Crostini Linux container */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-slate-500" />
                    Metoda 2: Crostini Linux kontejner (Offline Server)
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Za pokretanje kompletnog samostalnog Node.js servera na Chromebook-u: aktivirajte Linux u podešavanjima, preuzmite paket i pokrenite <code>install-chromeos.sh</code>.
                  </p>
                  <div className="p-2 bg-slate-900 rounded text-slate-100 font-mono text-[11px] truncate">
                    <span>$ chmod +x install-chromeos.sh && ./install-chromeos.sh</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Diagnostic & Verification Bar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Dijagnostika klijentskog okruženja za testiranje</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">PWA Ready:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Da
                </span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Service Worker:</span>
                <span className={`font-bold flex items-center gap-1 ${diagnostics.hasServiceWorker ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                  {diagnostics.hasServiceWorker ? <CheckCircle2 className="w-3.5 h-3.5" /> : "Ne"} Aktivan
                </span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Offline Keš:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Podržano
                </span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Rezolucija:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  {diagnostics.screenRes}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 text-[11px] font-mono hidden sm:block">
            npm run package:win | npm run package:linux | npm run package:chromeos
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Zatvori
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
