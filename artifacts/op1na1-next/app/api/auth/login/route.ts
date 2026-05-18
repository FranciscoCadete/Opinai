import { NextRequest } from "next/server";
import { ok, err, forbidden } from "@/lib/server/response";
import { signSession, setSessionCookie } from "@/lib/server/auth";
import type { UserRole } from "@/lib/auth";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// In demo mode we resolve against static credentials; in production this
// queries @workspace/db via bcrypt comparison.
const DEMO_USERS: {
  id: string; email: string; name: string; role: UserRole;
  passwordHash: string; municipalityId: string | null;
}[] = [
  { id: "u-admin-1",   email: "admin@mulenvos.ao",   name: "Administrador Demo",  role: "admin",      passwordHash: "demo1234", municipalityId: "mun-mulenvos" },
  { id: "u-manager-1", email: "gestor@mulenvos.ao",  name: "Gestor Demo",          role: "manager",    passwordHash: "demo1234", municipalityId: "mun-mulenvos" },
  { id: "u-tech-1",    email: "tecnico@mulenvos.ao", name: "Técnico Demo",          role: "technician", passwordHash: "demo1234", municipalityId: "mun-mulenvos" },
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err("Corpo inválido", 400); }

  if (typeof body !== "object" || !body) return err("Corpo inválido", 400);
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return err("email e password obrigatórios", 400);

  if (DEMO_MODE) {
    const user = DEMO_USERS.find(u => u.email === email.trim().toLowerCase() && u.passwordHash === password);
    if (!user) return forbidden();

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      municipalityId: user.municipalityId,
    });
    await setSessionCookie(token);
    return ok({ id: user.id, email: user.email, name: user.name, role: user.role, municipalityId: user.municipalityId });
  }

  // Production: import db and bcrypt
  try {
    const { db } = await import("@workspace/db");
    const { users } = await import("@workspace/db/schema");
    const bcrypt = await import("bcryptjs");
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!user) return forbidden();
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return forbidden();

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      municipalityId: user.municipalityId,
    });
    await setSessionCookie(token);
    return ok({ id: user.id, email: user.email, name: user.name, role: user.role, municipalityId: user.municipalityId });
  } catch (e) {
    console.error("[login]", e);
    return err("Erro interno", 500);
  }
}
