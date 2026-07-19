"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AppSheet from "@/components/AppSheet";
import CustomerAsyncSelect, { type CustomerAsyncOption } from "@/components/CustomerAsyncSelect";
import { todayISO } from "@/lib/format";

const MAX_QTY = 20;

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
  const [date, setDate] = useState(defaultDate || todayISO());
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || todayISO());
    setQty(1);
    if (lockedCustomer) {
      setCustomer({ id: lockedCustomer.id, name: lockedCustomer.name });
    } else {
      setCustomer(null);
    }
  }, [open, lockedCustomer, defaultDate]);

  const clampedQty = Math.min(MAX_QTY, Math.max(1, qty));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cid = lockedCustomer?.id || customer?.id;
    if (!cid) {
      toast.error("Select a customer");
      return;
    }
    if (!date) {
      toast.error("Pick a delivery date");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/deliveries/extra", {
        customer_id: cid,
        date,
        quantity: clampedQty,
      });
      toast.success(clampedQty === 1 ? "Extra meal added" : `${clampedQty} extra meals added`);
      onAdded?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to add extra meal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppSheet
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={lockedCustomer ? `Extra for ${lockedCustomer.name}` : "Add extra meal"}
      size="md"
      as="form"
      onSubmit={submit}
      closeTestId="add-extra-sheet-close"
      footer={(
        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="pill-btn btn-outline flex-1 h-11 cursor-pointer disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            data-testid="add-extra-confirm"
            type="submit"
            disabled={submitting || clampedQty < 1}
            className="pill-btn btn-primary flex-1 h-11 cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add extras"}
          </button>
        </div>
      )}
    >
      <div className="flex flex-col gap-4" data-testid="add-extra-sheet">
        <p className="text-sm text-muted-foreground">
          Add tiffins for a delivery day at the customer&apos;s unit meal price. Charged when marked delivered.
        </p>

        {lockedCustomer ? (
          <div className="rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-3">
            <div className="label-overline">Customer</div>
            <div className="font-medium mt-0.5" data-testid="add-extra-customer-locked">
              {lockedCustomer.name}
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <CustomerAsyncSelect
              value={customer}
              onChange={setCustomer}
              disabled={submitting}
              testid="extra-customer"
              placeholder="Search customer"
            />
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Delivery date</span>
          <input
            data-testid="add-extra-date"
            type="date"
            className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={submitting}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Extra meals</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="add-extra-qty-dec"
              className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={clampedQty <= 1 || submitting}
            >
              −
            </button>
            <input
              data-testid="add-extra-qty"
              type="number"
              min={1}
              max={MAX_QTY}
              className="h-11 w-16 text-center rounded-xl border border-brand-border bg-white text-sm font-semibold"
              value={clampedQty}
              onChange={(e) => {
                const v = Math.floor(Number(e.target.value) || 1);
                setQty(Math.min(MAX_QTY, Math.max(1, v)));
              }}
              disabled={submitting}
            />
            <button
              type="button"
              data-testid="add-extra-qty-inc"
              className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
              onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
              disabled={clampedQty >= MAX_QTY || submitting}
            >
              +
            </button>
          </div>
          <span className="text-xs text-muted-foreground">Max {MAX_QTY} meals per day (including schedule)</span>
        </label>
      </div>
    </AppSheet>
  );
}
