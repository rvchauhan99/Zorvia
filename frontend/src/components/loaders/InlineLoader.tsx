"use client";

import React from "react";
import Loader from "./Loader";

type Props = {
  label?: string;
  testid?: string;
  className?: string;
};

/** Compact row for list cards / table loading states. */
export default function InlineLoader({
  label = "Loading…",
  testid = "inline-loader",
  className = "",
}: Props) {
  return (
    <div
      data-testid={testid}
      className={`flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground ${className}`}
    >
      <Loader size="sm" testid={`${testid}-spinner`} />
      <span>{label}</span>
    </div>
  );
}
