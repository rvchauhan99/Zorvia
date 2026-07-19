"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import { api } from "@/lib/api";

type Period = "7d" | "30d" | "90d" | "mtd";

function kpiVal(kpis: any, key: string) {
  const v = kpis?.[key]?.value;
  if (v == null) return "—";
  if (typeof v === "number" && (key.includes("rate") || key.includes("efficiency"))) {
    return `${Number(v).toFixed(1)}%`;
  }
  return v;
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [period, setPeriod] = useState<Period>("30d");
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/platform/tenants/${id}/notes`);
      setNotes(d.rows || []);
    } catch {
      /* ignore */
    }
  }, [id]);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const { data: d } = await api.get(`/platform/tenants/${id}/insights?period=${period}`);
      setInsights(d);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load kitchen health");
    } finally {
      setInsightsLoading(false);
    }
  }, [id, period]);

  useEffect(() => {
    api
      .get(`/platform/tenants/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((e) => toast.error(e?.response?.data?.detail || "Tenant not found"))
      .finally(() => setLoading(false));
    loadNotes();
  }, [id, loadNotes]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  async function addNote() {
    const body = noteBody.trim();
    if (!body) return;
    setNoteBusy(true);
    try {
      await api.post(`/platform/tenants/${id}/notes`, { body });
      setNoteBody("");
      await loadNotes();
      toast.success("Note added");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to add note");
    } finally {
      setNoteBusy(false);
    }
  }

  async function deleteNote(noteId: string) {
    try {
      await api.delete(`/platform/tenants/${id}/notes/${noteId}`);
      await loadNotes();
      toast.success("Note deleted");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to delete");
    }
  }

  const kpis = insights?.kpis;

  return (
    <AdminShell title="Tenant">
      <div className="flex flex-col gap-4 max-w-3xl">
        <Link href="/tenants" className="text-sm text-teal-700 hover:underline w-fit">
          ← Back to tenants
        </Link>
        {loading || !data ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : (
          <>
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col gap-2">
              <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                Kitchen
              </div>
              <div className="text-2xl font-bold" data-testid="tenant-name">
                {data.name}
              </div>
              <div className="text-sm text-neutral-600">{data.admin_email || "—"}</div>
              <div className="text-xs font-mono text-neutral-400">{data.signup_code}</div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="font-semibold mb-3">Subscription</div>
              <div className="grid grid-cols-2 gap-3 text-sm" data-testid="tenant-subscription">
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500">Status</div>
                  <div className="font-medium capitalize">{data.subscription?.status}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500">Plan</div>
                  <div className="font-medium capitalize">{data.subscription?.plan || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500">Days left</div>
                  <div className="font-medium">{data.subscription?.days_left ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500">Period end</div>
                  <div className="font-medium text-xs break-all">
                    {data.subscription?.current_period_end || data.subscription?.trial_ends_at || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" data-testid="tenant-counts">
              {[
                ["Customers", data.counts?.customers],
                ["Staff", data.counts?.staff],
                ["Deliveries 30d", data.counts?.deliveries_30d],
                ["Payments 30d", data.counts?.payments_30d],
                ["Verified 30d", data.counts?.verified_payments_30d],
                ["Verified CAD 30d", data.counts?.verified_amount_30d_cad],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="bg-white border border-neutral-200 rounded-2xl p-4"
                >
                  <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
                  <div className="text-xl font-bold mt-1">{value ?? 0}</div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col gap-3" data-testid="kitchen-health">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold">Kitchen health</div>
                <div className="flex gap-1">
                  {(["7d", "30d", "90d", "mtd"] as Period[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      data-testid={`insights-period-${p}`}
                      onClick={() => setPeriod(p)}
                      className={`h-8 px-2.5 rounded-full text-xs font-medium border cursor-pointer uppercase ${
                        period === p
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white border-neutral-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {insightsLoading || !insights ? (
                <div className="text-sm text-neutral-500">Loading…</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Collections", kpis?.collections_amount?.value],
                    ["Delivery rate", kpiVal(kpis, "delivery_rate")],
                    ["Outstanding", kpis?.outstanding_total?.value],
                    ["Active customers", kpis?.active_customers?.value],
                    ["Collection eff.", kpiVal(kpis, "collection_efficiency")],
                    ["Pending payments", kpis?.pending_payments_count?.value],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
                      <div className="text-lg font-bold mt-0.5">{value ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col gap-3" data-testid="tenant-notes">
              <div className="font-semibold">Support notes</div>
              <textarea
                data-testid="note-body"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Internal note for this kitchen…"
                className="px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-teal-600/30 text-sm"
              />
              <button
                type="button"
                data-testid="note-add"
                disabled={noteBusy || !noteBody.trim()}
                onClick={addNote}
                className="h-11 rounded-full bg-teal-700 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer self-start px-5"
              >
                Add note
              </button>
              {notes.length === 0 ? (
                <div className="text-sm text-neutral-500">No notes yet.</div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {notes.map((n) => (
                    <li key={n.id} className="py-3 flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                        <div className="text-xs text-neutral-400 mt-1">
                          {n.created_by?.email || "operator"} · {(n.created_at || "").slice(0, 19)}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid={`note-delete-${n.id}`}
                        onClick={() => deleteNote(n.id)}
                        className="text-xs text-red-600 shrink-0 cursor-pointer hover:underline"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 font-semibold">
                SaaS payment records
              </div>
              {(data.saas_payments || []).length === 0 ? (
                <div className="p-5 text-sm text-neutral-500">No SaaS payments yet.</div>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {data.saas_payments.map((r: any) => (
                    <li key={r.id}>
                      <Link
                        href={`/saas-payments/${r.id}`}
                        className="flex justify-between gap-3 p-4 hover:bg-neutral-50"
                      >
                        <div>
                          <div className="font-medium capitalize">
                            {r.plan} · CAD {r.amount}
                          </div>
                          <div className="text-xs font-mono text-neutral-500">{r.reference}</div>
                        </div>
                        <div className="text-xs capitalize text-neutral-500">{r.status}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
