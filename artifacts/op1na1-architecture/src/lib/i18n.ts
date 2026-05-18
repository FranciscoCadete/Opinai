import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ptAO from "../locales/pt-AO.json";
import kmb  from "../locales/kmb.json";
import umb  from "../locales/umb.json";

export const SUPPORTED_LANGS: {
  code: string;
  label: string;
  full: string;
  wip?: boolean;
}[] = [
  { code: "pt-AO", label: "PT",  full: "Português (AO)" },
  { code: "kmb",   label: "KMB", full: "Kimbundu", wip: true },
  { code: "umb",   label: "UMB", full: "Umbundu",  wip: true },
];

export type LangCode = string;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-AO": { translation: ptAO },
      kmb:     { translation: kmb  },
      umb:     { translation: umb  },
    },
    fallbackLng: "pt-AO",
    supportedLngs: ["pt-AO", "kmb", "umb"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "op1na1_lang",
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
