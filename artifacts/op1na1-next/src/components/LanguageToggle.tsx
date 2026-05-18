"use client";

import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS } from "@/lib/i18n";
import type { CSSProperties } from "react";

export default function LanguageToggle({ style }: { style?: CSSProperties }) {
  const { i18n } = useTranslation();
  const current = i18n.language ?? "pt-AO";

  return (
    <div
      role="group"
      aria-label="Seleccionar idioma"
      style={{ display: "flex", gap: 4, ...style }}
    >
      {SUPPORTED_LANGS.map(lang => {
        const active = current === lang.code || current.startsWith(lang.code.split("-")[0]);
        return (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            aria-pressed={active}
            title={lang.wip ? `${lang.full} (em desenvolvimento)` : lang.full}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              padding: "2px 7px",
              borderRadius: 10,
              border: `1px solid ${active ? "rgba(0,196,154,.5)" : "rgba(255,255,255,.1)"}`,
              background: active ? "rgba(0,196,154,.1)" : "transparent",
              color: active ? "#00c49a" : "#6b7d96",
              cursor: "pointer",
              letterSpacing: "0.08em",
              opacity: lang.wip && !active ? 0.5 : 1,
              transition: "all .14s",
            }}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}
