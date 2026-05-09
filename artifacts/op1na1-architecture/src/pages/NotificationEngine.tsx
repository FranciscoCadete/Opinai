import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

// ─── Code sections ─────────────────────────────────────────────────────────

const CODE_SCHEMAS = `# app/schemas/notification.py
from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class NotificationChannel(str, Enum):
    SMS       = "sms"
    WHATSAPP  = "whatsapp"
    EMAIL     = "email"
    INTERNAL  = "internal"


class NotificationStatus(str, Enum):
    PENDING   = "PENDING"
    SENDING   = "SENDING"
    SENT      = "SENT"
    DELIVERED = "DELIVERED"
    FAILED    = "FAILED"


class NotificationType(str, Enum):
    REPORT_RECEIVED       = "REPORT_RECEIVED"
    REPORT_TRIAGED        = "REPORT_TRIAGED"
    REPORT_ASSIGNED       = "REPORT_ASSIGNED"
    REPORT_IN_PROGRESS    = "REPORT_IN_PROGRESS"
    REPORT_RESOLVED       = "REPORT_RESOLVED"
    REPORT_CLOSED         = "REPORT_CLOSED"
    OTP_LOGIN             = "OTP_LOGIN"
    PASSWORD_RESET        = "PASSWORD_RESET"
    MUNICIPAL_ALERT       = "MUNICIPAL_ALERT"   # broadcast
    ACCOUNT_WELCOME       = "ACCOUNT_WELCOME"


class NotificationRequest(BaseModel):
    """Pedido de envio de notificação de um serviço interno."""
    user_id:           Optional[str] = None       # None = notificação sem conta
    recipient_phone:   Optional[str] = None
    recipient_email:   Optional[str] = None
    notification_type: NotificationType
    channel:           NotificationChannel
    template_vars:     dict[str, Any] = Field(default_factory=dict)
    priority:          int = Field(default=5, ge=1, le=10)  # 1=crítico, 10=baixo
    idempotency_key:   Optional[str] = None  # previne duplicados


class BulkNotificationRequest(BaseModel):
    """Alertas municipais críticos enviados a múltiplos destinatários."""
    notification_type: NotificationType
    channels:          list[NotificationChannel]
    template_vars:     dict[str, Any] = Field(default_factory=dict)
    recipient_filter:  Optional[dict[str, Any]] = None   # ex: {"bairro_id": "..."}
    send_immediately:  bool = False  # True = BackgroundTask; False = Celery queue


class DeliveryReceiptWebhook(BaseModel):
    """Payload do webhook de entrega (Twilio / Meta)."""
    provider:        str
    message_sid:     str
    status:          str          # "delivered", "failed", "read", etc.
    error_code:      Optional[str] = None
    error_message:   Optional[str] = None
    raw_payload:     dict[str, Any] = Field(default_factory=dict)


class NotificationPreferenceUpdate(BaseModel):
    sms_enabled:       bool = True
    whatsapp_enabled:  bool = True
    email_enabled:     bool = True
    internal_enabled:  bool = True
    quiet_hours_start: Optional[int] = Field(default=None, ge=0, le=23)
    quiet_hours_end:   Optional[int] = Field(default=None, ge=0, le=23)
    language:          str = "pt"`;

const CODE_MODELS = `# app/models/notification.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, Enum, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Notification(Base):
    """Registo de cada mensagem enviada ou a enviar."""
    __tablename__ = "notifications"

    id:                Mapped[str]            = mapped_column(String(36),   primary_key=True)
    idempotency_key:   Mapped[Optional[str]]  = mapped_column(String(128),  nullable=True, unique=True, index=True)
    user_id:           Mapped[Optional[str]]  = mapped_column(String(36),   nullable=True, index=True)
    report_id:         Mapped[Optional[str]]  = mapped_column(String(36),   nullable=True, index=True)

    channel:           Mapped[str]            = mapped_column(
        Enum("sms","whatsapp","email","internal", name="enum_notif_channel"),
        nullable=False, index=True,
    )
    notification_type: Mapped[str]            = mapped_column(String(50),   nullable=False, index=True)
    status:            Mapped[str]            = mapped_column(
        Enum("PENDING","SENDING","SENT","DELIVERED","FAILED", name="enum_notif_status"),
        nullable=False, server_default="PENDING", index=True,
    )

    recipient_phone:   Mapped[Optional[str]]  = mapped_column(String(20),   nullable=True)
    recipient_email:   Mapped[Optional[str]]  = mapped_column(String(254),  nullable=True)

    subject:           Mapped[Optional[str]]  = mapped_column(String(500),  nullable=True)
    body:              Mapped[str]            = mapped_column(Text,          nullable=False)

    # Rastreio de entrega
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    delivered_at:        Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_at:           Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason:      Mapped[Optional[str]]  = mapped_column(Text,        nullable=True)

    # Retry
    attempt_count:     Mapped[int]            = mapped_column(Integer, nullable=False, server_default="0")
    next_retry_at:     Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Metadados
    template_vars:     Mapped[Optional[Any]]  = mapped_column(JSON, nullable=True)
    raw_response:      Mapped[Optional[Any]]  = mapped_column(JSON, nullable=True)

    created_at:        Mapped[datetime]       = mapped_column(DateTime, nullable=False)
    updated_at:        Mapped[datetime]       = mapped_column(DateTime, nullable=False)


class NotificationPreference(Base):
    """Preferências de notificação por utilizador."""
    __tablename__ = "notification_preferences"

    user_id:           Mapped[str]  = mapped_column(String(36), primary_key=True)

    sms_enabled:       Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    whatsapp_enabled:  Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    email_enabled:     Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    internal_enabled:  Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    # Horas de silêncio (ex: 22h–7h sem notificações não urgentes)
    quiet_hours_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    quiet_hours_end:   Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    language:          Mapped[str]  = mapped_column(String(10), nullable=False, server_default="'pt'")

    updated_at:        Mapped[datetime] = mapped_column(DateTime, nullable=False)`;

