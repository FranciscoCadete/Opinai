import { eq, and, ilike } from "drizzle-orm";
import {
  db,
  conversationsTable,
  incomingMessagesTable,
  citizenRequestsTable,
  bairrosTable,
  municipalitiesTable,
  auditLogTable,
  type ConversationContext,
} from "@workspace/db";
import { generateTicketId } from "./ticketId";
import { classifyHeuristic, finalClassification } from "./classify";

const TICKET_RE = /MUL-\d{8}-\d{4}/i;

const TYPE_OPTIONS: { key: string; label: string; aliases: string[] }[] = [
  { key: "reclamacao", label: "Reclamação", aliases: ["1", "reclamar", "reclamacao", "reclamação"] },
  { key: "sugestao", label: "Sugestão", aliases: ["2", "sugerir", "sugestao", "sugestão"] },
  { key: "denuncia", label: "Denúncia", aliases: ["3", "denunciar", "denuncia", "denúncia"] },
  { key: "solicitacao", label: "Solicitação", aliases: ["4", "solicitar", "solicitacao", "solicitação", "pedido"] },
  { key: "elogio", label: "Elogio", aliases: ["5", "elogiar", "elogio"] },
  { key: "urgente", label: "Urgente", aliases: ["6", "urgente", "emergencia", "emergência"] },
];

const HELP_TEXT =
  "📋 *OP1NA1 — Assistente Municipal de Mulenvos*\n\n" +
  "Comandos disponíveis:\n" +
  "• *novo* — registar novo pedido\n" +
  "• *MUL-XXXXXXXX-XXXX* — consultar pedido pelo número\n" +
  "• *cancelar* — anular pedido em curso\n" +
  "• *ajuda* — voltar a este menu";

export type Channel = "whatsapp" | "messenger" | "sms" | "ussd";

const MIN_DESCRIPTION_CHARS: Record<Channel, number> = {
  whatsapp: 20,
  messenger: 20,
  sms: 12,
  ussd: 10,
};

export type IncomingPayload = {
  channel: Channel;
  externalId: string; // wa_id (WhatsApp) ou PSID (Messenger)
  providerMessageId: string;
  text: string;
  rawPayload?: unknown;
  contactName?: string | null;
};

export type Reply = {
  text: string;
};

