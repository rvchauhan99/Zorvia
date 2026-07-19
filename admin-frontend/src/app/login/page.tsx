"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlatformAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, session, ready } = usePlatformAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success("Signed in");
      router.replace("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">MealHQ platform</div>
          <h1 className="text-2xl font-bold mt-1">Admin sign in</h1>
          <p className="text-sm text-neutral-500 mt-1">Review SaaS Interac payments from providers.</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Email</span>
          <input
            data-testid="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 px-4 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Password</span>
          <input
            data-testid="admin-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 px-4 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </label>
        <button
          data-testid="admin-login"
          type="submit"
          disabled={busy}
          className="h-12 rounded-full bg-teal-700 text-white font-semibold disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