const CODE_TEMPLATES = `# app/core/templates.py
"""
Sistema de templates de mensagens para cidadãos (Português / pt_AO).

Cada template é uma função que recebe variáveis e devolve (subject, body).
O subject é None para canais sem assunto (SMS, WhatsApp).

Convenção de variáveis:
  - ticket_id   : "MUL-20250509-0042"
  - bairro       : "Rangel"
  - status_pt    : nome do estado em português
  - tech_name    : nome do técnico atribuído
  - otp_code     : código OTP de 6 dígitos
  - alert_title  : título do alerta municipal
  - alert_body   : corpo do alerta municipal
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Optional


@dataclass
class RenderedMessage:
    subject: Optional[str]   # None para SMS / WhatsApp
    body:    str


# Tipo de função template
TemplateFn = Callable[[dict[str, Any]], RenderedMessage]


# ─── Templates SMS / WhatsApp ──────────────────────────────────
# Máximo 160 caracteres por segmento SMS.
# WhatsApp aceita até 4096 caracteres.

def _sms_report_received(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=(
            f"OP1NA1 | Relatório recebido. "
            f"Ticket: {v['ticket_id']}. "
            f"Acompanhe em: mulenvos.gv.ao/track/{v['ticket_id']}"
        ),
    )

def _sms_report_triaged(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=(
            f"OP1NA1 | O seu relatório {v['ticket_id']} "
            f"foi analisado e está a ser processado. "
            f"Obrigado pela participação."
        ),
    )

def _sms_report_assigned(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=(
            f"OP1NA1 | {v['ticket_id']}: Técnico atribuído"
            + (f" — {v['tech_name']}" if v.get("tech_name") else "")
            + f". Intervenção em breve no bairro {v.get('bairro','indicado')}."
        ),
    )

def _sms_report_resolved(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=(
            f"OP1NA1 | {v['ticket_id']} resolvido! "
            f"Confirme em: mulenvos.gv.ao/track/{v['ticket_id']} "
            f"Se o problema persistir, reabra o relatório."
        ),
    )

def _sms_report_closed(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=f"OP1NA1 | {v['ticket_id']} encerrado. Avalie o serviço: mulenvos.gv.ao/rate/{v['ticket_id']}",
    )

def _sms_otp(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=f"OP1NA1 | Código de acesso: {v['otp_code']}. Válido 10 minutos. Não partilhe.",
    )

def _sms_password_reset(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=f"OP1NA1 | Código de redefinição de senha: {v['otp_code']}. Válido 15 minutos.",
    )

def _sms_municipal_alert(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=f"ALERTA MUNICIPAL | {v['alert_title']}: {v['alert_body'][:100]}",
    )

def _sms_welcome(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=None,
        body=f"Bem-vindo à OP1NA1! A sua conta foi criada. Participe em: mulenvos.gv.ao",
    )


# ─── Templates Email ───────────────────────────────────────────

def _email_report_received(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=f"[OP1NA1] Relatório recebido — {v['ticket_id']}",
        body=f"""Olá,

O seu relatório foi recebido com sucesso pelo Município dos Mulenvos.

Número de ticket: {v['ticket_id']}
Tipo: {v.get('report_type_pt', 'Relatório')}
Bairro: {v.get('bairro', '—')}

Acompanhe o estado do seu relatório em:
https://mulenvos.gv.ao/track/{v['ticket_id']}

Obrigado pela sua participação na construção de um Mulenvos melhor.

Município dos Mulenvos | Luanda, Angola
""",
    )

def _email_report_resolved(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=f"[OP1NA1] Relatório resolvido — {v['ticket_id']}",
        body=f"""Olá,

O seu relatório {v['ticket_id']} foi marcado como resolvido.

Se o problema foi efectivamente resolvido, nenhuma acção é necessária.
Se o problema persistir, pode reabri-lo em:
https://mulenvos.gv.ao/track/{v['ticket_id']}

Obrigado pela sua colaboração.

Município dos Mulenvos
""",
    )

def _email_municipal_alert(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject=f"[ALERTA MUNICIPAL] {v['alert_title']}",
        body=f"""ALERTA DO MUNICÍPIO DOS MULENVOS

{v['alert_title']}

{v['alert_body']}

Para mais informações: https://mulenvos.gv.ao/alertas

Município dos Mulenvos | Luanda, Angola
""",
    )

def _email_otp(v: dict) -> RenderedMessage:
    return RenderedMessage(
        subject="[OP1NA1] Código de acesso",
        body=f"""O seu código de acesso é: {v['otp_code']}

Válido durante 10 minutos.
Não partilhe este código com ninguém.

Se não solicitou este código, ignore este e-mail.

Município dos Mulenvos
""",
    )


# ─── Registo de templates ──────────────────────────────────────

_REGISTRY: dict[tuple[str, str], TemplateFn] = {
    ("REPORT_RECEIVED",    "sms"):      _sms_report_received,
    ("REPORT_RECEIVED",    "whatsapp"): _sms_report_received,
    ("REPORT_RECEIVED",    "email"):    _email_report_received,
    ("REPORT_TRIAGED",     "sms"):      _sms_report_triaged,
    ("REPORT_TRIAGED",     "whatsapp"): _sms_report_triaged,
    ("REPORT_ASSIGNED",    "sms"):      _sms_report_assigned,
    ("REPORT_ASSIGNED",    "whatsapp"): _sms_report_assigned,
    ("REPORT_IN_PROGRESS", "sms"):      _sms_report_assigned,
    ("REPORT_IN_PROGRESS", "whatsapp"): _sms_report_assigned,
    ("REPORT_RESOLVED",    "sms"):      _sms_report_resolved,
    ("REPORT_RESOLVED",    "whatsapp"): _sms_report_resolved,
    ("REPORT_RESOLVED",    "email"):    _email_report_resolved,
    ("REPORT_CLOSED",      "sms"):      _sms_report_closed,
    ("REPORT_CLOSED",      "whatsapp"): _sms_report_closed,
    ("OTP_LOGIN",          "sms"):      _sms_otp,
    ("OTP_LOGIN",          "whatsapp"): _sms_otp,
    ("OTP_LOGIN",          "email"):    _email_otp,
    ("PASSWORD_RESET",     "sms"):      _sms_password_reset,
    ("PASSWORD_RESET",     "whatsapp"): _sms_password_reset,
    ("PASSWORD_RESET",     "email"):    _email_otp,
    ("MUNICIPAL_ALERT",    "sms"):      _sms_municipal_alert,
    ("MUNICIPAL_ALERT",    "whatsapp"): _sms_municipal_alert,
    ("MUNICIPAL_ALERT",    "email"):    _email_municipal_alert,
    ("ACCOUNT_WELCOME",    "sms"):      _sms_welcome,
    ("ACCOUNT_WELCOME",    "whatsapp"): _sms_welcome,
}


def render_template(
    notification_type: str,
    channel: str,
    variables: dict[str, Any],
) -> RenderedMessage:
    key = (notification_type, channel)
    fn = _REGISTRY.get(key)
    if fn is None:
        raise ValueError(
            f"Sem template para ({notification_type!r}, {channel!r}). "
            f"Disponíveis: {sorted(str(k) for k in _REGISTRY)}"
        )
    return fn(variables)`;

