"use client"

import React, { useEffect, useMemo } from "react"
import { Plus, Trash } from "@phosphor-icons/react"
import AppSheet from "@/components/AppSheet"
import SearchableSelect from "@/components/SearchableSelect"
import type { BulkRangeRow, Driver, PoolSection } from "./types"
import { countInRange, evenSplitRanges, newBulkRow, seqSpan } from "./utils"

type Props = {
  open: boolean
  busy: boolean
  sections: PoolSection[]
  drivers: Driver[]
  bulkSourceKey: string
  bulkRows: BulkRangeRow[]
  evenSplitDriverIds: string[]
  onClose: () => void
  onBulkSourceKeyChange: (key: string) => void
  onBulkRowsChange: (rows: BulkRangeRow[]) => void
  onEvenSplitDriverIdsChange: (ids: string[]) => void
  onApply: () => void
  onFillEvenSplit: () => void
  /** Called once when sheet opens so parent can set smart defaults */
  onOpened?: () => void
}

function rangeHint(
  row: BulkRangeRow,
  preview: { count: number; valid: boolean }
): { text: string; tone: "muted" | "warn" | "ok" } {
  const fromEmpty = !row.from.trim()
  const toEmpty = !row.to.trim()
  if (fromEmpty && toEmpty) {
    return { text: "Enter From and To", tone: "muted" }
  }
  if (!preview.valid) {
    return { text: "From must be ≤ To (both ≥ 1)", tone: "warn" }
  }
  return {
    text: `${preview.count} stop${preview.count === 1 ? "" : "s"}`,
    tone: preview.count > 0 ? "ok" : "warn",
  }
}

