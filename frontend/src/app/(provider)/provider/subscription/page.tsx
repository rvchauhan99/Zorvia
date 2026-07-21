"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { fmtCAD, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Check, Sparkle, Warning, X, Copy } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { SUBSCRIPTION_REFRESH_EVENT } from "@/lib/subscription-events";
import ImageSourceField from "@/components/ImageSourceField";
import AppSheet from "@/components/AppSheet";

type CheckoutBanner =
  | { kind: "success"; phase: "activating" | "active"; plan?: string | null }
  | { kind: "cancel" };

function SubscriptionInner() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<CheckoutBanner | null>(null);
  const [manualPlan, setManualPlan] = useState<any>(null);
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [period, setPeriod] = useState<string>("yearly");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, ready } = useAuth();
  const checkoutHandled = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data: sub } = await api.get("/providers/me/subscription");
    setData(sub);
    return sub;
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!canMutateAdmin(session)) {
      router.replace("/provider");
      return;
    }
    load();
  }, [ready, session, router, load]);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!ready || !canMutateAdmin(session) || checkoutHandled.current) return;
    const checkout = searchParams.get("checkout");
    if (checkout !== "success" && checkout !== "cancel") return;
    checkoutHandled.current = true;

    if (checkout === "cancel") {
      setCheckoutBanner({ kind: "cancel" });
      toast.message("Checkout cancelled — no charge was made.");
      router.replace("/provider/subscription");
      dismissTimer.current = setTimeout(() => setCheckoutBanner(null), 10000);
      return;
    }

    setCheckoutBanner({ kind: "success", phase: "activating" });
    toast.success("Payment successful — activating your plan…");
    router.replace("/provider/subscription");

    let cancelled = false;
    const started = Date.now();
    const POLL_MS = 1500;
    const MAX_MS = 15000;

    async function pollUntilActive() {
      while (!cancelled && Date.now() - started < MAX_MS) {
        try {
          const sub = await load();
          if (sub?.status === "active") {
            window.dispatchEvent(new Event(SUBSCRIPTION_REFRESH_EVENT));
            setCheckoutBanner({
              kind: "success",
              phase: "active",
              plan: sub?.subscription?.plan ?? null,
            });
            toast.success(
              sub?.subscription?.plan
                ? `You're on the ${sub.subscription.plan} plan`
                : "Your plan is now active",
            );
            dismissTimer.current = setTimeout(() => setCheckoutBanner(null), 8000);
            return;
          }
        } catch {
          /* keep polling */
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) {
        try {
          await load();
        } catch {
          /* ignore */
        }
        setCheckoutBanner({ kind: "success", phase: "activating" });
        toast.message("Payment received. Refresh if your plan isn’t active yet.");
        dismissTimer.current = setTimeout(() => setCheckoutBanner(null), 12000);
      }
    }

    pollUntilActive();
    return () => {
      cancelled = true;
    };
  }, [ready, session, searchParams, router, load]);

  async function activate(planId: string) {
    if (data?.billing_provider === "manual") {
      const plan = data.plans?.find((p: any) => p.id === planId);
      setManualPlan(plan || { id: planId, label: planId, price_cad: 0 });
      setReference("");
      setScreenshot(null);
      return;
    }
    setBusy(planId);
    try {
      const { data: res } = await api.post("/providers/me/subscription/activate", { plan: planId });
      if (res?.checkout_url) {
        window.location.assign(res.checkout_url);
        return;
      }
      toast.success("Plan activated");
      await load();
      window.dispatchEvent(new Event(SUBSCRIPTION_REFRESH_EVENT));
      setTimeout(() => router.replace("/provider"), 400);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Activation failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitManual() {
    if (!manualPlan?.id) return;
    const ref = reference.trim();
    if (!ref) {
      toast.error("Interac reference is required");
      return;
    }
    setBusy(manualPlan.id);
    try {
      const fd = new FormData();
      fd.append("plan", manualPlan.id);
      fd.append("reference", ref);
      if (screenshot) fd.append("screenshot", screenshot);
      const { data: res } = await api.post("/providers/me/subscription/activate", fd);
      toast.success("Plan active — payment under review");
      setManualPlan(null);
      await load();
      window.dispatchEvent(new Event(SUBSCRIPTION_REFRESH_EVENT));
      if (res?.review_status === "pending_review") {
        /* stay on page so they see the pending banner */
      } else {
        setTimeout(() => router.replace("/provider"), 400);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Submission failed");
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  const status = data.status;
  const dl = data.days_left;
  const isManual = data.billing_provider === "manual";
  const pending = data.pending_payment;
  const periods: { id: string; label: string; discount_pct?: number }[] = data.periods?.length
    ? data.periods
    : [
        { id: "monthly", label: "Monthly", discount_pct: 0 },
        { id: "quarterly", label: "Quarterly", discount_pct: 5 },
        { id: "half_yearly", label: "Half-yearly", discount_pct: 10 },
        { id: "yearly", label: "Yearly", discount_pct: 15 },
      ];
  const selectedPeriod = periods.some((p) => p.id === period) ? period : "yearly";
  const selectedPeriodMeta = periods.find((p) => p.id === selectedPeriod);
  const selectedDiscount = Number(selectedPeriodMeta?.discount_pct) || 0;
  const tierOrder = ["starter", "growth", "professional"];
  const periodPlans = (data.plans || [])
    .filter((p: any) => p.period === selectedPeriod)
    .sort(
      (a: any, b: any) =>
        tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier),
    );
  const customerCount = Number(data.customer_count) || 0;
  const maxCustomers = data.max_customers;
  const usageLabel =
    maxCustomers == null
      ? `${customerCount} customers · unlimited`
      : `${customerCount} / ${maxCustomers} customers`;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in-up max-w-4xl">
      <div>
        <span className="label-overline">Billing</span>
        <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Your subscription</h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="customer-usage">
          {usageLabel}
          {data.tier_label ? ` · ${data.tier_label}` : status === "trialing" ? " · Trial (Professional features)" : null}
        </p>
      </div>

      {pending ? (
        <div
          data-testid="manual-pending-banner"
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 flex items-start gap-3"
        >
          <Warning size={24} className="text-amber-700 shrink-0 mt-0.5" weight="fill" />
          <div className="min-w-0">
            <div className="font-display font-bold text-lg">Payment under review</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Your {pending.plan} plan is active while we verify Interac ref{" "}
              <span className="font-mono text-foreground">{pending.reference}</span>.
            </div>
          </div>
        </div>
      ) : null}

      {checkoutBanner?.kind === "success" ? (
        <div
          data-testid="checkout-success-banner"
          className="checkout-banner-in relative overflow-hidden rounded-2xl border border-secondary/25 p-4 sm:p-5 flex items-start gap-3 sm:gap-4 bg-linear-to-br from-secondary/15 via-primary/10 to-brand-cream shadow-[0_8px_28px_rgba(42,157,122,0.12)]"
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(42,157,122,0.18),transparent_55%)]" />
          <div className="checkout-check-pop relative shrink-0 size-11 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-sm">
            <Check size={24} weight="bold" />
          </div>
          <div className="relative flex-1 min-w-0 pr-8">
            <div className="font-display font-bold text-lg text-foreground">
              {checkoutBanner.phase === "active"
                ? checkoutBanner.plan
                  ? `You're on the ${checkoutBanner.plan} plan`
                  : "Your plan is now active"
                : "Payment successful"}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {checkoutBanner.phase === "active"
                ? "Thanks for supporting MealHQ. Your kitchen tools stay unlocked for this billing period."
                : "Confirming with Stripe — your subscription will flip to active in a moment."}
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute top-3 right-3 icon-btn icon-btn-neutral"
            onClick={() => setCheckoutBanner(null)}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      {checkoutBanner?.kind === "cancel" ? (
        <div
          data-testid="checkout-cancel-banner"
          className="checkout-banner-in relative overflow-hidden rounded-2xl border border-accent/30 p-4 sm:p-5 flex items-start gap-3 sm:gap-4 bg-linear-to-br from-accent/15 via-muted to-brand-cream"
        >
          <div className="relative shrink-0 size-11 rounded-full bg-accent/20 text-foreground flex items-center justify-center">
            <Warning size={24} weight="fill" className="text-accent" />
          </div>
          <div className="relative flex-1 min-w-0 pr-8">
            <div className="font-display font-bold text-lg">Checkout cancelled</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              No charge was made. Pick a plan anytime when you&apos;re ready.
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute top-3 right-3 icon-btn icon-btn-neutral"
            onClick={() => setCheckoutBanner(null)}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className={`card-tinted p-4 sm:p-5 flex items-center gap-3 sm:gap-4 ${status === "expired" ? "border-primary" : ""}`}>
        {status === "trialing" ? (
          <>
            <Sparkle size={28} className="text-secondary" weight="fill" />
            <div className="flex-1">
              <div className="font-display font-bold text-lg">You&apos;re on a free trial</div>
              <div className="text-sm text-muted-foreground">{dl} day{dl === 1 ? "" : "s"} left. Pick a plan any time to keep the tap running after your trial ends.</div>
            </div>
          </>
        ) : status === "active" ? (
          <>
            <Check size={28} className="text-secondary" weight="bold" />
            <div className="flex-1" data-testid="active-period-summary">
              <div className="font-display font-bold text-lg">
                Active
                {data.tier_label || data.period_label
                  ? ` — ${[data.tier_label, data.period_label].filter(Boolean).join(" · ")}`
                  : data.subscription?.plan
                    ? ` — ${data.subscription.plan}`
                    : ""}
              </div>
              <div className="text-sm text-muted-foreground">
                {dl != null ? (
                  <>
                    {dl === 0 ? "Expires today" : `${dl} day${dl === 1 ? "" : "s"} left`}
                    {data.subscription?.current_period_end
                      ? ` · ends ${fmtDate(data.subscription.current_period_end)}`
                      : ""}
                    {(data.renewal_due || (typeof dl === "number" && dl <= 5))
                      ? " · Renew soon to avoid interruption."
                      : ""}
                  </>
                ) : (
                  "Current period active."
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <Warning size={28} className="text-primary" weight="fill" />
            <div className="flex-1">
              <div className="font-display font-bold text-lg">Subscription required</div>
              <div className="text-sm text-muted-foreground">Pick a plan to continue managing customers, deliveries, payments and reports.</div>
            </div>
          </>
        )}
      </div>

      {isManual && data.platform_interac_email ? (
        <div className="card-tinted p-4 sm:p-5" data-testid="manual-interac-instructions">
          <div className="label-overline">Pay via Interac e-Transfer</div>
          <div className="font-display font-bold text-lg mt-1">{data.platform_interac_name || "MealHQ"}</div>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 h-11 px-3 rounded-xl bg-white border border-brand-border text-sm font-mono cursor-pointer hover:bg-brand-surface"
            onClick={() => {
              navigator.clipboard.writeText(data.platform_interac_email);
              toast.success("Interac email copied");
            }}
            data-testid="copy-platform-interac"
          >
            <Copy size={16} /> {data.platform_interac_email}
          </button>
          <p className="text-sm text-muted-foreground mt-3">
            Send Interac for the plan amount, then choose a plan and submit your reference. Your kitchen stays unlocked while we verify.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" data-testid="period-toggle">
          {periods.map((p) => {
            const disc = Number(p.discount_pct) || 0;
            const isBestPeriod = p.id === "yearly";
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`period-${p.id}`}
                onClick={() => setPeriod(p.id)}
                className={`pill-btn h-10 px-4 text-sm cursor-pointer ${
                  selectedPeriod === p.id ? "btn-primary" : "btn-outline"
                }`}
              >
                {p.label}
                {disc > 0 ? ` · −${disc}%` : ""}
                {isBestPeriod ? " · Best value" : ""}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground" data-testid="best-combo-hint">
          Best combo: <span className="font-medium text-foreground">Growth · Yearly · Save 15%</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {periodPlans.map((p: any) => {
            const isCurrent = data.subscription?.plan === p.id && status === "active" && !pending;
            const isRecommended = p.tier === "growth";
            const isBestCombo = isRecommended && selectedPeriod === "yearly";
            const capLabel =
              p.max_customers == null
                ? "Unlimited customers"
                : `Up to ${p.max_customers} customers`;
            return (
              <div
                key={p.id}
                className={`card-tinted p-4 sm:p-6 flex flex-col gap-3 relative ${
                  isRecommended ? "border-primary ring-2 ring-primary/20" : ""
                }`}
                data-testid={`plan-card-${p.tier}`}
              >
                {isRecommended ? (
                  <div className="absolute -top-2 left-6 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                    {isBestCombo ? "Best combo · −15%" : "Recommended"}
                  </div>
                ) : null}
                <div className="label-overline">{p.tier_label || p.label}</div>
                <div className="flex items-baseline gap-1">
                  <div className="font-display font-black text-4xl">{fmtCAD(p.price_cad)}</div>
                  <div className="text-sm text-muted-foreground">CAD</div>
                </div>
                {p.save_hint || selectedDiscount > 0 ? (
                  <div className="text-xs text-secondary font-medium">
                    {p.save_hint || (selectedDiscount > 0 ? `Save ${selectedDiscount}%` : null)}
                  </div>
                ) : (
                  <div className="text-xs text-transparent select-none">.</div>
                )}
                <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-secondary" /> {capLabel}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-secondary" /> Daily delivery lists
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-secondary" /> Interac reconciliation
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-secondary" /> Consumer portal
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-secondary" /> All reports + CSV export
                  </li>
                </ul>
                <button
                  data-testid={`activate-${p.id}`}
                  onClick={() => activate(p.id)}
                  disabled={busy === p.id || isCurrent || !!pending}
                  className={`mt-3 pill-btn h-11 disabled:opacity-60 cursor-pointer ${
                    isRecommended ? "btn-primary" : "btn-outline"
                  }`}
                >
                  {isCurrent
                    ? "Current plan"
                    : busy === p.id
                      ? isManual
                        ? "Submitting…"
                        : "Activating…"
                      : isManual
                        ? "Pay & activate"
                        : "Choose plan"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground max-w-2xl">
        {data.billing_provider === "stripe" ? (
          <>Selecting a plan opens Stripe Checkout. Your subscription activates after payment succeeds.</>
        ) : data.billing_provider === "manual" ? (
          <>Pay MealHQ via Interac, then submit your reference. The plan activates immediately and stays active while we verify payment.</>
        ) : (
          <><strong>Dev / none billing:</strong> selecting a plan self-activates without a payment gateway.</>
        )}
      </div>

      <AppSheet
        open={!!manualPlan}
        onClose={() => { if (!busy) setManualPlan(null); }}
        title={manualPlan ? `Activate ${manualPlan.label}` : "Submit Interac"}
        size="md"
        footer={(
          <button
            type="button"
            data-testid="manual-submit-payment"
            disabled={!!busy}
            onClick={submitManual}
            className="pill-btn btn-primary h-12 w-full disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Submitting…" : `Submit · ${fmtCAD(manualPlan?.price_cad || 0)}`}
          </button>
        )}
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Send <strong className="text-foreground">{fmtCAD(manualPlan?.price_cad || 0)}</strong> via Interac to{" "}
            <span className="font-mono text-foreground">{data.platform_interac_email}</span>, then enter the reference below.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Interac reference</span>
            <input
              data-testid="manual-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-11 px-4 rounded-xl bg-white border border-brand-border font-mono outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. TX-A1B2C3"
            />
          </label>
          <ImageSourceField
            label="Screenshot"
            optional
            value={screenshot}
            onChange={setScreenshot}
            disabled={!!busy}
            testid="manual-screenshot"
            emptyHint="Optional confirmation screenshot"
          />
        </div>
      </AppSheet>
    </div>
  );
}

export default function Subscription() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <SubscriptionInner />
    </Suspense>
  );
}
