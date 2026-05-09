import { useState } from "react";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

const ENDPOINT_GROUPS = [
  {
    group: "Auth",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    endpoints: [
      { method: "POST", path: "/auth/login", desc: "Obtain JWT (email+password or phone+OTP)" },
      { method: "POST", path: "/auth/refresh", desc: "Refresh access token" },
      { method: "POST", path: "/auth/logout", desc: "Invalidate refresh token" },
      { method: "POST", path: "/auth/register", desc: "Citizen self-registration" },
      { method: "POST", path: "/auth/otp/send", desc: "Send OTP to phone/WhatsApp" },
      { method: "POST", path: "/auth/otp/verify", desc: "Verify OTP" },
    ],
  },
  {
    group: "Users",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    endpoints: [
      { method: "GET", path: "/users", desc: "List users (paginated, filterable by role)" },
      { method: "POST", path: "/users", desc: "Create internal user (Admin only)" },
      { method: "GET", path: "/users/{id}", desc: "Get user profile" },
      { method: "PATCH", path: "/users/{id}", desc: "Update user" },
      { method: "DELETE", path: "/users/{id}", desc: "Deactivate user (soft delete)" },
      { method: "GET", path: "/users/me", desc: "Current authenticated user profile" },
    ],
  },
  {
    group: "Reports",
    color: "bg-green-100 text-green-800 border-green-200",
    endpoints: [
      { method: "GET", path: "/reports", desc: "List reports (filter: status, channel, category, bairro, date_range)" },
      { method: "POST", path: "/reports", desc: "Submit new report (citizen or channel adapter)" },
      { method: "GET", path: "/reports/{id}", desc: "Get report detail" },
      { method: "PATCH", path: "/reports/{id}", desc: "Update report status / priority (Manager+)" },
      { method: "GET", path: "/reports/{id}/timeline", desc: "Full status/comment history" },
    ],
  },
  {
    group: "Tickets",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    endpoints: [
      { method: "GET", path: "/tickets", desc: "List tickets (filter: status, assigned_to, priority)" },
      { method: "POST", path: "/tickets", desc: "Create ticket from report (Manager+)" },
      { method: "GET", path: "/tickets/{id}", desc: "Get ticket detail" },
      { method: "PATCH", path: "/tickets/{id}", desc: "Update ticket (status, assigned_to, due_date)" },
      { method: "POST", path: "/tickets/{id}/comments", desc: "Add comment (staff only)" },
      { method: "GET", path: "/tickets/{id}/comments", desc: "List comments (filter: is_internal)" },
    ],
  },
  {
    group: "Webhooks",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    endpoints: [
      { method: "POST", path: "/webhooks/whatsapp", desc: "Incoming WhatsApp message" },
      { method: "POST", path: "/webhooks/sms", desc: "Incoming SMS (Africa's Talking)" },
      { method: "POST", path: "/webhooks/ussd", desc: "USSD session handler" },
      { method: "POST", path: "/webhooks/messenger", desc: "Facebook Messenger webhook" },
    ],
  },
  {
    group: "Notifications",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    endpoints: [
      { method: "GET", path: "/notifications", desc: "List (filter: user_id, status, type)" },
      { method: "POST", path: "/notifications", desc: "Send ad-hoc notification (Manager+)" },
      { method: "GET", path: "/notifications/{id}", desc: "Get notification detail" },
    ],
  },
  {
    group: "Analytics",
    color: "bg-sky-100 text-sky-800 border-sky-200",
    endpoints: [
      { method: "GET", path: "/analytics/summary", desc: "Totals: reports by status, by channel, by category" },
      { method: "GET", path: "/analytics/reports/trend", desc: "Daily/weekly report count trend (date_range param)" },
      { method: "GET", path: "/analytics/tickets/resolution-time", desc: "Avg resolution time by category" },
      { method: "GET", path: "/analytics/channels/volume", desc: "Report volume per channel" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-600 text-white",
  POST: "bg-green-600 text-white",
  PATCH: "bg-amber-500 text-white",
  DELETE: "bg-red-600 text-white",
  PUT: "bg-purple-600 text-white",
};

const OPENAPI_YAML = `# OP1NA1 REST API Contract — v1
# Base URL: https://api.mulenvos.gv.ao/api/v1
# Auth: Bearer JWT (Authorization: Bearer <token>)
# Versioning: URL path (/api/v1/, /api/v2/) — never query string
# Content-Type: application/json
# All timestamps: ISO 8601 UTC (2025-05-09T14:30:00Z)

openapi: "3.0.3"
info:
  title: OP1NA1 API
  version: "1.0.0"
  description: Omnichannel Citizen Participation Platform — Mulenvos Municipality

servers:
  - url: https://api.mulenvos.gv.ao/api/v1
    description: Production
  - url: http://localhost:8000/api/v1
    description: Local development

# ─────────────────────────────────────────────
# STANDARD RESPONSE ENVELOPES
# ─────────────────────────────────────────────
# Success (200/201):
# {
#   "success": true,
#   "data": { ... } or [ ... ],
#   "meta": { "page": 1, "per_page": 20, "total": 150 }
# }
#
# Error (4xx/5xx):
# {
#   "success": false,
#   "error": {
#     "code": "REPORT_NOT_FOUND",
#     "message": "Report with id 999 does not exist.",
#     "details": {}
#   }
# }

# ─────────────────────────────────────────────
# EXAMPLE: POST /reports
# ─────────────────────────────────────────────
# Request:
# {
#   "channel": "whatsapp",
#   "category": "road",
#   "subcategory": "pothole",
#   "title": "Buraco na Rua Comandante Gika",
#   "description": "Buraco grande que danifica veículos",
#   "latitude": -8.8383,
#   "longitude": 13.2344,
#   "bairro": "Rangel",
#   "media_urls": ["/media/reports/abc123.jpg"]
# }
#
# Response 201:
# {
#   "success": true,
#   "data": {
#     "id": 42,
#     "reference_code": "REP-2025-00042",
#     "status": "received",
#     "created_at": "2025-05-09T14:30:00Z"
#   }
# }

# ─────────────────────────────────────────────
# EXAMPLE: GET /analytics/summary
# ─────────────────────────────────────────────
# Response 200:
# {
#   "success": true,
#   "data": {
#     "totals": {
#       "reports": { "received": 120, "in_progress": 45, "resolved": 230, "rejected": 12 },
#       "tickets": { "open": 33, "in_progress": 45, "closed": 201 }
#     },
#     "by_channel": [
#       { "channel": "whatsapp", "count": 189 },
#       { "channel": "ussd",     "count": 104 },
#       { "channel": "web",      "count":  82 }
#     ],
#     "by_category": [
#       { "category": "road",        "count": 210 },
#       { "category": "water",       "count":  98 },
#       { "category": "electricity", "count":  76 },
#       { "category": "sanitation",  "count":  23 }
#     ]
#   }
# }

# ─────────────────────────────────────────────
# PAGINATION PARAMS (all list endpoints)
# ─────────────────────────────────────────────
# ?page=1&per_page=20&sort=created_at&order=desc

# ─────────────────────────────────────────────
# API VERSIONING POLICY
# ─────────────────────────────────────────────
# - Current version: v1 (stable)
# - Breaking changes → new path version (/api/v2/)
# - Old versions supported for minimum 6 months after v2 release
# - Version header (informational only): X-API-Version: 1.0.0
# - Sunset header on deprecated versions:
#     Sunset: Sat, 31 Dec 2025 00:00:00 GMT

# ─────────────────────────────────────────────
# RATE LIMITING (enforced at Nginx level)
# ─────────────────────────────────────────────
# - Webhook endpoints:      60 req/min per IP
# - Auth endpoints:         10 req/min per IP
# - All other endpoints:   120 req/min per JWT

# ─────────────────────────────────────────────
# OFFLINE / LOW-CONNECTIVITY POLICY
# ─────────────────────────────────────────────
# - POST /reports accepts idempotency key header:
#     Idempotency-Key: <uuid>
# - Duplicate submissions with same key return 200 (not 201)
# - Mobile client should queue submissions locally and retry`;

export default function APIContract() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          REST API Contract
        </h1>
        <p className="text-muted-foreground">
          OP1NA1 v1 — Base URL:{" "}
          <code className="font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">
            /api/v1
          </code>
          {" "}— Auth: Bearer JWT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Endpoint Index</h2>
          {ENDPOINT_GROUPS.map((group) => (
            <div
              key={group.group}
              className={cn(
                "bg-card border border-border rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer",
                activeGroup === group.group && "ring-2 ring-primary"
              )}
              onClick={() => setActiveGroup(activeGroup === group.group ? null : group.group)}
              data-testid={`group-${group.group.toLowerCase()}`}
            >
              <div className={cn("px-4 py-2.5 border-b border-border font-semibold text-sm", group.color)}>
                {group.group}
              </div>
              {(activeGroup === group.group || activeGroup === null) && (
                <ul className="divide-y divide-border/50">
                  {group.endpoints.map((ep, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                      <span className={cn("shrink-0 font-mono text-xs font-bold px-1.5 py-0.5 rounded mt-0.5", METHOD_COLORS[ep.method] || "bg-gray-200 text-gray-800")}>
                        {ep.method}
                      </span>
                      <div className="min-w-0">
                        <code className="font-mono text-xs text-foreground">{ep.path}</code>
                        <p className="text-xs text-muted-foreground mt-0.5">{ep.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Full Spec (YAML)</h2>
          <CodeBlock code={OPENAPI_YAML} language="yaml" />
        </div>
      </div>
    </div>
  );
}
