import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db, citizenRequestsTable, bairrosTable } from "@workspace/db";
import type { PublicCitizenRequest } from "@workspace/api-zod";
import { withCors, withErrorHandler, methodNotAllowed } from "../_lib/http";
import { isValidTicketId } from "../_lib/ticketId";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const id = req.query.id;
    const ticketId = Array.isArray(id) ? id[0] : id;
    if (!ticketId || !isValidTicketId(ticketId)) {
      res.status(400).json({ error: "Invalid ticket id" });
      return;
    }

    const row = await db
      .select({
        ticketId: citizenRequestsTable.ticketId,
        type: citizenRequestsTable.type,
        status: citizenRequestsTable.status,
        priority: citizenRequestsTable.priority,
        category: citizenRequestsTable.category,
        description: citizenRequestsTable.description,
        channel: citizenRequestsTable.channel,
        bairroName: bairrosTable.name,
        createdAt: citizenRequestsTable.createdAt,
        updatedAt: citizenRequestsTable.updatedAt,
        resolvedAt: citizenRequestsTable.resolvedAt,
      })
      .from(citizenRequestsTable)
      .leftJoin(bairrosTable, eq(citizenRequestsTable.bairroId, bairrosTable.id))
      .where(eq(citizenRequestsTable.ticketId, ticketId))
      .limit(1);

    if (row.length === 0) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const r = row[0];
    const body: PublicCitizenRequest = {
      ticketId: r.ticketId,
      type: r.type,
      status: r.status,
      priority: r.priority,
      category: r.category,
      description: r.description,
      channel: r.channel,
      bairroName: r.bairroName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    };
    res.status(200).json(body);
  }),
);
