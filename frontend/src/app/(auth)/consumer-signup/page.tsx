"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { trackEvent } from "@/lib/ga";
import { resolveAppHome } from "@/lib/roles";

function ConsumerSignupForm() {
  const { consumerSignup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    trackEvent("signup_start", { flow: "consumer" });
  }, []);
  const [form, setForm] = useState({
    signup_code: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const code = (searchParams.get("code") || searchParams.get("signup_code") || "").trim().toUpperCase();
    if (!code) return;
    setForm((f) => ({ ...f, signup_code: code || f.signup_code }));
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { confirm_password: _, ...rest } = form;
      const s = await consumerSignup(rest);
      trackEvent("consumer_signup");
      toast.success(`Welcome, ${s.display_name || "there"}`);
      router.replace(resolveAppHome(s));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";
  const label = "flex flex-col gap-1.5";

  return (
    <div className="min-h-screen bg-brand-cream animate-fade-in-up">
      <div className="max-w-md mx-auto p-6 sm:p-10">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back home</Link>
        <h1 className="font-display font-black text-4xl mt-4 leading-tight">
          Sign up with your<br /><span className="text-secondary">kitchen code</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Ask your kitchen for their kitchen code. You must already be on their customer list with this phone number.
        </p>

        <form onSubmit={onSubmit} className="mt-8 card-tinted p-6 sm:p-8 flex flex-col gap-5">
          <label className={label}>
            <span className="label-overline">Kitchen code</span>
            <input
              data-testid="csignup-code"
              required
              className={`${input} uppercase tracking-widest font-medium`}
              value={form.signup_code}
              onChange={upd("signup_code")}
              placeholder="Your kitchen's code"
              aria-label="Kitchen code"
            />
          </label>
          <label className={label}>
            <span className="label-overline">Phone</span>
            <input
              data-testid="csignup-phone"
              required
              type="tel"
              className={input}
              value={form.phone}
              onChange={upd("phone")}
              placeholder="416-555-1212"
              aria-label="Phone number"
            />
          </label>
          <label className={label}>
            <span className="label-overline">Password</span>
            <input
              data-testid="csignup-password"
              required
              type="password"
              minLength={6}
              className={input}
              value={form.password}
              onChange={upd("password")}
              placeholder="min 6 chars"
              aria-label="Password"
            />
          </label>
          <label className={label}>
            <span className="label-overline">Verify password</span>
            <input
              data-testid="csignup-confirm-password"
              required
              type="password"
              minLength={6}
              className={input}
              value={form.confirm_password}
              onChange={upd("confirm_password")}
              placeholder="re-enter password"
              aria-label="Verify password"
            />
          </label>
          <button data-testid="csignup-submit" disabled={submitting} className="pill-btn btn-secondary h-12 disabled:opacity-60 cursor-pointer">
            {submitting ? "Creating account..." : "Create account"}
          </button>
          <div className="text-sm text-muted-foreground mt-2">
            Already have an account?{" "}
            <Link href="/login?role=consumer" className="text-primary font-medium hover:underline">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ConsumerSignup() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream p-10 text-muted-foreground">Loading…</div>}>
      <ConsumerSignupForm />
    </Suspense>
  );
}
