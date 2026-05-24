"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Search, Filter, Download, Lock, Eye,
  Activity, Cpu, HardDrive, Database, CheckCircle2,
  AlertTriangle, XCircle, Clock, RefreshCw, Play,
  ChevronDown, ChevronRight, FileText, Trash2, Info,
  Server, Wifi, Calendar, Hash, AlertOctagon,
} from "lucide-react";
import { listAdminAuditLog } from "@/lib/api";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────
type Severity = "INFO" | "WARN" | "CRITICAL";
type BackupStatus = "Concluído" | "Falhou" | "Em curso";
type ServiceStatus = "online" | "offline" | "degradado";

interface AuditEntry {
  id: string | number; ts: string; actor: string; ip: string;
  action: string; resource: string; severity: Severity;
  before: string; after: string; expanded: boolean;
}
interface ServiceRow {
  name: string; status: ServiceStatus; latencyMs: number; uptime: string; port: number;
}
interface BackupRow {
  id: number; ts: string; size: string; duration: string;
  status: BackupStatus; hash: string; verified: boolean;
}
interface GdprCategory {
  field: string; description: string; retentionYears: number; encrypted: boolean; count: number;
}
interface GdprRequest {
  id: number; name: string; nif: string; requestedAt: string; deadline: string; status: "Pendente" | "Em processamento" | "Concluído";
}

// ─── Seed data ────────────────────────────────────────────────────
const AUDIT_SEED: AuditEntry[] = [
  { id:1,  ts:"09/05/2025 09:12:04", actor:"c.santos@mulenvos.gv.ao",  ip:"196.12.45.78",  action:"USER_UPDATE",    resource:"user:id=7",      severity:"WARN",     before:'{"status":"Activo"}',     after:'{"status":"Suspenso"}',    expanded:false },
  { id:2,  ts:"09/05/2025 08:55:31", actor:"c.santos@mulenvos.gv.ao",  ip:"196.12.45.78",  action:"AUTH_LOGIN",     resource:"session",        severity:"INFO",     before:"",                        after:'{"2fa":"ok"}',             expanded:false },
  { id:3,  ts:"09/05/2025 08:42:17", actor:"m.lopes@mulenvos.gv.ao",   ip:"41.223.10.9",   action:"CSV_EXPORT",     resource:"reports",        severity:"INFO",     before:"",                        after:'{"rows":342}',             expanded:false },
  { id:4,  ts:"09/05/2025 07:30:00", actor:"system",                   ip:"127.0.0.1",     action:"BACKUP_RUN",     resource:"mysql:op1na1_db", severity:"INFO",     before:"",                        after:'{"size":"1.2GB","hash":"a3f2..."}', expanded:false },
  { id:5,  ts:"08/05/2025 23:11:55", actor:"c.santos@mulenvos.gv.ao",  ip:"196.12.45.78",  action:"SLA_UPDATE",     resource:"sla:seguranca",  severity:"WARN",     before:'{"maxHours":4}',          after:'{"maxHours":2}',           expanded:false },
  { id:6,  ts:"08/05/2025 22:45:02", actor:"system",                   ip:"127.0.0.1",     action:"HASH_VERIFY",    resource:"backup:20250508", severity:"INFO",     before:"",                        after:'{"ok":true}',              expanded:false },
  { id:7,  ts:"08/05/2025 18:20:43", actor:"v.melo@mulenvos.gv.ao",    ip:"41.222.50.3",   action:"REPORT_DELETE",  resource:"report:id=1043", severity:"CRITICAL", before:'{"status":"PENDENTE"}',   after:'{"deleted":true}',         expanded:false },
  { id:8,  ts:"08/05/2025 16:05:11", actor:"c.santos@mulenvos.gv.ao",  ip:"196.12.45.78",  action:"CHANNEL_CONFIG", resource:"channel:whatsapp",severity:"WARN",    before:'{"token":"EAAB...old"}',  after:'{"token":"EAAB...new"}',   expanded:false },
  { id:9,  ts:"08/05/2025 14:30:00", actor:"system",                   ip:"127.0.0.1",     action:"BACKUP_RUN",     resource:"mysql:op1na1_db", severity:"INFO",     before:"",                        after:'{"size":"1.19GB","hash":"c8d1..."}', expanded:false },
  { id:10, ts:"08/05/2025 11:55:07", actor:"m.lopes@mulenvos.gv.ao",   ip:"41.223.10.9",   action:"USER_CREATE",    resource:"user:id=21",     severity:"INFO",     before:"",                        after:'{"profile":"Técnico","bairro":"KM 9-B"}', expanded:false },
  { id:11, ts:"08/05/2025 09:01:33", actor:"a.dias@mulenvos.gv.ao",    ip:"196.1.100.22",  action:"AUTH_LOGIN",     resource:"session",        severity:"INFO",     before:"",                        after:'{"2fa":"ok"}',             expanded:false },
  { id:12, ts:"07/05/2025 23:58:02", actor:"system",                   ip:"127.0.0.1",     action:"BACKUP_RUN",     resource:"mysql:op1na1_db", severity:"INFO",     before:"",                        after:'{"size":"1.18GB","hash":"7e4a..."}', expanded:false },
  { id:13, ts:"07/05/2025 20:14:55", actor:"c.santos@mulenvos.gv.ao",  ip:"196.12.45.78",  action:"GDPR_DELETE",    resource:"user:id=13",     severity:"CRITICAL", before:'{"name":"José A.Q.","nif":"001098765LA"}', after:'{"anonymised":true}', expanded:false },
  { id:14, ts:"07/05/2025 17:33:21", actor:"v.melo@mulenvos.gv.ao",    ip:"41.222.50.3",   action:"USER_SUSPEND",   resource:"user:id=19",     severity:"WARN",     before:'{"status":"Activo"}',    after:'{"status":"Suspenso"}',    expanded:false },
  { id:15, ts:"07/05/2025 15:00:00", actor:"system",                   ip:"127.0.0.1",     action:"HASH_VERIFY",    resource:"backup:20250507", severity:"WARN",     before:'{"expected":"9f3c..."}', after:'{"got":"9f3c...","match":true}', expanded:false },
  { id:16, ts:"07/05/2025 12:05:44", actor:"m.lopes@mulenvos.gv.ao",   ip:"41.223.10.9",   action:"SLA_UPDATE",     resource:"sla:educacao",   severity:"INFO",     before:'{"maxHours":96}',        after:'{"maxHours":72}',          expanded:false },
  { id:17, ts:"06/05/2025 23:59:58", actor:"system",                   ip:"127.0.0.1",     action:"BACKUP_RUN",     resource:"mysql:op1na1_db", severity:"INFO",     before:"",                        after:'{"size":"1.17GB"}',        expanded:false },
  { id:18, ts:"06/05/2025 11:22:09", actor:"c.santos@mulenvos.gv.ao",  ip:"196.12.45.78",  action:"AUTH_FAIL",      resource:"session",        severity:"CRITICAL", before:"",                        after:'{"reason":"wrong_otp","attempts":3}', expanded:false },
  { id:19, ts:"05/05/2025 23:59:55", actor:"system",                   ip:"127.0.0.1",     action:"BACKUP_RUN",     resource:"mysql:op1na1_db", severity:"INFO",     before:"",                        after:'{"size":"1.15GB"}',        expanded:false },
  { id:20, ts:"05/05/2025 09:00:12", actor:"a.dias@mulenvos.gv.ao",    ip:"196.1.100.22",  action:"CSV_EXPORT",     resource:"users",          severity:"INFO",     before:"",                        after:'{"rows":20}',              expanded:false },
];

