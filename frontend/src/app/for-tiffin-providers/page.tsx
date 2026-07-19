import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "For tiffin providers",
  description:
    "MealHQ for Canadian tiffin providers — daily delivery lists, customer meal schedules, Interac reconciliation, drivers, and outstanding balances.",
  alternates: { canonical: "/for-tiffin-providers" },
};

const pillars = [
  {
    title: "Daily delivery list",
    body: "Idempotent generation from each customer’s weekday meal schedule. Mark delivered, missed, or cancelled — including offline queue on mobile.",
  },
  {
    title: "Meal schedules & extras",
    body: "Per-weekday tiffin quantities, pause windows, closed dates, and ad-hoc extra meals without breaking one-stop-per-day routing.",
  },
  {
    title: "Interac-first payments",
    body: "Consumers submit references and screenshots. You verify. Outstanding stays honest: delivered meals × price (− tax) minus verified payments.",
  },
  {
    title: "Staff & drivers",
    body: "Admin, driver, and viewer roles. Drivers land on Deliveries; admins get CRM, payments, analysis, and settings.",
  },
];

export default function ForProvidersPage() {
  return (
    <MarketingShell testid="for-providers-page">
      <div className="max-w-4xl mx-auto">
        <span className="label-overline">Canadian kitchens</span>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-2 tracking-tight">
          Built for tiffin providers — not generic delivery apps
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          WhatsApp threads and spreadsheets do not scale when you have fifty subscribers across Mississauga and Brampton.
          MealHQ gives you one workspace for customers, routes, Interac, and balances — in CAD, for Canada.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pillars.map((p) => (
            <div key={p.title} className="card-tinted p-6">
              <h2 className="font-display font-bold text-xl">{p.title}</h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-muted-foreground">
          Serving GTA, Metro Vancouver, Calgary, and beyond? See{" "}
          <Link href="/tiffin-software-canada" className="text-primary font-medium hover:underline">
            tiffin software for Canada
          </Link>{" "}
          and city pages like{" "}
          <Link href="/cities/toronto" className="text-primary font-medium hover:underline">Toronto</Link>.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="pill-btn btn-primary h-12 px-6" data-testid="for-providers-cta">
            Start free
          </Link>
          <Link href="/pricing" className="pill-btn btn-outline h-12 px-6">
            Pricing
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
