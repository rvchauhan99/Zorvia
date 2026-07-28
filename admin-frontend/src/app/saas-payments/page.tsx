"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { api } from "@/lib/api";
import { asPageEnvelope, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";

type StatusFilter = "pending" | "approved" | "rejected";

export default function SaasPaymentsPage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
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
        const { data } = await api.get(`/platform/saas-payments?${params}`);
        const page = asPageEnvelope<any>(data);
        setRows(page.items);
        paging.applyPageResult(page);
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Failed to load");
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
    <AdminShell title="SaaS payments">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {(["pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`filter-${s}`}
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
            <div className="p-8 text-center text-sm text-neutral-500" data-testid="empty-list">
              No {status} records.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/saas-payments/${r.id}`}
                    data-testid={`row-${r.id}`}
                    className="flex items-start justify-between gap-3 p-4 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {r.provider_name || r.tenant_id}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 truncate">
                        {r.admin_email} · {r.plan} · CAD {r.amount}
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
            testidPrefix="saas-payments"
          />
        )}
      </div>
    </AdminShell>
  );
}
