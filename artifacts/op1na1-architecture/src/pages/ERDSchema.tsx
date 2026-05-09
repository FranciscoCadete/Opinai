import CodeBlock from "@/components/CodeBlock";

const SQL_SCHEMA = `-- OP1NA1 MySQL Schema v1.0
-- Run: mysql -u root -p op1na1_db < schema.sql

CREATE DATABASE IF NOT EXISTS op1na1_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE op1na1_db;

-- ============================================================
-- TABLE: channels
-- ============================================================
CREATE TABLE channels (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,  -- 'whatsapp','sms','ussd','web','mobile','messenger'
    label       VARCHAR(100) NOT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    config_json JSON,                          -- gateway credentials (encrypted at app level)
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_channels_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(200),
    phone         VARCHAR(20) UNIQUE,          -- E.164 format: +244912345678
    email         VARCHAR(254) UNIQUE,
    password_hash VARCHAR(255),                -- bcrypt, NULL for channel-only users
    role          ENUM('admin','manager','analyst','technician','citizen') NOT NULL DEFAULT 'citizen',
    channel_id    INT UNSIGNED,                -- primary registration channel
    is_verified   TINYINT(1) NOT NULL DEFAULT 0,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    locale        VARCHAR(10) NOT NULL DEFAULT 'pt_AO',
    last_login_at DATETIME,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
    INDEX idx_users_phone (phone),
    INDEX idx_users_email (email),
    INDEX idx_users_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: reports
-- ============================================================
CREATE TABLE reports (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_code  VARCHAR(20) NOT NULL UNIQUE, -- e.g. REP-2025-00001
    user_id         INT UNSIGNED,
    channel_id      INT UNSIGNED NOT NULL,
    category        VARCHAR(100) NOT NULL,        -- 'road','water','electricity','sanitation','other'
    subcategory     VARCHAR(100),
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    address_text    VARCHAR(500),
    bairro          VARCHAR(150),
    media_urls      JSON,                         -- array of local file paths or URLs
    status          ENUM('received','in_review','assigned','in_progress','resolved','closed','rejected')
                    NOT NULL DEFAULT 'received',
    priority        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    raw_payload     JSON,                         -- original channel message for audit
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE RESTRICT,
    INDEX idx_reports_status      (status),
    INDEX idx_reports_created_at  (created_at),
    INDEX idx_reports_bairro      (bairro),
    INDEX idx_reports_ref         (reference_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: tickets
-- ============================================================
CREATE TABLE tickets (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id       INT UNSIGNED NOT NULL,
    assigned_to     INT UNSIGNED,               -- technician user_id
    created_by      INT UNSIGNED NOT NULL,      -- manager user_id
    status          ENUM('open','in_progress','pending_approval','resolved','closed','cancelled')
                    NOT NULL DEFAULT 'open',
    priority        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    due_date        DATE,
    resolution_note TEXT,
    closed_at       DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id)   REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id)   ON DELETE SET NULL,
    FOREIGN KEY (created_by)  REFERENCES users(id)   ON DELETE RESTRICT,
    INDEX idx_tickets_status      (status),
    INDEX idx_tickets_assigned_to (assigned_to),
    INDEX idx_tickets_report_id   (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: ticket_comments
-- ============================================================
CREATE TABLE ticket_comments (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id   INT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED NOT NULL,
    body        TEXT NOT NULL,
    is_internal TINYINT(1) NOT NULL DEFAULT 0,  -- 0=visible to citizen, 1=staff-only
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE RESTRICT,
    INDEX idx_tc_ticket_id (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    channel_id    INT UNSIGNED,                   -- delivery channel
    type          VARCHAR(50) NOT NULL,            -- 'status_update','new_ticket','escalation','broadcast'
    title         VARCHAR(300),
    body          TEXT NOT NULL,
    status        ENUM('pending','sent','delivered','failed','cancelled')
                  NOT NULL DEFAULT 'pending',
    external_id   VARCHAR(255),                   -- gateway message ID for tracking
    error_msg     TEXT,
    scheduled_at  DATETIME,
    sent_at       DATETIME,
    delivered_at  DATETIME,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
    INDEX idx_notif_user_id   (user_id),
    INDEX idx_notif_status    (status),
    INDEX idx_notif_scheduled (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: analytics_events
-- ============================================================
CREATE TABLE analytics_events (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type  VARCHAR(100) NOT NULL,     -- 'report_created','ticket_resolved','user_registered'
    entity_type VARCHAR(50),               -- 'report','ticket','user','notification'
    entity_id   INT UNSIGNED,
    user_id     INT UNSIGNED,
    channel_id  INT UNSIGNED,
    metadata    JSON,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ae_event_type  (event_type),
    INDEX idx_ae_occurred_at (occurred_at),
    INDEX idx_ae_entity      (entity_type, entity_id),
    INDEX idx_ae_channel_id  (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED: channels
-- ============================================================
INSERT INTO channels (name, label) VALUES
('whatsapp',  'WhatsApp Business'),
('sms',       'SMS (Africa\\'s Talking)'),
('ussd',      'USSD (*920#)'),
('web',       'Web Portal'),
('mobile',    'Mobile App'),
('messenger', 'Facebook Messenger');`;

