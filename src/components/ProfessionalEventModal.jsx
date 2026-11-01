import { useState, useEffect } from "react";
import { useShift } from "../context/ShiftContext";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  Building,
  User,
  Tag,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
export const ProfessionalEventModal = ({
  isOpen,
  onClose,
  eventToEdit,
  defaultDate,
  defaultCategory = "meeting",
  defaultClientId,
}) => {
  const {
    companies,
    employees,
    addProfessionalEvent,
    updateProfessionalEvent,
    selectedDate,
  } = useShift();
  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [workerName, setWorkerName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(
    defaultDate ||
      selectedDate ||
      /* @__PURE__ */ new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");
  const [location, setLocation] = useState("Kancelarija agencije");
  const [priority, setPriority] = useState("normal");
  const [status, setStatus] = useState("scheduled");
  const [financialAmount, setFinancialAmount] = useState("");
  const [currency, setCurrency] = useState("RSD");
  const [complianceNote, setComplianceNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  useEffect(() => {
    if (eventToEdit) {
      setClientId(eventToEdit.clientId);
      setCategory(eventToEdit.category);
      setWorkerName(eventToEdit.workerName || "");
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || "");
      setDate(eventToEdit.date);
      setStartTime(eventToEdit.startTime || "10:00");
      setEndTime(eventToEdit.endTime || "11:30");
      setLocation(eventToEdit.location || "");
      setPriority(eventToEdit.priority);
      setStatus(eventToEdit.status);
      setFinancialAmount(
        eventToEdit.financialAmount !== void 0
          ? String(eventToEdit.financialAmount)
          : "",
      );
      setCurrency(eventToEdit.currency || "RSD");
      setComplianceNote(eventToEdit.complianceNote || "");
      setTagsInput(eventToEdit.tags?.join(", ") || "");
    } else {
      const initialClient = defaultClientId
        ? companies.find((c) => c.id === defaultClientId)
        : companies[0];
      setClientId(initialClient ? initialClient.id : companies[0]?.id || "");
      setCategory(defaultCategory);
      setWorkerName("");
      setTitle("");
      setDescription("");
      setDate(
        defaultDate ||
          selectedDate ||
          /* @__PURE__ */ new Date().toISOString().split("T")[0],
      );
      setStartTime("10:00");
      setEndTime("11:00");
      setLocation("Kancelarija agencije");
      setPriority("normal");
      setStatus("scheduled");
      setFinancialAmount("");
      setCurrency("RSD");
      setComplianceNote("");
      setTagsInput("");
    }
  }, [
    eventToEdit,
    isOpen,
    defaultDate,
    defaultCategory,
    defaultClientId,
    companies,
    selectedDate,
  ]);
  if (!isOpen) return null;
  const selectedClient = companies.find((c) => c.id === clientId);
  const clientWorkers = employees.filter((e) => e.companyId === clientId);
  const handleCategoryChange = (cat) => {
    setCategory(cat);
    if (cat === "medical_bzr" && !complianceNote) {
      setComplianceNote(
        "\u010Clan 62. Zakona o radu RS - Obavezan prethodni i periodi\u010Dni lekarski pregled za zaposlene na no\u0107nom radu (najmanje 3h u periodu 22:00-06:00).",
      );
      setPriority("urgent");
    } else if (cat === "tax_deadline" && !complianceNote) {
      setComplianceNote(
        "Zakon o poreskom postupku i poreskoj administraciji - Obaveza podno\u0161enja PPP-PD / PP PDV u zakonskom roku.",
      );
      setPriority("urgent");
    } else if (cat === "negotiation" && !complianceNote) {
      setComplianceNote(
        "Uskla\u0111ivanje sa Zakonom o radu i ugovorom o radu / autorskim ugovorom.",
      );
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const clientType = selectedClient?.clientType || "company";
    const clientName = selectedClient
      ? selectedClient.naziv
      : "Nepoznat klijent";
    const eventPayload = {
      clientId,
      clientName,
      clientType,
      workerName: workerName.trim() || void 0,
      title: title.trim(),
      description: description.trim() || void 0,
      category,
      date,
      startTime: startTime || void 0,
      endTime: endTime || void 0,
      location: location.trim() || void 0,
      priority,
      status,
      financialAmount: financialAmount ? parseFloat(financialAmount) : void 0,
      currency: currency || "RSD",
      complianceNote: complianceNote.trim() || void 0,
      tags: parsedTags.length > 0 ? parsedTags : void 0,
    };
    if (eventToEdit) {
      updateProfessionalEvent(eventToEdit.id, eventPayload);
    } else {
      addProfessionalEvent(eventPayload);
    }
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {eventToEdit
                  ? "Izmena Poslovne Obaveze / Doga\u0111aja"
                  : "Zaka\u017Ei Sastanak, Pregovore ili Poreski Rok"}
              </h3>
              <p className="text-xs text-indigo-200/80">
                Evidencija za klijente agencije: firme, radnike u turnusu i
                freelancere
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* 1. Client & Category Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-500" />
                Klijent Agencije (Preduzeće ili Freelancer) *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientType === "freelancer"
                      ? "\u{1F4BB} [Freelance] "
                      : "\u{1F3ED} [Firma] "}
                    {c.naziv}
                  </option>
                ))}
              </select>
              {selectedClient && (
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                  <span>
                    PIB:{" "}
                    <strong className="font-mono">{selectedClient.pib}</strong>
                  </span>
                  {selectedClient.poreskiModel && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
                      Model: {selectedClient.poreskiModel}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                Kategorija Obaveze / Događaja *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="meeting">
                  🤝 Poslovni sastanak (menadžment / klijent)
                </option>
                <option value="negotiation">
                  💼 Poslovni pregovori (ugovori, aneksi, satnice)
                </option>
                <option value="tax_deadline">
                  🏛️ Poreski rok (PPP-PD, PDV, PP OPO-K, APR)
                </option>
                <option value="medical_bzr">
                  🩺 Medicina rada & BZR (obavezni lekarski čl. 62)
                </option>
                <option value="inspection">
                  🔍 Inspekcijski nadzor (Rad, Porez)
                </option>
                <option value="freelance_consulting">
                  💻 Freelance konsultantski sati / ino-faktura
                </option>
                <option value="shift">🏭 Radna smena radnika</option>
                <option value="invoice_due">
                  💳 Dospeće plaćanja / honorara
                </option>
              </select>
            </div>
          </div>

          {/* 2. Title & Assigned Worker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Naziv Događaja / Predmet Obaveze *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="npr. Sastanak sa direktorom oko organizacije noćne smene"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Zaposleni / Kontakt osoba
              </label>
              {clientWorkers.length > 0 ? (
                <input
                  type="text"
                  list="client-workers-list"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="Izaberi ili upiši lice"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder={selectedClient?.kontaktOsoba || "Ime lica"}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <datalist id="client-workers-list">
                {selectedClient?.kontaktOsoba && (
                  <option value={selectedClient.kontaktOsoba} />
                )}
                {clientWorkers.map((w) => (
                  <option key={w.id} value={`${w.ime} (${w.pozicija})`} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 3. Date, Time & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                Datum *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Od
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Do
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Lokacija / Platforma
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="npr. Google Meet, Fabrika, ePorezi"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 4. Priority, Status & Financial Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Prioritet
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="normal">🟢 Redovan prioritet</option>
                <option value="high">🟡 Visok prioritet</option>
                <option value="urgent">🔴 Hitan zakonski rok</option>
                <option value="low">⚪ Nizak prioritet</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="scheduled">📅 Zakazano / U najavi</option>
                <option value="in_progress">⏳ U toku / U pripremi</option>
                <option value="completed">✅ Uspešno obavljeno</option>
                <option value="cancelled">❌ Otkazano / Odloženo</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Ugovoreni iznos / Honorar (opciono)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={financialAmount}
                  onChange={(e) => setFinancialAmount(e.target.value)}
                  placeholder="npr. 1850"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-20 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white outline-none"
                >
                  <option value="RSD">RSD</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. Statutory Compliance Note */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              Zakonska / Stručna Napomena (čl. 62 ZOR, poreski propisi, test
              samostalnosti)
            </label>
            <input
              type="text"
              value={complianceNote}
              onChange={(e) => setComplianceNote(e.target.value)}
              placeholder="npr. Član 62 Zakona o radu RS - obavezan lekarski pregled za radnike sa noćnim smenama"
              className="w-full px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl text-slate-800 dark:text-amber-200 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 6. Description & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Detaljan opis i dogovorene tačke
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Unesite dnevni red, zahteve, dogovorene rokove i zaključke..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Oznake (odvojene zarezom)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="sastanak, ugovor, nocni_rad"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition-colors cursor-pointer"
            >
              Odustani
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {eventToEdit ? "Sa\u010Duvaj Izmene" : "Zaka\u017Ei Obavezu"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
