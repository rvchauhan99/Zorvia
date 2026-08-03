"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MagnifyingGlass, PencilSimple, Trash, PauseCircle, PlayCircle, CheckCircle, XCircle, UploadSimple, EnvelopeSimple, ClockCounterClockwise, DotsThreeVertical } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing } from "@/lib/roles";
import { fmtCAD, WEEKDAYS, todayISO } from "@/lib/format";
import { asPageEnvelope, DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import AppSheet from "@/components/AppSheet";
import AddExtraMealSheet from "@/components/AddExtraMealSheet";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { StatusFilterCards } from "@/components/StatusFilterCards";
import { InlineLoader } from "@/components/loaders";
import MealScheduleFields, {
  type ScheduleMode,
  scheduleFromDays,
  daysFromSchedule,
  detectSlotScheduleMode,
  uniformQty,
} from "@/components/MealScheduleFields";
import {
  type MealSlot,
  customerSlotSummary,
  isCategorized,
  isDualSlots,
  normalizeMealSlots,
  unionDaysFromSlotSchedules,
} from "@/lib/mealSlots";
import SearchableSelect from "@/components/SearchableSelect";
import CityFilterSelect from "@/components/CityFilterSelect";
import ImportCustomersSheet from "@/components/ImportCustomersSheet";
import { formatCaPostal, isValidCaPostal } from "@/lib/ca-provinces";
import CaAddressFields from "@/components/CaAddressFields";

const empty = {
  name: "", email: "", phone: "", address: "", apartment: "", city: "", province: "ON", country: "CA", postal_code: "",
  notes: "", delivery_days: [0, 1, 2, 3, 4], meal_type_id: "regular", meal_price: "",
  meal_schedule: scheduleFromDays([0, 1, 2, 3, 4], 1),
  meal_quantity: 1,
  meal_slots: ["dinner"] as MealSlot[],
  lunch_quantity: 1,
  dinner_quantity: 1,
  slot_schedules: {} as Record<string, Record<string, number>>,
  slot_assignments: {
    lunch: { driver_id: "", delivery_sequence: "" },
    dinner: { driver_id: "", delivery_sequence: "" },
  },
  driver_id: "", delivery_sequence: "",
  opening_balance: "0",
  joining_date: "",
  payment_collection_day: "",
  monthly_plan_id: "",
  billing_policy: "inherit",
};

type Filter = "all" | "pending" | "paused" | "inactive" | "high_balance";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "paused", label: "Paused" },
  { id: "inactive", label: "Inactive" },
  { id: "high_balance", label: "High balance" },
];

const MENU_ITEM =
  "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-brand-surface cursor-pointer border-0 bg-transparent";

