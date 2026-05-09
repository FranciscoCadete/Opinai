import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

// ─── Code ──────────────────────────────────────────────────────────────────

const CODE_SCHEMAS = `# app/schemas/report.py
from __future__ import annotations

import base64
import re
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Enumerações ───────────────────────────────────────────────

class ReportType(str, Enum):
    COMPLAINT    = "COMPLAINT"     # Reclamação
    SUGGESTION   = "SUGGESTION"    # Sugestão
    DENUNCIATION = "DENUNCIATION"  # Denúncia
    REQUEST      = "REQUEST"       # Pedido de serviço
    PRAISE       = "PRAISE"        # Elogio


class ReportStatus(str, Enum):
    SUBMITTED   = "SUBMITTED"    # Recebido — estado inicial
    TRIAGED     = "TRIAGED"      # Triado — análise concluída
    ASSIGNED    = "ASSIGNED"     # Atribuído a técnico
    IN_PROGRESS = "IN_PROGRESS"  # Em execução
    RESOLVED    = "RESOLVED"     # Resolvido — aguarda confirmação
    CLOSED      = "CLOSED"       # Encerrado (terminal)


class ChannelSource(str, Enum):
    WHATSAPP  = "whatsapp"
    SMS       = "sms"
    USSD      = "ussd"
    WEB       = "web"
    MOBILE    = "mobile"
    MESSENGER = "messenger"


# ─── Tipos de ficheiro permitidos ──────────────────────────────

ALLOWED_IMAGE_MIMES = frozenset({
    "image/jpeg", "image/png", "image/webp", "image/gif",
})
ALLOWED_AUDIO_MIMES = frozenset({
    "audio/mpeg", "audio/wav", "audio/ogg",
    "audio/webm", "audio/mp4",
})
ALLOWED_MIMES = ALLOWED_IMAGE_MIMES | ALLOWED_AUDIO_MIMES

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024   # 5 MB
MAX_FILES_PER_REPORT = 3


# ─── Sub-schemas ───────────────────────────────────────────────

class MediaItemBase64(BaseModel):
    """Ficheiro enviado como base64 (JSON body)."""
    content_b64: str = Field(description="Conteúdo do ficheiro codificado em base64.")
    mime_type:   str = Field(description="MIME type do ficheiro.")
    filename:    str = Field(max_length=255)

    @field_validator("mime_type")
    @classmethod
    def validate_mime(cls, v: str) -> str:
        if v.lower() not in ALLOWED_MIMES:
            raise ValueError(
                f"Tipo de ficheiro não permitido: {v}. "
                f"Permitidos: {', '.join(sorted(ALLOWED_MIMES))}"
            )
        return v.lower()

    @field_validator("content_b64")
    @classmethod
    def validate_size(cls, v: str) -> str:
        # base64 inflates ~33%; verificar tamanho antes do decode
        estimated = len(v) * 3 // 4
        if estimated > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Ficheiro demasiado grande. Máximo: 5 MB.")
        try:
            decoded = base64.b64decode(v, validate=True)
        except Exception:
            raise ValueError("content_b64 não é base64 válido.")
        if len(decoded) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Ficheiro demasiado grande. Máximo: 5 MB.")
        return v

    @field_validator("filename")
    @classmethod
    def sanitize_filename(cls, v: str) -> str:
        # Remover path traversal e caracteres perigosos
        safe = re.sub(r"[^a-zA-Z0-9._-]", "_", v.strip())
        if not safe:
            raise ValueError("Nome de ficheiro inválido.")
        return safe


class GeoLocation(BaseModel):
    latitude:  float = Field(ge=-90.0,  le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)


# ─── Schemas de criação ────────────────────────────────────────

class ReportCreateJSON(BaseModel):
    """Submissão via JSON body (texto + base64 para ficheiros)."""
    report_type:   ReportType
    channel:       ChannelSource
    title:         str  = Field(min_length=5, max_length=300)
    description:   Optional[str] = Field(default=None, max_length=5000)

    # Geolocalização
    geo:           Optional[GeoLocation] = None
    address_text:  Optional[str]         = Field(default=None, max_length=500)
    bairro_id:     Optional[str]         = None

    # Contacto opcional (submissão anónima com contacto de retorno)
    contact_phone: Optional[str] = Field(
        default=None,
        pattern=r"^\\+?[0-9]{7,15}$",
        description="Número de telefone para feedback. Não obrigatório.",
    )
    contact_email: Optional[str] = Field(default=None, max_length=254)

    # Ficheiros em base64
    media_items: Optional[list[MediaItemBase64]] = None

    @field_validator("media_items")
    @classmethod
    def max_files(cls, v: Optional[list]) -> Optional[list]:
        if v and len(v) > MAX_FILES_PER_REPORT:
            raise ValueError(f"Máximo de {MAX_FILES_PER_REPORT} ficheiros por relatório.")
        return v

    @model_validator(mode="after")
    def ussd_no_media(self) -> "ReportCreateJSON":
        if self.channel == ChannelSource.USSD and self.media_items:
            raise ValueError("Canal USSD não suporta envio de ficheiros.")
        return self


# ─── Schemas de resposta ───────────────────────────────────────

class ReportSubmitResponse(BaseModel):
    """Resposta pública após submissão bem-sucedida."""
    ticket_id:    str
    report_id:    str
    status:       ReportStatus
    message:      str = "Relatório recebido com sucesso. Use o ticket_id para acompanhar."
    created_at:   datetime


class ReportTrackingResponse(BaseModel):
    """Resposta pública para consulta por ticket_id (sem dados internos)."""
    ticket_id:      str
    report_type:    ReportType
    title:          str
    status:         ReportStatus
    bairro:         Optional[str]
    channel:        str
    media_count:    int
    created_at:     datetime
    last_updated:   datetime
    # Histórico de estados — visível ao cidadão
    status_history: list[dict[str, Any]]


class ReportAdminDetail(BaseModel):
    """Detalhe completo para funcionários autenticados."""
    id:            str
    ticket_id:     str
    report_type:   ReportType
    title:         str
    description:   Optional[str]
    status:        ReportStatus
    channel:       str
    bairro_id:     Optional[str]
    bairro_nome:   Optional[str]
    latitude:      Optional[float]
    longitude:     Optional[float]
    address_text:  Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    media_urls:    list[str]
    submitter_id:  Optional[str]   # None para anónimos
    raw_payload:   Optional[dict]
    created_at:    datetime
    updated_at:    datetime
    status_history: list[dict[str, Any]]


class ReportStatusUpdate(BaseModel):
    new_status:     ReportStatus
    note:           Optional[str] = Field(default=None, max_length=1000)
    assigned_to:    Optional[str] = None   # UUID do técnico (se ASSIGNED)


# ─── Schemas de listagem (admin) ───────────────────────────────

class ReportListFilters(BaseModel):
    """Parâmetros de query para GET /reports."""
    status:      Optional[ReportStatus] = None
    report_type: Optional[ReportType]   = None
    channel:     Optional[ChannelSource]= None
    bairro_id:   Optional[str]          = None
    date_from:   Optional[datetime]     = None
    date_to:     Optional[datetime]     = None
    search:      Optional[str]          = Field(default=None, max_length=200)

    page:     int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
    sort:     str = Field(default="created_at")
    order:    str = Field(default="desc", pattern=r"^(asc|desc)$")


class ReportListItem(BaseModel):
    id:          str
    ticket_id:   str
    report_type: ReportType
    title:       str
    status:      ReportStatus
    channel:     str
    bairro:      Optional[str]
    created_at:  datetime
    updated_at:  datetime


class PaginatedReports(BaseModel):
    items:    list[ReportListItem]
    total:    int
    page:     int
    per_page: int
    pages:    int`;