const CODE_SERVICE = `# app/services/notification_service.py
"""
NotificationService — dispatcher central de notificações.

Fluxo:
  1. Verificar preferências do utilizador (canal activo? horas de silêncio?)
  2. Verificar idempotência (evitar duplicados)
  3. Renderizar template em Português
  4. Persistir registo com status=PENDING
  5. Tentar envio via canal primário
  6. Se falhar + canal é WhatsApp → fallback automático para SMS
  7. Actualizar status + provider_message_id no registo
  8. Em caso de falha permanente → delegar retry ao Celery
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.templates import render_template
from app.models.notification import Notification, NotificationPreference
from app.schemas.notification import (
    NotificationChannel,
    NotificationRequest,
    NotificationStatus,
)
from app.services.channels.email_channel   import EmailChannel
from app.services.channels.sms_channel     import SmsChannel
from app.services.channels.whatsapp_channel import WhatsAppChannel
from app.services.channels.internal_channel import InternalChannel

import logging
log = logging.getLogger(__name__)

MAX_RETRIES   = 3
BACKOFF_BASE  = 4   # segundos: 4^1=4s, 4^2=16s, 4^3=64s


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self._db          = db
        self._sms         = SmsChannel()
        self._whatsapp    = WhatsAppChannel()
        self._email       = EmailChannel()
        self._internal    = InternalChannel(db)

    # ── Envio único ────────────────────────────────────────────

    async def send(
        self,
        req: NotificationRequest,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> Notification:
        """
        Ponto de entrada principal.
        background_tasks: se fornecido, o envio é não-bloqueante (FastAPI).
        Se None, o envio é imediato (útil em tarefas Celery).
        """
        # 1. Verificar preferências do utilizador
        if req.user_id:
            if not await self._channel_allowed(req.user_id, req.channel):
                log.info(
                    "notif.skipped user=%s channel=%s type=%s (preference off)",
                    req.user_id, req.channel, req.notification_type,
                )
                # Criar registo SKIPPED não é necessário — só registar
                return await self._create_record(req, body="(skipped by user preference)")

        # 2. Idempotência
        if req.idempotency_key:
            existing = await self._find_by_idempotency_key(req.idempotency_key)
            if existing:
                log.info("notif.duplicate idempotency_key=%s", req.idempotency_key)
                return existing

        # 3. Renderizar template
        msg = render_template(
            req.notification_type.value,
            req.channel.value,
            req.template_vars,
        )

        # 4. Persistir registo PENDING
        notif = await self._create_record(req, body=msg.body, subject=msg.subject)

        # 5. Dispatch
        if background_tasks:
            background_tasks.add_task(self._dispatch, notif, req.channel)
        else:
            await self._dispatch(notif, req.channel)

        return notif

    # ── Bulk (alertas municipais) ──────────────────────────────

    async def send_bulk(
        self,
        notification_type: str,
        channels: list[NotificationChannel],
        template_vars: dict,
        recipient_ids: list[str],
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> list[str]:
        """
        Envia notificações a múltiplos utilizadores.
        Devolve lista de notification IDs criados.
        Para volumes >500, usar tarefa Celery dedicada.
        """
        ids: list[str] = []
        for user_id in recipient_ids:
            for channel in channels:
                req = NotificationRequest(
                    user_id=user_id,
                    notification_type=notification_type,
                    channel=channel,
                    template_vars=template_vars,
                )
                notif = await self.send(req, background_tasks=background_tasks)
                ids.append(notif.id)
        return ids

    # ── Dispatch com fallback WhatsApp → SMS ───────────────────

    async def _dispatch(
        self,
        notif: Notification,
        channel: NotificationChannel,
    ) -> None:
        await self._mark_sending(notif.id)

        try:
            provider_id = await self._send_via_channel(notif, channel)
            await self._mark_sent(notif.id, provider_id)
            log.info(
                "notif.sent id=%s channel=%s provider_id=%s",
                notif.id, channel.value, provider_id,
            )

        except Exception as primary_exc:
            log.warning(
                "notif.failed id=%s channel=%s error=%s",
                notif.id, channel.value, str(primary_exc),
            )

            # Fallback automático: WhatsApp → SMS
            if channel == NotificationChannel.WHATSAPP:
                log.info("notif.fallback id=%s whatsapp→sms", notif.id)
                try:
                    # Re-renderizar para SMS (template pode diferir)
                    from app.core.templates import render_template
                    msg = render_template(
                        notif.notification_type,
                        NotificationChannel.SMS.value,
                        notif.template_vars or {},
                    )
                    notif.body = msg.body
                    provider_id = await self._sms.send(
                        to=notif.recipient_phone,
                        body=msg.body,
                    )
                    await self._mark_sent(notif.id, provider_id, via_fallback=True)
                    return
                except Exception as fallback_exc:
                    log.error("notif.fallback_failed id=%s error=%s", notif.id, str(fallback_exc))

            # Agendar retry via Celery
            await self._schedule_retry(notif, str(primary_exc))

    async def _send_via_channel(
        self,
        notif: Notification,
        channel: NotificationChannel,
    ) -> str:
        """Devolve o provider_message_id."""
        if channel == NotificationChannel.SMS:
            return await self._sms.send(to=notif.recipient_phone, body=notif.body)
        if channel == NotificationChannel.WHATSAPP:
            return await self._whatsapp.send(to=notif.recipient_phone, body=notif.body)
        if channel == NotificationChannel.EMAIL:
            return await self._email.send(
                to=notif.recipient_email,
                subject=notif.subject or "(sem assunto)",
                body=notif.body,
            )
        if channel == NotificationChannel.INTERNAL:
            return await self._internal.send(
                user_id=notif.user_id,
                body=notif.body,
            )
        raise ValueError(f"Canal desconhecido: {channel}")

    # ── Helpers BD ─────────────────────────────────────────────

    async def _create_record(
        self,
        req: NotificationRequest,
        body: str,
        subject: Optional[str] = None,
    ) -> Notification:
        now = datetime.now(timezone.utc)
        notif = Notification(
            id=str(uuid.uuid4()),
            idempotency_key=req.idempotency_key,
            user_id=req.user_id,
            channel=req.channel.value,
            notification_type=req.notification_type.value,
            status=NotificationStatus.PENDING.value,
            recipient_phone=req.recipient_phone,
            recipient_email=req.recipient_email,
            subject=subject,
            body=body,
            template_vars=req.template_vars,
            attempt_count=0,
            created_at=now,
            updated_at=now,
        )
        self._db.add(notif)
        await self._db.commit()
        await self._db.refresh(notif)
        return notif

    async def _mark_sending(self, notif_id: str) -> None:
        from sqlalchemy import update
        await self._db.execute(
            update(Notification)
            .where(Notification.id == notif_id)
            .values(status="SENDING", updated_at=datetime.now(timezone.utc))
        )
        await self._db.commit()

    async def _mark_sent(
        self,
        notif_id: str,
        provider_id: str,
        via_fallback: bool = False,
    ) -> None:
        from sqlalchemy import update
        await self._db.execute(
            update(Notification)
            .where(Notification.id == notif_id)
            .values(
                status="SENT",
                provider_message_id=provider_id,
                updated_at=datetime.now(timezone.utc),
            )
        )
        await self._db.commit()

    async def _schedule_retry(self, notif: Notification, reason: str) -> None:
        from sqlalchemy import update
        import math

        attempt = notif.attempt_count + 1
        if attempt > MAX_RETRIES:
            await self._db.execute(
                update(Notification)
                .where(Notification.id == notif.id)
                .values(
                    status="FAILED",
                    failed_at=datetime.now(timezone.utc),
                    failure_reason=reason,
                    attempt_count=attempt,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            await self._db.commit()
            log.error("notif.permanently_failed id=%s attempts=%d", notif.id, attempt)
            return

        # Backoff exponencial: 4^attempt segundos
        backoff_seconds = BACKOFF_BASE ** attempt
        from datetime import timedelta
        retry_at = datetime.now(timezone.utc) + timedelta(seconds=backoff_seconds)

        await self._db.execute(
            update(Notification)
            .where(Notification.id == notif.id)
            .values(
                status="PENDING",
                attempt_count=attempt,
                next_retry_at=retry_at,
                failure_reason=reason,
                updated_at=datetime.now(timezone.utc),
            )
        )
        await self._db.commit()

        # Enfileirar no Celery com countdown
        from app.tasks.notification_tasks import retry_notification
        retry_notification.apply_async(
            args=[notif.id],
            countdown=backoff_seconds,
        )
        log.info(
            "notif.retry_scheduled id=%s attempt=%d backoff=%ds",
            notif.id, attempt, backoff_seconds,
        )

    async def _channel_allowed(self, user_id: str, channel: NotificationChannel) -> bool:
        result = await self._db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id
            )
        )
        pref = result.scalar_one_or_none()
        if pref is None:
            return True  # sem preferências = tudo activo

        mapping = {
            NotificationChannel.SMS:      pref.sms_enabled,
            NotificationChannel.WHATSAPP: pref.whatsapp_enabled,
            NotificationChannel.EMAIL:    pref.email_enabled,
            NotificationChannel.INTERNAL: pref.internal_enabled,
        }
        if not mapping.get(channel, True):
            return False

        # Verificar horas de silêncio (prioridade < 3 é urgente e ignora silêncio)
        if pref.quiet_hours_start is not None and pref.quiet_hours_end is not None:
            now_h = datetime.now(timezone.utc).hour
            start, end = pref.quiet_hours_start, pref.quiet_hours_end
            in_quiet = (
                (start <= now_h or now_h < end) if start > end  # ex: 22–7
                else (start <= now_h < end)
            )
            if in_quiet:
                return False  # adiar — não é implementado aqui, mas pode ser
        return True

    async def _find_by_idempotency_key(self, key: str) -> Optional[Notification]:
        result = await self._db.execute(
            select(Notification).where(Notification.idempotency_key == key)
        )
        return result.scalar_one_or_none()`;

