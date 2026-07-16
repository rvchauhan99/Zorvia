"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { fmtCAD, fmtDate, todayISO } from "@/lib/format";
import { Truck, Receipt, CurrencyDollar, Users, ArrowRight, Copy, CheckCircle, Circle } from "@phosphor-icons/react";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";

const ONBOARD_KEY = "zorvia_provider_onboarded";

function StatCard({ icon: Icon, label, value, hint, tone = "primary", testid }: any) {
  const toneMap: any = {
    primary: "text-primary",
    secondary: "text-secondary",
    amber: "text-brand-amber",
    ink: "text-foreground",
  };
  return (
    <div data-testid={testid} className="stat-card card-tinted-hover">
      <div className="flex items-center justify-between">
        <span className="label-overline">{label}</span>
        <Icon size={22} className={toneMap[tone]} weight="duotone" />
      </div>
      <div className="font-display font-black text-2xl sm:text-3xl">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export default function ProviderDashboard() {
  const router = useRouter();
  const { session } = useAuth();
  const canQuickMark = canMutateAdmin(session);
  const [summary, setSummary] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [todayDeliveries, setTodayDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedOnboard, setDismissedOnboard] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: s }, { data: p }, { data: dels }] = await Promise.all([
        api.get("/reports/dashboard-summary"),
        api.get("/providers/me"),
        api.get(`/deliveries?date=${todayISO()}`),
      ]);
      setSummary(s);
      setProvider(p);
      setTodayDeliveries(
        [...dels].sort((a, b) => {
          const fa = String(a.postal_code || "").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZZZ";
          const fb = String(b.postal_code || "").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZZZ";
          if (fa !== fb) return fa.localeCompare(fb);
          return String(a.customer_name || "").localeCompare(String(b.customer_name || ""));
        })
      );
    } catch (e) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    try {
      setDismissedOnboard(localStorage.getItem(ONBOARD_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  const hasInterac = !!(provider?.interac_email || "").trim();
  const hasCustomers = (summary?.active_customers ?? 0) > 0 || (summary?.pending_customers ?? 0) > 0;
  const showChecklist = !dismissedOnboard && (!hasInterac || !hasCustomers);

  function dismissChecklist() {
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ }
    setDismissedOnboard(true);
  }

  async function markDelivery(id: string, status: string) {
    try {
      await api.patch(`/deliveries/${id}`, { status });
      toast.success(`Marked ${status}`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-3">
          {provider?.logo_url ? (
            <img src={provider.logo_url} alt="" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover border border-brand-border" data-testid="dashboard-logo" />
          ) : null}
          <div>
            <span className="label-overline">Today · {fmtDate(todayISO())}</span>
            <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Good day, {(provider?.name || "there").split(" ")[0]}</h1>
          </div>
        </div>
        {provider?.signup_code ? (
          <button
            data-testid="copy-signup-code"
            onClick={() => { navigator.clipboard.writeText(provider.signup_code); toast.success("Signup code copied"); }}
            className="inline-flex items-center gap-2 px-3 h-10 rounded-full bg-white border border-brand-border hover:bg-brand-surface text-sm cursor-pointer"
            title="Share this code with consumers"
          >
            <Copy size={16} /> Signup code: <span className="font-mono font-semibold">{provider.signup_code}</span>
          </button>
        ) : null}
      </div>

      {showChecklist ? (
        <div data-testid="onboarding-checklist" className="card-tinted p-4 sm:p-5 border border-brand-amber/30 bg-amber-50/40">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl">Get set up</h2>
              <p className="text-sm text-muted-foreground mt-1">A few steps so you can start delivering and collecting.</p>
            </div>
            <button data-testid="dismiss-onboarding" onClick={dismissChecklist} className="text-xs text-muted-foreground hover:underline cursor-pointer shrink-0">Dismiss</button>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              {hasInterac ? <CheckCircle size={20} className="text-secondary shrink-0" weight="fill" /> : <Circle size={20} className="text-muted-foreground shrink-0" />}
              <span className="flex-1">Add your Interac e-Transfer email</span>
              {!hasInterac ? (
                <button onClick={() => router.push("/provider/settings")} className="text-primary text-xs font-medium hover:underline cursor-pointer">Settings</button>
              ) : null}
            </li>
            <li className="flex items-center gap-3">
              {hasCustomers ? <CheckCircle size={20} className="text-secondary shrink-0" weight="fill" /> : <Circle size={20} className="text-muted-foreground shrink-0" />}
              <span className="flex-1">Add your first customer (or share your signup code)</span>
              {!hasCustomers ? (
                <button onClick={() => router.push("/provider/customers")} className="text-primary text-xs font-medium hover:underline cursor-pointer">Customers</button>
              ) : null}
            </li>
            <li className="flex items-center gap-3">
              <Circle size={20} className="text-muted-foreground shrink-0" />
              <span className="flex-1">Share your signup code with consumers</span>
              {provider?.signup_code ? (
                <button
                  onClick={() => { navigator.clipboard.writeText(provider.signup_code); toast.success("Copied"); }}
                  className="text-primary text-xs font-medium hover:underline cursor-pointer font-mono"
                >
                  {provider.signup_code}
                </button>
              ) : null}
            </li>
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard testid="stat-deliveries" icon={Truck} label="Today's Deliveries" value={summary?.deliveries?.total ?? "—"} hint={summary ? `${summary.deliveries.delivered} delivered · ${summary.deliveries.pending} pending` : ""} />
        <StatCard testid="stat-pending" icon={Receipt} label="Pending Payments" value={summary?.pending_payments ?? "—"} hint="Awaiting your verification" tone="amber" />
        <StatCard testid="stat-outstanding" icon={CurrencyDollar} label="Outstanding" value={fmtCAD(summary?.outstanding_total ?? 0)} hint="Across all customers" tone="ink" />
        <StatCard testid="stat-collections" icon={Users} label="Today's Collections" value={fmtCAD(summary?.collections_today?.amount ?? 0)} hint={`${summary?.collections_today?.count ?? 0} verified today`} tone="secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 card-tinted p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg sm:text-xl">Today's route</h2>
            <button data-testid="go-deliveries" onClick={() => router.push("/provider/deliveries")} className="text-sm text-primary inline-flex items-center gap-1 cursor-pointer hover:underline">
              Open list <ArrowRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : todayDeliveries.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No deliveries today. Add customers with delivery days that include today.</div>
          ) : (
            <ul className="flex flex-col divide-y divide-brand-border">
              {todayDeliveries.slice(0, 6).map((d) => (
                <li key={d.id} data-testid={`dashboard-del-${d.id}`} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    {d.customer_id ? (
                      <Link href={`/provider/customers/${d.customer_id}`} className="font-medium truncate block hover:text-primary hover:underline" data-testid={`dashboard-customer-${d.customer_id}`}>
                        {d.customer_name}
                      </Link>
                    ) : (
                      <div className="font-medium truncate">{d.customer_name}</div>
                    )}
                    <div className="text-xs text-muted-foreground truncate">{d.address} {d.apartment ? `· ${d.apartment}` : ""}</div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="text-sm font-medium">{fmtCAD(d.meal_price)}</div>
                    {d.status === "pending" && canQuickMark ? (
                      <div className="flex items-center gap-2">
                        <button data-testid={`quick-delivered-${d.id}`} onClick={() => markDelivery(d.id, "delivered")} className="h-11 min-h-[44px] px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-medium active:scale-95 transition-transform cursor-pointer hover:bg-brand-sageDark">Deliver</button>
                        <button data-testid={`quick-missed-${d.id}`} onClick={() => markDelivery(d.id, "missed")} className="h-11 min-h-[44px] px-4 rounded-full border border-destructive/40 bg-white text-destructive text-sm font-medium cursor-pointer hover:bg-destructive/10">Miss</button>
                      </div>
                    ) : (
                      <StatusPill status={d.status} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-tinted p-4 sm:p-5">
          <h2 className="font-display font-bold text-xl mb-3">At a glance</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active customers</span>
              <span className="font-semibold">{summary?.active_customers ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending approval</span>
              <span className="font-semibold">{summary?.pending_customers ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Missed today</span>
              <span className="font-semibold">{summary?.deliveries?.missed ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cancelled today</span>
              <span className="font-semibold">{summary?.deliveries?.cancelled ?? "—"}</span>
            </div>
          </div>
          <button data-testid="dashboard-open-reports" onClick={() => router.push("/provider/reports")} className="mt-5 w-full pill-btn btn-outline cursor-pointer">Open reports</button>
        </div>
      </div>
    </div>
  );
}
