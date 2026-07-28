"use client";

import React from "react";
import { Eye } from "@phosphor-icons/react";
import AppSheet from "@/components/AppSheet";
import { fmtDate, fmtMealCount } from "@/lib/format";

export type DeliveryProofTarget = {
  id: string;
  customer_name?: string;
  delivery_date?: string;
  delivery_image_url?: string | null;
  quantity?: number;
  extra_quantity?: number;
  meal_price?: number;
};

type ThumbProps = {
  delivery: DeliveryProofTarget;
  onView: (delivery: DeliveryProofTarget) => void;
  compact?: boolean;
};

export function DeliveryProofThumbButton({ delivery, onView, compact = false }: ThumbProps) {
  const url = delivery.delivery_image_url;
  if (!url) return null;

  const thumbClass = compact ? "h-10 w-10" : "h-12 w-12";

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        data-testid={`delivery-proof-view-${delivery.id}`}
        onClick={() => onView(delivery)}
        className={`${thumbClass} rounded-xl overflow-hidden border border-brand-border bg-brand-surface shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all`}
        aria-label="View delivery photo"
      >
        <img src={url} alt="" className="h-full w-full object-cover" />
      </button>
      <button
        type="button"
        onClick={() => onView(delivery)}
        className="h-11 min-h-11 min-w-11 px-3 rounded-full bg-white border border-brand-border hover:bg-brand-surface inline-flex items-center justify-center gap-1 text-sm cursor-pointer transition-colors"
        aria-label="View delivery photo"
      >
        <Eye size={16} />
        <span className={compact ? "sr-only sm:not-sr-only sm:inline" : "sm:inline"}>View</span>
      </button>
    </div>
  );
}

type SheetProps = {
  delivery: DeliveryProofTarget | null;
  onClose: () => void;
};

export function DeliveryProofSheet({ delivery, onClose }: SheetProps) {
  const url = delivery?.delivery_image_url;

  return (
    <AppSheet
      open={!!delivery && !!url}
      onClose={onClose}
      title={delivery ? `${delivery.customer_name || "Delivery"} · Delivery photo` : "Delivery photo"}
      size="2xl"
      showHandle={false}
      footer={
        url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="pill-btn btn-outline w-full h-11 inline-flex items-center justify-center"
            data-testid="delivery-proof-open-tab"
          >
            Open in new tab
          </a>
        ) : undefined
      }
    >
      <div data-testid="delivery-proof-sheet">
        {delivery?.delivery_date ? (
          <p className="text-xs text-muted-foreground mb-3">
            {fmtDate(delivery.delivery_date)}
            {delivery.quantity != null ? ` · ${fmtMealCount(delivery)}` : ""}
          </p>
        ) : null}
        <div className="rounded-xl overflow-hidden bg-brand-surface flex items-center justify-center p-2">
          {url ? (
            <img
              data-testid="delivery-proof-img"
              src={url}
              alt="Delivery proof"
              className="max-w-full max-h-[60vh] object-contain"
            />
          ) : null}
        </div>
      </div>
    </AppSheet>
  );
}
