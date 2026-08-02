"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  /** When set, customer is locked (customer 360 / Quick Renew). */
  lockedCustomer?: { id: string; name: string } | null;
};

type SettlementBasis = "plan" | "adjustable";

const input =
  "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full";

function tierLabel(tier?: string | null) {
  if (!tier) return null;
  if (tier === "recalc_daily") return "recalc daily";
  if (tier === "flat_with_deductions") return "flat with deductions";
  if (tier === "fixed_monthly") return "fixed monthly";
  return String(tier).replace(/_/g, " ");
}

export default function RecordPaymentSheet({ open, onClose, onRecorded, lockedCustomer = null }: Props) {
  const [customer, setCustomer] = useState<CustomerAsyncOption | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [settlement, setSettlement] = useState<SettlementBasis>("plan");
  const [billingHint, setBillingHint] = useState<{
    outstanding: number;
    credit: number;
    month_charge?: number | null;
    monthly_fee?: number | null;
    collection_due_date?: string | null;
    plan_name?: string | null;
    monthly?: boolean;
    policy_variant?: string | null;
    tier_applied?: string | null;
    cancelled_units?: number | null;
    delivered_units?: number | null;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setReference("");
    setFile(null);
    setBillingHint(null);
    setSettlement("plan");
    if (lockedCustomer) {
      setCustomer({ id: lockedCustomer.id, name: lockedCustomer.name });
    } else {
      setCustomer(null);
    }
  }, [open, lockedCustomer]);

  const showSettlementChoice = useMemo(() => {
    if (!billingHint?.monthly || billingHint.policy_variant !== "monthly_adjustable") return false;
    const fee = billingHint.monthly_fee;
    const charge = billingHint.month_charge;
    if (fee == null || charge == null) return false;
    return Math.abs(Number(fee) - Number(charge)) >= 0.01;
  }, [billingHint]);

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
        const credit = Math.max(0, -outstanding);
        const monthly = data?.billing?.billing_mode === "monthly_flat";
        const policyVariant = data?.billing?.policy_variant || null;
        const monthlyFee = data?.billing?.monthly_fee != null ? Number(data.billing.monthly_fee) : null;
        // Pre-tax month charge for apples-to-apples compare with plan fee
        const monthChargeRaw = data?.current_month_billing?.month_charge_before_tax ?? null;
        const monthChargeNum = monthChargeRaw != null ? Number(monthChargeRaw) : null;
        const tier = data?.current_month_billing?.tier_applied || null;
        const cancelledUnits = data?.current_month_billing?.cancelled_units != null
          ? Number(data.current_month_billing.cancelled_units)
          : null;
        const deliveredUnits = data?.current_month_billing?.delivered_units != null
          ? Number(data.current_month_billing.delivered_units)
          : null;
        setBillingHint({
          outstanding,
          credit,
          monthly,
          policy_variant: policyVariant,
          monthly_fee: monthlyFee,
          month_charge: monthChargeNum,
          collection_due_date: data?.billing?.collection_due_date || data?.current_month_billing?.collection_due_date || null,
          plan_name: data?.billing?.monthly_plan_name || data?.current_month_billing?.plan_name || null,
          tier_applied: tier,
          cancelled_units: cancelledUnits,
          delivered_units: deliveredUnits,
        });

        const adjustableDiff =
          monthly &&
          policyVariant === "monthly_adjustable" &&
          monthlyFee != null &&
          monthChargeNum != null &&
          Math.abs(monthlyFee - monthChargeNum) >= 0.01;

        setSettlement("plan");
        setAmount((prev) => {
          if (prev) return prev;
          if (adjustableDiff && monthlyFee != null && monthlyFee > 0) {
            return monthlyFee.toFixed(2);
          }
          if (outstanding > 0) return outstanding.toFixed(2);
          if (monthly && monthlyFee != null && monthlyFee > 0) {
            return monthlyFee.toFixed(2);
          }
          if (monthly && monthChargeNum != null && monthChargeNum > 0) {
            return monthChargeNum.toFixed(2);
          }
          return prev;
        });
      } catch {
        if (!cancelled) setBillingHint(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, lockedCustomer?.id, customer?.id]);

  function applySettlement(basis: SettlementBasis) {
    setSettlement(basis);
    if (!billingHint) return;
    if (basis === "plan" && billingHint.monthly_fee != null && billingHint.monthly_fee > 0) {
      setAmount(Number(billingHint.monthly_fee).toFixed(2));
    } else if (basis === "adjustable" && billingHint.month_charge != null && billingHint.month_charge > 0) {
      setAmount(Number(billingHint.month_charge).toFixed(2));
    }
  }

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
      if (showSettlementChoice) {
        fd.append("settlement_basis", settlement);
      }
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

  const tier = tierLabel(billingHint?.tier_applied);

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
          <div>
            Outstanding:{" "}
            <span className={`font-semibold ${billingHint.outstanding > 0 ? "text-primary" : "text-foreground"}`}>
              {fmtCAD(billingHint.outstanding)}
            </span>
          </div>
          {billingHint.credit > 0 ? (
            <div className="mt-1" data-testid="record-payment-credit-hint">
              Credit on file: <span className="font-semibold text-secondary">{fmtCAD(billingHint.credit)}</span>
            </div>
          ) : null}
          {billingHint.monthly ? (
            <div className="text-xs text-muted-foreground mt-1" data-testid="record-payment-tier-hint">
              {billingHint.plan_name || "Monthly plan"}
              {billingHint.monthly_fee != null ? ` · plan fee ${fmtCAD(billingHint.monthly_fee)}` : ""}
              {billingHint.month_charge != null ? ` · this month ${fmtCAD(billingHint.month_charge)}` : ""}
              {tier ? ` · ${tier}` : ""}
              {billingHint.cancelled_units != null || billingHint.delivered_units != null
                ? ` · ${billingHint.cancelled_units ?? 0} cancelled / ${billingHint.delivered_units ?? 0} delivered`
                : ""}
              {billingHint.collection_due_date ? ` · due ${billingHint.collection_due_date}` : ""}
            </div>
          ) : null}
        </div>
      ) : null}

      {showSettlementChoice ? (
        <div className="mb-4" data-testid="record-payment-settlement">
          <div className="label-overline mb-2">Settle amount</div>
          <p className="text-xs text-muted-foreground mb-2">
            Plan fee and recalculated month charge differ
            {tier ? ` (${tier})` : ""}. Choose which amount to collect (you can still edit the field).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="record-payment-settle-plan"
              onClick={() => applySettlement("plan")}
              className={`h-10 px-4 rounded-full text-sm font-semibold border cursor-pointer ${
                settlement === "plan"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-brand-border text-foreground hover:bg-brand-surface"
              }`}
            >
              Plan fee{billingHint?.monthly_fee != null ? ` ${fmtCAD(billingHint.monthly_fee)}` : ""}
            </button>
            <button
              type="button"
              data-testid="record-payment-settle-adjustable"
              onClick={() => applySettlement("adjustable")}
              className={`h-10 px-4 rounded-full text-sm font-semibold border cursor-pointer ${
                settlement === "adjustable"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-brand-border text-foreground hover:bg-brand-surface"
              }`}
            >
              Adjustable this month{billingHint?.month_charge != null ? ` ${fmtCAD(billingHint.month_charge)}` : ""}
            </button>
          </div>
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
