"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MagnifyingGlass, PencilSimple, Trash, PauseCircle, PlayCircle, CheckCircle, XCircle, UploadSimple, EnvelopeSimple, DownloadSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing } from "@/lib/roles";
import { fmtCAD, WEEKDAYS, todayISO } from "@/lib/format";
import { asPageEnvelope, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import AppSheet from "@/components/AppSheet";
import AddExtraMealSheet from "@/components/AddExtraMealSheet";
import LoadMoreButton from "@/components/LoadMoreButton";
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

const empty = {
  name: "", email: "", phone: "", address: "", apartment: "", postal_code: "",
  notes: "", delivery_days: [0, 1, 2, 3, 4], meal_type_id: "regular", meal_price: "",
  meal_schedule: scheduleFromDays([0, 1, 2, 3, 4], 1),
  meal_quantity: 1,
  meal_slots: ["uncategorized"] as MealSlot[],
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
};

const SAMPLE_CSV = `name,phone,email,address,apartment,postal_code,delivery_days,meal_price,meal_quantity,meal_slots,lunch_meal_quantity,dinner_meal_quantity,driver_email,delivery_sequence,lunch_driver_email,lunch_delivery_sequence,dinner_driver_email,dinner_delivery_sequence,opening_balance,joining_date
Aarav Sharma,4165551212,aarav@example.com,45 Bloor St W,Unit 302,M5S1M2,"0,1,2,3,4",12,2,uncategorized,,,,1,,,,,45.00,2024-03-01
Priya Patel,6475559898,priya@example.com,100 King St E,,M5C1G6,"0,2,4",14,,"lunch,dinner",1,1,,,,,,,-20,2024-06-15
Neha Gupta,9055553344,neha@example.com,12 Queen St W,Suite 5,M5H2N2,"1,3,5",12,1,uncategorized,,,driver@yourkitchen.ca,3,,,,,0,
`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mealhq-customers-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Filter = "all" | "pending" | "paused" | "inactive" | "high_balance";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "paused", label: "Paused" },
  { id: "inactive", label: "Inactive" },
  { id: "high_balance", label: "High balance" },
];

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
  const [showInvite, setShowInvite] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [importing, setImporting] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("same");
  const [staff, setStaff] = useState<any[]>([]);
  const [mealTypes, setMealTypes] = useState<{ id: string; name: string; price: number }[]>([
    { id: "regular", name: "Regular", price: 12 },
    { id: "jain", name: "Jain", price: 12 },
    { id: "fasting", name: "Fasting", price: 12 },
  ]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterMealTypeId, setFilterMealTypeId] = useState("");
  const [filterCounts, setFilterCounts] = useState({
    all: 0, pending: 0, paused: 0, inactive: 0, high_balance: 0,
  });

  const input = "h-11 w-full px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";
  const drivers = useMemo(() => staff.filter((s) => (s.role || "admin") === "driver"), [staff]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q]);

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

  async function load(opts?: { cursor?: string | null; append?: boolean }) {
    const append = Boolean(opts?.append);
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page_size", String(DEFAULT_PAGE_SIZE));
      if (filter !== "all") params.set("status", filter);
      if (debouncedQ) params.set("q", debouncedQ);
      if (filterDriverId) params.set("driver_id", filterDriverId);
      if (filterMealTypeId) params.set("meal_type_id", filterMealTypeId);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      const { data } = await api.get(`/customers?${params.toString()}`);
      const page = asPageEnvelope<any>(data);
      setItems((prev) => (append ? [...prev, ...page.items] : page.items));
      setNextCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadStaff() {
    try {
      const [{ data }, { data: prov }] = await Promise.all([
        api.get("/providers/me/staff"),
        api.get("/providers/me"),
      ]);
      setStaff(data || []);
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

  useEffect(() => { load(); }, [debouncedQ, filter, filterDriverId, filterMealTypeId]);
  useEffect(() => { loadCounts(); }, []);
  useEffect(() => { loadStaff(); }, []);

  function priceForMealType(typeId: string) {
    const row = mealTypes.find((t) => t.id === typeId);
    return row ? Number(row.price) : Number(mealTypes.find((t) => t.id === "regular")?.price) || 12;
  }

  function reloadAll() {
    load();
    loadCounts();
  }

  const isPaused = (c: any) => (c.pauses || []).some((p: any) => p.start <= todayISO() && todayISO() <= p.end);

  const filtered = items;

  function openCreate() {
    setEditing(null);
    const price = priceForMealType("regular");
    setForm({ ...empty, joining_date: todayISO(), meal_type_id: "regular", meal_price: String(price) });
    setScheduleMode("same");
    setShowForm(true);
  }
  function openEdit(c: any) {
    setEditing(c);
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
      apartment: c.apartment || "", postal_code: c.postal_code || "", notes: c.notes || "",
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
      driver_id: c.driver_id || (slots.length === 1 && slots[0] !== "uncategorized" ? (sa[slots[0]]?.driver_id || "") : ""),
      delivery_sequence:
        c.delivery_sequence != null
          ? String(c.delivery_sequence)
          : (slots.length === 1 && slots[0] !== "uncategorized" && sa[slots[0]]?.delivery_sequence != null
            ? String(sa[slots[0]].delivery_sequence)
            : ""),
      opening_balance: c.opening_balance != null ? String(c.opening_balance) : "0",
      joining_date: joining,
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const slots = normalizeMealSlots(form.meal_slots);
      const dual = isDualSlots(slots);
      const payload: any = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        apartment: form.apartment,
        postal_code: form.postal_code,
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
        if (slots[0] === "uncategorized") {
          payload.driver_id = form.driver_id || null;
          payload.delivery_sequence =
            form.delivery_sequence === "" || form.delivery_sequence == null
              ? null
              : Number(form.delivery_sequence);
          payload.slot_assignments = {};
        } else {
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
      }

      if (editing) {
        await api.patch(`/customers/${editing.id}`, payload);
        toast.success("Customer updated");
      } else {
        await api.post("/customers", payload);
        toast.success("Customer added");
      }
      setShowForm(false);
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

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/customers/import", fd);
      toast.success(`Imported ${data.created} customer(s)`);
      if (data.errors?.length) toast.message(`${data.errors.length} row(s) skipped`);
      reloadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="label-overline">CRM</span>
          <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Customers</h1>
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
                onClick={openCreate}
                className="pill-btn btn-primary gap-2 flex-1 sm:flex-none shrink-0 cursor-pointer h-11 inline-flex items-center justify-center"
              >
                <Plus size={16} weight="bold" /> Add customer
              </button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                data-testid="download-sample-csv"
                onClick={() => { downloadSampleCsv(); toast.success("Sample CSV downloaded"); }}
                className="pill-btn btn-outline gap-1.5 sm:gap-2 flex-1 sm:flex-none shrink-0 cursor-pointer h-11 inline-flex items-center justify-center"
                title="Download sample CSV"
              >
                <DownloadSimple size={16} />
                <span className="sm:inline">Sample</span>
              </button>
              <label
                className="pill-btn btn-outline gap-1.5 sm:gap-2 flex-1 sm:flex-none shrink-0 cursor-pointer h-11 inline-flex items-center justify-center"
                title="Import CSV"
              >
                <UploadSimple size={16} />
                <span className="truncate">{importing ? "…" : "Import"}</span>
                <input data-testid="import-customers-input" type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={onImportFile} disabled={importing} />
              </label>
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
          <select
            data-testid="customers-driver-filter"
            value={filterDriverId}
            onChange={(e) => setFilterDriverId(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
          >
            <option value="">All drivers</option>
            {drivers.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name || d.email}</option>
            ))}
          </select>
          <select
            data-testid="customers-meal-type-filter"
            value={filterMealTypeId}
            onChange={(e) => setFilterMealTypeId(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
          >
            <option value="">All meal types</option>
            {mealTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
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
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm">No customers match this filter.</div>
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
                  {canMutate ? (
                    <div className="flex items-center gap-0.5 flex-wrap -ml-1" onClick={(e) => e.stopPropagation()}>
                      {c.pending_approval ? (
                        <>
                          <button data-testid={`approve-${c.id}`} onClick={() => approve(c)} className="icon-btn icon-btn-success" title="Approve"><CheckCircle size={18} /></button>
                          <button data-testid={`reject-${c.id}`} onClick={() => { setRejectTarget(c); setRejectReason(""); }} className="icon-btn icon-btn-danger" title="Reject"><XCircle size={18} /></button>
                        </>
                      ) : null}
                      {isPaused(c) ? (
                        <button data-testid={`resume-${c.id}`} onClick={() => resume(c)} className="icon-btn icon-btn-success" title="Resume"><PlayCircle size={18} /></button>
                      ) : (
                        <button data-testid={`pause-${c.id}`} onClick={() => setPauseTarget(c)} className="icon-btn icon-btn-neutral" title="Pause"><PauseCircle size={18} /></button>
                      )}
                      <button data-testid={`edit-${c.id}`} onClick={() => openEdit(c)} className="icon-btn icon-btn-neutral" title="Edit"><PencilSimple size={18} /></button>
                      <button data-testid={`delete-${c.id}`} onClick={() => setDeleteTarget(c)} className="icon-btn icon-btn-danger" title="Delete"><Trash size={18} /></button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <table className={`w-full text-sm ${showMoney ? "min-w-[960px]" : "min-w-[720px]"}`}>
                <thead className="bg-brand-surface">
                  <tr className="text-left">
                    <th className="px-4 py-3 label-overline">Name</th>
                    <th className="px-4 py-3 label-overline">Contact</th>
                    <th className="px-4 py-3 label-overline hidden lg:table-cell">Days</th>
                    <th className="px-4 py-3 label-overline">Seq</th>
                    <th className="px-4 py-3 label-overline hidden lg:table-cell">Driver</th>
                    <th className="px-4 py-3 label-overline">Meals</th>
                    {showMoney ? <th className="px-4 py-3 label-overline">Price</th> : null}
                    {showMoney ? <th className="px-4 py-3 label-overline">Outstanding</th> : null}
                    {canMutate ? <th className="px-4 py-3 label-overline text-right sticky right-0 bg-brand-surface">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filtered.map((c) => (
                    <tr key={c.id} data-testid={`customer-row-${c.id}`} className="hover:bg-brand-surface/60 transition-colors group">
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{c.phone || "—"}</div>
                        <div className="text-xs">{c.email || ""}</div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex gap-0.5">
                          {WEEKDAYS.map((d) => (
                            <span key={d.i} className={`w-6 h-6 rounded-full text-[10px] font-medium inline-flex items-center justify-center ${
                              (c.delivery_days || []).includes(d.i) ? "bg-primary text-primary-foreground" : "bg-brand-surface text-muted-foreground"
                            }`}>{d.s[0]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-center">
                        {c.delivery_sequence != null ? c.delivery_sequence : "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {c.driver_name || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">{customerSlotSummary(c)}</td>
                      {showMoney ? (
                        <td className="px-4 py-3">{fmtCAD(c.meal_price)}</td>
                      ) : null}
                      {showMoney ? (
                        <td className={`px-4 py-3 font-semibold ${c.outstanding > 0 ? "text-primary" : "text-muted-foreground"}`}>{fmtCAD(c.outstanding || 0)}</td>
                      ) : null}
                      {canMutate ? (
                        <td className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white group-hover:bg-brand-surface/60">
                          <div className="flex justify-end items-center gap-0.5 shrink-0">
                            {c.pending_approval ? (
                              <>
                                <button data-testid={`approve-${c.id}`} onClick={() => approve(c)} className="icon-btn icon-btn-success" title="Approve"><CheckCircle size={18} /></button>
                                <button data-testid={`reject-${c.id}`} onClick={() => { setRejectTarget(c); setRejectReason(""); }} className="icon-btn icon-btn-danger" title="Reject"><XCircle size={18} /></button>
                              </>
                            ) : null}
                            {isPaused(c) ? (
                              <button data-testid={`resume-${c.id}`} onClick={() => resume(c)} className="icon-btn icon-btn-success" title="Resume"><PlayCircle size={18} /></button>
                            ) : (
                              <button data-testid={`pause-${c.id}`} onClick={() => setPauseTarget(c)} className="icon-btn icon-btn-neutral" title="Pause"><PauseCircle size={18} /></button>
                            )}
                            <button data-testid={`edit-${c.id}`} onClick={() => openEdit(c)} className="icon-btn icon-btn-neutral" title="Edit"><PencilSimple size={18} /></button>
                            <button data-testid={`delete-${c.id}`} onClick={() => setDeleteTarget(c)} className="icon-btn icon-btn-danger" title="Delete"><Trash size={18} /></button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        testid="customers-load-more"
        onClick={() => load({ cursor: nextCursor, append: true })}
      />

      <AppSheet open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit customer" : "Add customer"} size="2xl" as="form" onSubmit={save} closeTestId="close-customer-form" footer={(
        <button data-testid="cf-save" type="submit" disabled={saving} className="pill-btn btn-primary h-12 w-full disabled:opacity-60 cursor-pointer">
          {saving ? "Saving..." : (editing ? "Save changes" : "Add customer")}
        </button>
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
          <label className="flex flex-col gap-1.5"><span className="label-overline">Name</span><input required data-testid="cf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">Phone</span><input data-testid="cf-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">Email</span><input type="email" data-testid="cf-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} /></label>
          {canMutate ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Meal type</span>
                <select
                  data-testid="cf-meal-type"
                  className={input}
                  value={form.meal_type_id || "regular"}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setForm({
                      ...form,
                      meal_type_id: tid,
                      meal_price: String(priceForMealType(tid)),
                    });
                  }}
                >
                  {mealTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
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
          <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="label-overline">Address</span><input data-testid="cf-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">Apartment</span><input data-testid="cf-apt" value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1.5"><span className="label-overline">Postal code</span><input data-testid="cf-postal" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value.toUpperCase() })} className={`${input} uppercase`} /></label>
          {isCategorized(form.meal_slots) && isDualSlots(form.meal_slots) ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Lunch driver</span>
                <select
                  data-testid="cf-lunch-driver"
                  value={form.slot_assignments?.lunch?.driver_id || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slot_assignments: {
                        ...form.slot_assignments,
                        lunch: { ...form.slot_assignments.lunch, driver_id: e.target.value },
                      },
                    })
                  }
                  className={input}
                >
                  <option value="">Unassigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name || d.email}</option>
                  ))}
                </select>
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
                  placeholder="e.g. 1"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Dinner driver</span>
                <select
                  data-testid="cf-dinner-driver"
                  value={form.slot_assignments?.dinner?.driver_id || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slot_assignments: {
                        ...form.slot_assignments,
                        dinner: { ...form.slot_assignments.dinner, driver_id: e.target.value },
                      },
                    })
                  }
                  className={input}
                >
                  <option value="">Unassigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name || d.email}</option>
                  ))}
                </select>
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
                  placeholder="e.g. 1"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Assigned driver</span>
                <select
                  data-testid="cf-driver"
                  value={form.driver_id}
                  onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
                  className={input}
                >
                  <option value="">Unassigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name || d.email}</option>
                  ))}
                </select>
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
                  placeholder="e.g. 1 (earlier stop)"
                />
                <span className="text-xs text-muted-foreground">
                  Stop number for the assigned driver (or unassigned pool). Inserting at an existing number shifts later stops down.
                </span>
              </label>
            </>
          )}
          <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="label-overline">Notes</span><textarea data-testid="cf-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[80px] w-full px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" /></label>
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
      </AppSheet>

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
          <textarea data-testid="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[80px] w-full px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" />
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
