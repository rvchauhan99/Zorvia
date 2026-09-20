"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import PlanMode from "./PlanMode";
import StartSheet from "./StartSheet";
import AssignRangeSheet from "./AssignRangeSheet";
import OptimizeSheet from "./OptimizeSheet";
import AppSheet from "@/components/AppSheet";
import type { RoutePolyline } from "./RouteMap";
import type {
  BulkRangeRow,
  CityChip,
  Driver,
  MealSlot,
  PoolSection,
  RoutePlan,
  StartSheetState,
  Stop,
} from "./types";
import {
  buildSections,
  evenSplitRanges,
  kitchenAddressLine,
  largestPoolKey,
  newBulkRow,
  seqSpan,
  todayIsoLocal,
} from "./utils";

export default function RoutePlanningPage() {
  const router = useRouter();
  const { session } = useAuth();
  const admin = canMutateAdmin(session);
  const [slot, setSlot] = useState<MealSlot>("dinner");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [bulkSourceKey, setBulkSourceKey] = useState("unassigned");
  const [bulkRows, setBulkRows] = useState<BulkRangeRow[]>([newBulkRow()]);
  const [evenSplitDriverIds, setEvenSplitDriverIds] = useState<string[]>([]);
  const [showOptimizeSheet, setShowOptimizeSheet] = useState(false);
  const [showRangeSheet, setShowRangeSheet] = useState(false);
  const [bestFitConfirm, setBestFitConfirm] = useState<
    null | { mode: "one"; stop: Stop } | { mode: "all"; count: number; ids: string[] }
  >(null);
  const [selectedCity, setSelectedCity] = useState("all");
  const [planningDate, setPlanningDate] = useState(todayIsoLocal);
  const [startSheet, setStartSheet] = useState<StartSheetState | null>(null);
  const [listFilter, setListFilter] = useState("all");
  const [roadPolylines, setRoadPolylines] = useState<RoutePolyline[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        meal_slot: slot,
        planning_date: planningDate,
        city: "all",
      };
      const { data } = await api.get<RoutePlan>("/route-planning", { params });
      setPlan(data);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load route plan");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [slot, planningDate]);

  const loadGeometry = useCallback(async () => {
    try {
      const { data } = await api.post<{
        polylines?: {
          driver_id: string | null;
          coordinates: [number, number][];
          method?: string;
        }[];
      }>("/route-planning/route-geometry", {
        meal_slot: slot,
        city: selectedCity && selectedCity !== "all" ? selectedCity : undefined,
      });
      const lines = (data?.polylines || []).map((p) => ({
        driver_id: p.driver_id ?? null,
        coordinates: (p.coordinates || []) as [number, number][],
        method: p.method,
      }));
      setRoadPolylines(lines);
    } catch {
      setRoadPolylines([]);
    }
  }, [slot, selectedCity]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!plan) return;
    void loadGeometry();
  }, [plan, loadGeometry]);

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
    () => (Array.isArray(plan?.stops) ? plan!.stops! : []),
    [plan]
  );

  const displayedStops: Stop[] = useMemo(() => {
    if (!selectedCity || selectedCity === "all") return stops;
    const key = selectedCity.trim().toLowerCase();
    return stops.filter((s) => {
      const c0 = (s.city || "").trim().toLowerCase();
      const c1 = (s.city_key || "").trim().toLowerCase();
      return c0 === key || c1 === key;
    });
  }, [stops, selectedCity]);

  const sections: PoolSection[] = useMemo(
    () => buildSections(displayedStops, drivers),
    [displayedStops, drivers]
  );

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

  const runOptimize = useCallback(
    async (opts?: {
      quiet?: boolean
      /** When provided (including null), overrides top-bar city. null = all cities. */
      city?: string | null
      driverIds?: string[]
      unassignedOnly?: boolean
      fullRebalance?: boolean
    }) => {
      if (!admin) return false
      setBusy(true)
      try {
        let cityArg: string | undefined
        if (opts?.fullRebalance || opts?.unassignedOnly) {
          cityArg = undefined
        } else if (opts && "city" in opts) {
          cityArg = opts.city || undefined
        } else {
          cityArg =
            selectedCity && selectedCity !== "all" ? selectedCity : undefined
        }
        const body: Record<string, unknown> = {
          meal_slot: slot,
          planning_date: planningDate,
        }
        if (cityArg) body.city = cityArg
        if (opts?.fullRebalance) {
          body.full_rebalance = true
        } else if (opts?.unassignedOnly) {
          body.unassigned_only = true
        } else if (opts?.driverIds?.length) {
          body.driver_ids = opts.driverIds
        }
        const { data } = await api.post("/route-planning/optimize", body, { timeout: 0 })
        if (opts?.fullRebalance) {
          const n = data?.assigned ?? data?.ordered_ids?.length ?? 0
          const d = (data?.drivers || []).length || (data?.ranges || []).length
          toast.success(`Rebalanced ${n} stops across ${d} driver${d === 1 ? "" : "s"}`)
        } else {
          const n = data?.ordered_ids?.length ?? 0
          const skip = data?.skipped?.length ? ` (${data.skipped.length} skipped)` : ""
          toast.success(
            opts?.quiet ? `Route optimized${skip}` : `Optimized ${n} stops${skip}`
          )
        }
        await load()
        return true
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Optimize failed")
        return false
      } finally {
        setBusy(false)
      }
    },
    [admin, slot, planningDate, selectedCity, load]
  )

  const runGeocode = async () => {
    if (!admin) return;
    setBusy(true);
    try {
      const { data } = await api.post("/route-planning/geocode-missing", null, {
        params: {
          meal_slot: slot,
          city: selectedCity && selectedCity !== "all" ? selectedCity : undefined,
          limit: 40,
        },
        timeout: 0,
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

  const openStartSheet = (stop: Stop) => {
    if (!selectedCity || selectedCity === "all") {
      toast.error("Select a city first to set a start point");
      return;
    }
    setStartSheet({
      customerId: stop.id,
      customerName: stop.name || stop.id,
      mode: "temporary",
      duration: "today",
      days: 3,
    });
  };

  const saveStartFromSheet = async () => {
    if (!startSheet || !selectedCity || selectedCity === "all") return;
    setBusy(true);
    try {
      if (startSheet.mode === "default") {
        await api
          .delete("/route-planning/city-start-override", { params: { city: selectedCity } })
          .catch(() => undefined);
        await api.post("/route-planning/city-start", {
          city: selectedCity,
          type: "customer",
          customer_id: startSheet.customerId,
        });
        toast.success("Default start saved (temporary cleared) — optimizing…");
      } else {
        await api.post("/route-planning/city-start-override", {
          city: selectedCity,
          customer_id: startSheet.customerId,
          mode: startSheet.duration,
          days: startSheet.duration === "days" ? startSheet.days : undefined,
          planning_date: planningDate,
        });
        toast.success(
          startSheet.duration === "today"
            ? "Temporary start set — optimizing route…"
            : `Temporary start set for ${startSheet.days} days — optimizing…`
        );
      }
      setStartSheet(null);
      setBusy(false);
      await runOptimize({ quiet: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Could not set start point");
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
      toast.success("Placed and fitted into route");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Insert failed");
    } finally {
      setBusy(false);
    }
  };

  const runAutoPlace = async (customerIds: string[]) => {
    if (!admin || !customerIds.length) return;
    setBusy(true);
    try {
      const { data } = await api.post<{
        placed?: number;
        skipped?: number;
      }>("/route-planning/auto-place", {
        meal_slot: slot,
        customer_ids: customerIds,
        planning_date: planningDate,
      });
      const placed = data?.placed ?? 0;
      const skipped = data?.skipped ?? 0;
      toast.success(`Placed ${placed} · skipped ${skipped}`);
      setBestFitConfirm(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Best fit failed");
    } finally {
      setBusy(false);
    }
  };

  const assignDriver = async (customerIds?: string[], driverId?: string | null) => {
    if (!admin) return;
    const ids = customerIds ?? Array.from(selected);
    if (!ids.length) return;
    const target = driverId !== undefined ? driverId : assignDriverId || null;
    setBusy(true);
    try {
      await api.post("/route-planning/assign-driver", {
        customer_ids: ids,
        driver_id: target,
        meal_slot: slot,
        planning_date: planningDate,
      });
      const n = ids.length;
      if (!target) {
        toast.success(`Moved ${n} stop${n === 1 ? "" : "s"} to Unassigned`);
      } else {
        const name = drivers.find((d) => d.id === target)?.name || "driver";
        toast.success(`Assigned ${n} stop${n === 1 ? "" : "s"} to ${name} (route re-optimized)`);
      }
      setSelected(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Assign failed");
    } finally {
      setBusy(false);
    }
  };

  const applyBulkBySequence = async () => {
    if (!admin) return;
    const source = sections.find((s) => s.key === bulkSourceKey) || sections[0];
    const ranges = bulkRows
      .map((row) => {
        const from = parseInt(row.from, 10);
        const to = parseInt(row.to, 10);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || from < 1) return null;
        const count = (source?.stops || []).filter((s) => {
          const seq = s.delivery_sequence;
          return seq != null && seq >= from && seq <= to;
        }).length;
        if (count === 0) return null;
        return {
          sequence_from: from,
          sequence_to: to,
          driver_id: row.driverId || null,
        };
      })
      .filter(Boolean) as {
      sequence_from: number;
      sequence_to: number;
      driver_id: string | null;
    }[];

    if (!ranges.length) {
      toast.error("Add at least one valid range that matches stops");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/route-planning/assign-by-sequence", {
        meal_slot: slot,
        source_driver_id: source?.driverId ?? null,
        ranges,
        planning_date: planningDate,
      });
      const parts = (data?.by_range || [])
        .map((r: any) => `#${r.sequence_from}–${r.sequence_to}: ${r.count}`)
        .join(" · ");
      toast.success(`Assigned ${data?.assigned ?? 0} stops` + (parts ? ` (${parts})` : ""));
      setBulkRows([newBulkRow()]);
      setShowRangeSheet(false);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Bulk assign failed");
    } finally {
      setBusy(false);
    }
  };

  const applyEvenSplit = () => {
    const source = sections.find((s) => s.key === bulkSourceKey) || sections[0];
    const span = source ? seqSpan(source.stops) : null;
    if (!span || evenSplitDriverIds.length === 0) {
      toast.error("Pick at least one driver and a source pool with sequences");
      return;
    }
    const split = evenSplitRanges(span.min, span.max, evenSplitDriverIds);
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

  const openRangeSheet = useCallback(() => {
    setBulkSourceKey(largestPoolKey(sections));
    setBulkRows([newBulkRow()]);
    setEvenSplitDriverIds([]);
    setShowRangeSheet(true);
  }, [sections]);

  const handleRangeSheetOpened = useCallback(() => {
    // Re-assert smart source if sections loaded after open click
    setBulkSourceKey((prev) => {
      const stillValid = sections.some((s) => s.key === prev && s.stops.length > 0);
      if (stillValid) return prev;
      return largestPoolKey(sections);
    });
  }, [sections]);

  const reorderPool = async (section: PoolSection, orderedIds: string[]) => {
    if (!admin) return;
    setBusy(true);
    try {
      await api.post("/route-planning/reorder", {
        meal_slot: slot,
        ordered_ids: orderedIds,
        driver_id: section.driverId,
        planning_date: planningDate,
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
  const effectiveStart = plan?.effective_start || null;
  const activeOverride = plan?.active_override || null;
  const cities: CityChip[] = Array.isArray(plan?.cities) ? plan.cities : [];
  const originLine = (effectiveStart?.label as string | undefined) || kitchenLine || "";
  const configured = !!plan?.routing_configured;

  if (!admin) {
    return (
      <div className="animate-fade-in-up p-4">
        <p className="text-muted-foreground">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0" data-testid="route-planning-page">
      <PlanMode
        loading={loading}
        busy={busy}
        slot={slot}
        planningDate={planningDate}
        cities={cities}
        selectedCity={selectedCity}
        stops={displayedStops}
        sections={sections}
        drivers={drivers}
        kitchen={kitchen}
        effectiveStart={effectiveStart}
        activeOverride={activeOverride}
        routingConfigured={configured}
        originLine={originLine}
        selected={selected}
        assignDriverId={assignDriverId}
        listFilter={listFilter}
        roadPolylines={roadPolylines}
        onSlotChange={setSlot}
        onPlanningDateChange={setPlanningDate}
        onSelectedCityChange={setSelectedCity}
        onListFilterChange={setListFilter}
        onToggleStop={toggle}
        onToggleSection={toggleSection}
        onClearSelection={() => setSelected(new Set())}
        onAssignDriverIdChange={setAssignDriverId}
        onAssign={() => void assignDriver()}
        onAssignUnassigned={() => void assignDriver(undefined, null)}
        onOpenRange={openRangeSheet}
        onGeocode={() => void runGeocode()}
        onOptimize={() => setShowOptimizeSheet(true)}
        onReorder={(section, ids) => void reorderPool(section, ids)}
        onReassign={(ids, driverId) => void assignDriver(ids, driverId)}
        onOpenStart={openStartSheet}
        onPlace={(stop) => void placeOne(stop.id, stop.driver_id || null)}
        onBestFit={(stop) => setBestFitConfirm({ mode: "one", stop })}
        onBestFitAllUnassigned={() => {
          const open = displayedStops.filter((s) => !s.driver_id);
          if (!open.length) return;
          setBestFitConfirm({
            mode: "all",
            count: open.length,
            ids: open.map((s) => s.id),
          });
        }}
        onMoveDriver={(stop, driverId) => void assignDriver([stop.id], driverId)}
        onExit={() => router.push("/provider/deliveries")}
      />

      <AppSheet
        open={!!bestFitConfirm}
        onClose={() => {
          if (!busy) setBestFitConfirm(null);
        }}
        title={
          bestFitConfirm?.mode === "all"
            ? "Best fit all unassigned?"
            : "Best fit this stop?"
        }
        size="md"
        footer={(
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setBestFitConfirm(null)}
              className="pill-btn btn-outline flex-1 h-11 cursor-pointer disabled:opacity-50"
              data-testid="route-best-fit-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !bestFitConfirm}
              onClick={() => {
                if (!bestFitConfirm) return;
                const ids =
                  bestFitConfirm.mode === "all"
                    ? bestFitConfirm.ids
                    : [bestFitConfirm.stop.id];
                void runAutoPlace(ids);
              }}
              className="pill-btn btn-secondary flex-1 h-11 cursor-pointer disabled:opacity-50"
              data-testid="route-best-fit-confirm"
            >
              {busy ? "Placing…" : "Confirm & place"}
            </button>
          </div>
        )}
      >
        {bestFitConfirm?.mode === "all" ? (
          <p className="text-sm text-muted-foreground">
            Best-fit{" "}
            <span className="font-semibold text-foreground">{bestFitConfirm.count}</span>{" "}
            unassigned stops into driver routes? Order may change as each stop is placed.
          </p>
        ) : bestFitConfirm?.mode === "one" ? (
          <p className="text-sm text-muted-foreground">
            Place{" "}
            <span className="font-semibold text-foreground">
              {bestFitConfirm.stop.name || "this stop"}
            </span>{" "}
            into the best driver route?
          </p>
        ) : null}
      </AppSheet>

      <OptimizeSheet
        open={showOptimizeSheet}
        city={selectedCity || "all"}
        busy={busy}
        drivers={drivers}
        stops={displayedStops}
        selected={selected}
        onClose={() => setShowOptimizeSheet(false)}
        onConfirm={(opts) => {
          void (async () => {
            await runOptimize({
              city: opts.city,
              driverIds: opts.driverIds,
              unassignedOnly: opts.unassignedOnly,
              fullRebalance: opts.fullRebalance,
            })
            setShowOptimizeSheet(false)
          })()
        }}
      />

      <StartSheet
        state={startSheet}
        busy={busy}
        onChange={setStartSheet}
        onClose={() => setStartSheet(null)}
        onSave={() => void saveStartFromSheet()}
      />

      <AssignRangeSheet
        open={showRangeSheet}
        busy={busy}
        sections={sections}
        drivers={drivers}
        bulkSourceKey={bulkSourceKey}
        bulkRows={bulkRows}
        evenSplitDriverIds={evenSplitDriverIds}
        onClose={() => setShowRangeSheet(false)}
        onBulkSourceKeyChange={setBulkSourceKey}
        onBulkRowsChange={setBulkRows}
        onEvenSplitDriverIdsChange={setEvenSplitDriverIds}
        onApply={() => void applyBulkBySequence()}
        onFillEvenSplit={applyEvenSplit}
        onOpened={handleRangeSheetOpened}
      />
    </div>
  );
}
