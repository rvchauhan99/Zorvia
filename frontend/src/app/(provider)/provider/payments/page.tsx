"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { fmtCAD, fmtDateTime } from "@/lib/format";
import StatusPill from "@/components/StatusPill";
import AppSheet from "@/components/AppSheet";
import { StatusFilterCards } from "@/components/StatusFilterCards";
import { CheckCircle, XCircle, Eye } from "@phosphor-icons/react";

export default function Payments() {
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<any>(null);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [confirmBatchVerify, setConfirmBatchVerify] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (q.trim()) params.set("q", q.trim());
    const { data } = await api.get(`/payments?${params.toString()}`);
    setItems(data);
    setSelected(new Set());
  }
  useEffect(() => { load(); }, [filter]);

  const pendingIds = useMemo(
    () => items.filter((p) => p.status === "pending").map((p) => p.id),
    [items]
  );

  async function verify(id: string) {
    try {
      await api.patch(`/payments/${id}/verify`);
      toast.success("Payment verified");
      load();
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
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Batch verify failed");
      load();
    } finally {
      setBatchBusy(false);
    }
  }

  async function reject() {
    try {
      await api.patch(`/payments/${rejectFor.id}/reject`, { reason: rejectReason });
      toast.success("Payment rejected");
      setRejectFor(null); setRejectReason("");
      load();
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
              onKeyDown={(e) => { if (e.key === "Enter") load(); }}
              placeholder="Search name or ref"
              className="h-10 flex-1 sm:flex-none px-3 rounded-xl bg-white border border-brand-border text-sm min-w-0 sm:min-w-[180px]"
            />
            <button data-testid="payment-search-btn" onClick={load} className="h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-medium hover:bg-brand-surface shrink-0">Search</button>
          </div>
          {canMutate ? (
            <button
              data-testid="batch-verify"
              disabled={batchBusy || selected.size === 0}
              onClick={() => setConfirmBatchVerify(true)}
              className="h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold disabled:opacity-50 w-full sm:w-auto"
            >
              Verify selected
            </button>
          ) : null}
        </div>
      </div>

      <StatusFilterCards
        testid="payments-filters"
        itemTestIdPrefix="pfilter"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "pending", label: "Pending", count: filter === "pending" ? items.length : undefined },
          { id: "verified", label: "Verified", count: filter === "verified" ? items.length : undefined },
          { id: "rejected", label: "Rejected", count: filter === "rejected" ? items.length : undefined },
          { id: "all", label: "All", count: filter === "all" ? items.length : undefined },
        ]}
      />

      <div className="card-tinted overflow-hidden">
        {items.length === 0 ? (
          <div className="p-6 sm:p-10 text-center text-muted-foreground text-sm">No {filter === "all" ? "" : filter} payments.</div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {items.map((p) => (
              <li key={p.id} data-testid={`pay-row-${p.id}`} className="p-4 flex flex-col gap-3 hover:bg-brand-surface/60 transition-colors">
                <div className="flex items-start gap-3">
                  {canMutate && p.status === "pending" ? (
                    <input
                      type="checkbox"
                      data-testid={`pay-select-${p.id}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="mt-1.5 h-4 w-4"
                    />
                  ) : <span className="w-4" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.customer_name}</div>
                    <div className="text-xs text-muted-foreground truncate">Ref: <span className="font-mono">{p.reference}</span> · {fmtDateTime(p.submitted_at)}</div>
                    {typeof p.outstanding === "number" ? (
                      <div className="text-xs text-muted-foreground mt-0.5">Outstanding: {fmtCAD(p.outstanding)}</div>
                    ) : null}
                    {p.reject_reason ? <div className="text-xs text-destructive italic mt-0.5">&quot;{p.reject_reason}&quot;</div> : null}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-display font-bold">{fmtCAD(p.amount)}</div>
                    <div className="mt-1 flex justify-end"><StatusPill status={p.status} /></div>
                  </div>
                </div>
                {(p.screenshot_url || (canMutate && p.status === "pending")) ? (
                  <div className="flex items-center gap-2 flex-wrap pl-7">
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

      <AppSheet open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.customer_name} · ${fmtCAD(viewing.amount)}` : "Screenshot"} size="2xl" showHandle={false}>
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
    </div>
  );
}
