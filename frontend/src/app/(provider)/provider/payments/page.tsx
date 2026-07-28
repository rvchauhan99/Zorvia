"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing } from "@/lib/roles";
import { fmtCAD, fmtDateTime } from "@/lib/format";
import { asPageEnvelope, DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CustomerAsyncSelect from "@/components/CustomerAsyncSelect";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { StatusFilterCards } from "@/components/StatusFilterCards";
import { InlineLoader } from "@/components/loaders";
import { CheckCircle, XCircle, Eye, Plus, MagnifyingGlass, CalendarBlank, User } from "@phosphor-icons/react";

export default function Payments() {
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const showMoney = canSeePricing(session);
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [range, setRange] = useState({ start: "", end: "" });
  const [customerFilter, setCustomerFilter] = useState<{ id: string; name: string } | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [confirmBatchVerify, setConfirmBatchVerify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const paging = useCursorPagination({ initialPageSize: DEFAULT_PAGE_SIZE });

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q]);

  const fetchPage = useCallback(
    async (opts: { cursor?: string | null; statusOverride?: string; pageSize?: number } = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const status = opts.statusOverride ?? filter;
        if (status !== "all") params.set("status", status);
        if (debouncedQ) params.set("q", debouncedQ);
        if (range.start) params.set("start", range.start);
        if (range.end) params.set("end", range.end);
        if (customerFilter?.id) params.set("customer_id", customerFilter.id);
        params.set("limit", String(opts.pageSize ?? paging.pageSize));
        if (opts.cursor) params.set("cursor", opts.cursor);

        const { data } = await api.get(`/payments?${params.toString()}`);
        const page = asPageEnvelope<any>(data);
        setItems(page.items);
        paging.applyPageResult(page);
        setSelected(new Set());
      } catch {
        toast.error("Failed to load payments");
      } finally {
        setLoading(false);
      }
    },
    [filter, debouncedQ, range.start, range.end, customerFilter?.id, paging.pageSize, paging.applyPageResult],
  );

  const reloadCurrentPage = useCallback(() => {
    const c = paging.currentPageIndex > 0 ? paging.cursorHistory[paging.currentPageIndex - 1] ?? null : null;
    fetchPage({ cursor: c });
  }, [paging.currentPageIndex, paging.cursorHistory, fetchPage]);

  // When filters or page size change, reset pagination
  useEffect(() => {
    paging.resetToFirstPage();
    fetchPage({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset+fetch on filter identity
  }, [filter, debouncedQ, range.start, range.end, customerFilter?.id, paging.pageSize]);

  const pendingIds = useMemo(
    () => items.filter((p) => p.status === "pending").map((p) => p.id),
    [items]
  );

  async function verify(id: string) {
    try {
      await api.patch(`/payments/${id}/verify`);
      toast.success("Payment verified");
      reloadCurrentPage();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  async function batchVerify() {
    const ids = [...selected].filter((id) => pendingIds.includes(id));
    if (!ids.length) {
      toast.message("Select pending payments first");
      setConfirmBatchVerify(false);
      return;
    }
    setBatchBusy(true);
    try {
      for (const id of ids) {
        await api.patch(`/payments/${id}/verify`);
      }
      toast.success(`Verified ${ids.length} payment(s)`);
      setConfirmBatchVerify(false);
      reloadCurrentPage();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Batch verify failed");
      reloadCurrentPage();
    } finally {
      setBatchBusy(false);
    }
  }

  async function reject() {
    try {
      await api.patch(`/payments/${rejectFor.id}/reject`, { reason: rejectReason });
      toast.success("Payment rejected");
      setRejectFor(null); setRejectReason("");
      reloadCurrentPage();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up">
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="label-overline">Reconciliation</span>
          <h1 className="font-display font-black text-2xl sm:text-3xl mt-0.5">Payments</h1>
        </div>
        {canMutate && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              data-testid="record-payment"
              type="button"
              onClick={() => setRecordOpen(true)}
              className="pill-btn btn-primary h-10 px-4 text-sm font-semibold flex-1 sm:flex-none justify-center gap-1.5"
            >
              <Plus size={16} weight="bold" /> Record payment
            </button>
            <button
              data-testid="batch-verify"
              disabled={batchBusy || selected.size === 0}
              onClick={() => setConfirmBatchVerify(true)}
              className="pill-btn btn-secondary h-10 px-4 text-sm font-semibold flex-1 sm:flex-none justify-center disabled:opacity-50"
            >
              Verify selected
            </button>
          </div>
        )}
      </div>

      {/* ── FILTER BAR (Bento Style) ── */}
      <div className="card-tinted p-3 sm:p-4 flex flex-col sm:flex-row flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 pl-1">
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlass size={16} className="text-muted-foreground" />
            </div>
            <input
              data-testid="payment-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name or ref"
              className="h-10 w-full pl-9 pr-3 rounded-xl bg-white border border-brand-border text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="flex flex-row items-end gap-2 shrink-0">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 pl-1">
              From
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <CalendarBlank size={16} className="text-muted-foreground" />
              </div>
              <input
                type="date"
                data-testid="payment-range-start"
                value={range.start}
                onChange={(e) => setRange({ ...range, start: e.target.value })}
                className="h-10 w-36 pl-9 pr-2 rounded-xl bg-white border border-brand-border text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
          <span className="text-muted-foreground mb-3 font-medium text-xs">→</span>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 pl-1">
              To
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <CalendarBlank size={16} className="text-muted-foreground" />
              </div>
              <input
                type="date"
                data-testid="payment-range-end"
                value={range.end}
                onChange={(e) => setRange({ ...range, end: e.target.value })}
                className="h-10 w-36 pl-9 pr-2 rounded-xl bg-white border border-brand-border text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Customer Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 pl-1">
            Customer
          </label>
          <div className="relative" data-testid="payment-customer-filter">
            <CustomerAsyncSelect
              testid="payment-customer"
              value={customerFilter}
              onChange={(opt) => setCustomerFilter(opt ? { id: opt.id, name: opt.name } : null)}
              placeholder="Filter by customer"
              activeOnly={false}
            />
          </div>
        </div>
      </div>

      <StatusFilterCards
        testid="payments-filters"
        itemTestIdPrefix="pfilter"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "pending", label: "Pending" },
          { id: "verified", label: "Verified" },
          { id: "rejected", label: "Rejected" },
          { id: "all", label: "All" },
        ]}
      />

      {/* ── DATATABLE ── */}
      <div className="card-tinted overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-10">
            <InlineLoader testid="payments-loading" label="Loading payments…" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No {filter === "all" ? "" : filter} payments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="font-medium p-3 w-12 text-center">
                    {canMutate && filter === "pending" && (
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-brand-border text-primary focus:ring-primary/50 cursor-pointer"
                        onChange={(e) => {
                           if (e.target.checked) {
                             const newSelected = new Set(selected);
                             items.filter(p => p.status === "pending").forEach(p => newSelected.add(p.id));
                             setSelected(newSelected);
                           } else {
                             setSelected(new Set());
                           }
                        }}
                        checked={items.filter(p => p.status === "pending").length > 0 && items.filter(p => p.status === "pending").every(p => selected.has(p.id))}
                      />
                    )}
                  </th>
                  <th className="font-medium p-3">Customer</th>
                  <th className="font-medium p-3">Date & Ref</th>
                  <th className="font-medium p-3">Status</th>
                  <th className="font-medium p-3 text-right">Amount</th>
                  <th className="font-medium p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {items.map((p) => {
                  const pending = canMutate && p.status === "pending";
                  const isSelected = selected.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      data-testid={`pay-row-${p.id}`}
                      className={`hover:bg-brand-surface/60 transition-colors ${pending && isSelected ? "bg-primary/5" : "bg-white"}`}
                    >
                      <td className="p-3 text-center align-middle">
                        {pending && (
                          <input
                            type="checkbox"
                            data-testid={`pay-select-${p.id}`}
                            checked={isSelected}
                            onChange={() => toggle(p.id)}
                            className="h-4 w-4 rounded border-brand-border text-primary focus:ring-primary/50 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="p-3 align-middle">
                        <div className="font-display font-bold text-sm truncate max-w-[200px]" title={p.customer_name}>{p.customer_name}</div>
                        {p.reject_reason ? (
                          <div className="text-[11px] text-destructive italic mt-0.5 max-w-[200px] truncate" title={p.reject_reason}>
                            &quot;{p.reject_reason}&quot;
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 align-middle">
                        <div className="text-xs font-medium">{fmtDateTime(p.submitted_at)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Ref: <span className="font-mono bg-brand-surface px-1.5 py-0.5 rounded">{p.reference}</span>
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="p-3 align-middle text-right">
                        {showMoney ? (
                          <>
                            <div className="text-base font-display font-black">{fmtCAD(p.amount)}</div>
                            {typeof p.outstanding === "number" && p.outstanding > 0 ? (
                              <div className="text-[10px] font-bold text-amber-600 mt-0.5">
                                Due: {fmtCAD(p.outstanding)}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="text-sm font-medium text-muted-foreground">Submitted</div>
                        )}
                      </td>
                      <td className="p-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {p.screenshot_url && (
                            <button
                              data-testid={`view-shot-${p.id}`}
                              onClick={() => setViewing(p)}
                              className="pill-btn btn-outline h-7 text-[10px] px-2.5 gap-1"
                              aria-label="View screenshot"
                            >
                              <Eye size={12} /> View
                            </button>
                          )}
                          {pending && (
                            <>
                              <button
                                data-testid={`verify-${p.id}`}
                                onClick={() => verify(p.id)}
                                className="pill-btn btn-secondary h-7 text-[10px] px-2.5 gap-1"
                              >
                                <CheckCircle size={12} weight="bold" /> Verify
                              </button>
                              <button
                                data-testid={`reject-${p.id}`}
                                onClick={() => setRejectFor(p)}
                                className="pill-btn btn-outline-danger h-7 text-[10px] px-2.5 gap-1"
                              >
                                <XCircle size={12} weight="bold" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
          if (c !== undefined) fetchPage({ cursor: c });
        }}
        onNext={() => {
          const c = paging.goNext();
          if (c !== undefined) fetchPage({ cursor: c });
        }}
        onPageSizeChange={(size: AllowedPageSize) => {
          paging.setPageSize(size);
        }}
        testidPrefix="payments-pagination"
      />

      <AppSheet
        open={confirmBatchVerify}
        onClose={() => { if (!batchBusy) setConfirmBatchVerify(false); }}
        title="Verify selected payments?"
        size="md"
        footer={(
          <div className="flex gap-2">
            <button
              type="button"
              disabled={batchBusy}
              onClick={() => setConfirmBatchVerify(false)}
              className="pill-btn btn-outline flex-1 h-11 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              data-testid="batch-verify-confirm"
              type="button"
              disabled={batchBusy}
              onClick={batchVerify}
              className="pill-btn btn-secondary flex-1 h-11 disabled:opacity-50"
            >
              {batchBusy
                ? "Verifying…"
                : `Verify ${[...selected].filter((id) => pendingIds.includes(id)).length}`}
            </button>
          </div>
        )}
      >
        <p className="text-sm text-muted-foreground">
          This will mark{" "}
          <span className="font-semibold text-foreground">
            {[...selected].filter((id) => pendingIds.includes(id)).length}
          </span>
          {" "}selected pending payment(s) as verified. Make sure the Interac references match before continuing.
        </p>
      </AppSheet>

      <AppSheet open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.customer_name}${showMoney ? ` · ${fmtCAD(viewing.amount)}` : ""}` : "Screenshot"} size="2xl" showHandle={false}>
        <p className="text-xs text-muted-foreground mb-3">Ref {viewing?.reference}</p>
        <div className="rounded-xl overflow-hidden bg-brand-surface flex items-center justify-center p-2">
          {viewing?.screenshot_url ? (
            <img data-testid="screenshot-img" src={viewing.screenshot_url} alt="payment screenshot" className="max-w-full max-h-[60vh] object-contain" />
          ) : null}
        </div>
      </AppSheet>

      <AppSheet
        open={!!rejectFor}
        onClose={() => setRejectFor(null)}
        title="Reject payment?"
        size="md"
        footer={(
          <div className="flex gap-2">
            <button type="button" onClick={() => setRejectFor(null)} className="pill-btn btn-outline flex-1 h-11">Cancel</button>
            <button data-testid="reject-confirm" type="button" onClick={reject} className="pill-btn btn-danger flex-1 h-11">Reject</button>
          </div>
        )}
      >
        <p className="text-sm text-muted-foreground mb-4">Let {rejectFor?.customer_name} know why the reference was rejected.</p>
        <textarea
          data-testid="reject-reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="min-h-[90px] w-full px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          placeholder="Optional reason (e.g., reference not found in Interac)"
        />
      </AppSheet>

      <RecordPaymentSheet
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onRecorded={() => {
          setFilter("verified");
          fetchPage({ statusOverride: "verified" });
        }}
      />
    </div>
  );
}
