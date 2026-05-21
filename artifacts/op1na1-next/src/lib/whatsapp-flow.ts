/**
 * whatsapp-flow.ts — Máquina de Estados da Conversa WhatsApp (Canal 2)
 *
 * Implementa o fluxo conversacional guiado do OP1NA1 via WhatsApp:
 *
 *   IDLE
 *     ↓  (1ª mensagem do cidadão)
 *   AWAITING_CATEGORY  — sistema apresenta menu de categorias
 *     ↓  (cidadão escolhe 1-8 ou escreve tema)
 *   AWAITING_DESCRIPTION  — sistema pede descrição
 *     ↓  (cidadão descreve o problema)
 *   COMPLETE  — sistema cria ticket, confirma, volta a IDLE
 *
 * Estado guardado em:
 *   DEMO_MODE → Map em memória com TTL de 10 minutos
 *   Produção  → futuro: Redis ou tabela sessions no DB
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ConversationState =
  | "idle"
  | "awaiting_category"
  | "awaiting_description"
  | "complete";

export interface ConversationSession {
  phone:       string;
  state:       ConversationState;
  category?:   string;
  categoryNum?: number;
  description?: string;
  updatedAt:   number; // epoch ms
}

// ── Menu de categorias ─────────────────────────────────────────────────────────

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
  welcome: (name?: string) =>
    `Olá${name ? `, ${name}` : ""}! 👋 Bem-vindo ao *OP1NA1 – Município dos Mulenvos*.\n\n` +
    `Para registar uma ocorrência, indique a categoria:\n\n` +
    WA_CATEGORIES.map(c => `*${c.num}* — ${c.label}`).join("\n") +
    `\n\nResponda com o número ou o nome da categoria.`,

  askDescription: (category: string) =>
    `Seleccionou: *${category}* ✅\n\n` +
    `Por favor, descreva o problema com o máximo de detalhe possível.\n` +
    `_(inclua a localização: rua, bairro, referência)_`,

  confirmation: (ticketId: string, category: string, priority: string) =>
    `*Pedido registado com sucesso!* ✅\n\n` +
    `📋 Referência: *${ticketId}*\n` +
    `📁 Categoria: ${category}\n` +
    `🚦 Prioridade: ${priority}\n\n` +
    `Guarde este número. Para consultar o estado, envie: *${ticketId}*\n\n` +
    `_Tempo médio de resposta: 48h. Obrigado pela participação!_`,

  unrecognised: () =>
    `Não reconheci a opção. Responda com o número da categoria:\n\n` +
    WA_CATEGORIES.map(c => `*${c.num}* — ${c.label}`).join("\n"),

  statusFound: (ticketId: string, status: string) =>
    `*OP1NA1 — Estado do Pedido*\n\n` +
    `📋 Referência: *${ticketId}*\n` +
    `🚦 Estado: ${status}\n\n` +
    `Para nova ocorrência, envie qualquer mensagem.`,

  statusNotFound: (ticketId: string) =>
    `Não encontrei o pedido *${ticketId}*.\n` +
    `Verifique o número ou envie uma nova mensagem para registar uma ocorrência.`,
} as const;

// ── Store em memória (DEMO / desenvolvimento) ──────────────────────────────────

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos

const _store = new Map<string, ConversationSession>();

function purgeExpired() {
  const now = Date.now();
  for (const [key, session] of _store) {
    if (now - session.updatedAt > SESSION_TTL_MS) _store.delete(key);
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

export function getSession(phone: string): ConversationSession {
  purgeExpired();
  return (
    _store.get(phone) ?? {
      phone,
      state:     "idle",
      updatedAt: Date.now(),
    }
  );
}

export function saveSession(session: ConversationSession): void {
  _store.set(session.phone, { ...session, updatedAt: Date.now() });
}

export function resetSession(phone: string): void {
  _store.delete(phone);
}

// ── Parser de resposta do utilizador ─────────────────────────────────────────

/**
 * Tenta mapear a resposta do cidadão a uma das categorias do menu.
 * Aceita: número "1"–"8", nome exacto ou parcial (case-insensitive).
 */
export function parseCategoryInput(
  input: string
): { num: number; label: string; key: string } | null {
  const trimmed = input.trim().toLowerCase();

  // Por número
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    const cat = WA_CATEGORIES.find(c => c.num === num);
    if (cat) return cat;
  }

  // Por nome (parcial)
  for (const cat of WA_CATEGORIES) {
    if (
      cat.label.toLowerCase().includes(trimmed) ||
      trimmed.includes(cat.label.toLowerCase()) ||
      cat.key.includes(trimmed)
    ) {
      return cat;
    }
  }

  return null;
}
