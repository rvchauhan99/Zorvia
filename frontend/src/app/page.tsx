"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Truck, ChartLineUp, Receipt, ShieldCheck, EnvelopeSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const HERO_IMG = "https://images.unsplash.com/photo-1781747835478-a9c3bab5a670?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjB0aWZmaW4lMjBsdW5jaCUyMGJveCUyMGZvb2R8ZW58MHx8fHwxNzgzOTI0ODk3fDA&ixlib=rb-4.1.0&q=85";
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
  { icon: ShieldCheck, title: "Multi-tenant & private", body: "Every provider has an isolated workspace with its own customers, payments and reports." },
];

const shell = "mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-10";
const inputCls = "h-12 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow w-full";

export default function Landing() {
  const [contact, setContact] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function onContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.name.trim() || !contact.email.trim() || !contact.message.trim()) {
      toast.error("Name, email, and message are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/public/contact", {
        name: contact.name.trim(),
        email: contact.email.trim(),
        subject: contact.subject.trim() || undefined,
        message: contact.message.trim(),
        company: contact.company,
      });
      toast.success("Message sent — we'll get back to you soon.");
      setContact({ name: "", email: "", subject: "", message: "", company: "" });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not send. Please email us directly.";
      toast.error(typeof detail === "string" ? detail : "Could not send. Please email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream text-foreground animate-fade-in-up">
      {/* Nav — brand larger than actions */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-brand-cream/85 border-b border-brand-border">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-4 gap-3">
          <Link href="/" className="inline-flex items-center shrink-0" data-testid="landing-brand">
            <img
              src="/brand/mealhq-logo-horizontal.png"
              alt="MealHQ"
              className="h-16 sm:h-20 lg:h-24 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-2.5">
            <a
              data-testid="landing-contact-link"
              href="#contact"
              className="hidden sm:inline-flex pill-btn btn-outline text-sm h-9 sm:h-10 px-4 sm:px-5"
            >
              Contact
            </a>
            <Link data-testid="landing-login-link" href="/login" className="pill-btn btn-outline text-sm h-9 sm:h-10 px-4 sm:px-5">
              Log in
            </Link>
            <Link data-testid="landing-signup-link" href="/signup" className="pill-btn btn-primary text-sm h-9 sm:h-10 px-4 sm:px-5">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — full-bleed split: copy left, image flush to right edge on desktop */}
      <section className="relative lg:min-h-[calc(100vh-6.5rem)] grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-5 sm:gap-7 px-4 sm:px-6 lg:px-10 xl:px-14 py-10 sm:py-14 lg:py-16">
          <span className="label-overline text-sm sm:text-base tracking-[0.2em]">Canada · CAD · Interac e-Transfer</span>
          <p
            className="font-display font-black tracking-tight text-primary"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.05 }}
            data-testid="landing-app-name"
          >
            MealHQ
          </p>
          <h1
            className="font-display font-black tracking-tight text-foreground"
            style={{ fontSize: "clamp(2.35rem, 5vw, 4.75rem)", lineHeight: 1.02 }}
          >
            Run your tiffin business without the{" "}
            <span className="text-primary">spreadsheet chaos.</span>
          </h1>
          <p
            className="text-muted-foreground max-w-[42rem] leading-snug"
            style={{ fontSize: "clamp(1.125rem, 1.5vw, 1.5rem)" }}
          >
            MealHQ is the operating system for independent tiffin providers. Manage customers, delivery lists, Interac payments and outstanding balances — all from your phone.
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
              Providers open a free workspace · Already with MealHQ?{" "}
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
              <div className="font-display font-bold" style={{ fontSize: "clamp(2rem, 3vw, 3rem)" }}>4h</div>
              <div className="text-sm sm:text-base text-muted-foreground mt-1">default cancel cutoff</div>
            </div>
            <div>
              <div className="font-display font-bold" style={{ fontSize: "clamp(2rem, 3vw, 3rem)" }}>1-tap</div>
              <div className="text-sm sm:text-base text-muted-foreground mt-1">delivery marking</div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[52vh] sm:min-h-[58vh] lg:min-h-full">
          <img
            src={HERO_IMG}
            alt="Partitioned Indian lunchbox"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
            <div className="text-white/85 text-xs sm:text-sm uppercase tracking-[0.22em]">Today · Toronto</div>
            <div className="text-white font-display font-bold mt-2" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)" }}>
              18 deliveries · $234 pending
            </div>
          </div>
          <div className="hidden sm:block absolute top-8 left-6 lg:left-8 bg-white rounded-2xl border border-brand-border shadow-lg p-5 w-64">
            <div className="label-overline">Just verified</div>
            <div className="font-display font-bold text-xl mt-1">Aarav S. · $65</div>
            <div className="text-sm text-muted-foreground">Interac ref #TX-4429</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`${shell} py-16 sm:py-20 lg:py-28`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-5">
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

      {/* Split */}
      <section className={`${shell} pb-16 sm:pb-20 lg:pb-28 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8`}>
        <div className="card-tinted p-8 sm:p-10 lg:p-12 flex flex-col gap-5">
          <img src={DRIVER_IMG} alt="MealHQ delivery courier" className="rounded-2xl h-56 sm:h-72 w-full object-cover object-center" />
          <span className="label-overline text-primary text-sm">For providers</span>
          <h3 className="font-display font-bold text-3xl sm:text-4xl leading-tight">Your daily route in your pocket</h3>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">Wake up to today&apos;s delivery list, sorted by area. Tap through as you go. Outstanding balances update the moment you mark delivered.</p>
          <Link href="/signup" data-testid="cta-provider" className="pill-btn btn-primary self-start h-14 px-7 text-base sm:text-lg">Start a workspace</Link>
        </div>
        <div className="card-tinted p-8 sm:p-10 lg:p-12 flex flex-col gap-5">
          <img src={MEAL_IMG} alt="Meal" className="rounded-2xl h-56 sm:h-72 w-full object-cover" />
          <span className="label-overline text-secondary text-sm">For customers</span>
          <h3 className="font-display font-bold text-3xl sm:text-4xl leading-tight">Never lose track of your subscription</h3>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">See upcoming meals, your outstanding balance, and submit Interac references — all in one place.</p>
          <Link href="/consumer-signup" data-testid="cta-consumer" className="pill-btn btn-secondary self-start h-14 px-7 text-base sm:text-lg">Join with a code</Link>
        </div>
      </section>

      {/* Contact */}
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

          <form
            onSubmit={onContactSubmit}
            data-testid="contact-form"
            className="lg:col-span-7 card-tinted p-7 sm:p-9 lg:p-10 flex flex-col gap-4"
          >
            {/* Honeypot */}
            <input
              type="text"
              name="company"
              value={contact.company}
              onChange={(e) => setContact({ ...contact, company: e.target.value })}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Name</span>
                <input
                  data-testid="contact-name"
                  required
                  className={inputCls}
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Email</span>
                <input
                  data-testid="contact-email"
                  required
                  type="email"
                  className={inputCls}
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Subject <span className="text-muted-foreground font-normal">(optional)</span></span>
              <input
                data-testid="contact-subject"
                className={inputCls}
                value={contact.subject}
                onChange={(e) => setContact({ ...contact, subject: e.target.value })}
                placeholder="How can we help?"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Message</span>
              <textarea
                data-testid="contact-message"
                required
                rows={5}
                maxLength={2000}
                className={`${inputCls} h-auto py-3 resize-y min-h-[140px]`}
                value={contact.message}
                onChange={(e) => setContact({ ...contact, message: e.target.value })}
                placeholder="Tell us a bit about your kitchen or question…"
              />
            </label>
            <button
              type="submit"
              data-testid="contact-submit"
              disabled={submitting}
              className="pill-btn btn-primary self-start h-12 px-7 text-base gap-2 disabled:opacity-60 cursor-pointer mt-1"
            >
              {submitting ? "Sending…" : "Send message"}
              {!submitting && <ArrowRight size={18} weight="bold" />}
            </button>
          </form>
        </div>
      </section>

      {/* OAuth brand verification: purpose + Google Sign-In data use (must be public, no login) */}
      <section className={`${shell} pb-16 sm:pb-20 lg:pb-28`} aria-labelledby="about-mealhq-heading">
        <div className="max-w-3xl flex flex-col gap-4">
          <span className="label-overline text-sm sm:text-base tracking-[0.18em]">About MealHQ</span>
          <h2
            id="about-mealhq-heading"
            className="font-display font-bold leading-[1.1] tracking-tight"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
          >
            What MealHQ is — and why we use Google Sign-In
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            MealHQ is a multi-tenant SaaS for Canadian tiffin kitchens and their customers. Providers run delivery lists,
            Interac e-Transfer reconciliation, and outstanding balances. Customers track meals, balances, and payment
            references inside their provider&apos;s workspace.
          </p>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Sign in with Google lets you create or access a MealHQ account using your Google account. MealHQ requests
            your basic Google profile (name, email address, and profile photo) only to authenticate you and set up your
            MealHQ user record. We do not read your Gmail, contacts, or Drive, and we do not post to Google on your behalf.
            See our{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </section>

      <footer className="border-t border-brand-border py-10 lg:py-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
          <img src="/brand/mealhq-logo-horizontal.png" alt="MealHQ" className="h-14 sm:h-16 w-auto" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="text-sm sm:text-base text-muted-foreground">Made for Canadian tiffin providers · CAD · Interac e-Transfer</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-base">
              <Link href="/privacy" className="font-medium hover:text-primary transition-colors" data-testid="landing-footer-privacy">
                Privacy
              </Link>
              <Link href="/terms" className="font-medium hover:text-primary transition-colors" data-testid="landing-footer-terms">
                Terms
              </Link>
              <span className="text-muted-foreground">Contact</span>
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
