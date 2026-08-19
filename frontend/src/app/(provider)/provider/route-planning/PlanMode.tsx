"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  ListNumbers,
  MagnifyingGlass,
  MapPin,
} from "@phosphor-icons/react";
import { InlineLoader } from "@/components/loaders";
import SearchableSelect from "@/components/SearchableSelect";
import SetupPanel from "./SetupPanel";
import StopListPane from "./StopListPane";
import SelectionToolbar from "./SelectionToolbar";
import type {
  CityChip,
  Driver,
  EffectiveStart,
  Kitchen,
  PoolSection,
  Stop,
} from "./types";
import { mapsUrlForStops, sortPool } from "./utils";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[240px] rounded-2xl border border-brand-border bg-brand-surface/40 flex items-center justify-center">
      <InlineLoader label="Loading map…" />
    </div>
  ),
});

type Props = {
  loading: boolean;
  busy: boolean;
  cities: CityChip[];
  selectedCity: string;
  stops: Stop[];
  sections: PoolSection[];
  drivers: Driver[];
  kitchen: Kitchen;
  effectiveStart: EffectiveStart | null;
  activeOverride: { ends_on?: string } | null;
  routingConfigured: boolean;
  originLine: string;
  selected: Set<string>;
  assignDriverId: string;
  listFilter: string;
  onSelectedCityChange: (city: string) => void;
  onListFilterChange: (f: string) => void;
  onToggleStop: (id: string) => void;
  onToggleSection: (stops: Stop[]) => void;
  onClearSelection: () => void;
  onAssignDriverIdChange: (id: string) => void;
  onAssign: () => void;
  onOpenRange: () => void;
  onUseKitchen: () => void;
  onClearTemporary: () => void;
  onGeocode: () => void;
  onOptimize: () => void;
  onReorder: (section: PoolSection, orderedIds: string[]) => void;
  onReassign: (customerIds: string[], driverId: string | null) => void;
  onOpenStart: (stop: Stop) => void;
  onPlace: (stop: Stop) => void;
  onMoveDriver: (stop: Stop, driverId: string | null) => void;
  onBack: () => void;
};

