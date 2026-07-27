"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtCAD } from "@/lib/format";
import AppSheet from "@/components/AppSheet";
import CustomerAsyncSelect, { type CustomerAsyncOption } from "@/components/CustomerAsyncSelect";
import ImageSourceField from "@/components/ImageSourceField";

type Props = {
  open: boolean;
  onClose: () => void;
  onRecorded: () => void;
  /** When set, customer is locked (customer 360). */
  lockedCustomer?: { id: string; name: string } | null;
};

const input =
  "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full";

export default function RecordPaymentSheet({ open, onClose, onRecorded, lockedCustomer = null }: Props) {
  const [customer, setCustomer] = useState<CustomerAsyncOption | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [billingHint, setBillingHint] = useState<{
    outstanding: number;
    month_charge?: number | null;
    collection_due_date?: string | null;
    plan_name?: string | null;
    monthly?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setReference("");
    setFile(null);
    setBillingHint(null);
    if (lockedCustomer) {
      setCustomer({ id: lockedCustomer.id, name: lockedCustomer.name });
    } else {
      setCustomer(null);
    }
  }, [open, lockedCustomer]);

  useEffect(() => {
    const cid = lockedCustomer?.id || customer?.id;
    if (!open || !cid) {
      setBillingHint(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/customers/${cid}`);
        if (cancelled) return;
        const outstanding = Number(data?.outstanding) || 0;
        const monthly = data?.billing?.billing_mode === "monthly_flat";
        const monthCharge = data?.current_month_billing?.month_charge_after_tax
          ?? data?.current_month_billing?.month_charge_before_tax
          ?? null;
        setBillingHint({
          outstanding,
          monthly,
          month_charge: monthCharge != null ? Number(monthCharge) : null,
          collection_due_date: data?.billing?.collection_due_date || data?.current_month_billing?.collection_due_date || null,
          plan_name: data?.billing?.monthly_plan_name || data?.current_month_billing?.plan_name || null,
        });
        setAmount((prev) => {
          if (prev) return prev;
          if (outstanding > 0) return outstanding.toFixed(2);
          return prev;
        });
      } catch {
        if (!cancelled) setBillingHint(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, lockedCustomer?.id, customer?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cid = lockedCustomer?.id || customer?.id;
    if (!cid) {
      toast.error("Select a customer");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!reference.trim()) {
      toast.error("Interac reference is required");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("customer_id", cid);
      fd.append("amount", amount);
      fd.append("reference", reference.trim());
      if (file) fd.append("screenshot", file);
      await api.post("/payments", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Payment recorded — outstanding updated");
      onRecorded();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to record payment");
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
      title="Record payment"
      size="lg"
      as="form"
      onSubmit={submit}
      footer={(
        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="pill-btn btn-outline flex-1 h-11 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            data-testid="record-payment-submit"
            type="submit"
            disabled={submitting}
            className="pill-btn btn-primary flex-1 h-11 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save as verified"}
          </button>
        </div>
      )}
    >
      <p className="text-sm text-muted-foreground mb-4">
        Log an Interac e-Transfer received outside the app. It is saved as verified and reduces outstanding immediately.
      </p>

      {lockedCustomer ? (
        <div className="mb-4 rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-3">
          <div className="label-overline">Customer</div>
          <div className="font-medium mt-0.5" data-testid="record-payment-customer-locked">
            {lockedCustomer.name}
          </div>
        </div>
      ) : (
        <div className="mb-4 relative z-10">
          <CustomerAsyncSelect
            value={customer}
            onChange={setCustomer}
            disabled={submitting}
            testid="record-payment-customer"
            limit={20}
          />
        </div>
      )}

      {billingHint ? (
        <div className="mb-4 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm" data-testid="record-payment-billing-hint">
          <div>Outstanding: <span className="font-semibold text-primary">{fmtCAD(billingHint.outstanding)}</span></div>
          {billingHint.monthly ? (
            <div className="text-xs text-muted-foreground mt-1">
              {billingHint.plan_name || "Monthly plan"}
              {billingHint.month_charge != null ? ` · month charge ${fmtCAD(billingHint.month_charge)}` : ""}
              {billingHint.collection_due_date ? ` · due ${billingHint.collection_due_date}` : ""}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Amount (CAD)</span>
          <input
            data-testid="record-payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={input}
            placeholder="0.00"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Interac reference</span>
          <input
            data-testid="record-payment-reference"
            type="text"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={input}
            placeholder="e-Transfer reference #"
          />
        </label>
        <ImageSourceField
          label="Screenshot"
          optional
          value={file}
          onChange={setFile}
          disabled={submitting}
          testid="record-payment-screenshot"
          uploadInputTestId="record-payment-screenshot"
          emptyHint="Take a photo or upload Interac confirmation"
        />
      </div>
    </AppSheet>
  );
}
