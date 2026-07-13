"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import { CurrencyDollar, Truck, XCircle, Clock, CheckCircle, ForkKnife } from "@phosphor-icons/react";
import Link from "next/link";

export default function ConsumerHome() {
  const [me, setMe] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [cancelTarget, setCancelTarget] = useState<any>(null);

  async function load() {
    try {
      const [{ data: m }, { data: d }] = await Promise.all([
        api.get("/consumer/me"),
        api.get("/consumer/deliveries"),
      ]);
      setMe(m); setDeliveries(d);
    } catch (e) {
      toast.error("Failed to load");
    }
  }
  useEffect(() => { load(); }, []);

  async function confirmCancel() {
    if (!cancelTarget) return;
    try {
      await api.post(`/consumer/deliveries/${cancelTarget.id}/cancel`);
      toast.success("Delivery cancelled");
      setCancelTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to cancel");
    }
  }

  const upcoming = deliveries.filter((d) => d.delivery_date >= todayISO());
  const history = deliveries.filter((d) => d.delivery_date < todayISO()).reverse();
  const nextDelivery = upcoming.find((d) => d.status === "pending");
  const cutoffHours = me?.provider?.settings?.cutoff_hours ?? 4;

  if (me?.customer?.pending_approval) {
    return (
      <div className="flex flex-col gap-5 animate-fade-in-up" data-testid="pending-approval-state">
        <div>
          <span className="label-overline">Welcome</span>
          <h1 className="font-display font-black text-3xl mt-1">Almost there</h1>
        </div>
        <div className="card-tinted p-6 flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Your account with <strong className="text-foreground">{me?.provider?.name || "your provider"}</strong> is awaiting approval.
            Here&apos;s what happens next:
          </p>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <Clock size={22} className="text-brand-amber shrink-0 mt-0.5" weight="duotone" />
              <div>
                <div className="font-medium">Provider reviews your signup</div>
                <div className="text-xs text-muted-foreground mt-0.5">They&apos;ll confirm your address and delivery days.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <CheckCircle size={22} className="text-secondary shrink-0 mt-0.5" weight="duotone" />
              <div>
                <div className="font-medium">You get approved</div>
                <div className="text-xs text-muted-foreground mt-0.5">Refresh this page — deliveries will start appearing on your schedule.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <ForkKnife size={22} className="text-primary shrink-0 mt-0.5" weight="duotone" />
              <div>
                <div className="font-medium">Meals begin on your delivery days</div>
                <div className="text-xs text-muted-foreground mt-0.5">You can cancel upcoming meals before the {cutoffHours}h cutoff.</div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="flex items-center justify-between"><span className="label-overline">Outstanding</span><CurrencyDollar size={20} className="text-primary" weight="duotone" /></div>
          <div className="font-display font-black text-2xl sm:text-3xl break-words">{fmtCAD(me?.outstanding ?? 0)}</div>
          <Link data-testid="pay-now-link" href="/consumer/payments" className="text-xs text-primary font-medium hover:underline">Submit a payment →</Link>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between"><span className="label-overline">Next delivery</span><Truck size={20} className="text-secondary" weight="duotone" /></div>
          <div className="font-display font-black text-xl sm:text-2xl">{nextDelivery ? fmtDate(nextDelivery.delivery_date) : "—"}</div>
          <div className="text-xs text-muted-foreground truncate">{me?.provider?.name || ""}</div>
        </div>
      </div>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">Upcoming</h2>
        <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
          {upcoming.length === 0 ? (
            <li className="p-6 text-center text-muted-foreground text-sm">No upcoming deliveries.</li>
          ) : upcoming.slice(0, 8).map((d) => (
            <li key={d.id} data-testid={`c-up-${d.id}`} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-brand-surface/60 transition-colors">
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{fmtDate(d.delivery_date)}</div>
                  <div className="text-xs text-muted-foreground">{fmtCAD(d.meal_price)} · Meal</div>
                </div>
                <StatusPill status={d.status} />
              </div>
              {d.status === "pending" ? (
                <button data-testid={`c-cancel-${d.id}`} onClick={() => setCancelTarget(d)} className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-full border border-destructive/40 bg-white text-destructive text-sm inline-flex items-center justify-center gap-1 hover:bg-destructive/10 cursor-pointer transition-colors">
                  <XCircle size={16} /> Cancel
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">Recent history</h2>
        <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
          {history.length === 0 ? (
            <li className="p-6 text-center text-muted-foreground text-sm">No history yet.</li>
          ) : history.slice(0, 12).map((d) => (
            <li key={d.id} className="p-4 flex items-center gap-3 hover:bg-brand-surface/60 transition-colors">
              <div className="flex-1">
                <div className="font-medium">{fmtDate(d.delivery_date)}</div>
                <div className="text-xs text-muted-foreground">{fmtCAD(d.meal_price)}</div>
              </div>
              <StatusPill status={d.status} />
            </li>
          ))}
        </ul>
      </section>

      <AppSheet
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget ? `Cancel ${fmtDate(cancelTarget.delivery_date)}?` : "Cancel delivery?"}
        size="md"
        footer={(
          <div className="flex gap-2">
            <button type="button" onClick={() => setCancelTarget(null)} className="pill-btn btn-outline flex-1 h-11 cursor-pointer hover:bg-brand-surface">Keep it</button>
            <button data-testid="cancel-confirm" type="button" onClick={confirmCancel} className="pill-btn btn-danger flex-1 h-11 cursor-pointer">Cancel delivery</button>
          </div>
        )}
      >
        <p className="text-sm text-muted-foreground">
          Subject to your provider&apos;s {cutoffHours}h cutoff before delivery. You won&apos;t be charged for this meal if cancellation succeeds.
        </p>
      </AppSheet>
    </div>
  );
}
