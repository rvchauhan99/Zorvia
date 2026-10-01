"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError, useAbortableRequest } from "@/hooks/useAbortableRequest";

export type LoadMode = "hard" | "soft" | "silent";

export type CancellableLoadOptions = {
  mode?: LoadMode;
};

export type CancellableExecutor<T> = (signal: AbortSignal) => Promise<T>;

/**
 * Provider client fetch lifecycle: abort overlapping requests, soft/silent
 * loading (full-page spinner only for hard / first paint), ignore stale/aborted
 * results. Soft/silent must never clear the hard spinner before the first
 * successful paint — that flash is what looked like “No deliveries”.
 */
export function useCancellableLoad(initialLoading = true) {
  const { begin, abort } = useAbortableRequest();
  const [loading, setLoading] = useState(initialLoading);
  const [painted, setPainted] = useState(false);
  const paintedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abort();
    };
  }, [abort]);

  const markPainted = useCallback(() => {
    paintedRef.current = true;
    if (mountedRef.current) setPainted(true);
  }, []);

  const run = useCallback(
    async <T,>(
      executor: CancellableExecutor<T>,
      opts: CancellableLoadOptions = {},
    ): Promise<T | undefined> => {
      const mode = opts.mode ?? "hard";
      const ticket = begin();

      if (mountedRef.current) {
        // Hard always shows spinner. Soft/silent before first paint keep spinner
        // (do not force loading=false — that caused empty-list flash on abort).
        if (mode === "hard" || !paintedRef.current) {
          setLoading(true);
        }
      }

      try {
        const result = await executor(ticket.signal);
        if (!ticket.isCurrent() || !mountedRef.current) return undefined;
        markPainted();
        setLoading(false);
        return result;
      } catch (err) {
        // Superseded / aborted tickets: keep prior items + loading until the
        // current ticket settles (isCurrent is false after begin() bumps seq).
        if (!ticket.isCurrent() || !mountedRef.current) return undefined;
        if (isAbortError(err)) {
          // Current ticket aborted (e.g. unmount) — leave UI as-is.
          return undefined;
        }
        setLoading(false);
        throw err;
      }
    },
    [begin, markPainted],
  );

  return { loading, setLoading, painted, paintedRef, run, abort, isAbortError };
}
