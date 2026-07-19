"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  api,
  clearPlatformSession,
  loadPlatformSession,
  savePlatformSession,
  type PlatformSession,
} from "./api";

type AuthCtx = {
  session: PlatformSession | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<PlatformSession>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PlatformSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cached = loadPlatformSession();
    const token = typeof window !== "undefined" ? localStorage.getItem("mealhq_platform_token") : null;
    if (!cached || !token) {
      setReady(true);
      return;
    }
    api
      .get("/platform/auth/me")
      .then(({ data }) => {
        setSession({
          user_type: "platform",
          user_id: data.user_id,
          email: data.email,
          display_name: data.display_name,
        });
      })
      .catch(() => {
        clearPlatformSession();
        setSession(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/platform/auth/login", { email, password });
    const s: PlatformSession = {
      user_type: "platform",
      user_id: data.user_id,
      email: data.email,
      display_name: data.display_name,
      access_token: data.access_token,
    };
    savePlatformSession(s);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    clearPlatformSession();
    setSession(null);
  }, []);

  return <Ctx.Provider value={{ session, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function usePlatformAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlatformAuth outside provider");
  return v;
}
