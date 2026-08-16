"use client";

import React, { useEffect, useMemo, useState } from "react";
import MenuImageLightbox from "@/components/MenuImageLightbox";
import { fmtQty, slotLabel, unitLabel, type MenuWeek, type MenuWeekMeal } from "@/lib/menuPlan";

type Selections = Record<string, string[]>;

function initialSelections(week: MenuWeek): Selections {
  const out: Selections = {};
  week.days.forEach((day) =>
    day.meals.forEach((meal) =>
      meal.groups.forEach((group) => {
        out[group.id] = [...group.selected];
      }),
    ),
  );
  return out;
}

function mealSlotLabel(meal: MenuWeekMeal): string {
  if (meal.plan_slot !== "all") return slotLabel(meal.plan_slot);
  return meal.slots.map((s) => slotLabel(s as "lunch" | "dinner")).join(" & ");
}

/**
 * Renders a customer's weekly menu and, when editable, lets them switch the
 * optional picks. Shared by the consumer portal and the provider CRM.
 */
export default function MenuWeekPanel({
  week,
  canEdit,
  saving,
  onSave,
  testid = "menu-week",
  helpText,
}: {
  week: MenuWeek;
  canEdit: boolean;
  saving?: boolean;
  onSave?: (choices: Selections) => Promise<void> | void;
  testid?: string;
  helpText?: string;
}) {
  const [selections, setSelections] = useState<Selections>(() => initialSelections(week));
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    setSelections(initialSelections(week));
  }, [week]);

  const baseline = useMemo(() => JSON.stringify(initialSelections(week)), [week]);
  const dirty = JSON.stringify(selections) !== baseline;

  const toggleOption = (groupId: string, itemId: string, choose: number) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(itemId)) {
        // Keep exactly `choose` picks: unchecking the last one would be invalid.
        if (current.length <= 1) return prev;
        return { ...prev, [groupId]: current.filter((id) => id !== itemId) };
      }
      const next = [...current, itemId];
      // Drop the oldest pick so the newest click always takes effect.
      return { ...prev, [groupId]: next.slice(Math.max(0, next.length - choose)) };
    });
  };

  const invalidGroup = (groupId: string, choose: number) =>
    (selections[groupId] || []).length !== choose;

  const hasInvalid = week.days.some((day) =>
    day.meals.some((meal) => meal.groups.some((g) => invalidGroup(g.id, g.choose))),
  );

  return (
    <div className="flex flex-col gap-3" data-testid={testid}>
      {helpText ? <p className="text-sm text-muted-foreground">{helpText}</p> : null}

      {week.days.map((day) => (
        <div
          key={day.weekday}
          className="rounded-xl border border-brand-border bg-white p-3 flex flex-col gap-3"
          data-testid={`${testid}-day-${day.weekday}`}
        >
          <div className="font-display font-bold text-sm">{day.weekday_name}</div>
          {day.meals.map((meal) => (
            <div
              key={`${meal.plan_slot}-${meal.meal_type_id}`}
              className="flex flex-col gap-2"
              data-testid={`${testid}-meal-${day.weekday}-${meal.meal_type_id}-${meal.plan_slot}`}
            >
              <div className="flex items-center gap-2">
                <span className="label-overline">
                  {meal.meal_type_name} · {mealSlotLabel(meal)}
                </span>
                {meal.image_url ? (
                  <button
                    type="button"
                    onClick={() => setViewingImage(meal.image_url)}
                    className="ml-auto shrink-0 cursor-pointer rounded-lg border border-brand-border p-0 overflow-hidden hover:opacity-95"
                    aria-label={`View the ${meal.meal_type_name} menu picture`}
                    data-testid={`${testid}-image-${meal.meal_type_id}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={meal.image_url} alt="" className="h-10 w-10 object-cover" />
                  </button>
                ) : null}
              </div>

              {meal.items.length > 0 ? (
                <ul className="text-sm flex flex-col gap-0.5">
                  {meal.items.map((item) => (
                    <li key={item.item_id} className="flex justify-between gap-2">
                      <span className="truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 font-mono">
                        {fmtQty(item.quantity)} {unitLabel(item.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {meal.groups.map((group) => {
                const picked = selections[group.id] || [];
                return (
                  <div
                    key={group.id}
                    className="rounded-lg bg-brand-surface p-2.5 flex flex-col gap-1.5"
                    data-testid={`${testid}-group-${group.id}`}
                  >
                    <div className="text-xs font-medium">
                      {group.label || "Your choice"} · pick {group.choose}
                    </div>
                    <div className="flex flex-col gap-1">
                      {group.options.map((option) => {
                        const checked = picked.includes(option.item_id);
                        return (
                          <label
                            key={option.item_id}
                            className="flex items-center gap-2 text-sm min-h-[44px] cursor-pointer"
                            data-testid={`${testid}-option-${group.id}-${option.item_id}`}
                          >
                            <input
                              type="checkbox"
                              disabled={!canEdit}
                              checked={checked}
                              onChange={() => toggleOption(group.id, option.item_id, group.choose)}
                            />
                            <span className="flex-1 min-w-0 truncate">{option.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0 font-mono">
                              {fmtQty(option.quantity)} {unitLabel(option.unit)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {invalidGroup(group.id, group.choose) ? (
                      <p className="text-xs text-amber-800">Pick exactly {group.choose}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      {canEdit && onSave ? (
        <div className="flex items-center justify-end gap-2">
          {dirty ? (
            <button
              type="button"
              data-testid={`${testid}-reset`}
              className="pill-btn btn-outline h-11 cursor-pointer"
              onClick={() => setSelections(initialSelections(week))}
            >
              Undo
            </button>
          ) : null}
          <button
            type="button"
            data-testid={`${testid}-save`}
            disabled={!dirty || hasInvalid || !!saving}
            onClick={() => void onSave(selections)}
            className="pill-btn btn-primary h-11 cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving…" : dirty ? "Save choices" : "Saved"}
          </button>
        </div>
      ) : null}

      <MenuImageLightbox
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        src={viewingImage || undefined}
        label="Weekly menu"
      />
    </div>
  );
}
