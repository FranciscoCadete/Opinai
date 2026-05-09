import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

const TABELAS = [
  {
    nome: "channels",
    descricao: "Canal de origem da submissão (WhatsApp, SMS, USSD, Web, Mobile, Messenger). Referenciada por users, reports e notifications.",
    colunas: "id (UUID), name, label, is_active, config_json, created_at, updated_at, deleted_at",
    fks: "—",
    notas: "config_json é encriptado ao nível da aplicação antes de guardar.",
  },
  {
    nome: "bairros",
    descricao: "Tabela de referência para os bairros do Município dos Mulenvos. Usado em reports para geolocalização administrativa.",
    colunas: "id (UUID), nome, distrito, municipio, provincia, is_active, created_at, updated_at, deleted_at",
    fks: "—",
    notas: "Dados semente incluídos na migração 0002.",
  },
  {
    nome: "users",
    descricao: "Utilizadores da plataforma: cidadãos e funcionários municipais. Suporta autenticação por e-mail/senha ou por OTP via canal.",
    colunas: "id (UUID), full_name, phone, email, password_hash, role, channel_id, is_verified, is_active, locale, last_login_at, created_at, updated_at, deleted_at",
    fks: "channel_id → channels(id) SET NULL",
    notas: "password_hash é NULL para utilizadores registados apenas via canal (WhatsApp, USSD).",
  },
  {
    nome: "reports",
    descricao: "Ocorrências submetidas por cidadãos. Núcleo do sistema. Cada report tem um código de referência único e rastreável.",
    colunas: "id (UUID), reference_code, user_id, channel_id, bairro_id, category, subcategory, title, description, latitude, longitude, address_text, bairro_text, media_urls, status, priority, raw_payload, created_at, updated_at, deleted_at",
    fks: "user_id → users(id) SET NULL, channel_id → channels(id) RESTRICT, bairro_id → bairros(id) SET NULL",
    notas: "raw_payload guarda a mensagem original do canal para auditoria e re-processamento.",
  },
  {
    nome: "tickets",
    descricao: "Fluxo operacional interno. Criado a partir de um report por um gestor. Atribuído a um técnico de campo.",
    colunas: "id (UUID), report_id, assigned_to, created_by, status, priority, due_date, resolution_note, closed_at, created_at, updated_at, deleted_at",
    fks: "report_id → reports(id) CASCADE, assigned_to → users(id) SET NULL, created_by → users(id) RESTRICT",
    notas: "CASCADE em report_id: ao apagar (soft-delete) um report, os tickets associados são igualmente eliminados.",
  },
  {
    nome: "ticket_comments",
    descricao: "Comentários internos e públicos num ticket. is_internal=1 é visível apenas para funcionários.",
    colunas: "id (UUID), ticket_id, user_id, body, is_internal, created_at, updated_at, deleted_at",
    fks: "ticket_id → tickets(id) CASCADE, user_id → users(id) RESTRICT",
    notas: "—",
  },
  {
    nome: "notifications",
    descricao: "Registo completo de todas as notificações enviadas ao cidadão: SMS, WhatsApp, push, e-mail.",
    colunas: "id (UUID), user_id, channel_id, type, title, body, status, external_id, error_msg, scheduled_at, sent_at, delivered_at, created_at, updated_at, deleted_at",
    fks: "user_id → users(id) CASCADE, channel_id → channels(id) SET NULL",
    notas: "external_id guarda o ID da mensagem devolvido pelo gateway (ex: Africa's Talking MessageID).",
  },
  {
    nome: "analytics_events",
    descricao: "Log de eventos para KPIs do dashboard. Cada acção relevante gera um evento tipificado. Não se apaga — use deleted_at para filtrar.",
    colunas: "id (UUID), event_type, entity_type, entity_id, user_id, channel_id, metadata (JSON), occurred_at, created_at, updated_at, deleted_at",
    fks: "user_id → users(id) SET NULL, channel_id → channels(id) SET NULL",
    notas: "entity_id é CHAR(36) para compatibilidade com UUIDs de qualquer tabela.",
  },
  {
    nome: "audit_log",
    descricao: "Trilha de auditoria imutável. Regista INSERT, UPDATE e DELETE em tabelas críticas. Não tem deleted_at — nunca se apaga.",
    colunas: "id (UUID), table_name, record_id, action, actor_id, old_data (JSON), new_data (JSON), ip_address, user_agent, occurred_at",
    fks: "actor_id → users(id) SET NULL",
    notas: "Sem updated_at nem deleted_at. A imutabilidade é garantida por permissões a nível de base de dados (REVOKE UPDATE, DELETE ON audit_log).",
  },
];

