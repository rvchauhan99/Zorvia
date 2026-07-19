import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Tiffin software Canada",
  description:
    "MealHQ is tiffin delivery software for Canada — Interac e-Transfer, CAD pricing, postal-area routes, and GST/HST-ready outstanding for independent kitchens.",
  alternates: { canonical: "/tiffin-software-canada" },
};

export default function TiffinSoftwareCanadaPage() {
  return (
    <MarketingShell testid="tiffin-software-canada-page">
      <article className="max-w-3xl mx-auto prose-mealhq">
        <span className="label-overline">Canada-first</span>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-2 tracking-tight">
          Tiffin software designed for Canada
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          US meal-kit tools assume cards and zip codes. Canadian tiffin kitchens live on Interac e-Transfer, CAD,
          condo FSAs, and multi-day meal schedules. MealHQ is built around that reality.
        </p>

        <h2 className="font-display font-bold text-2xl mt-10">Why Canada-specific matters</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">Interac e-Transfer</strong> — reference + screenshot verification,
            not only card processors.
          </li>
          <li>
            <strong className="text-foreground">CAD &amp; tax</strong> — plan prices in CAD; optional GST/HST add-on
            on outstanding.
          </li>
          <li>
            <strong className="text-foreground">Postal-aware ops</strong> — route sorting by FSA and delivery sequence
            for dense GTA and Lower Mainland routes.
          </li>
          <li>
            <strong className="text-foreground">Subscription culture</strong> — weekday meal quantities, pause windows,
            consumer cancel cutoffs before local noon.
          </li>
        </ul>

        <h2 className="font-display font-bold text-2xl mt-10">Where kitchens use MealHQ</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Start with a city guide:{" "}
          <Link href="/cities/toronto" className="text-primary font-medium hover:underline">Toronto</Link>,{" "}
          <Link href="/cities/mississauga" className="text-primary font-medium hover:underline">Mississauga</Link>,{" "}
          <Link href="/cities/vancouver" className="text-primary font-medium hover:underline">Vancouver</Link>,{" "}
          <Link href="/cities/calgary" className="text-primary font-medium hover:underline">Calgary</Link>,{" "}
          <Link href="/cities/edmonton" className="text-primary font-medium hover:underline">Edmonton</Link>,{" "}
          <Link href="/cities/ottawa" className="text-primary font-medium hover:underline">Ottawa</Link>.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="pill-btn btn-primary h-12 px-6">
            Open a Canadian kitchen
          </Link>
          <Link href="/for-tiffin-providers" className="pill-btn btn-outline h-12 px-6">
            Provider features
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
