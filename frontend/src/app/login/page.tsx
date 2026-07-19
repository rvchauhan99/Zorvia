"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { resolveAppHome } from "@/lib/roles";
import GoogleSignInButton from "@/components/GoogleSignInButton";

type LoginRole = "provider" | "consumer";

function parseRole(raw: string | null): LoginRole {
  return raw === "consumer" ? "consumer" : "provider";
}

function LoginForm() {
  const { login, session, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<LoginRole>(() => parseRole(searchParams.get("role")));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRole(parseRole(searchParams.get("role")));
  }, [searchParams]);

  useEffect(() => {
    if (!ready || !session) return;
    router.replace(resolveAppHome(session, searchParams.get("next")));
  }, [ready, session, router, searchParams]);

  const copy = useMemo(
    () =>
      role === "provider"
        ? {
            panelTitle: "Log in and get today's route.",
            panelBody: "Your customers, deliveries, and Interac reconciliation — all in one workspace.",
            title: "Welcome back",
            subtitle: "Sign in to your kitchen workspace.",
            signupHref: "/signup",
            signupLabel: "New kitchen? Create a workspace",
            signupTestId: "login-to-signup" as const,
          }
        : {
            panelTitle: "Your meals and balance, in one place.",
            panelBody: "See upcoming deliveries, track outstanding, and submit Interac references.",
            title: "Welcome back",
            subtitle: "Sign in to your meal account.",
            signupHref: "/consumer-signup",
            signupLabel: "New here? Sign up with your kitchen's code",
            signupTestId: "login-to-consumer-signup" as const,
          },
    [role],
  );

  function selectRole(next: LoginRole) {
    setRole(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "provider") params.delete("role");
    else params.set("role", "consumer");
    const q = params.toString();
    router.replace(q ? `/login?${q}` : "/login", { scroll: false });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const s = await login({ email, password });
      toast.success(`Welcome back, ${s.display_name}`);
      router.replace(resolveAppHome(s, searchParams.get("next")));
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
          <div className="font-display font-black text-4xl leading-tight">{copy.panelTitle}</div>
          <p className="mt-3 text-white/80">{copy.panelBody}</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-80" data-testid="login-brand">
            <img
              src="/brand/mealhq-logo-horizontal.png"
              alt="MealHQ"
              className="h-11 w-auto"
            />
          </Link>

          <div
            className="mt-6 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-brand-surface border border-brand-border"
            role="tablist"
            aria-label="Account type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === "provider"}
              data-testid="login-role-provider"
              onClick={() => selectRole("provider")}
              className={`h-11 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                role === "provider"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              I run a kitchen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === "consumer"}
              data-testid="login-role-consumer"
              onClick={() => selectRole("consumer")}
              className={`h-11 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                role === "consumer"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              I order meals
            </button>
          </div>

          <h1 className="font-display font-bold text-3xl mt-6">{copy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>

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

          <GoogleSignInButton
            user_type={role}
            label="Continue with Google"
            testid={role === "provider" ? "google-login-provider" : "google-login-consumer"}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Same email works for Google and password.
          </p>

          <div className="mt-8 text-sm text-muted-foreground">
            <Link
              data-testid={copy.signupTestId}
              href={copy.signupHref}
              className="text-primary font-medium hover:underline"
            >
              {copy.signupLabel}
            </Link>
            {/* Keep both testids discoverable for e2e when inactive */}
            {role === "provider" ? (
              <span className="sr-only">
                <Link data-testid="login-to-consumer-signup" href="/consumer-signup">Sign up with a provider code</Link>
              </span>
            ) : (
              <span className="sr-only">
                <Link data-testid="login-to-signup" href="/signup">Create a workspace</Link>
              </span>
            )}
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
