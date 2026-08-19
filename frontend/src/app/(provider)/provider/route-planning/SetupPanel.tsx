"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowsClockwise,
  MapPin,
  Path,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { EffectiveStart, Kitchen } from "./types";
import { kitchenAddressLine, startSourceLabel } from "./utils";

type Props = {
  selectedCity: string;
  kitchen: Kitchen;
  effectiveStart: EffectiveStart | null;
  activeOverride: { ends_on?: string } | null;
  routingConfigured: boolean;
  issueCount: number;
  busy: boolean;
  onUseKitchen: () => void;
  onClearTemporary: () => void;
  onGeocode: () => void;
  onOptimize: () => void;
  onChangeStartHint?: () => void;
};

export default function SetupPanel({
  selectedCity,
  kitchen,
  effectiveStart,
  activeOverride,
  routingConfigured,
  issueCount,
  busy,
  onUseKitchen,
  onClearTemporary,
  onGeocode,
  onOptimize,
  onChangeStartHint,
}: Props) {
  const kitchenLine = kitchenAddressLine(kitchen);
  const kitchenCityMatches =
    !!selectedCity &&
    !!kitchen.city &&
    String(kitchen.city).trim().toLowerCase() === String(selectedCity).trim().toLowerCase();

  const startLabel = effectiveStart?.label || null;
  const source = startSourceLabel(effectiveStart?.source);

  return (
    <div className="flex flex-col gap-2" data-testid="route-setup-panel">
      {/* ── Start point indicator ── */}
      <div className="rounded-2xl border border-brand-border bg-white p-3 flex flex-wrap items-center gap-2">
        <MapPin size={18} className="text-primary shrink-0" />
        {startLabel ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{startLabel}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground bg-brand-surface border border-brand-border rounded-full px-2 py-0.5">
                  {source}
                </span>
                {activeOverride?.ends_on && (
                  <span className="text-[10px] text-muted-foreground">
                    until {activeOverride.ends_on}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {activeOverride?.ends_on && (
                <span className="text-[10px] text-muted-foreground">until {activeOverride.ends_on}</span>
              )}
            </div>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              Depot is kitchen for <span className="font-medium text-foreground">all cities</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Optimize uses kitchen as the depot. Driver assignments are kept and sequences are renumbered inside each driver pool.
            </p>
          </div>
        )}
      </div>

      {/* ── Warnings ── */}
      {!routingConfigured && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex gap-2"
          data-testid="route-ors-warning"
        >
          <WarningCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Address geocoding is not configured. You can still assign and reorder manually.{" "}
            <Link href="/provider/settings" className="underline underline-offset-2 font-medium">
              Settings
            </Link>
          </span>
        </div>
      )}

      {/* ── Action buttons row ── */}
      <div className="flex flex-wrap gap-2">
        {(issueCount > 0 || !routingConfigured) && (
          <button
            type="button"
            className="pill-btn btn-outline h-9 text-xs px-3 gap-1"
            disabled={busy || !routingConfigured}
            onClick={onGeocode}
            data-testid="route-geocode"
          >
            <ArrowsClockwise size={14} /> Fix addresses
            {issueCount > 0 && (
              <span className="ml-0.5 text-amber-700 font-medium">({issueCount})</span>
            )}
          </button>
        )}
        <button
          type="button"
          className="pill-btn btn-primary h-9 text-xs px-4 gap-1"
          disabled={busy}
          onClick={onOptimize}
          data-testid="route-optimize"
        >
          <Path size={14} /> Optimize route
        </button>
      </div>

      {/* Kitchen info */}
      {kitchenLine && (
        <p className="text-[11px] text-muted-foreground">
          Kitchen: {kitchenLine}
        </p>
      )}
    </div>
  );
}