const MIG_0001 = `"""Criar esquema inicial — todas as tabelas

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2025-05-09 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "a1b2c3d4e5f6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ─── channels ──────────────────────────────────────────────
    op.create_table(
        "channels",
        sa.Column("id",          sa.CHAR(36),    nullable=False),
        sa.Column("name",        sa.String(50),  nullable=False),
        sa.Column("label",       sa.String(100), nullable=False),
        sa.Column("is_active",   sa.Boolean(),   nullable=False, server_default="1"),
        sa.Column("config_json", mysql.JSON(),   nullable=True),
        sa.Column("created_at",  sa.DateTime(),  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at",  sa.DateTime(),  nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at",  sa.DateTime(),  nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_channels_name"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── bairros ───────────────────────────────────────────────
    op.create_table(
        "bairros",
        sa.Column("id",        sa.CHAR(36),   nullable=False),
        sa.Column("nome",      sa.String(150), nullable=False),
        sa.Column("distrito",  sa.String(100), nullable=True),
        sa.Column("municipio", sa.String(100), nullable=False, server_default="Mulenvos"),
        sa.Column("provincia", sa.String(100), nullable=False, server_default="Luanda"),
        sa.Column("is_active", sa.Boolean(),   nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nome", name="uq_bairros_nome"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── users ─────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",            sa.CHAR(36),   nullable=False),
        sa.Column("full_name",     sa.String(200), nullable=True),
        sa.Column("phone",         sa.String(20),  nullable=True),
        sa.Column("email",         sa.String(254), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("role",          sa.Enum(
            "admin", "manager", "analyst", "technician", "citizen",
            name="enum_user_role",
        ), nullable=False, server_default="citizen"),
        sa.Column("channel_id",    sa.CHAR(36), nullable=True),
        sa.Column("is_verified",   sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_active",     sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("locale",        sa.String(10), nullable=False, server_default="pt_AO"),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at",    sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at",    sa.DateTime(), nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at",    sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.ForeignKeyConstraint(["channel_id"], ["channels.id"], ondelete="SET NULL"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── reports ───────────────────────────────────────────────
    op.create_table(
        "reports",
        sa.Column("id",             sa.CHAR(36),    nullable=False),
        sa.Column("reference_code", sa.String(20),  nullable=False),
        sa.Column("user_id",        sa.CHAR(36),    nullable=True),
        sa.Column("channel_id",     sa.CHAR(36),    nullable=False),
        sa.Column("bairro_id",      sa.CHAR(36),    nullable=True),
        sa.Column("category",       sa.String(100), nullable=False),
        sa.Column("subcategory",    sa.String(100), nullable=True),
        sa.Column("title",          sa.String(300), nullable=False),
        sa.Column("description",    sa.Text(),      nullable=True),
        sa.Column("latitude",       sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude",      sa.Numeric(10, 7), nullable=True),
        sa.Column("address_text",   sa.String(500), nullable=True),
        sa.Column("bairro_text",    sa.String(150), nullable=True),
        sa.Column("media_urls",     mysql.JSON(),   nullable=True),
        sa.Column("status", sa.Enum(
            "received", "in_review", "assigned",
            "in_progress", "resolved", "closed", "rejected",
            name="enum_report_status",
        ), nullable=False, server_default="received"),
        sa.Column("priority", sa.Enum(
            "low", "medium", "high", "critical",
            name="enum_priority",
        ), nullable=False, server_default="medium"),
        sa.Column("raw_payload",  mysql.JSON(),  nullable=True),
        sa.Column("created_at",   sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at",   sa.DateTime(), nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at",   sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference_code", name="uq_reports_reference_code"),
        sa.ForeignKeyConstraint(["user_id"],    ["users.id"],    ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["channel_id"], ["channels.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["bairro_id"],  ["bairros.id"],  ondelete="SET NULL"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── tickets ───────────────────────────────────────────────
    op.create_table(
        "tickets",
        sa.Column("id",              sa.CHAR(36), nullable=False),
        sa.Column("report_id",       sa.CHAR(36), nullable=False),
        sa.Column("assigned_to",     sa.CHAR(36), nullable=True),
        sa.Column("created_by",      sa.CHAR(36), nullable=False),
        sa.Column("status", sa.Enum(
            "open", "in_progress", "pending_approval",
            "resolved", "closed", "cancelled",
            name="enum_ticket_status",
        ), nullable=False, server_default="open"),
        sa.Column("priority", sa.Enum(
            "low", "medium", "high", "critical",
            name="enum_ticket_priority",
        ), nullable=False, server_default="medium"),
        sa.Column("due_date",        sa.Date(),     nullable=True),
        sa.Column("resolution_note", sa.Text(),     nullable=True),
        sa.Column("closed_at",       sa.DateTime(), nullable=True),
        sa.Column("created_at",      sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at",      sa.DateTime(), nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at",      sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["report_id"],   ["reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"],   ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"],  ["users.id"],   ondelete="RESTRICT"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── ticket_comments ───────────────────────────────────────
    op.create_table(
        "ticket_comments",
        sa.Column("id",          sa.CHAR(36), nullable=False),
        sa.Column("ticket_id",   sa.CHAR(36), nullable=False),
        sa.Column("user_id",     sa.CHAR(36), nullable=False),
        sa.Column("body",        sa.Text(),   nullable=False),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at",  sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at",  sa.DateTime(), nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at",  sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"],   ["users.id"],   ondelete="RESTRICT"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── notifications ─────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id",           sa.CHAR(36),   nullable=False),
        sa.Column("user_id",      sa.CHAR(36),   nullable=False),
        sa.Column("channel_id",   sa.CHAR(36),   nullable=True),
        sa.Column("type",         sa.String(50), nullable=False),
        sa.Column("title",        sa.String(300), nullable=True),
        sa.Column("body",         sa.Text(),     nullable=False),
        sa.Column("status", sa.Enum(
            "pending", "sent", "delivered", "failed", "cancelled",
            name="enum_notification_status",
        ), nullable=False, server_default="pending"),
        sa.Column("external_id",  sa.String(255), nullable=True),
        sa.Column("error_msg",    sa.Text(),      nullable=True),
        sa.Column("scheduled_at", sa.DateTime(),  nullable=True),
        sa.Column("sent_at",      sa.DateTime(),  nullable=True),
        sa.Column("delivered_at", sa.DateTime(),  nullable=True),
        sa.Column("created_at",   sa.DateTime(),  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at",   sa.DateTime(),  nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at",   sa.DateTime(),  nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"],    ["users.id"],    ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["channel_id"], ["channels.id"], ondelete="SET NULL"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── analytics_events ──────────────────────────────────────
    op.create_table(
        "analytics_events",
        sa.Column("id",          sa.CHAR(36),    nullable=False),
        sa.Column("event_type",  sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50),  nullable=True),
        sa.Column("entity_id",   sa.CHAR(36),    nullable=True),
        sa.Column("user_id",     sa.CHAR(36),    nullable=True),
        sa.Column("channel_id",  sa.CHAR(36),    nullable=True),
        sa.Column("metadata",    mysql.JSON(),   nullable=True),
        sa.Column("occurred_at", sa.DateTime(),  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("created_at",  sa.DateTime(),  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at",  sa.DateTime(),  nullable=False, server_default=sa.text("NOW() ON UPDATE NOW()")),
        sa.Column("deleted_at",  sa.DateTime(),  nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"],    ["users.id"],    ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["channel_id"], ["channels.id"], ondelete="SET NULL"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── audit_log (imutável) ──────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("id",          sa.CHAR(36),    nullable=False),
        sa.Column("table_name",  sa.String(100), nullable=False),
        sa.Column("record_id",   sa.CHAR(36),    nullable=False),
        sa.Column("action",      sa.Enum("INSERT", "UPDATE", "DELETE", name="enum_audit_action"), nullable=False),
        sa.Column("actor_id",    sa.CHAR(36),    nullable=True),
        sa.Column("old_data",    mysql.JSON(),   nullable=True),
        sa.Column("new_data",    mysql.JSON(),   nullable=True),
        sa.Column("ip_address",  sa.String(45),  nullable=True),
        sa.Column("user_agent",  sa.String(500), nullable=True),
        sa.Column("occurred_at", sa.DateTime(),  nullable=False, server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        # Sem updated_at nem deleted_at — registo imutável
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ─── Índices de alta frequência ────────────────────────────
    # channels
    op.create_index("idx_channels_name",       "channels", ["name"])
    op.create_index("idx_channels_deleted_at", "channels", ["deleted_at"])

    # bairros
    op.create_index("idx_bairros_nome",      "bairros", ["nome"])
    op.create_index("idx_bairros_municipio", "bairros", ["municipio"])

    # users
    op.create_index("idx_users_phone",      "users", ["phone"])
    op.create_index("idx_users_email",      "users", ["email"])
    op.create_index("idx_users_role",       "users", ["role"])
    op.create_index("idx_users_deleted_at", "users", ["deleted_at"])

    # reports
    op.create_index("idx_reports_status",         "reports", ["status"])
    op.create_index("idx_reports_created_at",     "reports", ["created_at"])
    op.create_index("idx_reports_bairro_id",      "reports", ["bairro_id"])
    op.create_index("idx_reports_channel_id",     "reports", ["channel_id"])
    op.create_index("idx_reports_user_id",        "reports", ["user_id"])
    op.create_index("idx_reports_deleted_at",     "reports", ["deleted_at"])
    op.create_index("idx_reports_status_channel", "reports", ["status", "channel_id"])
    op.create_index("idx_reports_status_bairro",  "reports", ["status", "bairro_id"])

    # tickets
    op.create_index("idx_tickets_status",      "tickets", ["status"])
    op.create_index("idx_tickets_assigned_to", "tickets", ["assigned_to"])
    op.create_index("idx_tickets_report_id",   "tickets", ["report_id"])
    op.create_index("idx_tickets_deleted_at",  "tickets", ["deleted_at"])
    op.create_index("idx_tickets_due_date",    "tickets", ["due_date"])

    # ticket_comments
    op.create_index("idx_tc_ticket_id",   "ticket_comments", ["ticket_id"])
    op.create_index("idx_tc_user_id",     "ticket_comments", ["user_id"])
    op.create_index("idx_tc_deleted_at",  "ticket_comments", ["deleted_at"])

    # notifications
    op.create_index("idx_notif_user_id",     "notifications", ["user_id"])
    op.create_index("idx_notif_status",      "notifications", ["status"])
    op.create_index("idx_notif_scheduled",   "notifications", ["scheduled_at"])
    op.create_index("idx_notif_deleted_at",  "notifications", ["deleted_at"])

    # analytics_events
    op.create_index("idx_ae_event_type",  "analytics_events", ["event_type"])
    op.create_index("idx_ae_occurred_at", "analytics_events", ["occurred_at"])
    op.create_index("idx_ae_entity",      "analytics_events", ["entity_type", "entity_id"])
    op.create_index("idx_ae_user_id",     "analytics_events", ["user_id"])
    op.create_index("idx_ae_channel_id",  "analytics_events", ["channel_id"])

    # audit_log
    op.create_index("idx_audit_table_record", "audit_log", ["table_name", "record_id"])
    op.create_index("idx_audit_actor_id",     "audit_log", ["actor_id"])
    op.create_index("idx_audit_occurred_at",  "audit_log", ["occurred_at"])
    op.create_index("idx_audit_action",       "audit_log", ["action"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("analytics_events")
    op.drop_table("notifications")
    op.drop_table("ticket_comments")
    op.drop_table("tickets")
    op.drop_table("reports")
    op.drop_table("users")
    op.drop_table("bairros")
    op.drop_table("channels")`;