const CODE_MODEL = `# app/models/report.py
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import (
    DateTime, Enum, ForeignKey, JSON, Numeric,
    String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.channel import Channel
    from app.models.bairro import Bairro
    from app.models.ticket import Ticket


class Report(Base):
    __tablename__ = "reports"

    id:             Mapped[str]           = mapped_column(String(36), primary_key=True)
    ticket_id:      Mapped[str]           = mapped_column(String(20), nullable=False, unique=True, index=True)
    user_id:        Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id",    ondelete="SET NULL"), nullable=True,  index=True)
    channel_id:     Mapped[str]           = mapped_column(String(36), ForeignKey("channels.id", ondelete="RESTRICT"),nullable=False, index=True)
    bairro_id:      Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bairros.id",  ondelete="SET NULL"), nullable=True,  index=True)

    report_type:    Mapped[str]           = mapped_column(
        Enum("COMPLAINT","SUGGESTION","DENUNCIATION","REQUEST","PRAISE", name="enum_report_type"),
        nullable=False, index=True,
    )
    status:         Mapped[str]           = mapped_column(
        Enum("SUBMITTED","TRIAGED","ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED", name="enum_report_status_v2"),
        nullable=False, server_default="SUBMITTED", index=True,
    )
    title:          Mapped[str]           = mapped_column(String(300), nullable=False)
    description:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Geolocalização
    latitude:       Mapped[Optional[float]] = mapped_column(Numeric(10, 7), nullable=True)
    longitude:      Mapped[Optional[float]] = mapped_column(Numeric(10, 7), nullable=True)
    address_text:   Mapped[Optional[str]]   = mapped_column(String(500), nullable=True)
    bairro_text:    Mapped[Optional[str]]   = mapped_column(String(150), nullable=True)

    # Contacto opcional (anónimos)
    contact_phone:  Mapped[Optional[str]]   = mapped_column(String(20), nullable=True)
    contact_email:  Mapped[Optional[str]]   = mapped_column(String(254), nullable=True)

    # Ficheiros
    media_urls:     Mapped[Optional[Any]]   = mapped_column(JSON, nullable=True)

    # Histórico de estados (append-only list em JSON)
    status_history: Mapped[Optional[Any]]   = mapped_column(JSON, nullable=True, server_default="[]")

    # Payload original do canal para auditoria
    raw_payload:    Mapped[Optional[Any]]   = mapped_column(JSON, nullable=True)

    # Soft delete
    created_at:     Mapped[datetime]        = mapped_column(DateTime, nullable=False)
    updated_at:     Mapped[datetime]        = mapped_column(DateTime, nullable=False)
    deleted_at:     Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relações
    submitter: Mapped[Optional["User"]]    = relationship("User",    foreign_keys=[user_id])
    channel:   Mapped["Channel"]           = relationship("Channel", foreign_keys=[channel_id])
    bairro:    Mapped[Optional["Bairro"]]  = relationship("Bairro",  foreign_keys=[bairro_id])
    ticket:    Mapped[Optional["Ticket"]]  = relationship("Ticket",  back_populates="report", uselist=False)`;

