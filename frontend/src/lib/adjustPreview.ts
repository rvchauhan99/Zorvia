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

export type AdjustPreviewPatch = {
  customer_id: string;
  customer_name?: string;
  meal_slot: string;
  meal_type_id: string;
  meal_type_name: string;
  quantity: number;
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

  for (const row of packList) {
    const qty = Math.max(1, Number(row.quantity) || 1);
    const slot = normSlot(row.meal_slot);
    const mtId = String(row.meal_type_id || "regular");
    const mtName = String(row.meal_type_name || mtId).trim() || mtId;
    totalMeals += qty;
    totalStops += 1;
    if (!by_slot[slot]) by_slot[slot] = { meals: 0, stops: 0 };
    by_slot[slot].meals += qty;
    by_slot[slot].stops += 1;

    const mk = `${mtId}::${slot}`;
    const existing = matrixKey.get(mk);
    if (existing) {
      existing.meals += qty;
      existing.stops += 1;
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
      tt.stops += 1;
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
 * Replaces the customer's line for that meal_slot, or appends if missing.
 */
export function projectDaySummary(
  base: DaySummary | null | undefined,
  patch: AdjustPreviewPatch,
): DaySummary {
  const date = base?.date || "";
  const slot = normSlot(patch.meal_slot);
  const prev = Array.isArray(base?.pack_list) ? [...base!.pack_list!] : [];
  const cid = patch.customer_id;
  let replaced = false;
  const next: DaySummaryPackLine[] = prev.map((row) => {
    if (row.customer_id !== cid) return row;
    if (normSlot(row.meal_slot) !== slot) return row;
    replaced = true;
    return {
      ...row,
      meal_type_id: patch.meal_type_id,
      meal_type_name: patch.meal_type_name,
      meal_slot: slot,
      quantity: Math.max(1, patch.quantity),
      customer_name: patch.customer_name || row.customer_name,
      status: row.status || "pending",
    };
  });
  if (!replaced) {
    next.push({
      customer_id: cid,
      customer_name: patch.customer_name || "",
      meal_type_id: patch.meal_type_id,
      meal_type_name: patch.meal_type_name,
      meal_slot: slot,
      quantity: Math.max(1, patch.quantity),
      status: "pending",
    });
  }
  return recomputeDaySummaryFromPack(date, next);
}

/** Slim consumer preview from own deliveries for a date + proposed patch. */
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
  }>,
  patch: AdjustPreviewPatch,
): DaySummary {
  const dayRows = (deliveries || []).filter(
    (d) =>
      d.delivery_date === date &&
      (d.status === "pending" || d.status === "delivered"),
  );
  const base: DaySummary = {
    date,
    pack_list: dayRows.map((d) => ({
      delivery_id: d.id,
      customer_id: d.customer_id || patch.customer_id,
      customer_name: d.customer_name || patch.customer_name || "",
      meal_type_id: d.meal_type_id,
      meal_type_name: d.meal_type_name,
      meal_slot: d.meal_slot || "dinner",
      quantity: d.quantity,
      status: d.status,
    })),
  };
  return projectDaySummary(base, patch);
}