async function logIncoming(
  msg: IncomingPayload,
  direction: "inbound" | "outbound",
  text: string,
): Promise<{ duplicate: boolean }> {
  try {
    await db.insert(incomingMessagesTable).values({
      channel: msg.channel,
      externalId: msg.externalId,
      providerMessageId:
        direction === "inbound" ? msg.providerMessageId : `out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      direction,
      text,
      payload: msg.rawPayload ?? null,
    });
    return { duplicate: false };
  } catch (e) {
    if (
      e instanceof Error &&
      /unique|duplicate/i.test(e.message)
    ) {
      return { duplicate: true };
    }
    throw e;
  }
}

async function getOrCreateConversation(channel: Channel, externalId: string) {
  const existing = await db.query.conversationsTable.findFirst({
    where: and(
      eq(conversationsTable.channel, channel),
      eq(conversationsTable.externalId, externalId),
    ),
  });
  if (existing) return existing;

  const muni = await db.query.municipalitiesTable.findFirst({
    where: eq(municipalitiesTable.slug, "mulenvos"),
  });
  const [created] = await db
    .insert(conversationsTable)
    .values({
      channel,
      externalId,
      municipalityId: muni?.id ?? null,
      state: "idle",
      context: {},
    })
    .returning();
  return created;
}

async function setConversation(
  id: string,
  patch: { state?: string; context?: ConversationContext; lastRequestId?: string | null },
) {
  await db
    .update(conversationsTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(conversationsTable.id, id));
}

async function findBairro(input: string): Promise<{ id: string; name: string } | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Try numeric (1-based index)
  const n = Number(trimmed);
  if (Number.isInteger(n) && n >= 1) {
    const all = await db
      .select({ id: bairrosTable.id, name: bairrosTable.name })
      .from(bairrosTable)
      .orderBy(bairrosTable.name);
    if (n <= all.length) return all[n - 1];
  }
  // Fuzzy by name
  const match = await db
    .select({ id: bairrosTable.id, name: bairrosTable.name })
    .from(bairrosTable)
    .where(ilike(bairrosTable.name, `%${trimmed}%`))
    .limit(1);
  return match[0] ?? null;
}

async function bairrosMenu(): Promise<string> {
  const all = await db
    .select({ name: bairrosTable.name })
    .from(bairrosTable)
    .orderBy(bairrosTable.name);
  if (all.length === 0) return "(sem bairros configurados)";
  return all.map((b, i) => `${i + 1}. ${b.name}`).join("\n");
}

function typesMenu(): string {
  return TYPE_OPTIONS.map((t, i) => `${i + 1}. ${t.label}`).join("\n");
}

function matchType(input: string): { key: string; label: string } | null {
  const v = input.trim().toLowerCase();
  for (const opt of TYPE_OPTIONS) {
    if (opt.aliases.includes(v)) return { key: opt.key, label: opt.label };
  }
  return null;
}

async function lookupTicket(ticketId: string): Promise<string> {
  const r = await db.query.citizenRequestsTable.findFirst({
    where: eq(citizenRequestsTable.ticketId, ticketId.toUpperCase()),
  });
  if (!r) return `❌ Pedido *${ticketId}* não encontrado.`;

  const statusLabels: Record<string, string> = {
    received: "Recebido",
    triaged: "Em triagem",
    assigned: "Atribuído",
    in_progress: "Em progresso",
    resolved: "Resolvido ✅",
    rejected: "Rejeitado",
  };
  const lines = [
    `📌 *${r.ticketId}*`,
    `Estado: ${statusLabels[r.status] ?? r.status}`,
    `Prioridade: ${r.priority.toUpperCase()}`,
    `Categoria: ${r.category}`,
    `Submetido: ${r.createdAt.toLocaleDateString("pt-PT")}`,
  ];
  if (r.resolvedAt) {
    lines.push(`Resolvido: ${r.resolvedAt.toLocaleDateString("pt-PT")}`);
  }
  return lines.join("\n");
}

async function createRequestFromContext(
  conversation: { id: string; channel: Channel; externalId: string; municipalityId: string | null; context: ConversationContext },
  contactName: string | null,
): Promise<string> {
  const ctx = conversation.context;
  if (!ctx.description || !ctx.type) {
    return "Não foi possível submeter (faltam dados). Diga *novo* para começar de novo.";
  }
  if (!conversation.municipalityId) {
    return "Configuração de município em falta. Tente mais tarde.";
  }

  const ticketId = generateTicketId();
  const declaredCategory =
    TYPE_OPTIONS.find((t) => t.key === ctx.type)?.label ?? "Outro";

  const heuristic = classifyHeuristic(ctx.type, ctx.description);
  const classification = await finalClassification(
    ctx.type,
    ctx.description,
    declaredCategory,
  );

  const [created] = await db
    .insert(citizenRequestsTable)
    .values({
      ticketId,
      municipalityId: conversation.municipalityId,
      bairroId: ctx.bairroId ?? null,
      type: ctx.type as
        | "reclamacao"
        | "sugestao"
        | "denuncia"
        | "solicitacao"
        | "elogio"
        | "urgente",
      category: classification.category,
      description: ctx.description,
      contactName: contactName ?? ctx.contactName ?? null,
      contactPhone: conversation.channel === "whatsapp" ? conversation.externalId : null,
      isAnonymous: false,
      channel: conversation.channel,
      priority: classification.priority,
    })
    .returning({
      id: citizenRequestsTable.id,
      ticketId: citizenRequestsTable.ticketId,
    });

  await db.insert(auditLogTable).values({
    action: "request.submitted",
    entityType: "citizen_request",
    entityId: created.ticketId,
    payload: {
      channel: conversation.channel,
      externalId: conversation.externalId,
      heuristic: { priority: heuristic },
      nlp: classification.nlp,
      final: {
        priority: classification.priority,
        category: classification.category,
        isCrisis: classification.isCrisis,
      },
    },
  });

  await setConversation(conversation.id, {
    state: "idle",
    context: {},
    lastRequestId: created.id,
  });

  const urgentNote =
    classification.priority === "urgent"
      ? "\n\n⚠ Pedido marcado como URGENTE — será encaminhado de imediato."
      : classification.priority === "high"
        ? "\n\n⚠ Pedido com prioridade ALTA."
        : "";

  return (
    `✅ *Pedido registado!*\n\n` +
    `Número: *${created.ticketId}*\n` +
    `Guarde este número para acompanhar.\n\n` +
    `Para consultar, envie o número a qualquer momento.${urgentNote}`
  );
}

/**
 * Núcleo de lógica do bot: recebe uma mensagem e devolve a resposta
 * que deve ser enviada de volta ao utilizador.
 */
export async function handleIncomingMessage(
  msg: IncomingPayload,
): Promise<Reply | null> {
  const { duplicate } = await logIncoming(msg, "inbound", msg.text);
  if (duplicate) return null; // já tratado, ignorar (Meta retries)

  const text = msg.text.trim();
  const lower = text.toLowerCase();
  const conversation = await getOrCreateConversation(msg.channel, msg.externalId);

  // Comandos globais
  if (lower === "ajuda" || lower === "help" || lower === "menu") {
    return { text: HELP_TEXT };
  }
  if (lower === "cancelar" || lower === "anular") {
    if (conversation.state === "idle") {
      return { text: "Não há pedido em curso. Diga *novo* para começar." };
    }
    await setConversation(conversation.id, { state: "idle", context: {} });
    return { text: "🔁 Pedido em curso anulado. Diga *novo* para começar de novo." };
  }

  // Consulta por número de pedido
  const ticketMatch = text.match(TICKET_RE);
  if (ticketMatch) {
    return { text: await lookupTicket(ticketMatch[0]) };
  }

  // State machine
  switch (conversation.state) {
    case "idle": {
      if (lower === "novo" || lower === "começar" || lower === "comecar" || lower === "iniciar") {
        await setConversation(conversation.id, {
          state: "awaiting_description",
          context: {},
        });
        return {
          text:
            "👋 Olá! Sou o assistente OP1NA1.\n\n" +
            "📝 *Descreva o problema* com pelo menos 20 caracteres.\n\n" +
            "Exemplo: \"Falta de água há 3 dias na rua principal do CAOP A\".",
        };
      }
      // First contact: welcome
      return {
        text:
          "👋 Olá! Sou o assistente OP1NA1, da Administração Municipal dos Mulenvos.\n\n" +
          "Posso ajudar a:\n" +
          "• Registar pedidos (escreva *novo*)\n" +
          "• Consultar pedidos (envie o número *MUL-XXXXXXXX-XXXX*)\n" +
          "• Ver opções (escreva *ajuda*)",
      };
    }

    case "awaiting_description": {
      const minChars = MIN_DESCRIPTION_CHARS[msg.channel];
      if (text.length < minChars) {
        return {
          text: `📝 A descrição precisa de pelo menos ${minChars} caracteres (tem ${text.length}). Por favor descreva com mais detalhe.`,
        };
      }
      const next: ConversationContext = { ...conversation.context, description: text };
      await setConversation(conversation.id, {
        state: "awaiting_bairro",
        context: next,
      });
      const menu = await bairrosMenu();
      return {
        text:
          "📍 Em que *bairro* ocorre? Responda com o nome ou o número:\n\n" +
          menu +
          "\n\n(ou escreva *cancelar* para anular)",
      };
    }

    case "awaiting_bairro": {
      const bairro = await findBairro(text);
      if (!bairro) {
        const menu = await bairrosMenu();
        return {
          text:
            `❓ Bairro não reconhecido. Tente de novo (nome ou número):\n\n${menu}`,
        };
      }
      const next: ConversationContext = {
        ...conversation.context,
        bairroId: bairro.id,
        bairroName: bairro.name,
      };
      await setConversation(conversation.id, {
        state: "awaiting_type",
        context: next,
      });
      return {
        text:
          `✓ Bairro: *${bairro.name}*\n\n` +
          `📂 Que *tipo* de pedido?\n\n${typesMenu()}`,
      };
    }

    case "awaiting_type": {
      const t = matchType(text);
      if (!t) {
        return {
          text: `❓ Tipo não reconhecido. Escolha um (nome ou número):\n\n${typesMenu()}`,
        };
      }
      const next: ConversationContext = { ...conversation.context, type: t.key };
      await setConversation(conversation.id, {
        state: "awaiting_confirm",
        context: next,
      });
      const c = next;
      const summary =
        `📋 *Resumo do pedido*\n\n` +
        `Tipo: ${t.label}\n` +
        `Bairro: ${c.bairroName ?? "—"}\n` +
        `Descrição: ${c.description?.slice(0, 200)}${(c.description?.length ?? 0) > 200 ? "…" : ""}\n\n` +
        `Confirma a submissão? Responda *sim* ou *não*.`;
      return { text: summary };
    }

    case "awaiting_confirm": {
      if (["sim", "s", "yes", "y", "confirmar", "confirmo"].includes(lower)) {
        const reply = await createRequestFromContext(
          {
            id: conversation.id,
            channel: msg.channel,
            externalId: msg.externalId,
            municipalityId: conversation.municipalityId,
            context: conversation.context,
          },
          msg.contactName ?? null,
        );
        return { text: reply };
      }
      if (["não", "nao", "n", "no", "cancelar"].includes(lower)) {
        await setConversation(conversation.id, { state: "idle", context: {} });
        return { text: "🔁 Submissão cancelada. Diga *novo* para começar de novo." };
      }
      return { text: "Por favor responda *sim* ou *não*." };
    }

    default:
      await setConversation(conversation.id, { state: "idle", context: {} });
      return {
        text:
          "Algo correu mal — recomeçámos a conversa. Diga *novo* para registar um pedido ou *ajuda*.",
      };
  }
}

export async function recordOutgoing(
  channel: Channel,
  externalId: string,
  text: string,
  providerMessageId: string | null,
): Promise<void> {
  if (!providerMessageId) return;
  try {
    await db.insert(incomingMessagesTable).values({
      channel,
      externalId,
      providerMessageId,
      direction: "outbound",
      text,
    });
  } catch {
    // ignorar duplicados
  }
}
