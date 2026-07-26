"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ChartLine, Receipt, Users } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canSeePricing } from "@/lib/roles";
import { fmtCAD } from "@/lib/format";
import { type BusinessInsights, type PeriodKey } from "@/lib/analytics";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PeriodToggle } from "@/components/analytics/PeriodToggle";
import { HighlightsPanel } from "@/components/analytics/HighlightsPanel";
import { DeliveryTrendChart } from "@/components/analytics/DeliveryTrendChart";
import { CollectionsChart } from "@/components/analytics/CollectionsChart";
import { AgingChart } from "@/components/analytics/AgingChart";
import { AreaChart } from "@/components/analytics/AreaChart";
import { KpiSkeleton, SectionSkeleton } from "@/components/loaders";

function percent(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function stagger(index: number) {
  return { animationDelay: `${index * 70}ms` } as React.CSSProperties;
}

function TopList({
  title,
  description,
  rows,
  amountKey,
  testid,
  showMoney,
  subtitleKey,
}: {
  title: string;
  description: string;
  rows: Array<Record<string, any>>;
  amountKey: string;
  testid: string;
  showMoney: boolean;
  subtitleKey?: string;
}) {
  return (
    <div className="card-tinted p-4 sm:p-5" data-testid={testid}>
      <div className="mb-3 sm:mb-4">
        <h2 className="font-display font-bold text-lg sm:text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-border p-5 text-sm text-muted-foreground text-center">
          No rows for this period.
        </div>
      ) : (
        <ul className="divide-y divide-brand-border">
          {rows.map((row, idx) => (
            <li key={`${row.customer_id || row.name}-${idx}`} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {row.customer_id ? (
                  <Link
                    href={`/provider/customers/${row.customer_id}?tab=analysis`}
                    className="font-medium truncate block hover:text-primary hover:underline"
                    data-testid={`analysis-customer-${row.customer_id}`}
                  >
                    {row.name || "Unknown customer"}
                  </Link>
                ) : (
                  <div className="font-medium truncate">{row.name || "Unknown customer"}</div>
                )}
                {row.count ? <div className="text-xs text-muted-foreground">{row.count} payment{row.count === 1 ? "" : "s"}</div> : null}
                {subtitleKey && row[subtitleKey] != null ? (
                  <div className="text-xs text-muted-foreground">
                    {subtitleKey === "days_overdue"
                      ? `${row.days_overdue} day${row.days_overdue === 1 ? "" : "s"} overdue`
                      : String(row[subtitleKey])}
                  </div>
                ) : null}
              </div>
              {showMoney ? (
                <div className="font-semibold">{fmtCAD(row[amountKey] || 0)}</div>
              ) : (
                <div className="text-xs text-muted-foreground shrink-0">View</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const { session } = useAuth();
  const showMoney = canSeePricing(session);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [data, setData] = useState<BusinessInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function load(nextPeriod = period) {
    setLoading(true);
    try {
      const { data } = await api.get<BusinessInsights>("/reports/business-insights", { params: { period: nextPeriod } });
      setData(data);
    } catch (e) {
      toast.error("Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(period);
  }, []);

  function changePeriod(next: PeriodKey) {
    startTransition(() => setPeriod(next));
    load(next);
  }

  const k = data?.kpis || {};
  const busy = loading || isPending;
  const refreshing = busy && !!data;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 sm:gap-4">
        <div>
          <span className="label-overline">Business health</span>
          <h1 className="font-display font-black text-2xl sm:text-4xl mt-0.5 sm:mt-1">Analysis</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 sm:mt-2 max-w-2xl">
            Period trends, receivables risk, collections, delivery performance, and top customer signals.
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <PeriodToggle value={period} onChange={changePeriod} busy={busy} />
          {data ? (
            <span className="text-xs text-muted-foreground" data-testid="analysis-period-range">
              {data.period.start} to {data.period.end}
            </span>
          ) : null}
        </div>
      </div>

      {busy && !data ? (
        <div className="flex flex-col gap-4 sm:gap-6" data-testid="analysis-loading">
          <KpiSkeleton count={8} testid="analysis-kpi-skeleton" className="md:grid-cols-2" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            <SectionSkeleton testid="analysis-chart-skeleton-0" />
            <SectionSkeleton testid="analysis-chart-skeleton-1" />
            <SectionSkeleton testid="analysis-chart-skeleton-2" />
          </div>
        </div>
      ) : data ? (
        <>
          <div className={refreshing ? "opacity-80 transition-opacity" : ""}>
            {showMoney ? (
              <div className="animate-fade-in-up" style={stagger(0)}>
                <HighlightsPanel highlights={data.highlights} />
              </div>
            ) : null}

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4 sm:mt-6 animate-fade-in-up" style={stagger(1)}>
              {showMoney ? (
                <>
                  <KpiCard testid="kpi-collections" label="Collections" value={fmtCAD(k.collections_amount?.value || 0)} kpi={k.collections_amount} hint={`${k.collections_count?.value || 0} verified payments`} />
                  <KpiCard testid="kpi-delivered-revenue" label="Delivered revenue" value={fmtCAD(k.delivered_revenue?.value || 0)} kpi={k.delivered_revenue} hint={`${k.delivered_count?.value || 0} delivered meals`} />
                  <KpiCard testid="kpi-outstanding" label="Outstanding" value={fmtCAD(k.outstanding_total?.value || 0)} kpi={k.outstanding_total} hint="Current receivables" inverseDelta />
                  <KpiCard
                    testid="kpi-overdue"
                    label="Overdue"
                    value={fmtCAD(k.overdue_total?.value || 0)}
                    kpi={k.overdue_total}
                    hint={`${k.overdue_customers_count?.value || 0} past collection day`}
                    inverseDelta
                  />
                </>
              ) : (
                <KpiCard testid="kpi-delivered-meals" label="Delivered meals" value={String(k.delivered_count?.value || 0)} kpi={k.delivered_count} hint="Meals marked delivered this period" />
              )}
              <KpiCard testid="kpi-pending-payments" label="Pending payments" value={String(k.pending_payments_count?.value || 0)} kpi={k.pending_payments_count} hint="Awaiting approval" inverseDelta />
              <KpiCard testid="kpi-active-customers" label="Active customers" value={String(k.active_customers?.value || 0)} kpi={k.active_customers} hint={`${k.pending_customers?.value || 0} pending · ${k.on_pause?.value || 0} paused`} />
              <KpiCard testid="kpi-delivery-rate" label="Delivery rate" value={percent(k.delivery_rate?.value)} kpi={k.delivery_rate} hint="Delivered vs missed" />
              <KpiCard testid="kpi-miss-rate" label="Miss rate" value={percent(k.miss_rate?.value)} kpi={k.miss_rate} hint="Missed outcome share" inverseDelta />
              {showMoney ? (
                <KpiCard testid="kpi-collection-efficiency" label="Collection efficiency" value={percent(k.collection_efficiency?.value)} kpi={k.collection_efficiency} hint="Collections vs delivered value" />
              ) : null}
            </section>
          </div>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            <div className="animate-fade-in-up" style={stagger(2)}><DeliveryTrendChart data={data.series} /></div>
            {showMoney ? (
              <>
                <div className="animate-fade-in-up" style={stagger(3)}><CollectionsChart data={data.series} /></div>
                <div className="animate-fade-in-up" style={stagger(4)}><AgingChart data={data.ar_aging} /></div>
                <div className="animate-fade-in-up" style={stagger(4)}>
                  <AgingChart data={data.overdue_aging || { "1_7": 0, "8_14": 0, "15_30": 0, "30_plus": 0 }} variant="overdue" />
                </div>
              </>
            ) : null}
            <div className="animate-fade-in-up" style={stagger(5)}><AreaChart data={data.areas} showMoney={showMoney} /></div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {showMoney ? (
              <>
                <div className="animate-fade-in-up" style={stagger(6)}>
                  <TopList
                    title="Top outstanding"
                    description="Customers with the highest current receivables."
                    rows={data.top_outstanding}
                    amountKey="outstanding"
                    testid="analysis-top-outstanding"
                    showMoney={showMoney}
                  />
                </div>
                <div className="animate-fade-in-up" style={stagger(6)}>
                  <TopList
                    title="Top overdue"
                    description="Past payment collection day with the largest balances."
                    rows={data.top_overdue || []}
                    amountKey="overdue_amount"
                    subtitleKey="days_overdue"
                    testid="analysis-top-overdue"
                    showMoney={showMoney}
                  />
                </div>
                <div className="animate-fade-in-up" style={stagger(7)}>
                  <TopList
                    title="Top collectors"
                    description="Customers with the most verified payments in this period."
                    rows={data.top_collectors}
                    amountKey="amount"
                    testid="analysis-top-collectors"
                    showMoney={showMoney}
                  />
                </div>
              </>
            ) : null}
          </section>

          <section className="card-tinted p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between animate-fade-in-up" style={stagger(8)}>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl">Need exports?</h2>
              <p className="text-sm text-muted-foreground">Use detailed reports for CSV and monthly statement workflows.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/provider/reports" className="pill-btn btn-outline gap-2" data-testid="analysis-open-reports">
                Reports <ArrowRight size={16} />
              </Link>
              <Link href="/provider/payments" className="pill-btn btn-primary gap-2" data-testid="analysis-open-payments">
                Payments <Receipt size={16} />
              </Link>
              <Link href="/provider/customers" className="pill-btn btn-outline gap-2" data-testid="analysis-open-customers">
                Customers <Users size={16} />
              </Link>
            </div>
          </section>
        </>
      ) : (
        <div className="card-tinted p-8 text-center">
          <ChartLine size={32} className="mx-auto text-primary" />
          <h2 className="font-display font-bold text-xl mt-3">Analysis unavailable</h2>
          <p className="text-sm text-muted-foreground mt-1">Try again after deliveries or payments are added.</p>
        </div>
      )}
    </div>
  );
}
