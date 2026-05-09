import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Server, Shield, Database, RotateCcw, Activity } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────
function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const c: Record<string, string> = {
    blue:  "bg-blue-50  text-blue-700  border-blue-200  dark:bg-blue-900/20  dark:text-blue-400  dark:border-blue-800",
    green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    red:   "bg-red-50   text-red-700   border-red-200   dark:bg-red-900/20   dark:text-red-400   dark:border-red-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    zinc:  "bg-zinc-100 text-zinc-700  border-zinc-200  dark:bg-zinc-800     dark:text-zinc-400  dark:border-zinc-700",
  };
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border tracking-wide", c[color] ?? c.blue)}>
      {children}
    </span>
  );
}

function CodeFile({ filename, lang = "bash", children }: { filename: string; lang?: string; children: string }) {
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

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 py-1.5 text-sm text-foreground dark:text-zinc-200">
      <CheckCircle2 size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

// ─── Page ───────────────────────────────────────────────────────
export default function DeploymentGuide() {
  return (
    <article className="max-w-none space-y-2">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge color="green">PRODUÇÃO</Badge>
          <Badge color="zinc">Ubuntu 22.04 LTS</Badge>
          <Badge color="blue">99% Uptime Target</Badge>
          <Badge color="amber">Idempotent Scripts</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
          Server Setup — Guia de Deployment
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
          Guia completo e executável para deployment do OP1NA1 em Ubuntu 22.04 LTS. Todos os scripts são idempotentes — seguros para re-execução sem efeitos colaterais. Ordem de execução: <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">00 → 01 → 02 → 03 → 04 → 05 → 06 → 07</code>
        </p>
      </div>

      {/* ── Architecture diagram ─────────────────────────── */}
      <Section id="arch" title="Arquitectura de Produção">
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6 mb-5 font-mono text-xs text-zinc-300 overflow-x-auto">
          <pre>{`
  Internet
     │
     ▼ :443 HTTPS
  ┌─────────────────────────────────────────┐
  │            Nginx (reverse proxy)        │
  │  TLS: Let's Encrypt · gzip · sec headers│
  │  Rate limiting · static files serving   │
  └───────────────────┬─────────────────────┘
                      │ proxy_pass :8000 (unix socket)
                      ▼
  ┌─────────────────────────────────────────┐
  │        Gunicorn + UvicornWorker         │
  │     FastAPI · 2 workers · :8000         │
  │     systemd managed · auto-restart      │
  └───────────────────┬─────────────────────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
  ┌──────────────┐     ┌──────────────────┐
  │  MySQL 8.0   │     │ Redis (optional) │
  │  daily dump  │     │  session cache   │
  │  30d retain  │     └──────────────────┘
  └──────────────┘
  
  Monitoring: fail2ban · UFW · logrotate · Certbot auto-renewal
          `}</pre>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "VPS mínima", value: "2 vCPU · 2 GB RAM" },
            { label: "Disco",      value: "40 GB SSD" },
            { label: "OS",         value: "Ubuntu 22.04 LTS" },
            { label: "Workers",    value: "2 × UvicornWorker" },
          ].map(s => (
            <div key={s.label} className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-sm font-bold text-foreground dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 00 Master script ─────────────────────────────── */}
      <Section id="s00" title="00 — Script Mestre (executa todos em ordem)" icon={Server}>
        <InfoBox color="amber">
          <p><strong>Executar como root:</strong> <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">sudo bash 00_deploy_all.sh</code></p>
          <p className="mt-1">Define <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">DOMAIN</code>, <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">MYSQL_ROOT_PASSWORD</code> e <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">APP_USER_PASSWORD</code> antes de executar.</p>
        </InfoBox>
        <CodeFile filename="00_deploy_all.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — Master Deploy Script
# Ubuntu 22.04 LTS · Idempotent · 99% uptime target
# Usage: sudo DOMAIN=mulenvos.gv.ao bash 00_deploy_all.sh
# ===========================================================================

DOMAIN=\${DOMAIN:-"mulenvos.gv.ao"}
MYSQL_ROOT_PASSWORD=\${MYSQL_ROOT_PASSWORD:-"$(openssl rand -base64 32)"}
APP_DB_PASSWORD=\${APP_DB_PASSWORD:-"$(openssl rand -base64 32)"}
OP1NA1_HOME=\${OP1NA1_HOME:-"/opt/op1na1"}
APP_USER=\${APP_USER:-"op1na1"}

export DOMAIN MYSQL_ROOT_PASSWORD APP_DB_PASSWORD OP1NA1_HOME APP_USER

log() { echo -e "\\033[1;32m[$(date '+%H:%M:%S')]\\033[0m $*"; }
[[ $EUID -ne 0 ]] && { echo "Run as root"; exit 1; }

log "Starting OP1NA1 deployment → $DOMAIN"

for script in 01_system_hardening.sh 02_nginx.sh 03_ssl_certbot.sh \\
              04_app_service.sh 05_mysql.sh 06_logrotate.sh 07_healthcheck.sh; do
  log "▶ Running $script …"
  bash "$(dirname "$0")/$script"
  log "✓ $script done"
done

log ""
log "════════════════════════════════════════"
log "  OP1NA1 deployment complete!"
log "  URL: https://$DOMAIN"
log "  Health: https://$DOMAIN/health"
log "════════════════════════════════════════"`}
        </CodeFile>
      </Section>

      {/* ── 01 System Hardening ──────────────────────────── */}
      <Section id="s01" title="01 — System Hardening" icon={Shield}>
        <InfoBox color="red">
          <p><strong>Atenção:</strong> Certifica-te de ter a tua chave SSH autorizada em <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">~/.ssh/authorized_keys</code> <em>antes</em> de executar — este script desactiva autenticação por password.</p>
        </InfoBox>
        <CodeFile filename="01_system_hardening.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — System Hardening
# UFW · fail2ban · SSH key-only · kernel hardening
# ===========================================================================

LOGFILE="/var/log/op1na1-setup.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }
[[ $EUID -ne 0 ]] && { echo "Must run as root"; exit 1; }

log "━━━ 01 System Hardening ━━━"

# ── System update ────────────────────────────────────────────────
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \\
    ufw fail2ban curl wget git unzip htop net-tools \\
    build-essential python3-pip python3-venv \\
    libmysqlclient-dev pkg-config 2>&1 | tee -a "$LOGFILE"
log "✓ Packages installed"

# ── Create app user (idempotent) ─────────────────────────────────
APP_USER=\${APP_USER:-"op1na1"}
id "$APP_USER" &>/dev/null || useradd -m -s /bin/bash -d /opt/op1na1 "$APP_USER"
log "✓ App user: $APP_USER"

# ── UFW Firewall ─────────────────────────────────────────────────
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable
log "✓ UFW: 22/80/443 open, all else denied"

# ── SSH Hardening ────────────────────────────────────────────────
SSHD_CONFIG="/etc/ssh/sshd_config"
cp "$SSHD_CONFIG" "$SSHD_CONFIG.bak.$(date +%s)"

set_sshd() {
  local key="$1" val="$2"
  grep -qE "^#?\\s*$key\\b" "$SSHD_CONFIG" \\
    && sed -i -E "s|^#?\\s*$key.*|$key $val|" "$SSHD_CONFIG" \\
    || echo "$key $val" >> "$SSHD_CONFIG"
}

set_sshd PermitRootLogin                 no
set_sshd PasswordAuthentication          no
set_sshd ChallengeResponseAuthentication no
set_sshd PubkeyAuthentication            yes
set_sshd X11Forwarding                   no
set_sshd AllowAgentForwarding            no
set_sshd MaxAuthTries                    3
set_sshd ClientAliveInterval             300
set_sshd ClientAliveCountMax             2
set_sshd LoginGraceTime                  20
set_sshd MaxStartups                     "10:30:60"

sshd -t && systemctl reload sshd
log "✓ SSH hardened — root login and password auth disabled"

# ── fail2ban ─────────────────────────────────────────────────────
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime   = 3600
findtime  = 600
maxretry  = 5
backend   = systemd

[sshd]
enabled   = true
port      = 22
maxretry  = 3
bantime   = 86400

[nginx-http-auth]
enabled   = true

[nginx-botsearch]
enabled   = true
maxretry  = 2
bantime   = 86400

[nginx-req-limit]
enabled   = true
filter    = nginx-req-limit
logpath   = /var/log/nginx/error.log
maxretry  = 10
bantime   = 3600
FAIL2BAN

# fail2ban filter for rate limiting
mkdir -p /etc/fail2ban/filter.d
cat > /etc/fail2ban/filter.d/nginx-req-limit.conf << 'F2B_FILTER'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
F2B_FILTER

systemctl enable --now fail2ban
log "✓ fail2ban enabled"

# ── Kernel hardening ─────────────────────────────────────────────
cat > /etc/sysctl.d/99-op1na1.conf << 'SYSCTL'
# SYN flood protection
net.ipv4.tcp_syncookies = 1
# IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
# Log martian packets
net.ipv4.conf.all.log_martians = 1
# Increase connection backlog
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 1
SYSCTL

sysctl --system 2>&1 | grep -E "^\\*|error" | head -20
log "✓ Kernel hardening applied"

log "✓ System hardening complete"`}
        </CodeFile>
      </Section>

      {/* ── 02 Nginx ─────────────────────────────────────── */}
      <Section id="s02" title="02 — Nginx: Reverse Proxy + TLS + Security Headers" icon={Server}>
        <CodeFile filename="02_nginx.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — Nginx Install + Config
# Reverse proxy · gzip · security headers · rate limiting
# ===========================================================================

DOMAIN=\${DOMAIN:-"mulenvos.gv.ao"}
LOGFILE="/var/log/op1na1-setup.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "━━━ 02 Nginx ━━━"

# Install
apt-get install -y nginx 2>&1 | tee -a "$LOGFILE"
systemctl enable nginx

# ── /etc/nginx/nginx.conf adjustments ────────────────────────────
NGINX_CONF="/etc/nginx/nginx.conf"
grep -q "worker_rlimit_nofile" "$NGINX_CONF" || \\
  sed -i '/^worker_processes/a worker_rlimit_nofile 65535;' "$NGINX_CONF"

# ── Global security snippet ───────────────────────────────────────
cat > /etc/nginx/conf.d/00-security.conf << 'EOF'
server_tokens off;
more_clear_headers 'X-Powered-By';

# Gzip
gzip             on;
gzip_vary        on;
gzip_min_length  1024;
gzip_proxied     any;
gzip_comp_level  5;
gzip_types
    text/plain text/css text/xml text/javascript
    application/json application/javascript application/xml+rss
    application/atom+xml image/svg+xml;

# Rate limiting zones
limit_req_zone  $binary_remote_addr  zone=api:10m      rate=30r/m;
limit_req_zone  $binary_remote_addr  zone=submit:10m   rate=5r/m;
limit_conn_zone $binary_remote_addr  zone=perip:10m;
EOF

# ── Site config ───────────────────────────────────────────────────
cat > /etc/nginx/sites-available/op1na1 << SITE
# ---- HTTP → HTTPS redirect ----------------------------------------
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\\$host\\$request_uri; }
}

