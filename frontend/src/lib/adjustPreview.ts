/** Client-side projection of kitchen day summary for Adjust meal preview (no write). */

export type DaySummaryPackLine = {
  delivery_id?: string;
  customer_id?: string;
  customer_name?: string;
  meal_type_id?: string;
  meal_type_name?: string;
  meal_slot?: string;
  quantity?: number;
  notes?: string;
  status?: string;
  route_order?: number | null;
  meal_type_lines?: Array<{
    meal_type_id?: string;
    meal_type_name?: string;
    quantity?: number;
    meal_price?: number;
  }>;
};

export type DaySummary = {
  date: string;
  totals?: { meals?: number; stops?: number };
  by_slot?: Record<string, { meals: number; stops: number }>;
  matrix?: Array<{
    meal_type_id: string;
    meal_type_name: string;
    slot: string;
    meals: number;
    stops: number;
  }>;
  types?: Array<{ id: string; name: string; meals: number; stops: number }>;
  pack_list?: DaySummaryPackLine[];
};

export type AdjustPreviewLine = {
  meal_type_id: string;
  meal_type_name: string;
  quantity: number;
};

export type AdjustPreviewPatch = {
  customer_id: string;
  customer_name?: string;
  meal_slot: string;
  meal_type_id: string;
  meal_type_name: string;
  /** Absolute qty; 0 removes the customer's line(s) for that slot from the projected pack. */
  quantity: number;
  /** When set (multi-type), expand into one pack row per type line. */
  meal_type_lines?: AdjustPreviewLine[];
};

function normSlot(slot?: string | null): string {
  const s = String(slot || "dinner").toLowerCase();
  if (s === "lunch" || s === "dinner") return s;
  return "dinner";
}

/** Rebuild matrix / totals / by_slot from a pack list. */
export function recomputeDaySummaryFromPack(
  date: string,
  packList: DaySummaryPackLine[],
): DaySummary {
  const by_slot: Record<string, { meals: number; stops: number }> = {
    lunch: { meals: 0, stops: 0 },
    dinner: { meals: 0, stops: 0 },
  };
  const matrixKey = new Map<string, {
    meal_type_id: string;
    meal_type_name: string;
    slot: string;
    meals: number;
    stops: number;
  }>();
  const typeTotals = new Map<string, { id: string; name: string; meals: number; stops: number }>();
  let totalMeals = 0;
  let totalStops = 0;

  // Group by customer×slot for stop counting (multi-type lines share one stop)
  const stopKeys = new Set<string>();

  for (const row of packList) {
    const qty = Math.max(1, Number(row.quantity) || 1);
    const slot = normSlot(row.meal_slot);
    const mtId = String(row.meal_type_id || "regular");
    const mtName = String(row.meal_type_name || mtId).trim() || mtId;
    const cid = String(row.customer_id || "");
    const stopKey = `${cid}::${slot}`;
    const isNewStop = !stopKeys.has(stopKey);
    if (isNewStop) stopKeys.add(stopKey);

    totalMeals += qty;
    if (isNewStop) totalStops += 1;
    if (!by_slot[slot]) by_slot[slot] = { meals: 0, stops: 0 };
    by_slot[slot].meals += qty;
    if (isNewStop) by_slot[slot].stops += 1;

    const mk = `${mtId}::${slot}`;
    const existing = matrixKey.get(mk);
    if (existing) {
      existing.meals += qty;
      if (isNewStop) existing.stops += 1;
      existing.meal_type_name = mtName;
    } else {
      matrixKey.set(mk, {
        meal_type_id: mtId,
        meal_type_name: mtName,
        slot,
        meals: qty,
        stops: 1,
      });
    }

    const tt = typeTotals.get(mtId);
    if (tt) {
      tt.meals += qty;
      if (isNewStop) tt.stops += 1;
      tt.name = mtName;
    } else {
      typeTotals.set(mtId, { id: mtId, name: mtName, meals: qty, stops: 1 });
    }
  }

  const slotRank: Record<string, number> = { lunch: 0, dinner: 1 };
  const matrix = Array.from(matrixKey.values()).sort(
    (a, b) => (slotRank[a.slot] ?? 9) - (slotRank[b.slot] ?? 9) || a.meal_type_name.localeCompare(b.meal_type_name),
  );
  const types = Array.from(typeTotals.values()).sort(
    (a, b) => b.meals - a.meals || a.name.localeCompare(b.name),
  );

  return {
    date,
    totals: { meals: totalMeals, stops: totalStops },
    by_slot,
    matrix,
    types,
    pack_list: packList,
  };
}

