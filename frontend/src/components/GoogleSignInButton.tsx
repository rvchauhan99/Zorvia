"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { firebaseReady, signInWithGoogleAndGetIdToken } from "@/lib/firebase";
import { api, saveSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Props = {
  user_type?: "provider" | "consumer";
  org_name?: string;
  signup_code?: string;
  label?: string;
  onSuccess?: (session: any) => void;
  className?: string;
  disabled?: boolean;
  testid?: string;
};

/** Official multicolor Google "G" — do not recolor (Google Identity branding). */
function GoogleGIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export default function GoogleSignInButton({
  user_type = "provider",
  org_name,
  signup_code,
  label,
  onSuccess,
  className = "",
  disabled = false,
  testid = "google-signin-btn",
}: Props) {
  const { setSession } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // firebaseReady is false on the server (window check) and true on the client when configured —
  // defer to after mount so SSR HTML matches the first client render.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(firebaseReady);
  }, []);

  async function click() {
    if (!ready) {
      toast.error("Google sign-in isn't set up yet.");
      return;
    }
    setLoading(true);
    try {
      const { idToken } = await signInWithGoogleAndGetIdToken();
      const payload: any = { id_token: idToken, user_type };
      if (org_name) payload.org_name = org_name;
      if (signup_code) payload.signup_code = signup_code;

      const { data } = await api.post("/auth/google", payload);
      saveSession(data);
      setSession({
        user_type: data.user_type, user_id: data.user_id, tenant_id: data.tenant_id,
        display_name: data.display_name, email: data.email,
        access_token: data.access_token
      });
      toast.success(`Welcome, ${data.display_name}`);

      if (onSuccess) {
        onSuccess(data);
      } else {
        router.replace(data.user_type === "provider" ? "/provider" : "/consumer");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Google sign-in failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      data-testid={testid}
      onClick={click}
      disabled={disabled || loading || !ready}
      className={`inline-flex h-11 w-full items-center justify-center gap-3 rounded-md bg-[#4285F4] px-4 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#3367D6] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      title={!ready ? "Google sign-in isn't configured yet" : undefined}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-white">
        <GoogleGIcon size={16} />
      </span>
      {loading ? "Opening Google…" : (label || "Continue with Google")}
    </button>
  );
}
