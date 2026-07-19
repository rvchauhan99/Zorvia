/** Cursor list envelope helpers (matches backend pagination.py). */

export type PageEnvelope<T> = {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
};

export const DEFAULT_PAGE_SIZE = 25;

/** Normalize API response that may be a legacy array or a page envelope. */
export function asPageEnvelope<T>(data: unknown): PageEnvelope<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], next_cursor: null, has_more: false };
  }
  if (data && typeof data === "object" && Array.isArray((data as PageEnvelope<T>).items)) {
    const env = data as PageEnvelope<T>;
    return {
      items: env.items,
      next_cursor: env.next_cursor ?? null,
      has_more: Boolean(env.has_more),
    };
  }
  return { items: [], next_cursor: null, has_more: false };
}