const CODE_CHANNELS = `# ══════════════════════════════════════════════════════════════
# app/services/channels/sms_channel.py  — Twilio
# ══════════════════════════════════════════════════════════════
from __future__ import annotations

import httpx
from app.config import settings


class SmsChannel:
    """Envio de SMS via Twilio REST API (sem SDK — só httpx)."""

    _BASE = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

    async def send(self, to: str, body: str) -> str:
        """Devolve o MessageSid do Twilio."""
        if not to:
            raise ValueError("recipient_phone é obrigatório para SMS.")

        url = self._BASE.format(sid=settings.TWILIO_ACCOUNT_SID)
        auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                auth=auth,
                data={
                    "From": settings.TWILIO_FROM_NUMBER,
                    "To":   to,
                    "Body": body,
                },
            )

        if resp.status_code not in (200, 201):
            error = resp.json().get("message", resp.text)
            raise RuntimeError(f"Twilio SMS error {resp.status_code}: {error}")

        return resp.json()["sid"]


# ══════════════════════════════════════════════════════════════
# app/services/channels/whatsapp_channel.py  — Meta Cloud API
# ══════════════════════════════════════════════════════════════

class WhatsAppChannel:
    """
    Envio de mensagens WhatsApp via Meta Cloud API (Business).
    Usa mensagens de texto simples (não template) para respostas
    dentro da janela de 24h.
    Para mensagens fora da janela: usar template aprovado pela Meta.
    """

    _URL = "https://graph.facebook.com/v19.0/{phone_id}/messages"

    async def send(self, to: str, body: str) -> str:
        """Devolve o wamid (WhatsApp Message ID)."""
        if not to:
            raise ValueError("recipient_phone é obrigatório para WhatsApp.")

        url = self._URL.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID)

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
                    "Content-Type":  "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type":    "individual",
                    "to":                to,
                    "type":              "text",
                    "text":              {"preview_url": False, "body": body},
                },
            )

        if resp.status_code != 200:
            error = resp.json().get("error", {}).get("message", resp.text)
            raise RuntimeError(f"WhatsApp API error {resp.status_code}: {error}")

        return resp.json()["messages"][0]["id"]  # wamid

    async def send_template(
        self,
        to:            str,
        template_name: str,
        language:      str = "pt_PT",
        components:    list[dict] | None = None,
    ) -> str:
        """
        Envio de template aprovado pela Meta (fora da janela de 24h).
        Templates devem ser criados no Meta Business Manager.
        """
        url = self._URL.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID)

        payload: dict = {
            "messaging_product": "whatsapp",
            "to":   to,
            "type": "template",
            "template": {
                "name":     template_name,
                "language": {"code": language},
            },
        }
        if components:
            payload["template"]["components"] = components

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
                    "Content-Type":  "application/json",
                },
                json=payload,
            )

        if resp.status_code != 200:
            raise RuntimeError(f"WhatsApp template error: {resp.text}")
        return resp.json()["messages"][0]["id"]


# ══════════════════════════════════════════════════════════════
# app/services/channels/email_channel.py  — SMTP / Gmail
# ══════════════════════════════════════════════════════════════
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text      import MIMEText


class EmailChannel:
    """
    Envio de e-mail via SMTP com STARTTLS.
    Compatível com Gmail (porta 587) e qualquer SMTP corporativo.
    Para volumes elevados, migrar para SendGrid / AWS SES.
    """

    async def send(self, to: str, subject: str, body: str) -> str:
        """
        Devolve um ID sintético (message-id do cabeçalho SMTP).
        Executado numa thread separada para não bloquear o event loop.
        """
        if not to:
            raise ValueError("recipient_email é obrigatório.")

        message_id = await asyncio.get_event_loop().run_in_executor(
            None,
            self._send_sync,
            to, subject, body,
        )
        return message_id

    def _send_sync(self, to: str, subject: str, body: str) -> str:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = to

        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())

        return msg["Message-ID"] or f"smtp-{to}-{subject[:20]}"


# ══════════════════════════════════════════════════════════════
# app/services/channels/internal_channel.py  — Alertas internos
# ══════════════════════════════════════════════════════════════
import uuid as _uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession


class InternalChannel:
    """
    Armazena notificações internas na BD para exibição no dashboard.
    Lidas via polling ou WebSocket no frontend.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def send(self, user_id: str, body: str) -> str:
        from app.models.internal_alert import InternalAlert
        alert = InternalAlert(
            id=str(_uuid.uuid4()),
            user_id=user_id,
            body=body,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        self._db.add(alert)
        await self._db.commit()
        return alert.id`;

