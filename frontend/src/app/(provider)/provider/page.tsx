"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, isDriver, canSeePricing } from "@/lib/roles";
import { fmtCAD, fmtDate, todayISO, fmtMealCount } from "@/lib/format";
import { Truck, Receipt, CurrencyDollar, Users, ArrowRight, Copy, CheckCircle, Circle, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";
import AddExtraMealSheet from "@/components/AddExtraMealSheet";
import { InlineLoader, KpiSkeleton } from "@/components/loaders";

const ONBOARD_KEY = "zorvia_provider_onboarded";

function StatCard({ icon: Icon, label, value, hint, tone = "primary", testid }: any) {
  const toneMap: any = {
    primary: "text-primary",
    secondary: "text-secondary",
    amber: "text-brand-amber",
    ink: "text-foreground",
  };
  return (
    <div data-testid={testid} className="stat-card card-tinted-hover animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="label-overline">{label}</span>
        <Icon size={22} className={toneMap[tone]} weight="duotone" />
      </div>
      <div className="font-display font-black text-2xl sm:text-3xl">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function sortDeliveries(dels: any[]) {
  return [...dels].sort((a, b) => {
    const fa = String(a.postal_code || "").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZZZ";
    const fb = String(b.postal_code || "").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZZZ";
    if (fa !== fb) return fa.localeCompare(fb);
    return String(a.customer_name || "").localeCompare(String(b.customer_name || ""));
  });
}

export default function ProviderDashboard() {
  const router = useRouter();
  const { session } = useAuth();
  const canQuickMark = canMutateAdmin(session);
  const showMoney = canSeePricing(session);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [providerLoading, setProviderLoading] = useState(true);
  const [todayDeliveries, setTodayDeliveries] = useState<any[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [dismissedOnboard, setDismissedOnboard] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraLocked, setExtraLocked] = useState<{ id: string; name: string } | null>(null);

  async function loadSummary() {
    setSummaryLoading(true);
    try {
      const { data: s } = await api.get("/reports/dashboard-summary");
      setSummary(s);
    } catch {
      toast.error("Failed to load dashboard summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadProvider() {
    setProviderLoading(true);
    try {
      const { data: p } = await api.get("/providers/me");
      setProvider(p);
    } catch {
      toast.error("Failed to load kitchen profile");
    } finally {
      setProviderLoading(false);
    }
  }

  async function loadDeliveries() {
    setDeliveriesLoading(true);
    try {
      const { data: dels } = await api.get(`/deliveries?date=${todayISO()}`);
      setTodayDeliveries(sortDeliveries(dels));
    } catch {
      toast.error("Failed to load today's deliveries");
    } finally {
      setDeliveriesLoading(false);
    }
  }

  function refreshAll() {
    void loadSummary();
    void loadProvider();
    void loadDeliveries();
  }

  useEffect(() => {
    if (!session) return;
    if (isDriver(session)) {
      router.replace("/provider/deliveries");
      return;
    }
    refreshAll();
    try {
      setDismissedOnboard(localStorage.getItem(ONBOARD_KEY) === "1");
    } catch { /* ignore */ }
  }, [session, router]);

  const hasInterac = !!(provider?.interac_email || "").trim();
  const hasCustomers = (summary?.active_customers ?? 0) > 0 || (summary?.pending_customers ?? 0) > 0;
  const showChecklist =
    canQuickMark &&
    !providerLoading &&
    !summaryLoading &&
    !dismissedOnboard &&
    (!hasInterac || !hasCustomers);

  function dismissChecklist() {
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ }
    setDismissedOnboard(true);
  }

  async function markDelivery(id: string, status: string) {
    try {
      await api.patch(`/deliveries/${id}`, { status });
      toast.success(`Marked ${status}`);
      void loadDeliveries();
      void loadSummary();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  if (isDriver(session)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-3">
          {providerLoading ? (
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-brand-surface animate-pulse" />
          ) : provider?.logo_url ? (
            <img src={provider.logo_url} alt="" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover border border-brand-border" data-testid="dashboard-logo" />
          ) : null}
          <div>
            <span className="label-overline">Today · {fmtDate(todayISO())}</span>
            {providerLoading ? (
              <div className="mt-1 h-8 w-48 sm:w-64 rounded bg-brand-surface animate-pulse" />
            ) : (
              <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">
                Good day, {(provider?.name || "there").split(" ")[0]}
              </h1>
            )}
          </div>
        </div>
        {providerLoading ? (
          <div className="h-10 w-40 rounded-full bg-brand-surface animate-pulse" />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {canQuickMark ? (
              <button
                type="button"
                data-testid="dashboard-add-adjust"
                onClick={() => {
                  setExtraLocked(null);
                  setExtraOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3 h-10 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-brand-sageDark cursor-pointer"
              >
                <Plus size={16} weight="bold" /> Adjust meal
              </button>
            ) : null}
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
        )}
      </div>

      {showChecklist ? (
        <div data-testid="onboarding-checklist" className="card-tinted p-4 sm:p-5 border border-brand-amber/30 bg-amber-50/40 animate-fade-in-up">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl">Get set up</h2>
              <p className="text-sm text-muted-foreground mt-1">A few steps so you can start delivering and collecting.</p>
            </div>
            <button data-testid="dismiss-onboarding" onClick={dismissChecklist} className="min-h-[44px] min-w-[44px] px-2 text-sm text-muted-foreground hover:underline cursor-pointer shrink-0">Dismiss</button>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              {hasInterac ? <CheckCircle size={20} className="text-secondary shrink-0" weight="fill" /> : <Circle size={20} className="text-muted-foreground shrink-0" />}
              <span className="flex-1">Add your Interac e-Transfer email</span>
              {!hasInterac ? (
                <button onClick={() => router.push("/provider/settings")} className="text-primary text-sm font-medium hover:underline cursor-pointer min-h-[44px] inline-flex items-center">Settings</button>
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

      {summaryLoading && !summary ? (
        <KpiSkeleton testid="dashboard-kpi-skeleton" />
      ) : (
        <div className={`grid gap-3 sm:gap-4 ${showMoney ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
          <StatCard
            testid="stat-deliveries"
            icon={Truck}
            label="Today's Deliveries"
            value={summary?.deliveries?.total ?? "—"}
            hint={
              summary
                ? `${summary.deliveries.delivered} delivered · ${summary.deliveries.pending} pending${
                    summary.deliveries.meals != null ? ` · ${summary.deliveries.meals} meal${summary.deliveries.meals === 1 ? "" : "s"}` : ""
                  }${
                    summary.deliveries.meals_by_slot &&
                    ((summary.deliveries.meals_by_slot.lunch || 0) > 0 ||
                      (summary.deliveries.meals_by_slot.dinner || 0) > 0)
                      ? ` · L ${summary.deliveries.meals_by_slot.lunch || 0} / D ${summary.deliveries.meals_by_slot.dinner || 0}`
                      : ""
                  }`
                : ""
            }
          />
          <StatCard testid="stat-pending" icon={Receipt} label="Pending Payments" value={summary?.pending_payments ?? "—"} hint="Awaiting your verification" tone="amber" />
          {showMoney ? (
            <>
              <StatCard
                testid="stat-outstanding"
                icon={CurrencyDollar}
                label="Outstanding"
                value={fmtCAD(summary?.outstanding_total ?? 0)}
                hint={
                  Number(summary?.customer_credit_total || 0) > 0
                    ? `Receivables owed · Credit on account: ${fmtCAD(summary.customer_credit_total)}`
                    : "Receivables owed (excludes advances)"
                }
                tone="ink"
              />
              <StatCard testid="stat-collections" icon={Users} label="Today's Collections" value={fmtCAD(summary?.collections_today?.amount ?? 0)} hint={`${summary?.collections_today?.count ?? 0} verified today`} tone="secondary" />
            </>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 card-tinted p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg sm:text-xl">Today's route</h2>
            <button data-testid="go-deliveries" onClick={() => router.push("/provider/deliveries")} className="text-sm text-primary inline-flex items-center gap-1 cursor-pointer hover:underline">
              Open list <ArrowRight size={14} />
            </button>
          </div>
          {deliveriesLoading ? (
            <InlineLoader testid="dashboard-route-loader" label="Loading route…" />
          ) : todayDeliveries.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No deliveries today. Add customers with delivery days that include today.</div>
          ) : (
            <ul className="flex flex-col divide-y divide-brand-border animate-fade-in-up">
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
                    <div className="text-sm font-semibold shrink-0 px-2.5 py-1 rounded-full bg-brand-surface">{fmtMealCount(d)}</div>
                    {d.status === "pending" && canQuickMark ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid={`quick-adjust-${d.id}`}
                          onClick={() => {
                            setExtraLocked({ id: d.customer_id, name: d.customer_name });
                            setExtraOpen(true);
                          }}
                          className="h-11 min-h-[44px] px-3 rounded-full border border-brand-border bg-white text-sm font-medium cursor-pointer hover:bg-brand-surface inline-flex items-center gap-1"
                        >
                          <Plus size={14} /> Adjust
                        </button>
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

        <div className={`card-tinted p-4 sm:p-5 ${summaryLoading && !summary ? "opacity-70" : ""}`}>
          <h2 className="font-display font-bold text-xl mb-3">At a glance</h2>
          {summaryLoading && !summary ? (
            <div className="space-y-3 animate-pulse" data-testid="glance-skeleton">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-3 w-28 rounded bg-brand-surface" />
                  <div className="h-3 w-8 rounded bg-brand-surface" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-sm animate-fade-in-up">
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
          )}
          <button data-testid="dashboard-open-reports" onClick={() => router.push("/provider/reports")} className="mt-5 w-full pill-btn btn-outline cursor-pointer">Open reports</button>
        </div>
      </div>

      <AddExtraMealSheet
        open={extraOpen}
        onClose={() => {
          setExtraOpen(false);
          setExtraLocked(null);
        }}
        onAdded={() => {
          void loadDeliveries();
          void loadSummary();
        }}
        lockedCustomer={extraLocked}
        defaultDate={todayISO()}
      />
    </div>
  );
}
