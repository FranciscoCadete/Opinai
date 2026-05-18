# OP1NA1 — Deploy na Vercel

## Pré-requisitos

- Conta Vercel ligada ao repositório Git
- Base de dados Postgres (recomendado: [Neon](https://neon.tech) free tier)
- pnpm 11+ local

## Passo 1 — Provisionar Postgres

1. Criar projecto em Neon, copiar a **Pooler connection string** (não a directa)
2. Adicionar como `DATABASE_URL` em `.env` local e nas Environment Variables da Vercel (Production + Preview)

## Passo 2 — Aplicar schema e seed

```bash
cp .env.example .env   # editar e colocar DATABASE_URL
pnpm install
pnpm --filter @workspace/db push        # cria as tabelas
pnpm --filter @workspace/db seed        # popula município + bairros
```

## Passo 3 — Configurar Vercel

No painel da Vercel, importar o repositório e definir:

| Setting | Valor |
|---|---|
| Root Directory | (deixar em branco — workspace root) |
| Build Command | `pnpm --filter @workspace/op1na1-next build` *(já em vercel.json)* |
| Output Directory | `artifacts/op1na1-next/.next` *(já em vercel.json)* |
| Install Command | `pnpm install --no-frozen-lockfile` |
| Node Version | 22.x |

### Environment Variables

| Variável | Production | Preview | Notas |
|---|---|---|---|
| `DATABASE_URL` | ✓ | ✓ | Pooler URL do Neon |
| `AUTH_SECRET` | ✓ | ✓ | Segredo JWT — gerar com `openssl rand -base64 32`; **deve ser o mesmo valor em todos os deployments** |
| `NEXT_PUBLIC_DEMO_MODE` | — | ✓ | Definir `true` em Preview para demo sem DB |
| `RESEND_API_KEY` | ✓ | ✓ | Chave Resend para email transaccional |
| `RESEND_FROM` | ✓ | ✓ | Remetente email (ex.: `OP1NA1 <notificacoes@mulenvos.ao>`) |
| `TWILIO_ACCOUNT_SID` | ✓ | ✓ | Account SID Twilio para SMS outbound |
| `TWILIO_AUTH_TOKEN` | ✓ | ✓ | Auth Token Twilio |
| `TWILIO_FROM_NUMBER` | ✓ | ✓ | Número E.164 Twilio (ex.: `+244XXXXXXXXX`) |
| `WHATSAPP_PHONE_NUMBER_ID` | ✓ | ✓ | Phone Number ID da Meta Cloud API |
| `WHATSAPP_ACCESS_TOKEN` | ✓ | ✓ | System User token Meta (permanent) |

## Passo 4 — Deploy

```bash
git push origin main
```

Vercel detecta `vercel.json`, builda o Next.js App Router e serve API Route Handlers como Serverless Functions Edge.

## Endpoints disponíveis

### Públicos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/requests` | Submeter pedido cidadão |
| `GET` | `/api/requests/:ticketId` | Consultar pedido por ID público |
| `GET` | `/api/stats/realtime` | Estatísticas em tempo real |

### Auth (sessão JWT em cookie HTTP-only)
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login técnico/admin |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Sessão actual |

### Admin (requer cookie de sessão; RBAC enforced)
| Método | Rota | Mín. role | Descrição |
|---|---|---|---|
| `GET` | `/api/admin/requests` | technician | Listar pedidos com filtros + paginação |
| `GET` | `/api/admin/requests/:id` | technician | Pedido completo |
| `PATCH` | `/api/admin/requests/:id` | technician (manager+ p/ reatribuir) | Mudar estado, prioridade, atribuição |
| `DELETE` | `/api/admin/requests/:id` | manager | Eliminar pedido |
| `GET` | `/api/admin/reports` | manager | KPIs, tendências, breakdown por categoria/canal/bairro/prioridade (`?period=7d\|30d\|90d`) |

### Channels (webhooks)
| Método | Rota | Provider | Descrição |
|---|---|---|---|
| `GET` | `/api/channels/whatsapp/webhook` | Meta Cloud API | Handshake de subscrição |
| `POST` | `/api/channels/whatsapp/webhook` | Meta Cloud API | Recepção (HMAC SHA-256) |
| `GET` | `/api/channels/messenger/webhook` | Meta | Handshake |
| `POST` | `/api/channels/messenger/webhook` | Meta | Recepção (HMAC SHA-256) |
| `POST` | `/api/channels/sms/webhook` | Twilio | Recepção SMS (HMAC SHA-1) |
| `POST` | `/api/channels/ussd/webhook` | Africa's Talking | Sessão USSD `*123#` |

## Configurar canais Meta (WhatsApp + Messenger)

### 1. Criar App em developers.facebook.com

1. Em [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → "Business".
2. Em **Settings → Basic**, copiar **App Secret** → variável `META_APP_SECRET` (mesmo valor para ambos os produtos).

### 2. WhatsApp Cloud API

1. No painel da App → adicionar produto **WhatsApp**.
2. Copiar:
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **Permanent access token** (System User) → `WHATSAPP_ACCESS_TOKEN`
3. Definir um valor secreto qualquer em `WHATSAPP_VERIFY_TOKEN` (será introduzido no Meta para o handshake).
4. **Configure webhook**:
   - Callback URL: `https://<seu-domínio>.vercel.app/api/channels/whatsapp/webhook`
   - Verify Token: o valor de `WHATSAPP_VERIFY_TOKEN`
   - Subscribed fields: ✅ `messages`
5. Aprovar templates de mensagem se necessário (Meta exige templates aprovados para iniciar conversas; o bot OP1NA1 só responde a mensagens recebidas → não precisa).

### 3. Messenger (Facebook Page)

1. Adicionar produto **Messenger** à mesma App.
2. Ligar a Page do município → gerar **Page Access Token** → `MESSENGER_PAGE_ACCESS_TOKEN`.
3. Definir `MESSENGER_VERIFY_TOKEN` (qualquer valor secreto).
4. **Configure webhook**:
   - Callback URL: `https://<seu-domínio>.vercel.app/api/channels/messenger/webhook`
   - Verify Token: o valor de `MESSENGER_VERIFY_TOKEN`
   - Subscribed fields: ✅ `messages`, ✅ `messaging_postbacks`
5. Subscrever a Page no webhook (botão "Add or Remove Pages").

### 4. Testar

```bash
# Verificar webhook está acessível
curl "https://<seu-domínio>.vercel.app/api/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<seu-token>&hub.challenge=test123"
# Deve responder: test123
```

## Configurar SMS (Twilio)

### 1. Conta + número

1. [console.twilio.com](https://console.twilio.com) → comprar/transferir um número (Twilio cobre Angola via long codes ou serviços de A2P internacionais — confirmar regulação local)
2. Em **Account → API keys & tokens**, copiar **Account SID** + **Auth Token**:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
3. `TWILIO_FROM_NUMBER` = o número Twilio em formato E.164 (`+1XXXXXXXXXX`)

### 2. Webhook do número

Em **Phone Numbers → Active numbers → seu número → Messaging Configuration**:
- **A MESSAGE COMES IN**: Webhook → `POST` → `https://<seu-domínio>.vercel.app/api/channels/sms/webhook`

### 3. Testar

```bash
# Enviar SMS para o número Twilio do seu telemóvel:
SMS> ola
# → "Olá! Sou o assistente OP1NA1..."

SMS> novo
# → "Descreva o problema com pelo menos 12 caracteres."

SMS> agua falta ha 3 dias
# → "Em que bairro?..."

SMS> 1
# → "Bairro: KM 9-B. Que tipo? 1=Reclamação..."

SMS> 1
# → "Resumo: ... Confirma? sim/não"

SMS> sim
# → "Pedido registado: MUL-...
```

**Limite SMS**: descrição mínima 12 chars (vs 20 no WA/Messenger). Mensagens >160 chars são partidas pela Twilio (cada parte uma SMS facturada).

## Configurar USSD (Africa's Talking)

### 1. Conta + service code

1. [account.africastalking.com](https://account.africastalking.com) → criar conta
2. **USSD → Create Service Code** — pedir um código (ex.: `*384*123#`). Em produção, o código real `*123#` precisa de acordo com o operador (Unitel, Movicel) e validação regulatória — Africa's Talking faz a integração mas há lead time de semanas.
3. **Callback URL**: `https://<seu-domínio>.vercel.app/api/channels/ussd/webhook`
4. **Method**: `POST`

### 2. Segurança

A Africa's Talking **não assina os webhooks**. Duas opções:
- **IP allowlist** ao nível da Vercel Firewall (Pro+) — recomendado em produção
- **Shared secret** via header `X-Shared-Secret`. Defina `USSD_SHARED_SECRET` e configure-o do lado AT também.

### 3. Testar

USSD é stateful (sessão dura ~3min). Marcar `*384*123#` no telemóvel:

```
Marcar *384*123# → ecrã 1
"Olá! Para registar pedido descreva o problema..."
[utilizador escreve] agua falta
→ ecrã 2: "Em que bairro? 1.KM 9-B 2.KM 12-B..."
[utilizador digita] 1
→ ecrã 3: "Tipo? 1.Reclamacao 2.Sugestao..."
[utilizador digita] 1
→ ecrã 4: "Resumo... sim/nao"
[utilizador digita] sim
→ ecrã final (END): "Pedido registado: MUL-..."
```

**Limites USSD**:
- Cada ecrã ≤ 156 caracteres ASCII (sem markdown, sem emojis — a `ussdScreen()` faz a conversão)
- Sessão termina automaticamente em 3min
- Descrição mínima 10 chars

## Configurar notificações proativas (Fase 10)

O motor de notificações envia actualizações de estado ao cidadão pelo canal original de submissão (WhatsApp → SMS fallback, SMS/USSD → SMS, Portal/Messenger → Email → SMS fallback). Apenas as transições `in_progress`, `resolved` e `rejected` disparam notificação; pedidos anónimos são sempre ignorados.

### Resend (email)

1. Criar conta em [resend.com](https://resend.com), verificar domínio `mulenvos.ao`
2. **API Keys** → criar chave → `RESEND_API_KEY`
3. `RESEND_FROM` = remetente verificado (ex.: `OP1NA1 <notificacoes@mulenvos.ao>`)

```bash
# Testar integração
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"OP1NA1 <notificacoes@mulenvos.ao>","to":["teste@exemplo.ao"],"subject":"Teste","text":"OK"}'
# → {"id":"..."}
```

### Twilio SMS (outbound)

As credenciais `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_FROM_NUMBER` são as mesmas já configuradas para o webhook de recepção SMS. Não há configuração adicional para o envio outbound.

Limite por SMS: 320 caracteres (2 segmentos); o sistema trunca automaticamente.

### WhatsApp Cloud API — template proactivo

Para iniciar conversas (mensagens proactivas), a Meta exige um template pré-aprovado.

1. Em **business.facebook.com** → Account Assets → Message Templates → Create Template
2. Preencher:
   - **Name**: `op1na1_status_update`
   - **Category**: Utility
   - **Language**: Portuguese (Portugal) — `pt_PT`
   - **Body**: `Olá! O estado do seu pedido *{{1}}* foi actualizado para *{{2}}*. {{3}}`
3. Submeter para aprovação (habitualmente 24h)
4. Após aprovação, os `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` já configurados são suficientes — não há configuração extra

```bash
# Verificar template aprovado
curl "https://graph.facebook.com/v19.0/<PHONE_NUMBER_ID>/message_templates?name=op1na1_status_update" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"
# → {"data":[{"status":"APPROVED",...}]}
```

### Comportamento sem credenciais

Se qualquer variável estiver ausente, o canal correspondente é silenciosamente ignorado (`not_configured`) e o sistema tenta o canal seguinte. A resposta da API ao técnico **nunca bloqueia** — a notificação é fire-and-forget.

---

## Configurar classificação NLP (Claude)

A classificação automática usa **Claude Haiku 4.5** para atribuir prioridade e categoria a cada pedido.

### 1. Obter API key

1. [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key
2. Definir `ANTHROPIC_API_KEY` na Vercel (Production + Preview)

### 2. Comportamento

A cada pedido submetido (portal, WA, Messenger, SMS, USSD):

```
description ─► classifyHeuristic() ─► priority_h
            └► classifyRequest() (Claude, 5s timeout) ─► priority_nlp + category + isCrisis
            
final_priority = priority_nlp ?? priority_h   (com safety floor: nunca baixar 'urgent' explícito)
final_category = category_nlp ?? category_declarada
```

- **Prompt caching ephemeral**: o system prompt (≈1.5KB) é cacheado — chamadas consecutivas dentro de 5min custam 90% menos
- **Timeout 5s**: se Claude exceder, fallback automático para heurística sem afectar o ACK ao cidadão
- **Audit log** captura ambas as classificações + reasoning + latência → permite avaliar precisão e ajustar o prompt

### 3. Custos estimados

Para 1000 pedidos/mês:
- ≈300 tokens input (com cache: 30 tokens efectivos) + 80 tokens output
- ≈$0.20/mês total

Sem `ANTHROPIC_API_KEY` definida, o sistema continua a funcionar — apenas com a heurística de palavras-chave.

### 4. Tuning do prompt

O prompt vive em [api/_lib/nlp.ts](api/_lib/nlp.ts). Para melhorar:

1. Consultar o `audit_log` filtrado por `payload->>'nlp'`:
   ```sql
   SELECT entity_id, payload->'nlp'->>'reasoning' AS reason,
          payload->'final'->>'priority' AS final_priority
   FROM audit_log WHERE action='request.submitted' ORDER BY created_at DESC LIMIT 50;
   ```
2. Identificar casos mal classificados, ajustar `SYSTEM_PROMPT` com exemplos concretos
3. Re-deploy → o cache é invalidado automaticamente quando o prompt muda

Enviar uma mensagem para o número WA (ou para a Page no Messenger):
- Primeira mensagem → bot responde com menu de boas-vindas
- `novo` → começa fluxo de submissão (descrição → bairro → tipo → confirmar)
- `MUL-XXXXXXXX-XXXX` → consulta estado do pedido
- `ajuda` → menu
- `cancelar` → anular pedido em curso

## Verificação pós-deploy

```bash
curl https://<seu-domínio>.vercel.app/api/healthz
# {"status":"ok","ts":"..."}

curl https://<seu-domínio>.vercel.app/api/stats/realtime
# {"resolvedThisMonth":0,"inProgress":0,...}
```

Submeter um pedido pelo Portal do Cidadão e confirmar que o ID começa por `MUL-YYYYMMDD-XXXX`.

## Limites Vercel a notar

- **Free / Hobby**: timeout 10s, sem WebSockets, 100GB-h Functions/mês
- **Pro**: timeout 60s, 1000GB-h, WebSockets em beta
- Para WhatsApp/SMS webhooks de longa duração e tarefas de NLP, **usar fila** (Inngest, QStash) — não pôr lógica pesada em Functions síncronas

## Roadmap

- ✅ **Fase 1**: API pública (submeter, consultar, stats), schema Drizzle, deploy Vercel
- ✅ **Fase 2**: Auth técnica (JWT + bcrypt), RBAC, endpoints admin, AdminDashboard ligado
- ✅ **Fase 3a**: Webhooks WhatsApp + Messenger com state machine (descrição → bairro → tipo → confirmar)
- ✅ **Fase 3b**: SMS (Twilio) + USSD (Africa's Talking) reusando a mesma state machine
- ✅ **Fase 4**: Pipeline NLP (Claude Haiku 4.5) para classificação automática de prioridade + categoria + detecção de crise, com prompt caching e fallback para heurística
- ✅ **Fase 5**: Endpoints `/api/admin/users` (GET/POST/PATCH/DELETE + RBAC) + `/api/admin/audit-log` (query paginada + export CSV/JSON), UserManagement e AuditCenter ligados à API real
- ✅ **Fase 6**: SSE real-time (`/api/admin/events`) — ligações curtas de 8s com auto-reconnect, latência ~2.5s vs 30s de polling; AdminDashboard usa `useRealtimeEvents` hook
- ✅ **Fase 7a**: i18n com react-i18next — PT-AO completo, esqueletos Kimbundu/Umbundu; toggle PT·KMB·UMB na Login; modo demo (auth + mock data via localStorage sem DB); WCAG 2.1 AA na Login: `<html lang="pt">`, skip link, `<label>` associados, `role="radiogroup/radio"`, `aria-live="assertive"`, `aria-invalid/describedby`, `<h1>` semântico, SVGs decorativos `aria-hidden`
- ✅ **Fase 7b**: WCAG 2.1 AA em todas as páginas funcionais — `<main id="main-content">` + `<header>`/`<footer>` landmarks; `role="alert"` em banners de erro/crise; `aria-pressed` em toggles; `role="tab"` + `aria-selected` em tab bars; `role="progressbar"` + `aria-valuenow/min/max` em barras; `aria-label` em inputs sem label visível, selects, tabelas, checkboxes e ícones decorativos; `role="dialog"` + `aria-modal` + `aria-labelledby` no modal de utilizadores; `role="status"` + `aria-live="polite"` no indicador SSE
- ✅ **Fase 8**: Migração para Next.js App Router — novo pacote `@workspace/op1na1-next`; App Router (`app/`) com Server Components + metadata por rota; middleware Edge com `jose` para RBAC; API Route Handlers substituem Vercel Functions; SSE em Edge runtime; demo mode sem DB; Login adaptado com `useRouter`
- ✅ **Fase 9**: CI/CD + Testes — GitHub Actions (`ci.yml`: typecheck → lint → Vitest unit → Playwright E2E, `production.yml`: deploy automático em `main`); Vitest workspace com 40+ testes unitários para `demo.ts` (auth, requests CRUD, users CRUD, audit, stats) e `server/auth.ts` (JWT round-trip, tamper, roles, null fields); Playwright E2E (Chromium + Mobile Chrome) cobrindo login, validação, toggle password, protecção de rotas, portal cidadão, navegação admin, pesquisa; ESLint 9 flat config com TypeScript + React + Next.js rules; Prettier; `pnpm test:unit` / `pnpm test:e2e` / `pnpm lint` no root
- ✅ **Fase 10**: Notificações Proativas — motor multi-canal fire-and-forget integrado no `PATCH /api/admin/requests/:id`; dispatcher (`notifications/index.ts`) roteia por canal original (WhatsApp → SMS fallback, SMS/USSD → SMS, Portal/Messenger → Email → SMS fallback); pedidos anónimos nunca notificados; só `in_progress`, `resolved` e `rejected` disparam notificação; 3 canais: WhatsApp Business Cloud API (`op1na1_status_update` template, E.164 Angolano), Twilio SMS (truncagem 320 chars, strip markdown), Resend email (HTML branded + plain text); templates PT-AO com variantes kmb/umb; 30+ testes unitários
- ✅ **Fase 11**: Relatórios & Analytics — `GET /api/admin/reports?period=7d|30d|90d` (manager+); `ReportsClient.tsx` com KPIs executivos (total, resolvidos, em progresso, rejeitados, tempo médio, taxa de resolução), gráfico SVG de tendência (submetidos vs resolvidos por dia), barras horizontais por categoria e prioridade, donut chart por canal, tabela top bairros; export CSV / JSON / Print-to-PDF (`window.print()`); sidebar nav com "Relatórios ◒"; modo demo com dados sintéticos
- ✅ **Fase 12**: PWA / Offline — `public/sw.js` (vanilla): cache-first para `/_next/static/*`, network-first para API e navegação, fallback `offline.html`; Background Sync API (`op1na1-offline-queue`) + postMessage `FLUSH_OFFLINE_QUEUE`; `offlineQueue.ts` (IndexedDB): enqueue/flush/count, drop de 4xx, retenção de erros de rede; `PwaRegister.tsx`: registo do SW, reload na nova versão, flush na reconexão; `OfflineBanner.tsx`: banner fixo offline/online com contagem de pedidos pendentes; `manifest.webmanifest` com shortcuts; `app/layout.tsx` com manifest, theme-color, apple-web-app-capable; `public/icons/icon.svg` + guia de geração de PNGs
- ✅ **Fase 13**: Multi-município — middleware actualizado: extrai `municipalityId` do JWT e injeta `x-municipality-id` em todas as rotas protegidas; `superadmin` role = admin + `municipalityId === null`; `GET/POST /api/super/municipalities` + `GET/PATCH/DELETE /api/super/municipalities/[slug]` (protegidos por superadmin); `/m/[slug]` slug-based citizen portal entry com branding por município (cor primária, nome, contactos), fallback 404 para slugs inactivos; `/superadmin` painel de gestão de municípios com lista, badge activo/inactivo, toggle, criação de novo município com formulário validado; `src/lib/municipalities.ts` client helpers; `src/lib/server/municipalityContext.ts` server helper (`getMunicipalityId()`); `demo.ts` com 3 municípios demo (Mulenvos ✅, Luanda-Sambizanga ✅, Kilamba-Kiaxi ✗ inactivo)
- ✅ **Testes de Integração** — suite separada `integration` no Vitest workspace (`pool: forks` para isolamento de módulos entre ficheiros); `setup.ts` com mock de `next/headers` (cookies + headers); 6 suites / 80+ testes: `api.auth` (login demo válido/inválido, logout, me), `api.admin.requests` (list/filter/paginate/update/delete guard), `api.admin.reports` (7d/30d/90d, KPI shape, trend ISO dates, byChannel known names), `api.super.municipalities` (list/get/create/duplicate-409/patch/delete-403-demo), `notifications` (guards anónimo/status/unchanged, email portal, SMS ussd, WhatsApp + fallback SMS, no-credentials → no_reachable_channel), `offlineQueue` (enqueue/getAll/count/remove, flushQueue success/4xx-drop/network-error-retain/empty); `fake-indexeddb` polyfill para IndexedDB em Node.js; `vi.stubGlobal("fetch")` + `vi.stubEnv()` para providers externos; `pnpm test:integration` / `pnpm test:integration:watch`
- ✅ **Ajustes UX + Deploy Produção** — corrigido hydration bug em `CitizenPortalSlugClient` (sessionStorage + CSS custom property movidos para `useEffect`); sidebar admin responsiva (hamburger mobile com drawer animado, backdrop overlay, botão fechar); gráficos de relatório com `repeat(auto-fit, minmax(320px, 1fr))` para ecrãs estreitos; `vercel.json` com cabeçalhos de segurança (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`); `DEPLOY.md` corrigido (build command e output directory Next.js, referência Vite removida, secção duplicada eliminada)
