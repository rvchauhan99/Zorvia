"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, fmtDate, todayISO, fmtDeliveryLine, fmtExtraBadge } from "@/lib/format";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import ExtraMealsSheet from "@/components/ExtraMealsSheet";
import MenuImageLightbox from "@/components/MenuImageLightbox";
import MenuWeekPanel from "@/components/MenuWeekPanel";
import type { MenuWeek } from "@/lib/menuPlan";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { asPageEnvelope, DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { CurrencyDollar, Truck, XCircle, Clock, CheckCircle, ForkKnife, Plus } from "@phosphor-icons/react";
import Link from "next/link";

export default function ConsumerHome() {
  const [me, setMe] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [menu, setMenu] = useState<any | null>(null);
  const [menuWeek, setMenuWeek] = useState<MenuWeek | null>(null);
  const [savingChoices, setSavingChoices] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [extraTarget, setExtraTarget] = useState<any | "new" | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuViewing, setMenuViewing] = useState(false);
  const deliveriesPaging = useCursorPagination({ initialPageSize: DEFAULT_PAGE_SIZE });

  const loadDeliveries = useCallback(async (opts: { cursor?: string | null } = {}) => {
    try {
      const params = new URLSearchParams({ page_size: String(deliveriesPaging.pageSize) });
      if (opts.cursor) params.set("cursor", opts.cursor);
      const { data } = await api.get(`/consumer/deliveries?${params.toString()}`);
      const page = asPageEnvelope<any>(data);
      setDeliveries(page.items);
      deliveriesPaging.applyPageResult(page);
    } catch {
      toast.error("Failed to load deliveries");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliveriesPaging.applyPageResult is stable
  }, [deliveriesPaging.pageSize]);

  async function load() {
    setLoading(true);
    try {
      const [{ data: m }, menuRes, weekRes] = await Promise.all([
        api.get("/consumer/me"),
        api.get("/consumer/menus/current").catch(() => ({ data: null })),
        api.get<MenuWeek>("/consumer/menu-plan").catch(() => ({ data: null })),
      ]);
      setMe(m);
      setMenu(menuRes?.data || null);
      setMenuWeek(weekRes?.data?.enabled ? weekRes.data : null);
      deliveriesPaging.resetToFirstPage();
      await loadDeliveries({ cursor: null });
    } catch (e) {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading) loadDeliveries({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch current filter on page-size change only
  }, [deliveriesPaging.pageSize]);

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

  async function confirmAdjust(args: {
    date: string;
    slots: Array<{
      meal_slot: string;
      quantity: number;
      meal_type_id?: string | null;
      meal_price?: number | null;
      meal_type_lines?: Array<{
        meal_type_id: string;
        quantity: number;
        meal_price?: number | null;
      }>;
    }>;
  }) {
    setExtraBusy(true);
    try {
      const { data } = await api.post("/consumer/deliveries/adjust-day", {
        date: args.date,
        slots: args.slots.map((s) => ({
          meal_slot: s.meal_slot,
          quantity: s.quantity,
          meal_type_id: s.meal_type_id || undefined,
          meal_type_lines: s.meal_type_lines?.length ? s.meal_type_lines : undefined,
        })),
      });
      toast.success("Meal adjusted");
      load();
      return data;
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to adjust meal");
    } finally {
      setExtraBusy(false);
    }
  }

  async function saveMenuChoices(choices: Record<string, string[]>) {
    setSavingChoices(true);
    try {
      const { data } = await api.put<MenuWeek>("/consumer/menu-plan/choices", { choices });
      setMenuWeek(data);
      toast.success("Your choices are saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Could not save your choices");
    } finally {
      setSavingChoices(false);
    }
  }

  const upcoming = deliveries.filter((d) => d.delivery_date >= todayISO());
  const history = deliveries.filter((d) => d.delivery_date < todayISO()).reverse();
  const nextDelivery = upcoming.find((d) => d.status === "pending");
  const cutoffHours = me?.provider?.settings?.cutoff_hours ?? 4;
  const mealPrice = Number(me?.customer?.meal_price) || 0;
  const billing = me?.billing;
  const monthlyBilling = billing?.billing_mode === "monthly_flat";
  const monthlyFixed = billing?.policy_variant === "monthly_fixed";
  const currentMonth = me?.current_month_billing;
  const extraOpen = extraTarget !== null;
  const extraDefaultDate =
    extraTarget && extraTarget !== "new" ? extraTarget.delivery_date : todayISO();

  if (loading && !me) {
    return (
      <div className="flex flex-col gap-3 animate-fade-in-up" data-testid="consumer-home-loading">
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
      <div className="flex flex-col gap-3 animate-fade-in-up" data-testid="pending-approval-state">
        <div>
          <span className="label-overline">Welcome</span>
          <h1 className="font-display font-black text-xl sm:text-2xl mt-1">Almost there</h1>
        </div>
        <div className="card-tinted p-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Your account with <strong className="text-foreground">{me?.provider?.name || "your provider"}</strong> is awaiting approval.
            Here&apos;s what happens next:
          </p>
          <ol className="space-y-3">
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
    <div className="flex flex-col gap-3 animate-fade-in-up">
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="flex items-center justify-between"><span className="label-overline">Outstanding</span><CurrencyDollar size={20} className="text-primary" weight="duotone" /></div>
          <div className="font-display font-black text-2xl sm:text-3xl break-words">{fmtCAD(me?.outstanding ?? 0)}</div>
          {monthlyBilling && me?.suggested_payment_cad != null ? (
            <div className="text-xs text-muted-foreground mt-0.5">Suggested payment {fmtCAD(me.suggested_payment_cad)}</div>
          ) : null}
          <Link data-testid="pay-now-link" href="/consumer/payments" className="text-xs text-primary font-medium hover:underline">Submit a payment →</Link>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="label-overline">{monthlyBilling ? "Monthly plan" : "Next delivery"}</span>
            <Truck size={20} className="text-secondary" weight="duotone" />
          </div>
          {monthlyBilling ? (
            <>
              <div className="font-display font-black text-xl sm:text-2xl">{billing?.monthly_plan_name || "Plan"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {fmtCAD(billing?.monthly_fee ?? 0)}
                {billing?.collection_due_date ? ` · due ${fmtDate(billing.collection_due_date)}` : ""}
              </div>
            </>
          ) : (
            <>
              <div className="font-display font-black text-xl sm:text-2xl">{nextDelivery ? fmtDate(nextDelivery.delivery_date) : "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{me?.provider?.name || ""}</div>
            </>
          )}
        </div>
      </div>

      {monthlyBilling && currentMonth ? (
        <div className="card-tinted p-4 text-sm text-muted-foreground" data-testid="consumer-monthly-billing-summary">
          {monthlyFixed ? (
            <p>Your fixed monthly fee is {fmtCAD(currentMonth.monthly_fee)} for this month regardless of skips.</p>
          ) : (
            <p>
              This month: {fmtCAD(currentMonth.month_charge_after_tax ?? currentMonth.month_charge_before_tax)}
              {currentMonth.cancelled_units != null ? ` · ${currentMonth.cancelled_units} cancellation(s)` : ""}
              {currentMonth.free_cancellations_remaining != null && currentMonth.policy_variant === "monthly_adjustable"
                ? ` · ${currentMonth.free_cancellations_remaining} free cancellation(s) left`
                : ""}
            </p>
          )}
        </div>
      ) : null}

      {menuWeek ? (
        <section
          className="card-tinted p-3 sm:p-4 flex flex-col gap-3"
          data-testid="consumer-menu-week-section"
        >
          <div>
            <h2 className="font-display font-bold text-xl">Your weekly menu</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              What comes in your tiffin each day. Where you can choose, your picks repeat every
              week until you change them.
            </p>
          </div>
          <MenuWeekPanel
            week={menuWeek}
            canEdit
            saving={savingChoices}
            onSave={saveMenuChoices}
            testid="consumer-menu-week"
          />
        </section>
      ) : null}

      {menu?.image_url && !menuWeek ? (
        <section className="card-tinted p-3 sm:p-4 flex flex-col gap-3" data-testid="consumer-menu-section">
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
            data-testid="c-adjust-new"
            onClick={() => setExtraTarget("new")}
            className="h-10 px-3 rounded-full border border-brand-border bg-white text-sm inline-flex items-center gap-1.5 hover:bg-brand-surface cursor-pointer"
          >
            <Plus size={16} /> Adjust meal
          </button>
        </div>
        <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
          {upcoming.length === 0 ? (
            <li className="p-4 text-center text-muted-foreground text-sm">No upcoming deliveries.</li>
          ) : upcoming.map((d) => {
            const extraBadge = fmtExtraBadge(d);
            return (
              <li key={d.id} data-testid={`c-up-${d.id}`} className="px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center hover:bg-brand-surface/60 transition-colors">
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
                      data-testid={`c-adjust-${d.id}`}
                      type="button"
                      onClick={() => setExtraTarget(d)}
                      className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-full border border-brand-border bg-white text-sm inline-flex items-center justify-center gap-1 hover:bg-brand-surface cursor-pointer transition-colors"
                    >
                      <Plus size={16} /> Adjust
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
            <li className="p-4 text-center text-muted-foreground text-sm">No history yet.</li>
          ) : history.map((d) => (
            <li key={d.id} className="px-3 py-2.5 flex items-center gap-3 hover:bg-brand-surface/60 transition-colors">
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
        <div className="mt-2">
          <CursorPaginationBar
            currentPage={deliveriesPaging.currentPage}
            totalPages={deliveriesPaging.totalPages}
            from={deliveriesPaging.from}
            to={deliveriesPaging.to}
            total={deliveriesPaging.total}
            pageSize={deliveriesPaging.pageSize}
            hasMore={deliveriesPaging.hasMore}
            onPrev={() => {
              const c = deliveriesPaging.goPrev();
              if (c !== undefined) loadDeliveries({ cursor: c });
            }}
            onNext={() => {
              const c = deliveriesPaging.goNext();
              if (c !== undefined) loadDeliveries({ cursor: c });
            }}
            onPageSizeChange={(size: AllowedPageSize) => deliveriesPaging.setPageSize(size)}
            testidPrefix="consumer-deliveries-pagination"
          />
        </div>
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
          Subject to your provider&apos;s {cutoffHours}h cutoff before delivery.{" "}
          {monthlyFixed
            ? "Your monthly fee is unchanged if cancellation succeeds."
            : monthlyBilling
              ? "Cancellation may reduce this month\u2019s flat fee (adjustable plan)."
              : "You won\u2019t be charged for this meal if cancellation succeeds."}
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
        onConfirm={confirmAdjust}
        title={extraTarget === "new" ? "Adjust meal" : `Adjust for ${fmtDate(extraDefaultDate)}`}
        defaultDate={extraDefaultDate}
        showDate={extraTarget === "new"}
        mealPrice={mealPrice}
        cutoffHours={cutoffHours}
        busy={extraBusy}
        confirmTestId="c-adjust-confirm"
        mealTypes={
          Array.isArray(me?.provider?.meal_types)
            ? me.provider.meal_types.map((t: any) => ({
                id: String(t.id),
                name: String(t.name || t.id),
                price: Number(t.price) || 0,
              }))
            : []
        }
        defaultMealTypeId={
          (extraTarget && extraTarget !== "new" && extraTarget.meal_type_id) ||
          me?.customer?.meal_type_id ||
          "regular"
        }
        defaultMealSlot={
          extraTarget && extraTarget !== "new"
            ? extraTarget.meal_slot || null
            : Array.isArray(me?.customer?.meal_slots) && me.customer.meal_slots.length === 1
              ? me.customer.meal_slots[0]
              : null
        }
        customerId={me?.customer?.id}
        customerName={me?.customer?.name}
        summaryMode="consumer"
      />
    </div>
  );
}
