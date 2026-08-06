"use client";

import React, { useMemo } from "react";
import { WEEKDAYS, fmtCAD } from "@/lib/format";
import {
  MealSlot,
  MEAL_SLOT_LABELS,
  isDualSlots,
  normalizeMealSlots,
} from "@/lib/mealSlots";
import {
  type MealTypeLine,
  type MealTypeOption,
  type SlotMealTypeLines,
  MAX_MEAL_TYPE_LINES,
  MAX_LINE_TOTAL_QTY,
  defaultLine,
  linesTotalQty,
  linesTotalAmount,
  normalizeLines,
  priceForTypeId,
  uniformLinesForSlot,
} from "@/lib/mealTypeLines";

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
  onToggleDay: (day: number) => void;
  mealTypeOptions: MealTypeOption[];
  slotMealTypeLines: SlotMealTypeLines;
  /** Same-every-day: write lines to all selected delivery days for the slot. */
  onUniformSlotLinesChange: (slot: "lunch" | "dinner", lines: MealTypeLine[]) => void;
  /** Custom / per-day lines for a slot×weekday. Empty lines = no stop. */
  onSlotDayLinesChange: (slot: "lunch" | "dinner", day: number, lines: MealTypeLine[]) => void;
  inputClassName?: string;
  disabled?: boolean;
};

