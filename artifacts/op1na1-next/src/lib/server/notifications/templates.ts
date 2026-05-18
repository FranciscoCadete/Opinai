export type NotifiableStatus =
  | "triaged"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "rejected";

export type Lang = "pt-AO" | "kmb" | "umb";

export interface NotificationTemplate {
  subject: string;
  body: string;
  // WhatsApp approved template name + ordered params (max 3)
  whatsappTemplate: { name: string; params: string[] };
}

interface TemplateContext {
  ticketId: string;
  contactName: string;
  statusLabel: string;
  note?: string;
  resolvedAt?: string;
}

// Status labels in each language
const STATUS_LABELS: Record<NotifiableStatus, Record<Lang, string>> = {
  triaged:     { "pt-AO": "em triagem",     kmb: "em triagem",     umb: "em triagem" },
  assigned:    { "pt-AO": "atribuído",      kmb: "atribuído",      umb: "atribuído" },
  in_progress: { "pt-AO": "em progresso",   kmb: "em progresso",   umb: "em progresso" },
  resolved:    { "pt-AO": "resolvido",      kmb: "resolvido",      umb: "resolvido" },
  rejected:    { "pt-AO": "rejeitado",      kmb: "rejeitado",      umb: "rejeitado" },
};

// Whether a status transition warrants a citizen notification
export const NOTIFY_ON_STATUS: Set<NotifiableStatus> = new Set([
  "in_progress",
  "resolved",
  "rejected",
]);

export function getStatusLabel(status: NotifiableStatus, lang: Lang = "pt-AO"): string {
  return STATUS_LABELS[status]?.[lang] ?? status;
}

export function buildTemplate(
  status: NotifiableStatus,
  ctx: TemplateContext,
  lang: Lang = "pt-AO",
): NotificationTemplate {
  const label = getStatusLabel(status, lang);
  const name = ctx.contactName || "Cidadão";

  switch (status) {
    case "in_progress":
      return {
        subject: `Pedido ${ctx.ticketId} — Em progresso`,
        body: [
          `Olá ${name},`,
          "",
          `O seu pedido **${ctx.ticketId}** está agora ${label}.`,
          ctx.note ? `Nota: ${ctx.note}` : "",
          "",
          "Pode acompanhar o estado em op1na1.mulenvos.ao",
          "",
          "Município dos Mulenvos · OP1NA1",
        ].filter(l => l !== null && (l !== "" || true)).join("\n"),
        whatsappTemplate: {
          name: "op1na1_status_update",
          params: [ctx.ticketId, label, ctx.note ?? "A ser processado pela equipa técnica."],
        },
      };

    case "resolved":
      return {
        subject: `Pedido ${ctx.ticketId} — Resolvido ✓`,
        body: [
          `Olá ${name},`,
          "",
          `O seu pedido **${ctx.ticketId}** foi **resolvido**.`,
          ctx.note ? `Resolução: ${ctx.note}` : "",
          "",
          "Obrigado por contribuir para a melhoria do nosso Município.",
          "Pode submeter um novo pedido em qualquer altura.",
          "",
          "Município dos Mulenvos · OP1NA1",
        ].join("\n"),
        whatsappTemplate: {
          name: "op1na1_status_update",
          params: [ctx.ticketId, label, ctx.note ?? "O problema foi tratado com sucesso."],
        },
      };

    case "rejected":
      return {
        subject: `Pedido ${ctx.ticketId} — Não pode ser processado`,
        body: [
          `Olá ${name},`,
          "",
          `Lamentamos informar que o seu pedido **${ctx.ticketId}** foi ${label}.`,
          ctx.note ? `Motivo: ${ctx.note}` : "Contacte os nossos serviços para mais informações.",
          "",
          "Se considerar que houve um engano, pode submeter um novo pedido.",
          "",
          "Município dos Mulenvos · OP1NA1",
        ].join("\n"),
        whatsappTemplate: {
          name: "op1na1_status_update",
          params: [ctx.ticketId, label, ctx.note ?? "Não foi possível processar este pedido."],
        },
      };

    default:
      return {
        subject: `Pedido ${ctx.ticketId} — Actualização`,
        body: `Olá ${name}, o estado do pedido ${ctx.ticketId} foi actualizado para: ${label}.`,
        whatsappTemplate: {
          name: "op1na1_status_update",
          params: [ctx.ticketId, label, ""],
        },
      };
  }
}
