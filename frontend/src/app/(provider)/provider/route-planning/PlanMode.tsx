"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CaretDown,
  ListNumbers,
  MagnifyingGlass,
  MapPin,
  Path,
  SignOut,
  X,
} from "@phosphor-icons/react";
import { InlineLoader } from "@/components/loaders";
import SearchableSelect from "@/components/SearchableSelect";
import SelectionToolbar from "./SelectionToolbar";
import StopListPane from "./StopListPane";
import type { RoutePolyline } from "./RouteMap";
import type {
  CityChip,
  Driver,
  EffectiveStart,
  Kitchen,
  MealSlot,
  PoolSection,
  Stop,
} from "./types";
import { mapsUrlForStops, sortPool } from "./utils";
import { mealSlotBadgeLabel } from "@/lib/mealSlots";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#1A2332] flex items-center justify-center">
      <InlineLoader label="Loading map…" />
    </div>
  ),
});

type Props = {
  loading: boolean;
  busy: boolean;
  slot: MealSlot;
  planningDate: string;
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
  roadPolylines: RoutePolyline[];
  onSlotChange: (slot: MealSlot) => void;
  onPlanningDateChange: (date: string) => void;
  onSelectedCityChange: (city: string) => void;
  onListFilterChange: (f: string) => void;
  onToggleStop: (id: string) => void;
  onToggleSection: (stops: Stop[]) => void;
  onClearSelection: () => void;
  onAssignDriverIdChange: (id: string) => void;
  onAssign: () => void;
  onAssignUnassigned: () => void;
  onOpenRange: () => void;
  onGeocode: () => void;
  onOptimize: () => void;
  onReorder: (section: PoolSection, orderedIds: string[]) => void;
  onReassign: (customerIds: string[], driverId: string | null) => void;
  onOpenStart: (stop: Stop) => void;
  onPlace: (stop: Stop) => void;
  onBestFit: (stop: Stop) => void;
  onBestFitAllUnassigned: () => void;
  onMoveDriver: (stop: Stop, driverId: string | null) => void;
  onExit: () => void;
};

