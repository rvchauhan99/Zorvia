"use client";

import React, { useMemo, useState } from "react";
import { CaretDown, CaretRight, MapPin } from "@phosphor-icons/react";

export type RouteViewStop = {
  id: string;
  name?: string;
  address?: string;
  apartment?: string;
  city?: string;
  city_key?: string;
  postal_code?: string;
  driver_id?: string | null;
  driver_name?: string | null;
  delivery_sequence?: number | null;
};

type RouteBox = {
  key: string;
  cityKey: string;
  cityName: string;
  driverKey: string;
  driverId: string | null;
  driverTitle: string;
  stops: RouteViewStop[];
  span: { min: number; max: number; counted: number } | null;
};

function stopAddress(s: RouteViewStop) {
  return [s.address, s.apartment, s.city, s.postal_code].filter(Boolean).join(", ");
}

function sortStops(stops: RouteViewStop[]) {
  return [...stops].sort((a, b) => {
    const as = a.delivery_sequence ?? 1e9;
    const bs = b.delivery_sequence ?? 1e9;
    if (as !== bs) return as - bs;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function seqSpan(stops: RouteViewStop[]) {
  const seqs = stops
    .map((s) => s.delivery_sequence)
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (!seqs.length) return null;
  return { min: Math.min(...seqs), max: Math.max(...seqs), counted: seqs.length };
}

function mapsUrlForStops(stops: RouteViewStop[]) {
  const parts = sortStops(stops).map(stopAddress).filter(Boolean);
  if (!parts.length) return "https://www.google.com/maps";
  if (parts.length === 1) {
    return `https://maps.google.com/?q=${encodeURIComponent(parts[0])}`;
  }
  const origin = encodeURIComponent(parts[0]);
  const dest = encodeURIComponent(parts[parts.length - 1]);
  const waypoints = parts.slice(1, -1).map((p) => encodeURIComponent(p)).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

function buildBoxes(stops: RouteViewStop[]): RouteBox[] {
  const map = new Map<string, RouteBox>();
  for (const s of stops) {
    const cityName = (s.city || "").trim() || "Unknown city";
    const cityKey = (s.city_key || cityName).trim().toLowerCase() || "unknown city";
    const driverId = s.driver_id || null;
    const driverKey = driverId || "unassigned";
    const driverTitle = driverId ? s.driver_name || "Driver" : "Unassigned";
    const key = `${cityKey}::${driverKey}`;
    let box = map.get(key);
    if (!box) {
      box = {
        key,
        cityKey,
        cityName,
        driverKey,
        driverId,
        driverTitle,
        stops: [],
        span: null,
      };
      map.set(key, box);
    }
    box.stops.push(s);
  }
  const boxes = Array.from(map.values()).map((b) => {
    const ordered = sortStops(b.stops);
    return { ...b, stops: ordered, span: seqSpan(ordered) };
  });
  boxes.sort((a, b) => {
    const c = a.cityName.localeCompare(b.cityName);
    if (c !== 0) return c;
    if (!a.driverId && b.driverId) return -1;
    if (a.driverId && !b.driverId) return 1;
    return a.driverTitle.localeCompare(b.driverTitle);
  });
  return boxes;
}

type Props = {
  stops: RouteViewStop[];
  loading?: boolean;
};

export default function RouteOverview({ stops, loading }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const boxes = useMemo(() => buildBoxes(stops), [stops]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="route-view-loading">
        Loading routes…
      </p>
    );
  }

  if (!boxes.length) {
    return (
      <div
        className="card-tinted p-4 text-sm text-muted-foreground"
        data-testid="route-view-empty"
      >
        No stops for this slot/date.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="route-view">
      <p className="text-xs text-muted-foreground">
        View and verify routes by city and driver. Switch to{" "}
        <span className="font-medium text-foreground">Planning</span> to edit starts, assign, or optimize.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" data-testid="route-view-grid">
        {boxes.map((box) => {
          const isOpen = expanded === box.key;
          const spanLabel = box.span
            ? box.span.min === box.span.max
              ? `#${box.span.min}`
              : `#${box.span.min}–#${box.span.max}`
            : "No sequence";
          return (
            <div
              key={box.key}
              className={`card-tinted overflow-hidden flex flex-col ${
                isOpen ? "sm:col-span-2 lg:col-span-3 ring-1 ring-primary/30" : ""
              }`}
              data-testid={`route-view-box-${box.cityKey}-${box.driverKey}`}
            >
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm truncate">
                      {box.cityName}
                      <span className="text-muted-foreground font-medium"> · </span>
                      {box.driverTitle}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {box.stops.length} stop{box.stops.length === 1 ? "" : "s"}
                      <span className="mx-1">·</span>
                      <span data-testid={`route-view-span-${box.cityKey}-${box.driverKey}`}>{spanLabel}</span>
                    </p>
                  </div>
                  {!box.driverId ? (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      Pool
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide font-medium text-secondary bg-secondary/10 border border-secondary/20 rounded-full px-2 py-0.5">
                      Driver
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <a
                    href={mapsUrlForStops(box.stops)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-btn btn-outline h-8 text-[11px] px-3 gap-1"
                    data-testid={`route-view-maps-${box.cityKey}-${box.driverKey}`}
                  >
                    <MapPin size={14} /> Maps
                  </a>
                  <button
                    type="button"
                    className="pill-btn btn-outline h-8 text-[11px] px-3 gap-1"
                    data-testid={`route-view-expand-${box.cityKey}-${box.driverKey}`}
                    onClick={() => setExpanded(isOpen ? null : box.key)}
                  >
                    {isOpen ? <CaretDown size={14} /> : <CaretRight size={14} />}
                    {isOpen ? "Hide" : "Stops"}
                  </button>
                </div>
              </div>
              {isOpen && (
                <ul
                  className="border-t border-brand-border divide-y divide-brand-border bg-brand-surface/30"
                  data-testid={`route-view-stops-${box.cityKey}-${box.driverKey}`}
                >
                  {box.stops.map((s) => (
                    <li
                      key={s.id}
                      className="px-3 py-2 flex items-start gap-2 text-xs"
                      data-testid={`route-view-stop-${s.id}`}
                    >
                      <span className="font-mono text-muted-foreground shrink-0 w-8">
                        {s.delivery_sequence != null ? `#${s.delivery_sequence}` : "—"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.name || s.id}</p>
                        <p className="text-muted-foreground truncate">{stopAddress(s) || "No address"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
