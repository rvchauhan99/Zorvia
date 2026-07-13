"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ForkKnife, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";

function LoginForm() {
  const { login, session, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    const next = searchParams.get("next");
    const fallback = session.user_type === "provider" ? "/provider" : "/consumer";
    const dest =
      next && (next.startsWith("/provider") || next.startsWith("/consumer"))
        ? next
        : fallback;
    router.replace(dest);
  }, [ready, session, router, searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const s = await login({ email, password });
      toast.success(`Welcome back, ${s.display_name}`);
      const next = searchParams.get("next");
      const fallback = s.user_type === "provider" ? "/provider" : "/consumer";
      const dest =
        next && (next.startsWith("/provider") || next.startsWith("/consumer"))
          ? next
          : fallback;
      router.replace(dest);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Login failed";
      toast.error(detail);
      if (err?.response?.status === 403 && String(detail).toLowerCase().includes("not verified")) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream flex animate-fade-in-up">
      <div className="hidden lg:block relative flex-1">
        <img
          alt="Tiffin lunchbox"
          src="https://images.unsplash.com/photo-1781747835478-a9c3bab5a670?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjB0aWZmaW4lMjBsdW5jaCUyMGJveCUyMGZvb2R8ZW58MHx8fHwxNzgzOTI0ODk3fDA&ixlib=rb-4.1.0&q=85"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white max-w-md">
          <div className="font-display font-black text-4xl leading-tight">Log in and get today&apos;s route.</div>
          <p className="mt-3 text-white/80">Your customers, deliveries, and Interac reconciliation — all in one workspace.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ForkKnife size={18} /> <span className="font-bold">Zorvia</span>
          </Link>
          <h1 className="font-display font-bold text-3xl mt-6">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Log in to your provider or consumer account.</p>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Email</span>
              <input
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Password</span>
              <input
                data-testid="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </label>
            <div className="flex justify-end -mt-2">
              <Link data-testid="login-forgot" href="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              data-testid="login-submit"
              disabled={submitting}
              className="pill-btn btn-primary h-12 mt-2 gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Signing in..." : (<>Sign in <ArrowRight size={18} weight="bold" /></>)}
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-brand-border" /> OR <div className="flex-1 h-px bg-brand-border" />
          </div>
          <GoogleSignInButton user_type="provider" label="Continue with Google (Provider)" testid="google-login-provider" />
          <p className="text-xs text-muted-foreground mt-2">
            Providers: use Google above. Consumers: use email/password after signing up with a provider code, or{" "}
            <Link href="/consumer-signup" className="text-secondary font-medium underline-offset-2 hover:underline">join with a signup code</Link>.
          </p>
          <div className="mt-6 p-4 rounded-2xl bg-brand-surface border border-brand-border text-sm">
            <div className="font-medium text-foreground">Looking for the consumer portal?</div>
            <div className="text-muted-foreground mt-1">Log in with the email you used at signup, or create an account with your kitchen&apos;s code.</div>
            <Link data-testid="login-consumer-cta" href="/consumer-signup" className="inline-flex mt-3 pill-btn btn-outline h-10 text-sm">
              Consumer sign up
            </Link>
          </div>
          <div className="mt-6 text-sm text-muted-foreground flex flex-col gap-1">
            <div>New provider? <Link data-testid="login-to-signup" href="/signup" className="text-primary font-medium hover:underline">Create a workspace</Link></div>
            <div>New consumer? <Link data-testid="login-to-consumer-signup" href="/consumer-signup" className="text-secondary font-medium hover:underline">Sign up with a provider code</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream" />}>
      <LoginForm />
    </Suspense>
  );
}
