import React, { useState } from "react";
import { GoogleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { firebaseReady, signInWithGoogleAndGetIdToken } from "@/lib/firebase";
import { api, saveSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

/**
 * A pill-button that runs Firebase Google sign-in and exchanges the id_token
 * with the backend `/auth/google` endpoint.
 *
 * Props:
 *  - user_type: "provider" | "consumer"
 *  - org_name: string (required for new provider signup via Google)
 *  - signup_code: string (required for new consumer signup via Google)
 *  - label: optional custom label
 *  - onSuccess: callback (session) — defaults to redirecting to /provider or /consumer
 */
export default function GoogleSignInButton({
  user_type = "provider",
  org_name,
  signup_code,
  label,
  onSuccess,
  className = "",
  disabled = false,
  testid = "google-signin-btn",
}) {
  const { setSession } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  async function click() {
    if (!firebaseReady) {
      toast.error("Google sign-in isn't set up yet.");
      return;
    }
    setLoading(true);
    try {
      const { idToken } = await signInWithGoogleAndGetIdToken();
      const payload = { id_token: idToken, user_type };
      if (org_name) payload.org_name = org_name;
      if (signup_code) payload.signup_code = signup_code;
      const { data } = await api.post("/auth/google", payload);
      saveSession(data);
      setSession({
        user_type: data.user_type, user_id: data.user_id, tenant_id: data.tenant_id,
        display_name: data.display_name, email: data.email,
      });
      toast.success(`Welcome, ${data.display_name}`);
      if (onSuccess) onSuccess(data);
      else nav(data.user_type === "provider" ? "/provider" : "/consumer", { replace: true });
    } catch (e) {
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
      disabled={disabled || loading || !firebaseReady}
      className={`pill-btn h-11 w-full gap-2 bg-white border border-brand-border hover:bg-brand-surface disabled:opacity-50 ${className}`}
      title={!firebaseReady ? "Google sign-in isn't configured yet" : ""}
    >
      <GoogleLogo size={18} weight="bold" />
      {loading ? "Opening Google…" : (label || "Continue with Google")}
    </button>
  );
}
