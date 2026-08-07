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

type Props = {
  stops: Stop[];
  kitchen?: Kitchen | null;
  effectiveStart?: EffectiveStart | null;
  driverIds: string[];
  highlightedStopId?: string | null;
  onStopClick?: (stopId: string) => void;
};

function FitBounds({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds.pad(0.15));
  }, [map, points]);
  return null;
}

function makeDivIcon(color: string, label: string, highlighted: boolean) {
  const size = highlighted ? 28 : 22;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};color:#fff;font-size:10px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);
      ${highlighted ? "outline:3px solid rgba(14,143,139,.55);" : ""}
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
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
    ">S</div>`,
  });
}

export default function RouteMap({
  stops,
  kitchen,
  effectiveStart,
  driverIds,
  highlightedStopId,
  onStopClick,
}: Props) {
  const geocoded = useMemo(
    () => stops.filter((s) => hasValidCoords(s.lat, s.lng)),
    [stops]
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
    const byDriver = new Map<string, Stop[]>();
    for (const s of geocoded) {
      const key = s.driver_id || "unassigned";
      const list = byDriver.get(key) || [];
      list.push(s);
      byDriver.set(key, list);
    }
    const lines: { key: string; color: string; positions: [number, number][] }[] = [];
    for (const [key, list] of byDriver) {
      const ordered = sortPool(list).filter((s) => hasValidCoords(s.lat, s.lng));
      if (ordered.length < 2) continue;
      const color = driverColor(key === "unassigned" ? null : key, driverIds);
      lines.push({
        key,
        color,
        positions: ordered.map((s) => [Number(s.lat), Number(s.lng)] as [number, number]),
      });
    }
    return lines;
  }, [geocoded, driverIds]);

  const center: [number, number] = points[0] || [43.6532, -79.3832];

  if (!points.length) {
    return (
      <div
        className="h-full min-h-[240px] rounded-2xl border border-brand-border bg-brand-surface/40 flex flex-col items-center justify-center gap-2 p-4"
        data-testid="route-map-empty"
      >
        <p className="text-sm text-muted-foreground text-center">
          No geocoded stops to plot yet. Geocode addresses in Setup to see them on the map.
        </p>
        {attention.length > 0 && (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <WarningCircle size={14} /> {attention.length} stop{attention.length === 1 ? "" : "s"} need attention
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full min-h-[240px]" data-testid="route-map">
      <div className="relative flex-1 min-h-[240px] rounded-2xl overflow-hidden border border-brand-border">
        <MapContainer
          center={center}
          zoom={12}
          className="h-full w-full min-h-[240px] z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
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
              pathOptions={{ color: line.color, weight: 3, opacity: 0.7, dashArray: "6 6" }}
            />
          ))}

          {geocoded.map((s) => {
            const color = driverColor(s.driver_id, driverIds);
            const highlighted = highlightedStopId === s.id;
            const label =
              s.delivery_sequence != null ? String(s.delivery_sequence) : "·";
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
                  pathOptions={{ color: "#0E8F8B", fillOpacity: 0.15, weight: 2 }}
                />
              ))}
        </MapContainer>
        <p className="absolute bottom-2 left-2 right-2 z-[400] pointer-events-none text-[10px] text-white/90 bg-black/45 rounded-lg px-2 py-1">
          Straight-line paths — not road-accurate. Use Open in Maps for driving directions.
        </p>
      </div>

      {attention.length > 0 && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="route-map-attention"
        >
          <p className="font-medium flex items-center gap-1">
            <WarningCircle size={14} /> Needs attention ({attention.length})
          </p>
          <ul className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
            {attention.slice(0, 8).map((s) => (
              <li key={s.id} className="truncate">
                {s.name || s.id}
                <span className="text-amber-700/80">
                  {" · "}
                  {s.geocode_status !== "ok" ? "geocode" : "unplaced"}
                </span>
              </li>
            ))}
            {attention.length > 8 && (
              <li className="text-amber-700/80">+{attention.length - 8} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground" data-testid="route-map-legend">
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
    </div>
  );
}
