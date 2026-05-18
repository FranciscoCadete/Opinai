"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { DEMO_MODE, demoLogin, demoLogout, demoGetMe } from "./demo";

export type UserRole = "citizen" | "technician" | "manager" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  municipalityId: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function getMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function postLogin(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Login failed (${res.status})`);
  }
  return res.json();
}

async function postLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = DEMO_MODE ? demoGetMe() : await getMe();
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    if (DEMO_MODE) {
      const u = demoLogin(email, password);
      setUser(u);
      return u;
    }
    const u = await postLogin(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    if (DEMO_MODE) {
      demoLogout();
      setUser(null);
      return;
    }
    await postLogout();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

// Guard component: redirects to /login if not authenticated or role insufficient
const ROLE_RANK: Record<UserRole, number> = {
  citizen: 0,
  technician: 1,
  manager: 2,
  admin: 3,
};

export function RequireAuth({
  minRole = "technician",
  children,
}: {
  minRole?: UserRole;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if ((ROLE_RANK[user.role] ?? 0) < ROLE_RANK[minRole]) {
      router.replace("/admin");
    }
  }, [user, loading, router, minRole]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontSize: 13,
          color: "#6b7d96",
        }}
      >
        A verificar sessão…
      </div>
    );
  }

  if (!user) return null;
  if ((ROLE_RANK[user.role] ?? 0) < ROLE_RANK[minRole]) return null;

  return <>{children}</>;
}
