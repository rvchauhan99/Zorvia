"use client";

import React from "react";
import AppSheet from "@/components/AppSheet";
import type { Driver, Stop } from "./types";

type Props = {
  stop: Stop | null;
  drivers: Driver[];
  busy: boolean;
  onClose: () => void;
  onPick: (driverId: string | null) => void;
};

export default function MoveStopSheet({ stop, drivers, busy, onClose, onPick }: Props) {
  return (
    <AppSheet
      open={!!stop}
      onClose={onClose}
      title="Move stop"
      size="md"
      closeTestId="route-move-sheet-close"
      footer={
        <button type="button" className="pill-btn btn-outline h-11 px-4 w-full sm:w-auto" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      }
    >
      {stop && (
        <div className="flex flex-col gap-2" data-testid="route-move-sheet">
          <p className="text-sm">
            Move <span className="font-medium">{stop.name || stop.id}</span> to:
          </p>
          <button
            type="button"
            className="w-full text-left px-3 py-3 rounded-xl border border-brand-border hover:bg-brand-surface text-sm font-medium min-h-[44px]"
            data-testid="route-move-unassigned"
            disabled={busy}
            onClick={() => onPick(null)}
          >
            Unassigned pool
          </button>
          {drivers.map((d) => (
            <button
              key={d.id}
              type="button"
              className="w-full text-left px-3 py-3 rounded-xl border border-brand-border hover:bg-brand-surface text-sm font-medium min-h-[44px] truncate"
              data-testid={`route-move-driver-${d.id}`}
              disabled={busy}
              onClick={() => onPick(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
    </AppSheet>
  );
}
