"""seed reference data

Inserts reference rows that the application assumes exist on first boot:

  - 6 input channels (whatsapp, messenger, sms, ussd, web, mobile)
  - 5 bairros do município de Mulenvos:
        Mulenvos de Baixo, Mulenvos de Cima, Caop A, Caop B, Bita Tanque

UUIDs are deterministic (uuid5 over a fixed namespace) so re-running the
seed in a fresh environment yields stable IDs that can be referenced from
fixtures, tests and other migrations.

Revision ID: 0002_seed_reference_data
Revises: 0001_initial
Create Date: 2026-05-09
"""
from __future__ import annotations

import json
import uuid

import sqlalchemy as sa
from alembic import op

revision = "0002_seed_reference_data"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


NS = uuid.UUID("8b1f1a8e-0000-5000-8000-00000000ab1a")


def _uid(kind: str, code: str) -> str:
    return str(uuid.uuid5(NS, f"opina:{kind}:{code}"))


CHANNELS = [
    # (code, name, type)
    ("whatsapp",  "WhatsApp Cloud",      "messaging"),
    ("messenger", "Facebook Messenger",  "messaging"),
    ("sms",       "SMS (Africa's Talking)", "messaging"),
    ("ussd",      "USSD (*123#)",        "voice"),
    ("web",       "Portal Web",          "web"),
    ("mobile",    "App Móvel OP1NA1",    "mobile"),
]

BAIRROS = [
    # (code, name, lat, lng)
    ("mulenvos-baixo", "Mulenvos de Baixo", -8.9512, 13.3689),
    ("mulenvos-cima",  "Mulenvos de Cima",  -8.9437, 13.3754),
    ("caop-a",         "Caop A",            -8.9601, 13.3812),
    ("caop-b",         "Caop B",            -8.9658, 13.3877),
    ("bita-tanque",    "Bita Tanque",       -8.9789, 13.3925),
]


def upgrade() -> None:
    bind = op.get_bind()

    channels_tbl = sa.table(
        "channels",
        sa.column("id", sa.String),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("type", sa.String),
        sa.column("is_active", sa.Integer),
        sa.column("config_json", sa.JSON),
    )
    bind.execute(
        channels_tbl.insert(),
        [
            {
                "id": _uid("channel", code),
                "code": code,
                "name": name,
                "type": ctype,
                "is_active": 1,
                "config_json": json.dumps({}),
            }
            for code, name, ctype in CHANNELS
        ],
    )

    bairros_tbl = sa.table(
        "bairros",
        sa.column("id", sa.String),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("municipality", sa.String),
        sa.column("centroid_lat", sa.Numeric),
        sa.column("centroid_lng", sa.Numeric),
        sa.column("is_active", sa.Integer),
    )
    bind.execute(
        bairros_tbl.insert(),
        [
            {
                "id": _uid("bairro", code),
                "code": code,
                "name": name,
                "municipality": "Mulenvos",
                "centroid_lat": lat,
                "centroid_lng": lng,
                "is_active": 1,
            }
            for code, name, lat, lng in BAIRROS
        ],
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("DELETE FROM bairros WHERE code IN :codes").bindparams(
            sa.bindparam("codes", expanding=True)
        ),
        {"codes": [c for c, *_ in BAIRROS]},
    )
    bind.execute(
        sa.text("DELETE FROM channels WHERE code IN :codes").bindparams(
            sa.bindparam("codes", expanding=True)
        ),
        {"codes": [c for c, *_ in CHANNELS]},
    )
