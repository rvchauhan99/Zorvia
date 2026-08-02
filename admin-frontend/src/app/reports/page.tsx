"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import MiniBars from "@/components/MiniBars";
import { api, downloadCsv } from "@/lib/api";

type Tab = "saas" | "growth" | "usage";
type Period = "30d" | "90d" | "mtd";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("saas");
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const path =
        tab === "saas"
          ? `/platform/reports/saas-revenue?period=${period}`
          : tab === "growth"
            ? `/platform/reports/growth?period=${period}`
            : `/platform/reports/usage?period=${period}`;
      const { data: d } = await api.get(path);
      setData(d);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [tab, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminShell title="Reports">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ["saas", "SaaS revenue"],
              ["growth", "Growth"],
              ["usage", "Usage"],
            ] as [Tab, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              data-testid={`report-tab-${v}`}
              onClick={() => setTab(v)}
              className={`h-11 px-4 rounded-full text-sm font-medium border cursor-pointer ${
                tab === v
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white border-neutral-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["30d", "90d", "mtd"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`period-${p}`}
              onClick={() => setPeriod(p)}
              className={`h-9 px-3 rounded-full text-xs font-medium border cursor-pointer uppercase ${
                period === p
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white border-neutral-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {loading || !data ? (
          <div className="text-sm text-neutral-500">Loading report…</div>
        ) : tab === "saas" ? (
          <div className="flex flex-col gap-3" data-testid="report-saas">
            <div className="flex justify-end">
              <button
                type="button"
                data-testid="export-saas-csv"
                onClick={async () => {
                  try {
                    await downloadCsv(
                      `/platform/exports/saas-revenue.csv?period=${period}`,
                      "saas-revenue.csv",
                    );
                    toast.success("Download started");
                  } catch (e: any) {
                    toast.error(e?.message || "Export failed");
                  }
                }}
                className="h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium cursor-pointer"
              >
                Export CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neutral-500">Total</div>
                <div className="text-2xl font-bold mt-1">CAD {data.total_cad}</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neutral-500">Approvals</div>
                <div className="text-2xl font-bold mt-1">{data.count}</div>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <div className="font-semibold mb-3">By day</div>
              <MiniBars items={data.by_day || []} valueKey="amount" />
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <div className="font-semibold mb-3">By plan</div>
              <ul className="text-sm divide-y divide-neutral-100">
                {Object.entries(data.by_plan || {}).map(([plan, amt]) => (
                  <li key={plan} className="flex justify-between py-2 capitalize">
                    <span>{plan}</span>
                    <span className="font-medium">CAD {Number(amt).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : tab === "growth" ? (
          <div className="flex flex-col gap-3" data-testid="report-growth">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-neutral-500">Signups</div>
              <div className="text-2xl font-bold mt-1">{data.signups}</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <div className="font-semibold mb-3">Signups by day</div>
              <MiniBars items={data.by_day || []} valueKey="count" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-testid="report-usage">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neutral-500">
                  Customers created
                </div>
                <div className="text-2xl font-bold mt-1">{data.customers_created}</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neutral-500">Deliveries</div>
                <div className="text-2xl font-bold mt-1">{data.deliveries_total}</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neutral-500">
                  Verified meal CAD
                </div>
                <div className="text-2xl font-bold mt-1">
                  {data.verified_meal_payments?.amount_cad ?? 0}
                </div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neutral-500">
                  Verified payments
                </div>
                <div className="text-2xl font-bold mt-1">
                  {data.verified_meal_payments?.count ?? 0}
                </div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neutral-500">
                  Pending meal payments
                </div>
                <div className="text-2xl font-bold mt-1">{data.pending_meal_payments}</div>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <div className="font-semibold mb-3">Deliveries by status</div>
              <ul className="text-sm divide-y divide-neutral-100">
                {Object.entries(data.deliveries_by_status || {}).map(([st, n]) => (
                  <li key={st} className="flex justify-between py-2 capitalize">
                    <span>{st}</span>
                    <span className="font-medium">{Number(n)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
