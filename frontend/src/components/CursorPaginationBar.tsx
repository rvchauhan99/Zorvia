"use client";

import React from "react";
import { ALLOWED_PAGE_SIZES, type AllowedPageSize } from "@/lib/pagination";
import SearchableSelect from "@/components/SearchableSelect";

type Props = {
  currentPage: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  pageSize: number;
  hasMore: boolean;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (size: AllowedPageSize) => void;
  testidPrefix?: string;
};

export default function CursorPaginationBar({
  currentPage,
  totalPages,
  from,
  to,
  total,
  pageSize,
  hasMore,
  loading = false,
  onPrev,
  onNext,
  onPageSizeChange,
  testidPrefix = "pagination",
}: Props) {
  const canPrev = currentPage > 1 && !loading;
  const canNext = hasMore && !loading;

  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 pt-2 pb-1 text-sm text-muted-foreground"
      data-testid={`${testidPrefix}-bar`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span data-testid={`${testidPrefix}-page-label`} className="font-medium text-foreground">
          {total === 0 ? "Page 0 of 0" : `Page ${currentPage} of ${totalPages}`}
        </span>
        <span data-testid={`${testidPrefix}-records-label`}>
          {total === 0
            ? "No records"
            : `Records from ${from}–${to} out of ${total}`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide">Per page</span>
          <div className="w-24">
            <SearchableSelect
              testid={`${testidPrefix}-page-size`}
              value={String(pageSize)}
              disabled={loading}
              onChange={(v) => onPageSizeChange(Number(v) as AllowedPageSize)}
              options={ALLOWED_PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
              inputClassName="h-10 px-2 rounded-xl bg-white border border-brand-border text-sm text-foreground disabled:opacity-50"
              placeholder="Size…"
            />
          </div>
        </label>
        <button
          type="button"
          data-testid={`${testidPrefix}-prev`}
          disabled={!canPrev}
          onClick={onPrev}
          className="h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-medium hover:bg-brand-surface disabled:opacity-40 cursor-pointer"
        >
          Previous
        </button>
        <button
          type="button"
          data-testid={`${testidPrefix}-next`}
          disabled={!canNext}
          onClick={onNext}
          className="h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-medium hover:bg-brand-surface disabled:opacity-40 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}
