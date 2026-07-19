"use client";

import React from "react";

type Props = {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
  testid?: string;
  label?: string;
};

export default function LoadMoreButton({
  hasMore,
  loading,
  onClick,
  testid = "load-more",
  label = "Load more",
}: Props) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center pt-2 pb-1">
      <button
        type="button"
        data-testid={testid}
        disabled={loading}
        onClick={onClick}
        className="h-11 px-6 rounded-full border border-brand-border bg-white text-sm font-medium hover:bg-brand-surface disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Loading…" : label}
      </button>
    </div>
  );
}
