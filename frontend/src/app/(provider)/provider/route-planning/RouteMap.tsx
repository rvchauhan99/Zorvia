"use client";

import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { WarningCircle } from "@phosphor-icons/react";
import type { EffectiveStart, Kitchen, Stop } from "./types";
import {
  driverColor,
  hasValidCoords,
  isIssueStop,
  sortPool,
  START_COLOR,
  stopAddress,
  UNASSIGNED_COLOR,
} from "./utils";

export type RoutePolyline = {
  driver_id: string | null;
  coordinates: [number, number][];
  method?: string;
};

type Props = {
  stops: Stop[];
  kitchen?: Kitchen | null;
  effectiveStart?: EffectiveStart | null;
  driverIds: string[];
  highlightedStopId?: string | null;
  roadPolylines?: RoutePolyline[];
  hiddenDriverKeys?: Set<string>;
  onStopClick?: (stopId: string) => void;
  fullBleed?: boolean;
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds.pad(0.12));
  }, [map, points]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

function makeDivIcon(color: string, label: string, highlighted: boolean) {
  const size = highlighted ? 28 : 24;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};color:#fff;font-size:10px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(11,18,32,.35);
      ${highlighted ? "outline:3px solid rgba(0,191,165,.55);" : ""}
    ">${label}</div>`,
  });
}

function makeStartIcon() {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="
      width:28px;height:28px;border-radius:8px;background:${START_COLOR};color:#fff;
      font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(11,18,32,.4);
    ">S</div>`,
  });
}