const CODE_TASKS = `# app/tasks/notification_tasks.py
"""
Tarefas Celery para retry de notificações e envio bulk.

Configuração mínima do Celery (app/celery_app.py):
    from celery import Celery
    from app.config import settings

    celery_app = Celery(
        "op1na1",
        broker=settings.CELERY_BROKER_URL,   # redis://localhost:6379/1
        backend=settings.CELERY_RESULT_URL,  # redis://localhost:6379/2
    )
    celery_app.conf.task_serializer   = "json"
    celery_app.conf.result_serializer = "json"
    celery_app.conf.timezone          = "Africa/Luanda"

Iniciar worker:
    celery -A app.celery_app worker -l info -Q notifications --concurrency 4

Iniciar beat (tarefas periódicas):
    celery -A app.celery_app beat -l info
"""
from __future__ import annotations

import asyncio
import logging

from celery import Task
from celery.exceptions import MaxRetriesExceededError

from app.celery_app import celery_app

log = logging.getLogger(__name__)

MAX_RETRIES  = 3
BACKOFF_BASE = 4  # segundos: 4^1=4s, 4^2=16s, 4^3=64s


class DatabaseTask(Task):
    """Task base com sessão de BD assíncrona criada por execução."""
    abstract = True
    _db = None

    def _get_db_session(self):
        from app.database.session import AsyncSessionLocal
        return AsyncSessionLocal()


# ─── Retry de notificação individual ──────────────────────────

@celery_app.task(
    bind=True,
    base=DatabaseTask,
    queue="notifications",
    max_retries=MAX_RETRIES,
    name="notifications.retry_notification",
    acks_late=True,            # só confirmar após execução (não perder em crash)
    reject_on_worker_lost=True,
)
def retry_notification(self: Task, notification_id: str) -> dict:
    """
    Tenta re-enviar uma notificação falhada.
    O countdown (backoff) é definido pelo NotificationService no agendamento.
    """
    async def _run() -> dict:
        async with self._get_db_session() as db:
            from sqlalchemy import select
            from app.models.notification import Notification
            from app.services.notification_service import NotificationService
            from app.schemas.notification import NotificationChannel

            result = await db.execute(
                select(Notification).where(Notification.id == notification_id)
            )
            notif = result.scalar_one_or_none()

            if notif is None:
                log.error("retry_notification: notif %s not found", notification_id)
                return {"status": "not_found"}

            if notif.status == "DELIVERED":
                return {"status": "already_delivered"}

            svc = NotificationService(db)
            try:
                await svc._dispatch(notif, NotificationChannel(notif.channel))
                return {"status": "sent", "notif_id": notification_id}

            except Exception as exc:
                attempt = self.request.retries + 1
                if attempt >= MAX_RETRIES:
                    log.error(
                        "retry_notification.permanently_failed notif=%s",
                        notification_id,
                    )
                    return {"status": "failed", "error": str(exc)}

                backoff = BACKOFF_BASE ** attempt
                raise self.retry(exc=exc, countdown=backoff)

    return asyncio.get_event_loop().run_until_complete(_run())


# ─── Bulk notification (alertas municipais) ───────────────────

@celery_app.task(
    bind=True,
    base=DatabaseTask,
    queue="notifications",
    name="notifications.bulk_send",
    time_limit=3600,           # máximo 1h por tarefa bulk
    soft_time_limit=3500,
)
def bulk_send_notification(
    self: Task,
    notification_type: str,
    channel_names: list[str],
    template_vars: dict,
    recipient_ids: list[str],
) -> dict:
    """
    Envio em lote para alertas municipais críticos.
    Processado em chunks de 50 para não sobrecarregar os providers.
    """
    from app.schemas.notification import NotificationChannel

    async def _run() -> dict:
        channels = [NotificationChannel(c) for c in channel_names]
        sent = 0
        failed = 0
        chunk_size = 50

        async with self._get_db_session() as db:
            from app.services.notification_service import NotificationService
            svc = NotificationService(db)

            for i in range(0, len(recipient_ids), chunk_size):
                chunk = recipient_ids[i:i + chunk_size]
                ids = await svc.send_bulk(
                    notification_type=notification_type,
                    channels=channels,
                    template_vars=template_vars,
                    recipient_ids=chunk,
                )
                sent += len(ids)

                # Progresso para monitorização no Flower
                self.update_state(
                    state="PROGRESS",
                    meta={"sent": sent, "total": len(recipient_ids)},
                )

                # Pequena pausa entre chunks — respeitar rate limits dos providers
                await asyncio.sleep(0.5)

        return {"sent": sent, "failed": failed, "total": len(recipient_ids)}

    return asyncio.get_event_loop().run_until_complete(_run())


# ─── Tarefa periódica — reprocessar notificações pendentes ────

@celery_app.task(name="notifications.requeue_stale")
def requeue_stale_notifications() -> dict:
    """
    Executada pelo Celery Beat a cada 5 minutos.
    Apanha notificações em PENDING com next_retry_at no passado
    que não foram processadas (ex: worker reiniciado durante envio).
    """
    async def _run() -> dict:
        from datetime import datetime, timezone
        from sqlalchemy import select
        from app.models.notification import Notification
        from app.database.session import AsyncSessionLocal

        now = datetime.now(timezone.utc)
        requeued = 0

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Notification).where(
                    Notification.status == "PENDING",
                    Notification.next_retry_at <= now,
                    Notification.attempt_count < MAX_RETRIES,
                )
            )
            stale = result.scalars().all()
            for notif in stale:
                retry_notification.apply_async(args=[notif.id], countdown=0)
                requeued += 1

        log.info("requeue_stale: requeued %d notifications", requeued)
        return {"requeued": requeued}

    return asyncio.get_event_loop().run_until_complete(_run())


# Celery Beat schedule (adicionar ao celery_app.conf):
# from celery.schedules import crontab
# celery_app.conf.beat_schedule = {
#     "requeue-stale-notifications": {
#         "task":     "notifications.requeue_stale",
#         "schedule": 300,   # cada 5 minutos
#     },
# }`;

