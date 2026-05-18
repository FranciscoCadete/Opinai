import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
} from "../../_lib/http";
import {
  handleVerifyHandshake,
  verifyMetaSignature,
  sendMessengerText,
  type MessengerWebhookEntry,
} from "../../_lib/meta";
import {
  handleIncomingMessage,
  recordOutgoing,
} from "../../_lib/conversation";

export default withErrorHandler(
  withCors(async (req: VercelRequest, res: VercelResponse) => {
    // Subscription verification (GET handshake)
    if (req.method === "GET") {
      const expected = process.env.MESSENGER_VERIFY_TOKEN;
      if (!expected) {
        res
          .status(500)
          .json({ error: "MESSENGER_VERIFY_TOKEN not configured" });
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

    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("[messenger] META_APP_SECRET not configured");
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }
    if (!verifyMetaSignature(req, appSecret)) {
      console.warn("[messenger] invalid signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const body = req.body as {
      object?: string;
      entry?: MessengerWebhookEntry[];
    };
    if (body.object !== "page") {
      res.status(400).json({ error: "Unexpected webhook object" });
      return;
    }

    const tasks: Promise<void>[] = [];

    for (const entry of body.entry ?? []) {
      for (const m of entry.messaging ?? []) {
        const senderId = m.sender?.id;
        if (!senderId) continue;

        const text = m.message?.text ?? m.postback?.payload;
        const messageId =
          m.message?.mid ?? m.postback?.mid ?? `psb_${m.timestamp}_${senderId}`;
        if (!text) {
          tasks.push(
            (async () => {
              try {
                await sendMessengerText(
                  senderId,
                  "Recebi a sua mensagem. De momento aceito apenas texto — escreva 'ajuda' para começar.",
                );
              } catch (e) {
                console.error("[messenger] reply error", e);
              }
            })(),
          );
          continue;
        }

        tasks.push(
          (async () => {
            try {
              const reply = await handleIncomingMessage({
                channel: "messenger",
                externalId: senderId,
                providerMessageId: messageId,
                text,
                rawPayload: m,
                contactName: null,
              });
              if (!reply) return;
              const sent = await sendMessengerText(senderId, reply.text);
              await recordOutgoing(
                "messenger",
                senderId,
                reply.text,
                sent.messageId,
              );
            } catch (e) {
              console.error("[messenger] handler error", e);
            }
          })(),
        );
      }
    }

    await Promise.allSettled(tasks);
    res.status(200).json({ ok: true });
  }),
);