const BACKUPS_SEED: BackupRow[] = [
  { id:1,  ts:"09/05/2025 02:00:04", size:"1.21 GB", duration:"4m 12s", status:"Concluído", hash:"a3f2b9d17e8c4051f6920d3e5ab71c88", verified:true  },
  { id:2,  ts:"08/05/2025 02:00:03", size:"1.19 GB", duration:"4m 05s", status:"Concluído", hash:"c8d14f3a9b2e0675c1843d7f6e52a019", verified:true  },
  { id:3,  ts:"07/05/2025 02:00:07", size:"1.18 GB", duration:"4m 18s", status:"Concluído", hash:"9f3c28e41a7d50b6f8123c9e07d4b265", verified:true  },
  { id:4,  ts:"06/05/2025 02:00:02", size:"1.17 GB", duration:"3m 59s", status:"Concluído", hash:"e7b5a0c22f9d83471e605b14c380d79a", verified:true  },
  { id:5,  ts:"05/05/2025 02:00:05", size:"1.15 GB", duration:"4m 01s", status:"Concluído", hash:"2d6f9a4c1e08b37520d91f4e83c5b6a0", verified:true  },
  { id:6,  ts:"04/05/2025 02:00:09", size:"1.14 GB", duration:"4m 22s", status:"Concluído", hash:"f4108d3b7e95c24680a12f5d9b376e81", verified:true  },
  { id:7,  ts:"03/05/2025 02:00:11", size:"1.12 GB", duration:"4m 47s", status:"Falhou",    hash:"",                                verified:false },
  { id:8,  ts:"02/05/2025 02:00:03", size:"1.11 GB", duration:"3m 55s", status:"Concluído", hash:"1c5e7a9f2d4b80736c1920e4f5d8b3a7", verified:true  },
  { id:9,  ts:"01/05/2025 02:00:04", size:"1.10 GB", duration:"4m 08s", status:"Concluído", hash:"8b2a4f1c9e70d35286c4017f5e93b2d6", verified:true  },
  { id:10, ts:"30/04/2025 02:00:02", size:"1.09 GB", duration:"4m 02s", status:"Concluído", hash:"3d9e6c2a1f04b87530d821f4e96c5a70", verified:true  },
];

const GDPR_CATEGORIES: GdprCategory[] = [
  { field:"Nome completo",    description:"Identificação do cidadão",            retentionYears:3, encrypted:false, count:882014 },
  { field:"NIF",              description:"Número de Identificação Fiscal",       retentionYears:5, encrypted:true,  count:12043  },
  { field:"Email",            description:"Contacto electrónico",                retentionYears:3, encrypted:false, count:8721   },
  { field:"Telefone",         description:"Contacto telefónico (WhatsApp/SMS)",  retentionYears:3, encrypted:false, count:9104   },
  { field:"Endereço IP",      description:"Log de acesso e auditoria",           retentionYears:1, encrypted:false, count:41230  },
  { field:"Geolocalização",   description:"Bairro/coordenadas da ocorrência",    retentionYears:5, encrypted:false, count:34812  },
  { field:"Histórico pedidos",description:"Participação cívica e ocorrências",   retentionYears:5, encrypted:false, count:34812  },
  { field:"Fotografia",       description:"Evidência fotográfica de ocorrências",retentionYears:5, encrypted:true,  count:7203   },
];

