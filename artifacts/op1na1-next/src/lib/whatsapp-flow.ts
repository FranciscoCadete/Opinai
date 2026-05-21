/**
 * whatsapp-flow.ts — Máquina de Estados da Conversa WhatsApp (Canal 2)
 *
 * Fluxo de atendimento com menu institucional de 3 opções (nível 1)
 * seguido de submenu de categorias (nível 2) para reportes:
 *
 *   IDLE / COMPLETE
 *     ↓  (qualquer mensagem)
 *   AWAITING_ACTION  — sistema apresenta menu principal (3 opções)
 *     ↓
 *     ├─ "1" Reportar → AWAITING_CATEGORY
 *     │     ↓
 *     │   AWAITING_DESCRIPTION → COMPLETE
 *     │
 *     ├─ "2" Consultar → resposta directa (sem mudar estado)
 *     │
 *     └─ "3" Mediador  → resposta directa com contacto
 *
 * Estado em memória (DEMO) com TTL 10 min.
 */

import { INST_NUMBER_DISPLAY, APP_URL, FACEBOOK_PAGE } from "@/lib/contact";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ConversationState =
  | "idle"
  | "awaiting_action"
  | "awaiting_category"
  | "awaiting_description"
  | "complete";

export interface ConversationSession {
  phone:        string;
  state:        ConversationState;
  action?:      "report" | "track" | "mediator";
  category?:    string;
  categoryKey?: string;
  description?: string;
  updatedAt:    number;
}

// ── Menu principal (nível 1) ──────────────────────────────────────────────────

export const WA_MAIN_MENU = [
  { num: 1, label: "Reportar Problema",   action: "report"   as const },
  { num: 2, label: "Consultar Pedido",    action: "track"    as const },
  { num: 3, label: "Falar com Mediador",  action: "mediator" as const },
];

// ── Menu de categorias (nível 2 — só para Reportar) ──────────────────────────

export const WA_CATEGORIES: Array<{ num: number; label: string; key: string }> = [
  { num: 1, label: "Saneamento",    key: "saneamento"    },
  { num: 2, label: "Energia",       key: "energia"       },
  { num: 3, label: "Vias Públicas", key: "vias_publicas" },
  { num: 4, label: "Água",          key: "agua"          },
  { num: 5, label: "Segurança",     key: "seguranca"     },
  { num: 6, label: "Saúde",         key: "saude"         },
  { num: 7, label: "Habitação",     key: "habitacao"     },
  { num: 8, label: "Outros",        key: "outros"        },
];

// ── Mensagens do sistema ──────────────────────────────────────────────────────

export const WA_MSG = {
  welcome: () =>
    `Olá! 👋 Bem-vindo ao *OP1NA1 – Município dos Mulenvos*.\n\n` +
    `Escolha uma opção:\n\n` +
    `*1* — Reportar Problema\n` +
    `*2* — Consultar Pedido\n` +
    `*3* — Falar com Mediador\n\n` +
    `_Responda com o número da opção._`,

  categoryMenu: () =>
    `Seleccione a categoria da ocorrência:\n\n` +
    WA_CATEGORIES.map(c => `*${c.num}* — ${c.label}`).join("\n") +
    `\n\nResponda com o número ou nome da categoria.`,

  askDescription: (category: string) =>
    `Categoria: *${category}* ✅\n\n` +
    `Descreva o problema com o máximo de detalhe.\n` +
    `_(inclua rua, bairro ou referência de localização)_`,

  confirmation: (ticketId: string, category: string, priority: string) =>
    `*Pedido registado com sucesso!* ✅\n\n` +
    `📋 Referência: *${ticketId}*\n` +
    `📁 Categoria: ${category}\n` +
    `🚦 Prioridade: ${priority}\n\n` +
    `Envie *${ticketId}* a qualquer momento para consultar o estado.\n` +
    `Tempo médio de resposta: 48h.`,

  trackPrompt: () =>
    `Envie o número do seu pedido _(ex: OP247)_ para consultar o estado.\n\n` +
    `Ou aceda em: ${APP_URL}/citizen-portal#consultar`,

  statusFound: (ticketId: string, status: string) =>
    `*OP1NA1 — Estado do Pedido*\n\n` +
    `📋 Referência: *${ticketId}*\n` +
    `🚦 Estado: ${status}\n\n` +
    `Envie *1* para registar nova ocorrência.`,

  statusNotFound: (ticketId: string) =>
    `Pedido *${ticketId}* não encontrado.\n` +
    `Verifique o número ou envie *1* para nova ocorrência.`,

  mediatorInfo: () =>
    `*Mediadores Comunitários — OP1NA1* 👤\n\n` +
    `Os mediadores registam pedidos _presencialmente e gratuitamente_.\n\n` +
    `📞 Contacto directo: *${INST_NUMBER_DISPLAY}*\n` +
    `📘 Facebook: ${FACEBOOK_PAGE}\n\n` +
    `Zonas disponíveis:\n` +
    `• CAOP C — Seg–Sex 7h–17h\n` +
    `• Capalanga — Seg–Sáb 8h–16h\n` +
    `• Boa-Fé — Ter–Sáb 9h–17h\n\n` +
    `Envie *1* para registar ocorrência por escrito.`,

  unrecognisedAction: () =>
    `Opção não reconhecida. Responda com *1*, *2* ou *3*:\n\n` +
    `*1* — Reportar Problema\n*2* — Consultar Pedido\n*3* — Falar com Mediador`,

  unrecognisedCategory: () =>
    `Categoria não reconhecida. Responda com o número:\n\n` +
    WA_CATEGORIES.map(c => `*${c.num}* — ${c.label}`).join("\n"),
} as const;

// ── Store em memória (DEMO / desenvolvimento) ──────────────────────────────────

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos
const _store = new Map<string, ConversationSession>();

function purgeExpired() {
  const now = Date.now();
  for (const [key, s] of _store) {
    if (now - s.updatedAt > SESSION_TTL_MS) _store.delete(key);
  }
}

export function getSession(phone: string): ConversationSession {
  purgeExpired();
  return _store.get(phone) ?? { phone, state: "idle", updatedAt: Date.now() };
}

export function saveSession(session: ConversationSession): void {
  _store.set(session.phone, { ...session, updatedAt: Date.now() });
}

export function resetSession(phone: string): void {
  _store.delete(phone);
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/** Mapeia input do utilizador à acção principal (1/2/3) */
export function parseMainMenuInput(
  input: string
): typeof WA_MAIN_MENU[number] | null {
  const t = input.trim().toLowerCase();
  const num = parseInt(t, 10);
  if (!isNaN(num)) {
    return WA_MAIN_MENU.find(a => a.num === num) ?? null;
  }
  return (
    WA_MAIN_MENU.find(a =>
      a.label.toLowerCase().includes(t) || t.includes(a.action)
    ) ?? null
  );
}

/** Mapeia input do utilizador à categoria */
export function parseCategoryInput(
  input: string
): typeof WA_CATEGORIES[number] | null {
  const t = input.trim().toLowerCase();
  const num = parseInt(t, 10);
  if (!isNaN(num)) {
    return WA_CATEGORIES.find(c => c.num === num) ?? null;
  }
  for (const cat of WA_CATEGORIES) {
    if (
      cat.label.toLowerCase().includes(t) ||
      t.includes(cat.label.toLowerCase()) ||
      cat.key.includes(t)
    ) {
      return cat;
    }
  }
  return null;
}
