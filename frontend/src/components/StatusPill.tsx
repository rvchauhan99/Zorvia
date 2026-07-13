import React from "react";

const map: Record<string, string> = {
  pending: "bg-[#E8A365]/20 text-[#8B5A2B] border-[#E8A365]/40",
  delivered: "bg-secondary/15 text-secondary border-secondary/30",
  missed: "bg-primary/10 text-primary border-primary/30",
  cancelled: "bg-primary/10 text-primary border-primary/30",
  paused: "bg-sky-100 text-sky-900 border-sky-200",
  verified: "bg-secondary/15 text-secondary border-secondary/30",
  rejected: "bg-primary/10 text-primary border-primary/30",
};

export default function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const style = map[status] || "bg-brand-surface text-muted-foreground border-brand-border";
  return (
    <span
      data-testid={`status-${status}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize ${style} ${className}`}
    >
      {status}
    </span>
  );
}