const GDPR_REQUESTS: GdprRequest[] = [
  { id:1, name:"José António Q.", nif:"001098765LA", requestedAt:"01/05/2025", deadline:"15/05/2025", status:"Em processamento" },
  { id:2, name:"Francisco K. B.", nif:"002345678LA", requestedAt:"05/05/2025", deadline:"19/05/2025", status:"Pendente"         },
  { id:3, name:"Albino N. M.",    nif:"005901234LA", requestedAt:"07/05/2025", deadline:"21/05/2025", status:"Pendente"         },
];

const SERVICES_INIT: ServiceRow[] = [
  { name:"FastAPI (op1na1)",  status:"online",   latencyMs:142, uptime:"99,97%", port:8000 },
  { name:"MySQL 8.0",         status:"online",   latencyMs:3,   uptime:"99,99%", port:3306 },
  { name:"Redis 7 (cache)",   status:"online",   latencyMs:1,   uptime:"100%",   port:6379 },
  { name:"APScheduler",       status:"online",   latencyMs:0,   uptime:"99,95%", port:0    },
  { name:"Nginx 1.24",        status:"online",   latencyMs:12,  uptime:"100%",   port:443  },
  { name:"Celery Worker",     status:"degradado",latencyMs:890, uptime:"97,2%",  port:0    },
];

// ─── Code snippets ────────────────────────────────────────────────
const BACKUP_SCRIPT = `#!/bin/bash
# /opt/op1na1/scripts/backup.sh — executado pelo APScheduler diariamente às 02h00
set -euo pipefail
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/op1na1/backups"
DB_NAME="op1na1_db"
BACKUP_FILE="\${BACKUP_DIR}/op1na1_\${TIMESTAMP}.sql.gz"
HASH_FILE="\${BACKUP_FILE}.sha256"
LOG="/var/log/op1na1/backup.log"
RETENTION_DAYS=30

echo "[\$(date -Iseconds)] BACKUP_START db=\${DB_NAME}" >> "\$LOG"

# 1. Dump + compressão atómica
mysqldump --single-transaction --routines --triggers \\
  --user="\$MYSQL_USER" --password="\$MYSQL_PASSWORD" "\$DB_NAME" \\
  | gzip -9 > "\${BACKUP_FILE}.tmp"
mv "\${BACKUP_FILE}.tmp" "\$BACKUP_FILE"

# 2. Hash SHA-256 (imutável — append-only ao ficheiro de hashes)
HASH=\$(sha256sum "\$BACKUP_FILE" | awk '{print \$1}')
echo "\$HASH  \$BACKUP_FILE  \$(date -Iseconds)" >> "\${BACKUP_DIR}/hashes.log"
echo "\$HASH" > "\$HASH_FILE"
echo "[\$(date -Iseconds)] BACKUP_OK file=\$BACKUP_FILE size=\$(du -sh "\$BACKUP_FILE" | cut -f1) hash=\$HASH" >> "\$LOG"

# 3. Retenção: apaga backups com mais de 30 dias
find "\$BACKUP_DIR" -name "*.sql.gz" -mtime +\${RETENTION_DAYS} -delete
echo "[\$(date -Iseconds)] RETENTION_PURGE older_than=\${RETENTION_DAYS}d" >> "\$LOG"`;

const SCHEDULER_CODE = `# backup_scheduler.py — APScheduler job registado no startup FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import subprocess, hashlib, structlog

log = structlog.get_logger()

scheduler = AsyncIOScheduler(timezone="Africa/Luanda")

@scheduler.scheduled_job(CronTrigger(hour=2, minute=0), id="daily_backup")
async def run_daily_backup():
    log.info("backup.start")
    result = subprocess.run(
        ["/opt/op1na1/scripts/backup.sh"],
        capture_output=True, text=True, timeout=600
    )
    if result.returncode != 0:
        log.error("backup.failed", stderr=result.stderr)
        await notify_admin_whatsapp("🚨 Backup FALHOU! Verificar imediatamente.")
        return
    log.info("backup.ok", stdout=result.stdout.strip())

@scheduler.scheduled_job(CronTrigger(hour=3, minute=0), id="hash_verify")
async def verify_backup_hashes():
    """Verifica SHA-256 de todos os backups das últimas 48h."""
    backup_dir = Path("/opt/op1na1/backups")
    for f in sorted(backup_dir.glob("*.sql.gz"), reverse=True)[:2]:
        expected = (f.with_suffix(".sql.gz.sha256")).read_text().strip()
        actual   = hashlib.sha256(f.read_bytes()).hexdigest()
        ok       = expected == actual
        log.info("hash.verify", file=f.name, ok=ok)
        await AuditLog.append(action="HASH_VERIFY", resource=f.name,
                               after={"match": ok, "hash": actual[:8]})
        if not ok:
            log.critical("hash.MISMATCH", file=f.name)
            await notify_admin_whatsapp(f"🚨 CORRUPÇÃO detectada em {f.name}!")`;

