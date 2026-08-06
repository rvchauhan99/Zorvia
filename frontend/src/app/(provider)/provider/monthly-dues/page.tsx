"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, CaretDown, ClockCounterClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing, isDriver } from "@/lib/roles";
import { fmtCAD } from "@/lib/format";
import {
  collapsedMonthHint,
  formatBillingMonthLabel,
  monthlyTierLabel,
} from "@/lib/monthlyBillingCopy";
import { InlineLoader, PageLoader } from "@/components/loaders";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import CityFilterSelect from "@/components/CityFilterSelect";
import { type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";

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
};

function MonthCalcBreakdown({ row }: { row: DueRow }) {
  const tier = monthlyTierLabel(row.tier_applied);
  const isFixed = row.policy_variant === "monthly_fixed" || row.tier_applied === "fixed_monthly";
  const before = row.month_charge_before_tax;
  const after = row.month_charge_after_tax ?? before;
  const tax = row.tax_amount;

  return (
    <div
      className="rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-xs space-y-1.5"
      data-testid={`monthly-dues-calc-panel-${row.customer_id}`}
    >
      <div className="font-medium text-foreground">
        {formatBillingMonthLabel(row.billing_month)}
        <span className="font-normal text-muted-foreground">
          {" "}
          · calendar month 1st–last · by delivery date
        </span>
      </div>
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
              · <span className="text-foreground font-semibold">this month {fmtCAD(Number(after))}</span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function MonthlyDuesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const showMoney = canSeePricing(session);
  const canMutate = canMutateAdmin(session);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<DueRow[]>([]);
  const [totals, setTotals] = useState<{ due_amount?: number; overdue_amount?: number; overdue_count?: number; customer_count?: number } | null>(null);
  const [renewCustomer, setRenewCustomer] = useState<{ id: string; name: string } | null>(null);
  const [filterCity, setFilterCity] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  // Default to 100 so paid-up / new customers are visible without extra paging
  const paging = useCursorPagination({ initialPageSize: 100 });

  const toggleCalc = useCallback((id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const load = useCallback(async (opts: { cursor?: string | null } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: String(paging.pageSize) });
      if (opts.cursor) params.set("cursor", opts.cursor);
      if (filterCity) params.set("city", filterCity);
      const { data } = await api.get(`/reports/monthly-dues?${params.toString()}`);
      setAllowed(true);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotals(data?.totals || null);
      paging.applyPageResult({
        next_cursor: data?.next_cursor ?? null,
        has_more: Boolean(data?.has_more),
        total: data?.total,
      });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 400) {
        setAllowed(false);
        setRows([]);
        setTotals(null);
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to load customer subscriptions");
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paging.applyPageResult is stable
  }, [paging.pageSize, filterCity]);

  useEffect(() => {
    if (isDriver(session)) {
      router.replace("/provider/deliveries");
      return;
    }
    paging.resetToFirstPage();
    void load({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset+fetch on filter identity
  }, [session, router, load]);

  const reloadCurrentPage = useCallback(() => {
    const c = paging.currentPageIndex > 0 ? paging.cursorHistory[paging.currentPageIndex - 1] ?? null : null;
    void load({ cursor: c });
  }, [paging.currentPageIndex, paging.cursorHistory, load]);

  // Drive blurb from row policies (report billing_mode may be "mixed")
  const isAdjustable = rows.some((r) => r.policy_variant === "monthly_adjustable");

  const colCount = 4 + (showMoney ? 3 : 0) + 1;

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
              ? "Monthly customers with renewal dates — expand a row to verify this month’s charge math."
              : "Fixed Monthly customers — overdue first; Quick Renew anytime (early full-fee advances renewal)."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CityFilterSelect
            value={filterCity}
            onChange={(next) => {
              setFilterCity(next);
              paging.resetToFirstPage();
            }}
            testid="monthly-dues-city-filter"
            className="w-[180px]"
          />
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
                          {r.is_overdue ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                              Overdue
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[r.monthly_plan_name, r.phone].filter(Boolean).join(" · ")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Renewal {r.renewal_date || r.collection_due_date || "—"}
                          {r.is_overdue && r.days_overdue ? ` · ${r.days_overdue}d overdue` : null}
                        </div>
                        {showMoney && monthCharge != null ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            This month {fmtCAD(Number(monthCharge))}
                            {hint ? ` · ${hint}` : ""}
                          </div>
                        ) : null}
                        {showMoney && credit > 0 ? (
                          <div className="text-xs text-secondary mt-1 font-medium">{fmtCAD(credit)} credit</div>
                        ) : null}
                      </div>
                      {showMoney ? (
                        <div className="shrink-0 font-semibold text-primary">{fmtCAD(r.monthly_fee ?? 0)}</div>
                      ) : null}
                    </div>
                    {showMoney ? (
                      <>
                        <button
                          type="button"
                          data-testid={`monthly-dues-calc-${r.customer_id}`}
                          aria-expanded={open}
                          onClick={() => toggleCalc(r.customer_id)}
                          className="h-9 rounded-full border border-brand-border bg-white text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <CaretDown
                            size={14}
                            className={`transition-transform ${open ? "rotate-180" : ""}`}
                          />
                          {open ? "Hide calculation" : "How this month was calculated"}
                        </button>
                        {open ? <MonthCalcBreakdown row={r} /> : null}
                      </>
                    ) : null}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        data-testid={`monthly-dues-history-${r.customer_id}`}
                        onClick={() => router.push(`/provider/customers/${r.customer_id}?tab=payments`)}
                        className="h-10 rounded-full border border-brand-border bg-white text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        <ClockCounterClockwise size={18} />
                        Payment history
                      </button>
                      {canMutate && showMoney ? (
                        <button
                          type="button"
                          data-testid={`monthly-dues-renew-mobile-${r.customer_id}`}
                          aria-hidden="true"
                          onClick={() => setRenewCustomer({ id: r.customer_id, name: r.name })}
                          className="h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold cursor-pointer"
                        >
                          Quick Renew
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]" data-testid="monthly-dues-table">
                <thead className="text-left bg-brand-surface">
                  <tr>
                    <th className="px-3 py-2 label-overline">Customer</th>
                    <th className="px-3 py-2 label-overline">Plan</th>
                    <th className="px-3 py-2 label-overline">Renewal date</th>
                    <th className="px-3 py-2 label-overline">Overdue by</th>
                    {showMoney ? <th className="px-3 py-2 label-overline text-right">Amount</th> : null}
                    {showMoney ? <th className="px-3 py-2 label-overline text-right">This month</th> : null}
                    {showMoney ? <th className="px-3 py-2 label-overline text-right">Credit</th> : null}
                    <th className="px-3 py-2 label-overline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {rows.map((r) => {
                    const credit = Number(r.credit ?? Math.max(0, -Number(r.outstanding || 0)));
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
                              {r.is_overdue ? (
                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                                  Overdue
                                </span>
                              ) : null}
                            </span>
                            {r.phone ? <div className="text-xs text-muted-foreground font-normal">{r.phone}</div> : null}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{r.monthly_plan_name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.renewal_date || r.collection_due_date || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.is_overdue && r.days_overdue ? `${r.days_overdue}d` : "—"}
                          </td>
                          {showMoney ? (
                            <td className="px-3 py-2 text-right font-semibold text-primary">{fmtCAD(r.monthly_fee ?? 0)}</td>
                          ) : null}
                          {showMoney ? (
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              <div>{monthCharge != null ? fmtCAD(Number(monthCharge)) : "—"}</div>
                              {hint ? (
                                <div className="text-[10px] text-muted-foreground/80 mt-0.5">{hint}</div>
                              ) : null}
                            </td>
                          ) : null}
                          {showMoney ? (
                            <td className="px-3 py-2 text-right text-secondary font-medium">
                              {credit > 0 ? fmtCAD(credit) : "—"}
                            </td>
                          ) : null}
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex items-center justify-end gap-2 flex-wrap">
                              {showMoney ? (
                                <button
                                  type="button"
                                  data-testid={`monthly-dues-calc-${r.customer_id}`}
                                  aria-expanded={open}
                                  onClick={() => toggleCalc(r.customer_id)}
                                  className="h-9 px-3 rounded-full border border-brand-border bg-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                                  title="How this month was calculated"
                                >
                                  <CaretDown
                                    size={14}
                                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                                  />
                                  Calc
                                </button>
                              ) : null}
                              <button
                                type="button"
                                data-testid={`monthly-dues-history-${r.customer_id}`}
                                onClick={() => router.push(`/provider/customers/${r.customer_id}?tab=payments`)}
                                className="h-9 px-3 rounded-full border border-brand-border bg-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                                title="Payment history"
                              >
                                <ClockCounterClockwise size={16} />
                                History
                              </button>
                              {canMutate && showMoney ? (
                                <button
                                  type="button"
                                  data-testid={`monthly-dues-renew-${r.customer_id}`}
                                  onClick={() => setRenewCustomer({ id: r.customer_id, name: r.name })}
                                  className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                                >
                                  Quick Renew
                                </button>
                              ) : null}
                            </div>
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
    </div>
  );
}
