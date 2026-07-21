"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, fmtDate, todayISO, fmtDeliveryLine, fmtExtraBadge } from "@/lib/format";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import ExtraMealsSheet from "@/components/ExtraMealsSheet";
import MenuImageLightbox from "@/components/MenuImageLightbox";
import { CurrencyDollar, Truck, XCircle, Clock, CheckCircle, ForkKnife, Plus } from "@phosphor-icons/react";
import Link from "next/link";

export default function ConsumerHome() {
  const [me, setMe] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [menu, setMenu] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [extraTarget, setExtraTarget] = useState<any | "new" | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuViewing, setMenuViewing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: m }, { data: d }, menuRes] = await Promise.all([
        api.get("/consumer/me"),
        api.get("/consumer/deliveries"),
        api.get("/consumer/menus/current").catch(() => ({ data: null })),
      ]);
      setMe(m);
      setDeliveries(d);
      setMenu(menuRes?.data || null);
    } catch (e) {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
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

  async function confirmExtra({ date, quantity }: { date: string; quantity: number }) {
    setExtraBusy(true);
    try {
      await api.post("/consumer/deliveries/extra", { date, quantity });
      toast.success(quantity === 1 ? "Extra meal added" : `${quantity} extra meals added`);
      setExtraTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to add extra meal");
    } finally {
      setExtraBusy(false);
    }
  }

  const upcoming = deliveries.filter((d) => d.delivery_date >= todayISO());
  const history = deliveries.filter((d) => d.delivery_date < todayISO()).reverse();
  const nextDelivery = upcoming.find((d) => d.status === "pending");
  const cutoffHours = me?.provider?.settings?.cutoff_hours ?? 4;
  const mealPrice = Number(me?.customer?.meal_price) || 0;
  const extraOpen = extraTarget !== null;
  const extraDefaultDate =
    extraTarget && extraTarget !== "new" ? extraTarget.delivery_date : todayISO();
  const extraCurrentQty =
    extraTarget && extraTarget !== "new" ? Math.max(1, Number(extraTarget.quantity) || 1) : 1;

  if (loading && !me) {
    return (
      <div className="flex flex-col gap-5 animate-fade-in-up" data-testid="consumer-home-loading">
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card h-28 animate-pulse bg-brand-surface/80" />
          <div className="stat-card h-28 animate-pulse bg-brand-surface/80" />
        </div>
        <div className="card-tinted h-40 animate-pulse bg-brand-surface/60" />
      </div>
    );
  }

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

      {menu?.image_url ? (
        <section className="card-tinted p-4 sm:p-5 flex flex-col gap-3" data-testid="consumer-menu-section">
          <div>
            <h2 className="font-display font-bold text-xl">Current menu</h2>
            <p className="text-sm text-muted-foreground mt-0.5" data-testid="consumer-menu-label">
              {menu.label || "Latest menu"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuViewing(true)}
            className="block w-full cursor-pointer rounded-xl border border-brand-border bg-white p-0 overflow-hidden hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="View full menu image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={menu.image_url}
              alt={menu.label || "Menu"}
              data-testid="consumer-menu-image"
              className="w-full max-h-[420px] object-contain"
            />
          </button>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-xl">Upcoming</h2>
          <button
            type="button"
            data-testid="c-extra-new"
            onClick={() => setExtraTarget("new")}
            className="h-10 px-3 rounded-full border border-brand-border bg-white text-sm inline-flex items-center gap-1.5 hover:bg-brand-surface cursor-pointer"
          >
            <Plus size={16} /> Extra meal
          </button>
        </div>
        <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
          {upcoming.length === 0 ? (
            <li className="p-6 text-center text-muted-foreground text-sm">No upcoming deliveries.</li>
          ) : upcoming.slice(0, 8).map((d) => {
            const extraBadge = fmtExtraBadge(d);
            return (
              <li key={d.id} data-testid={`c-up-${d.id}`} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-brand-surface/60 transition-colors">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{fmtDate(d.delivery_date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDeliveryLine(d)} · Meal
                      {extraBadge ? (
                        <span className="ml-1.5 text-primary font-medium" data-testid={`c-extra-badge-${d.id}`}>
                          {extraBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <StatusPill status={d.status} />
                </div>
                {d.status === "pending" ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      data-testid={`c-extra-${d.id}`}
                      type="button"
                      onClick={() => setExtraTarget(d)}
                      className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-full border border-brand-border bg-white text-sm inline-flex items-center justify-center gap-1 hover:bg-brand-surface cursor-pointer transition-colors"
                    >
                      <Plus size={16} /> Extra
                    </button>
                    <button
                      data-testid={`c-cancel-${d.id}`}
                      type="button"
                      onClick={() => setCancelTarget(d)}
                      className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-full border border-destructive/40 bg-white text-destructive text-sm inline-flex items-center justify-center gap-1 hover:bg-destructive/10 cursor-pointer transition-colors"
                    >
                      <XCircle size={16} /> Cancel
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
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
                <div className="text-xs text-muted-foreground">
                  {fmtDeliveryLine(d)}
                  {fmtExtraBadge(d) ? ` · ${fmtExtraBadge(d)}` : ""}
                </div>
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

      <MenuImageLightbox
        open={menuViewing && !!menu?.image_url}
        onClose={() => setMenuViewing(false)}
        src={menu?.image_url}
        label={menu?.label || "Current menu"}
      />

      <ExtraMealsSheet
        open={extraOpen}
        onClose={() => setExtraTarget(null)}
        onConfirm={confirmExtra}
        title={extraTarget === "new" ? "Request extra meal" : `Extra for ${fmtDate(extraDefaultDate)}`}
        defaultDate={extraDefaultDate}
        showDate={extraTarget === "new"}
        mealPrice={mealPrice}
        currentQty={extraCurrentQty}
        cutoffHours={cutoffHours}
        busy={extraBusy}
        confirmTestId="c-extra-confirm"
      />
    </div>
  );
}