const CODE_STORAGE = `# app/core/storage.py
"""
Camada de abstracção de armazenamento de ficheiros.

Implementação actual: sistema de ficheiros local (LocalFileStorage).
Migração para S3: substituir por S3FileStorage sem alterar o código
dos serviços — a interface é idêntica.

Uso nos serviços:
    from app.core.storage import get_storage
    storage = get_storage()
    url = await storage.save(content=bytes_data, mime_type="image/jpeg", prefix="reports")
    await storage.delete(url)
"""
from __future__ import annotations

import hashlib
import mimetypes
import uuid
from abc import ABC, abstractmethod
from datetime import date
from pathlib import Path

import aiofiles
import aiofiles.os

from app.config import settings


class BaseStorage(ABC):
    @abstractmethod
    async def save(
        self,
        content:   bytes,
        mime_type: str,
        prefix:    str = "uploads",
    ) -> str:
        """Guarda o ficheiro e devolve o URL ou path público."""

    @abstractmethod
    async def delete(self, path: str) -> None:
        """Remove o ficheiro. Não lança exceção se não existir."""

    @abstractmethod
    def public_url(self, path: str) -> str:
        """Devolve o URL público dado o path interno."""


# ─── Implementação local ────────────────────────────────────────

class LocalFileStorage(BaseStorage):
    """
    Armazena ficheiros em MEDIA_ROOT/{prefix}/{YYYYMMDD}/{uuid}.{ext}
    Servidos por Nginx como ficheiros estáticos via /media/.
    """

    def __init__(self, media_root: Path, base_url: str) -> None:
        self._root     = media_root
        self._base_url = base_url.rstrip("/")

    async def save(
        self,
        content:   bytes,
        mime_type: str,
        prefix:    str = "uploads",
    ) -> str:
        ext       = mimetypes.guess_extension(mime_type) or ".bin"
        today     = date.today().strftime("%Y%m%d")
        filename  = f"{uuid.uuid4().hex}{ext}"
        rel_path  = Path(prefix) / today / filename
        full_path = self._root / rel_path

        # Criar directórios se necessário
        await aiofiles.os.makedirs(full_path.parent, exist_ok=True)

        async with aiofiles.open(full_path, "wb") as f:
            await f.write(content)

        return str(rel_path)   # ex: reports/20250509/abc123.jpg

    async def delete(self, path: str) -> None:
        full_path = self._root / path
        try:
            await aiofiles.os.remove(full_path)
        except FileNotFoundError:
            pass

    def public_url(self, path: str) -> str:
        return f"{self._base_url}/media/{path}"


# ─── Implementação S3 (pronta para migração) ───────────────────

class S3FileStorage(BaseStorage):
    """
    Armazena ficheiros em AWS S3 (ou Cloudflare R2, MinIO, etc.).
    Requer: pip install aioboto3

    Activar definindo STORAGE_BACKEND=s3 no .env.
    """

    def __init__(
        self,
        bucket:     str,
        region:     str,
        access_key: str,
        secret_key: str,
        cdn_base:   str,
    ) -> None:
        self._bucket     = bucket
        self._region     = region
        self._access_key = access_key
        self._secret_key = secret_key
        self._cdn_base   = cdn_base.rstrip("/")

    async def save(self, content: bytes, mime_type: str, prefix: str = "uploads") -> str:
        import aioboto3  # type: ignore
        ext      = mimetypes.guess_extension(mime_type) or ".bin"
        today    = date.today().strftime("%Y%m%d")
        key      = f"{prefix}/{today}/{uuid.uuid4().hex}{ext}"
        session  = aioboto3.Session(
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            region_name=self._region,
        )
        async with session.client("s3") as s3:
            await s3.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=content,
                ContentType=mime_type,
            )
        return key

    async def delete(self, path: str) -> None:
        import aioboto3  # type: ignore
        session = aioboto3.Session(
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            region_name=self._region,
        )
        async with session.client("s3") as s3:
            await s3.delete_object(Bucket=self._bucket, Key=path)

    def public_url(self, path: str) -> str:
        return f"{self._cdn_base}/{path}"


# ─── Fábrica ───────────────────────────────────────────────────

def get_storage() -> BaseStorage:
    """
    Devolve a implementação de storage configurada via STORAGE_BACKEND.
    Injectável como dependência FastAPI.
    """
    backend = getattr(settings, "STORAGE_BACKEND", "local")

    if backend == "s3":
        return S3FileStorage(
            bucket=settings.S3_BUCKET,
            region=settings.S3_REGION,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            cdn_base=settings.S3_CDN_BASE,
        )

    return LocalFileStorage(
        media_root=Path(settings.MEDIA_ROOT),
        base_url=settings.PUBLIC_BASE_URL,
    )


# ─── Utilitário de validação MIME via magic bytes ──────────────

_MAGIC: dict[bytes, str] = {
    b"\\xff\\xd8\\xff": "image/jpeg",
    b"\\x89PNG":        "image/png",
    b"RIFF":           "image/webp",  # simplificado
    b"GIF8":           "image/gif",
    b"ID3":            "audio/mpeg",
    b"\\xff\\xfb":     "audio/mpeg",
    b"OggS":           "audio/ogg",
    b"fLaC":           "audio/flac",
    b"\\x1aE\\xdf\\xa3": "audio/webm",
}

def verify_mime_magic(content: bytes, declared_mime: str) -> bool:
    """
    Verifica que os magic bytes do ficheiro correspondem ao MIME declarado.
    Previne upload disfarçado (ex: ficheiro .php renomeado para .jpg).
    """
    for magic, real_mime in _MAGIC.items():
        if content.startswith(magic):
            return real_mime == declared_mime
    # Se não reconhecido, aceitar (edge case para formatos menos comuns)
    return True`;