const RELATIONS = [
  { from: "users", to: "channels", via: "channel_id", type: "N:1" },
  { from: "reports", to: "users", via: "user_id", type: "N:1 (nullable)" },
  { from: "reports", to: "channels", via: "channel_id", type: "N:1" },
  { from: "tickets", to: "reports", via: "report_id", type: "N:1 (CASCADE)" },
  { from: "tickets", to: "users (technician)", via: "assigned_to", type: "N:1 (nullable)" },
  { from: "tickets", to: "users (manager)", via: "created_by", type: "N:1" },
  { from: "ticket_comments", to: "tickets", via: "ticket_id", type: "N:1 (CASCADE)" },
  { from: "ticket_comments", to: "users", via: "user_id", type: "N:1" },
  { from: "notifications", to: "users", via: "user_id", type: "N:1 (CASCADE)" },
  { from: "notifications", to: "channels", via: "channel_id", type: "N:1 (nullable)" },
  { from: "analytics_events", to: "users / reports / tickets", via: "entity_id + entity_type", type: "polymorphic" },
];

const TABLES = [
  { name: "channels", cols: "id, name, label, is_active, config_json, created_at, updated_at" },
  { name: "users", cols: "id, full_name, phone, email, password_hash, role, channel_id, is_verified, is_active, locale, last_login_at, created_at, updated_at" },
  { name: "reports", cols: "id, reference_code, user_id, channel_id, category, subcategory, title, description, latitude, longitude, address_text, bairro, media_urls, status, priority, raw_payload, created_at, updated_at" },
  { name: "tickets", cols: "id, report_id, assigned_to, created_by, status, priority, due_date, resolution_note, closed_at, created_at, updated_at" },
  { name: "ticket_comments", cols: "id, ticket_id, user_id, body, is_internal, created_at" },
  { name: "notifications", cols: "id, user_id, channel_id, type, title, body, status, external_id, error_msg, scheduled_at, sent_at, delivered_at, created_at" },
  { name: "analytics_events", cols: "id, event_type, entity_type, entity_id, user_id, channel_id, metadata, occurred_at" },
];

export default function ERDSchema() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          ERD Schema
        </h1>
        <p className="text-muted-foreground">
          MySQL 8.x database schema for OP1NA1. 7 tables, InnoDB engine, utf8mb4 charset.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Entity Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TABLES.map((t) => (
            <div key={t.name} className="bg-secondary/50 border border-border rounded-md p-3">
              <p className="font-mono font-semibold text-sm text-foreground mb-1">{t.name}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.cols}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Foreign Key Relations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-relations">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-foreground">From</th>
                <th className="text-left py-2 pr-4 font-medium text-foreground">To</th>
                <th className="text-left py-2 pr-4 font-medium text-foreground">Column</th>
                <th className="text-left py-2 font-medium text-foreground">Cardinality</th>
              </tr>
            </thead>
            <tbody>
              {RELATIONS.map((r, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 pr-4 font-mono text-xs text-foreground">{r.from}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{r.to}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{r.via}</td>
                  <td className="py-2 text-xs text-muted-foreground">{r.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Full MySQL DDL</h2>
        <CodeBlock code={SQL_SCHEMA} language="sql" copyAllButton={true} />
      </div>
    </div>
  );
}
