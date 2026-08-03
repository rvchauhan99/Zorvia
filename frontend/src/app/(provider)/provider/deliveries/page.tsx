"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateDeliveries, canMutateAdmin, isDriver as sessionIsDriver } from "@/lib/roles";
import { fmtDate, todayISO, fmtMealCount, deliveryQty, fmtExtraBadge } from "@/lib/format";
import { mealSlotBadgeLabel } from "@/lib/mealSlots";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import ExtraMealsSheet from "@/components/ExtraMealsSheet";
import AddExtraMealSheet from "@/components/AddExtraMealSheet";
import { StatusFilterCards } from "@/components/StatusFilterCards";
import { InlineLoader } from "@/components/loaders";
import MarkDeliveredSheet from "@/components/MarkDeliveredSheet";
import { DeliveryProofThumbButton, DeliveryProofSheet, type DeliveryProofTarget } from "@/components/DeliveryProofViewer";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import SearchableSelect from "@/components/SearchableSelect";
import CityFilterSelect from "@/components/CityFilterSelect";
import { markDeliveryWithProof } from "@/lib/deliveries";
import { asPageEnvelope, OPS_DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Prohibit, CaretUp, CaretDown, MapPin, Plus } from "@phosphor-icons/react";

const OFFLINE_QUEUE_KEY = "tiffin_delivery_status_queue";

function fsa(postal?: string) {
  return (postal || "").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZZZ";
}

function sortDeliveries(list: any[]) {
  return [...list].sort((a, b) => {
    const ao = a.route_order;
    const bo = b.route_order;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
    const fa = fsa(a.postal_code);
    const fb = fsa(b.postal_code);
    if (fa !== fb) return fa.localeCompare(fb);
    return String(a.customer_name || "").localeCompare(String(b.customer_name || ""));
  });
}

function mapsUrl(d: any) {
  const parts = [d.address, d.apartment, d.postal_code].filter(Boolean).join(", ");
  return `https://maps.google.com/?q=${encodeURIComponent(parts || d.customer_name || "")}`;
}