const CODE_SERVICE = `# app/services/report_service.py
from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import BaseStorage, verify_mime_magic
from app.models.audit_log import AuditLog
from app.models.channel import Channel
from app.models.report import Report
from app.schemas.report import (
    MediaItemBase64,
    PaginatedReports,
    ReportAdminDetail,
    ReportCreateJSON,
    ReportListFilters,
    ReportListItem,
    ReportStatus,
    ReportSubmitResponse,
    ReportTrackingResponse,
)

# ─── State machine ─────────────────────────────────────────────
# Transições válidas: {estado_actual: [estados_seguintes_permitidos]}
VALID_TRANSITIONS: dict[str, list[str]] = {
    "SUBMITTED":   ["TRIAGED"],
    "TRIAGED":     ["ASSIGNED", "CLOSED"],
    "ASSIGNED":    ["IN_PROGRESS", "TRIAGED"],
    "IN_PROGRESS": ["RESOLVED", "ASSIGNED"],
    "RESOLVED":    ["CLOSED", "IN_PROGRESS"],  # reabrir se necessário
    "CLOSED":      [],                          # estado terminal
}

ALLOWED_MIMES = frozenset({
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4",
})


class ReportService:
    def __init__(self, db: AsyncSession, storage: BaseStorage) -> None:
        self._db      = db
        self._storage = storage

    # ── Submissão ──────────────────────────────────────────────
    async def create_report(
        self,
        data:         ReportCreateJSON,
        actor_id:     Optional[str] = None,  # None = anónimo
        ip_address:   Optional[str] = None,
        user_agent:   Optional[str] = None,
        raw_payload:  Optional[dict] = None,
    ) -> ReportSubmitResponse:
        channel = await self._resolve_channel(data.channel)
        ticket_id = await self._generate_ticket_id()

        # Processar e guardar ficheiros em base64
        media_urls: list[str] = []
        if data.media_items:
            for item in data.media_items:
                url = await self._save_base64_file(item)
                media_urls.append(url)

        now = datetime.now(timezone.utc)

        report = Report(
            id=str(uuid.uuid4()),
            ticket_id=ticket_id,
            user_id=actor_id,
            channel_id=channel.id,
            bairro_id=data.bairro_id,
            report_type=data.report_type.value,
            status="SUBMITTED",
            title=data.title,
            description=data.description,
            latitude=data.geo.latitude  if data.geo else None,
            longitude=data.geo.longitude if data.geo else None,
            address_text=data.address_text,
            contact_phone=data.contact_phone,
            contact_email=data.contact_email,
            media_urls=media_urls,
            status_history=[{
                "status":     "SUBMITTED",
                "timestamp":  now.isoformat(),
                "actor_id":   actor_id,
                "note":       "Relatório submetido.",
            }],
            raw_payload=raw_payload,
            created_at=now,
            updated_at=now,
        )
        self._db.add(report)

        # Audit log
        await self._audit(
            table_name="reports",
            record_id=report.id,
            action="INSERT",
            actor_id=actor_id,
            new_data={"ticket_id": ticket_id, "status": "SUBMITTED"},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        await self._db.commit()
        await self._db.refresh(report)

        return ReportSubmitResponse(
            ticket_id=report.ticket_id,
            report_id=report.id,
            status=ReportStatus(report.status),
            created_at=report.created_at,
        )

    # ── Consulta pública por ticket_id ────────────────────────
    async def track_by_ticket_id(self, ticket_id: str) -> ReportTrackingResponse:
        report = await self._get_by_ticket_id(ticket_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "REPORT_NOT_FOUND", "message": f"Ticket {ticket_id!r} não encontrado."},
            )

        bairro_nome: Optional[str] = None
        if report.bairro:
            bairro_nome = report.bairro.nome

        return ReportTrackingResponse(
            ticket_id=report.ticket_id,
            report_type=report.report_type,
            title=report.title,
            status=ReportStatus(report.status),
            bairro=bairro_nome,
            channel=report.channel.name,
            media_count=len(report.media_urls or []),
            created_at=report.created_at,
            last_updated=report.updated_at,
            status_history=report.status_history or [],
        )

    # ── Detalhe admin ─────────────────────────────────────────
    async def get_report_admin(self, report_id: str) -> ReportAdminDetail:
        result = await self._db.execute(
            select(Report).where(Report.id == report_id, Report.deleted_at.is_(None))
        )
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=404, detail={"code": "REPORT_NOT_FOUND"})

        return self._to_admin_detail(report)

    # ── Listagem paginada (admin) ─────────────────────────────
    async def list_reports(self, filters: ReportListFilters) -> PaginatedReports:
        q = select(Report).where(Report.deleted_at.is_(None))

        if filters.status:
            q = q.where(Report.status == filters.status.value)
        if filters.report_type:
            q = q.where(Report.report_type == filters.report_type.value)
        if filters.channel:
            # Resolve channel name → id via sub-query (simplificado)
            q = q.join(Report.channel).where(Channel.name == filters.channel.value)
        if filters.bairro_id:
            q = q.where(Report.bairro_id == filters.bairro_id)
        if filters.date_from:
            q = q.where(Report.created_at >= filters.date_from)
        if filters.date_to:
            q = q.where(Report.created_at <= filters.date_to)
        if filters.search:
            term = f"%{filters.search}%"
            q = q.where(Report.title.ilike(term) | Report.ticket_id.ilike(term))

        # Total
        count_q = select(func.count()).select_from(q.subquery())
        total   = (await self._db.execute(count_q)).scalar_one()

        # Ordenação
        sort_col = getattr(Report, filters.sort, Report.created_at)
        if filters.order == "desc":
            sort_col = sort_col.desc()
        q = q.order_by(sort_col)

        # Paginação
        offset = (filters.page - 1) * filters.per_page
        q = q.offset(offset).limit(filters.per_page)

        rows = (await self._db.execute(q)).scalars().all()

        items = [
            ReportListItem(
                id=r.id,
                ticket_id=r.ticket_id,
                report_type=r.report_type,
                title=r.title,
                status=r.status,
                channel=r.channel.name if r.channel else "",
                bairro=r.bairro.nome if r.bairro else None,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in rows
        ]

        import math
        return PaginatedReports(
            items=items,
            total=total,
            page=filters.page,
            per_page=filters.per_page,
            pages=math.ceil(total / filters.per_page) if total else 0,
        )

    # ── Actualização de estado ─────────────────────────────────
    async def update_status(
        self,
        report_id:  str,
        new_status: ReportStatus,
        note:       Optional[str],
        actor_id:   str,
        assigned_to: Optional[str] = None,
        ip_address:  Optional[str] = None,
    ) -> Report:
        result = await self._db.execute(
            select(Report).where(Report.id == report_id, Report.deleted_at.is_(None))
        )
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=404, detail={"code": "REPORT_NOT_FOUND"})

        # Validar transição
        allowed = VALID_TRANSITIONS.get(report.status, [])
        if new_status.value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code":    "INVALID_TRANSITION",
                    "message": (
                        f"Não é possível passar de {report.status!r} "
                        f"para {new_status.value!r}. "
                        f"Transições válidas: {allowed or ['nenhuma (estado terminal)']}"
                    ),
                },
            )

        now = datetime.now(timezone.utc)
        old_status = report.status

        # Actualizar estado e histórico
        history: list = list(report.status_history or [])
        history.append({
            "status":    new_status.value,
            "timestamp": now.isoformat(),
            "actor_id":  actor_id,
            "note":      note,
        })
        report.status         = new_status.value
        report.status_history = history
        report.updated_at     = now

        # Audit log
        await self._audit(
            table_name="reports",
            record_id=report.id,
            action="UPDATE",
            actor_id=actor_id,
            old_data={"status": old_status},
            new_data={"status": new_status.value, "note": note},
            ip_address=ip_address,
        )

        await self._db.commit()
        await self._db.refresh(report)
        return report

    # ── Ticket ID ─────────────────────────────────────────────
    async def _generate_ticket_id(self) -> str:
        """
        Formato: MUL-YYYYMMDD-XXXX
        XXXX = sequência do dia com zero-padding.
        Usa SELECT COUNT para determinar o próximo número — sem colisão
        porque INSERT tem UNIQUE constraint em ticket_id.
        """
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        prefix    = f"MUL-{today_str}-"

        # Contar relatórios de hoje para obter o próximo número
        count_q = select(func.count()).where(
            Report.ticket_id.like(f"{prefix}%")
        )
        today_count = (await self._db.execute(count_q)).scalar_one()
        seq = today_count + 1

        # Protecção contra overflow (>9999 relatórios/dia)
        if seq > 9999:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": "TICKET_QUOTA_EXCEEDED", "message": "Limite diário de relatórios atingido."},
            )
        return f"{prefix}{seq:04d}"   # ex: MUL-20250509-0001

    # ── Ficheiros ─────────────────────────────────────────────
    async def _save_base64_file(self, item: MediaItemBase64) -> str:
        content = base64.b64decode(item.content_b64)
        # Verificar magic bytes (previne MIME spoofing)
        if not verify_mime_magic(content, item.mime_type):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code":    "MIME_MISMATCH",
                    "message": f"O conteúdo do ficheiro {item.filename!r} não corresponde ao MIME declarado.",
                },
            )
        path = await self._storage.save(
            content=content,
            mime_type=item.mime_type,
            prefix="reports",
        )
        return self._storage.public_url(path)

    # ── Helpers ────────────────────────────────────────────────
    async def _resolve_channel(self, channel_name: str) -> Channel:
        result = await self._db.execute(
            select(Channel).where(Channel.name == channel_name, Channel.is_active == True)
        )
        ch = result.scalar_one_or_none()
        if not ch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_CHANNEL", "message": f"Canal {channel_name!r} inactivo ou inexistente."},
            )
        return ch

    async def _get_by_ticket_id(self, ticket_id: str) -> Optional[Report]:
        result = await self._db.execute(
            select(Report).where(Report.ticket_id == ticket_id, Report.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    def _to_admin_detail(self, r: Report) -> ReportAdminDetail:
        return ReportAdminDetail(
            id=r.id,
            ticket_id=r.ticket_id,
            report_type=r.report_type,
            title=r.title,
            description=r.description,
            status=r.status,
            channel=r.channel.name if r.channel else "",
            bairro_id=r.bairro_id,
            bairro_nome=r.bairro.nome if r.bairro else None,
            latitude=float(r.latitude) if r.latitude is not None else None,
            longitude=float(r.longitude) if r.longitude is not None else None,
            address_text=r.address_text,
            contact_phone=r.contact_phone,
            contact_email=r.contact_email,
            media_urls=r.media_urls or [],
            submitter_id=r.user_id,
            raw_payload=r.raw_payload,
            created_at=r.created_at,
            updated_at=r.updated_at,
            status_history=r.status_history or [],
        )

    async def _audit(
        self,
        table_name: str,
        record_id:  str,
        action:     str,
        actor_id:   Optional[str],
        new_data:   Optional[dict] = None,
        old_data:   Optional[dict] = None,
        ip_address: Optional[str]  = None,
        user_agent: Optional[str]  = None,
    ) -> None:
        self._db.add(AuditLog(
            id=str(uuid.uuid4()),
            table_name=table_name,
            record_id=record_id,
            action=action,
            actor_id=actor_id,
            old_data=old_data,
            new_data=new_data,
            ip_address=ip_address,
            user_agent=user_agent,
            occurred_at=datetime.now(timezone.utc),
        ))`;

