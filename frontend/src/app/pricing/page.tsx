import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";
import { fmtCAD } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "MealHQ pricing for Canadian tiffin kitchens — free trial, then monthly, quarterly, or yearly plans in CAD. GST/HST configurable per kitchen.",
  alternates: { canonical: "/pricing" },
};

type Plan = {
  id: string;
  label: string;
  price_cad: number;
  duration_days: number;
  save_hint?: string;
};

type PlansResponse = {
  trial_days: number;
  plans: Plan[];
};

/** Fallback matches product defaults when API is unreachable (never show stale $29). */
const FALLBACK: PlansResponse = {
  trial_days: 15,
  plans: [
    { id: "monthly", label: "Monthly", price_cad: 149, duration_days: 30 },
    { id: "quarterly", label: "Quarterly", price_cad: 399, duration_days: 92, save_hint: "Save ~10%" },
    { id: "yearly", label: "Yearly", price_cad: 1599, duration_days: 366, save_hint: "Save ~15%" },
  ],
};

const PERIOD: Record<string, string> = {
  monthly: "/ month CAD",
  quarterly: "/ quarter CAD",
  yearly: "/ year CAD",
};

const BLURB: Record<string, string> = {
  monthly: "Flexible for seasonal kitchens.",
  quarterly: "Best value for growing routes.",
  yearly: "Lock in a full year of MealHQ.",
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
    };
  } catch {
    return FALLBACK;
  }
}

export default async function PricingPage() {
  const { trial_days, plans } = await loadPlans();

  return (
    <MarketingShell testid="pricing-page">
      <div className="max-w-4xl mx-auto">
        <span className="label-overline">Canada · CAD</span>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-2 tracking-tight">
          Simple pricing for Canadian kitchens
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Open a workspace free with a trial, then pick a plan when you&apos;re ready. MealHQ is billed in CAD.
          Configure GST/HST on customer outstanding balances in settings — we are not your tax advisor.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((p) => {
            const highlight = p.id === "quarterly";
            return (
              <div
                key={p.id}
                className={`card-tinted p-6 flex flex-col gap-2 ${highlight ? "ring-2 ring-primary" : ""}`}
                data-testid={`plan-${p.id}`}
              >
                <div className="label-overline">{p.label}</div>
                <div className="font-display font-black text-3xl">
                  {fmtCAD(p.price_cad)}
                  <span className="text-base font-medium text-muted-foreground">
                    {PERIOD[p.id] || " CAD"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{BLURB[p.id] || ""}</p>
                {p.save_hint ? (
                  <p className="text-xs font-medium text-primary">{p.save_hint}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <ul className="mt-10 space-y-3 text-muted-foreground">
          <li>{trial_days}-day trial on new kitchens (default; confirm in-app).</li>
          <li>Interac e-Transfer reconciliation for consumer payments included.</li>
          <li>Optional GST/HST tax rate on delivered meal outstanding.</li>
          <li>
            Questions? See the <Link href="/faq" className="text-primary font-medium hover:underline">FAQ</Link> or{" "}
            <Link href="/#contact" className="text-primary font-medium hover:underline">contact us</Link>.
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
      </div>
    </MarketingShell>
  );
}
