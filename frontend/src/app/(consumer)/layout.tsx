"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, Receipt, User, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

const items = [
  { to: "/consumer", label: "Home", icon: House, testid: "cnav-home", end: true },
  { to: "/consumer/payments", label: "Payments", icon: Receipt, testid: "cnav-payments" },
  { to: "/consumer/profile", label: "Profile", icon: User, testid: "cnav-profile" },
];

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const { session, logout, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session || session.user_type !== "consumer") {
      router.replace("/login");
    }
  }, [ready, session, router]);

  if (!ready || !session || session.user_type !== "consumer") {
    return null;
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
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[160px]">{session?.email}</span>
            <NotificationBell testid="consumer-notification-bell" />
            <button
              data-testid="consumer-logout-btn"
              onClick={() => { void logout().then(() => router.push("/login")); }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-surface transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
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
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
