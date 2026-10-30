import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapTrifold, CookingPot, QrCode, Truck, ChartLineUp, Receipt, ShieldCheck, EnvelopeSimple } from "@phosphor-icons/react/ssr";
import { ContactForm } from "@/components/ContactForm";
import LoggedInRedirect from "@/components/LoggedInRedirect";
import { JsonLd, ORGANIZATION_LD, SOFTWARE_LD } from "@/components/JsonLd";

const MEAL_IMG = "https://images.unsplash.com/photo-1547592180-85f173990554?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHByZXAlMjBmbGF0bGF5fGVufDB8fHx8MTc4MzkyNDg5N3ww&ixlib=rb-4.1.0&q=85";
const DRIVER_IMG = "/brand/mealhq-provider-courier.png";

const CONTACT_EMAILS = [
  "khamarvedang04@gmail.com",
  "ravatrajsinh@gmail.com",
] as const;

const features = [
  { icon: Truck, title: "Daily delivery list", body: "Auto-generated from active customers and their weekly schedule. One-tap Delivered / Missed / Cancelled." },
  { icon: Receipt, title: "Interac reconciliation", body: "Consumers submit e-Transfer references and screenshots. You verify and their balance updates instantly." },
  { icon: ChartLineUp, title: "Outstanding, at a glance", body: "Delivered meals × price − payments received. Grouped by customer and by postal area." },
  { icon: MapTrifold, title: "Route optimization", body: "Group customers by driver and get the shortest road route for each one. Drivers open their stops on their phone." },
  { icon: CookingPot, title: "Kitchen counts", body: "See exactly how many tiffins and which items to cook for any day, built from each customer's plan and choices." },
  { icon: QrCode, title: "Labels with QR", body: "Print a label for every tiffin with the customer, address and a QR code to scan at delivery." },
  { icon: ShieldCheck, title: "Multi-tenant & private", body: "Every provider has an isolated workspace with its own customers, payments and reports." },
];

const shell = "mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-10";

