import { useState, useMemo, useEffect } from "react";
import { useShift } from "../context/ShiftContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Search, Handshake, AlertCircle } from "lucide-react";

export const OglasiDashboardView = () => {
  const { activeCompany } = useShift();
  const { t } = useLanguage();
  const [filterTip, setFilterTip] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [formNotice, setFormNotice] = useState("");
  const [oglasi, setOglasi] = useState([]);
  const [form, setForm] = useState({
    naslovPozicije: "",
    tipOglasa: "potraznja_radnika",
    detaljniUslovi: "",
    budzetSatnica: 500,
    valuta: "RSD",
    lokacijaRada: "",
    trajanjeAngazmana: "Project-based",
    posrednickaProvizija: "50 RSD/h",
    interneBeleskeAgencije: "",
    status: "otvoren",
  });

  const ucitajOglase = async () => {
    try {
      const res = await fetch("/api/posredovanje/oglasi");
      const data = await res.json();
      if (data.success) setOglasi(data.oglasi || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    ucitajOglase();
  }, []);

  const filtriraniLogovi = useMemo(() => {
    return oglasi.filter((o) => {
      if (filterTip !== "all" && o.tipOglasa !== filterTip) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.naslovPozicije.toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [oglasi, filterTip, searchQuery]);

  const handleLogNeed = async (e) => {
    e.preventDefault();
    setFormNotice("");
    if (!activeCompany) {
      setFormNotice(t.ui.oglasi.selectClientError);
      return;
    }

    const payload = {
      clientId: activeCompany.id,
      clientName: activeCompany.naziv,
      clientType: activeCompany.clientType || "company",
      tipOglasa: form.tipOglasa,
      naslovPozicije: form.naslovPozicije,
      detaljniUslovi: form.detaljniUslovi,
      budzetSatnica: Number(form.budzetSatnica),
      valuta: form.valuta,
      lokacijaRada: form.lokacijaRada,
      trajanjeAngazmana: form.trajanjeAngazmana,
      status: form.status,
      posrednickaProvizija: form.posrednickaProvizija,
      interneBeleskeAgencije: form.interneBeleskeAgencije,
      potencijalniMatchIds: [],
    };

    try {
      const res = await fetch("/api/posredovanje/kreiraj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setOglasi((prev) => [data.oglas, ...prev]);
        setIsOpenForm(false);
        setFormNotice("");
      } else {
        setFormNotice(t.ui.oglasi.saveError);
      }
    } catch (err) {
      console.error(err);
      setFormNotice(t.ui.oglasi.gatewayError);
    }
  };

  const handlePromeniStatus = async (id, noviStatus) => {
    try {
      const res = await fetch(`/api/posredovanje/status/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: noviStatus }),
      });
      if ((await res.json()).success) {
        setOglasi((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: noviStatus } : o)),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Handshake className="w-4 h-4 text-amber-500" />
            <span>{t.ui.oglasi.badge}</span>
          </div>
          <h2 className="text-xl font-black mt-0.5">{t.ui.oglasi.title}</h2>
          <p className="text-xs text-slate-300 mt-0.5">{t.ui.oglasi.subtitle}</p>
        </div>
        <button
          onClick={() => {
            setFormNotice("");
            setIsOpenForm(!isOpenForm);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
        >
          {isOpenForm ? t.ui.oglasi.closeForm : t.ui.oglasi.logRequirement}
        </button>
      </div>

      {formNotice && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formNotice}</span>
        </div>
      )}

      {isOpenForm && (
        <form
          onSubmit={handleLogNeed}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-indigo-600/30 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
        >
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-400 text-[10px] uppercase mb-1">
                {t.ui.oglasi.activeClientLabel}
              </label>
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-indigo-600 dark:text-indigo-400">
                {activeCompany ? activeCompany.naziv : t.ui.oglasi.noActiveClient}
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.ui.oglasi.positionTitle}
              </label>
              <input
                type="text"
                required
                placeholder={t.ui.oglasi.positionPlaceholder}
                value={form.naslovPozicije}
                onChange={(e) =>
                  setForm({ ...form, naslovPozicije: e.target.value })
                }
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.ui.oglasi.classificationLabel}
                </label>
                <select
                  value={form.tipOglasa}
                  onChange={(e) =>
                    setForm({ ...form, tipOglasa: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                >
                  <option value="potraznja_radnika">
                    {t.ui.oglasi.typeStaff}
                  </option>
                  <option value="potraznja_podizvodjaca">
                    {t.ui.oglasi.typeSubcontractor}
                  </option>
                  <option value="freelance_ponuda_posla">
                    {t.ui.oglasi.typeFreelance}
                  </option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.ui.oglasi.budgetLabel}
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={form.budzetSatnica}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        budzetSatnica: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <select
                    value={form.valuta}
                    onChange={(e) =>
                      setForm({ ...form, valuta: e.target.value })
                    }
                    className="p-2 border rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="RSD">RSD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  {t.ui.oglasi.commissionLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.ui.oglasi.commissionPlaceholder}
                  value={form.posrednickaProvizija}
                  onChange={(e) =>
                    setForm({ ...form, posrednickaProvizija: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 text-indigo-600 font-bold bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.ui.oglasi.locationLabel}
                </label>
                <input
                  type="text"
                  value={form.lokacijaRada}
                  onChange={(e) =>
                    setForm({ ...form, lokacijaRada: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-amber-600 mb-1">
                {t.ui.oglasi.notesLabel}
              </label>
              <textarea
                rows={2}
                placeholder={t.ui.oglasi.notesPlaceholder}
                value={form.interneBeleskeAgencije}
                onChange={(e) =>
                  setForm({ ...form, interneBeleskeAgencije: e.target.value })
                }
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/10 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.ui.oglasi.scopeLabel}
              </label>
              <input
                type="text"
                placeholder={t.ui.oglasi.scopePlaceholder}
                value={form.detaljniUslovi}
                onChange={(e) =>
                  setForm({ ...form, detaljniUslovi: e.target.value })
                }
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              {t.ui.oglasi.saveBtn}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.ui.oglasi.searchPlaceholder}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "all",
            "potraznja_radnika",
            "potraznja_podizvodjaca",
            "freelance_ponuda_posla",
          ].map((tip) => (
            <button
              key={tip}
              onClick={() => setFilterTip(tip)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${filterTip === tip ? "bg-indigo-600 text-white" : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
            >
              {tip === "all" && t.ui.oglasi.filterAll}
              {tip === "potraznja_radnika" && t.ui.oglasi.filterStaff}
              {tip === "potraznja_podizvodjaca" && t.ui.oglasi.filterSubcontractor}
              {tip === "freelance_ponuda_posla" && t.ui.oglasi.filterFreelance}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtriraniLogovi.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t.ui.oglasi.emptyTitle}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t.ui.oglasi.emptyBody}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtriraniLogovi.map((log) => (
            <div
              key={log.id}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {log.tipOglasa === "potraznja_radnika"
                      ? t.ui.oglasi.badgeStaff
                      : log.tipOglasa === "potraznja_podizvodjaca"
                        ? t.ui.oglasi.badgeSubcontractor
                        : t.ui.oglasi.badgeFreelance}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === "uspesno_spojen" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    {log.status === "otvoren"
                      ? t.ui.oglasi.statusOpen
                      : log.status === "u_pregovorima"
                        ? t.ui.oglasi.statusNegotiation
                        : t.ui.oglasi.statusPlaced}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {log.naslovPozicije}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  {t.ui.oglasi.clientPrefix}: {log.clientName}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {log.detaljniUslovi}
                </p>

                {log.interneBeleskeAgencije && (
                  <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                    {t.ui.oglasi.internalNotePrefix}: &ldquo;{log.interneBeleskeAgencije}&rdquo;
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[10px]">
                    {t.ui.oglasi.locationPrefix}: {log.lokacijaRada}
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 block text-[10px]">
                    {t.ui.oglasi.commissionPrefix}: {log.posrednickaProvizija}
                  </span>
                  <span className="text-slate-900 dark:text-white block font-mono">
                    {t.ui.oglasi.budgetPrefix}: {log.budzetSatnica} {log.valuta}{t.ui.common.perHour}
                  </span>
                </div>

                {log.status !== "uspesno_spojen" ? (
                  <button
                    onClick={() => handlePromeniStatus(log.id, "uspesno_spojen")}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    {t.ui.oglasi.markPlacedBtn}
                  </button>
                ) : (
                  <span className="text-emerald-600 font-bold text-xs">
                    {t.ui.oglasi.placedLabel}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