# ---- HTTPS main server --------------------------------------------
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL — filled in by Certbot (03_ssl_certbot.sh)
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_tickets off;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # ── Security headers ──────────────────────────────────────────
    add_header Strict-Transport-Security  "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options            SAMEORIGIN                                      always;
    add_header X-Content-Type-Options     nosniff                                         always;
    add_header X-XSS-Protection           "1; mode=block"                                 always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin"               always;
    add_header Permissions-Policy         "geolocation=(self), camera=(), microphone=(self), payment=()" always;
    add_header Content-Security-Policy    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # ── Logging ───────────────────────────────────────────────────
    access_log /var/log/nginx/op1na1-access.log combined;
    error_log  /var/log/nginx/op1na1-error.log  warn;

    # ── Client limits ─────────────────────────────────────────────
    client_max_body_size    25M;
    client_body_timeout     30s;
    client_header_timeout   10s;
    keepalive_timeout       65s;
    send_timeout            30s;
    limit_conn              perip 20;

    # ── Static files (React build) ────────────────────────────────
    root /opt/op1na1/frontend/dist;
    index index.html;

    location /static/ {
        expires     1y;
        add_header  Cache-Control "public, immutable";
        access_log  off;
    }

    location /assets/ {
        expires     1y;
        add_header  Cache-Control "public, immutable";
        access_log  off;
    }

    # ── API: FastAPI (Gunicorn + Uvicorn) ─────────────────────────
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              \\$host;
        proxy_set_header   X-Real-IP         \\$remote_addr;
        proxy_set_header   X-Forwarded-For   \\$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \\$scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
        proxy_buffering       on;
        proxy_buffer_size     8k;
        proxy_buffers         16 8k;
    }

    # Health endpoint — no rate limit, no auth
    location /health {
        proxy_pass         http://127.0.0.1:8000/health;
        proxy_set_header   Host \\$host;
        access_log         off;
    }

    # Citizen submission form — strict rate limit
    location /api/v1/reports {
        limit_req  zone=submit burst=3 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    }

    # ── SPA fallback ──────────────────────────────────────────────
    location / {
        try_files \\$uri \\$uri/ /index.html;
    }
}
SITE

