import React from "react";
import { Badge } from "@/components/ui/badge";

const map = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  delivered: "bg-emerald-100 text-emerald-900 border-emerald-200",
  missed: "bg-rose-100 text-rose-900 border-rose-200",
  cancelled: "bg-neutral-200 text-neutral-800 border-neutral-300",
  paused: "bg-sky-100 text-sky-900 border-sky-200",
  verified: "bg-emerald-100 text-emerald-900 border-emerald-200",
  rejected: "bg-rose-100 text-rose-900 border-rose-200",
};

export default function StatusPill({ status, className = "" }) {
  const style = map[status] || "bg-neutral-100 text-neutral-800 border-neutral-200";
  return (
    <span
      data-testid={`status-${status}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize ${style} ${className}`}
    >
      {status}
    </span>
  );
}
