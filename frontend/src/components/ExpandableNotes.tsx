"use client";

import React, { useState } from "react";
import AppSheet from "@/components/AppSheet";

const DEFAULT_MAX_PREVIEW = 80;

export default function ExpandableNotes({
  text,
  title = "Customer notes",
  prefix = "",
  quoted = true,
  className = "",
  testId,
  maxPreviewChars = DEFAULT_MAX_PREVIEW,
  clampLines = 1,
}: {
  text: string;
  title?: string;
  prefix?: string;
  /** Wrap preview in curly quotes (customer notes style). */
  quoted?: boolean;
  className?: string;
  testId?: string;
  maxPreviewChars?: number;
  /** 1 = single-line truncate; 2 = line-clamp-2 preview */
  clampLines?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const needsExpand = trimmed.length > maxPreviewChars;
  // Single-line: hard preview chars. Multi-line clamp: keep full text; CSS clips visually.
  const body =
    needsExpand && clampLines === 1
      ? `${trimmed.slice(0, maxPreviewChars).trimEnd()}…`
      : trimmed;
  const display = quoted ? `\u201c${body}\u201d` : body;
  const clampClass = clampLines === 2 ? "line-clamp-2 whitespace-pre-wrap" : "truncate";

  return (
    <>
      <div className="flex items-start gap-1.5 min-w-0">
        <span
          className={`text-xs text-muted-foreground italic min-w-0 ${clampClass} ${className}`}
          data-testid={testId}
        >
          {prefix}
          {display}
        </span>
        {needsExpand ? (
          <button
            type="button"
            data-testid={testId ? `${testId}-see-more` : undefined}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setOpen(true);
            }}
            className="shrink-0 min-h-[44px] sm:min-h-0 inline-flex items-center text-xs font-semibold text-primary hover:underline px-1 -my-2 sm:my-0"
          >
            See more
          </button>
        ) : null}
      </div>

      <AppSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="md"
        autoFocus={false}
        closeTestId={testId ? `${testId}-sheet-close` : "expandable-notes-close"}
      >
        <p
          className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed"
          data-testid={testId ? `${testId}-sheet` : undefined}
        >
          {trimmed}
        </p>
      </AppSheet>
    </>
  );
}