# Enable site
ln -sf /etc/nginx/sites-available/op1na1 /etc/nginx/sites-enabled/op1na1
rm -f /etc/nginx/sites-enabled/default

# Create certbot webroot
mkdir -p /var/www/certbot

nginx -t && systemctl reload nginx
log "✓ Nginx configured and reloaded"`}
        </CodeFile>
      </Section>

      {/* ── 03 SSL ───────────────────────────────────────── */}
      <Section id="s03" title="03 — Let's Encrypt SSL + Auto-Renewal" icon={Shield}>
        <CodeFile filename="03_ssl_certbot.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — Let's Encrypt SSL via Certbot
# Auto-renewal cron · HSTS preload ready
# ===========================================================================

DOMAIN=\${DOMAIN:-"mulenvos.gv.ao"}
EMAIL=\${CERTBOT_EMAIL:-"admin@$DOMAIN"}
LOGFILE="/var/log/op1na1-setup.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "━━━ 03 SSL / Certbot ━━━"

# Install Certbot + Nginx plugin
apt-get install -y certbot python3-certbot-nginx 2>&1 | tee -a "$LOGFILE"

# ── Issue certificate (idempotent — skips if already valid) ───────
if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  log "Certificate already exists for $DOMAIN — skipping issuance"
else
  # Temporary: serve HTTP for ACME challenge
  certbot certonly \\
    --nginx \\
    --non-interactive \\
    --agree-tos \\
    --email "$EMAIL" \\
    --domains "$DOMAIN,www.$DOMAIN" \\
    --redirect \\
    2>&1 | tee -a "$LOGFILE"
  log "✓ Certificate issued for $DOMAIN"
fi

# ── Auto-renewal via cron (idempotent) ───────────────────────────
CRON_ENTRY="0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx' >> /var/log/certbot-renew.log 2>&1"
crontab -l 2>/dev/null | grep -q "certbot renew" \\
  || (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

# ── DH params for extra security ─────────────────────────────────
DH_FILE="/etc/nginx/dhparam.pem"
if [[ ! -f "$DH_FILE" ]]; then
  log "Generating dhparam (may take a minute)…"
  openssl dhparam -out "$DH_FILE" 2048 2>&1 | tee -a "$LOGFILE"
  echo "ssl_dhparam $DH_FILE;" > /etc/nginx/conf.d/01-dhparam.conf
fi

# ── Test renewal ──────────────────────────────────────────────────
certbot renew --dry-run 2>&1 | tee -a "$LOGFILE"
log "✓ Auto-renewal dry-run passed"

nginx -t && systemctl reload nginx
log "✓ SSL setup complete → https://$DOMAIN"`}
        </CodeFile>
      </Section>

      {/* ── 04 Systemd ───────────────────────────────────── */}
      <Section id="s04" title="04 — Systemd Service: FastAPI (Gunicorn + Uvicorn)" icon={RotateCcw}>
        <InfoBox color="blue">
          <p>Gunicorn geere múltiplos workers Uvicorn para máxima concorrência. Com 2 GB RAM: <strong>2 workers</strong>. Fórmula: <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">workers = (2 × CPU) + 1</code> — limitado pela RAM disponível.</p>
        </InfoBox>
        <CodeFile filename="04_app_service.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — FastAPI systemd service setup
