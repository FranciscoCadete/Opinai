import {
  buildTemplate,
  NOTIFY_ON_STATUS,
  type NotifiableStatus,
} from "./templates";
import { sendWhatsAppTemplate } from "./channels/whatsapp";
import { sendSms, toPlainText } from "./channels/sms";
import { sendEmail, buildHtml } from "./channels/email";

export interface NotificationRequest {
  ticketId: string;
  /** Original channel used to submit the request */
  channel: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isAnonymous: boolean;
  newStatus: string;
  previousStatus: string;
  /** Optional note added by the technician */
  note?: string;
}

export interface NotificationResult {
  sent: boolean;
  channel?: string;
  error?: string;
}

/**
 * Sends a proactive status-update notification to the citizen.
 *
 * Rules:
 *  - Anonymous requests never receive notifications (no contact info stored)
 *  - Only meaningful transitions trigger a notification (NOTIFY_ON_STATUS)
 *  - Channel selection mirrors the citizen's original submission channel
 *  - If the primary channel fails, falls back to the next available
 *  - All errors are caught and logged — never throws to the caller
 */
export async function notifyStatusChange(
  req: NotificationRequest,
): Promise<NotificationResult> {
  // Guard: anonymous or no status change worth notifying
  if (req.isAnonymous) return { sent: false, error: "anonymous" };
  if (!NOTIFY_ON_STATUS.has(req.newStatus as NotifiableStatus)) {
    return { sent: false, error: "status_not_notifiable" };
  }
  if (req.newStatus === req.previousStatus) {
    return { sent: false, error: "status_unchanged" };
  }

  const status = req.newStatus as NotifiableStatus;
  const template = buildTemplate(status, {
    ticketId: req.ticketId,
    contactName: req.contactName ?? "Cidadão",
    statusLabel: status,
    note: req.note,
  });

  const phone = req.contactPhone ?? null;
  const email = req.contactEmail ?? null;

  // ── WhatsApp ───────────────────────────────────────────────────
  if (req.channel === "whatsapp" && phone) {
    const result = await sendWhatsAppTemplate({
      to: phone,
      templateName: template.whatsappTemplate.name,
      params: template.whatsappTemplate.params,
    });
    if (result.ok) return { sent: true, channel: "whatsapp" };
    console.warn(`[notify] WhatsApp failed for ${req.ticketId}:`, result.error);
    // Fall through to SMS
  }

  // ── SMS ────────────────────────────────────────────────────────
  // Used for: sms channel, ussd channel, or WhatsApp fallback
  if ((req.channel === "sms" || req.channel === "ussd" || req.channel === "whatsapp") && phone) {
    const plain = toPlainText(template.body);
    const result = await sendSms(phone, plain);
    if (result.ok) return { sent: true, channel: "sms" };
    console.warn(`[notify] SMS failed for ${req.ticketId}:`, result.error);
  }

  // ── Email ──────────────────────────────────────────────────────
  // Used for: portal/messenger channels, or when SMS fails
  if (email) {
    const plain = toPlainText(template.body);
    const html  = buildHtml(template.subject, template.body);
    const result = await sendEmail({ to: email, subject: template.subject, text: plain, html });
    if (result.ok) return { sent: true, channel: "email" };
    console.warn(`[notify] Email failed for ${req.ticketId}:`, result.error);
  }

  // ── Phone-only fallback for portal/messenger ───────────────────
  if ((req.channel === "portal" || req.channel === "messenger") && phone && !email) {
    const plain = toPlainText(template.body);
    const result = await sendSms(phone, plain);
    if (result.ok) return { sent: true, channel: "sms" };
    console.warn(`[notify] SMS fallback failed for ${req.ticketId}:`, result.error);
  }

  return { sent: false, error: "no_reachable_channel" };
}
