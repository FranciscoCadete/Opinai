import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withErrorHandler, methodNotAllowed } from "../_lib/http";
import { clearSessionCookie, getSession } from "../_lib/auth";
import { db, auditLogTable } from "@workspace/db";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const session = await getSession(req);
    if (session) {
      await db.insert(auditLogTable).values({
        actorUserId: session.sub,
        action: "auth.logout",
        entityType: "user",
        entityId: session.sub,
      });
    }

    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  }),
);