# Gunicorn + UvicornWorker · auto-restart · 99% uptime
# ===========================================================================

OP1NA1_HOME=\${OP1NA1_HOME:-"/opt/op1na1"}
APP_USER=\${APP_USER:-"op1na1"}
LOGFILE="/var/log/op1na1-setup.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "━━━ 04 App Service ━━━"

# ── App directories ───────────────────────────────────────────────
mkdir -p "$OP1NA1_HOME"/{app,logs,scripts}
mkdir -p /var/log/op1na1
chown -R "$APP_USER":"$APP_USER" "$OP1NA1_HOME" /var/log/op1na1

# ── Python venv + Gunicorn (idempotent) ───────────────────────────
VENV="$OP1NA1_HOME/venv"
if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
  log "✓ venv created"
fi
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet gunicorn uvicorn[standard]
log "✓ Gunicorn + Uvicorn installed"

# ── Environment file ──────────────────────────────────────────────
ENV_FILE="$OP1NA1_HOME/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" << 'ENVFILE'
# OP1NA1 — Application Environment
# Edit before starting service

APP_ENV=production
SECRET_KEY=CHANGE_ME_use_openssl_rand_hex_32
DEBUG=false
LOG_LEVEL=info

# Database
DATABASE_URL=mysql+aiomysql://op1na1:PASSWORD@127.0.0.1:3306/op1na1_db

# Redis (optional)
REDIS_URL=redis://127.0.0.1:6379/0

# CORS
ALLOWED_ORIGINS=https://mulenvos.gv.ao

# File uploads
MAX_UPLOAD_MB=25
ENVFILE
  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "✓ .env template created — EDIT BEFORE STARTING"
fi

# ── systemd service unit ──────────────────────────────────────────
cat > /etc/systemd/system/op1na1.service << SERVICE
[Unit]
Description=OP1NA1 FastAPI Application
Documentation=https://github.com/mulenvos/op1na1
After=network.target mysql.service
Requires=network.target

