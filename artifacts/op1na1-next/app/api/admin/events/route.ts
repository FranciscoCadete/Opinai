import { NextRequest } from "next/server";
import { unauthorized, forbidden } from "@/lib/server/response";
import { getSessionUser } from "@/lib/server/auth";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const ROLE_RANK: Record<string, number> = { citizen: 0, technician: 1, manager: 2, admin: 3 };

// Node.js runtime required — pg (postgres) uses fs/path/stream which Edge doesn't support
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!DEMO_MODE) {
    const session = await getSessionUser();
    if (!session) return unauthorized();
    if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK.technician) return forbidden();
  }

  const lastEventId = req.headers.get("last-event-id") ?? "0";

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      function send(event: string, data: unknown, id?: string) {
        let chunk = "";
        if (id) chunk += `id: ${id}\n`;
        chunk += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(enc.encode(chunk));
      }

      // Initial ping so the browser registers the connection as open
      send("ping", { ts: Date.now() }, lastEventId);

      if (!DEMO_MODE) {
        // Production: poll DB every 2.5 s for ~8 s then close (browser reconnects)
        try {
          const { db } = await import("@workspace/db");
          const { requests } = await import("@workspace/db/schema");
          const { sql } = await import("drizzle-orm");

          let lastId = parseInt(lastEventId, 10) || 0;

          for (let tick = 0; tick < 3; tick++) {
            await new Promise(r => setTimeout(r, 2500));
            const rows = await db.select().from(requests)
              .where(sql`id > ${lastId}`)
              .orderBy(sql`id asc`)
              .limit(20);

            for (const row of rows) {
              send("request.new", row, String(row.id));
              lastId = Math.max(lastId, Number(row.id));
            }

            send("ping", { ts: Date.now() });
          }
        } catch {
          send("ping", { ts: Date.now() });
        }
      } else {
        // Demo: just keep alive with pings
        await new Promise(r => setTimeout(r, 8000));
        send("ping", { ts: Date.now() });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
