"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register SW
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Detect new SW version available
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              // New version installed — tell it to activate immediately
              next.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((err) => console.warn("[SW] registration failed:", err));

    // When the SW signals a new version has taken control, reload for fresh assets
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    // Flush offline queue when SW sends FLUSH_OFFLINE_QUEUE message
    // (fired by Background Sync event in sw.js)
    navigator.serviceWorker.addEventListener("message", async (event: MessageEvent) => {
      if ((event.data as { type?: string })?.type === "FLUSH_OFFLINE_QUEUE") {
        const { flushQueue } = await import("@/lib/offlineQueue");
        const result = await flushQueue();
        if (result.sent > 0) {
          console.info(`[offline-queue] flushed ${result.sent} queued request(s)`);
        }
      }
    });

    // Also flush on window "online" event (fallback for browsers without BackgroundSync)
    const onOnline = async () => {
      const { flushQueue } = await import("@/lib/offlineQueue");
      await flushQueue();
    };
    window.addEventListener("online", onOnline);

    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
