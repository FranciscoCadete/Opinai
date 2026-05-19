import { NextRequest } from "next/server";
import { ok, err } from "@/lib/server/response";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err("Corpo inválido", 400); }

  if (DEMO_MODE) {
    const now = new Date().toISOString();
    const ticketId = `MUL-${Date.now().toString(36).toUpperCase()}`;
    return ok({ ticketId, status: "received", priority: "normal", createdAt: now }, 201);
  }

  try {
    const { db } = await import("@workspace/db");
    const { citizenRequestsTable: requests } = await import("@workspace/db/schema");
    const { createRequestSchema } = await import("@workspace/api-zod");

    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) return err("Dados inválidos", 422, parsed.error.flatten());

    const now = new Date();
    const ticketId = `MUL-${now.getTime().toString(36).toUpperCase()}`;
    const [row] = await db.insert(requests).values({
      ...parsed.data,
      ticketId,
      status: "received",
      priority: "normal",
      createdAt: now,
      updatedAt: now,
    }).returning();

    return ok({ ticketId: row.ticketId, status: row.status, priority: row.priority, createdAt: row.createdAt }, 201);
  } catch (e) {
    console.error("[requests POST]", e);
    return err("Erro interno", 500);
  }
}
