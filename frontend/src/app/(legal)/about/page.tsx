import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, ORGANIZATION_LD, SOFTWARE_LD } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "About MealHQ",
  description:
    "MealHQ is software for Canadian tiffin providers and their customers. Manage delivery lists, Interac e-Transfer payments, and outstanding balances. Sign in with Google uses your name, email, and profile photo only to create or access your MealHQ account.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="max-w-3xl mx-auto" data-testid="about-page">
      <JsonLd data={[ORGANIZATION_LD, SOFTWARE_LD]} />
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary mb-6" data-testid="about-app-name">
        MealHQ
      </h1>

      <div className="space-y-8 text-base sm:text-[17px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">What MealHQ does</h2>
          <p>
            MealHQ is a multi-tenant SaaS application for independent Canadian tiffin and meal-delivery kitchens
            (providers) and the customers who order from them. Providers use MealHQ to manage customers, generate daily
            delivery lists, track Interac e-Transfer payments, and see outstanding balances. Customers use MealHQ to
            view upcoming meals, balances, and submit payment references inside their provider&apos;s workspace.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Why MealHQ uses Google Sign-In</h2>
          <p>
            MealHQ offers Sign in with Google so you can create or access a MealHQ account with your Google account.
            When you sign in, MealHQ receives your basic Google profile information — name, email address, and profile
            photo — only to authenticate you and set up your MealHQ user record. MealHQ does not read your Gmail,
            contacts, or Drive, and does not post to Google on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Policies</h2>
          <p>
            Please review our{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline" data-testid="about-privacy-link">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-primary hover:underline" data-testid="about-terms-link">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        <p className="pt-2">
          <Link href="/" className="font-semibold text-primary hover:underline" data-testid="about-home-link">
            Back to MealHQ home
          </Link>
        </p>
      </div>
    </article>
  );
}
