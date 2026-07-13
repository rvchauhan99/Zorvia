import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { House, Receipt, User, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

const items = [
  { to: "/consumer", label: "Home", icon: House, testid: "cnav-home", end: true },
  { to: "/consumer/payments", label: "Payments", icon: Receipt, testid: "cnav-payments" },
  { to: "/consumer/profile", label: "Profile", icon: User, testid: "cnav-profile" },
];

export default function ConsumerLayout() {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-brand-cream text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-brand-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="font-display font-black text-lg tracking-tight">Tiffin<span className="text-primary">OS</span></div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{session?.email}</span>
            <button
              data-testid="consumer-logout-btn"
              onClick={() => { logout(); nav("/login"); }}
              className="p-2 rounded-full hover:bg-brand-surface transition-colors"
              aria-label="Sign out"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>
      <nav
        data-testid="consumer-bottom-nav"
        className="glass-nav fixed bottom-0 inset-x-0 z-40 flex justify-around items-stretch h-16 pb-[env(safe-area-inset-bottom,0)]"
      >
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            data-testid={it.testid}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[64px] py-1.5 text-[11px] font-medium transition-colors duration-150 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <it.icon size={22} weight={isActive ? "fill" : "regular"} />
                <span>{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
