"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AppSheet from "@/components/AppSheet";
import SearchableSelect from "@/components/SearchableSelect";
import { fmtCAD, todayISO } from "@/lib/format";
import {
  projectConsumerDaySummary,
  projectDaySummaryMulti,
  type DaySummary as PreviewDaySummary,
} from "@/lib/adjustPreview";

const MAX_QTY = 20;

export type MealTypeOption = { id: string; name: string; price: number };

export type DaySummary = PreviewDaySummary;

export type AdjustConfirmArgs = {
  date: string;
  quantity: number;
  meal_slot?: string | null;
  meal_type_id?: string | null;
  meal_price?: number | null;
};

export type AdjustDaySlotArg = {
  meal_slot: string;
  quantity: number;
  meal_type_id?: string | null;
  meal_price?: number | null;
};

export type AdjustDayConfirmArgs = {
  date: string;
  slots: AdjustDaySlotArg[];
};

type AdjustContextSlot = {
  meal_slot: string;
  scheduled: boolean;
  schedule_base: number;
  existing: {
    id?: string;
    quantity: number;
    status: string;
    meal_type_id: string;
    meal_type_name: string;
    meal_price: number;
    extra_quantity?: number;
  } | null;
  suggested_meal_type_id: string;
  suggested_meal_type_name: string;
  editable: boolean;
};

type AdjustContext = {
  date: string;
  customer_id: string;
  customer_name: string;
  meal_price: number;
  slots: AdjustContextSlot[];
};

type SlotEdit = {
  quantity: number;
  meal_type_id: string;
  priceStr: string;
};

function slotLabel(slot: string) {
  if (slot === "lunch") return "Lunch";
  if (slot === "dinner") return "Dinner";
  return "Meal";
}

function scheduleChip(slot: AdjustContextSlot, qty: number) {
  if (qty === 0 && (slot.existing?.status === "pending" || !slot.existing)) {
    return "Cancel this stop";
  }
  if (slot.scheduled) return `Scheduled · base ${slot.schedule_base}`;
  return "Off-schedule";
}

