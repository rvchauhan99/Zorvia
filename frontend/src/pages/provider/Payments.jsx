import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtCAD, fmtDateTime } from "@/lib/format";
import StatusPill from "@/components/StatusPill";
import { CheckCircle, XCircle, Eye } from "@phosphor-icons/react";

export default function Payments() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [viewing, setViewing] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    const url = filter === "all" ? "/payments" : `/payments?status=${filter}`;
    const { data } = await api.get(url);
    setItems(data);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function verify(id) {
    try {
      await api.patch(`/payments/${id}/verify`);
      toast.success("Payment verified");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  async function reject() {
    try {
      await api.patch(`/payments/${rejectFor.id}/reject`, { reason: rejectReason });
      toast.success("Payment rejected");
      setRejectFor(null); setRejectReason("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="label-overline">Reconciliation</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Payments</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["pending", "verified", "rejected", "all"].map((f) => (
          <button
            key={f}
            data-testid={`pfilter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-4 h-10 rounded-full text-sm font-medium border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border hover:bg-brand-surface"}`}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card-tinted overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No {filter === "all" ? "" : filter} payments.</div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {items.map((p) => (
              <li key={p.id} data-testid={`pay-row-${p.id}`} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.customer_name}</div>
                  <div className="text-xs text-muted-foreground truncate">Ref: <span className="font-mono">{p.reference}</span> · {fmtDateTime(p.submitted_at)}</div>
                  {p.reject_reason ? <div className="text-xs text-destructive italic mt-0.5">"{p.reject_reason}"</div> : null}
                </div>
                <div className="text-lg font-display font-bold">{fmtCAD(p.amount)}</div>
                <StatusPill status={p.status} />
                {p.screenshot_url ? (
                  <button data-testid={`view-shot-${p.id}`} onClick={() => setViewing(p)} className="h-9 w-9 rounded-full bg-white border border-brand-border hover:bg-brand-surface inline-flex items-center justify-center" title="View screenshot">
                    <Eye size={16} />
                  </button>
                ) : null}
                {p.status === "pending" ? (
                  <div className="flex items-center gap-1">
                    <button data-testid={`verify-${p.id}`} onClick={() => verify(p.id)} className="h-9 px-3 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform">
                      <CheckCircle size={14} weight="bold" /> Verify
                    </button>
                    <button data-testid={`reject-${p.id}`} onClick={() => setRejectFor(p)} className="h-9 w-9 rounded-full bg-white border border-brand-border inline-flex items-center justify-center" title="Reject">
                      <XCircle size={16} />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-brand-border">
              <div>
                <div className="font-semibold">{viewing.customer_name} · {fmtCAD(viewing.amount)}</div>
                <div className="text-xs text-muted-foreground">Ref {viewing.reference}</div>
              </div>
              <button onClick={() => setViewing(null)} className="text-sm text-muted-foreground">Close</button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-brand-surface p-4">
              <img data-testid="screenshot-img" src={viewing.screenshot_url} alt="payment screenshot" className="max-w-full" />
            </div>
          </div>
        </div>
      ) : null}

      {rejectFor ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setRejectFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
            <h3 className="font-display font-bold text-2xl">Reject payment?</h3>
            <p className="text-sm text-muted-foreground">Let {rejectFor.customer_name} know why the reference was rejected.</p>
            <textarea data-testid="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[90px] px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" placeholder="Optional reason (e.g., reference not found in Interac)" />
            <div className="flex gap-2">
              <button onClick={() => setRejectFor(null)} className="pill-btn btn-outline flex-1">Cancel</button>
              <button data-testid="reject-confirm" onClick={reject} className="pill-btn btn-primary flex-1">Reject</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
