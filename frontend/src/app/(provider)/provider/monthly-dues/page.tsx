"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  CalendarBlank,
  CaretDown,
  ClockCounterClockwise,
  DotsThreeVertical,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing, isDriver } from "@/lib/roles";
import { fmtCAD, todayISO } from "@/lib/format";
import { NumericInput } from "@/components/NumericInput";
import {
  collapsedMonthHint,
  formatBillingMonthLabel,
  monthlyTierLabel,
} from "@/lib/monthlyBillingCopy";
import { InlineLoader, PageLoader } from "@/components/loaders";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import AppSheet from "@/components/AppSheet";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import CityFilterSelect from "@/components/CityFilterSelect";
import { type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useQueryLoad } from "@/hooks/useQueryLoad";

type DueRow = {
  customer_id: string;
  name: string;
  phone?: string;
  email?: string;
  outstanding: number;
  credit?: number;
  prepaid_months?: number;
  monthly_fee?: number;
  month_charge_after_tax?: number | null;
  month_charge_before_tax?: number | null;
  tax_amount?: number | null;
  tier_applied?: string | null;
  policy_variant?: string | null;
  renewal_date?: string | null;
  collection_due_date?: string | null;
  last_due_date?: string | null;
  days_overdue?: number;
  is_overdue?: boolean;
  monthly_plan_name?: string | null;
  billing_month?: string | null;
  cancelled_units?: number | null;
  delivered_units?: number | null;
  free_cancellations?: number | null;
  free_cancellations_remaining?: number | null;
  standard_days?: number | null;
  standard_daily_rate?: number | null;
  recalc_daily_rate_cad?: number | null;
  charge_explainer?: string | null;
  cycle_days?: number | null;
  cycle_index?: number | null;
  cycle_anchor_date?: string | null;
  cycle_period_start?: string | null;
  cycle_period_end?: string | null;
  cycle_anchor_missing?: boolean | null;
  prepaid_cycles?: number | null;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_ids?: string[];
};