const CODE_ROUTER = `# app/routers/v1/reports.py
from __future__ import annotations

import base64
import json
from typing import Annotated, Optional

import redis.asyncio as aioredis
from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    Query, Request, Response, UploadFile, status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.core.storage import get_storage, BaseStorage, ALLOWED_MIMES, MAX_FILE_SIZE_BYTES
from app.database.session import get_async_session
from app.models.user import User
from app.schemas.report import (
    ChannelSource,
    PaginatedReports,
    ReportAdminDetail,
    ReportCreateJSON,
    ReportListFilters,
    ReportStatus,
    ReportStatusUpdate,
    ReportSubmitResponse,
    ReportTrackingResponse,
    ReportType,
)
from app.services.report_service import ReportService
from app.config import settings

router = APIRouter(prefix="/reports", tags=["Relatórios"])


# ─── Rate limiting de submissão ────────────────────────────────
# 10 relatórios por hora por IP (anónimo ou autenticado)

async def _check_submit_rate_limit(request: Request) -> None:
    ip  = request.client.host if request.client else "unknown"
    key = f"report_submit:{ip}"
    async with aioredis.from_url(settings.REDIS_URL, decode_responses=True) as r:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, 3600)   # janela de 1 hora
        if count > 10:
            ttl = await r.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code":    "SUBMIT_RATE_LIMIT",
                    "message": "Limite de submissões atingido (10/hora). Tente mais tarde.",
                    "retry_after_seconds": max(ttl, 0),
                },
                headers={"Retry-After": str(max(ttl, 0))},
            )


# ─── POST /reports  (JSON + base64) ────────────────────────────

@router.post(
    "",
    response_model=ReportSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submeter relatório (JSON + ficheiros em base64)",
    description=(
        "Endpoint público — não requer autenticação. "
        "Submissões anónimas são permitidas. "
        "Rate limit: 10 relatórios/hora por IP."
    ),
)
async def submit_report_json(
    body:    ReportCreateJSON,
    request: Request,
    db:      AsyncSession = Depends(get_async_session),
    storage: BaseStorage  = Depends(get_storage),
    # Utilizador autenticado opcional
    current_user: Optional[User] = Depends(
        lambda: None  # substituir por optional auth dependency
    ),
) -> ReportSubmitResponse:
    await _check_submit_rate_limit(request)

    svc = ReportService(db, storage)
    return await svc.create_report(
        data=body,
        actor_id=current_user.id if current_user else None,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        raw_payload=body.model_dump(exclude={"media_items"}),
    )


# ─── POST /reports/multipart  (multipart form + ficheiros) ─────

@router.post(
    "/multipart",
    response_model=ReportSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submeter relatório (multipart/form-data)",
    description="Aceita ficheiros reais em vez de base64. Máximo 5 MB por ficheiro, 3 ficheiros.",
)
async def submit_report_multipart(
    request:     Request,
    report_type: Annotated[str,            Form()],
    channel:     Annotated[str,            Form()],
    title:       Annotated[str,            Form()],
    description: Annotated[Optional[str],  Form()] = None,
    latitude:    Annotated[Optional[float],Form()] = None,
    longitude:   Annotated[Optional[float],Form()] = None,
    address_text:Annotated[Optional[str],  Form()] = None,
    bairro_id:   Annotated[Optional[str],  Form()] = None,
    contact_phone:Annotated[Optional[str], Form()] = None,
    contact_email:Annotated[Optional[str], Form()] = None,
    files:       list[UploadFile] = File(default=[]),
    db:          AsyncSession     = Depends(get_async_session),
    storage:     BaseStorage      = Depends(get_storage),
) -> ReportSubmitResponse:
    await _check_submit_rate_limit(request)

    # Validar e converter ficheiros para base64 para reutilizar o mesmo serviço
    from app.schemas.report import MediaItemBase64
    media_items: list[MediaItemBase64] = []

    if len(files) > 3:
        raise HTTPException(status_code=422, detail={"code": "TOO_MANY_FILES", "message": "Máximo 3 ficheiros."})

    for upload in files:
        if upload.content_type not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_MIME", "message": f"Tipo de ficheiro não permitido: {upload.content_type}"},
            )
        content = await upload.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail={"code": "FILE_TOO_LARGE", "message": f"Ficheiro {upload.filename!r} excede 5 MB."},
            )
        media_items.append(MediaItemBase64(
            content_b64=base64.b64encode(content).decode(),
            mime_type=upload.content_type,
            filename=upload.filename or "upload",
        ))

    from app.schemas.report import GeoLocation
    geo = GeoLocation(latitude=latitude, longitude=longitude) if (latitude and longitude) else None

    body = ReportCreateJSON(
        report_type=report_type,
        channel=channel,
        title=title,
        description=description,
        geo=geo,
        address_text=address_text,
        bairro_id=bairro_id,
        contact_phone=contact_phone,
        contact_email=contact_email,
        media_items=media_items or None,
    )

    svc = ReportService(db, storage)
    return await svc.create_report(
        data=body,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        raw_payload={"channel": channel, "title": title},
    )


# ─── GET /reports/track/{ticket_id}  (público) ─────────────────

@router.get(
    "/track/{ticket_id}",
    response_model=ReportTrackingResponse,
    summary="Acompanhar relatório por ticket_id (público, sem autenticação)",
)
async def track_report(
    ticket_id: str,
    db:        AsyncSession = Depends(get_async_session),
    storage:   BaseStorage  = Depends(get_storage),
) -> ReportTrackingResponse:
    svc = ReportService(db, storage)
    return await svc.track_by_ticket_id(ticket_id.upper())


# ─── GET /reports  (admin, paginado + filtrado) ─────────────────

@router.get(
    "",
    response_model=PaginatedReports,
    summary="Listar relatórios com filtros e paginação (Admin / Manager / Analyst)",
)
async def list_reports(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    report_type:   Optional[str] = Query(default=None),
    channel:       Optional[str] = Query(default=None),
    bairro_id:     Optional[str] = Query(default=None),
    date_from:     Optional[str] = Query(default=None),
    date_to:       Optional[str] = Query(default=None),
    search:        Optional[str] = Query(default=None),
    page:          int           = Query(default=1,    ge=1),
    per_page:      int           = Query(default=20,   ge=1, le=100),
    sort:          str           = Query(default="created_at"),
    order:         str           = Query(default="desc", pattern="^(asc|desc)$"),
    _user: User = Depends(require_role("admin", "manager", "analyst")),
    db:    AsyncSession = Depends(get_async_session),
    storage: BaseStorage = Depends(get_storage),
) -> PaginatedReports:
    from datetime import datetime as dt
    filters = ReportListFilters(
        status=ReportStatus(status_filter) if status_filter else None,
        report_type=ReportType(report_type) if report_type else None,
        channel=ChannelSource(channel) if channel else None,
        bairro_id=bairro_id,
        date_from=dt.fromisoformat(date_from) if date_from else None,
        date_to=dt.fromisoformat(date_to)   if date_to   else None,
        search=search,
        page=page,
        per_page=per_page,
        sort=sort,
        order=order,
    )
    svc = ReportService(db, storage)
    return await svc.list_reports(filters)


# ─── GET /reports/{id}  (admin, detalhe completo) ──────────────

@router.get(
    "/{report_id}",
    response_model=ReportAdminDetail,
    summary="Detalhe completo de um relatório (Admin / Manager / Analyst)",
)
async def get_report(
    report_id: str,
    _user: User = Depends(require_role("admin", "manager", "analyst")),
    db:    AsyncSession = Depends(get_async_session),
    storage: BaseStorage = Depends(get_storage),
) -> ReportAdminDetail:
    svc = ReportService(db, storage)
    return await svc.get_report_admin(report_id)


# ─── PATCH /reports/{id}/status  (admin) ───────────────────────

@router.patch(
    "/{report_id}/status",
    response_model=ReportAdminDetail,
    summary="Actualizar estado do relatório (state machine validada)",
)
async def update_report_status(
    report_id: str,
    body:      ReportStatusUpdate,
    request:   Request,
    _user: User = Depends(require_role("admin", "manager", "technician")),
    db:    AsyncSession = Depends(get_async_session),
    storage: BaseStorage = Depends(get_storage),
) -> ReportAdminDetail:
    svc = ReportService(db, storage)
    report = await svc.update_status(
        report_id=report_id,
        new_status=body.new_status,
        note=body.note,
        actor_id=_user.id,
        assigned_to=body.assigned_to,
        ip_address=request.client.host if request.client else None,
    )
    return svc._to_admin_detail(report)`;

