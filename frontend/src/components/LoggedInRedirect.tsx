"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { resolveAppHome } from "@/lib/roles";

/** When a session exists, send the user into their app home (provider or consumer). */
export default function LoggedInRedirect() {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !session) return;
    router.replace(resolveAppHome(session));
  }, [ready, session, router]);

  return null;
}
