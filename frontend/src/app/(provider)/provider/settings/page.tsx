"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash } from "@phosphor-icons/react";
import { todayISO } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import ImageSourceField from "@/components/ImageSourceField";
import { PageLoader } from "@/components/loaders";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";

export default function Settings() {
  const { session, ready } = useAuth();
  const router = useRouter();
  const [prov, setProv] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newClosed, setNewClosed] = useState(todayISO());
  const [staff, setStaff] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "", role: "driver" });
  const [staffBusy, setStaffBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [waEnabled, setWaEnabled] = useState(false);
  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";

  async function load() {
    const [{ data: p }, { data: s }, { data: me }, enabled] = await Promise.all([
      api.get("/providers/me"),
      api.get("/providers/me/staff"),
      api.get("/auth/me"),
      fetchWhatsappFeaturesEnabled(),
    ]);
    setProv(p);
    setStaff(s);
    setHasPassword(!!me?.has_password);
    setWaEnabled(enabled);
  }

  useEffect(() => {
    if (!ready) return;
    if (!canMutateAdmin(session)) {
      router.replace("/provider");
      return;
    }
    load().catch(() => toast.error("Failed to load settings"));
  }, [ready, session, router]);

  if (!prov) return <PageLoader testid="settings-loader" />;

  function upd(k: string, v: string) {
    setProv((p: any) => ({ ...p, [k]: v }));
  }
  function updSettings(k: string, v: string | string[] | boolean | number) {
    setProv((p: any) => ({ ...p, settings: { ...p.settings, [k]: v } }));
  }

  const mealTypes: { id: string; name: string; price: number | string; is_system?: boolean }[] =
    Array.isArray(prov.meal_types) && prov.meal_types.length
      ? prov.meal_types
      : [
          { id: "regular", name: "Regular", price: prov.meal_price_default ?? 12, is_system: true },
          { id: "jain", name: "Jain", price: prov.meal_price_default ?? 12, is_system: true },
          { id: "fasting", name: "Fasting", price: prov.meal_price_default ?? 12, is_system: true },
        ];

  function setMealTypes(next: typeof mealTypes) {
    setProv((p: any) => ({ ...p, meal_types: next }));
  }

  function updMealTypePrice(id: string, price: string) {
    setMealTypes(mealTypes.map((t) => (t.id === id ? { ...t, price } : t)));
  }

  function updMealTypeName(id: string, name: string) {
    setMealTypes(mealTypes.map((t) => (t.id === id && !t.is_system ? { ...t, name } : t)));
  }

  function addCustomMealType() {
    const id = `custom_${Math.random().toString(36).slice(2, 10)}`;
    const seed = Number(mealTypes.find((t) => t.id === "regular")?.price ?? prov.meal_price_default ?? 12) || 12;
    setMealTypes([...mealTypes, { id, name: "Custom", price: seed, is_system: false }]);
  }

  function removeMealType(id: string) {
    const row = mealTypes.find((t) => t.id === id);
    if (!row || row.is_system || id === "regular" || id === "jain" || id === "fasting") {
      toast.error("System meal types cannot be removed");
      return;
    }
    setMealTypes(mealTypes.filter((t) => t.id !== id));
  }

  const closedDates: string[] = [...(prov.settings?.closed_dates || [])].sort();

  function addClosedDate() {
    if (!newClosed) return;
    if (closedDates.includes(newClosed)) {
      toast.error("Date already added");
      return;
    }
    updSettings("closed_dates", [...closedDates, newClosed].sort());
    toast.success("Closed date added — save to apply");
  }

  function removeClosedDate(d: string) {
    updSettings("closed_dates", closedDates.filter((x) => x !== d));
  }

  async function save() {
    setSaving(true);
    try {
      const typesPayload = mealTypes.map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price),
        is_system: !!t.is_system || ["regular", "jain", "fasting"].includes(t.id),
      }));
      for (const t of typesPayload) {
        if (!t.name?.trim() || !(t.price > 0)) {
          toast.error("Each meal type needs a name and price greater than 0");
          setSaving(false);
          return;
        }
      }
      const payload = {
        name: prov.name,
        address: prov.address,
        interac_email: prov.interac_email,
        meal_types: typesPayload,
        cutoff_hours: Number(prov.settings?.cutoff_hours),
        timezone: prov.settings?.timezone,
        closed_dates: prov.settings?.closed_dates || [],
        sms_notifications: !!prov.settings?.sms_notifications,
        tax_rate_percent: Number(prov.settings?.tax_rate_percent ?? 0),
      };
      const { data } = await api.patch("/providers/me", payload);
      setProv(data);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffBusy(true);
    try {
      await api.post("/providers/me/staff", staffForm);
      toast.success("Staff member created");
      setStaffForm({ name: "", email: "", password: "", role: "driver" });
      const { data } = await api.get("/providers/me/staff");
      setStaff(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create staff");
    } finally {
      setStaffBusy(false);
    }
  }

  async function onLogoPick(file: File | null) {
    if (!file) return;
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/providers/me/logo", fd);
      setProv((p: any) => ({ ...p, logo_url: data.logo_url }));
      toast.success("Kitchen logo updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Logo upload failed");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    try {
      await api.delete("/providers/me/logo");
      setProv((p: any) => ({ ...p, logo_url: null }));
      toast.success("Logo removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setLogoBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    setPwBusy(true);
    try {
      const body: { new_password: string; current_password?: string } = {
        new_password: pwForm.new_password,
      };
      if (hasPassword) body.current_password = pwForm.current_password;
      await api.post("/auth/change-password", body);
      toast.success(hasPassword ? "Password updated" : "Password set — you can sign in with email too");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setHasPassword(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up max-w-3xl">
      <div>
        <span className="label-overline">Configuration</span>
        <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Settings</h1>
      </div>

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="label-overline">Signup code</div>
            <div className="font-mono font-semibold text-lg break-all">{prov.signup_code}</div>
          </div>
          <button data-testid="copy-code-settings" onClick={() => { navigator.clipboard.writeText(prov.signup_code); toast.success("Copied"); }} className="pill-btn btn-outline cursor-pointer hover:bg-brand-surface h-11 min-h-[44px] shrink-0">Copy</button>
        </div>
        <p className="text-xs text-muted-foreground">Share this with consumers to let them sign themselves up. You approve them from the Customers page.</p>
      </div>

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="kitchen-logo-section">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl">Kitchen logo</h2>
          <p className="text-sm text-muted-foreground mt-1">Stored as a 512×512 JPEG on Cloudflare R2 (or inline fallback).</p>
        </div>
        <ImageSourceField
          onChange={onLogoPick}
          disabled={logoBusy}
          testid="kitchen-logo"
          uploadInputTestId="kitchen-logo-input"
          remotePreviewUrl={prov.logo_url || null}
          showClear={false}
        />
        {prov.logo_url ? (
          <button type="button" data-testid="kitchen-logo-remove" disabled={logoBusy} onClick={removeLogo} className="text-sm text-destructive hover:underline cursor-pointer disabled:opacity-60 self-start">
            Remove logo
          </button>
        ) : null}
      </div>

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="change-password-section">
        <div>
          <h2 className="font-display font-bold text-xl">{hasPassword ? "Change password" : "Set password"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasPassword
              ? "Requires your current password."
              : "You signed in with Google. Set a password to also use email login."}
          </p>
        </div>
        <form onSubmit={changePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hasPassword ? (
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="label-overline">Current password</span>
              <input data-testid="pw-current" type="password" required className={input} value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">New password</span>
            <input data-testid="pw-new" type="password" required minLength={6} className={input} value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Confirm new password</span>
            <input data-testid="pw-confirm" type="password" required minLength={6} className={input} value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
          </label>
          <button data-testid="pw-submit" type="submit" disabled={pwBusy} className="pill-btn btn-outline h-11 sm:col-span-2 cursor-pointer disabled:opacity-60">
            {pwBusy ? (hasPassword ? "Updating…" : "Setting…") : (hasPassword ? "Update password" : "Set password")}
          </button>
        </form>
      </div>

      <div className="card-tinted p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Business name</span>
          <input data-testid="s-name" className={input} value={prov.name || ""} onChange={(e) => upd("name", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Interac payment email</span>
          <input data-testid="s-interac" type="email" className={input} value={prov.interac_email || ""} onChange={(e) => upd("interac_email", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="label-overline">Address</span>
          <input data-testid="s-address" className={input} value={prov.address || ""} onChange={(e) => upd("address", e.target.value)} />
        </label>
        <div className="sm:col-span-2 flex flex-col gap-3" data-testid="s-meal-types">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="label-overline">Meal types</span>
              <p className="text-xs text-muted-foreground mt-0.5">Per-type CAD prices. Regular / Jain / Fasting are always available; add custom types if needed.</p>
            </div>
            <button
              type="button"
              data-testid="s-meal-type-add"
              onClick={addCustomMealType}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full border border-brand-border bg-white text-sm font-medium hover:bg-brand-surface cursor-pointer"
            >
              <Plus size={14} weight="bold" /> Add type
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {mealTypes.map((t) => {
              const locked = !!t.is_system || ["regular", "jain", "fasting"].includes(t.id);
              return (
                <li key={t.id} className="flex flex-col sm:flex-row gap-2 sm:items-center" data-testid={`s-meal-type-${t.id}`}>
                  <input
                    data-testid={`s-meal-type-name-${t.id}`}
                    className={`${input} flex-1`}
                    value={t.name}
                    disabled={locked}
                    onChange={(e) => updMealTypeName(t.id, e.target.value)}
                    aria-label="Meal type name"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      data-testid={t.id === "regular" ? "s-price" : `s-meal-type-price-${t.id}`}
                      type="number"
                      step="0.5"
                      min={0.01}
                      className={`${input} w-28`}
                      value={t.price}
                      onChange={(e) => updMealTypePrice(t.id, e.target.value)}
                      aria-label={`${t.name} price CAD`}
                    />
                    <span className="text-xs text-muted-foreground shrink-0">CAD</span>
                    {!locked ? (
                      <button
                        type="button"
                        data-testid={`s-meal-type-remove-${t.id}`}
                        onClick={() => removeMealType(t.id)}
                        className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                        aria-label="Remove meal type"
                      >
                        <Trash size={16} />
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-11 text-center">Core</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Cancellation cutoff (h)</span>
          <input data-testid="s-cutoff" type="number" className={input} value={prov.settings?.cutoff_hours ?? 4} onChange={(e) => updSettings("cutoff_hours", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Tax rate % (GST/HST)</span>
          <input
            data-testid="s-tax-rate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            className={input}
            value={prov.settings?.tax_rate_percent ?? 0}
            onChange={(e) => updSettings("tax_rate_percent", e.target.value)}
          />
          <span className="text-xs text-muted-foreground">Add-on on meal prices for outstanding &amp; statements. 0 = no tax.</span>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="label-overline">Timezone</span>
          <select data-testid="s-tz" className={input} value={prov.settings?.timezone || "America/Toronto"} onChange={(e) => updSettings("timezone", e.target.value)}>
            <option value="America/Toronto">America/Toronto</option>
            <option value="America/Vancouver">America/Vancouver</option>
            <option value="America/Edmonton">America/Edmonton</option>
            <option value="America/Winnipeg">America/Winnipeg</option>
            <option value="America/Halifax">America/Halifax</option>
            <option value="America/St_Johns">America/St_Johns</option>
          </select>
        </label>
        <label className="flex items-center gap-3 sm:col-span-2 min-h-[44px]" data-testid="sms-notifications-toggle">
          <input
            type="checkbox"
            checked={!!prov.settings?.sms_notifications}
            onChange={(e) => updSettings("sms_notifications", e.target.checked)}
            className="h-5 w-5 rounded border-brand-border"
          />
          <span>
            <span className="font-medium text-sm">SMS notifications</span>
            <span className="block text-xs text-muted-foreground">Confirm consumer cancellations by SMS when Twilio is configured</span>
          </span>
        </label>
        {waEnabled ? (
          <label className="flex items-center gap-3 sm:col-span-2 min-h-[44px]" data-testid="whatsapp-menu-share-toggle">
            <input
              type="checkbox"
              checked={prov.settings?.whatsapp_menu_share !== false}
              onChange={(e) => updSettings("whatsapp_menu_share", e.target.checked)}
              className="h-5 w-5 rounded border-brand-border"
            />
            <span>
              <span className="font-medium text-sm">WhatsApp menu share</span>
              <span className="block text-xs text-muted-foreground">
                Allow sharing menu updates to opted-in customers via MealHQ WhatsApp
              </span>
            </span>
          </label>
        ) : null}
      </div>

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="closed-dates-section">
        <div>
          <h2 className="font-display font-bold text-xl">Closed dates / holidays</h2>
          <p className="text-sm text-muted-foreground mt-1">No deliveries will be generated on these dates.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Add date</span>
            <input
              data-testid="closed-date-input"
              type="date"
              className={input}
              value={newClosed}
              onChange={(e) => setNewClosed(e.target.value)}
            />
          </label>
          <button
            type="button"
            data-testid="closed-date-add"
            onClick={addClosedDate}
            className="pill-btn btn-outline gap-2 h-11 cursor-pointer hover:bg-brand-surface"
          >
            <Plus size={16} /> Add
          </button>
        </div>
        {closedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No closed dates configured.</p>
        ) : (
          <ul className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
            {closedDates.map((d) => (
              <li key={d} className="flex items-center justify-between px-4 py-3 bg-white">
                <span className="font-mono text-sm" data-testid={`closed-date-${d}`}>{d}</span>
                <button
                  type="button"
                  data-testid={`closed-date-remove-${d}`}
                  onClick={() => removeClosedDate(d)}
                  className="icon-btn icon-btn-danger"
                  title="Remove"
                >
                  <Trash size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="staff-section">
        <div>
          <h2 className="font-display font-bold text-xl">Staff</h2>
          <p className="text-sm text-muted-foreground mt-1">Admins, drivers (deliveries only), and viewers (read-only).</p>
        </div>
        <ul className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
          {staff.map((s) => (
            <li key={s.id} data-testid={`staff-row-${s.id}`} className="flex items-center justify-between px-4 py-3 bg-white gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{s.name || s.email}</div>
                <div className="text-xs text-muted-foreground truncate">{s.email}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-surface">{s.role || "admin"}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={createStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <input data-testid="staff-name" required placeholder="Name" className={input} value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
          <input data-testid="staff-email" required type="email" placeholder="Email" className={input} value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
          <input data-testid="staff-password" required type="password" minLength={6} placeholder="Password" className={input} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
          <select data-testid="staff-role" className={input} value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
            <option value="driver">Driver</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <button data-testid="staff-create" type="submit" disabled={staffBusy} className="pill-btn btn-outline h-11 sm:col-span-2 cursor-pointer disabled:opacity-60">
            {staffBusy ? "Creating…" : "Add staff"}
          </button>
        </form>
      </div>

      <div className="flex justify-stretch sm:justify-end">
        <button data-testid="s-save" disabled={saving} onClick={save} className="pill-btn btn-primary disabled:opacity-60 cursor-pointer h-12 w-full sm:w-auto">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