export const metadata: Metadata = {
  title: { absolute: "MealHQ — Tiffin business software for Canadian kitchens" },
  description:
    "MealHQ is management software for independent Canadian tiffin kitchens. Manage customers, meal plans, daily routes, kitchen counts, Interac e-Transfer payments and balances — built for Canada.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MealHQ — Tiffin business software for Canadian kitchens",
    description:
      "Run your Canadian tiffin business without spreadsheet chaos. Customers, routes, kitchen counts, Interac payments and balances in one place.",
    url: "https://www.mealhq.ca",
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-cream text-foreground animate-fade-in-up">
      <JsonLd data={[ORGANIZATION_LD, SOFTWARE_LD]} />
      <LoggedInRedirect />
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-brand-cream/85 border-b border-brand-border">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-4 gap-3">
          <Link href="/" className="inline-flex items-center shrink-0" data-testid="landing-brand">
            <Image
              src="/brand/mealhq-logo-horizontal-transparent.png"
              alt="MealHQ"
              width={1000}
              height={263}
              className="h-11 sm:h-12 lg:h-14 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-2.5">
            <Link href="/pricing" className="hidden md:inline-flex pill-btn btn-outline text-sm h-9 sm:h-10 px-4">
              Pricing
            </Link>
            <Link href="/for-tiffin-providers" className="hidden lg:inline-flex pill-btn btn-outline text-sm h-9 sm:h-10 px-4">
              For providers
            </Link>
            <a
              data-testid="landing-contact-link"
              href="#contact"
              className="hidden sm:inline-flex pill-btn btn-outline text-sm h-9 sm:h-10 px-4 sm:px-5"
            >
              Contact
            </a>
            <Link data-testid="landing-login-link" href="/login" className="pill-btn btn-outline text-sm h-11 min-h-[44px] px-4 sm:px-5">
              Log in
            </Link>
            <Link data-testid="landing-signup-link" href="/signup" className="pill-btn btn-primary text-sm h-11 min-h-[44px] px-4 sm:px-5">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-5 sm:gap-7 px-4 sm:px-6 lg:px-10 xl:px-14 py-10 sm:py-14 lg:py-16">
          <span className="label-overline text-sm sm:text-base tracking-[0.2em]">Canada · CAD · Interac e-Transfer</span>
          <h1
            className="font-display font-black tracking-tight text-primary"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1.02 }}
            data-testid="landing-app-name"
          >
            MealHQ
          </h1>
          <p
            className="font-display font-black tracking-tight text-foreground"
            style={{ fontSize: "clamp(1.65rem, 3.5vw, 3rem)", lineHeight: 1.08 }}
          >
            Run your Canadian tiffin business without the{" "}
            <span className="text-primary">spreadsheet chaos.</span>
          </p>
          <p
            className="text-muted-foreground max-w-[42rem] leading-snug"
            style={{ fontSize: "clamp(1.125rem, 1.5vw, 1.5rem)" }}
          >
            MealHQ is the operating system for independent tiffin providers across Canada. Manage customers, delivery lists, Interac e-Transfer payments and outstanding balances — all from your phone.
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 pt-1">
            <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-primary">
                  For providers
                </span>
                <Link data-testid="hero-cta-signup" href="/signup" className="pill-btn btn-primary h-12 sm:h-14 px-7 sm:px-8 text-base sm:text-lg gap-2">
                  Start free <ArrowRight size={20} weight="bold" />
                </Link>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  For customers
                </span>
                <Link data-testid="hero-cta-consumer" href="/consumer-signup" className="pill-btn btn-outline h-12 sm:h-14 px-7 sm:px-8 text-base sm:text-lg">
                  I order meals
                </Link>
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Providers open a free workspace · See{" "}
              <Link href="/pricing" className="font-semibold text-primary hover:underline">pricing</Link>
              {" · "}
              <Link href="/faq" className="font-semibold text-primary hover:underline">FAQ</Link>
              {" · Already with MealHQ? "}
              <Link href="/login" className="font-semibold text-primary hover:underline" data-testid="hero-cta-login">
                Log in
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-6 sm:gap-10 pt-4 border-t border-brand-border/80 mt-2">
            <div>
              <div className="font-display font-bold" style={{ fontSize: "clamp(2rem, 3vw, 3rem)" }}>$0</div>
              <div className="text-sm sm:text-base text-muted-foreground mt-1">to open a kitchen</div>
            </div>
            <div>
              <div className="font-display font-bold" style={{ fontSize: "clamp(2rem, 3vw, 3rem)" }}>Auto</div>
              <div className="text-sm sm:text-base text-muted-foreground mt-1">route planning</div>
            </div>
            <div>
              <div className="font-display font-bold" style={{ fontSize: "clamp(2rem, 3vw, 3rem)" }}>1-tap</div>
              <div className="text-sm sm:text-base text-muted-foreground mt-1">delivery marking</div>
            </div>
          </div>
        </div>

        <div className="flex items-center px-4 sm:px-6 lg:px-10 pb-10 lg:py-14">
          <figure className="relative w-full rounded-3xl overflow-hidden border border-brand-border bg-white shadow-xl">
            <Image
              src="/screenshots/route-planning.png"
              alt="MealHQ route planning: delivery stops grouped by driver with road routes on a map"
              width={1400}
              height={783}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="w-full h-auto"
            />
            <figcaption className="absolute left-4 bottom-4 rounded-full bg-white/95 border border-brand-border px-4 py-1.5 text-xs sm:text-sm font-semibold shadow">
              Route planning · demo data
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={`${shell} py-12 sm:py-16 border-b border-brand-border/80`} aria-labelledby="about-mealhq-heading">
        <div className="max-w-3xl flex flex-col gap-4">
          <span className="label-overline text-sm sm:text-base tracking-[0.18em]">About MealHQ</span>
          <h2
            id="about-mealhq-heading"
            className="font-display font-bold leading-[1.1] tracking-tight"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
          >
            Tiffin business software built for Canada
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            MealHQ is software for Canadian tiffin kitchens and their customers. Providers manage customers and meal plans,
            plan delivery routes, see what to cook each day, and track Interac e-Transfer payments and outstanding
            balances. Customers see their meals, balance and payment references inside their provider&apos;s workspace.
          </p>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Explore{" "}
            <Link href="/for-tiffin-providers" className="font-semibold text-primary hover:underline">
              features for providers
            </Link>
            ,{" "}
            <Link href="/tiffin-software-canada" className="font-semibold text-primary hover:underline">
              why MealHQ fits Canada
            </Link>
            , or city guides for{" "}
            <Link href="/cities/toronto" className="font-semibold text-primary hover:underline">Toronto</Link>
            {" · "}
            <Link href="/cities/vancouver" className="font-semibold text-primary hover:underline">Vancouver</Link>
            {" · "}
            <Link href="/cities/calgary" className="font-semibold text-primary hover:underline">Calgary</Link>
            . See our{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>
            {" and "}
            <Link href="/about" className="font-semibold text-primary hover:underline">About MealHQ</Link>.
          </p>
        </div>
      </section>

      <section className={`${shell} py-16 sm:py-20 lg:py-28`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
            <span className="label-overline text-sm sm:text-base tracking-[0.18em]">Built for owner-operators</span>
            <h2
              className="font-display font-bold mt-4 leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.75rem)" }}
            >
              Everything you were tracking in a notebook — now doing the work for you.
            </h2>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
            {features.map((f) => (
              <div key={f.title} className="card-tinted card-tinted-hover p-7 sm:p-8 lg:p-9">
                <f.icon size={36} className="text-primary" weight="duotone" />
                <div className="font-display font-bold text-xl sm:text-2xl mt-4">{f.title}</div>
                <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${shell} pb-16 sm:pb-20 lg:pb-28`} aria-labelledby="see-it-heading">
        <span className="label-overline text-sm sm:text-base tracking-[0.18em]">See it in action</span>
        <h2
          id="see-it-heading"
          className="font-display font-bold mt-4 leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}
        >
          The screens you will use every day
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mt-3 max-w-2xl">
          Screenshots from a demo kitchen with sample data.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-8">
          {[
            { src: "/screenshots/route-planning.png", w: 1400, h: 783, t: "Route optimization", b: "Customers grouped by driver, with the road route drawn for each one." },
            { src: "/screenshots/kitchen.png", w: 1400, h: 776, t: "Kitchen counts", b: "Exactly how many meals to cook, by type and by lunch or dinner." },
            { src: "/screenshots/dashboard.png", w: 1400, h: 165, t: "Today at a glance", b: "Deliveries, payments waiting for you, and what customers owe." },
            { src: "/screenshots/labels.png", w: 1143, h: 324, t: "Labels with QR codes", b: "One label per tiffin with the stop number and a QR code to scan." },
          ].map((shot) => (
            <figure key={shot.src} className="card-tinted p-4 sm:p-5 flex flex-col gap-4">
              <Image
                src={shot.src}
                alt={`${shot.t} screen in MealHQ`}
                width={shot.w}
                height={shot.h}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="w-full h-auto rounded-xl border border-brand-border bg-white"
              />
              <figcaption>
                <div className="font-display font-bold text-xl">{shot.t}</div>
                <p className="text-base text-muted-foreground mt-1">{shot.b}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={`${shell} pb-16 sm:pb-20 lg:pb-28`} aria-labelledby="how-it-works-heading">
        <span className="label-overline text-sm sm:text-base tracking-[0.18em]">How it works</span>
        <h2
          id="how-it-works-heading"
          className="font-display font-bold mt-4 leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}
        >
          From sign-up to first delivery in three steps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mt-8">
          {[
            { n: "1", t: "Open your kitchen", b: "Create a free workspace and add your meal plans, prices and drivers." },
            { n: "2", t: "Add customers", b: "Add each customer's plan, address and delivery days. Share your kitchen code so they can sign up themselves." },
            { n: "3", t: "Plan and deliver", b: "Optimize the day's routes, print kitchen counts and labels, and mark deliveries as you go." },
          ].map((step) => (
            <div key={step.n} className="card-tinted p-7 sm:p-8">
              <div className="font-display font-black text-primary text-4xl">{step.n}</div>
              <div className="font-display font-bold text-xl sm:text-2xl mt-3">{step.t}</div>
              <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">{step.b}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/pricing" className="font-semibold text-primary hover:underline">See pricing →</Link>
        </div>
      </section>

      <section className={`${shell} pb-16 sm:pb-20 lg:pb-28 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8`}>
        <div className="card-tinted p-8 sm:p-10 lg:p-12 flex flex-col gap-5">
          <div className="relative h-56 sm:h-72 w-full rounded-2xl overflow-hidden">
            <Image src={DRIVER_IMG} alt="MealHQ delivery courier" fill className="object-cover object-center" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <span className="label-overline text-primary text-sm">For providers</span>
          <h3 className="font-display font-bold text-3xl sm:text-4xl leading-tight">Your daily route in your pocket</h3>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">Wake up to today&apos;s delivery list, sorted by area. Tap through as you go. Outstanding balances update the moment you mark delivered.</p>
          <Link href="/signup" data-testid="cta-provider" className="pill-btn btn-primary self-start h-14 px-7 text-base sm:text-lg">Start a workspace</Link>
        </div>
        <div className="card-tinted p-8 sm:p-10 lg:p-12 flex flex-col gap-5">
          <div className="relative h-56 sm:h-72 w-full rounded-2xl overflow-hidden">
            <Image src={MEAL_IMG} alt="Prepared meal flatlay" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <span className="label-overline text-secondary text-sm">For customers</span>
          <h3 className="font-display font-bold text-3xl sm:text-4xl leading-tight">Never lose track of your subscription</h3>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">See upcoming meals, your outstanding balance, and submit Interac references — all in one place.</p>
          <Link href="/consumer-signup" data-testid="cta-consumer" className="pill-btn btn-secondary self-start h-14 px-7 text-base sm:text-lg">Sign up with your kitchen&apos;s code</Link>
          <p className="text-sm text-muted-foreground -mt-2">Your kitchen gives you the code. Not sure? Ask them.</p>
        </div>
      </section>

      <section id="contact" className={`${shell} pb-16 sm:pb-20 lg:pb-28 scroll-mt-28`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-5 flex flex-col gap-5">
            <span className="label-overline text-sm sm:text-base tracking-[0.18em]">Contact us</span>
            <h2
              className="font-display font-bold leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              Questions about MealHQ? Reach out.
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
              Tell us about your kitchen, partnership ideas, or anything else. We read every message.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              {CONTACT_EMAILS.map((email) => (
                <a
                  key={email}
                  href={`mailto:${email}`}
                  data-testid={`contact-mailto-${email.split("@")[0]}`}
                  className="inline-flex items-center gap-3 text-base sm:text-lg font-medium text-foreground hover:text-primary transition-colors"
                >
                  <EnvelopeSimple size={22} weight="duotone" className="text-primary shrink-0" />
                  {email}
                </a>
              ))}
            </div>
          </div>

          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-brand-border py-10 lg:py-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
          <Image src="/brand/mealhq-logo-horizontal-transparent.png" alt="MealHQ" width={1000} height={263} className="h-10 sm:h-12 w-auto" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="text-sm sm:text-base text-muted-foreground">Made for Canadian tiffin providers · CAD · Interac e-Transfer</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-base">
              <Link href="/about" className="font-medium hover:text-primary transition-colors" data-testid="landing-footer-about">About</Link>
              <Link href="/pricing" className="font-medium hover:text-primary transition-colors">Pricing</Link>
              <Link href="/faq" className="font-medium hover:text-primary transition-colors">FAQ</Link>
              <Link href="/blog" className="font-medium hover:text-primary transition-colors">Blog</Link>
              <Link href="/privacy" className="font-medium hover:text-primary transition-colors" data-testid="landing-footer-privacy">Privacy Policy</Link>
              <Link href="/terms" className="font-medium hover:text-primary transition-colors" data-testid="landing-footer-terms">Terms of Service</Link>
              {CONTACT_EMAILS.map((email) => (
                <a key={email} href={`mailto:${email}`} className="font-medium hover:text-primary transition-colors">
                  {email}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
