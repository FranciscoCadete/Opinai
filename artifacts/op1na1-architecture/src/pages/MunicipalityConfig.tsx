import { cn } from "@/lib/utils";

// ─── Data ───────────────────────────────────────────────────────
const MULENVOS_BAIRROS = [
  "Km 9-B", "Km 12-B", "Mulenvos De Cima", "Baixa De Cassanje",
  "Km 14-B", "Boa-Fé", "Caop C", "Caop A", "Caop B", "Capalanga",
];

// ─── Helpers ────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children, lang = "python" }: { children: string; lang?: string }) {
  return (
    <pre className={cn(
      "bg-zinc-950 dark:bg-zinc-900 text-zinc-100 rounded-xl p-5 overflow-x-auto text-[13px] leading-relaxed font-mono",
      "border border-zinc-800 mb-4 shadow-sm"
    )}>
      <code className={`language-${lang}`}>{children}</code>
    </pre>
  );
}

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue:  "bg-blue-50  text-blue-700  border-blue-200  dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    red:   "bg-red-50   text-red-700   border-red-200   dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    zinc:  "bg-zinc-100 text-zinc-700  border-zinc-200  dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  };
  return (
    <span className={cn(
      "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border tracking-wide",
      colors[color] ?? colors.blue
    )}>
      {children}
    </span>
  );
}

