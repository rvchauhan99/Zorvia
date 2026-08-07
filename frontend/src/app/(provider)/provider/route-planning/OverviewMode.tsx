"use client";

import React, { useMemo, useState } from "react";
import {
  CaretDown,
  CaretRight,
  Eye,
  MapPin,
  NavigationArrow,
  Path,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Stop } from "./types";
import { isIssueStop, mapsUrlForStops, sortPool, stopAddress } from "./utils";

/* ── Types ── */

type DriverRoute = {
  driverId: string | null;
  driverName: string;
  stops: Stop[];
};

type CityCard = {
  cityKey: string;
  cityName: string;
  total: number;
  assigned: number;
  unassigned: number;
  issueCount: number;
  pct: number;
  stops: Stop[];
  driverRoutes: DriverRoute[];
};

/* ── Build helpers ── */

function buildDriverRoutes(stops: Stop[]): DriverRoute[] {
  const map = new Map<string, DriverRoute>();
  for (const s of stops) {
    const key = s.driver_id || "__unassigned__";
    let route = map.get(key);
    if (!route) {
      route = {
        driverId: s.driver_id || null,
        driverName: s.driver_id ? s.driver_name || "Driver" : "Unassigned",
        stops: [],
      };
      map.set(key, route);
    }
    route.stops.push(s);
  }
  const routes = Array.from(map.values());
  // Sort each driver's stops by sequence
  for (const r of routes) {
    r.stops = sortPool(r.stops);
  }
  // Unassigned first, then drivers alphabetically
  routes.sort((a, b) => {
    if (!a.driverId && b.driverId) return -1;
    if (a.driverId && !b.driverId) return 1;
    return a.driverName.localeCompare(b.driverName);
  });
  return routes;
}

function buildCityCards(stops: Stop[]): CityCard[] {
  const map = new Map<string, Omit<CityCard, "pct" | "driverRoutes">>();
  for (const s of stops) {
    const cityName = (s.city || "").trim() || "Unknown city";
    const cityKey = (s.city_key || cityName).trim().toLowerCase() || "unknown city";
    let card = map.get(cityKey);
    if (!card) {
      card = { cityKey, cityName, total: 0, assigned: 0, unassigned: 0, issueCount: 0, stops: [] };
      map.set(cityKey, card);
    }
    card.total++;
    if (s.driver_id) card.assigned++;
    else card.unassigned++;
    if (isIssueStop(s)) card.issueCount++;
    card.stops.push(s);
  }
  const cards = Array.from(map.values()).map((c) => ({
    ...c,
    pct: c.total ? Math.round((c.assigned / c.total) * 100) : 0,
    driverRoutes: buildDriverRoutes(c.stops),
  }));
  cards.sort((a, b) => a.cityName.localeCompare(b.cityName));
  return cards;
}

/* ── Driver color palette (matches RouteMap) ── */
const DRIVER_COLORS = [
  "#0E8F8B", "#2A9D7A", "#F5A524", "#3B82F6", "#8B5CF6",
  "#EC4899", "#EF4444", "#14B8A6", "#F97316", "#6366F1",
];
const UNASSIGNED_COLOR = "#94A3B8";

function driverDotColor(driverId: string | null, index: number): string {
  if (!driverId) return UNASSIGNED_COLOR;
  return DRIVER_COLORS[index % DRIVER_COLORS.length];
}

/* ── Component ── */

type Props = {
  stops: Stop[];
  loading?: boolean;
  onFixCity: (cityName: string) => void;
};