const CODE_MIG = `"""Adicionar novos ENUMs para report_type e status v2 + índices compostos

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2025-05-09 00:04:00.000000

NOTA: MySQL não suporta alteração directa de ENUM com ADD ENUM.
Esta migração recria as colunas com os novos valores via MODIFY COLUMN.
Testar sempre em staging antes de executar em produção.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision      = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ─── Actualizar enum report_type na tabela reports ─────────
    op.alter_column(
        "reports",
        "report_type",
        existing_type=sa.String(50),
        type_=sa.Enum(
            "COMPLAINT", "SUGGESTION", "DENUNCIATION", "REQUEST", "PRAISE",
            name="enum_report_type",
        ),
        nullable=False,
    )

    # ─── Substituir enum status (novos valores) ─────────────────
    # MySQL: MODIFY COLUMN para adicionar novos valores ao ENUM
    op.execute("""
        ALTER TABLE reports
        MODIFY COLUMN status ENUM(
            'SUBMITTED','TRIAGED','ASSIGNED',
            'IN_PROGRESS','RESOLVED','CLOSED'
        ) NOT NULL DEFAULT 'SUBMITTED'
    """)

    # ─── Actualizar coluna ticket_id (era reference_code) ───────
    # Se a coluna ainda se chama reference_code, renomear
    op.alter_column(
        "reports",
        "reference_code",
        new_column_name="ticket_id",
        existing_type=sa.String(20),
        nullable=False,
    )

    # ─── Índices compostos de alta frequência ───────────────────
    op.create_index(
        "idx_reports_type_status",
        "reports",
        ["report_type", "status"],
    )
    op.create_index(
        "idx_reports_status_channel",
        "reports",
        ["status", "channel_id"],
    )
    op.create_index(
        "idx_reports_created_at_status",
        "reports",
        ["created_at", "status"],
    )

    # ─── Tabela de estatísticas diárias (para ticket_id counter) ─
    # Alternativa à contagem: tabela dedicada de sequências por dia
    op.create_table(
        "daily_report_counters",
        sa.Column("date_str",   sa.String(8),  nullable=False),  # YYYYMMDD
        sa.Column("last_seq",   sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("date_str"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )


def downgrade() -> None:
    op.drop_table("daily_report_counters")
    op.drop_index("idx_reports_created_at_status", "reports")
    op.drop_index("idx_reports_status_channel",    "reports")
    op.drop_index("idx_reports_type_status",       "reports")
    op.alter_column(
        "reports",
        "ticket_id",
        new_column_name="reference_code",
        existing_type=sa.String(20),
        nullable=False,
    )`;

