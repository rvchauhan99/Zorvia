"use client";

import React, { useMemo } from "react";
import { WEEKDAYS, fmtCAD } from "@/lib/format";
import {
  MealSlot,
  MEAL_SLOT_LABELS,
  isDualSlots,
  normalizeMealSlots,
} from "@/lib/mealSlots";

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

export function detectSlotScheduleMode(
  slotSchedules: Record<string, Record<string, number>>,
  slots: MealSlot[],
): ScheduleMode {
  for (const s of slots) {
    const sched = slotSchedules[s];
    if (sched && detectScheduleMode(sched) === "custom") return "custom";
  }
  return "same";
}

type Props = {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  mealSlots: MealSlot[];
  onMealSlotsChange: (slots: MealSlot[]) => void;
  deliveryDays: number[];
  /** Single-slot schedule (legacy meal_schedule mirror). */
  mealSchedule: Record<string, number>;
  mealQuantity: number;
  /** Dual-slot same-mode quantities. */
  lunchQuantity: number;
  dinnerQuantity: number;
  slotSchedules: Record<string, Record<string, number>>;
  mealPrice: string | number;
  onToggleDay: (day: number) => void;
  onQuantityChange: (qty: number) => void;
  onLunchQuantityChange: (qty: number) => void;
  onDinnerQuantityChange: (qty: number) => void;
  onDayQuantityChange: (day: number, qty: number) => void;
  onSlotDayQuantityChange: (slot: "lunch" | "dinner", day: number, qty: number) => void;
  inputClassName?: string;
  disabled?: boolean;
};

