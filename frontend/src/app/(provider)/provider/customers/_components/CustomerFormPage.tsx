"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  MapPin,
  ForkKnife,
  Truck,
  CheckCircle,
  MapTrifold,
  Warning,
  Spinner,
  CaretRight,
  PencilSimple,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing } from "@/lib/roles";
import { todayISO } from "@/lib/format";
import MealScheduleFields, {
  type ScheduleMode,
  scheduleFromDays,
  daysFromSchedule,
} from "@/components/MealScheduleFields";
import {
  type MealSlot,
  isDualSlots,
  isCategorized,
  normalizeMealSlots,
} from "@/lib/mealSlots";
import {
  type MealTypeLine,
  type SlotMealTypeLines,
  broadcastLinesToDays,
  defaultLine,
  detectLinesScheduleMode,
  normalizeLines,
  parseSlotMealTypeLines,
  primaryFromTypeLines,
  serializeSlotMealTypeLines,
  slotSchedulesFromLines,
  unionDaysFromLines,
  uniformLinesForSlot,
} from "@/lib/mealTypeLines";
import { formatCaPostal, isValidCaPostal } from "@/lib/ca-provinces";
import CaAddressFields from "@/components/CaAddressFields";
import SearchableSelect from "@/components/SearchableSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  province: string;
  country: string;
  postal_code: string;
  notes: string;
  delivery_days: number[];
  meal_slots: MealSlot[];
  slot_meal_type_lines: SlotMealTypeLines;
  slot_assignments: {
    lunch: { driver_id: string; delivery_sequence: string };
    dinner: { driver_id: string; delivery_sequence: string };
  };
  driver_id: string;
  delivery_sequence: string;
  opening_balance: string;
  joining_date: string;
  payment_collection_day: string;
  monthly_plan_id: string;
  billing_policy: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  apartment: "",
  city: "",
  province: "ON",
  country: "CA",
  postal_code: "",
  notes: "",
  delivery_days: [0, 1, 2, 3, 4],
  meal_slots: ["dinner"] as MealSlot[],
  slot_meal_type_lines: {},
  slot_assignments: {
    lunch: { driver_id: "", delivery_sequence: "" },
    dinner: { driver_id: "", delivery_sequence: "" },
  },
  driver_id: "",
  delivery_sequence: "",
  opening_balance: "0",
  joining_date: "",
  payment_collection_day: "",
  monthly_plan_id: "",
  billing_policy: "inherit",
};

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  id,
  icon,
  title,
  subtitle,
  children,
  onEdit,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div
      id={id}
      className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm animate-fade-in-up"
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-brand-border bg-brand-surface/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            {icon}
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-foreground leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-brand-surface text-muted-foreground transition-colors"
            title="Edit section"
          >
            <PencilSimple size={16} />
          </button>
        )}
      </div>
      {/* Card body */}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

const inputBase =
  "h-11 w-full px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors duration-150 text-sm placeholder:text-muted-foreground/60 disabled:bg-gray-50 disabled:opacity-80";

const inputError =
  "h-11 w-full px-4 rounded-xl bg-white border border-destructive/60 focus:ring-2 focus:ring-destructive/20 focus:border-destructive outline-none transition-colors duration-150 text-sm disabled:bg-gray-50 disabled:opacity-80";

