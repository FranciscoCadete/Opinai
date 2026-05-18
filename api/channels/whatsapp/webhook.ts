import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
} from "../../_lib/http";
import {
  handleVerifyHandshake,
  verifyMetaSignature,
  sendWhatsAppText,
  type WhatsAppWebhookEntry,
} from "../../_lib/meta";
import {
  handleIncomingMessage,
  recordOutgoing,
} from "../../_lib/conversation";

export default withErrorHandler(
  withCors(async (req: VercelRequest, res: VercelResponse) => {
    // Subscription verification (GET handshake)
    if (req.method === "GET") {
      const expected = process.env.WHATSAPP_VERIFY_TOKEN;
      if (!expected) {
        res.status(500).json({ error: "WHATSAPP_VERIFY_TOKEN not configured" });
        return;
      }
      const v = handleVerifyHandshake(req, expected);
      if (!v.ok) {
        res.status(v.status).json({ error: v.error });
        return;
      }
      res.status(200).send(v.challenge);
      return;
    }

    if (req.method !== "POST") {
      return methodNotAllowed(res, ["GET", "POST"]);
    }

    // Signature verification
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("[whatsapp] META_APP_SECRET not configured");
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }
    if (!verifyMetaSignature(req, appSecret)) {
      console.warn("[whatsapp] invalid signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const body = req.body as {
      object?: string;
      entry?: WhatsAppWebhookEntry[];
    };
    if (body.object !== "whatsapp_business_account") {
      res.status(400).json({ error: "Unexpected webhook object" });
      return;
    }

    // ACK fast (Meta will retry on non-2xx; aim to <10s but the actual
    // processing happens before we respond so duplicates dedup via DB unique).
    const tasks: Promise<void>[] = [];

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value?.messages || value.messages.length === 0) continue;

        const contactsByWaId = new Map<string, string | undefined>();
        for (const c of value.contacts ?? []) {
          contactsByWaId.set(c.wa_id, c.profile?.name);
        }

        for (const m of value.messages) {
          if (m.type !== "text" || !m.text?.body) {
            // Não-texto: confirmação suave
            tasks.push(
              (async () => {
                try {
                  await sendWhatsAppText(
                    m.from,
                    "Recebi a sua mensagem. De momento aceito apenas *texto* — descreva o problema ou envie *ajuda*.",
                  );
                } catch (e) {
                  console.error("[whatsapp] reply error", e);
                }
              })(),
            );
            continue;
          }

          tasks.push(
            (async () => {
              try {
                const reply = await handleIncomingMessage({
                  channel: "whatsapp",
                  externalId: m.from,
                  providerMessageId: m.id,
                  text: m.text!.body,
                  rawPayload: m,
                  contactName: contactsByWaId.get(m.from) ?? null,
                });
                if (!reply) return; // duplicado
                const sent = await sendWhatsAppText(m.from, reply.text);
                await recordOutgoing(
                  "whatsapp",
                  m.from,
                  reply.text,
                  sent.messageId,
                );
              } catch (e) {
                console.error("[whatsapp] handler error", e);
              }
            })(),
          );
        }
      }
    }

    // Wait for everything to land before responding (under 30s budget).
    await Promise.allSettled(tasks);
    res.status(200).json({ ok: true });
  }),
);
