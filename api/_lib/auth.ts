import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const COOKIE_NAME = "op1na1_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 horas

export type UserRole = "citizen" | "technician" | "manager" | "admin";

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  municipalityId: string | null;
};

export type SessionPayload = SessionUser & JWTPayload;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set and at least 32 characters long.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    municipalityId: user.municipalityId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(getSecret());
}

export async function verifySession(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      municipalityId: (payload.municipalityId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

function readCookie(req: VercelRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function getSession(
  req: VercelRequest,
): Promise<SessionUser | null> {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return await verifySession(auth.slice(7));
  }
  const cookie = readCookie(req, COOKIE_NAME);
  if (cookie) return await verifySession(cookie);
  return null;
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const isProd = process.env.VERCEL_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${TOKEN_TTL_SECONDS}`,
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res: VercelResponse): void {
  const isProd = process.env.VERCEL_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

const ROLE_RANK: Record<UserRole, number> = {
  citizen: 0,
  technician: 1,
  manager: 2,
  admin: 3,
};

export function hasRole(user: SessionUser, min: UserRole): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  min: UserRole,
): Promise<SessionUser | null> {
  const user = await getSession(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (!hasRole(user, min)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return null;
  }
  return user;
}