export default function PlanMode({
  loading,
  busy,
  cities,
  selectedCity,
  stops,
  sections,
  drivers,
  kitchen,
  effectiveStart,
  activeOverride,
  routingConfigured,
  originLine,
  selected,
  assignDriverId,
  listFilter,
  onSelectedCityChange,
  onListFilterChange,
  onToggleStop,
  onToggleSection,
  onClearSelection,
  onAssignDriverIdChange,
  onAssign,
  onOpenRange,
  onUseKitchen,
  onClearTemporary,
  onGeocode,
  onOptimize,
  onReorder,
  onReassign,
  onOpenStart,
  onPlace,
  onMoveDriver,
  onBack,
}: Props) {
  const [mobilePane, setMobilePane] = useState<"list" | "map">("list");
  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalStops = stops.length;
  const assignedStops = stops.filter((s) => !!s.driver_id).length;
  const unassignedStops = totalStops - assignedStops;
  const issueCount = stops.filter(
    (s) => s.delivery_sequence == null || s.geocode_status !== "ok"
  ).length;
  const assignedPct = totalStops ? Math.round((assignedStops / totalStops) * 100) : 0;

  const driverIds = useMemo(() => drivers.map((d) => d.id), [drivers]);

  const fullMapUrl = useMemo(() => {
    let mapStops = stops.filter((s) => s.delivery_sequence != null);
    if (listFilter === "unassigned") {
      mapStops = mapStops.filter((s) => !s.driver_id);
    } else if (listFilter !== "all" && listFilter !== "issues") {
      mapStops = mapStops.filter((s) => s.driver_id === listFilter);
    }
    return mapsUrlForStops(originLine, sortPool(mapStops));
  }, [stops, originLine, listFilter]);

  const cityOptions = useMemo(
    () => [
      { value: "all", label: `All cities (${totalStops})` },
      ...cities.map((c) => ({
        value: c.name,
        label: `${c.name} (${c.count})`,
      })),
    ],
    [cities, totalStops]
  );

  /* ── Filter chips ── */
  const filters: { key: string; label: string; count?: number; testid: string }[] = [
    { key: "all", label: "All", count: totalStops, testid: "route-stat-total" },
    { key: "unassigned", label: "Unassigned", count: unassignedStops, testid: "route-stat-unassigned" },
    { key: "issues", label: "Issues", count: issueCount, testid: "route-stat-issues" },
    ...drivers.map((d) => ({
      key: d.id,
      label: d.name,
      count: stops.filter((s) => s.driver_id === d.id).length,
      testid: `route-stat-driver-${d.id}`,
    })),
  ];

  return (
    <div className="flex flex-col gap-3" data-testid="route-plan-mode">
      {/* ── Header: Back + City select ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200 min-h-[44px] px-1"
          data-testid="route-back-to-cities"
        >
          <ArrowLeft size={18} weight="bold" />
          All cities
        </button>

        <div className="flex-1 min-w-[160px] max-w-[280px]" data-testid="route-city-chips">
          <SearchableSelect
            value={selectedCity}
            onChange={onSelectedCityChange}
            options={cityOptions}
            placeholder="Select city…"
            testid="route-city-select"
            inputClassName="h-10 px-3 rounded-xl border border-brand-border bg-white text-sm w-full"
          />
        </div>
      </div>

      {/* ── Compact stats bar ── */}
      <div className="rounded-2xl border border-brand-border bg-white p-3" data-testid="route-stats">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-display font-bold">{totalStops} stops</span>
          <span className="text-secondary font-medium">
            {assignedStops} assigned
            <span className="text-muted-foreground font-normal ml-1">({assignedPct}%)</span>
          </span>
          <span className="text-muted-foreground">{unassignedStops} unassigned</span>
          {issueCount > 0 && (
            <span className="text-amber-700 font-medium text-xs">
              {issueCount} issue{issueCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-brand-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-300 ease-out"
            style={{ width: `${assignedPct}%` }}
          />
        </div>
      </div>

      {!drivers.length && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="route-no-drivers"
        >
          No drivers — add staff with role Driver in{" "}
          <Link href="/provider/settings" className="underline underline-offset-2 font-medium">
            Settings
          </Link>
          .
        </div>
      )}

      <SetupPanel
        selectedCity={selectedCity}
        kitchen={kitchen}
        effectiveStart={effectiveStart}
        activeOverride={activeOverride}
        routingConfigured={routingConfigured}
        issueCount={issueCount}
        busy={busy}
        onUseKitchen={onUseKitchen}
        onClearTemporary={onClearTemporary}
        onGeocode={onGeocode}
        onOptimize={onOptimize}
        onChangeStartHint={() => undefined}
      />

      {/* ── Filter row ── */}
      <div className="flex flex-wrap gap-1.5" data-testid="route-filter-row">
        {filters.map((f) => {
          const isActive = listFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              className={`pill-btn h-8 text-[11px] px-3 ${
                isActive ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => onListFilterChange(f.key)}
              data-testid={f.testid}
            >
              {f.label}
              {f.count != null && (
                <span className={`ml-1 ${isActive ? "opacity-80" : "opacity-60"}`}>{f.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Mobile pane toggle ── */}
      <div className="flex gap-0 sm:hidden rounded-xl border border-brand-border overflow-hidden" data-testid="route-mobile-pane-toggle">
        <button
          type="button"
          className={`flex-1 h-10 text-xs gap-1 inline-flex items-center justify-center font-medium transition-colors duration-200 ${
            mobilePane === "list"
              ? "bg-primary text-white"
              : "bg-white text-foreground hover:bg-brand-surface"
          }`}
          onClick={() => setMobilePane("list")}
        >
          <ListNumbers size={14} /> List
        </button>
        <button
          type="button"
          className={`flex-1 h-10 text-xs gap-1 inline-flex items-center justify-center font-medium transition-colors duration-200 ${
            mobilePane === "map"
              ? "bg-primary text-white"
              : "bg-white text-foreground hover:bg-brand-surface"
          }`}
          onClick={() => setMobilePane("map")}
        >
          <MapPin size={14} /> Map
        </button>
      </div>

      {loading ? (
        <InlineLoader label="Loading plan…" testid="route-plan-loading" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-3 items-start">
          <div className={mobilePane === "list" ? "block" : "hidden lg:block"}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <ListNumbers size={16} className="text-primary" />
              <p className="label-overline mb-0">Stops by driver</p>
              <p className="text-[11px] text-muted-foreground flex-1">
                Search a customer → Start · drag grip to reorder
              </p>
              <button
                type="button"
                className="pill-btn btn-outline h-8 text-[11px] px-3 gap-1"
                onClick={onOpenRange}
                disabled={busy}
                data-testid="route-open-range-sheet-header"
              >
                <ListNumbers size={12} /> Bulk assign…
              </button>
            </div>

            <div className="relative mb-2">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stops by name, address…"
                className="h-11 w-full pl-9 pr-3 rounded-xl border border-brand-border bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                data-testid="route-stop-search"
              />
            </div>

            <StopListPane
              sections={sections}
              drivers={drivers}
              selected={selected}
              highlightedStopId={highlightedStopId}
              listFilter={listFilter}
              searchQuery={searchQuery}
              originLine={originLine}
              busy={busy}
              routingConfigured={routingConfigured}
              onToggleStop={onToggleStop}
              onToggleSection={onToggleSection}
              onHighlight={setHighlightedStopId}
              onReorder={onReorder}
              onReassign={onReassign}
              onOpenStart={onOpenStart}
              onPlace={onPlace}
              onMoveDriver={onMoveDriver}
            />
          </div>
          <div className={`lg:sticky lg:top-3 ${mobilePane === "map" ? "block" : "hidden lg:block"}`}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <MapPin size={16} className="text-primary" />
              <p className="label-overline mb-0 flex-1">Map</p>
              <a
                href={fullMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pill-btn btn-primary h-9 text-[11px] px-3 gap-1"
                data-testid="route-open-full-map"
              >
                <MapPin size={14} /> Open full map
              </a>
            </div>
            <div className="h-[min(70vh,560px)]">
              <RouteMap
                stops={stops}
                kitchen={kitchen}
                effectiveStart={effectiveStart}
                driverIds={driverIds}
                highlightedStopId={highlightedStopId}
                onStopClick={(id) => {
                  setHighlightedStopId(id);
                  setMobilePane("list");
                }}
              />
            </div>
          </div>
        </div>
      )}

      <SelectionToolbar
        selectedCount={selected.size}
        drivers={drivers}
        assignDriverId={assignDriverId}
        busy={busy}
        onAssignDriverIdChange={onAssignDriverIdChange}
        onAssign={onAssign}
        onClear={onClearSelection}
        onOpenRange={onOpenRange}
      />
    </div>
  );
}
