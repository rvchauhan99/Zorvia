"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Printer } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { fmtDate, todayISO } from "@/lib/format";
import { mealSlotBadgeLabel } from "@/lib/mealSlots";
import { StatusFilterCards } from "@/components/StatusFilterCards";
import { InlineLoader } from "@/components/loaders";

type SlotFilter = "all" | "lunch" | "dinner" | "uncategorized";

export default function KitchenPage() {
  const [date, setDate] = useState(todayISO());
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: summary } = await api.get(`/reports/kitchen-summary?date=${date}`);
      setData(summary);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load kitchen plan");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const matrix = useMemo(() => {
    const rows = data?.matrix || [];
    if (slotFilter === "all") return rows;
    return rows.filter((r: any) => r.slot === slotFilter);
  }, [data, slotFilter]);

  const packList = useMemo(() => {
    const rows = data?.pack_list || [];
    if (slotFilter === "all") return rows;
    return rows.filter((r: any) => r.meal_slot === slotFilter);
  }, [data, slotFilter]);

  const typeNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of data?.matrix || []) names.add(r.meal_type_name || r.meal_type_id);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const slotsShown: SlotFilter[] =
    slotFilter === "all" ? ["lunch", "dinner", "uncategorized"] : [slotFilter];

  const slotCounts = data?.by_slot || {};
  const filterCards = [
    {
      id: "all",
      label: "All",
      count: data?.totals?.meals ?? 0,
    },
    {
      id: "lunch",
      label: "Lunch",
      count: slotCounts.lunch?.meals ?? 0,
    },
    {
      id: "dinner",
      label: "Dinner",
      count: slotCounts.dinner?.meals ?? 0,
    },
    {
      id: "uncategorized",
      label: "Uncategorized",
      count: slotCounts.uncategorized?.meals ?? 0,
    },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in-up" data-testid="kitchen-summary">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:flex-row">
        <div>
          <span className="label-overline">Cook plan</span>
          <h1 className="font-display font-black text-2xl sm:text-3xl mt-0.5">Kitchen</h1>
          <p className="text-sm text-muted-foreground mt-1 print:hidden">
            Meal counts by type and slot for packing. Pending + delivered only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <input
            type="date"
            data-testid="kitchen-date"
            className="h-11 px-3 rounded-xl bg-white border border-brand-border"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            data-testid="kitchen-print"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-brand-border bg-white text-sm font-medium hover:bg-brand-surface cursor-pointer"
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="print:hidden">
        <StatusFilterCards
          options={filterCards}
          value={slotFilter}
          onChange={(id) => setSlotFilter(id as SlotFilter)}
          testid="kitchen-slot-filter"
          itemTestIdPrefix="kitchen-filter"
        />
      </div>

      {loading ? (
        <InlineLoader testid="kitchen-loader" label="Loading cook plan…" />
      ) : !data ? (
        <div className="card-tinted p-6 text-center text-sm text-muted-foreground">Could not load kitchen plan.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="stat-card" data-testid="kitchen-total-meals">
              <span className="label-overline">Meals to cook</span>
              <div className="font-display font-black text-2xl">{data.totals?.meals ?? 0}</div>
              <div className="text-xs text-muted-foreground">{fmtDate(data.date || date)}</div>
            </div>
            <div className="stat-card" data-testid="kitchen-total-stops">
              <span className="label-overline">Stops</span>
              <div className="font-display font-black text-2xl">{data.totals?.stops ?? 0}</div>
            </div>
            {(data.types || []).slice(0, 2).map((t: any) => (
              <div key={t.id} className="stat-card" data-testid={`kitchen-type-${t.id}`}>
                <span className="label-overline">{t.name}</span>
                <div className="font-display font-black text-2xl">{t.meals}</div>
                <div className="text-xs text-muted-foreground">{t.stops} stops</div>
              </div>
            ))}
          </div>

          <div className="card-tinted p-4 sm:p-5 overflow-x-auto" data-testid="kitchen-matrix">
            <h2 className="font-display font-bold text-lg sm:text-xl mb-3">Production by type × slot</h2>
            {matrix.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending or delivered meals for this filter.</p>
            ) : (
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="text-left border-b border-brand-border">
                    <th className="py-2 pr-3 label-overline">Type</th>
                    {slotsShown.map((s) => (
                      <th key={s} className="py-2 px-2 label-overline text-right">
                        {mealSlotBadgeLabel(s)}
                      </th>
                    ))}
                    {slotFilter === "all" ? (
                      <th className="py-2 pl-2 label-overline text-right">Total</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {typeNames.map((name) => {
                    const cells = slotsShown.map((s) => {
                      const row = matrix.find(
                        (r: any) => (r.meal_type_name || r.meal_type_id) === name && r.slot === s
                      );
                      return row?.meals || 0;
                    });
                    const total = cells.reduce((a, b) => a + b, 0);
                    if (total === 0 && slotFilter !== "all") return null;
                    return (
                      <tr key={name} className="border-b border-brand-border/60">
                        <td className="py-2.5 pr-3 font-medium">{name}</td>
                        {cells.map((n, i) => (
                          <td key={slotsShown[i]} className="py-2.5 px-2 text-right font-semibold tabular-nums">
                            {n || "—"}
                          </td>
                        ))}
                        {slotFilter === "all" ? (
                          <td className="py-2.5 pl-2 text-right font-bold tabular-nums">{total}</td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card-tinted p-4 sm:p-5" data-testid="kitchen-pack-list">
            <h2 className="font-display font-bold text-lg sm:text-xl mb-1">Pack list</h2>
            <p className="text-xs text-muted-foreground mb-3 print:hidden">
              Labels for boxes — notes come from the customer profile.
            </p>
            {packList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stops to pack.</p>
            ) : (
              <ul className="divide-y divide-brand-border">
                {packList.map((row: any) => (
                  <li
                    key={row.delivery_id}
                    className="py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4"
                    data-testid={`kitchen-pack-${row.delivery_id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{row.customer_name}</div>
                      {row.notes ? (
                        <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{row.notes}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-brand-surface font-medium">{row.meal_type_name}</span>
                      <span className="px-2 py-0.5 rounded-full border border-brand-border">
                        {mealSlotBadgeLabel(row.meal_slot)}
                      </span>
                      <span className="font-semibold tabular-nums">{row.quantity} meal{row.quantity === 1 ? "" : "s"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
