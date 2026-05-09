"""initial schema

Creates the OP1NA1 core schema:
  bairros, channels, users, reports, tickets,
  notifications, analytics_events, audit_log

Conventions:
  - InnoDB + utf8mb4 (utf8mb4_0900_ai_ci) on every table.
  - Primary keys are CHAR(36) UUIDs, server-defaulted to UUID().
  - Every table carries created_at, updated_at, deleted_at (soft-delete).
  - audit_log is enforced as append-only via BEFORE UPDATE / BEFORE DELETE
    triggers — the timestamp columns exist to satisfy the platform-wide
    convention but should never be mutated by application code.

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-09
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


# ---------- helpers --------------------------------------------------------

UUID_PK = lambda: sa.Column(  # noqa: E731
    "id",
    mysql.CHAR(36),
    primary_key=True,
    server_default=sa.text("(UUID())"),
)

UUID_FK = lambda name, target, *, nullable=True, ondelete=None: sa.Column(  # noqa: E731
    name,
    mysql.CHAR(36),
    sa.ForeignKey(target, ondelete=ondelete),
    nullable=nullable,
)


def timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            mysql.DATETIME(fsp=0),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            mysql.DATETIME(fsp=0),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            server_onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("deleted_at", mysql.DATETIME(fsp=0), nullable=True),
    ]


TABLE_OPTS = dict(
    mysql_engine="InnoDB",
    mysql_charset="utf8mb4",
    mysql_collate="utf8mb4_0900_ai_ci",
)


# ---------- upgrade --------------------------------------------------------

def upgrade() -> None:
    # ----- bairros (reference) --------------------------------------------
    op.create_table(
        "bairros",
        UUID_PK(),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("municipality", sa.String(80), nullable=False, server_default="Mulenvos"),
        sa.Column("centroid_lat", sa.Numeric(9, 6), nullable=True),
        sa.Column("centroid_lng", sa.Numeric(9, 6), nullable=True),
        sa.Column("is_active", mysql.TINYINT(1), nullable=False, server_default=sa.text("1")),
        *timestamp_columns(),
        sa.UniqueConstraint("code", name="uq_bairros_code"),
        **TABLE_OPTS,
    )
    op.create_index("idx_bairros_active", "bairros", ["is_active", "deleted_at"])

    # ----- channels (reference) -------------------------------------------
    op.create_table(
        "channels",
        UUID_PK(),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column(
            "type",
            mysql.ENUM("messaging", "voice", "web", "mobile", name="channel_type"),
            nullable=False,
        ),
        sa.Column("is_active", mysql.TINYINT(1), nullable=False, server_default=sa.text("1")),
        sa.Column("config_json", mysql.JSON, nullable=True),
        *timestamp_columns(),
        sa.UniqueConstraint("code", name="uq_channels_code"),
        **TABLE_OPTS,
    )
    op.create_index("idx_channels_active", "channels", ["is_active", "deleted_at"])

    # ----- users ----------------------------------------------------------
    op.create_table(
        "users",
        UUID_PK(),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(190), nullable=True),
        sa.Column("phone", sa.String(24), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column(
            "role",
            mysql.ENUM(
                "admin",
                "manager",
                "analyst",
                "technician",
                "citizen",
                name="user_role",
            ),
            nullable=False,
            server_default="citizen",
        ),
        sa.Column("locale", sa.String(8), nullable=False, server_default="pt-AO"),
        sa.Column(
            "status",
            mysql.ENUM("active", "suspended", "pending", name="user_status"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("last_login_at", mysql.DATETIME(fsp=0), nullable=True),
        *timestamp_columns(),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
        **TABLE_OPTS,
    )
    op.create_index("idx_users_role_status", "users", ["role", "status", "deleted_at"])
    op.create_index("idx_users_last_login", "users", ["last_login_at"])

    # ----- reports --------------------------------------------------------
    op.create_table(
        "reports",
        UUID_PK(),
        sa.Column("public_code", sa.String(16), nullable=False),
        UUID_FK("reporter_user_id", "users.id", nullable=False, ondelete="RESTRICT"),
        UUID_FK("channel_id", "channels.id", nullable=False, ondelete="RESTRICT"),
        UUID_FK("bairro_id", "bairros.id", nullable=True, ondelete="SET NULL"),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("subcategory", sa.String(64), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("lat", sa.Numeric(9, 6), nullable=True),
        sa.Column("lng", sa.Numeric(9, 6), nullable=True),
        sa.Column("address_text", sa.String(255), nullable=True),
        sa.Column("media_json", mysql.JSON, nullable=True),
        sa.Column(
            "status",
            mysql.ENUM(
                "received",
                "triaged",
                "duplicate",
                "rejected",
                "converted",
                name="report_status",
            ),
            nullable=False,
            server_default="received",
        ),
        sa.Column(
            "severity",
            mysql.ENUM("low", "medium", "high", "critical", name="report_severity"),
            nullable=False,
            server_default="medium",
        ),
        sa.Column("dedupe_hash", mysql.CHAR(40), nullable=True),
        sa.Column("source_ref", sa.String(190), nullable=True),
        sa.Column("client_created_at", mysql.DATETIME(fsp=0), nullable=True),
        *timestamp_columns(),
        sa.UniqueConstraint("public_code", name="uq_reports_public_code"),
        **TABLE_OPTS,
    )
    op.create_index("idx_reports_status_created", "reports", ["status", "created_at"])
    op.create_index("idx_reports_bairro_category", "reports", ["bairro_id", "category"])
    op.create_index("idx_reports_dedupe", "reports", ["dedupe_hash"])
    op.create_index("idx_reports_reporter", "reports", ["reporter_user_id", "created_at"])
    op.create_index("idx_reports_channel_created", "reports", ["channel_id", "created_at"])
    op.create_index("idx_reports_deleted", "reports", ["deleted_at"])

    # ----- tickets --------------------------------------------------------
    op.create_table(
        "tickets",
        UUID_PK(),
        UUID_FK("report_id", "reports.id", nullable=False, ondelete="CASCADE"),
        sa.Column("code", sa.String(16), nullable=False),
        UUID_FK("assigned_to", "users.id", nullable=True, ondelete="SET NULL"),
        sa.Column("assigned_team", sa.String(64), nullable=True),
        sa.Column(
            "priority",
            mysql.ENUM("low", "normal", "high", "urgent", name="ticket_priority"),
            nullable=False,
            server_default="normal",
        ),
        sa.Column(
            "status",
            mysql.ENUM(
                "open",
                "in_progress",
                "blocked",
                "resolved",
                "closed",
                "reopened",
                name="ticket_status",
            ),
            nullable=False,
            server_default="open",
        ),
        sa.Column("sla_due_at", mysql.DATETIME(fsp=0), nullable=True),
        sa.Column("resolved_at", mysql.DATETIME(fsp=0), nullable=True),
        sa.Column("closed_at", mysql.DATETIME(fsp=0), nullable=True),
        sa.Column("resolution_note", sa.Text, nullable=True),
        *timestamp_columns(),
        sa.UniqueConstraint("report_id", name="uq_tickets_report"),
        sa.UniqueConstraint("code", name="uq_tickets_code"),
        **TABLE_OPTS,
    )
    op.create_index("idx_tickets_status_sla", "tickets", ["status", "sla_due_at"])
    op.create_index("idx_tickets_assigned_status", "tickets", ["assigned_to", "status"])
    op.create_index("idx_tickets_team_status", "tickets", ["assigned_team", "status"])
    op.create_index("idx_tickets_deleted", "tickets", ["deleted_at"])

    # ----- notifications --------------------------------------------------
    op.create_table(
        "notifications",
        UUID_PK(),
        UUID_FK("ticket_id", "tickets.id", nullable=True, ondelete="SET NULL"),
        UUID_FK("user_id", "users.id", nullable=False, ondelete="RESTRICT"),
        UUID_FK("channel_id", "channels.id", nullable=False, ondelete="RESTRICT"),
        sa.Column("template_code", sa.String(64), nullable=False),
        sa.Column("payload_json", mysql.JSON, nullable=False),
        sa.Column(
            "status",
            mysql.ENUM(
                "queued",
                "sending",
                "sent",
                "failed",
                "dead",
                name="notification_status",
            ),
            nullable=False,
            server_default="queued",
        ),
        sa.Column("attempts", mysql.SMALLINT(unsigned=True), nullable=False, server_default=sa.text("0")),
        sa.Column("last_error", sa.String(500), nullable=True),
        sa.Column("sent_at", mysql.DATETIME(fsp=0), nullable=True),
        *timestamp_columns(),
        **TABLE_OPTS,
    )
    op.create_index("idx_notifications_status_created", "notifications", ["status", "created_at"])
    op.create_index("idx_notifications_user_created", "notifications", ["user_id", "created_at"])
    op.create_index("idx_notifications_channel_status", "notifications", ["channel_id", "status"])
    op.create_index("idx_notifications_ticket", "notifications", ["ticket_id"])

    # ----- analytics_events ----------------------------------------------
    op.create_table(
        "analytics_events",
        UUID_PK(),
        sa.Column("event_type", sa.String(64), nullable=False),
        UUID_FK("actor_user_id", "users.id", nullable=True, ondelete="SET NULL"),
        sa.Column("entity_type", sa.String(40), nullable=True),
        sa.Column("entity_id", mysql.CHAR(36), nullable=True),
        UUID_FK("bairro_id", "bairros.id", nullable=True, ondelete="SET NULL"),
        UUID_FK("channel_id", "channels.id", nullable=True, ondelete="SET NULL"),
        sa.Column("properties_json", mysql.JSON, nullable=True),
        sa.Column("occurred_at", mysql.DATETIME(fsp=0), nullable=False),
        *timestamp_columns(),
        **TABLE_OPTS,
    )
    op.create_index("idx_analytics_type_time", "analytics_events", ["event_type", "occurred_at"])
    op.create_index("idx_analytics_entity", "analytics_events", ["entity_type", "entity_id"])
    op.create_index("idx_analytics_bairro_time", "analytics_events", ["bairro_id", "occurred_at"])
    op.create_index("idx_analytics_channel_time", "analytics_events", ["channel_id", "occurred_at"])

    # ----- audit_log (immutable) -----------------------------------------
    op.create_table(
        "audit_log",
        UUID_PK(),
        UUID_FK("actor_user_id", "users.id", nullable=True, ondelete="SET NULL"),
        sa.Column("actor_ip", sa.String(45), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("entity_type", sa.String(40), nullable=True),
        sa.Column("entity_id", mysql.CHAR(36), nullable=True),
        sa.Column("before_json", mysql.JSON, nullable=True),
        sa.Column("after_json", mysql.JSON, nullable=True),
        sa.Column("request_id", sa.String(64), nullable=True),
        *timestamp_columns(),
        **TABLE_OPTS,
    )
    op.create_index("idx_audit_action_time", "audit_log", ["action", "created_at"])
    op.create_index("idx_audit_entity", "audit_log", ["entity_type", "entity_id"])
    op.create_index("idx_audit_actor_time", "audit_log", ["actor_user_id", "created_at"])
    op.create_index("idx_audit_request", "audit_log", ["request_id"])

    op.execute(
        """
        CREATE TRIGGER trg_audit_log_no_update
        BEFORE UPDATE ON audit_log
        FOR EACH ROW
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_log is append-only';
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_audit_log_no_delete
        BEFORE DELETE ON audit_log
        FOR EACH ROW
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_log is append-only';
        """
    )


# ---------- downgrade ------------------------------------------------------

def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_audit_log_no_delete")
    op.execute("DROP TRIGGER IF EXISTS trg_audit_log_no_update")
    op.drop_table("audit_log")
    op.drop_table("analytics_events")
    op.drop_table("notifications")
    op.drop_table("tickets")
    op.drop_table("reports")
    op.drop_table("users")
    op.drop_table("channels")
    op.drop_table("bairros")
