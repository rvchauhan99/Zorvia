"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AppSheet from "@/components/AppSheet";
import CustomerAsyncSelect, { type CustomerAsyncOption } from "@/components/CustomerAsyncSelect";
import SearchableSelect from "@/components/SearchableSelect";
import { fmtCAD, todayISO } from "@/lib/format";
import { projectDaySummary, type DaySummary } from "@/lib/adjustPreview";
import type { MealTypeOption } from "@/components/ExtraMealsSheet";

const MAX_QTY = 20;

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
  /** When set, customer is locked (dashboard row / customer detail). */
  lockedCustomer?: { id: string; name: string } | null;
  defaultDate?: string;
};

function slotLabel(slot: string) {
  if (slot === "lunch") return "Lunch";
  if (slot === "dinner") return "Dinner";
  return "Meal";
}

export default function AddExtraMealSheet({
  open,
  onClose,
  onAdded,
  lockedCustomer = null,
  defaultDate,
}: Props) {
  const [customer, setCustomer] = useState<CustomerAsyncOption | null>(null);
  const [date, setDate] = useState(defaultDate || todayISO());
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mealTypes, setMealTypes] = useState<MealTypeOption[]>([]);
  const [mealTypeId, setMealTypeId] = useState("regular");
  const [mealSlots, setMealSlots] = useState<string[]>([]);
  const [mealSlot, setMealSlot] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [customerLineName, setCustomerLineName] = useState("");

  const dualSlots = mealSlots.filter((s) => s === "lunch" || s === "dinner").length >= 2;
  const needsSlot = dualSlots || mealSlots.length > 1;
  const cid = lockedCustomer?.id || customer?.id;
  const locked = submitting || previewLoading;

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || todayISO());
    setQty(1);
    setDaySummary(null);
    setPreviewLoading(false);
    setMealSlots([]);
    setMealSlot("");
    if (lockedCustomer) {
      setCustomer({ id: lockedCustomer.id, name: lockedCustomer.name });
      setCustomerLineName(lockedCustomer.name);
    } else {
      setCustomer(null);
      setCustomerLineName("");
    }
  }, [open, lockedCustomer, defaultDate]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/providers/me");
        const types = Array.isArray(data?.meal_types)
          ? data.meal_types.map((t: any) => ({
              id: String(t.id),
              name: String(t.name || t.id),
              price: Number(t.price) || 0,
            }))
          : [];
        if (!cancelled) {
          setMealTypes(types.length ? types : [{ id: "regular", name: "Regular", price: 12 }]);
        }
      } catch {
        if (!cancelled) setMealTypes([{ id: "regular", name: "Regular", price: 12 }]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !cid) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/customers/${cid}`);
        if (cancelled) return;
        const slots: string[] = Array.isArray(data?.meal_slots) && data.meal_slots.length
          ? data.meal_slots
          : ["dinner"];
        setMealSlots(slots);
        setMealSlot(slots.length === 1 ? slots[0] : slots.includes("lunch") ? "lunch" : slots[0]);
        const tid = String(data?.meal_type_id || "regular");
        setMealTypeId(tid);
        setCustomerLineName(data?.name || lockedCustomer?.name || customer?.name || "");
        const price = Number(data?.meal_price) || 0;
        setPriceStr(price > 0 ? String(price) : "");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cid, lockedCustomer?.name, customer?.name]);

  useEffect(() => {
    if (!open || !cid || !date) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/deliveries", { params: { date, auto_generate: true } });
        if (cancelled || !Array.isArray(data)) return;
        const slot = mealSlot || undefined;
        const row = data.find(
          (d: any) =>
            d.customer_id === cid &&
            (d.status === "pending") &&
            (!slot || (d.meal_slot || "dinner") === slot),
        );
        if (row) {
          setQty(Math.max(1, Number(row.quantity) || 1));
          if (row.meal_type_id) setMealTypeId(String(row.meal_type_id));
          if (row.meal_price != null) setPriceStr(String(row.meal_price));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cid, date, mealSlot]);

  const clampedQty = Math.min(MAX_QTY, Math.max(1, qty));
  const unit = Number(priceStr) || 0;
  const typeName = mealTypes.find((t) => t.id === mealTypeId)?.name || mealTypeId || "Meal";
  const resolvedSlot = mealSlot || (mealSlots.length === 1 ? mealSlots[0] : "dinner") || "dinner";

  async function showSummary(e: React.FormEvent) {
    e.preventDefault();
    if (!cid) {
      toast.error("Select a customer");
      return;
    }
    if (!date) {
      toast.error("Pick a delivery date");
      return;
    }
    if (needsSlot && !mealSlot) {
      toast.error("Select a meal slot");
      return;
    }
    setPreviewLoading(true);
    try {
      const { data } = await api.get("/reports/kitchen-summary", { params: { date } });
      const projected = projectDaySummary(
        { ...(data || {}), date: data?.date || date },
        {
          customer_id: cid,
          customer_name: customerLineName || lockedCustomer?.name || customer?.name || "",
          meal_slot: resolvedSlot,
          meal_type_id: mealTypeId || "regular",
          meal_type_name: typeName,
          quantity: clampedQty,
        },
      );
      setDaySummary(projected);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to build summary");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function confirmSave() {
    if (!cid || !daySummary || submitting) return;
    setSubmitting(true);
    try {
      await api.post("/deliveries/adjust", {
        customer_id: cid,
        date,
        quantity: clampedQty,
        meal_slot: needsSlot ? mealSlot : mealSlot || undefined,
        meal_type_id: mealTypeId || undefined,
        meal_price: unit > 0 ? unit : undefined,
      });
      toast.success("Meal adjusted");
      onAdded?.();
      setDaySummary(null);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to adjust meal");
    } finally {
      setSubmitting(false);
    }
  }

  function backToEdit() {
    setDaySummary(null);
  }

  function dismiss() {
    setDaySummary(null);
    onClose();
  }

  const customerLine =
    daySummary?.pack_list?.find(
      (p) => p.customer_id === cid && String(p.meal_slot || "dinner") === resolvedSlot,
    ) ||
    daySummary?.pack_list?.find((p) => p.customer_id === cid) ||
    daySummary?.pack_list?.[0];

  return (
    <AppSheet
      open={open}
      onClose={() => {
        if (!locked) dismiss();
      }}
      title={
        daySummary
          ? `Summary for ${daySummary.date} · preview`
          : lockedCustomer
            ? `Adjust for ${lockedCustomer.name}`
            : "Adjust meal"
      }
      size="md"
      as={daySummary ? "div" : "form"}
      onSubmit={daySummary ? undefined : showSummary}
      closeTestId="add-adjust-sheet-close"
      footer={(
        <div className="flex gap-2">
          {daySummary ? (
            <>
              <button
                type="button"
                onClick={backToEdit}
                disabled={submitting}
                className="pill-btn btn-outline flex-1 h-11 cursor-pointer disabled:opacity-50"
                data-testid="add-adjust-summary-back"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={submitting}
                className="pill-btn btn-primary flex-1 h-11 cursor-pointer disabled:opacity-50"
                data-testid="add-adjust-confirm"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={locked}
                onClick={dismiss}
                className="pill-btn btn-outline flex-1 h-11 cursor-pointer disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                data-testid="add-adjust-show-summary"
                type="submit"
                disabled={locked || clampedQty < 1 || !cid}
                className="pill-btn btn-primary flex-1 h-11 cursor-pointer disabled:opacity-50"
              >
                {previewLoading ? "Loading…" : "Show summary"}
              </button>
            </>
          )}
        </div>
      )}
    >
      {daySummary ? (
        <div className="flex flex-col gap-4" data-testid="add-adjust-day-summary">
          <p className="text-sm text-muted-foreground">
            Preview of the kitchen cook plan. Save to apply the change.
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
            <div className="flex flex-wrap gap-2">
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
            <div className="rounded-xl border border-brand-border px-4 py-3">
              <div className="label-overline">{customerLine.customer_name || customerLineName || "Customer"}</div>
              <div className="text-sm font-medium mt-0.5">
                {customerLine.meal_type_name || "Meal"} · {slotLabel(String(customerLine.meal_slot || "dinner"))} ·{" "}
                {customerLine.quantity ?? 1}×
              </div>
            </div>
          ) : null}
          {daySummary.date ? (
            <Link
              href={`/provider/kitchen?date=${daySummary.date}`}
              className="text-sm text-primary font-medium hover:underline"
            >
              Open Kitchen →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="add-adjust-sheet">
          <p className="text-sm text-muted-foreground">
            Set absolute quantity and meal type for a delivery day, then review the day summary before saving.
          </p>

          {lockedCustomer ? (
            <div className="rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-3">
              <div className="label-overline">Customer</div>
              <div className="font-medium mt-0.5" data-testid="add-adjust-customer-locked">
                {lockedCustomer.name}
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <CustomerAsyncSelect
                value={customer}
                onChange={setCustomer}
                disabled={locked}
                testid="adjust-customer"
                placeholder="Search customer"
              />
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Delivery date</span>
            <input
              data-testid="add-adjust-date"
              type="date"
              className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={locked}
            />
          </label>

          {needsSlot ? (
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Meal slot</span>
              <SearchableSelect
                testid="add-adjust-slot"
                inputClassName="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                value={mealSlot}
                onChange={setMealSlot}
                disabled={locked}
                options={mealSlots.map((s) => ({ value: s, label: slotLabel(s) }))}
                placeholder="Search slot…"
              />
            </label>
          ) : null}

          {mealTypes.length > 0 ? (
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Meal type</span>
              <SearchableSelect
                testid="add-adjust-meal-type"
                inputClassName="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
                value={mealTypeId}
                onChange={(next) => {
                  setMealTypeId(next);
                  const t = mealTypes.find((x) => x.id === next);
                  if (t) setPriceStr(String(t.price));
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
                data-testid="add-adjust-qty-dec"
                className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={clampedQty <= 1 || locked}
              >
                −
              </button>
              <input
                data-testid="add-adjust-qty"
                type="number"
                min={1}
                max={MAX_QTY}
                className="h-11 w-16 text-center rounded-xl border border-brand-border bg-white text-sm font-semibold"
                value={clampedQty}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value) || 1);
                  setQty(Math.min(MAX_QTY, Math.max(1, v)));
                }}
                disabled={locked}
              />
              <button
                type="button"
                data-testid="add-adjust-qty-inc"
                className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                disabled={clampedQty >= MAX_QTY || locked}
              >
                +
              </button>
            </div>
            <span className="text-xs text-muted-foreground">Absolute count (max {MAX_QTY})</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Unit price (CAD)</span>
            <input
              data-testid="add-adjust-meal-price"
              type="number"
              min={0.01}
              step={0.01}
              className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              disabled={locked}
            />
          </label>
        </div>
      )}
    </AppSheet>
  );
}
