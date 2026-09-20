"use client"

import React from "react"
import { ListNumbers, UserCircle } from "@phosphor-icons/react"
import SearchableSelect from "@/components/SearchableSelect"
import type { Driver } from "./types"

type Props = {
  selectedCount: number
  drivers: Driver[]
  assignDriverId: string
  busy: boolean
  onAssignDriverIdChange: (id: string) => void
  onAssign: () => void
  onAssignUnassigned: () => void
  onClear: () => void
  onOpenRange: () => void
}

export default function SelectionToolbar({
  selectedCount,
  drivers,
  assignDriverId,
  busy,
  onAssignDriverIdChange,
  onAssign,
  onAssignUnassigned,
  onClear,
  onOpenRange,
}: Props) {
  if (selectedCount <= 0) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[min(96vw,28rem)] rounded-2xl border border-[#E5E9EF] bg-white shadow-2xl p-3 flex flex-col gap-2.5"
      data-testid="route-selection-toolbar"
    >
      <div className="flex items-center gap-2 min-w-0">
        <UserCircle size={20} className="text-[#00BFA5] shrink-0" aria-hidden />
        <p className="text-sm font-medium truncate text-[#0B1220] flex-1 min-w-0">
          {selectedCount} stop{selectedCount === 1 ? "" : "s"} selected
        </p>
        <button
          type="button"
          className="text-xs text-[#5C6570] underline underline-offset-2 shrink-0"
          onClick={onClear}
          data-testid="route-selection-clear"
        >
          Clear
        </button>
      </div>

      <div className="w-full min-w-0">
        <SearchableSelect
          value={assignDriverId}
          onChange={onAssignDriverIdChange}
          options={drivers.map((d) => ({ value: d.id, label: d.name }))}
          allowEmpty
          emptyLabel="Unassigned pool"
          placeholder="Search driver…"
          testid="route-assign-driver"
          dropdownPlacement="up"
          inputClassName="h-10 px-3 rounded-xl bg-white border border-[#E5E9EF] text-sm w-full min-w-0"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <button
          type="button"
          className="h-10 px-3 rounded-xl border border-[#E5E9EF] text-xs font-medium text-[#0B1220] hover:bg-[#F4F6F8] disabled:opacity-50 inline-flex items-center justify-center gap-1 col-span-2 sm:col-span-1"
          onClick={onOpenRange}
          data-testid="route-open-range-sheet"
          disabled={busy}
        >
          <ListNumbers size={14} aria-hidden />
          By sequence…
        </button>
        <button
          type="button"
          className="h-10 px-3 rounded-xl border border-[#E5E9EF] text-xs font-medium text-[#0B1220] hover:bg-[#F4F6F8] disabled:opacity-50"
          onClick={onAssignUnassigned}
          disabled={busy}
          data-testid="route-assign-unassigned"
        >
          To Unassigned
        </button>
        <button
          type="button"
          className="h-10 px-4 rounded-xl bg-[#00BFA5] text-white text-xs font-semibold hover:bg-[#00a892] disabled:opacity-50 sm:min-w-[5.5rem]"
          onClick={onAssign}
          disabled={busy}
          data-testid="route-assign-submit"
        >
          Assign
        </button>
      </div>
    </div>
  )
}