export default function MealScheduleFields({
  mode,
  onModeChange,
  mealSlots,
  onMealSlotsChange,
  deliveryDays,
  mealSchedule,
  mealQuantity,
  lunchQuantity,
  dinnerQuantity,
  slotSchedules,
  mealPrice,
  onToggleDay,
  onQuantityChange,
  onLunchQuantityChange,
  onDinnerQuantityChange,
  onDayQuantityChange,
  onSlotDayQuantityChange,
  inputClassName = "",
  disabled,
}: Props) {
  const dual = isDualSlots(mealSlots);
  const slots = normalizeMealSlots(mealSlots);

  const preview = useMemo(() => {
    const price = Number(mealPrice);
    const priceLabel = Number.isFinite(price) && price > 0 ? `${fmtCAD(price)}/meal` : "default price/meal";
    if (!deliveryDays.length && !dual) return "Select at least one day";

    if (dual) {
      if (mode === "same") {
        if (!deliveryDays.length) return "Select at least one day";
        const labels = WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => d.s).join(", ");
        const total = lunchQuantity + dinnerQuantity;
        return `${labels} · Lunch ×${lunchQuantity} + Dinner ×${dinnerQuantity} = ${total} meals/day · ${priceLabel}`;
      }
      const parts = WEEKDAYS.map((d) => {
        const lq = slotSchedules.lunch?.[String(d.i)] || 0;
        const dq = slotSchedules.dinner?.[String(d.i)] || 0;
        if (lq < 1 && dq < 1) return null;
        const bits = [];
        if (lq >= 1) bits.push(`L×${lq}`);
        if (dq >= 1) bits.push(`D×${dq}`);
        return `${d.s} ${bits.join("+")}`;
      }).filter(Boolean);
      return parts.length ? `${parts.join(", ")} · ${priceLabel}` : "Set lunch/dinner quantities per day";
    }

    if (!deliveryDays.length) return "Select at least one day";
    if (mode === "same") {
      const labels = WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => d.s).join(", ");
      const slotLabel = slots[0] === "dinner" && !dual ? "" : `${MEAL_SLOT_LABELS[slots[0]]} · `;
      return `${labels} · ${slotLabel}${mealQuantity} meal${mealQuantity === 1 ? "" : "s"}/day · ${priceLabel}`;
    }
    const parts = WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => {
      const q = mealSchedule[String(d.i)] || 1;
      return `${d.s} ×${q}`;
    });
    return `${parts.join(", ")} · ${priceLabel}`;
  }, [
    mode,
    deliveryDays,
    mealQuantity,
    mealSchedule,
    mealPrice,
    dual,
    lunchQuantity,
    dinnerQuantity,
    slotSchedules,
    slots,
  ]);

  function toggleSlot(slot: "lunch" | "dinner") {
    const has = mealSlots.includes(slot);
    let next: MealSlot[];
    if (has) {
      next = mealSlots.filter((s) => s !== slot) as MealSlot[];
      if (!next.length) next = ["dinner"];
      else next = normalizeMealSlots(next);
    } else {
      const cats = mealSlots.filter((s) => s === "lunch" || s === "dinner") as MealSlot[];
      cats.push(slot);
      next = normalizeMealSlots(cats);
    }
    onMealSlotsChange(next);
  }

  return (
    <div className="flex flex-col gap-3" data-testid="meal-schedule-fields">
      <div>
        <span className="label-overline">Meal category</span>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          <button
            type="button"
            data-testid="meal-slot-lunch"
            disabled={disabled}
            onClick={() => toggleSlot("lunch")}
            className={`h-11 min-h-[44px] px-3 rounded-full text-sm font-semibold border cursor-pointer ${
              mealSlots.includes("lunch")
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white border-brand-border"
            }`}
          >
            Lunch
          </button>
          <button
            type="button"
            data-testid="meal-slot-dinner"
            disabled={disabled}
            onClick={() => toggleSlot("dinner")}
            className={`h-11 min-h-[44px] px-3 rounded-full text-sm font-semibold border cursor-pointer ${
              mealSlots.includes("dinner")
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white border-brand-border"
            }`}
          >
            Dinner
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Default is Dinner. Select Lunch and/or Dinner to split kitchen counts and drivers.
        </p>
      </div>

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

      {(!dual || mode === "same") && (
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
      )}

      {mode === "same" && !dual ? (
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
      ) : null}

      {mode === "same" && dual ? (
        <div className="flex gap-3 flex-wrap">
          <label className="flex flex-col gap-1.5 max-w-[140px]">
            <span className="label-overline">Lunch / day</span>
            <input
              type="number"
              min={1}
              max={20}
              data-testid="cf-lunch-quantity"
              disabled={disabled}
              value={lunchQuantity}
              onChange={(e) =>
                onLunchQuantityChange(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className={inputClassName}
            />
          </label>
          <label className="flex flex-col gap-1.5 max-w-[140px]">
            <span className="label-overline">Dinner / day</span>
            <input
              type="number"
              min={1}
              max={20}
              data-testid="cf-dinner-quantity"
              disabled={disabled}
              value={dinnerQuantity}
              onChange={(e) =>
                onDinnerQuantityChange(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className={inputClassName}
            />
          </label>
          <div className="flex flex-col justify-end pb-1 text-sm text-muted-foreground">
            Total {lunchQuantity + dinnerQuantity} / day
          </div>
        </div>
      ) : null}

      {mode === "custom" && !dual ? (
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
      ) : null}

      {mode === "custom" && dual ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="cf-dual-custom-qty">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Day</th>
                <th className="py-1 pr-2 font-medium">Lunch</th>
                <th className="py-1 font-medium">Dinner</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((d) => (
                <tr key={d.i} className="border-t border-brand-border/60">
                  <td className="py-1.5 pr-2">{d.s}</td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      data-testid={`cf-lunch-qty-${d.s}`}
                      disabled={disabled}
                      value={slotSchedules.lunch?.[String(d.i)] || 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(20, Number(e.target.value) || 0));
                        onSlotDayQuantityChange("lunch", d.i, v);
                      }}
                      className={inputClassName}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      data-testid={`cf-dinner-qty-${d.s}`}
                      disabled={disabled}
                      value={slotSchedules.dinner?.[String(d.i)] || 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(20, Number(e.target.value) || 0));
                        onSlotDayQuantityChange("dinner", d.i, v);
                      }}
                      className={inputClassName}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-1">0 = no stop for that slot on that day.</p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground" data-testid="meal-schedule-preview">
        {preview}
      </p>
    </div>
  );
}