function InfoBox({ title, children, color = "blue" }: { title: string; children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue:  "bg-blue-50  border-blue-200  dark:bg-blue-900/20 dark:border-blue-800",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
    green: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
  };
  return (
    <div className={cn("rounded-xl border p-4 mb-4", colors[color])}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <div className="text-sm text-foreground dark:text-zinc-200 space-y-1">{children}</div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────
export default function MunicipalityConfig() {
  return (
    <article className="prose-none max-w-none space-y-2">

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge color="green">NOVO</Badge>
          <Badge color="zinc">v1.0 — Sprint 4</Badge>
          <Badge color="blue">Estrutural</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
          Municípios & Bairros — Localização Hierárquica
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
          Mecanismo hierárquico de localização administrativa: o utilizador selecciona primeiro o <strong>Município</strong> e, de seguida, os <strong>Bairros/Zonas</strong> são carregados dinamicamente. Estrutura preparada para expansão multi-município, comunas e distritos sem alteração de schema.
        </p>
      </div>

      {/* Why */}
      <Section title="1. Objectivo & Benefícios">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[
            { icon: "🗺️", label: "Inteligência territorial", sub: "Heatmaps e clustering por zona administrativa" },
            { icon: "📊", label: "Dashboards geográficos", sub: "Filtros por município e bairro em tempo real" },
            { icon: "🤖", label: "IA & Analytics", sub: "Clusterização espacial, detecção de crises por zona" },
            { icon: "📁", label: "Exportações precisas", sub: "CSV, Excel e PDF com coluna Município + Bairro" },
            { icon: "🔍", label: "Filtragem estatística", sub: "Segmentação analítica por zona administrativa" },
            { icon: "📈", label: "Escalabilidade futura", sub: "Suporta múltiplos municípios, comunas e distritos" },
          ].map(b => (
            <div key={b.label} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{b.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <InfoBox title="Fluxo UX" color="blue">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary font-bold">1 Seleccionar Município</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400 font-bold">2 API carrega bairros</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 font-bold">3 Seleccionar Bairro/Zona</span>
          </div>
        </InfoBox>
      </Section>

      {/* DB Schema */}
      <Section title="2. Schema da Base de Dados">
        <p className="text-sm text-muted-foreground mb-4">
          Modelo relacional 1-para-N: um município tem N bairros. Adicionar novos municípios ou bairros requer apenas INSERT, sem ALTER TABLE.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* municipalities */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-zinc-950 px-4 py-2 flex items-center justify-between">
              <span className="text-white font-bold text-sm font-mono">municipalities</span>
              <Badge color="blue">PK</Badge>
            </div>
            <div className="divide-y divide-border">
              {[
                { col: "id",          type: "INT UNSIGNED AUTO_INCREMENT", pk: true },
                { col: "name",        type: "VARCHAR(100) NOT NULL UNIQUE" },
                { col: "slug",        type: "VARCHAR(100) NOT NULL UNIQUE" },
                { col: "province",    type: "VARCHAR(100) DEFAULT 'Luanda'" },
                { col: "country",     type: "CHAR(2) DEFAULT 'AO'" },
                { col: "is_active",   type: "BOOLEAN DEFAULT TRUE" },
                { col: "created_at",  type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
                { col: "updated_at",  type: "DATETIME ON UPDATE CURRENT_TIMESTAMP" },
              ].map(r => (
                <div key={r.col} className="flex items-start gap-2 px-4 py-2">
                  {r.pk && <span className="text-amber-500 text-xs font-bold mt-0.5">🔑</span>}
                  <code className={cn("text-xs font-mono", r.pk ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{r.col}</code>
                  <span className="text-xs text-muted-foreground ml-auto">{r.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* neighborhoods */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-zinc-950 px-4 py-2 flex items-center justify-between">
              <span className="text-white font-bold text-sm font-mono">neighborhoods</span>
              <Badge color="zinc">FK → municipalities</Badge>
            </div>
            <div className="divide-y divide-border">
              {[
                { col: "id",              type: "INT UNSIGNED AUTO_INCREMENT", pk: true },
                { col: "municipality_id", type: "INT UNSIGNED NOT NULL → FK", fk: true },
                { col: "name",            type: "VARCHAR(100) NOT NULL" },
                { col: "slug",            type: "VARCHAR(100) NOT NULL" },
                { col: "zone_type",       type: "ENUM('bairro','km','caop','zona')" },
                { col: "geo_lat",         type: "DECIMAL(9,6) NULL" },
                { col: "geo_lng",         type: "DECIMAL(9,6) NULL" },
                { col: "is_active",       type: "BOOLEAN DEFAULT TRUE" },
                { col: "created_at",      type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
              ].map(r => (
                <div key={r.col} className="flex items-start gap-2 px-4 py-2">
                  {r.pk && <span className="text-amber-500 text-xs font-bold mt-0.5">🔑</span>}
                  {r.fk && <span className="text-blue-500 text-xs font-bold mt-0.5">🔗</span>}
                  <code className={cn(
                    "text-xs font-mono",
                    r.pk ? "text-amber-600 dark:text-amber-400" : r.fk ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                  )}>{r.col}</code>
                  <span className="text-xs text-muted-foreground ml-auto">{r.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Code lang="sql">{`-- DDL — Executar após migration 0008
CREATE TABLE municipalities (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100)    NOT NULL,
    slug          VARCHAR(100)    NOT NULL,
    province      VARCHAR(100)    NOT NULL DEFAULT 'Luanda',
    country       CHAR(2)         NOT NULL DEFAULT 'AO',
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME                 ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_municipality_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE neighborhoods (
    id                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    municipality_id   INT UNSIGNED    NOT NULL,
    name              VARCHAR(100)    NOT NULL,
    slug              VARCHAR(100)    NOT NULL,
    zone_type         ENUM('bairro','km','caop','zona') NOT NULL DEFAULT 'bairro',
    geo_lat           DECIMAL(9, 6)   NULL,
    geo_lng           DECIMAL(9, 6)   NULL,
    is_active         BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_neighborhood_slug (municipality_id, slug),
    CONSTRAINT fk_neighborhood_municipality
        FOREIGN KEY (municipality_id) REFERENCES municipalities (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`}</Code>
      </Section>

      {/* SQLAlchemy Models */}
      <Section title="3. Modelos SQLAlchemy">
        <Code>{`# app/models/geography.py
from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    Boolean, DateTime, Enum as SAEnum, Integer,
    Numeric, String, ForeignKey, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.report import Report

ZoneType = SAEnum("bairro", "km", "caop", "zona", name="zone_type_enum")


class Municipality(Base):
    __tablename__ = "municipalities"

    id:         Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    name:       Mapped[str]           = mapped_column(String(100), nullable=False, unique=False)
    slug:       Mapped[str]           = mapped_column(String(100), nullable=False, unique=True, index=True)
    province:   Mapped[str]           = mapped_column(String(100), nullable=False, default="Luanda")
    country:    Mapped[str]           = mapped_column(String(2),   nullable=False, default="AO")
    is_active:  Mapped[bool]          = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=func.now())

    # Relationships
    neighborhoods: Mapped[List["Neighborhood"]] = relationship(
        "Neighborhood", back_populates="municipality",
        cascade="all, delete-orphan", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Municipality id={self.id} slug={self.slug!r}>"


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id:               Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    municipality_id:  Mapped[int]            = mapped_column(
        Integer, ForeignKey("municipalities.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False, index=True,
    )
    name:             Mapped[str]            = mapped_column(String(100), nullable=False)
    slug:             Mapped[str]            = mapped_column(String(100), nullable=False)
    zone_type:        Mapped[str]            = mapped_column(ZoneType, nullable=False, default="bairro")
    geo_lat:          Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    geo_lng:          Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    is_active:        Mapped[bool]            = mapped_column(Boolean, nullable=False, default=True)
    created_at:       Mapped[datetime]        = mapped_column(DateTime, server_default=func.now())

    # Relationships
    municipality: Mapped["Municipality"] = relationship("Municipality", back_populates="neighborhoods")

    def __repr__(self) -> str:
        return f"<Neighborhood id={self.id} name={self.name!r}>"`}</Code>
      </Section>

      {/* Alembic Migration */}
      <Section title="4. Migração Alembic — 0008">
        <Code>{`# migrations/versions/0008_municipalities_neighborhoods.py
"""Add municipalities and neighborhoods tables

Revision ID: 0008
Revises: 0007
Create Date: 2025-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

MULENVOS_SLUG = "mulenvos"
MULENVOS_BAIRROS = [
    ("Km 9-B",            "km-9-b",            "km"),
    ("Km 12-B",           "km-12-b",           "km"),
    ("Mulenvos De Cima",  "mulenvos-de-cima",  "bairro"),
    ("Baixa De Cassanje", "baixa-de-cassanje", "bairro"),
    ("Km 14-B",           "km-14-b",           "km"),
    ("Boa-Fé",            "boa-fe",            "bairro"),
    ("Caop C",            "caop-c",            "caop"),
    ("Caop A",            "caop-a",            "caop"),
    ("Caop B",            "caop-b",            "caop"),
    ("Capalanga",         "capalanga",         "bairro"),
]


def upgrade() -> None:
    # ── Create municipalities ─────────────────────────────────
    municipalities = op.create_table(
        "municipalities",
        sa.Column("id",         sa.Integer(),     nullable=False, autoincrement=True),
        sa.Column("name",       sa.String(100),   nullable=False),
        sa.Column("slug",       sa.String(100),   nullable=False, unique=True),
        sa.Column("province",   sa.String(100),   nullable=False, server_default="Luanda"),
        sa.Column("country",    sa.String(2),     nullable=False, server_default="AO"),
        sa.Column("is_active",  sa.Boolean(),     nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(),    server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(),    onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Create neighborhoods ──────────────────────────────────
    op.create_table(
        "neighborhoods",
        sa.Column("id",               sa.Integer(),     nullable=False, autoincrement=True),
        sa.Column("municipality_id",  sa.Integer(),     nullable=False),
        sa.Column("name",             sa.String(100),   nullable=False),
        sa.Column("slug",             sa.String(100),   nullable=False),
        sa.Column("zone_type",        sa.Enum("bairro","km","caop","zona", name="zone_type_enum"),
                                      nullable=False, server_default="bairro"),
        sa.Column("geo_lat",          sa.Numeric(9, 6), nullable=True),
        sa.Column("geo_lng",          sa.Numeric(9, 6), nullable=True),
        sa.Column("is_active",        sa.Boolean(),     nullable=False, server_default=sa.true()),
        sa.Column("created_at",       sa.DateTime(),    server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["municipality_id"], ["municipalities.id"],
                                ondelete="RESTRICT", onupdate="CASCADE",
                                name="fk_neighborhood_municipality"),
    )
    op.create_index("ix_neighborhoods_municipality_id", "neighborhoods", ["municipality_id"])

    # ── Seed: Município dos Mulenvos + 10 bairros ─────────────
    op.bulk_insert(municipalities, [
        {"name": "Município dos Mulenvos", "slug": MULENVOS_SLUG,
         "province": "Luanda", "country": "AO", "is_active": True},
    ])
    conn = op.get_bind()
    muni_id = conn.execute(
        sa.text("SELECT id FROM municipalities WHERE slug = :s"), {"s": MULENVOS_SLUG}
    ).scalar_one()

    op.execute(
        sa.text(
            "INSERT INTO neighborhoods (municipality_id, name, slug, zone_type) "
            "VALUES (:mid, :name, :slug, :zone)"
        ),
        [{"mid": muni_id, "name": n, "slug": s, "zone": z} for n, s, z in MULENVOS_BAIRROS],
    )

    # ── Add FK columns to reports table (nullable for migration safety)
    op.add_column("reports", sa.Column("municipality_id",  sa.Integer(), nullable=True))
    op.add_column("reports", sa.Column("neighborhood_id",  sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_report_municipality", "reports", "municipalities",
        ["municipality_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_report_neighborhood", "reports", "neighborhoods",
        ["neighborhood_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_report_neighborhood",  "reports", type_="foreignkey")
    op.drop_constraint("fk_report_municipality",  "reports", type_="foreignkey")
    op.drop_column("reports", "neighborhood_id")
    op.drop_column("reports", "municipality_id")
    op.drop_index("ix_neighborhoods_municipality_id", table_name="neighborhoods")
    op.drop_table("neighborhoods")
    op.drop_table("municipalities")
    op.execute("DROP TYPE IF EXISTS zone_type_enum")`}</Code>
      </Section>

      {/* Pydantic Schemas */}
      <Section title="5. Schemas Pydantic">
        <Code>{`# app/schemas/geography.py
from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import re


class NeighborhoodOut(BaseModel):
    id:           int
    name:         str
    slug:         str
    zone_type:    str
    geo_lat:      Optional[float] = None
    geo_lng:      Optional[float] = None

    model_config = {"from_attributes": True}


class MunicipalityOut(BaseModel):
    id:             int
    name:           str
    slug:           str
    province:       str
    country:        str
    neighborhoods:  List[NeighborhoodOut] = []

    model_config = {"from_attributes": True}


class MunicipalityListItem(BaseModel):
    id:    int
    name:  str
    slug:  str

    model_config = {"from_attributes": True}


# ── For creating reports — embed location IDs ──────────────────
class LocationEmbedCreate(BaseModel):
    municipality_id: int  = Field(..., gt=0)
    neighborhood_id: int  = Field(..., gt=0)`}</Code>
      </Section>

      {/* FastAPI Routes */}
      <Section title="6. Rotas FastAPI">
        <Code>{`# app/api/v1/geography.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.geography import Municipality, Neighborhood
from app.schemas.geography import MunicipalityListItem, MunicipalityOut, NeighborhoodOut

router = APIRouter(prefix="/geography", tags=["Geography"])


@router.get("/municipalities", response_model=list[MunicipalityListItem])
async def list_municipalities(db: AsyncSession = Depends(get_db)):
    """Lista todos os municípios activos."""
    result = await db.execute(
        select(Municipality).where(Municipality.is_active == True).order_by(Municipality.name)
    )
    return result.scalars().all()


@router.get("/municipalities/{municipality_id}/neighborhoods", response_model=list[NeighborhoodOut])
async def list_neighborhoods(municipality_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna os bairros/zonas de um município específico (carregamento dinâmico no front)."""
    result = await db.execute(
        select(Neighborhood)
        .where(
            Neighborhood.municipality_id == municipality_id,
            Neighborhood.is_active == True,
        )
        .order_by(Neighborhood.name)
    )
    neighborhoods = result.scalars().all()
    if not neighborhoods:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Município não encontrado ou sem bairros activos.")
    return neighborhoods


@router.get("/municipalities/{municipality_id}", response_model=MunicipalityOut)
async def get_municipality(municipality_id: int, db: AsyncSession = Depends(get_db)):
    """Detalhes completos de um município incluindo bairros."""
    result = await db.execute(
        select(Municipality).where(
            Municipality.id == municipality_id,
            Municipality.is_active == True,
        )
    )
    muni = result.scalar_one_or_none()
    if not muni:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Município não encontrado.")
    return muni


# ── Include in main router ─────────────────────────────────────
# app/api/v1/__init__.py → router.include_router(geography.router)`}</Code>

        <InfoBox title="Endpoints Gerados" color="green">
          <div className="space-y-2 font-mono text-xs">
            {[
              { method: "GET", path: "/api/v1/geography/municipalities", desc: "Lista municípios activos" },
              { method: "GET", path: "/api/v1/geography/municipalities/{id}/neighborhoods", desc: "Bairros de um município (usado no front)" },
              { method: "GET", path: "/api/v1/geography/municipalities/{id}", desc: "Detalhes + bairros completos" },
            ].map(e => (
              <div key={e.path} className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-green-600 text-white font-bold">{e.method}</span>
                <span className="text-foreground dark:text-zinc-300">{e.path}</span>
                <span className="text-muted-foreground">— {e.desc}</span>
              </div>
            ))}
          </div>
        </InfoBox>
      </Section>

      {/* Frontend */}
      <Section title="7. Frontend — Hook & Componente React">
        <Code lang="tsx">{`// hooks/useLocationSelect.ts
import { useState, useEffect } from "react";

export interface Municipality { id: number; name: string; slug: string; }
export interface Neighborhood  { id: number; name: string; slug: string; zone_type: string; }

const BASE = import.meta.env.BASE_URL.replace(/\\/$/, "");

export function useLocationSelect() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [neighborhoods,  setNeighborhoods]  = useState<Neighborhood[]>([]);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [neighborhoodId, setNeighborhoodId] = useState<number | null>(null);
  const [loading,        setLoading]        = useState(false);

  // Load municipalities once
  useEffect(() => {
    fetch(\`\${BASE}/api/v1/geography/municipalities\`)
      .then(r => r.json())
      .then(setMunicipalities)
      .catch(console.error);
  }, []);

  // Load neighborhoods when municipality changes
  useEffect(() => {
    if (!municipalityId) { setNeighborhoods([]); setNeighborhoodId(null); return; }
    setLoading(true);
    setNeighborhoodId(null);
    fetch(\`\${BASE}/api/v1/geography/municipalities/\${municipalityId}/neighborhoods\`)
      .then(r => r.json())
      .then(data => { setNeighborhoods(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [municipalityId]);

  return {
    municipalities, neighborhoods, loading,
    municipalityId, setMunicipalityId,
    neighborhoodId, setNeighborhoodId,
    isComplete: !!(municipalityId && neighborhoodId),
  };
}`}</Code>

        <Code lang="tsx">{`// components/LocationSelect.tsx — Cascading dropdown component
import { useLocationSelect } from "@/hooks/useLocationSelect";
import { cn } from "@/lib/utils";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";

export function LocationSelect({
  onChange,
}: {
  onChange?: (municipalityId: number, neighborhoodId: number) => void;
}) {
  const loc = useLocationSelect();

  function handleMunicipality(id: number) {
    loc.setMunicipalityId(id || null);
  }

  function handleNeighborhood(id: number) {
    loc.setNeighborhoodId(id || null);
    if (loc.municipalityId && id) onChange?.(loc.municipalityId, id);
  }

  return (
    <div className="space-y-3">
      {/* Município */}
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
          <MapPin size={14} className="text-primary" /> Município <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            className={cn(
              "w-full appearance-none text-sm px-3 py-2.5 pr-10 rounded-lg border",
              "border-border bg-background text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            )}
            value={loc.municipalityId ?? ""}
            onChange={e => handleMunicipality(Number(e.target.value))}
            required
            aria-required="true"
          >
            <option value="">— Seleccione o Município —</option>
            {loc.municipalities.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Bairro / Zona */}
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
          <MapPin size={14} className="text-blue-500" /> Bairro / Zona <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            className={cn(
              "w-full appearance-none text-sm px-3 py-2.5 pr-10 rounded-lg border transition-opacity",
              "border-border bg-background text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
              (!loc.municipalityId || loc.loading) && "opacity-50 cursor-not-allowed",
            )}
            value={loc.neighborhoodId ?? ""}
            onChange={e => handleNeighborhood(Number(e.target.value))}
            disabled={!loc.municipalityId || loc.loading}
            required
            aria-required="true"
            aria-busy={loc.loading}
          >
            <option value="">
              {loc.loading ? "A carregar bairros…" : loc.municipalityId ? "— Seleccione o Bairro/Zona —" : "← Seleccione primeiro o Município"}
            </option>
            {loc.neighborhoods.map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
          {loc.loading
            ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            : <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          }
        </div>
      </div>
    </div>
  );
}`}</Code>
      </Section>

      {/* Seed Data */}
      <Section title="8. Dados Iniciais — Município dos Mulenvos">
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <div className="bg-zinc-950 px-4 py-2">
            <span className="text-white font-bold text-sm">Município dos Mulenvos · 10 Bairros/Zonas</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0 divide-x divide-y divide-border">
            {MULENVOS_BAIRROS.map((b, i) => (
              <div key={b} className="p-3 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground font-mono">#{i + 1}</span>
                <span className="text-sm font-semibold text-foreground">{b}</span>
                <span className="text-[10px] text-muted-foreground">
                  {b.startsWith("Km") ? "km" : b.startsWith("Caop") ? "caop" : "bairro"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Code>{`# scripts/seed_geography.py  — executar uma vez após migration 0008
"""
python -m scripts.seed_geography
Requires: DATABASE_URL env var pointing to the MySQL instance.
"""
import os, asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.geography import Municipality, Neighborhood

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

GEOGRAPHY = {
    "Município dos Mulenvos": {
        "slug": "mulenvos", "province": "Luanda",
        "bairros": [
            ("Km 9-B",            "km-9-b",            "km"),
            ("Km 12-B",           "km-12-b",           "km"),
            ("Mulenvos De Cima",  "mulenvos-de-cima",  "bairro"),
            ("Baixa De Cassanje", "baixa-de-cassanje", "bairro"),
            ("Km 14-B",           "km-14-b",           "km"),
            ("Boa-Fé",            "boa-fe",            "bairro"),
            ("Caop C",            "caop-c",            "caop"),
            ("Caop A",            "caop-a",            "caop"),
            ("Caop B",            "caop-b",            "caop"),
            ("Capalanga",         "capalanga",         "bairro"),
        ],
    },
}

async def seed():
    async with AsyncSessionLocal() as db:
        for muni_name, data in GEOGRAPHY.items():
            muni = Municipality(name=muni_name, slug=data["slug"], province=data["province"])
            db.add(muni)
            await db.flush()
            for name, slug, zone_type in data["bairros"]:
                db.add(Neighborhood(
                    municipality_id=muni.id, name=name,
                    slug=slug, zone_type=zone_type,
                ))
        await db.commit()
        print(f"✓ Seed completo: {len(GEOGRAPHY)} município(s)")

if __name__ == "__main__":
    asyncio.run(seed())`}</Code>
      </Section>

      {/* Dashboard integration */}
      <Section title="9. Integração — Dashboard & IA">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <InfoBox title="Dashboard Analítico" color="blue">
            <p>Adicionar filtros <code className="bg-secondary px-1 rounded text-xs">municipality_id</code> e <code className="bg-secondary px-1 rounded text-xs">neighborhood_id</code> à query do painel.</p>
            <p className="mt-1">Heatmap deve agrupar por <code className="bg-secondary px-1 rounded text-xs">neighborhood.geo_lat/lng</code>.</p>
            <p className="mt-1">KPIs e gráficos de barras já preparados para filtro por bairro no <strong>Dashboard Admin</strong>.</p>
          </InfoBox>
          <InfoBox title="Sistema de IA" color="amber">
            <p>O <code className="bg-secondary px-1 rounded text-xs">HotspotDetector</code> deve agrupar por <code className="bg-secondary px-1 rounded text-xs">neighborhood_id</code> em vez de string livre.</p>
            <p className="mt-1">O <code className="bg-secondary px-1 rounded text-xs">CrisisAggregator</code> inclui <code className="bg-secondary px-1 rounded text-xs">municipality_id</code> nos alertas gerados.</p>
          </InfoBox>
        </div>

        <Code>{`# Exemplo: query filtrada por bairro no report service
from sqlalchemy import select, func
from app.models.report import Report
from app.models.geography import Neighborhood, Municipality

async def reports_by_neighborhood(
    db: AsyncSession,
    municipality_id: int | None = None,
    neighborhood_id: int | None = None,
):
    q = select(
        Neighborhood.name.label("neighborhood"),
        Municipality.name.label("municipality"),
        func.count(Report.id).label("total"),
        func.sum(Report.resolved.cast(Integer)).label("resolved"),
    ).join(Report.neighborhood).join(Neighborhood.municipality)

    if municipality_id:
        q = q.where(Neighborhood.municipality_id == municipality_id)
    if neighborhood_id:
        q = q.where(Report.neighborhood_id == neighborhood_id)

    q = q.group_by(Neighborhood.id, Municipality.id).order_by(func.count(Report.id).desc())
    result = await db.execute(q)
    return result.mappings().all()


# Exportação CSV com município + bairro
EXPORT_HEADERS = [
    "ticket_id", "município", "bairro", "tipo",
    "descrição", "estado", "sla_status", "data_criação", "responsável"
]`}</Code>
      </Section>

      {/* Footer notice */}
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
        <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">
          Preparado para Expansão
        </p>
        <p className="text-sm text-green-700 dark:text-green-300">
          Para adicionar novos municípios, comunas ou distritos: executar apenas <code className="bg-white/50 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs">INSERT INTO municipalities / neighborhoods</code>. Sem alteração de schema ou código de aplicação.
        </p>
      </div>
    </article>
  );
}
