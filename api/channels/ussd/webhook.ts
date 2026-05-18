import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
} from "../../_lib/http";
import { isFinalUssdReply, ussdScreen } from "../../_lib/plainText";
import {
  handleIncomingMessage,
  recordOutgoing,
} from "../../_lib/conversation";

/**
 * Africa's Talking USSD callback.
 *
 * Payload (application/x-www-form-urlencoded):
 *   sessionId        — ID da sessão USSD (única por marcação)
 *   serviceCode      — código USSD (ex.: *123#)
 *   phoneNumber      — número do utilizador (formato +244...)
 *   text             — input acumulado, separado por '*'.
 *                      "" no primeiro hit, "1" depois, "1*opção" depois...
 *
 * Resposta esperada: text/plain começando por:
 *   "CON ..." — manter sessão e mostrar texto
 *   "END ..." — terminar sessão
 *
 * Estratégia: re-usamos a mesma state machine do bot, mas o estado vive na DB
 * por (channel='ussd', externalId=phoneNumber). Em cada hit extraímos o último
 * segmento do `text` (após o último `*`) e tratamos como uma mensagem isolada.
 */

export const config = {
  api: {
    bodyParser: { sizeLimit: "256kb" },
  },
};

function isAuthorized(req: VercelRequest): boolean {
  const expected = process.env.USSD_SHARED_SECRET;
  if (!expected) return true; // shared secret é opcional (por defeito IP allowlist)
  const provided = (req.headers["x-shared-secret"] as string) ?? "";
  return provided === expected;
}

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    if (!isAuthorized(req)) {
      res.setHeader("Content-Type", "text/plain");
      res.status(401).send("END Acesso nao autorizado.");
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const sessionId = String(body.sessionId ?? "");
    const phoneNumber = String(body.phoneNumber ?? "");
    const fullText = String(body.text ?? "");

    if (!sessionId || !phoneNumber) {
      res.setHeader("Content-Type", "text/plain");
      res.status(400).send("END Pedido invalido.");
      return;
    }

    // Extrair o último input do utilizador (o que ele acabou de digitar)
    const segments = fullText.split("*");
    const lastInput = segments[segments.length - 1] ?? "";

    // Sintetizar um messageId único por hit para idempotência
    const providerMessageId = `${sessionId}#${segments.length}`;

    // Se a primeira interação está vazia, dar comando 'novo' implicitamente
    const userText = fullText === "" ? "novo" : lastInput;

    try {
      const reply = await handleIncomingMessage({
        channel: "ussd",
        externalId: phoneNumber,
        providerMessageId,
        text: userText,
        rawPayload: { sessionId, serviceCode: body.serviceCode, fullText },
        contactName: null,
      });

      if (!reply) {
        // duplicado — devolver continuar vazio
        res.setHeader("Content-Type", "text/plain");
        res.status(200).send("CON ...");
        return;
      }

      const plain = ussdScreen(reply.text);
      const final = isFinalUssdReply(reply.text);
      const responseText = `${final ? "END" : "CON"} ${plain}`;

      await recordOutgoing(
        "ussd",
        phoneNumber,
        plain,
        `${providerMessageId}_out`,
      );

      res.setHeader("Content-Type", "text/plain");
      res.status(200).send(responseText);
    } catch (e) {
      console.error("[ussd] handler error", e);
      res.setHeader("Content-Type", "text/plain");
      res.status(200).send("END Erro temporario. Tente mais tarde.");
    }
  }),
);
