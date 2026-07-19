"use client";

import React from "react";

type Props = {
  className?: string;
  testid?: string;
  /** Min height for chart / panel placeholders. */
  minHeight?: string;
};

/** Generic card / chart block pulse. */
export default function SectionSkeleton({
  className = "",
  testid = "section-skeleton",
  minHeight = "min-h-[200px]",
}: Props) {
  return (
    <div
      data-testid={testid}
      className={`card-tinted p-4 sm:p-5 animate-pulse ${minHeight} ${className}`}
    >
      <div className="h-4 w-32 rounded bg-brand-surface mb-4" />
      <div className="h-3 w-full rounded bg-brand-surface/80 mb-2" />
      <div className="h-3 w-5/6 max-w-md rounded bg-brand-surface/80 mb-2" />
      <div className="h-3 w-2/3 max-w-sm rounded bg-brand-surface/70 mt-6" />
      <div className="mt-6 h-24 w-full rounded-xl bg-brand-surface/60" />
    </div>
  );
}