const MIG_0002 = `"""Dados semente: canais, bairros dos Mulenvos e superadmin inicial

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2025-05-09 00:01:00.000000
"""
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
NOW = datetime.now(timezone.utc).replace(tzinfo=None)

# UUIDs fixos para dados semente (previsíveis e referenciais)
CHANNEL_IDS = {
    "whatsapp":  "11111111-0001-0001-0001-000000000001",
    "sms":       "11111111-0001-0001-0001-000000000002",
    "ussd":      "11111111-0001-0001-0001-000000000003",
    "web":       "11111111-0001-0001-0001-000000000004",
    "mobile":    "11111111-0001-0001-0001-000000000005",
    "messenger": "11111111-0001-0001-0001-000000000006",
}

BAIRRO_IDS = {
    "Rangel":   "22222222-0002-0002-0002-000000000001",
    "Palanca":  "22222222-0002-0002-0002-000000000002",
    "Camama":   "22222222-0002-0002-0002-000000000003",
    "Golf 2":   "22222222-0002-0002-0002-000000000004",
    "Benfica":  "22222222-0002-0002-0002-000000000005",
}

ADMIN_ID = "33333333-0003-0003-0003-000000000001"


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Canais de submissão ──────────────────────────────────
    conn.execute(
        sa.text("""
            INSERT INTO channels (id, name, label, is_active, created_at, updated_at)
            VALUES
              (:id1, 'whatsapp',  'WhatsApp Business',       1, :now, :now),
              (:id2, 'sms',       'SMS (Africa\\'s Talking)', 1, :now, :now),
              (:id3, 'ussd',      'USSD (*920#)',             1, :now, :now),
              (:id4, 'web',       'Portal Web',               1, :now, :now),
              (:id5, 'mobile',    'Aplicação Móvel',          1, :now, :now),
              (:id6, 'messenger', 'Facebook Messenger',       1, :now, :now)
        """),
        {
            "id1": CHANNEL_IDS["whatsapp"],
            "id2": CHANNEL_IDS["sms"],
            "id3": CHANNEL_IDS["ussd"],
            "id4": CHANNEL_IDS["web"],
            "id5": CHANNEL_IDS["mobile"],
            "id6": CHANNEL_IDS["messenger"],
            "now": NOW,
        },
    )

    # ── 2. Bairros dos Mulenvos ─────────────────────────────────
    # Município dos Mulenvos — Luanda, Angola
    conn.execute(
        sa.text("""
            INSERT INTO bairros (id, nome, distrito, municipio, provincia, is_active, created_at, updated_at)
            VALUES
              (:b1, 'Rangel',  'Rangel',  'Mulenvos', 'Luanda', 1, :now, :now),
              (:b2, 'Palanca', 'Palanca', 'Mulenvos', 'Luanda', 1, :now, :now),
              (:b3, 'Camama',  'Camama',  'Mulenvos', 'Luanda', 1, :now, :now),
              (:b4, 'Golf 2',  'Benfica', 'Mulenvos', 'Luanda', 1, :now, :now),
              (:b5, 'Benfica', 'Benfica', 'Mulenvos', 'Luanda', 1, :now, :now)
        """),
        {
            "b1": BAIRRO_IDS["Rangel"],
            "b2": BAIRRO_IDS["Palanca"],
            "b3": BAIRRO_IDS["Camama"],
            "b4": BAIRRO_IDS["Golf 2"],
            "b5": BAIRRO_IDS["Benfica"],
            "now": NOW,
        },
    )

    # ── 3. Utilizador superadmin inicial ────────────────────────
    # ATENÇÃO: alterar a senha imediatamente após o primeiro login.
    # Nunca commitar credenciais reais neste ficheiro.
    hashed = pwd_ctx.hash("OP1NA1@MulenvosSuperAdmin2025!")

    conn.execute(
        sa.text("""
            INSERT INTO users
              (id, full_name, email, password_hash, role,
               is_verified, is_active, locale, created_at, updated_at)
            VALUES
              (:id, :name, :email, :pw, 'admin', 1, 1, 'pt_AO', :now, :now)
        """),
        {
            "id":    ADMIN_ID,
            "name":  "Administrador do Sistema",
            "email": "admin@mulenvos.gv.ao",
            "pw":    hashed,
            "now":   NOW,
        },
    )

    # ── 4. Evento de auditoria: arranque do sistema ─────────────
    conn.execute(
        sa.text("""
            INSERT INTO audit_log
              (id, table_name, record_id, action, actor_id, new_data, occurred_at)
            VALUES
              (:id, 'system', 'init', 'INSERT', :actor,
               :data, :now)
        """),
        {
            "id":    str(uuid.uuid4()),
            "actor": ADMIN_ID,
            "data":  '{"event": "schema_seeded", "version": "0002"}',
            "now":   NOW,
        },
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM audit_log WHERE table_name = 'system'"))
    conn.execute(sa.text("DELETE FROM users    WHERE id = :id"), {"id": ADMIN_ID})
    conn.execute(sa.text("DELETE FROM bairros  WHERE municipio = 'Mulenvos'"))
    conn.execute(sa.text("DELETE FROM channels WHERE name IN ('whatsapp','sms','ussd','web','mobile','messenger')"))`;

