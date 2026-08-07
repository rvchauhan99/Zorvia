"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { mealSlotBadgeLabel } from "@/lib/mealSlots";
import OverviewMode from "./OverviewMode";
import PlanMode from "./PlanMode";
import StartSheet from "./StartSheet";
import AssignRangeSheet from "./AssignRangeSheet";
import OptimizeSheet from "./OptimizeSheet";
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
  newBulkRow,
  seqSpan,
  todayIsoLocal,
} from "./utils";

export default function RoutePlanningPage() {
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
  const [selectedCity, setSelectedCity] = useState("");
  const [planningDate, setPlanningDate] = useState(todayIsoLocal);
  const [startSheet, setStartSheet] = useState<StartSheetState | null>(null);
  const [listFilter, setListFilter] = useState("all");

  /* ── Derived: are we in city planner or summary view? ── */
  const inPlanMode = !!selectedCity;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { meal_slot: slot, planning_date: planningDate };
      if (!inPlanMode) {
        params.city = "all";
      } else if (selectedCity) {
        params.city = selectedCity;
      }
      const { data } = await api.get<RoutePlan>("/route-planning", { params });
      setPlan(data);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load route plan");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [slot, selectedCity, planningDate, inPlanMode]);

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
    () => (Array.isArray(plan?.stops) ? plan!.stops! : []),
    [plan]
  );

  const sections: PoolSection[] = useMemo(
    () => buildSections(stops, drivers),
    [stops, drivers]
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
    async (opts?: { quiet?: boolean }) => {
      if (!admin) return false;
      if (!selectedCity) {
        if (!opts?.quiet) toast.error("Select a city first");
        return false;
      }
      setBusy(true);
      try {
        const { data } = await api.post("/route-planning/optimize", {
          meal_slot: slot,
          city: selectedCity,
          planning_date: planningDate,
        });
        const n = data?.ordered_ids?.length ?? 0;
        const boot = data?.bootstrapped_start ? " · first stop as start" : "";
        const skip = data?.skipped?.length ? ` (${data.skipped.length} skipped)` : "";
        toast.success(
          opts?.quiet
            ? `Route optimized for ${selectedCity}${boot}${skip}`
            : `Optimized ${n} stops in ${selectedCity}${boot}${skip}`
        );
        await load();
        return true;
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Optimize failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [admin, selectedCity, slot, planningDate, load]
  );

  const runGeocode = async () => {
    if (!admin) return;
    setBusy(true);
    try {
      const { data } = await api.post("/route-planning/geocode-missing", null, {
        params: { meal_slot: slot, city: selectedCity || undefined, limit: 40 },
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

  const saveStartFromSheet = async () => {
    if (!startSheet || !selectedCity) return;
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

  const setKitchenAsDefault = async () => {
    if (!selectedCity) return;
    setBusy(true);
    try {
      await api
        .delete("/route-planning/city-start-override", { params: { city: selectedCity } })
        .catch(() => undefined);
      await api.post("/route-planning/city-start", {
        city: selectedCity,
        type: "kitchen",
      });
      toast.success("Kitchen set as start (temporary cleared) — optimizing…");
      setBusy(false);
      await runOptimize({ quiet: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Could not set kitchen start");
      setBusy(false);
    }
  };

  const clearTemporaryStart = async () => {
    if (!selectedCity) return;
    setBusy(true);
    try {
      await api.delete("/route-planning/city-start-override", {
        params: { city: selectedCity },
      });
      toast.success("Temporary start cleared — re-optimizing…");
      setBusy(false);
      await runOptimize({ quiet: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Could not clear temporary start");
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
      toast.success(target ? "Assigned to driver (appended to route)" : "Moved to unassigned pool");
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
      .filter(Boolean) as { sequence_from: number; sequence_to: number; driver_id: string | null }[];

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

  const enterPlanForCity = (cityName: string) => {
    setSelectedCity(cityName);
    setListFilter("all");
  };

  const backToCities = () => {
    setSelectedCity("");
    setListFilter("all");
  };

  if (!admin) {
    return (
      <div className="animate-fade-in-up p-4">
        <p className="text-muted-foreground">Admins only.</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 sm:gap-4 animate-fade-in-up pb-28"
      data-testid="route-planning-page"
    >
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="label-overline">Operations</p>
          <h1 className="font-display font-bold text-xl sm:text-2xl">Route planning</h1>
        </div>
        <Link
          href="/provider/settings"
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          Kitchen address in Settings
        </Link>
      </div>

      {/* ── Controls: Slot pills + Date ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" data-testid="route-slot-pills">
          {(["lunch", "dinner"] as MealSlot[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`pill-btn h-9 text-xs px-3 ${slot === s ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSlot(s)}
              data-testid={`route-slot-${s}`}
            >
              {mealSlotBadgeLabel(s)}
            </button>
          ))}
        </div>
        <label className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
          Date
          <input
            type="date"
            value={planningDate}
            onChange={(e) => setPlanningDate(e.target.value)}
            className="h-9 px-2 rounded-xl border border-brand-border text-sm"
            data-testid="route-planning-date"
          />
        </label>
      </div>

      {/* ── Content: City summary or City planner ── */}
      {!inPlanMode ? (
        <OverviewMode stops={stops} loading={loading} onFixCity={enterPlanForCity} />
      ) : (
        <PlanMode
          loading={loading}
          busy={busy}
          cities={cities}
          selectedCity={selectedCity}
          stops={stops}
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
          onSelectedCityChange={setSelectedCity}
          onListFilterChange={setListFilter}
          onToggleStop={toggle}
          onToggleSection={toggleSection}
          onClearSelection={() => setSelected(new Set())}
          onAssignDriverIdChange={setAssignDriverId}
          onAssign={() => void assignDriver()}
          onOpenRange={() => setShowRangeSheet(true)}
          onUseKitchen={() => void setKitchenAsDefault()}
          onClearTemporary={() => void clearTemporaryStart()}
          onGeocode={() => void runGeocode()}
          onOptimize={() => setShowOptimizeSheet(true)}
          onReorder={(section, ids) => void reorderPool(section, ids)}
          onReassign={(ids, driverId) => void assignDriver(ids, driverId)}
          onOpenStart={(stop) =>
            setStartSheet({
              customerId: stop.id,
              customerName: stop.name || stop.id,
              mode: "default",
              duration: "today",
              days: 3,
            })
          }
          onPlace={(stop) => void placeOne(stop.id, stop.driver_id || null)}
          onMoveDriver={(stop, driverId) => void assignDriver([stop.id], driverId)}
          onBack={backToCities}
        />
      )}

      <OptimizeSheet
        open={showOptimizeSheet}
        city={selectedCity}
        busy={busy}
        onClose={() => setShowOptimizeSheet(false)}
        onConfirm={() => {
          setShowOptimizeSheet(false);
          void runOptimize();
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
      />
    </div>
  );
}
