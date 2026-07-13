import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { fmtCAD } from "@/lib/format";
import { toast } from "sonner";
import { Check, Sparkle, Warning } from "@phosphor-icons/react";

export default function Subscription() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const nav = useNavigate();

  async function load() {
    const { data } = await api.get("/providers/me/subscription");
    setData(data);
  }
  useEffect(() => { load(); }, []);

  async function activate(planId) {
    setBusy(planId);
    try {
      await api.post("/providers/me/subscription/activate", { plan: planId });
      toast.success("Plan activated");
      await load();
      // Return to dashboard
      setTimeout(() => nav("/provider", { replace: true }), 400);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Activation failed");
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  const status = data.status;
  const dl = data.days_left;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-4xl">
      <div>
        <span className="label-overline">Billing</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Your subscription</h1>
      </div>

      <div className={`card-tinted p-5 flex items-center gap-4 ${status === "expired" ? "border-primary" : ""}`}>
        {status === "trialing" ? (
          <>
            <Sparkle size={28} className="text-secondary" weight="fill" />
            <div className="flex-1">
              <div className="font-display font-bold text-lg">You're on a free trial</div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.plans.map((p) => {
          const isCurrent = data.subscription?.plan === p.id && status === "active";
          const isRecommended = p.id === "quarterly";
          return (
            <div key={p.id} className={`card-tinted p-6 flex flex-col gap-3 relative ${isRecommended ? "border-primary ring-2 ring-primary/20" : ""}`}>
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
                className={`mt-3 pill-btn h-11 disabled:opacity-60 ${isRecommended ? "btn-primary" : "btn-outline"}`}
              >
                {isCurrent ? "Current plan" : busy === p.id ? "Activating…" : "Choose plan"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground max-w-2xl">
        <strong>MVP note:</strong> selecting a plan self-activates for testing purposes. In production this will be routed through a payment gateway (Stripe or an Interac verification flow) before activation.
      </div>
    </div>
  );
}