const AUDIT_MODEL = `# models/audit_log.py — tabela append-only (sem UPDATE, sem DELETE)
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum
from sqlalchemy.orm import declared_attr
from datetime import datetime, timezone
import enum

class Severity(str, enum.Enum):
    INFO     = "INFO"
    WARN     = "WARN"
    CRITICAL = "CRITICAL"

class AuditLog(Base):
    __tablename__ = "audit_log"
    # IMPORTANTE: nenhuma migration pode adicionar UPDATE ou DELETE nesta tabela
    # Trigger MySQL garante imutabilidade:
    #   CREATE TRIGGER prevent_audit_update BEFORE UPDATE ON audit_log
    #   FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log is immutable';

    id         = Column(Integer, primary_key=True, autoincrement=True)
    ts         = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    actor      = Column(String(120), nullable=False)  # email do utilizador ou "system"
    ip_address = Column(String(45), nullable=True)    # IPv4 ou IPv6
    action     = Column(String(60), nullable=False)   # AUTH_LOGIN, USER_CREATE, etc.
    resource   = Column(String(120), nullable=False)  # user:id=7, report:id=1043
    severity   = Column(Enum(Severity), default=Severity.INFO, nullable=False)
    before_val = Column(Text, nullable=True)          # JSON do estado anterior
    after_val  = Column(Text, nullable=True)          # JSON do estado posterior

    @classmethod
    async def append(cls, *, action, resource, severity=Severity.INFO,
                     before=None, after=None, actor="system", ip=None, session):
        entry = cls(actor=actor, ip_address=ip, action=action, resource=resource,
                    severity=severity, before_val=str(before), after_val=str(after))
        session.add(entry)
        await session.flush()  # nunca commit parcial — entrar em transacção do caller`;

// ─── Style maps ───────────────────────────────────────────────────
const SEV_STYLE: Record<Severity, string> = {
  INFO:     "bg-blue-50  dark:bg-blue-900/20  text-blue-700  dark:text-blue-400  border-blue-200  dark:border-blue-800",
  WARN:     "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  CRITICAL: "bg-red-50   dark:bg-red-900/20   text-red-700   dark:text-red-400   border-red-200   dark:border-red-800",
};
const SVC_DOT: Record<ServiceStatus, string> = {
  online:   "bg-green-500", offline: "bg-zinc-400", degradado: "bg-amber-400",
};
const BACKUP_STYLE: Record<BackupStatus, string> = {
  "Concluído": "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  "Falhou":    "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  "Em curso":  "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
};
const GDPR_STATUS_STYLE: Record<GdprRequest["status"], string> = {
  "Pendente":          "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  "Em processamento":  "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  "Concluído":         "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
};

// ─── Helpers ──────────────────────────────────────────────────────
function gauge(pct: number, color: string) {
  return (
    <div className="relative w-20 h-20">
      <svg aria-hidden="true" viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3.2" className="text-secondary dark:text-zinc-700" />
        <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.2"
          stroke={color} strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-foreground">{Math.round(pct)}%</span>
    </div>
  );
}

