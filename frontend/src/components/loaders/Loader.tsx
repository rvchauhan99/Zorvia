"use client";

import React from "react";
import { CircleNotch } from "@phosphor-icons/react";

const SIZE = {
  sm: 16,
  md: 24,
  lg: 36,
} as const;

type Props = {
  size?: keyof typeof SIZE;
  label?: string;
  className?: string;
  testid?: string;
};

/** Brand spinner — Phosphor CircleNotch + animate-spin. */
export default function Loader({
  size = "md",
  label,
  className = "",
  testid = "loader",
}: Props) {
  return (
    <div
      data-testid={testid}
      className={`inline-flex items-center justify-center gap-2 text-primary ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <CircleNotch size={SIZE[size]} weight="bold" className="animate-spin shrink-0" />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );
}
