"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePlatformAuth } from "@/lib/auth";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";

const NAV = [
  { href: "/", label: "Dashboard", testid: "nav-dashboard" },
  { href: "/tenants", label: "Tenants", testid: "nav-tenants" },
  { href: "/saas-payments", label: "SaaS payments", testid: "nav-saas" },
  { href: "/whatsapp-credits", label: "WhatsApp credits", testid: "nav-wa-credits", waOnly: true },
  { href: "/inbox", label: "Inbox", testid: "nav-inbox" },
  { href: "/reports", label: "Reports", testid: "nav-reports" },
];

export default function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { session, ready, logout } = usePlatformAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<number | null>(null);
  const [inboxNew, setInboxNew] = useState<number | null>(null);
  const [waEnabled, setWaEnabled] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    void fetchWhatsappFeaturesEnabled().then(setWaEnabled);
    api
      .get("/platform/dashboard")
      .then(({ data }) => {
        const n = data?.saas?.pending_review;
        if (typeof n === "number") setPending(n);
        const inbox = data?.inbox?.new;
        if (typeof inbox === "number") setInboxNew(inbox);
      })
      .catch(() => {});
  }, [ready, session, router, pathname]);

  if (!ready || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  const navItems = NAV.filter((item) => !item.waOnly || waEnabled);

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                MealHQ
              </div>
              <div className="font-bold">{title || "Platform admin"}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 hidden sm:inline truncate max-w-[180px]">
                {session.email}
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="h-10 px-4 rounded-full border border-neutral-200 text-sm cursor-pointer hover:bg-neutral-50"
                data-testid="admin-logout"
              >
                Sign out
              </button>
            </div>
          </div>
          <nav className="flex gap-1 flex-wrap" data-testid="admin-nav">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge =
                item.href === "/saas-payments"
                  ? pending
                  : item.href === "/inbox"
                    ? inboxNew
                    : null;
              const showBadge = badge != null && badge > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={item.testid}
                  className={`h-10 px-3.5 rounded-full text-sm font-medium border inline-flex items-center gap-1.5 ${
                    active
                      ? "bg-teal-700 text-white border-teal-700"
                      : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {item.label}
                  {showBadge ? (
                    <span
                      data-testid={item.href === "/inbox" ? "inbox-badge" : "pending-badge"}
                      className={`min-w-5 h-5 px-1 rounded-full text-[11px] font-bold inline-flex items-center justify-center ${
                        active ? "bg-white/20 text-white" : "bg-teal-700 text-white"
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">{children}</main>
    </div>
  );
}
