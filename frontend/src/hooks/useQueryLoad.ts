"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LoadMode = "hard" | "soft" | "silent";

export type QueryLoadOptions = {
  mode?: LoadMode;
  /**
   * Request identity for in-flight dedupe: concurrent `run` calls with the
   * same key share one request and one result. Build it from the exact
   * request params. Omit for one-off loads — every call gets its own request.
   */
  key?: string;
};

export type QueryExecutor<T> = (signal: AbortSignal) => Promise<T>;

type Flight = {
  seq: number;
  controller: AbortController;
  promise: Promise<unknown>;
};

/**
 * Provider client fetch lifecycle — request coordinator.
 *
 * Replaces `useCancellableLoad` / `useAbortableRequest`, whose
 * abort-on-new-request design made a page cancel its own slower sibling calls
 * (red "canceled" rows in DevTools, wasted backend work, 500-shaped flakes
 * under load).
 *
 * Rules:
 * - Identical requests already in flight are shared (same `key` → same
 *   promise, no second network call).
 * - A new request never aborts an older one. When several overlap, the newest
 *   wins: stale responses are ignored when they arrive.
 * - `loading` is owned by the latest spinner-worthy request (`hard`, or any
 *   mode before first paint) and clears when the current request settles.
 * - In-flight requests are aborted only when the page unmounts (real leave).
 *
 * Mode rules match the previous hook: soft/silent before first paint keep the
 * hard spinner (no empty-list flash); superseded results are no-ops — keep
 * prior `items` until the current request settles.
 */
export function useQueryLoad(initialLoading = true) {
  const [loading, setLoading] = useState(initialLoading);
  const [painted, setPainted] = useState(false);
  const paintedRef = useRef(false);
  const mountedRef = useRef(true);
  const seqRef = useRef(0);
  const flightsRef = useRef(new Map<string, Flight>());

  const markPainted = useCallback(() => {
    paintedRef.current = true;
    if (mountedRef.current) setPainted(true);
  }, []);

  /** Abort every in-flight request and invalidate all tickets (unmount only). */
  const abort = useCallback(() => {
    for (const f of flightsRef.current.values()) f.controller.abort();
    flightsRef.current.clear();
    seqRef.current += 1;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abort();
    };
  }, [abort]);

  const run = useCallback(
    async <T,>(
      executor: QueryExecutor<T>,
      opts: QueryLoadOptions = {},
    ): Promise<T | undefined> => {
      const mode = opts.mode ?? "hard";
      const flights = flightsRef.current;

      // Share an identical in-flight request instead of issuing a second call.
      if (opts.key) {
        const existing = flights.get(opts.key);
        if (existing) return existing.promise as Promise<T | undefined>;
      }

      const controller = new AbortController();
      const seq = ++seqRef.current;
      const flightKey = opts.key ?? `__oneoff_${seq}`;
      const flight: Flight = { seq, controller, promise: Promise.resolve(undefined) };
      flights.set(flightKey, flight);

      if (mountedRef.current && (mode === "hard" || !paintedRef.current)) {
        // Hard always shows spinner. Soft/silent before first paint keep spinner
        // (do not force loading=false — that caused empty-list flash on abort).
        setLoading(true);
      }

      const promise = (async () => {
        try {
          const result = await executor(controller.signal);
          // Newest wins: superseded flights are no-ops.
          if (seq !== seqRef.current || !mountedRef.current) return undefined;
          markPainted();
          setLoading(false);
          return result;
        } catch (err) {
          if (seq !== seqRef.current || !mountedRef.current) return undefined;
          if (isAbortError(err)) {
            // Current flight aborted (unmount) — leave UI as-is.
            return undefined;
          }
          setLoading(false);
          throw err;
        } finally {
          if (flights.get(flightKey) === flight) flights.delete(flightKey);
        }
      })();

      flight.promise = promise;
      return promise;
    },
    [markPainted],
  );

  /** True while a request is in flight (any, or a specific key). */
  const isInFlight = useCallback((key?: string) => {
    if (key) return flightsRef.current.has(key);
    return flightsRef.current.size > 0;
  }, []);

  return { loading, setLoading, painted, paintedRef, run, abort, isInFlight, isAbortError };
}

/** Axios/fetch abort should not surface as a user-facing error. */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; name?: string; message?: string };
  return (
    e.code === "ERR_CANCELED" ||
    e.name === "CanceledError" ||
    e.name === "AbortError" ||
    (typeof e.message === "string" && /abort|cancel/i.test(e.message))
  );
}
