"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminRequestRow } from "./api";

export type SSEStatus = "connecting" | "open" | "closed";

export type RealtimeCallbacks = {
  onNewRequest?: (row: AdminRequestRow) => void;
  onUpdatedRequest?: (row: AdminRequestRow) => void;
};

/**
 * Connects to /api/admin/events (SSE).
 * Server holds each connection ~8s, polls the DB every 2.5s, then closes.
 * EventSource auto-reconnects, sending Last-Event-ID so no events are lost.
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

    const es = new EventSource("/api/admin/events", { withCredentials: true });
    setStatus("connecting");

    es.onopen = () => setStatus("open");

    es.addEventListener("request.new", (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as AdminRequestRow;
        cbRef.current.onNewRequest?.(row);
        setLastEventAt(new Date());
      } catch {
        /* malformed payload */
      }
    });

    es.addEventListener("request.updated", (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as AdminRequestRow;
        cbRef.current.onUpdatedRequest?.(row);
        setLastEventAt(new Date());
      } catch {
        /* malformed payload */
      }
    });

    es.addEventListener("ping", () => {
      setStatus("open");
      setLastEventAt(new Date());
    });

    es.onerror = () => setStatus("connecting");

    return () => {
      es.close();
      setStatus("closed");
    };
  }, [enabled]);

  return { status, lastEventAt };
}
