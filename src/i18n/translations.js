import { sr } from "./locales/sr";
import { srCyrl } from "./locales/srCyrl";
import { en } from "./locales/en";
import { de } from "./locales/de";
import { ru } from "./locales/ru";
import { zh } from "./locales/zh";
import { ja } from "./locales/ja";
export * from "./types";
export const SUPPORTED_LANGUAGES = [
  {
    code: "sr",
    label: "Serbian (Latin)",
    nativeLabel: "Srpski (latinica)",
    flag: "\u{1F1F7}\u{1F1F8}",
  },
  {
    code: "sr-Cyrl",
    label: "Serbian (Cyrillic)",
    nativeLabel:
      "\u0421\u0440\u043F\u0441\u043A\u0438 (\u045B\u0438\u0440\u0438\u043B\u0438\u0446\u0430)",
    flag: "\u{1F1F7}\u{1F1F8}",
  },
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "\u{1F1EC}\u{1F1E7}",
  },
  {
    code: "de",
    label: "German",
    nativeLabel: "Deutsch",
    flag: "\u{1F1E9}\u{1F1EA}",
  },
  {
    code: "ru",
    label: "Russian",
    nativeLabel: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    flag: "\u{1F1F7}\u{1F1FA}",
  },
  {
    code: "zh",
    label: "Chinese (Simplified)",
    nativeLabel: "\u4E2D\u6587 (\u7B80\u4F53)",
    flag: "\u{1F1E8}\u{1F1F3}",
  },
  {
    code: "ja",
    label: "Japanese",
    nativeLabel: "\u65E5\u672C\u8A9E",
    flag: "\u{1F1EF}\u{1F1F5}",
  },
];
export const BASE_TRANSLATIONS = {
  sr,
  "sr-Cyrl": srCyrl,
  en,
  de,
  ru,
  zh,
  ja,
};
export const TRANSLATIONS = BASE_TRANSLATIONS;
