import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS, type LangCode } from "@/lib/i18n";

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function LanguageToggle({ className, style }: Props) {
  const { i18n } = useTranslation();
  const current = i18n.language as LangCode;

  function change(code: LangCode) {
    i18n.changeLanguage(code);
    // sync <html lang> for screen readers
    document.documentElement.lang = code === "pt-AO" ? "pt" : code;
  }

  return (
    <div
      role="group"
      aria-label="Seleccionar idioma"
      className={className}
      style={{
        display: "flex",
        gap: 2,
        ...style,
      }}
    >
      {SUPPORTED_LANGS.map((lang) => {
        const active = current === lang.code || (!SUPPORTED_LANGS.find(l => l.code === current) && lang.code === "pt-AO");
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => change(lang.code)}
            aria-pressed={active}
            aria-label={lang.wip ? `${lang.full} (em desenvolvimento)` : lang.full}
            title={lang.wip ? `${lang.full} — em desenvolvimento` : lang.full}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.1em",
              padding: "3px 8px",
              borderRadius: 4,
              border: `1px solid ${active ? "rgba(0,196,154,.4)" : "rgba(255,255,255,.08)"}`,
              background: active ? "rgba(0,196,154,.08)" : "transparent",
              color: active ? "#00c49a" : lang.wip ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.4)",
              cursor: lang.wip ? "not-allowed" : "pointer",
              transition: "all .15s",
              position: "relative",
            }}
          >
            {lang.label}
            {lang.wip && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "rgba(247,184,79,.6)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