const MIG_0003 = `"""Permissões de base de dados: tornar audit_log imutável

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2025-05-09 00:02:00.000000

NOTA: Esta migração requer acesso GRANT OPTION.
Executar com o utilizador root ou DBA.
O utilizador da aplicação (op1na1_app) não deve ter
permissão de UPDATE ou DELETE sobre audit_log.
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None

# Utilizador da aplicação em produção
APP_USER = "op1na1_app"
APP_HOST = "localhost"  # ou '%' se o app correr noutro host
DB_NAME  = "op1na1_db"


def upgrade() -> None:
    conn = op.get_bind()

    # Garantir que o utilizador da aplicação existe (criar se necessário)
    # Em produção, gerir via scripts de provisionamento separados.
    conn.execute(sa.text(f"""
        CREATE USER IF NOT EXISTS '{APP_USER}'@'{APP_HOST}'
        IDENTIFIED BY 'SUBSTITUIR_PELA_SENHA_REAL';
    """))

    # Conceder privilégios normais em todas as tabelas
    conn.execute(sa.text(f"""
        GRANT SELECT, INSERT, UPDATE, DELETE
        ON {DB_NAME}.*
        TO '{APP_USER}'@'{APP_HOST}';
    """))

    # Revogar UPDATE e DELETE sobre audit_log — registo imutável
    conn.execute(sa.text(f"""
        REVOKE UPDATE, DELETE
        ON {DB_NAME}.audit_log
        FROM '{APP_USER}'@'{APP_HOST}';
    """))

    conn.execute(sa.text("FLUSH PRIVILEGES;"))


def downgrade() -> None:
    conn = op.get_bind()
    # Restaurar permissões completas (reverter restrição)
    conn.execute(sa.text(f"""
        GRANT UPDATE, DELETE
        ON {DB_NAME}.audit_log
        TO '{APP_USER}'@'{APP_HOST}';
    """))
    conn.execute(sa.text("FLUSH PRIVILEGES;"))`;

