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
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { mealSlotBadgeLabel } from "@/lib/mealSlots";
import { InlineLoader } from "@/components/loaders";

type MealSlot = "uncategorized" | "lunch" | "dinner";

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
  const [slot, setSlot] = useState<MealSlot>("uncategorized");
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
  const configured = !!plan?.routing_configured;
  const autoCollapse = stops.length > COLLAPSE_THRESHOLD;

  if (!admin) {
    return (
      <div className="animate-fade-in-up p-4">
        <p className="text-muted-foreground">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 animate-fade-in-up" data-testid="route-planning-page">
      <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:justify-between">
        <div>
          <span className="label-overline">Operations</span>
          <h1 className="font-display font-black text-2xl sm:text-3xl mt-0.5">Route planning</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Optimize the unassigned pool, then assign stops to drivers by sequence ranges or selection.
            Assignments append to each driver&apos;s route.
          </p>
        </div>
        <Link href="/provider/settings" className="text-sm text-brand-teal underline-offset-2 hover:underline">
          Kitchen address in Settings
        </Link>
      </div>

      {!configured && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          data-testid="route-planning-unconfigured"
        >
          Route optimization needs a free OpenRouteService API key (
          <code className="text-xs">OPENROUTESERVICE_API_KEY</code>). Manual sequences still work.
        </div>
      )}

      <div className="flex flex-wrap gap-2" data-testid="route-slot-tabs">
        {(["uncategorized", "lunch", "dinner"] as MealSlot[]).map((s) => (
          <button
            key={s}
            type="button"
            data-testid={`route-slot-${s}`}
            className={`pill-btn h-9 text-xs ${slot === s ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSlot(s)}
          >
            {mealSlotBadgeLabel(s)}
          </button>
        ))}
      </div>

      <div className="card-tinted p-4 sm:p-5 flex flex-col gap-3" data-testid="route-kitchen-card">
        <div className="flex items-start gap-2">
          <MapPin size={20} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm">Kitchen start</p>
            <p className="text-sm text-muted-foreground truncate">
              {kitchen.address || "No address set — add one in Settings"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Geocode: {kitchen.geocode_status || "—"}
              {kitchen.lat != null && kitchen.lng != null
                ? ` · ${Number(kitchen.lat).toFixed(4)}, ${Number(kitchen.lng).toFixed(4)}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          data-testid="route-geocode-missing"
          disabled={busy || !configured}
          onClick={() => void runGeocode()}
          className="pill-btn btn-outline h-10 text-xs gap-1.5 disabled:opacity-50"
        >
          <ArrowsClockwise size={16} /> Geocode missing
        </button>
        <button
          type="button"
          data-testid="route-optimize"
          disabled={busy || !configured}
          onClick={() => void runOptimize()}
          className="pill-btn btn-primary h-10 text-xs gap-1.5 disabled:opacity-50"
        >
          <Path size={16} /> Optimize all
        </button>
        <select
          data-testid="route-maps-pool"
          className="h-10 rounded-xl border border-brand-border bg-white px-3 text-sm"
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
          className="pill-btn btn-outline h-10 text-xs gap-1.5 inline-flex items-center"
          href={mapsUrlForStops(kitchen.address || "", mapsStops)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin size={16} /> Open in Maps
        </a>
      </div>

      <div className="card-tinted p-4 sm:p-5 flex flex-col gap-3" data-testid="route-bulk-assign">
        <div>
          <p className="font-medium text-sm flex items-center gap-2">
            <UserCircle size={18} /> Assign by sequence
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Split or amend large pools (e.g. #1–100 → Driver A). Ranges use stop numbers in the source
            pool; assignments append to the target route.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0" htmlFor="route-bulk-source">
            Source pool
          </label>
          <select
            id="route-bulk-source"
            data-testid="route-bulk-source"
            className="h-10 rounded-xl border border-brand-border bg-white px-3 text-sm flex-1 min-w-0"
            value={bulkSourceKey}
            onChange={(e) => setBulkSourceKey(e.target.value)}
          >
            {sections.map((sec) => {
              const span = seqSpan(sec.stops);
              const hint = span
                ? `#${span.min}–#${span.max} (${span.counted})`
                : `${sec.stops.length} stops`;
              return (
                <option key={sec.key} value={sec.key}>
                  {sec.title} · {hint}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-col gap-2" data-testid="route-bulk-ranges">
          {bulkRows.map((row, idx) => {
            const preview = bulkPreviews[idx];
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-2"
                data-testid={`route-bulk-row-${idx}`}
              >
                <span className="text-xs text-muted-foreground w-10 shrink-0">From</span>
                <input
                  type="number"
                  min={1}
                  data-testid={`route-bulk-from-${idx}`}
                  className="h-10 w-20 rounded-xl border border-brand-border bg-white px-2 text-sm font-mono"
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
                  className="h-10 w-20 rounded-xl border border-brand-border bg-white px-2 text-sm font-mono"
                  value={row.to}
                  placeholder="100"
                  onChange={(e) =>
                    setBulkRows((rows) =>
                      rows.map((r) => (r.id === row.id ? { ...r, to: e.target.value } : r))
                    )
                  }
                />
                <span className="text-xs text-muted-foreground">→</span>
                <select
                  data-testid={`route-bulk-target-${idx}`}
                  className="h-10 rounded-xl border border-brand-border bg-white px-3 text-sm min-w-36 flex-1"
                  value={row.driverId}
                  onChange={(e) =>
                    setBulkRows((rows) =>
                      rows.map((r) => (r.id === row.id ? { ...r, driverId: e.target.value } : r))
                    )
                  }
                >
                  <option value="">Unassigned pool</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
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
                  className="p-2 disabled:opacity-30"
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
            className="border-t border-brand-border pt-3 flex flex-col gap-2"
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

        {drivers.length === 0 ? (
          <span className="text-xs text-amber-800" data-testid="route-no-drivers-hint">
            No drivers yet — add staff with role Driver in Settings.
          </span>
        ) : null}
      </div>

      {selected.size > 0 && (
        <div
          className="card-tinted p-3 sm:p-4 flex flex-wrap items-center gap-2 sticky top-14 z-20"
          data-testid="route-assign-bar"
        >
          <UserCircle size={18} />
          <span className="text-sm font-medium">{selected.size} selected</span>
          <span className="text-xs text-muted-foreground">Assign to</span>
          <select
            data-testid="route-assign-driver"
            className="h-10 rounded-xl border border-brand-border bg-white px-3 text-sm min-w-40"
            value={assignDriverId}
            onChange={(e) => setAssignDriverId(e.target.value)}
          >
            <option value="">Unassigned pool</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-testid="route-assign-submit"
            disabled={busy}
            onClick={() => void assignDriver()}
            className="pill-btn btn-primary h-10 text-xs disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      )}

      {loading ? (
        <InlineLoader label="Loading route…" />
      ) : (
        <div className="flex flex-col gap-3" data-testid="route-stops-list">
          <div className="text-xs text-muted-foreground px-1">
            {stops.length} stops · {(plan?.geocode_failed || []).length} geocode failed ·{" "}
            {(plan?.unplaced || []).length} need place
          </div>
          {stops.length === 0 ? (
            <p className="card-tinted p-4 text-sm text-muted-foreground">No customers on this meal slot.</p>
          ) : (
            sections.map((section) => {
              const ids = section.stops.map((s) => s.id);
              const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
              const span = seqSpan(section.stops);
              const showList =
                section.stops.length === 0 ||
                !autoCollapse ||
                expandedPools.has(section.key) ||
                section.stops.length <= COLLAPSE_THRESHOLD;
              return (
                <div
                  key={section.key}
                  className="card-tinted overflow-hidden"
                  data-testid={`route-pool-${section.key}`}
                >
                  <div className="px-3 sm:px-4 py-2.5 border-b border-brand-border flex flex-wrap items-center gap-2 text-sm bg-brand-surface/40">
                    <input
                      type="checkbox"
                      data-testid={`route-select-pool-${section.key}`}
                      checked={allSelected}
                      disabled={section.stops.length === 0}
                      onChange={() => toggleSection(section.stops)}
                      className="rounded border-brand-border"
                    />
                    <span className="font-medium">
                      {section.title}{" "}
                      <span className="text-muted-foreground font-normal">({section.stops.length})</span>
                    </span>
                    {span ? (
                      <span
                        className="font-mono text-[11px] text-muted-foreground"
                        data-testid={`route-pool-span-${section.key}`}
                      >
                        #{span.min}–#{span.max}
                      </span>
                    ) : null}
                    {section.driverId === null ? (
                      <span className="text-[11px] text-amber-800">Master pool · Optimize writes here</span>
                    ) : null}
                    {autoCollapse && section.stops.length > COLLAPSE_THRESHOLD ? (
                      <button
                        type="button"
                        data-testid={`route-pool-toggle-${section.key}`}
                        className="text-xs text-brand-teal underline-offset-2 hover:underline ml-auto"
                        onClick={() => togglePoolExpanded(section.key)}
                      >
                        {showList ? "Hide stops" : "Show stops"}
                      </button>
                    ) : null}
                  </div>
                  {section.stops.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No stops in this pool.</p>
                  ) : !showList ? (
                    <p className="p-4 text-sm text-muted-foreground" data-testid={`route-pool-collapsed-${section.key}`}>
                      {section.stops.length} stops collapsed — use Assign by sequence, or Show stops.
                    </p>
                  ) : (
                    <ul className="divide-y divide-brand-border">
                      {section.stops.map((s, idx) => {
                        const geoOk = s.geocode_status === "ok";
                        const needsPlace = s.delivery_sequence == null || !geoOk;
                        return (
                          <li
                            key={s.id}
                            className="flex items-stretch gap-2 p-3 sm:px-4 hover:bg-brand-surface/60"
                            data-testid={`route-stop-${s.id}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(s.id)}
                              onChange={() => toggle(s.id)}
                              className="mt-1 rounded border-brand-border shrink-0"
                              data-testid={`route-check-${s.id}`}
                            />
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                aria-label="Move up"
                                disabled={busy || idx === 0}
                                className="p-0.5 disabled:opacity-30"
                                onClick={() => void moveStopInPool(section, idx, -1)}
                              >
                                <CaretUp size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label="Move down"
                                disabled={busy || idx === section.stops.length - 1}
                                className="p-0.5 disabled:opacity-30"
                                onClick={() => void moveStopInPool(section, idx, 1)}
                              >
                                <CaretDown size={16} />
                              </button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="font-mono text-xs text-muted-foreground">
                                  #{s.delivery_sequence ?? "—"}
                                </span>
                                <span className="font-medium text-sm truncate">{s.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{stopAddress(s) || "No address"}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {geoOk
                                  ? s.lat != null && s.lng != null
                                    ? `Geocoded · ${Number(s.lat).toFixed(4)}, ${Number(s.lng).toFixed(4)}`
                                    : "Geocoded"
                                  : s.geocode_status === "failed"
                                    ? "Geocode failed"
                                    : "Not geocoded"}
                              </p>
                            </div>
                            {needsPlace && configured && (
                              <button
                                type="button"
                                data-testid={`route-place-${s.id}`}
                                disabled={busy}
                                className="pill-btn btn-outline h-8 text-[11px] self-center shrink-0 disabled:opacity-50"
                                onClick={() => void placeOne(s.id, section.driverId)}
                              >
                                Place
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
