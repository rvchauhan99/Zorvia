import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtCAD, fmtDate, todayISO } from "@/lib/format";
import StatusPill from "@/components/StatusPill";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Prohibit } from "@phosphor-icons/react";

export default function Deliveries() {
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/deliveries?date=${date}`);
      setItems(data);
    } catch (e) {
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  async function mark(id, status) {
    try {
      await api.patch(`/deliveries/${id}`, { status });
      toast.success(`Marked ${status}`);
      // optimistic
      setItems((it) => it.map((d) => d.id === id ? { ...d, status } : d));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  }

  function shiftDay(delta) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  const counts = items.reduce((a, d) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {});
  const filtered = filter === "all" ? items : items.filter((d) => d.status === filter);

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="label-overline">Route</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Deliveries</h1>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="prev-day" onClick={() => shiftDay(-1)} className="w-10 h-10 rounded-full bg-white border border-brand-border flex items-center justify-center hover:bg-brand-surface"><ArrowLeft size={16} /></button>
          <input data-testid="date-picker" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 px-3 rounded-xl bg-white border border-brand-border font-medium" />
          <button data-testid="next-day" onClick={() => shiftDay(1)} className="w-10 h-10 rounded-full bg-white border border-brand-border flex items-center justify-center hover:bg-brand-surface"><ArrowRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { k: "all", label: "All", count: items.length },
          { k: "pending", label: "Pending", count: counts.pending || 0 },
          { k: "delivered", label: "Delivered", count: counts.delivered || 0 },
          { k: "missed", label: "Missed", count: counts.missed || 0 },
          { k: "cancelled", label: "Cancelled", count: counts.cancelled || 0 },
        ].map((f) => (
          <button
            key={f.k}
            data-testid={`filter-${f.k}`}
            onClick={() => setFilter(f.k)}
            className={`card-tinted p-3 text-left transition-colors ${filter === f.k ? "border-primary ring-2 ring-primary/20" : ""}`}
          >
            <div className="label-overline">{f.label}</div>
            <div className="font-display font-bold text-2xl mt-0.5">{f.count}</div>
          </button>
        ))}
      </div>

      <div className="card-tinted overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No deliveries for {fmtDate(date)}. {items.length === 0 ? "Nothing scheduled." : "Try a different filter."}
          </div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {filtered.map((d) => (
              <li key={d.id} data-testid={`del-row-${d.id}`} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.customer_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.address}{d.apartment ? ` · ${d.apartment}` : ""}{d.postal_code ? ` · ${d.postal_code}` : ""}
                  </div>
                  {d.notes ? <div className="text-xs text-muted-foreground italic mt-0.5">"{d.notes}"</div> : null}
                </div>
                <div className="text-sm font-semibold hidden sm:block">{fmtCAD(d.meal_price)}</div>
                {d.status === "pending" ? (
                  <div className="flex items-center gap-1">
                    <button data-testid={`mark-delivered-${d.id}`} onClick={() => mark(d.id, "delivered")} className="h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold active:scale-95 transition-transform inline-flex items-center gap-1">
                      <CheckCircle size={16} weight="bold" /> Delivered
                    </button>
                    <button data-testid={`mark-missed-${d.id}`} onClick={() => mark(d.id, "missed")} className="h-10 w-10 rounded-full bg-white border border-brand-border hover:bg-brand-surface inline-flex items-center justify-center" title="Missed">
                      <XCircle size={18} />
                    </button>
                    <button data-testid={`mark-cancelled-${d.id}`} onClick={() => mark(d.id, "cancelled")} className="h-10 w-10 rounded-full bg-white border border-brand-border hover:bg-brand-surface inline-flex items-center justify-center" title="Cancel">
                      <Prohibit size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <StatusPill status={d.status} />
                    <button data-testid={`reset-${d.id}`} onClick={() => mark(d.id, "pending")} className="text-xs text-muted-foreground hover:text-foreground">Undo</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