const ENV_PY = `# alembic/env.py
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Importar todos os modelos para que o Alembic os detecte
from app.database.base import Base          # noqa: F401
from app.models import (                    # noqa: F401
    channel, bairro, user, report,
    ticket, ticket_comment, notification,
    analytics_event, audit_log,
)

config = context.config

# Sobrescrever sqlalchemy.url com variável de ambiente
# (nunca commitar credenciais no alembic.ini)
database_url = os.environ.get("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Modo offline: gera SQL sem conectar à BD."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo online: conecta à BD e aplica as migrações."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()`;

const ALEMBIC_INI = `# alembic.ini
[alembic]
# sqlalchemy.url NÃO deve ter valor aqui em produção.
# Definir a variável de ambiente DATABASE_URL em vez disso.
# Formato: mysql+pymysql://utilizador:senha@host:3306/op1na1_db
sqlalchemy.url =

script_location = alembic
file_template = %%(year)d%%(month).2d%%(day).2d_%%(rev)s_%%(slug)s
prepend_sys_path = .
version_path_separator = os
output_encoding = utf-8

[loggers]
keys = root, sqlalchemy, alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %%H:%%M:%%S`;

const COMANDOS = `# Comandos Alembic — uso diário

# Aplicar todas as migrações pendentes
alembic upgrade head

# Aplicar apenas uma migração específica
alembic upgrade b2c3d4e5f6a7

# Ver migração actual
alembic current

# Ver histórico de migrações
alembic history --verbose

# Gerar nova migração (detecção automática de alterações)
alembic revision --autogenerate -m "adicionar coluna X a reports"

# Reverter a última migração
alembic downgrade -1

# Reverter para uma revisão específica
alembic downgrade a1b2c3d4e5f6

# Reverter tudo (CUIDADO em produção)
alembic downgrade base

# Ver SQL que seria executado (sem aplicar)
alembic upgrade head --sql

# Variável de ambiente (definir antes de qualquer comando)
export DATABASE_URL="mysql+pymysql://op1na1_app:SENHA@localhost:3306/op1na1_db"`;

