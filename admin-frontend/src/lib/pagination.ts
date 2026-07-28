/** Cursor list envelope helpers (matches backend pagination.py). */

export type PageEnvelope<T> = {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
  total?: number;
  page_size?: number;
  meta?: Record<string, unknown>;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;
export const ALLOWED_PAGE_SIZES = [10, 20, 50, 100, 200] as const;
export type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export function clampPageSize(n: number | null | undefined, fallback: number = DEFAULT_PAGE_SIZE): AllowedPageSize {
  const v = n == null || Number.isNaN(Number(n)) ? fallback : Number(n);
  if ((ALLOWED_PAGE_SIZES as readonly number[]).includes(v)) return v as AllowedPageSize;
  if (v < 1) return ALLOWED_PAGE_SIZES[0];
  if (v > MAX_PAGE_SIZE) return MAX_PAGE_SIZE;
  return ALLOWED_PAGE_SIZES.reduce((best, cur) =>
    Math.abs(cur - v) < Math.abs(best - v) ? cur : best,
  );
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function recordRange(currentPage: number, pageSize: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  return { from, to };
}

/** Normalize API response that may be a legacy array or a page envelope. */
export function asPageEnvelope<T>(data: unknown): PageEnvelope<T> {
  if (Array.isArray(data)) {
    return {
      items: data as T[],
      next_cursor: null,
      has_more: false,
      total: data.length,
      page_size: data.length || DEFAULT_PAGE_SIZE,
    };
  }
  if (data && typeof data === "object") {
    const raw = data as PageEnvelope<T> & { rows?: T[] };
    const list = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.rows) ? raw.rows : null;
    if (list) {
      return {
        items: list,
        next_cursor: raw.next_cursor ?? null,
        has_more: Boolean(raw.has_more),
        total: typeof raw.total === "number" ? raw.total : undefined,
        page_size: typeof raw.page_size === "number" ? raw.page_size : undefined,
        meta: raw.meta,
      };
    }
  }
  return { items: [], next_cursor: null, has_more: false, total: 0 };
}
