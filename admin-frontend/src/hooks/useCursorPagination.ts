"use client";

import { useCallback, useMemo, useState } from "react";
import {
  clampPageSize,
  recordRange,
  totalPages as calcTotalPages,
  type AllowedPageSize,
} from "@/lib/pagination";

type Opts = {
  initialPageSize?: number;
};

export function useCursorPagination(opts: Opts = {}) {
  const initial = clampPageSize(opts.initialPageSize);
  const [pageSize, setPageSizeState] = useState<AllowedPageSize>(initial);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const currentPage = currentPageIndex + 1;
  const pages = calcTotalPages(total, pageSize);
  const { from, to } = useMemo(
    () => recordRange(currentPage, pageSize, total),
    [currentPage, pageSize, total],
  );

  const applyPageResult = useCallback((page: {
    next_cursor?: string | null;
    has_more?: boolean;
    total?: number;
  }) => {
    setNextCursor(page.next_cursor ?? null);
    setHasMore(Boolean(page.has_more));
    if (typeof page.total === "number") setTotal(page.total);
  }, []);

  const resetToFirstPage = useCallback(() => {
    setCursorHistory([]);
    setCurrentPageIndex(0);
    setNextCursor(null);
    setHasMore(false);
  }, []);

  /** Returns cursor to fetch for previous page (null = first page). */
  const goPrev = useCallback((): string | null | undefined => {
    if (currentPageIndex <= 0) return undefined;
    const prevIndex = currentPageIndex - 1;
    setCurrentPageIndex(prevIndex);
    return prevIndex > 0 ? cursorHistory[prevIndex - 1] ?? null : null;
  }, [currentPageIndex, cursorHistory]);

  /** Returns cursor to fetch for next page, or undefined if none. */
  const goNext = useCallback((): string | null | undefined => {
    if (!hasMore || !nextCursor) return undefined;
    const newHistory = [...cursorHistory];
    newHistory[currentPageIndex] = nextCursor;
    setCursorHistory(newHistory);
    setCurrentPageIndex(currentPageIndex + 1);
    return nextCursor;
  }, [hasMore, nextCursor, cursorHistory, currentPageIndex]);

  const setPageSize = useCallback((size: AllowedPageSize) => {
    setPageSizeState(clampPageSize(size));
    setCursorHistory([]);
    setCurrentPageIndex(0);
    setNextCursor(null);
    setHasMore(false);
  }, []);

  return {
    pageSize,
    setPageSize,
    cursorHistory,
    currentPageIndex,
    currentPage,
    nextCursor,
    hasMore,
    total,
    setTotal,
    totalPages: pages,
    from,
    to,
    applyPageResult,
    resetToFirstPage,
    goPrev,
    goNext,
  };
}
