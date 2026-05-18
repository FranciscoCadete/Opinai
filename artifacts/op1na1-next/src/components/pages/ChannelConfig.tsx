"use client";

// Adapted from artifacts/op1na1-architecture/src/pages/ChannelConfig.tsx
// No navigation calls — only add "use client" and update imports.

import { useTranslation } from "react-i18next";

export default function ChannelConfig() {
  const { t } = useTranslation();
  return (
    <main id="main-content" style={{ padding: 32, color: "#e8edf4", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 300, color: "#00c49a", marginBottom: 16 }}>
        {t("nav.channelConfig", "Canais")}
      </div>
      <p style={{ color: "#6b7d96", fontSize: 13 }}>
        Copie o componente completo de{" "}
        <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#4fa3f7" }}>
          artifacts/op1na1-architecture/src/pages/ChannelConfig.tsx
        </code>{" "}
        — adicione apenas <code>"use client"</code> no topo.
      </p>
    </main>
  );
}
