import type { BulkRangeRow, Driver, Kitchen, PoolSection, Stop } from "./types";

export function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function stopAddress(s: Stop) {
  return [s.address, s.apartment, s.city, s.postal_code].filter(Boolean).join(", ");
}

export function kitchenAddressLine(kitchen: Kitchen) {
  if (kitchen.street || kitchen.city || kitchen.province || kitchen.postal_code) {
    return [kitchen.street, kitchen.apartment, kitchen.city, kitchen.province, kitchen.postal_code]
      .map((p) => (p || "").trim())
      .filter(Boolean)
      .join(", ");
  }
  return (kitchen.address || "").trim();
}

export function mapsUrlForStops(originAddress: string, stops: Stop[]) {
  const parts = [originAddress, ...stops.map(stopAddress)].filter(Boolean);
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

export function sortPool(stops: Stop[]) {
  return [...stops].sort((a, b) => {
    const as = a.delivery_sequence ?? 1e9;
    const bs = b.delivery_sequence ?? 1e9;
    if (as !== bs) return as - bs;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export function seqSpan(stops: Stop[]): { min: number; max: number; counted: number } | null {
  const seqs = stops
    .map((s) => s.delivery_sequence)
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (!seqs.length) return null;
  return { min: Math.min(...seqs), max: Math.max(...seqs), counted: seqs.length };
}

export function newBulkRow(driverId = ""): BulkRangeRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: "",
    to: "",
    driverId,
  };
}

export function countInRange(stops: Stop[], from: number, to: number): number {
  return stops.filter((s) => {
    const seq = s.delivery_sequence;
    return seq != null && seq >= from && seq <= to;
  }).length;
}

/** Even contiguous ranges over [minSeq, maxSeq] for the given driver ids (in order). */
export function evenSplitRanges(
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

export function buildSections(stops: Stop[], drivers: Driver[]): PoolSection[] {
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
}

export function hasValidCoords(lat?: number | null, lng?: number | null) {
  return lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

export function isIssueStop(s: Stop) {
  return s.delivery_sequence == null || s.geocode_status !== "ok";
}

/** Deterministic color palette for driver pools on the map. */
const DRIVER_COLORS = [
  "#0E8F8B",
  "#2A9D7A",
  "#F5A524",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#14B8A6",
  "#F97316",
  "#6366F1",
];

export const UNASSIGNED_COLOR = "#94A3B8";
export const START_COLOR = "#0F172A";

export function driverColor(driverId: string | null | undefined, driverIds: string[]): string {
  if (!driverId) return UNASSIGNED_COLOR;
  const idx = driverIds.indexOf(driverId);
  const i = idx >= 0 ? idx : Math.abs(hashString(driverId)) % DRIVER_COLORS.length;
  return DRIVER_COLORS[i % DRIVER_COLORS.length];
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function startSourceLabel(source?: string | null) {
  switch (source) {
    case "override":
      return "Temporary";
    case "default":
      return "Default";
    case "kitchen_fallback":
      return "Kitchen";
    default:
      return source || "Start";
  }
}

export function stopMatchesQuery(s: Stop, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [s.name, s.address, s.apartment, s.city, s.postal_code, s.phone, s.id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
