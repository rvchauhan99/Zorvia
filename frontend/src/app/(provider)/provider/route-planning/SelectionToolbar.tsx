"use client";

import React from "react";
import { ListNumbers, UserCircle } from "@phosphor-icons/react";
import SearchableSelect from "@/components/SearchableSelect";
import type { Driver } from "./types";

type Props = {
  selectedCount: number;
  drivers: Driver[];
  assignDriverId: string;
  busy: boolean;
  onAssignDriverIdChange: (id: string) => void;
  onAssign: () => void;
  onClear: () => void;
  onOpenRange: () => void;
};

export default function SelectionToolbar({
  selectedCount,
  drivers,
  assignDriverId,
  busy,
  onAssignDriverIdChange,
  onAssign,
  onClear,
  onOpenRange,
}: Props) {
  if (selectedCount <= 0) return null;

  return (
    <div
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,40rem)] rounded-2xl border border-brand-border bg-white shadow-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 overflow-visible"
      data-testid="route-selection-toolbar"
    >
      <div className="flex items-center gap-2 min-w-0">
        <UserCircle size={20} className="text-primary shrink-0" />
        <p className="text-sm font-medium truncate">
          {selectedCount} stop{selectedCount === 1 ? "" : "s"} selected
        </p>
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2"
          onClick={onClear}
          data-testid="route-selection-clear"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 min-w-0 relative z-[60]">
        <SearchableSelect
          value={assignDriverId}
          onChange={onAssignDriverIdChange}
          options={drivers.map((d) => ({ value: d.id, label: d.name }))}
          allowEmpty
          emptyLabel="Unassigned pool"
          placeholder="Search driver…"
          testid="route-assign-driver"
          dropdownPlacement="up"
          inputClassName="h-10 px-3 rounded-xl bg-white border border-brand-border text-sm w-full"
        />
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          className="pill-btn btn-outline h-10 text-xs px-3 gap-1"
          onClick={onOpenRange}
          data-testid="route-open-range-sheet"
          disabled={busy}
        >
          <ListNumbers size={14} /> By sequence…
        </button>
        <button
          type="button"
          className="pill-btn btn-primary h-10 text-xs px-4"
          onClick={onAssign}
          disabled={busy}
          data-testid="route-assign-submit"
        >
          Assign
        </button>
      </div>
    </div>
  );
}
