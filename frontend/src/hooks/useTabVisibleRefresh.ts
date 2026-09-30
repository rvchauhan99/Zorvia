"use client";

import { useEffect, useRef } from "react";

type TabVisibleRefreshOptions = {
  /** When set, also poll while the tab is visible. */
  intervalMs?: number;
  /** Skip binding when false (e.g. driver role with no refresh). Default true. */
  enabled?: boolean;
};

/**
 * Calls `onRefresh` when the tab becomes visible, and optionally on an interval
 * while visible. Pages should pass a silent reload callback.
 */
export function useTabVisibleRefresh(
  onRefresh: () => void,
  opts: TabVisibleRefreshOptions = {},
) {
  const { intervalMs, enabled = true } = opts;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const invoke = () => {
      if (document.visibilityState === "visible") {
        onRefreshRef.current();
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible") {
        onRefreshRef.current();
      }
    };

    document.addEventListener("visibilitychange", onVis);

    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (typeof intervalMs === "number" && intervalMs > 0) {
      intervalId = setInterval(invoke, intervalMs);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (intervalId) clearInterval(intervalId);
    };
  }, [enabled, intervalMs]);
}
