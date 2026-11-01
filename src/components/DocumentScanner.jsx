import { useState } from "react";
import { useShift } from "../context/ShiftContext";
import { FileText, AlertTriangle, CheckCircle, Upload } from "lucide-react";
export const DocumentScanner = () => {
  const { addJobFromAi } = useShift();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [jobSaved, setJobSaved] = useState(false);
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setJobSaved(false);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(",")[1];
      try {
        const response = await fetch("/api/legal/analyze-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: base64String,
            mimeType: file.type,
          }),
        });
        const data = await response.json();
        if (data.success) {
          setAnalysisResult(data);
        } else {
          setError(data.error || "Do\u0161lo je do gre\u0161ke tokom analize.");
        }
      } catch (err) {
        setError("Server nedostupan. Proverite mre\u017Enu vezu.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const handleSaveAiJob = () => {
    if (!analysisResult) return;
    addJobFromAi(analysisResult);
    setJobSaved(true);
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Pametni AI Skener Dokumenata
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Slikajte ugovor o radu ili platnu listu. Naš AI će automatski izvući
          platna pravila i proveriti pravnu usklađenost.
        </p>
      </div>

      {/* Upload polje */}
      <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-950/40">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={loading}
        />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {loading
            ? "AI analizira dokument, sa\u010Dekajte..."
            : "Kliknite da izaberete ili uslikate dokument"}
        </div>
      </div>

      {/* Greška */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-mono">
          {error}
        </div>
      )}

      {/* Rezultati analize */}
      {analysisResult && (
        <div className="space-y-3 animate-fade-in text-xs font-mono">
          <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="w-4 h-4" />
                Uspešno izvučeni parametri posla
              </span>
              {!jobSaved ? (
                <button
                  type="button"
                  onClick={handleSaveAiJob}
                  className="px-3 py-1 bg-indigo-600 text-white font-sans font-bold rounded-lg text-[11px] shadow-xs active:scale-95 transition-transform"
                >
                  + Sačuvaj u kalendar
                </button>
              ) : (
                <span className="text-[11px] text-emerald-600 font-sans font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300">
                  Uspesno sačuvano!
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 pt-1 border-t border-emerald-200/40">
              <div>
                Poslodavac:{" "}
                <strong className="text-slate-900 dark:text-white">
                  {analysisResult.contractAnalysis.employerName}
                </strong>
              </div>
              <div>
                Pozicija:{" "}
                <strong className="text-slate-900 dark:text-white">
                  {analysisResult.contractAnalysis.detectedRole}
                </strong>
              </div>
              <div>
                Satnica:{" "}
                <strong className="text-slate-900 dark:text-white">
                  {analysisResult.contractAnalysis.baseHourlyRate}{" "}
                  {analysisResult.contractAnalysis.currency}/h
                </strong>
              </div>
              <div>
                Noćni rad:{" "}
                <strong className="text-indigo-500">
                  +{analysisResult.extractedRules.nightDiffValue}%
                </strong>
              </div>
            </div>
          </div>

          {/* Pravna upozorenja */}
          {analysisResult.legalComplianceAlerts &&
            analysisResult.legalComplianceAlerts.length > 0 && (
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  Revizija ugovora i pravna svest
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 font-sans">
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
