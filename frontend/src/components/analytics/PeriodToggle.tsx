"use client";

import { PERIODS, type PeriodKey } from "@/lib/analytics";
import { Loader } from "@/components/loaders";

type Props = {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
  /** Show small spinner while period data refreshes (stale KPIs stay visible). */
  busy?: boolean;
};

export function PeriodToggle({ value, onChange, busy }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="analysis-period-toggle">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          data-testid={`period-${p.key}`}
          onClick={() => onChange(p.key)}
          disabled={busy}
          className={`h-10 px-4 rounded-full text-sm font-semibold border shrink-0 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait ${
            value === p.key
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white border-brand-border hover:bg-brand-surface"
          }`}
        >
          {p.label}
        </button>
      ))}
      {busy ? <Loader size="sm" testid="period-toggle-loader" className="shrink-0" /> : null}
    </div>
  );
}
