import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ForkKnife, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const s = await login({ email, password });
      toast.success(`Welcome back, ${s.display_name}`);
      nav(s.user_type === "provider" ? "/provider" : "/consumer", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream flex">
      <div className="hidden lg:block relative flex-1">
        <img
          alt="Tiffin"
          src="https://images.unsplash.com/photo-1781747835478-a9c3bab5a670?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjB0aWZmaW4lMjBsdW5jaCUyMGJveCUyMGZvb2R8ZW58MHx8fHwxNzgzOTI0ODk3fDA&ixlib=rb-4.1.0&q=85"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white max-w-md">
          <div className="font-display font-black text-4xl leading-tight">Log in and get today's route.</div>
          <p className="mt-3 text-white/80">Your customers, deliveries, and Interac reconciliation — all in one workspace.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ForkKnife size={18} /> Tiffin<span className="text-primary font-bold">OS</span>
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
                className="h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
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
                className="h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                placeholder="••••••••"
              />
            </label>
            <button
              data-testid="login-submit"
              disabled={submitting}
              className="pill-btn btn-primary h-12 mt-2 gap-2 disabled:opacity-60"
            >
              {submitting ? "Signing in..." : (<>Sign in <ArrowRight size={18} weight="bold" /></>)}
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-brand-border" /> OR <div className="flex-1 h-px bg-brand-border" />
          </div>
          <GoogleSignInButton user_type="provider" label="Continue with Google (Provider)" testid="google-login-provider" />
          <div className="text-xs text-muted-foreground mt-2">Consumers using Google should sign up with their provider's code first.</div>
          <div className="mt-6 text-sm text-muted-foreground flex flex-col gap-1">
            <div>New provider? <Link data-testid="login-to-signup" to="/signup" className="text-primary font-medium">Create a workspace</Link></div>
            <div>New consumer? <Link data-testid="login-to-consumer-signup" to="/consumer-signup" className="text-secondary font-medium">Sign up with a provider code</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}
