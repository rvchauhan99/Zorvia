/** Qty-wise meal type × quantity × unit price lines (CRM + adjust UI). */

export const MAX_MEAL_TYPE_LINES = 5;
export const MAX_LINE_TOTAL_QTY = 20;

export type MealTypeOption = { id: string; name: string; price: number };

export type MealTypeLine = {
  meal_type_id: string;
  quantity: number;
  unit_price: number;
};

/** slot → weekday "0"…"6" → lines[] */
export type SlotMealTypeLines = Record<string, Record<string, MealTypeLine[]>>;

export function clampLineQty(n: unknown): number {
  const q = Math.floor(Number(n) || 0);
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(MAX_LINE_TOTAL_QTY, q);
}

export function linesTotalQty(lines: MealTypeLine[] | null | undefined): number {
  if (!Array.isArray(lines) || !lines.length) return 0;
  return lines.reduce((sum, ln) => sum + clampLineQty(ln.quantity), 0);
}

export function linesTotalAmount(lines: MealTypeLine[] | null | undefined): number {
  if (!Array.isArray(lines) || !lines.length) return 0;
  return lines.reduce(
    (sum, ln) => sum + clampLineQty(ln.quantity) * (Number(ln.unit_price) || 0),
    0,
  );
}

export function normalizeLine(
  row: Partial<MealTypeLine> & { meal_price?: number },
  opts?: { defaultTypeId?: string; defaultPrice?: number },
): MealTypeLine | null {
  const tid = String(row.meal_type_id || opts?.defaultTypeId || "").trim();
  if (!tid) return null;
  const priceRaw = row.unit_price ?? row.meal_price ?? opts?.defaultPrice ?? 12;
  const price = Number(priceRaw);
  return {
    meal_type_id: tid,
    quantity: clampLineQty(row.quantity),
    unit_price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : 12,
  };
}

export function normalizeLines(
  raw: unknown,
  opts?: { defaultTypeId?: string; defaultPrice?: number },
): MealTypeLine[] {
  if (!Array.isArray(raw)) return [];
  const out: MealTypeLine[] = [];
  let total = 0;
  for (const row of raw.slice(0, MAX_MEAL_TYPE_LINES)) {
    if (!row || typeof row !== "object") continue;
    const ln = normalizeLine(row as Partial<MealTypeLine>, opts);
    if (!ln) continue;
    if (total + ln.quantity > MAX_LINE_TOTAL_QTY) {
      ln.quantity = Math.max(1, MAX_LINE_TOTAL_QTY - total);
    }
    total += ln.quantity;
    out.push(ln);
    if (total >= MAX_LINE_TOTAL_QTY) break;
  }
  return out;
}

export function defaultLine(
  opts: { typeId?: string; qty?: number; price?: number; mealTypeOptions?: MealTypeOption[] },
): MealTypeLine {
  const tid = opts.typeId || opts.mealTypeOptions?.[0]?.id || "regular";
  const catalog = opts.mealTypeOptions?.find((t) => t.id === tid);
  const price = opts.price ?? catalog?.price ?? 12;
  return {
    meal_type_id: tid,
    quantity: clampLineQty(opts.qty ?? 1),
    unit_price: Number(price) > 0 ? Number(price) : 12,
  };
}

export function priceForTypeId(
  mealTypeOptions: MealTypeOption[] | undefined,
  typeId: string,
  fallback = 12,
): number {
  const row = mealTypeOptions?.find((t) => t.id === typeId);
  const p = Number(row?.price);
  return Number.isFinite(p) && p > 0 ? p : fallback;
}

/** Rebuild slot_schedules weekday qty = sum(line qty). */
export function slotSchedulesFromLines(
  linesMap: SlotMealTypeLines | null | undefined,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!linesMap || typeof linesMap !== "object") return out;
  for (const [slot, days] of Object.entries(linesMap)) {
    if (!days || typeof days !== "object") continue;
    const dayOut: Record<string, number> = {};
    for (const [wd, lines] of Object.entries(days)) {
      const q = linesTotalQty(lines);
      if (q >= 1) dayOut[String(wd)] = q;
    }
    if (Object.keys(dayOut).length) out[slot] = dayOut;
  }
  return out;
}

