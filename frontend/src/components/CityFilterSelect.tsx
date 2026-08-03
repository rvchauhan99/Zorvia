"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import SearchableSelect from "@/components/SearchableSelect";

type CityRow = { name: string; key: string; count: number };

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Prefix for data-testid (default city-filter). */
  testid?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Per-page city filter (customer.city). Options from GET /customers/cities.
 * Value is the display label (e.g. "Toronto", "Unknown city"); empty = all.
 */
export default function CityFilterSelect({
  value,
  onChange,
  testid = "city-filter",
  disabled = false,
  className,
}: Props) {
  const [cities, setCities] = useState<CityRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ cities?: CityRow[] }>("/customers/cities");
        if (!cancelled) setCities(Array.isArray(data?.cities) ? data.cities : []);
      } catch {
        if (!cancelled) setCities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // "All cities" comes only from SearchableSelect allowEmpty/emptyLabel — do not
  // also put an empty option here or it appears twice in the dropdown.
  const options = [
    ...cities.map((c) => ({
      value: c.name,
      label: `${c.name} (${c.count})`,
    })),
  ];

  // Keep a selected value visible even if facet reload briefly omits it.
  if (value && !options.some((o) => o.value === value)) {
    options.push({ value, label: value });
  }

  return (
    <div className={className ?? "min-w-[160px] flex-1 sm:flex-none sm:w-[180px]"}>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        testid={testid}
        placeholder="City…"
        allowEmpty
        emptyLabel="All cities"
        inputClassName="h-10 px-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full text-sm"
      />
    </div>
  );
}
