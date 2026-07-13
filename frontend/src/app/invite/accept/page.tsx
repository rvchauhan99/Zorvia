"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";

function InviteAcceptForm() {
  const search = useSearchParams();
  const token = search.get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("Missing invite token");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/auth/invite/accept", { token, password });
      toast.success("Check your email for a verification code");
      router.replace(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invite accept failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <form onSubmit={submit} className="w-full max-w-md card-tinted p-6 flex flex-col gap-4" data-testid="invite-accept-form">
      <div>
        <div className="font-display font-black text-2xl">Accept invite</div>
        <p className="text-sm text-muted-foreground mt-1">Set a password to join your tiffin provider.</p>
      </div>
      {!token ? (
        <p className="text-sm text-destructive">This link is missing an invite token.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Password</span>
            <input
              data-testid="invite-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Confirm password</span>
            <input
              data-testid="invite-confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={input}
            />
          </label>
          <button
            data-testid="invite-accept-submit"
            type="submit"
            disabled={busy}
            className="pill-btn btn-primary h-12 disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </>
      )}
    </form>
  );
}

export default function InviteAcceptPage() {
  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
        <InviteAcceptForm />
      </Suspense>
    </div>
  );
}
