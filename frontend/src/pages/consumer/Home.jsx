import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";
import { CurrencyDollar, Truck, XCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function ConsumerHome() {
  const [me, setMe] = useState(null);
  const [deliveries, setDeliveries] = useState([]);

  async function load() {
    try {
      const [{ data: m }, { data: d }] = await Promise.all([
        api.get("/consumer/me"),
        api.get("/consumer/deliveries"),
      ]);
      setMe(m); setDeliveries(d);
    } catch (e) {
      toast.error("Failed to load");
    }
  }
  useEffect(() => { load(); }, []);

  async function cancel(id) {
    if (!window.confirm("Cancel today's delivery? This is subject to your provider's cutoff.")) return;
    try {
      await api.post(`/consumer/deliveries/${id}/cancel`);
      toast.success("Delivery cancelled");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to cancel");
    }
  }

  const upcoming = deliveries.filter((d) => d.delivery_date >= todayISO());
  const history = deliveries.filter((d) => d.delivery_date < todayISO()).reverse();
  const nextDelivery = upcoming.find((d) => d.status === "pending");

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      {me?.customer?.pending_approval ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm">
          Your account is awaiting approval by <strong>{me?.provider?.name}</strong>. Deliveries will start once they approve.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="flex items-center justify-between"><span className="label-overline">Outstanding</span><CurrencyDollar size={20} className="text-primary" weight="duotone" /></div>
          <div className="font-display font-black text-3xl">{fmtCAD(me?.outstanding ?? 0)}</div>
          <Link data-testid="pay-now-link" to="/consumer/payments" className="text-xs text-primary font-medium">Submit a payment →</Link>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between"><span className="label-overline">Next delivery</span><Truck size={20} className="text-secondary" weight="duotone" /></div>
          <div className="font-display font-black text-2xl">{nextDelivery ? fmtDate(nextDelivery.delivery_date) : "—"}</div>
          <div className="text-xs text-muted-foreground">{me?.provider?.name || ""}</div>
        </div>
      </div>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">Upcoming</h2>
        <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
          {upcoming.length === 0 ? (
            <li className="p-6 text-center text-muted-foreground text-sm">No upcoming deliveries.</li>
          ) : upcoming.slice(0, 8).map((d) => (
            <li key={d.id} data-testid={`c-up-${d.id}`} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{fmtDate(d.delivery_date)}</div>
                <div className="text-xs text-muted-foreground">{fmtCAD(d.meal_price)} · Meal</div>
              </div>
              <StatusPill status={d.status} />
              {d.status === "pending" && d.delivery_date === todayISO() ? (
                <button data-testid={`c-cancel-${d.id}`} onClick={() => cancel(d.id)} className="ml-2 h-9 px-3 rounded-full bg-white border border-brand-border text-xs inline-flex items-center gap-1 hover:bg-brand-surface">
                  <XCircle size={14} /> Cancel today
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">Recent history</h2>
        <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
          {history.length === 0 ? (
            <li className="p-6 text-center text-muted-foreground text-sm">No history yet.</li>
          ) : history.slice(0, 12).map((d) => (
            <li key={d.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{fmtDate(d.delivery_date)}</div>
                <div className="text-xs text-muted-foreground">{fmtCAD(d.meal_price)}</div>
              </div>
              <StatusPill status={d.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
