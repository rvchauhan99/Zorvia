"use client";

import React, { useEffect, useState } from "react";
import AppSheet from "@/components/AppSheet";
import { fmtCAD, todayISO } from "@/lib/format";

const MAX_QTY = 20;

export default function ExtraMealsSheet({
  open,
  onClose,
  onConfirm,
  title = "Add extra meal",
  defaultDate,
  mealPrice,
  currentQty = 1,
  showDate = true,
  cutoffHours,
  busy = false,
  confirmTestId = "extra-confirm",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (args: { date: string; quantity: number }) => void | Promise<void>;
  title?: string;
  defaultDate?: string;
  mealPrice?: number;
  currentQty?: number;
  showDate?: boolean;
  cutoffHours?: number;
  busy?: boolean;
  confirmTestId?: string;
}) {
  const [date, setDate] = useState(defaultDate || todayISO());
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || todayISO());
    setQty(1);
  }, [open, defaultDate]);

  const maxAdd = Math.max(1, MAX_QTY - Math.max(1, currentQty));
  const clampedQty = Math.min(qty, maxAdd);
  const unit = Number(mealPrice) || 0;
  const lineTotal = unit * clampedQty;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    await onConfirm({ date, quantity: clampedQty });
  }

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      as="form"
      onSubmit={submit}
      footer={(
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pill-btn btn-outline flex-1 h-11 cursor-pointer hover:bg-brand-surface"
            disabled={busy}
          >
            Dismiss
          </button>
          <button
            type="submit"
            data-testid={confirmTestId}
            className="pill-btn btn-primary flex-1 h-11 cursor-pointer"
            disabled={busy || clampedQty < 1}
          >
            {busy ? "Adding…" : "Add extras"}
          </button>
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        {showDate ? (
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Delivery date</span>
            <input
              data-testid="extra-date"
              type="date"
              className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Extra meals</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="extra-qty-dec"
              className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={clampedQty <= 1 || busy}
            >
              −
            </button>
            <input
              data-testid="extra-qty"
              type="number"
              min={1}
              max={maxAdd}
              className="h-11 w-16 text-center rounded-xl border border-brand-border bg-white text-sm font-semibold"
              value={clampedQty}
              onChange={(e) => {
                const v = Math.floor(Number(e.target.value) || 1);
                setQty(Math.min(maxAdd, Math.max(1, v)));
              }}
            />
            <button
              type="button"
              data-testid="extra-qty-inc"
              className="h-11 w-11 rounded-full border border-brand-border bg-white text-lg font-semibold cursor-pointer hover:bg-brand-surface disabled:opacity-40"
              onClick={() => setQty((q) => Math.min(maxAdd, q + 1))}
              disabled={clampedQty >= maxAdd || busy}
            >
              +
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            Max {MAX_QTY} meals per day{currentQty > 0 ? ` · currently ${currentQty}` : ""}
          </span>
        </label>
        {unit > 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="extra-line-preview">
            {clampedQty} × {fmtCAD(unit)} = <span className="font-medium text-foreground">{fmtCAD(lineTotal)}</span>
            {" "}(added to outstanding when delivered)
          </p>
        ) : null}
        {cutoffHours != null ? (
          <p className="text-xs text-muted-foreground">
            Subject to your provider&apos;s {cutoffHours}h cutoff before delivery (same as cancel).
          </p>
        ) : null}
      </div>
    </AppSheet>
  );
}