const CODE_ROUTER = `# app/routers/v1/notifications.py
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.database.session import get_async_session
from app.models.notification import Notification, NotificationPreference
from app.models.user import User
from app.schemas.notification import (
    BulkNotificationRequest,
    DeliveryReceiptWebhook,
    NotificationChannel,
    NotificationPreferenceUpdate,
    NotificationRequest,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notificações"])


# ─── POST /notifications/send  (admin — envio pontual) ─────────

@router.post(
    "/send",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enviar notificação individual (Admin)",
)
async def send_notification(
    body:             NotificationRequest,
    background_tasks: BackgroundTasks,
    db:               AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
) -> dict:
    svc   = NotificationService(db)
    notif = await svc.send(body, background_tasks=background_tasks)
    return {"notification_id": notif.id, "status": notif.status}


# ─── POST /notifications/bulk  (admin — alertas municipais) ────

@router.post(
    "/bulk",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Alerta municipal bulk (Admin)",
    description=(
        "Para listas >500 destinatários, a tarefa é sempre delegada ao Celery. "
        "Para listas menores com send_immediately=True, usa BackgroundTasks do FastAPI."
    ),
)
async def send_bulk(
    body:             BulkNotificationRequest,
    background_tasks: BackgroundTasks,
    db:               AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
) -> dict:
    # Obter destinatários via filtro
    recipient_ids = await _resolve_recipients(db, body.recipient_filter)

    # Volumes grandes → sempre Celery
    use_celery = len(recipient_ids) > 500 or not body.send_immediately

    if use_celery:
        from app.tasks.notification_tasks import bulk_send_notification
        task = bulk_send_notification.apply_async(
            kwargs={
                "notification_type": body.notification_type.value,
                "channel_names":     [c.value for c in body.channels],
                "template_vars":     body.template_vars,
                "recipient_ids":     recipient_ids,
            },
            queue="notifications",
        )
        return {
            "task_id":         task.id,
            "recipient_count": len(recipient_ids),
            "mode":            "celery",
        }
    else:
        svc = NotificationService(db)
        ids = await svc.send_bulk(
            notification_type=body.notification_type.value,
            channels=body.channels,
            template_vars=body.template_vars,
            recipient_ids=recipient_ids,
            background_tasks=background_tasks,
        )
        return {
            "notification_ids": ids,
            "recipient_count":  len(recipient_ids),
            "mode":             "background",
        }


# ─── GET /notifications/me  (utilizador — as suas notificações) ─

@router.get(
    "/me",
    summary="Notificações do utilizador autenticado (últimas 50)",
)
async def my_notifications(
    current_user: User = Depends(get_current_user),
    db:           AsyncSession = Depends(get_async_session),
) -> list[dict]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    rows = result.scalars().all()
    return [
        {
            "id":     r.id,
            "type":   r.notification_type,
            "channel":r.channel,
            "status": r.status,
            "body":   r.body,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


# ─── PUT /notifications/preferences  (utilizador) ──────────────

@router.put(
    "/preferences",
    summary="Actualizar preferências de notificação",
)
async def update_preferences(
    body:         NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db:           AsyncSession = Depends(get_async_session),
) -> dict:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(NotificationPreference)
        .where(NotificationPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()

    if pref:
        await db.execute(
            update(NotificationPreference)
            .where(NotificationPreference.user_id == current_user.id)
            .values(**body.model_dump(), updated_at=now)
        )
    else:
        db.add(NotificationPreference(
            user_id=current_user.id,
            updated_at=now,
            **body.model_dump(),
        ))

    await db.commit()
    return {"message": "Preferências actualizadas com sucesso."}


# ─── POST /notifications/webhook/twilio  (Twilio delivery receipt) ─

@router.post(
    "/webhook/twilio",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,  # não expor na documentação pública
    summary="Webhook de entrega Twilio (delivery receipt)",
)
async def twilio_delivery_webhook(
    request: Request,
    db:      AsyncSession = Depends(get_async_session),
) -> dict:
    # Twilio envia form-encoded, não JSON
    form = await request.form()
    message_sid = form.get("MessageSid", "")
    sms_status  = form.get("MessageStatus", "")

    if not message_sid:
        raise HTTPException(status_code=400, detail="MessageSid ausente.")

    status_map = {
        "delivered": "DELIVERED",
        "failed":    "FAILED",
        "undelivered": "FAILED",
    }
    new_status = status_map.get(sms_status)
    if new_status:
        from datetime import datetime, timezone
        updates = {"status": new_status, "updated_at": datetime.now(timezone.utc)}
        if new_status == "DELIVERED":
            updates["delivered_at"] = datetime.now(timezone.utc)
        await db.execute(
            update(Notification)
            .where(Notification.provider_message_id == message_sid)
            .values(**updates)
        )
        await db.commit()

    return {"received": True}


# ─── POST /notifications/webhook/meta  (WhatsApp delivery receipt) ─

@router.post(
    "/webhook/meta",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
    summary="Webhook de entrega Meta / WhatsApp",
)
async def meta_delivery_webhook(
    body: dict,
    db:   AsyncSession = Depends(get_async_session),
) -> dict:
    # Estrutura simplificada — ver Meta Webhooks docs para payload completo
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            for status_update in change.get("value", {}).get("statuses", []):
                wamid  = status_update.get("id")
                status_val = status_update.get("status")  # "sent", "delivered", "read", "failed"
                status_map = {"delivered": "DELIVERED", "read": "DELIVERED", "failed": "FAILED"}
                new_status = status_map.get(status_val)
                if wamid and new_status:
                    from datetime import datetime, timezone
                    await db.execute(
                        update(Notification)
                        .where(Notification.provider_message_id == wamid)
                        .values(status=new_status, updated_at=datetime.now(timezone.utc))
                    )
            await db.commit()
    return {"received": True}


# ─── Helpers ───────────────────────────────────────────────────

async def _resolve_recipients(db: AsyncSession, filters: dict | None) -> list[str]:
    """Devolve lista de user_ids baseada nos filtros fornecidos."""
    from app.models.user import User
    q = select(User.id).where(User.is_active == True, User.deleted_at.is_(None))
    if filters:
        if bairro := filters.get("bairro_id"):
            q = q.where(User.bairro_id == bairro)
        if role := filters.get("role"):
            q = q.where(User.role == role)
    result = await db.execute(q)
    return [str(r) for r in result.scalars().all()]`;