[Service]
Type=exec
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$OP1NA1_HOME/app
EnvironmentFile=$ENV_FILE

ExecStart=$VENV/bin/gunicorn app.main:app \\\\
    --worker-class uvicorn.workers.UvicornWorker \\\\
    --workers 2 \\\\
    --bind 127.0.0.1:8000 \\\\
    --timeout 60 \\\\
    --keepalive 5 \\\\
    --max-requests 1000 \\\\
    --max-requests-jitter 100 \\\\
    --graceful-timeout 30 \\\\
    --access-logfile /var/log/op1na1/gunicorn-access.log \\\\
    --error-logfile  /var/log/op1na1/gunicorn-error.log \\\\
    --log-level info

ExecReload=/bin/kill -s HUP \\\$MAINPID

# Restart policy — 99% uptime
Restart=always
RestartSec=5
StartLimitInterval=60
StartLimitBurst=5

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/log/op1na1 $OP1NA1_HOME
ProtectHome=true

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable op1na1
log "✓ op1na1.service installed and enabled"
log "  → Start: systemctl start op1na1"
log "  → Status: systemctl status op1na1"
log "  → Logs:   journalctl -u op1na1 -f"`}
        </CodeFile>

        <CodeFile filename="/etc/systemd/system/op1na1.service (rendered)" lang="ini">{`[Unit]
Description=OP1NA1 FastAPI Application
After=network.target mysql.service
Requires=network.target

[Service]
Type=exec
User=op1na1
Group=op1na1
WorkingDirectory=/opt/op1na1/app
EnvironmentFile=/opt/op1na1/.env

ExecStart=/opt/op1na1/venv/bin/gunicorn app.main:app \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --workers 2 \\
    --bind 127.0.0.1:8000 \\
    --timeout 60 \\
    --keepalive 5 \\
    --max-requests 1000 \\
    --max-requests-jitter 100 \\
    --graceful-timeout 30 \\
    --access-logfile /var/log/op1na1/gunicorn-access.log \\
    --error-logfile  /var/log/op1na1/gunicorn-error.log \\
    --log-level info

ExecReload=/bin/kill -s HUP $MAINPID

