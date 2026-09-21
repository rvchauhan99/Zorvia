"use client";

import React, { useState } from "react";
import AppSheet from "@/components/AppSheet";
import { NumericInput } from "@/components/NumericInput";
import type { StartSheetState } from "./types";

type Props = {
  state: StartSheetState | null;
  busy: boolean;
  onChange: (next: StartSheetState) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function StartSheet({ state, busy, onChange, onClose, onSave }: Props) {
  const [daysDraft, setDaysDraft] = useState<string | null>(null);

  return (
    <AppSheet
      open={!!state}
      onClose={onClose}
      title="Set pool start"
      size="md"
      closeTestId="route-start-sheet-close"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="pill-btn btn-outline h-11 px-4"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pill-btn btn-primary h-11 px-4"
            onClick={onSave}
            disabled={busy || !state}
            data-testid="route-start-save"
          >
            Save & optimize
          </button>
        </div>
      }
    >
      {state && (
        <div className="flex flex-col gap-4" data-testid="route-start-sheet">
          <p className="text-sm">
            Start <span className="font-medium">{state.poolTitle}</span> from{" "}
            <span className="font-medium">{state.customerName}</span>
          </p>

          <div className="flex flex-col gap-2">
            <p className="label-overline">Type</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`pill-btn h-10 px-3 text-xs ${
                  state.mode === "default" ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => onChange({ ...state, mode: "default" })}
                data-testid="route-start-mode-default"
              >
                Default (permanent)
              </button>
              <button
                type="button"
                className={`pill-btn h-10 px-3 text-xs ${
                  state.mode === "temporary" ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => onChange({ ...state, mode: "temporary" })}
                data-testid="route-start-mode-temporary"
              >
                Temporary
              </button>
            </div>
          </div>

          {state.mode === "temporary" && (
            <div className="flex flex-col gap-2">
              <p className="label-overline">Duration</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`pill-btn h-10 px-3 text-xs ${
                    state.duration === "today" ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => onChange({ ...state, duration: "today" })}
                  data-testid="route-start-duration-today"
                >
                  Today only
                </button>
                <button
                  type="button"
                  className={`pill-btn h-10 px-3 text-xs ${
                    state.duration === "days" ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => onChange({ ...state, duration: "days" })}
                  data-testid="route-start-duration-days"
                >
                  Next N days
                </button>
              </div>
              {state.duration === "days" && (
                <label className="text-sm flex items-center gap-2">
                  Days
                  <NumericInput
                    mode="integer"
                    min={2}
                    max={14}
                    emptyFallback="2"
                    value={daysDraft ?? String(state.days)}
                    onValueChange={setDaysDraft}
                    onBlurCommit={(committed) => {
                      const days = Math.min(14, Math.max(2, parseInt(committed, 10) || 2));
                      onChange({ ...state, days });
                      setDaysDraft(null);
                    }}
                    className="h-10 w-20 px-3 rounded-xl border border-brand-border"
                    data-testid="route-start-days"
                  />
                </label>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Saving re-optimizes this pool&apos;s sequence from the new start. Other drivers are not
            changed.
          </p>
        </div>
      )}
    </AppSheet>
  );
}