const CODE_CONFIG = `# Adições ao app/config.py (classe Settings)

# ── Twilio (SMS) ────────────────────────────────────────────────
TWILIO_ACCOUNT_SID: str = ""
TWILIO_AUTH_TOKEN:  str = ""
TWILIO_FROM_NUMBER: str = ""    # ex: +14155238886 (número Twilio)

# ── WhatsApp Business API (Meta) ────────────────────────────────
WHATSAPP_ACCESS_TOKEN:    str = ""   # token permanente do System User
WHATSAPP_PHONE_NUMBER_ID: str = ""   # ID do número no Meta Business Manager

# ── SMTP / Gmail ────────────────────────────────────────────────
SMTP_HOST:     str = "smtp.gmail.com"
SMTP_PORT:     int = 587
SMTP_USER:     str = ""                 # conta Gmail
SMTP_PASSWORD: str = ""                 # App Password (não a senha da conta)
SMTP_FROM:     str = "noreply@mulenvos.gv.ao"

# ── Celery ─────────────────────────────────────────────────────
CELERY_BROKER_URL: str = "redis://localhost:6379/1"
CELERY_RESULT_URL: str = "redis://localhost:6379/2"

# ─── .env.example (adicionar) ──────────────────────────────────
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_FROM_NUMBER=+14155238886
#
# WHATSAPP_ACCESS_TOKEN=EAAxxxxx...
# WHATSAPP_PHONE_NUMBER_ID=123456789012345
#
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=op1na1@mulenvos.gv.ao
# SMTP_PASSWORD=xxxx_xxxx_xxxx_xxxx   # Gmail App Password
# SMTP_FROM=noreply@mulenvos.gv.ao
#
# CELERY_BROKER_URL=redis://localhost:6379/1
# CELERY_RESULT_URL=redis://localhost:6379/2

# ─── Migração 0006 — tabelas de notificação ────────────────────
# alembic/versions/0006_add_notifications.py

from alembic import op
import sqlalchemy as sa

revision      = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"

def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id",                 sa.CHAR(36),    nullable=False),
        sa.Column("idempotency_key",    sa.String(128), nullable=True),
        sa.Column("user_id",            sa.CHAR(36),    nullable=True),
        sa.Column("report_id",          sa.CHAR(36),    nullable=True),
        sa.Column("channel",            sa.Enum("sms","whatsapp","email","internal",
                                                name="enum_notif_channel"), nullable=False),
        sa.Column("notification_type",  sa.String(50),  nullable=False),
        sa.Column("status",             sa.Enum("PENDING","SENDING","SENT","DELIVERED","FAILED",
                                                name="enum_notif_status"),
                  nullable=False, server_default="PENDING"),
        sa.Column("recipient_phone",    sa.String(20),  nullable=True),
        sa.Column("recipient_email",    sa.String(254), nullable=True),
        sa.Column("subject",            sa.String(500), nullable=True),
        sa.Column("body",               sa.Text(),      nullable=False),
        sa.Column("provider_message_id",sa.String(128), nullable=True),
        sa.Column("delivered_at",       sa.DateTime(),  nullable=True),
        sa.Column("failed_at",          sa.DateTime(),  nullable=True),
        sa.Column("failure_reason",     sa.Text(),      nullable=True),
        sa.Column("attempt_count",      sa.Integer(),   nullable=False, server_default="0"),
        sa.Column("next_retry_at",      sa.DateTime(),  nullable=True),
        sa.Column("template_vars",      sa.JSON(),      nullable=True),
        sa.Column("raw_response",       sa.JSON(),      nullable=True),
        sa.Column("created_at",         sa.DateTime(),  nullable=False),
        sa.Column("updated_at",         sa.DateTime(),  nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_notif_idempotency"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_notif_user_id",     "notifications", ["user_id"])
    op.create_index("idx_notif_status",      "notifications", ["status"])
    op.create_index("idx_notif_channel",     "notifications", ["channel"])
    op.create_index("idx_notif_retry_at",    "notifications", ["next_retry_at"])
    op.create_index("idx_notif_provider_id", "notifications", ["provider_message_id"])

    op.create_table(
        "notification_preferences",
        sa.Column("user_id",           sa.CHAR(36),  nullable=False),
        sa.Column("sms_enabled",       sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("whatsapp_enabled",  sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("email_enabled",     sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("internal_enabled",  sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("quiet_hours_start", sa.Integer(), nullable=True),
        sa.Column("quiet_hours_end",   sa.Integer(), nullable=True),
        sa.Column("language",          sa.String(10),nullable=False, server_default="'pt'"),
        sa.Column("updated_at",        sa.DateTime(),nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_table("notifications")`;

// ─── UI ────────────────────────────────────────────────────────

const TABS = [
  { id: "visao",     label: "Visão Geral",                   code: null },
  { id: "schemas",   label: "schemas/notification.py",       code: CODE_SCHEMAS },
  { id: "models",    label: "models/notification.py",        code: CODE_MODELS },
  { id: "templates", label: "core/templates.py",             code: CODE_TEMPLATES },
  { id: "service",   label: "services/notification_service.py", code: CODE_SERVICE },
  { id: "channels",  label: "services/channels/",           code: CODE_CHANNELS },
  { id: "tasks",     label: "tasks/notification_tasks.py",   code: CODE_TASKS },
  { id: "router",    label: "routers/v1/notifications.py",  code: CODE_ROUTER },
  { id: "config",    label: "config.py / Migração 0006",    code: CODE_CONFIG },
];

interface ChannelCard {
  name: string;
  provider: string;
  lib: string;
  priority: number;
  fallback: string | null;
  color: string;
  badge: string;
}

const CHANNELS: ChannelCard[] = [
  {
    name: "WhatsApp",
    provider: "Meta Cloud API",
    lib: "httpx (sem SDK)",
    priority: 1,
    fallback: "SMS",
    color: "border-green-400 bg-green-50",
    badge: "bg-green-100 text-green-800",
  },
  {
    name: "SMS",
    provider: "Twilio REST API",
    lib: "httpx (sem SDK)",
    priority: 2,
    fallback: null,
    color: "border-blue-400 bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    name: "Email",
    provider: "SMTP / Gmail",
    lib: "smtplib + asyncio executor",
    priority: 3,
    fallback: null,
    color: "border-amber-400 bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    name: "Internal",
    provider: "Base de dados",
    lib: "SQLAlchemy (InternalAlert)",
    priority: 4,
    fallback: null,
    color: "border-violet-400 bg-violet-50",
    badge: "bg-violet-100 text-violet-800",
  },
];

const RETRY_STEPS = [
  { attempt: 1, wait: "4 s",  after: "Imediato após falha", color: "bg-amber-400" },
  { attempt: 2, wait: "16 s", after: "4^2 = 16 segundos",   color: "bg-orange-500" },
  { attempt: 3, wait: "64 s", after: "4^3 = 64 segundos",   color: "bg-red-500" },
  { attempt: "—", wait: "FAILED", after: "Status permanente — sem mais tentativas", color: "bg-gray-500" },
];

const FLOW_STEPS = [
  { step: "NotificationRequest",      detail: "Receber pedido (user_id, type, channel, vars)",     type: "action" },
  { step: "Verificar preferências",   detail: "Canal activo? Horas de silêncio?",                  type: "check" },
  { step: "Idempotência",             detail: "idempotency_key já existe na BD? → devolver registo existente", type: "check" },
  { step: "render_template()",        detail: "Preencher template português com template_vars",     type: "action" },
  { step: "INSERT notifications",     detail: "Persistir registo com status=PENDING",              type: "action" },
  { step: "BackgroundTasks / imediato", detail: "Nunca bloquear o request thread",                type: "success" },
  { step: "send_via_channel()",       detail: "Chamar SmsChannel / WhatsAppChannel / EmailChannel", type: "action" },
  { step: "WhatsApp falha?",          detail: "→ Fallback automático para SMS com template SMS",   type: "error" },
  { step: "mark_sent()",              detail: "UPDATE status=SENT + provider_message_id",          type: "success" },
  { step: "schedule_retry()",         detail: "Se falhou: Celery retry com backoff 4^attempt",     type: "error" },
  { step: "Webhook entrega",          detail: "Twilio / Meta → UPDATE status=DELIVERED",           type: "success" },
];

