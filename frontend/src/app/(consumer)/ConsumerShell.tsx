"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, Receipt, User, SignOut } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import NotificationBell from "@/components/NotificationBell";
import { PageLoader } from "@/components/loaders";

const items = [
  { to: "/consumer", label: "Home", icon: House, testid: "cnav-home", end: true },
  { to: "/consumer/payments", label: "Payments", icon: Receipt, testid: "cnav-payments" },
  { to: "/consumer/profile", label: "Profile", icon: User, testid: "cnav-profile" },
];

export default function ConsumerShell({ children }: { children: React.ReactNode }) {
  const { session, logout, ready, refresh, setSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session || session.user_type !== "consumer") {
      router.replace("/login?role=consumer");
    }
  }, [ready, session, router]);

  async function handleForcedPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPwBusy(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success("Password updated");
      const data = await refresh();
      const me = data as { must_change_password?: boolean };
      setSession((s) => (s ? { ...s, must_change_password: Boolean(me?.must_change_password) } : s));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not update password");
    } finally {
      setPwBusy(false);
    }
  }

  if (!ready && !session) {
    return <PageLoader testid="consumer-shell-loading" className="min-h-screen bg-brand-cream" />;
  }

  if (ready && (!session || session.user_type !== "consumer")) {
    return null;
  }

  if (!session || session.user_type !== "consumer") {
    return <PageLoader testid="consumer-shell-loading" className="min-h-screen bg-brand-cream" />;
  }

  if (session.must_change_password) {
    const input =
      "h-11 w-full px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6" data-testid="force-password-change">
        <form onSubmit={handleForcedPasswordChange} className="w-full max-w-md card-tinted p-6 flex flex-col gap-4">
          <h1 className="font-display font-bold text-2xl">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            Your kitchen reset your password. Enter the temporary password they gave you, then set a new one.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Temporary password</span>
            <input
              data-testid="force-pw-current"
              type="password"
              required
              className={input}
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">New password</span>
            <input
              data-testid="force-pw-new"
              type="password"
              required
              minLength={6}
              className={input}
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Verify new password</span>
            <input
              data-testid="force-pw-confirm"
              type="password"
              required
              minLength={6}
              className={input}
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
            />
          </label>
          <button
            type="submit"
            data-testid="force-pw-submit"
            disabled={pwBusy}
            className="pill-btn btn-primary h-12 disabled:opacity-60 cursor-pointer"
          >
            {pwBusy ? "Saving…" : "Update password"}
          </button>
          <button
            type="button"
            data-testid="force-pw-logout"
            onClick={() => { void logout().then(() => router.push("/login?role=consumer")); }}
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream text-foreground overflow-x-hidden">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-brand-border pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <img
            src="/brand/mealhq-logo-horizontal.png"
            alt="MealHQ"
            className="h-8 w-auto"
            data-testid="consumer-brand-logo"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[160px]">
              {session?.display_name || session?.phone || session?.email}
            </span>
            <NotificationBell testid="consumer-notification-bell" />
            <button
              data-testid="consumer-logout-btn"
              onClick={() => { void logout().then(() => router.push("/login?role=consumer")); }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-surface transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-3 py-3 sm:px-4 sm:py-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
      <nav
        data-testid="consumer-bottom-nav"
        className="glass-nav fixed bottom-0 inset-x-0 z-40 flex justify-around items-stretch min-h-16 pt-1 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {items.map((it) => {
          const isActive = it.end ? pathname === it.to : pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              href={it.to}
              data-testid={it.testid}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] py-1.5 text-[11px] font-medium transition-colors duration-150 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <it.icon size={22} weight={isActive ? "fill" : "regular"} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
