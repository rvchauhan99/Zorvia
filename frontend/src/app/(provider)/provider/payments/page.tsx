"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin, canSeePricing } from "@/lib/roles";
import { fmtCAD, fmtDateTime } from "@/lib/format";
import { asPageEnvelope, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CustomerAsyncSelect from "@/components/CustomerAsyncSelect";
import LoadMoreButton from "@/components/LoadMoreButton";
import { StatusFilterCards } from "@/components/StatusFilterCards";
import { InlineLoader } from "@/components/loaders";
import { CheckCircle, XCircle, Eye, Plus } from "@phosphor-icons/react";

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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [confirmBatchVerify, setConfirmBatchVerify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q]);

  const fetchPage = useCallback(
    async (opts: { cursor?: string | null; append?: boolean; statusOverride?: string }) => {
      const append = Boolean(opts.append);
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams();
        const status = opts.statusOverride ?? filter;
        if (status !== "all") params.set("status", status);
        if (debouncedQ) params.set("q", debouncedQ);
        if (range.start) params.set("start", range.start);
        if (range.end) params.set("end", range.end);
        if (customerFilter?.id) params.set("customer_id", customerFilter.id);
        params.set("limit", String(DEFAULT_PAGE_SIZE));
        if (opts.cursor) params.set("cursor", opts.cursor);
        const { data } = await api.get(`/payments?${params.toString()}`);
        const page = asPageEnvelope<any>(data);
        setItems((prev) => (append ? [...prev, ...page.items] : page.items));
        setNextCursor(page.next_cursor);
        setHasMore(page.has_more);
        if (!append) setSelected(new Set());
      } catch {
        toast.error("Failed to load payments");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, debouncedQ, range.start, range.end, customerFilter?.id],
  );

  useEffect(() => {
    fetchPage({ append: false });
  }, [fetchPage]);

  const pendingIds = useMemo(
    () => items.filter((p) => p.status === "pending").map((p) => p.id),
    [items]
  );

  async function verify(id: string) {
    try {
      await api.patch(`/payments/${id}/verify`);
      toast.success("Payment verified");
      fetchPage({ append: false });
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
      fetchPage({ append: false });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Batch verify failed");
      fetchPage({ append: false });
    } finally {
      setBatchBusy(false);
    }
  }

  async function reject() {
    try {
      await api.patch(`/payments/${rejectFor.id}/reject`, { reason: rejectReason });
      toast.success("Payment rejected");
      setRejectFor(null); setRejectReason("");
      fetchPage({ append: false });
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
        <div>
          <span className="label-overline">Reconciliation</span>
          <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Payments</h1>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              data-testid="payment-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or ref"
              className="h-10 flex-1 sm:flex-none px-3 rounded-xl bg-white border border-brand-border text-sm min-w-0 sm:min-w-[180px]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="label-overline">From</span>
            <input
              type="date"
              data-testid="payment-range-start"
              value={range.start}
              onChange={(e) => setRange({ ...range, start: e.target.value })}
              className="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="label-overline">To</span>
            <input
              type="date"
              data-testid="payment-range-end"
              value={range.end}
              onChange={(e) => setRange({ ...range, end: e.target.value })}
              className="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm"
            />
          </label>
          <div className="min-w-[200px] flex-1 sm:flex-none" data-testid="payment-customer-filter">
            <CustomerAsyncSelect
              testid="payment-customer"
              value={customerFilter}
              onChange={(opt) => setCustomerFilter(opt ? { id: opt.id, name: opt.name } : null)}
              placeholder="Filter by customer"
              activeOnly={false}
            />
          </div>
          {canMutate ? (
            <>
              <button
                data-testid="record-payment"
                type="button"
                onClick={() => setRecordOpen(true)}
                className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
              >
                <Plus size={16} weight="bold" /> Record payment
              </button>
              <button
                data-testid="batch-verify"
                disabled={batchBusy || selected.size === 0}
                onClick={() => setConfirmBatchVerify(true)}
                className="h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold disabled:opacity-50 w-full sm:w-auto"
              >
                Verify selected
              </button>
            </>
          ) : null}
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

      <div className="card-tinted overflow-hidden">
        {loading ? (
          <InlineLoader testid="payments-loading" label="Loading payments…" />
        ) : items.length === 0 ? (
          <div className="p-6 sm:p-10 text-center text-muted-foreground text-sm">No {filter === "all" ? "" : filter} payments.</div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {items.map((p) => (
              <li key={p.id} data-testid={`pay-row-${p.id}`} className="p-4 flex flex-col gap-3 hover:bg-brand-surface/60 transition-colors">
                <div className="flex items-start gap-3">
                  {canMutate && p.status === "pending" ? (
                    <label className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-1.5 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid={`pay-select-${p.id}`}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4"
                      />
                    </label>
                  ) : <span className="w-11 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.customer_name}</div>
                    <div className="text-xs text-muted-foreground truncate">Ref: <span className="font-mono">{p.reference}</span> · {fmtDateTime(p.submitted_at)}</div>
                    {showMoney && typeof p.outstanding === "number" ? (
                      <div className="text-xs text-muted-foreground mt-0.5">Outstanding: {fmtCAD(p.outstanding)}</div>
                    ) : null}
                    {p.reject_reason ? <div className="text-xs text-destructive italic mt-0.5">&quot;{p.reject_reason}&quot;</div> : null}
                  </div>
                  <div className="text-right shrink-0">
                    {showMoney ? (
                      <div className="text-lg font-display font-bold">{fmtCAD(p.amount)}</div>
                    ) : (
                      <div className="text-sm font-medium text-muted-foreground">Submitted</div>
                    )}
                    <div className="mt-1 flex justify-end"><StatusPill status={p.status} /></div>
                  </div>
                </div>
                {(p.screenshot_url || (canMutate && p.status === "pending")) ? (
                  <div className="flex items-center gap-2 flex-wrap pl-0 sm:pl-11">
                    {p.screenshot_url ? (
                      <button data-testid={`view-shot-${p.id}`} onClick={() => setViewing(p)} className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-full bg-white border border-brand-border hover:bg-brand-surface inline-flex items-center justify-center gap-1 text-sm cursor-pointer transition-colors" aria-label="View screenshot">
                        <Eye size={16} /> <span className="sm:inline">View</span>
                      </button>
                    ) : null}
                    {canMutate && p.status === "pending" ? (
                      <>
                        <button data-testid={`verify-${p.id}`} onClick={() => verify(p.id)} className="flex-1 sm:flex-none h-11 min-h-[44px] px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer hover:bg-brand-sageDark">
                          <CheckCircle size={16} weight="bold" /> Verify
                        </button>
                        <button data-testid={`reject-${p.id}`} onClick={() => setRejectFor(p)} className="icon-btn icon-btn-danger" aria-label="Reject">
                          <XCircle size={18} />
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        testid="payments-load-more"
        onClick={() => fetchPage({ cursor: nextCursor, append: true })}
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
          fetchPage({ append: false, statusOverride: "verified" });
        }}
      />
    </div>
  );
}
