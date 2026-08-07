"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  /** Prefix for data-testid attributes. */
  testid?: string;
  placeholder?: string;
  /** Allow empty value; shows placeholder when empty. */
  allowEmpty?: boolean;
  emptyLabel?: string;
  inputClassName?: string;
  errorClassName?: string;
  hasError?: boolean;
  /** Dropdown opens below (default) or above the field — use "up" near bottom of viewport. */
  dropdownPlacement?: "down" | "up";
};

const defaultInputClass =
  "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full text-sm";

/**
 * Local searchable combobox (same UX as CustomerAsyncSelect: selected + Change, type to filter).
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  disabled = false,
  testid = "searchable-select",
  placeholder = "Search…",
  allowEmpty = false,
  emptyLabel = "None",
  inputClassName,
  errorClassName,
  hasError = false,
  dropdownPlacement = "down",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const fieldClass =
    hasError && errorClassName
      ? errorClassName
      : inputClassName || defaultInputClass;

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.value.toLowerCase().includes(needle),
    );
  }, [options, q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      // Focus search after opening
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setQ("");
    setOpen(false);
  }

  function openChange() {
    if (disabled) return;
    if (allowEmpty) {
      onChange("");
    }
    setQ("");
    setOpen(true);
  }

  const showSelected = Boolean(value) && selected && !open;

  return (
    <div ref={rootRef} className="relative w-full">
      {showSelected ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`${testid}-selected`}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setOpen(true);
              setQ("");
            }}
            className={`${fieldClass} text-left flex-1 disabled:opacity-60 cursor-pointer`}
          >
            <span className="font-medium truncate block">{selected.label}</span>
          </button>
          {!disabled ? (
            <button
              type="button"
              data-testid={`${testid}-clear`}
              onClick={openChange}
              className="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm text-muted-foreground hover:bg-brand-surface shrink-0 cursor-pointer"
            >
              Change
            </button>
          ) : null}
        </div>
      ) : (
        <input
          ref={inputRef}
          data-testid={testid}
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
          className={fieldClass}
          autoComplete="off"
        />
      )}

      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          data-testid={`${testid}-list`}
          className={`absolute z-50 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border border-brand-border bg-white shadow-lg divide-y divide-brand-border ${
            dropdownPlacement === "up"
              ? "bottom-full mb-1"
              : "top-full mt-1"
          }`}
        >
          {allowEmpty ? (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              data-testid={`${testid}-option-empty`}
              onClick={() => pick("")}
              className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-brand-surface ${
                !value ? "bg-primary/10" : ""
              }`}
            >
              {emptyLabel}
            </button>
          ) : null}
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No matches</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={value === o.value}
                data-testid={`${testid}-option-${o.value}`}
                onClick={() => pick(o.value)}
                className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-brand-surface ${
                  value === o.value ? "bg-primary/10" : ""
                }`}
              >
                <span className="font-medium truncate block">{o.label}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
