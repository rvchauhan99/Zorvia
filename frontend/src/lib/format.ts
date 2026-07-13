export function fmtCAD(n: number | string | undefined | null) {
  const val = typeof n === "number" ? n : Number(n || 0);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(val);
}

export function fmtDate(iso: string | Date | undefined | null) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso) : iso;
  return new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric" }).format(d);
}

export function fmtDateTime(iso: string | Date | undefined | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const WEEKDAYS = [
  { i: 0, s: "Mon" },
  { i: 1, s: "Tue" },
  { i: 2, s: "Wed" },
  { i: 3, s: "Thu" },
  { i: 4, s: "Fri" },
  { i: 5, s: "Sat" },
  { i: 6, s: "Sun" },
];