const CODE_CONFIG_ADDITIONS = `# Adições ao ficheiro app/config.py (classe Settings)
# Adicionar estes campos à classe Settings existente:

# ── Armazenamento de ficheiros ──────────────────────────────────
STORAGE_BACKEND: str  = "local"           # "local" | "s3"
MEDIA_ROOT:      str  = "/var/www/op1na1/media"
PUBLIC_BASE_URL: str  = "https://api.mulenvos.gv.ao"

# ── S3 (activar quando STORAGE_BACKEND=s3) ─────────────────────
S3_BUCKET:    str = ""
S3_REGION:    str = "af-south-1"         # África do Sul — mais próximo de Angola
S3_ACCESS_KEY:str = ""
S3_SECRET_KEY:str = ""
S3_CDN_BASE:  str = ""

# ─── .env.example (adicionar) ──────────────────────────────────
# STORAGE_BACKEND=local
# MEDIA_ROOT=/var/www/op1na1/media
# PUBLIC_BASE_URL=https://api.mulenvos.gv.ao
#
# # Para S3 (deixar vazio se STORAGE_BACKEND=local):
# S3_BUCKET=op1na1-media-prod
# S3_REGION=af-south-1
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
# S3_CDN_BASE=https://cdn.mulenvos.gv.ao

# ─── Configuração Nginx para servir /media/ ─────────────────────
# Adicionar ao ficheiro deploy/nginx/op1na1.conf:
#
# location /media/ {
#     alias /var/www/op1na1/media/;
#     expires 30d;
#     add_header Cache-Control "public, immutable";
#     add_header X-Content-Type-Options "nosniff";
#
#     # Bloquear execução de scripts — segurança crítica
#     location ~* \\.(php|py|sh|pl|cgi)$ {
#         return 403;
#     }
#
#     # Apenas permitir tipos de ficheiro conhecidos
#     location ~* \\.(jpg|jpeg|png|webp|gif|mp3|wav|ogg|mp4)$ {
#         try_files $uri =404;
#     }
# }`;

// ─── UI ────────────────────────────────────────────────────────

const TABS = [
  { id: "visao",   label: "Visão Geral",              code: null },
  { id: "schemas", label: "schemas/report.py",        code: CODE_SCHEMAS },
  { id: "model",   label: "models/report.py",         code: CODE_MODEL },
  { id: "storage", label: "core/storage.py",          code: CODE_STORAGE },
  { id: "service", label: "services/report_service.py", code: CODE_SERVICE },
  { id: "router",  label: "routers/v1/reports.py",   code: CODE_ROUTER },
  { id: "mig",     label: "Migração 0005",            code: CODE_MIG },
  { id: "config",  label: "config.py / Nginx",        code: CODE_CONFIG_ADDITIONS },
];

const STATE_MACHINE = [
  { from: "SUBMITTED",   to: "TRIAGED",     desc: "Triagem concluída pelo gestor",    color: "bg-blue-500" },
  { from: "TRIAGED",     to: "ASSIGNED",    desc: "Atribuído a técnico de campo",     color: "bg-violet-500" },
  { from: "TRIAGED",     to: "CLOSED",      desc: "Encerrado sem atribuição (ex: duplicado)", color: "bg-gray-500" },
  { from: "ASSIGNED",    to: "IN_PROGRESS", desc: "Técnico iniciou intervenção",      color: "bg-amber-500" },
  { from: "ASSIGNED",    to: "TRIAGED",     desc: "Reatribuição necessária",          color: "bg-slate-400" },
  { from: "IN_PROGRESS", to: "RESOLVED",    desc: "Intervenção concluída",            color: "bg-emerald-500" },
  { from: "IN_PROGRESS", to: "ASSIGNED",    desc: "Reatribuição durante execução",    color: "bg-slate-400" },
  { from: "RESOLVED",    to: "CLOSED",      desc: "Cidadão confirmou / prazo expirou", color: "bg-green-600" },
  { from: "RESOLVED",    to: "IN_PROGRESS", desc: "Reaberto (resolução insuficiente)", color: "bg-red-500" },
];

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED:   "bg-blue-100 text-blue-800 border-blue-200",
  TRIAGED:     "bg-violet-100 text-violet-800 border-violet-200",
  ASSIGNED:    "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-200",
  RESOLVED:    "bg-emerald-100 text-emerald-800 border-emerald-200",
  CLOSED:      "bg-gray-100 text-gray-700 border-gray-300",
};

const REPORT_TYPES = [
  { type: "COMPLAINT",    pt: "Reclamação",    color: "bg-red-100 text-red-800",     desc: "Problema ou falha de serviço" },
  { type: "SUGGESTION",   pt: "Sugestão",      color: "bg-blue-100 text-blue-800",   desc: "Ideia de melhoria" },
  { type: "DENUNCIATION", pt: "Denúncia",      color: "bg-purple-100 text-purple-800",desc: "Irregularidade ou infracção" },
  { type: "REQUEST",      pt: "Pedido",        color: "bg-amber-100 text-amber-800", desc: "Solicitação de serviço" },
  { type: "PRAISE",       pt: "Elogio",        color: "bg-green-100 text-green-800", desc: "Reconhecimento positivo" },
];

const ENDPOINTS = [
  { method: "POST",  path: "/reports",                    auth: "Público",   desc: "Submeter relatório (JSON + base64)" },
  { method: "POST",  path: "/reports/multipart",          auth: "Público",   desc: "Submeter relatório (multipart/form-data)" },
  { method: "GET",   path: "/reports/track/{ticket_id}",  auth: "Público",   desc: "Acompanhar estado por ticket_id" },
  { method: "GET",   path: "/reports",                    auth: "Admin+",    desc: "Listar relatórios (paginado + filtros)" },
  { method: "GET",   path: "/reports/{id}",               auth: "Admin+",    desc: "Detalhe completo" },
  { method: "PATCH", path: "/reports/{id}/status",        auth: "Gestor+",   desc: "Actualizar estado (state machine)" },
];

const METHOD_COLORS: Record<string, string> = {
  GET:   "bg-blue-600 text-white",
  POST:  "bg-green-600 text-white",
  PATCH: "bg-amber-500 text-white",
};

const VALIDATION_RULES = [
  { campo: "Ficheiro — tamanho",    regra: "Máx. 5 MB por ficheiro",                       nivel: "schema" },
  { campo: "Ficheiro — quantidade", regra: "Máx. 3 ficheiros por relatório",              nivel: "schema" },
  { campo: "Ficheiro — MIME type",  regra: "Whitelist: JPEG, PNG, WebP, GIF, MP3, WAV, OGG, WebM, MP4", nivel: "schema" },
  { campo: "Ficheiro — magic bytes",regra: "verify_mime_magic() previne MIME spoofing",  nivel: "service" },
  { campo: "USSD + ficheiros",      regra: "Canal USSD rejeita media_items (sem capacidade)", nivel: "schema" },
  { campo: "Geolocalização",        regra: "lat ∈ [-90, 90], lng ∈ [-180, 180] (Pydantic Field)", nivel: "schema" },
  { campo: "ticket_id",             regra: "MUL-YYYYMMDD-XXXX, UNIQUE, gerado no serviço", nivel: "service" },
  { campo: "State machine",         regra: "VALID_TRANSITIONS dict — rejeita transições inválidas com HTTP 422", nivel: "service" },
  { campo: "Rate limit submissão",  regra: "10 relatórios/hora por IP (Redis, janela deslizante)", nivel: "router" },
  { campo: "Audit log",             regra: "Toda a criação e actualização de estado escreve para audit_log", nivel: "service" },
  { campo: "Anónimos",              regra: "actor_id=None permitido. Contacto opcional para retorno.", nivel: "service" },
  { campo: "Filename sanitize",     regra: "Regex [^a-zA-Z0-9._-] → _ (previne path traversal)", nivel: "schema" },
];

