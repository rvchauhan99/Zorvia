"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD } from "@/lib/format";

export type CustomerAsyncOption = {
  id: string;
  name: string;
  email?: string;
  outstanding?: number;
};

type Props = {
  value: CustomerAsyncOption | null;
  onChange: (next: CustomerAsyncOption | null) => void;
  disabled?: boolean;
  /** Prefix for data-testid attributes (default: customer-async). */
  testid?: string;
  placeholder?: string;
  activeOnly?: boolean;
  limit?: number;
};

const inputClass =
  "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full text-sm";

export default function CustomerAsyncSelect({
  value,
  onChange,
  disabled = false,
  testid = "customer-async",
  placeholder = "Search name or email",
  activeOnly = true,
  limit = 20,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [options, setOptions] = useState<CustomerAsyncOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q]);

  const fetchOptions = useCallback(
    async (search: string) => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      setError(false);
      try {
        const params: Record<string, string | number | boolean> = { limit };
        if (activeOnly) params.active = true;
        if (search) params.q = search;
        const { data } = await api.get("/customers", { params });
        if (reqId !== reqIdRef.current) return;
        setOptions(Array.isArray(data) ? data : []);
      } catch {
        if (reqId !== reqIdRef.current) return;
        setOptions([]);
        setError(true);
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [activeOnly, limit],
  );

  useEffect(() => {
    if (!open) return;
    fetchOptions(debouncedQ);
  }, [open, debouncedQ, fetchOptions]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(opt: CustomerAsyncOption) {
    onChange(opt);
    setQ("");
    setDebouncedQ("");
    setOpen(false);
  }

  function clearSelection() {
    onChange(null);
    setQ("");
    setDebouncedQ("");
    setOpen(true);
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <span className="label-overline">Customer</span>
      {value && !open ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`${testid}-selected`}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setOpen(true);
              setQ("");
              setDebouncedQ("");
            }}
            className={`${inputClass} text-left flex-1 disabled:opacity-60 cursor-pointer`}
          >
            <span className="font-medium truncate block">{value.name}</span>
          </button>
          {!disabled ? (
            <button
              type="button"
              data-testid={`${testid}-clear`}
              onClick={clearSelection}
              className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm text-muted-foreground hover:bg-brand-surface shrink-0 cursor-pointer"
            >
              Change
            </button>
          ) : null}
        </div>
      ) : (
        <input
          data-testid={`${testid}-search`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="off"
        />
      )}

      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          data-testid={`${testid}-list`}
          className="absolute z-30 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-brand-border bg-white shadow-lg divide-y divide-brand-border"
        >
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="p-3 text-sm text-destructive">Failed to load customers</div>
          ) : options.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              {debouncedQ ? "No customers found" : "No recent customers"}
            </div>
          ) : (
            options.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={value?.id === c.id}
                data-testid={`${testid}-option-${c.id}`}
                onClick={() => select(c)}
                className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-brand-surface ${
                  value?.id === c.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {typeof c.outstanding === "number" ? `Outstanding ${fmtCAD(c.outstanding)}` : ""}
                  {c.email ? `${typeof c.outstanding === "number" ? " · " : ""}${c.email}` : ""}
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