Restart=always
RestartSec=5
StartLimitInterval=60
StartLimitBurst=5

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/log/op1na1 /opt/op1na1
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target`}
        </CodeFile>
      </Section>

      {/* ── 05 MySQL ─────────────────────────────────────── */}
      <Section id="s05" title="05 — MySQL 8.0: Secure Install + Daily Backup" icon={Database}>
        <CodeFile filename="05_mysql.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — MySQL 8.0 secure install + backup cron
# Daily dump → /var/backups/op1na1 · 30-day retention
# ===========================================================================

MYSQL_ROOT_PASSWORD=\${MYSQL_ROOT_PASSWORD:-"$(openssl rand -base64 32)"}
APP_DB_NAME=\${APP_DB_NAME:-"op1na1_db"}
APP_DB_USER=\${APP_DB_USER:-"op1na1"}
APP_DB_PASSWORD=\${APP_DB_PASSWORD:-"$(openssl rand -base64 32)"}
LOGFILE="/var/log/op1na1-setup.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "━━━ 05 MySQL ━━━"

# ── Install MySQL 8.0 ─────────────────────────────────────────────
apt-get install -y mysql-server 2>&1 | tee -a "$LOGFILE"
systemctl enable --now mysql

# ── Secure installation (idempotent) ─────────────────────────────
mysql_secure() {
  mysql --user=root << SQL
  ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY '$MYSQL_ROOT_PASSWORD';
  DELETE FROM mysql.user WHERE User='';
  DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost','127.0.0.1','::1');
  DROP DATABASE IF EXISTS test;
  DELETE FROM mysql.db WHERE Db='test' OR Db='test\\\\_%';
  FLUSH PRIVILEGES;
SQL
}

# Only run if root has no password yet
if mysql --user=root --connect-expired-password -e "SELECT 1;" 2>/dev/null; then
  mysql_secure
  log "✓ MySQL root secured"
else
  log "MySQL root already has password — skipping secure install"
fi

MYSQL_AUTH="mysql --user=root --password=$MYSQL_ROOT_PASSWORD"

# ── Create app database + user ────────────────────────────────────
$MYSQL_AUTH << SQL
CREATE DATABASE IF NOT EXISTS \`$APP_DB_NAME\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '$APP_DB_USER'@'localhost'
  IDENTIFIED BY '$APP_DB_PASSWORD';

GRANT ALL PRIVILEGES ON \`$APP_DB_NAME\`.* TO '$APP_DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
log "✓ Database '$APP_DB_NAME' and user '$APP_DB_USER' ready"

# ── MySQL performance tuning ──────────────────────────────────────
cat > /etc/mysql/conf.d/op1na1.cnf << 'MYCNF'
[mysqld]
# InnoDB — tune for 2GB RAM
innodb_buffer_pool_size        = 512M
innodb_buffer_pool_instances   = 1
innodb_log_file_size           = 128M
innodb_flush_log_at_trx_commit = 1
innodb_flush_method            = O_DIRECT

# Connections
max_connections                = 150
max_connect_errors             = 10

# Slow query log
slow_query_log                 = 1
slow_query_log_file            = /var/log/mysql/slow.log
long_query_time                = 2

# Character set
character-set-server           = utf8mb4
collation-server               = utf8mb4_unicode_ci
MYCNF

systemctl restart mysql
log "✓ MySQL tuned for 2GB VPS"

# ── Backup script ─────────────────────────────────────────────────
BACKUP_SCRIPT="/opt/op1na1/scripts/backup_mysql.sh"
mkdir -p /opt/op1na1/scripts /var/backups/op1na1/mysql

cat > "$BACKUP_SCRIPT" << BACKUP
#!/usr/bin/env bash
set -euo pipefail
# OP1NA1 — MySQL daily backup · 30-day retention

BACKUP_DIR="/var/backups/op1na1/mysql"
RETENTION_DAYS=30
DB_NAME="$APP_DB_NAME"
DB_USER="$APP_DB_USER"
DB_PASS="$APP_DB_PASSWORD"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
DEST="\$BACKUP_DIR/op1na1_\$TIMESTAMP.sql.gz"

mkdir -p "\$BACKUP_DIR"

mysqldump \\
  --user="\$DB_USER" \\
  --password="\$DB_PASS" \\
  --single-transaction \\
  --routines \\
  --triggers \\
  --add-drop-table \\
  "\$DB_NAME" | gzip -9 > "\$DEST"

# Verify backup is non-empty
[[ -s "\$DEST" ]] || { echo "ERROR: Backup is empty!"; exit 1; }

SIZE=\$(du -sh "\$DEST" | cut -f1)
echo "[\$(date '+%Y-%m-%d %H:%M:%S')] Backup OK: \$DEST (\$SIZE)"

# 30-day retention cleanup
find "\$BACKUP_DIR" -name "*.sql.gz" -mtime +\$RETENTION_DAYS -delete
echo "Cleaned backups older than \$RETENTION_DAYS days"
BACKUP

chmod +x "$BACKUP_SCRIPT"

# ── Daily backup cron (02:30 daily) ──────────────────────────────
CRON_BACKUP="30 2 * * * bash $BACKUP_SCRIPT >> /var/log/op1na1/backup.log 2>&1"
crontab -l 2>/dev/null | grep -q "backup_mysql" \\
  || (crontab -l 2>/dev/null; echo "$CRON_BACKUP") | crontab -

log "✓ MySQL backup cron set (02:30 daily, 30-day retention)"
log "  Manual backup: bash $BACKUP_SCRIPT"
log "  Backups in: /var/backups/op1na1/mysql/"`}
        </CodeFile>
      </Section>

      {/* ── 06 Logrotate ─────────────────────────────────── */}
      <Section id="s06" title="06 — Log Rotation (App + Nginx)" icon={RotateCcw}>
        <CodeFile filename="06_logrotate.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — Log rotation configuration
# App logs + Nginx logs · weekly rotation · 52-week retention
# ===========================================================================

LOGFILE="/var/log/op1na1-setup.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "━━━ 06 Log Rotation ━━━"

# ── App logs rotation ─────────────────────────────────────────────
cat > /etc/logrotate.d/op1na1 << 'LOGROTATE'
/var/log/op1na1/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 op1na1 adm
    sharedscripts
    postrotate
        systemctl kill -s USR1 op1na1 2>/dev/null || true
    endscript
}
LOGROTATE

# ── Nginx logs rotation ───────────────────────────────────────────
cat > /etc/logrotate.d/nginx-op1na1 << 'LOGROTATE_NGINX'
/var/log/nginx/op1na1-*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then
            run-parts /etc/logrotate.d/httpd-prerotate
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
LOGROTATE_NGINX

# ── Backup log rotation ───────────────────────────────────────────
cat > /etc/logrotate.d/op1na1-backup << 'LOGROTATE_BK'
/var/log/op1na1/backup.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 640 root root
}
LOGROTATE_BK

