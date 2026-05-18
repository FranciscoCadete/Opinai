import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, auditLogTable } from "@workspace/db";
import { LoginInput, type SessionUserResponse } from "@workspace/api-zod";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
  parseBody,
} from "../_lib/http";
import { signSession, setSessionCookie } from "../_lib/auth";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const parsed = parseBody(LoginInput, req.body);
    if (!parsed.ok) {
      res.status(400).json(parsed.error);
      return;
    }
    const { email, password } = parsed.data;

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email.toLowerCase()),
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.role === "citizen") {
      res.status(403).json({
        error: "This endpoint is for institutional access only.",
      });
      return;
    }

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      municipalityId: user.municipalityId,
    });

    setSessionCookie(res, token);

    await db.insert(auditLogTable).values({
      actorUserId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        null,
      userAgent: (req.headers["user-agent"] as string) ?? null,
    });

    const body: SessionUserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      municipalityId: user.municipalityId,
    };
    res.status(200).json(body);
  }),
);