const TABS_CONTENT = [
  { id: "schema",    label: "Resumo do Esquema",   code: null },
  { id: "mig0001",   label: "0001 — Criar Tabelas", code: MIG_0001 },
  { id: "mig0002",   label: "0002 — Dados Semente", code: MIG_0002 },
  { id: "mig0003",   label: "0003 — Permissões",    code: MIG_0003 },
  { id: "envpy",     label: "env.py",               code: ENV_PY },
  { id: "alembicini",label: "alembic.ini",          code: ALEMBIC_INI },
  { id: "comandos",  label: "Comandos",             code: COMANDOS },
];

const STATUS_COLORS: Record<string, string> = {
  "InnoDB / UUID":    "bg-blue-100 text-blue-800",
  "Soft Delete":      "bg-amber-100 text-amber-800",
  "Imutável":         "bg-red-100 text-red-800",
  "Referência":       "bg-purple-100 text-purple-800",
  "Operacional":      "bg-green-100 text-green-800",
  "Analítica":        "bg-sky-100 text-sky-800",
};

const TABLE_TAGS: Record<string, string[]> = {
  channels:          ["Referência"],
  bairros:           ["Referência"],
  users:             ["InnoDB / UUID", "Soft Delete"],
  reports:           ["InnoDB / UUID", "Soft Delete", "Operacional"],
  tickets:           ["InnoDB / UUID", "Soft Delete", "Operacional"],
  ticket_comments:   ["InnoDB / UUID", "Soft Delete"],
  notifications:     ["InnoDB / UUID", "Soft Delete"],
  analytics_events:  ["InnoDB / UUID", "Analítica"],
  audit_log:         ["InnoDB / UUID", "Imutável"],
};

