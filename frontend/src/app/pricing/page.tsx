import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";
import { fmtCAD } from "@/lib/format";
import PricingPlans, { type PublicPlan } from "@/components/PricingPlans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "MealHQ pricing for Canadian tiffin kitchens — Starter, Growth, and Professional plans with monthly to yearly billing in CAD.",
  alternates: { canonical: "/pricing" },
};

type PlansResponse = {
  trial_days: number;
  plans: PublicPlan[];
  tiers: { id: string; label: string; max_customers: number | null; monthly_list_cad: number }[];
  periods: { id: string; label: string; discount_pct: number; duration_days: number }[];
};

const FALLBACK: PlansResponse = {
  trial_days: 15,
  tiers: [
    { id: "starter", label: "Starter", max_customers: 50, monthly_list_cad: 49 },
    { id: "growth", label: "Growth", max_customers: 150, monthly_list_cad: 99 },
    { id: "professional", label: "Professional", max_customers: null, monthly_list_cad: 149 },
  ],
  periods: [
    { id: "monthly", label: "Monthly", discount_pct: 0, duration_days: 30 },
    { id: "quarterly", label: "Quarterly", discount_pct: 5, duration_days: 92 },
    { id: "half_yearly", label: "Half-yearly", discount_pct: 10, duration_days: 183 },
    { id: "yearly", label: "Yearly", discount_pct: 15, duration_days: 366 },
  ],
  plans: [
    { id: "starter_monthly", tier: "starter", period: "monthly", label: "Starter · Monthly", tier_label: "Starter", period_label: "Monthly", price_cad: 49, duration_days: 30, max_customers: 50 },
    { id: "starter_quarterly", tier: "starter", period: "quarterly", label: "Starter · Quarterly", tier_label: "Starter", period_label: "Quarterly", price_cad: 140, duration_days: 92, max_customers: 50, save_hint: "Save 5%" },
    { id: "starter_half_yearly", tier: "starter", period: "half_yearly", label: "Starter · Half-yearly", tier_label: "Starter", period_label: "Half-yearly", price_cad: 265, duration_days: 183, max_customers: 50, save_hint: "Save 10%" },
    { id: "starter_yearly", tier: "starter", period: "yearly", label: "Starter · Yearly", tier_label: "Starter", period_label: "Yearly", price_cad: 500, duration_days: 366, max_customers: 50, save_hint: "Save 15%" },
    { id: "growth_monthly", tier: "growth", period: "monthly", label: "Growth · Monthly", tier_label: "Growth", period_label: "Monthly", price_cad: 99, duration_days: 30, max_customers: 150 },
    { id: "growth_quarterly", tier: "growth", period: "quarterly", label: "Growth · Quarterly", tier_label: "Growth", period_label: "Quarterly", price_cad: 282, duration_days: 92, max_customers: 150, save_hint: "Save 5%" },
    { id: "growth_half_yearly", tier: "growth", period: "half_yearly", label: "Growth · Half-yearly", tier_label: "Growth", period_label: "Half-yearly", price_cad: 535, duration_days: 183, max_customers: 150, save_hint: "Save 10%" },
    { id: "growth_yearly", tier: "growth", period: "yearly", label: "Growth · Yearly", tier_label: "Growth", period_label: "Yearly", price_cad: 1010, duration_days: 366, max_customers: 150, save_hint: "Save 15%" },
    { id: "professional_monthly", tier: "professional", period: "monthly", label: "Professional · Monthly", tier_label: "Professional", period_label: "Monthly", price_cad: 149, duration_days: 30, max_customers: null },
    { id: "professional_quarterly", tier: "professional", period: "quarterly", label: "Professional · Quarterly", tier_label: "Professional", period_label: "Quarterly", price_cad: 425, duration_days: 92, max_customers: null, save_hint: "Save 5%" },
    { id: "professional_half_yearly", tier: "professional", period: "half_yearly", label: "Professional · Half-yearly", tier_label: "Professional", period_label: "Half-yearly", price_cad: 805, duration_days: 183, max_customers: null, save_hint: "Save 10%" },
    { id: "professional_yearly", tier: "professional", period: "yearly", label: "Professional · Yearly", tier_label: "Professional", period_label: "Yearly", price_cad: 1520, duration_days: 366, max_customers: null, save_hint: "Save 15%" },
  ],
};

function backendBase(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
}

async function loadPlans(): Promise<PlansResponse> {
  try {
    const res = await fetch(`${backendBase()}/api/public/plans`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as PlansResponse;
    if (!Array.isArray(data.plans) || data.plans.length < 1) return FALLBACK;
    return {
      trial_days: Number(data.trial_days) || FALLBACK.trial_days,
      plans: data.plans,
      tiers: data.tiers?.length ? data.tiers : FALLBACK.tiers,
      periods: data.periods?.length ? data.periods : FALLBACK.periods,
    };
  } catch {
    return FALLBACK;
  }
}

export default async function PricingPage() {
  const data = await loadPlans();

  return (
    <MarketingShell testid="pricing-page">
      <div className="max-w-4xl mx-auto">
        <span className="label-overline">Canada · CAD</span>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-2 tracking-tight">
          Simple pricing for Canadian kitchens
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Open a workspace free with a trial, then pick Starter, Growth, or Professional.
          Longer billing periods unlock bigger discounts. MealHQ is billed in CAD.
        </p>

        <div className="mt-10">
          <PricingPlans plans={data.plans} periods={data.periods} />
        </div>

        <ul className="mt-10 space-y-3 text-muted-foreground">
          <li>{data.trial_days}-day trial with Professional features (unlimited customers).</li>
          <li>Starter up to 50 · Growth up to 150 · Professional unlimited.</li>
          <li>Quarterly save 5% · Half-yearly 10% · Yearly 15%.</li>
          <li>Interac e-Transfer reconciliation for consumer payments included.</li>
          <li>
            Questions? See the{" "}
            <Link href="/faq" className="text-primary font-medium hover:underline">
              FAQ
            </Link>{" "}
            or{" "}
            <Link href="/#contact" className="text-primary font-medium hover:underline">
              contact us
            </Link>
            .
          </li>
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="pill-btn btn-primary h-12 px-6" data-testid="pricing-cta">
            Start free trial
          </Link>
          <Link href="/for-tiffin-providers" className="pill-btn btn-outline h-12 px-6">
            See provider features
          </Link>
        </div>
        <p className="sr-only">
          Example monthly list: Starter {fmtCAD(49)}, Growth {fmtCAD(99)}, Professional {fmtCAD(149)}.
        </p>
      </div>
    </MarketingShell>
  );
}
