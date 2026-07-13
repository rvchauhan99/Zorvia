"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gear, ChartLine, SignOut, ArrowRight, CreditCard } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { canMutateAdmin, isDriver } from "@/lib/roles";

export default function More() {
  const { logout, session } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<any[]>([]);
  const admin = canMutateAdmin(session);

  const items = useMemo(() => {
    const all = [
      { to: "/provider/reports", label: "Reports", icon: ChartLine, testid: "more-reports" },
      { to: "/provider/subscription", label: "Subscription", icon: CreditCard, testid: "more-subscription", adminOnly: true },
      { to: "/provider/settings", label: "Settings", icon: Gear, testid: "more-settings", adminOnly: true },
    ];
    return all.filter((it) => !it.adminOnly || admin);
  }, [admin]);

  useEffect(() => {
    if (isDriver(session)) {
      router.replace("/provider/deliveries");
      return;
    }
    api.get("/providers/me/activity", { params: { limit: 15 } })
      .then(({ data }) => setActivity(Array.isArray(data) ? data : []))
      .catch(() => setActivity([]));
  }, [session, router]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      <div>
        <span className="label-overline">Account · {session?.email}</span>
        <h1 className="font-display font-black text-3xl mt-1">More</h1>
      </div>
      <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
        {items.map((it) => (
          <li key={it.to}>
            <Link data-testid={it.testid} href={it.to} className="flex items-center gap-3 p-4 hover:bg-brand-surface transition-colors cursor-pointer">
              <it.icon size={22} />
              <span className="font-medium">{it.label}</span>
              <ArrowRight size={16} className="ml-auto text-muted-foreground" />
            </Link>
          </li>
        ))}
        <li>
          <button data-testid="more-logout" onClick={() => { void logout().then(() => router.push("/login")); }} className="w-full flex items-center gap-3 p-4 hover:bg-destructive/10 transition-colors text-left cursor-pointer text-destructive">
            <SignOut size={22} />
            <span className="font-medium">Sign out</span>
          </button>
        </li>
      </ul>

      <div className="card-tinted p-5 flex flex-col gap-3" data-testid="activity-section">
        <div>
          <h2 className="font-display font-bold text-xl">Recent activity</h2>
          <p className="text-sm text-muted-foreground mt-1">Login, settings, payments, and subscription events.</p>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
            {activity.map((a) => (
              <li key={a.id} className="px-4 py-3 bg-white flex flex-col gap-0.5" data-testid={`activity-row-${a.id}`}>
                <span className="font-medium text-sm">{a.action}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
