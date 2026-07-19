import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about MealHQ for Canadian tiffin providers and customers — Interac payments, delivery lists, signup codes, and more.",
  alternates: { canonical: "/faq" },
};

const providerFaqs = [
  {
    q: "Who is MealHQ for?",
    a: "Independent Canadian tiffin and meal-delivery kitchens that manage recurring customers, daily routes, and Interac e-Transfer payments.",
  },
  {
    q: "How do Interac payments work?",
    a: "Customers submit an Interac reference (and optional screenshot). You verify or reject in the Payments screen. Verified amounts reduce outstanding balances.",
  },
  {
    q: "Can I set GST/HST?",
    a: "Yes — set a tax rate percent in provider settings. Outstanding and statements treat tax as an add-on on meal line amounts. This is a convenience tool, not tax advice.",
  },
  {
    q: "What is the cancel cutoff?",
    a: "Consumers can cancel upcoming pending deliveries until your configured cutoff hours before local noon on the delivery date (default 4 hours).",
  },
];

const consumerFaqs = [
  {
    q: "How do I join my kitchen?",
    a: "Ask your provider for their signup code, then use Consumer signup on MealHQ. Your provider may need to approve you before deliveries start.",
  },
  {
    q: "How do I pay?",
    a: "Send Interac e-Transfer as instructed by your kitchen, then submit the reference (and optional screenshot) in the consumer Payments page.",
  },
  {
    q: "Can I request an extra meal?",
    a: "Yes — from your consumer home, add extras for a delivery date before the same cutoff used for cancellations.",
  },
];

export default function FaqPage() {
  return (
    <MarketingShell testid="faq-page">
      <div className="max-w-3xl mx-auto">
        <span className="label-overline">Help</span>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-2">Frequently asked questions</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Quick answers for Canadian kitchens and their customers. Still stuck?{" "}
          <Link href="/#contact" className="text-primary font-medium hover:underline">Contact us</Link>.
        </p>

        <h2 className="font-display font-bold text-2xl mt-12 mb-4">For providers</h2>
        <dl className="space-y-6">
          {providerFaqs.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-lg">{f.q}</dt>
              <dd className="mt-1 text-muted-foreground leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>

        <h2 className="font-display font-bold text-2xl mt-12 mb-4">For customers</h2>
        <dl className="space-y-6">
          {consumerFaqs.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-lg">{f.q}</dt>
              <dd className="mt-1 text-muted-foreground leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/signup" className="pill-btn btn-primary h-12 px-6">Start a kitchen</Link>
          <Link href="/pricing" className="pill-btn btn-outline h-12 px-6">View pricing</Link>
        </div>
      </div>
    </MarketingShell>
  );
}