export default function AlembicMigrations() {
  const [activeTab, setActiveTab] = useState("schema");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Migrações Alembic
        </h1>
        <p className="text-muted-foreground">
          Esquema MySQL completo com UUID, soft-delete, chaves estrangeiras e trilha de auditoria imutável.
          3 migrações prontas a executar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(STATUS_COLORS).map(([label, style]) => (
          <span key={label} className={`px-2 py-1 rounded font-medium ${style}`}>{label}</span>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto p-1 bg-secondary flex flex-wrap gap-1 w-full mb-2">
          {TABS_CONTENT.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs px-3 py-1.5 font-mono">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Resumo do Esquema ─────────────────────────────── */}
        <TabsContent value="schema">
          <div className="space-y-4">
            {TABELAS.map((t) => (
              <div key={t.nome} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <code className="font-mono text-base font-bold text-foreground">{t.nome}</code>
                  <div className="flex flex-wrap gap-1.5">
                    {(TABLE_TAGS[t.nome] || []).map(tag => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[tag] || "bg-secondary text-foreground"}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{t.descricao}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Colunas</p>
                    <p className="font-mono text-foreground leading-relaxed">{t.colunas}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Chaves Estrangeiras</p>
                    <p className="font-mono text-foreground">{t.fks}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notas</p>
                    <p className="text-foreground">{t.notas}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mt-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">Decisão de arquitectura: UUID vs AUTO_INCREMENT</p>
              <p className="text-sm text-amber-700">
                UUIDs (CHAR(36)) eliminam conflitos de chave em importações de dados, facilitam a fusão de bases de dados e evitam enumeração de IDs por actores maliciosos.
                O custo em espaço (+20 bytes/PK) é aceitável num sistema com &lt;10M registos. Em MySQL, garantir que o UUID é gerado ao nível da aplicação (Python: <code className="font-mono bg-amber-100 px-1 rounded">str(uuid.uuid4())</code>) e não via função SQL, para manter compatibilidade com Alembic autogenerate.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <p className="text-sm font-semibold text-blue-800 mb-2">Soft Delete: padrão de filtragem obrigatório</p>
              <p className="text-sm text-blue-700">
                Todos os repositórios devem filtrar <code className="font-mono bg-blue-100 px-1 rounded">deleted_at IS NULL</code> por omissão.
                Usar o mixin <code className="font-mono bg-blue-100 px-1 rounded">SoftDeleteMixin</code> no SQLAlchemy com <code className="font-mono bg-blue-100 px-1 rounded">@event.listens_for</code> para aplicar o filtro automaticamente em todas as queries, evitando fugas de dados apagados.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── Tabs de código ───────────────────────────────── */}
        {TABS_CONTENT.filter(t => t.code !== null).map(t => (
          <TabsContent key={t.id} value={t.id}>
            <CodeBlock
              code={t.code!}
              language={t.id === "alembicini" ? "ini" : t.id === "comandos" ? "bash" : "python"}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
