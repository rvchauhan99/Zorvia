"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { api, downloadCsv } from "@/lib/api";
import { asPageEnvelope, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";

type StatusFilter = "" | "trialing" | "active" | "expired";

export default function TenantsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const paging = useCursorPagination({ initialPageSize: DEFAULT_PAGE_SIZE });

  const load = useCallback(
    async (opts: { cursor?: string | null } = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(paging.pageSize));
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (opts.cursor) params.set("cursor", opts.cursor);
        const { data } = await api.get(`/platform/tenants?${params}`);
        const page = asPageEnvelope<any>(data);
        setRows(page.items);
        paging.applyPageResult(page);
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Failed to load tenants");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, status, paging.pageSize],
  );

  useEffect(() => {
    paging.resetToFirstPage();
    load({ cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paging.pageSize]);

  return (
    <AdminShell title="Tenants">
      <div className="flex flex-col gap-4">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            paging.resetToFirstPage();
            load({ cursor: null });
          }}
        >
          <input
            data-testid="tenant-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, code…"
            className="flex-1 h-11 px-4 rounded-full border border-neutral-200 outline-none focus:ring-2 focus:ring-teal-600/30"
          />
          <button
            type="submit"
            className="h-11 px-5 rounded-full bg-teal-700 text-white text-sm font-semibold cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 flex-wrap">
          {(
            [
              ["", "All"],
              ["trialing", "Trialing"],
              ["active", "Active"],
              ["expired", "Expired"],
            ] as [StatusFilter, string][]
          ).map(([v, label]) => (
            <button
              key={label}
              type="button"
              data-testid={`tenant-filter-${v || "all"}`}
              onClick={() => {
                setStatus(v);
              }}
              className={`h-10 px-4 rounded-full text-sm font-medium border cursor-pointer ${
                status === v
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white border-neutral-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-neutral-500" data-testid="tenant-total">
            {paging.total} kitchen{paging.total === 1 ? "" : "s"}
          </div>
          <button
            type="button"
            data-testid="export-tenants-csv"
            onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (q.trim()) params.set("q", q.trim());
                if (status) params.set("status", status);
                const qs = params.toString();
                await downloadCsv(
                  `/platform/exports/tenants.csv${qs ? `?${qs}` : ""}`,
                  "tenants.csv",
                );
                toast.success("Download started");
              } catch (e: any) {
                toast.error(e?.message || "Export failed");
              }
            }}
            className="h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium cursor-pointer hover:bg-white"
          >
            Export CSV
          </button>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500" data-testid="tenants-empty">
              No tenants found.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200" data-testid="tenants-list">
              {rows.map((r) => (
                <li key={r.tenant_id}>
                  <Link
                    href={`/tenants/${r.tenant_id}`}
                    data-testid={`tenant-${r.tenant_id}`}
                    className="flex items-start justify-between gap-3 p-4 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name || r.tenant_id}</div>
                      <div className="text-xs text-neutral-500 mt-0.5 truncate">
                        {r.admin_email || "—"} · {r.customer_count} customers
                      </div>
                      <div className="text-xs text-neutral-400 mt-1 font-mono">
                        {r.signup_code}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-medium capitalize">{r.status}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {r.plan || "no plan"}
                        {r.days_left != null ? ` · ${r.days_left}d` : ""}
                      </div>
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
            testidPrefix="tenants"
          />
        )}
      </div>
    </AdminShell>
  );
}