function FieldLabel({
  label,
  required,
  children,
  hint,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-overline">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

// ─── Progress stepper ─────────────────────────────────────────────────────────

const STEPS = [
  { id: "contact", label: "Contact" },
  { id: "address", label: "Address" },
  { id: "schedule", label: "Schedule" },
  { id: "route", label: "Route" },
  { id: "review", label: "Review" },
];

function ProgressStepper({ activeStep, setActiveStep }: { activeStep: number; setActiveStep: (step: number) => void }) {
  return (
    <div className="hidden lg:flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div
            onClick={() => setActiveStep(i)}
            className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 shrink-0 ${
              i === activeStep
                ? "bg-primary text-primary-foreground"
                : i < activeStep
                ? "bg-brand-surface text-foreground hover:bg-brand-border/60"
                : "bg-brand-surface text-muted-foreground hover:bg-brand-border/60"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                i < activeStep
                  ? "bg-primary/20 text-primary"
                  : i === activeStep
                  ? "bg-white/20"
                  : "bg-brand-border/50 text-muted-foreground"
              }`}
            >
              {i < activeStep ? "✓" : i + 1}
            </span>
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <CaretRight
              size={12}
              className={`mx-1 shrink-0 ${
                i < activeStep ? "text-primary" : "text-brand-border"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Geocode status chip ──────────────────────────────────────────────────────

function GeoChip({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
        <CheckCircle size={13} weight="fill" />
        Location confirmed
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">
        <Warning size={13} weight="fill" />
        Address not found
      </span>
    );
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerFormPage({
  mode,
  customerId,
  initialData,
}: {
  mode: "add" | "edit";
  customerId?: string;
  initialData?: any;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const showMoney = canSeePricing(session);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(EMPTY);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("same");
  const [saving, setSaving] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(mode === "edit" && !initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Provider config ─────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<any[]>([]);
  const [mealTypes, setMealTypes] = useState<{ id: string; name: string; price: number }[]>([
    { id: "regular", name: "Regular", price: 12 },
    { id: "jain", name: "Jain", price: 12 },
    { id: "fasting", name: "Fasting", price: 12 },
  ]);
  const [monthlyBillingEnabled, setMonthlyBillingEnabled] = useState(false);
  const [kitchenDefaultVariant, setKitchenDefaultVariant] = useState<
    "monthly_adjustable" | "monthly_fixed"
  >("monthly_adjustable");
  const [monthlyPlans, setMonthlyPlans] = useState<
    { id: string; name: string; monthly_fee_cad?: number }[]
  >([]);

  // ── Route preview ───────────────────────────────────────────────────────────
  const [routePreview, setRoutePreview] = useState<any>(null);
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false);

  // ── Active step (Pipeline) ──────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);

  const drivers = useMemo(() => staff.filter((s) => (s.role || "admin") === "driver"), [staff]);

  // ── Load provider data ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadStaff() {
      try {
        const [{ data }, { data: prov }] = await Promise.all([
          api.get("/providers/me/staff"),
          api.get("/providers/me"),
        ]);
        setStaff(data || []);
        setMonthlyBillingEnabled(!!prov?.settings?.monthly_billing?.enabled);
        setKitchenDefaultVariant(
          prov?.settings?.monthly_billing?.policy_variant === "monthly_fixed"
            ? "monthly_fixed"
            : "monthly_adjustable",
        );
        const plans = Array.isArray(prov?.settings?.monthly_billing?.plans)
          ? prov.settings.monthly_billing.plans.map((p: any) => ({
              id: String(p.id),
              name: String(p.name || p.id),
              monthly_fee_cad: Number(p.monthly_fee_cad) || 0,
            }))
          : [];
        setMonthlyPlans(plans);
        if (Array.isArray(prov?.meal_types) && prov.meal_types.length) {
          setMealTypes(
            prov.meal_types.map((t: any) => ({
              id: t.id,
              name: t.name,
              price: Number(t.price) || 12,
            })),
          );
        } else if (prov?.meal_price_default != null) {
          const p = Number(prov.meal_price_default) || 12;
          setMealTypes([
            { id: "regular", name: "Regular", price: p },
            { id: "jain", name: "Jain", price: p },
            { id: "fasting", name: "Fasting", price: p },
          ]);
        }
      } catch {
        /* optional */
      }
    }
    loadStaff();
  }, []);

  // ── Populate form from initialData (edit mode) ──────────────────────────────
  useEffect(() => {
    if (mode !== "edit") {
      const days = [0, 1, 2, 3, 4];
      const seedPrice = Number(mealTypes.find((t) => t.id === "regular")?.price ?? 12) || 12;
      const lines = broadcastLinesToDays(days, [
        defaultLine({ typeId: "regular", qty: 1, price: seedPrice, mealTypeOptions: mealTypes }),
      ]);
      setForm({
        ...EMPTY,
        joining_date: todayISO(),
        delivery_days: days,
        meal_slots: ["dinner"],
        slot_meal_type_lines: { dinner: lines },
      });
      return;
    }
    const c = initialData;
    if (!c) return;
    setFetchLoading(false);

    const slots = normalizeMealSlots(c.meal_slots);
    const ss: Record<string, Record<string, number>> = {};
    const rawSs = c.slot_schedules || {};
    for (const s of slots) {
      const sched = rawSs[s];
      if (sched && Object.keys(sched).length) {
        ss[s] = Object.fromEntries(
          Object.entries(sched)
            .map(([k, v]) => [String(k), Number(v) || 0])
            .filter(([, v]) => (v as number) >= 1),
        );
      }
    }
    const schedule =
      c.meal_schedule && Object.keys(c.meal_schedule).length
        ? Object.fromEntries(Object.entries(c.meal_schedule).map(([k, v]) => [String(k), Number(v) || 1]))
        : scheduleFromDays(c.delivery_days || [], 1);
    if (slots.length === 1 && !ss[slots[0]]) ss[slots[0]] = { ...schedule };
    const linesMap = parseSlotMealTypeLines(c.slot_meal_type_lines, {
      slots,
      slotSchedules: ss,
      mealTypeId: c.meal_type_id || "regular",
      mealPrice: Number(c.meal_price) || undefined,
      slotMealTypes:
        c.slot_meal_types && typeof c.slot_meal_types === "object" ? c.slot_meal_types : {},
      mealTypeOptions: mealTypes,
    });
    const days = unionDaysFromLines(linesMap).length
      ? unionDaysFromLines(linesMap)
      : isDualSlots(slots)
        ? Object.keys(ss).length
          ? [...new Set(
              Object.values(ss).flatMap((m) =>
                Object.keys(m).map((k) => parseInt(k, 10)).filter((n) => !Number.isNaN(n)),
              ),
            )].sort((a, b) => a - b)
          : c.delivery_days || []
        : daysFromSchedule(schedule);
    const sa = c.slot_assignments || {};
    const joining =
      (typeof c.joining_date === "string" && c.joining_date.slice(0, 10)) ||
      (typeof c.created_at === "string" && c.created_at.slice(0, 10)) ||
      "";
    setForm({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      apartment: c.apartment || "",
      city: c.city || "",
      province: c.province || "ON",
      country: c.country || "CA",
      postal_code: c.postal_code || "",
      notes: c.notes || "",
      delivery_days: days.length ? days : c.delivery_days || [],
      meal_slots: slots,
      slot_meal_type_lines: linesMap,
      slot_assignments: {
        lunch: {
          driver_id: sa.lunch?.driver_id || "",
          delivery_sequence:
            sa.lunch?.delivery_sequence != null ? String(sa.lunch.delivery_sequence) : "",
        },
        dinner: {
          driver_id: sa.dinner?.driver_id || "",
          delivery_sequence:
            sa.dinner?.delivery_sequence != null ? String(sa.dinner.delivery_sequence) : "",
        },
      },
      driver_id:
        c.driver_id ||
        (slots.length === 1 ? sa[slots[0]]?.driver_id || "" : ""),
      delivery_sequence:
        c.delivery_sequence != null
          ? String(c.delivery_sequence)
          : slots.length === 1 &&
            sa[slots[0]]?.delivery_sequence != null
          ? String(sa[slots[0]].delivery_sequence)
          : "",
      opening_balance: c.opening_balance != null ? String(c.opening_balance) : "0",
      joining_date: joining,
      payment_collection_day:
        c.payment_collection_day != null ? String(c.payment_collection_day) : "",
      monthly_plan_id: c.monthly_plan_id || "",
      billing_policy: c.billing_policy || "inherit",
    });
    setScheduleMode(detectLinesScheduleMode(linesMap, slots));
    setRoutePreview(
      c.lat != null && c.lng != null
        ? {
            lat: c.lat,
            lng: c.lng,
            geocode_status: c.geocode_status || "ok",
            delivery_sequence: c.delivery_sequence ?? null,
            before: null,
            after: null,
            routing_configured: true,
            from_stored: true,
          }
        : c.geocode_status
        ? { geocode_status: c.geocode_status, from_stored: true }
        : null,
    );
  }, [mode, initialData, mealTypes]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function previewMealSlot() {
    const slots: string[] = Array.isArray(form.meal_slots) && form.meal_slots.length
      ? form.meal_slots
      : ["dinner"];
    return slots.includes("lunch") && slots.includes("dinner")
      ? "lunch"
      : slots[0] || "dinner";
  }

  function hasDriverAssignment() {
    if (drivers.length === 0) return false;
    const slots = normalizeMealSlots(form.meal_slots);
    if (isDualSlots(slots)) {
      return (
        !!(form.slot_assignments?.lunch?.driver_id || "").trim() &&
        !!(form.slot_assignments?.dinner?.driver_id || "").trim()
      );
    }
    return !!(form.driver_id || "").trim();
  }

  // ── Geocode ────────────────────────────────────────────────────────────────
  async function findLocation() {
    if (!(form.address || "").trim()) {
      toast.error("Enter a street address first");
      return;
    }
    if (
      !(form.city || "").trim() ||
      !(form.province || "").trim() ||
      !(form.postal_code || "").trim()
    ) {
      toast.error("City, province, and postal code are required to find location");
      return;
    }
    if (!isValidCaPostal(form.postal_code)) {
      toast.error("Enter a valid Canadian postal code (e.g. M5H 2M9)");
      return;
    }
    setRoutePreviewLoading(true);
    try {
      const { data } = await api.post("/route-planning/preview-placement", {
        address: form.address || "",
        apartment: form.apartment || "",
        city: form.city || "",
        province: form.province || "",
        postal_code: formatCaPostal(form.postal_code || ""),
        meal_slot: previewMealSlot(),
        driver_id: null,
      });
      setRoutePreview(data);
      if (data?.geocode_status === "ok") {
        toast.success("Location confirmed");
      } else {
        toast.error("Could not find that address — check city, province, and postal code");
      }
    } catch (e: any) {
      setRoutePreview({ geocode_status: "failed" });
      toast.error(e?.response?.data?.detail || "Location lookup failed");
    } finally {
      setRoutePreviewLoading(false);
    }
  }

  async function applyDriverPlacement(driverId: string, mealSlot: string) {
    if (!(form.address || "").trim()) return;
    setRoutePreviewLoading(true);
    try {
      const { data } = await api.post("/route-planning/preview-placement", {
        address: form.address || "",
        apartment: form.apartment || "",
        city: form.city || "",
        province: form.province || "",
        postal_code: formatCaPostal(form.postal_code || ""),
        meal_slot: mealSlot,
        driver_id: driverId || null,
        lat: routePreview?.lat ?? null,
        lng: routePreview?.lng ?? null,
      });
      setRoutePreview(data);
      const seq = data?.delivery_sequence;
      if (seq == null) return;
      if (mealSlot === "lunch" || mealSlot === "dinner") {
        setForm((f) => ({
          ...f,
          slot_assignments: {
            ...f.slot_assignments,
            [mealSlot]: {
              ...f.slot_assignments[mealSlot as "lunch" | "dinner"],
              driver_id: driverId,
              delivery_sequence: String(seq),
            },
          },
        }));
      } else {
        setForm((f) => ({ ...f, driver_id: driverId, delivery_sequence: String(seq) }));
      }
    } catch {
      /* non-fatal */
    } finally {
      setRoutePreviewLoading(false);
    }
  }

  // ── Schedule helpers ───────────────────────────────────────────────────────
  function toggleDay(i: number) {
    setForm((f) => {
      const on = f.delivery_days.includes(i);
      const days = on ? f.delivery_days.filter((d) => d !== i) : [...f.delivery_days, i];
      const dual = isDualSlots(f.meal_slots);
      const linesMap: SlotMealTypeLines = { ...(f.slot_meal_type_lines || {}) };
      const slots = normalizeMealSlots(f.meal_slots).filter(
        (s) => s === "lunch" || s === "dinner",
      ) as Array<"lunch" | "dinner">;

      if (on) {
        for (const slot of slots) {
          const dayMap = { ...(linesMap[slot] || {}) };
          delete dayMap[String(i)];
          if (Object.keys(dayMap).length) linesMap[slot] = dayMap;
          else delete linesMap[slot];
        }
      } else if (scheduleMode === "same") {
        for (const slot of slots) {
          const existing = uniformLinesForSlot(f.slot_meal_type_lines, slot, f.delivery_days);
          const seed =
            existing.length > 0
              ? existing
              : [
                  defaultLine({
                    typeId: mealTypes[0]?.id || "regular",
                    qty: 1,
                    mealTypeOptions: mealTypes,
                  }),
                ];
          linesMap[slot] = broadcastLinesToDays(days, seed);
        }
      } else {
        for (const slot of slots) {
          if (!dual && slots[0] !== slot) continue;
          const dayMap = { ...(linesMap[slot] || {}) };
          dayMap[String(i)] = [
            defaultLine({
              typeId: mealTypes[0]?.id || "regular",
              qty: 1,
              mealTypeOptions: mealTypes,
            }),
          ];
          linesMap[slot] = dayMap;
        }
      }
      return { ...f, delivery_days: days, slot_meal_type_lines: linesMap };
    });
  }

  function changeMode(mode: ScheduleMode) {
    setScheduleMode(mode);
    setForm((f) => {
      const slots = normalizeMealSlots(f.meal_slots).filter(
        (s) => s === "lunch" || s === "dinner",
      ) as Array<"lunch" | "dinner">;
      if (mode === "same") {
        const days = f.delivery_days.length ? f.delivery_days : [0, 1, 2, 3, 4];
        const linesMap: SlotMealTypeLines = {};
        for (const slot of slots) {
          const existing = uniformLinesForSlot(f.slot_meal_type_lines, slot, days);
          const seed =
            existing.length > 0
              ? existing
              : normalizeLines(
                  Object.values(f.slot_meal_type_lines?.[slot] || {})[0] || [],
                );
          const lines =
            seed.length > 0
              ? seed
              : [
                  defaultLine({
                    typeId: mealTypes[0]?.id || "regular",
                    qty: 1,
                    mealTypeOptions: mealTypes,
                  }),
                ];
          linesMap[slot] = broadcastLinesToDays(days, lines);
        }
        return { ...f, delivery_days: days, slot_meal_type_lines: linesMap };
      }
      return f;
    });
  }

  function changeMealSlots(slots: MealSlot[]) {
    setForm((f) => {
      const next = normalizeMealSlots(slots);
      const days = f.delivery_days.length ? f.delivery_days : [0, 1, 2, 3, 4];
      const cats = next.filter((s) => s === "lunch" || s === "dinner") as Array<"lunch" | "dinner">;
      const linesMap: SlotMealTypeLines = {};
      for (const slot of cats) {
        const existing = f.slot_meal_type_lines?.[slot];
        if (existing && Object.keys(existing).length) {
          linesMap[slot] = existing;
        } else {
          linesMap[slot] = broadcastLinesToDays(days, [
            defaultLine({
              typeId: mealTypes[0]?.id || "regular",
              qty: 1,
              mealTypeOptions: mealTypes,
            }),
          ]);
        }
      }
      return {
        ...f,
        meal_slots: next,
        delivery_days: days,
        slot_meal_type_lines: linesMap,
      };
    });
  }

  function changeUniformSlotLines(slot: "lunch" | "dinner", lines: MealTypeLine[]) {
    setForm((f) => {
      const days = f.delivery_days.length ? f.delivery_days : [];
      const cleaned = normalizeLines(lines);
      const linesMap = { ...(f.slot_meal_type_lines || {}) };
      if (cleaned.length && days.length) linesMap[slot] = broadcastLinesToDays(days, cleaned);
      else delete linesMap[slot];
      return { ...f, slot_meal_type_lines: linesMap };
    });
  }

  function changeSlotDayLines(slot: "lunch" | "dinner", day: number, lines: MealTypeLine[]) {
    setForm((f) => {
      const cleaned = normalizeLines(lines);
      const linesMap = { ...(f.slot_meal_type_lines || {}) };
      const dayMap = { ...(linesMap[slot] || {}) };
      if (cleaned.length) dayMap[String(day)] = cleaned;
      else delete dayMap[String(day)];
      if (Object.keys(dayMap).length) linesMap[slot] = dayMap;
      else delete linesMap[slot];
      const delivery_days = unionDaysFromLines(linesMap);
      return { ...f, slot_meal_type_lines: linesMap, delivery_days };
    });
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validateAll(): boolean {
    const errs: Record<string, string> = {};
    let firstErrorStep: number | null = null;

    // Contact
    if (!(form.name || "").trim()) {
      errs.name = "Name is required";
      if (firstErrorStep === null) firstErrorStep = 0;
    }

    // Address
    if (!(form.address || "").trim()) {
      errs.address = "Street address is required";
      if (firstErrorStep === null) firstErrorStep = 1;
    }
    if (!(form.city || "").trim()) {
      errs.city = "City is required";
      if (firstErrorStep === null) firstErrorStep = 1;
    }
    if (!(form.postal_code || "").trim()) {
      errs.postal_code = "Postal code is required";
      if (firstErrorStep === null) firstErrorStep = 1;
    } else if (!isValidCaPostal(form.postal_code)) {
      errs.postal_code = "Enter a valid Canadian postal code (e.g. M5H 2M9)";
      if (firstErrorStep === null) firstErrorStep = 1;
    } else if (routePreview?.geocode_status !== "ok") {
      if (firstErrorStep === null) firstErrorStep = 1;
      toast.error("Please click 'Find location' to confirm coordinates before saving.");
    }

    // Route
    if (drivers.length > 0 && !hasDriverAssignment()) {
      if (firstErrorStep === null) firstErrorStep = 3;
      toast.error("Please select a driver to assign the route.");
    }

    setErrors(errs);

    if (firstErrorStep !== null) {
      if (Object.keys(errs).length > 0) {
        toast.error("Please fix the highlighted errors before saving.");
      }
      setActiveStep(firstErrorStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    return true;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function handleNext() {
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/provider/customers");
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;
    
    setSaving(true);
    try {
      const slots = normalizeMealSlots(form.meal_slots);
      const dual = isDualSlots(slots);
      const payload: any = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        apartment: form.apartment,
        city: form.city,
        province: form.province,
        country: form.country || "CA",
        postal_code: formatCaPostal(form.postal_code),
        notes: form.notes,
        meal_slots: slots,
      };
      if (form.email) payload.email = form.email;
      const linesPayload = serializeSlotMealTypeLines(form.slot_meal_type_lines || {});
      const derivedSchedules = slotSchedulesFromLines(form.slot_meal_type_lines || {});
      const primary = primaryFromTypeLines(form.slot_meal_type_lines || {});
      payload.meal_type_id = primary.meal_type_id;
      payload.meal_price = primary.meal_price;
      payload.slot_meal_type_lines = linesPayload;
      payload.slot_schedules = derivedSchedules;
      if (canMutate) {
        payload.opening_balance =
          form.opening_balance !== "" && form.opening_balance != null
            ? Number(form.opening_balance)
            : 0;
      }
      if (form.joining_date) payload.joining_date = form.joining_date;
      payload.billing_policy = form.billing_policy || "inherit";
      const effectiveMonthly =
        form.billing_policy === "monthly_adjustable" ||
        form.billing_policy === "monthly_fixed" ||
        ((form.billing_policy === "inherit" || !form.billing_policy) && monthlyBillingEnabled);
      if (
        effectiveMonthly &&
        form.payment_collection_day !== "" &&
        form.payment_collection_day != null
      ) {
        payload.payment_collection_day = Number(form.payment_collection_day);
      }
      if (effectiveMonthly) payload.monthly_plan_id = form.monthly_plan_id || null;

      if (dual) {
        payload.delivery_days = form.delivery_days.length
          ? form.delivery_days
          : unionDaysFromLines(form.slot_meal_type_lines);
        payload.slot_assignments = {
          lunch: {
            driver_id: form.slot_assignments?.lunch?.driver_id || null,
            delivery_sequence:
              form.slot_assignments?.lunch?.delivery_sequence === "" ||
              form.slot_assignments?.lunch?.delivery_sequence == null
                ? null
                : Number(form.slot_assignments.lunch.delivery_sequence),
          },
          dinner: {
            driver_id: form.slot_assignments?.dinner?.driver_id || null,
            delivery_sequence:
              form.slot_assignments?.dinner?.delivery_sequence === "" ||
              form.slot_assignments?.dinner?.delivery_sequence == null
                ? null
                : Number(form.slot_assignments.dinner.delivery_sequence),
          },
        };
      } else {
        const primarySlot = slots[0] || "dinner";
        const schedule = derivedSchedules[primarySlot] || {};
        payload.delivery_days = daysFromSchedule(schedule);
        payload.meal_schedule = schedule;
        payload.slot_assignments = {
          [slots[0]]: {
            driver_id: form.driver_id || null,
            delivery_sequence:
              form.delivery_sequence === "" || form.delivery_sequence == null
                ? null
                : Number(form.delivery_sequence),
          },
        };
      }

      if (mode === "edit" && customerId) {
        await api.patch(`/customers/${customerId}`, payload);
        toast.success("Customer updated");
      } else {
        await api.post("/customers", payload);
        toast.success("Customer added");
      }
      router.push("/provider/customers");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Effective monthly billing ──────────────────────────────────────────────
  const effectiveMonthly =
    form.billing_policy === "monthly_adjustable" ||
    form.billing_policy === "monthly_fixed" ||
    ((form.billing_policy === "inherit" || !form.billing_policy) && monthlyBillingEnabled);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse p-4 max-w-4xl mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-brand-border rounded-2xl h-48" />
        ))}
      </div>
    );
  }

  // ── Input class helper ─────────────────────────────────────────────────────
  const inp = (field?: string) =>
    field && errors[field] ? inputError : inputBase;

  const isReview = activeStep === 4;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={save} noValidate className="min-h-screen bg-brand-cream/50">
      {/* ── Sticky header bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-brand-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="cf-back-btn"
              onClick={handleBack}
              className="icon-btn icon-btn-neutral shrink-0"
              aria-label={activeStep > 0 ? "Previous step" : "Back to customers"}
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Customers</span>
                <CaretRight size={10} />
                <span className="text-foreground font-medium truncate">
                  {mode === "edit" ? (form.name || "Edit customer") : "Add customer"}
                </span>
              </div>
              <ProgressStepper activeStep={activeStep} setActiveStep={setActiveStep} />
            </div>

            {/* Mobile step indicator */}
            <span className="lg:hidden text-xs text-muted-foreground shrink-0 font-medium">
              Step {activeStep + 1} of {STEPS.length}
            </span>

            {/* Desktop Action button */}
            {isReview ? (
              <button
                type="submit"
                data-testid="cf-save"
                disabled={saving}
                className="hidden sm:flex pill-btn btn-primary h-10 px-6 gap-2 shrink-0 disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Spinner size={16} className="animate-spin" />
                    Saving…
                  </>
                ) : mode === "edit" ? (
                  "Save changes"
                ) : (
                  "Save customer"
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="hidden sm:flex pill-btn btn-primary h-10 px-6 gap-2 shrink-0 cursor-pointer"
              >
                Next step
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <div
        className={`max-w-4xl mx-auto px-4 sm:px-6 flex flex-col ${
          isReview ? "py-3 pb-6 sm:pb-4 gap-3" : "py-3 pb-24 gap-3"
        }`}
      >
        {/* ── Card 1 — Personal & Contact ──────────────────────────────────── */}
        {activeStep === 0 && (
          <SectionCard
            id="contact"
            icon={<User size={18} weight="duotone" />}
            title="Personal & Contact"
            subtitle="Name, phone, email and delivery notes"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldLabel label="Name" required error={errors.name}>
                <input
                  required
                  data-testid="cf-name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  className={inp("name")}
                  placeholder="Full name"
                />
              </FieldLabel>

              <FieldLabel label="Phone">
                <input
                  data-testid="cf-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inp()}
                  placeholder="416-555-0100"
                  type="tel"
                />
              </FieldLabel>

              <FieldLabel label="Email" hint="Used for consumer portal login (optional)">
                <input
                  type="email"
                  data-testid="cf-email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inp()}
                  placeholder="customer@example.com"
                />
              </FieldLabel>

              <FieldLabel label="Joining date">
                <input
                  type="date"
                  data-testid="cf-joining-date"
                  value={form.joining_date || ""}
                  onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                  className={inp()}
                />
              </FieldLabel>

              <div className="sm:col-span-2">
                <FieldLabel
                  label="Notes"
                  hint="Delivery instructions, allergies, special requests"
                >
                  <textarea
                    data-testid="cf-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className={`min-h-[80px] w-full px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors duration-150 text-sm placeholder:text-muted-foreground/60 resize-y`}
                    placeholder="e.g. Leave at front door, no onions…"
                  />
                </FieldLabel>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={handleNext} className="pill-btn btn-primary h-11 px-8 cursor-pointer">Continue to Address</button>
            </div>
          </SectionCard>
        )}

        {/* ── Card 2 — Delivery Address ─────────────────────────────────────── */}
        {activeStep === 1 && (
          <SectionCard
            id="address"
            icon={<MapPin size={18} weight="duotone" />}
            title="Delivery Address"
            subtitle="Canadian address — used for route planning and geocoding"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CaAddressFields
                testidPrefix="cf"
                showRequiredMarks
                inputClassName={inputBase}
                errorClassName={inputError}
                values={{
                  province: form.province || "ON",
                  city: form.city,
                  postal_code: form.postal_code,
                  address: form.address,
                  apartment: form.apartment,
                }}
                errors={{
                  address: errors.address,
                  city: errors.city,
                  postal_code: errors.postal_code,
                }}
                onChange={(patch) => {
                  setForm({ ...form, ...patch });
                  setRoutePreview(null);
                  if (patch.address != null && errors.address) {
                    setErrors({ ...errors, address: "" });
                  }
                  if (patch.city != null && errors.city) {
                    setErrors({ ...errors, city: "" });
                  }
                  if (patch.postal_code != null && errors.postal_code) {
                    setErrors({ ...errors, postal_code: "" });
                  }
                }}
              />

              {/* Geocode button + result */}
              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-testid="cf-find-location"
                    onClick={() => void findLocation()}
                    disabled={routePreviewLoading}
                    className="pill-btn btn-outline h-10 px-5 gap-2 cursor-pointer disabled:opacity-60 inline-flex items-center"
                  >
                    <MapTrifold size={16} weight="duotone" />
                    {routePreviewLoading ? (
                      <>
                        <Spinner size={14} className="animate-spin" />
                        Finding…
                      </>
                    ) : (
                      "Find location"
                    )}
                  </button>
                  <GeoChip status={routePreview?.geocode_status} />
                </div>

                {/* Coordinates panel */}
                <div
                  data-testid="cf-route-preview"
                  className="mt-3 rounded-xl border border-brand-border bg-brand-surface/40 px-4 py-3"
                >
                  <span className="label-overline block mb-1">Coordinates</span>
                  {routePreview?.lat != null && routePreview?.lng != null ? (
                    <p className="text-sm font-mono" data-testid="cf-latlng">
                      {Number(routePreview.lat).toFixed(5)}, {Number(routePreview.lng).toFixed(5)}
                      <span className="text-muted-foreground text-xs ml-2 font-sans">
                        · {routePreview.geocode_status}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Tap "Find location" after entering a valid Canadian address to confirm coordinates.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={handleBack} className="pill-btn btn-outline h-11 px-6 cursor-pointer text-muted-foreground">
                Back
              </button>
              <button type="button" onClick={handleNext} className="pill-btn btn-primary h-11 px-8 cursor-pointer">Continue to Schedule</button>
            </div>
          </SectionCard>
        )}

        {/* ── Card 3 — Meal Schedule & Pricing ─────────────────────────────── */}
        {activeStep === 2 && (
          <SectionCard
            id="schedule"
            icon={<ForkKnife size={18} weight="duotone" />}
            title="Meal Schedule & Pricing"
            subtitle="Delivery days, quantities, meal type and billing"
          >
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3`}>
              {canMutate ? (
                <>
                  {showMoney && (
                    <FieldLabel
                      label="Opening balance (CAD)"
                      hint="Positive = outstanding owed; negative = advance credit. Leave 0 for new customers."
                    >
                      <input
                        type="number"
                        step="0.01"
                        data-testid="cf-opening-balance"
                        value={form.opening_balance}
                        onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                        className={inp()}
                        placeholder="0"
                      />
                    </FieldLabel>
                  )}

                  <div className="sm:col-span-2">
                    <FieldLabel
                      label="Billing policy"
                      hint="Default follows Settings → Subscription Policy. Override only when this customer differs."
                    >
                      <SearchableSelect
                        testid="customer-billing-policy"
                        inputClassName={inp()}
                        value={form.billing_policy || "inherit"}
                        onChange={(v) => setForm({ ...form, billing_policy: v })}
                        options={[
                          {
                            value: "inherit",
                            label: `Inherit from settings (${
                              monthlyBillingEnabled
                                ? kitchenDefaultVariant === "monthly_fixed"
                                  ? "Fixed Monthly"
                                  : "Adjustable Monthly"
                                : "Per-meal"
                            })`,
                          },
                          { value: "per_meal", label: "Per-meal" },
                          { value: "monthly_adjustable", label: "Adjustable Monthly" },
                          { value: "monthly_fixed", label: "Fixed Monthly" },
                        ]}
                        placeholder="Search billing policy…"
                      />
                    </FieldLabel>
                  </div>

                  {effectiveMonthly && (
                    <>
                      <FieldLabel label="Monthly plan">
                        <SearchableSelect
                          testid="cf-monthly-plan"
                          inputClassName={inp()}
                          value={form.monthly_plan_id || ""}
                          onChange={(v) => setForm({ ...form, monthly_plan_id: v })}
                          allowEmpty
                          emptyLabel="Auto-match from schedule"
                          options={monthlyPlans.map((p) => ({
                            value: p.id,
                            label:
                              p.monthly_fee_cad != null
                                ? `${p.name} · $${Number(p.monthly_fee_cad).toFixed(2)}`
                                : p.name,
                          }))}
                          placeholder="Search plan…"
                        />
                      </FieldLabel>

                      <FieldLabel
                        label="Collection day override (1–31)"
                        hint="Uses kitchen default if empty"
                      >
                        <input
                          type="number"
                          min={1}
                          max={31}
                          data-testid="cf-collection-day"
                          value={form.payment_collection_day}
                          onChange={(e) =>
                            setForm({ ...form, payment_collection_day: e.target.value })
                          }
                          className={inp()}
                          placeholder="e.g. 15"
                        />
                      </FieldLabel>
                    </>
                  )}
                </>
              ) : null}

              {/* Meal schedule */}
              <div className="sm:col-span-2 mt-2">
                <span className="label-overline block mb-3 text-foreground font-semibold">Meal schedule</span>
                <MealScheduleFields
                  mode={scheduleMode}
                  onModeChange={changeMode}
                  mealSlots={form.meal_slots}
                  onMealSlotsChange={changeMealSlots}
                  deliveryDays={form.delivery_days}
                  onToggleDay={toggleDay}
                  mealTypeOptions={mealTypes}
                  slotMealTypeLines={form.slot_meal_type_lines}
                  onUniformSlotLinesChange={changeUniformSlotLines}
                  onSlotDayLinesChange={changeSlotDayLines}
                  inputClassName={inputBase}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={handleBack} className="pill-btn btn-outline h-11 px-6 cursor-pointer text-muted-foreground">
                Back
              </button>
              <button type="button" onClick={handleNext} className="pill-btn btn-primary h-11 px-8 cursor-pointer">Continue to Route</button>
            </div>
          </SectionCard>
        )}

        {/* ── Card 4 — Route & Driver ───────────────────────────────────────── */}
        {activeStep === 3 && (
          <SectionCard
            id="route"
            icon={<Truck size={18} weight="duotone" />}
            title="Route & Driver Assignment"
            subtitle="Assign a driver — delivery sequence is suggested automatically"
            onEdit={isReview ? () => setActiveStep(3) : undefined}
          >
            {drivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-surface flex items-center justify-center text-muted-foreground">
                  <Truck size={24} weight="duotone" />
                </div>
                <div>
                  <p className="font-medium text-sm">No drivers configured</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add staff with the <strong>Driver</strong> role in{" "}
                    <a href="/provider/more" className="text-primary underline-offset-2 hover:underline">
                      Settings → Staff
                    </a>{" "}
                    to enable route assignment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!isReview && (
                  <p className="sm:col-span-2 text-sm text-muted-foreground mb-2">
                    Assign a driver for each meal slot. The stop sequence is suggested automatically when
                    you pick a driver — you can edit it before saving.
                  </p>
                )}

                {isCategorized(form.meal_slots) && isDualSlots(form.meal_slots) ? (
                  <>
                    <FieldLabel label="Lunch driver">
                      <SearchableSelect
                        testid="cf-lunch-driver"
                        inputClassName={inp()}
                        value={form.slot_assignments?.lunch?.driver_id || ""}
                        onChange={(driver_id) => {
                          setForm({
                            ...form,
                            slot_assignments: {
                              ...form.slot_assignments,
                              lunch: { ...form.slot_assignments.lunch, driver_id },
                            },
                          });
                          void applyDriverPlacement(driver_id, "lunch");
                        }}
                        disabled={isReview}
                        allowEmpty
                        emptyLabel="Select driver…"
                        options={drivers.map((d) => ({
                          value: d.id,
                          label: d.name || d.email,
                        }))}
                        placeholder="Search driver…"
                      />
                    </FieldLabel>

                    <FieldLabel label="Lunch stop sequence" hint="Auto-set when driver is selected">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        data-testid="cf-lunch-sequence"
                        value={form.slot_assignments?.lunch?.delivery_sequence || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            slot_assignments: {
                              ...form.slot_assignments,
                              lunch: {
                                ...form.slot_assignments.lunch,
                                delivery_sequence: e.target.value,
                              },
                            },
                          })
                        }
                        className={inp()}
                        placeholder="Auto on driver select"
                        disabled={isReview}
                      />
                    </FieldLabel>

                    <FieldLabel label="Dinner driver">
                      <SearchableSelect
                        testid="cf-dinner-driver"
                        inputClassName={inp()}
                        value={form.slot_assignments?.dinner?.driver_id || ""}
                        onChange={(driver_id) => {
                          setForm({
                            ...form,
                            slot_assignments: {
                              ...form.slot_assignments,
                              dinner: { ...form.slot_assignments.dinner, driver_id },
                            },
                          });
                          void applyDriverPlacement(driver_id, "dinner");
                        }}
                        disabled={isReview}
                        allowEmpty
                        emptyLabel="Select driver…"
                        options={drivers.map((d) => ({
                          value: d.id,
                          label: d.name || d.email,
                        }))}
                        placeholder="Search driver…"
                      />
                    </FieldLabel>

                    <FieldLabel label="Dinner stop sequence" hint="Auto-set when driver is selected">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        data-testid="cf-dinner-sequence"
                        value={form.slot_assignments?.dinner?.delivery_sequence || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            slot_assignments: {
                              ...form.slot_assignments,
                              dinner: {
                                ...form.slot_assignments.dinner,
                                delivery_sequence: e.target.value,
                              },
                            },
                          })
                        }
                        className={inp()}
                        placeholder="Auto on driver select"
                        disabled={isReview}
                      />
                    </FieldLabel>
                  </>
                ) : (
                  <>
                    <FieldLabel label="Assigned driver">
                      <SearchableSelect
                        testid="cf-driver"
                        inputClassName={inp()}
                        value={form.driver_id}
                        onChange={(driver_id) => {
                          setForm({ ...form, driver_id });
                          void applyDriverPlacement(driver_id, previewMealSlot());
                        }}
                        disabled={isReview}
                        allowEmpty
                        emptyLabel="Select driver…"
                        options={drivers.map((d) => ({
                          value: d.id,
                          label: d.name || d.email,
                        }))}
                        placeholder="Search driver…"
                      />
                    </FieldLabel>

                    <FieldLabel label="Delivery sequence" hint="Set automatically when you pick a driver">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        data-testid="cf-sequence"
                        value={form.delivery_sequence}
                        onChange={(e) => setForm({ ...form, delivery_sequence: e.target.value })}
                        className={inp()}
                        placeholder="Auto on driver select"
                        disabled={isReview}
                      />
                    </FieldLabel>
                  </>
                )}

                {/* Route summary */}
                {routePreviewLoading ? (
                  <p className="sm:col-span-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Spinner size={12} className="animate-spin" /> Updating suggested sequence…
                  </p>
                ) : routePreview?.delivery_sequence != null ? (
                  <div
                    className="sm:col-span-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-2 mt-2"
                    data-testid="cf-route-summary"
                  >
                    <CheckCircle size={16} weight="fill" className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-emerald-800">
                      Suggested stop{" "}
                      <strong>#{routePreview.delivery_sequence}</strong>
                      {routePreview.before?.name ? (
                        <> · after <strong>{routePreview.before.name}</strong></>
                      ) : null}
                      {routePreview.after?.name ? (
                        <> · before <strong>{routePreview.after.name}</strong></>
                      ) : null}
                    </p>
                  </div>
                ) : null}

                {/* Driver required hint */}
                {!isReview && drivers.length > 0 && !hasDriverAssignment() && (
                  <p
                    className="sm:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mt-2"
                    data-testid="cf-save-hint"
                  >
                    Select a driver to enable saving.
                  </p>
                )}
              </div>
            )}
            
            {!isReview && (
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={handleBack} className="pill-btn btn-outline h-11 px-6 cursor-pointer text-muted-foreground">
                  Back
                </button>
                <button type="button" onClick={handleNext} className="pill-btn btn-primary h-11 px-8 cursor-pointer">Review details</button>
              </div>
            )}
          </SectionCard>
        )}

        {/* Step 4: Review Tab */}
        {isReview && (
          <div className="flex flex-col gap-3 animate-fade-in-up">
             {/* Section: Contact */}
             <div className="bg-white border border-brand-border rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border bg-brand-surface/30">
                   <div className="flex items-center gap-2 text-sm text-foreground font-display font-bold">
                      <User size={16} weight="duotone" className="text-primary" />
                      Contact
                   </div>
                   <button type="button" onClick={() => setActiveStep(0)} className="text-xs font-medium text-primary hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Name</span>
                     <span className="text-sm text-foreground font-medium truncate">{form.name || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Phone</span>
                     <span className="text-sm text-foreground font-medium truncate">{form.phone || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Email</span>
                     <span className="text-sm text-foreground font-medium truncate">{form.email || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Joining Date</span>
                     <span className="text-sm text-foreground font-medium">{form.joining_date || "—"}</span>
                   </div>
                   {form.notes && (
                     <div className="flex flex-col gap-0.5 col-span-2 md:col-span-4">
                       <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Notes</span>
                       <span className="text-sm text-foreground font-medium">{form.notes}</span>
                     </div>
                   )}
                </div>
             </div>

             {/* Section: Address */}
             <div className="bg-white border border-brand-border rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border bg-brand-surface/30">
                   <div className="flex items-center gap-2 text-sm text-foreground font-display font-bold">
                      <MapPin size={16} weight="duotone" className="text-primary" />
                      Address
                   </div>
                   <button type="button" onClick={() => setActiveStep(1)} className="text-xs font-medium text-primary hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Province</span>
                     <span className="text-sm text-foreground font-medium truncate">{form.province || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">City</span>
                     <span className="text-sm text-foreground font-medium truncate">{form.city || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Postal Code</span>
                     <span className="text-sm text-foreground font-medium">{form.postal_code.toUpperCase() || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Apt/Unit</span>
                     <span className="text-sm text-foreground font-medium truncate">{form.apartment || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5 col-span-2 md:col-span-4">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Street</span>
                     <span className="text-sm text-foreground font-medium truncate">{form.address || "—"}</span>
                   </div>
                   <div className="flex flex-col gap-0.5 col-span-2 md:col-span-4">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Routing Coordinates</span>
                     {routePreview?.geocode_status === "ok" ? (
                       <span className="text-sm text-foreground font-medium">{Number(routePreview.lat).toFixed(5)}, {Number(routePreview.lng).toFixed(5)}</span>
                     ) : (
                       <span className="text-sm text-orange-600 font-medium flex items-center gap-1"><Warning size={14} weight="duotone" /> Not confirmed</span>
                     )}
                   </div>
                </div>
             </div>

             {/* Section: Schedule */}
             <div className="bg-white border border-brand-border rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border bg-brand-surface/30">
                   <div className="flex items-center gap-2 text-sm text-foreground font-display font-bold">
                      <ForkKnife size={16} weight="duotone" className="text-primary" />
                      Schedule & Pricing
                   </div>
                   <button type="button" onClick={() => setActiveStep(2)} className="text-xs font-medium text-primary hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Primary meal type</span>
                     <span className="text-sm text-foreground font-medium truncate">
                       {(() => {
                         const p = primaryFromTypeLines(form.slot_meal_type_lines);
                         return mealTypes.find((t) => t.id === p.meal_type_id)?.name || p.meal_type_id || "—";
                       })()}
                     </span>
                     {Object.values(form.slot_meal_type_lines || {}).some((days) =>
                       Object.values(days || {}).some((lines) => (lines?.length || 0) > 1),
                     ) ? (
                       <span className="text-[10px] text-muted-foreground">Multi-type lines</span>
                     ) : null}
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Billing Policy</span>
                     <span className="text-sm text-foreground font-medium">{form.billing_policy.replace("_", " ")}</span>
                   </div>
                   <div className="flex flex-col gap-0.5 col-span-2">
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Delivery Schedule</span>
                     <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {form.delivery_days.length > 0 ? form.delivery_days.map(d => (
                           <span key={d} className="px-2 py-0.5 rounded-md bg-brand-surface border border-brand-border text-xs font-medium">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]}</span>
                        )) : <span className="text-sm text-muted-foreground font-medium">No days selected</span>}
                        {form.meal_slots.length > 0 ? (
                          <span className="text-sm text-foreground font-medium ml-1">{form.meal_slots.join(" & ")}</span>
                        ) : null}
                     </div>
                   </div>
                </div>
             </div>

             {/* Section: Route */}
             <div className="bg-white border border-brand-border rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border bg-brand-surface/30">
                   <div className="flex items-center gap-2 text-sm text-foreground font-display font-bold">
                      <Truck size={16} weight="duotone" className="text-primary" />
                      Route
                   </div>
                   <button type="button" onClick={() => setActiveStep(3)} className="text-xs font-medium text-primary hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
                   {isDualSlots(form.meal_slots) ? (
                     <>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Lunch Driver</span>
                         <span className="text-sm text-foreground font-medium truncate">{staff.find(s => s.id === form.slot_assignments?.lunch?.driver_id)?.name || form.slot_assignments?.lunch?.driver_id || "Unassigned"}</span>
                       </div>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Lunch Sequence</span>
                         <span className="text-sm text-foreground font-medium">{form.slot_assignments?.lunch?.delivery_sequence || "Auto"}</span>
                       </div>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Dinner Driver</span>
                         <span className="text-sm text-foreground font-medium truncate">{staff.find(s => s.id === form.slot_assignments?.dinner?.driver_id)?.name || form.slot_assignments?.dinner?.driver_id || "Unassigned"}</span>
                       </div>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Dinner Sequence</span>
                         <span className="text-sm text-foreground font-medium">{form.slot_assignments?.dinner?.delivery_sequence || "Auto"}</span>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Assigned Driver</span>
                         <span className="text-sm text-foreground font-medium truncate">{staff.find(s => s.id === form.driver_id)?.name || form.driver_id || "Unassigned"}</span>
                       </div>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Delivery Sequence</span>
                         <span className="text-sm text-foreground font-medium">{form.delivery_sequence || "Auto"}</span>
                       </div>
                     </>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* ── Mobile sticky bottom action bar ──────────────────────────────── */}
        <div className="sm:hidden sticky bottom-0 z-30 bg-white/90 backdrop-blur-md border-t border-brand-border -mx-4 px-4 py-3 flex gap-2">
          <button
            type="button"
            data-testid="cf-cancel-mobile"
            onClick={handleBack}
            className="pill-btn btn-outline h-12 flex-1 cursor-pointer"
          >
            {activeStep > 0 ? "Back" : "Cancel"}
          </button>

          {isReview ? (
            <button
              type="submit"
              data-testid="cf-save-mobile"
              disabled={saving}
              className="pill-btn btn-primary h-12 flex-1 disabled:opacity-60 cursor-pointer gap-2 inline-flex items-center justify-center"
            >
              {saving ? (
                <>
                  <Spinner size={16} className="animate-spin" />
                  Saving…
                </>
              ) : mode === "edit" ? (
                "Save changes"
              ) : (
                "Save customer"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="pill-btn btn-primary h-12 flex-1 cursor-pointer"
            >
              Next step
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
