import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

const COOKIE_NAME = "op1na1_session";

type UserRole = "citizen" | "technician" | "manager" | "admin";

const ROLE_RANK: Record<UserRole, number> = {
  citizen: 0, technician: 1, manager: 2, admin: 3,
};

// A "superadmin" is an admin whose municipalityId is null (global scope).
// Used only on /superadmin/* and /api/super/* routes.
function isSuperAdmin(payload: JWTPayload & { role?: string; municipalityId?: string | null }): boolean {
  return payload.role === "admin" && (payload.municipalityId == null || payload.municipalityId === "");
}

// Routes that require authentication and their minimum role
const PROTECTED: Array<{ pattern: RegExp; minRole: UserRole; superAdminOnly?: boolean }> = [
  { pattern: /^\/superadmin(\/|$)/, minRole: "admin", superAdminOnly: true },
  { pattern: /^\/api\/super\//,     minRole: "admin", superAdminOnly: true },
  { pattern: /^\/admin\/users(\/|$)/, minRole: "manager" },
  { pattern: /^\/admin\/audit(\/|$)/, minRole: "manager" },
  { pattern: /^\/admin\/channels(\/|$)/, minRole: "manager" },
  { pattern: /^\/admin(\/|$)/, minRole: "technician" },
  { pattern: /^\/api\/admin\//, minRole: "technician" },
];

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rule = PROTECTED.find((r) => r.pattern.test(pathname));
  if (!rule) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Demo mode: bypass JWT check but still pass through headers for context
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const res = NextResponse.next();
    res.headers.set("x-municipality-id",   "d-muni-001");
    res.headers.set("x-municipality-slug", "mulenvos");
    return res;
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify<JWTPayload & {
      role: UserRole;
      municipalityId?: string | null;
      email?: string;
      name?: string;
    }>(token, getSecret());

    const userRank     = ROLE_RANK[payload.role] ?? -1;
    const requiredRank = ROLE_RANK[rule.minRole];

    if (userRank < requiredRank) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Superadmin-only routes
    if (rule.superAdminOnly && !isSuperAdmin(payload)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Forward identity + municipality context to route handlers via headers
    const res = NextResponse.next();
    res.headers.set("x-user-id",           String(payload.sub ?? ""));
    res.headers.set("x-user-role",         payload.role);
    res.headers.set("x-user-email",        String(payload.email ?? ""));
    res.headers.set("x-user-name",         String(payload.name ?? ""));
    res.headers.set("x-municipality-id",   String(payload.municipalityId ?? ""));
    return res;
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/superadmin/:path*",
    "/api/super/:path*",
  ],
};
