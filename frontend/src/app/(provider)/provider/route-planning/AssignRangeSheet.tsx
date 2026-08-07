"use client";

import React, { useMemo } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import AppSheet from "@/components/AppSheet";
import SearchableSelect from "@/components/SearchableSelect";
import type { BulkRangeRow, Driver, PoolSection } from "./types";
import { countInRange, evenSplitRanges, newBulkRow, seqSpan } from "./utils";

type Props = {
  open: boolean;
  busy: boolean;
  sections: PoolSection[];
  drivers: Driver[];
  bulkSourceKey: string;
  bulkRows: BulkRangeRow[];
  evenSplitDriverIds: string[];
  onClose: () => void;
  onBulkSourceKeyChange: (key: string) => void;
  onBulkRowsChange: (rows: BulkRangeRow[]) => void;
  onEvenSplitDriverIdsChange: (ids: string[]) => void;
  onApply: () => void;
  onFillEvenSplit: () => void;
};

export default function AssignRangeSheet({
  open,
  busy,
  sections,
  drivers,
  bulkSourceKey,
  bulkRows,
  evenSplitDriverIds,
  onClose,
  onBulkSourceKeyChange,
  onBulkRowsChange,
  onEvenSplitDriverIdsChange,
  onApply,
  onFillEvenSplit,
}: Props) {
  const source = sections.find((s) => s.key === bulkSourceKey) || sections[0];
  const span = source ? seqSpan(source.stops) : null;

  const previews = useMemo(() => {
    const sourceStops = source?.stops || [];
    return bulkRows.map((row) => {
      const from = parseInt(row.from, 10);
      const to = parseInt(row.to, 10);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || from < 1) {
        return { count: 0, valid: false };
      }
      return { count: countInRange(sourceStops, from, to), valid: true };
    });
  }, [bulkRows, source]);

  const totalPreview = previews.reduce((n, p) => n + (p.valid ? p.count : 0), 0);

  const toggleEvenDriver = (id: string) => {
    if (evenSplitDriverIds.includes(id)) {
      onEvenSplitDriverIdsChange(evenSplitDriverIds.filter((x) => x !== id));
    } else {
      onEvenSplitDriverIdsChange([...evenSplitDriverIds, id]);
    }
  };

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title="Assign by sequence"
      size="lg"
      closeTestId="route-range-sheet-close"
      footer={
        <div className="flex flex-wrap gap-2 justify-between">
          <p className="text-xs text-muted-foreground self-center">
            Preview: {totalPreview} stop{totalPreview === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <button type="button" className="pill-btn btn-outline h-11 px-4" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="pill-btn btn-primary h-11 px-4"
              onClick={onApply}
              disabled={busy || totalPreview === 0}
              data-testid="route-bulk-apply"
            >
              Apply
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4" data-testid="route-range-sheet">
        <p className="text-xs text-muted-foreground">
          Move contiguous sequence ranges from a source pool to drivers. Stops append to each
          driver&apos;s existing route.
        </p>

        <div>
          <p className="label-overline mb-1">Source pool</p>
          <SearchableSelect
            value={bulkSourceKey}
            onChange={onBulkSourceKeyChange}
            options={sections.map((s) => ({
              value: s.key,
              label: `${s.title} (${s.stops.length})`,
            }))}
            testid="route-bulk-source"
            inputClassName="h-10 px-3 rounded-xl border border-brand-border w-full text-sm"
          />
          {span && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Sequences #{span.min}–#{span.max} ({span.counted} numbered)
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="label-overline">Ranges</p>
            <button
              type="button"
              className="pill-btn btn-outline h-8 text-[11px] px-2 gap-1"
              onClick={() => onBulkRowsChange([...bulkRows, newBulkRow()])}
              data-testid="route-bulk-add-row"
            >
              <Plus size={12} /> Add range
            </button>
          </div>
          {bulkRows.map((row, i) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_1fr_minmax(0,1.4fr)_auto] gap-2 items-center"
              data-testid={`route-bulk-row-${i}`}
            >
              <input
                type="number"
                placeholder="From"
                value={row.from}
                onChange={(e) => {
                  const next = [...bulkRows];
                  next[i] = { ...row, from: e.target.value };
                  onBulkRowsChange(next);
                }}
                className="h-10 px-3 rounded-xl border border-brand-border text-sm"
                data-testid={`route-bulk-from-${i}`}
              />
              <input
                type="number"
                placeholder="To"
                value={row.to}
                onChange={(e) => {
                  const next = [...bulkRows];
                  next[i] = { ...row, to: e.target.value };
                  onBulkRowsChange(next);
                }}
                className="h-10 px-3 rounded-xl border border-brand-border text-sm"
                data-testid={`route-bulk-to-${i}`}
              />
              <SearchableSelect
                value={row.driverId}
                onChange={(v) => {
                  const next = [...bulkRows];
                  next[i] = { ...row, driverId: v };
                  onBulkRowsChange(next);
                }}
                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                allowEmpty
                emptyLabel="Unassigned"
                testid={`route-bulk-driver-${i}`}
                inputClassName="h-10 px-3 rounded-xl border border-brand-border w-full text-sm"
              />
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-brand-surface inline-flex items-center justify-center text-muted-foreground"
                disabled={bulkRows.length <= 1}
                onClick={() => onBulkRowsChange(bulkRows.filter((r) => r.id !== row.id))}
                aria-label="Remove range"
              >
                <Trash size={16} />
              </button>
              <p className="col-span-4 text-[11px] text-muted-foreground -mt-1">
                {previews[i]?.valid
                  ? `${previews[i].count} stop${previews[i].count === 1 ? "" : "s"}`
                  : "Enter a valid from ≤ to"}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-surface/30 p-3 flex flex-col gap-2">
          <p className="label-overline">Even split helper</p>
          <p className="text-xs text-muted-foreground">
            Split the source sequence span evenly across selected drivers, then review ranges
            before Apply.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {drivers.map((d) => {
              const on = evenSplitDriverIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`pill-btn h-8 text-[11px] px-3 ${on ? "btn-primary" : "btn-outline"}`}
                  onClick={() => toggleEvenDriver(d.id)}
                  data-testid={`route-even-driver-${d.id}`}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="pill-btn btn-outline h-10 text-xs px-3 self-start"
            disabled={!span || evenSplitDriverIds.length === 0}
            onClick={onFillEvenSplit}
            data-testid="route-even-fill"
          >
            Fill even ranges
          </button>
          {span && evenSplitDriverIds.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Preview:{" "}
              {evenSplitRanges(span.min, span.max, evenSplitDriverIds)
                .map((r) => `#${r.from}–#${r.to}`)
                .join(" · ") || "—"}
            </p>
          )}
        </div>
      </div>
    </AppSheet>
  );
}
