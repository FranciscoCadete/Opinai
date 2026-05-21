import { NextRequest } from "next/server";
import { ok, err } from "@/lib/server/response";
import { sendSmsConfirmation, sendWhatsappConfirmation } from "@/lib/twilio";
import { logChannelEvent, maskPhone } from "@/lib/channel-log";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** Short ticket format: OP100–OP999 (matches CitizenPortal UI) */
function genTicketId(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
}

/**
 * Fire-and-forget SMS/WhatsApp confirmation.
 * Never throws — a notification failure must not block the 201 response.
 */
async function notifyAsync(
  phone:    string | undefined,
  channel:  string | undefined,
  ticketId: string
): Promise<void> {
  if (!phone) return;
  try {
    if (channel === "whatsapp") {
      await sendWhatsappConfirmation(phone, ticketId);
    } else {
      await sendSmsConfirmation(phone, ticketId);
    }
  } catch (e) {
    console.warn("[requests] SMS notification failed (non-fatal):", e);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err("Corpo inválido", 400); }

  if (DEMO_MODE) {
    const now      = new Date().toISOString();
    const ticketId = genTicketId();
    const b        = body as Record<string, string> | null ?? {};
    // Best-effort SMS — won't throw even if Twilio not configured
    void notifyAsync(b["phone"] ?? b["phoneNumber"], b["channel"], ticketId);
    logChannelEvent({ channel: "portal", direction: "in", status: "ok", action: "ticket_created", ticketId, phoneTail: maskPhone(b["phone"] ?? b["phoneNumber"]), durationMs: 0 });
    return ok({ ticketId, status: "received", priority: "normal", createdAt: now }, 201);
  }

  try {
    const { db } = await import("@workspace/db");
    const { citizenRequestsTable: requests } = await import("@workspace/db/schema");
    const { createRequestSchema } = await import("@workspace/api-zod");

    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) return err("Dados inválidos", 422, parsed.error.flatten());

    const now      = new Date();
    const ticketId = genTicketId();
    const [row] = await db.insert(requests).values({
      ...parsed.data,
      ticketId,
      status: "received",
      priority: "normal",
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Fire-and-forget SMS — doesn't block the 201
    void notifyAsync(
      (parsed.data as Record<string, string>)["phone"] ?? (parsed.data as Record<string, string>)["phoneNumber"],
      (parsed.data as Record<string, string>)["channel"],
      row.ticketId
    );

    return ok({ ticketId: row.ticketId, status: row.status, priority: row.priority, createdAt: row.createdAt }, 201);
  } catch (e) {
    console.error("[requests POST]", e);
    return err("Erro interno", 500);
  }
}
