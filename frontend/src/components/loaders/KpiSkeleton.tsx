"use client";

import React from "react";

type Props = {
  count?: number;
  testid?: string;
  className?: string;
};

/** Pulse placeholders matching KpiCard / dashboard StatCard footprint. */
export default function KpiSkeleton({
  count = 4,
  testid = "kpi-skeleton",
  className = "",
}: Props) {
  return (
    <div
      data-testid={testid}
      className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid={`${testid}-${i}`}
          className="card-tinted p-3.5 sm:p-5 min-h-[108px] sm:min-h-[132px] animate-pulse flex flex-col gap-3"
        >
          <div className="h-3 w-20 rounded bg-brand-surface" />
          <div className="h-8 w-24 rounded bg-brand-surface" />
          <div className="h-3 w-28 rounded bg-brand-surface/80" />
        </div>
      ))}
    </div>
  );
}
