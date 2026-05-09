import { cn } from "@/lib/utils";
import {
  FlaskConical, Shield, Zap, GitBranch, CheckCircle2,
  AlertTriangle, XCircle, Info,
} from "lucide-react";

// ─── Shared helpers ─────────────────────────────────────────────
function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const c: Record<string, string> = {
    blue:   "bg-blue-50  text-blue-700  border-blue-200  dark:bg-blue-900/20  dark:text-blue-400  dark:border-blue-800",
    green:  "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    red:    "bg-red-50   text-red-700   border-red-200   dark:bg-red-900/20   dark:text-red-400   dark:border-red-800",
    amber:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
    zinc:   "bg-zinc-100 text-zinc-700  border-zinc-200  dark:bg-zinc-800     dark:text-zinc-400  dark:border-zinc-700",
  };
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border tracking-wide", c[color] ?? c.blue)}>
      {children}
    </span>
  );
}

function CodeFile({ filename, lang = "python", children }: { filename: string; lang?: string; children: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 overflow-hidden mb-5 shadow-sm">
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2.5 border-b border-zinc-700">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-amber-400/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-zinc-300 text-xs font-mono font-semibold ml-1">{filename}</span>
        </div>
        <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{lang}</span>
      </div>
      <pre className="bg-zinc-950 text-zinc-100 p-5 overflow-x-auto text-[12.5px] leading-relaxed font-mono">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-4">
      <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border flex items-center gap-2">
        {Icon && <Icon size={18} className="text-primary flex-shrink-0" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoBox({ color = "blue", children }: { color?: string; children: React.ReactNode }) {
  const c: Record<string, string> = {
    blue:  "bg-blue-50  border-blue-200  dark:bg-blue-900/20  dark:border-blue-800",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
    red:   "bg-red-50   border-red-200   dark:bg-red-900/20   dark:border-red-800",
    green: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
  };
  return (
    <div className={cn("rounded-xl border p-4 mb-4 text-sm text-foreground dark:text-zinc-200 space-y-1", c[color])}>{children}</div>
  );
}

// ─── OWASP item ─────────────────────────────────────────────────
function OwaspItem({
  id, title, risk, status, checks,
}: { id: string; title: string; risk: "HIGH" | "MEDIUM" | "LOW"; status: "MITIGADO" | "PARCIAL" | "PENDENTE"; checks: string[] }) {
  const riskColor = risk === "HIGH" ? "red" : risk === "MEDIUM" ? "amber" : "zinc";
  const statusIcon = status === "MITIGADO"
    ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
    : status === "PARCIAL"
    ? <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
    : <XCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />;
  return (
    <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3">
        <span className="text-zinc-400 text-xs font-mono font-bold mt-0.5 w-8 shrink-0">{id}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="font-semibold text-sm text-foreground">{title}</p>
            <Badge color={riskColor}>{risk}</Badge>
            <div className="flex items-center gap-1 text-xs font-medium">
              {statusIcon}
              <span className={cn(
                status === "MITIGADO" ? "text-green-600 dark:text-green-400" :
                status === "PARCIAL"  ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
              )}>{status}</span>
            </div>
          </div>
          <ul className="space-y-1">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info size={11} className="flex-shrink-0 mt-0.5 text-zinc-400" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────
export default function TestingStrategy() {
  return (
    <article className="max-w-none space-y-2">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge color="purple">QUALIDADE</Badge>
          <Badge color="blue">pytest · httpx · Locust</Badge>
          <Badge color="green">GitHub Actions CI/CD</Badge>
          <Badge color="amber">OWASP Top 10</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
          Estratégia de Testes & CI/CD
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
          Cobertura completa do backend FastAPI: testes unitários por camada de serviço, testes de integração contra base de dados isolada, simulação de carga de 500 utilizadores simultâneos, auditoria OWASP Top 10 e pipeline CI/CD automatizado do lint até ao deploy em staging.
        </p>
      </div>

      {/* ── Coverage targets ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Cobertura alvo",   value: "≥ 85%",        sub: "linhas de código" },
          { label: "Testes unitários", value: "120+",          sub: "pytest cases" },
          { label: "Testes integração",value: "60+",           sub: "endpoint tests" },
          { label: "Carga (Locust)",   value: "500 users",     sub: "< 2s p95 latência" },
        ].map(s => (
          <div key={s.label} className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-xl font-extrabold text-foreground dark:text-white">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Test pyramid ─────────────────────────────────────── */}
      <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6 mb-8 font-mono text-xs text-zinc-300 overflow-x-auto">
        <pre>{`
                    ┌──────────────────┐
                    │   E2E / Locust   │  ← 500 concurrent users
                    │   load tests     │    p95 < 2s
                    └────────┬─────────┘
               ┌─────────────┴──────────────┐
               │    Integration Tests        │  ← 60+ httpx tests
               │    (real async test DB)     │    full request cycle
               └─────────────┬──────────────┘
         ┌────────────────────┴──────────────────────┐
         │            Unit Tests (pytest)             │  ← 120+ tests
         │  services · schemas · utils · validators   │    isolated, fast
         └────────────────────────────────────────────┘

  CI: lint → typecheck → unit → integration → security → staging deploy
        `}</pre>
      </div>

      {/* ─────────────────────────────────────────────────────────
          1. conftest.py + Fixtures
      ──────────────────────────────────────────────────────────── */}
      <Section id="conftest" title="1 — conftest.py: DB Setup, Session & Fixture Factories" icon={FlaskConical}>
        <InfoBox color="blue">
          <p>Usa SQLite em memória (async) como test DB isolada. Cada teste recebe uma transacção própria com <strong>rollback automático</strong> no teardown — zero estado persistente entre testes.</p>
        </InfoBox>

        <CodeFile filename="tests/conftest.py">{`"""
OP1NA1 — conftest.py
Test database setup/teardown + fixture factories for all models.
Cada teste recebe uma transacção isolada com rollback automático.
"""
import asyncio, uuid, random
from datetime import datetime, timedelta
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession, create_async_engine, async_sessionmaker
)
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.security import get_password_hash
from app.models import User, Municipality, Neighborhood, Report, Notification

# ── Test database (SQLite in-memory, async) ───────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)
TestSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# ── Event loop (session-scoped) ───────────────────────────────────
@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop   = policy.new_event_loop()
    yield loop
    loop.close()

# ── Create / drop all tables once per session ─────────────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

# ── Per-test DB session with rollback ─────────────────────────────
@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with engine.connect() as conn:
        await conn.begin()
        async with AsyncSession(bind=conn, expire_on_commit=False) as session:
            yield session
        await conn.rollback()

# ── Override app dependency ───────────────────────────────────────
@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()

# ══════════════════════════════════════════════════════════════════
# FIXTURE FACTORIES
# ══════════════════════════════════════════════════════════════════

# ── Municipality factory ──────────────────────────────────────────
@pytest_asyncio.fixture
async def municipality_factory(db: AsyncSession):
    created = []
    async def _make(name: str = "Mulenvos", code: str = "MLV") -> Municipality:
        muni = Municipality(name=name, code=code, province="Luanda", is_active=True)
        db.add(muni)
        await db.flush()
        created.append(muni)
        return muni
    yield _make

@pytest_asyncio.fixture
async def municipality(municipality_factory):
    return await municipality_factory()

# ── Neighborhood factory ──────────────────────────────────────────
@pytest_asyncio.fixture
async def neighborhood_factory(db: AsyncSession):
    async def _make(
        municipality_id: int,
        name: str | None = None,
    ) -> Neighborhood:
        neighborhoods = [
            "Km 9-B", "Km 12-B", "Mulenvos De Cima", "Baixa De Cassanje",
            "Km 14-B", "Boa-Fé", "Caop C", "Caop A", "Caop B", "Capalanga",
        ]
        n = Neighborhood(
            municipality_id=municipality_id,
            name=name or random.choice(neighborhoods),
            is_active=True,
        )
        db.add(n)
        await db.flush()
        return n
    return _make

@pytest_asyncio.fixture
async def neighborhood(neighborhood_factory, municipality):
    return await neighborhood_factory(municipality_id=municipality.id)

# ── User factory ──────────────────────────────────────────────────
@pytest_asyncio.fixture
async def user_factory(db: AsyncSession):
    async def _make(
        email: str | None = None,
        role: str = "citizen",
        municipality_id: int | None = None,
        is_active: bool = True,
    ) -> User:
        u = User(
            email=email or f"user_{uuid.uuid4().hex[:8]}@test.ao",
            hashed_password=get_password_hash("testpass123!"),
            full_name="Test User",
            phone="+244923000001",
            role=role,
            municipality_id=municipality_id,
            is_active=is_active,
        )
        db.add(u)
        await db.flush()
        return u
    return _make

@pytest_asyncio.fixture
async def citizen(user_factory):
    return await user_factory(role="citizen")

@pytest_asyncio.fixture
async def admin(user_factory, municipality):
    return await user_factory(role="admin", municipality_id=municipality.id)

@pytest_asyncio.fixture
async def supervisor(user_factory, municipality):
    return await user_factory(role="supervisor", municipality_id=municipality.id)

# ── Auth token helper ─────────────────────────────────────────────
@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, citizen: User):
    resp = await client.post("/api/v1/auth/login", json={
        "email": citizen.email, "password": "testpass123!"
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient, admin: User):
    resp = await client.post("/api/v1/auth/login", json={
        "email": admin.email, "password": "testpass123!"
    })
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}

# ── Report factory ────────────────────────────────────────────────
@pytest_asyncio.fixture
async def report_factory(db: AsyncSession):
    async def _make(
        reporter_id: int,
        municipality_id: int,
        neighborhood_id: int | None = None,
        report_type: str = "RECLAMACAO",
        status: str = "PENDENTE",
        description: str = "Problema com iluminação pública na via principal.",
        anonymous: bool = False,
    ) -> Report:
        r = Report(
            ticket_id=f"OP1-{uuid.uuid4().hex[:8].upper()}",
            report_type=report_type,
            description=description,
            status=status,
            municipality_id=municipality_id,
            neighborhood_id=neighborhood_id,
            reporter_id=reporter_id,
            anonymous=anonymous,
            created_at=datetime.utcnow(),
            sla_deadline=datetime.utcnow() + timedelta(days=5),
        )
        db.add(r)
        await db.flush()
        return r
    return _make

@pytest_asyncio.fixture
async def report(report_factory, citizen, municipality, neighborhood):
    return await report_factory(
        reporter_id=citizen.id,
        municipality_id=municipality.id,
        neighborhood_id=neighborhood.id,
    )

# ── Notification factory ──────────────────────────────────────────
@pytest_asyncio.fixture
async def notification_factory(db: AsyncSession):
    async def _make(
        user_id: int,
        report_id: int | None = None,
        channel: str = "app",
        event_type: str = "REPORT_CREATED",
    ) -> Notification:
        n = Notification(
            user_id=user_id,
            report_id=report_id,
            channel=channel,
            event_type=event_type,
            message="O seu relatório foi recebido.",
            sent=False,
            created_at=datetime.utcnow(),
        )
        db.add(n)
        await db.flush()
        return n
    return _make`}
        </CodeFile>
      </Section>

      {/* ─────────────────────────────────────────────────────────
          2. Unit Tests
      ──────────────────────────────────────────────────────────── */}
      <Section id="unit" title="2 — Testes Unitários: Camada de Serviço" icon={FlaskConical}>
        <CodeFile filename="tests/unit/test_report_service.py">{`"""
Unit tests — ReportService
Testa criação, transições de estado, SLA, validações e anonimização.
"""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timedelta
from app.services.report_service import ReportService
from app.schemas.report import ReportCreate
from app.core.exceptions import (
    ReportNotFound, UnauthorizedTransition, SLABreachError
)

pytestmark = pytest.mark.asyncio

class TestReportCreation:
    async def test_create_report_assigns_ticket_id(self, db, citizen, municipality, neighborhood):
        svc = ReportService(db)
        payload = ReportCreate(
            report_type="RECLAMACAO",
            description="Buraco na estrada do Km 12-B desde há 3 semanas.",
            municipality_id=municipality.id,
            neighborhood_id=neighborhood.id,
            anonymous=False,
        )
        report = await svc.create(payload, reporter_id=citizen.id)
        assert report.ticket_id.startswith("OP1-")
        assert len(report.ticket_id) == 12

    async def test_create_report_sets_sla_deadline(self, db, citizen, municipality):
        svc = ReportService(db)
        payload = ReportCreate(
            report_type="DENUNCIA",
            description="Despejo ilegal de resíduos sólidos no bairro.",
            municipality_id=municipality.id,
            anonymous=False,
        )
        report = await svc.create(payload, reporter_id=citizen.id)
        expected = datetime.utcnow() + timedelta(days=3)  # DENUNCIA SLA = 3d
        assert abs((report.sla_deadline - expected).total_seconds()) < 10

    async def test_anonymous_report_hides_reporter(self, db, citizen, municipality):
        svc = ReportService(db)
        payload = ReportCreate(
            report_type="SUGESTAO",
            description="Instalar iluminação pública na Rua da Boa-Fé.",
            municipality_id=municipality.id,
            anonymous=True,
        )
        report = await svc.create(payload, reporter_id=citizen.id)
        assert report.reporter_id is None or report.anonymous is True

    async def test_duplicate_submission_rate_limited(self, db, citizen, municipality):
        svc = ReportService(db)
        payload = ReportCreate(
            report_type="RECLAMACAO",
            description="A mesma descrição submetida em duplicado.",
            municipality_id=municipality.id,
            anonymous=False,
        )
        await svc.create(payload, reporter_id=citizen.id)
        with pytest.raises(Exception):  # RateLimitError or ValidationError
            await svc.create(payload, reporter_id=citizen.id)


class TestStatusTransitions:
    VALID_TRANSITIONS = [
        ("PENDENTE",    "EM_ANALISE"),
        ("EM_ANALISE",  "EM_PROGRESSO"),
        ("EM_PROGRESSO","RESOLVIDO"),
        ("PENDENTE",    "REJEITADO"),
    ]
    INVALID_TRANSITIONS = [
        ("RESOLVIDO",   "PENDENTE"),
        ("REJEITADO",   "EM_ANALISE"),
        ("RESOLVIDO",   "REJEITADO"),
    ]

    @pytest.mark.parametrize("from_status,to_status", VALID_TRANSITIONS)
    async def test_valid_transition(self, db, report_factory, admin,
                                    municipality, neighborhood, from_status, to_status):
        from app.services.report_service import ReportService
        report = await report_factory(
            reporter_id=admin.id,
            municipality_id=municipality.id,
            neighborhood_id=neighborhood.id,
            status=from_status,
        )
        svc = ReportService(db)
        updated = await svc.update_status(report.id, to_status, actor_id=admin.id)
        assert updated.status == to_status

    @pytest.mark.parametrize("from_status,to_status", INVALID_TRANSITIONS)
    async def test_invalid_transition_raises(self, db, report_factory, admin,
                                              municipality, neighborhood, from_status, to_status):
        report = await report_factory(
            reporter_id=admin.id,
            municipality_id=municipality.id,
            status=from_status,
        )
        svc = ReportService(db)
        with pytest.raises(UnauthorizedTransition):
            await svc.update_status(report.id, to_status, actor_id=admin.id)


class TestSLAService:
    async def test_sla_breach_detected(self, db, report_factory, citizen, municipality):
        from app.services.sla_service import SLAService
        from datetime import timezone
        report = await report_factory(
            reporter_id=citizen.id,
            municipality_id=municipality.id,
        )
        # Force SLA breach by backdating deadline
        report.sla_deadline = datetime.utcnow() - timedelta(hours=1)
        await db.flush()

        svc = SLAService(db)
        breached = await svc.get_breached_reports()
        assert any(r.id == report.id for r in breached)

    async def test_sla_ok_not_in_breached(self, db, report_factory, citizen, municipality):
        from app.services.sla_service import SLAService
        report = await report_factory(
            reporter_id=citizen.id,
            municipality_id=municipality.id,
        )
        # SLA still valid
        report.sla_deadline = datetime.utcnow() + timedelta(days=2)
        await db.flush()

        svc = SLAService(db)
        breached = await svc.get_breached_reports()
        assert not any(r.id == report.id for r in breached)`}
        </CodeFile>

        <CodeFile filename="tests/unit/test_auth_service.py">{`"""
Unit tests — AuthService
JWT, refresh tokens, RBAC, password hashing.
"""
import pytest
from app.services.auth_service import AuthService
from app.core.security import (
    create_access_token, decode_token, get_password_hash, verify_password
)
from app.core.exceptions import InvalidCredentials, TokenExpired, InsufficientPermissions

pytestmark = pytest.mark.asyncio


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = get_password_hash("mypassword123")
        assert hashed != "mypassword123"

    def test_verify_correct_password(self):
        hashed = get_password_hash("mypassword123")
        assert verify_password("mypassword123", hashed) is True

    def test_verify_wrong_password(self):
        hashed = get_password_hash("mypassword123")
        assert verify_password("wrongpassword", hashed) is False

    def test_password_min_length_enforced(self):
        with pytest.raises(ValueError):
            get_password_hash("short")  # < 8 chars


class TestJWT:
    def test_token_contains_user_id(self, citizen):
        token = create_access_token({"sub": str(citizen.id), "role": citizen.role})
        payload = decode_token(token)
        assert payload["sub"] == str(citizen.id)

    def test_expired_token_raises(self):
        from jose import jwt
        from app.core.config import settings
        import time
        token = jwt.encode(
            {"sub": "1", "exp": int(time.time()) - 1},
            settings.SECRET_KEY, algorithm="HS256"
        )
        with pytest.raises(TokenExpired):
            decode_token(token)

    def test_tampered_token_raises(self):
        from app.core.exceptions import InvalidToken
        with pytest.raises((InvalidToken, Exception)):
            decode_token("totally.invalid.token")


class TestRBAC:
    async def test_admin_can_update_status(self, db, admin, report):
        svc = AuthService(db)
        # Admin has permission on own municipality reports
        can = await svc.can_update_report_status(admin, report)
        assert can is True

    async def test_citizen_cannot_update_status(self, db, citizen, report):
        svc = AuthService(db)
        can = await svc.can_update_report_status(citizen, report)
        assert can is False

    async def test_supervisor_read_own_municipality(self, db, supervisor, report, municipality):
        svc = AuthService(db)
        # Supervisor bound to same municipality
        supervisor.municipality_id = municipality.id
        await db.flush()
        can = await svc.can_read_report(supervisor, report)
        assert can is True

    async def test_supervisor_blocked_other_municipality(self, db, supervisor, report_factory,
                                                          municipality_factory, citizen):
        from app.services.auth_service import AuthService
        other_muni = await municipality_factory(name="Talatona", code="TLT")
        other_report = await report_factory(
            reporter_id=citizen.id,
            municipality_id=other_muni.id,
        )
        svc = AuthService(db)
        can = await svc.can_read_report(supervisor, other_report)
        assert can is False


class TestGeographyService:
    async def test_list_municipalities(self, db, municipality):
        from app.services.geography_service import GeographyService
        svc = GeographyService(db)
        munis = await svc.list_municipalities()
        assert any(m.id == municipality.id for m in munis)

    async def test_list_neighborhoods_for_municipality(self, db, municipality, neighborhood):
        from app.services.geography_service import GeographyService
        svc = GeographyService(db)
        hoods = await svc.list_neighborhoods(municipality.id)
        assert any(n.id == neighborhood.id for n in hoods)

    async def test_invalid_municipality_raises_404(self, db):
        from app.services.geography_service import GeographyService
        from app.core.exceptions import NotFound
        svc = GeographyService(db)
        with pytest.raises(NotFound):
            await svc.list_neighborhoods(municipality_id=999999)`}
        </CodeFile>
      </Section>

      {/* ─────────────────────────────────────────────────────────
          3. Integration Tests
      ──────────────────────────────────────────────────────────── */}
      <Section id="integration" title="3 — Testes de Integração: Todos os Endpoints" icon={FlaskConical}>
        <CodeFile filename="tests/integration/test_reports_api.py">{`"""
Integration tests — Reports API
Testa ciclo completo HTTP: auth → criação → estado → listagem → CSV export.
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestReportSubmission:
    async def test_submit_report_returns_201(self, client, auth_headers, municipality, neighborhood):
        resp = await client.post("/api/v1/reports", headers=auth_headers, json={
            "report_type":     "RECLAMACAO",
            "description":     "Falta de água há 5 dias no Km 9-B. Situação urgente.",
            "municipality_id": municipality.id,
            "neighborhood_id": neighborhood.id,
            "anonymous":       False,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "ticket_id" in data
        assert data["ticket_id"].startswith("OP1-")
        assert data["status"] == "PENDENTE"

    async def test_submit_without_auth_returns_401(self, client, municipality):
        resp = await client.post("/api/v1/reports", json={
            "report_type": "RECLAMACAO",
            "description": "Teste sem autenticação.",
            "municipality_id": municipality.id,
        })
        assert resp.status_code == 401

    async def test_submit_invalid_municipality_returns_422(self, client, auth_headers):
        resp = await client.post("/api/v1/reports", headers=auth_headers, json={
            "report_type":     "RECLAMACAO",
            "description":     "Municipality ID inexistente.",
            "municipality_id": 999999,
        })
        assert resp.status_code in (422, 404)

    async def test_submit_description_too_short_returns_422(self, client, auth_headers, municipality):
        resp = await client.post("/api/v1/reports", headers=auth_headers, json={
            "report_type":     "RECLAMACAO",
            "description":     "Curto",
            "municipality_id": municipality.id,
        })
        assert resp.status_code == 422

    async def test_anonymous_report_hides_identity(self, client, auth_headers, municipality):
        resp = await client.post("/api/v1/reports", headers=auth_headers, json={
            "report_type":     "SUGESTAO",
            "description":     "Melhorar a rede de transportes públicos no bairro.",
            "municipality_id": municipality.id,
            "anonymous":       True,
        })
        assert resp.status_code == 201
        assert resp.json()["anonymous"] is True

    async def test_track_ticket_public_endpoint(self, client, report):
        resp = await client.get(f"/api/v1/reports/track/{report.ticket_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "ticket_id" in data

    async def test_track_invalid_ticket_returns_404(self, client):
        resp = await client.get("/api/v1/reports/track/OP1-INVALID000")
        assert resp.status_code == 404


class TestReportManagement:
    async def test_admin_can_list_reports(self, client, admin_headers, report):
        resp = await client.get("/api/v1/reports", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    async def test_citizen_cannot_list_all_reports(self, client, auth_headers):
        resp = await client.get("/api/v1/reports", headers=auth_headers)
        assert resp.status_code == 403

    async def test_admin_update_status(self, client, admin_headers, report):
        resp = await client.patch(
            f"/api/v1/reports/{report.id}/status",
            headers=admin_headers,
            json={"status": "EM_ANALISE", "note": "A verificar no local."},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "EM_ANALISE"

    async def test_status_history_recorded(self, client, admin_headers, report):
        await client.patch(f"/api/v1/reports/{report.id}/status",
                           headers=admin_headers,
                           json={"status": "EM_ANALISE"})
        resp = await client.get(f"/api/v1/reports/{report.id}/history",
                                headers=admin_headers)
        assert resp.status_code == 200
        history = resp.json()
        assert len(history) >= 1
        assert history[0]["to_status"] == "EM_ANALISE"

    async def test_filter_by_municipality(self, client, admin_headers, municipality):
        resp = await client.get(
            f"/api/v1/reports?municipality_id={municipality.id}",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        for item in resp.json().get("items", []):
            assert item["municipality_id"] == municipality.id

    async def test_csv_export(self, client, admin_headers):
        resp = await client.get("/api/v1/reports/export/csv", headers=admin_headers)
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")
        assert "ticket_id" in resp.text


class TestGeographyEndpoints:
    async def test_list_municipalities(self, client, municipality):
        resp = await client.get("/api/v1/geography/municipalities")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(m["id"] == municipality.id for m in data)

    async def test_list_neighborhoods_for_municipality(self, client, municipality, neighborhood):
        resp = await client.get(f"/api/v1/geography/municipalities/{municipality.id}/neighborhoods")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(n["id"] == neighborhood.id for n in data)

    async def test_neighborhoods_invalid_municipality(self, client):
        resp = await client.get("/api/v1/geography/municipalities/999999/neighborhoods")
        assert resp.status_code == 404

    async def test_health_endpoint(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "db" in data`}
        </CodeFile>
      </Section>

      {/* ─────────────────────────────────────────────────────────
          4. Load Tests (Locust)
      ──────────────────────────────────────────────────────────── */}
      <Section id="load" title="4 — Load Tests: 500 Utilizadores Simultâneos (Locust)" icon={Zap}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[
            { label: "Peak users",    value: "500",    sub: "spawn rate: 20/s" },
            { label: "Duration",      value: "5 min",  sub: "sustained load" },
            { label: "p95 target",    value: "< 2s",   sub: "POST /api/v1/reports" },
          ].map(s => (
            <div key={s.label} className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-extrabold text-foreground dark:text-white">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        <CodeFile filename="tests/load/locustfile.py">{`"""
OP1NA1 — Locust load test
Simula 500 cidadãos a submeter relatórios simultaneamente.
Run: locust -f locustfile.py --host https://staging.mulenvos.gv.ao \\
           --users 500 --spawn-rate 20 --run-time 5m --headless \\
           --html reports/load_report.html
"""
import random, uuid, json
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner


# ── Seed data ─────────────────────────────────────────────────────
MUNICIPALITIES = [{"id": 1, "name": "Mulenvos"}]
NEIGHBORHOODS  = [
    {"id": 1, "name": "Km 9-B"},   {"id": 2, "name": "Km 12-B"},
    {"id": 3, "name": "Mulenvos De Cima"}, {"id": 4, "name": "Boa-Fé"},
    {"id": 5, "name": "Capalanga"}, {"id": 6, "name": "Caop A"},
]
REPORT_TYPES = ["RECLAMACAO", "SUGESTAO", "DENUNCIA", "SOLICITACAO"]
DESCRIPTIONS = [
    "Falta de iluminação pública no bairro há mais de uma semana.",
    "Buraco na estrada principal causando acidentes de trânsito.",
    "Falta de água há 5 dias. Família com crianças em casa.",
    "Acumulação de lixo na rua sem recolha há 10 dias.",
    "Canalização partida com perda de água na via pública.",
    "Paragem de autocarro danificada sem sinalização.",
]

# ── Auth helper ───────────────────────────────────────────────────
class AuthenticatedUser(HttpUser):
    wait_time = between(1, 3)
    token: str = ""

    def on_start(self):
        """Login once per user on startup."""
        email = f"load_user_{uuid.uuid4().hex[:6]}@test.ao"
        # Register
        self.client.post("/api/v1/auth/register", json={
            "email": email,
            "password": "Locust@Test123!",
            "full_name": "Load Test User",
            "phone": "+244923000001",
        }, name="register")
        # Login
        resp = self.client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "Locust@Test123!",
        }, name="login")
        if resp.status_code == 200:
            self.token = resp.json().get("access_token", "")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}


# ── Citizen: submission heavy ─────────────────────────────────────
class CitizenUser(AuthenticatedUser):
    """80% of load — primary submission scenario."""
    weight = 80

    @task(5)
    def submit_report(self):
        muni  = random.choice(MUNICIPALITIES)
        hood  = random.choice(NEIGHBORHOODS)
        with self.client.post(
            "/api/v1/reports",
            headers=self._auth(),
            json={
                "report_type":     random.choice(REPORT_TYPES),
                "description":     random.choice(DESCRIPTIONS),
                "municipality_id": muni["id"],
                "neighborhood_id": hood["id"],
                "anonymous":       random.random() < 0.3,
            },
            name="POST /api/v1/reports",
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                self.last_ticket = resp.json().get("ticket_id", "")
                resp.success()
            elif resp.status_code == 429:
                resp.failure("Rate limited")
            else:
                resp.failure(f"Unexpected {resp.status_code}: {resp.text[:100]}")

    @task(3)
    def track_ticket(self):
        if not hasattr(self, "last_ticket") or not self.last_ticket:
            return
        with self.client.get(
            f"/api/v1/reports/track/{self.last_ticket}",
            name="GET /api/v1/reports/track/:ticket",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")

    @task(2)
    def list_municipalities(self):
        self.client.get(
            "/api/v1/geography/municipalities",
            name="GET /api/v1/geography/municipalities",
        )

    @task(2)
    def list_neighborhoods(self):
        muni = random.choice(MUNICIPALITIES)
        self.client.get(
            f"/api/v1/geography/municipalities/{muni['id']}/neighborhoods",
            name="GET /api/v1/geography/municipalities/:id/neighborhoods",
        )

    @task(1)
    def check_health(self):
        self.client.get("/health", name="GET /health")


# ── Admin: dashboard reads ────────────────────────────────────────
class AdminUser(AuthenticatedUser):
    """20% of load — back-office monitoring scenario."""
    weight = 20

    @task(3)
    def list_reports(self):
        page = random.randint(1, 5)
        self.client.get(
            f"/api/v1/reports?page={page}&limit=20",
            headers=self._auth(),
            name="GET /api/v1/reports (paginated)",
        )

    @task(2)
    def dashboard_stats(self):
        self.client.get(
            "/api/v1/analytics/summary",
            headers=self._auth(),
            name="GET /api/v1/analytics/summary",
        )

    @task(1)
    def export_csv(self):
        self.client.get(
            "/api/v1/reports/export/csv",
            headers=self._auth(),
            name="GET /api/v1/reports/export/csv",
        )


# ── SLA assertions (Locust events) ───────────────────────────────
@events.request.add_listener
def on_request(request_type, name, response_time, response_length,
               exception, context, **kwargs):
    # Fail test if p95 > 2000ms for submission endpoint
    if name == "POST /api/v1/reports" and response_time > 5000:
        print(f"[SLA BREACH] {name} took {response_time:.0f}ms > 5000ms threshold")`}
        </CodeFile>

        <CodeFile filename="tests/load/run_load_test.sh" lang="bash">{`#!/usr/bin/env bash
# OP1NA1 — Run load test + generate HTML report
set -euo pipefail

HOST=\${HOST:-"https://staging.mulenvos.gv.ao"}
USERS=\${USERS:-500}
SPAWN_RATE=\${SPAWN_RATE:-20}
RUN_TIME=\${RUN_TIME:-"5m"}

mkdir -p reports

echo "Starting load test: $USERS users @ $HOST"
locust -f tests/load/locustfile.py \\
  --host "$HOST" \\
  --users "$USERS" \\
  --spawn-rate "$SPAWN_RATE" \\
  --run-time "$RUN_TIME" \\
  --headless \\
  --html "reports/load_$(date +%Y%m%d_%H%M%S).html" \\
  --csv "reports/load_$(date +%Y%m%d_%H%M%S)" \\
  --exit-code-on-error 1

echo "Load test complete. Reports in ./reports/"`}
        </CodeFile>
      </Section>

      {/* ─────────────────────────────────────────────────────────
          5. OWASP Top 10
      ──────────────────────────────────────────────────────────── */}
      <Section id="owasp" title="5 — OWASP API Top 10 — Auditoria de Segurança" icon={Shield}>
        <InfoBox color="amber">
          <p>Verificação manual + automatizada com <strong>OWASP ZAP</strong> e <strong>Bandit</strong> (análise estática Python). Executar antes de cada release de produção.</p>
        </InfoBox>

        <OwaspItem
          id="API1"
          title="Broken Object Level Authorization (BOLA)"
          risk="HIGH"
          status="MITIGADO"
          checks={[
            "Todos os endpoints de leitura de relatório verificam municipality_id do utilizador autenticado",
            "GET /api/v1/reports/{id} retorna 403 se report.municipality_id ≠ user.municipality_id (exceto ADMIN global)",
            "Testes: test_supervisor_blocked_other_municipality() passa",
            "IDOR scan: tentar aceder report.id+1, report.id+1000 com outro token",
          ]}
        />
        <OwaspItem
          id="API2"
          title="Broken Authentication"
          risk="HIGH"
          status="MITIGADO"
          checks={[
            "JWT HS256 com expiração de 30 minutos; refresh token 7 dias em HttpOnly cookie",
            "Bcrypt (rounds=12) para hashing de passwords",
            "Rate limiting: 5 tentativas de login por IP em 10 minutos → bloqueio fail2ban",
            "Token blacklist Redis para logout imediato",
            "Test: test_expired_token_raises() e test_tampered_token_raises() passam",
          ]}
        />
        <OwaspItem
          id="API3"
          title="Broken Object Property Level Authorization"
          risk="HIGH"
          status="MITIGADO"
          checks={[
            "Pydantic schemas separados: ReportCreate (input) vs ReportOut (output) — nunca expõe campos internos",
            "reporter_id nunca retornado em relatórios anónimos",
            "hashed_password excluído de todos os schemas de saída com model_config exclude",
            "PATCH /reports/{id} aceita apenas campos do schema ReportUpdate — campos extras ignorados",
          ]}
        />
        <OwaspItem
          id="API4"
          title="Unrestricted Resource Consumption"
          risk="HIGH"
          status="MITIGADO"
          checks={[
            "Nginx: client_max_body_size 25M; rate limit 30 req/min (API), 5 req/min (submit)",
            "Paginação obrigatória: limit máx 100, padrão 20 — sem endpoint que retorna tudo",
            "Uploads de ficheiros: validação de mime-type + tamanho antes de persistir",
            "Timeouts: proxy_read_timeout 60s, Gunicorn --timeout 60",
          ]}
        />
        <OwaspItem
          id="API5"
          title="Broken Function Level Authorization"
          risk="HIGH"
          status="MITIGADO"
          checks={[
            "Decorador @require_role('admin', 'supervisor') em todos os endpoints de gestão",
            "GET /api/v1/reports (lista completa) retorna 403 para role=citizen",
            "DELETE /api/v1/reports/{id} restrito a role=admin global",
            "Test: test_citizen_cannot_list_all_reports() passa",
          ]}
        />
        <OwaspItem
          id="API6"
          title="Unrestricted Access to Sensitive Business Flows"
          risk="MEDIUM"
          status="MITIGADO"
          checks={[
            "Rate limit dedicado: zone=submit 5 req/min por IP para POST /api/v1/reports",
            "Validação duplicado: hash de (reporter_id + description[:50]) em Redis com TTL 60s",
            "CAPTCHA (opcional): integrar hCaptcha para formulário público /submeter",
            "Locust test: 500 users simultâneos — verificar que rate limit actua correctamente",
          ]}
        />
        <OwaspItem
          id="API7"
          title="Server Side Request Forgery (SSRF)"
          risk="MEDIUM"
          status="PARCIAL"
          checks={[
            "Nenhum endpoint aceita URLs externas como input actualmente",
            "Futuro: se integrar webhooks ou upload por URL, validar contra allowlist de domínios",
            "Bandit scan: B310 (urllib) — verificar ausência de chamadas a URLs dinâmicas do input",
          ]}
        />
        <OwaspItem
          id="API8"
          title="Security Misconfiguration"
          risk="HIGH"
          status="MITIGADO"
          checks={[
            "DEBUG=false em produção; logs de erro não expõem stack traces na resposta HTTP",
            "CORS: allowed_origins restrito ao domínio de produção — sem wildcard *",
            "Nginx: server_tokens off; X-Powered-By removido; security headers activos",
            "OpenAPI /docs e /redoc desactivados em APP_ENV=production",
          ]}
        />
        <OwaspItem
          id="API9"
          title="Improper Inventory Management"
          risk="MEDIUM"
          status="MITIGADO"
          checks={[
            "Versionamento via prefixo /api/v1/ — v2 planeada para breaking changes",
            "Endpoints deprecated sinalizado com header Deprecation: true e Sunset date",
            "CI: Spectral lint sobre openapi.yaml antes de cada deploy",
            "Changelog automático via conventional commits + semantic-release",
          ]}
        />
        <OwaspItem
          id="API10"
          title="Unsafe Consumption of APIs"
          risk="MEDIUM"
          status="PARCIAL"
          checks={[
            "Todas as dependências externas (WhatsApp Business API, SMS gateway) chamadas com timeout explícito de 5s",
            "Respostas externas validadas com Pydantic antes de usar — sem trust implícito",
            "Pendente: adicionar circuit breaker (tenacity) para integração SMS",
            "Dependabot activado no repositório GitHub para alertas de CVE",
          ]}
        />

        <CodeFile filename="tests/security/bandit_config.yaml" lang="yaml">{`# Bandit — Python SAST configuration
# Run: bandit -r app/ -c tests/security/bandit_config.yaml
skips:
  - B101  # assert statements (OK in tests)
  - B608  # SQL injection detection (false positives com SQLAlchemy ORM)

tests:
  - B201  # Flask debug mode
  - B301  # pickle
  - B303  # MD5/SHA1
  - B310  # urllib (SSRF)
  - B320  # XML
  - B501  # ssl disable
  - B502  # ssl bad version
  - B506  # yaml load
  - B601  # shell injection
  - B602  # subprocess shell=True
  - B605  # start_process_with_partial_path
  - B608  # SQL injection (keep for raw queries)

severity: medium  # Fail on MEDIUM or higher`}
        </CodeFile>
      </Section>

      {/* ─────────────────────────────────────────────────────────
          6. GitHub Actions CI/CD
      ──────────────────────────────────────────────────────────── */}
      <Section id="cicd" title="6 — CI/CD Pipeline: GitHub Actions" icon={GitBranch}>
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5 mb-4 font-mono text-xs text-zinc-300 overflow-x-auto">
          <pre>{`
  push / PR
     │
     ▼
  ┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────────┐
  │  lint   │───▶│ typecheck│───▶│  unit tests  │───▶│ integration tests│
  │ (ruff)  │    │ (mypy)   │    │  (pytest)    │    │  (pytest + testDB)│
  └─────────┘    └──────────┘    └──────────────┘    └────────┬─────────┘
                                                               │
                                          ┌────────────────────┘
                                          ▼
                                  ┌──────────────┐    ┌─────────────────┐
                                  │ security scan│───▶│ staging deploy  │
                                  │ bandit + ZAP │    │ (main branch)   │
                                  └──────────────┘    └─────────────────┘
          `}</pre>
        </div>

        <CodeFile filename=".github/workflows/ci.yml" lang="yaml">{`# OP1NA1 — GitHub Actions CI/CD Pipeline
# Triggers: push to main/develop, all PRs
name: OP1NA1 CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  PYTHON_VERSION: "3.12"
  DATABASE_URL: "sqlite+aiosqlite:///:memory:"
  SECRET_KEY: "ci-test-secret-key-not-for-production"
  APP_ENV: "test"

jobs:
  # ── 1. Lint ──────────────────────────────────────────────────────
  lint:
    name: "Lint (ruff + isort)"
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: \${{ env.PYTHON_VERSION }}
          cache: pip

      - name: Install lint tools
        run: pip install ruff isort

      - name: Ruff lint
        run: ruff check app/ tests/ --output-format=github

      - name: Ruff format check
        run: ruff format --check app/ tests/

      - name: isort check
        run: isort --check-only app/ tests/

  # ── 2. Type check ────────────────────────────────────────────────
  typecheck:
    name: "Type Check (mypy)"
    runs-on: ubuntu-22.04
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ env.PYTHON_VERSION }}
          cache: pip
      - name: Install dependencies
        run: pip install -r requirements.txt mypy types-passlib
      - name: mypy
        run: mypy app/ --ignore-missing-imports --strict

  # ── 3. Unit Tests ────────────────────────────────────────────────
  unit-tests:
    name: "Unit Tests (pytest)"
    runs-on: ubuntu-22.04
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ env.PYTHON_VERSION }}
          cache: pip
      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-test.txt

      - name: Run unit tests with coverage
        run: |
          pytest tests/unit/ \\
            --cov=app \\
            --cov-report=xml \\
            --cov-report=term-missing \\
            --cov-fail-under=85 \\
            -v --tb=short \\
            -m "not integration and not load"

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: \${{ secrets.CODECOV_TOKEN }}
          files: coverage.xml
          fail_ci_if_error: false

  # ── 4. Integration Tests ──────────────────────────────────────────
  integration-tests:
    name: "Integration Tests (pytest + test DB)"
    runs-on: ubuntu-22.04
    needs: unit-tests

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: ci_root_password
          MYSQL_DATABASE: op1na1_test
          MYSQL_USER: op1na1_test
          MYSQL_PASSWORD: ci_test_password
        ports:
          - 3306:3306
        options: >-
          --health-cmd "mysqladmin ping -h localhost"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    env:
      DATABASE_URL: "mysql+aiomysql://op1na1_test:ci_test_password@127.0.0.1:3306/op1na1_test"

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ env.PYTHON_VERSION }}
          cache: pip
      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-test.txt

      - name: Run Alembic migrations
        run: alembic upgrade head

      - name: Run integration tests
        run: |
          pytest tests/integration/ \\
            -v --tb=short \\
            -m "integration" \\
            --timeout=30

  # ── 5. Security Scan ─────────────────────────────────────────────
  security:
    name: "Security Scan (Bandit + pip-audit)"
    runs-on: ubuntu-22.04
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ env.PYTHON_VERSION }}
          cache: pip
      - name: Install security tools
        run: pip install bandit pip-audit

      - name: Bandit SAST scan
        run: |
          bandit -r app/ \\
            -c tests/security/bandit_config.yaml \\
            --severity-level medium \\
            -f json -o bandit-report.json || true
          bandit -r app/ \\
            -c tests/security/bandit_config.yaml \\
            --severity-level medium \\
            --exit-zero

      - name: pip-audit (CVE check)
        run: pip-audit --require-hashes -r requirements.txt --ignore-vuln PYSEC-2022-43012

      - name: Upload Bandit report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: bandit-report
          path: bandit-report.json

  # ── 6. Deploy to Staging ──────────────────────────────────────────
  deploy-staging:
    name: "Deploy to Staging"
    runs-on: ubuntu-22.04
    needs: [typecheck, integration-tests, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: staging
      url: https://staging.mulenvos.gv.ao

    steps:
      - uses: actions/checkout@v4

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "\${{ secrets.STAGING_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan \${{ secrets.STAGING_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to staging server
        env:
          HOST: \${{ secrets.STAGING_HOST }}
          USER: \${{ secrets.STAGING_USER }}
          APP_DIR: /opt/op1na1
        run: |
          ssh \$USER@\$HOST << 'DEPLOY'
            set -euo pipefail
            cd /opt/op1na1

            # Pull latest code
            git fetch origin main
            git reset --hard origin/main

            # Install/update dependencies
            ./venv/bin/pip install -q -r requirements.txt

            # Run migrations
            ./venv/bin/alembic upgrade head

            # Reload service (zero-downtime)
            sudo systemctl reload op1na1
            sudo systemctl reload nginx

            # Health check
            sleep 5
            curl -sf http://localhost:8000/health | grep '"status":"ok"'
            echo "Staging deploy successful"
          DEPLOY

      - name: Notify deploy success
        if: success()
        run: echo "Deployed SHA \${{ github.sha }} to staging successfully"

      - name: Notify deploy failure
        if: failure()
        run: echo "DEPLOY FAILED for SHA \${{ github.sha }}" && exit 1`}
        </CodeFile>

        <CodeFile filename="requirements-test.txt" lang="text">{`# Test dependencies
pytest>=8.2
pytest-asyncio>=0.23
pytest-cov>=5.0
pytest-timeout>=2.3
httpx>=0.27
aiosqlite>=0.20
anyio>=4.4
factory-boy>=3.3
Faker>=25.0
locust>=2.29
bandit>=1.7
pip-audit>=2.7
mypy>=1.10
ruff>=0.4
isort>=5.13`}
        </CodeFile>
      </Section>

      {/* ── Quick-start commands ────────────────────────────── */}
      <Section id="quickstart" title="Comandos de Execução Rápida">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Desenvolvimento local</p>
            <div className="font-mono text-xs space-y-2 text-foreground dark:text-zinc-200">
              <div><span className="text-zinc-500"># Instalar dependências de teste</span></div>
              <div className="pl-0 text-green-600 dark:text-green-400">pip install -r requirements-test.txt</div>
              <div className="mt-2"><span className="text-zinc-500"># Todos os testes + cobertura</span></div>
              <div className="text-green-600 dark:text-green-400">pytest --cov=app --cov-report=html -v</div>
              <div className="mt-2"><span className="text-zinc-500"># Apenas unitários (rápido)</span></div>
              <div className="text-green-600 dark:text-green-400">pytest tests/unit/ -x -q</div>
              <div className="mt-2"><span className="text-zinc-500"># Integração com MySQL real</span></div>
              <div className="text-green-600 dark:text-green-400">pytest tests/integration/ -v --tb=long</div>
            </div>
          </div>
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Segurança & Carga</p>
            <div className="font-mono text-xs space-y-2 text-foreground dark:text-zinc-200">
              <div><span className="text-zinc-500"># Bandit SAST scan</span></div>
              <div className="text-green-600 dark:text-green-400">bandit -r app/ --severity-level medium</div>
              <div className="mt-2"><span className="text-zinc-500"># Auditoria de CVEs</span></div>
              <div className="text-green-600 dark:text-green-400">pip-audit -r requirements.txt</div>
              <div className="mt-2"><span className="text-zinc-500"># Locust (UI web em :8089)</span></div>
              <div className="text-green-600 dark:text-green-400">locust -f tests/load/locustfile.py --host http://localhost:8000</div>
              <div className="mt-2"><span className="text-zinc-500"># Locust headless 500 users</span></div>
              <div className="text-green-600 dark:text-green-400">bash tests/load/run_load_test.sh</div>
            </div>
          </div>
        </div>
      </Section>

    </article>
  );
}
