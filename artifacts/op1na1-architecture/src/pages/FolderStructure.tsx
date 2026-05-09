import CodeBlock from "@/components/CodeBlock";

const FOLDER_TREE = `op1na1-backend/
│
├── app/                          # Main application package
│   ├── __init__.py
│   ├── main.py                   # FastAPI app factory, middleware, router registration
│   ├── config.py                 # Settings via pydantic-settings (reads .env)
│   │
│   ├── core/                     # Cross-cutting concerns
│   │   ├── __init__.py
│   │   ├── security.py           # JWT creation/validation, password hashing
│   │   ├── dependencies.py       # FastAPI Depends: get_db, get_current_user, require_role
│   │   ├── middleware.py         # Rate limiting, request ID, CORS
│   │   ├── exceptions.py         # Custom exception classes + handlers
│   │   └── logging.py            # Structured logging setup (structlog)
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   ├── session.py            # SQLAlchemy engine + SessionLocal factory
│   │   └── base.py               # Base declarative model
│   │
│   ├── models/                   # SQLAlchemy ORM models (one file per entity)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── report.py
│   │   ├── ticket.py
│   │   ├── ticket_comment.py
│   │   ├── notification.py
│   │   ├── channel.py
│   │   └── analytics_event.py
│   │
│   ├── schemas/                  # Pydantic v2 schemas (request/response DTOs)
│   │   ├── __init__.py
│   │   ├── user.py               # UserCreate, UserUpdate, UserOut, UserMini
│   │   ├── report.py             # ReportCreate, ReportUpdate, ReportOut, ReportList
│   │   ├── ticket.py
│   │   ├── ticket_comment.py
│   │   ├── notification.py
│   │   ├── analytics.py
│   │   └── common.py             # PaginatedResponse, ErrorResponse, SuccessEnvelope
│   │
│   ├── repositories/             # Data access layer (no business logic here)
│   │   ├── __init__.py
│   │   ├── base.py               # Generic CRUD repository
│   │   ├── user_repository.py
│   │   ├── report_repository.py
│   │   ├── ticket_repository.py
│   │   └── notification_repository.py
│   │
│   ├── services/                 # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py       # Login, OTP, JWT lifecycle
│   │   ├── user_service.py
│   │   ├── report_service.py     # Report intake, validation, reference code gen
│   │   ├── ticket_service.py     # Ticket lifecycle, assignment, escalation
│   │   ├── notification_service.py # Dispatch routing, Celery task enqueue
│   │   └── analytics_service.py  # Aggregation queries
│   │
│   ├── channels/                 # Channel adapters (inbound message normalisation)
│   │   ├── __init__.py
│   │   ├── base.py               # Abstract ChannelAdapter with normalise() method
│   │   ├── whatsapp.py           # Parse WhatsApp webhook -> ReportCreate schema
│   │   ├── sms.py                # Africa's Talking SMS adapter
│   │   ├── ussd.py               # USSD session state machine
│   │   ├── messenger.py          # Facebook Messenger adapter
│   │   ├── web.py                # Direct API (web portal / mobile app)
│   │   └── reply.py              # Outbound reply helpers per channel
│   │
│   ├── routers/                  # FastAPI route handlers (thin controllers)
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── reports.py
│   │   │   ├── tickets.py
│   │   │   ├── notifications.py
│   │   │   ├── analytics.py
│   │   │   └── webhooks.py       # /webhooks/whatsapp, /sms, /ussd, /messenger
│   │   └── health.py             # GET /health (no auth)
│   │
│   └── tasks/                    # Celery async tasks
│       ├── __init__.py
│       ├── celery_app.py          # Celery instance + broker config
│       ├── notification_tasks.py  # send_sms_task, send_whatsapp_task, send_push_task
│       └── report_tasks.py       # auto_escalation_task, daily_digest_task
│
├── alembic/                      # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/                 # Migration files (auto-generated)
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py               # Fixtures: test DB, test client, mock user
│   ├── unit/
│   │   ├── test_report_service.py
│   │   ├── test_ticket_service.py
│   │   └── test_auth_service.py
│   └── integration/
│       ├── test_reports_api.py
│       ├── test_tickets_api.py
│       └── test_webhooks.py
│
├── scripts/
│   ├── seed_db.py                # Seed channels + admin user
│   ├── create_superadmin.py
│   └── backup_mysql.sh           # Daily mysqldump cron script
│
├── deploy/
│   ├── nginx/
│   │   └── op1na1.conf           # Nginx vhost: proxy_pass + rate limiting + TLS
│   ├── systemd/
│   │   ├── op1na1-api.service    # FastAPI via gunicorn/uvicorn
│   │   └── op1na1-worker.service # Celery worker
│   └── env.example               # .env template (never commit .env)
│
├── .env.example
├── .gitignore
├── alembic.ini
├── requirements.txt              # Pin all versions: fastapi==0.111.0
├── requirements-dev.txt          # pytest, httpx, black, ruff, mypy
├── Makefile                      # make dev, make migrate, make test, make deploy
└── README.md`;

