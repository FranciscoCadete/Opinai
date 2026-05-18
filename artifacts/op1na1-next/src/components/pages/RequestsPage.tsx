"use client";

// There is no standalone RequestsPage in op1na1-architecture — requests are managed
// from AdminDashboard. This page exposes a dedicated route at /admin/requests.
// Implement using the requests table/panel extracted from AdminDashboard.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { listAdminRequests, type AdminRequestRow, type AdminRequestsQuery } from "@/lib/api";

export default function RequestsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AdminRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<AdminRequestsQuery>({ page: 1, pageSize: 25 });

  useEffect(() => {
    setLoading(true);
    listAdminRequests(query)
      .then(r => { setItems(r.items); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <main id="main-content" style={{ padding: 32, color: "#e8edf4", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 300, color: "#00c49a", marginBottom: 16 }}>
        {t("requests.title", "Pedidos")} <span style={{ color: "#6b7d96", fontSize: 14, fontFamily: "'DM Mono', monospace" }}>({total})</span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          placeholder={t("requests.search", "Pesquisar pedidos…")}
          aria-label={t("requests.search", "Pesquisar pedidos…")}
          onChange={e => setQuery(q => ({ ...q, search: e.target.value || undefined, page: 1 }))}
          style={{ padding: "9px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,.1)", background: "#111720", color: "#e8edf4", fontFamily: "'DM Sans', sans-serif", fontSize: 13, width: 280, outline: "none" }}
        />
      </div>

      {loading ? (
        <div role="status" aria-live="polite" style={{ color: "#6b7d96", fontSize: 13 }}>{t("common.loading")}</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#6b7d96", fontSize: 13 }}>{t("requests.noResults")}</div>
      ) : (
        <table aria-label={t("requests.title")} style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "#6b7d96", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.07)", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.08em" }}>{t("requests.columns.ticketId")}</th>
              <th style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.07)", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.08em" }}>{t("requests.columns.description")}</th>
              <th style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.07)", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.08em" }}>{t("requests.columns.status")}</th>
              <th style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.07)", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.08em" }}>{t("requests.columns.priority")}</th>
              <th style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.07)", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.08em" }}>{t("requests.columns.channel")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ padding: "10px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#4fa3f7" }}>{row.ticketId}</td>
                <td style={{ padding: "10px 12px", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description}</td>
                <td style={{ padding: "10px 12px" }}>{t(`requests.status.${row.status}`, row.status)}</td>
                <td style={{ padding: "10px 12px" }}>{t(`requests.priority.${row.priority}`, row.priority)}</td>
                <td style={{ padding: "10px 12px" }}>{row.channel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
        <button
          disabled={query.page === 1}
          onClick={() => setQuery(q => ({ ...q, page: (q.page ?? 1) - 1 }))}
          aria-label={t("common.previous")}
          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "#6b7d96", cursor: query.page === 1 ? "not-allowed" : "pointer", fontSize: 12 }}
        >
          {t("common.previous")}
        </button>
        <span style={{ color: "#6b7d96", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
          {query.page} / {Math.max(1, Math.ceil(total / (query.pageSize ?? 25)))}
        </span>
        <button
          disabled={(query.page ?? 1) >= Math.ceil(total / (query.pageSize ?? 25))}
          onClick={() => setQuery(q => ({ ...q, page: (q.page ?? 1) + 1 }))}
          aria-label={t("common.next")}
          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "#6b7d96", cursor: "pointer", fontSize: 12 }}
        >
          {t("common.next")}
        </button>
      </div>
    </main>
  );
}