/** First line meal_type_id + unit_price across map (legacy primary fields). */
export function primaryFromTypeLines(
  linesMap: SlotMealTypeLines | null | undefined,
): { meal_type_id: string; meal_price: number } {
  if (linesMap && typeof linesMap === "object") {
    for (const slot of ["lunch", "dinner"] as const) {
      const days = linesMap[slot];
      if (!days) continue;
      for (let wd = 0; wd <= 6; wd++) {
        const lines = days[String(wd)];
        if (Array.isArray(lines) && lines.length) {
          const row = lines[0];
          return {
            meal_type_id: row.meal_type_id || "regular",
            meal_price: Number(row.unit_price) > 0 ? Number(row.unit_price) : 12,
          };
        }
      }
    }
    for (const days of Object.values(linesMap)) {
      if (!days) continue;
      for (const lines of Object.values(days)) {
        if (Array.isArray(lines) && lines.length) {
          const row = lines[0];
          return {
            meal_type_id: row.meal_type_id || "regular",
            meal_price: Number(row.unit_price) > 0 ? Number(row.unit_price) : 12,
          };
        }
      }
    }
  }
  return { meal_type_id: "regular", meal_price: 12 };
}

export function broadcastLinesToDays(
  days: number[],
  lines: MealTypeLine[],
): Record<string, MealTypeLine[]> {
  const cleaned = normalizeLines(lines);
  const out: Record<string, MealTypeLine[]> = {};
  for (const d of days) {
    if (d < 0 || d > 6) continue;
    if (cleaned.length) out[String(d)] = cleaned.map((ln) => ({ ...ln }));
  }
  return out;
}

export function uniformLinesForSlot(
  linesMap: SlotMealTypeLines | null | undefined,
  slot: string,
  days: number[],
): MealTypeLine[] {
  if (!days.length) return [];
  const map = linesMap?.[slot] || {};
  const first = normalizeLines(map[String(days[0])] || []);
  if (!first.length) return [];
  const key = JSON.stringify(first);
  for (const d of days) {
    const cur = normalizeLines(map[String(d)] || []);
    if (JSON.stringify(cur) !== key) return [];
  }
  return first;
}

export function detectLinesScheduleMode(
  linesMap: SlotMealTypeLines | null | undefined,
  slots: string[],
): "same" | "custom" {
  for (const slot of slots) {
    const days = linesMap?.[slot];
    if (!days || !Object.keys(days).length) continue;
    const keys = Object.keys(days);
    const first = JSON.stringify(normalizeLines(days[keys[0]] || []));
    for (const k of keys) {
      if (JSON.stringify(normalizeLines(days[k] || [])) !== first) return "custom";
    }
  }
  return "same";
}

/** Build lines map from legacy schedules + single type/price (or sparse slot_meal_types). */
export function linesFromLegacySchedule(opts: {
  slots: string[];
  slotSchedules: Record<string, Record<string, number>>;
  mealTypeId?: string;
  mealPrice?: number;
  slotMealTypes?: Record<string, Record<string, string>>;
  mealTypeOptions?: MealTypeOption[];
}): SlotMealTypeLines {
  const defaultId = opts.mealTypeId || "regular";
  const defaultPrice =
    Number(opts.mealPrice) > 0
      ? Number(opts.mealPrice)
      : priceForTypeId(opts.mealTypeOptions, defaultId);
  const out: SlotMealTypeLines = {};
  for (const slot of opts.slots) {
    const sched = opts.slotSchedules[slot] || {};
    const dayMap: Record<string, MealTypeLine[]> = {};
    for (const [wd, qty] of Object.entries(sched)) {
      const q = Math.floor(Number(qty) || 0);
      if (q < 1) continue;
      const tid =
        (opts.slotMealTypes?.[slot]?.[String(wd)] || "").trim() || defaultId;
      dayMap[String(wd)] = [
        defaultLine({
          typeId: tid,
          qty: q,
          price: priceForTypeId(opts.mealTypeOptions, tid, defaultPrice),
          mealTypeOptions: opts.mealTypeOptions,
        }),
      ];
    }
    if (Object.keys(dayMap).length) out[slot] = dayMap;
  }
  return out;
}

