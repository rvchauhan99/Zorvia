/** Meal slot helpers (lunch / dinner; legacy uncategorized maps to dinner). */

export type MealSlot = "lunch" | "dinner";

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  lunch: "Lunch",
  dinner: "Dinner",
};

/** Legacy display label — uncategorized shows as Dinner. */
const LEGACY_SLOT_LABELS: Record<string, string> = {
  ...MEAL_SLOT_LABELS,
  uncategorized: "Dinner",
};

export function normalizeMealSlots(raw: unknown): MealSlot[] {
  if (raw == null || raw === "") return ["dinner"];
  let parts: string[] = [];
  if (typeof raw === "string") {
    parts = raw.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  } else if (Array.isArray(raw)) {
    parts = raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  }
  if (!parts.length) return ["dinner"];
  parts = parts.map((p) => (p === "uncategorized" ? "dinner" : p));
  const cats = parts.filter((p) => p === "lunch" || p === "dinner") as MealSlot[];
  const ordered: MealSlot[] = [];
  if (cats.includes("lunch")) ordered.push("lunch");
  if (cats.includes("dinner")) ordered.push("dinner");
  return ordered.length ? ordered : ["dinner"];
}

export function isDualSlots(slots: MealSlot[]): boolean {
  return slots.includes("lunch") && slots.includes("dinner");
}

export function isCategorized(slots: MealSlot[]): boolean {
  return slots.some((s) => s === "lunch" || s === "dinner");
}

export function slotSchedulesFromLegacy(
  slots: MealSlot[],
  mealSchedule: Record<string, number>,
): Record<string, Record<string, number>> {
  if (!slots.length) return { dinner: { ...mealSchedule } };
  if (slots.length === 1) return { [slots[0]]: { ...mealSchedule } };
  return {};
}

export function unionDaysFromSlotSchedules(
  slotSchedules: Record<string, Record<string, number>>,
): number[] {
  const days = new Set<number>();
  for (const sched of Object.values(slotSchedules || {})) {
    for (const [k, v] of Object.entries(sched || {})) {
      const d = parseInt(k, 10);
      if (!Number.isNaN(d) && d >= 0 && d <= 6 && (v || 0) >= 1) days.add(d);
    }
  }
  return [...days].sort((a, b) => a - b);
}

export function mirrorScheduleFromSlots(
  slotSchedules: Record<string, Record<string, number>>,
  slots: MealSlot[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const s of slots) {
    const sched = slotSchedules[s] || (s === "dinner" ? slotSchedules.uncategorized : undefined) || {};
    for (const [k, v] of Object.entries(sched)) {
      totals[k] = (totals[k] || 0) + (Number(v) || 0);
    }
  }
  return totals;
}

export function customerSlotSummary(c: {
  meal_slots?: unknown;
  slot_schedules?: Record<string, Record<string, number>>;
  meal_schedule?: Record<string, number>;
}): string {
  const slots = normalizeMealSlots(c.meal_slots);
  const ss = c.slot_schedules || {};
  const parts: string[] = [];
  for (const s of slots) {
    const sched =
      ss[s] ||
      (s === "dinner" ? ss.uncategorized : undefined) ||
      (slots.length === 1 ? c.meal_schedule : undefined) ||
      {};
    const qtys = Object.values(sched);
    let label = "×1";
    if (qtys.length) {
      label = new Set(qtys).size === 1 ? `×${qtys[0]}` : "var";
    }
    parts.push(`${MEAL_SLOT_LABELS[s]} ${label}`);
  }
  return parts.join(" · ") || "Dinner ×1";
}

export function mealSlotBadgeLabel(slot: unknown): string {
  const s = String(slot || "dinner").toLowerCase();
  return LEGACY_SLOT_LABELS[s] || MEAL_SLOT_LABELS.dinner;
}