function ApiLatencyChart({ data }: { data: { t: string; ms: number }[] }) {
  const W = 460; const H = 180;
  const pad = { top: 4, right: 44, bottom: 4, left: 36 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const maxMs = 2200;
  const xScale = (i: number) => pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (ms: number) => pad.top + (1 - ms / maxMs) * chartH;
  const points = data.map((d, i) => `${xScale(i).toFixed(1)},${yScale(d.ms).toFixed(1)}`).join(" ");
  const yTicks = [0, 500, 1000, 1500, 2000];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }} aria-hidden="true">
      {yTicks.map(v => (
        <g key={v}>
          <line x1={pad.left} y1={yScale(v)} x2={W - pad.right} y2={yScale(v)}
            stroke="#374151" strokeOpacity={0.35} strokeDasharray="3 3" />
          <text x={pad.left - 4} y={yScale(v)} textAnchor="end" dominantBaseline="middle"
            fontSize={9} fill="#6b7280">{v}</text>
        </g>
      ))}
      <line x1={pad.left} y1={yScale(2000)} x2={W - pad.right} y2={yScale(2000)}
        stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
      <text x={W - pad.right + 3} y={yScale(2000)} dominantBaseline="middle" fontSize={9} fill="#ef4444">SLA 2s</text>
      <line x1={pad.left} y1={yScale(500)} x2={W - pad.right} y2={yScale(500)}
        stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
      {data.length > 1 && (
        <polyline points={points} fill="none" stroke="#CC0000" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-400">{language}</span>
        <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="text-xs text-zinc-400 hover:text-white transition-colors">
          {copied ? "copiado ✓" : "copiar"}
        </button>
      </div>
      <pre className="px-4 py-4 text-xs text-zinc-200 font-mono leading-relaxed overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function AuditCenter() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"auditoria"|"saude"|"backups"|"rgpd">("auditoria");

  const [auditLog,    setAuditLog]    = useState<AuditEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditSev,    setAuditSev]    = useState<Severity|"">("");
  const [auditAction, setAuditAction] = useState("");
  const [auditPage,   setAuditPage]   = useState(1);
  const AUDIT_PER_PAGE = 8;

  useEffect(() => {
    if (tab !== "auditoria") return;
    listAdminAuditLog().then(res => {
      if (!res.items) return;
      const mapped = res.items.map((r): AuditEntry => ({
        id: r.id,
        ts: new Date(r.createdAt).toLocaleString("pt-AO", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" }).replace(",", ""),
        actor: r.actorEmail || r.actorName || "system",
        ip: r.ipAddress || "—",
        action: r.action,
        resource: `${r.entityType}:${r.entityId}`,
        severity: "INFO",
        before: "",
        after: r.payload ? JSON.stringify(r.payload) : "",
        expanded: false
      }));
      setAuditLog([...mapped, ...AUDIT_SEED]);
    }).catch(() => setAuditLog(AUDIT_SEED));
  }, [tab]);

  // ── System health state ──────────────────────────────────────────
  const [cpu,      setCpu]      = useState(34);
  const [ram,      setRam]      = useState(2.14);
  const RAM_TOTAL = 8;
  const DISK_USED = 47.2;
  const DISK_TOTAL = 200;
  const [services, setServices] = useState<ServiceRow[]>(SERVICES_INIT);
  const [apiSamples, setApiSamples] = useState<{ t: string; ms: number }[]>(() => {
    const now = new Date();
    return Array.from({ length: 20 }, (_, i) => ({
      t: new Date(now.getTime() - (19 - i) * 2000).toLocaleTimeString("pt-AO", { hour:"2-digit", minute:"2-digit", second:"2-digit" }),
      ms: Math.round(80 + Math.random() * 180),
    }));
  });
  const [uptime, setUptime] = useState(0);

  // ── Backup state ─────────────────────────────────────────────────
  const [backups,   setBackups]   = useState<BackupRow[]>(BACKUPS_SEED);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [runningBk, setRunningBk] = useState(false);
  const [showSched, setShowSched] = useState(false);
  const [showModel, setShowModel] = useState(false);

  // ── GDPR state ───────────────────────────────────────────────────
  const [gdprReqs,   setGdprReqs]   = useState<GdprRequest[]>(GDPR_REQUESTS);
  const [processing, setProcessing] = useState<number | null>(null);

  // ── Real-time simulation ─────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCpu(p => Math.max(5, Math.min(92, p + (Math.random() - 0.46) * 9)));
      setRam(p => Math.max(0.8, Math.min(7.2, p + (Math.random() - 0.5) * 0.08)));
      setUptime(p => p + 2);
      setApiSamples(p => {
        const now = new Date().toLocaleTimeString("pt-AO", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
        const ms  = Math.round(Math.max(45, Math.min(1950, 142 + (Math.random() - 0.48) * 220)));
        return [...p.slice(-19), { t: now, ms }];
      });
      setServices(p => p.map(s =>
        s.name === "Celery Worker"
          ? { ...s, latencyMs: Math.round(600 + Math.random() * 600) }
          : s.name === "FastAPI (op1na1)"
          ? { ...s, latencyMs: Math.round(100 + Math.random() * 100) }
          : s
      ));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // ── Derived audit ─────────────────────────────────────────────────
  const filteredAudit = auditLog.filter(e => {
    const q = auditSearch.toLowerCase();
    const mQ = !q || e.actor.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.resource.toLowerCase().includes(q) || e.ip.includes(q);
    const mS = !auditSev    || e.severity === auditSev;
    const mA = !auditAction || e.action === auditAction;
    return mQ && mS && mA;
  });
  const totalAuditPages = Math.max(1, Math.ceil(filteredAudit.length / AUDIT_PER_PAGE));
  const pagedAudit = filteredAudit.slice((auditPage - 1) * AUDIT_PER_PAGE, auditPage * AUDIT_PER_PAGE);
  const uniqueActions = [...new Set(auditLog.map(e => e.action))].sort();

  function toggleExpand(id: number) {
    setAuditLog(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
  }

  function exportAuditJSON() {
    const blob = new Blob([JSON.stringify(filteredAudit, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `op1na1_audit_${new Date().toISOString().slice(0,10)}.json`; a.click();
  }

  // ── Backup handlers ───────────────────────────────────────────────
  function runBackupNow() {
    setRunningBk(true);
    setTimeout(() => {
      const ts = new Date().toLocaleString("pt-AO", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" }).replace(",","");
      const hash = Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,16);
      const newBk: BackupRow = { id: backups.length + 1, ts, size:"1.21 GB", duration:"4m 09s", status:"Concluído", hash, verified: false };
      setBackups(prev => [newBk, ...prev]);
      setRunningBk(false);
    }, 4000);
  }

  function verifyHash(id: number) {
    setVerifying(id);
    setTimeout(() => {
      setBackups(prev => prev.map(b => b.id === id ? { ...b, verified: true } : b));
      setVerifying(null);
    }, 2000);
  }

  // ── GDPR handlers ─────────────────────────────────────────────────
  function processRequest(id: number) {
    setProcessing(id);
    setTimeout(() => {
      setGdprReqs(prev => prev.map(r => r.id === id ? { ...r, status: "Em processamento" } : r));
      setProcessing(null);
      const req = gdprReqs.find(r => r.id === id)!;
      const entry: AuditEntry = {
        id: auditLog.length + 1,
        ts: new Date().toLocaleString("pt-AO").replace(",",""),
        actor: "c.santos@mulenvos.gv.ao", ip: "196.12.45.78",
        action: "GDPR_PROCESS", resource: `gdpr_request:id=${id}`,
        severity: "CRITICAL", before: '{"status":"Pendente"}', after: '{"status":"Em processamento"}', expanded: false,
      };
      setAuditLog(prev => [entry, ...prev]);
    }, 1500);
  }

  const formatUptime = (s: number) => `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`;
  const avgMs = Math.round(apiSamples.slice(-10).reduce((a, b) => a + b.ms, 0) / 10);
  const p95Ms = Math.round(apiSamples.slice(-20).map(s => s.ms).sort((a,b)=>a-b)[Math.floor(0.95*20)]);

  const TABS = [
    { id:"auditoria", label:"Log de Auditoria",      icon: ShieldCheck },
    { id:"saude",     label:"Saúde do Sistema",      icon: Activity },
    { id:"backups",   label:"Backups & Integridade", icon: Database },
    { id:"rgpd",      label:"Conformidade RGPD",     icon: FileText },
  ] as const;

  return (
    <main id="main-content" className="flex flex-col gap-4">
      <style>{`
        @media (max-width: 767px) {
          /* Audit log: hide IP (4) and Recurso (6) and lock icon (8) */
          .ac-audit-table th:nth-child(4),
          .ac-audit-table td:nth-child(4),
          .ac-audit-table th:nth-child(6),
          .ac-audit-table td:nth-child(6),
          .ac-audit-table th:nth-child(8),
          .ac-audit-table td:nth-child(8) { display: none !important; }
          /* Append-only notice: hide count on far right */
          .ac-immutable-count { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={20} className="text-primary flex-shrink-0" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Auditoria & Controlo de Integridade</h1>
          <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">ADMIN</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Logs imutáveis append-only · Saúde em tempo real · Backups MySQL diários 02h00 · Conformidade RGPD
        </p>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Secções de auditoria"
        className="flex gap-1 flex-wrap bg-secondary/60 dark:bg-zinc-800/60 p-1 rounded-xl border border-border dark:border-zinc-700 w-fit max-w-full overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              role="tab" aria-selected={tab === t.id}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-card dark:bg-zinc-900 text-foreground shadow-sm border border-border dark:border-zinc-700"
                  : "text-muted-foreground hover:text-foreground")}>
              <Icon size={13} aria-hidden="true" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1 — LOG DE AUDITORIA ── */}
      {tab === "auditoria" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5">
            <Lock size={13} className="text-green-400 flex-shrink-0" />
            <span className="text-xs text-zinc-300">
              <strong className="text-white">Append-only:</strong> logs são imutáveis por trigger MySQL + WAL do filesystem. Nenhum utilizador, incluindo Admin, pode editar ou apagar entradas.
            </span>
            <span className="ac-immutable-count ml-auto text-xs font-mono text-zinc-500">{auditLog.length} entradas totais</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl px-4 py-3">
            <Filter size={13} className="text-muted-foreground" aria-hidden="true" />
            <div className="relative flex-1 min-w-44">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input value={auditSearch} onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }}
                placeholder="Actor, acção, recurso, IP…" aria-label="Pesquisar registos de auditoria"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={auditSev} onChange={e => { setAuditSev(e.target.value as Severity|""); setAuditPage(1); }}
              aria-label="Filtrar por severidade"
              className="py-1.5 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none cursor-pointer">
              <option value="">Todas severidades</option>
              {(["INFO","WARN","CRITICAL"] as Severity[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={auditAction} onChange={e => { setAuditAction(e.target.value); setAuditPage(1); }}
              aria-label="Filtrar por acção"
              className="py-1.5 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none cursor-pointer">
              <option value="">Todas acções</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={exportAuditJSON}
              className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              <Download size={12} /> JSON
            </button>
          </div>

          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table aria-label="Log de auditoria" className="ac-audit-table w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 dark:bg-zinc-800/60">
                    {["","Timestamp","Actor","IP","Acção","Recurso","Sev.",""].map((h, i) => (
                      <th key={i} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-zinc-800">
                  {pagedAudit.map(e => (
                    <Fragment key={e.id}>
                      <tr className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => toggleExpand(Number(e.id))}>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {e.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{e.ts}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-foreground max-w-32 truncate">{e.actor}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{e.ip}</td>
                        <td className="px-3 py-2.5">
                          <code className="text-xs bg-secondary dark:bg-zinc-700 px-1.5 py-0.5 rounded font-mono">{e.action}</code>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono max-w-28 truncate">{e.resource}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", SEV_STYLE[e.severity])}>
                            {e.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span aria-label="Imutável"><Lock size={11} className="text-zinc-400" aria-hidden="true" /></span>
                        </td>
                      </tr>
                      {e.expanded && (e.before || e.after) && (
                        <tr className="bg-secondary/30 dark:bg-zinc-800/40">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="grid grid-cols-2 gap-3">
                              {e.before && (
                                <div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Antes</p>
                                  <pre className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg px-3 py-2 font-mono overflow-x-auto">{e.before}</pre>
                                </div>
                              )}
                              {e.after && (
                                <div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Depois</p>
                                  <pre className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg px-3 py-2 font-mono overflow-x-auto">{e.after}</pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-zinc-800 bg-secondary/20">
              <p className="text-xs text-muted-foreground">
                {Math.min((auditPage-1)*AUDIT_PER_PAGE+1, filteredAudit.length)}–{Math.min(auditPage*AUDIT_PER_PAGE, filteredAudit.length)} de {filteredAudit.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setAuditPage(p => Math.max(1, p-1))} disabled={auditPage===1}
                  className="px-2 py-1 rounded border border-border text-xs hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                {Array.from({length: totalAuditPages},(_,i)=>i+1).map(p => (
                  <button key={p} onClick={() => setAuditPage(p)}
                    className={cn("w-7 h-7 rounded text-xs font-semibold", p===auditPage ? "bg-primary text-white" : "border border-border hover:bg-secondary text-muted-foreground")}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setAuditPage(p => Math.min(totalAuditPages, p+1))} disabled={auditPage===totalAuditPages}
                  className="px-2 py-1 rounded border border-border text-xs hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">›</button>
              </div>
            </div>
          </div>

          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground py-1 select-none">
              <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              Implementação — SQLAlchemy Model (append-only)
            </summary>
            <div className="mt-2"><CodeBlock code={AUDIT_MODEL} language="python" /></div>
          </details>
        </div>
      )}

      {/* ── TAB 2 — SAÚDE DO SISTEMA ── */}
      {tab === "saude" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"CPU",     value:`${Math.round(cpu)}%`,              color: cpu>80?"text-red-500":cpu>60?"text-amber-500":"text-green-500" },
              { label:"RAM",     value:`${ram.toFixed(1)}/${RAM_TOTAL}GB`, color:"text-blue-500" },
              { label:"Disco",   value:`${DISK_USED}/${DISK_TOTAL}GB`,     color:"text-purple-500" },
              { label:"API avg", value:`${avgMs}ms`,                       color: avgMs>2000?"text-red-500":avgMs>500?"text-amber-500":"text-green-500" },
            ].map(k => (
              <div key={k.label} className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className={cn("text-xl font-extrabold", k.color)}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Cpu size={15} className="text-primary" /> Recursos do Servidor
              </h3>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  {gauge(cpu, cpu>80?"#ef4444":cpu>60?"#f59e0b":"#22c55e")}
                  <p className="text-xs text-muted-foreground mt-1">CPU</p>
                  <p className="text-[10px] text-muted-foreground">4 cores · AMD EPYC</p>
                </div>
                <div className="text-center">
                  {gauge((ram/RAM_TOTAL)*100, "#3b82f6")}
                  <p className="text-xs text-muted-foreground mt-1">RAM</p>
                  <p className="text-[10px] text-muted-foreground">{ram.toFixed(1)} GB / {RAM_TOTAL} GB</p>
                </div>
                <div className="text-center">
                  {gauge((DISK_USED/DISK_TOTAL)*100, "#a855f7")}
                  <p className="text-xs text-muted-foreground mt-1">Disco</p>
                  <p className="text-[10px] text-muted-foreground">{DISK_USED} GB / {DISK_TOTAL} GB</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                Actualização automática a cada 2s
              </div>
            </div>

            <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Activity size={15} className="text-primary" /> Tempo de Resposta API
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">avg <strong className={avgMs>500?"text-amber-500":"text-green-500"}>{avgMs}ms</strong></span>
                  <span className="text-muted-foreground">p95 <strong className={p95Ms>2000?"text-red-500":p95Ms>500?"text-amber-500":"text-green-500"}>{p95Ms}ms</strong></span>
                </div>
              </div>
              <ApiLatencyChart data={apiSamples} />
              <p className="text-[10px] text-muted-foreground text-center mt-1">SLA target &lt; 2.000ms (linha vermelha) · últimas 40s</p>
            </div>
          </div>

          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border dark:border-zinc-700 flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Server size={15} className="text-primary" /> Status dos Serviços</h3>
              <span className="text-xs text-muted-foreground hidden sm:inline">Uptime desde: 10/04/2025 · {formatUptime(uptime + 2592000)} (sessão)</span>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 dark:bg-zinc-800/50 border-b border-border dark:border-zinc-700">
                  {["Serviço","Status","Latência","Uptime","Porta"].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-zinc-800">
                {services.map(s => (
                  <tr key={s.name} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 font-semibold text-foreground">{s.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                          {s.status === "online" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />}
                          {s.status === "degradado" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />}
                          <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", SVC_DOT[s.status])} />
                        </span>
                        <span className={cn("text-xs font-semibold capitalize",
                          s.status==="online"?"text-green-600 dark:text-green-400":
                          s.status==="degradado"?"text-amber-600 dark:text-amber-400":"text-zinc-500"
                        )}>{s.status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {s.latencyMs > 0 ? (
                        <span className={cn("text-xs font-mono font-bold px-1.5 py-0.5 rounded",
                          s.latencyMs<100?"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400":
                          s.latencyMs<500?"bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400":
                                          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        )}>{s.latencyMs}ms</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{s.uptime}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{s.port > 0 ? s.port : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {/* ── TAB 3 — BACKUPS & INTEGRIDADE ── */}
      {tab === "backups" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon:"🕑", label:"Agendamento", value:"Diário às 02h00 WAT", sub:"Africa/Luanda (UTC+1)" },
              { icon:"📦", label:"Retenção",    value:"30 dias",             sub:`${backups.filter(b=>b.status==="Concluído").length} backups válidos` },
              { icon:"🔐", label:"Verificação", value:"SHA-256 + compare",   sub:"Trigger às 03h00 WAT" },
            ].map(c => (
              <div key={c.label} className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="font-bold text-foreground text-sm">{c.value}</p>
                  <p className="text-[10px] text-muted-foreground">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-zinc-700">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Database size={15} className="text-primary" /> Histórico de Backups
              </h3>
              <button onClick={runBackupNow} disabled={runningBk}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  runningBk ? "bg-secondary text-muted-foreground cursor-wait" : "bg-primary text-white hover:bg-primary/90")}>
                {runningBk ? <><RefreshCw size={12} className="animate-spin" /> A correr…</> : <><Play size={12} /> Correr Agora</>}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 dark:bg-zinc-800/60 border-b border-border dark:border-zinc-700">
                    {["Data/Hora","Tamanho","Duração","Status","SHA-256 (truncado)","Integridade"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-zinc-800">
                  {backups.map(b => (
                    <tr key={b.id} className={cn("hover:bg-secondary/20 transition-colors", b.status==="Falhou" && "bg-red-50/30 dark:bg-red-900/10")}>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{b.ts}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground">{b.size}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{b.duration}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", BACKUP_STYLE[b.status])}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {b.hash ? `${b.hash.slice(0,8)}…${b.hash.slice(-6)}` : <span className="text-red-500">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {b.status === "Falhou" ? (
                          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"><XCircle size={12} /> Falhou</span>
                        ) : b.verified ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 size={12} /> OK</span>
                        ) : (
                          <button onClick={() => verifyHash(b.id)} disabled={verifying === b.id}
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60">
                            {verifying===b.id ? <><RefreshCw size={11} className="animate-spin" />A verificar…</> : <><Hash size={11} />Verificar</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <details className="group" open={showSched} onToggle={e => setShowSched((e.target as HTMLDetailsElement).open)}>
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground py-1 select-none">
              <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              Script bash — /opt/op1na1/scripts/backup.sh
            </summary>
            <div className="mt-2"><CodeBlock code={BACKUP_SCRIPT} language="bash" /></div>
          </details>

          <details className="group" open={showModel} onToggle={e => setShowModel((e.target as HTMLDetailsElement).open)}>
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground py-1 select-none">
              <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              APScheduler — backup_scheduler.py
            </summary>
            <div className="mt-2"><CodeBlock code={SCHEDULER_CODE} language="python" /></div>
          </details>
        </div>
      )}

      {/* ── TAB 4 — CONFORMIDADE RGPD ── */}
      {tab === "rgpd" && (
        <div className="space-y-4">
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-5 flex items-center gap-6 flex-wrap">
            <div className="flex-shrink-0">{gauge(94, "#22c55e")}</div>
            <div className="flex-1">
              <p className="text-xl font-extrabold text-foreground mb-1">Índice de Conformidade RGPD: <span className="text-green-600 dark:text-green-400">94%</span></p>
              <p className="text-sm text-muted-foreground">
                Cálculo baseado em: encriptação de campos sensíveis, retenção dentro dos limites legais, registo de acessos,
                pedidos de eliminação processados a tempo, e existência de DPO nomeado.
              </p>
              <div className="flex gap-3 mt-2 flex-wrap">
                {[
                  { label:"Campos encriptados",  ok:true  },
                  { label:"Retenção definida",   ok:true  },
                  { label:"DPO nomeado",         ok:true  },
                  { label:"Eliminações em dia",  ok:false },
                  { label:"Auditoria activa",    ok:true  },
                ].map(c => (
                  <span key={c.label} className={cn("flex items-center gap-1 text-xs font-medium",
                    c.ok ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                    {c.ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border dark:border-zinc-700">
              <h3 className="font-bold text-foreground">Inventário de Dados Pessoais</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Artigo 30.º RGPD — Registo de actividades de tratamento</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 dark:bg-zinc-800/60 border-b border-border dark:border-zinc-700">
                    {["Campo","Finalidade","Retenção","Encriptado","Registos"].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-zinc-800">
                  {GDPR_CATEGORIES.map(g => (
                    <tr key={g.field} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3 font-semibold text-foreground">{g.field}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{g.description}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                          g.retentionYears<=1 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        )}>{g.retentionYears} ano{g.retentionYears>1?"s":""}</span>
                      </td>
                      <td className="px-5 py-3">
                        {g.encrypted
                          ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold"><Lock size={11}/> AES-256</span>
                          : <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye size={11}/> Texto claro</span>}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-muted-foreground">{g.count.toLocaleString("pt")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-zinc-700">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Trash2 size={14} className="text-red-500" /> Pedidos de Eliminação (Direito ao Apagamento)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Art. 17.º RGPD — prazo legal: 30 dias após pedido</p>
              </div>
              {gdprReqs.filter(r=>r.status==="Pendente").length > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
                  <AlertOctagon size={11} /> {gdprReqs.filter(r=>r.status==="Pendente").length} pendente(s)
                </span>
              )}
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 dark:bg-zinc-800/60 border-b border-border dark:border-zinc-700">
                  {["Titular","NIF","Pedido em","Prazo","Status",""].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-zinc-800">
                {gdprReqs.map(r => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 font-semibold text-foreground">{r.name}</td>
                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground">{r.nif}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{r.requestedAt}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        <Clock size={11} /> {r.deadline}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", GDPR_STATUS_STYLE[r.status])}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {r.status === "Pendente" && (
                        <button onClick={() => processRequest(r.id)} disabled={processing===r.id}
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-60">
                          {processing===r.id ? <><RefreshCw size={11} className="animate-spin" />A processar…</> : <>Iniciar processo</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="px-5 py-3 border-t border-border dark:border-zinc-700 bg-secondary/20">
              <p className="text-xs text-muted-foreground">
                <strong>Processo de eliminação:</strong> anonimização de nome/email/telefone (substituídos por hash irreversível) →
                remoção do NIF → manutenção do histórico de ocorrências sem PII → registo de auditoria GDPR_DELETE imutável.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
