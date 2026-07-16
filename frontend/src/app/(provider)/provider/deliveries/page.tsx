"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateDeliveries } from "@/lib/roles";
import { fmtCAD, fmtDate, todayISO } from "@/lib/format";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import { StatusFilterCards } from "@/components/StatusFilterCards";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Prohibit, CaretUp, CaretDown, MapPin } from "@phosphor-icons/react";

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
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDeliver, setConfirmBulkDeliver] = useState(false);
  const [queueLen, setQueueLen] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/deliveries?date=${date}`);
      setItems(sortDeliveries(data));
    } catch {
      if (!silent) toast.error("Failed to load deliveries");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Live board: poll every 10s while document has focus
  useEffect(() => {
    const tick = () => {
      if (document.hasFocus()) load(true);
    };
    const id = setInterval(tick, 10000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
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

  async function mark(id: string, status: string) {
    if (!canMutate) return;
    setItems((it) => sortDeliveries(it.map((d) => (d.id === id ? { ...d, status } : d))));
    try {
      await api.patch(`/deliveries/${id}`, { status });
      toast.success(`Marked ${status}`);
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
    const ids = items.filter((d) => d.status === "pending").map((d) => d.id);
    if (!ids.length) {
      toast.message("No pending deliveries");
      setConfirmBulkDeliver(false);
      return;
    }
    setBulkBusy(true);
    try {
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
    const ordered = sortDeliveries(items);
    const idx = ordered.findIndex((d) => d.id === id);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    const next = [...ordered];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const ordered_ids = next.map((d) => d.id);
    setItems(next.map((d, i) => ({ ...d, route_order: i })));
    try {
      const { data } = await api.patch("/deliveries/route-order", { date, ordered_ids });
      setItems(sortDeliveries(data));
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Reorder failed");
      load();
    }
  }

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  const counts = items.reduce((a: any, d: any) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {});
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let base = filter === "all" ? items : items.filter((d) => d.status === filter);
    if (ql) {
      base = base.filter((d) => {
        const hay = [d.customer_name, d.address, d.apartment, d.postal_code]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(ql);
      });
    }
    return sortDeliveries(base);
  }, [items, filter, q]);

  const today = todayISO();
  const isFutureDate = date > today;
  const canMarkStatuses = canMutate && !isFutureDate;

  const nextPending = canMarkStatuses ? items.find((d) => d.status === "pending") : undefined;

  const statusFilters = [
    { k: "all", label: "All", count: items.length },
    { k: "pending", label: "Pending", count: counts.pending || 0 },
    { k: "delivered", label: "Delivered", count: counts.delivered || 0 },
    { k: "missed", label: "Missed", count: counts.missed || 0 },
    { k: "cancelled", label: "Cancelled", count: counts.cancelled || 0 },
    { k: "paused", label: "Paused", count: counts.paused || 0 },
  ];

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up pb-24 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
        <div>
          <span className="label-overline">Route · by order / area</span>
          <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Deliveries</h1>
          {queueLen > 0 ? (
            <p className="text-xs text-amber-800 mt-1" data-testid="offline-queue-hint">{queueLen} offline update(s) pending sync</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button data-testid="prev-day" onClick={() => shiftDay(-1)} className="w-10 h-10 rounded-full bg-white border border-brand-border flex items-center justify-center hover:bg-brand-surface cursor-pointer transition-colors"><ArrowLeft size={16} /></button>
          <input data-testid="date-picker" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 px-3 rounded-xl bg-white border border-brand-border font-medium" />
          <button data-testid="next-day" onClick={() => shiftDay(1)} className="w-10 h-10 rounded-full bg-white border border-brand-border flex items-center justify-center hover:bg-brand-surface cursor-pointer transition-colors"><ArrowRight size={16} /></button>
          {canMutate ? (
            <button
              data-testid="bulk-mark-delivered"
              disabled={bulkBusy || isFutureDate || !(counts.pending > 0)}
              onClick={() => setConfirmBulkDeliver(true)}
              className="h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold disabled:opacity-50 cursor-pointer"
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
        <div data-testid="next-stop" className="sm:hidden card-tinted p-3 border-primary/30 ring-1 ring-primary/20 sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 bg-white">
          <div className="label-overline">Next stop</div>
          <div className="font-display font-bold text-lg mt-0.5 truncate">{nextPending.customer_name}</div>
          <div className="text-xs text-muted-foreground truncate">{nextPending.address}{nextPending.postal_code ? ` · ${nextPending.postal_code}` : ""}</div>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={mapsUrl(nextPending)}
              target="_blank"
              rel="noreferrer"
              data-testid={`next-maps-${nextPending.id}`}
              className="h-11 w-11 rounded-full border border-brand-border bg-white inline-flex items-center justify-center text-primary"
              aria-label="Open in Maps"
            >
              <MapPin size={18} />
            </a>
            <button
              data-testid={`next-mark-delivered-${nextPending.id}`}
              onClick={() => mark(nextPending.id, "delivered")}
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
        <StatusFilterCards
          testid="delivery-filters"
          value={filter}
          onChange={setFilter}
          options={statusFilters.map((f) => ({ id: f.k, label: f.label, count: f.count }))}
        />
      </div>

      <div className="card-tinted overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
            {items.length === 0
              ? `No deliveries for ${fmtDate(date)}. Nothing scheduled.`
              : filter === "pending"
                ? `No pending deliveries for ${fmtDate(date)}.`
                : `No ${filter === "all" ? "" : `${filter} `}deliveries for ${fmtDate(date)}. Try a different filter or search.`}
          </div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {filtered.map((d, i) => (
              <li key={d.id} data-testid={`del-row-${d.id}`} className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center hover:bg-brand-surface/60 transition-colors">
                {canMutate ? (
                  <div className="hidden sm:flex flex-col gap-1 shrink-0">
                    <button
                      data-testid={`route-up-${d.id}`}
                      disabled={i === 0}
                      onClick={() => reorder(d.id, -1)}
                      className="h-9 w-9 rounded-full border border-brand-border bg-white disabled:opacity-30 inline-flex items-center justify-center cursor-pointer"
                      aria-label="Move up"
                    >
                      <CaretUp size={16} />
                    </button>
                    <button
                      data-testid={`route-down-${d.id}`}
                      disabled={i === filtered.length - 1}
                      onClick={() => reorder(d.id, 1)}
                      className="h-9 w-9 rounded-full border border-brand-border bg-white disabled:opacity-30 inline-flex items-center justify-center cursor-pointer"
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
                    <span className="text-sm font-semibold sm:hidden ml-auto shrink-0">{fmtCAD(d.meal_price)}</span>
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
                      className="text-xs text-primary inline-flex items-center gap-1"
                      aria-label="Open in Maps"
                    >
                      <MapPin size={12} />
                      <span className="sm:hidden">Maps</span>
                      <span className="hidden sm:inline">Open in Maps</span>
                    </a>
                    {d.notes ? <span className="text-xs text-muted-foreground italic truncate">&quot;{d.notes}&quot;</span> : null}
                  </div>
                </div>
                <div className="text-sm font-semibold hidden sm:block shrink-0">{fmtCAD(d.meal_price)}</div>
                {canMarkStatuses && d.status === "pending" ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button data-testid={`mark-delivered-${d.id}`} onClick={() => mark(d.id, "delivered")} className="flex-1 sm:flex-none h-11 min-h-[44px] px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold active:scale-95 transition-transform inline-flex items-center justify-center gap-1 cursor-pointer hover:bg-brand-sageDark">
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
                  <div className="flex items-center gap-2">
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
    </div>
  );
}
