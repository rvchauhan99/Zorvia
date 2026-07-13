import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, clearSession, getSession, saveSession } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!getSession()) return;
    try {
      const { data } = await api.get("/auth/me");
      // No-op currently — keep session as saved.
      return data;
    } catch {
      clearSession();
      setSession(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      saveSession(data);
      setSession(getSession());
      return data;
    } finally {
      setLoading(false);
    }
  };

  const providerSignup = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/provider/signup", payload);
      saveSession(data);
      setSession(getSession());
      return data;
    } finally {
      setLoading(false);
    }
  };

  const consumerSignup = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/consumer/signup", payload);
      saveSession(data);
      setSession(getSession());
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, login, providerSignup, consumerSignup, logout, refresh, setSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
