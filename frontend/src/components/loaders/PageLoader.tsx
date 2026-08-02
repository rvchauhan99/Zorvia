"use client";

import React from "react";
import Loader from "./Loader";

type Props = {
  label?: string;
  testid?: string;
  className?: string;
};

/** Centered full-area wait (shells, settings, profile). */
export default function PageLoader({
  label = "Loading…",
  testid = "page-loader",
  className = "",
}: Props) {
  return (
    <div
      data-testid={testid}
      className={`min-h-[28vh] flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <Loader size="lg" testid={`${testid}-spinner`} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
