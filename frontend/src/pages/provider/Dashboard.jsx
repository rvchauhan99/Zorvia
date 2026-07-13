import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { fmtCAD, fmtDate, todayISO } from "@/lib/format";
import { Truck, Receipt, CurrencyDollar, Users, ArrowRight, Copy } from "@phosphor-icons/react";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";

function StatCard({ icon: Icon, label, value, hint, tone = "primary", testid }) {
  const toneMap = {
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
      <div className="font-display font-black text-3xl">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export default function ProviderDashboard() {
  const nav = useNavigate();
  const [summary, setSummary] = useState(null);
  const [provider, setProvider] = useState(null);
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setTodayDeliveries(dels);
    } catch (e) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function markDelivery(id, status) {
    try {
      await api.patch(`/deliveries/${id}`, { status });
      toast.success(`Marked ${status}`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="label-overline">Today · {fmtDate(todayISO())}</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Good day, {(provider?.name || "there").split(" ")[0]} 👋</h1>
        </div>
        {provider?.signup_code ? (
          <button
            data-testid="copy-signup-code"
            onClick={() => { navigator.clipboard.writeText(provider.signup_code); toast.success("Signup code copied"); }}
            className="inline-flex items-center gap-2 px-3 h-10 rounded-full bg-white border border-brand-border hover:bg-brand-surface text-sm"
            title="Share this code with consumers"
          >
            <Copy size={16} /> Signup code: <span className="font-mono font-semibold">{provider.signup_code}</span>
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard testid="stat-deliveries" icon={Truck} label="Today's Deliveries" value={summary?.deliveries?.total ?? "—"} hint={summary ? `${summary.deliveries.delivered} delivered · ${summary.deliveries.pending} pending` : ""} />
        <StatCard testid="stat-pending" icon={Receipt} label="Pending Payments" value={summary?.pending_payments ?? "—"} hint="Awaiting your verification" tone="amber" />
        <StatCard testid="stat-outstanding" icon={CurrencyDollar} label="Outstanding" value={fmtCAD(summary?.outstanding_total ?? 0)} hint="Across all customers" tone="ink" />
        <StatCard testid="stat-collections" icon={Users} label="Today's Collections" value={fmtCAD(summary?.collections_today?.amount ?? 0)} hint={`${summary?.collections_today?.count ?? 0} verified today`} tone="secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-tinted p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-xl">Today's route</h2>
            <button data-testid="go-deliveries" onClick={() => nav("/provider/deliveries")} className="text-sm text-primary inline-flex items-center gap-1">
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
                <li key={d.id} data-testid={`dashboard-del-${d.id}`} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.customer_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.address} {d.apartment ? `· ${d.apartment}` : ""}</div>
                  </div>
                  <div className="text-sm font-medium mr-2">{fmtCAD(d.meal_price)}</div>
                  {d.status === "pending" ? (
                    <div className="flex items-center gap-1">
                      <button data-testid={`quick-delivered-${d.id}`} onClick={() => markDelivery(d.id, "delivered")} className="h-8 px-3 rounded-full bg-secondary text-secondary-foreground text-xs font-medium active:scale-95 transition-transform">Deliver</button>
                      <button data-testid={`quick-missed-${d.id}`} onClick={() => markDelivery(d.id, "missed")} className="h-8 px-3 rounded-full bg-white border border-brand-border text-xs font-medium">Miss</button>
                    </div>
                  ) : (
                    <StatusPill status={d.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-tinted p-5">
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
          <button data-testid="dashboard-open-reports" onClick={() => nav("/provider/reports")} className="mt-5 w-full pill-btn btn-outline">Open reports</button>
        </div>
      </div>
    </div>
  );
}