const NAMING_RULES = [
  { pattern: "Python files", convention: "snake_case.py", example: "report_service.py" },
  { pattern: "Classes", convention: "PascalCase", example: "ReportService, UserOut" },
  { pattern: "Functions / variables", convention: "snake_case", example: "get_current_user, report_id" },
  { pattern: "Constants", convention: "UPPER_SNAKE_CASE", example: "DATABASE_URL, SECRET_KEY" },
  { pattern: "DB table names", convention: "snake_case plural", example: "reports, ticket_comments" },
  { pattern: "DB column names", convention: "snake_case", example: "reference_code, created_at" },
  { pattern: "API endpoints", convention: "kebab-case", example: "/reports/{id}/status-history" },
  { pattern: "Environment variables", convention: "UPPER_SNAKE_CASE", example: "DATABASE_URL, JWT_SECRET" },
  { pattern: "Branch naming", convention: "type/short-description", example: "feature/report-intake, fix/ussd-session-bug, release/v1.1.0" },
];

const MAKE_TARGETS = [
  { target: "make dev", desc: "Start FastAPI + Celery in dev mode with auto-reload" },
  { target: "make migrate", desc: "Apply pending Alembic migrations" },
  { target: "make migrate-create", desc: "Generate a new migration file" },
  { target: "make test", desc: "Run pytest with coverage report" },
  { target: "make lint", desc: "Run ruff + mypy type checks" },
  { target: "make seed", desc: "Seed channels and create initial admin user" },
  { target: "make deploy", desc: "Pull latest, migrate, reload systemd services" },
  { target: "make backup", desc: "Run mysqldump to /backups/ with timestamp" },
];

export default function FolderStructure() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Repository Structure
        </h1>
        <p className="text-muted-foreground">
          Monolithic Python project layout for{" "}
          <code className="font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">op1na1-backend</code>.
          Modular by domain, flat by default.
        </p>
      </div>

      <CodeBlock code={FOLDER_TREE} language="text" />

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Naming Conventions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-naming">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-6 font-medium text-foreground">Pattern</th>
                <th className="text-left py-2 pr-6 font-medium text-foreground">Convention</th>
                <th className="text-left py-2 font-medium text-foreground">Example</th>
              </tr>
            </thead>
            <tbody>
              {NAMING_RULES.map((r) => (
                <tr key={r.pattern} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="py-2.5 pr-6 font-medium text-foreground">{r.pattern}</td>
                  <td className="py-2.5 pr-6">
                    <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded text-foreground">{r.convention}</code>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-muted-foreground">{r.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Makefile Targets</h2>
        <div className="space-y-2">
          {MAKE_TARGETS.map((t) => (
            <div key={t.target} className="flex items-start gap-4 py-2 border-b border-border/50 last:border-0">
              <code className="font-mono text-xs bg-sidebar text-sidebar-foreground px-2.5 py-1 rounded shrink-0 min-w-[160px]">{t.target}</code>
              <span className="text-sm text-muted-foreground">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Architecture Principle</h3>
        <p className="text-sm text-amber-700">
          Routers are thin controllers — they validate input and delegate to services. Services contain all business logic and call repositories for data access. Repositories speak only to the database. This separation makes testing and future extraction into services trivial, without premature microservice complexity.
        </p>
      </div>
    </div>
  );
}
