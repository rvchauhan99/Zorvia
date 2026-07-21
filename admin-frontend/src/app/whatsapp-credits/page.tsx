"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import { api } from "@/lib/api";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";

type StatusFilter = "pending" | "approved" | "rejected";

export default function WhatsAppCreditsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/platform/whatsapp-credits?status=${status}`);
      setRows(data.rows || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const enabled = await fetchWhatsappFeaturesEnabled();
      if (cancelled) return;
      if (!enabled) {
        router.replace("/");
        return;
      }
      setAllowed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed, load]);

  if (!allowed) {
    return (
      <AdminShell title="WhatsApp credits">
        <div className="text-sm text-neutral-500">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="WhatsApp credits">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">
          Prepaid WhatsApp top-ups (Interac). Approve to add credit to the provider wallet.
        </p>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`wa-filter-${s}`}
              onClick={() => setStatus(s)}
              className={`h-11 px-4 rounded-full text-sm font-medium border cursor-pointer capitalize ${
                status === s
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white border-neutral-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-neutral-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500" data-testid="wa-empty-list">
              No {status} records.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/whatsapp-credits/${r.id}`}
                    data-testid={`wa-row-${r.id}`}
                    className="flex items-start justify-between gap-3 p-4 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {r.provider_name || r.tenant_id}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 truncate">
                        {r.admin_email} · CAD {r.amount}
                      </div>
                      <div className="text-xs font-mono mt-1">{r.reference}</div>
                    </div>
                    <div className="text-xs text-neutral-500 shrink-0 capitalize">{r.status}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