/** Parse API slot_meal_type_lines into FE shape. */
export function parseSlotMealTypeLines(
  raw: unknown,
  fallback?: {
    slots: string[];
    slotSchedules: Record<string, Record<string, number>>;
    mealTypeId?: string;
    mealPrice?: number;
    slotMealTypes?: Record<string, Record<string, string>>;
    mealTypeOptions?: MealTypeOption[];
  },
): SlotMealTypeLines {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const out: SlotMealTypeLines = {};
    for (const [slot, days] of Object.entries(raw as Record<string, unknown>)) {
      if (!days || typeof days !== "object") continue;
      const dayMap: Record<string, MealTypeLine[]> = {};
      for (const [wd, linesRaw] of Object.entries(days as Record<string, unknown>)) {
        const lines = normalizeLines(linesRaw);
        if (lines.length) dayMap[String(wd)] = lines;
      }
      if (Object.keys(dayMap).length) out[slot] = dayMap;
    }
    if (Object.keys(out).length) return out;
  }
  if (fallback) return linesFromLegacySchedule(fallback);
  return {};
}

/** API payload shape (unit_price). */
export function serializeSlotMealTypeLines(
  linesMap: SlotMealTypeLines,
): Record<string, Record<string, Array<{ meal_type_id: string; quantity: number; unit_price: number }>>> {
  const out: Record<
    string,
    Record<string, Array<{ meal_type_id: string; quantity: number; unit_price: number }>>
  > = {};
  for (const [slot, days] of Object.entries(linesMap || {})) {
    const dayOut: Record<
      string,
      Array<{ meal_type_id: string; quantity: number; unit_price: number }>
    > = {};
    for (const [wd, lines] of Object.entries(days || {})) {
      const cleaned = normalizeLines(lines);
      if (cleaned.length) {
        dayOut[String(wd)] = cleaned.map((ln) => ({
          meal_type_id: ln.meal_type_id,
          quantity: ln.quantity,
          unit_price: ln.unit_price,
        }));
      }
    }
    if (Object.keys(dayOut).length) out[slot] = dayOut;
  }
  return out;
}

/** e.g. "Regular×2 + Jain×1" when multiple types. */
export function formatMealTypeLinesBreakdown(
  lines:
    | Array<{
        meal_type_id?: string;
        meal_type_name?: string;
        quantity?: number;
        name?: string;
      }>
    | null
    | undefined,
  nameById?: Record<string, string>,
): string {
  if (!Array.isArray(lines) || lines.length <= 1) return "";
  return lines
    .map((ln) => {
      const name =
        (ln.meal_type_name || ln.name || nameById?.[String(ln.meal_type_id || "")] || ln.meal_type_id || "Meal").trim();
      const q = Math.max(1, Math.floor(Number(ln.quantity) || 1));
      return `${name}×${q}`;
    })
    .join(" + ");
}

export function unionDaysFromLines(linesMap: SlotMealTypeLines): number[] {
  const set = new Set<number>();
  for (const days of Object.values(linesMap || {})) {
    for (const [wd, lines] of Object.entries(days || {})) {
      if (linesTotalQty(lines) >= 1) {
        const n = parseInt(wd, 10);
        if (!Number.isNaN(n) && n >= 0 && n <= 6) set.add(n);
      }
    }
  }
  return [...set].sort((a, b) => a - b);
}
