"use client";

import React from "react";

export type StatusFilterOption = {
  id: string;
  label: string;
  count?: number;
};

type Props = {
  options: StatusFilterOption[];
  value: string;
  onChange: (id: string) => void;
  testid: string;
  itemTestIdPrefix?: string;
};

/** Compact horizontal status chips for Deliveries, Payments, and Customers. */
export function StatusFilterCards({
  options,
  value,
  onChange,
  testid,
  itemTestIdPrefix = "filter",
}: Props) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid={testid}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        const hasCount = typeof opt.count === "number";
        return (
          <button
            key={opt.id}
            type="button"
            data-testid={`${itemTestIdPrefix}-${opt.id}`}
            onClick={() => onChange(opt.id)}
            className={`snap-start shrink-0 inline-flex items-center gap-1.5 h-10 min-h-10 px-3.5 rounded-full text-sm font-medium border cursor-pointer transition-colors active:scale-[0.98] ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white border-brand-border hover:bg-brand-surface"
            }`}
          >
            <span className="whitespace-nowrap">{opt.label}</span>
            {hasCount ? (
              <span className={`tabular-nums font-semibold ${active ? "opacity-90" : "text-muted-foreground"}`}>
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
