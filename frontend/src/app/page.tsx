"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Truck, ChartLineUp, Receipt, ShieldCheck } from "@phosphor-icons/react";

const HERO_IMG = "https://images.unsplash.com/photo-1781747835478-a9c3bab5a670?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjB0aWZmaW4lMjBsdW5jaCUyMGJveCUyMGZvb2R8ZW58MHx8fHwxNzgzOTI0ODk3fDA&ixlib=rb-4.1.0&q=85";
const MEAL_IMG = "https://images.unsplash.com/photo-1547592180-85f173990554?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHByZXAlMjBmbGF0bGF5fGVufDB8fHx8MTc4MzkyNDg5N3ww&ixlib=rb-4.1.0&q=85";
const DRIVER_IMG = "https://images.unsplash.com/photo-1656952945433-6cc98812d2a2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGVsaXZlcnklMjBkcml2ZXIlMjBzbWlsaW5nfGVufDB8fHx8MTc4MzkyNDg5N3ww&ixlib=rb-4.1.0&q=85";

const features = [
  { icon: Truck, title: "Daily delivery list", body: "Auto-generated from active customers and their weekly schedule. One-tap Delivered / Missed / Cancelled." },
  { icon: Receipt, title: "Interac reconciliation", body: "Consumers submit e-Transfer references and screenshots. You verify and their balance updates instantly." },
  { icon: ChartLineUp, title: "Outstanding, at a glance", body: "Delivered meals × price − payments received. Grouped by customer and by postal area." },
  { icon: ShieldCheck, title: "Multi-tenant & private", body: "Every provider has an isolated workspace with its own customers, payments and reports." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-cream text-foreground animate-fade-in-up">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-brand-cream/80 border-b border-brand-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="font-display font-black text-2xl tracking-tight">Zorvia</div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link data-testid="landing-login-link" href="/login" className="pill-btn btn-outline text-sm">Log in</Link>
            <Link data-testid="landing-signup-link" href="/signup" className="pill-btn btn-primary text-sm">Start free</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 lg:pt-20 lg:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <span className="label-overline">Canada · CAD · Interac e-Transfer</span>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Run your tiffin<br/>business without the<br/>
            <span className="text-primary">spreadsheet chaos.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Zorvia is the operating system for independent tiffin providers. Manage customers, delivery lists, Interac payments and outstanding balances — all from your phone.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Link data-testid="hero-cta-signup" href="/signup" className="pill-btn btn-primary h-12 px-6 text-base gap-2">
              Start free <ArrowRight size={18} weight="bold" />
            </Link>
            <Link data-testid="hero-cta-consumer" href="/consumer-signup" className="pill-btn btn-outline h-12 px-6 text-base">
              I'm a consumer
            </Link>
          </div>
          <div className="flex items-center gap-6 pt-4">
            <div><div className="font-display text-2xl font-bold">$0</div><div className="text-xs text-muted-foreground">to get started</div></div>
            <div className="h-8 w-px bg-brand-border" />
            <div><div className="font-display text-2xl font-bold">4h</div><div className="text-xs text-muted-foreground">default cancel cutoff</div></div>
            <div className="h-8 w-px bg-brand-border" />
            <div><div className="font-display text-2xl font-bold">1-tap</div><div className="text-xs text-muted-foreground">delivery marking</div></div>
          </div>
        </div>
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-3xl overflow-hidden border border-brand-border shadow-xl">
            <img src={HERO_IMG} alt="Partitioned Indian lunchbox" className="w-full h-[min(420px,60vh)] max-h-[60vh] object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <div className="text-white/90 text-xs uppercase tracking-[0.2em]">Today · Toronto</div>
              <div className="text-white font-display font-bold text-2xl mt-1">18 deliveries · $234 pending</div>
            </div>
          </div>
          <div className="hidden md:block absolute -bottom-8 -left-8 bg-white rounded-2xl border border-brand-border shadow-lg p-4 w-56">
            <div className="label-overline">Just verified</div>
            <div className="font-display font-bold text-lg mt-1">Aarav S. · $65</div>
            <div className="text-xs text-muted-foreground">Interac ref #TX-4429</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5">
            <span className="label-overline">Built for owner-operators</span>
            <h2 className="font-display font-bold text-3xl lg:text-4xl mt-3 leading-tight">Everything you were tracking in a notebook — now doing the work for you.</h2>
          </div>
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="card-tinted card-tinted-hover p-6">
                <f.icon size={28} className="text-primary" weight="duotone" />
                <div className="font-display font-bold text-lg mt-3">{f.title}</div>
                <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-tinted p-8 flex flex-col gap-5">
          <img src={DRIVER_IMG} alt="Delivery" className="rounded-xl h-48 w-full object-cover" />
          <span className="label-overline text-primary">For providers</span>
          <h3 className="font-display font-bold text-2xl">Your daily route in your pocket</h3>
          <p className="text-sm text-muted-foreground">Wake up to today's delivery list, sorted by area. Tap through as you go. Outstanding balances update the moment you mark delivered.</p>
          <Link href="/signup" data-testid="cta-provider" className="pill-btn btn-primary self-start">Start a workspace</Link>
        </div>
        <div className="card-tinted p-8 flex flex-col gap-5">
          <img src={MEAL_IMG} alt="Meal" className="rounded-xl h-48 w-full object-cover" />
          <span className="label-overline text-secondary">For consumers</span>
          <h3 className="font-display font-bold text-2xl">Never lose track of your subscription</h3>
          <p className="text-sm text-muted-foreground">See upcoming meals, your outstanding balance, and submit Interac references — all in one place.</p>
          <Link href="/consumer-signup" data-testid="cta-consumer" className="pill-btn btn-secondary self-start">Join with a code</Link>
        </div>
      </section>

      <footer className="border-t border-brand-border py-10 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="font-display font-bold text-lg">Zorvia<span className="text-primary">.</span></div>
          <div className="text-xs text-muted-foreground">Made for Canadian tiffin providers · CAD · Interac e-Transfer</div>
        </div>
      </footer>
    </div>
  );
}
