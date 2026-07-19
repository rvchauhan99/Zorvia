"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import { api, downloadCsv } from "@/lib/api";

type StatusFilter = "" | "trialing" | "active" | "expired";

export default function TenantsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (!reset && cursor) params.set("cursor", cursor);
        const { data } = await api.get(`/platform/tenants?${params}`);
        const page = data.rows || [];
        setRows((prev) => (reset ? page : [...prev, ...page]));
        setTotal(data.total || 0);
        setNextCursor(data.next_cursor || null);
        if (reset) setCursor(null);
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Failed to load tenants");
      } finally {
        setLoading(false);
      }
    },
    [q, status, cursor],
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <AdminShell title="Tenants">
      <div className="flex flex-col gap-4">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setCursor(null);
            load(true);
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
                setCursor(null);
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
            {total} kitchen{total === 1 ? "" : "s"}
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

        {nextCursor ? (
          <button
            type="button"
            data-testid="tenants-load-more"
            disabled={loading}
            onClick={() => {
              setCursor(nextCursor);
              // load more with explicit cursor
              (async () => {
                setLoading(true);
                try {
                  const params = new URLSearchParams();
                  params.set("limit", "50");
                  params.set("cursor", nextCursor);
                  if (q.trim()) params.set("q", q.trim());
                  if (status) params.set("status", status);
                  const { data } = await api.get(`/platform/tenants?${params}`);
                  setRows((prev) => [...prev, ...(data.rows || [])]);
                  setNextCursor(data.next_cursor || null);
                } catch (e: any) {
                  toast.error(e?.response?.data?.detail || "Failed to load more");
                } finally {
                  setLoading(false);
                }
              })();
            }}
            className="h-11 rounded-full border border-neutral-200 text-sm font-medium cursor-pointer hover:bg-white"
          >
            Load more
          </button>
        ) : null}
      </div>
    </AdminShell>
  );
}