export default function ExtraMealsSheet({
  open,
  onClose,
  onConfirm,
  title = "Adjust meal",
  defaultDate,
  mealPrice,
  currentQty = 1,
  showDate = true,
  cutoffHours,
  busy = false,
  confirmTestId = "adjust-confirm",
  mealTypes = [],
  defaultMealTypeId,
  mealSlots = [],
  defaultMealSlot,
  allowPriceOverride = false,
  customerId,
  customerName,
  summaryMode = "provider",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (args: AdjustDayConfirmArgs) => void | Promise<unknown>;
  title?: string;
  defaultDate?: string;
  mealPrice?: number;
  /** @deprecated single-slot seed; context overrides */
  currentQty?: number;
  showDate?: boolean;
  cutoffHours?: number;
  busy?: boolean;
  confirmTestId?: string;
  mealTypes?: MealTypeOption[];
  defaultMealTypeId?: string | null;
  mealSlots?: string[];
  defaultMealSlot?: string | null;
  allowPriceOverride?: boolean;
  customerId?: string | null;
  customerName?: string | null;
  summaryMode?: "provider" | "consumer";
}) {
  const [date, setDate] = useState(defaultDate || todayISO());
  const [ctx, setCtx] = useState<AdjustContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [edits, setEdits] = useState<Record<string, SlotEdit>>({});
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [highlightSlot, setHighlightSlot] = useState<string | null>(defaultMealSlot || null);

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || todayISO());
    setDaySummary(null);
    setPreviewLoading(false);
    setHighlightSlot(defaultMealSlot || null);
    setCtx(null);
    setEdits({});
  }, [open, defaultDate, defaultMealSlot]);

  useEffect(() => {
    if (!open) return;
    if (summaryMode === "provider" && !customerId) return;
    let cancelled = false;
    setCtxLoading(true);
    (async () => {
      try {
        const path =
          summaryMode === "consumer"
            ? "/consumer/deliveries/adjust-context"
            : "/deliveries/adjust-context";
        const params =
          summaryMode === "consumer"
            ? { date }
            : { customer_id: customerId, date };
        const { data } = await api.get(path, { params });
        if (cancelled) return;
        const context = data as AdjustContext;
        setCtx(context);
        const next: Record<string, SlotEdit> = {};
        for (const s of context.slots || []) {
          const existing = s.existing;
          let qty = 0;
          if (existing) {
            // Trust existing: cancelled → 0 (never fall back to schedule_base)
            qty =
              existing.status === "cancelled"
                ? 0
                : Math.max(0, Number(existing.quantity) || 0);
          } else if (s.scheduled) {
            qty = Math.max(0, Number(s.schedule_base) || 0);
          }
          const tid =
            (existing && existing.status !== "cancelled" && existing.meal_type_id) ||
            existing?.meal_type_id ||
            s.suggested_meal_type_id ||
            "regular";
          const price =
            existing?.meal_price ||
            context.meal_price ||
            0;
          next[s.meal_slot] = {
            quantity: Math.min(MAX_QTY, qty),
            meal_type_id: String(tid),
            priceStr: price > 0 ? String(price) : "",
          };
        }
        setEdits(next);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.response?.data?.detail || "Failed to load day plan");
          setCtx(null);
        }
      } finally {
        if (!cancelled) setCtxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, date, customerId, summaryMode]);

  const slots = ctx?.slots || [];
  const crmPrice = ctx?.meal_price ?? mealPrice ?? 0;
  const displayName = ctx?.customer_name || customerName || "";

  const customerLines = useMemo(() => {
    if (!daySummary?.pack_list?.length || !customerId) return [];
    return daySummary.pack_list.filter((p) => p.customer_id === customerId);
  }, [daySummary, customerId]);

  function updateSlot(slot: string, patch: Partial<SlotEdit>) {
    setEdits((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], ...patch },
    }));
    setDaySummary(null);
  }

  function buildConfirmArgs(): AdjustDayConfirmArgs {
    return {
      date,
      slots: slots
        .filter((s) => s.editable)
        .map((s) => {
          const e = edits[s.meal_slot] || {
            quantity: 0,
            meal_type_id: s.suggested_meal_type_id,
            priceStr: "",
          };
          return {
            meal_slot: s.meal_slot,
            quantity: Math.min(MAX_QTY, Math.max(0, Math.floor(e.quantity))),
            meal_type_id: e.meal_type_id || null,
            meal_price:
              allowPriceOverride && Number(e.priceStr) > 0 ? Number(e.priceStr) : null,
          };
        }),
    };
  }

  async function showSummary(e: React.FormEvent) {
    e.preventDefault();
    if (busy || previewLoading || daySummary || ctxLoading) return;
    if (!customerId && summaryMode === "provider") {
      toast.error("Customer required");
      return;
    }
    if (!ctx?.slots?.length) {
      toast.error("No meal slots for this day");
      return;
    }
    const editable = slots.filter((s) => s.editable);
    if (!editable.length) {
      toast.error("No editable stops for this day (already delivered or locked)");
      return;
    }
    setPreviewLoading(true);
    try {
      const patches = slots
        .filter((s) => s.editable)
        .map((s) => {
          const ed = edits[s.meal_slot];
          const tid = ed?.meal_type_id || s.suggested_meal_type_id || "regular";
          const tname =
            mealTypes.find((t) => t.id === tid)?.name ||
            s.suggested_meal_type_name ||
            tid;
          return {
            customer_id: customerId || ctx.customer_id || "",
            customer_name: displayName || undefined,
            meal_slot: s.meal_slot,
            meal_type_id: tid,
            meal_type_name: tname,
            quantity: Math.min(MAX_QTY, Math.max(0, Math.floor(ed?.quantity ?? 0))),
          };
        });
      let projected: DaySummary;
      if (summaryMode === "consumer") {
        const { data } = await api.get("/consumer/deliveries");
        projected = projectConsumerDaySummary(
          date,
          Array.isArray(data) ? data : [],
          patches,
        );
      } else {
        const { data } = await api.get("/reports/kitchen-summary", { params: { date } });
        projected = projectDaySummaryMulti(
          { ...(data || {}), date: data?.date || date },
          patches,
        );
      }
      setDaySummary(projected);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to build summary");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function confirmSave() {
    if (busy || !daySummary) return;
    const args = buildConfirmArgs();
    if (!args.slots.length) {
      toast.error("No editable stops to save");
      return;
    }
    const res = await onConfirm(args);
    if (res != null) {
      setDaySummary(null);
      onClose();
    }
  }

  function backToEdit() {
    setDaySummary(null);
  }

  function dismiss() {
    setDaySummary(null);
    onClose();
  }

  const locked = busy || previewLoading || ctxLoading;
  const editableCount = slots.filter((s) => s.editable).length;
  // silence unused legacy props used only for seeding when context fails
  void currentQty;
  void mealSlots;

  return (
    <AppSheet
      open={open}
      onClose={locked ? () => {} : dismiss}
      title={
        daySummary
          ? summaryMode === "consumer"
            ? `Your meals for ${daySummary.date} · preview`
            : `Summary for ${daySummary.date} · preview`
          : title
      }
      size="md"
      as={daySummary ? "div" : "form"}
      onSubmit={daySummary ? undefined : showSummary}
      footer={(
        <div className="flex gap-2">
          {daySummary ? (
            <>
              <button
                type="button"
                onClick={backToEdit}
                className="pill-btn btn-outline flex-1 h-11 cursor-pointer hover:bg-brand-surface"
                disabled={busy}
                data-testid="adjust-summary-back"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmSave}
                className="pill-btn btn-primary flex-1 h-11 cursor-pointer"
                disabled={busy}
                data-testid={confirmTestId}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={dismiss}
                className="pill-btn btn-outline flex-1 h-11 cursor-pointer hover:bg-brand-surface"
                disabled={locked}
              >
                Dismiss
              </button>
              <button
                type="submit"
                data-testid="adjust-show-summary"
                className="pill-btn btn-primary flex-1 h-11 cursor-pointer"
                disabled={locked || !editableCount}
              >
                {previewLoading || ctxLoading ? "Loading…" : "Show summary"}
              </button>
            </>
          )}
        </div>
      )}
    >
      {daySummary ? (
        <div className="flex flex-col gap-4" data-testid="adjust-day-summary">
          <p className="text-sm text-muted-foreground">
            {summaryMode === "consumer"
              ? "Preview of your plan for this day. Save to apply."
              : "Preview of the kitchen cook plan. Save to apply the change."}
          </p>
          <div className="rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-3">
            <div className="label-overline">Totals</div>
            <div className="font-display font-bold text-xl mt-0.5">
              {daySummary.totals?.meals ?? 0} meals
              <span className="text-sm font-medium text-muted-foreground ml-2">
                · {daySummary.totals?.stops ?? 0} stops
              </span>
            </div>
          </div>
          {daySummary.matrix && daySummary.matrix.length > 0 ? (
            <div className="flex flex-wrap gap-2" data-testid="adjust-summary-matrix">
              {daySummary.matrix.map((row) => (
                <span
                  key={`${row.meal_type_id}-${row.slot}`}
                  className="inline-flex items-center rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-medium"
                >
                  {row.meal_type_name} · {slotLabel(row.slot)} · {row.meals}
                </span>
              ))}
            </div>
          ) : null}
          {customerLines.length > 0 ? (
            <div className="rounded-xl border border-brand-border px-4 py-3 space-y-2" data-testid="adjust-summary-customer-line">
              <div className="label-overline">
                {summaryMode === "consumer" ? "Your stops" : displayName || "Customer"}
              </div>
              {customerLines.map((line) => (
                <div key={`${line.meal_slot}-${line.meal_type_id}`} className="text-sm font-medium">
                  {line.meal_type_name || "Meal"} · {slotLabel(String(line.meal_slot || "dinner"))} ·{" "}
                  {line.quantity ?? 1}×
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active stops for this customer after cancel(s).</p>
          )}
          {summaryMode === "provider" && daySummary.date ? (
            <Link
              href={`/provider/kitchen?date=${daySummary.date}`}
              className="text-sm text-primary font-medium hover:underline"
              data-testid="adjust-open-kitchen"
            >
              Open Kitchen →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Edit the day plan (qty + type per slot), then review the summary before saving.
            Set quantity to 0 to cancel a pending stop.
          </p>
          {showDate ? (
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Delivery date</span>
              <input
                data-testid="adjust-date"
                type="date"
                className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                value={date}
                min={todayISO()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDaySummary(null);
                }}
                required
              />
            </label>
          ) : null}
          {displayName ? (
            <p className="text-sm font-medium" data-testid="adjust-customer-name">
              {displayName}
              {crmPrice > 0 ? (
                <span className="text-muted-foreground font-normal"> · CRM {fmtCAD(crmPrice)}/meal</span>
              ) : null}
            </p>
          ) : null}
          {ctxLoading ? (
            <p className="text-sm text-muted-foreground">Loading day plan…</p>
          ) : null}
          {!ctxLoading && slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lunch/dinner slots for this customer.</p>
          ) : null}
          {slots.map((slot) => {
            const ed = edits[slot.meal_slot] || {
              quantity: 0,
              meal_type_id: slot.suggested_meal_type_id,
              priceStr: "",
            };
            const qty = Math.min(MAX_QTY, Math.max(0, Math.floor(ed.quantity)));
            const unit = allowPriceOverride
              ? Number(ed.priceStr) || 0
              : Number(mealTypes.find((t) => t.id === ed.meal_type_id)?.price ?? crmPrice) || 0;
            const highlighted = highlightSlot === slot.meal_slot;
            const readOnly = !slot.editable;
            return (
              <div
                key={slot.meal_slot}
                data-testid={`adjust-slot-row-${slot.meal_slot}`}
                className={`rounded-xl border px-4 py-3 flex flex-col gap-3 ${
                  highlighted ? "border-primary bg-primary/5" : "border-brand-border"
                } ${readOnly ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-semibold">{slotLabel(slot.meal_slot)}</div>
                  <span className="text-xs text-muted-foreground">{scheduleChip(slot, qty)}</span>
                </div>
                {readOnly ? (
                  <p className="text-sm text-muted-foreground">
                    {slot.existing?.status || "locked"} · {slot.existing?.quantity ?? 0}×{" "}
                    {slot.existing?.meal_type_name || ""}
                  </p>
                ) : (
                  <>
                    {mealTypes.length > 0 ? (
                      <label className="flex flex-col gap-1.5">
                        <span className="label-overline">Meal type</span>
                        <SearchableSelect
                          testid={`adjust-meal-type-${slot.meal_slot}`}
                          inputClassName="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                          value={ed.meal_type_id}
                          onChange={(next) => {
                            const t = mealTypes.find((x) => x.id === next);
                            updateSlot(slot.meal_slot, {
                              meal_type_id: next,
                              ...(t && allowPriceOverride ? { priceStr: String(t.price) } : {}),
                            });
                          }}
                          disabled={locked}
                          options={mealTypes.map((t) => ({
                            value: t.id,
                            label: `${t.name} (${fmtCAD(t.price)})`,
                          }))}
                          placeholder="Search meal type…"
                        />
                      </label>
                    ) : null}
                    <label className="flex flex-col gap-1.5">
                      <span className="label-overline">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          data-testid={`adjust-qty-dec-${slot.meal_slot}`}
                          className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
                          onClick={() => updateSlot(slot.meal_slot, { quantity: Math.max(0, qty - 1) })}
                          disabled={qty <= 0 || locked}
                        >
                          −
                        </button>
                        <input
                          data-testid={`adjust-qty-${slot.meal_slot}`}
                          type="number"
                          min={0}
                          max={MAX_QTY}
                          className="h-11 w-16 text-center rounded-xl border border-brand-border bg-white text-sm font-semibold"
                          value={qty}
                          onChange={(e) => {
                            const v = Math.floor(Number(e.target.value) || 0);
                            updateSlot(slot.meal_slot, {
                              quantity: Math.min(MAX_QTY, Math.max(0, v)),
                            });
                          }}
                        />
                        <button
                          type="button"
                          data-testid={`adjust-qty-inc-${slot.meal_slot}`}
                          className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
                          onClick={() => updateSlot(slot.meal_slot, { quantity: Math.min(MAX_QTY, qty + 1) })}
                          disabled={qty >= MAX_QTY || locked}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {qty === 0 ? "Cancel this stop (0)" : `Absolute count (0–${MAX_QTY})`}
                      </span>
                    </label>
                    {allowPriceOverride ? (
                      <label className="flex flex-col gap-1.5">
                        <span className="label-overline">Unit price (CAD)</span>
                        <input
                          data-testid={`adjust-meal-price-${slot.meal_slot}`}
                          type="number"
                          min={0.01}
                          step={0.01}
                          className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                          value={ed.priceStr}
                          onChange={(e) => updateSlot(slot.meal_slot, { priceStr: e.target.value })}
                          disabled={locked}
                        />
                      </label>
                    ) : null}
                    {unit > 0 && qty > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {qty} × {fmtCAD(unit)} = {fmtCAD(unit * qty)}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
          {cutoffHours != null ? (
            <p className="text-xs text-muted-foreground">
              Subject to your provider&apos;s {cutoffHours}h cutoff before delivery (same as cancel).
            </p>
          ) : null}
        </div>
      )}
    </AppSheet>
  );
}
