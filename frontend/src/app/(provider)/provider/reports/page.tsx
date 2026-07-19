"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canSeePricing } from "@/lib/roles";
import { fmtCAD, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { DownloadSimple } from "@phosphor-icons/react";
import { InlineLoader } from "@/components/loaders";

function tabButton(active: boolean, label: string, onClick: () => void, testid: string) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`snap-start shrink-0 whitespace-nowrap px-3.5 h-9 sm:h-10 rounded-full text-sm font-medium border cursor-pointer transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border hover:bg-brand-surface"}`}
    >{label}</button>
  );
}

function toCSV(rows: any[]) {
  if (!rows || !rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

function downloadCSV(name: string, rows: any[]) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { session } = useAuth();
  const showMoney = canSeePricing(session);
  const [tab, setTab] = useState("daily");
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState({ start: "", end: todayISO() });
  const [statementMonth, setStatementMonth] = useState(todayISO().slice(0, 7));

  async function load() {
    try {
      let url;
      if (tab === "daily") url = `/reports/daily-deliveries${range.start ? `?start=${range.start}&end=${range.end}` : ""}`;
      else if (tab === "outstanding") url = "/reports/outstanding";
      else if (tab === "collections") url = `/reports/collections${range.start ? `?start=${range.start}&end=${range.end}` : ""}`;
      else if (tab === "active") url = "/reports/active-customers";
      else if (tab === "statement") url = `/reports/statement?month=${statementMonth}`;
      else url = "/reports/area-summary";
      const { data } = await api.get(url);
      setData(data);
    } catch (e) {
      toast.error("Failed to load report");
    }
  }
  useEffect(() => { load(); }, [tab, range.start, range.end, statementMonth]);

  function exportCSV() {
    if (!data) return;
    const rows = data.rows || (tab === "active" ? [data] : tab === "statement" ? (data.rows || []) : []);
    downloadCSV(`tiffin-${tab}-${todayISO()}`, rows.length ? rows : [data.totals || data]);
    toast.success("CSV downloaded");
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="label-overline">Insights</span>
          <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Reports</h1>
        </div>
        <button data-testid="export-csv" onClick={exportCSV} className="pill-btn btn-outline gap-2 cursor-pointer hover:bg-brand-surface h-10"><DownloadSimple size={16} /> Export CSV</button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabButton(tab === "daily", "Daily deliveries", () => setTab("daily"), "rtab-daily")}
        {tabButton(tab === "outstanding", "Outstanding", () => setTab("outstanding"), "rtab-outstanding")}
        {tabButton(tab === "collections", "Collections", () => setTab("collections"), "rtab-collections")}
        {tabButton(tab === "active", "Active customers", () => setTab("active"), "rtab-active")}
        {tabButton(tab === "area", "Area summary", () => setTab("area"), "rtab-area")}
        {tabButton(tab === "statement", "Statement", () => setTab("statement"), "rtab-statement")}
      </div>

      {(tab === "daily" || tab === "collections") ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="label-overline">From</span>
            <input data-testid="range-start" type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all" />
          </label>
          <label className="flex items-center gap-2">
            <span className="label-overline">To</span>
            <input data-testid="range-end" type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all" />
          </label>
        </div>
      ) : null}

      {tab === "statement" ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="label-overline">Month</span>
            <input
              data-testid="statement-month"
              type="month"
              value={statementMonth}
              onChange={(e) => setStatementMonth(e.target.value)}
              className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all"
            />
          </label>
        </div>
      ) : null}

      <div className="card-tinted p-4 sm:p-5 overflow-hidden">
        {!data ? <InlineLoader /> :
         !showMoney && (tab === "outstanding" || tab === "collections" || tab === "statement") ? (
          <div className="p-8 text-center text-sm text-muted-foreground" data-testid="reports-money-hidden">
            Balance and payment amounts are visible to admins only. Use the Daily deliveries tab for stop counts, or ask an admin for financial reports.
          </div>
         ) : tab === "daily" ? (
          data.rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No data in range.</div>
          ) : (
            <>
              <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                {data.rows.map((r: any) => (
                  <li key={r.date} className="px-4 sm:px-5 py-4 flex flex-col gap-2">
                    <div className="font-medium">{r.date}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <span className="text-muted-foreground">Delivered</span>
                      <span className="text-right font-semibold text-secondary">{r.delivered}</span>
                      <span className="text-muted-foreground">Pending</span>
                      <span className="text-right">{r.pending}</span>
                      <span className="text-muted-foreground">Missed</span>
                      <span className="text-right text-primary">{r.missed}</span>
                      <span className="text-muted-foreground">Cancelled</span>
                      <span className="text-right text-muted-foreground">{r.cancelled}</span>
                      <span className="text-muted-foreground">Paused</span>
                      <span className="text-right text-muted-foreground">{r.paused}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <table className="hidden md:table w-full text-sm">
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
                  {data.rows.map((r: any) => (
                    <tr key={r.date} className="hover:bg-brand-surface/60 transition-colors">
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
            </>
          )
        ) : tab === "outstanding" ? (
          <>
            <div className="mb-3 text-sm">Total outstanding: <span className="font-display font-bold text-2xl text-primary">{fmtCAD(data.total)}</span></div>
            {data.rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No outstanding balances</div>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                  {data.rows.map((r: any, i: number) => (
                    <li key={r.customer_id || `outstanding-${r.email || r.name || i}`} className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{[r.phone, r.email].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div className="shrink-0 font-semibold text-primary">{fmtCAD(r.outstanding)}</div>
                    </li>
                  ))}
                </ul>
                <table className="hidden md:table w-full text-sm">
                  <thead className="text-left bg-brand-surface">
                    <tr>
                      <th className="px-3 py-2 label-overline">Customer</th>
                      <th className="px-3 py-2 label-overline">Phone</th>
                      <th className="px-3 py-2 label-overline">Email</th>
                      <th className="px-3 py-2 label-overline text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {data.rows.map((r: any, i: number) => (
                      <tr key={r.customer_id || `outstanding-${r.email || r.name || i}`} className="hover:bg-brand-surface/60 transition-colors">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.phone}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        ) : tab === "collections" ? (
          <>
            <div className="mb-3 text-sm">Total collected: <span className="font-display font-bold text-2xl text-secondary">{fmtCAD(data.total_amount)}</span> across {data.total_count} payments</div>
            {data.rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No collections in range.</div>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                  {data.rows.map((r: any) => (
                    <li key={r.date} className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{r.date}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.count} payment{r.count === 1 ? "" : "s"}</div>
                      </div>
                      <div className="font-semibold text-secondary">{fmtCAD(r.amount)}</div>
                    </li>
                  ))}
                </ul>
                <table className="hidden md:table w-full text-sm">
                  <thead className="text-left bg-brand-surface">
                    <tr>
                      <th className="px-3 py-2 label-overline">Date</th>
                      <th className="px-3 py-2 label-overline">Count</th>
                      <th className="px-3 py-2 label-overline text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {data.rows.map((r: any) => (
                      <tr key={r.date} className="hover:bg-brand-surface/60 transition-colors">
                        <td className="px-3 py-2 font-medium">{r.date}</td>
                        <td className="px-3 py-2">{r.count}</td>
                        <td className="px-3 py-2 text-right font-semibold text-secondary">{fmtCAD(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        ) : tab === "active" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{k:"total",l:"Total"},{k:"active",l:"Active"},{k:"pending",l:"Pending approval"},{k:"on_pause",l:"On pause"}].map((it: any) => (
              <div key={it.k} className="card-tinted p-5">
                <div className="label-overline">{it.l}</div>
                <div className="font-display font-black text-3xl mt-1">{data[it.k]}</div>
              </div>
            ))}
          </div>
        ) : tab === "statement" ? (
          <>
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="label-overline">Delivered</div>
                <div className="font-display font-bold text-xl">{data.totals?.delivered_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">{fmtCAD(data.totals?.delivered_amount ?? 0)}</div>
              </div>
              <div>
                <div className="label-overline">Verified payments</div>
                <div className="font-display font-bold text-xl">{data.totals?.verified_payments_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">{fmtCAD(data.totals?.verified_payments_amount ?? 0)}</div>
              </div>
              <div>
                <div className="label-overline">Outstanding</div>
                <div className="font-display font-bold text-xl text-primary">{fmtCAD(data.totals?.outstanding_total ?? 0)}</div>
              </div>
              <div>
                <div className="label-overline">Month</div>
                <div className="font-mono font-semibold">{data.month}</div>
              </div>
            </div>
            {(data.rows || []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No statement rows for this month.</div>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                  {data.rows.map((r: any, i: number) => (
                    <li key={r.customer_id || `statement-${r.email || r.name || i}`} className="px-4 sm:px-5 py-4 flex flex-col gap-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-muted-foreground">Meals</span>
                        <span className="text-right">{r.delivered_count}</span>
                        <span className="text-muted-foreground">Delivered $</span>
                        <span className="text-right">{fmtCAD(r.delivered_amount)}</span>
                        <span className="text-muted-foreground">Paid $</span>
                        <span className="text-right text-secondary">{fmtCAD(r.verified_payments_amount)}</span>
                        <span className="text-muted-foreground">Outstanding</span>
                        <span className="text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <table className="hidden md:table w-full text-sm">
                  <thead className="text-left bg-brand-surface">
                    <tr>
                      <th className="px-3 py-2 label-overline">Customer</th>
                      <th className="px-3 py-2 label-overline">Meals</th>
                      <th className="px-3 py-2 label-overline text-right">Delivered $</th>
                      <th className="px-3 py-2 label-overline text-right">Paid $</th>
                      <th className="px-3 py-2 label-overline text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {data.rows.map((r: any, i: number) => (
                      <tr key={r.customer_id || `statement-${r.email || r.name || i}`} className="hover:bg-brand-surface/60 transition-colors">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2">{r.delivered_count}</td>
                        <td className="px-3 py-2 text-right">{fmtCAD(r.delivered_amount)}</td>
                        <td className="px-3 py-2 text-right text-secondary">{fmtCAD(r.verified_payments_amount)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        ) : (
          data.rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No area data yet.</div>
          ) : (
            <>
              <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                {data.rows.map((r: any, i: number) => (
                  <li key={r.area || `area-${i}`} className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                    <span className="font-mono uppercase">{r.area}</span>
                    <span className="font-semibold">{r.customers}</span>
                  </li>
                ))}
              </ul>
              <table className="hidden md:table w-full text-sm">
                <thead className="text-left bg-brand-surface">
                  <tr>
                    <th className="px-3 py-2 label-overline">Area (postal prefix)</th>
                    <th className="px-3 py-2 label-overline text-right">Customers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={r.area || `area-${i}`} className="hover:bg-brand-surface/60 transition-colors">
                      <td className="px-3 py-2 font-mono uppercase">{r.area}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        )}
      </div>
    </div>
  );
}
