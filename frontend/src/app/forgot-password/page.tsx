"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If an account exists, a reset code was sent.");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream animate-fade-in-up flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md card-tinted p-6 sm:p-8 flex flex-col gap-4">
        <h1 className="font-display font-black text-3xl">Forgot password</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll email a one-time code to reset or set your password (works for Google-only accounts too).</p>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Email</span>
          <input data-testid="forgot-email" required type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <button data-testid="forgot-submit" disabled={submitting} className="pill-btn btn-primary h-12 disabled:opacity-60 cursor-pointer">
          {submitting ? "Sending…" : "Send reset code"}
        </button>
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">Back to login</Link>
      </form>
    </div>
  );
}
