"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AppSheet from "@/components/AppSheet";
import CustomerAsyncSelect, { type CustomerAsyncOption } from "@/components/CustomerAsyncSelect";
import ExtraMealsSheet, {
  type AdjustDayConfirmArgs,
  type MealTypeOption,
} from "@/components/ExtraMealsSheet";
import { todayISO } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
  /** When set, customer is locked (dashboard row / customer detail). */
  lockedCustomer?: { id: string; name: string } | null;
  defaultDate?: string;
};

export default function AddExtraMealSheet({
  open,
  onClose,
  onAdded,
  lockedCustomer = null,
  defaultDate,
}: Props) {
  const [customer, setCustomer] = useState<CustomerAsyncOption | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mealTypes, setMealTypes] = useState<MealTypeOption[]>([]);

  const cid = lockedCustomer?.id || customer?.id;
  const cname = lockedCustomer?.name || customer?.name;

  useEffect(() => {
    if (!open) {
      setPickOpen(false);
      setPlanOpen(false);
      setCustomer(null);
      setBusy(false);
      return;
    }
    if (lockedCustomer) {
      setCustomer({ id: lockedCustomer.id, name: lockedCustomer.name });
      setPickOpen(false);
      setPlanOpen(true);
    } else {
      setCustomer(null);
      setPickOpen(true);
      setPlanOpen(false);
    }
  }, [open, lockedCustomer]);

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

  function dismissAll() {
    setPickOpen(false);
    setPlanOpen(false);
    onClose();
  }

  async function confirmDay(args: AdjustDayConfirmArgs) {
    if (!cid) return;
    setBusy(true);
    try {
      const { data } = await api.post("/deliveries/adjust-day", {
        customer_id: cid,
        date: args.date,
        slots: args.slots.map((s) => ({
          meal_slot: s.meal_slot,
          quantity: s.quantity,
          meal_type_id: s.meal_type_id || undefined,
          meal_price: s.meal_price ?? undefined,
          meal_type_lines: s.meal_type_lines?.length ? s.meal_type_lines : undefined,
        })),
      });
      toast.success("Meal adjusted");
      onAdded?.();
      dismissAll();
      return data;
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to adjust meal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppSheet
        open={open && pickOpen && !lockedCustomer}
        onClose={dismissAll}
        title="Adjust meal"
        size="md"
        footer={(
          <div className="flex gap-2">
            <button
              type="button"
              onClick={dismissAll}
              className="pill-btn btn-outline flex-1 h-11 cursor-pointer hover:bg-brand-surface"
            >
              Dismiss
            </button>
            <button
              type="button"
              data-testid="add-adjust-continue"
              className="pill-btn btn-primary flex-1 h-11 cursor-pointer"
              disabled={!customer}
              onClick={() => {
                if (!customer) {
                  toast.error("Select a customer");
                  return;
                }
                setPickOpen(false);
                setPlanOpen(true);
              }}
            >
              Continue
            </button>
          </div>
        )}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Choose a customer, then edit their lunch/dinner day plan.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Customer</span>
            <CustomerAsyncSelect
              value={customer}
              onChange={setCustomer}
              testid="add-adjust-customer"
            />
          </label>
        </div>
      </AppSheet>

      <ExtraMealsSheet
        open={open && planOpen && !!cid}
        onClose={dismissAll}
        onConfirm={confirmDay}
        title="Adjust meal"
        defaultDate={defaultDate || todayISO()}
        customerId={cid}
        customerName={cname}
        mealTypes={mealTypes}
        allowPriceOverride
        busy={busy}
        confirmTestId="add-adjust-confirm"
        summaryMode="provider"
      />
    </>
  );
}
