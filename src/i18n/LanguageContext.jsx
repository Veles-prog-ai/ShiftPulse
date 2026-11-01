import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { BASE_TRANSLATIONS, SUPPORTED_LANGUAGES } from "./translations";
import { en } from "./locales/en";
const LANGUAGE_STORAGE_KEY = "shiftpulse_lang_preference_v1";
const CUSTOM_LANG_STORAGE_KEY = "shiftpulse_custom_languages_v1";
const LanguageContext = createContext(void 0);
export const LanguageProvider = ({ children }) => {
  const [customLanguages, setCustomLanguages] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_LANG_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse custom languages from storage:", e);
    }
    return [];
  });
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved) {
        return saved;
      }
      const navLang = navigator.language.toLowerCase();
      if (
        navLang.startsWith("sr") ||
        navLang.startsWith("bs") ||
        navLang.startsWith("hr")
      ) {
        return "sr";
      }
      if (navLang.startsWith("de")) return "de";
      if (navLang.startsWith("ru")) return "ru";
      if (navLang.startsWith("zh")) return "zh";
      if (navLang.startsWith("ja")) return "ja";
    } catch {}
    return "sr";
  });
  const persistCustomLanguages = (list) => {
    setCustomLanguages(list);
    try {
      localStorage.setItem(CUSTOM_LANG_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to store custom languages:", e);
    }
  };
  const setLanguage = (newLang) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {}
  };
  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);
  const supportedLanguages = useMemo(() => {
    const customOptions = customLanguages.map((c) => ({
      code: c.code,
      label: c.label,
      nativeLabel: c.nativeLabel,
      flag: c.flag || "\u{1F310}",
      isCustom: true,
    }));
    return [...SUPPORTED_LANGUAGES, ...customOptions];
  }, [customLanguages]);
  const t = useMemo(() => {
    const customMatch = customLanguages.find((c) => c.code === language);
    if (customMatch && customMatch.translations) {
      return deepMergeFallback(en, customMatch.translations);
    }
    if (BASE_TRANSLATIONS[language]) {
      return BASE_TRANSLATIONS[language];
    }
    return BASE_TRANSLATIONS.sr || en;
  }, [language, customLanguages]);
  const importLanguagePack = (pack) => {
    if (!pack || !pack.code || !pack.nativeLabel || !pack.translations) {
      return {
        success: false,
        error:
          "Missing required fields: code, nativeLabel, or translations object.",
      };
    }
    const cleanCode = pack.code.trim().toLowerCase();
    if (["sr", "sr-cyrl", "en", "de", "ru", "zh", "ja"].includes(cleanCode)) {
      return {
        success: false,
        error: "Cannot override built-in system language codes.",
      };
    }
    const mergedTranslations = deepMergeFallback(en, pack.translations);
    const updatedPack = {
      code: cleanCode,
      label: pack.label || pack.nativeLabel,
      nativeLabel: pack.nativeLabel,
      flag: pack.flag || "\u{1F310}",
      translations: mergedTranslations,
    };
    const existingIndex = customLanguages.findIndex(
      (c) => c.code === cleanCode,
    );
    let nextList;
    if (existingIndex >= 0) {
      nextList = [...customLanguages];
      nextList[existingIndex] = updatedPack;
    } else {
      nextList = [...customLanguages, updatedPack];
    }
    persistCustomLanguages(nextList);
    setLanguage(cleanCode);
    return { success: true };
  };
  const deleteCustomLanguage = (code) => {
    const nextList = customLanguages.filter((c) => c.code !== code);
    persistCustomLanguages(nextList);
    if (language === code) {
      setLanguage("sr");
    }
  };
  const downloadTranslationTemplate = () => {
    const templateObject = {
      code: "fr",
      label: "French",
      nativeLabel: "Fran\xE7ais",
      flag: "\u{1F1EB}\u{1F1F7}",
      translations: en,
    };
    const jsonStr = JSON.stringify(templateObject, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shiftpulse_translation_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const getWeekdayName = (dayIndex0Sun, short = false) => {
    const list = short ? t.calendar.daysOfWeek : t.calendar.daysOfWeekFull;
    return list[dayIndex0Sun % 7];
  };
  const getMonthName = (monthIndex0Jan) => {
    return t.calendar.months[monthIndex0Jan % 12];
  };
  const formatMonthYear = (date) => {
    const month = getMonthName(date.getMonth());
    const year = date.getFullYear();
    if (language === "zh" || language === "ja") {
      return `${year}\u5E74 ${month}`;
    }
    return `${month} ${year}`;
  };
  const formatDate = (
    dateStr,
    options = { includeDayOfWeek: true, short: false },
  ) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    const dayOfWeek = getWeekdayName(dateObj.getDay(), options.short);
    const monthName = getMonthName(m);
    if (language === "sr") {
      const monthPart2 = options.short
        ? monthName.slice(0, 3).toLowerCase()
        : monthName.toLowerCase();
      return options.includeDayOfWeek
        ? `${dayOfWeek}, ${d}. ${monthPart2} ${y}.`
        : `${d}. ${monthPart2} ${y}.`;
    }
    if (language === "sr-Cyrl") {
      const monthPart2 = options.short
        ? monthName.slice(0, 3).toLowerCase()
        : monthName.toLowerCase();
      return options.includeDayOfWeek
        ? `${dayOfWeek}, ${d}. ${monthPart2} ${y}.`
        : `${d}. ${monthPart2} ${y}.`;
    }
    if (language === "de") {
      const monthPart2 = options.short
        ? `${monthName.slice(0, 3)}.`
        : monthName;
      return options.includeDayOfWeek
        ? `${dayOfWeek}, ${d}. ${monthPart2} ${y}`
        : `${d}. ${monthPart2} ${y}`;
    }
    if (language === "ru") {
      const monthPart2 = options.short
        ? `${monthName.slice(0, 3).toLowerCase()}.`
        : monthName.toLowerCase();
      return options.includeDayOfWeek
        ? `${dayOfWeek}, ${d} ${monthPart2} ${y} \u0433.`
        : `${d} ${monthPart2} ${y} \u0433.`;
    }
    if (language === "zh") {
      return options.includeDayOfWeek
        ? `${y}\u5E74${m + 1}\u6708${d}\u65E5 ${dayOfWeek}`
        : `${y}\u5E74${m + 1}\u6708${d}\u65E5`;
    }
    if (language === "ja") {
      return options.includeDayOfWeek
        ? `${y}\u5E74${m + 1}\u6708${d}\u65E5(${dayOfWeek})`
        : `${y}\u5E74${m + 1}\u6708${d}\u65E5`;
    }
    const monthPart = options.short ? monthName.slice(0, 3) : monthName;
    return options.includeDayOfWeek
      ? `${dayOfWeek}, ${monthPart} ${d}, ${y}`
      : `${monthPart} ${d}, ${y}`;
  };
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages,
      customLanguages,
      importLanguagePack,
      deleteCustomLanguage,
      downloadTranslationTemplate,
      formatDate,
      formatMonthYear,
      getWeekdayName,
      getMonthName,
    }),
    [language, t, supportedLanguages, customLanguages],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
function deepMergeFallback(fallback, custom) {
  if (!custom || typeof custom !== "object") return fallback;
  const result = { ...fallback };
  for (const key of Object.keys(fallback)) {
    if (custom[key] !== void 0) {
      if (
        typeof fallback[key] === "object" &&
        !Array.isArray(fallback[key]) &&
        fallback[key] !== null
      ) {
        result[key] = deepMergeFallback(fallback[key], custom[key]);
      } else {
        result[key] = custom[key];
      }
    }
  }
  return result;
}