/**
 * Apply a proposed adjust onto an existing kitchen-summary (or empty base).
 * Qty 0 removes the customer's line(s) for that meal_slot.
 * Multi-type patches expand into one pack row per line (same customer×slot).
 */
export function projectDaySummary(
  base: DaySummary | null | undefined,
  patch: AdjustPreviewPatch,
): DaySummary {
  const date = base?.date || "";
  const slot = normSlot(patch.meal_slot);
  const prev = Array.isArray(base?.pack_list) ? [...base!.pack_list!] : [];
  const cid = patch.customer_id;
  const qty = Math.max(0, Math.floor(Number(patch.quantity) || 0));
  const multi = Array.isArray(patch.meal_type_lines)
    ? patch.meal_type_lines.filter((ln) => Math.floor(Number(ln.quantity) || 0) >= 1)
    : null;

  // Always clear existing pack rows for this customer×slot first
  const without = prev.filter(
    (row) => !(row.customer_id === cid && normSlot(row.meal_slot) === slot),
  );

  if (qty === 0 || (multi && !multi.length)) {
    return recomputeDaySummaryFromPack(date, without);
  }

  if (multi && multi.length) {
    const next = [
      ...without,
      ...multi.map((ln) => ({
        customer_id: cid,
        customer_name: patch.customer_name || "",
        meal_type_id: ln.meal_type_id,
        meal_type_name: ln.meal_type_name,
        meal_slot: slot,
        quantity: Math.max(1, Math.floor(Number(ln.quantity) || 1)),
        status: "pending" as const,
        meal_type_lines: multi.map((x) => ({
          meal_type_id: x.meal_type_id,
          meal_type_name: x.meal_type_name,
          quantity: Math.max(1, Math.floor(Number(x.quantity) || 1)),
        })),
      })),
    ];
    return recomputeDaySummaryFromPack(date, next);
  }

  const next: DaySummaryPackLine[] = [
    ...without,
    {
      customer_id: cid,
      customer_name: patch.customer_name || "",
      meal_type_id: patch.meal_type_id,
      meal_type_name: patch.meal_type_name,
      meal_slot: slot,
      quantity: qty,
      status: "pending",
    },
  ];
  return recomputeDaySummaryFromPack(date, next);
}

/** Apply multiple slot patches (order matters; later overwrites same slot). */
export function projectDaySummaryMulti(
  base: DaySummary | null | undefined,
  patches: AdjustPreviewPatch[],
): DaySummary {
  let cur: DaySummary = base
    ? { ...base, pack_list: Array.isArray(base.pack_list) ? [...base.pack_list] : [] }
    : { date: "", pack_list: [] };
  for (const p of patches) {
    cur = projectDaySummary(cur, p);
  }
  return cur;
}

/** Slim consumer preview from own deliveries for a date + proposed patch(es). */
export function projectConsumerDaySummary(
  date: string,
  deliveries: Array<{
    id?: string;
    customer_id?: string;
    customer_name?: string;
    meal_type_id?: string;
    meal_type_name?: string;
    meal_slot?: string;
    quantity?: number;
    status?: string;
    delivery_date?: string;
    meal_type_lines?: DaySummaryPackLine["meal_type_lines"];
  }>,
  patch: AdjustPreviewPatch | AdjustPreviewPatch[],
): DaySummary {
  const dayRows = (deliveries || []).filter(
    (d) =>
      d.delivery_date === date &&
      (d.status === "pending" || d.status === "delivered"),
  );
  const patches = Array.isArray(patch) ? patch : [patch];
  const cid = patches[0]?.customer_id || "";
  const cname = patches[0]?.customer_name || "";
  const base: DaySummary = {
    date,
    pack_list: dayRows.flatMap((d) => {
      const lines = Array.isArray(d.meal_type_lines) ? d.meal_type_lines : null;
      if (lines && lines.length > 1) {
        return lines.map((ln) => ({
          delivery_id: d.id,
          customer_id: d.customer_id || cid,
          customer_name: d.customer_name || cname || "",
          meal_type_id: ln.meal_type_id || d.meal_type_id,
          meal_type_name: ln.meal_type_name || d.meal_type_name,
          meal_slot: d.meal_slot || "dinner",
          quantity: ln.quantity ?? d.quantity,
          status: d.status,
          meal_type_lines: lines,
        }));
      }
      return [
        {
          delivery_id: d.id,
          customer_id: d.customer_id || cid,
          customer_name: d.customer_name || cname || "",
          meal_type_id: d.meal_type_id,
          meal_type_name: d.meal_type_name,
          meal_slot: d.meal_slot || "dinner",
          quantity: d.quantity,
          status: d.status,
          meal_type_lines: lines || undefined,
        },
      ];
    }),
  };
  return projectDaySummaryMulti(base, patches);
}
