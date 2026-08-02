"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import MiniBars from "@/components/MiniBars";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [digestBusy, setDigestBusy] = useState(false);

  useEffect(() => {
    api
      .get("/platform/dashboard")
      .then(({ data: d }) => setData(d))
      .catch((e) => toast.error(e?.response?.data?.detail || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  async function sendDigest() {
    setDigestBusy(true);
    try {
      const { data: res } = await api.post("/platform/jobs/trial-digest?force=1");
      if (res.skipped) {
        toast.message("Digest already sent today");
      } else {
        toast.success(`Digest sent (${res.trials || 0} trials)`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Digest failed");
    } finally {
      setDigestBusy(false);
    }
  }
  return (
    <AdminShell title="Dashboard">
      {loading || !data ? (
        <div className="text-sm text-neutral-500">Loading dashboard…</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-grid">
            {(
              [
                { label: "Tenants", value: data.tenants.total, testid: "kpi-tenants" },
                { label: "Active", value: data.tenants.active, testid: "kpi-active" },
                { label: "Trialing", value: data.tenants.trialing, testid: "kpi-trialing" },
                { label: "Expired", value: data.tenants.expired, testid: "kpi-expired" },
                {
                  label: "Pending SaaS",
                  value: data.saas.pending_review,
                  testid: "kpi-pending-saas",
                  href: "/saas-payments",
                },
                {
                  label: "SaaS MTD",
                  value: `CAD ${Number(data.saas.approved_mtd_cad || 0).toFixed(0)}`,
                  testid: "kpi-saas-mtd",
                },
                {
                  label: "Rejected MTD",
                  value: data.saas.rejected_mtd,
                  testid: "kpi-rejected-mtd",
                },
                {
                  label: "Inbox new",
                  value: data.inbox?.new ?? 0,
                  testid: "kpi-inbox-new",
                  href: "/inbox",
                },
              ] as Array<{ label: string; value: any; testid: string; href?: string }>
            ).map((k) => {
              const card = (
                <div
                  data-testid={k.testid}
                  className="bg-white border border-neutral-200 rounded-2xl p-4 h-full"
                >
                  <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                    {k.label}
                  </div>
                  <div className="text-2xl font-bold mt-1">{k.value}</div>
                </div>
              );
              return k.href ? (
                <Link key={k.testid} href={k.href} className="hover:opacity-90 block">
                  {card}
                </Link>
              ) : (
                <div key={k.testid}>{card}</div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <div className="font-semibold mb-3">Provider signups (30d)</div>
              <MiniBars items={data.series?.signups_by_day || []} valueKey="count" testid="chart-signups" />
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <div className="font-semibold mb-3">Approved SaaS (30d)</div>
              <MiniBars
                items={data.series?.saas_approved_by_day || []}
                valueKey="amount"
                formatValue={(n) => `CAD ${n.toFixed(0)}`}
                testid="chart-saas"
              />
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="font-semibold">Trials ending within 7 days</div>
              <button
                type="button"
                data-testid="send-trial-digest"
                disabled={digestBusy}
                onClick={sendDigest}
                className="h-9 px-4 rounded-full border border-neutral-200 text-xs font-semibold cursor-pointer hover:bg-neutral-50 disabled:opacity-60"
              >
                {digestBusy ? "Sending…" : "Email digest now"}
              </button>
            </div>
            {(data.trials_ending_soon || []).length === 0 ? (
              <div className="p-4 text-sm text-neutral-500" data-testid="trials-empty">
                No trials ending soon.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-200" data-testid="trials-list">
                {data.trials_ending_soon.map((t: any) => (
                  <li key={t.tenant_id}>
                    <Link
                      href={`/tenants/${t.tenant_id}`}
                      className="flex justify-between gap-3 p-4 hover:bg-neutral-50"
                    >
                      <div className="font-medium truncate">{t.name || t.tenant_id}</div>
                      <div className="text-sm text-neutral-500 shrink-0">
                        {t.days_left}d left
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
