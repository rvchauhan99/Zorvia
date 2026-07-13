"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { email, otp, new_password: newPassword });
      toast.success("Password updated. You can log in now.");
      router.replace("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream animate-fade-in-up flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md card-tinted p-6 sm:p-8 flex flex-col gap-4">
        <h1 className="font-display font-black text-3xl">Reset password</h1>
        <p className="text-sm text-muted-foreground">Enter the code from your email and choose a new password.</p>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Email</span>
          <input data-testid="reset-email" required type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Reset code</span>
          <input data-testid="reset-otp" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className={`${input} tracking-widest font-mono text-center text-lg`} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">New password</span>
          <input data-testid="reset-password" required type="password" minLength={6} className={input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Confirm password</span>
          <input data-testid="reset-confirm-password" required type="password" minLength={6} className={input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </label>
        <button data-testid="reset-submit" disabled={submitting} className="pill-btn btn-primary h-12 disabled:opacity-60 cursor-pointer">
          {submitting ? "Saving…" : "Update password"}
        </button>
        <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline">Resend code</Link>
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">Back to login</Link>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream p-10 text-muted-foreground">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
