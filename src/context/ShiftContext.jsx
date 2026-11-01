import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { INITIAL_JOBS, INITIAL_SHIFTS } from "../data/mockData";
import { calculateSerbianWorkerPayroll } from "../utils/payrollCalculator";
const JOBS_STORAGE_KEY = "shiftpulse_jobs_v1";
const SHIFTS_STORAGE_KEY = "shiftpulse_shifts_v1";
const DARK_MODE_STORAGE_KEY = "shiftpulse_dark_mode_v1";
const CLOCK_STORAGE_KEY = "shiftpulse_active_clock_v1";
const COMPANIES_STORAGE_KEY = "shiftpulse_ledger_companies_v1";
const EMPLOYEES_STORAGE_KEY = "shiftpulse_ledger_employees_v1";
const EVENTS_STORAGE_KEY = "shiftpulse_professional_events_v2";
const LEAVES_STORAGE_KEY = "shiftpulse_leaves_v1";
const ShiftContext = createContext(void 0);
const getRelativeDate = (offsetDays) => {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};
const getFixedDayCurrentMonth = (day) => {
  const d = /* @__PURE__ */ new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const maxDays = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, maxDays);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
};
const DEFAULT_COMPANIES = [
  {
    id: "firma-1",
    pib: "102345678",
    maticniBroj: "08543210",
    naziv: "TehnoProizvodnja d.o.o. Beograd",
    adresa: "Beogradska 12, 11000 Beograd",
    opstina_kod: "011",
    radniciBroj: 4,
    iban: "RS351600000001234567",
    delatnost: "2562 - Ma\u0161inska obrada metala",
    kontaktEmail: "racunovodstvo@tehnoproizvodnja.rs",
    clientType: "company",
    kontaktOsoba: "Ing. Radomir Luki\u0107 (Direktor)",
    telefon: "+381 11 245-8901",
    poreskiModel: "doo",
  },
  {
    id: "firma-2",
    pib: "108923412",
    maticniBroj: "20459812",
    naziv: "BioMedika Laboratorije d.o.o.",
    adresa: "Bulevar Oslobo\u0111enja 45, 21000 Novi Sad",
    opstina_kod: "021",
    radniciBroj: 2,
    iban: "RS352650000004567890",
    delatnost: "8690 - Ostala zdravstvena za\u0161tita",
    kontaktEmail: "finansije@biomedika.rs",
    clientType: "company",
    kontaktOsoba: "Dr Sne\u017Eana Popovi\u0107",
    telefon: "+381 21 661-2345",
    poreskiModel: "doo",
  },
  {
    id: "firma-3",
    pib: "104561234",
    maticniBroj: "17892301",
    naziv: "SeverTrans Logistika d.o.o.",
    adresa: "Dimitrija Tucovi\u0107a 88, 18000 Ni\u0161",
    opstina_kod: "018",
    radniciBroj: 2,
    iban: "RS351700000007891234",
    delatnost: "4941 - Drumski prevoz tereta",
    kontaktEmail: "office@severtrans.rs",
    clientType: "company",
    kontaktOsoba: "Milo\u0161 Stankovi\u0107 (Dispe\u010Der)",
    telefon: "+381 18 522-771",
    poreskiModel: "doo",
  },
  {
    id: "freelance-1",
    pib: "112998877",
    maticniBroj: "65432198",
    naziv: "Marko Ili\u0107 PR - Softverske Usluge & Cloud",
    adresa: "Bulevar Mihajla Pupina 10, 11070 Novi Beograd",
    opstina_kod: "011",
    radniciBroj: 1,
    iban: "RS352650000009988776",
    delatnost: "6201 - Ra\u010Dunarsko programiranje",
    kontaktEmail: "marko.dev@gmail.com",
    clientType: "freelancer",
    kontaktOsoba: "Marko Ili\u0107 (Senior Cloud Dev)",
    telefon: "+381 64 123-4567",
    poreskiModel: "pausal",
    satnicaUgovorena: 45,
    valuta: "EUR",
  },
  {
    id: "freelance-2",
    pib: "113445566",
    maticniBroj: "65987412",
    naziv: "Studio Pixel Craft PR - UI/UX & Digital",
    adresa: "Dunavska 14, 21000 Novi Sad",
    opstina_kod: "021",
    radniciBroj: 1,
    iban: "RS351600000004455667",
    delatnost: "7410 - Specijalizovane dizajnerske delatnosti",
    kontaktEmail: "ana.vasic@pixelcraft.rs",
    clientType: "freelancer",
    kontaktOsoba: "Ana Vasi\u0107 (UI Lead)",
    telefon: "+381 63 987-6543",
    poreskiModel: "pausal",
    satnicaUgovorena: 35,
    valuta: "EUR",
  },
  {
    id: "freelance-3",
    pib: "114887711",
    maticniBroj: "66112233",
    naziv: "Dragan Simi\u0107 - Konsultant za Logistiku & SCM",
    adresa: "Kralja Milana 30, 11000 Beograd",
    opstina_kod: "011",
    radniciBroj: 1,
    iban: "RS351700000001122334",
    delatnost: "7022 - Konsultantske delatnosti u poslovanju",
    kontaktEmail: "dragan.scm@consultant.rs",
    clientType: "freelancer",
    kontaktOsoba: "Dragan Simi\u0107",
    telefon: "+381 60 555-4321",
    poreskiModel: "inostrani_priliv",
    satnicaUgovorena: 50,
    valuta: "EUR",
  },
];
const DEFAULT_PROFESSIONAL_EVENTS = [
  {
    id: "ev-1",
    clientId: "firma-1",
    clientName: "TehnoProizvodnja d.o.o. Beograd",
    clientType: "company",
    workerName: "Radomir Luki\u0107 (Direktor pogona)",
    title: "Sastanak: Organizacija III smene i normativa radnog vremena",
    description:
      "Analiza kapaciteta CNC ma\u0161ina, uvo\u0111enje rotacionog sistema 12h Dan / 12h No\u0107 / 48h Odmor i preraspodela satnice.",
    category: "meeting",
    date: getRelativeDate(1),
    startTime: "10:00",
    endTime: "11:30",
    location: "Upravna zgrada TehnoProizvodnja, Beogradska 12",
    priority: "high",
    status: "scheduled",
    complianceNote:
      "Zakon o radu \u010Dl. 57 - Prekovremeni rad ne mo\u017Ee trajati du\u017Ee od 8h nedeljno.",
    reminderDaysBefore: 1,
    tags: ["smena", "organizacija", "proizvodnja"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-2",
    clientId: "firma-3",
    clientName: "SeverTrans Logistika d.o.o.",
    clientType: "company",
    workerName: "Milo\u0161 Stankovi\u0107 (Dispe\u010Der)",
    title: "Poslovni pregovori: Aneks ugovora o radu i no\u0107ni bonusi",
    description:
      "Pregovori o pove\u0107anju naknade za no\u0107ni rad na 30% (zakonski minimum 26%) i bonusa za no\u0107nu vo\u017Enju vikendom.",
    category: "negotiation",
    date: getRelativeDate(3),
    startTime: "14:00",
    endTime: "15:30",
    location: "Kancelarija Knjigovodstva ShiftPulse / Google Meet",
    priority: "normal",
    status: "scheduled",
    complianceNote:
      "Uskla\u0111ivanje sa Pravilnikom o radu i \u010Dl. 108 stav 1 ta\u010Dka 1 Zakona o radu.",
    reminderDaysBefore: 2,
    tags: ["ugovor", "aneks", "stimulacije"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-3",
    clientId: "firma-1",
    clientName: "TehnoProizvodnja d.o.o. Beograd",
    clientType: "company",
    title:
      "Poreski rok: Podno\u0161enje PPP-PD i pla\u0107anje poreza i doprinosa",
    description:
      "Podno\u0161enje pojedina\u010Dne poreske prijave PPP-PD preko portala ePorezi za zarade zaposlenih i generisanje naloga za prenos.",
    category: "tax_deadline",
    date: getFixedDayCurrentMonth(30),
    startTime: "09:00",
    endTime: "17:00",
    location: "Portal ePorezi (Poreska uprava RS)",
    priority: "urgent",
    status: "scheduled",
    complianceNote:
      "Zakonski rok po Zakonu o poreskom postupku i poreskoj administraciji.",
    reminderDaysBefore: 3,
    tags: ["ePorezi", "PPP-PD", "zarade", "rok"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-4",
    clientId: "firma-1",
    clientName: "TehnoProizvodnja d.o.o. Beograd",
    clientType: "company",
    workerId: "r1",
    workerName: "Nikola Petrovi\u0107 (CNC Tehni\u010Dar)",
    title:
      "Medicina rada: Obavezni periodi\u010Dni lekarski pregled (no\u0107ni rad)",
    description:
      "Redovni lekarski pregled za rad na radnom mestu sa pove\u0107anim rizikom i no\u0107nim smenama (preko 3h rada u periodu 22h-06h).",
    category: "medical_bzr",
    date: getRelativeDate(4),
    startTime: "08:30",
    endTime: "11:00",
    location: "Zavod za zdravstvenu za\u0161titu radnika / Medicina rada",
    priority: "urgent",
    status: "scheduled",
    complianceNote:
      "\u010Clan 62. Zakona o radu RS - obavezan lekarski pregled za zaposlene koji rade no\u0107u.",
    reminderDaysBefore: 2,
    tags: ["medicina rada", "BZR", "\u010Dlan 62", "no\u0107ni rad"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-5",
    clientId: "freelance-1",
    clientName: "Marko Ili\u0107 PR - Softverske Usluge & Cloud",
    clientType: "freelancer",
    workerName: "Marko Ili\u0107",
    title:
      "Poresko savetovanje: Kontrola kumulativnog prometa i limit pau\u0161ala",
    description:
      "Kontrola godi\u0161njeg prometa (KPO knjiga) radi o\u010Duvanja statusa pau\u0161alca ispod 6.000.000 RSD i provera uslova testa samostalnosti.",
    category: "meeting",
    date: getRelativeDate(2),
    startTime: "13:00",
    endTime: "14:00",
    location: "Video poziv (Google Meet)",
    priority: "high",
    status: "scheduled",
    financialAmount: 5300,
    currency: "RSD",
    complianceNote:
      "Limit za pau\u0161alno oporezivanje 6 miliona RSD u kalendarskoj godini (\u010Dl. 40 ZPDG).",
    reminderDaysBefore: 1,
    tags: ["pausal", "test samostalnosti", "limit 6M"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-6",
    clientId: "freelance-1",
    clientName: "Marko Ili\u0107 PR - Softverske Usluge & Cloud",
    clientType: "freelancer",
    workerName: "Marko Ili\u0107",
    title: "Obra\u010Dun konsultantskih sati i ino-faktura (AWS Cloud Project)",
    description:
      "Evidencija 45 sati softverskog in\u017Eenjeringa za klijenta CloudScale Munich, izrada dvojezi\u010Dne fakture i instrukcije za devizno pla\u0107anje.",
    category: "freelance_consulting",
    date: getRelativeDate(5),
    startTime: "11:00",
    endTime: "12:00",
    location: "Kancelarija agencije / Digitalno",
    priority: "normal",
    status: "scheduled",
    financialAmount: 2025,
    currency: "EUR",
    complianceNote:
      "Zakon o deviznom poslovanju - osnov naplate i obave\u0161tavanje banke po prilivu (Loro doznaka).",
    reminderDaysBefore: 1,
    tags: ["faktura", "konsultacije", "devizni priliv"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-7",
    clientId: "firma-2",
    clientName: "BioMedika Laboratorije d.o.o.",
    clientType: "company",
    title:
      "Poreski rok: Podno\u0161enje poreske prijave PP PDV za prethodni mesec",
    description:
      "Zatvaranje KPR i KIR knjiga, obra\u010Dun ulaznog i izlaznog PDV-a i podno\u0161enje poreske prijave na portalu ePorezi.",
    category: "tax_deadline",
    date: getFixedDayCurrentMonth(15),
    startTime: "08:00",
    endTime: "16:00",
    location: "Portal ePorezi",
    priority: "high",
    status: "scheduled",
    complianceNote:
      "Zakon o PDV - rok za predaju poreske prijave i pla\u0107anje PDV-a je 15. u mesecu.",
    reminderDaysBefore: 2,
    tags: ["PDV", "PP PDV", "ePorezi"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-8",
    clientId: "freelance-2",
    clientName: "Studio Pixel Craft PR - UI/UX & Digital",
    clientType: "freelancer",
    workerName: "Ana Vasi\u0107",
    title:
      "Poslovni pregovori: Ugovor o dugoro\u010Dnom dizajnerskom retaineru",
    description:
      "Pregovori sa novim klijentom iz Be\u010Da o mese\u010Dnom paketu od 60 radnih sati sa fiksnom satnicom od 35 EUR/h.",
    category: "negotiation",
    date: getRelativeDate(6),
    startTime: "15:00",
    endTime: "16:30",
    location: "Zoom sastanak",
    priority: "normal",
    status: "scheduled",
    financialAmount: 2100,
    currency: "EUR",
    tags: ["retainer", "pregovori", "dizajn"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-9",
    clientId: "firma-2",
    clientName: "BioMedika Laboratorije d.o.o.",
    clientType: "company",
    workerName: "Dr Sne\u017Eana Popovi\u0107",
    title: "Inspekcijski nadzor: Inspekcija rada - kontrola rasporeda smena",
    description:
      "Provera knjige evidencije radnog vremena, evidencije no\u0107nog rada laboranata i po\u0161tovanja minimuma dnevnog i nedeljnog odmora.",
    category: "inspection",
    date: getRelativeDate(8),
    startTime: "10:00",
    endTime: "13:00",
    location: "Prostorije laboratorije, Novi Sad",
    priority: "urgent",
    status: "scheduled",
    complianceNote:
      "Zakon o radu \u010Dl. 66 i 67 - Dnevni odmor mora trajati neprekidno najmanje 12 \u010Dasova.",
    reminderDaysBefore: 3,
    tags: ["inspekcija rada", "nadzor", "smene"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "ev-10",
    clientId: "freelance-3",
    clientName: "Dragan Simi\u0107 - Konsultant za Logistiku & SCM",
    clientType: "freelancer",
    workerName: "Dragan Simi\u0107",
    title: "Poreska prijava PP OPO-K za inostrane prilive (Frilenseri)",
    description:
      "Prijava ostvarenih kvartalnih prihoda preko portala Frilenseri (prijava PP OPO-K, izbor Model A ili B).",
    category: "tax_deadline",
    date: getFixedDayCurrentMonth(28),
    startTime: "12:00",
    endTime: "15:00",
    location: "Portal frilenseri.purs.gov.rs",
    priority: "high",
    status: "scheduled",
    complianceNote:
      "Rok za podno\u0161enje prijave za prihode ostvarene u kvartalu je 30 dana od isteka kvartala.",
    reminderDaysBefore: 2,
    tags: ["frilenseri", "PP OPO-K", "kvartal"],
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
];
const DEFAULT_LEAVES = [
  {
    id: "leave-demo-1",
    workerId: "r1",
    workerName: "Nikola Petrović",
    companyId: "firma-1",
    leaveType: "vacation",
    code: "GO",
    label: "Godišnji odmor (100%)",
    startDate: getFixedDayCurrentMonth(12),
    endDate: getFixedDayCurrentMonth(16),
    daysList: [
      getFixedDayCurrentMonth(12),
      getFixedDayCurrentMonth(13),
      getFixedDayCurrentMonth(14),
      getFixedDayCurrentMonth(15),
      getFixedDayCurrentMonth(16),
    ],
    daysCount: 5,
    hoursPerDay: 8,
    totalHours: 40,
    compensationPercent: 100,
    paidBy: "poslodavac",
    doznakaBroj: "REŠ-GO-2026/12",
    dijagnoza: "Prvi deo godišnjeg odmora",
    notes: "Godišnji odmor odobren rešenjem poslodavca",
    satnica: 550,
    estimatedTotalCompensation: 22000,
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
  {
    id: "leave-demo-2",
    workerId: "r3",
    workerName: "Milan Đorđević",
    companyId: "firma-1",
    leaveType: "sick_65",
    code: "B",
    label: "Bolovanje do 30 dana (65%)",
    startDate: getFixedDayCurrentMonth(20),
    endDate: getFixedDayCurrentMonth(22),
    daysList: [
      getFixedDayCurrentMonth(20),
      getFixedDayCurrentMonth(21),
      getFixedDayCurrentMonth(22),
    ],
    daysCount: 3,
    hoursPerDay: 8,
    totalHours: 24,
    compensationPercent: 65,
    paidBy: "poslodavac",
    doznakaBroj: "DZ-2026/8941",
    dijagnoza: "J06 Akutna respiratorna infekcija",
    notes: "Lekarska doznaka (teret poslodavca 65%)",
    satnica: 650,
    estimatedTotalCompensation: 10140,
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  },
];

const DEFAULT_EMPLOYEES = [
  {
    id: "r1",
    companyId: "firma-1",
    ime: "Nikola Petrović",
    jmbg: "1508991710023",
    pozicija: "Glavni tehničar smene (CNC)",
    brutoBaza: 95e3,
    satnica: 550,
    prekovremeniSati: 10,
    nocniSati: 24,
    praznikSati: 0,
    bankRacun: "265-0000001234567-88",
    opstinaPrebivalista: "011",
    ugovorDatum: "2022-03-15",
    kompletan: true,
    smenskiRezim: "12h_turnus",
    manualOverrides: {
      [getFixedDayCurrentMonth(12)]: {
        date: getFixedDayCurrentMonth(12),
        code: "GO",
        label: "GO (8h)",
        dayHours: 0,
        vacationHours: 8,
        leaveType: "vacation",
        compensationPercentage: 100,
        doznakaBroj: "REŠ-GO-2026/12",
        notes: "Godišnji odmor",
        leaveId: "leave-demo-1",
        isManualOverride: true,
      },
      [getFixedDayCurrentMonth(13)]: {
        date: getFixedDayCurrentMonth(13),
        code: "GO",
        label: "GO (8h)",
        dayHours: 0,
        vacationHours: 8,
        leaveType: "vacation",
        compensationPercentage: 100,
        doznakaBroj: "REŠ-GO-2026/12",
        notes: "Godišnji odmor",
        leaveId: "leave-demo-1",
        isManualOverride: true,
      },
      [getFixedDayCurrentMonth(14)]: {
        date: getFixedDayCurrentMonth(14),
        code: "GO",
        label: "GO (8h)",
        dayHours: 0,
        vacationHours: 8,
        leaveType: "vacation",
        compensationPercentage: 100,
        doznakaBroj: "REŠ-GO-2026/12",
        notes: "Godišnji odmor",
        leaveId: "leave-demo-1",
        isManualOverride: true,
      },
      [getFixedDayCurrentMonth(15)]: {
        date: getFixedDayCurrentMonth(15),
        code: "GO",
        label: "GO (8h)",
        dayHours: 0,
        vacationHours: 8,
        leaveType: "vacation",
        compensationPercentage: 100,
        doznakaBroj: "REŠ-GO-2026/12",
        notes: "Godišnji odmor",
        leaveId: "leave-demo-1",
        isManualOverride: true,
      },
      [getFixedDayCurrentMonth(16)]: {
        date: getFixedDayCurrentMonth(16),
        code: "GO",
        label: "GO (8h)",
        dayHours: 0,
        vacationHours: 8,
        leaveType: "vacation",
        compensationPercentage: 100,
        doznakaBroj: "REŠ-GO-2026/12",
        notes: "Godišnji odmor",
        leaveId: "leave-demo-1",
        isManualOverride: true,
      },
    },
    obracun: {
      osnovniBruto: 95e3,
      satnica: 550,
      hours: {
        regularHours: 136,
        vacationHours: 40,
        sick65Hours: 0,
        sick100Hours: 0,
        sickRfzoHours: 0,
        nightHours: 24,
        overtimeHours: 10,
        totalPaidHours: 210,
      },
      naknade: {
        redovanRad: 74800,
        godisnjiOdmor: 22000,
        bolovanje65: 0,
        bolovanje100: 0,
        bolovanjeRfzoSati: 0,
      },
      uvecanja: {
        nocniRad: 3432,
        prekovremeniRad: 1430,
        praznicniRad: 0,
      },
      bruto: 101662,
      poreskaOsnovica: 76662,
      neoporeziviIznos: 25e3,
      porez: 7666.2,
      doprinosiRadnik: 20230.74,
      doprinosiFirma: 15401.79,
      neto: 73765.06,
      ukupnoZaIsplatuFirme: 117063.79,
      detaljiDoprinosa: {
        pioRadnik: 14232.68,
        zdravstvoRadnik: 5235.59,
        nezaposlenostRadnik: 762.47,
        pioPoslodavac: 10166.2,
        zdravstvoPoslodavac: 5235.59,
      },
    },
  },
  {
    id: "r2",
    companyId: "firma-1",
    ime: "Jovana Jovanović",
    jmbg: "2304994715012",
    pozicija: "Šef logistike i otpreme",
    brutoBaza: 14e4,
    satnica: 750,
    prekovremeniSati: 12,
    nocniSati: 0,
    praznikSati: 8,
    bankRacun: "160-0000009876543-21",
    opstinaPrebivalista: "011",
    ugovorDatum: "2021-06-01",
    kompletan: true,
    smenskiRezim: "8h_regular",
    manualOverrides: {},
    obracun: {
      osnovniBruto: 14e4,
      satnica: 750,
      hours: {
        regularHours: 176,
        vacationHours: 0,
        sick65Hours: 0,
        sick100Hours: 0,
        sickRfzoHours: 0,
        nightHours: 0,
        overtimeHours: 12,
        totalPaidHours: 188,
      },
      naknade: {
        redovanRad: 140000,
        godisnjiOdmor: 0,
        bolovanje65: 0,
        bolovanje100: 0,
        bolovanjeRfzoSati: 0,
      },
      uvecanja: {
        nocniRad: 0,
        prekovremeniRad: 2340,
        praznicniRad: 6600,
      },
      bruto: 148940,
      poreskaOsnovica: 123940,
      neoporeziviIznos: 25e3,
      porez: 12394,
      doprinosiRadnik: 29639.06,
      doprinosiFirma: 22564.41,
      neto: 106906.94,
      ukupnoZaIsplatuFirme: 171504.41,
      detaljiDoprinosa: {
        pioRadnik: 20851.6,
        zdravstvoRadnik: 7670.41,
        nezaposlenostRadnik: 1117.05,
        pioPoslodavac: 14894,
        zdravstvoPoslodavac: 7670.41,
      },
    },
  },
  {
    id: "r3",
    companyId: "firma-1",
    ime: "Milan Đorđević",
    jmbg: "1102988710045",
    pozicija: "Specijalista mehatronike",
    brutoBaza: 115e3,
    satnica: 650,
    prekovremeniSati: 8,
    nocniSati: 16,
    praznikSati: 0,
    bankRacun: "325-0000004561237-44",
    opstinaPrebivalista: "011",
    ugovorDatum: "2023-01-10",
    kompletan: true,
    smenskiRezim: "8h_three_shift",
    manualOverrides: {
      [getFixedDayCurrentMonth(20)]: {
        date: getFixedDayCurrentMonth(20),
        code: "B",
        label: "B (8h)",
        dayHours: 0,
        sickHours: 8,
        leaveType: "sick_65",
        compensationPercentage: 65,
        doznakaBroj: "DZ-2026/8941",
        notes: "Bolovanje do 30 dana (65%)",
        leaveId: "leave-demo-2",
        isManualOverride: true,
      },
      [getFixedDayCurrentMonth(21)]: {
        date: getFixedDayCurrentMonth(21),
        code: "B",
        label: "B (8h)",
        dayHours: 0,
        sickHours: 8,
        leaveType: "sick_65",
        compensationPercentage: 65,
        doznakaBroj: "DZ-2026/8941",
        notes: "Bolovanje do 30 dana (65%)",
        leaveId: "leave-demo-2",
        isManualOverride: true,
      },
      [getFixedDayCurrentMonth(22)]: {
        date: getFixedDayCurrentMonth(22),
        code: "B",
        label: "B (8h)",
        dayHours: 0,
        sickHours: 8,
        leaveType: "sick_65",
        compensationPercentage: 65,
        doznakaBroj: "DZ-2026/8941",
        notes: "Bolovanje do 30 dana (65%)",
        leaveId: "leave-demo-2",
        isManualOverride: true,
      },
    },
    obracun: {
      osnovniBruto: 115e3,
      satnica: 650,
      hours: {
        regularHours: 152,
        vacationHours: 0,
        sick65Hours: 24,
        sick100Hours: 0,
        sickRfzoHours: 0,
        nightHours: 16,
        overtimeHours: 8,
        totalPaidHours: 200,
      },
      naknade: {
        redovanRad: 98800,
        godisnjiOdmor: 0,
        bolovanje65: 10140,
        bolovanje100: 0,
        bolovanjeRfzoSati: 0,
      },
      uvecanja: {
        nocniRad: 2704,
        prekovremeniRad: 1352,
        praznicniRad: 0,
      },
      bruto: 112996,
      poreskaOsnovica: 87996,
      neoporeziviIznos: 25e3,
      porez: 8799.6,
      doprinosiRadnik: 22486.2,
      doprinosiFirma: 17118.89,
      neto: 81710.2,
      ukupnoZaIsplatuFirme: 130114.89,
      detaljiDoprinosa: {
        pioRadnik: 15819.44,
        zdravstvoRadnik: 5819.29,
        nezaposlenostRadnik: 847.47,
        pioPoslodavac: 11299.6,
        zdravstvoPoslodavac: 5819.29,
      },
    },
  },
  {
    id: "r4",
    companyId: "firma-1",
    ime: "Marija Stankovi\u0107",
    jmbg: "0511996715089",
    pozicija: "Kontrolor kvaliteta i bezbednosti",
    brutoBaza: 88e3,
    satnica: 500,
    prekovremeniSati: 6,
    nocniSati: 8,
    praznikSati: 0,
    bankRacun: "205-0000003456781-12",
    opstinaPrebivalista: "011",
    ugovorDatum: "2023-09-01",
    kompletan: true,
    smenskiRezim: "8h_two_shift",
    manualOverrides: {},
    obracun: {
      osnovniBruto: 88e3,
      uvecanja: {
        nocniRad: 1040,
        prekovremeniRad: 780,
        praznicniRad: 0,
      },
      bruto: 89820,
      poreskaOsnovica: 64820,
      neoporeziviIznos: 25e3,
      porez: 6482,
      doprinosiRadnik: 17874.18,
      doprinosiFirma: 13607.73,
      neto: 65463.82,
      ukupnoZaIsplatuFirme: 103427.73,
      detaljiDoprinosa: {
        pioRadnik: 12574.8,
        zdravstvoRadnik: 4625.73,
        nezaposlenostRadnik: 673.65,
        pioPoslodavac: 8982,
        zdravstvoPoslodavac: 4625.73,
      },
    },
  },
  {
    id: "r5",
    companyId: "firma-2",
    ime: "Dragan Ili\u0107",
    jmbg: "1906989710034",
    pozicija: "Medicinski laboratorijski analiti\u010Dar",
    brutoBaza: 105e3,
    satnica: 600,
    prekovremeniSati: 8,
    nocniSati: 18,
    praznikSati: 0,
    bankRacun: "265-0000005544332-99",
    opstinaPrebivalista: "021",
    ugovorDatum: "2020-04-12",
    smenskiRezim: "8h_three_shift",
    manualOverrides: {},
    kompletan: false,
  },
  {
    id: "r6",
    companyId: "firma-2",
    ime: "Jelena Vasi\u0107",
    jmbg: "2908995715067",
    pozicija: "Molekularni biolog u smeni",
    brutoBaza: 135e3,
    satnica: 720,
    prekovremeniSati: 4,
    nocniSati: 12,
    praznikSati: 0,
    bankRacun: "160-0000001122334-55",
    opstinaPrebivalista: "021",
    ugovorDatum: "2022-11-01",
    smenskiRezim: "8h_regular",
    manualOverrides: {},
    kompletan: false,
  },
  {
    id: "r7",
    companyId: "firma-3",
    ime: "Nenad Kosti\u0107",
    jmbg: "0703987710022",
    pozicija: "Voza\u010D teretnog vozila C+E",
    brutoBaza: 11e4,
    satnica: 620,
    prekovremeniSati: 20,
    nocniSati: 30,
    praznikSati: 0,
    bankRacun: "170-0000007788990-11",
    opstinaPrebivalista: "018",
    ugovorDatum: "2019-08-15",
    smenskiRezim: "12h_turnus",
    manualOverrides: {},
    kompletan: false,
  },
  {
    id: "r8",
    companyId: "firma-3",
    ime: "Marko Simi\u0107",
    jmbg: "1410992710011",
    pozicija: "Rukovodilac voznog parka",
    brutoBaza: 125e3,
    satnica: 700,
    prekovremeniSati: 6,
    nocniSati: 0,
    praznikSati: 0,
    bankRacun: "325-0000008899112-33",
    opstinaPrebivalista: "018",
    ugovorDatum: "2021-02-01",
    smenskiRezim: "8h_regular",
    manualOverrides: {},
    kompletan: false,
  },
];
export const ShiftProvider = ({ children }) => {
  const [license, setLicense] = useState({
    valid: true,
    licenciraniPravniSubjekat: "Knjigovodstvena Stanica Enterprise Pro",
    pibAgencije: "102345678",
    datumIsteka: "2030-12-31",
    kljuc: "SPPRO-ENTERPRISE-ACTIVE",
    poruka: "Sistem je uspe\u0161no licenciran i trajno autorizovan.",
  });
  useEffect(() => {
    fetch("/api/license/status")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setLicense({
            valid: data.success ?? true,
            licenciraniPravniSubjekat:
              data.licenciraniPravniSubjekat || "Knjigovodstveni Centar",
            pibAgencije: data.pibAgencije || "102345678",
            datumIsteka: data.datumIsteka || "2030-12-31",
            kljuc: "B2B-PRO-KEY",
            poruka: data.poruka || "Licenca je aktivna.",
          });
        }
      })
      .catch(() => {
        setLicense({
          valid: true,
          licenciraniPravniSubjekat:
            "Knjigovodstveni Centar (Lokalni re\u017Eim)",
          pibAgencije: "102345678",
          datumIsteka: "2030-12-31",
          kljuc: "LOCAL-VALID",
          poruka: "Lokalni autorizovani rad.",
        });
      });
  }, []);
  const [companies, setCompanies] = useState(() => {
    try {
      const saved = localStorage.getItem(COMPANIES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COMPANIES;
  });
  const [activeCompany, setActiveCompany] = useState(
    () => companies[0] || null,
  );
  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((emp, idx) => ({
            ...emp,
            smenskiRezim:
              emp.smenskiRezim ||
              (idx % 4 === 0
                ? "12h_turnus"
                : idx % 4 === 1
                  ? "8h_regular"
                  : idx % 4 === 2
                    ? "8h_three_shift"
                    : "8h_two_shift"),
            manualOverrides: emp.manualOverrides || {},
          }));
        }
      }
    } catch {}
    return DEFAULT_EMPLOYEES;
  });
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = localStorage.getItem(JOBS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_JOBS;
  });
  const [shifts, setShifts] = useState(() => {
    try {
      const saved = localStorage.getItem(SHIFTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SHIFTS;
  });
  const [professionalEvents, setProfessionalEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROFESSIONAL_EVENTS;
  });
  const [activeClock, setActiveClock] = useState(() => {
    try {
      const saved = localStorage.getItem(CLOCK_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });
  const [mobileFrameMode, setMobileFrameMode] = useState(false);
  const [currentTab, setCurrentTab] = useState("ledger");
  const [activeJobFilter, setActiveJobFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = /* @__PURE__ */ new Date();
    return today.toISOString().split("T")[0];
  });
  const [editingShift, setEditingShift] = useState(null);
  const [leaves, setLeaves] = useState(() => {
    try {
      const saved = localStorage.getItem(LEAVES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_LEAVES;
  });
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveModalInitialWorkerId, setLeaveModalInitialWorkerId] = useState("");
  const [leaveModalInitialDate, setLeaveModalInitialDate] = useState("");

  const openLeaveModal = (workerId = "", date = "") => {
    setLeaveModalInitialWorkerId(workerId);
    setLeaveModalInitialDate(date);
    setIsLeaveModalOpen(true);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [addModalDefaultDate, setAddModalDefaultDate] = useState(null);
  const isPremium = true;
  const setIsPremium = () => {};
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCircadianModalOpen, setIsCircadianModalOpen] = useState(false);
  const openSubscriptionModal = () => setIsSubscriptionModalOpen(true);
  const openCircadianModal = () => setIsCircadianModalOpen(true);
  useEffect(() => {
    try {
      localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
    } catch (e) {
      console.error(e);
    }
  }, [companies]);
  useEffect(() => {
    try {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
    } catch (e) {
      console.error(e);
    }
  }, [employees]);
  useEffect(() => {
    try {
      localStorage.setItem(LEAVES_STORAGE_KEY, JSON.stringify(leaves));
    } catch (e) {
      console.error(e);
    }
  }, [leaves]);
  useEffect(() => {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch (e) {
      console.error(e);
    }
  }, [jobs]);
  useEffect(() => {
    try {
      localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
    } catch (e) {
      console.error(e);
    }
  }, [shifts]);
  useEffect(() => {
    try {
      localStorage.setItem(
        EVENTS_STORAGE_KEY,
        JSON.stringify(professionalEvents),
      );
    } catch (e) {
      console.error(e);
    }
  }, [professionalEvents]);
  useEffect(() => {
    try {
      if (activeClock) {
        localStorage.setItem(CLOCK_STORAGE_KEY, JSON.stringify(activeClock));
      } else {
        localStorage.removeItem(CLOCK_STORAGE_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeClock]);
  useEffect(() => {
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(darkMode));
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error(e);
    }
  }, [darkMode]);
  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const addCompany = (companyData) => {
    const newCompany = {
      ...companyData,
      id: `firma-${Date.now()}`,
    };
    setCompanies((prev) => [...prev, newCompany]);
    setActiveCompany(newCompany);
    return newCompany;
  };
  const updateCompany = (id, updates) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
    if (activeCompany?.id === id) {
      setActiveCompany((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };
  const deleteCompany = (id) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setEmployees((prev) => prev.filter((e) => e.companyId !== id));
    if (activeCompany?.id === id) {
      const remaining = companies.filter((c) => c.id !== id);
      setActiveCompany(remaining[0] || null);
    }
  };
  const exportCompanyDossierJson = (companyId) => {
    const targetComp = companies.find((c) => c.id === companyId);
    if (!targetComp) return "{}";
    const compEmployees = employees.filter((e) => e.companyId === companyId);
    const compShifts = shifts.filter((s) => {
      const emp = compEmployees.find(
        (e) => e.id === s.notes || e.ime === s.location,
      );
      return !!emp;
    });
    const dossier = {
      company: targetComp,
      employees: compEmployees,
      shifts: compShifts,
      exportedAt: /* @__PURE__ */ new Date().toISOString(),
    };
    return JSON.stringify(dossier, null, 2);
  };
  const importCompanyDossierJson = (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.company && parsed.company.pib) {
        const existingCompIndex = companies.findIndex(
          (c) => c.pib === parsed.company.pib,
        );
        if (existingCompIndex >= 0) {
          setCompanies((prev) =>
            prev.map((c, idx) =>
              idx === existingCompIndex ? { ...c, ...parsed.company } : c,
            ),
          );
          setActiveCompany(parsed.company);
        } else {
          setCompanies((prev) => [...prev, parsed.company]);
          setActiveCompany(parsed.company);
        }
        if (Array.isArray(parsed.employees)) {
          setEmployees((prev) => {
            const filtered = prev.filter(
              (e) => e.companyId !== parsed.company.id,
            );
            return [...filtered, ...parsed.employees];
          });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };
  const addEmployee = (empData) => {
    const newEmp = {
      ...empData,
      id: `r-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setEmployees((prev) => [...prev, newEmp]);
    updateCompany(newEmp.companyId, {
      radniciBroj:
        employees.filter((e) => e.companyId === newEmp.companyId).length + 1,
    });
    return newEmp;
  };
  const updateEmployee = (id, updates) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
  };
  const deleteEmployee = (id) => {
    const emp = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (emp) {
      updateCompany(emp.companyId, {
        radniciBroj: Math.max(
          0,
          employees.filter((e) => e.companyId === emp.companyId && e.id !== id)
            .length,
        ),
      });
    }
  };
  const updateWorkerRegime = (employeeId, regime) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, smenskiRezim: regime } : emp,
      ),
    );
  };
  const updateWorkerDayOverride = (employeeId, date, override) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const currentOverrides = { ...(emp.manualOverrides || {}) };
        if (override) {
          currentOverrides[date] = override;
        } else {
          delete currentOverrides[date];
        }
        const updated = {
          ...emp,
          manualOverrides: currentOverrides,
        };
        const statutory = calculateSerbianWorkerPayroll(updated);
        return {
          ...updated,
          obracun: statutory,
          kompletan: true,
        };
      }),
    );
  };
  const addWorkerLeave = (leaveData) => {
    setLeaves((prev) => [leaveData, ...prev]);

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== leaveData.workerId) return emp;
        const currentOverrides = { ...(emp.manualOverrides || {}) };

        leaveData.daysList.forEach((dateStr) => {
          currentOverrides[dateStr] = {
            date: dateStr,
            code: leaveData.code,
            label: `${leaveData.code} (${leaveData.hoursPerDay}h)`,
            dayHours: 0,
            vacationHours: leaveData.code === "GO" ? leaveData.hoursPerDay : 0,
            sickHours: ["B", "B100", "RFZO"].includes(leaveData.code) ? leaveData.hoursPerDay : 0,
            leaveType: leaveData.leaveType,
            compensationPercentage: leaveData.compensationPercent,
            doznakaBroj: leaveData.doznakaBroj,
            notes: leaveData.notes || leaveData.label,
            leaveId: leaveData.id,
            isManualOverride: true,
            modifiedAt: new Date().toISOString(),
          };
        });

        const updated = {
          ...emp,
          manualOverrides: currentOverrides,
        };
        const statutory = calculateSerbianWorkerPayroll(updated);
        return {
          ...updated,
          obracun: statutory,
          kompletan: true,
        };
      }),
    );
  };
  const deleteWorkerLeave = (leaveId) => {
    setLeaves((prev) => prev.filter((l) => l.id !== leaveId));

    setEmployees((prev) =>
      prev.map((emp) => {
        const currentOverrides = { ...(emp.manualOverrides || {}) };
        let modified = false;
        Object.keys(currentOverrides).forEach((dateKey) => {
          if (currentOverrides[dateKey]?.leaveId === leaveId) {
            delete currentOverrides[dateKey];
            modified = true;
          }
        });
        if (!modified) return emp;
        const updated = {
          ...emp,
          manualOverrides: currentOverrides,
        };
        const statutory = calculateSerbianWorkerPayroll(updated);
        return {
          ...updated,
          obracun: statutory,
          kompletan: true,
        };
      }),
    );
  };
  const calculatePayrollForCompany = async (companyId) => {
    const targetEmployees = employees.filter((e) => e.companyId === companyId);
    if (targetEmployees.length === 0) return;
    try {
      const calculated = targetEmployees.map((emp) => {
        const statutory = calculateSerbianWorkerPayroll(emp);
        return {
          ...emp,
          obracun: statutory,
          kompletan: true,
        };
      });

      // Poziv server API za sinhronizaciju i licenciranu proveru
      try {
        await Promise.all(
          calculated.map((emp) =>
            fetch("/api/ledger/calculate-payroll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employeeId: emp.id,
                brutoBaza: emp.brutoBaza,
                satnica: emp.satnica,
                regularHours: emp.obracun?.hours?.regularHours || 176,
                vacationHours: emp.obracun?.hours?.vacationHours || 0,
                sickHours65: emp.obracun?.hours?.sick65Hours || 0,
                sickHours100: emp.obracun?.hours?.sick100Hours || 0,
                prekovremeniSati: emp.obracun?.hours?.overtimeHours || emp.prekovremeniSati,
                nocniSati: emp.obracun?.hours?.nightHours || emp.nocniSati,
                praznikSati: emp.praznikSati,
              }),
            })
          )
        );
      } catch (e) {}

      setEmployees((prev) =>
        prev.map((orig) => {
          const updated = calculated.find((c) => c.id === orig.id);
          return updated || orig;
        }),
      );
    } catch (err) {
      console.error("Greška pri obračunu plata za firmu:", err);
    }
  };
  const addJob = (jobData) => {
    const newJob = {
      ...jobData,
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setJobs((prev) => [newJob, ...prev]);
    return newJob;
  };
  const updateJob = (id, updates) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    );
  };
  const deleteJob = (id) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setShifts((prev) => prev.filter((s) => s.jobId !== id));
  };
  const getJobById = (id) => jobs.find((j) => j.id === id);
  const addJobFromAi = (aiData) => {
    const contract = aiData.contractAnalysis || {};
    const rules = aiData.extractedRules || {};
    const presetColors = [
      "#059669",
      "#6366f1",
      "#d97706",
      "#e11d48",
      "#0284c7",
      "#7c3aed",
    ];
    const randomColor =
      presetColors[Math.floor(Math.random() * presetColors.length)];
    const newJobData = {
      name: contract.employerName || "Novi Poslodavac (AI Sken)",
      role: contract.detectedRole || "Zaposleni",
      color: randomColor,
      baseHourlyRate: Number(contract.baseHourlyRate) || 0,
      currency: contract.currency || "RSD",
      payCycle: "monthly",
      payPeriodAnchorDate: /* @__PURE__ */ new Date()
        .toISOString()
        .split("T")[0],
      routineBreakRules: {
        enabled: true,
        thresholdHours: 5,
        durationMinutes: 30,
        isPaid: false,
        autoDeduct: true,
      },
      overtimeRules: {
        enabled: true,
        dailyThresholdHours: Number(rules.dailyOvertimeThreshold) || 8,
        dailyOtMultiplier: Number(rules.overtimeMultiplier) || 1.26,
        doubleTimeThresholdHours: 12,
        doubleTimeMultiplier: 2,
        weeklyThresholdHours: 40,
        weeklyOtMultiplier: 1.26,
      },
      differentialRules: {
        nightDiffEnabled: rules.nightDiffEnabled ?? true,
        nightStartTime: rules.nightShiftWindow?.start || "22:00",
        nightEndTime: rules.nightShiftWindow?.end || "06:00",
        nightDiffType: "percentage",
        nightDiffValue: Number(rules.nightDiffValue) || 26,
        weekendBonusMultiplier: 1,
      },
      taxAndDeductions: {
        estimatedTaxRatePercent: 20,
        fixedDeductionPerPeriod: 0,
      },
    };
    return addJob(newJobData);
  };
  const addShift = (shiftData) => {
    const newShift = {
      ...shiftData,
      id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setShifts((prev) => [newShift, ...prev]);
    return newShift;
  };
  const updateShift = (id, updates) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };
  const deleteShift = (id) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  };
  const addShiftsBatch = (newShiftsData) => {
    const timestamp = Date.now();
    const createdList = newShiftsData.map((s, idx) => ({
      ...s,
      id: `shift-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    }));
    setShifts((prev) => [...createdList, ...prev]);
  };
  const deleteShiftsByJobAndRange = (jobId, startDate, endDate) => {
    setShifts((prev) =>
      prev.filter(
        (s) => !(s.jobId === jobId && s.date >= startDate && s.date <= endDate),
      ),
    );
  };
  const duplicateShift = (shiftId, targetDate) => {
    const existing = shifts.find((s) => s.id === shiftId);
    if (!existing) return;
    const duplicated = {
      ...existing,
      id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: targetDate,
      status: "scheduled",
      breaks: existing.breaks.map((b) => ({
        ...b,
        id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      })),
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setShifts((prev) => [duplicated, ...prev]);
  };
  const addBreakToShift = (shiftId, breakData) => {
    const newBreak = {
      ...breakData,
      id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          breaks: [...(s.breaks || []), newBreak],
        };
      }),
    );
  };
  const removeBreakFromShift = (shiftId, breakId) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          breaks: (s.breaks || []).filter((b) => b.id !== breakId),
        };
      }),
    );
  };
  const updateBreakInShift = (shiftId, breakId, updates) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          breaks: (s.breaks || []).map((b) =>
            b.id === breakId ? { ...b, ...updates } : b,
          ),
        };
      }),
    );
  };
  const clockIn = (jobId) => {
    const now = /* @__PURE__ */ new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const dateStr = now.toISOString().split("T")[0];
    const createdShift = addShift({
      jobId,
      date: dateStr,
      startTime: timeStr,
      endTime: timeStr,
      crossesMidnight: false,
      status: "active",
      breaks: [],
      notes: "Logged via live clock in",
    });
    setActiveClock({
      jobId,
      shiftId: createdShift.id,
      clockInTime: now.toISOString(),
      activeBreak: null,
    });
  };
  const clockOut = () => {
    if (!activeClock) return;
    const now = /* @__PURE__ */ new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    if (activeClock.shiftId) {
      const existing = shifts.find((s) => s.id === activeClock.shiftId);
      if (existing) {
        const startH = parseInt(existing.startTime.split(":")[0], 10);
        const endH = now.getHours();
        const crossesMidnight = endH < startH;
        updateShift(activeClock.shiftId, {
          endTime: timeStr,
          status: "completed",
          crossesMidnight,
        });
      }
    }
    setActiveClock(null);
  };
  const startLiveBreak = (name, isPaid) => {
    if (!activeClock) return;
    setActiveClock({
      ...activeClock,
      activeBreak: {
        startTime: /* @__PURE__ */ new Date().toISOString(),
        name,
        isPaid,
      },
    });
  };
  const endLiveBreak = () => {
    if (!activeClock || !activeClock.activeBreak) return;
    const now = /* @__PURE__ */ new Date();
    const start = new Date(activeClock.activeBreak.startTime);
    const durationMinutes = Math.max(
      1,
      Math.round((now.getTime() - start.getTime()) / 6e4),
    );
    const startH = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
    const endH = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    if (activeClock.shiftId) {
      addBreakToShift(activeClock.shiftId, {
        type: "irregular",
        name: activeClock.activeBreak.name,
        startTime: startH,
        endTime: endH,
        durationMinutes,
        isPaid: activeClock.activeBreak.isPaid,
      });
    }
    setActiveClock({
      ...activeClock,
      activeBreak: null,
    });
  };
  const addProfessionalEvent = (eventData) => {
    const newEvent = {
      ...eventData,
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: /* @__PURE__ */ new Date().toISOString(),
    };
    setProfessionalEvents((prev) => [newEvent, ...prev]);
    return newEvent;
  };
  const updateProfessionalEvent = (id, updates) => {
    setProfessionalEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)),
    );
  };
  const deleteProfessionalEvent = (id) => {
    setProfessionalEvents((prev) => prev.filter((ev) => ev.id !== id));
  };
  const resetToDemoData = () => {
    setCompanies(DEFAULT_COMPANIES);
    setActiveCompany(DEFAULT_COMPANIES[0]);
    setEmployees(DEFAULT_EMPLOYEES);
    setJobs(INITIAL_JOBS);
    setShifts(INITIAL_SHIFTS);
    setProfessionalEvents(DEFAULT_PROFESSIONAL_EVENTS);
    setLeaves(DEFAULT_LEAVES);
    setActiveClock(null);
  };
  const exportDataJson = () => {
    const data = {
      companies,
      employees,
      leaves,
      jobs,
      shifts,
      professionalEvents,
      exportedAt: /* @__PURE__ */ new Date().toISOString(),
      app: "ShiftPulse Ledger Pro",
      version: "2.5",
    };
    return JSON.stringify(data, null, 2);
  };
  const importDataJson = (json) => {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed.companies)) setCompanies(parsed.companies);
      if (Array.isArray(parsed.employees)) setEmployees(parsed.employees);
      if (Array.isArray(parsed.leaves)) setLeaves(parsed.leaves);
      if (Array.isArray(parsed.jobs)) setJobs(parsed.jobs);
      if (Array.isArray(parsed.shifts)) setShifts(parsed.shifts);
      if (Array.isArray(parsed.professionalEvents))
        setProfessionalEvents(parsed.professionalEvents);
      return true;
    } catch {
      return false;
    }
  };
  const value = useMemo(
    () => ({
      license,
      companies,
      activeCompany,
      setActiveCompany,
      addCompany,
      updateCompany,
      deleteCompany,
      exportCompanyDossierJson,
      importCompanyDossierJson,
      employees,
      setEmployees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      calculatePayrollForCompany,
      updateWorkerRegime,
      updateWorkerDayOverride,
      leaves,
      addWorkerLeave,
      deleteWorkerLeave,
      isLeaveModalOpen,
      setIsLeaveModalOpen,
      leaveModalInitialWorkerId,
      leaveModalInitialDate,
      openLeaveModal,
      jobs,
      shifts,
      professionalEvents,
      addProfessionalEvent,
      updateProfessionalEvent,
      deleteProfessionalEvent,
      currentTab,
      setCurrentTab,
      activeJobFilter,
      setActiveJobFilter,
      selectedDate,
      setSelectedDate,
      darkMode,
      toggleDarkMode,
      mobileFrameMode,
      setMobileFrameMode,
      activeClock,
      clockIn,
      clockOut,
      startLiveBreak,
      endLiveBreak,
      addJob,
      updateJob,
      deleteJob,
      getJobById,
      addJobFromAi,
      addShift,
      addShiftsBatch,
      deleteShiftsByJobAndRange,
      updateShift,
      deleteShift,
      duplicateShift,
      addBreakToShift,
      removeBreakFromShift,
      updateBreakInShift,
      resetToDemoData,
      exportDataJson,
      importDataJson,
      editingShift,
      setEditingShift,
      isAddModalOpen,
      setIsAddModalOpen,
      isRosterModalOpen,
      setIsRosterModalOpen,
      addModalDefaultDate,
      setAddModalDefaultDate,
      isPremium,
      setIsPremium,
      isSubscriptionModalOpen,
      setIsSubscriptionModalOpen,
      openSubscriptionModal,
      isCircadianModalOpen,
      setIsCircadianModalOpen,
      openCircadianModal,
    }),
    [
      license,
      companies,
      activeCompany,
      employees,
      leaves,
      isLeaveModalOpen,
      leaveModalInitialWorkerId,
      leaveModalInitialDate,
      jobs,
      shifts,
      professionalEvents,
      currentTab,
      activeJobFilter,
      selectedDate,
      darkMode,
      mobileFrameMode,
      activeClock,
      editingShift,
      isAddModalOpen,
      isRosterModalOpen,
      addModalDefaultDate,
      addJobFromAi,
      isSubscriptionModalOpen,
      isCircadianModalOpen,
    ],
  );
  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
};
export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error("useShift must be used within a ShiftProvider");
  }
  return context;
};