const MENU_ITEM =
  "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-brand-surface cursor-pointer border-0 bg-transparent";

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function DueTags({
  row,
  today,
}: {
  row: DueRow;
  today: string;
}) {
  const due = (row.renewal_date || row.collection_due_date || "").slice(0, 10);
  const tags: { key: string; label: string; className: string }[] = [];
  if (row.is_overdue) {
    tags.push({
      key: "overdue",
      label: row.days_overdue ? `Overdue ${row.days_overdue}d` : "Overdue",
      className: "bg-destructive/15 text-destructive",
    });
  }
  if (due && due === today) {
    tags.push({
      key: "today",
      label: "Due today",
      className: "bg-amber-100 text-amber-900",
    });
  }
  if (due && due === addDaysISO(today, 1)) {
    tags.push({
      key: "tomorrow",
      label: "Due tomorrow",
      className: "bg-sky-100 text-sky-900",
    });
  }
  if (!tags.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1" data-testid={`monthly-dues-tags-${row.customer_id}`}>
      {tags.map((t) => (
        <span
          key={t.key}
          data-testid={`monthly-dues-tag-${t.key}-${row.customer_id}`}
          className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${t.className}`}
        >
          {t.label}
        </span>
      ))}
    </span>
  );
}

const isCycleRow = (row: DueRow) => row.policy_variant === "cycle_fixed";

function MonthCalcBreakdown({ row }: { row: DueRow }) {
  const tier = monthlyTierLabel(row.tier_applied);
  const isCycle = isCycleRow(row);
  const isFixed =
    isCycle || row.policy_variant === "monthly_fixed" || row.tier_applied === "fixed_monthly";
  const before = row.month_charge_before_tax;
  const after = row.month_charge_after_tax ?? before;
  const tax = row.tax_amount;

  return (
    <div
      className="rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-xs space-y-1.5"
      data-testid={`monthly-dues-calc-panel-${row.customer_id}`}
    >
      {isCycle ? (
        <div className="font-medium text-foreground">
          Cycle {row.cycle_index ?? 0}
          <span className="font-normal text-muted-foreground">
            {" "}
            · {row.cycle_period_start || "—"} → {row.cycle_period_end || "—"} ·{" "}
            {row.cycle_days ?? "—"} plan days
          </span>
        </div>
      ) : (
        <div className="font-medium text-foreground">
          {formatBillingMonthLabel(row.billing_month)}
          <span className="font-normal text-muted-foreground">
            {" "}
            · calendar month 1st–last · by delivery date
          </span>
        </div>
      )}
      {tier ? (
        <div className="text-muted-foreground">
          Tier: <span className="text-foreground font-medium capitalize">{tier}</span>
        </div>
      ) : null}
      {!isFixed ? (
        <div className="text-muted-foreground">
          Units:{" "}
          <span className="text-foreground font-medium">
            {row.cancelled_units ?? 0} cancelled · {row.delivered_units ?? 0} delivered
          </span>
          {row.free_cancellations != null ? (
            <span>
              {" "}
              · {row.free_cancellations_remaining ?? 0} of {row.free_cancellations} free skips left
            </span>
          ) : null}
        </div>
      ) : null}
      {!isFixed && row.tier_applied === "flat_with_deductions" && row.standard_daily_rate != null ? (
        <div className="text-muted-foreground">
          Standard daily: {fmtCAD(Number(row.standard_daily_rate))}
          {row.standard_days != null ? ` (fee ÷ ${row.standard_days} days)` : ""}
        </div>
      ) : null}
      {!isFixed && row.tier_applied === "recalc_daily" && row.recalc_daily_rate_cad != null ? (
        <div className="text-muted-foreground">
          Recalc rate: {fmtCAD(Number(row.recalc_daily_rate_cad))} per delivered unit
        </div>
      ) : null}
      {row.charge_explainer ? (
        <div className="text-foreground font-medium" data-testid={`monthly-dues-calc-math-${row.customer_id}`}>
          {row.charge_explainer}
        </div>
      ) : null}
      {before != null ? (
        <div className="text-muted-foreground pt-0.5 border-t border-brand-border/60">
          Before tax {fmtCAD(Number(before))}
          {tax != null && Number(tax) > 0 ? ` · tax ${fmtCAD(Number(tax))}` : ""}
          {after != null ? (
            <>
              {" "}
              ·{" "}
              <span className="text-foreground font-semibold">
                {isCycle ? "this cycle" : "this month"} {fmtCAD(Number(after))}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
      {isCycle && row.cycle_anchor_missing ? (
        <div className="text-amber-600 font-medium">
          No next payment collection date set — this customer will not renew until you set one.
        </div>
      ) : null}
    </div>
  );
}

type AdjustTarget = { id: string; name: string; row: DueRow };

function RowActionsMenu({
  row,
  open,
  onToggle,
  onClose,
  showMoney,
  canMutate,
  calcOpen,
  onCalc,
  onHistory,
  onAdjust,
  onRenew,
}: {
  row: DueRow;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  showMoney: boolean;
  canMutate: boolean;
  calcOpen: boolean;
  onCalc: () => void;
  onHistory: () => void;
  onAdjust: () => void;
  onRenew: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  return (
    <div className="relative inline-flex items-center gap-2" ref={ref}>
      {canMutate && showMoney ? (
        <button
          type="button"
          data-testid={`monthly-dues-renew-${row.customer_id}`}
          aria-label={`Quick Renew for ${row.name}`}
          onClick={onRenew}
          className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
        >
          Quick Renew
        </button>
      ) : null}
      <button
        type="button"
        data-testid={`monthly-dues-menu-${row.customer_id}`}
        aria-label={`More actions for ${row.name}`}
        aria-expanded={open}
        onClick={onToggle}
        className="h-9 w-9 rounded-full border border-brand-border bg-white inline-flex items-center justify-center cursor-pointer hover:bg-brand-surface"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-brand-border bg-white shadow-lg py-1"
          data-testid={`monthly-dues-menu-panel-${row.customer_id}`}
        >
          {showMoney ? (
            <button type="button" className={MENU_ITEM} data-testid={`monthly-dues-calc-${row.customer_id}`} onClick={() => { onCalc(); onClose(); }}>
              <CaretDown size={16} className={calcOpen ? "rotate-180" : ""} />
              {calcOpen ? "Hide calculation" : "Calc"}
            </button>
          ) : null}
          <button type="button" className={MENU_ITEM} data-testid={`monthly-dues-history-${row.customer_id}`} onClick={() => { onHistory(); onClose(); }}>
            <ClockCounterClockwise size={16} />
            History
          </button>
          {canMutate && isCycleRow(row) ? (
            <button type="button" className={MENU_ITEM} data-testid={`monthly-dues-adjust-cycle-${row.customer_id}`} onClick={() => { onAdjust(); onClose(); }}>
              <CalendarBlank size={16} />
              Adjust cycle
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AdjustCycleSheet({
  target,
  onClose,
  onAdjusted,
}: {
  target: AdjustTarget | null;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [mode, setMode] = useState<"postpone" | "set_date">("postpone");
  const [days, setDays] = useState("1");
  const [newDate, setNewDate] = useState("");
  const [which, setWhich] = useState<"next" | "current">("next");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setMode("postpone");
    setDays("1");
    setNewDate("");
    // An overdue collection defaults to re-dating the one already due.
    setWhich(target.row.is_overdue ? "current" : "next");
    setReason("");
  }, [target]);

  if (!target) return null;

  const { id: customerId, row } = target;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { mode, target: which, reason };
      if (mode === "postpone") payload.days = Number(days);
      else payload.date = newDate;
      const { data } = await api.patch(`/customers/${customerId}/billing-cycle`, payload);
      const movedDate = data?.cycle_anchor_date || "the new date"
      toast.success(
        which === "current"
          ? `Collection already due moved to ${movedDate}`
          : `Next collection moved to ${movedDate}`
      );
      onAdjusted();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to adjust the cycle");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "h-11 w-full px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";

  return (
    <AppSheet
      open={!!target}
      onClose={onClose}
      title={`Adjust cycle · ${target.name}`}
      size="md"
      as="form"
      onSubmit={submit}
      footer={
        <button
          type="submit"
          data-testid="adjust-cycle-submit"
          disabled={saving || (mode === "set_date" && !newDate)}
          className="pill-btn btn-primary h-12 w-full cursor-pointer disabled:opacity-60"
        >
          {saving ? "Saving…" : "Move collection date"}
        </button>
      }
    >
      <div className="flex flex-col gap-4 pb-2" data-testid="adjust-cycle-sheet">
        <div className="card-tinted p-3 text-xs text-muted-foreground">
          Cycle #{row.cycle_index ?? 0} · every {row.cycle_days ?? "—"} plan days · current
          collection {row.collection_due_date || row.renewal_date || "—"}. Cycles already
          collected are preserved, so this never re-bills or skips a cycle.
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Which collection</span>
          <select
            data-testid="adjust-cycle-target"
            value={which}
            onChange={(e) => setWhich(e.target.value as "next" | "current")}
            className={inputClass}
          >
            <option value="next">The next upcoming collection</option>
            <option value="current">The collection already due (grant grace)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label-overline">How to move it</span>
          <select
            data-testid="adjust-cycle-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "postpone" | "set_date")}
            className={inputClass}
          >
            <option value="postpone">Postpone by N plan days</option>
            <option value="set_date">Set an exact date</option>
          </select>
        </label>

        {mode === "postpone" ? (
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Plan days to add</span>
            <NumericInput
              mode="integer"
              min={1}
              data-testid="adjust-cycle-days"
              value={days}
              onValueChange={setDays}
              className={inputClass}
            />
            <span className="text-xs text-muted-foreground">
              Counts plan weekdays only and skips kitchen closed dates, same as a renewal.
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">New collection date</span>
            <input
              type="date"
              data-testid="adjust-cycle-date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Reason (optional)</span>
          <input
            type="text"
            data-testid="adjust-cycle-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. customer travelling"
            className={inputClass}
          />
        </label>
      </div>
    </AppSheet>
  );
}

export default function MonthlyDuesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const showMoney = canSeePricing(session);
  const canMutate = canMutateAdmin(session);
  const paintedRef = useRef(false);
  const { loading, run, isAbortError } = useQueryLoad(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<DueRow[]>([]);
  const [totals, setTotals] = useState<{ due_amount?: number; overdue_amount?: number; overdue_count?: number; customer_count?: number } | null>(null);
  const [renewCustomer, setRenewCustomer] = useState<{ id: string; name: string } | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [filterCity, setFilterCity] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [filterDriverId, setFilterDriverId] = useState("");
  const [renewalFrom, setRenewalFrom] = useState("");
  const [renewalTo, setRenewalTo] = useState("");
  const [dueBucket, setDueBucket] = useState<"" | "overdue" | "today" | "tomorrow">("");
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [reportToday, setReportToday] = useState(todayISO());
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // Default to 100 so paid-up / new customers are visible without extra paging
  const paging = useCursorPagination({ initialPageSize: 100 });

  const toggleCalc = useCallback((id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/providers/me/staff");
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setDrivers(
          list
            .filter((s: any) => (s.role || "admin") === "driver" && s.id)
            .map((s: any) => ({ id: String(s.id), name: String(s.name || s.email || s.id) })),
        );
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (opts: { cursor?: string | null } = {}) => {
    const mode = paintedRef.current ? "soft" : "hard";
    const key = `dues:${filterCity}:${filterQ}:${filterDriverId}:${renewalFrom}:${renewalTo}:${dueBucket}:${paging.pageSize}:${opts.cursor ?? ""}`;
    try {
      const data = await run(async (signal) => {
        const params = new URLSearchParams({ page_size: String(paging.pageSize) });
        if (opts.cursor) params.set("cursor", opts.cursor);
        if (filterCity) params.set("city", filterCity);
        if (filterQ.trim()) params.set("q", filterQ.trim());
        if (filterDriverId) params.set("driver_id", filterDriverId);
        if (renewalFrom) params.set("renewal_from", renewalFrom);
        if (renewalTo) params.set("renewal_to", renewalTo);
        if (dueBucket) params.set("due_bucket", dueBucket);
        const { data: payload } = await api.get(`/reports/monthly-dues?${params.toString()}`, { signal });
        return payload;
      }, { mode, key });
      if (data === undefined) return;
      setAllowed(true);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotals(data?.totals || null);
      if (typeof data?.today === "string" && data.today) setReportToday(data.today.slice(0, 10));
      paintedRef.current = true;
      paging.applyPageResult({
        next_cursor: data?.next_cursor ?? null,
        has_more: Boolean(data?.has_more),
        total: data?.total,
      });
    } catch (e: any) {
      if (isAbortError(e)) return;
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 400) {
        setAllowed(false);
        setRows([]);
        setTotals(null);
        paintedRef.current = true;
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to load customer subscriptions");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paging.applyPageResult is stable
  }, [paging.pageSize, filterCity, filterQ, filterDriverId, renewalFrom, renewalTo, dueBucket, run, isAbortError]);

  useEffect(() => {
    if (isDriver(session)) {
      router.replace("/provider/deliveries");
      return;
    }
    paging.resetToFirstPage();
    void load({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset+fetch on filter identity
  }, [session?.user_id, session?.role, router, load]);

  const reloadCurrentPage = useCallback(() => {
    const c = paging.currentPageIndex > 0 ? paging.cursorHistory[paging.currentPageIndex - 1] ?? null : null;
    void load({ cursor: c });
  }, [paging.currentPageIndex, paging.cursorHistory, load]);

  // Drive blurb from row policies (report billing_mode may be "mixed")
  const isAdjustable = rows.some((r) => r.policy_variant === "monthly_adjustable");
  const hasCycleRows = rows.some(isCycleRow);

  const colCount = 4 + (showMoney ? 1 : 0);

  if (loading && !rows.length && !totals) {
    return <PageLoader testid="monthly-dues-loading" label="Loading customer subscriptions…" />;
  }

  if (!allowed) {
    return (
      <div className="flex flex-col gap-3 animate-fade-in-up" data-testid="monthly-dues-unavailable">
        <div>
          <span className="label-overline">Billing</span>
          <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5">Customer subscriptions</h1>
        </div>
        <div className="card-tinted p-4 text-sm text-muted-foreground">
          No monthly-policy customers yet. Set kitchen default in Settings → Subscription Policy, or override in CRM. Fixed overdue also appears under Reports → Outstanding.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up" data-testid="monthly-dues-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="label-overline">Billing</span>
          <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5">Customer subscriptions</h1>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {isAdjustable
              ? "Plan fee is the Settings price. Balance is what they owe — pending last collection uses that due date; collected renews on the next one."
              : "Plan fee is the Settings price. Balance is what they owe — pending last collection uses that due date; Quick Renew anytime."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="monthly-dues-refresh"
            onClick={reloadCurrentPage}
            className="h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-brand-surface"
          >
            <ArrowClockwise size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2" data-testid="monthly-dues-filters">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[180px] max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              data-testid="monthly-dues-search"
              placeholder="Search name, phone, plan…"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setFilterQ(qDraft.trim());
                  paging.resetToFirstPage();
                }
              }}
              className="h-10 w-full pl-9 pr-3 rounded-full border border-brand-border bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <button
            type="button"
            data-testid="monthly-dues-search-go"
            onClick={() => {
              setFilterQ(qDraft.trim());
              paging.resetToFirstPage();
            }}
            className="h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-medium cursor-pointer hover:bg-brand-surface"
          >
            Search
          </button>
          <CityFilterSelect
            value={filterCity}
            onChange={(next) => {
              setFilterCity(next);
              paging.resetToFirstPage();
            }}
            testid="monthly-dues-city-filter"
            className="w-[160px]"
          />
          <select
            data-testid="monthly-dues-driver-filter"
            value={filterDriverId}
            onChange={(e) => {
              setFilterDriverId(e.target.value);
              paging.resetToFirstPage();
            }}
            className="h-10 px-3 rounded-full border border-brand-border bg-white text-sm max-w-[180px]"
          >
            <option value="">All drivers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            Renewal from
            <input
              type="date"
              data-testid="monthly-dues-renewal-from"
              value={renewalFrom}
              onChange={(e) => {
                setRenewalFrom(e.target.value);
                paging.resetToFirstPage();
              }}
              className="h-10 px-3 rounded-full border border-brand-border bg-white text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            to
            <input
              type="date"
              data-testid="monthly-dues-renewal-to"
              value={renewalTo}
              onChange={(e) => {
                setRenewalTo(e.target.value);
                paging.resetToFirstPage();
              }}
              className="h-10 px-3 rounded-full border border-brand-border bg-white text-sm"
            />
          </label>
          <div className="inline-flex flex-wrap gap-1" data-testid="monthly-dues-due-buckets">
            {(
              [
                { id: "", label: "All due" },
                { id: "today", label: "Due today" },
                { id: "tomorrow", label: "Due tomorrow" },
                { id: "overdue", label: "Overdue" },
              ] as const
            ).map((b) => (
              <button
                key={b.id || "all"}
                type="button"
                data-testid={`monthly-dues-bucket-${b.id || "all"}`}
                onClick={() => {
                  setDueBucket(b.id);
                  paging.resetToFirstPage();
                }}
                className={`h-9 px-3 rounded-full text-xs font-semibold border cursor-pointer ${
                  dueBucket === b.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-brand-border hover:bg-brand-surface"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showMoney && totals ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card-tinted p-3">
            <div className="label-overline">On list</div>
            <div className="font-display font-bold text-xl mt-1">{totals.customer_count || 0}</div>
          </div>
          <div className="card-tinted p-3">
            <div className="label-overline">Overdue</div>
            <div className="font-display font-bold text-xl text-destructive mt-1">{fmtCAD(totals.overdue_amount || 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{totals.overdue_count || 0} customers</div>
          </div>
          <div className="card-tinted p-3 col-span-2 sm:col-span-1">
            <div className="label-overline">Due total</div>
            <div className="font-display font-bold text-xl text-primary mt-1">{fmtCAD(totals.due_amount || 0)}</div>
          </div>
        </div>
      ) : null}

      <div className="card-tinted overflow-hidden">
        {loading ? (
          <InlineLoader testid="monthly-dues-inline-loading" label="Refreshing…" />
        ) : rows.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm" data-testid="monthly-dues-empty">
            No active customers yet.
          </div>
        ) : (
          <>
            <ul className="md:hidden divide-y divide-brand-border" data-testid="monthly-dues-list-mobile">
              {rows.map((r) => {
                    const credit = Number(r.credit ?? Math.max(0, -Number(r.outstanding || 0)));
                const balance = Number(r.outstanding || 0);
                const monthCharge = r.month_charge_after_tax ?? r.month_charge_before_tax;
                const open = Boolean(expandedIds[r.customer_id]);
                const hint = collapsedMonthHint(r);
                return (
                  <li
                    key={r.customer_id}
                    className={`px-3 py-2.5 flex flex-col gap-2 ${r.is_overdue ? "bg-destructive/5" : ""}`}
                    data-testid={`monthly-dues-row-${r.customer_id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          <span className="truncate">{r.name}</span>
                          <DueTags row={r} today={reportToday} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[r.monthly_plan_name, r.phone, r.driver_name].filter(Boolean).join(" · ")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Next payment {r.renewal_date || r.collection_due_date || "—"}
                          {hasCycleRows && isCycleRow(r)
                            ? ` · Cycle #${r.cycle_index ?? 0} · ${r.cycle_days ?? "—"}d`
                            : ""}
                        </div>
                        {showMoney ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            Plan fee {fmtCAD(r.monthly_fee ?? 0)}
                            {monthCharge != null ? ` · This month ${fmtCAD(Number(monthCharge))}` : ""}
                            {hint ? ` · ${hint}` : ""}
                          </div>
                        ) : null}
                        {showMoney && credit > 0 ? (
                          <div className="text-xs text-secondary mt-1 font-medium">{fmtCAD(credit)} credit</div>
                        ) : null}
                      </div>
                      {showMoney ? (
                        <div className="shrink-0 text-right">
                          <div
                            className={`font-semibold ${balance > 0 ? "text-primary" : "text-muted-foreground"}`}
                            data-testid={`monthly-dues-balance-${r.customer_id}`}
                          >
                            {fmtCAD(balance)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Owes</div>
                        </div>
                      ) : null}
                    </div>
                    {showMoney && open ? <MonthCalcBreakdown row={r} /> : null}
                    <div className="flex justify-end">
                      <RowActionsMenu
                        row={r}
                        open={openMenuId === r.customer_id}
                        onToggle={() =>
                          setOpenMenuId((id) => (id === r.customer_id ? null : r.customer_id))
                        }
                        onClose={() => setOpenMenuId(null)}
                        showMoney={showMoney}
                        canMutate={canMutate}
                        calcOpen={open}
                        onCalc={() => toggleCalc(r.customer_id)}
                        onHistory={() => router.push(`/provider/customers/${r.customer_id}?tab=payments`)}
                        onAdjust={() => setAdjustTarget({ id: r.customer_id, name: r.name, row: r })}
                        onRenew={() => setRenewCustomer({ id: r.customer_id, name: r.name })}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]" data-testid="monthly-dues-table">
                <thead className="text-left bg-brand-surface">
                  <tr>
                    <th className="px-3 py-2 label-overline">Customer</th>
                    <th className="px-3 py-2 label-overline">Plan</th>
                    <th className="px-3 py-2 label-overline">Next payment</th>
                    {showMoney ? <th className="px-3 py-2 label-overline text-right">Owes</th> : null}
                    <th className="px-3 py-2 label-overline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {rows.map((r) => {
                    const credit = Number(r.credit ?? Math.max(0, -Number(r.outstanding || 0)));
                    const balance = Number(r.outstanding || 0);
                    const monthCharge = r.month_charge_after_tax ?? r.month_charge_before_tax;
                    const open = Boolean(expandedIds[r.customer_id]);
                    const hint = collapsedMonthHint(r);
                    return (
                      <React.Fragment key={r.customer_id}>
                        <tr
                          className={`hover:bg-brand-surface/60 transition-colors ${r.is_overdue ? "bg-destructive/5" : ""}`}
                          data-testid={`monthly-dues-row-${r.customer_id}`}
                        >
                          <td className="px-3 py-2 font-medium">
                            <span className="inline-flex items-center gap-2 flex-wrap">
                              {r.name}
                              <DueTags row={r} today={reportToday} />
                            </span>
                            {r.phone ? <div className="text-xs text-muted-foreground font-normal">{r.phone}</div> : null}
                            {r.driver_name ? (
                              <div className="text-[10px] text-muted-foreground font-normal">Driver {r.driver_name}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <div>{r.monthly_plan_name || "—"}</div>
                            {showMoney ? (
                              <div className="text-[10px] text-muted-foreground/80">
                                Fee {fmtCAD(r.monthly_fee ?? 0)}
                                {monthCharge != null ? ` · month ${fmtCAD(Number(monthCharge))}` : ""}
                                {hint ? ` · ${hint}` : ""}
                              </div>
                            ) : null}
                            {hasCycleRows && isCycleRow(r) ? (
                              <div className="text-[10px] text-muted-foreground/80">
                                Cycle #{r.cycle_index ?? 0} · {r.cycle_days ?? "—"}d
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.renewal_date || r.collection_due_date || "—"}
                          </td>
                          {showMoney ? (
                            <td
                              className={`px-3 py-2 text-right font-semibold ${balance > 0 ? "text-primary" : "text-muted-foreground"}`}
                              data-testid={`monthly-dues-balance-${r.customer_id}`}
                            >
                              <div>{fmtCAD(balance)}</div>
                              {credit > 0 ? (
                                <div className="text-[10px] text-secondary font-medium">{fmtCAD(credit)} credit</div>
                              ) : null}
                            </td>
                          ) : null}
                          <td className="px-3 py-2 text-right">
                            <RowActionsMenu
                              row={r}
                              open={openMenuId === r.customer_id}
                              onToggle={() =>
                                setOpenMenuId((id) => (id === r.customer_id ? null : r.customer_id))
                              }
                              onClose={() => setOpenMenuId(null)}
                              showMoney={showMoney}
                              canMutate={canMutate}
                              calcOpen={open}
                              onCalc={() => toggleCalc(r.customer_id)}
                              onHistory={() =>
                                router.push(`/provider/customers/${r.customer_id}?tab=payments`)
                              }
                              onAdjust={() =>
                                setAdjustTarget({ id: r.customer_id, name: r.name, row: r })
                              }
                              onRenew={() => setRenewCustomer({ id: r.customer_id, name: r.name })}
                            />
                          </td>
                        </tr>
                        {showMoney && open ? (
                          <tr className={r.is_overdue ? "bg-destructive/5" : "bg-brand-surface/40"}>
                            <td colSpan={colCount} className="px-3 py-2">
                              <MonthCalcBreakdown row={r} />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

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
        testidPrefix="monthly-dues-pagination"
      />

      <RecordPaymentSheet
        open={!!renewCustomer}
        onClose={() => setRenewCustomer(null)}
        lockedCustomer={renewCustomer}
        onRecorded={() => {
          setRenewCustomer(null);
          reloadCurrentPage();
        }}
      />

      <AdjustCycleSheet
        target={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onAdjusted={reloadCurrentPage}
      />
    </div>
  );
}