export default function PlanMode({
  loading,
  busy,
  slot,
  planningDate,
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
  roadPolylines,
  onSlotChange,
  onPlanningDateChange,
  onSelectedCityChange,
  onListFilterChange,
  onToggleStop,
  onToggleSection,
  onClearSelection,
  onAssignDriverIdChange,
  onAssign,
  onAssignUnassigned,
  onOpenRange,
  onGeocode,
  onOptimize,
  onReorder,
  onReassign,
  onOpenStart,
  onPlace,
  onBestFit,
  onBestFitAllUnassigned,
  onMoveDriver,
  onExit,
}: Props) {
  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [hiddenDriverKeys, setHiddenDriverKeys] = useState<Set<string>>(new Set());

  const totalStops = stops.length;
  const unassignedStops = stops.filter((s) => !s.driver_id).length;
  const issueCount = stops.filter(
    (s) => s.delivery_sequence == null || s.geocode_status !== "ok"
  ).length;

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

  const toggleDriverVisibility = (sectionKey: string) => {
    setHiddenDriverKeys((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  };

  useEffect(() => {
    if (highlightedStopId) setMobileRailOpen(true);
  }, [highlightedStopId]);

  const rail = (
    <div className="flex flex-col h-full min-h-0 bg-white" data-testid="route-side-rail">
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-[#E5E9EF] space-y-2">
        <div className="flex items-center gap-2">
          <Path size={18} className="text-[#00BFA5]" weight="bold" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6570]">Routes</p>
            <p className="text-sm font-bold text-[#0B1220] truncate" data-testid="route-stats">
              {totalStops} stops · {unassignedStops} open
              {issueCount > 0 ? ` · ${issueCount} issues` : ""}
            </p>
          </div>
          <button
            type="button"
            className="lg:hidden h-9 w-9 rounded-lg hover:bg-[#F4F6F8] inline-flex items-center justify-center text-[#5C6570]"
            aria-label="Close stops"
            onClick={() => setMobileRailOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative">
          <MagnifyingGlass
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5C6570] pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stops…"
            className="h-9 w-full pl-8 pr-3 rounded-lg border border-[#E5E9EF] bg-[#F4F6F8] text-sm text-[#0B1220] outline-none focus:ring-2 focus:ring-[#00BFA5]/35 focus:border-[#00BFA5]"
            data-testid="route-stop-search"
          />
        </div>

        <div className="flex flex-wrap gap-1" data-testid="route-filter-row">
          {filters.map((f) => {
            const isActive = listFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#0B1220] text-white"
                    : "bg-[#F4F6F8] text-[#5C6570] hover:text-[#0B1220]"
                }`}
                onClick={() => onListFilterChange(f.key)}
                data-testid={f.testid}
              >
                {f.label}
                {f.count != null && <span className="ml-1 opacity-70">{f.count}</span>}
              </button>
            );
          })}
        </div>

        {!drivers.length && (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900"
            data-testid="route-no-drivers"
          >
            No drivers — add staff in{" "}
            <Link href="/provider/settings" className="underline font-medium">
              Settings
            </Link>
            .
          </div>
        )}

        {!routingConfigured && (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900"
            data-testid="route-ors-warning"
          >
            Local routing not configured — optimize may be limited.
          </div>
        )}

        <div className="flex gap-1.5">
          <button
            type="button"
            className="flex-1 h-9 rounded-lg border border-[#E5E9EF] text-[12px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] disabled:opacity-50"
            onClick={onGeocode}
            disabled={busy}
            data-testid="route-geocode"
          >
            Fix addresses
          </button>
          <button
            type="button"
            className="flex-1 h-9 rounded-lg border border-[#E5E9EF] text-[12px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] inline-flex items-center justify-center gap-1 disabled:opacity-50"
            onClick={onOpenRange}
            disabled={busy}
            data-testid="route-open-range-sheet-header"
          >
            <ListNumbers size={13} /> Bulk
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2">
        {loading ? (
          <InlineLoader label="Loading plan…" testid="route-plan-loading" />
        ) : (
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
            hiddenDriverKeys={hiddenDriverKeys}
            onToggleDriverVisibility={toggleDriverVisibility}
            onToggleStop={onToggleStop}
            onToggleSection={onToggleSection}
            onHighlight={setHighlightedStopId}
            onReorder={onReorder}
            onReassign={onReassign}
            onOpenStart={onOpenStart}
            onPlace={onPlace}
            onBestFit={onBestFit}
            onBestFitAllUnassigned={onBestFitAllUnassigned}
            onMoveDriver={onMoveDriver}
          />
        )}
      </div>

      {(effectiveStart || activeOverride) && (
        <div className="shrink-0 px-3 py-2 border-t border-[#E5E9EF] text-[10px] text-[#5C6570]">
          Start: {effectiveStart?.label || "Kitchen"}
          {activeOverride?.ends_on ? ` · temp until ${activeOverride.ends_on}` : ""}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="h-dvh w-full flex flex-col bg-[#F4F6F8] overflow-hidden"
      data-testid="route-plan-mode"
    >
      {/* Top bar */}
      <header
        className="shrink-0 z-20 h-14 px-3 sm:px-4 flex items-center gap-2 sm:gap-3 border-b border-[#E5E9EF] bg-white"
        data-testid="route-top-bar"
      >
        <button
          type="button"
          onClick={onExit}
          className="h-9 w-9 rounded-lg hover:bg-[#F4F6F8] inline-flex items-center justify-center text-[#5C6570]"
          aria-label="Exit route planning"
          data-testid="route-back-to-cities"
        >
          <SignOut size={18} className="rotate-180" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-bold text-[#0B1220] truncate">Route planning</span>
        </div>

        <div className="flex gap-1" data-testid="route-slot-pills">
          {(["lunch", "dinner"] as MealSlot[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`h-8 px-2.5 rounded-lg text-[12px] font-medium ${
                slot === s
                  ? "bg-[#00BFA5] text-white"
                  : "bg-[#F4F6F8] text-[#5C6570] hover:text-[#0B1220]"
              }`}
              onClick={() => onSlotChange(s)}
              data-testid={`route-slot-${s}`}
            >
              {mealSlotBadgeLabel(s)}
            </button>
          ))}
        </div>

        <label className="hidden md:flex items-center gap-1.5 text-[11px] text-[#5C6570]">
          <input
            type="date"
            value={planningDate}
            onChange={(e) => onPlanningDateChange(e.target.value)}
            className="h-8 px-2 rounded-lg border border-[#E5E9EF] text-[12px] text-[#0B1220]"
            data-testid="route-planning-date"
          />
        </label>

        <div className="flex-1 min-w-[120px] max-w-[240px]" data-testid="route-city-chips">
          <SearchableSelect
            value={selectedCity}
            onChange={onSelectedCityChange}
            options={cityOptions}
            placeholder="City…"
            testid="route-city-select"
            inputClassName="h-8 px-2.5 rounded-lg border border-[#E5E9EF] bg-[#F4F6F8] text-[12px] w-full"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <a
            href={fullMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex h-8 px-2.5 rounded-lg text-[12px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] items-center gap-1"
            data-testid="route-open-full-map"
          >
            <MapPin size={14} /> Maps
          </a>
          <button
            type="button"
            className="h-8 px-3 rounded-lg bg-[#0B1220] text-white text-[12px] font-semibold hover:bg-[#1A2332] disabled:opacity-50"
            onClick={onOptimize}
            disabled={busy}
            data-testid="route-optimize"
          >
            {busy ? "Working…" : "Optimize"}
          </button>
        </div>
      </header>

      {/* Workspace body */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Desktop rail */}
        <aside className="hidden lg:flex w-[360px] shrink-0 flex-col border-r border-[#E5E9EF] bg-white min-h-0">
          {rail}
        </aside>

        {/* Map canvas */}
        <div className="flex-1 min-w-0 min-h-0 relative" data-testid="route-map-canvas">
          <RouteMap
            stops={stops}
            kitchen={kitchen}
            effectiveStart={effectiveStart}
            driverIds={driverIds}
            highlightedStopId={highlightedStopId}
            roadPolylines={roadPolylines}
            hiddenDriverKeys={hiddenDriverKeys}
            fullBleed
            onStopClick={(id) => {
              setHighlightedStopId(id);
              setMobileRailOpen(true);
            }}
          />

          {/* Mobile rail peek / sheet */}
          <div className="lg:hidden absolute inset-x-0 bottom-0 z-[450] pointer-events-none">
            {!mobileRailOpen && (
              <button
                type="button"
                className="pointer-events-auto mx-auto mb-3 flex items-center gap-2 h-11 px-4 rounded-full bg-white shadow-lg border border-[#E5E9EF] text-sm font-semibold text-[#0B1220]"
                onClick={() => setMobileRailOpen(true)}
                data-testid="route-mobile-pane-toggle"
              >
                <ListNumbers size={16} />
                Stops ({totalStops})
                <CaretDown size={14} className="rotate-180" />
              </button>
            )}
            {mobileRailOpen && (
              <div
                className="pointer-events-auto h-[min(70vh,560px)] rounded-t-2xl border-t border-[#E5E9EF] shadow-2xl overflow-hidden"
                data-testid="route-mobile-rail-sheet"
              >
                {rail}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="sr-only" data-testid="route-planning-page-attribution">
        Geocoding powered by Geoapify. Map data © OpenStreetMap contributors.
      </p>

      <SelectionToolbar
        selectedCount={selected.size}
        drivers={drivers}
        assignDriverId={assignDriverId}
        busy={busy}
        onAssignDriverIdChange={onAssignDriverIdChange}
        onAssign={onAssign}
        onAssignUnassigned={onAssignUnassigned}
        onClear={onClearSelection}
        onOpenRange={onOpenRange}
      />
    </div>
  );
}
