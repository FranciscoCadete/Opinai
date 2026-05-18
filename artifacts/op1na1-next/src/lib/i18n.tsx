"use client";

import i18next from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { type ReactNode, useEffect, useState } from "react";
import ptAO from "@/locales/pt-AO.json";
import kmb from "@/locales/kmb.json";
import umb from "@/locales/umb.json";

export const SUPPORTED_LANGS: {
  code: string;
  label: string;
  full: string;
  wip?: boolean;
}[] = [
  { code: "pt-AO", label: "PT", full: "Português (AO)" },
  { code: "kmb", label: "KMB", full: "Kimbundu", wip: true },
  { code: "umb", label: "UMB", full: "Umbundu", wip: true },
];

const i18nInstance = i18next.createInstance();

i18nInstance
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-AO": { translation: ptAO },
      kmb: { translation: kmb },
      umb: { translation: umb },
    },
    fallbackLng: "pt-AO",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "op1na1_lang",
      caches: ["localStorage"],
    },
  });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (i18nInstance.isInitialized) {
      setReady(true);
    } else {
      i18nInstance.on("initialized", () => setReady(true));
    }
    // Sync html lang attribute
    document.documentElement.lang =
      i18nInstance.language?.split("-")[0] ?? "pt";
  }, []);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>
  );
}

export default i18nInstance;