export default function OverviewMode({ stops, loading, onFixCity }: Props) {
  const cards = useMemo(() => buildCityCards(stops), [stops]);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const totalStops = stops.length;
  const totalAssigned = stops.filter((s) => !!s.driver_id).length;
  const totalUnassigned = totalStops - totalAssigned;
  const totalIssues = stops.filter(isIssueStop).length;
  const overallPct = totalStops ? Math.round((totalAssigned / totalStops) * 100) : 0;

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="route-view-loading">
        Loading routes…
      </p>
    );
  }

  if (!cards.length) {
    return (
      <div className="card-tinted p-4 text-sm text-muted-foreground" data-testid="route-view-empty">
        No stops for this slot/date. Once customers exist for this meal slot, their cities will
        appear here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="route-view">
      {/* Overall summary bar */}
      <div
        className="rounded-2xl border border-brand-border bg-white p-3 sm:p-4"
        data-testid="route-overview-stats"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-display font-bold text-base">
            {totalStops} stop{totalStops === 1 ? "" : "s"}
          </span>
          <span className="text-secondary font-medium">
            {totalAssigned} assigned
            <span className="text-muted-foreground font-normal ml-1">({overallPct}%)</span>
          </span>
          <span className="text-muted-foreground">
            {totalUnassigned} unassigned
          </span>
          {totalIssues > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <WarningCircle size={14} />
              {totalIssues} issue{totalIssues === 1 ? "" : "s"}
            </span>
          )}
          <span className="text-muted-foreground ml-auto text-xs">
            {cards.length} cit{cards.length === 1 ? "y" : "ies"}
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-brand-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-300 ease-out"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* City cards grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        data-testid="route-view-grid"
      >
        {cards.map((card) => {
          const isExpanded = expandedCity === card.cityKey;

          return (
            <div
              key={card.cityKey}
              className={`card-tinted text-left p-0 overflow-hidden transition-all duration-200 ease-out ${
                isExpanded
                  ? "sm:col-span-2 lg:col-span-3 ring-1 ring-primary/25"
                  : "hover:-translate-y-0.5 hover:shadow-lg"
              }`}
              data-testid={`route-view-box-${card.cityKey}`}
            >
              <div className="p-3 sm:p-4 flex flex-col gap-2.5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-primary shrink-0" />
                      <p className="font-display font-bold text-sm truncate">{card.cityName}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">
                      {card.total} stop{card.total === 1 ? "" : "s"}
                      {card.driverRoutes.filter((r) => r.driverId).length > 0 && (
                        <span>
                          {" · "}
                          {card.driverRoutes.filter((r) => r.driverId).length} driver
                          {card.driverRoutes.filter((r) => r.driverId).length === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                  </div>
                  {card.issueCount > 0 && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0"
                      data-testid={`route-view-issues-${card.cityKey}`}
                    >
                      <WarningCircle size={11} /> {card.issueCount}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-secondary font-medium">{card.assigned} assigned</span>
                    <span className="text-muted-foreground">{card.unassigned} unassigned</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-brand-surface overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${card.pct}%`,
                        background:
                          card.pct === 100
                            ? "#2A9D7A"
                            : card.pct >= 50
                              ? "#0E8F8B"
                              : "#F5A524",
                      }}
                    />
                  </div>
                </div>

                {/* CTA row */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {card.pct}% complete
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="pill-btn btn-outline h-8 text-[11px] px-3 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCity(isExpanded ? null : card.cityKey);
                      }}
                      data-testid={`route-view-expand-${card.cityKey}`}
                    >
                      <Eye size={13} />
                      {isExpanded ? "Hide" : "View route"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:gap-2 transition-all duration-200"
                      onClick={() => onFixCity(card.cityName)}
                      data-testid={`route-view-fix-${card.cityKey}`}
                    >
                      Plan route <CaretRight size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Expanded: Driver-wise route view ── */}
              {isExpanded && (
                <div
                  className="border-t border-brand-border bg-brand-surface/20"
                  data-testid={`route-view-routes-${card.cityKey}`}
                >
                  {card.driverRoutes.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground">No stops in this city.</p>
                  ) : (
                    <div className="divide-y divide-brand-border/60">
                      {card.driverRoutes.map((route, driverIdx) => {
                        const dotColor = driverDotColor(route.driverId, driverIdx - (route.driverId ? 0 : 1));
                        const sequencedStops = route.stops.filter(
                          (s) => s.delivery_sequence != null
                        );
                        const mapsUrl = mapsUrlForStops("", sequencedStops);

                        return (
                          <div
                            key={route.driverId || "__unassigned__"}
                            className="p-3 sm:p-4"
                            data-testid={`route-view-driver-${card.cityKey}-${route.driverId || "unassigned"}`}
                          >
                            {/* Driver header */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
                                  style={{ background: dotColor }}
                                />
                                <p className="font-display font-bold text-sm truncate">
                                  {route.driverName}
                                </p>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  {route.stops.length} stop{route.stops.length === 1 ? "" : "s"}
                                </span>
                                {!route.driverId && (
                                  <span className="text-[10px] uppercase tracking-wide font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                    Pool
                                  </span>
                                )}
                              </div>
                              {sequencedStops.length >= 2 && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pill-btn btn-outline h-8 text-[11px] px-3 gap-1 shrink-0"
                                  data-testid={`route-view-maps-${card.cityKey}-${route.driverId || "unassigned"}`}
                                >
                                  <NavigationArrow size={13} /> Open in Maps
                                </a>
                              )}
                            </div>

                            {/* Stop list */}
                            <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
                              <ul className="divide-y divide-brand-border/50">
                                {route.stops.map((s, stopIdx) => {
                                  const issue = isIssueStop(s);
                                  return (
                                    <li
                                      key={s.id}
                                      className="px-3 py-2 flex items-start gap-2.5 text-xs"
                                      data-testid={`route-view-stop-${s.id}`}
                                    >
                                      {/* Sequence number */}
                                      <span
                                        className="shrink-0 w-7 h-7 rounded-full text-[11px] font-bold inline-flex items-center justify-center text-white mt-0.5"
                                        style={{ background: dotColor }}
                                      >
                                        {s.delivery_sequence != null
                                          ? s.delivery_sequence
                                          : "—"}
                                      </span>
                                      {/* Stop details */}
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate text-sm">
                                          {s.name || s.id}
                                        </p>
                                        <p className="text-muted-foreground truncate">
                                          {stopAddress(s) || "No address"}
                                        </p>
                                      </div>
                                      {issue && (
                                        <WarningCircle
                                          size={14}
                                          className="text-amber-600 shrink-0 mt-1"
                                        />
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Full city maps link */}
                  {card.assigned > 0 && (
                    <div className="px-3 sm:px-4 pb-3">
                      <a
                        href={mapsUrlForStops(
                          "",
                          sortPool(card.stops.filter((s) => s.delivery_sequence != null))
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pill-btn btn-primary h-9 text-[11px] px-4 gap-1 w-full sm:w-auto"
                        data-testid={`route-view-maps-all-${card.cityKey}`}
                      >
                        <NavigationArrow size={14} /> Open all {card.cityName} stops in Maps
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
