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

export function deliveryQty(d: { quantity?: number } | null | undefined) {
  const q = Number(d?.quantity);
  return Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1;
}

export function deliveryLineAmount(d: { meal_price?: number; quantity?: number } | null | undefined) {
  return (Number(d?.meal_price) || 0) * deliveryQty(d);
}

/** Always-clear meal count for ops UIs: "1 meal" / "N meals". */
export function fmtMealCount(d: { quantity?: number } | null | undefined) {
  const qty = deliveryQty(d);
  return qty === 1 ? "1 meal" : `${qty} meals`;
}

/** Breakdown when a stop has multiple type×qty lines, e.g. "Regular×2 + Jain×1". */
export function fmtMealTypeLinesBreakdown(
  d:
    | {
        meal_type_lines?: Array<{
          meal_type_id?: string;
          meal_type_name?: string;
          quantity?: number;
        }>;
      }
    | null
    | undefined,
): string {
  const lines = d?.meal_type_lines;
  if (!Array.isArray(lines) || lines.length <= 1) return "";
  return lines
    .map((ln) => {
      const name = (ln.meal_type_name || ln.meal_type_id || "Meal").trim();
      const q = Math.max(1, Math.floor(Number(ln.quantity) || 1));
      return `${name}×${q}`;
    })
    .join(" + ");
}

/** Extra portion badge, e.g. "+2 extra"; empty string when none. */
export function fmtExtraBadge(d: { extra_quantity?: number } | null | undefined) {
  const n = Math.max(0, Math.floor(Number(d?.extra_quantity) || 0));
  if (n < 1) return "";
  return n === 1 ? "+1 extra" : `+${n} extra`;
}

/** e.g. "$24.00 · ×2" when qty > 1, else "$12.00" (admin money contexts only). */
export function fmtDeliveryLine(d: { meal_price?: number; quantity?: number } | null | undefined) {
  const qty = deliveryQty(d);
  const total = fmtCAD(deliveryLineAmount(d));
  return qty > 1 ? `${total} · ×${qty}` : total;
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