export default function RouteMap({
  stops,
  kitchen,
  effectiveStart,
  driverIds,
  highlightedStopId,
  roadPolylines,
  hiddenDriverKeys,
  onStopClick,
  fullBleed = false,
}: Props) {
  const hidden = hiddenDriverKeys || new Set<string>();

  const geocoded = useMemo(
    () =>
      stops.filter((s) => {
        if (!hasValidCoords(s.lat, s.lng)) return false;
        const key = s.driver_id || "unassigned";
        return !hidden.has(key);
      }),
    [stops, hidden]
  );
  const attention = useMemo(() => stops.filter(isIssueStop), [stops]);

  const points = useMemo(() => {
    const pts: [number, number][] = [];
    for (const s of geocoded) {
      pts.push([Number(s.lat), Number(s.lng)]);
    }
    if (effectiveStart && hasValidCoords(effectiveStart.lat, effectiveStart.lng)) {
      pts.push([Number(effectiveStart.lat), Number(effectiveStart.lng)]);
    } else if (kitchen && hasValidCoords(kitchen.lat, kitchen.lng)) {
      pts.push([Number(kitchen.lat), Number(kitchen.lng)]);
    }
    return pts;
  }, [geocoded, effectiveStart, kitchen]);

  const polylines = useMemo(() => {
    if (roadPolylines?.length) {
      return roadPolylines
        .filter((line) => {
          const key = line.driver_id || "unassigned";
          return !hidden.has(key) && (line.coordinates?.length || 0) >= 2;
        })
        .map((line) => ({
          key: line.driver_id || "unassigned",
          color: driverColor(line.driver_id, driverIds),
          positions: line.coordinates as [number, number][],
          dashed: line.method !== "osrm",
        }));
    }

    const byDriver = new Map<string, Stop[]>();
    for (const s of geocoded) {
      const key = s.driver_id || "unassigned";
      const list = byDriver.get(key) || [];
      list.push(s);
      byDriver.set(key, list);
    }
    const lines: { key: string; color: string; positions: [number, number][]; dashed: boolean }[] = [];
    for (const [key, list] of byDriver) {
      const ordered = sortPool(list).filter((s) => hasValidCoords(s.lat, s.lng));
      if (ordered.length < 2) continue;
      const color = driverColor(key === "unassigned" ? null : key, driverIds);
      lines.push({
        key,
        color,
        positions: ordered.map((s) => [Number(s.lat), Number(s.lng)] as [number, number]),
        dashed: true,
      });
    }
    return lines;
  }, [geocoded, driverIds, roadPolylines, hidden]);

  const usingOsrm = roadPolylines?.some((p) => p.method === "osrm" && p.coordinates.length >= 2);
  const center: [number, number] = points[0] || [43.6532, -79.3832];

  if (!points.length) {
    return (
      <div
        className={`h-full w-full flex flex-col items-center justify-center gap-2 p-6 bg-[#1A2332] ${
          fullBleed ? "" : "min-h-[240px] rounded-2xl border border-[#E5E9EF]"
        }`}
        data-testid="route-map-empty"
      >
        <p className="text-sm text-white/80 text-center max-w-sm">
          No geocoded stops to plot yet. Use Fix addresses to geocode, then stops appear on the map.
        </p>
        {attention.length > 0 && (
          <p className="text-xs text-amber-300 flex items-center gap-1">
            <WarningCircle size={14} /> {attention.length} stop{attention.length === 1 ? "" : "s"} need attention
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full min-h-0 ${fullBleed ? "" : "min-h-[240px]"}`}
      data-testid="route-map"
    >
      <div className={`absolute inset-0 overflow-hidden ${fullBleed ? "" : "rounded-2xl border border-[#E5E9EF]"}`}>
        <MapContainer
          center={center}
          zoom={12}
          className="h-full w-full z-0"
          scrollWheelZoom
          zoomControl={!fullBleed}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateSize />
          <FitBounds points={points} />

          {effectiveStart && hasValidCoords(effectiveStart.lat, effectiveStart.lng) ? (
            <Marker
              position={[Number(effectiveStart.lat), Number(effectiveStart.lng)]}
              icon={makeStartIcon()}
            >
              <Popup>
                <span className="text-xs font-medium">Start: {effectiveStart.label || "Start"}</span>
              </Popup>
            </Marker>
          ) : kitchen && hasValidCoords(kitchen.lat, kitchen.lng) ? (
            <Marker position={[Number(kitchen.lat), Number(kitchen.lng)]} icon={makeStartIcon()}>
              <Popup>
                <span className="text-xs font-medium">Kitchen start</span>
              </Popup>
            </Marker>
          ) : null}

          {polylines.map((line) => (
            <Polyline
              key={line.key}
              positions={line.positions}
              pathOptions={{
                color: line.color,
                weight: usingOsrm && !line.dashed ? 4 : 3,
                opacity: 0.85,
                dashArray: line.dashed ? "6 6" : undefined,
              }}
            />
          ))}

          {geocoded.map((s) => {
            const color = driverColor(s.driver_id, driverIds);
            const highlighted = highlightedStopId === s.id;
            const label = s.delivery_sequence != null ? String(s.delivery_sequence) : "·";
            return (
              <Marker
                key={s.id}
                position={[Number(s.lat), Number(s.lng)]}
                icon={makeDivIcon(color, label, highlighted)}
                eventHandlers={{
                  click: () => onStopClick?.(s.id),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-medium">{s.name || s.id}</p>
                    <p className="text-muted-foreground">{stopAddress(s)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {highlightedStopId &&
            geocoded
              .filter((s) => s.id === highlightedStopId)
              .map((s) => (
                <CircleMarker
                  key={`hl-${s.id}`}
                  center={[Number(s.lat), Number(s.lng)]}
                  radius={14}
                  pathOptions={{ color: "#00BFA5", fillOpacity: 0.15, weight: 2 }}
                />
              ))}
        </MapContainer>

        <p className="absolute bottom-3 left-3 z-[400] pointer-events-none text-[10px] text-white/90 bg-[#0B1220]/70 rounded-lg px-2.5 py-1.5">
          {usingOsrm
            ? "Road paths via OSRM · Open in Maps for turn-by-turn"
            : "Straight-line fallback · Open in Maps for driving directions"}
        </p>

        {attention.length > 0 && (
          <div
            className="absolute top-3 right-3 z-[400] max-w-[220px] rounded-xl border border-amber-200/80 bg-white/95 backdrop-blur px-3 py-2 text-xs text-amber-900 shadow-sm"
            data-testid="route-map-attention"
          >
            <p className="font-medium flex items-center gap-1">
              <WarningCircle size={14} /> Needs attention ({attention.length})
            </p>
          </div>
        )}
      </div>

      {!fullBleed && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#5C6570]" data-testid="route-map-legend">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: UNASSIGNED_COLOR }} /> Unassigned
          </span>
          {driverIds.slice(0, 6).map((id) => (
            <span key={id} className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: driverColor(id, driverIds) }} />
              Driver
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded" style={{ background: START_COLOR }} /> Start
          </span>
        </div>
      )}
    </div>
  );
}
