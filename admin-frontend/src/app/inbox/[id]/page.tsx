"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import { api } from "@/lib/api";

export default function InboxDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [msg, setMsg] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/platform/contact-messages/${id}`)
      .then(({ data }) => setMsg(data))
      .catch(() => {
        toast.error("Message not found");
        router.replace("/inbox");
      });
  }, [id, router]);

  async function markRead() {
    setBusy(true);
    try {
      const { data } = await api.post(`/platform/contact-messages/${id}/read`);
      setMsg(data.message);
      toast.success("Marked read");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setBusy(true);
    try {
      const { data } = await api.post(`/platform/contact-messages/${id}/archive`);
      setMsg(data.message);
      toast.success("Archived");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Message">
      <div className="max-w-3xl flex flex-col gap-3">
        <Link href="/inbox" className="text-sm text-teal-700 hover:underline w-fit">
          ← Back to inbox
        </Link>
        {!msg ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : (
          <>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="text-xs uppercase tracking-widest text-neutral-500">Subject</div>
              <div className="text-xl font-bold" data-testid="inbox-subject">
                {msg.subject}
              </div>
              <div className="text-sm text-neutral-600">
                From {msg.name} &lt;{msg.email}&gt;
              </div>
              <div className="text-xs capitalize text-neutral-500" data-testid="inbox-status">
                {msg.status} · {(msg.created_at || "").slice(0, 19)}
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed border-t border-neutral-100 pt-3">
                {msg.message}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {msg.status === "new" ? (
                <button
                  type="button"
                  data-testid="inbox-mark-read"
                  disabled={busy}
                  onClick={markRead}
                  className="h-11 px-5 rounded-full bg-teal-700 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
                >
                  Mark read
                </button>
              ) : null}
              {msg.status !== "archived" ? (
                <button
                  type="button"
                  data-testid="inbox-archive"
                  disabled={busy}
                  onClick={archive}
                  className="h-11 px-5 rounded-full border border-neutral-200 text-sm font-semibold disabled:opacity-60 cursor-pointer"
                >
                  Archive
                </button>
              ) : null}
              <a
                href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || "")}`}
                className="h-11 px-5 rounded-full border border-neutral-200 text-sm font-semibold inline-flex items-center"
              >
                Reply by email
              </a>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