const NIVEL_COLORS: Record<string, string> = {
  schema:  "bg-blue-100 text-blue-700",
  service: "bg-violet-100 text-violet-700",
  router:  "bg-amber-100 text-amber-700",
};

export default function ReportsModule() {
  const [activeTab, setActiveTab] = useState("visao");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Módulo de Relatórios
        </h1>
        <p className="text-muted-foreground">
          State Machine · File Storage Abstraction · Ticket ID · Audit Log · Submissão Anónima
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Submissão anónima", "Rate limit 10/h", "MUL-YYYYMMDD-XXXX", "S3-ready", "Audit log completo", "magic bytes validation"].map(t => (
          <span key={t} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium">{t}</span>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto p-1 bg-secondary flex flex-wrap gap-1 w-full mb-2">
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs px-3 py-1.5 font-mono">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Visão Geral ───────────────────────────────────── */}
        <TabsContent value="visao" className="space-y-8">

          {/* State Machine */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-5">
              State Machine — Ciclo de vida do relatório
            </h2>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(STATUS_COLORS).map(([s, cls]) => (
                <span key={s} className={cn("px-3 py-1.5 rounded border text-xs font-mono font-bold", cls)}>
                  {s === "CLOSED" ? "CLOSED (terminal)" : s}
                </span>
              ))}
            </div>

            {/* Transitions */}
            <div className="space-y-2">
              {STATE_MACHINE.map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={cn("shrink-0 w-2 h-2 rounded-full", t.color)} />
                  <code className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded border", STATUS_COLORS[t.from])}>
                    {t.from}
                  </code>
                  <span className="text-muted-foreground text-xs">→</span>
                  <code className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded border", STATUS_COLORS[t.to])}>
                    {t.to}
                  </code>
                  <span className="text-xs text-muted-foreground">— {t.desc}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-secondary/50 rounded text-xs text-muted-foreground">
              Transição inválida → HTTP 422 com mensagem explicativa. Estado CLOSED é terminal — sem transições.
            </div>
          </div>

          {/* Report Types */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Tipos de relatório (ReportType enum)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {REPORT_TYPES.map(r => (
                <div key={r.type} className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded", r.color)}>{r.type}</span>
                    <span className="text-sm font-medium text-foreground">{r.pt}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoints */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Endpoints</h2>
            <div className="space-y-2">
              {ENDPOINTS.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn("shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded w-14 text-center", METHOD_COLORS[e.method])}>
                    {e.method}
                  </span>
                  <code className="text-xs font-mono text-foreground min-w-[280px]">{e.path}</code>
                  <span className={cn("text-xs px-2 py-0.5 rounded shrink-0", e.auth === "Público" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                    {e.auth}
                  </span>
                  <span className="text-xs text-muted-foreground">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Validation & Security */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Regras de validação e segurança
            </h2>
            <div className="mb-3 flex gap-3 text-xs">
              {Object.entries(NIVEL_COLORS).map(([k, v]) => (
                <span key={k} className={cn("px-2 py-0.5 rounded font-medium", v)}>{k}</span>
              ))}
              <span className="text-muted-foreground">— camada onde a regra é aplicada</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-validation">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-foreground">Campo / Regra</th>
                    <th className="text-left py-2 pr-4 font-medium text-foreground">Detalhe</th>
                    <th className="text-left py-2 font-medium text-foreground">Camada</th>
                  </tr>
                </thead>
                <tbody>
                  {VALIDATION_RULES.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="py-2 pr-4 font-mono text-xs font-semibold text-foreground">{r.campo}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{r.regra}</td>
                      <td className="py-2">
                        <span className={cn("text-xs px-2 py-0.5 rounded font-medium", NIVEL_COLORS[r.nivel])}>{r.nivel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ticket ID */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Geração do Ticket ID — MUL-YYYYMMDD-XXXX
            </h2>
            <div className="font-mono text-2xl font-bold text-foreground mb-3">
              MUL-<span className="text-primary">20250509</span>-<span className="text-emerald-600">0042</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-secondary/50 rounded p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Prefixo</p>
                <code className="font-mono text-foreground">MUL</code>
                <p className="text-xs text-muted-foreground mt-1">Município dos Mulenvos — fixo</p>
              </div>
              <div className="bg-secondary/50 rounded p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Data</p>
                <code className="font-mono text-foreground">YYYYMMDD</code>
                <p className="text-xs text-muted-foreground mt-1">UTC — repõe a sequência a 0001 por dia</p>
              </div>
              <div className="bg-secondary/50 rounded p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Sequência</p>
                <code className="font-mono text-foreground">XXXX (0001–9999)</code>
                <p className="text-xs text-muted-foreground mt-1">COUNT(ticket_id LIKE prefix%) + 1. UNIQUE constraint como guarda.</p>
              </div>
            </div>
          </div>

          {/* Storage abstraction */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Abstracção de armazenamento (S3-ready)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border rounded p-4">
                <p className="font-mono font-semibold text-sm text-foreground mb-2">LocalFileStorage (actual)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Guarda em <code className="bg-secondary px-1 rounded">MEDIA_ROOT/reports/YYYYMMDD/uuid.ext</code></li>
                  <li>Serve via Nginx <code className="bg-secondary px-1 rounded">location /media/</code></li>
                  <li>Script de backup: <code className="bg-secondary px-1 rounded">rsync -av /media/ backup:/media/</code></li>
                  <li>Activar: <code className="bg-secondary px-1 rounded">STORAGE_BACKEND=local</code></li>
                </ul>
              </div>
              <div className="border border-border rounded p-4">
                <p className="font-mono font-semibold text-sm text-foreground mb-2">S3FileStorage (migração)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Mesma interface <code className="bg-secondary px-1 rounded">BaseStorage</code> — zero alterações no serviço</li>
                  <li>Recomendado: Cloudflare R2 (sem egress fees)</li>
                  <li>Região mais próxima: <code className="bg-secondary px-1 rounded">af-south-1</code> (África do Sul)</li>
                  <li>Activar: <code className="bg-secondary px-1 rounded">STORAGE_BACKEND=s3</code></li>
                </ul>
              </div>
            </div>
          </div>

        </TabsContent>

        {/* ── Tabs de código ───────────────────────────────── */}
        {TABS.filter(t => t.code !== null).map(t => (
          <TabsContent key={t.id} value={t.id}>
            <CodeBlock code={t.code!} language="python" />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