export default function AssignRangeSheet({
  open,
  busy,
  sections,
  drivers,
  bulkSourceKey,
  bulkRows,
  evenSplitDriverIds,
  onClose,
  onBulkSourceKeyChange,
  onBulkRowsChange,
  onEvenSplitDriverIdsChange,
  onApply,
  onFillEvenSplit,
  onOpened,
}: Props) {
  const source = sections.find((s) => s.key === bulkSourceKey) || sections[0]
  const span = source ? seqSpan(source.stops) : null
  const sourceEmpty = !source || source.stops.length === 0
  const wasOpenRef = React.useRef(false)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      onOpened?.()
    }
    wasOpenRef.current = open
  }, [open, onOpened])

  const previews = useMemo(() => {
    const sourceStops = source?.stops || []
    return bulkRows.map((row) => {
      const from = parseInt(row.from, 10)
      const to = parseInt(row.to, 10)
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || from < 1) {
        return { count: 0, valid: false }
      }
      return { count: countInRange(sourceStops, from, to), valid: true }
    })
  }, [bulkRows, source])

  const totalPreview = previews.reduce((n, p) => n + (p.valid ? p.count : 0), 0)

  const toggleEvenDriver = (id: string) => {
    if (evenSplitDriverIds.includes(id)) {
      onEvenSplitDriverIdsChange(evenSplitDriverIds.filter((x) => x !== id))
    } else {
      onEvenSplitDriverIdsChange([...evenSplitDriverIds, id])
    }
  }

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title="Assign by sequence"
      size="lg"
      closeTestId="route-range-sheet-close"
      footer={
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <p className="text-xs text-[#5C6570]">
            Preview: {totalPreview} stop{totalPreview === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-11 px-4 rounded-xl bg-[#F4F6F8] text-sm font-medium text-[#0B1220]"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-11 px-4 rounded-xl bg-[#00BFA5] text-white text-sm font-semibold disabled:opacity-50"
              onClick={onApply}
              disabled={busy || totalPreview === 0}
              data-testid="route-bulk-apply"
            >
              Apply
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4" data-testid="route-range-sheet">
        <p className="text-sm text-[#5C6570]">
          Move contiguous sequence ranges from a source pool to drivers. Stops append to each
          driver&apos;s existing route, then that pool is re-optimized.
        </p>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6570] mb-1.5">
            Source pool
          </p>
          <SearchableSelect
            value={bulkSourceKey}
            onChange={onBulkSourceKeyChange}
            options={sections.map((s) => ({
              value: s.key,
              label: `${s.title} (${s.stops.length})`,
            }))}
            testid="route-bulk-source"
            inputClassName="h-10 px-3 rounded-xl border border-[#E5E9EF] w-full text-sm"
          />
          {span ? (
            <p className="text-[11px] text-[#5C6570] mt-1.5">
              Sequences #{span.min}–#{span.max} ({span.counted} numbered)
            </p>
          ) : (
            <p
              className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5"
              data-testid="route-bulk-source-empty"
            >
              {sourceEmpty
                ? "This pool has no numbered stops — pick another source."
                : "No delivery sequences in this pool yet."}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6570]">
              Ranges
            </p>
            <button
              type="button"
              className="h-8 px-2.5 rounded-lg border border-[#E5E9EF] text-[11px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] inline-flex items-center gap-1"
              onClick={() => onBulkRowsChange([...bulkRows, newBulkRow()])}
              data-testid="route-bulk-add-row"
            >
              <Plus size={12} /> Add range
            </button>
          </div>

          {bulkRows.map((row, i) => {
            const hint = rangeHint(row, previews[i] || { count: 0, valid: false })
            return (
              <div
                key={row.id}
                className="rounded-xl border border-[#E5E9EF] bg-white p-3 flex flex-col gap-2.5"
                data-testid={`route-bulk-row-${i}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                    <label className="flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] font-medium text-[#5C6570]">From</span>
                      <input
                        type="number"
                        min={1}
                        placeholder="#"
                        value={row.from}
                        onChange={(e) => {
                          const next = [...bulkRows]
                          next[i] = { ...row, from: e.target.value }
                          onBulkRowsChange(next)
                        }}
                        className="h-10 px-3 rounded-xl border border-[#E5E9EF] text-sm text-[#0B1220] w-full"
                        data-testid={`route-bulk-from-${i}`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] font-medium text-[#5C6570]">To</span>
                      <input
                        type="number"
                        min={1}
                        placeholder="#"
                        value={row.to}
                        onChange={(e) => {
                          const next = [...bulkRows]
                          next[i] = { ...row, to: e.target.value }
                          onBulkRowsChange(next)
                        }}
                        className="h-10 px-3 rounded-xl border border-[#E5E9EF] text-sm text-[#0B1220] w-full"
                        data-testid={`route-bulk-to-${i}`}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="h-10 w-10 mt-5 rounded-xl hover:bg-[#F4F6F8] inline-flex items-center justify-center text-[#5C6570] shrink-0 disabled:opacity-30"
                    disabled={bulkRows.length <= 1}
                    onClick={() => onBulkRowsChange(bulkRows.filter((r) => r.id !== row.id))}
                    aria-label="Remove range"
                    data-testid={`route-bulk-remove-${i}`}
                  >
                    <Trash size={16} />
                  </button>
                </div>

                <label className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-medium text-[#5C6570]">Assign to</span>
                  <div className="min-w-0 w-full overflow-visible">
                    <SearchableSelect
                      value={row.driverId}
                      onChange={(v) => {
                        const next = [...bulkRows]
                        next[i] = { ...row, driverId: v }
                        onBulkRowsChange(next)
                      }}
                      options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                      allowEmpty
                      emptyLabel="Unassigned"
                      testid={`route-bulk-driver-${i}`}
                      dropdownPlacement="up"
                      inputClassName="h-10 px-3 rounded-xl border border-[#E5E9EF] w-full text-sm min-w-0"
                    />
                  </div>
                </label>

                <p
                  className={`text-[11px] ${
                    hint.tone === "warn"
                      ? "text-amber-800"
                      : hint.tone === "ok"
                        ? "text-[#00BFA5]"
                        : "text-[#5C6570]"
                  }`}
                >
                  {hint.text}
                </p>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-[#E5E9EF] bg-[#F4F6F8] p-3 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6570]">
            Even split helper
          </p>
          <p className="text-xs text-[#5C6570]">
            Split the source sequence span evenly across selected drivers, then review ranges before
            Apply.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {drivers.map((d) => {
              const on = evenSplitDriverIds.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`h-8 px-3 rounded-full text-[11px] font-medium ${
                    on
                      ? "bg-[#0B1220] text-white"
                      : "bg-white border border-[#E5E9EF] text-[#5C6570] hover:text-[#0B1220]"
                  }`}
                  onClick={() => toggleEvenDriver(d.id)}
                  data-testid={`route-even-driver-${d.id}`}
                >
                  {d.name}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="h-10 px-3 rounded-xl border border-[#E5E9EF] bg-white text-xs font-medium text-[#0B1220] self-start disabled:opacity-50"
            disabled={!span || evenSplitDriverIds.length === 0}
            onClick={onFillEvenSplit}
            data-testid="route-even-fill"
          >
            Fill even ranges
          </button>
          {span && evenSplitDriverIds.length > 0 && (
            <p className="text-[11px] text-[#5C6570]">
              Preview:{" "}
              {evenSplitRanges(span.min, span.max, evenSplitDriverIds)
                .map((r) => `#${r.from}–#${r.to}`)
                .join(" · ") || "—"}
            </p>
          )}
        </div>
      </div>
    </AppSheet>
  )
}
