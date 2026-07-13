"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { api, clearSession, getSession, saveSession, UserSession } from "@/lib/api";

type AuthContextType = {
  session: UserSession | null;
  /** True after client has finished reading storage / validating session */
  ready: boolean;
  /** True while login/signup request is in flight */
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<UserSession>;
  providerSignup: (payload: Record<string, unknown>) => Promise<UserSession | { pending_email_verification: true; email: string; user_type: string }>;
  consumerSignup: (payload: Record<string, unknown>) => Promise<UserSession | { pending_email_verification: true; email: string; user_type: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
  setSession: React.Dispatch<React.SetStateAction<UserSession | null>>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function sessionFromMe(
  data: {
    user_type: "provider" | "consumer";
    tenant_id: string;
    user?: { id?: string; name?: string; email?: string; role?: string };
  },
  fallback: UserSession | null
): UserSession {
  return {
    user_type: data.user_type,
    user_id: data.user?.id || fallback?.user_id || "",
    tenant_id: data.tenant_id || fallback?.tenant_id || "",
    display_name: data.user?.name || fallback?.display_name || data.user?.email || "",
    email: data.user?.email || fallback?.email || "",
    role: (data.user?.role as UserSession["role"]) || fallback?.role || (data.user_type === "provider" ? "admin" : undefined),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      const existing = getSession();
      const next = sessionFromMe(data, existing);
      saveSession(next);
      setSession(getSession() || next);
      return data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        clearSession();
        setSession(null);
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const existing = getSession();
      if (existing && !cancelled) {
        setSession(existing);
      }
      try {
        const { data } = await api.get("/auth/me");
        if (cancelled) return;
        const next = sessionFromMe(data, existing);
        saveSession(next);
        setSession(getSession() || next);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          clearSession();
          if (!cancelled) setSession(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      saveSession(data);
      const next = getSession();
      setSession(next);
      return next!;
    } finally {
      setLoading(false);
    }
  }, []);

  const providerSignup = useCallback(async (payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/provider/signup", payload);
      if (data?.pending_email_verification) {
        return data as UserSession & { pending_email_verification: true; email: string; user_type: string };
      }
      saveSession(data);
      const next = getSession();
      setSession(next);
      return next!;
    } finally {
      setLoading(false);
    }
  }, []);

  const consumerSignup = useCallback(async (payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data } = await api.post("/consumer/signup", payload);
      if (data?.pending_email_verification) {
        return data as UserSession & { pending_email_verification: true; email: string; user_type: string };
      }
      saveSession(data);
      const next = getSession();
      setSession(next);
      return next!;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Cookie clear best-effort
    }
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, ready, loading, login, providerSignup, consumerSignup, logout, refresh, setSession }),
    [session, ready, loading, login, providerSignup, consumerSignup, logout, refresh],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
