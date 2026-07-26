"use client";

import { MEAL_SLOT_FILTERS, PERIODS, type MealSlotFilter, type PeriodKey } from "@/lib/analytics";
import { Loader } from "@/components/loaders";

type Props = {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
  /** Show small spinner while period data refreshes (stale KPIs stay visible). */
  busy?: boolean;
  customStart?: string;
  customEnd?: string;
  onCustomRangeChange?: (start: string, end: string) => void;
  mealSlot?: MealSlotFilter;
  onMealSlotChange?: (slot: MealSlotFilter) => void;
  /** Hide meal-slot chips (e.g. when not useful). */
  showMealSlot?: boolean;
};

export function PeriodToggle({
  value,
  onChange,
  busy,
  customStart = "",
  customEnd = "",
  onCustomRangeChange,
  mealSlot = "all",
  onMealSlotChange,
  showMealSlot = true,
}: Props) {
  return (
    <div className="flex flex-col gap-2 items-stretch sm:items-end" data-testid="analysis-period-toggle">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
        <button
          type="button"
          data-testid="period-custom"
          onClick={() => onChange("custom")}
          disabled={busy}
          className={`h-10 px-4 rounded-full text-sm font-semibold border shrink-0 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait ${
            value === "custom"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white border-brand-border hover:bg-brand-surface"
          }`}
        >
          Custom
        </button>
        {busy ? <Loader size="sm" testid="period-toggle-loader" className="shrink-0" /> : null}
      </div>

      {value === "custom" && onCustomRangeChange ? (
        <div className="flex flex-wrap items-center gap-3 text-sm" data-testid="analysis-custom-range">
          <label className="flex items-center gap-2">
            <span className="label-overline">From</span>
            <input
              type="date"
              data-testid="analysis-range-start"
              value={customStart}
              disabled={busy}
              onChange={(e) => onCustomRangeChange(e.target.value, customEnd)}
              className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="label-overline">To</span>
            <input
              type="date"
              data-testid="analysis-range-end"
              value={customEnd}
              disabled={busy}
              onChange={(e) => onCustomRangeChange(customStart, e.target.value)}
              className="h-10 px-3 rounded-xl bg-white border border-brand-border transition-all"
            />
          </label>
        </div>
      ) : null}

      {showMealSlot && onMealSlotChange ? (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" data-testid="analysis-meal-slot-filter">
          {MEAL_SLOT_FILTERS.map((s) => (
            <button
              key={s.key}
              type="button"
              data-testid={`meal-slot-${s.key}`}
              onClick={() => onMealSlotChange(s.key)}
              disabled={busy}
              className={`h-9 px-3 rounded-full text-xs font-semibold border shrink-0 transition-colors cursor-pointer disabled:opacity-70 ${
                mealSlot === s.key
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-white border-brand-border hover:bg-brand-surface"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
