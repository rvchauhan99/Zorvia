"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { trackEvent } from "@/lib/ga";
import { CA_PROVINCES, formatCaPostal, isValidCaPostal } from "@/lib/ca-provinces";

export default function ProviderSignup() {
  const { providerSignup } = useAuth();
  const router = useRouter();
  useEffect(() => {
    trackEvent("signup_start", { flow: "provider" });
  }, []);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    org_name: "",
    signup_code: "",
    address: "",
    apartment: "",
    city: "",
    province: "ON",
    country: "CA",
    postal_code: "",
    interac_email: "",
    meal_price_default: 12,
    timezone: "America/Toronto",
    cutoff_hours: 4,
  });
  const [submitting, setSubmitting] = useState(false);
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (!(form.address || "").trim() || !(form.city || "").trim() || !(form.province || "").trim() || !(form.postal_code || "").trim()) {
      toast.error("Address, city, province, and postal code are required");
      return;
    }
    if (!isValidCaPostal(form.postal_code)) {
      toast.error("Enter a valid Canadian postal code (e.g. M5H 2M9)");
      return;
    }
    setSubmitting(true);
    try {
      const { confirm_password: _, ...rest } = form;
      const payload = {
        ...rest,
        address: form.address.trim(),
        apartment: (form.apartment || "").trim(),
        city: form.city.trim(),
        province: (form.province || "ON").trim().toUpperCase(),
        country: "CA",
        postal_code: formatCaPostal(form.postal_code),
        meal_price_default: Number(form.meal_price_default),
        cutoff_hours: Number(form.cutoff_hours),
      };
      const s = await providerSignup(payload);
      trackEvent("signup_complete", { flow: "provider" });
      if ("pending_email_verification" in s && s.pending_email_verification) {
        toast.success("Check your email for a verification code");
        router.replace(`/verify-email?email=${encodeURIComponent(s.email)}`);
        return;
      }
      toast.success(`Workspace created. Welcome, ${(s as { display_name?: string }).display_name}!`);
      router.replace("/provider");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";
  const label = "flex flex-col gap-1.5";

  return (
    <div className="min-h-screen bg-brand-cream animate-fade-in-up">
      <div className="max-w-5xl mx-auto p-6 sm:p-10">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back home</Link>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <span className="label-overline">Provider signup</span>
            <h1 className="font-display font-black text-4xl leading-tight">Start your<br/><span className="text-primary">tiffin workspace</span>.</h1>
            <p className="text-sm text-muted-foreground">You&apos;ll be able to add customers, generate daily delivery lists and reconcile Interac payments right away.</p>
            <div className="card-tinted p-4 text-sm mt-4">
              <div className="label-overline">What you get</div>
              <ul className="mt-3 space-y-2 text-foreground/80 list-disc pl-4">
                <li>Multi-tenant workspace (only you see your data)</li>
                <li>Consumer portal with signup code</li>
                <li>Reports: outstanding, collections, area summary</li>
              </ul>
            </div>
          </div>

          <form onSubmit={onSubmit} className="lg:col-span-3 card-tinted p-6 lg:p-8 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={label}>
                <span className="label-overline">Your name</span>
                <input data-testid="signup-name" required className={input} value={form.name} onChange={upd("name")} placeholder="Rita Kaur" />
              </label>
              <label className={label}>
                <span className="label-overline">Workspace / business name</span>
                <input data-testid="signup-org" required className={input} value={form.org_name} onChange={upd("org_name")} placeholder="Kaur Kitchen" />
              </label>
              <label className={label}>
                <span className="label-overline">Email</span>
                <input data-testid="signup-email" required type="email" className={input} value={form.email} onChange={upd("email")} placeholder="you@example.com" />
              </label>
              <label className={label}>
                <span className="label-overline">Password</span>
                <input data-testid="signup-password" required type="password" minLength={6} className={input} value={form.password} onChange={upd("password")} placeholder="min 6 chars" />
              </label>
              <label className={label}>
                <span className="label-overline">Confirm password</span>
                <input data-testid="signup-confirm-password" required type="password" minLength={6} className={input} value={form.confirm_password} onChange={upd("confirm_password")} placeholder="re-enter password" />
              </label>
              <label className={`${label} sm:col-span-2`}>
                <span className="label-overline">Signup code</span>
                <input
                  data-testid="signup-code"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9]{3,32}"
                  title="3–32 letters or numbers only"
                  className={`${input} uppercase tracking-widest font-medium`}
                  value={form.signup_code}
                  onChange={upd("signup_code")}
                  placeholder="e.g. KAURKITCHEN"
                />
                <span className="text-xs text-muted-foreground">Letters and numbers only. Customers use this code to join. Must be unique.</span>
              </label>
              <label className={`${label} sm:col-span-2`}>
                <span className="label-overline">Street address</span>
                <input data-testid="signup-address" required className={input} value={form.address} onChange={upd("address")} placeholder="123 King St W" />
              </label>
              <label className={label}>
                <span className="label-overline">Apartment / unit</span>
                <input data-testid="signup-apt" className={input} value={form.apartment} onChange={upd("apartment")} />
              </label>
              <label className={label}>
                <span className="label-overline">City</span>
                <input data-testid="signup-city" required className={input} value={form.city} onChange={upd("city")} placeholder="Toronto" />
              </label>
              <label className={label}>
                <span className="label-overline">Province / territory</span>
                <select data-testid="signup-province" required className={input} value={form.province || "ON"} onChange={upd("province")}>
                  {CA_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                <span className="label-overline">Postal code</span>
                <input
                  data-testid="signup-postal"
                  required
                  className={`${input} uppercase`}
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value.toUpperCase() })}
                  placeholder="M5H 2M9"
                />
              </label>
              <label className={label}>
                <span className="label-overline">Interac payment email</span>
                <input data-testid="signup-interac" type="email" className={input} value={form.interac_email} onChange={upd("interac_email")} placeholder="pay@yourkitchen.ca" />
              </label>
              <label className={label}>
                <span className="label-overline">Default meal price (CAD)</span>
                <input data-testid="signup-meal-price" type="number" step="0.5" min="0" className={input} value={form.meal_price_default} onChange={upd("meal_price_default")} />
              </label>
              <label className={label}>
                <span className="label-overline">Timezone</span>
                <select data-testid="signup-timezone" className={input} value={form.timezone} onChange={upd("timezone")}>
                  <option value="America/Toronto">America/Toronto (ET)</option>
                  <option value="America/Vancouver">America/Vancouver (PT)</option>
                  <option value="America/Edmonton">America/Edmonton (MT)</option>
                  <option value="America/Winnipeg">America/Winnipeg (CT)</option>
                  <option value="America/Halifax">America/Halifax (AT)</option>
                  <option value="America/St_Johns">America/St_Johns (NT)</option>
                </select>
              </label>
              <label className={label}>
                <span className="label-overline">Cancellation cutoff (hours)</span>
                <input data-testid="signup-cutoff" type="number" min="0" max="24" className={input} value={form.cutoff_hours} onChange={upd("cutoff_hours")} />
              </label>
            </div>
            <button data-testid="signup-submit" disabled={submitting} className="pill-btn btn-primary h-12 gap-2 disabled:opacity-60 cursor-pointer">
              {submitting ? "Creating workspace..." : (<>Create workspace <ArrowRight size={18} weight="bold" /></>)}
            </button>
            <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-brand-border" /> OR <div className="flex-1 h-px bg-brand-border" />
            </div>
            <GoogleSignInButton
              user_type="provider"
              org_name={form.org_name}
              signup_code={form.signup_code}
              disabled={!form.org_name || !form.signup_code}
              label={form.org_name && form.signup_code ? "Continue with Google" : "Enter workspace name and signup code to use Google"}
              testid="google-signup-provider"
            />
            <div className="text-sm text-muted-foreground mt-2">Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link></div>
          </form>
        </div>
      </div>
    </div>
  );
}
