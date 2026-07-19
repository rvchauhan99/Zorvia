"use client";

import React, { useMemo } from "react";
import { WEEKDAYS, fmtCAD } from "@/lib/format";

export type ScheduleMode = "same" | "custom";

/** Build weekday→qty map from days + uniform quantity. */
export function scheduleFromDays(days: number[], qty: number): Record<string, number> {
  const q = Math.max(1, Math.min(20, Math.floor(Number(qty) || 1)));
  const out: Record<string, number> = {};
  for (const d of [...new Set(days)].sort((a, b) => a - b)) {
    if (d >= 0 && d <= 6) out[String(d)] = q;
  }
  return out;
}

export function daysFromSchedule(schedule: Record<string, number> | null | undefined): number[] {
  if (!schedule) return [];
  return Object.keys(schedule)
    .map((k) => parseInt(k, 10))
    .filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6 && (schedule[String(d)] || 0) >= 1)
    .sort((a, b) => a - b);
}

export function detectScheduleMode(schedule: Record<string, number> | null | undefined): ScheduleMode {
  if (!schedule || !Object.keys(schedule).length) return "same";
  const qtys = Object.values(schedule);
  return new Set(qtys).size <= 1 ? "same" : "custom";
}

export function uniformQty(schedule: Record<string, number> | null | undefined): number {
  if (!schedule || !Object.keys(schedule).length) return 1;
  const qtys = Object.values(schedule);
  return qtys[0] || 1;
}

export function scheduleSummaryLabel(schedule: Record<string, number> | null | undefined): string {
  if (!schedule || !Object.keys(schedule).length) return "×1";
  const qtys = Object.values(schedule);
  if (new Set(qtys).size === 1) return `×${qtys[0]}`;
  return "var";
}

type Props = {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  deliveryDays: number[];
  mealSchedule: Record<string, number>;
  mealQuantity: number;
  mealPrice: string | number;
  onToggleDay: (day: number) => void;
  onQuantityChange: (qty: number) => void;
  onDayQuantityChange: (day: number, qty: number) => void;
  inputClassName?: string;
  disabled?: boolean;
};

export default function MealScheduleFields({
  mode,
  onModeChange,
  deliveryDays,
  mealSchedule,
  mealQuantity,
  mealPrice,
  onToggleDay,
  onQuantityChange,
  onDayQuantityChange,
  inputClassName = "",
  disabled,
}: Props) {
  const preview = useMemo(() => {
    const price = Number(mealPrice);
    const priceLabel = Number.isFinite(price) && price > 0 ? `${fmtCAD(price)}/meal` : "default price/meal";
    if (!deliveryDays.length) return "Select at least one day";
    if (mode === "same") {
      const labels = WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => d.s).join(", ");
      return `${labels} · ${mealQuantity} meal${mealQuantity === 1 ? "" : "s"}/day · ${priceLabel}`;
    }
    const parts = WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => {
      const q = mealSchedule[String(d.i)] || 1;
      return `${d.s} ×${q}`;
    });
    return `${parts.join(", ")} · ${priceLabel}`;
  }, [mode, deliveryDays, mealQuantity, mealSchedule, mealPrice]);

  return (
    <div className="flex flex-col gap-3" data-testid="meal-schedule-fields">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          data-testid="schedule-mode-same"
          disabled={disabled}
          onClick={() => onModeChange("same")}
          className={`h-11 min-h-[44px] px-3 rounded-full text-sm font-semibold border cursor-pointer ${
            mode === "same" ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border"
          }`}
        >
          Same every day
        </button>
        <button
          type="button"
          data-testid="schedule-mode-custom"
          disabled={disabled}
          onClick={() => onModeChange("custom")}
          className={`h-11 min-h-[44px] px-3 rounded-full text-sm font-semibold border cursor-pointer ${
            mode === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border"
          }`}
        >
          Custom per day
        </button>
      </div>

      <div>
        <span className="label-overline">Delivery days</span>
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {WEEKDAYS.map((d) => {
            const on = deliveryDays.includes(d.i);
            return (
              <button
                key={d.i}
                type="button"
                data-testid={`cf-day-${d.s}`}
                disabled={disabled}
                onClick={() => onToggleDay(d.i)}
                className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-full text-xs font-medium cursor-pointer ${
                  on ? "bg-primary text-primary-foreground" : "bg-brand-surface text-muted-foreground"
                }`}
              >
                {d.s[0]}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "same" ? (
        <label className="flex flex-col gap-1.5 max-w-[160px]">
          <span className="label-overline">Meals / day</span>
          <input
            type="number"
            min={1}
            max={20}
            data-testid="cf-meal-quantity"
            disabled={disabled}
            value={mealQuantity}
            onChange={(e) => onQuantityChange(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className={inputClassName}
          />
        </label>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => (
            <label key={d.i} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{d.s}</span>
              <input
                type="number"
                min={1}
                max={20}
                data-testid={`cf-day-qty-${d.s}`}
                disabled={disabled}
                value={mealSchedule[String(d.i)] || 1}
                onChange={(e) =>
                  onDayQuantityChange(d.i, Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                }
                className={inputClassName}
              />
            </label>
          ))}
          {!deliveryDays.length ? (
            <p className="text-xs text-muted-foreground col-span-full">Select days to set quantities.</p>
          ) : null}
        </div>
      )}

      <p className="text-xs text-muted-foreground" data-testid="meal-schedule-preview">
        {preview}
      </p>
    </div>
  );
}
