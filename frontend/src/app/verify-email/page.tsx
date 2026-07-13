"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api, saveSession, getSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/verify-email", { email, otp });
      saveSession(data);
      setSession(getSession());
      toast.success("Email verified");
      const pendingAvatar = typeof window !== "undefined" ? sessionStorage.getItem("pending_avatar") : null;
      if (pendingAvatar && data.user_type === "consumer") {
        try {
          const blob = await (await fetch(pendingAvatar)).blob();
          const fd = new FormData();
          fd.append("file", blob, "avatar.jpg");
          await api.post("/consumer/me/avatar", fd);
          sessionStorage.removeItem("pending_avatar");
        } catch {
          // non-fatal
        }
      }
      router.replace(data.user_type === "provider" ? "/provider" : "/consumer");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      toast.success("If an unverified account exists, a code was sent.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not resend");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream animate-fade-in-up flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md card-tinted p-6 sm:p-8 flex flex-col gap-4">
        <h1 className="font-display font-black text-3xl">Verify your email</h1>
        <p className="text-sm text-muted-foreground">Enter the 6-digit code we sent to your inbox.</p>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Email</span>
          <input data-testid="verify-email" required type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Verification code</span>
          <input data-testid="verify-otp" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className={`${input} tracking-widest font-mono text-center text-lg`} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
        </label>
        <button data-testid="verify-submit" disabled={submitting} className="pill-btn btn-primary h-12 disabled:opacity-60 cursor-pointer">
          {submitting ? "Verifying…" : "Verify email"}
        </button>
        <button type="button" data-testid="verify-resend" disabled={resending} onClick={resend} className="text-sm text-primary font-medium hover:underline disabled:opacity-60 cursor-pointer">
          {resending ? "Sending…" : "Resend code"}
        </button>
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">Back to login</Link>
      </form>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream p-10 text-muted-foreground">Loading…</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
