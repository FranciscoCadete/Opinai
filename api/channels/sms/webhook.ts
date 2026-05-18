import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
} from "../../_lib/http";
import {
  buildPublicUrl,
  emptyTwiml,
  parseTwilioInboundSms,
  sendTwilioSms,
  twimlMessage,
  verifyTwilioSignature,
} from "../../_lib/twilio";
import { toPlainText } from "../../_lib/plainText";
import {
  handleIncomingMessage,
  recordOutgoing,
} from "../../_lib/conversation";

/**
 * Twilio webhook entrega payload em application/x-www-form-urlencoded.
 * @vercel/node parses isso para req.body como objecto. NumMedia, MessageSid,
 * From, Body, etc. estão todos lá como strings.
 */
export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("[sms] TWILIO_AUTH_TOKEN not configured");
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }

    const fullUrl =
      process.env.TWILIO_WEBHOOK_URL_OVERRIDE ?? buildPublicUrl(req);
    const skipSig = process.env.TWILIO_SKIP_SIGNATURE === "true";
    if (!skipSig && !verifyTwilioSignature(req, authToken, fullUrl)) {
      console.warn("[sms] invalid signature for", fullUrl);
      res.setHeader("Content-Type", "text/plain");
      res.status(401).send("Invalid signature");
      return;
    }

    const inbound = parseTwilioInboundSms(
      req.body as Record<string, unknown> | undefined,
    );
    if (!inbound) {
      res.status(400).json({ error: "Invalid Twilio payload" });
      return;
    }

    if (inbound.numMedia > 0 && !inbound.body.trim()) {
      // Mensagem só com mídia: respondemos via TwiML rapidamente
      res.setHeader("Content-Type", "text/xml");
      res
        .status(200)
        .send(
          twimlMessage(
            "Recebi a sua mensagem. De momento aceito apenas texto. Envie 'ajuda' para comecar.",
          ),
        );
      return;
    }

    try {
      const reply = await handleIncomingMessage({
        channel: "sms",
        externalId: inbound.from,
        providerMessageId: inbound.messageSid,
        text: inbound.body,
        rawPayload: req.body,
        contactName: null,
      });

      if (!reply) {
        // duplicado — Twilio fará retry; respondemos vazio
        res.setHeader("Content-Type", "text/xml");
        res.status(200).send(emptyTwiml());
        return;
      }

      const plain = toPlainText(reply.text, 1500);

      // Enviar via REST API (mais flexível: permite mensagens longas split,
      // tracking explícito do SID). Respondemos TwiML vazio.
      try {
        const sent = await sendTwilioSms(inbound.from, plain);
        await recordOutgoing(
          "sms",
          inbound.from,
          plain,
          sent.messageSid,
        );
      } catch (e) {
        console.error("[sms] outbound failed, falling back to TwiML", e);
        res.setHeader("Content-Type", "text/xml");
        res.status(200).send(twimlMessage(plain));
        return;
      }

      res.setHeader("Content-Type", "text/xml");
      res.status(200).send(emptyTwiml());
    } catch (e) {
      console.error("[sms] handler error", e);
      // Twilio reprocessa em 5xx — preferimos 200 + TwiML de erro silencioso
      res.setHeader("Content-Type", "text/xml");
      res.status(200).send(emptyTwiml());
    }
  }),
);
