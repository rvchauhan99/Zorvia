import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WEEKDAYS } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function ConsumerSignup() {
  const { consumerSignup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    signup_code: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    apartment: "",
    postal_code: "",
    delivery_days: [0, 1, 2, 3, 4],
  });
  const [submitting, setSubmitting] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function toggleDay(i) {
    setForm((f) => ({
      ...f,
      delivery_days: f.delivery_days.includes(i)
        ? f.delivery_days.filter((d) => d !== i)
        : [...f.delivery_days, i],
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const s = await consumerSignup(form);
      toast.success(`Welcome, ${s.display_name}! Awaiting provider approval.`);
      nav("/consumer", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none";
  const label = "flex flex-col gap-1.5";

  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-3xl mx-auto p-6 sm:p-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
        <h1 className="font-display font-black text-4xl mt-4 leading-tight">Sign up with your<br/><span className="text-secondary">provider's code</span>.</h1>
        <p className="text-sm text-muted-foreground mt-2">Ask your tiffin provider for their signup code (e.g. TF-A12BCD).</p>

        <form onSubmit={onSubmit} className="mt-8 card-tinted p-6 sm:p-8 flex flex-col gap-5">
          <label className={label}>
            <span className="label-overline">Provider signup code</span>
            <input data-testid="csignup-code" required className={`${input} uppercase tracking-widest font-medium`} value={form.signup_code} onChange={upd("signup_code")} placeholder="TF-XXXXXX" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={label}>
              <span className="label-overline">Your name</span>
              <input data-testid="csignup-name" required className={input} value={form.name} onChange={upd("name")} placeholder="Aarav Sharma" />
            </label>
            <label className={label}>
              <span className="label-overline">Phone</span>
              <input data-testid="csignup-phone" className={input} value={form.phone} onChange={upd("phone")} placeholder="416-555-1212" />
            </label>
            <label className={label}>
              <span className="label-overline">Email</span>
              <input data-testid="csignup-email" required type="email" className={input} value={form.email} onChange={upd("email")} placeholder="you@example.com" />
            </label>
            <label className={label}>
              <span className="label-overline">Password</span>
              <input data-testid="csignup-password" required type="password" minLength={6} className={input} value={form.password} onChange={upd("password")} placeholder="min 6 chars" />
            </label>
            <label className={`${label} sm:col-span-2`}>
              <span className="label-overline">Address</span>
              <input data-testid="csignup-address" className={input} value={form.address} onChange={upd("address")} placeholder="45 Bloor St W" />
            </label>
            <label className={label}>
              <span className="label-overline">Apartment / unit</span>
              <input data-testid="csignup-apt" className={input} value={form.apartment} onChange={upd("apartment")} placeholder="Unit 302" />
            </label>
            <label className={label}>
              <span className="label-overline">Postal code</span>
              <input data-testid="csignup-postal" className={`${input} uppercase`} value={form.postal_code} onChange={upd("postal_code")} placeholder="M5S 1M2" />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <span className="label-overline">Delivery days</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = form.delivery_days.includes(d.i);
                return (
                  <button
                    key={d.i}
                    type="button"
                    data-testid={`csignup-day-${d.s}`}
                    onClick={() => toggleDay(d.i)}
                    className={`px-4 h-10 rounded-full border text-sm font-medium transition-colors ${
                      on ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border text-foreground hover:bg-brand-surface"
                    }`}
                  >
                    {d.s}
                  </button>
                );
              })}
            </div>
          </div>
          <button data-testid="csignup-submit" disabled={submitting} className="pill-btn btn-secondary h-12 disabled:opacity-60">
            {submitting ? "Creating account..." : "Create consumer account"}
          </button>
          <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-brand-border" /> OR <div className="flex-1 h-px bg-brand-border" />
          </div>
          <GoogleSignInButton
            user_type="consumer"
            signup_code={form.signup_code}
            disabled={!form.signup_code}
            label={form.signup_code ? "Continue with Google" : "Enter a signup code to use Google"}
            testid="google-signup-consumer"
          />
          <div className="text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary font-medium">Log in</Link></div>
        </form>
      </div>
    </div>
  );
}
