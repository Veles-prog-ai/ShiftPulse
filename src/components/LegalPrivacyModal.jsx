import { useState } from "react";
import {
  X,
  ShieldCheck,
  FileText,
  Scale,
  Check,
  Copy,
  Download,
  Lock,
  Building,
  Cpu,
  AlertTriangle,
  BadgeCheck,
  Printer,
} from "lucide-react";
export const LegalPrivacyModal = ({ onClose, initialTab = "privacy" }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const getDocumentMarkdown = (tab) => {
    switch (tab) {
      case "privacy":
        return `# POLITIKA PRIVATNOSTI I ZA\u0160TITA PODATAKA O LI\u010CNOSTI (ZZPL / GDPR)
Aplikacija: ShiftPulse Ledger Pro

## 1. Op\u0161te odredbe
Ova Politika privatnosti ure\u0111uje na\u010Din na koji ShiftPulse Ledger Pro prikuplja, koristi, odr\u017Eava i obra\u0111uje podatke o li\u010Dnosti korisnika i zaposlenih u skladu sa Zakonom o za\u0161titi podataka o li\u010Dnosti Republike Srbije ("Sl. glasnik RS", br. 87/2018) i Op\u0161tom uredbom o za\u0161titi podataka EU (GDPR).

## 2. Podaci koji se obra\u0111uju
Aplikacija obra\u0111uje slede\u0107e kategorije podataka:
- Podaci o zaposlenima: Ime, prezime, JMBG, adresa, teku\u0107i ra\u010Dun, koeficijent obra\u010Duna, radno vreme, smene, no\u0107ni rad, bolovanja i odsustva.
- Ugovori i dokumenta: Slike/PDF dokumenti ugovora o radu i re\u0161enja o godi\u0161njim odmorima koji se obra\u0111uju putem AI skenera (Gemini Multimodal API).

## 3. Svrha obrade i pravni osnov
Obrada se vr\u0161i isklju\u010Divo u svrhu:
- Obra\u010Duna zarada i naknada zarada u skladu sa \u010Clanom 108. Zakona o radu RS.
- Generisanja poreskih prijava PPP-PD za Poresku upravu Republike Srbije.
- Vo\u0111enja evidencije o radnom vremenu i smenskom radu.

## 4. AI Obrada dokumenata (Gemini API)
- Slike ugovora i dokumenata koje se u\u010Ditavaju radi automatskog izvla\u010Denja teksta obra\u0111uju se u realnom vremenu.
- Podaci iz slika se ne koriste za obuku javnih AI modela niti se trajno zadr\u017Eavaju na eksternim serverima van granica dozvoljenih zakonom.

## 5. Prava lica na koje se podaci odnose
U skladu sa ZZPL-om, svako lice ima pravo na:
- Pristup svojim podacima
- Ispravku i dopunu podataka
- Brisanje podataka ("pravo na zaborav")
- Ograni\u010Denje obrade i prenosivost podataka.`;
      case "terms":
        return `# USLOVI KORI\u0160\u0106ENJA (TERMS OF SERVICE)
Aplikacija: ShiftPulse Ledger Pro (B2B SaaS)

## 1. Prihvatanje uslova
Kori\u0161\u0107enjem platforme ShiftPulse Ledger Pro prihvatate ove Uslove kori\u0161\u0107enja. Platforma je namenjena isklju\u010Divo pravnim licima i preduzetnicima za potrebe knjigovodstva i evidencije radnog vremena.

## 2. Odgovornost za ta\u010Dnost podataka i AI predloge
- Aplikacija koristi AI algoritme za analizu ugovora i predlog obra\u010Duna zarada.
- Korisnik (knjigovo\u0111a/poslodavac) je du\u017Ean da pre kona\u010Dnog podno\u0161enja PPP-PD prijave Poreskoj upravi proveri i potvrdi sve automatski izra\u010Dunate iznose.
- ShiftPulse Ledger Pro ne snosi odgovornost za pogre\u0161no podnete poreske prijave proiza\u0161le iz neproveravanja AI predloga.

## 3. Licenciranje i pristup
Pristup sistemu se ostvaruje putem kriptografski generisanog licencnog klju\u010Da koji je vezan za PIB i mati\u010Dni broj preduze\u0107a. Zabranjeno je deljenje licencnih klju\u010Deva sa tre\u0107im neovla\u0161\u0107enim licima.`;
      case "compliance":
        return `# PRAVNI VODI\u010C I ZAKONSKA USKLA\u0110ENOST (REPUBLIKA SRBIJA)
Aplikacija: ShiftPulse Ledger Pro

## 1. Zakon o radu RS (Klju\u010Dne odredbe za obra\u010Dun)
- \u010Clan 108. - Uve\u0107ana zarada:
  - Rad na dan praznika koji je neradni dan: najmanje 110% od osnovice.
  - Rad no\u0107u (od 22:00 do 06:00h): najmanje 26% od osnovice (ako takav rad nije vrednovan pri utvr\u0111ivanju osnovne zarade).
  - Prekovremeni rad: najmanje 26% od osnovice.

## 2. Poreska uprava i PPP-PD XML \u0161ema
- Obra\u010Dunski modul uskla\u0111en je sa va\u017Ee\u0107im stopama doprinosa i poreza na zarade u RS.
- Generisana XML datoteka direktno odgovara tehni\u010Dkim specifikacijama portala ePorezi.

## 3. Evidencija no\u0107nog rada
- Prema \u010Dl. 62 Zakona o radu, poslodavac je du\u017Ean da obezbedi posebnu za\u0161titu i evidenciju za zaposlene koji rade no\u0107u.`;
    }
  };
  const copyCurrentDoc = () => {
    const text = getDocumentMarkdown(activeTab);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const downloadCurrentDoc = () => {
    const text = getDocumentMarkdown(activeTab);
    const filenames = {
      privacy: "POLITIKA_PRIVATNOSTI_GDPR_ZZPL.md",
      terms: "TERMS_OF_SERVICE_USLOVI_KORISCENJA.md",
      compliance: "ZAKONSKA_USKLADJENOST_PRAVNI_VODIC.md",
    };
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenames[activeTab];
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Pravni Centar & Usklađenost
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Zakon o radu RS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ShiftPulse Ledger Pro • ZZPL & GDPR • Uslovi korišćenja •
                Poreska uprava ePorezi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-4 sm:px-5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 p-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === "privacy" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"}`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Politika privatnosti (ZZPL / GDPR)</span>
          </button>

          <button
            onClick={() => setActiveTab("terms")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === "terms" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"}`}
          >
            <FileText className="w-4 h-4" />
            <span>Uslovi korišćenja (B2B SaaS)</span>
          </button>

          <button
            onClick={() => setActiveTab("compliance")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === "compliance" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"}`}
          >
            <Scale className="w-4 h-4" />
            <span>Zakonska usklađenost (ZOR RS)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: POLITIKA PRIVATNOSTI */}
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    1. Opšte odredbe i pravni okvir
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Ova Politika privatnosti uređuje način na koji{" "}
                    <strong>ShiftPulse Ledger Pro</strong> prikuplja, koristi,
                    održava i obrađuje podatke o ličnosti korisnika i zaposlenih
                    u skladu sa{" "}
                    <strong>
                      Zakonom o zaštiti podataka o ličnosti Republike Srbije
                      ("Sl. glasnik RS", br. 87/2018)
                    </strong>{" "}
                    i{" "}
                    <strong>
                      Opštom uredbom o zaštiti podataka Evropske unije (GDPR)
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  2. Podaci koji se obrađuju
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block mb-1">
                      Podaci o zaposlenima:
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Ime, prezime, JMBG, adresa, tekući račun, koeficijent
                      obračuna, radno vreme, smene, noćni rad, bolovanja i
                      odsustva.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block mb-1">
                      Ugovori i dokumenta:
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Slike/PDF dokumenti ugovora o radu i rešenja o godišnjim
                      odmorima koji se obrađuju putem AI skenera (Gemini
                      Multimodal API).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  3. Svrha obrade i pravni osnov
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Obrada se vrši isključivo u sledeće svrhe:
                </p>
                <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 pl-1">
                  <li>
                    Obračun zarada i naknada zarada u skladu sa{" "}
                    <strong>Članom 108. Zakona o radu RS</strong>.
                  </li>
                  <li>
                    Generisanje poreskih prijava <strong>PPP-PD</strong> za
                    Poresku upravu Republike Srbije.
                  </li>
                  <li>
                    Vođenje evidencije o radnom vremenu, smenskom i noćnom radu.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  4. AI Obrada dokumenata (Gemini Multimodal API)
                </h4>
                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                  <li>
                    Slike ugovora i dokumenata koje se učitavaju radi
                    automatskog izvlačenja teksta obrađuju se u realnom vremenu.
                  </li>
                  <li>
                    <strong>
                      Podaci iz slika se ne koriste za obuku javnih AI modela
                    </strong>{" "}
                    niti se trajno zadržavaju na eksternim serverima van granica
                    dozvoljenih zakonom.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  5. Prava lica na koje se podaci odnose (ZZPL čl. 21-30)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Pristup
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Uvid u evidenciju
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Ispravka
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ažuriranje podataka
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Brisanje
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Pravo na zaborav
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Prenosivost
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Izvoz u XML/JSON
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USLOVI KORIŠĆENJA */}
          {activeTab === "terms" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    1. Prihvatanje uslova (B2B SaaS)
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Korišćenjem platforme <strong>ShiftPulse Ledger Pro</strong>{" "}
                    prihvatate ove Uslove korišćenja. Platforma je namenjena{" "}
                    <strong>isključivo pravnim licima i preduzetnicima</strong>{" "}
                    za potrebe knjigovodstva, obračuna zarada i evidencije
                    smenskog radnog vremena.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/70 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                    2. Odgovornost za tačnost podataka i AI predloge
                  </h4>
                  <ul className="list-disc list-inside mt-2 text-xs text-amber-900 dark:text-amber-300 space-y-1.5 pl-1 leading-relaxed">
                    <li>
                      Aplikacija koristi AI algoritme za analizu ugovora i
                      predlog obračuna zarada.
                    </li>
                    <li>
                      <strong>
                        Korisnik (knjigovođa/poslodavac) je dužan da pre
                        konačnog podnošenja PPP-PD prijave Poreskoj upravi
                        proveri i potvrdi sve automatski izračunate iznose.
                      </strong>
                    </li>
                    <li>
                      ShiftPulse Ledger Pro ne snosi odgovornost za pogrešno
                      podnete poreske prijave proizašle iz neproveravanja AI
                      predloga.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    3. Licenciranje i pristup
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Pristup sistemu se ostvaruje putem{" "}
                    <strong>kriptografski generisanog licencnog ključa</strong>{" "}
                    koji je vezan za PIB i matični broj preduzeća. Zabranjeno je
                    deljenje licencnih ključeva sa trećim neovlašćenim licima.
                    Svaka stanica verifikuje potpis preko AES-256 algoritma pre
                    izvršenja računovodstvenih obračuna.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ZAKONSKA USKLAĐENOST */}
          {activeTab === "compliance" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    1. Zakon o radu Republike Srbije (ZOR) - Ključne odredbe za
                    obračun
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Svi obračunski moduli sistema primenjuju propisane procente
                    uvećane zarade prema{" "}
                    <strong>Članu 108. Zakona o radu RS</strong>:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Rad na praznik (Neradni dan)
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    min. +110%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Najmanje 110% od osnovice za rad na dan državnog ili verskog
                    praznika.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Rad noću (22:00 – 06:00h)
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    min. +26%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Najmanje 26% od osnovice (ako rad nije vrednovan pri
                    utvrđivanju osnovne plate).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Prekovremeni rad
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    min. +26%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Najmanje 26% od osnovice za časove rada duže od punog radnog
                    vremena (40h nedeljno).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  2. Poreska uprava i PPP-PD XML šema
                </h4>
                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-1">
                  <li>
                    Obračunski modul je usklađen sa važećim stopama doprinosa
                    (PIO 14%+10%, Zdravstvo 5.15%+5.15%, Nezaposlenost 0.75%) i
                    poreza na zarade (10% uz zakonski neoporezivi iznos).
                  </li>
                  <li>
                    Generisana XML datoteka direktno odgovara tehničkim
                    specifikacijama i validacionoj XSD šemi zvaničnog portala{" "}
                    <strong>ePorezi Poreske uprave Republike Srbije</strong>.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    3. Evidencija noćnog rada (Član 62. Zakona o radu)
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Prema članu 62. Zakona o radu, poslodavac je dužan da
                    obezbedi posebnu zaštitu i kontinuiranu evidenciju za
                    zaposlene koji rade noću. Sistem u matrici kalendara
                    automatski prepoznaje treću smenu (III) i noćni turnus (N),
                    kalkuliše sate i obezbeđuje uvid za inspekciju rada.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={copyCurrentDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Kopirano!" : "Kopiraj tekst"}</span>
            </button>

            <button
              onClick={downloadCurrentDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Preuzmi (.md)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Štampaj</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 hidden md:inline">
              Dokumenti su uvek dostupni u korenu projekta
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
            >
              Zatvori
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
