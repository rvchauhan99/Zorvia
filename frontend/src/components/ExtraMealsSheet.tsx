"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AppSheet from "@/components/AppSheet";
import { fmtCAD, todayISO } from "@/lib/format";
import {
  projectConsumerDaySummary,
  projectDaySummary,
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

function slotLabel(slot: string) {
  if (slot === "lunch") return "Lunch";
  if (slot === "dinner") return "Dinner";
  return "Meal";
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
  onConfirm: (args: AdjustConfirmArgs) => void | Promise<unknown>;
  title?: string;
  defaultDate?: string;
  mealPrice?: number;
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
  const [qty, setQty] = useState(Math.max(1, currentQty || 1));
  const [mealTypeId, setMealTypeId] = useState("");
  const [mealSlot, setMealSlot] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const dualSlots = mealSlots.filter((s) => s === "lunch" || s === "dinner").length >= 2;
  const needsSlot = dualSlots || mealSlots.length > 1;

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || todayISO());
    setQty(Math.min(MAX_QTY, Math.max(1, currentQty || 1)));
    setDaySummary(null);
    setPreviewLoading(false);
    const tid =
      defaultMealTypeId ||
      mealTypes[0]?.id ||
      "";
    setMealTypeId(tid);
    const slot =
      defaultMealSlot ||
      (mealSlots.length === 1 ? mealSlots[0] : dualSlots ? "lunch" : mealSlots[0] || "");
    setMealSlot(slot || "");
    const fromType = mealTypes.find((t) => t.id === tid);
    const seed =
      mealPrice != null && mealPrice > 0
        ? mealPrice
        : fromType?.price ?? 0;
    setPriceStr(seed > 0 ? String(seed) : "");
  }, [
    open,
    defaultDate,
    currentQty,
    defaultMealTypeId,
    defaultMealSlot,
    mealSlots,
    mealTypes,
    mealPrice,
    dualSlots,
  ]);

  const clampedQty = Math.min(MAX_QTY, Math.max(1, qty));
  const unit = allowPriceOverride
    ? Number(priceStr) || 0
    : Number(mealTypes.find((t) => t.id === mealTypeId)?.price ?? mealPrice) || 0;
  const lineTotal = unit * clampedQty;
  const typeName = mealTypes.find((t) => t.id === mealTypeId)?.name || mealTypeId || "Meal";
  const resolvedSlot = mealSlot || (mealSlots.length === 1 ? mealSlots[0] : "uncategorized") || "uncategorized";

  const customerLine = useMemo(() => {
    if (!daySummary?.pack_list?.length) return null;
    if (customerId) {
      const slot = resolvedSlot;
      return (
        daySummary.pack_list.find(
          (p) => p.customer_id === customerId && String(p.meal_slot || "uncategorized") === slot,
        ) ||
        daySummary.pack_list.find((p) => p.customer_id === customerId) ||
        daySummary.pack_list[0]
      );
    }
    return daySummary.pack_list[0];
  }, [daySummary, customerId, resolvedSlot]);

  function confirmArgs(): AdjustConfirmArgs {
    return {
      date,
      quantity: clampedQty,
      meal_slot: needsSlot ? mealSlot || null : mealSlot || null,
      meal_type_id: mealTypeId || null,
      meal_price: allowPriceOverride && Number(priceStr) > 0 ? Number(priceStr) : null,
    };
  }

  async function showSummary(e: React.FormEvent) {
    e.preventDefault();
    if (busy || previewLoading || daySummary) return;
    if (needsSlot && !mealSlot) {
      toast.error("Select a meal slot");
      return;
    }
    if (!customerId && summaryMode === "provider") {
      toast.error("Customer required");
      return;
    }
    setPreviewLoading(true);
    try {
      const patch = {
        customer_id: customerId || "",
        customer_name: customerName || undefined,
        meal_slot: resolvedSlot,
        meal_type_id: mealTypeId || "regular",
        meal_type_name: typeName,
        quantity: clampedQty,
      };
      let projected: DaySummary;
      if (summaryMode === "consumer") {
        const { data } = await api.get("/consumer/deliveries");
        projected = projectConsumerDaySummary(
          date,
          Array.isArray(data) ? data : [],
          { ...patch, customer_id: customerId || patch.customer_id },
        );
      } else {
        const { data } = await api.get("/reports/kitchen-summary", { params: { date } });
        projected = projectDaySummary(
          { ...(data || {}), date: data?.date || date },
          patch,
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
    const res = await onConfirm(confirmArgs());
    // Parents return response body on success and undefined on error.
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

  const locked = busy || previewLoading;

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
                disabled={locked || clampedQty < 1 || (needsSlot && !mealSlot)}
              >
                {previewLoading ? "Loading…" : "Show summary"}
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
          {customerLine ? (
            <div className="rounded-xl border border-brand-border px-4 py-3" data-testid="adjust-summary-customer-line">
              <div className="label-overline">
                {summaryMode === "consumer" ? "Your stop" : customerLine.customer_name || customerName || "Customer"}
              </div>
              <div className="text-sm font-medium mt-0.5">
                {customerLine.meal_type_name || "Meal"} · {slotLabel(String(customerLine.meal_slot || "uncategorized"))} ·{" "}
                {customerLine.quantity ?? 1}×
              </div>
            </div>
          ) : null}
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
            Set the meal count and type for this day, then review the day summary before saving.
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
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
          ) : null}
          {needsSlot ? (
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Meal slot</span>
              <select
                data-testid="adjust-slot"
                className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                value={mealSlot}
                onChange={(e) => setMealSlot(e.target.value)}
                required
                disabled={locked}
              >
                {(mealSlots.length ? mealSlots : ["lunch", "dinner"]).map((s) => (
                  <option key={s} value={s}>{slotLabel(s)}</option>
                ))}
              </select>
            </label>
          ) : null}
          {mealTypes.length > 0 ? (
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Meal type</span>
              <select
                data-testid="adjust-meal-type"
                className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                value={mealTypeId}
                onChange={(e) => {
                  const next = e.target.value;
                  setMealTypeId(next);
                  const t = mealTypes.find((x) => x.id === next);
                  if (t) setPriceStr(String(t.price));
                }}
                disabled={locked}
              >
                {mealTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({fmtCAD(t.price)})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="adjust-qty-dec"
                className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={clampedQty <= 1 || locked}
              >
                −
              </button>
              <input
                data-testid="adjust-qty"
                type="number"
                min={1}
                max={MAX_QTY}
                className="h-11 w-16 text-center rounded-xl border border-brand-border bg-white text-sm font-semibold"
                value={clampedQty}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value) || 1);
                  setQty(Math.min(MAX_QTY, Math.max(1, v)));
                }}
              />
              <button
                type="button"
                data-testid="adjust-qty-inc"
                className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                disabled={clampedQty >= MAX_QTY || locked}
              >
                +
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              Absolute count (1–{MAX_QTY}){currentQty > 0 ? ` · currently ${currentQty}` : ""}
            </span>
          </label>
          {allowPriceOverride ? (
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Unit price (CAD)</span>
              <input
                data-testid="adjust-meal-price"
                type="number"
                min={0.01}
                step={0.01}
                className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                disabled={locked}
              />
            </label>
          ) : null}
          {unit > 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="adjust-line-preview">
              {clampedQty} × {fmtCAD(unit)} = <span className="font-medium text-foreground">{fmtCAD(lineTotal)}</span>
              {" "}(outstanding when delivered)
            </p>
          ) : null}
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