function readQueue(): { id: string; status: string }[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: { id: string; status: string }[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
}

export default function Deliveries() {
  const { session } = useAuth();
  const canMutate = canMutateDeliveries(session);
  const canAddExtra = canMutateAdmin(session);
  const isDriver = sessionIsDriver(session);
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [driverId, setDriverId] = useState("");
  const [mealSlot, setMealSlot] = useState("all");
  const [filterCity, setFilterCity] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDeliver, setConfirmBulkDeliver] = useState(false);
  const [queueLen, setQueueLen] = useState(0);
  const [extraTarget, setExtraTarget] = useState<any | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);
  const [quickExtraOpen, setQuickExtraOpen] = useState(false);
  const [mealTypes, setMealTypes] = useState<{ id: string; name: string; price: number }[]>([]);
  const [deliverTarget, setDeliverTarget] = useState<any | null>(null);
  const [viewingProof, setViewingProof] = useState<DeliveryProofTarget | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({
    pending: 0, delivered: 0, missed: 0, cancelled: 0, paused: 0, total: 0, meals: 0,
  });
  const paging = useCursorPagination({ initialPageSize: OPS_DEFAULT_PAGE_SIZE });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(async (opts: { cursor?: string | null; silent?: boolean; pageSize?: number } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const params: Record<string, string> = {
        date,
        page_size: String(opts.pageSize ?? paging.pageSize),
      };
      if (debouncedQ) params.q = debouncedQ;
      if (!isDriver && driverId) params.driver_id = driverId;
      if (mealSlot && mealSlot !== "all") params.meal_slot = mealSlot;
      if (filterCity) params.city = filterCity;
      if (filter && filter !== "all") params.status = filter;
      if (opts.cursor) params.cursor = opts.cursor;
      const sumParams: Record<string, string> = { date };
      if (debouncedQ) sumParams.q = debouncedQ;
      if (!isDriver && driverId) sumParams.driver_id = driverId;
      if (mealSlot && mealSlot !== "all") sumParams.meal_slot = mealSlot;
      if (filterCity) sumParams.city = filterCity;

      const [{ data }, sumRes] = await Promise.all([
        api.get(`/deliveries`, { params }),
        api.get(`/deliveries/summary`, { params: sumParams }).catch(() => ({ data: null })),
      ]);
      const page = asPageEnvelope<any>(data);
      setItems(page.items);
      paging.applyPageResult(page);
      if (sumRes?.data) {
        setSummary({
          pending: Number(sumRes.data.pending) || 0,
          delivered: Number(sumRes.data.delivered) || 0,
          missed: Number(sumRes.data.missed) || 0,
          cancelled: Number(sumRes.data.cancelled) || 0,
          paused: Number(sumRes.data.paused) || 0,
          total: Number(sumRes.data.total) || 0,
          meals: Number(sumRes.data.meals) || 0,
        });
      }
    } catch {
      if (!opts.silent) toast.error("Failed to load deliveries");
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [date, debouncedQ, driverId, mealSlot, filterCity, isDriver, filter, paging.pageSize, paging.applyPageResult]);

  // Reset to page 1 when filters change
  useEffect(() => {
    paging.resetToFirstPage();
    fetchPage({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset+fetch on filter identity
  }, [date, debouncedQ, driverId, mealSlot, filterCity, filter, paging.pageSize]);

  const load = useCallback(async (silent = false) => {
    const c = paging.currentPageIndex > 0 ? paging.cursorHistory[paging.currentPageIndex - 1] ?? null : null;
    await fetchPage({ cursor: c, silent });
  }, [fetchPage, paging.currentPageIndex, paging.cursorHistory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: prov }, staffRes] = await Promise.all([
          api.get("/providers/me"),
          isDriver ? Promise.resolve({ data: [] }) : api.get("/providers/me/staff").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const types = Array.isArray(prov?.meal_types)
          ? prov.meal_types.map((t: any) => ({
              id: String(t.id),
              name: String(t.name || t.id),
              price: Number(t.price) || 0,
            }))
          : [];
        setMealTypes(types);
        const staff = Array.isArray(staffRes?.data) ? staffRes.data : [];
        setDrivers(
          staff
            .filter((s: any) => (s.role || "admin") === "driver")
            .map((s: any) => ({ id: s.id, name: s.name || s.email || s.id, email: s.email }))
        );
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [isDriver]);

  // Live board: poll every 30s while tab is visible
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) load(true);
    };
    const id = setInterval(tick, 30000);
    const onVis = () => {
      if (!document.hidden) load(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const flushQueue = useCallback(async () => {
    const q = readQueue();
    if (!q.length) return;
    const remaining: { id: string; status: string }[] = [];
    for (const item of q) {
      try {
        await api.patch(`/deliveries/${item.id}`, { status: item.status });
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueueLen(remaining.length);
    if (q.length !== remaining.length) {
      toast.success(`Synced ${q.length - remaining.length} offline update(s)`);
      load(true);
    }
  }, [load]);

  useEffect(() => {
    setQueueLen(readQueue().length);
    flushQueue();
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushQueue]);

  async function markDelivered(id: string, file: File | null) {
    if (!canMutate) return;
    setItems((it) => it.map((d) => (d.id === id ? { ...d, status: "delivered" } : d)));
    try {
      const data = await markDeliveryWithProof(id, file);
      setItems((it) =>
        it.map((d) =>
          d.id === id ? { ...d, ...data, status: "delivered" } : d,
        ),
      );
      toast.success("Marked delivered");
      void load(true);
    } catch (e: any) {
      if (!file && (!navigator.onLine || !e?.response)) {
        const q = readQueue().filter((x) => x.id !== id);
        q.push({ id, status: "delivered" });
        writeQueue(q);
        setQueueLen(q.length);
        toast.message("Saved offline — will sync when online");
      } else {
        toast.error(e?.response?.data?.detail || "Failed");
        load();
        throw e;
      }
    }
  }

  async function mark(id: string, status: string) {
    if (!canMutate) return;
    setItems((it) =>
      it.map((d) =>
        d.id === id
          ? { ...d, status, ...(status === "pending" ? { delivery_image_url: null } : {}) }
          : d,
      ),
    );
    try {
      await api.patch(`/deliveries/${id}`, { status });
      toast.success(`Marked ${status}`);
      void load(true);
    } catch (e: any) {
      if (!navigator.onLine || !e?.response) {
        const q = readQueue().filter((x) => x.id !== id);
        q.push({ id, status });
        writeQueue(q);
        setQueueLen(q.length);
        toast.message("Saved offline — will sync when online");
      } else {
        toast.error(e?.response?.data?.detail || "Failed");
        load();
      }
    }
  }

  async function markAllDelivered() {
    if (!canMutate) return;
    setBulkBusy(true);
    try {
      // Legacy full list for pending IDs in current filter context (no page_size)
      const params: Record<string, string> = { date, status: "pending" };
      if (debouncedQ) params.q = debouncedQ;
      if (!isDriver && driverId) params.driver_id = driverId;
      if (mealSlot && mealSlot !== "all") params.meal_slot = mealSlot;
      if (filterCity) params.city = filterCity;
      const { data } = await api.get(`/deliveries`, { params });
      const pending = Array.isArray(data) ? data : asPageEnvelope<any>(data).items;
      const ids = pending.map((d: any) => d.id).filter(Boolean);
      if (!ids.length) {
        toast.message("No pending deliveries");
        setConfirmBulkDeliver(false);
        return;
      }
      await api.post("/deliveries/bulk-status", { ids, status: "delivered" });
      toast.success(`Marked ${ids.length} delivered`);
      setConfirmBulkDeliver(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function reorder(id: string, direction: -1 | 1) {
    if (!canMutate) return;
    // Load full day list for correct route order, then apply swap among full set
    try {
      const { data: raw } = await api.get(`/deliveries`, { params: { date } });
      const full = sortDeliveries(Array.isArray(raw) ? raw : asPageEnvelope<any>(raw).items);
      const idx = full.findIndex((d) => d.id === id);
      const swap = idx + direction;
      if (idx < 0 || swap < 0 || swap >= full.length) return;
      const next = [...full];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      const ordered_ids = next.map((d) => d.id);
      await api.patch("/deliveries/route-order", { date, ordered_ids });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Reorder failed");
      load();
    }
  }

  async function confirmAdjust(args: {
    date: string;
    quantity: number;
    meal_slot?: string | null;
    meal_type_id?: string | null;
    meal_price?: number | null;
  }) {
    if (!extraTarget || !canAddExtra) return;
    setExtraBusy(true);
    try {
      const { data } = await api.post("/deliveries/adjust", {
        customer_id: extraTarget.customer_id,
        date: args.date || date,
        quantity: args.quantity,
        meal_slot: args.meal_slot || extraTarget.meal_slot || undefined,
        meal_type_id: args.meal_type_id || undefined,
        meal_price: args.meal_price ?? undefined,
      });
      toast.success("Meal adjusted");
      load();
      return data;
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to adjust meal");
    } finally {
      setExtraBusy(false);
    }
  }

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  const counts = summary;
  const filtered = items;

  const today = todayISO();
  const isFutureDate = date > today;
  const canMarkStatuses = canMutate && !isFutureDate;

  const nextPending = canMarkStatuses ? items.find((d) => d.status === "pending") : undefined;

  const mealsToday = summary.meals || 0;

  const statusFilters = [
    { k: "all", label: "All", count: counts.total || 0 },
    { k: "pending", label: "Pending", count: counts.pending || 0 },
    { k: "delivered", label: "Delivered", count: counts.delivered || 0 },
    { k: "missed", label: "Missed", count: counts.missed || 0 },
    { k: "cancelled", label: "Cancelled", count: counts.cancelled || 0 },
    { k: "paused", label: "Paused", count: counts.paused || 0 },
  ];

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
        <div>
          <span className="label-overline">Route · by order / area</span>
          <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5">Deliveries</h1>
          {!loading && (summary.total || 0) > 0 ? (
            <p className="text-xs text-muted-foreground mt-1" data-testid="deliveries-meals-total">
              {summary.total} stop{summary.total === 1 ? "" : "s"} · {mealsToday} meal{mealsToday === 1 ? "" : "s"}
            </p>
          ) : null}
          {queueLen > 0 ? (
            <p className="text-xs text-amber-800 mt-1" data-testid="offline-queue-hint">{queueLen} offline update(s) pending sync</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button data-testid="prev-day" onClick={() => shiftDay(-1)} className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-white border border-brand-border flex items-center justify-center hover:bg-brand-surface cursor-pointer transition-colors" aria-label="Previous day"><ArrowLeft size={16} /></button>
          <input data-testid="date-picker" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 px-3 rounded-xl bg-white border border-brand-border font-medium" />
          <button data-testid="next-day" onClick={() => shiftDay(1)} className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-white border border-brand-border flex items-center justify-center hover:bg-brand-surface cursor-pointer transition-colors" aria-label="Next day"><ArrowRight size={16} /></button>
          {canAddExtra ? (
            <button
              type="button"
              data-testid="deliveries-add-adjust"
              onClick={() => setQuickExtraOpen(true)}
              className="h-11 px-4 rounded-full border border-brand-border bg-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-brand-surface"
            >
              <Plus size={16} weight="bold" /> Adjust meal
            </button>
          ) : null}
          {canMutate ? (
            <button
              data-testid="bulk-mark-delivered"
              disabled={bulkBusy || isFutureDate || !(counts.pending > 0)}
              onClick={() => setConfirmBulkDeliver(true)}
              className="h-11 px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              Mark all delivered
            </button>
          ) : null}
        </div>
      </div>

      {isFutureDate ? (
        <p data-testid="future-date-hint" className="text-sm text-muted-foreground">
          Viewing a future date — you can plan the route, but marking delivered / missed / cancelled is only allowed for today or past dates.
        </p>
      ) : null}

      {nextPending && canMarkStatuses ? (
        <div data-testid="next-stop" className="sm:hidden card-tinted p-3 border-primary/30 ring-1 ring-primary/20 bg-white">
          <div className="label-overline">Next stop</div>
          <div className="font-display font-bold text-lg mt-0.5 truncate">{nextPending.customer_name}</div>
          <div className="text-xs text-muted-foreground truncate">{nextPending.address}{nextPending.postal_code ? ` · ${nextPending.postal_code}` : ""}</div>
          <div className="text-xs font-semibold text-primary mt-1" data-testid={`next-meals-${nextPending.id}`}>{fmtMealCount(nextPending)}</div>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={mapsUrl(nextPending)}
              target="_blank"
              rel="noreferrer"
              data-testid={`next-maps-${nextPending.id}`}
              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border border-brand-border bg-white inline-flex items-center justify-center text-primary"
              aria-label="Open in Maps"
            >
              <MapPin size={18} />
            </a>
            <button
              data-testid={`next-mark-delivered-${nextPending.id}`}
              onClick={() => setDeliverTarget(nextPending)}
              className="flex-1 h-11 rounded-full bg-secondary text-secondary-foreground font-semibold inline-flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} weight="bold" /> Mark delivered
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <input
          data-testid="delivery-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, address, postal…"
          className="h-10 w-full px-3 rounded-xl bg-white border border-brand-border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <div className="flex flex-wrap gap-2" data-testid="delivery-extra-filters">
          {!isDriver ? (
            <div className="min-w-[160px] max-w-xs flex-1 sm:flex-none">
              <SearchableSelect
                testid="delivery-driver-filter"
                value={driverId}
                onChange={setDriverId}
                allowEmpty
                emptyLabel="All drivers"
                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                inputClassName="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
                placeholder="Search driver…"
              />
            </div>
          ) : null}
          <div className="min-w-[140px] max-w-xs flex-1 sm:flex-none">
            <SearchableSelect
              testid="delivery-slot-filter"
              value={mealSlot}
              onChange={setMealSlot}
              options={[
                { value: "all", label: "All slots" },
                { value: "lunch", label: "Lunch" },
                { value: "dinner", label: "Dinner" },
              ]}
              inputClassName="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
              placeholder="Search slot…"
            />
          </div>
          <CityFilterSelect
            value={filterCity}
            onChange={setFilterCity}
            testid="delivery-city-filter"
          />
        </div>
        <StatusFilterCards
          testid="delivery-filters"
          value={filter}
          onChange={setFilter}
          options={statusFilters.map((f) => ({ id: f.k, label: f.label, count: f.count }))}
        />
      </div>

      <div className="card-tinted overflow-hidden">
        {loading ? (
          <InlineLoader testid="deliveries-loading" />
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {items.length === 0
              ? `No deliveries for ${fmtDate(date)}. Nothing scheduled.`
              : filter === "pending"
                ? `No pending deliveries for ${fmtDate(date)}.`
                : `No ${filter === "all" ? "" : `${filter} `}deliveries for ${fmtDate(date)}. Try a different filter or search.`}
          </div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {filtered.map((d, i) => (
              <li key={d.id} data-testid={`del-row-${d.id}`} className="px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center hover:bg-brand-surface/60 transition-colors">
                {canMutate ? (
                  <div className="flex flex-row sm:flex-col gap-1 shrink-0">
                    <button
                      data-testid={`route-up-${d.id}`}
                      disabled={i === 0}
                      onClick={() => reorder(d.id, -1)}
                      className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border border-brand-border bg-white disabled:opacity-30 inline-flex items-center justify-center cursor-pointer"
                      aria-label="Move up"
                    >
                      <CaretUp size={16} />
                    </button>
                    <button
                      data-testid={`route-down-${d.id}`}
                      disabled={i === filtered.length - 1}
                      onClick={() => reorder(d.id, 1)}
                      className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border border-brand-border bg-white disabled:opacity-30 inline-flex items-center justify-center cursor-pointer"
                      aria-label="Move down"
                    >
                      <CaretDown size={16} />
                    </button>
                  </div>
                ) : null}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium shrink-0">
                      {d.route_order != null ? `#${d.route_order + 1}` : "—"} · {fsa(d.postal_code)}
                    </span>
                    <span className="font-medium truncate">{d.customer_name}</span>
                    {d.meal_slot === "lunch" || d.meal_slot === "dinner" ? (
                      <span
                        className="text-[10px] uppercase tracking-wide font-semibold shrink-0 px-1.5 py-0.5 rounded bg-brand-surface text-muted-foreground"
                        data-testid={`del-slot-${d.id}`}
                      >
                        {mealSlotBadgeLabel(d.meal_slot)}
                      </span>
                    ) : null}
                    <span
                      className="text-xs font-semibold sm:hidden ml-auto shrink-0 px-2 py-0.5 rounded-full bg-brand-surface text-foreground"
                      data-testid={`del-meals-${d.id}`}
                    >
                      {fmtMealCount(d)}
                      {fmtExtraBadge(d) ? (
                        <span className="ml-1 text-primary font-medium">{fmtExtraBadge(d)}</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {d.address}{d.apartment ? ` · ${d.apartment}` : ""}{d.postal_code ? ` · ${d.postal_code}` : ""}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={mapsUrl(d)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid={`maps-${d.id}`}
                      className="min-h-[44px] min-w-[44px] px-2 -ml-2 rounded-full text-sm text-primary inline-flex items-center gap-1.5 hover:bg-brand-surface"
                      aria-label="Open in Maps"
                    >
                      <MapPin size={16} />
                      <span className="sm:hidden">Maps</span>
                      <span className="hidden sm:inline">Open in Maps</span>
                    </a>
                    {d.notes ? <span className="text-xs text-muted-foreground italic truncate">&quot;{d.notes}&quot;</span> : null}
                  </div>
                </div>
                <div
                  className="text-sm font-semibold hidden sm:block shrink-0 px-2.5 py-1 rounded-full bg-brand-surface"
                  data-testid={`del-meals-desktop-${d.id}`}
                >
                  {fmtMealCount(d)}
                  {fmtExtraBadge(d) ? (
                    <span className="ml-1.5 text-primary font-medium text-xs">{fmtExtraBadge(d)}</span>
                  ) : null}
                </div>
                {canMarkStatuses && d.status === "pending" ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {canAddExtra ? (
                      <button
                        type="button"
                        data-testid={`del-adjust-${d.id}`}
                        onClick={() => setExtraTarget(d)}
                        className="h-11 min-h-[44px] px-3 rounded-full border border-brand-border bg-white text-sm inline-flex items-center justify-center gap-1 cursor-pointer hover:bg-brand-surface"
                        aria-label="Adjust meal"
                      >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Adjust</span>
                      </button>
                    ) : null}
                    <button data-testid={`mark-delivered-${d.id}`} onClick={() => setDeliverTarget(d)} className="flex-1 sm:flex-none h-11 min-h-[44px] px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold active:scale-95 transition-transform inline-flex items-center justify-center gap-1 cursor-pointer hover:bg-brand-sageDark">
                      <CheckCircle size={16} weight="bold" /> Delivered
                    </button>
                    <button data-testid={`mark-missed-${d.id}`} onClick={() => mark(d.id, "missed")} className="icon-btn icon-btn-danger" aria-label="Missed">
                      <XCircle size={18} />
                    </button>
                    <button data-testid={`mark-cancelled-${d.id}`} onClick={() => mark(d.id, "cancelled")} className="icon-btn icon-btn-danger" aria-label="Cancel">
                      <Prohibit size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {d.delivery_image_url ? (
                      <DeliveryProofThumbButton delivery={d} onView={setViewingProof} />
                    ) : null}
                    <StatusPill status={d.status} />
                    {canMutate && !isFutureDate && d.status !== "pending" && d.status !== "paused" ? (
                      <button data-testid={`reset-${d.id}`} onClick={() => mark(d.id, "pending")} className="min-h-[44px] px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Undo</button>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
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
          if (c !== undefined) fetchPage({ cursor: c });
        }}
        onNext={() => {
          const c = paging.goNext();
          if (c !== undefined) fetchPage({ cursor: c });
        }}
        onPageSizeChange={(size: AllowedPageSize) => {
          paging.setPageSize(size);
        }}
      />

      <MarkDeliveredSheet
        open={!!deliverTarget}
        onClose={() => setDeliverTarget(null)}
        delivery={deliverTarget ? { id: deliverTarget.id, customer_name: deliverTarget.customer_name } : null}
        onMark={markDelivered}
      />

      <DeliveryProofSheet delivery={viewingProof} onClose={() => setViewingProof(null)} />

      <AppSheet
        open={confirmBulkDeliver}
        onClose={() => { if (!bulkBusy) setConfirmBulkDeliver(false); }}
        title="Mark all delivered?"
        size="md"
        footer={(
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setConfirmBulkDeliver(false)}
              className="pill-btn btn-outline flex-1 h-11 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              data-testid="bulk-mark-delivered-confirm"
              type="button"
              disabled={bulkBusy}
              onClick={markAllDelivered}
              className="pill-btn btn-secondary flex-1 h-11 cursor-pointer disabled:opacity-50"
            >
              {bulkBusy ? "Updating…" : `Mark ${counts.pending || 0} delivered`}
            </button>
          </div>
        )}
      >
        <p className="text-sm text-muted-foreground">
          This will mark <span className="font-semibold text-foreground">{counts.pending || 0}</span> pending
          {" "}deliveries as delivered for <span className="font-semibold text-foreground">{fmtDate(date)}</span>.
          This cannot be undone in bulk — you would need to undo each stop individually.
        </p>
      </AppSheet>

      <ExtraMealsSheet
        open={!!extraTarget}
        onClose={() => setExtraTarget(null)}
        onConfirm={confirmAdjust}
        title={extraTarget ? `Adjust for ${extraTarget.customer_name}` : "Adjust meal"}
        defaultDate={date}
        showDate={false}
        currentQty={extraTarget ? deliveryQty(extraTarget) : 1}
        mealPrice={extraTarget ? Number(extraTarget.meal_price) || 0 : undefined}
        mealTypes={mealTypes}
        defaultMealTypeId={extraTarget?.meal_type_id || null}
        mealSlots={
          extraTarget?.meal_slot
            ? [extraTarget.meal_slot]
            : ["dinner"]
        }
        defaultMealSlot={extraTarget?.meal_slot || null}
        allowPriceOverride
        customerId={extraTarget?.customer_id}
        customerName={extraTarget?.customer_name}
        busy={extraBusy}
        confirmTestId="del-adjust-confirm"
      />

      <AddExtraMealSheet
        open={quickExtraOpen}
        onClose={() => setQuickExtraOpen(false)}
        onAdded={() => load()}
        defaultDate={date}
      />
    </div>
  );
}
