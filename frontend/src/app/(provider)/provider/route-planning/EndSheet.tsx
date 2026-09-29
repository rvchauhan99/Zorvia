"use client"

import React, { useState } from "react"
import AppSheet from "@/components/AppSheet"
import { NumericInput } from "@/components/NumericInput"
import type { EndSheetState } from "./types"

type Props = {
  state: EndSheetState | null
  busy: boolean
  onChange: (next: EndSheetState) => void
  onClose: () => void
  onSave: () => void
  onClear: () => void
}

export default function EndSheet({ state, busy, onChange, onClose, onSave, onClear }: Props) {
  const [daysDraft, setDaysDraft] = useState<string | null>(null)

  return (
    <AppSheet
      open={!!state}
      onClose={onClose}
      title="Set pool end"
      size="md"
      closeTestId="route-end-sheet-close"
      footer={
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            type="button"
            className="pill-btn btn-outline h-11 px-4"
            onClick={onClear}
            disabled={busy || !state}
            data-testid="route-end-clear"
          >
            Clear (NA)
          </button>
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
            data-testid="route-end-save"
          >
            Save & optimize
          </button>
        </div>
      }
    >
      {state && (
        <div className="flex flex-col gap-4" data-testid="route-end-sheet">
          <p className="text-sm">
            End <span className="font-medium">{state.poolTitle}</span> at{" "}
            <span className="font-medium">{state.customerName}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Default is NA (open tour — finish at last stop). Setting an end closes the tour for
            optimize, map distance, and driver PDF.
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
                data-testid="route-end-mode-default"
              >
                Default (permanent)
              </button>
              <button
                type="button"
                className={`pill-btn h-10 px-3 text-xs ${
                  state.mode === "temporary" ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => onChange({ ...state, mode: "temporary" })}
                data-testid="route-end-mode-temporary"
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
                  data-testid="route-end-duration-today"
                >
                  Today only
                </button>
                <button
                  type="button"
                  className={`pill-btn h-10 px-3 text-xs ${
                    state.duration === "days" ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => onChange({ ...state, duration: "days" })}
                  data-testid="route-end-duration-days"
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
                      const days = Math.min(14, Math.max(2, parseInt(committed, 10) || 2))
                      onChange({ ...state, days })
                      setDaysDraft(null)
                    }}
                    className="h-10 w-20 px-3 rounded-xl border border-brand-border"
                    data-testid="route-end-days"
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </AppSheet>
  )
}