function CustomerRowActions({
  customer,
  canMutate,
  paused,
  open,
  onToggle,
  onClose,
  onHistory,
  onApprove,
  onReject,
  onPause,
  onResume,
  onEdit,
  onDelete,
}: {
  customer: { id: string; pending_approval?: boolean };
  canMutate: boolean;
  paused: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onHistory: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPause: () => void;
  onResume: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 184;
      const pad = 8;
      const left = Math.min(
        Math.max(pad, rect.right - menuWidth),
        window.innerWidth - menuWidth - pad,
      );
      setMenuPos({ top: rect.bottom + 4, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function run(action: () => void) {
    onClose();
    action();
  }

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-testid={`customer-actions-menu-${customer.id}`}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 80 }}
            className="min-w-[11.5rem] rounded-xl border border-brand-border bg-white shadow-lg py-1"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              data-testid={`customer-payment-history-${customer.id}`}
              className={MENU_ITEM}
              onClick={(e) => {
                e.stopPropagation();
                run(onHistory);
              }}
            >
              <ClockCounterClockwise size={16} className="shrink-0 text-muted-foreground" />
              Payment history
            </button>
            {canMutate ? (
              <>
                {customer.pending_approval ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      data-testid={`approve-${customer.id}`}
                      className={`${MENU_ITEM} text-secondary`}
                      onClick={(e) => {
                        e.stopPropagation();
                        run(onApprove);
                      }}
                    >
                      <CheckCircle size={16} className="shrink-0" />
                      Approve
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      data-testid={`reject-${customer.id}`}
                      className={`${MENU_ITEM} text-destructive`}
                      onClick={(e) => {
                        e.stopPropagation();
                        run(onReject);
                      }}
                    >
                      <XCircle size={16} className="shrink-0" />
                      Reject
                    </button>
                  </>
                ) : null}
                {paused ? (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid={`resume-${customer.id}`}
                    className={`${MENU_ITEM} text-secondary`}
                    onClick={(e) => {
                      e.stopPropagation();
                      run(onResume);
                    }}
                  >
                    <PlayCircle size={16} className="shrink-0" />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid={`pause-${customer.id}`}
                    className={MENU_ITEM}
                    onClick={(e) => {
                      e.stopPropagation();
                      run(onPause);
                    }}
                  >
                    <PauseCircle size={16} className="shrink-0 text-muted-foreground" />
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  data-testid={`edit-${customer.id}`}
                  className={MENU_ITEM}
                  onClick={(e) => {
                    e.stopPropagation();
                    run(onEdit);
                  }}
                >
                  <PencilSimple size={16} className="shrink-0 text-muted-foreground" />
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-testid={`delete-${customer.id}`}
                  className={`${MENU_ITEM} text-destructive`}
                  onClick={(e) => {
                    e.stopPropagation();
                    run(onDelete);
                  }}
                >
                  <Trash size={16} className="shrink-0" />
                  Delete
                </button>
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        data-testid={`customer-actions-${customer.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="icon-btn icon-btn-neutral"
        title="Actions"
        aria-label="Customer actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>
      {menu}
    </div>
  );
}

export default function Customers() {
  const router = useRouter();
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const showMoney = canSeePricing(session);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!showMoney && filter === "high_balance") setFilter("all");
  }, [showMoney, filter]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [pauseTarget, setPauseTarget] = useState<any>(null);
  const [pauseRange, setPauseRange] = useState({ start: todayISO(), end: todayISO() });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("same");
  const [staff, setStaff] = useState<any[]>([]);
  const [mealTypes, setMealTypes] = useState<{ id: string; name: string; price: number }[]>([
    { id: "regular", name: "Regular", price: 12 },
    { id: "jain", name: "Jain", price: 12 },
    { id: "fasting", name: "Fasting", price: 12 },
  ]);
  const [loading, setLoading] = useState(true);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterMealTypeId, setFilterMealTypeId] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterCounts, setFilterCounts] = useState({
    all: 0, pending: 0, paused: 0, inactive: 0, high_balance: 0,
  });
  const [monthlyBillingEnabled, setMonthlyBillingEnabled] = useState(false);
  const [kitchenDefaultVariant, setKitchenDefaultVariant] = useState<"monthly_adjustable" | "monthly_fixed">("monthly_adjustable");
  const [monthlyPlans, setMonthlyPlans] = useState<{ id: string; name: string; monthly_fee_cad?: number }[]>([]);
  const [routePreview, setRoutePreview] = useState<any>(null);
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const paging = useCursorPagination({ initialPageSize: DEFAULT_PAGE_SIZE });

  const input = "h-11 w-full px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";
  const drivers = useMemo(() => staff.filter((s) => (s.role || "admin") === "driver"), [staff]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q]);

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
      const lunch = (form.slot_assignments?.lunch?.driver_id || "").trim();
      const dinner = (form.slot_assignments?.dinner?.driver_id || "").trim();
      return !!lunch && !!dinner;
    }
    return !!(form.driver_id || "").trim();
  }

  async function findLocation() {
    const address = (form.address || "").trim();
    if (!address) {
      toast.error("Enter a street address first");
      return;
    }
    if (!(form.city || "").trim() || !(form.province || "").trim() || !(form.postal_code || "").trim()) {
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
        toast.success("Location found");
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
        setForm((f: any) => ({
          ...f,
          slot_assignments: {
            ...f.slot_assignments,
            [mealSlot]: {
              ...f.slot_assignments?.[mealSlot],
              driver_id: driverId,
              delivery_sequence: String(seq),
            },
          },
        }));
      } else {
        setForm((f: any) => ({
          ...f,
          driver_id: driverId,
          delivery_sequence: String(seq),
        }));
      }
    } catch {
      /* non-fatal */
    } finally {
      setRoutePreviewLoading(false);
    }
  }

  async function loadCounts() {
    try {
      const { data } = await api.get("/customers/summary-counts");
      setFilterCounts({
        all: data?.all || 0,
        pending: data?.pending || 0,
        paused: data?.paused || 0,
        inactive: data?.inactive || 0,
        high_balance: data?.high_balance || 0,
      });
    } catch {
      /* non-fatal */
    }
  }

  async function load(opts?: { cursor?: string | null }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page_size", String(paging.pageSize));
      if (filter !== "all") params.set("status", filter);
      if (debouncedQ) params.set("q", debouncedQ);
      if (filterDriverId) params.set("driver_id", filterDriverId);
      if (filterMealTypeId) params.set("meal_type_id", filterMealTypeId);
      if (filterCity) params.set("city", filterCity);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      const { data } = await api.get(`/customers?${params.toString()}`);
      const page = asPageEnvelope<any>(data);
      setItems(page.items);
      paging.applyPageResult(page);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

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
          }))
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
      // staff list optional for some roles
    }
  }

  useEffect(() => {
    paging.resetToFirstPage();
    load({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset+fetch on filter identity
  }, [debouncedQ, filter, filterDriverId, filterMealTypeId, filterCity, paging.pageSize]);
  useEffect(() => { loadCounts(); }, []);
  useEffect(() => { loadStaff(); }, []);

  function priceForMealType(typeId: string) {
    const row = mealTypes.find((t) => t.id === typeId);
    return row ? Number(row.price) : Number(mealTypes.find((t) => t.id === "regular")?.price) || 12;
  }

  function reloadAll() {
    const c = paging.currentPageIndex > 0 ? paging.cursorHistory[paging.currentPageIndex - 1] ?? null : null;
    load({ cursor: c });
    loadCounts();
  }

  const isPaused = (c: any) => (c.pauses || []).some((p: any) => p.start <= todayISO() && todayISO() <= p.end);

  const filtered = items;

  function openCreate() {
    setEditing(null);
    setRoutePreview(null);
    setFormStep(1);
    const price = priceForMealType("regular");
    setForm({ ...empty, joining_date: todayISO(), meal_type_id: "regular", meal_price: String(price) });
    setScheduleMode("same");
    setShowForm(true);
  }
  function openEdit(c: any) {
    setEditing(c);
    setFormStep(1);
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
          : null
    );
    const slots = normalizeMealSlots(c.meal_slots);
    const ss: Record<string, Record<string, number>> = {};
    const rawSs = c.slot_schedules || {};
    for (const s of slots) {
      const sched = rawSs[s];
      if (sched && Object.keys(sched).length) {
        ss[s] = Object.fromEntries(
          Object.entries(sched).map(([k, v]) => [String(k), Number(v) || 0]).filter(([, v]) => (v as number) >= 1)
        );
      }
    }
    const schedule =
      c.meal_schedule && Object.keys(c.meal_schedule).length
        ? Object.fromEntries(
            Object.entries(c.meal_schedule).map(([k, v]) => [String(k), Number(v) || 1])
          )
        : scheduleFromDays(c.delivery_days || [], 1);
    if (slots.length === 1 && !ss[slots[0]]) {
      ss[slots[0]] = { ...schedule };
    }
    const days = isDualSlots(slots)
      ? unionDaysFromSlotSchedules(ss)
      : daysFromSchedule(schedule);
    const lunchSched = ss.lunch || {};
    const dinnerSched = ss.dinner || {};
    const sa = c.slot_assignments || {};
    const joining =
      (typeof c.joining_date === "string" && c.joining_date.slice(0, 10)) ||
      (typeof c.created_at === "string" && c.created_at.slice(0, 10)) ||
      "";
    setForm({
      name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "",
      apartment: c.apartment || "", city: c.city || "", province: c.province || "ON", country: c.country || "CA",
      postal_code: c.postal_code || "", notes: c.notes || "",
      delivery_days: days.length ? days : (c.delivery_days || []),
      meal_type_id: c.meal_type_id || "regular",
      meal_price: c.meal_price ?? "",
      meal_schedule: schedule,
      meal_quantity: uniformQty(slots.length === 1 ? (ss[slots[0]] || schedule) : schedule),
      meal_slots: slots,
      lunch_quantity: uniformQty(lunchSched) || 1,
      dinner_quantity: uniformQty(dinnerSched) || 1,
      slot_schedules: ss,
      slot_assignments: {
        lunch: {
          driver_id: sa.lunch?.driver_id || "",
          delivery_sequence: sa.lunch?.delivery_sequence != null ? String(sa.lunch.delivery_sequence) : "",
        },
        dinner: {
          driver_id: sa.dinner?.driver_id || "",
          delivery_sequence: sa.dinner?.delivery_sequence != null ? String(sa.dinner.delivery_sequence) : "",
        },
      },
      driver_id: c.driver_id || (slots.length === 1 ? (sa[slots[0]]?.driver_id || "") : ""),
      delivery_sequence:
        c.delivery_sequence != null
          ? String(c.delivery_sequence)
          : (slots.length === 1 && sa[slots[0]]?.delivery_sequence != null
            ? String(sa[slots[0]].delivery_sequence)
            : ""),
      opening_balance: c.opening_balance != null ? String(c.opening_balance) : "0",
      joining_date: joining,
      payment_collection_day: c.payment_collection_day != null ? String(c.payment_collection_day) : "",
      monthly_plan_id: c.monthly_plan_id || "",
      billing_policy: c.billing_policy || "inherit",
    });
    setScheduleMode(detectSlotScheduleMode(ss, slots));
    setShowForm(true);
  }

  function toggleDay(i: number) {
    setForm((f: any) => {
      const on = f.delivery_days.includes(i);
      const days = on ? f.delivery_days.filter((d: number) => d !== i) : [...f.delivery_days, i];
      const dual = isDualSlots(f.meal_slots);
      if (dual && scheduleMode === "same") {
        return {
          ...f,
          delivery_days: days,
          slot_schedules: {
            lunch: scheduleFromDays(days, f.lunch_quantity),
            dinner: scheduleFromDays(days, f.dinner_quantity),
          },
          meal_schedule: scheduleFromDays(days, f.lunch_quantity + f.dinner_quantity),
        };
      }
      let schedule = { ...f.meal_schedule };
      if (on) {
        delete schedule[String(i)];
      } else {
        schedule[String(i)] = scheduleMode === "same" ? f.meal_quantity : 1;
      }
      if (scheduleMode === "same") {
        schedule = scheduleFromDays(days, f.meal_quantity);
      }
      const slots = normalizeMealSlots(f.meal_slots);
      const slot_schedules = slots.length === 1 ? { [slots[0]]: schedule } : f.slot_schedules;
      return { ...f, delivery_days: days, meal_schedule: schedule, slot_schedules };
    });
  }

  function changeMode(mode: ScheduleMode) {
    setScheduleMode(mode);
    setForm((f: any) => {
      const dual = isDualSlots(f.meal_slots);
      if (mode === "same") {
        if (dual) {
          const lq = f.lunch_quantity || 1;
          const dq = f.dinner_quantity || 1;
          return {
            ...f,
            lunch_quantity: lq,
            dinner_quantity: dq,
            slot_schedules: {
              lunch: scheduleFromDays(f.delivery_days, lq),
              dinner: scheduleFromDays(f.delivery_days, dq),
            },
            meal_schedule: scheduleFromDays(f.delivery_days, lq + dq),
          };
        }
        const qty = uniformQty(f.meal_schedule) || f.meal_quantity || 1;
        const schedule = scheduleFromDays(f.delivery_days, qty);
        const slots = normalizeMealSlots(f.meal_slots);
        return {
          ...f,
          meal_quantity: qty,
          meal_schedule: schedule,
          slot_schedules: slots.length === 1 ? { [slots[0]]: schedule } : f.slot_schedules,
        };
      }
      return f;
    });
  }

  function changeMealSlots(slots: MealSlot[]) {
    setForm((f: any) => {
      const next = normalizeMealSlots(slots);
      if (isDualSlots(next)) {
        const days = f.delivery_days.length ? f.delivery_days : [0, 1, 2, 3, 4];
        const lq = f.lunch_quantity || 1;
        const dq = f.dinner_quantity || 1;
        return {
          ...f,
          meal_slots: next,
          delivery_days: days,
          lunch_quantity: lq,
          dinner_quantity: dq,
          slot_schedules: {
            lunch: scheduleFromDays(days, lq),
            dinner: scheduleFromDays(days, dq),
          },
          meal_schedule: scheduleFromDays(days, lq + dq),
        };
      }
      const schedule = scheduleFromDays(f.delivery_days, f.meal_quantity || 1);
      return {
        ...f,
        meal_slots: next,
        meal_schedule: schedule,
        slot_schedules: { [next[0]]: schedule },
      };
    });
  }

  function changeQuantity(qty: number) {
    setForm((f: any) => {
      const schedule = scheduleFromDays(f.delivery_days, qty);
      const slots = normalizeMealSlots(f.meal_slots);
      return {
        ...f,
        meal_quantity: qty,
        meal_schedule: schedule,
        slot_schedules: slots.length === 1 ? { [slots[0]]: schedule } : f.slot_schedules,
      };
    });
  }

  function changeLunchQuantity(qty: number) {
    setForm((f: any) => ({
      ...f,
      lunch_quantity: qty,
      slot_schedules: {
        ...f.slot_schedules,
        lunch: scheduleFromDays(f.delivery_days, qty),
        dinner: scheduleFromDays(f.delivery_days, f.dinner_quantity || 1),
      },
      meal_schedule: scheduleFromDays(f.delivery_days, qty + (f.dinner_quantity || 1)),
    }));
  }

  function changeDinnerQuantity(qty: number) {
    setForm((f: any) => ({
      ...f,
      dinner_quantity: qty,
      slot_schedules: {
        ...f.slot_schedules,
        lunch: scheduleFromDays(f.delivery_days, f.lunch_quantity || 1),
        dinner: scheduleFromDays(f.delivery_days, qty),
      },
      meal_schedule: scheduleFromDays(f.delivery_days, (f.lunch_quantity || 1) + qty),
    }));
  }

  function changeDayQuantity(day: number, qty: number) {
    setForm((f: any) => {
      const schedule = { ...f.meal_schedule, [String(day)]: qty };
      const slots = normalizeMealSlots(f.meal_slots);
      return {
        ...f,
        meal_schedule: schedule,
        slot_schedules: slots.length === 1 ? { [slots[0]]: schedule } : f.slot_schedules,
      };
    });
  }

  function changeSlotDayQuantity(slot: "lunch" | "dinner", day: number, qty: number) {
    setForm((f: any) => {
      const prev = { ...(f.slot_schedules?.[slot] || {}) };
      if (qty < 1) delete prev[String(day)];
      else prev[String(day)] = qty;
      const slot_schedules = { ...f.slot_schedules, [slot]: prev };
      const days = unionDaysFromSlotSchedules(slot_schedules);
      return { ...f, slot_schedules, delivery_days: days };
    });
  }

  function goToRouteStep() {
    if (!(form.name || "").trim()) {
      toast.error("Name is required");
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
    if (routePreview?.geocode_status !== "ok") {
      toast.error("Tap Find location to confirm the address before continuing");
      return;
    }
    setFormStep(2);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (formStep !== 2) {
      goToRouteStep();
      return;
    }
    if (!(form.address || "").trim() || !(form.city || "").trim() || !(form.province || "").trim() || !(form.postal_code || "").trim()) {
      toast.error("Address, city, province, and postal code are required");
      setFormStep(1);
      return;
    }
    if (!isValidCaPostal(form.postal_code)) {
      toast.error("Enter a valid Canadian postal code (e.g. M5H 2M9)");
      setFormStep(1);
      return;
    }
    if (drivers.length === 0) {
      toast.error("Add a driver in Staff before saving customers");
      return;
    }
    if (!hasDriverAssignment()) {
      toast.error("Select a driver before saving");
      return;
    }
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
      if (form.meal_type_id) payload.meal_type_id = form.meal_type_id;
      if (form.meal_price !== "" && form.meal_price != null) payload.meal_price = Number(form.meal_price);
      if (canMutate) {
        if (form.opening_balance !== "" && form.opening_balance != null) {
          payload.opening_balance = Number(form.opening_balance);
        } else {
          payload.opening_balance = 0;
        }
      }
      if (form.joining_date) payload.joining_date = form.joining_date;
      payload.billing_policy = form.billing_policy || "inherit";
      const effectiveMonthly =
        form.billing_policy === "monthly_adjustable" ||
        form.billing_policy === "monthly_fixed" ||
        ((form.billing_policy === "inherit" || !form.billing_policy) && monthlyBillingEnabled);
      if (effectiveMonthly && form.payment_collection_day !== "" && form.payment_collection_day != null) {
        payload.payment_collection_day = Number(form.payment_collection_day);
      }
      if (effectiveMonthly) {
        payload.monthly_plan_id = form.monthly_plan_id || null;
      }

      if (dual) {
        if (scheduleMode === "same") {
          payload.delivery_days = form.delivery_days;
          payload.lunch_meal_quantity = form.lunch_quantity;
          payload.dinner_meal_quantity = form.dinner_quantity;
        } else {
          payload.slot_schedules = form.slot_schedules;
        }
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
        const schedule =
          scheduleMode === "same"
            ? scheduleFromDays(form.delivery_days, form.meal_quantity)
            : form.meal_schedule;
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

      if (editing) {
        await api.patch(`/customers/${editing.id}`, payload);
        toast.success("Customer updated");
      } else {
        await api.post("/customers", payload);
        toast.success("Customer added");
      }
      setShowForm(false);
      setFormStep(1);
      reloadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/customers/${deleteTarget.id}`);
      toast.success("Deleted");
      setDeleteTarget(null);
      reloadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  }

  async function approve(c: any) {
    await api.post(`/customers/${c.id}/approve`);
    toast.success("Approved");
    reloadAll();
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    try {
      await api.post(`/customers/${rejectTarget.id}/reject`, { reason: rejectReason || undefined });
      toast.success("Rejected");
      setRejectTarget(null);
      setRejectReason("");
      reloadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Reject failed");
    }
  }

  async function submitPause(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/customers/${pauseTarget.id}/pause`, pauseRange);
      toast.success(`${pauseTarget.name} paused`);
      setPauseTarget(null);
      reloadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed");
    }
  }

  async function resume(c: any) {
    await api.post(`/customers/${c.id}/resume`);
    toast.success("Resumed");
    reloadAll();
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/customers/invite", inviteForm);
      toast.success("Invite sent");
      setShowInvite(false);
      setInviteForm({ name: "", email: "" });
      reloadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invite failed");
    }
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="label-overline">CRM</span>
          <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5">Customers</h1>
          {canMutate ? (
            <Link
              href="/provider/route-planning"
              data-testid="customers-route-planning-link"
              className="text-sm text-brand-teal underline-offset-2 hover:underline mt-1 inline-block"
            >
              Route planning
            </Link>
          ) : null}
        </div>
        {canMutate ? (
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                data-testid="customers-add-adjust"
                onClick={() => setExtraOpen(true)}
                className="pill-btn btn-secondary gap-2 flex-1 sm:flex-none shrink-0 cursor-pointer h-11 inline-flex items-center justify-center"
              >
                <Plus size={16} weight="bold" /> Adjust meal
              </button>
              <button
                data-testid="add-customer-btn"
                onClick={() => router.push("/provider/customers/new")}
                className="pill-btn btn-primary gap-2 flex-1 sm:flex-none shrink-0 cursor-pointer h-11 inline-flex items-center justify-center"
              >
                <Plus size={16} weight="bold" /> Add customer
              </button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                data-testid="import-customers-open"
                onClick={() => setShowImport(true)}
                className="pill-btn btn-outline gap-1.5 sm:gap-2 flex-1 sm:flex-none shrink-0 cursor-pointer h-11 inline-flex items-center justify-center"
                title="Import CSV"
              >
                <UploadSimple size={16} />
                <span className="truncate">Import</span>
              </button>
              <button
                data-testid="invite-customer-btn"
                onClick={() => setShowInvite(true)}
                className="pill-btn btn-outline gap-1.5 sm:gap-2 flex-1 sm:flex-none shrink-0 cursor-pointer h-11 inline-flex items-center justify-center"
              >
                <EnvelopeSimple size={16} /> Invite
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 max-w-md">
          <div className="flex-1 relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input data-testid="customers-search" placeholder="Search name, phone, email or postal…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-brand-border outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2" data-testid="customers-extra-filters">
          <div className="min-w-[160px] max-w-xs flex-1 sm:flex-none">
            <SearchableSelect
              testid="customers-driver-filter"
              value={filterDriverId}
              onChange={setFilterDriverId}
              allowEmpty
              emptyLabel="All drivers"
              options={drivers.map((d: any) => ({ value: d.id, label: d.name || d.email }))}
              inputClassName="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
              placeholder="Search driver…"
            />
          </div>
          <div className="min-w-[160px] max-w-xs flex-1 sm:flex-none">
            <SearchableSelect
              testid="customers-meal-type-filter"
              value={filterMealTypeId}
              onChange={setFilterMealTypeId}
              allowEmpty
              emptyLabel="All meal types"
              options={mealTypes.map((t) => ({ value: t.id, label: t.name }))}
              inputClassName="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
              placeholder="Search meal type…"
            />
          </div>
          <CityFilterSelect
            value={filterCity}
            onChange={setFilterCity}
            testid="customers-city-filter"
          />
        </div>
      </div>

      <StatusFilterCards
        testid="customers-filters"
        value={filter}
        onChange={(id) => setFilter(id as Filter)}
        options={FILTERS.filter((f) => showMoney || f.id !== "high_balance").map((f) => ({
          id: f.id,
          label: f.label,
          count: filterCounts[f.id],
        }))}
      />

      <div className="card-tinted overflow-hidden">
        {loading ? (
          <InlineLoader testid="customers-loading" label="Loading customers…" />
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">No customers match this filter.</div>
        ) : (
          <>
            <ul className="md:hidden divide-y divide-brand-border">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  data-testid={`customer-row-${c.id}`}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/provider/customers/${c.id}?tab=analysis`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/provider/customers/${c.id}?tab=analysis`);
                    }
                  }}
                  className="p-3 flex flex-col gap-2 hover:bg-brand-surface/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/provider/customers/${c.id}?tab=analysis`}
                        data-testid={`customer-link-${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.address}{c.apartment ? ` · ${c.apartment}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-1.5 flex gap-1 flex-wrap">
                        {c.pending_approval ? <span className="text-[10px] uppercase tracking-widest bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Pending approval</span> : null}
                        {c.rejected ? <span className="text-[10px] uppercase tracking-widest bg-red-100 text-red-900 px-2 py-0.5 rounded-full">Rejected</span> : null}
                        {isPaused(c) ? <span className="text-[10px] uppercase tracking-widest bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">Paused</span> : null}
                        {!c.active ? <span className="text-[10px] uppercase tracking-widest bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">Inactive</span> : null}
                        {c.geocode_status === "ok" ? (
                          <span className="text-[10px] uppercase tracking-widest bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">Geocoded</span>
                        ) : c.geocode_status === "failed" ? (
                          <span className="text-[10px] uppercase tracking-widest bg-orange-100 text-orange-900 px-2 py-0.5 rounded-full">Address issue</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold px-2 py-0.5 rounded-full bg-brand-surface inline-block">
                        {customerSlotSummary(c)}
                      </div>
                      {showMoney ? (
                        <>
                          <div className="text-sm font-medium mt-1">
                            {fmtCAD(c.meal_price)}
                            {c.meal_type_id ? (
                              <span className="text-xs text-muted-foreground font-normal ml-1">
                                · {mealTypes.find((t) => t.id === c.meal_type_id)?.name || c.meal_type_id}
                              </span>
                            ) : null}
                          </div>
                          <div className={`text-sm font-semibold ${c.outstanding > 0 ? "text-primary" : "text-muted-foreground"}`}>
                            {fmtCAD(c.outstanding || 0)}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Seq <span className="font-mono text-foreground">{c.delivery_sequence != null ? c.delivery_sequence : "—"}</span></span>
                    <span>Driver <span className="text-foreground">{c.driver_name || "—"}</span></span>
                  </div>
                  <div className="flex items-center justify-end -ml-1" onClick={(e) => e.stopPropagation()}>
                    <CustomerRowActions
                      customer={c}
                      canMutate={canMutate}
                      paused={isPaused(c)}
                      open={openActionsId === c.id}
                      onToggle={() => setOpenActionsId((id) => (id === c.id ? null : c.id))}
                      onClose={() => setOpenActionsId(null)}
                      onHistory={() => router.push(`/provider/customers/${c.id}?tab=payments`)}
                      onApprove={() => approve(c)}
                      onReject={() => { setRejectTarget(c); setRejectReason(""); }}
                      onPause={() => setPauseTarget(c)}
                      onResume={() => resume(c)}
                      onEdit={() => router.push(`/provider/customers/${c.id}/edit`)}
                      onDelete={() => setDeleteTarget(c)}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <table className={`w-full text-sm ${showMoney ? "min-w-[960px]" : "min-w-[720px]"}`}>
                <thead className="bg-brand-surface">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 label-overline">Name</th>
                    <th className="px-3 py-2.5 label-overline">Contact</th>
                    <th className="px-3 py-2.5 label-overline hidden lg:table-cell">Days</th>
                    <th className="px-3 py-2.5 label-overline">Seq</th>
                    <th className="px-3 py-2.5 label-overline hidden lg:table-cell">Driver</th>
                    <th className="px-3 py-2.5 label-overline">Meals</th>
                    {showMoney ? <th className="px-3 py-2.5 label-overline">Price</th> : null}
                    {showMoney ? <th className="px-3 py-2.5 label-overline">Outstanding</th> : null}
                    <th className="px-3 py-2.5 label-overline text-right sticky right-0 bg-brand-surface">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filtered.map((c) => (
                    <tr key={c.id} data-testid={`customer-row-${c.id}`} className="hover:bg-brand-surface/60 transition-colors group">
                      <td className="px-3 py-2.5">
                        <Link href={`/provider/customers/${c.id}?tab=analysis`} data-testid={`customer-link-${c.id}`} className="font-medium hover:text-primary hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{c.address} {c.apartment ? `· ${c.apartment}` : ""}</div>
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {c.pending_approval ? <span className="text-[10px] uppercase tracking-widest bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Pending approval</span> : null}
                          {c.rejected ? <span className="text-[10px] uppercase tracking-widest bg-red-100 text-red-900 px-2 py-0.5 rounded-full">Rejected</span> : null}
                          {isPaused(c) ? <span className="text-[10px] uppercase tracking-widest bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">Paused</span> : null}
                          {!c.active ? <span className="text-[10px] uppercase tracking-widest bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">Inactive</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <div>{c.phone || "—"}</div>
                        <div className="text-xs">{c.email || ""}</div>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <div className="flex gap-0.5">
                          {WEEKDAYS.map((d) => (
                            <span key={d.i} className={`w-6 h-6 rounded-full text-[10px] font-medium inline-flex items-center justify-center ${
                              (c.delivery_days || []).includes(d.i) ? "bg-primary text-primary-foreground" : "bg-brand-surface text-muted-foreground"
                            }`}>{d.s[0]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground text-center">
                        {c.delivery_sequence != null ? c.delivery_sequence : "—"}
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">
                        {c.driver_name || "—"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold">{customerSlotSummary(c)}</td>
                      {showMoney ? (
                        <td className="px-3 py-2.5">{fmtCAD(c.meal_price)}</td>
                      ) : null}
                      {showMoney ? (
                        <td className={`px-3 py-2.5 font-semibold ${c.outstanding > 0 ? "text-primary" : "text-muted-foreground"}`}>{fmtCAD(c.outstanding || 0)}</td>
                      ) : null}
                      <td className="px-3 py-2.5 whitespace-nowrap sticky right-0 bg-white group-hover:bg-brand-surface/60">
                        <div className="flex justify-end items-center shrink-0">
                          <CustomerRowActions
                            customer={c}
                            canMutate={canMutate}
                            paused={isPaused(c)}
                            open={openActionsId === c.id}
                            onToggle={() => setOpenActionsId((id) => (id === c.id ? null : c.id))}
                            onClose={() => setOpenActionsId(null)}
                            onHistory={() => router.push(`/provider/customers/${c.id}?tab=payments`)}
                            onApprove={() => approve(c)}
                            onReject={() => { setRejectTarget(c); setRejectReason(""); }}
                            onPause={() => setPauseTarget(c)}
                            onResume={() => resume(c)}
                            onEdit={() => router.push(`/provider/customers/${c.id}/edit`)}
                            onDelete={() => setDeleteTarget(c)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <CursorPaginationBar
        currentPage={paging.currentPage}
        totalPages={paging.totalPages}
        from={paging.from}
        to={paging.to}
        total={paging.total}
        pageSize={paging.pageSize}
        hasMore={paging.hasMore}
        loading={loading}
        onPrev={() => {
          const c = paging.goPrev();
          if (c !== undefined) load({ cursor: c });
        }}
        onNext={() => {
          const c = paging.goNext();
          if (c !== undefined) load({ cursor: c });
        }}
        onPageSizeChange={(size: AllowedPageSize) => {
          paging.setPageSize(size);
        }}
        testidPrefix="customers-pagination"
      />

      <AppSheet
        open={showForm}
        onClose={() => { setShowForm(false); setFormStep(1); }}
        title={editing ? "Edit customer" : "Add customer"}
        size="2xl"
        as="form"
        onSubmit={save}
        closeTestId="close-customer-form"
        footer={(
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {formStep === 2 ? (
                <button
                  type="button"
                  data-testid="cf-back"
                  onClick={() => setFormStep(1)}
                  className="pill-btn btn-outline h-12 flex-1 cursor-pointer"
                >
                  Back
                </button>
              ) : null}
              {formStep === 1 ? (
                <button
                  type="button"
                  data-testid="cf-next"
                  onClick={goToRouteStep}
                  className="pill-btn btn-primary h-12 flex-1 cursor-pointer"
                >
                  Next: Route &amp; drivers
                </button>
              ) : (
                <button
                  data-testid="cf-save"
                  type="submit"
                  disabled={saving || !hasDriverAssignment()}
                  className="pill-btn btn-primary h-12 flex-1 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Saving..." : (editing ? "Save changes" : "Save customer")}
                </button>
              )}
            </div>
            {formStep === 2 && !hasDriverAssignment() ? (
              <p className="text-xs text-muted-foreground text-center sm:text-left" data-testid="cf-save-hint">
                {drivers.length === 0
                  ? "Add a driver in Staff before saving customers."
                  : "Select a driver to enable save."}
              </p>
            ) : null}
          </div>
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3" data-testid="cf-wizard-steps">
          <span className={formStep === 1 ? "font-semibold text-primary" : ""}>1. Details</span>
          <span aria-hidden>→</span>
          <span className={formStep === 2 ? "font-semibold text-primary" : ""}>2. Route &amp; drivers</span>
        </div>
        {formStep === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
          <label className="flex flex-col gap-1.5"><span className="label-overline">Name</span><input required data-testid="cf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">Phone</span><input data-testid="cf-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">Email</span><input type="email" data-testid="cf-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} /></label>
          {canMutate ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Meal type</span>
                <SearchableSelect
                  testid="cf-meal-type"
                  inputClassName={input}
                  value={form.meal_type_id || "regular"}
                  onChange={(tid) => {
                    setForm({
                      ...form,
                      meal_type_id: tid,
                      meal_price: String(priceForMealType(tid)),
                    });
                  }}
                  options={mealTypes.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Search meal type…"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Price per meal (CAD)</span>
                <input
                  type="number"
                  step="0.5"
                  data-testid="cf-price"
                  value={form.meal_price}
                  onChange={(e) => setForm({ ...form, meal_price: e.target.value })}
                  className={input}
                  placeholder="From meal type if empty"
                />
              </label>
            </>
          ) : null}
          {canMutate ? (
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="label-overline">Opening balance (CAD)</span>
              <input
                type="number"
                step="0.01"
                data-testid="cf-opening-balance"
                value={form.opening_balance}
                onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                className={input}
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">Positive = outstanding owed; negative = advance credit. Leave 0 for new customers.</span>
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Joining date</span>
            <input
              type="date"
              data-testid="cf-joining-date"
              value={form.joining_date || ""}
              onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              className={input}
            />
          </label>
          {canMutate ? (
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="label-overline">Billing policy</span>
              <SearchableSelect
                testid="customer-billing-policy"
                inputClassName={input}
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
                placeholder="Search policy…"
              />
              <span className="text-xs text-muted-foreground">
                Default follows Settings → Subscription Policy. Override only when this customer differs.
              </span>
            </label>
          ) : null}
          {(
            form.billing_policy === "monthly_adjustable" ||
            form.billing_policy === "monthly_fixed" ||
            ((form.billing_policy === "inherit" || !form.billing_policy) && monthlyBillingEnabled)
          ) ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Monthly plan</span>
                <SearchableSelect
                  testid="cf-monthly-plan"
                  inputClassName={input}
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
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Collection day override (1–31)</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  data-testid="cf-collection-day"
                  value={form.payment_collection_day}
                  onChange={(e) => setForm({ ...form, payment_collection_day: e.target.value })}
                  className={input}
                  placeholder="Uses kitchen default if empty"
                />
              </label>
            </>
          ) : null}
          <CaAddressFields
            testidPrefix="cf"
            inputClassName={input}
            values={{
              province: form.province || "ON",
              city: form.city,
              postal_code: form.postal_code,
              address: form.address,
              apartment: form.apartment,
            }}
            onChange={(patch) => {
              setForm({ ...form, ...patch });
              setRoutePreview(null);
            }}
          />
          <div className="sm:col-span-2 flex flex-col gap-2">
            <button
              type="button"
              data-testid="cf-find-location"
              onClick={() => void findLocation()}
              disabled={routePreviewLoading}
              className="pill-btn btn-outline h-11 w-full sm:w-auto self-start cursor-pointer disabled:opacity-60"
            >
              {routePreviewLoading ? "Finding…" : "Find location"}
            </button>
            <div
              className="rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-3 flex flex-col gap-1.5"
              data-testid="cf-route-preview"
            >
              <span className="label-overline">Coordinates</span>
              {routePreview ? (
                <p className="text-sm" data-testid="cf-latlng">
                  {routePreview.lat != null && routePreview.lng != null
                    ? `${Number(routePreview.lat).toFixed(5)}, ${Number(routePreview.lng).toFixed(5)}`
                    : "—"}
                  <span className="text-muted-foreground text-xs ml-2">
                    · {routePreview.geocode_status || "pending"}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Tap Find location after filling the Canadian address. Lat/lng are not looked up automatically.</p>
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="label-overline">Notes</span><textarea data-testid="cf-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[80px] w-full px-3 py-2.5 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" /></label>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="label-overline">Meal schedule</span>
            <MealScheduleFields
              mode={scheduleMode}
              onModeChange={changeMode}
              mealSlots={form.meal_slots}
              onMealSlotsChange={changeMealSlots}
              deliveryDays={form.delivery_days}
              mealSchedule={form.meal_schedule}
              mealQuantity={form.meal_quantity}
              lunchQuantity={form.lunch_quantity}
              dinnerQuantity={form.dinner_quantity}
              slotSchedules={form.slot_schedules}
              mealPrice={form.meal_price}
              onToggleDay={toggleDay}
              onQuantityChange={changeQuantity}
              onLunchQuantityChange={changeLunchQuantity}
              onDinnerQuantityChange={changeDinnerQuantity}
              onDayQuantityChange={changeDayQuantity}
              onSlotDayQuantityChange={changeSlotDayQuantity}
              inputClassName={input}
            />
          </div>
        </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4" data-testid="cf-route-step">
          <p className="sm:col-span-2 text-sm text-muted-foreground">
            Assign a driver for each meal slot — required before saving. Stop sequence is suggested automatically; you can edit it before save.
          </p>
          {isCategorized(form.meal_slots) && isDualSlots(form.meal_slots) ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Lunch driver</span>
                <SearchableSelect
                  testid="cf-lunch-driver"
                  inputClassName={input}
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
                  allowEmpty
                  emptyLabel="Select driver…"
                  options={drivers.map((d) => ({
                    value: d.id,
                    label: d.name || d.email,
                  }))}
                  placeholder="Search driver…"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Lunch sequence</span>
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
                        lunch: { ...form.slot_assignments.lunch, delivery_sequence: e.target.value },
                      },
                    })
                  }
                  className={input}
                  placeholder="Auto on driver select"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Dinner driver</span>
                <SearchableSelect
                  testid="cf-dinner-driver"
                  inputClassName={input}
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
                  allowEmpty
                  emptyLabel="Select driver…"
                  options={drivers.map((d) => ({
                    value: d.id,
                    label: d.name || d.email,
                  }))}
                  placeholder="Search driver…"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Dinner sequence</span>
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
                        dinner: { ...form.slot_assignments.dinner, delivery_sequence: e.target.value },
                      },
                    })
                  }
                  className={input}
                  placeholder="Auto on driver select"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Assigned driver</span>
                <SearchableSelect
                  testid="cf-driver"
                  inputClassName={input}
                  value={form.driver_id}
                  onChange={(driver_id) => {
                    setForm({ ...form, driver_id });
                    void applyDriverPlacement(driver_id, previewMealSlot());
                  }}
                  allowEmpty
                  emptyLabel="Select driver…"
                  options={drivers.map((d) => ({
                    value: d.id,
                    label: d.name || d.email,
                  }))}
                  placeholder="Search driver…"
                />
                {drivers.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Add staff with role Driver in Settings to assign routes.</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Delivery sequence</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  data-testid="cf-sequence"
                  value={form.delivery_sequence}
                  onChange={(e) => setForm({ ...form, delivery_sequence: e.target.value })}
                  className={input}
                  placeholder="Auto on driver select"
                />
                <span className="text-xs text-muted-foreground">
                  Set automatically when you pick a driver.
                </span>
              </label>
            </>
          )}
          {routePreviewLoading ? (
            <p className="sm:col-span-2 text-xs text-muted-foreground">Updating suggested sequence…</p>
          ) : routePreview?.delivery_sequence != null ? (
            <p className="sm:col-span-2 text-xs text-muted-foreground" data-testid="cf-route-summary">
              Suggested stop #{routePreview.delivery_sequence}
              {routePreview.before?.name ? ` · after ${routePreview.before.name}` : ""}
              {routePreview.after?.name ? ` · before ${routePreview.after.name}` : ""}
            </p>
          ) : null}
        </div>
        )}
      </AppSheet>

      <ImportCustomersSheet
        open={showImport}
        onClose={() => setShowImport(false)}
        defaultPolicy={
          monthlyBillingEnabled
            ? kitchenDefaultVariant === "monthly_fixed"
              ? "monthly_fixed"
              : "monthly_adjustable"
            : "per_meal"
        }
        onFinished={() => {
          reloadAll();
        }}
      />

      <AppSheet open={showInvite} onClose={() => setShowInvite(false)} title="Invite customer" size="md" as="form" onSubmit={submitInvite} footer={(
        <button data-testid="invite-submit" type="submit" className="pill-btn btn-primary h-12 w-full cursor-pointer">Send invite</button>
      )}>
        <div className="flex flex-col gap-4 pb-2">
          <label className="flex flex-col gap-1.5"><span className="label-overline">Name</span><input required data-testid="invite-name" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">Email</span><input required type="email" data-testid="invite-email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className={input} /></label>
          <p className="text-xs text-muted-foreground">They will receive a link to set a password and join as a consumer.</p>
        </div>
      </AppSheet>

      <AppSheet open={!!pauseTarget} onClose={() => setPauseTarget(null)} title={pauseTarget ? `Pause ${pauseTarget.name}` : "Pause"} size="md" as="form" onSubmit={submitPause} footer={(
        <div className="flex gap-2">
          <button type="button" onClick={() => setPauseTarget(null)} className="pill-btn btn-outline flex-1 h-11 cursor-pointer">Cancel</button>
          <button data-testid="pause-confirm" type="submit" className="pill-btn btn-primary flex-1 h-11 cursor-pointer">Confirm pause</button>
        </div>
      )}>
        <p className="text-sm text-muted-foreground mb-4">Deliveries during this range will be skipped and no outstanding will accrue.</p>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5"><span className="label-overline">From</span><input required type="date" data-testid="pause-start" value={pauseRange.start} onChange={(e) => {
            const start = e.target.value;
            setPauseRange((prev) => ({ start, end: prev.end < start ? start : prev.end }));
          }} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">To</span><input required type="date" data-testid="pause-end" min={pauseRange.start} value={pauseRange.end} onChange={(e) => setPauseRange({ ...pauseRange, end: e.target.value })} className={input} /></label>
        </div>
      </AppSheet>

      <AppSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={deleteTarget ? `Delete ${deleteTarget.name}?` : "Delete"} size="md" footer={(
        <div className="flex gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="pill-btn btn-outline flex-1 h-11 cursor-pointer">Cancel</button>
          <button data-testid="delete-confirm" type="button" onClick={confirmDelete} className="pill-btn btn-danger flex-1 h-11 cursor-pointer">Delete</button>
        </div>
      )}>
        <p className="text-sm text-muted-foreground">This cannot be undone. Their delivery history and payment records may remain for your reports.</p>
      </AppSheet>

      <AppSheet open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={rejectTarget ? `Reject ${rejectTarget.name}?` : "Reject"} size="md" footer={(
        <div className="flex gap-2">
          <button type="button" onClick={() => setRejectTarget(null)} className="pill-btn btn-outline flex-1 h-11 cursor-pointer">Cancel</button>
          <button data-testid="reject-confirm" type="button" onClick={confirmReject} className="pill-btn btn-danger flex-1 h-11 cursor-pointer">Reject</button>
        </div>
      )}>
        <p className="text-sm text-muted-foreground mb-4">They will be marked inactive and notified if they have a consumer account.</p>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Reason (optional)</span>
          <textarea data-testid="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[80px] w-full px-3 py-2.5 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" />
        </label>
      </AppSheet>

      <AddExtraMealSheet
        open={extraOpen}
        onClose={() => setExtraOpen(false)}
        defaultDate={todayISO()}
      />
    </div>
  );
}