const STEP_COLORS: Record<string, string> = {
  action:  "border-l-blue-500 bg-blue-50",
  check:   "border-l-amber-500 bg-amber-50",
  error:   "border-l-red-500 bg-red-50",
  success: "border-l-green-500 bg-green-50",
};
const STEP_BADGES: Record<string, string> = {
  action:  "bg-blue-100 text-blue-700",
  check:   "bg-amber-100 text-amber-700",
  error:   "bg-red-100 text-red-700",
  success: "bg-green-100 text-green-700",
};

const TEMPLATES_SUMMARY = [
  { type: "REPORT_RECEIVED",    channels: "SMS, WhatsApp, Email",  desc: "Ticket gerado — link de acompanhamento" },
  { type: "REPORT_TRIAGED",     channels: "SMS, WhatsApp",         desc: "Relatório em análise" },
  { type: "REPORT_ASSIGNED",    channels: "SMS, WhatsApp",         desc: "Técnico atribuído + nome + bairro" },
  { type: "REPORT_IN_PROGRESS", channels: "SMS, WhatsApp",         desc: "Intervenção iniciada" },
  { type: "REPORT_RESOLVED",    channels: "SMS, WhatsApp, Email",  desc: "Resolvido — link para confirmar ou reabrir" },
  { type: "REPORT_CLOSED",      channels: "SMS, WhatsApp",         desc: "Encerrado — link de avaliação" },
  { type: "OTP_LOGIN",          channels: "SMS, WhatsApp, Email",  desc: "Código OTP 6 dígitos — válido 10 min" },
  { type: "PASSWORD_RESET",     channels: "SMS, WhatsApp, Email",  desc: "Código de redefinição — válido 15 min" },
  { type: "MUNICIPAL_ALERT",    channels: "SMS, WhatsApp, Email",  desc: "Alerta municipal — título + corpo" },
  { type: "ACCOUNT_WELCOME",    channels: "SMS, WhatsApp",         desc: "Conta criada — link de acesso" },
];

export default function NotificationEngine() {
  const [activeTab, setActiveTab] = useState("visao");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Motor de Notificações
        </h1>
        <p className="text-muted-foreground">
          Celery · Twilio SMS · WhatsApp Business API · SMTP · Retry Backoff · Templates pt_AO
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Async (nunca bloqueia)", "WhatsApp → SMS fallback", "Retry 3× backoff 4^n", "Idempotência", "Delivery receipt webhook", "Horas de silêncio"].map(t => (
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

          {/* Canais */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Canais de envio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CHANNELS.map(ch => (
                <div key={ch.name} className={cn("border-l-4 rounded-lg p-4", ch.color)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground text-sm">{ch.name}</span>
                    <span className={cn("text-xs font-mono px-2 py-0.5 rounded font-bold", ch.badge)}>
                      Prioridade {ch.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Provider: {ch.provider}</p>
                  <p className="text-xs text-muted-foreground mb-2">Lib: <code className="bg-white/60 px-1 rounded">{ch.lib}</code></p>
                  {ch.fallback && (
                    <div className="flex items-center gap-1.5 text-xs text-red-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      Fallback automático → {ch.fallback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fluxo */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Fluxo de envio</h2>
            <ol className="space-y-2">
              {FLOW_STEPS.map((s, i) => (
                <li key={i} className={cn("border-l-4 pl-3 py-1.5 rounded-r", STEP_COLORS[s.type])}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded font-bold", STEP_BADGES[s.type])}>{i + 1}</span>
                    <code className="text-xs font-mono font-semibold text-foreground">{s.step}</code>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">{s.detail}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Retry */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Retry com backoff exponencial — 4^attempt segundos
            </h2>
            <div className="flex flex-wrap gap-3">
              {RETRY_STEPS.map((r, i) => (
                <div key={i} className="flex-1 min-w-[140px] border border-border rounded-lg p-3 text-center">
                  <div className={cn("w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold", r.color)}>
                    {r.attempt}
                  </div>
                  <div className="font-mono font-bold text-foreground text-sm mb-1">{r.wait}</div>
                  <div className="text-xs text-muted-foreground">{r.after}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Após 3 falhas → status <code className="bg-secondary px-1 rounded">FAILED</code> permanente.
              Tarefa Celery Beat <code className="bg-secondary px-1 rounded">requeue_stale</code> (cada 5 min)
              apanha notificações PENDING órfãs após restart do worker.
            </p>
          </div>

          {/* Templates */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Templates em Português (pt_AO) — 10 tipos, 4 canais
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-foreground">Tipo</th>
                    <th className="text-left py-2 pr-4 font-medium text-foreground">Canais</th>
                    <th className="text-left py-2 font-medium text-foreground">Conteúdo</th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATES_SUMMARY.map((t, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="py-2 pr-4 font-mono text-xs font-semibold text-foreground whitespace-nowrap">{t.type}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">{t.channels}</td>
                      <td className="py-2 text-xs text-muted-foreground">{t.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decisions */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Decisões de arquitectura
            </h2>
            {[
              {
                t: "BackgroundTasks vs Celery",
                d: "FastAPI BackgroundTasks para envios imediatos (sem retry). Celery para retry com backoff, bulk >500 destinatários, e re-fila de órfãos. Os dois coexistem: BackgroundTasks despacha, Celery reage a falhas.",
              },
              {
                t: "Sem SDK Twilio nem SDK Meta",
                d: "Dependências mínimas — só httpx. SDKs oficiais adicionam overhead e acoplam ao provider. Migrar de Twilio para Vonage ou Africa's Talking é uma alteração de 30 linhas numa classe.",
              },
              {
                t: "Idempotência por idempotency_key",
                d: "Previne duplicados em retry de request HTTP. O chamador gera a chave (ex: SHA256(user_id + type + report_id)). A BD tem UNIQUE constraint — duplicado retorna o registo existente sem novo envio.",
              },
              {
                t: "SMTP síncrono em asyncio.executor",
                d: "smtplib é síncrono. Executa em ThreadPoolExecutor para não bloquear o event loop. Migração para SendGrid/SES é uma substituição de canal sem alterar o NotificationService.",
              },
            ].map(item => (
              <div key={item.t} className="border border-border rounded-lg p-4">
                <p className="font-semibold text-sm text-foreground mb-1">{item.t}</p>
                <p className="text-xs text-muted-foreground">{item.d}</p>
              </div>
            ))}
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
