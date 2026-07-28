"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canSeePricing } from "@/lib/roles";
import { fmtCAD, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { DownloadSimple } from "@phosphor-icons/react";
import { InlineLoader } from "@/components/loaders";
import { AreaChart } from "@/components/analytics/AreaChart";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { DEFAULT_PAGE_SIZE, type AllowedPageSize } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";

function tabButton(active: boolean, label: string, onClick: () => void, testid: string) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`snap-start shrink-0 whitespace-nowrap px-3.5 h-11 min-h-[44px] rounded-full text-sm font-medium border cursor-pointer transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border hover:bg-brand-surface"}`}
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
  const [tab, setTab] = useState("outstanding");
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState({ start: "", end: todayISO() });
  const [statementMonth, setStatementMonth] = useState(todayISO().slice(0, 7));
  const [listQ, setListQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [statementActivityOnly, setStatementActivityOnly] = useState(false);
  const [collectionsView, setCollectionsView] = useState<"received" | "due">("received");
  const [dueDate, setDueDate] = useState(todayISO());
  const [dueCollectionDay, setDueCollectionDay] = useState("");
  const [dueMonth, setDueMonth] = useState(todayISO().slice(0, 7));
  const [areaPrefix, setAreaPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const paging = useCursorPagination({ initialPageSize: DEFAULT_PAGE_SIZE });
  const moneyTab = tab === "outstanding" || tab === "customer-credit" || tab === "collections" || tab === "statement";
  const canExport = showMoney || !moneyTab;
  const rows = data?.rows ?? [];
  const balanceListTab = tab === "outstanding" || tab === "customer-credit";
  const pagedTab = tab === "outstanding" || tab === "customer-credit" || tab === "statement" || tab === "area";
  const fixedOutstanding = tab === "outstanding" && data?.billing_mode === "monthly_fixed";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(listQ.trim()), 300);
    return () => clearTimeout(t);
  }, [listQ]);

  function selectTab(next: string) {
    setTab(next);
    setData(null);
    setListQ("");
    setDebouncedQ("");
    setMinAmount("");
    setAreaPrefix("");
    setStatementActivityOnly(false);
    setCollectionsView("received");
  }

  function outstandingParams(balance: "owed" | "credit", cursor?: string | null) {
    const params = new URLSearchParams({
      balance,
      page_size: String(paging.pageSize),
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (minAmount.trim() !== "" && !Number.isNaN(Number(minAmount))) {
      params.set("min_amount", String(Number(minAmount)));
    }
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  }

  async function load(opts: { cursor?: string | null } = {}) {
    if (!showMoney && moneyTab) {
      setData({});
      return;
    }
    setLoading(true);
    try {
      let url;
      if (tab === "daily") url = `/reports/daily-deliveries${range.start ? `?start=${range.start}&end=${range.end}` : ""}`;
      else if (tab === "outstanding") url = `/reports/outstanding?${outstandingParams("owed", opts.cursor)}`;
      else if (tab === "customer-credit") url = `/reports/outstanding?${outstandingParams("credit", opts.cursor)}`;
      else if (tab === "collections") {
        if (collectionsView === "due") {
          const params = new URLSearchParams({ month: dueMonth, due_date: dueDate });
          if (dueCollectionDay) params.set("collection_day", dueCollectionDay);
          url = `/reports/payment-due?${params.toString()}`;
        } else {
          url = `/reports/collections${range.start ? `?start=${range.start}&end=${range.end}` : ""}`;
        }
      }
      else if (tab === "active") url = "/reports/active-customers";
      else if (tab === "statement") {
        const params = new URLSearchParams({ month: statementMonth, page_size: String(paging.pageSize) });
        if (debouncedQ) params.set("q", debouncedQ);
        if (statementActivityOnly) params.set("activity_only", "true");
        if (opts.cursor) params.set("cursor", opts.cursor);
        url = `/reports/statement?${params.toString()}`;
      } else {
        const params = new URLSearchParams({ page_size: String(paging.pageSize) });
        if (areaPrefix.trim()) params.set("area", areaPrefix.trim());
        if (opts.cursor) params.set("cursor", opts.cursor);
        url = `/reports/area-summary?${params.toString()}`;
      }
      const { data: payload } = await api.get(url);
      setData(payload);
      if (tab === "outstanding" || tab === "customer-credit") {
        paging.applyPageResult({
          next_cursor: payload.next_cursor ?? null,
          has_more: Boolean(payload.has_more),
          total: payload.row_count,
        });
      } else if (tab === "statement" || tab === "area") {
        paging.applyPageResult({
          next_cursor: payload.next_cursor ?? null,
          has_more: Boolean(payload.has_more),
          total: payload.total,
        });
      }
    } catch {
      toast.error("Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    paging.resetToFirstPage();
    load({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset+fetch on filter identity
  }, [tab, range.start, range.end, statementMonth, showMoney, debouncedQ, minAmount, statementActivityOnly, areaPrefix, collectionsView, dueDate, dueCollectionDay, dueMonth, paging.pageSize]);

  function pagingBar(testidPrefix: string) {
    return (
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
        testidPrefix={testidPrefix}
      />
    );
  }

  function exportCSV() {
    if (!data || !canExport) return;
    if (moneyTab && !showMoney) return;
    const exportRows =
      tab === "active"
        ? [data]
        : tab === "area" && !showMoney
          ? rows.map((r: any) => ({ area: r.area, customers: r.customers }))
          : tab === "customer-credit"
            ? rows.map((r: any) => ({
                customer_id: r.customer_id,
                name: r.name,
                phone: r.phone,
                email: r.email,
                credit: r.credit ?? Math.abs(Number(r.outstanding) || 0),
              }))
            : tab === "outstanding" && data?.billing_mode === "monthly_fixed"
              ? rows.map((r: any) => ({
                  customer_id: r.customer_id,
                  name: r.name,
                  phone: r.phone,
                  email: r.email,
                  renewal_date: r.renewal_date || r.collection_due_date || r.last_due_date || "",
                  days_overdue: r.days_overdue ?? 0,
                  outstanding: r.outstanding,
                }))
              : rows;
    downloadCSV(`tiffin-${tab}-${todayISO()}`, exportRows.length ? exportRows : [data.totals || data]);
    toast.success("CSV downloaded");
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="label-overline">Insights</span>
          <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Reports</h1>
        </div>
        {canExport ? (
          <button data-testid="export-csv" onClick={exportCSV} className="pill-btn btn-outline gap-2 cursor-pointer hover:bg-brand-surface h-11 min-h-[44px] shrink-0">
            <DownloadSimple size={16} /> Export CSV
          </button>
        ) : null}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabButton(tab === "outstanding", "Outstanding", () => selectTab("outstanding"), "rtab-outstanding")}
        {tabButton(tab === "customer-credit", "Customer credit", () => selectTab("customer-credit"), "rtab-customer-credit")}
        {tabButton(tab === "daily", "Daily deliveries", () => selectTab("daily"), "rtab-daily")}
        {tabButton(tab === "collections", "Collections", () => selectTab("collections"), "rtab-collections")}
        {tabButton(tab === "active", "Active customers", () => selectTab("active"), "rtab-active")}
        {tabButton(tab === "area", "Area summary", () => selectTab("area"), "rtab-area")}
        {tabButton(tab === "statement", "Statement", () => selectTab("statement"), "rtab-statement")}
      </div>

      {(tab === "daily" || (tab === "collections" && collectionsView === "received")) ? (
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

      {tab === "collections" ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="collections-view-received"
            onClick={() => setCollectionsView("received")}
            className={`px-3 h-10 rounded-full text-sm border cursor-pointer ${collectionsView === "received" ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border"}`}
          >
            Payments received
          </button>
          <button
            type="button"
            data-testid="collections-view-due"
            onClick={() => setCollectionsView("due")}
            className={`px-3 h-10 rounded-full text-sm border cursor-pointer ${collectionsView === "due" ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border"}`}
          >
            Amounts due
          </button>
        </div>
      ) : null}

      {tab === "collections" && collectionsView === "due" ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="label-overline">Due date</span>
            <input data-testid="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 px-3 rounded-xl bg-white border border-brand-border" />
          </label>
          <label className="flex items-center gap-2">
            <span className="label-overline">Billing month</span>
            <input data-testid="due-month" type="month" value={dueMonth} onChange={(e) => setDueMonth(e.target.value)} className="h-10 px-3 rounded-xl bg-white border border-brand-border" />
          </label>
          <label className="flex items-center gap-2">
            <span className="label-overline">Collection day</span>
            <select
              data-testid="due-collection-day"
              value={dueCollectionDay}
              onChange={(e) => setDueCollectionDay(e.target.value)}
              className="h-10 px-3 rounded-xl bg-white border border-brand-border"
            >
              <option value="">All</option>
              {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                <option key={d} value={String(d)}>{d}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {balanceListTab ? (
        <div className="flex flex-wrap items-center gap-3 text-sm" data-testid="reports-balance-filters">
          <label className="flex items-center gap-2 min-w-[180px] flex-1">
            <span className="label-overline shrink-0">Search</span>
            <input
              data-testid="reports-search"
              value={listQ}
              onChange={(e) => setListQ(e.target.value)}
              placeholder="Name, phone, email"
              className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all w-full min-w-0"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="label-overline shrink-0">Min $</span>
            <input
              data-testid="reports-min-amount"
              type="number"
              min={0}
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all w-28"
            />
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
          <label className="flex items-center gap-2 min-w-[180px] flex-1">
            <span className="label-overline shrink-0">Search</span>
            <input
              data-testid="statement-search"
              value={listQ}
              onChange={(e) => setListQ(e.target.value)}
              placeholder="Customer name"
              className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all w-full min-w-0"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-testid="statement-activity-only"
              checked={statementActivityOnly}
              onChange={(e) => setStatementActivityOnly(e.target.checked)}
              className="rounded border-brand-border"
            />
            <span className="text-sm">Activity only</span>
          </label>
        </div>
      ) : null}

      {tab === "area" ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="label-overline">Area prefix</span>
            <input
              data-testid="area-prefix"
              value={areaPrefix}
              onChange={(e) => setAreaPrefix(e.target.value)}
              placeholder="e.g. M5"
              className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all w-28 uppercase"
            />
          </label>
        </div>
      ) : null}

      <div className="card-tinted p-4 sm:p-5 overflow-hidden">
        {!data ? <InlineLoader /> :
         !showMoney && (tab === "outstanding" || tab === "customer-credit" || tab === "collections" || tab === "statement") ? (
          <div className="p-8 text-center text-sm text-muted-foreground" data-testid="reports-money-hidden">
            Balance and payment amounts are visible to admins only. Use the Daily deliveries tab for stop counts, or ask an admin for financial reports.
          </div>
         ) : tab === "daily" ? (
          rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No data in range.</div>
          ) : (
            <>
              <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                {rows.map((r: any, i: number) => (
                  <li key={r.date ? `deliv-${r.date}-${i}` : `deliv-${i}`} className="px-4 sm:px-5 py-4 flex flex-col gap-2">
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
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
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
                  {rows.map((r: any, i: number) => (
                    <tr key={r.date ? `deliv-${r.date}-${i}` : `deliv-${i}`} className="hover:bg-brand-surface/60 transition-colors">
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
              </div>
            </>
          )
        ) : tab === "outstanding" ? (
          <>
            <div className="mb-3 text-sm">
              Total outstanding:{" "}
              <span className="font-display font-bold text-2xl text-primary">{fmtCAD(data.total)}</span>
              {fixedOutstanding ? (
                <span className="text-muted-foreground ml-2 text-xs sm:text-sm">
                  (past collection day only · {data.overdue_count ?? rows.length} overdue)
                </span>
              ) : null}
            </div>
            {rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {fixedOutstanding
                  ? "No overdue balances — customers only appear after their collection day if they still owe"
                  : "No outstanding balances"}
              </div>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5" data-testid="outstanding-list-mobile">
                  {rows.map((r: any, i: number) => (
                    <li
                      key={r.customer_id || `outstanding-${r.email || r.name || i}`}
                      className={`px-4 sm:px-5 py-4 flex items-start justify-between gap-3 ${
                        fixedOutstanding ? "bg-destructive/5" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2 flex-wrap">
                          <span>{r.name}</span>
                          {fixedOutstanding ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                              Overdue
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[r.phone, r.email].filter(Boolean).join(" · ")}
                        </div>
                        {fixedOutstanding ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            Renewal {r.renewal_date || r.collection_due_date || r.last_due_date || "—"}
                            {r.days_overdue ? ` · ${r.days_overdue}d overdue` : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 font-semibold text-primary">{fmtCAD(r.outstanding)}</div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]" data-testid="outstanding-table">
                  <thead className="text-left bg-brand-surface">
                    <tr>
                      <th className="px-3 py-2 label-overline">Customer</th>
                      <th className="px-3 py-2 label-overline">Phone</th>
                      {fixedOutstanding ? (
                        <>
                          <th className="px-3 py-2 label-overline">Renewal date</th>
                          <th className="px-3 py-2 label-overline">Overdue by</th>
                        </>
                      ) : (
                        <th className="px-3 py-2 label-overline">Email</th>
                      )}
                      <th className="px-3 py-2 label-overline text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {rows.map((r: any, i: number) => (
                      <tr
                        key={r.customer_id || `outstanding-${r.email || r.name || i}`}
                        className={`hover:bg-brand-surface/60 transition-colors ${
                          fixedOutstanding ? "bg-destructive/5" : ""
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">
                          <span className="inline-flex items-center gap-2 flex-wrap">
                            {r.name}
                            {fixedOutstanding ? (
                              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                                Overdue
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.phone}</td>
                        {fixedOutstanding ? (
                          <>
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.renewal_date || r.collection_due_date || r.last_due_date || "—"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.days_overdue ? `${r.days_overdue}d` : "—"}
                            </td>
                          </>
                        ) : (
                          <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                        )}
                        <td className="px-3 py-2 text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
            {pagingBar("reports-outstanding-pagination")}
          </>
        ) : tab === "customer-credit" ? (
          <>
            <div className="mb-3 text-sm">
              Total credit:{" "}
              <span className="font-display font-bold text-2xl text-secondary" data-testid="customer-credit-total">
                {fmtCAD(data.total)}
              </span>
              <span className="text-muted-foreground ml-2">
                (filtered list; total credit {fmtCAD(data.total)})
              </span>
            </div>
            {rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground" data-testid="customer-credit-empty">
                No customer credits
              </div>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5" data-testid="customer-credit-list">
                  {rows.map((r: any, i: number) => (
                    <li key={r.customer_id || `credit-${r.email || r.name || i}`} className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{[r.phone, r.email].filter(Boolean).join(" · ")}</div>
                        {data?.billing_mode === "monthly_fixed" && (r.renewal_date || r.collection_due_date) ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            Next renewal {r.renewal_date || r.collection_due_date}
                            {r.prepaid_months ? ` · ${r.prepaid_months} mo prepaid` : ""}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold text-secondary">{fmtCAD(r.credit ?? Math.abs(r.outstanding || 0))}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">credit</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="text-left bg-brand-surface">
                      <tr>
                        <th className="px-3 py-2 label-overline">Customer</th>
                        <th className="px-3 py-2 label-overline">Phone</th>
                        <th className="px-3 py-2 label-overline">Email</th>
                        {data?.billing_mode === "monthly_fixed" ? (
                          <th className="px-3 py-2 label-overline">Next renewal</th>
                        ) : null}
                        <th className="px-3 py-2 label-overline text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {rows.map((r: any, i: number) => (
                        <tr key={r.customer_id || `credit-${r.email || r.name || i}`} className="hover:bg-brand-surface/60 transition-colors">
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.phone}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                          {data?.billing_mode === "monthly_fixed" ? (
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.renewal_date || r.collection_due_date || "—"}
                              {r.prepaid_months ? (
                                <div className="text-[10px] text-secondary">{r.prepaid_months} mo prepaid</div>
                              ) : null}
                            </td>
                          ) : null}
                          <td className="px-3 py-2 text-right font-semibold text-secondary">
                            {fmtCAD(r.credit ?? Math.abs(r.outstanding || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {pagingBar("reports-customer-credit-pagination")}
          </>
        ) : tab === "collections" ? (
          <>
            {collectionsView === "due" ? (
              <>
                <div className="mb-3 text-sm">
                  Due total: <span className="font-display font-bold text-2xl text-secondary">{fmtCAD(data?.totals?.due_amount ?? 0)}</span>
                  {" · "}
                  Overdue: <span className="font-semibold text-primary">{fmtCAD(data?.totals?.overdue_amount ?? 0)}</span>
                  {" · "}
                  {data?.totals?.customer_count ?? 0} customers
                </div>
                {rows.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No amounts due for this filter.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead className="text-left bg-brand-surface">
                        <tr>
                          <th className="px-3 py-2 label-overline">Customer</th>
                          <th className="px-3 py-2 label-overline">Plan</th>
                          <th className="px-3 py-2 label-overline">Due date</th>
                          <th className="px-3 py-2 label-overline text-right">Month charge</th>
                          <th className="px-3 py-2 label-overline text-right">Balance due</th>
                          <th className="px-3 py-2 label-overline">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {rows.map((r: any) => (
                          <tr key={r.customer_id} className="hover:bg-brand-surface/60">
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2">{r.monthly_plan_name}</td>
                            <td className="px-3 py-2">{r.collection_due_date || "—"}</td>
                            <td className="px-3 py-2 text-right">{fmtCAD(r.month_charge_after_tax ?? r.month_charge)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-secondary">{fmtCAD(r.balance_due)}</td>
                            <td className="px-3 py-2">{r.is_overdue ? `${r.days_overdue}d overdue` : "Current"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
            <div className="mb-3 text-sm">Total collected: <span className="font-display font-bold text-2xl text-secondary">{fmtCAD(data.total_amount)}</span> across {data.total_count} payments</div>
            {rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No collections in range.</div>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                  {rows.map((r: any, i: number) => (
                    <li key={r.date ? `coll-${r.date}-${i}` : `coll-${i}`} className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{r.date}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.count} payment{r.count === 1 ? "" : "s"}</div>
                      </div>
                      <div className="font-semibold text-secondary">{fmtCAD(r.amount)}</div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                  <thead className="text-left bg-brand-surface">
                    <tr>
                      <th className="px-3 py-2 label-overline">Date</th>
                      <th className="px-3 py-2 label-overline">Count</th>
                      <th className="px-3 py-2 label-overline text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {rows.map((r: any, i: number) => (
                      <tr key={r.date ? `coll-${r.date}-${i}` : `coll-${i}`} className="hover:bg-brand-surface/60 transition-colors">
                        <td className="px-3 py-2 font-medium">{r.date}</td>
                        <td className="px-3 py-2">{r.count}</td>
                        <td className="px-3 py-2 text-right font-semibold text-secondary">{fmtCAD(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
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
            {rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No statement rows for this month.</div>
            ) : data.billing_mode === "monthly_flat" ? (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                  {rows.map((r: any, i: number) => (
                    <li key={r.customer_id || `statement-${r.email || r.name || i}`} className="px-4 sm:px-5 py-4 flex flex-col gap-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="text-right">{r.plan_name || "—"}</span>
                        <span className="text-muted-foreground">Month charge</span>
                        <span className="text-right font-semibold">{fmtCAD(r.month_charge_after_tax ?? r.month_charge_before_tax)}</span>
                        <span className="text-muted-foreground">Due</span>
                        <span className="text-right">{r.collection_due_date || "—"}</span>
                        {r.tier_applied && r.policy_variant !== "monthly_fixed" ? (
                          <>
                            <span className="text-muted-foreground">Tier</span>
                            <span className="text-right">{String(r.tier_applied).replace(/_/g, " ")}</span>
                          </>
                        ) : null}
                        <span className="text-muted-foreground">Meals</span>
                        <span className="text-right">{r.delivered_count}</span>
                        <span className="text-muted-foreground">Paid $</span>
                        <span className="text-right text-secondary">{fmtCAD(r.verified_payments_amount)}</span>
                        <span className="text-muted-foreground">Outstanding</span>
                        <span className="text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="text-left bg-brand-surface">
                      <tr>
                        <th className="px-3 py-2 label-overline">Customer</th>
                        <th className="px-3 py-2 label-overline">Plan</th>
                        <th className="px-3 py-2 label-overline text-right">Month charge</th>
                        <th className="px-3 py-2 label-overline">Due</th>
                        <th className="px-3 py-2 label-overline">Tier</th>
                        <th className="px-3 py-2 label-overline">Meals</th>
                        <th className="px-3 py-2 label-overline text-right">Paid $</th>
                        <th className="px-3 py-2 label-overline text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {rows.map((r: any, i: number) => (
                        <tr key={r.customer_id || `statement-${r.email || r.name || i}`} className="hover:bg-brand-surface/60 transition-colors">
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2">{r.plan_name || "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold">{fmtCAD(r.month_charge_after_tax ?? r.month_charge_before_tax)}</td>
                          <td className="px-3 py-2">{r.collection_due_date || "—"}</td>
                          <td className="px-3 py-2">{r.policy_variant === "monthly_fixed" ? "fixed" : (r.tier_applied ? String(r.tier_applied).replace(/_/g, " ") : "—")}</td>
                          <td className="px-3 py-2">{r.delivered_count}</td>
                          <td className="px-3 py-2 text-right text-secondary">{fmtCAD(r.verified_payments_amount)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                  {rows.map((r: any, i: number) => (
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
                <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
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
                    {rows.map((r: any, i: number) => (
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
                </div>
              </>
            )}
            {pagingBar("reports-statement-pagination")}
          </>
        ) : (
          rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" data-testid="area-empty">No area data yet.</div>
          ) : (
            <div className="flex flex-col gap-5" data-testid="area-summary-report">
              <AreaChart data={rows} showMoney={showMoney} />
              <ul className="md:hidden divide-y divide-brand-border -mx-4 sm:-mx-5">
                {rows.map((r: any, i: number) => (
                  <li key={r.area || `area-${i}`} className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono uppercase font-medium">{r.area}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.customers} customer{r.customers === 1 ? "" : "s"}
                      </div>
                    </div>
                    {showMoney ? (
                      <div className="font-semibold text-primary">{fmtCAD(r.outstanding)}</div>
                    ) : (
                      <div className="font-semibold">{r.customers}</div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="text-left bg-brand-surface">
                    <tr>
                      <th className="px-3 py-2 label-overline">Area (postal prefix)</th>
                      <th className="px-3 py-2 label-overline text-right">Customers</th>
                      {showMoney ? (
                        <th className="px-3 py-2 label-overline text-right">Outstanding</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {rows.map((r: any, i: number) => (
                      <tr key={r.area || `area-${i}`} className="hover:bg-brand-surface/60 transition-colors">
                        <td className="px-3 py-2 font-mono uppercase">{r.area}</td>
                        <td className="px-3 py-2 text-right font-semibold">{r.customers}</td>
                        {showMoney ? (
                          <td className="px-3 py-2 text-right font-semibold text-primary">{fmtCAD(r.outstanding)}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
        {tab === "area" ? pagingBar("reports-area-pagination") : null}
      </div>
    </div>
  );
}
