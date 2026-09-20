"use client";

import React from "react";
import { Path, WarningCircle } from "@phosphor-icons/react";
import AppSheet from "@/components/AppSheet";

type Props = {
  open: boolean;
  city: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function OptimizeSheet({ open, city, busy, onClose, onConfirm }: Props) {
  const scopeLabel = city === "all" || !city ? "all cities" : city
  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title="Optimize route?"
      size="md"
      closeTestId="route-optimize-sheet-close"
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" className="pill-btn btn-outline h-11 px-4" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="pill-btn btn-primary h-11 px-4 gap-1"
            onClick={onConfirm}
            disabled={busy}
            data-testid="route-optimize-confirm"
          >
            <Path size={16} /> Optimize
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3" data-testid="route-optimize-sheet">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex gap-2">
          <WarningCircle size={18} className="shrink-0 mt-0.5" />
          <div>
          <p className="font-medium">This reorders stops for {scopeLabel}.</p>
            <p className="text-xs mt-1">
              Driver assignments are kept. Sequences are renumbered within each driver pool. You
              can adjust order manually afterward.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Local VROOM + OSRM (Ontario) drives road-smart sequencing. MealHQ keeps the kitchen as
          the depot for global optimization.
        </p>
        <p className="text-[11px] text-muted-foreground" data-testid="route-planning-attribution">
          Geocoding powered by{" "}
          <a
            href="https://www.geoapify.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Geoapify
          </a>
          . Map data © OpenStreetMap contributors.
        </p>
      </div>
    </AppSheet>
  );
}
