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
 * loading (full-page spinner only for hard), ignore stale/aborted results.
 */
export function useCancellableLoad(initialLoading = true) {
  const { begin, abort } = useAbortableRequest();
  const [loading, setLoading] = useState(initialLoading);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abort();
    };
  }, [abort]);

  const run = useCallback(
    async <T,>(
      executor: CancellableExecutor<T>,
      opts: CancellableLoadOptions = {},
    ): Promise<T | undefined> => {
      const mode = opts.mode ?? "hard";
      const ticket = begin();

      if (mountedRef.current) {
        // Soft/silent must clear any prior hard spinner when they supersede it.
        setLoading(mode === "hard");
      }

      try {
        const result = await executor(ticket.signal);
        if (!ticket.isCurrent() || !mountedRef.current) return undefined;
        if (mode === "hard") setLoading(false);
        return result;
      } catch (err) {
        if (!ticket.isCurrent() || !mountedRef.current) return undefined;
        if (isAbortError(err)) {
          if (mode === "hard") setLoading(false);
          return undefined;
        }
        if (mode === "hard") setLoading(false);
        throw err;
      }
    },
    [begin],
  );

  return { loading, setLoading, run, abort, isAbortError };
}
