"use client";

import { useCallback, useRef } from "react";

export type AbortableTicket = {
  id: number;
  signal: AbortSignal;
  /** True if this ticket is still the latest in-flight request. */
  isCurrent: () => boolean;
};

/**
 * Low-level request serialization: abort the previous controller, ignore stale
 * responses via generation id. Prefer `useCancellableLoad` in pages.
 */
export function useAbortableRequest() {
  const seqRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const begin = useCallback((): AbortableTicket => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++seqRef.current;
    return {
      id,
      signal: controller.signal,
      isCurrent: () => id === seqRef.current,
    };
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    seqRef.current += 1;
  }, []);

  return { begin, abort };
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
