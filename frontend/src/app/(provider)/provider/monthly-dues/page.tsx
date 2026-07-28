"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, ClockCounterClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing, isDriver } from "@/lib/roles";
import { fmtCAD } from "@/lib/format";
import { InlineLoader, PageLoader } from "@/components/loaders";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
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
  renewal_date?: string | null;
  collection_due_date?: string | null;
  last_due_date?: string | null;
  days_overdue?: number;
  is_overdue?: boolean;
  monthly_plan_name?: string | null;
};

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
  const paging = useCursorPagination({ initialPageSize: DEFAULT_PAGE_SIZE });

  const load = useCallback(async (opts: { cursor?: string | null } = {}) => {
    setLoading(true);
    try {
      const { data: prov } = await api.get("/providers/me");
      const mb = prov?.settings?.monthly_billing;
      const fixed = !!mb?.enabled && mb?.policy_variant === "monthly_fixed";
      if (!fixed) {
        setAllowed(false);
        setRows([]);
        setTotals(null);
        return;
      }
      setAllowed(true);
      const params = new URLSearchParams({ page_size: String(paging.pageSize) });
      if (opts.cursor) params.set("cursor", opts.cursor);
      const { data } = await api.get(`/reports/monthly-dues?${params.toString()}`);
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
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to load customer subscriptions");
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paging.applyPageResult is stable
  }, [paging.pageSize]);

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

  if (loading && !rows.length && !totals) {
    return <PageLoader testid="monthly-dues-loading" label="Loading customer subscriptions…" />;
  }

  if (!allowed) {
    return (
      <div className="flex flex-col gap-3 animate-fade-in-up" data-testid="monthly-dues-unavailable">
        <div>
          <span className="label-overline">Billing</span>
          <h1 className="font-display font-black text-2xl sm:text-3xl mt-0.5">Customer subscriptions</h1>
        </div>
        <div className="card-tinted p-6 text-sm text-muted-foreground">
          Customer subscriptions is available when Settings → Subscription Policy is enabled with{" "}
          <strong className="text-foreground">Fixed Monthly</strong>. Adjustable and per-meal kitchens use Reports as usual.
          Overdue-only dues stay under Reports → Outstanding.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up" data-testid="monthly-dues-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="label-overline">Billing</span>
          <h1 className="font-display font-black text-2xl sm:text-3xl mt-0.5">Customer subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All Fixed Monthly customers with renewal dates. Overdue first, then nearest renewal. Quick Renew anytime — early full-fee payments advance next renewal; partial advances stay as credit.
          </p>
        </div>
        <button
          type="button"
          data-testid="monthly-dues-refresh"
          onClick={reloadCurrentPage}
          className="h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-brand-surface"
        >
          <ArrowClockwise size={16} /> Refresh
        </button>
      </div>

      {showMoney && totals ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card-tinted p-4">
            <div className="label-overline">On list</div>
            <div className="font-display font-bold text-xl mt-1">{totals.customer_count || 0}</div>
          </div>
          <div className="card-tinted p-4">
            <div className="label-overline">Overdue</div>
            <div className="font-display font-bold text-xl text-destructive mt-1">{fmtCAD(totals.overdue_amount || 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{totals.overdue_count || 0} customers</div>
          </div>
          <div className="card-tinted p-4 col-span-2 sm:col-span-1">
            <div className="label-overline">Due total</div>
            <div className="font-display font-bold text-xl text-primary mt-1">{fmtCAD(totals.due_amount || 0)}</div>
          </div>
        </div>
      ) : null}

      <div className="card-tinted overflow-hidden">
        {loading ? (
          <InlineLoader testid="monthly-dues-inline-loading" label="Refreshing…" />
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm" data-testid="monthly-dues-empty">
            No active customers yet.
          </div>
        ) : (
          <>
            <ul className="md:hidden divide-y divide-brand-border" data-testid="monthly-dues-list-mobile">
              {rows.map((r) => {
                const credit = Number(r.credit ?? Math.max(0, -Number(r.outstanding || 0)));
                return (
                  <li
                    key={r.customer_id}
                    className={`p-4 flex flex-col gap-3 ${r.is_overdue ? "bg-destructive/5" : ""}`}
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
                        {showMoney && credit > 0 ? (
                          <div className="text-xs text-secondary mt-1 font-medium">{fmtCAD(credit)} credit</div>
                        ) : null}
                      </div>
                      {showMoney ? (
                        <div className="shrink-0 font-semibold text-primary">{fmtCAD(r.monthly_fee ?? 0)}</div>
                      ) : null}
                    </div>
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
                          data-testid={`monthly-dues-renew-${r.customer_id}`}
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
              <table className="w-full text-sm min-w-[720px]" data-testid="monthly-dues-table">
                <thead className="text-left bg-brand-surface">
                  <tr>
                    <th className="px-3 py-2 label-overline">Customer</th>
                    <th className="px-3 py-2 label-overline">Plan</th>
                    <th className="px-3 py-2 label-overline">Renewal date</th>
                    <th className="px-3 py-2 label-overline">Overdue by</th>
                    {showMoney ? <th className="px-3 py-2 label-overline text-right">Amount</th> : null}
                    {showMoney ? <th className="px-3 py-2 label-overline text-right">Credit</th> : null}
                    <th className="px-3 py-2 label-overline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {rows.map((r) => {
                    const credit = Number(r.credit ?? Math.max(0, -Number(r.outstanding || 0)));
                    return (
                      <tr
                        key={r.customer_id}
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
                          <td className="px-3 py-2 text-right text-secondary font-medium">
                            {credit > 0 ? fmtCAD(credit) : "—"}
                          </td>
                        ) : null}
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-2 flex-wrap">
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
