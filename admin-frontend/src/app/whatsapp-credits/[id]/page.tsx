"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import { api } from "@/lib/api";
import { usePlatformAuth } from "@/lib/auth";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";

export default function WhatsAppCreditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, ready } = usePlatformAuth();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const enabled = await fetchWhatsappFeaturesEnabled();
      if (cancelled) return;
      if (!enabled) {
        router.replace("/");
        return;
      }
      api
        .get(`/platform/whatsapp-credits/${id}`)
        .then(({ data }) => setRecord(data))
        .catch((e) => {
          toast.error(e?.response?.data?.detail || "Not found");
          router.replace("/whatsapp-credits");
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, id, router]);

  async function approve() {
    setBusy(true);
    try {
      const { data } = await api.post(`/platform/whatsapp-credits/${id}/approve`);
      setRecord({ ...data.record, provider_balance_cad: data.balance_cad });
      toast.success(`Approved — balance now CAD ${Number(data.balance_cad || 0).toFixed(2)}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      const { data } = await api.post(`/platform/whatsapp-credits/${id}/reject`, { reason });
      setRecord(data.record);
      toast.success("Rejected — no credit added");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  if (!record) {
    return (
      <AdminShell title="WhatsApp credit review">
        <div className="text-sm text-neutral-500">Loading…</div>
      </AdminShell>
    );
  }

  const pending = record.status === "pending";

  return (
    <AdminShell title="WhatsApp credit review">
      <div className="max-w-3xl flex flex-col gap-3">
        <Link href="/whatsapp-credits" className="text-sm text-teal-700 hover:underline w-fit">
          ← Back to WhatsApp credits
        </Link>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
            Provider
          </div>
          <div className="text-xl font-bold">{record.provider_name || "—"}</div>
          <div className="text-sm text-neutral-600">{record.admin_email}</div>
          {record.tenant_id ? (
            <Link
              href={`/tenants/${record.tenant_id}`}
              className="text-sm text-teal-700 hover:underline w-fit"
            >
              View tenant
            </Link>
          ) : null}
          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500">Package</div>
              <div className="font-medium">CAD {record.amount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500">
                Current wallet
              </div>
              <div className="font-medium" data-testid="wa-provider-balance">
                CAD {Number(record.provider_balance_cad ?? record.balance_after ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-widest text-neutral-500">Reference</div>
              <div className="font-mono font-medium">{record.reference}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500">Status</div>
              <div className="font-medium capitalize" data-testid="wa-record-status">
                {record.status}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500">Submitted</div>
              <div className="text-sm">{record.submitted_at}</div>
            </div>
          </div>
          {record.reject_reason ? (
            <div className="text-sm text-red-700 bg-red-50 rounded-xl p-3">
              Reason: {record.reject_reason}
            </div>
          ) : null}
          {record.screenshot_url ? (
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                Screenshot
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.screenshot_url}
                alt="Payment screenshot"
                className="max-h-80 rounded-xl border border-neutral-200"
              />
            </div>
          ) : null}
        </div>

        {pending ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3">
            <button
              type="button"
              data-testid="wa-approve-credit"
              disabled={busy}
              onClick={approve}
              className="h-12 rounded-full bg-teal-700 text-white font-semibold disabled:opacity-60 cursor-pointer"
            >
              Approve &amp; add credit
            </button>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                Reject reason
              </span>
              <textarea
                data-testid="wa-reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-teal-600/30"
                placeholder="Optional note shown to the provider"
              />
            </label>
            <button
              type="button"
              data-testid="wa-reject-credit"
              disabled={busy}
              onClick={reject}
              className="h-12 rounded-full border border-red-300 text-red-700 font-semibold disabled:opacity-60 cursor-pointer hover:bg-red-50"
            >
              Reject (no credit)
            </button>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
