import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { DownloadSimple } from "@phosphor-icons/react";

function tabButton(active, label, onClick, testid) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`px-4 h-10 rounded-full text-sm font-medium border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border hover:bg-brand-surface"}`}
    >{label}</button>
  );
}

function toCSV(rows) {
  if (!rows || !rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

function downloadCSV(name, rows) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [tab, setTab] = useState("daily");
  const [data, setData] = useState(null);
  const [range, setRange] = useState({ start: "", end: todayISO() });

  async function load() {
    try {
      let url;
      if (tab === "daily") url = `/reports/daily-deliveries${range.start ? `?start=${range.start}&end=${range.end}` : ""}`;
      else if (tab === "outstanding") url = "/reports/outstanding";
      else if (tab === "collections") url = `/reports/collections${range.start ? `?start=${range.start}&end=${range.end}` : ""}`;
      else if (tab === "active") url = "/reports/active-customers";
      else url = "/reports/area-summary";
      const { data } = await api.get(url);
      setData(data);
    } catch (e) {
      toast.error("Failed to load report");
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, range.start, range.end]);

  function exportCSV() {
    if (!data) return;
    const rows = data.rows || (tab === "active" ? [data] : []);
    downloadCSV(`tiffin-${tab}-${todayISO()}`, rows);
    toast.success("CSV downloaded");
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="label-overline">Insights</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Reports</h1>
        </div>
        <button data-testid="export-csv" onClick={exportCSV} className="pill-btn btn-outline gap-2"><DownloadSimple size={16} /> Export CSV</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabButton(tab === "daily", "Daily deliveries", () => setTab("daily"), "rtab-daily")}
        {tabButton(tab === "outstanding", "Outstanding", () => setTab("outstanding"), "rtab-outstanding")}
        {tabButton(tab === "collections", "Collections", () => setTab("collections"), "rtab-collections")}
        {tabButton(tab === "active", "Active customers", () => setTab("active"), "rtab-active")}
        {tabButton(tab === "area", "Area summary", () => setTab("area"), "rtab-area")}
      </div>

      {(tab === "daily" || tab === "collections") ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="label-overline">From</span>
            <input data-testid="range-start" type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="h-10 px-3 rounded-xl bg-white border border-brand-border" />
          </label>
          <label className="flex items-center gap-2">
            <span className="label-overline">To</span>
            <input data-testid="range-end" type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="h-10 px-3 rounded-xl bg-white border border-brand-border" />
          </label>
        </div>
      ) : null}

      <div className="card-tinted p-5 overflow-x-auto">
        {!data ? <div className="text-muted-foreground">Loading…</div> :
         tab === "daily" ? (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="text-left bg-brand-surface">
              <tr>
                <th className="px-3 py-2 label-overline">Date</th>
                <th className="px-3 py-2 label-overline">Delivered</th>
                <th className="px-3 py-2 label-overline">Pending</th>
                <th className="px-3 py-2 label-overline">Missed</th>
                <th className="px-3 py-2 label-overline">Cancelled</th>
                <th className="px-3 py-2 label-overline">Paused</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {data.rows.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No data in range.</td></tr>
              ) : data.rows.map((r) => (
                <tr key={r.date}>
                  <td className="px-3 py-2 font-medium">{r.date}</td>
                  <td className="px-3 py-2 text-secondary font-semibold">{r.delivered}</td>
                  <td className="px-3 py-2">{r.pending}</td>
                  <td className="px-3 py-2 text-primary">{r.missed}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.cancelled}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.paused}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "outstanding" ? (
          <>
            <div className="mb-3 text-sm">Total outstanding: <span className="font-display font-bold text-2xl text-primary">{fmtCAD(data.total)}</span></div>
            <table className="w-full text-sm min-w-[600px]">
              <thead className="text-left bg-brand-surface">
                <tr>
                  <th className="px-3 py-2 label-overline">Customer</th>
                  <th className="px-3 py-2 label-overline">Phone</th>
                  <th className="px-3 py-2 label-overline">Email</th>
                  <th className="px-3 py-2 label-overline text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {data.rows.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No outstanding balances 🎉</td></tr>
                : data.rows.map((r) => (
                  <tr key={r.customer_id}>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.phone}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : tab === "collections" ? (
          <>
            <div className="mb-3 text-sm">Total collected: <span className="font-display font-bold text-2xl text-secondary">{fmtCAD(data.total_amount)}</span> across {data.total_count} payments</div>
            <table className="w-full text-sm min-w-[500px]">
              <thead className="text-left bg-brand-surface">
                <tr>
                  <th className="px-3 py-2 label-overline">Date</th>
                  <th className="px-3 py-2 label-overline">Count</th>
                  <th className="px-3 py-2 label-overline text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {data.rows.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No collections in range.</td></tr>
                : data.rows.map((r) => (
                  <tr key={r.date}>
                    <td className="px-3 py-2 font-medium">{r.date}</td>
                    <td className="px-3 py-2">{r.count}</td>
                    <td className="px-3 py-2 text-right font-semibold text-secondary">{fmtCAD(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : tab === "active" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{k:"total",l:"Total"},{k:"active",l:"Active"},{k:"pending",l:"Pending approval"},{k:"on_pause",l:"On pause"}].map((it) => (
              <div key={it.k} className="card-tinted p-5">
                <div className="label-overline">{it.l}</div>
                <div className="font-display font-black text-3xl mt-1">{data[it.k]}</div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[400px]">
            <thead className="text-left bg-brand-surface">
              <tr>
                <th className="px-3 py-2 label-overline">Area (postal prefix)</th>
                <th className="px-3 py-2 label-overline text-right">Customers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {data.rows.length === 0 ? <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">No area data yet.</td></tr>
              : data.rows.map((r) => (
                <tr key={r.area}>
                  <td className="px-3 py-2 font-mono uppercase">{r.area}</td>
                  <td className="px-3 py-2 text-right font-semibold">{r.customers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
