import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, type ZodSchema } from "zod";

export type Handler = (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void> | void;

export function withCors(handler: Handler): Handler {
  return async (req, res) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.CORS_ORIGIN ?? "*",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    await handler(req, res);
  };
}

export function methodNotAllowed(
  res: VercelResponse,
  allowed: readonly string[],
): void {
  res.setHeader("Allow", allowed.join(", "));
  res.status(405).json({ error: `Method not allowed. Allowed: ${allowed.join(", ")}` });
}

export function parseBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
):
  | { ok: true; data: T }
  | { ok: false; error: { error: string; details: unknown } } {
  try {
    return { ok: true, data: schema.parse(body) };
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        ok: false,
        error: { error: "Validation failed", details: e.flatten() },
      };
    }
    return { ok: false, error: { error: "Invalid request body", details: String(e) } };
  }
}

export function withErrorHandler(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Internal server error";
      console.error("[api]", req.method, req.url, e);
      if (!res.headersSent) {
        res.status(500).json({ error: msg });
      }
    }
  };
}
