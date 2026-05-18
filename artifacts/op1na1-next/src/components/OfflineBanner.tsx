"use client";

import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [offline, setOffline]   = useState(false);
  const [pending, setPending]   = useState(0);
  const [flushed, setFlushed]   = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Sync initial state — don't flash on first render
    setOffline(!navigator.onLine);

    const refreshCount = async () => {
      const { count } = await import("@/lib/offlineQueue");
      setPending(await count());
    };

    const onOffline = async () => {
      setOffline(true);
      setFlushed(null);
      await refreshCount();
    };

    const onOnline = async () => {
      setOffline(false);
      const { flushQueue } = await import("@/lib/offlineQueue");
      const result = await flushQueue();
      if (result.sent > 0) {
        setFlushed(result.sent);
        setPending(result.remaining);
        // Clear confirmation after 6s
        setTimeout(() => setFlushed(null), 6000);
      }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online",  onOnline);

    if (!navigator.onLine) void refreshCount();

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online",  onOnline);
    };
  }, []);

  if (!offline && flushed === null) return null;

  const bgColor = offline ? "rgba(247,111,111,.12)" : "rgba(0,196,154,.12)";
  const border  = offline ? "1px solid rgba(247,111,111,.4)" : "1px solid rgba(0,196,154,.4)";
  const color   = offline ? "#f76f6f" : "#00c49a";

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: bgColor,
        backdropFilter: "blur(6px)",
        borderBottom: border,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color,
        textAlign: "center",
      }}
    >
      {offline ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="1"/>
          </svg>
          <span>
            Sem ligação à internet.{" "}
            {pending > 0
              ? `${pending} pedido${pending > 1 ? "s" : ""} guardado${pending > 1 ? "s" : ""} — será${pending > 1 ? "ão" : ""} enviado${pending > 1 ? "s" : ""} quando voltar a rede.`
              : "Os seus pedidos serão guardados e enviados quando voltar a rede."}
          </span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>
            Ligação restaurada.{" "}
            {flushed !== null && flushed > 0
              ? `${flushed} pedido${flushed > 1 ? "s" : ""} enviado${flushed > 1 ? "s" : ""} com sucesso.`
              : ""}
          </span>
        </>
      )}
    </div>
  );
}
