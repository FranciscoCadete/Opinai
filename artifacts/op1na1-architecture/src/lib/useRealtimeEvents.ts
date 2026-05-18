import { useEffect, useRef, useState } from "react";
import type { AdminRequestRow } from "./api";

export type SSEStatus = "connecting" | "open" | "closed";

export type RealtimeCallbacks = {
  onNewRequest?: (row: AdminRequestRow) => void;
  onUpdatedRequest?: (row: AdminRequestRow) => void;
};

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  "/api";

/**
 * Connects to /api/admin/events (SSE).
 *
 * The server holds each connection for ~8s, polls the DB every 2.5s, then
 * closes. The browser EventSource auto-reconnects immediately, sending
 * Last-Event-ID so no events are lost. Net latency: ~2.5s vs 30s polling.
 */
export function useRealtimeEvents(
  callbacks: RealtimeCallbacks,
  enabled = true,
) {
  const [status, setStatus] = useState<SSEStatus>("closed");
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource(`${API_BASE}/admin/events`, {
      withCredentials: true,
    });

    setStatus("connecting");

    es.onopen = () => setStatus("open");

    es.addEventListener("request.new", (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as AdminRequestRow;
        cbRef.current.onNewRequest?.(row);
        setLastEventAt(new Date());
      } catch {
        // malformed payload — ignore
      }
    });

    es.addEventListener("request.updated", (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as AdminRequestRow;
        cbRef.current.onUpdatedRequest?.(row);
        setLastEventAt(new Date());
      } catch {
        // malformed payload — ignore
      }
    });

    es.addEventListener("ping", () => {
      // ping keeps status fresh; server closes and browser reconnects
      setStatus("open");
      setLastEventAt(new Date());
    });

    // On connection error EventSource auto-reconnects (SSE spec)
    es.onerror = () => setStatus("connecting");

    return () => {
      es.close();
      setStatus("closed");
    };
  }, [enabled]);

  return { status, lastEventAt };
}
