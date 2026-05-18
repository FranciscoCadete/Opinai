import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import {
  db,
  citizenRequestsTable,
  municipalitiesTable,
  bairrosTable,
  auditLogTable,
} from "@workspace/db";
import {
  SubmitCitizenRequestInput,
  type SubmitCitizenRequestResponse,
} from "@workspace/api-zod";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
  parseBody,
} from "../_lib/http";
import { generateTicketId } from "../_lib/ticketId";
import { classifyHeuristic, finalClassification } from "../_lib/classify";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const parsed = parseBody(SubmitCitizenRequestInput, req.body);
    if (!parsed.ok) {
      res.status(400).json(parsed.error);
      return;
    }
    const input = parsed.data;

    const slug = input.municipalitySlug ?? "mulenvos";
    const muni = await db.query.municipalitiesTable.findFirst({
      where: eq(municipalitiesTable.slug, slug),
    });
    if (!muni) {
      res.status(404).json({ error: `Municipality "${slug}" not found` });
      return;
    }

    let bairroId = input.bairroId ?? null;
    if (!bairroId && input.bairroName) {
      const bairro = await db.query.bairrosTable.findFirst({
        where: eq(bairrosTable.name, input.bairroName),
      });
      bairroId = bairro?.id ?? null;
    }

    const ticketId = generateTicketId();
    const heuristic = classifyHeuristic(input.type, input.description);
    const classification = await finalClassification(
      input.type,
      input.description,
      input.category,
    );

    const [created] = await db
      .insert(citizenRequestsTable)
      .values({
        ticketId,
        municipalityId: muni.id,
        bairroId,
        type: input.type,
        category: classification.category,
        description: input.description,
        contactName: input.isAnonymous ? null : input.contactName ?? null,
        contactPhone: input.isAnonymous ? null : input.contactPhone ?? null,
        isAnonymous: input.isAnonymous,
        channel: input.channel,
        gpsLat: input.gpsLat != null ? input.gpsLat.toString() : null,
        gpsLng: input.gpsLng != null ? input.gpsLng.toString() : null,
        locationReference: input.locationReference ?? null,
        priority: classification.priority,
      })
      .returning({
        ticketId: citizenRequestsTable.ticketId,
        status: citizenRequestsTable.status,
        priority: citizenRequestsTable.priority,
        createdAt: citizenRequestsTable.createdAt,
      });

    await db.insert(auditLogTable).values({
      action: "request.submitted",
      entityType: "citizen_request",
      entityId: created.ticketId,
      payload: {
        channel: input.channel,
        type: input.type,
        heuristic: { priority: heuristic },
        nlp: classification.nlp,
        final: {
          priority: classification.priority,
          category: classification.category,
          isCrisis: classification.isCrisis,
        },
      },
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        null,
      userAgent: (req.headers["user-agent"] as string) ?? null,
    });

    const body: SubmitCitizenRequestResponse = {
      ticketId: created.ticketId,
      status: created.status,
      priority: created.priority,
      createdAt: created.createdAt.toISOString(),
    };
    res.status(201).json(body);
  }),
);
