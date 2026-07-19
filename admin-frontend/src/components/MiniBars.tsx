"use client";

/** Lightweight bar chart — no chart library dependency. */
export default function MiniBars({
  items,
  valueKey = "count",
  formatValue,
  testid,
}: {
  items: Array<Record<string, any>>;
  valueKey?: string;
  formatValue?: (n: number) => string;
  testid?: string;
}) {
  const vals = items.map((i) => Number(i[valueKey] || 0));
  const max = Math.max(1, ...vals);
  const fmt = formatValue || ((n: number) => String(n));

  if (!items.length) {
    return (
      <div className="text-sm text-neutral-500 py-6 text-center" data-testid={testid}>
        No data
      </div>
    );
  }

  return (
    <div className="flex items-end gap-0.5 h-28 w-full overflow-x-auto" data-testid={testid}>
      {items.map((item) => {
        const v = Number(item[valueKey] || 0);
        const h = Math.round((v / max) * 100);
        return (
          <div
            key={item.date || item.label}
            className="flex-1 min-w-[6px] max-w-[28px] flex flex-col justify-end items-center gap-1"
            title={`${item.date || item.label}: ${fmt(v)}`}
          >
            <div
              className="w-full rounded-t bg-teal-600/80"
              style={{ height: `${Math.max(v > 0 ? 4 : 0, h)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