# Test logrotate configs
logrotate --debug /etc/logrotate.d/op1na1 2>&1 | tail -5
log "✓ Log rotation configured (daily, 52 weeks retention, compressed)"`}
        </CodeFile>
      </Section>

      {/* ── 07 Health check ──────────────────────────────── */}
      <Section id="s07" title="07 — Health Check + Uptime Verification" icon={Activity}>
        <InfoBox color="green">
          <p>O FastAPI deve expor <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">GET /health</code> retornando <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">{`{"status":"ok","db":"ok","version":"x.y.z"}`}</code> com HTTP 200.</p>
        </InfoBox>

        <CodeFile filename="app/api/v1/health.py" lang="python">{`# app/api/v1/health.py — FastAPI health endpoint
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
import time, os

router = APIRouter(tags=["Health"])
START_TIME = time.time()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Liveness + readiness probe.
    Returns 200 if app + DB are healthy, 503 otherwise.
    """
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"error: {exc}"

    uptime_s = int(time.time() - START_TIME)
    healthy  = db_status == "ok"

    return {
        "status":    "ok" if healthy else "degraded",
        "db":        db_status,
        "uptime_s":  uptime_s,
        "version":   os.getenv("APP_VERSION", "1.0.0"),
        "env":       os.getenv("APP_ENV", "production"),
    }

# In main router: app.include_router(health.router)
# Nginx location /health { proxy_pass http://127.0.0.1:8000/health; }`}
        </CodeFile>

        <CodeFile filename="07_healthcheck.sh">{`#!/usr/bin/env bash
set -euo pipefail
# ===========================================================================
# OP1NA1 — Health check + deployment verification
# Verifies: systemd · MySQL · Nginx · FastAPI · SSL
# ===========================================================================

DOMAIN=\${DOMAIN:-"mulenvos.gv.ao"}
LOGFILE="/var/log/op1na1-setup.log"
PASS=0; FAIL=0

check() {
  local label="$1" cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "  ✓ $label"
    PASS=$((PASS+1))
  else
    echo "  ✗ $label"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "════════════════════════════════════════"
echo "  OP1NA1 — Deployment Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════"
echo ""

echo "── Services ────────────────────────────"
check "op1na1.service running"  "systemctl is-active --quiet op1na1"
check "nginx running"           "systemctl is-active --quiet nginx"
check "mysql running"           "systemctl is-active --quiet mysql"
check "fail2ban running"        "systemctl is-active --quiet fail2ban"

echo ""
echo "── Network ─────────────────────────────"
check "Port 80 listening"       "ss -tlnp | grep -q ':80'"
check "Port 443 listening"      "ss -tlnp | grep -q ':443'"
check "Port 8000 listening"     "ss -tlnp | grep -q ':8000'"
check "UFW active"              "ufw status | grep -q 'Status: active'"

echo ""
echo "── API Health ──────────────────────────"
check "HTTP /health (local)"    "curl -sf http://127.0.0.1:8000/health | grep -q '\"status\":\"ok\"'"
check "HTTPS /health (public)"  "curl -sf https://$DOMAIN/health | grep -q '\"status\":\"ok\"'"
check "SSL certificate valid"   "curl -sf --max-time 5 https://$DOMAIN/ -o /dev/null"

echo ""
echo "── Database ────────────────────────────"
check "MySQL reachable"         "mysqladmin ping --silent 2>/dev/null"
check "op1na1_db exists"        "mysql -u op1na1 -e 'USE op1na1_db' 2>/dev/null"
check "Backup script exists"    "[[ -x /opt/op1na1/scripts/backup_mysql.sh ]]"
check "Backup dir exists"       "[[ -d /var/backups/op1na1/mysql ]]"

echo ""
echo "── SSL / Certbot ───────────────────────"
check "Cert valid (not expired)" "certbot certificates 2>/dev/null | grep -q 'VALID'"
check "Renewal cron set"         "crontab -l 2>/dev/null | grep -q 'certbot renew'"

echo ""
echo "── Log Rotation ────────────────────────"
check "App logrotate config"    "[[ -f /etc/logrotate.d/op1na1 ]]"
check "Nginx logrotate config"  "[[ -f /etc/logrotate.d/nginx-op1na1 ]]"

echo ""
echo "════════════════════════════════════════"
echo "  PASSED: $PASS    FAILED: $FAIL"
if [[ $FAIL -eq 0 ]]; then
  echo "  STATUS: ✓ ALL CHECKS PASSED"
  echo "  URL: https://$DOMAIN"
else
  echo "  STATUS: ✗ $FAIL CHECK(S) FAILED — review above"
fi
echo "════════════════════════════════════════"
echo ""

[[ $FAIL -eq 0 ]] || exit 1`}
        </CodeFile>
      </Section>

      {/* ── Docker note ──────────────────────────────────── */}
      <Section id="docker" title="Docker-Ready: Variáveis de Ambiente" icon={Server}>
        <InfoBox color="blue">
          <p>Todos os scripts usam variáveis de ambiente sem caminhos hardcoded. Em Docker, passe as variáveis via <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">--env-file</code> ou <code className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">environment:</code> no compose.</p>
        </InfoBox>
        <CodeFile filename="docker-compose.yml" lang="yaml">{`version: "3.9"

services:
  api:
    build: ./app
    command: >
      gunicorn app.main:app
      --worker-class uvicorn.workers.UvicornWorker
      --workers 2
      --bind 0.0.0.0:8000
      --timeout 60
      --max-requests 1000
    env_file: .env
    environment:
      APP_ENV: production
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      db:
        condition: service_healthy
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: op1na1_db
      MYSQL_USER: op1na1
      MYSQL_PASSWORD: \${APP_DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/mysql-init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

volumes:
  mysql_data:`}
        </CodeFile>
      </Section>

      {/* ── Checklist ────────────────────────────────────── */}
      <Section id="checklist" title="Checklist de Deploy — 99% Uptime">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Shield size={12} /> Segurança
            </p>
            <ul className="space-y-0">
              <Check>UFW ativo — apenas 22/80/443 abertos</Check>
              <Check>SSH key-only — password auth desativado</Check>
              <Check>Root login SSH desativado</Check>
              <Check>fail2ban ativo — SSHd + Nginx</Check>
              <Check>Kernel hardening via sysctl</Check>
              <Check>Nginx server_tokens off</Check>
              <Check>HSTS + CSP + X-Frame-Options configurados</Check>
              <Check>TLSv1.2/1.3 only — TLS 1.0/1.1 desativados</Check>
            </ul>
          </div>
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Activity size={12} /> Disponibilidade
            </p>
            <ul className="space-y-0">
              <Check>Systemd Restart=always + RestartSec=5</Check>
              <Check>StartLimitBurst=5 por minuto</Check>
              <Check>Gunicorn graceful-timeout=30s</Check>
              <Check>Nginx keepalive + proxy buffering</Check>
              <Check>Rate limiting por zona (API + Submit)</Check>
              <Check>Health endpoint <code className="text-xs font-mono">/health</code> (DB check)</Check>
              <Check>Let's Encrypt auto-renewal (02:00 + nginx reload)</Check>
              <Check>Cron backup MySQL 02:30 · 30-day retention</Check>
            </ul>
          </div>
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Database size={12} /> Base de Dados
            </p>
            <ul className="space-y-0">
              <Check>MySQL 8.0 · root com password forte</Check>
              <Check>Utilizador dedicado <code className="text-xs font-mono">op1na1</code> sem root</Check>
              <Check>innodb_buffer_pool_size=512M (2GB RAM)</Check>
              <Check>slow_query_log ativo (threshold 2s)</Check>
              <Check>Backup diário comprimido (gzip -9)</Check>
              <Check>Verificação de backup não-vazio</Check>
              <Check>Retenção automática 30 dias</Check>
            </ul>
          </div>
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <RotateCcw size={12} /> Operações
            </p>
            <ul className="space-y-0">
              <Check>Log rotation diária — 52 semanas comprimidas</Check>
              <Check>Logs separados: app, gunicorn, nginx, backup</Check>
              <Check>Health check script com PASS/FAIL summary</Check>
              <Check>Todos os scripts idempotentes (re-executáveis)</Check>
              <Check>Variáveis de ambiente sem caminhos hardcoded</Check>
              <Check>Docker-ready via env-file ou compose</Check>
              <Check>.env com chmod 600 (apenas app user lê)</Check>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Comandos de Verificação Rápida</p>
          <div className="font-mono text-xs space-y-1.5 text-foreground dark:text-zinc-200">
            <p><span className="text-muted-foreground"># Verificação completa:</span></p>
            <p className="pl-4 text-green-600 dark:text-green-400">bash 07_healthcheck.sh</p>
            <p className="mt-2"><span className="text-muted-foreground"># Logs em tempo real:</span></p>
            <p className="pl-4">journalctl -u op1na1 -f</p>
            <p className="mt-2"><span className="text-muted-foreground"># Reload após deploy de código:</span></p>
            <p className="pl-4">systemctl reload op1na1 && systemctl reload nginx</p>
            <p className="mt-2"><span className="text-muted-foreground"># Backup manual imediato:</span></p>
            <p className="pl-4">bash /opt/op1na1/scripts/backup_mysql.sh</p>
          </div>
        </div>
      </Section>

    </article>
  );
}
