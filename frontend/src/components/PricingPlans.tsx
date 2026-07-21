"use client";

import { useMemo, useState } from "react";
import { fmtCAD } from "@/lib/format";

export type PublicPlan = {
  id: string;
  tier: string;
  period: string;
  label: string;
  tier_label: string;
  period_label: string;
  price_cad: number;
  duration_days: number;
  max_customers: number | null;
  save_hint?: string;
};

type Period = { id: string; label: string; discount_pct: number; duration_days: number };

const TIER_ORDER = ["starter", "growth", "professional"];

export default function PricingPlans({
  plans,
  periods,
}: {
  plans: PublicPlan[];
  periods: Period[];
}) {
  const defaultPeriod = periods.some((p) => p.id === "monthly")
    ? "monthly"
    : periods[0]?.id || "monthly";
  const [period, setPeriod] = useState(defaultPeriod);
  const selected = periods.some((p) => p.id === period) ? period : defaultPeriod;
  const selectedDiscount =
    Number(periods.find((p) => p.id === selected)?.discount_pct) || 0;

  const cards = useMemo(
    () =>
      plans
        .filter((p) => p.period === selected)
        .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)),
    [plans, selected],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" data-testid="pricing-period-toggle">
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`pricing-period-${p.id}`}
            onClick={() => setPeriod(p.id)}
            className={`pill-btn h-10 px-4 text-sm cursor-pointer ${
              selected === p.id ? "btn-primary" : "btn-outline"
            }`}
          >
            {p.label}
            {p.discount_pct > 0 ? ` · −${p.discount_pct}%` : ""}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground" data-testid="pricing-recommended-hint">
        Recommended: <span className="font-medium text-foreground">Growth</span>
        {" "}
        (up to 150 customers)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((p) => {
          const highlight = p.tier === "growth";
          const cap =
            p.max_customers == null
              ? "Unlimited customers"
              : `Up to ${p.max_customers} customers`;
          return (
            <div
              key={p.id}
              className={`card-tinted p-6 flex flex-col gap-2 relative ${
                highlight ? "ring-2 ring-primary" : ""
              }`}
              data-testid={`plan-${p.tier}`}
            >
              {highlight ? (
                <div className="absolute -top-2 left-6 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                  Recommended
                </div>
              ) : null}
              <div className="label-overline">{p.tier_label}</div>
              <div className="font-display font-black text-3xl">
                {fmtCAD(p.price_cad)}
                <span className="text-base font-medium text-muted-foreground"> CAD</span>
              </div>
              <p className="text-sm text-muted-foreground">{cap}</p>
              {p.save_hint || selectedDiscount > 0 ? (
                <p className="text-xs font-medium text-primary">
                  {p.save_hint || `Save ${selectedDiscount}%`}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
