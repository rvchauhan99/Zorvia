"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, Users, Truck, Receipt, DotsThree, SignOut, ChartLine, Sparkle, Warning, CreditCard } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { isAdmin, isDriver as roleIsDriver, canMutateAdmin, staffRole } from "@/lib/roles";
import NotificationBell from "@/components/NotificationBell";
import { PageLoader } from "@/components/loaders";
import { SUBSCRIPTION_REFRESH_EVENT } from "@/lib/subscription-events";

const allItems = [
  { to: "/provider", label: "Dashboard", icon: House, testid: "nav-dashboard", end: true },
  { to: "/provider/customers", label: "Customers", icon: Users, testid: "nav-customers" },
  { to: "/provider/deliveries", label: "Deliveries", icon: Truck, testid: "nav-deliveries" },
  { to: "/provider/payments", label: "Payments", icon: Receipt, testid: "nav-payments" },
  { to: "/provider/more", label: "More", icon: DotsThree, testid: "nav-more" },
];

function NavItem({ to, label, icon: Icon, testid, end, pathname, badge }: any) {
  const isActive = end ? pathname === to : pathname.startsWith(to);
  return (
    <Link
      href={to}
      data-testid={testid}
      className={`relative flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[44px] py-1.5 text-[11px] font-medium transition-colors duration-150 ${
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="relative">
        <Icon size={22} weight={isActive ? "fill" : "regular"} />
        {badge > 0 ? (
          <span data-testid={`${testid}-badge`} className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function SideBadge({ count, testid }: { count: number; testid: string }) {
  if (!count) return null;
  return (
    <span data-testid={testid} className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function ProviderShell({ children }: { children: React.ReactNode }) {
  const { session, logout, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sub, setSub] = useState<any>(null);
  const [badges, setBadges] = useState({ pendingPayments: 0, pendingCustomers: 0 });
  const [isDesktop, setIsDesktop] = useState(false);

  const role = staffRole(session);
  const isDriver = roleIsDriver(session);
  const canMutate = canMutateAdmin(session);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const items = useMemo(() => {
    if (isDriver) {
      return allItems.filter((it) => it.to === "/provider/deliveries");
    }
    return allItems;
  }, [isDriver]);

  useEffect(() => {
    if (!ready) return;
    if (!session || session.user_type !== "provider") {
      router.replace("/login");
      return;
    }
    if (isDriver && !pathname.startsWith("/provider/deliveries")) {
      router.replace("/provider/deliveries");
      return;
    }
    if (!isAdmin(session) && (pathname.startsWith("/provider/settings") || pathname.startsWith("/provider/subscription") || pathname.startsWith("/provider/menu"))) {
      router.replace(isDriver ? "/provider/deliveries" : "/provider");
    }
  }, [ready, session, router, isDriver, pathname]);

  const loadSub = useCallback(() => {
    if (session?.user_type === "provider" && canMutate) {
      api.get("/providers/me/subscription").then(({ data }) => setSub(data)).catch(() => {});
    }
  }, [session, canMutate]);

  const loadBadges = useCallback(() => {
    if (session?.user_type !== "provider" || isDriver) return;
    api.get("/providers/me/nav-badges")
      .then(({ data }) => {
        setBadges({
          pendingPayments: data?.pending_payments || 0,
          pendingCustomers: data?.pending_approvals || 0,
        });
      })
      .catch(() => {});
  }, [session, isDriver]);

  useEffect(() => {
    loadSub();
    const id = setInterval(loadSub, 60000);
    const onRefresh = () => loadSub();
    window.addEventListener(SUBSCRIPTION_REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener(SUBSCRIPTION_REFRESH_EVENT, onRefresh);
    };
  }, [loadSub]);

  useEffect(() => {
    loadBadges();
    const id = setInterval(loadBadges, 45000);
    return () => clearInterval(id);
  }, [loadBadges]);

  if (!ready && !session) {
    return <PageLoader testid="provider-shell-loading" className="min-h-screen bg-brand-cream" />;
  }

  if (ready && (!session || session.user_type !== "provider")) {
    return null;
  }

  if (!session || session.user_type !== "provider") {
    return <PageLoader testid="provider-shell-loading" className="min-h-screen bg-brand-cream" />;
  }

  const status = sub?.status;
  const daysLeft = sub?.days_left;
  const onSubscriptionPage = pathname.startsWith("/provider/subscription");
  const hasPaidPlan = Boolean(sub?.subscription?.plan || sub?.tier);
  const renewDue =
    status === "active" &&
    (typeof sub?.renewal_due === "boolean"
      ? sub.renewal_due
      : typeof daysLeft === "number" && daysLeft <= 5);
  const banner = !canMutate || onSubscriptionPage
    ? null
    : renewDue
      ? {
          tone: "renew" as const,
          text:
            daysLeft === 0
              ? "Plan expires today"
              : `Plan expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          sub: "Renew now so your kitchen stays unlocked without interruption.",
          cta: "Renew plan",
        }
      : status === "trialing"
        ? {
            tone: "trial" as const,
            text: `Free trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
            sub: "Pick a plan any time to avoid interruption.",
            cta: "Choose plan",
          }
        : status === "expired"
          ? {
              tone: "expired" as const,
              text: hasPaidPlan ? "Plan expired" : "Trial ended",
              sub: "Choose a plan to continue using MealHQ.",
              cta: "Choose plan",
            }
          : null;

  return (
    <div className="min-h-screen bg-brand-cream text-foreground overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-brand-border bg-white flex-col p-6 gap-2">
        <div className="mb-6 flex items-start justify-between gap-2">
          <div>
            <img
              src="/brand/mealhq-logo-horizontal.png"
              alt="MealHQ"
              className="h-9 w-auto"
              data-testid="provider-brand-logo"
            />
            <div className="text-xs text-muted-foreground mt-1">{session?.display_name}</div>
            {role !== "admin" ? <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{role}</div> : null}
          </div>
          <div className="hidden lg:block">
            {isDesktop ? <NotificationBell testid="provider-notification-bell" /> : null}
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {(isDriver ? items : items.slice(0, 4)).map((it) => {
            const isActive = it.end ? pathname === it.to : pathname.startsWith(it.to);
            const badge =
              it.to === "/provider/payments" ? badges.pendingPayments
              : it.to === "/provider/customers" ? badges.pendingCustomers
              : 0;
            return (
              <Link
                key={it.to}
                href={it.to}
                data-testid={`side-${it.testid}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
                }`}
              >
                <it.icon size={20} />
                {it.label}
                <SideBadge count={badge} testid={`side-${it.testid}-badge`} />
              </Link>
            );
          })}
          {!isDriver ? (
            <>
              <Link
                href="/provider/analysis"
                data-testid="side-nav-analysis"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  pathname.startsWith("/provider/analysis") ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
                }`}
              >
                <ChartLine size={20} /> Analysis
              </Link>
              <Link
                href="/provider/reports"
                data-testid="side-nav-reports"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  pathname.startsWith("/provider/reports") ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
                }`}
              >
                <ChartLine size={20} /> Reports
              </Link>
              {canMutate ? (
                <Link
                  href="/provider/subscription"
                  data-testid="side-nav-subscription"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    pathname.startsWith("/provider/subscription") ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
                  }`}
                >
                  <CreditCard size={20} /> Subscription
                </Link>
              ) : null}
              {canMutate ? (
                <Link
                  href="/provider/settings"
                  data-testid="side-nav-settings"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    pathname.startsWith("/provider/settings") ? "bg-brand-surface text-primary" : "text-foreground hover:bg-brand-surface"
                  }`}
                >
                  <DotsThree size={20} /> Settings
                </Link>
              ) : null}
            </>
          ) : null}
        </nav>
        <div className="mt-auto">
          <button
            data-testid="side-logout-btn"
            onClick={() => { void logout().then(() => router.push("/login")); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <SignOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <main className="lg:pl-64 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
        <div className="lg:hidden sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-brand-border pt-[env(safe-area-inset-top,0px)] px-4 py-2 flex items-center justify-between">
          <img
            src="/brand/mealhq-logo-horizontal.png"
            alt="MealHQ"
            className="h-8 w-auto"
            data-testid="provider-brand-logo-mobile"
          />
          <div className="lg:hidden">
            {!isDesktop ? <NotificationBell testid="provider-notification-bell-mobile" /> : null}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {banner ? (
            <div
              data-testid={`trial-banner-${banner.tone}`}
              className={`mb-5 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${
                banner.tone === "expired"
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : banner.tone === "renew"
                    ? "bg-amber-50/80 border border-amber-200 text-foreground"
                    : "bg-secondary/10 border border-secondary/30 text-foreground"
              }`}
            >
              {banner.tone === "expired" || banner.tone === "renew" ? (
                <Warning
                  size={22}
                  weight="fill"
                  className={`shrink-0 ${banner.tone === "renew" ? "text-amber-700" : "text-primary"}`}
                />
              ) : (
                <Sparkle size={22} weight="fill" className="text-secondary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{banner.text}</div>
                <div className="text-xs text-muted-foreground">{banner.sub}</div>
              </div>
              <button
                data-testid="banner-cta"
                onClick={() => router.push("/provider/subscription")}
                className={`pill-btn h-11 min-h-[44px] w-full sm:w-auto ${
                  banner.tone === "expired" || banner.tone === "renew" ? "btn-primary" : "btn-outline"
                } shrink-0 cursor-pointer`}
              >
                {banner.cta}
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        data-testid="provider-bottom-nav"
        className="glass-nav fixed bottom-0 inset-x-0 z-40 lg:hidden flex justify-around items-stretch min-h-16 pt-1 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {items.map((it) => (
          <NavItem
            key={it.to}
            {...it}
            pathname={pathname}
            badge={
              it.to === "/provider/payments" ? badges.pendingPayments
              : it.to === "/provider/customers" ? badges.pendingCustomers
              : 0
            }
          />
        ))}
        {isDriver ? (
          <button
            data-testid="nav-logout"
            onClick={() => { void logout().then(() => router.push("/login")); }}
            className="flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[44px] py-1.5 text-[11px] font-medium text-destructive"
          >
            <SignOut size={22} />
            <span>Logout</span>
          </button>
        ) : null}
      </nav>
    </div>
  );
}
