import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "MealHQ pricing for Canadian tiffin kitchens — free trial, then monthly, quarterly, or yearly plans in CAD. GST/HST configurable per kitchen.",
  alternates: { canonical: "/pricing" },
};

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$29",
    period: "/ month CAD",
    blurb: "Flexible for seasonal kitchens.",
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: "$79",
    period: "/ quarter CAD",
    blurb: "Best value for growing routes.",
    highlight: true,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$299",
    period: "/ year CAD",
    blurb: "Lock in a full year of MealHQ.",
  },
];

export default function PricingPage() {
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
          {plans.map((p) => (
            <div
              key={p.id}
              className={`card-tinted p-6 flex flex-col gap-2 ${p.highlight ? "ring-2 ring-primary" : ""}`}
              data-testid={`plan-${p.id}`}
            >
              <div className="label-overline">{p.name}</div>
              <div className="font-display font-black text-3xl">
                {p.price}
                <span className="text-base font-medium text-muted-foreground">{p.period}</span>
              </div>
              <p className="text-sm text-muted-foreground">{p.blurb}</p>
            </div>
          ))}
        </div>

        <ul className="mt-10 space-y-3 text-muted-foreground">
          <li>15-day trial on new kitchens (default; confirm in-app).</li>
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
