"use client";

import { PERIODS, type PeriodKey } from "@/lib/analytics";

type Props = {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
};

export function PeriodToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" data-testid="analysis-period-toggle">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          data-testid={`period-${p.key}`}
          onClick={() => onChange(p.key)}
          className={`h-10 px-4 rounded-full text-sm font-semibold border shrink-0 transition-colors cursor-pointer ${
            value === p.key
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white border-brand-border hover:bg-brand-surface"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
