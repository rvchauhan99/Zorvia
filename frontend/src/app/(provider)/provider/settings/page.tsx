"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Trash,
  Storefront,
  ListDashes,
  CreditCard,
  BellRinging,
  ShieldCheck,
  FloppyDisk,
  Copy,
  CalendarCheck,
  UserPlus,
  Key
} from "@phosphor-icons/react";
import { todayISO } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import ImageSourceField from "@/components/ImageSourceField";
import { PageLoader } from "@/components/loaders";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";
import { CA_PROVINCES, formatCaPostal, isValidCaPostal } from "@/lib/ca-provinces";

type TabId = "general" | "operations" | "billing" | "notifications" | "team";

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
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const inputClass =
    "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full text-sm";

  async function load() {
    const [{ data: p }, { data: s }, { data: me }, enabled] = await Promise.all([
      api.get("/providers/me"),
      api.get("/providers/me/staff"),
      api.get("/auth/me"),
      fetchWhatsappFeaturesEnabled(),
    ]);
    setProv({
      ...p,
      province: (p?.province || "").trim() || "ON",
      country: (p?.country || "").trim() || "CA",
    });
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

  const mb = prov.settings?.monthly_billing || {
    enabled: false,
    policy_variant: "monthly_adjustable",
    extra_days_included: true,
    default_collection_day: 1,
    plans: [
      { id: "mon_fri", name: "Mon-Fri", monthly_fee_cad: 220, standard_days: 20, weekdays: [0, 1, 2, 3, 4] },
      { id: "mon_sat", name: "Mon-Sat", monthly_fee_cad: 240, standard_days: 24, weekdays: [0, 1, 2, 3, 4, 5] },
    ],
    cancellation: { free_cancellations: 2, recalc_daily_rate_cad: 12 },
  };

  function updMonthlyBilling(patch: Record<string, unknown>) {
    setProv((p: any) => ({
      ...p,
      settings: {
        ...p.settings,
        monthly_billing: { ...(p.settings?.monthly_billing || mb), ...patch },
      },
    }));
  }

  function updMonthlyPlan(idx: number, field: string, value: string | number | number[]) {
    const plans = [...(mb.plans || [])];
    plans[idx] = { ...plans[idx], [field]: value };
    updMonthlyBilling({ plans });
  }

  function updMonthlyCancellation(field: string, value: number) {
    updMonthlyBilling({
      cancellation: { ...(mb.cancellation || {}), [field]: value },
    });
  }

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
      if (!(prov.address || "").trim() || !(prov.city || "").trim() || !(prov.province || "ON").trim() || !(prov.postal_code || "").trim()) {
        toast.error("Address, city, province, and postal code are required");
        setSaving(false);
        return;
      }
      if (!isValidCaPostal(prov.postal_code)) {
        toast.error("Enter a valid Canadian postal code (e.g. M5H 2M9)");
        setSaving(false);
        return;
      }
      const payload: Record<string, unknown> = {
        name: prov.name,
        address: (prov.address || "").trim(),
        apartment: (prov.apartment || "").trim(),
        city: (prov.city || "").trim(),
        province: (prov.province || "ON").trim().toUpperCase(),
        country: "CA",
        postal_code: formatCaPostal(prov.postal_code || ""),
        interac_email: prov.interac_email,
        meal_types: typesPayload,
        cutoff_hours: Number(prov.settings?.cutoff_hours),
        timezone: prov.settings?.timezone,
        closed_dates: prov.settings?.closed_dates || [],
        sms_notifications: !!prov.settings?.sms_notifications,
        whatsapp_menu_share: prov.settings?.whatsapp_menu_share !== false,
        tax_rate_percent: Number(prov.settings?.tax_rate_percent ?? 0),
        monthly_billing: {
          ...mb,
          enabled: !!mb.enabled,
          policy_variant: mb.policy_variant || "monthly_adjustable",
          extra_days_included: mb.extra_days_included !== false,
          default_collection_day: mb.enabled ? Number(mb.default_collection_day || 1) : mb.default_collection_day,
          plans: (mb.plans || []).map((p: any) => ({
            ...p,
            monthly_fee_cad: Number(p.monthly_fee_cad),
            standard_days: Number(p.standard_days),
            weekdays: p.weekdays || [],
          })),
          cancellation: {
            free_cancellations: Number(mb.cancellation?.free_cancellations ?? 2),
            recalc_daily_rate_cad: Number(mb.cancellation?.recalc_daily_rate_cad ?? 12),
          },
        },
      };
      if (mb.enabled && (!mb.default_collection_day || Number(mb.default_collection_day) < 1)) {
        toast.error("Default collection day (1–31) is required when the monthly subscription policy is enabled");
        setSaving(false);
        return;
      }
      const { data } = await api.patch("/providers/me", payload);
      setProv({
        ...data,
        province: (data?.province || "").trim() || "ON",
        country: (data?.country || "").trim() || "CA",
      });
      toast.success("Settings saved successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save settings");
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

  const navItems = [
    { id: "general", label: "General Profile", icon: Storefront, description: "Kitchen info, logo & signup code" },
    { id: "operations", label: "Operations & Menu", icon: ListDashes, description: "Meal types, taxes & closed dates" },
    { id: "billing", label: "Subscription Policy", icon: CreditCard, description: "Monthly flat-rate billing rules for customers" },
    { id: "notifications", label: "Notifications", icon: BellRinging, description: "SMS & WhatsApp preferences" },
    { id: "team", label: "Team & Security", icon: ShieldCheck, description: "Passwords & staff access" },
  ] as const;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="shrink-0">
          <span className="label-overline">Configuration</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Settings</h1>
        </div>

        <nav
          className="card-tinted p-1.5 sm:p-2 min-w-0 w-full sm:w-auto sm:max-w-[calc(100%-12rem)] sm:ml-auto"
          role="tablist"
          aria-label="Settings sections"
          data-testid="settings-tabs"
        >
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={item.description}
                  data-testid={`settings-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id as TabId)}
                  className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-left transition-all cursor-pointer shrink-0 snap-start ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-brand-surface text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 ${active ? "text-primary-foreground" : "text-primary"}`}
                    weight={active ? "bold" : "regular"}
                  />
                  <span
                    className={`font-display font-bold text-sm leading-tight whitespace-nowrap ${
                      active ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <main className="flex flex-col gap-6">
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div className="flex flex-col gap-6">
              {/* Kitchen Basic Profile */}
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-5">
                <div>
                  <h2 className="font-display font-bold text-xl">Kitchen Identity</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Your kitchen details and default contact info.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">Business name</span>
                    <input data-testid="s-name" className={inputClass} value={prov.name || ""} onChange={(e) => upd("name", e.target.value)} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">Interac payment email</span>
                    <input data-testid="s-interac" type="email" className={inputClass} value={prov.interac_email || ""} onChange={(e) => upd("interac_email", e.target.value)} />
                  </label>

                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="label-overline">Street address</span>
                    <input data-testid="s-address" className={inputClass} value={prov.address || ""} onChange={(e) => upd("address", e.target.value)} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">Apartment / unit</span>
                    <input data-testid="s-apt" className={inputClass} value={prov.apartment || ""} onChange={(e) => upd("apartment", e.target.value)} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">City</span>
                    <input data-testid="s-city" className={inputClass} value={prov.city || ""} onChange={(e) => upd("city", e.target.value)} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">Province / territory</span>
                    <select
                      data-testid="s-province"
                      className={inputClass}
                      value={prov.province || "ON"}
                      onChange={(e) => upd("province", e.target.value)}
                    >
                      {CA_PROVINCES.map((p) => (
                        <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">Postal code</span>
                    <input
                      data-testid="s-postal"
                      className={`${inputClass} uppercase`}
                      value={prov.postal_code || ""}
                      onChange={(e) => upd("postal_code", e.target.value.toUpperCase())}
                      placeholder="M5H 2M9"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="label-overline">Timezone</span>
                    <select data-testid="s-tz" className={inputClass} value={prov.settings?.timezone || "America/Toronto"} onChange={(e) => updSettings("timezone", e.target.value)}>
                      <option value="America/Toronto">America/Toronto (EST/EDT)</option>
                      <option value="America/Vancouver">America/Vancouver (PST/PDT)</option>
                      <option value="America/Edmonton">America/Edmonton (MST/MDT)</option>
                      <option value="America/Winnipeg">America/Winnipeg (CST/CDT)</option>
                      <option value="America/Halifax">America/Halifax (AST/ADT)</option>
                      <option value="America/St_Johns">America/St_Johns (NST/NDT)</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Kitchen Logo Section */}
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-4" data-testid="kitchen-logo-section">
                <div>
                  <h2 className="font-display font-bold text-xl">Kitchen Branding</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Upload a square logo (512×512 PNG/JPEG) to display on customer portals and menus.</p>
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
                  <button
                    type="button"
                    data-testid="kitchen-logo-remove"
                    disabled={logoBusy}
                    onClick={removeLogo}
                    className="text-sm text-destructive hover:underline cursor-pointer disabled:opacity-60 self-start font-medium inline-flex items-center gap-1.5"
                  >
                    <Trash size={14} /> Remove logo
                  </button>
                ) : null}
              </div>

              {/* Signup Code */}
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-3">
                <div>
                  <h2 className="font-display font-bold text-xl">Customer Registration Code</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Share this code with new consumers to allow self-signup.</p>
                </div>
                <div className="flex items-center justify-between gap-3 p-3.5 bg-brand-surface/60 rounded-xl border border-brand-border/60">
                  <div className="font-mono font-bold text-xl tracking-wider text-primary">{prov.signup_code}</div>
                  <button
                    data-testid="copy-code-settings"
                    onClick={() => {
                      navigator.clipboard.writeText(prov.signup_code);
                      toast.success("Signup code copied to clipboard");
                    }}
                    className="pill-btn btn-outline cursor-pointer hover:bg-white h-10 min-h-[40px] text-xs gap-1.5 shrink-0"
                  >
                    <Copy size={15} /> Copy Code
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OPERATIONS TAB */}
          {activeTab === "operations" && (
            <div className="flex flex-col gap-6">
              {/* Meal Types */}
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-4" data-testid="s-meal-types">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display font-bold text-xl">Meal Types & Pricing</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure meal options and default CAD pricing offered to your customers.</p>
                  </div>
                  <button
                    type="button"
                    data-testid="s-meal-type-add"
                    onClick={addCustomMealType}
                    className="pill-btn btn-outline h-9 px-3 text-xs gap-1.5 hover:bg-brand-surface cursor-pointer"
                  >
                    <Plus size={14} weight="bold" /> Add Custom Type
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {mealTypes.map((t) => {
                    const locked = !!t.is_system || ["regular", "jain", "fasting"].includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className="flex flex-col sm:flex-row gap-3 sm:items-center p-3 rounded-xl border border-brand-border bg-white"
                        data-testid={`s-meal-type-${t.id}`}
                      >
                        <input
                          data-testid={`s-meal-type-name-${t.id}`}
                          className={`${inputClass} flex-1 font-medium`}
                          value={t.name}
                          disabled={locked}
                          onChange={(e) => updMealTypeName(t.id, e.target.value)}
                          aria-label="Meal type name"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-semibold text-muted-foreground">$</span>
                            <input
                              data-testid={t.id === "regular" ? "s-price" : `s-meal-type-price-${t.id}`}
                              type="number"
                              step="0.5"
                              min={0.01}
                              className={`${inputClass} w-28 pl-7 pr-3 font-mono`}
                              value={t.price}
                              onChange={(e) => updMealTypePrice(t.id, e.target.value)}
                              aria-label={`${t.name} price CAD`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">CAD</span>
                          {!locked ? (
                            <button
                              type="button"
                              data-testid={`s-meal-type-remove-${t.id}`}
                              onClick={() => removeMealType(t.id)}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                              aria-label="Remove meal type"
                            >
                              <Trash size={16} />
                            </button>
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 bg-brand-surface px-2.5 py-1.5 rounded-lg text-center min-w-[50px]">
                              Core
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cutoff & Tax Rules */}
              <div className="card-tinted p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="label-overline">Cancellation Cutoff (Hours)</span>
                  <input data-testid="s-cutoff" type="number" className={inputClass} value={prov.settings?.cutoff_hours ?? 4} onChange={(e) => updSettings("cutoff_hours", e.target.value)} />
                  <span className="text-xs text-muted-foreground">Hours before delivery time after which customers cannot cancel.</span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="label-overline">Tax Rate % (GST/HST)</span>
                  <input
                    data-testid="s-tax-rate"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className={inputClass}
                    value={prov.settings?.tax_rate_percent ?? 0}
                    onChange={(e) => updSettings("tax_rate_percent", e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">Applied to meal prices on outstanding statements. 0 = tax exempt.</span>
                </label>
              </div>

              {/* Closed Dates / Holidays */}
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-4" data-testid="closed-dates-section">
                <div>
                  <h2 className="font-display font-bold text-xl">Closed Dates & Holidays</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">No deliveries will be scheduled or charged on these specified dates.</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <span className="label-overline">Add Closure Date</span>
                    <input
                      data-testid="closed-date-input"
                      type="date"
                      className={inputClass}
                      value={newClosed}
                      onChange={(e) => setNewClosed(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    data-testid="closed-date-add"
                    onClick={addClosedDate}
                    className="pill-btn btn-outline gap-2 h-11 text-xs cursor-pointer hover:bg-brand-surface"
                  >
                    <Plus size={16} /> Add Holiday
                  </button>
                </div>

                {closedDates.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-brand-border text-center text-xs text-muted-foreground">
                    No closed dates or kitchen holidays currently configured.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {closedDates.map((d) => (
                      <div key={d} className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-brand-border rounded-xl">
                        <div className="flex items-center gap-2">
                          <CalendarCheck size={16} className="text-primary" />
                          <span className="font-mono text-sm font-medium" data-testid={`closed-date-${d}`}>{d}</span>
                        </div>
                        <button
                          type="button"
                          data-testid={`closed-date-remove-${d}`}
                          onClick={() => removeClosedDate(d)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                          title="Remove"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MONTHLY BILLING TAB */}
          {activeTab === "billing" && (
            <div className="flex flex-col gap-6" data-testid="monthly-billing-section">
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-5">
                <div>
                  <h2 className="font-display font-bold text-xl">Subscription Policy</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose how this kitchen bills customers: per-meal (default) or a flat monthly subscription policy.
                  </p>
                </div>

                {/* Explanation Box */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground/80 flex flex-col gap-2.5" data-testid="monthly-billing-guide">
                  <p className="font-semibold text-primary">How this policy works</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li><strong className="text-foreground">Adjustable monthly:</strong> Flat rate fee with skip recalculations & free skip allowances.</li>
                    <li><strong className="text-foreground">Fixed monthly:</strong> Constant fee each month regardless of skips or extra delivery days.</li>
                    <li><strong className="text-foreground">Collection day:</strong> Default payment collection day (1–31) each month.</li>
                  </ul>
                </div>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-brand-border bg-white cursor-pointer" data-testid="monthly-billing-toggle">
                  <input
                    type="checkbox"
                    checked={!!mb.enabled}
                    onChange={(e) => updMonthlyBilling({ enabled: e.target.checked })}
                    className="h-5 w-5 rounded accent-primary border-brand-border cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm text-foreground">Enable monthly subscription policy</span>
                    <span className="block text-xs text-muted-foreground">Turns on flat monthly billing for all customers (replaces per-meal accrual)</span>
                    <span className="block text-xs text-amber-600 mt-1">Monthly flat billing does not retroactively prorate existing balances when enabled mid-month. Joining date is honoured, but month charges are calculated per collection month rules (no proration in v1).</span>
                  </div>
                </label>

                {mb.enabled && (
                  <div className="flex flex-col gap-5 pt-2">
                    {/* Policy Variant Selection */}
                    <div className="flex flex-col gap-2" data-testid="monthly-billing-variant">
                      <span className="label-overline">Policy variant</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                            mb.policy_variant !== "monthly_fixed"
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-brand-border bg-white hover:bg-brand-surface"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="policy_variant"
                              checked={mb.policy_variant !== "monthly_fixed"}
                              onChange={() => updMonthlyBilling({ policy_variant: "monthly_adjustable" })}
                              className="accent-primary"
                            />
                            <span className="font-bold text-sm">Adjustable Monthly</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1 pl-5">
                            Flat fee with extra days included and skip recalculation rules.
                          </span>
                        </label>

                        <label
                          className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                            mb.policy_variant === "monthly_fixed"
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-brand-border bg-white hover:bg-brand-surface"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="policy_variant"
                              checked={mb.policy_variant === "monthly_fixed"}
                              onChange={() => updMonthlyBilling({ policy_variant: "monthly_fixed" })}
                              className="accent-primary"
                            />
                            <span className="font-bold text-sm">Fixed Monthly</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1 pl-5">
                            Fixed monthly rate regardless of meal skips or extra delivery days.
                          </span>
                        </label>
                      </div>
                    </div>

                    <label className="flex flex-col gap-1.5 max-w-xs">
                      <span className="label-overline">Default Collection Day (1–31)</span>
                      <input
                        data-testid="monthly-default-collection-day"
                        type="number"
                        min={1}
                        max={31}
                        className={inputClass}
                        value={mb.default_collection_day ?? 1}
                        onChange={(e) => updMonthlyBilling({ default_collection_day: Number(e.target.value) })}
                      />
                    </label>

                    {/* Plan Templates */}
                    <div className="flex flex-col gap-3" data-testid="monthly-billing-plans">
                      <span className="label-overline">Plan templates</span>
                      {(mb.plans || []).map((plan: any, idx: number) => (
                        <div key={plan.id || idx} className="border border-brand-border rounded-xl p-4 bg-white flex flex-col gap-3">
                          <div className="font-bold text-sm text-primary flex items-center gap-2">
                            <CreditCard size={16} /> {plan.name || plan.id}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1 text-xs">
                              <span className="font-medium text-muted-foreground">Monthly Fee (CAD)</span>
                              <input
                                type="number"
                                min={0.01}
                                step="0.5"
                                className={inputClass}
                                value={plan.monthly_fee_cad}
                                onChange={(e) => updMonthlyPlan(idx, "monthly_fee_cad", Number(e.target.value))}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span className="font-medium text-muted-foreground">Standard Expected Days</span>
                              <input
                                type="number"
                                min={1}
                                className={inputClass}
                                value={plan.standard_days}
                                onChange={(e) => updMonthlyPlan(idx, "standard_days", Number(e.target.value))}
                              />
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {weekdayLabels.map((label, wi) => (
                              <label key={label} className="inline-flex items-center gap-1.5 text-xs bg-brand-surface px-2.5 py-1.5 rounded-lg cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(plan.weekdays || []).includes(wi)}
                                  onChange={(e) => {
                                    const set = new Set<number>(
                                      Array.isArray(plan.weekdays)
                                        ? plan.weekdays.map((n: unknown) => Number(n)).filter((n: number) => Number.isFinite(n))
                                        : []
                                    );
                                    if (e.target.checked) set.add(wi);
                                    else set.delete(wi);
                                    updMonthlyPlan(idx, "weekdays", Array.from(set).sort((a, b) => a - b));
                                  }}
                                  className="accent-primary"
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cancellation Rules */}
                    {mb.policy_variant !== "monthly_fixed" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-brand-border pt-4">
                        <label className="flex flex-col gap-1.5">
                          <span className="label-overline">Free Cancellations / Month</span>
                          <input
                            data-testid="monthly-free-cancellations"
                            type="number"
                            min={0}
                            className={inputClass}
                            value={mb.cancellation?.free_cancellations ?? 2}
                            onChange={(e) => updMonthlyCancellation("free_cancellations", Number(e.target.value))}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="label-overline">Recalc Daily Rate (CAD)</span>
                          <input
                            data-testid="monthly-recalc-rate"
                            type="number"
                            min={0.01}
                            step="0.5"
                            className={inputClass}
                            value={mb.cancellation?.recalc_daily_rate_cad ?? 12}
                            onChange={(e) => updMonthlyCancellation("recalc_daily_rate_cad", Number(e.target.value))}
                          />
                        </label>
                        <label className="flex items-center gap-2.5 sm:col-span-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mb.extra_days_included !== false}
                            onChange={(e) => updMonthlyBilling({ extra_days_included: e.target.checked })}
                            className="h-4 w-4 rounded accent-primary cursor-pointer"
                          />
                          <span>Extra delivery days in long months included at no additional charge</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="flex flex-col gap-6">
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-4">
                <div>
                  <h2 className="font-display font-bold text-xl">Communication & Alerts</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage automated alerts sent to your customers.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-brand-border bg-white cursor-pointer hover:bg-brand-surface/50 transition-colors" data-testid="sms-notifications-toggle">
                    <input
                      type="checkbox"
                      checked={!!prov.settings?.sms_notifications}
                      onChange={(e) => updSettings("sms_notifications", e.target.checked)}
                      className="h-5 w-5 mt-0.5 rounded accent-primary border-brand-border cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-sm text-foreground">SMS Confirmation Notifications</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Automatically send SMS confirmations for customer meal cancellations (Twilio integration required).
                      </span>
                    </div>
                  </label>

                  {waEnabled && (
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-brand-border bg-white cursor-pointer hover:bg-brand-surface/50 transition-colors" data-testid="whatsapp-menu-share-toggle">
                      <input
                        type="checkbox"
                        checked={prov.settings?.whatsapp_menu_share !== false}
                        onChange={(e) => updSettings("whatsapp_menu_share", e.target.checked)}
                        className="h-5 w-5 mt-0.5 rounded accent-primary border-brand-border cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-sm text-foreground">WhatsApp Broadcast & Menu Sharing</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          Allow outbound menu updates to opted-in customers via official MealHQ WhatsApp.
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TEAM & SECURITY TAB */}
          {activeTab === "team" && (
            <div className="flex flex-col gap-6">
              {/* Staff List & Creation */}
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-4" data-testid="staff-section">
                <div>
                  <h2 className="font-display font-bold text-xl">Staff Accounts</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage permissions for Drivers, Viewers, and Admins.</p>
                </div>

                <div className="flex flex-col gap-2">
                  {staff.map((s) => (
                    <div key={s.id} data-testid={`staff-row-${s.id}`} className="flex items-center justify-between p-3.5 bg-white border border-brand-border rounded-xl gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{s.name || s.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-brand-surface text-primary border border-brand-border">
                        {s.role || "admin"}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={createStaff} className="flex flex-col gap-3 pt-3 border-t border-brand-border">
                  <span className="label-overline">Add New Staff Member</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input data-testid="staff-name" required placeholder="Full Name" className={inputClass} value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                    <input data-testid="staff-email" required type="email" placeholder="Email Address" className={inputClass} value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                    <input data-testid="staff-password" required type="password" minLength={6} placeholder="Password" className={inputClass} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                    <select data-testid="staff-role" className={inputClass} value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                      <option value="driver">Driver (Deliveries only)</option>
                      <option value="viewer">Viewer (Read-only)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                  <button data-testid="staff-create" type="submit" disabled={staffBusy} className="pill-btn btn-outline h-10 text-xs gap-1.5 cursor-pointer disabled:opacity-60 self-start">
                    <UserPlus size={16} /> {staffBusy ? "Creating…" : "Create Staff Account"}
                  </button>
                </form>
              </div>

              {/* Password Change */}
              <div className="card-tinted p-5 sm:p-6 flex flex-col gap-4" data-testid="change-password-section">
                <div>
                  <h2 className="font-display font-bold text-xl">{hasPassword ? "Security & Password" : "Set Password"}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasPassword
                      ? "Update your login password."
                      : "Signed in with Google? Set a password to enable traditional email sign-in."}
                  </p>
                </div>

                <form onSubmit={changePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hasPassword && (
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="label-overline">Current Password</span>
                      <input data-testid="pw-current" type="password" required className={inputClass} value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
                    </label>
                  )}
                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">New Password</span>
                    <input data-testid="pw-new" type="password" required minLength={6} className={inputClass} value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="label-overline">Confirm New Password</span>
                    <input data-testid="pw-confirm" type="password" required minLength={6} className={inputClass} value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
                  </label>
                  <button data-testid="pw-submit" type="submit" disabled={pwBusy} className="pill-btn btn-outline h-10 text-xs gap-1.5 sm:col-span-2 cursor-pointer disabled:opacity-60">
                    <Key size={16} /> {pwBusy ? "Updating…" : hasPassword ? "Update Password" : "Set Password"}
                  </button>
                </form>
              </div>
            </div>
          )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-nav z-30 flex justify-end items-center px-6 sm:px-12 border-t border-brand-border">
        <button
          data-testid="s-save"
          disabled={saving}
          onClick={save}
          className="pill-btn btn-primary disabled:opacity-60 cursor-pointer h-11 text-sm font-bold gap-2 px-8 shadow-md hover:scale-[1.02] active:scale-95 transition-all"
        >
          <FloppyDisk size={18} weight="bold" />
          {saving ? "Saving Changes…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
