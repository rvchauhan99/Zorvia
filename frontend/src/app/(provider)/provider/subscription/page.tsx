"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { fmtCAD } from "@/lib/format";
import { toast } from "sonner";
import { Check, Sparkle, Warning, X } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { SUBSCRIPTION_REFRESH_EVENT } from "@/lib/subscription-events";

type CheckoutBanner =
  | { kind: "success"; phase: "activating" | "active"; plan?: string | null }
  | { kind: "cancel" };

function SubscriptionInner() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<CheckoutBanner | null>(null);
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

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  const status = data.status;
  const dl = data.days_left;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in-up max-w-4xl">
      <div>
        <span className="label-overline">Billing</span>
        <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Your subscription</h1>
      </div>

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
            className="absolute top-3 right-3 icon-btn-neutral size-8"
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
            className="absolute top-3 right-3 icon-btn-neutral size-8"
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
            <div className="flex-1">
              <div className="font-display font-bold text-lg">Active — {data.subscription?.plan}</div>
              <div className="text-sm text-muted-foreground">{dl} day{dl === 1 ? "" : "s"} left in your current period.</div>
            </div>
          </>
        ) : (
          <>
            <Warning size={28} className="text-primary" weight="fill" />
            <div className="flex-1">
              <div className="font-display font-bold text-lg">Your trial has ended</div>
              <div className="text-sm text-muted-foreground">Pick a plan to continue managing customers, deliveries, payments and reports.</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {data.plans.map((p: any) => {
          const isCurrent = data.subscription?.plan === p.id && status === "active";
          const isRecommended = p.id === "quarterly";
          return (
            <div key={p.id} className={`card-tinted p-4 sm:p-6 flex flex-col gap-3 relative ${isRecommended ? "border-primary ring-2 ring-primary/20" : ""}`}>
              {isRecommended ? <div className="absolute -top-2 left-6 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full">Recommended</div> : null}
              <div className="label-overline">{p.label}</div>
              <div className="flex items-baseline gap-1">
                <div className="font-display font-black text-4xl">{fmtCAD(p.price_cad)}</div>
                <div className="text-sm text-muted-foreground">/ {p.duration_days}d</div>
              </div>
              {p.save_hint ? <div className="text-xs text-secondary font-medium">{p.save_hint}</div> : <div className="text-xs text-transparent select-none">.</div>}
              <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                <li className="flex items-center gap-2"><Check size={14} className="text-secondary" /> Unlimited customers</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-secondary" /> Daily delivery lists</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-secondary" /> Interac reconciliation</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-secondary" /> Consumer portal</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-secondary" /> All reports + CSV export</li>
              </ul>
              <button
                data-testid={`activate-${p.id}`}
                onClick={() => activate(p.id)}
                disabled={busy === p.id || isCurrent}
                className={`mt-3 pill-btn h-11 disabled:opacity-60 cursor-pointer ${isRecommended ? "btn-primary" : "btn-outline"}`}
              >
                {isCurrent ? "Current plan" : busy === p.id ? "Activating…" : "Choose plan"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground max-w-2xl">
        {data.billing_provider === "stripe" ? (
          <>Selecting a plan opens Stripe Checkout. Your subscription activates after payment succeeds.</>
        ) : (
          <><strong>Dev / none billing:</strong> selecting a plan self-activates without a payment gateway. Set <code>BILLING_PROVIDER=stripe</code> to use Checkout.</>
        )}
      </div>
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
