"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MapPin,
  Path,
  CaretUp,
  CaretDown,
  ArrowsClockwise,
  UserCircle,
  Plus,
  Trash,
  CarSimple,
  CheckCircle,
  WarningCircle,
  NavigationArrow,
  Funnel,
  ListNumbers,
  CaretRight,
  Package,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { mealSlotBadgeLabel } from "@/lib/mealSlots";
import { InlineLoader } from "@/components/loaders";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import SearchableSelect from "@/components/SearchableSelect";
import { OPS_DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";

type MealSlot = "lunch" | "dinner";

type Stop = {
  id: string;
  name?: string;
  address?: string;
  apartment?: string;
  postal_code?: string;
  driver_id?: string | null;
  driver_name?: string | null;
  delivery_sequence?: number | null;
  geocode_status?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type PoolSection = {
  key: string;
  driverId: string | null;
  title: string;
  stops: Stop[];
};

type BulkRangeRow = {
  id: string;
  from: string;
  to: string;
  driverId: string; // "" = unassigned
};

const COLLAPSE_THRESHOLD = 80;

function stopAddress(s: Stop) {
  return [s.address, s.apartment, s.postal_code].filter(Boolean).join(", ");
}

function kitchenAddressLine(kitchen: {
  address?: string;
  street?: string;
  apartment?: string;
  city?: string;
  province?: string;
  postal_code?: string;
}) {
  if (kitchen.street || kitchen.city || kitchen.province || kitchen.postal_code) {
    return [kitchen.street, kitchen.apartment, kitchen.city, kitchen.province, kitchen.postal_code]
      .map((p) => (p || "").trim())
      .filter(Boolean)
      .join(", ");
  }
  return (kitchen.address || "").trim();
}

function mapsUrlForStops(kitchenAddress: string, stops: Stop[]) {
  const parts = [kitchenAddress, ...stops.map(stopAddress)].filter(Boolean);
  if (!parts.length) return "https://maps.google.com";
  const origin = encodeURIComponent(parts[0]);
  const dest = encodeURIComponent(parts[parts.length - 1]);
  const waypoints = parts.slice(1, -1).map((p) => encodeURIComponent(p)).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

function sortPool(stops: Stop[]) {
  return [...stops].sort((a, b) => {
    const as = a.delivery_sequence ?? 1e9;
    const bs = b.delivery_sequence ?? 1e9;
    if (as !== bs) return as - bs;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function seqSpan(stops: Stop[]): { min: number; max: number; counted: number } | null {
  const seqs = stops
    .map((s) => s.delivery_sequence)
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (!seqs.length) return null;
  return { min: Math.min(...seqs), max: Math.max(...seqs), counted: seqs.length };
}

function newBulkRow(driverId = ""): BulkRangeRow {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, from: "", to: "", driverId };
}

function countInRange(stops: Stop[], from: number, to: number): number {
  return stops.filter((s) => {
    const seq = s.delivery_sequence;
    return seq != null && seq >= from && seq <= to;
  }).length;
}

/** Even contiguous ranges over [minSeq, maxSeq] for the given driver ids (in order). */
function evenSplitRanges(
  minSeq: number,
  maxSeq: number,
  driverIds: string[]
): { from: number; to: number; driverId: string }[] {
  if (!driverIds.length || maxSeq < minSeq) return [];
  const total = maxSeq - minSeq + 1;
  const n = driverIds.length;
  const base = Math.floor(total / n);
  let rem = total % n;
  let cursor = minSeq;
  const out: { from: number; to: number; driverId: string }[] = [];
  for (let i = 0; i < n; i++) {
    const size = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    if (size <= 0) continue;
    const from = cursor;
    const to = cursor + size - 1;
    out.push({ from, to, driverId: driverIds[i] });
    cursor = to + 1;
  }
  return out;
}

export default function RoutePlanningPage() {
  const { session } = useAuth();
  const admin = canMutateAdmin(session);
  const [slot, setSlot] = useState<MealSlot>("dinner");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [mapsPoolKey, setMapsPoolKey] = useState<string>("unassigned");
  const [bulkSourceKey, setBulkSourceKey] = useState<string>("unassigned");
  const [bulkRows, setBulkRows] = useState<BulkRangeRow[]>([newBulkRow()]);
  const [evenSplitDriverIds, setEvenSplitDriverIds] = useState<string[]>([]);
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [assignTab, setAssignTab] = useState<"quick" | "sequence">("quick");
  const [activePoolKey, setActivePoolKey] = useState<string | null>(null);
  const [showOptimizeWarning, setShowOptimizeWarning] = useState(false);
  const stopsPaging = useCursorPagination({ initialPageSize: OPS_DEFAULT_PAGE_SIZE });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/route-planning", { params: { meal_slot: slot } });
      setPlan(data);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load route plan");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [slot]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: staff } = await api.get("/providers/me/staff");
        if (cancelled) return;
        setDrivers(
          (Array.isArray(staff) ? staff : [])
            .filter((s: any) => (s.role || "admin") === "driver")
            .map((s: any) => ({ id: s.id, name: s.name || s.email || s.id }))
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const stops: Stop[] = useMemo(
    () => (Array.isArray(plan?.stops) ? plan.stops : []),
    [plan]
  );

  const sections: PoolSection[] = useMemo(() => {
    const unassigned = sortPool(stops.filter((s) => !s.driver_id));
    const byDriver = new Map<string, Stop[]>();
    for (const s of stops) {
      if (!s.driver_id) continue;
      const list = byDriver.get(s.driver_id) || [];
      list.push(s);
      byDriver.set(s.driver_id, list);
    }
    const driverSections: PoolSection[] = [];
    const seen = new Set<string>();
    for (const d of drivers) {
      const list = sortPool(byDriver.get(d.id) || []);
      driverSections.push({
        key: d.id,
        driverId: d.id,
        title: d.name,
        stops: list,
      });
      seen.add(d.id);
    }
    for (const [id, list] of byDriver) {
      if (seen.has(id)) continue;
      const name = list[0]?.driver_name || id;
      driverSections.push({
        key: id,
        driverId: id,
        title: name,
        stops: sortPool(list),
      });
    }
    return [
      { key: "unassigned", driverId: null, title: "Unassigned", stops: unassigned },
      ...driverSections,
    ];
  }, [stops, drivers]);

  const bulkSourceSection = useMemo(
    () => sections.find((s) => s.key === bulkSourceKey) || sections[0],
    [sections, bulkSourceKey]
  );

  const bulkSourceSpan = useMemo(
    () => (bulkSourceSection ? seqSpan(bulkSourceSection.stops) : null),
    [bulkSourceSection]
  );

  const bulkPreviews = useMemo(() => {
    const sourceStops = bulkSourceSection?.stops || [];
    return bulkRows.map((row) => {
      const from = parseInt(row.from, 10);
      const to = parseInt(row.to, 10);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || from < 1) {
        return { count: 0, valid: false };
      }
      return { count: countInRange(sourceStops, from, to), valid: true };
    });
  }, [bulkRows, bulkSourceSection]);

  const bulkTotalPreview = bulkPreviews.reduce((n, p) => n + (p.valid ? p.count : 0), 0);

  const mapsStops = useMemo(() => {
    const sec = sections.find((s) => s.key === mapsPoolKey) || sections[0];
    return (sec?.stops || []).filter((s) => s.delivery_sequence != null);
  }, [sections, mapsPoolKey]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (sectionStops: Stop[]) => {
    const ids = sectionStops.map((s) => s.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const togglePoolExpanded = (key: string) => {
    setExpandedPools((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const runOptimize = async () => {
    if (!admin) return;
    setBusy(true);
    try {
      const { data } = await api.post("/route-planning/optimize", { meal_slot: slot });
      toast.success(
        `Optimized ${data?.ordered_ids?.length ?? 0} stops` +
          (data?.skipped?.length ? ` (${data.skipped.length} skipped)` : "")
      );
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Optimize failed");
    } finally {
      setBusy(false);
    }
  };

  const runGeocode = async () => {
    if (!admin) return;
    setBusy(true);
    try {
      const { data } = await api.post("/route-planning/geocode-missing", null, {
        params: { meal_slot: slot, limit: 40 },
      });
      const n = data?.customers?.length ?? 0;
      toast.success(n ? `Geocoded ${n} address(es)` : "Nothing to geocode");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Geocode failed");
    } finally {
      setBusy(false);
    }
  };

  const placeOne = async (customerId: string, driverId: string | null) => {
    if (!admin) return;
    setBusy(true);
    try {
      await api.post("/route-planning/insert-customer", {
        customer_id: customerId,
        meal_slot: slot,
        driver_id: driverId || null,
      });
      toast.success("Placed on route");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Insert failed");
    } finally {
      setBusy(false);
    }
  };

  const assignDriver = async () => {
    if (!admin || selected.size === 0) return;
    setBusy(true);
    try {
      await api.post("/route-planning/assign-driver", {
        customer_ids: Array.from(selected),
        driver_id: assignDriverId || null,
        meal_slot: slot,
      });
      toast.success(assignDriverId ? "Assigned to driver (appended to route)" : "Moved to unassigned pool");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Assign failed");
    } finally {
      setBusy(false);
    }
  };

  const applyBulkBySequence = async () => {
    if (!admin) return;
    const ranges = bulkRows
      .map((row, i) => {
        const from = parseInt(row.from, 10);
        const to = parseInt(row.to, 10);
        if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
        if (!bulkPreviews[i]?.valid || bulkPreviews[i].count === 0) return null;
        return {
          sequence_from: from,
          sequence_to: to,
          driver_id: row.driverId || null,
        };
      })
      .filter(Boolean) as { sequence_from: number; sequence_to: number; driver_id: string | null }[];

    if (!ranges.length) {
      toast.error("Add at least one valid range that matches stops");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/route-planning/assign-by-sequence", {
        meal_slot: slot,
        source_driver_id: bulkSourceSection?.driverId ?? null,
        ranges,
      });
      const parts = (data?.by_range || [])
        .map((r: any) => `#${r.sequence_from}–${r.sequence_to}: ${r.count}`)
        .join(" · ");
      toast.success(`Assigned ${data?.assigned ?? 0} stops` + (parts ? ` (${parts})` : ""));
      setBulkRows([newBulkRow()]);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Bulk assign failed");
    } finally {
      setBusy(false);
    }
  };

  const applyEvenSplit = () => {
    if (!bulkSourceSpan || evenSplitDriverIds.length === 0) {
      toast.error("Pick at least one driver and a source pool with sequences");
      return;
    }
    const split = evenSplitRanges(bulkSourceSpan.min, bulkSourceSpan.max, evenSplitDriverIds);
    if (!split.length) {
      toast.error("Could not build ranges");
      return;
    }
    setBulkRows(
      split.map((s) => ({
        id: `${Date.now()}-${s.from}-${s.to}`,
        from: String(s.from),
        to: String(s.to),
        driverId: s.driverId,
      }))
    );
    toast.success(`Filled ${split.length} ranges — review and Apply`);
  };

  const moveStopInPool = async (section: PoolSection, index: number, dir: -1 | 1) => {
    if (!admin) return;
    const next = [...section.stops];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;
    setBusy(true);
    try {
      await api.post("/route-planning/reorder", {
        meal_slot: slot,
        ordered_ids: next.map((s) => s.id),
        driver_id: section.driverId,
      });
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Reorder failed");
    } finally {
      setBusy(false);
    }
  };

  const kitchen = plan?.kitchen || {};
  const kitchenLine = kitchenAddressLine(kitchen);
  const configured = !!plan?.routing_configured;
  const autoCollapse = stops.length > COLLAPSE_THRESHOLD;

  // Derived stats for summary bar
  const totalStops = stops.length;
  const assignedStops = stops.filter((s) => !!s.driver_id).length;
  const unassignedStops = totalStops - assignedStops;
  const geocodeFailed = (plan?.geocode_failed || []).length;
  const needPlace = (plan?.unplaced || []).length;
  const issueCount = geocodeFailed + needPlace;

  // Active pool for the "Review Routes" expanded view
  const activeSection = useMemo(() => {
    if (activePoolKey == null) return null;
    return sections.find((s) => s.key === activePoolKey) || null;
  }, [sections, activePoolKey]);

  // Reset to page 1 whenever the expanded pool changes
  useEffect(() => {
    stopsPaging.resetToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on pool switch only
  }, [activePoolKey]);

  // Client-side pagination over the active pool's stops (no API cursor involved)
  useEffect(() => {
    if (!activeSection) return;
    const total = activeSection.stops.length;
    const start = (stopsPaging.currentPage - 1) * stopsPaging.pageSize;
    if (total > 0 && start >= total) {
      stopsPaging.resetToFirstPage();
      return;
    }
    const hasMore = stopsPaging.currentPage * stopsPaging.pageSize < total;
    stopsPaging.applyPageResult({
      total,
      has_more: hasMore,
      next_cursor: hasMore ? `p${stopsPaging.currentPage}` : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyPageResult/resetToFirstPage are stable
  }, [activeSection, stopsPaging.currentPage, stopsPaging.pageSize]);

  const pagedStops = useMemo(() => {
    if (!activeSection) return [];
    const start = (stopsPaging.currentPage - 1) * stopsPaging.pageSize;
    return activeSection.stops.slice(start, start + stopsPaging.pageSize);
  }, [activeSection, stopsPaging.currentPage, stopsPaging.pageSize]);

  if (!admin) {
    return (
      <div className="animate-fade-in-up p-4">
        <p className="text-muted-foreground">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 animate-fade-in-up pb-20" data-testid="route-planning-page">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:justify-between">
        <div>
          <span className="label-overline">Operations</span>
          <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5">Route planning</h1>
        </div>
        <Link href="/provider/settings" className="text-xs text-brand-teal underline-offset-2 hover:underline">
          Kitchen address in Settings
        </Link>
      </div>

      {/* ── MEAL SLOT TABS ── */}
      <div className="flex flex-wrap gap-1.5" data-testid="route-slot-tabs">
        {(["lunch", "dinner"] as MealSlot[]).map((s) => (
          <button
            key={s}
            type="button"
            data-testid={`route-slot-${s}`}
            className={`pill-btn h-8 text-[11px] px-3.5 ${slot === s ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSlot(s)}
          >
            {mealSlotBadgeLabel(s)}
          </button>
        ))}
      </div>

      {/* ── SUMMARY STATS ── */}
      {!loading && (
        <div className="grid grid-cols-4 gap-2" data-testid="route-stats-bar">
          <div className="stat-card !p-2.5 !gap-0.5 !rounded-xl">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total</span>
            <span className="text-lg font-display font-black leading-tight">{totalStops}</span>
          </div>
          <div className="stat-card !p-2.5 !gap-0.5 !rounded-xl">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Assigned</span>
            <span className="text-lg font-display font-black text-secondary leading-tight">{assignedStops}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{totalStops > 0 ? `${Math.round((assignedStops / totalStops) * 100)}%` : ""}</span>
            </span>
          </div>
          <div className="stat-card !p-2.5 !gap-0.5 !rounded-xl">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Unassigned</span>
            <span className="text-lg font-display font-black text-amber-600 leading-tight">{unassignedStops}</span>
          </div>
          <div className="stat-card !p-2.5 !gap-0.5 !rounded-xl">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Issues</span>
            <span className={`text-lg font-display font-black leading-tight ${issueCount > 0 ? "text-red-600" : "text-secondary"}`}>
              {issueCount}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <InlineLoader label="Loading route…" />
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════ */}
          {/* STEPS 1 & 2 — PREPARE + ASSIGN (side by side)          */}
          {/* ══════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* ── Step 1: Prepare ── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">1</span>
              <h2 className="font-display font-bold text-sm">Prepare</h2>
            </div>

            <div className="card-tinted p-3 sm:p-3.5 flex flex-col gap-2.5" data-testid="route-kitchen-card">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-primary" weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs">Kitchen start</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {kitchenLine || "No address set — add one in Settings"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {kitchen.geocode_status === "ok" ? (
                      <CheckCircle size={14} weight="fill" className="text-secondary shrink-0" />
                    ) : (
                      <WarningCircle size={14} weight="fill" className="text-amber-500 shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {kitchen.geocode_status === "ok" ? "Location verified" : kitchen.geocode_status || "Not geocoded"}
                    </span>
                  </div>
                </div>
              </div>

              {!configured && (
                <div
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                  data-testid="route-planning-unconfigured"
                >
                  Address geocoding needs a free OpenRouteService API key (
                  <code className="text-[11px]">OPENROUTESERVICE_API_KEY</code>). Optimize still works when
                  kitchen and customers already have lat/lng. Manual sequences always work.
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  type="button"
                  data-testid="route-geocode-missing"
                  disabled={busy || !configured}
                  onClick={() => void runGeocode()}
                  className="pill-btn btn-outline h-8 text-[11px] px-3.5 gap-1 disabled:opacity-50"
                >
                  <ArrowsClockwise size={14} /> Geocode missing
                </button>
                <button
                  type="button"
                  data-testid="route-optimize"
                  disabled={busy}
                  onClick={() => setShowOptimizeWarning(true)}
                  className="pill-btn btn-primary h-8 text-[11px] px-3.5 gap-1 disabled:opacity-50"
                >
                  <Path size={14} /> Optimize all
                </button>
              </div>
            </div>
          </div>

          {/* ── Step 2: Assign drivers ── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">2</span>
              <h2 className="font-display font-bold text-sm">Assign drivers</h2>
              {drivers.length === 0 && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5" data-testid="route-no-drivers-hint">
                  No drivers — add in Settings
                </span>
              )}
            </div>

            <div className="card-tinted overflow-hidden" data-testid="route-bulk-assign">
              {/* Tab bar */}
              <div className="flex border-b border-brand-border">
                <button
                  type="button"
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium transition-colors duration-150 border-b-2 ${
                    assignTab === "quick"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setAssignTab("quick")}
                  data-testid="route-assign-tab-quick"
                >
                  <span className="flex items-center gap-1">
                    <Funnel size={14} /> Quick assign
                  </span>
                </button>
                <button
                  type="button"
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium transition-colors duration-150 border-b-2 ${
                    assignTab === "sequence"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setAssignTab("sequence")}
                  data-testid="route-assign-tab-sequence"
                >
                  <span className="flex items-center gap-1">
                    <ListNumbers size={14} /> Sequence ranges
                  </span>
                </button>
              </div>

              <div className="p-3 sm:p-3.5">
                {assignTab === "quick" ? (
                  /* ── Quick Assign Tab ── */
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      Select stops below, then assign to a driver.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">
                        {selected.size > 0 ? `${selected.size} stop${selected.size > 1 ? "s" : ""} selected` : "No stops selected"}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <div className="min-w-36 flex-1 sm:flex-none">
                        <SearchableSelect
                          testid="route-assign-driver"
                          value={assignDriverId}
                          onChange={setAssignDriverId}
                          allowEmpty
                          emptyLabel="Unassigned pool"
                          options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                          inputClassName="h-8 rounded-lg border border-brand-border bg-white px-2.5 text-xs"
                          placeholder="Search driver…"
                        />
                      </div>
                      <button
                        type="button"
                        data-testid="route-assign-submit"
                        disabled={busy || selected.size === 0}
                        onClick={() => void assignDriver()}
                        className="pill-btn btn-primary h-8 text-[11px] px-3.5 disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Sequence Ranges Tab ── */
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="text-xs text-muted-foreground shrink-0 font-medium">
                        Source pool
                      </label>
                      <SearchableSelect
                        testid="route-bulk-source"
                        value={bulkSourceKey}
                        onChange={setBulkSourceKey}
                        options={sections.map((sec) => {
                          const span = seqSpan(sec.stops);
                          const hint = span
                            ? `#${span.min}–#${span.max} (${span.counted})`
                            : `${sec.stops.length} stops`;
                          return {
                            value: sec.key,
                            label: `${sec.title} · ${hint}`,
                          };
                        })}
                        inputClassName="h-8 rounded-lg border border-brand-border bg-white px-2.5 text-xs"
                        placeholder="Search pool…"
                      />
                    </div>

                    <div className="flex flex-col gap-2" data-testid="route-bulk-ranges">
                      {bulkRows.map((row, idx) => {
                        const preview = bulkPreviews[idx];
                        return (
                          <div
                            key={row.id}
                            className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-brand-surface/40"
                            data-testid={`route-bulk-row-${idx}`}
                          >
                            <span className="text-xs text-muted-foreground w-10 shrink-0">From</span>
                            <input
                              type="number"
                              min={1}
                              data-testid={`route-bulk-from-${idx}`}
                              className="h-8 w-16 rounded-lg border border-brand-border bg-white px-1.5 text-xs font-mono"
                              value={row.from}
                              placeholder="1"
                              onChange={(e) =>
                                setBulkRows((rows) =>
                                  rows.map((r) => (r.id === row.id ? { ...r, from: e.target.value } : r))
                                )
                              }
                            />
                            <span className="text-xs text-muted-foreground">To</span>
                            <input
                              type="number"
                              min={1}
                              data-testid={`route-bulk-to-${idx}`}
                              className="h-8 w-16 rounded-lg border border-brand-border bg-white px-1.5 text-xs font-mono"
                              value={row.to}
                              placeholder="100"
                              onChange={(e) =>
                                setBulkRows((rows) =>
                                  rows.map((r) => (r.id === row.id ? { ...r, to: e.target.value } : r))
                                )
                              }
                            />
                            <span className="text-xs text-muted-foreground">→</span>
                            <div className="min-w-32 flex-1">
                              <SearchableSelect
                                testid={`route-bulk-target-${idx}`}
                                value={row.driverId}
                                onChange={(driverId) =>
                                  setBulkRows((rows) =>
                                    rows.map((r) => (r.id === row.id ? { ...r, driverId } : r))
                                  )
                                }
                                allowEmpty
                                emptyLabel="Unassigned pool"
                                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                                inputClassName="h-8 rounded-lg border border-brand-border bg-white px-2.5 text-xs"
                                placeholder="Search driver…"
                              />
                            </div>
                            <span
                              className="text-[11px] text-muted-foreground min-w-18"
                              data-testid={`route-bulk-preview-${idx}`}
                            >
                              {preview?.valid ? `${preview.count} stops` : "—"}
                            </span>
                            <button
                              type="button"
                              aria-label="Remove range"
                              data-testid={`route-bulk-remove-${idx}`}
                              disabled={bulkRows.length <= 1}
                              className="p-2 disabled:opacity-30 rounded-lg hover:bg-brand-surface transition-colors duration-150"
                              onClick={() => setBulkRows((rows) => rows.filter((r) => r.id !== row.id))}
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        data-testid="route-bulk-add-range"
                        className="pill-btn btn-outline h-9 text-xs gap-1"
                        onClick={() => setBulkRows((rows) => [...rows, newBulkRow()])}
                      >
                        <Plus size={14} /> Add range
                      </button>
                      <button
                        type="button"
                        data-testid="route-bulk-apply"
                        disabled={busy || bulkTotalPreview === 0}
                        onClick={() => void applyBulkBySequence()}
                        className="pill-btn btn-primary h-9 text-xs disabled:opacity-50"
                      >
                        Apply ranges ({bulkTotalPreview})
                      </button>
                    </div>

                    {drivers.length > 0 && (
                      <div
                        className="border-t border-brand-border pt-4 flex flex-col gap-2.5"
                        data-testid="route-bulk-even-split"
                      >
                        <p className="text-xs font-medium">Even split helper</p>
                        <p className="text-[11px] text-muted-foreground">
                          Divide source sequences{" "}
                          {bulkSourceSpan ? `#${bulkSourceSpan.min}–#${bulkSourceSpan.max}` : "(none)"}{" "}
                          evenly across selected drivers, then review ranges above.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {drivers.map((d) => {
                            const on = evenSplitDriverIds.includes(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                data-testid={`route-bulk-even-driver-${d.id}`}
                                className={`pill-btn h-8 text-[11px] ${on ? "btn-primary" : "btn-outline"}`}
                                onClick={() =>
                                  setEvenSplitDriverIds((ids) =>
                                    on ? ids.filter((x) => x !== d.id) : [...ids, d.id]
                                  )
                                }
                              >
                                {d.name}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          data-testid="route-bulk-even-apply"
                          disabled={!bulkSourceSpan || evenSplitDriverIds.length === 0}
                          onClick={applyEvenSplit}
                          className="pill-btn btn-outline h-9 text-xs self-start disabled:opacity-50"
                        >
                          Fill even ranges
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* end grid */}
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* STEP 3 — REVIEW ROUTES                                */}
          {/* ══════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-2" data-testid="route-stops-list">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">3</span>
              <h2 className="font-display font-bold text-sm">Review routes</h2>
            </div>

            {stops.length === 0 ? (
              <p className="card-tinted p-4 text-sm text-muted-foreground text-center">
                No customers on this meal slot.
              </p>
            ) : (
              <>
                {/* Pool summary cards */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory" data-testid="route-pool-cards">
                  {sections.map((section) => {
                    const span = seqSpan(section.stops);
                    const isUnassigned = section.driverId === null;
                    const isActive = activePoolKey === section.key;
                    return (
                      <button
                        key={section.key}
                        type="button"
                        data-testid={`route-pool-card-${section.key}`}
                        className={`snap-start shrink-0 w-36 sm:w-44 rounded-xl border-2 p-2.5 flex flex-col gap-1 text-left transition-all duration-200 ${
                          isActive
                            ? "border-primary bg-primary/5 shadow-md"
                            : isUnassigned && section.stops.length > 0
                              ? "border-amber-300 bg-amber-50 hover:shadow-md hover:-translate-y-0.5"
                              : "border-brand-border bg-white hover:shadow-md hover:-translate-y-0.5"
                        }`}
                        onClick={() => setActivePoolKey(isActive ? null : section.key)}
                      >
                        <div className="flex items-center gap-1.5">
                          {isUnassigned ? (
                            <Package size={14} className="text-amber-600 shrink-0" weight="fill" />
                          ) : (
                            <CarSimple size={14} className="text-primary shrink-0" weight="fill" />
                          )}
                          <span className="font-medium text-xs truncate">{section.title}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-display font-black leading-tight">{section.stops.length}</span>
                          <span className="text-[10px] text-muted-foreground">stops</span>
                        </div>
                        {span ? (
                          <span
                            className="font-mono text-[11px] text-muted-foreground"
                            data-testid={`route-pool-span-${section.key}`}
                          >
                            #{span.min}–#{span.max}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No sequence</span>
                        )}
                        {isUnassigned && section.stops.length > 0 && (
                          <span className="text-[10px] text-amber-700 font-medium leading-tight">
                            Master pool
                          </span>
                        )}
                        {/* Maps link per pool */}
                        <a
                          data-testid={`route-pool-maps-${section.key}`}
                          className="text-[10px] text-brand-teal flex items-center gap-0.5 hover:underline underline-offset-2"
                          href={mapsUrlForStops(kitchenLine || "", section.stops.filter((s) => s.delivery_sequence != null))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <NavigationArrow size={10} /> Maps
                        </a>
                      </button>
                    );
                  })}
                </div>

                {/* Hidden Maps pool selector for backward compat */}
                <select
                  data-testid="route-maps-pool"
                  className="sr-only"
                  value={mapsPoolKey}
                  onChange={(e) => setMapsPoolKey(e.target.value)}
                >
                  {sections.map((sec) => (
                    <option key={sec.key} value={sec.key}>
                      Maps: {sec.title} ({sec.stops.length})
                    </option>
                  ))}
                </select>
                <a
                  data-testid="route-open-maps"
                  className="sr-only"
                  href={mapsUrlForStops(kitchenLine || "", mapsStops)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Maps
                </a>

                {/* Expanded pool stop list */}
                {activeSection ? (
                  <div
                    className="card-tinted overflow-hidden"
                    data-testid={`route-pool-${activeSection.key}`}
                  >
                    {/* Pool header */}
                    <div className="px-3 py-2 border-b border-brand-border flex flex-wrap items-center gap-1.5 text-xs bg-brand-surface/40">
                      <input
                        type="checkbox"
                        data-testid={`route-select-pool-${activeSection.key}`}
                        checked={
                          activeSection.stops.length > 0 &&
                          activeSection.stops.every((s) => selected.has(s.id))
                        }
                        disabled={activeSection.stops.length === 0}
                        onChange={() => toggleSection(activeSection.stops)}
                        className="rounded border-brand-border"
                      />
                      <span className="font-medium text-xs">
                        {activeSection.title}{" "}
                        <span className="text-muted-foreground font-normal">({activeSection.stops.length})</span>
                      </span>
                      {(() => {
                        const span = seqSpan(activeSection.stops);
                        return span ? (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            #{span.min}–#{span.max}
                          </span>
                        ) : null;
                      })()}
                      {autoCollapse && activeSection.stops.length > COLLAPSE_THRESHOLD ? (
                        <button
                          type="button"
                          data-testid={`route-pool-toggle-${activeSection.key}`}
                          className="text-xs text-brand-teal underline-offset-2 hover:underline ml-auto"
                          onClick={() => togglePoolExpanded(activeSection.key)}
                        >
                          {expandedPools.has(activeSection.key) || activeSection.stops.length <= COLLAPSE_THRESHOLD
                            ? "Hide stops"
                            : "Show stops"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-150"
                        onClick={() => setActivePoolKey(null)}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Pool stops */}
                    {activeSection.stops.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">No stops in this pool.</p>
                    ) : autoCollapse &&
                      activeSection.stops.length > COLLAPSE_THRESHOLD &&
                      !expandedPools.has(activeSection.key) ? (
                      <p
                        className="p-3 text-xs text-muted-foreground"
                        data-testid={`route-pool-collapsed-${activeSection.key}`}
                      >
                        {activeSection.stops.length} stops collapsed — use Assign by sequence, or Show stops.
                      </p>
                    ) : (
                      <ul className="divide-y divide-brand-border/60">
                        {pagedStops.map((s, localIdx) => {
                          const idx = (stopsPaging.currentPage - 1) * stopsPaging.pageSize + localIdx;
                          const geoOk = s.geocode_status === "ok";
                          const geoFail = s.geocode_status === "failed";
                          const needsPlace = s.delivery_sequence == null || !geoOk;
                          return (
                            <li
                              key={s.id}
                              className="flex items-center gap-2 px-3 py-1.5 hover:bg-brand-surface/50 transition-colors duration-150"
                              data-testid={`route-stop-${s.id}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(s.id)}
                                onChange={() => toggle(s.id)}
                                className="rounded border-brand-border shrink-0"
                                data-testid={`route-check-${s.id}`}
                              />

                              {/* Sequence number */}
                              <span className="font-mono text-[11px] text-muted-foreground w-7 text-right shrink-0">
                                #{s.delivery_sequence ?? "—"}
                              </span>

                              {/* Geocode status dot */}
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  geoOk ? "bg-secondary" : geoFail ? "bg-red-500" : "bg-amber-400"
                                }`}
                                title={geoOk ? "Geocoded" : geoFail ? "Geocode failed" : "Not geocoded"}
                              />

                              {/* Name + address */}
                              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
                                <span className="font-medium text-xs truncate">{s.name}</span>
                                <span className="text-[11px] text-muted-foreground truncate">{stopAddress(s) || "No address"}</span>
                              </div>

                              {/* Place button */}
                              {needsPlace && configured && (
                                <button
                                  type="button"
                                  data-testid={`route-place-${s.id}`}
                                  disabled={busy}
                                  className="pill-btn btn-outline h-6 text-[10px] px-2 shrink-0 disabled:opacity-50"
                                  onClick={() => void placeOne(s.id, activeSection.driverId)}
                                >
                                  Place
                                </button>
                              )}

                              {/* Reorder buttons */}
                              <div className="flex flex-col shrink-0">
                                <button
                                  type="button"
                                  aria-label="Move up"
                                  disabled={busy || idx === 0}
                                  className="p-0.5 disabled:opacity-30 hover:text-primary transition-colors duration-150"
                                  onClick={() => void moveStopInPool(activeSection, idx, -1)}
                                >
                                  <CaretUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Move down"
                                  disabled={busy || idx === activeSection.stops.length - 1}
                                  className="p-0.5 disabled:opacity-30 hover:text-primary transition-colors duration-150"
                                  onClick={() => void moveStopInPool(activeSection, idx, 1)}
                                >
                                  <CaretDown size={12} />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {activeSection.stops.length > 0 ? (
                      <div className="px-3 py-2 border-t border-brand-border">
                        <CursorPaginationBar
                          currentPage={stopsPaging.currentPage}
                          totalPages={stopsPaging.totalPages}
                          from={stopsPaging.from}
                          to={stopsPaging.to}
                          total={stopsPaging.total}
                          pageSize={stopsPaging.pageSize}
                          hasMore={stopsPaging.hasMore}
                          onPrev={() => stopsPaging.goPrev()}
                          onNext={() => stopsPaging.goNext()}
                          onPageSizeChange={(size: AllowedPageSize) => stopsPaging.setPageSize(size)}
                          testidPrefix={`route-pool-${activeSection.key}-pagination`}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* Hint when no pool is expanded */
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    <CaretRight size={14} className="inline mr-0.5 -mt-0.5" />
                    Click a driver card above to view stops
                  </div>
                )}

                {/* Render hidden pool containers for other data-testid compat */}
                {sections.map((section) => {
                  if (section.key === activeSection?.key) return null;
                  return (
                    <div key={section.key} className="sr-only" data-testid={`route-pool-${section.key}`}>
                      <input
                        type="checkbox"
                        data-testid={`route-select-pool-${section.key}`}
                        readOnly
                        checked={
                          section.stops.length > 0 &&
                          section.stops.every((s) => selected.has(s.id))
                        }
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* FLOATING BOTTOM ASSIGN BAR                            */}
      {/* ══════════════════════════════════════════════════════ */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-brand-border/60 px-3 py-2 flex items-center justify-center gap-2 animate-fade-in-up"
          data-testid="route-assign-bar"
        >
          <div className="flex flex-wrap items-center gap-2 max-w-2xl w-full justify-center">
            <UserCircle size={16} className="text-primary shrink-0" />
            <span className="text-xs font-medium">{selected.size} selected</span>
            <span className="text-xs text-muted-foreground">→</span>
            <div className="min-w-36 flex-1 sm:flex-none max-w-xs">
              <SearchableSelect
                testid="route-assign-driver"
                value={assignDriverId}
                onChange={setAssignDriverId}
                allowEmpty
                emptyLabel="Unassigned pool"
                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                inputClassName="h-8 rounded-lg border border-brand-border bg-white px-2.5 text-xs"
                placeholder="Search driver…"
              />
            </div>
            <button
              type="button"
              data-testid="route-assign-submit"
              disabled={busy}
              onClick={() => void assignDriver()}
              className="pill-btn btn-primary h-8 text-[11px] px-3.5 disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* OPTIMIZE WARNING MODAL                                */}
      {/* ══════════════════════════════════════════════════════ */}
      {showOptimizeWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-amber-600">
              <WarningCircle size={24} weight="fill" />
              <h3 className="font-bold text-lg text-foreground">Optimize Routes</h3>
            </div>
            <div className="text-sm text-muted-foreground flex flex-col gap-2">
              <p>
                All routes will be marked as unassigned. All driver linkage will be reset.
              </p>
              <p>
                You will need to assign all routes to a driver again. Are you sure you want to proceed?
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="pill-btn btn-outline h-9 text-xs px-4"
                onClick={() => setShowOptimizeWarning(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill-btn bg-amber-600 text-white hover:bg-amber-700 h-9 text-xs px-4 disabled:opacity-50"
                onClick={() => {
                  setShowOptimizeWarning(false);
                  void runOptimize();
                }}
                disabled={busy}
              >
                Yes, optimize all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