function LinesEditor({
  lines,
  onChange,
  mealTypeOptions,
  inputClassName,
  disabled,
  testidPrefix,
  allowEmpty = false,
}: {
  lines: MealTypeLine[];
  onChange: (next: MealTypeLine[]) => void;
  mealTypeOptions: MealTypeOption[];
  inputClassName: string;
  disabled?: boolean;
  testidPrefix: string;
  allowEmpty?: boolean;
}) {
  const total = linesTotalQty(lines);
  const amount = linesTotalAmount(lines);

  function updateAt(idx: number, patch: Partial<MealTypeLine>) {
    const next = lines.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln));
    onChange(normalizeLines(next));
  }

  function removeAt(idx: number) {
    onChange(lines.filter((_, i) => i !== idx));
  }

  function addLine() {
    if (lines.length >= MAX_MEAL_TYPE_LINES) return;
    const remaining = MAX_LINE_TOTAL_QTY - total;
    if (remaining < 1) return;
    const used = new Set(lines.map((ln) => ln.meal_type_id));
    const nextType =
      mealTypeOptions.find((t) => !used.has(t.id)) || mealTypeOptions[0] || { id: "regular", name: "Regular", price: 12 };
    onChange(
      normalizeLines([
        ...lines,
        defaultLine({
          typeId: nextType.id,
          qty: Math.min(1, remaining),
          price: nextType.price,
          mealTypeOptions,
        }),
      ]),
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid={`${testidPrefix}-lines`}>
      {lines.map((ln, idx) => (
        <div
          key={`${ln.meal_type_id}-${idx}`}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-brand-border/60 p-2"
          data-testid={`${testidPrefix}-line-${idx}`}
        >
          <label className="flex flex-col gap-1 min-w-[120px] flex-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Type</span>
            <select
              data-testid={`${testidPrefix}-type-${idx}`}
              disabled={disabled}
              value={ln.meal_type_id}
              onChange={(e) => {
                const tid = e.target.value;
                updateAt(idx, {
                  meal_type_id: tid,
                  unit_price: priceForTypeId(mealTypeOptions, tid, ln.unit_price),
                });
              }}
              className={`${inputClassName} text-xs sm:text-sm`}
            >
              {(mealTypeOptions.length ? mealTypeOptions : [{ id: ln.meal_type_id, name: ln.meal_type_id, price: ln.unit_price }]).map(
                (t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1 w-[72px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Qty</span>
            <input
              type="number"
              min={1}
              max={MAX_LINE_TOTAL_QTY}
              data-testid={`${testidPrefix}-qty-${idx}`}
              disabled={disabled}
              value={ln.quantity}
              onChange={(e) => updateAt(idx, { quantity: Math.max(1, Math.min(MAX_LINE_TOTAL_QTY, Number(e.target.value) || 1)) })}
              className={inputClassName}
            />
          </label>
          <label className="flex flex-col gap-1 w-[88px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Price</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              data-testid={`${testidPrefix}-price-${idx}`}
              disabled={disabled}
              value={ln.unit_price}
              onChange={(e) => updateAt(idx, { unit_price: Number(e.target.value) || 0 })}
              className={inputClassName}
            />
          </label>
          {(lines.length > 1 || allowEmpty) ? (
            <button
              type="button"
              data-testid={`${testidPrefix}-remove-${idx}`}
              disabled={disabled}
              onClick={() => removeAt(idx)}
              className="h-11 min-h-[44px] px-2.5 rounded-full text-xs font-medium border border-brand-border bg-white text-muted-foreground cursor-pointer hover:bg-brand-surface"
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid={`${testidPrefix}-add-type`}
          disabled={disabled || lines.length >= MAX_MEAL_TYPE_LINES || total >= MAX_LINE_TOTAL_QTY}
          onClick={addLine}
          className="h-9 min-h-[36px] px-3 rounded-full text-xs font-semibold border border-brand-border bg-white cursor-pointer hover:bg-brand-surface disabled:opacity-40"
        >
          + Add type
        </button>
        <span className="text-xs text-muted-foreground" data-testid={`${testidPrefix}-total`}>
          Total {total} meal{total === 1 ? "" : "s"}
          {amount > 0 ? ` · ${fmtCAD(amount)}` : ""}
        </span>
      </div>
    </div>
  );
}

export default function MealScheduleFields({
  mode,
  onModeChange,
  mealSlots,
  onMealSlotsChange,
  deliveryDays,
  onToggleDay,
  mealTypeOptions,
  slotMealTypeLines,
  onUniformSlotLinesChange,
  onSlotDayLinesChange,
  inputClassName = "",
  disabled,
}: Props) {
  const dual = isDualSlots(mealSlots);
  const slots = normalizeMealSlots(mealSlots);
  const categorized = slots.filter((s) => s === "lunch" || s === "dinner") as Array<"lunch" | "dinner">;

  const preview = useMemo(() => {
    if (!deliveryDays.length && !dual) return "Select at least one day";

    const labelFor = (slot: "lunch" | "dinner", lines: MealTypeLine[]) => {
      if (!lines.length) return null;
      const bits = lines.map((ln) => {
        const name = mealTypeOptions.find((t) => t.id === ln.meal_type_id)?.name || ln.meal_type_id;
        return `${name}×${ln.quantity}`;
      });
      return `${MEAL_SLOT_LABELS[slot]} ${bits.join("+")} (${linesTotalQty(lines)})`;
    };

    if (mode === "same") {
      if (!deliveryDays.length) return "Select at least one day";
      const labels = WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => d.s).join(", ");
      const parts = categorized
        .map((slot) => labelFor(slot, uniformLinesForSlot(slotMealTypeLines, slot, deliveryDays)))
        .filter(Boolean);
      if (!parts.length) return `${labels} · add at least one meal type`;
      return `${labels} · ${parts.join(" · ")}`;
    }

    if (dual) {
      const parts = WEEKDAYS.map((d) => {
        const lunch = normalizeLines(slotMealTypeLines.lunch?.[String(d.i)] || []);
        const dinner = normalizeLines(slotMealTypeLines.dinner?.[String(d.i)] || []);
        if (!lunch.length && !dinner.length) return null;
        const bits: string[] = [];
        if (lunch.length) bits.push(`L×${linesTotalQty(lunch)}`);
        if (dinner.length) bits.push(`D×${linesTotalQty(dinner)}`);
        return `${d.s} ${bits.join("+")}`;
      }).filter(Boolean);
      return parts.length ? parts.join(", ") : "Set type×qty×price lines per day";
    }

    const slot = categorized[0] || "dinner";
    const parts = WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => {
      const lines = normalizeLines(slotMealTypeLines[slot]?.[String(d.i)] || []);
      const q = linesTotalQty(lines);
      return q >= 1 ? `${d.s} ×${q}` : null;
    }).filter(Boolean);
    return parts.length ? parts.join(", ") : "Select days and set meal lines";
  }, [mode, deliveryDays, dual, categorized, slotMealTypeLines, mealTypeOptions]);

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

  function seedIfEmpty(slot: "lunch" | "dinner", existing: MealTypeLine[]): MealTypeLine[] {
    if (existing.length) return existing;
    return [
      defaultLine({
        typeId: mealTypeOptions[0]?.id || "regular",
        qty: 1,
        mealTypeOptions,
      }),
    ];
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

      {mode === "same"
        ? categorized.map((slot) => {
            const lines = seedIfEmpty(
              slot,
              uniformLinesForSlot(slotMealTypeLines, slot, deliveryDays),
            );
            return (
              <div key={slot} className="flex flex-col gap-1.5">
                <span className="label-overline">
                  {dual ? `${MEAL_SLOT_LABELS[slot]} meals` : "Meals / day"}
                </span>
                <LinesEditor
                  lines={lines}
                  onChange={(next) => onUniformSlotLinesChange(slot, next)}
                  mealTypeOptions={mealTypeOptions}
                  inputClassName={inputClassName}
                  disabled={disabled || !deliveryDays.length}
                  testidPrefix={`cf-${slot}`}
                />
              </div>
            );
          })
        : null}

      {mode === "custom" && !dual && categorized[0] ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WEEKDAYS.filter((d) => deliveryDays.includes(d.i)).map((d) => {
            const slot = categorized[0];
            const lines = normalizeLines(slotMealTypeLines[slot]?.[String(d.i)] || []);
            return (
              <div key={d.i} className="flex flex-col gap-1.5 rounded-xl border border-brand-border/60 p-2">
                <span className="text-xs text-muted-foreground font-medium">{d.s}</span>
                <LinesEditor
                  lines={lines.length ? lines : seedIfEmpty(slot, [])}
                  onChange={(next) => onSlotDayLinesChange(slot, d.i, next)}
                  mealTypeOptions={mealTypeOptions}
                  inputClassName={inputClassName}
                  disabled={disabled}
                  testidPrefix={`cf-${slot}-${d.s}`}
                />
              </div>
            );
          })}
          {!deliveryDays.length ? (
            <p className="text-xs text-muted-foreground col-span-full">Select days to set meal lines.</p>
          ) : null}
        </div>
      ) : null}

      {mode === "custom" && dual ? (
        <div className="flex flex-col gap-3" data-testid="cf-dual-custom-qty">
          {WEEKDAYS.map((d) => {
            const lunch = normalizeLines(slotMealTypeLines.lunch?.[String(d.i)] || []);
            const dinner = normalizeLines(slotMealTypeLines.dinner?.[String(d.i)] || []);
            const active = lunch.length > 0 || dinner.length > 0;
            return (
              <div
                key={d.i}
                className={`rounded-xl border p-3 flex flex-col gap-3 ${
                  active ? "border-brand-border" : "border-brand-border/50 bg-brand-surface/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{d.s}</span>
                  <span className="text-xs text-muted-foreground">
                    {active
                      ? `L ${linesTotalQty(lunch)} · D ${linesTotalQty(dinner)}`
                      : "Off — add lines to schedule"}
                  </span>
                </div>
                <div>
                  <span className="label-overline">Lunch</span>
                  <div className="mt-1">
                    {lunch.length ? (
                      <LinesEditor
                        lines={lunch}
                        onChange={(next) => onSlotDayLinesChange("lunch", d.i, next)}
                        mealTypeOptions={mealTypeOptions}
                        inputClassName={inputClassName}
                        disabled={disabled}
                        testidPrefix={`cf-lunch-${d.s}`}
                        allowEmpty
                      />
                    ) : (
                      <button
                        type="button"
                        data-testid={`cf-lunch-${d.s}-enable`}
                        disabled={disabled}
                        onClick={() => onSlotDayLinesChange("lunch", d.i, seedIfEmpty("lunch", []))}
                        className="mt-1 h-9 px-3 rounded-full text-xs font-semibold border border-brand-border bg-white cursor-pointer"
                      >
                        + Add lunch
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="label-overline">Dinner</span>
                  <div className="mt-1">
                    {dinner.length ? (
                      <LinesEditor
                        lines={dinner}
                        onChange={(next) => onSlotDayLinesChange("dinner", d.i, next)}
                        mealTypeOptions={mealTypeOptions}
                        inputClassName={inputClassName}
                        disabled={disabled}
                        testidPrefix={`cf-dinner-${d.s}`}
                        allowEmpty
                      />
                    ) : (
                      <button
                        type="button"
                        data-testid={`cf-dinner-${d.s}-enable`}
                        disabled={disabled}
                        onClick={() => onSlotDayLinesChange("dinner", d.i, seedIfEmpty("dinner", []))}
                        className="mt-1 h-9 px-3 rounded-full text-xs font-semibold border border-brand-border bg-white cursor-pointer"
                      >
                        + Add dinner
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Clear all lines for a slot on a day to skip that stop.
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground" data-testid="meal-schedule-preview">
        {preview}
      </p>
    </div>
  );
}
