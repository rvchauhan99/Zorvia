"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { api } from "@/lib/api";
import { asPageEnvelope, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";

type StatusFilter = "new" | "read" | "archived";

export default function InboxPage() {
  const [status, setStatus] = useState<StatusFilter>("new");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const paging = useCursorPagination({ initialPageSize: DEFAULT_PAGE_SIZE });

  const load = useCallback(
    async (opts: { cursor?: string | null } = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("status", status);
        params.set("page_size", String(paging.pageSize));
        if (opts.cursor) params.set("cursor", opts.cursor);
        const { data } = await api.get(`/platform/contact-messages?${params}`);
        const page = asPageEnvelope<any>(data);
        setRows(page.items);
        paging.applyPageResult(page);
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Failed to load inbox");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, paging.pageSize],
  );

  useEffect(() => {
    paging.resetToFirstPage();
    load({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paging.pageSize]);

  return (
    <AdminShell title="Inbox">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {(["new", "read", "archived"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`inbox-filter-${s}`}
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
            <div className="p-8 text-center text-sm text-neutral-500" data-testid="inbox-empty">
              No {status} messages.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200" data-testid="inbox-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/inbox/${r.id}`}
                    data-testid={`inbox-${r.id}`}
                    className="flex justify-between gap-3 p-4 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.subject || "Contact"}</div>
                      <div className="text-xs text-neutral-500 mt-0.5 truncate">
                        {r.name} · {r.email}
                      </div>
                      <div className="text-sm text-neutral-600 mt-1 line-clamp-2">{r.message}</div>
                    </div>
                    <div className="text-xs text-neutral-400 shrink-0">
                      {(r.created_at || "").slice(0, 10)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rows.length > 0 && (
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
            onPageSizeChange={(size) => paging.setPageSize(size)}
            testidPrefix="inbox"
          />
        )}
      </div>
    </AdminShell>
  );
}
