"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Printer,
  CookingPot,
  MagnifyingGlass,
  CalendarBlank,
  SunHorizon,
  Moon,
  Tray,
  Package,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isDriver as sessionIsDriver } from "@/lib/roles";
import { fmtDate, todayISO } from "@/lib/format";
import { mealSlotBadgeLabel } from "@/lib/mealSlots";
import { InlineLoader } from "@/components/loaders";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import SearchableSelect from "@/components/SearchableSelect";
import CityFilterSelect from "@/components/CityFilterSelect";
import { OPS_DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";

type SlotFilter = "all" | "lunch" | "dinner";

const SLOT_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; border: string; label: string }
> = {
  all: {
    icon: Tray,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/25",
    label: "All Slots",
  },
  lunch: {
    icon: SunHorizon,
    color: "text-brand-amber",
    bg: "bg-brand-amber/10",
    border: "border-brand-amber/25",
    label: "Lunch",
  },
  dinner: {
    icon: Moon,
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/25",
    label: "Dinner",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function AvatarChip({ name }: { name: string }) {
  const initials = getInitials(name);
  const colors = [
    "bg-primary/15 text-primary",
    "bg-secondary/15 text-secondary",
    "bg-brand-amber/15 text-brand-amber",
    "bg-purple-100 text-purple-700",
  ];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${colors[idx]}`}
    >
      {initials}
    </span>
  );
}

function SlotBadge({ slot }: { slot: string }) {
  const cfg = SLOT_CONFIG[slot] ?? SLOT_CONFIG.dinner;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      <Icon size={12} weight="bold" />
      {cfg.label || mealSlotBadgeLabel(slot)}
    </span>
  );
}

export default function KitchenPage() {
  const { session } = useAuth();
  const isDriver = sessionIsDriver(session);
  const [date, setDate] = useState(todayISO());
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [driverId, setDriverId] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const paging = useCursorPagination({ initialPageSize: OPS_DEFAULT_PAGE_SIZE });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (opts: { cursor?: string | null } = {}) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          date,
          page_size: String(paging.pageSize),
        };
        if (debouncedQ) params.q = debouncedQ;
        if (!isDriver && driverId) params.driver_id = driverId;
        if (slotFilter !== "all") params.meal_slot = slotFilter;
        if (filterCity) params.city = filterCity;
        if (opts.cursor) params.cursor = opts.cursor;
        const { data: summary } = await api.get(`/reports/kitchen-summary`, { params });
        setData(summary);
        paging.applyPageResult({
          next_cursor: summary?.next_cursor ?? null,
          has_more: Boolean(summary?.has_more),
          total: summary?.total,
        });
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Failed to load kitchen plan");
        setData(null);
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [date, debouncedQ, driverId, slotFilter, filterCity, isDriver, paging.pageSize]
  );

  useEffect(() => {
    paging.resetToFirstPage();
    load({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, debouncedQ, driverId, slotFilter, filterCity, isDriver, paging.pageSize]);

  useEffect(() => {
    if (isDriver) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: staff } = await api.get("/providers/me/staff");
        if (cancelled) return;
        setDrivers(
          (Array.isArray(staff) ? staff : [])
            .filter((s: any) => (s.role || "admin") === "driver")
            .map((s: any) => ({ id: s.id, name: s.name || s.email || s.id }))
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDriver]);

  const matrix = useMemo(() => data?.matrix || [], [data]);
  const packList = useMemo(() => data?.pack_list || [], [data]);

  const typeNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of data?.matrix || []) names.add(r.meal_type_name || r.meal_type_id);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const slotsShown: SlotFilter[] =
    slotFilter === "all" ? ["lunch", "dinner"] : [slotFilter];

  const slotCounts = data?.by_slot || {};
  const totalMeals = data?.totals?.meals ?? 0;

  const filterCards = [
    { id: "all", label: "All", count: totalMeals, slot: "all" },
    { id: "lunch", label: "Lunch", count: slotCounts.lunch?.meals ?? 0, slot: "lunch" },
    { id: "dinner", label: "Dinner", count: slotCounts.dinner?.meals ?? 0, slot: "dinner" },
  ];

  const maxMealsInMatrix = useMemo(() => {
    const totals = typeNames.map((name) => {
      return slotsShown.reduce((sum, s) => {
        const row = matrix.find(
          (r: any) => (r.meal_type_name || r.meal_type_id) === name && r.slot === s
        );
        return sum + (row?.meals || 0);
      }, 0);
    });
    return Math.max(...totals, 1);
  }, [typeNames, matrix, slotsShown]);

  async function printKitchenPlan() {
    setPrinting(true);
    try {
      const params: Record<string, string> = { date };
      if (debouncedQ) params.q = debouncedQ;
      if (!isDriver && driverId) params.driver_id = driverId;
      if (slotFilter !== "all") params.meal_slot = slotFilter;
      if (filterCity) params.city = filterCity;
      const { data: blob } = await api.get("/reports/kitchen-print.pdf", {
        params,
        responseType: "blob",
      });
      const pdfBlob =
        blob instanceof Blob
          ? blob.type
            ? blob
            : new Blob([blob], { type: "application/pdf" })
          : new Blob([blob], { type: "application/pdf" });
      if (pdfBlob.type && pdfBlob.type.includes("json")) {
        const text = await pdfBlob.text();
        let detail = "Print failed";
        try {
          detail = JSON.parse(text)?.detail || detail;
        } catch {
          /* ignore */
        }
        throw new Error(typeof detail === "string" ? detail : "Print failed");
      }
      const url = URL.createObjectURL(pdfBlob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `kitchen-${date}.pdf`;
        a.click();
      } else {
        // Give the PDF viewer a moment, then open the system print dialog.
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch {
            /* viewer may block auto-print; user can print manually */
          }
        }, 500);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      const status = e?.response?.status;
      let detail = e?.message || e?.response?.data?.detail || "Print failed";
      const data = e?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          detail = parsed?.detail || detail;
        } catch {
          /* ignore */
        }
      }
      if (status === 501) {
        toast.error(typeof detail === "string" ? detail : "Print PDF is not available on this server");
      } else {
        toast.error(typeof detail === "string" ? detail : "Print failed");
      }
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-3 animate-fade-in-up pb-6"
      data-testid="kitchen-summary"
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:flex-row">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <CookingPot size={20} className="text-primary" weight="duotone" />
          </div>
          <div>
            <span className="label-overline">Cook plan</span>
            <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5 tracking-tight">
              Kitchen
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 print:hidden truncate">
              Meal counts by type &amp; slot — pending + delivered only.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="relative">
            <CalendarBlank
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="date"
              data-testid="kitchen-date"
              className="h-10 pl-9 pr-3 rounded-full bg-white border border-brand-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-[box-shadow,border-color] duration-150 cursor-pointer"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            data-testid="kitchen-refresh"
            onClick={() => load({ cursor: null })}
            className="icon-btn icon-btn-neutral h-10 w-10 min-h-[40px] min-w-[40px]"
            title="Refresh"
          >
            <ArrowClockwise size={17} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            data-testid="kitchen-print"
            onClick={() => printKitchenPlan()}
            disabled={printing || loading}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-medium hover:bg-brand-surface transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Printer size={15} className={printing ? "animate-pulse" : ""} />
            {printing ? "Preparing…" : "Print"}
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              data-testid="kitchen-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, notes…"
              className="h-10 w-full pl-9 pr-3 rounded-full bg-white border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-[box-shadow,border-color] duration-150"
            />
          </div>

          {!isDriver && drivers.length > 0 && (
            <div className="min-w-[160px] max-w-xs flex-1 sm:flex-none">
              <SearchableSelect
                testid="kitchen-driver-filter"
                value={driverId}
                onChange={setDriverId}
                allowEmpty
                emptyLabel="All drivers"
                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                inputClassName="h-10 px-3 rounded-full bg-white border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-[box-shadow,border-color] duration-150"
                placeholder="Search driver…"
              />
            </div>
          )}
          <CityFilterSelect
            value={filterCity}
            onChange={setFilterCity}
            testid="kitchen-city-filter"
            className="min-w-[160px] flex-1 sm:flex-none sm:w-[180px]"
          />
        </div>

        {/* Slot filter pill tabs */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="kitchen-slot-filter"
        >
          {filterCards.map((card) => {
            const active = slotFilter === card.id;
            const cfg = SLOT_CONFIG[card.slot] ?? SLOT_CONFIG.dinner;
            const Icon = cfg.icon;
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`kitchen-filter-${card.id}`}
                onClick={() => setSlotFilter(card.id as SlotFilter)}
                className={`snap-start shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium border cursor-pointer transition-[background-color,border-color,transform,box-shadow] duration-150 active:scale-[0.97] ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_rgba(14,143,139,0.25)]"
                    : "bg-white border-brand-border hover:bg-brand-surface text-foreground"
                }`}
              >
                <Icon
                  size={14}
                  weight="bold"
                  className={active ? "text-primary-foreground/80" : cfg.color}
                />
                <span className="whitespace-nowrap">{card.label}</span>
                <span
                  className={`tabular-nums font-semibold text-xs ${
                    active ? "opacity-80" : "text-muted-foreground"
                  }`}
                >
                  {card.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="card-tinted p-4 flex items-center justify-center">
          <InlineLoader testid="kitchen-loader" label="Loading cook plan…" />
        </div>
      ) : !data ? (
        <div className="card-tinted p-4 text-center">
          <CookingPot size={28} className="text-muted-foreground/40 mx-auto mb-2" weight="duotone" />
          <p className="text-sm text-muted-foreground">Could not load kitchen plan.</p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="stat-card card-tinted-hover" data-testid="kitchen-total-meals">
              <div className="flex items-center justify-between">
                <span className="label-overline">Meals to cook</span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CookingPot size={16} className="text-primary" weight="duotone" />
                </div>
              </div>
              <div className="font-display font-black text-2xl">{data.totals?.meals ?? 0}</div>
              <div className="text-xs text-muted-foreground">{fmtDate(data.date || date)}</div>
            </div>

            <div className="stat-card card-tinted-hover" data-testid="kitchen-total-stops">
              <div className="flex items-center justify-between">
                <span className="label-overline">Stops</span>
                <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Package size={16} className="text-secondary" weight="duotone" />
                </div>
              </div>
              <div className="font-display font-black text-2xl">{data.totals?.stops ?? 0}</div>
              <div className="text-xs text-muted-foreground">delivery stops</div>
            </div>

            <div className="stat-card card-tinted-hover" data-testid="kitchen-slot-lunch">
              <div className="flex items-center justify-between">
                <span className="label-overline">Lunch</span>
                <div className="w-8 h-8 rounded-xl bg-brand-amber/10 flex items-center justify-center">
                  <SunHorizon size={16} className="text-brand-amber" weight="duotone" />
                </div>
              </div>
              <div className="font-display font-black text-2xl">
                {slotCounts.lunch?.meals ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {slotCounts.lunch?.stops ?? 0} stops
              </div>
            </div>

            <div className="stat-card card-tinted-hover" data-testid="kitchen-slot-dinner">
              <div className="flex items-center justify-between">
                <span className="label-overline">Dinner</span>
                <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Moon size={16} className="text-secondary" weight="duotone" />
                </div>
              </div>
              <div className="font-display font-black text-2xl">
                {slotCounts.dinner?.meals ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {slotCounts.dinner?.stops ?? 0} stops
              </div>
            </div>
          </div>

          {/* ── Production Matrix ── */}
          <div className="card-tinted overflow-hidden" data-testid="kitchen-matrix">
            <div className="p-4 sm:p-5 border-b border-brand-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Tray size={15} className="text-primary" weight="duotone" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg leading-tight">
                    Production matrix
                  </h2>
                  <p className="text-xs text-muted-foreground">Meals by type × slot</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-x-auto">
              {matrix.length === 0 ? (
                <div className="py-8 text-center">
                  <Tray size={32} className="text-muted-foreground/30 mx-auto mb-2" weight="duotone" />
                  <p className="text-sm text-muted-foreground">
                    No pending or delivered meals for this filter.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm min-w-[340px]">
                  <thead>
                    <tr>
                      <th className="pb-3 pr-4 text-left label-overline">Type</th>
                      {slotsShown.map((s) => {
                        const cfg = SLOT_CONFIG[s] ?? SLOT_CONFIG.dinner;
                        const Icon = cfg.icon;
                        return (
                          <th key={s} className="pb-3 px-2 label-overline text-right">
                            <span className="inline-flex items-center gap-1 justify-end">
                              <Icon size={11} weight="bold" className={cfg.color} />
                              {mealSlotBadgeLabel(s)}
                            </span>
                          </th>
                        );
                      })}
                      {slotFilter === "all" && (
                        <th className="pb-3 pl-2 label-overline text-right">Total</th>
                      )}
                      {slotFilter === "all" && (
                        <th className="pb-3 pl-3 label-overline text-left w-28 hidden sm:table-cell">
                          Share
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/50">
                    {typeNames.map((name) => {
                      const cells = slotsShown.map((s) => {
                        const row = matrix.find(
                          (r: any) =>
                            (r.meal_type_name || r.meal_type_id) === name && r.slot === s
                        );
                        return row?.meals || 0;
                      });
                      const total = cells.reduce((a, b) => a + b, 0);
                      if (total === 0 && slotFilter !== "all") return null;
                      const pct = Math.round((total / maxMealsInMatrix) * 100);
                      return (
                        <tr
                          key={name}
                          className="hover:bg-brand-surface/50 transition-colors duration-100"
                        >
                          <td className="py-3 pr-4 font-medium">{name}</td>
                          {cells.map((n, i) => (
                            <td
                              key={slotsShown[i]}
                              className="py-3 px-2 text-right font-semibold tabular-nums"
                            >
                              {n ? (
                                <span className="text-foreground">{n}</span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          ))}
                          {slotFilter === "all" && (
                            <td className="py-3 pl-2 text-right font-bold tabular-nums text-primary">
                              {total}
                            </td>
                          )}
                          {slotFilter === "all" && (
                            <td className="py-3 pl-3 hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-brand-surface overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs tabular-nums text-muted-foreground w-7 text-right">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {slotFilter === "all" && (
                    <tfoot>
                      <tr className="border-t-2 border-brand-border">
                        <td className="pt-3 pr-4 label-overline">Total</td>
                        {slotsShown.map((s) => {
                          const colTotal = matrix
                            .filter((r: any) => r.slot === s)
                            .reduce((sum: number, r: any) => sum + (r.meals || 0), 0);
                          return (
                            <td
                              key={s}
                              className="pt-3 px-2 text-right font-bold tabular-nums text-foreground"
                            >
                              {colTotal}
                            </td>
                          );
                        })}
                        <td className="pt-3 pl-2 text-right font-black tabular-nums text-primary text-base">
                          {totalMeals}
                        </td>
                        <td className="pt-3 pl-3 hidden sm:table-cell" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>

          {/* ── Pack List ── */}
          <div className="card-tinted overflow-hidden" data-testid="kitchen-pack-list">
            <div className="p-4 sm:p-5 border-b border-brand-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Package size={15} className="text-secondary" weight="duotone" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg leading-tight">
                      Pack list
                    </h2>
                    <p className="text-xs text-muted-foreground print:hidden">
                      Box labels — notes from customer profile
                    </p>
                  </div>
                </div>
                <span className="tabular-nums text-xs font-semibold text-muted-foreground bg-brand-surface px-2.5 py-1 rounded-full border border-brand-border">
                  {packList.length} {packList.length === 1 ? "stop" : "stops"}
                </span>
              </div>
            </div>

            {packList.length === 0 ? (
              <div className="p-4 text-center">
                <Package size={28} className="text-muted-foreground/30 mx-auto mb-2" weight="duotone" />
                <p className="text-sm text-muted-foreground">No stops to pack.</p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-border/60">
                {packList.map((row: any) => (
                  <li
                    key={row.delivery_id}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-brand-surface/40 transition-colors duration-100"
                    data-testid={`kitchen-pack-${row.delivery_id}`}
                  >
                    <AvatarChip name={row.customer_name || "?"} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate leading-snug">{row.customer_name}</div>
                      {row.notes ? (
                        <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap line-clamp-2">
                          {row.notes}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-sm shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/[0.08] text-primary border border-primary/15">
                        {row.meal_type_name}
                      </span>
                      <SlotBadge slot={row.meal_slot} />
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-surface border border-brand-border text-foreground tabular-nums">
                        ×{row.quantity}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Pagination ── */}
          <div className="print:hidden">
            <CursorPaginationBar
              currentPage={paging.currentPage}
              totalPages={paging.totalPages}
              from={paging.from}
              to={paging.to}
              total={paging.total}
              pageSize={paging.pageSize}
              hasMore={paging.hasMore}
              loading={loading}
              onPrev={() => {
                const c = paging.goPrev();
                if (c !== undefined) load({ cursor: c });
              }}
              onNext={() => {
                const c = paging.goNext();
                if (c !== undefined) load({ cursor: c });
              }}
              onPageSizeChange={(size: AllowedPageSize) => paging.setPageSize(size)}
              testidPrefix="kitchen-pack-pagination"
            />
          </div>
        </>
      )}
    </div>
  );
}
