import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { House, Users, Truck, Receipt, DotsThree, SignOut, ChartLine, Sparkle, Warning, CreditCard } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const items = [
  { to: "/provider", label: "Dashboard", icon: House, testid: "nav-dashboard", end: true },
  { to: "/provider/customers", label: "Customers", icon: Users, testid: "nav-customers" },
  { to: "/provider/deliveries", label: "Deliveries", icon: Truck, testid: "nav-deliveries" },
  { to: "/provider/payments", label: "Payments", icon: Receipt, testid: "nav-payments" },
  { to: "/provider/more", label: "More", icon: DotsThree, testid: "nav-more" },
];

function NavItem({ to, label, icon: Icon, testid, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testid}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 min-w-[60px] py-1.5 text-[11px] font-medium transition-colors duration-150 ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} weight={isActive ? "fill" : "regular"} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function ProviderLayout() {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  const [sub, setSub] = useState(null);

  useEffect(() => {
    api.get("/providers/me/subscription").then(({ data }) => setSub(data)).catch(() => {});
    const id = setInterval(() => {
      api.get("/providers/me/subscription").then(({ data }) => setSub(data)).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const status = sub?.status;
  const daysLeft = sub?.days_left;
  const banner = status === "trialing"
    ? { tone: "trial", text: `Free trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, sub: "Pick a plan any time to avoid interruption.", cta: "Choose plan" }
    : status === "expired"
    ? { tone: "expired", text: "Trial ended", sub: "Choose a plan to continue using Tiffin OS.", cta: "Choose plan" }
    : null;

  return (
    <div className="min-h-screen bg-brand-cream text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-brand-border bg-white flex-col p-6 gap-2">
        <div className="mb-6">
          <div className="font-display font-black text-2xl tracking-tight">Tiffin<span className="text-primary">OS</span></div>
          <div className="text-xs text-muted-foreground mt-1">{session?.display_name}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {items.slice(0, 4).map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`side-${it.testid}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
                }`
              }
            >
              <it.icon size={20} />
              {it.label}
            </NavLink>
          ))}
          <NavLink
            to="/provider/reports"
            data-testid="side-nav-reports"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                isActive ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
              }`
            }
          >
            <ChartLine size={20} /> Reports
          </NavLink>
          <NavLink
            to="/provider/subscription"
            data-testid="side-nav-subscription"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                isActive ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
              }`
            }
          >
            <CreditCard size={20} /> Subscription
          </NavLink>
          <NavLink
            to="/provider/settings"
            data-testid="side-nav-settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                isActive ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
              }`
            }
          >
            <DotsThree size={20} /> Settings
          </NavLink>
        </nav>
        <div className="mt-auto">
          <button
            data-testid="side-logout-btn"
            onClick={() => { logout(); nav("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-brand-surface hover:text-foreground transition-colors"
          >
            <SignOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <main className="lg:pl-64 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {banner ? (
            <div
              data-testid={`trial-banner-${banner.tone}`}
              className={`mb-5 rounded-2xl p-4 sm:p-5 flex items-center gap-4 ${
                banner.tone === "expired"
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : "bg-secondary/10 border border-secondary/30 text-foreground"
              }`}
            >
              {banner.tone === "expired" ? <Warning size={22} weight="fill" className="text-primary shrink-0" /> : <Sparkle size={22} weight="fill" className="text-secondary shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{banner.text}</div>
                <div className="text-xs text-muted-foreground">{banner.sub}</div>
              </div>
              <button
                data-testid="banner-cta"
                onClick={() => nav("/provider/subscription")}
                className={`pill-btn h-10 ${banner.tone === "expired" ? "btn-primary" : "btn-outline"} shrink-0`}
              >
                {banner.cta}
              </button>
            </div>
          ) : null}
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        data-testid="provider-bottom-nav"
        className="glass-nav fixed bottom-0 inset-x-0 z-40 lg:hidden flex justify-around items-stretch h-16 pb-[env(safe-area-inset-bottom,0)]"
      >
        {items.map((it) => (
          <NavItem key={it.to} {...it} />
        ))}
      </nav>
    </div>
  );
}
