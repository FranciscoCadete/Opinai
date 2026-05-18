import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
  type SessionUser,
  type UserRole,
} from "./api";
import { DEMO_MODE, demoLogin, demoLogout, demoGetMe } from "./demo";

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const me = DEMO_MODE ? demoGetMe() : await getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    if (DEMO_MODE) {
      const u = demoLogin(email, password);
      setUser(u);
      return u;
    }
    const u = await apiLogin(email, password);
    setUser(u);
    return u;
  }

  async function logout() {
    if (DEMO_MODE) {
      demoLogout();
      setUser(null);
      return;
    }
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const ROLE_RANK: Record<UserRole, number> = {
  citizen: 0,
  technician: 1,
  manager: 2,
  admin: 3,
};

export function hasRole(user: SessionUser | null, min: UserRole): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

export function RequireAuth({
  children,
  minRole = "technician",
  redirectTo = "/login",
}: {
  children: ReactNode;
  minRole?: UserRole;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !hasRole(user, minRole)) {
      navigate(redirectTo);
    }
  }, [loading, user, minRole, redirectTo, navigate]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          color: "#7a8c80",
          letterSpacing: "0.06em",
        }}
      >
        A verificar sessão…
      </div>
    );
  }

  if (!hasRole(user, minRole)) return null;
  return <>{children}</>;
}
