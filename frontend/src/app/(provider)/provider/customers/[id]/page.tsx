"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, PencilSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { fmtCAD, fmtDate, WEEKDAYS, todayISO } from "@/lib/format";
import StatusPill from "@/components/StatusPill";
import { type CustomerInsights, type CustomerTimelineEvent, type PeriodKey } from "@/lib/analytics";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PeriodToggle } from "@/components/analytics/PeriodToggle";
import { HighlightsPanel } from "@/components/analytics/HighlightsPanel";
import { DeliveryTrendChart } from "@/components/analytics/DeliveryTrendChart";
import { CollectionsChart } from "@/components/analytics/CollectionsChart";
import { AgingChart } from "@/components/analytics/AgingChart";

type Tab = "overview" | "analysis" | "deliveries" | "payments" | "pauses" | "notes";

const VALID_TABS: Tab[] = ["overview", "analysis", "deliveries", "payments", "pauses", "notes"];

function tabBtn(active: boolean, label: string, onClick: () => void, testid: string) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`snap-start shrink-0 px-3.5 h-9 sm:h-10 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border hover:bg-brand-surface"
      }`}
    >
      {label}
    </button>
  );
}

function percent(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function timelineLabel(ev: CustomerTimelineEvent) {
  if (ev.type === "delivery") return `Delivery ${ev.data?.status || ""}`.trim();
  if (ev.type === "payment") return `Payment ${ev.data?.status || ""}`.trim();
  if (ev.type === "pause") return "Pause window";
  if (ev.type === "note") return "Notes";
  return ev.type;
}

function timelineDetail(ev: CustomerTimelineEvent) {
  if (ev.type === "delivery") return `${fmtDate(ev.date || "")} · ${fmtCAD(ev.data?.meal_price || 0)}`;
  if (ev.type === "payment") return `${fmtCAD(ev.data?.amount || 0)}${ev.data?.reference ? ` · ${ev.data.reference}` : ""}`;
  if (ev.type === "pause") return `${fmtDate(ev.data?.start || "")} → ${fmtDate(ev.data?.end || "")}`;
  if (ev.type === "note") return String(ev.data?.notes || "").slice(0, 120) || "—";
  return ev.date || ev.at || "—";
}

export default function CustomerDetail() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const initialTab = (() => {
    const raw = searchParams.get("tab");
    return VALID_TABS.includes(raw as Tab) ? (raw as Tab) : "overview";
  })();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [c, setC] = useState<any>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [insights, setInsights] = useState<CustomerInsights | null>(null);
  const [timeline, setTimeline] = useState<CustomerTimelineEvent[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function load() {
    try {
      const { data } = await api.get(`/customers/${id}`);
      setC(data);
      setNotesDraft(data.notes || "");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Customer not found");
      router.push("/provider/customers");
    }
  }

  async function loadAnalysis(nextPeriod = period) {
    if (!id) return;
    setAnalysisLoading(true);
    try {
      const [insightsRes, timelineRes] = await Promise.all([
        api.get<CustomerInsights>(`/customers/${id}/insights`, { params: { period: nextPeriod } }),
        api.get<{ events: CustomerTimelineEvent[] }>(`/customers/${id}/timeline`),
      ]);
      setInsights(insightsRes.data);
      setTimeline(timelineRes.data.events || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load analysis");
    } finally {
      setAnalysisLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (VALID_TABS.includes(raw as Tab)) setTab(raw as Tab);
  }, [searchParams]);

  useEffect(() => {
    if (tab === "analysis" && id) loadAnalysis(period);
  }, [tab, id]);

  function selectTab(next: Tab) {
    setTab(next);
    const url = next === "overview" ? `/provider/customers/${id}` : `/provider/customers/${id}?tab=${next}`;
    router.replace(url, { scroll: false });
  }

  function changePeriod(next: PeriodKey) {
    startTransition(() => setPeriod(next));
    loadAnalysis(next);
  }

  async function saveNotes() {
    if (!canMutate) return;
    setSavingNotes(true);
    try {
      await api.patch(`/customers/${id}`, { notes: notesDraft });
      toast.success("Notes saved");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setSavingNotes(false);
    }
  }

  if (!c) return <div className="text-muted-foreground">Loading…</div>;

  const isPaused = (c.pauses || []).some((p: any) => p.start <= todayISO() && todayISO() <= p.end);
  const k = insights?.kpis || {};
  const busyAnalysis = analysisLoading || isPending;

  return (
    <div className="flex flex-col gap-3 sm:gap-5 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/provider/customers"
            data-testid="customer-back"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1.5 sm:mb-2"
          >
            <ArrowLeft size={14} /> Customers
          </Link>
          <h1 className="font-display font-black text-2xl sm:text-4xl" data-testid="customer-detail-name">{c.name}</h1>
          <div className="mt-2 flex gap-1 flex-wrap">
            {c.pending_approval ? <span className="text-[10px] uppercase tracking-widest bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Pending</span> : null}
            {c.rejected ? <span className="text-[10px] uppercase tracking-widest bg-red-100 text-red-900 px-2 py-0.5 rounded-full">Rejected</span> : null}
            {isPaused ? <span className="text-[10px] uppercase tracking-widest bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">Paused</span> : null}
            {!c.active ? <span className="text-[10px] uppercase tracking-widest bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">Inactive</span> : null}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="label-overline">Outstanding</div>
          <div className={`font-display font-black text-2xl ${c.outstanding > 0 ? "text-primary" : ""}`}>{fmtCAD(c.outstanding || 0)}</div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabBtn(tab === "overview", "Overview", () => selectTab("overview"), "ctab-overview")}
        {tabBtn(tab === "analysis", "Analysis", () => selectTab("analysis"), "ctab-analysis")}
        {tabBtn(tab === "deliveries", "Deliveries", () => selectTab("deliveries"), "ctab-deliveries")}
        {tabBtn(tab === "payments", "Payments", () => selectTab("payments"), "ctab-payments")}
        {tabBtn(tab === "pauses", "Pauses", () => selectTab("pauses"), "ctab-pauses")}
        {tabBtn(tab === "notes", "Notes", () => selectTab("notes"), "ctab-notes")}
      </div>

      {tab === "overview" ? (
        <div className="card-tinted p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <div className="label-overline">Phone</div>
            <div className="text-sm">{c.phone || "—"}</div>
          </div>
          <div>
            <div className="label-overline">Email</div>
            <div className="text-sm break-all">{c.email || "—"}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="label-overline">Address</div>
            <div className="text-sm">{c.address}{c.apartment ? `, ${c.apartment}` : ""}{c.postal_code ? ` · ${c.postal_code}` : ""}</div>
          </div>
          <div>
            <div className="label-overline">Meal price</div>
            <div className="font-medium">{fmtCAD(c.meal_price)}</div>
          </div>
          <div>
            <div className="label-overline">Delivery sequence</div>
            <div className="font-medium font-mono">{c.delivery_sequence != null ? c.delivery_sequence : "—"}</div>
          </div>
          <div>
            <div className="label-overline">Assigned driver</div>
            <div className="text-sm">{c.driver_name || "Unassigned"}</div>
          </div>
          <div>
            <div className="label-overline">Delivery days</div>
            <div className="flex gap-0.5 mt-1">
              {WEEKDAYS.map((d) => (
                <span
                  key={d.i}
                  className={`w-7 h-7 rounded-full text-[10px] font-medium inline-flex items-center justify-center ${
                    (c.delivery_days || []).includes(d.i) ? "bg-primary text-primary-foreground" : "bg-brand-surface text-muted-foreground"
                  }`}
                >
                  {d.s[0]}
                </span>
              ))}
            </div>
          </div>
          {c.reject_reason ? (
            <div className="sm:col-span-2">
              <div className="label-overline">Reject reason</div>
              <div className="text-sm">{c.reject_reason}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "analysis" ? (
        <div className="flex flex-col gap-4" data-testid="customer-analysis">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <span className="label-overline">Customer health</span>
              <h2 className="font-display font-bold text-xl mt-1">Analysis</h2>
              <p className="text-sm text-muted-foreground mt-1">Period KPIs, trends, aging, and recent activity for this customer.</p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <PeriodToggle value={period} onChange={changePeriod} />
              {insights ? (
                <span className="text-xs text-muted-foreground" data-testid="customer-analysis-period">
                  {insights.period.start} to {insights.period.end}
                </span>
              ) : null}
            </div>
          </div>

          {busyAnalysis && !insights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-tinted p-5 min-h-[120px] animate-pulse bg-white" />
              ))}
            </div>
          ) : insights ? (
            <>
              <HighlightsPanel highlights={insights.highlights} />
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard testid="cust-kpi-collections" label="Collections" value={fmtCAD(k.collections_amount?.value || 0)} kpi={k.collections_amount} hint={`${k.collections_count?.value || 0} verified payments`} />
                <KpiCard testid="cust-kpi-delivered-revenue" label="Delivered revenue" value={fmtCAD(k.delivered_revenue?.value || 0)} kpi={k.delivered_revenue} hint={`${k.delivered_count?.value || 0} delivered meals`} />
                <KpiCard testid="cust-kpi-outstanding" label="Outstanding" value={fmtCAD(k.outstanding_total?.value || 0)} kpi={k.outstanding_total} hint="Current receivables" inverseDelta />
                <KpiCard testid="cust-kpi-pending-payments" label="Pending payments" value={String(k.pending_payments_count?.value || 0)} kpi={k.pending_payments_count} hint="Awaiting approval" inverseDelta />
                <KpiCard testid="cust-kpi-delivery-rate" label="Delivery rate" value={percent(k.delivery_rate?.value)} kpi={k.delivery_rate} hint="Delivered vs missed" />
                <KpiCard testid="cust-kpi-miss-rate" label="Miss rate" value={percent(k.miss_rate?.value)} kpi={k.miss_rate} hint="Missed outcome share" inverseDelta />
                <KpiCard testid="cust-kpi-cancel-rate" label="Cancel rate" value={percent(k.cancel_rate?.value)} kpi={k.cancel_rate} hint="Cancelled share" inverseDelta />
                <KpiCard testid="cust-kpi-collection-efficiency" label="Collection efficiency" value={percent(k.collection_efficiency?.value)} kpi={k.collection_efficiency} hint="Collections vs delivered value" />
              </section>
              <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <DeliveryTrendChart data={insights.series} />
                <CollectionsChart data={insights.series} />
                <AgingChart data={insights.ar_aging} />
              </section>
            </>
          ) : (
            <div className="card-tinted p-6 text-center text-sm text-muted-foreground">Analysis unavailable.</div>
          )}

          <div className="card-tinted overflow-hidden" data-testid="customer-timeline">
            <div className="px-4 py-3 border-b border-brand-border">
              <h3 className="font-display font-bold text-lg">Activity timeline</h3>
              <p className="text-xs text-muted-foreground">Deliveries, payments, pauses, and notes.</p>
            </div>
            <ul className="divide-y divide-brand-border">
              {timeline.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">No activity yet.</li>
              ) : (
                timeline.slice(0, 40).map((ev, idx) => (
                  <li key={`${ev.type}-${ev.at}-${idx}`} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium capitalize">{timelineLabel(ev)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{timelineDetail(ev)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">{ev.date || (ev.at || "").slice(0, 10) || "—"}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "deliveries" ? (
        <div className="card-tinted overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {(c.deliveries || []).length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">No deliveries yet.</li>
            ) : (
              (c.deliveries || []).map((d: any) => (
                <li key={d.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{fmtDate(d.delivery_date)}</div>
                    <div className="text-xs text-muted-foreground">{fmtCAD(d.meal_price)}</div>
                  </div>
                  <StatusPill status={d.status} />
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="card-tinted overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {(c.payments || []).length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">No payments yet.</li>
            ) : (
              (c.payments || []).map((p: any) => (
                <li key={p.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{fmtCAD(p.amount)}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{p.reference}</div>
                  </div>
                  <StatusPill status={p.status} />
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "pauses" ? (
        <div className="card-tinted overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {(c.pauses || []).length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">No pause windows.</li>
            ) : (
              (c.pauses || []).map((p: any, i: number) => (
                <li key={`${p.start}-${p.end}-${i}`} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{fmtDate(p.start)} → {fmtDate(p.end)}</div>
                    <div className="text-xs text-muted-foreground">{p.start} – {p.end}</div>
                  </div>
                  {p.start <= todayISO() && todayISO() <= p.end ? (
                    <span className="text-[10px] uppercase tracking-widest bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">Active</span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="card-tinted p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <PencilSimple size={16} />
            <span className="font-display font-bold text-lg">Notes</span>
          </div>
          <textarea
            data-testid="customer-notes"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            readOnly={!canMutate}
            disabled={!canMutate}
            className="min-h-[140px] w-full px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all disabled:opacity-80"
            placeholder="Dietary preferences, gate code, etc."
          />
          {canMutate ? (
            <button
              data-testid="customer-notes-save"
              disabled={savingNotes}
              onClick={saveNotes}
              className="pill-btn btn-primary self-end disabled:opacity-60 cursor-pointer"
            >
              {savingNotes ? "Saving…" : "Save notes"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
