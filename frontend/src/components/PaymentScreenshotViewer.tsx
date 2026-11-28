"use client";

import React, { useEffect, useState } from "react";
import AppSheet from "@/components/AppSheet";
import { api } from "@/lib/api";

export type PaymentScreenshotTarget = {
  id: string;
  reference?: string;
  screenshot_url?: string | null;
  has_screenshot?: boolean;
};

export const hasScreenshot = (payment: PaymentScreenshotTarget | null | undefined) =>
  Boolean(payment && (payment.screenshot_url || payment.has_screenshot));

type SheetProps = {
  payment: PaymentScreenshotTarget | null;
  onClose: () => void;
  title: string;
  /** Screenshot route prefix; the provider default is `/payments`, consumers use `/consumer/payments`. */
  endpointBase?: string;
};

/** Lists only carry `has_screenshot`; the image loads from `{endpointBase}/{id}/screenshot` on open. */
export function PaymentScreenshotSheet({ payment, onClose, title, endpointBase = "/payments" }: SheetProps) {
  const [url, setUrl] = useState<string | null>(payment?.screenshot_url || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!payment) {
      setUrl(null);
      setFailed(false);
      return;
    }
    if (payment.screenshot_url) {
      setUrl(payment.screenshot_url);
      setFailed(false);
      return;
    }
    if (!payment.has_screenshot || !payment.id) {
      setUrl(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    api
      .get(`${endpointBase}/${payment.id}/screenshot`)
      .then((res) => {
        if (cancelled) return;
        const next = res?.data?.screenshot_url;
        if (typeof next === "string" && next) setUrl(next);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [payment, endpointBase]);

  return (
    <AppSheet
      open={!!payment && hasScreenshot(payment)}
      onClose={onClose}
      title={title}
      size="2xl"
      showHandle={false}
      footer={
        url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="pill-btn btn-outline w-full h-11 inline-flex items-center justify-center"
            data-testid="screenshot-open-tab"
          >
            Open in new tab
          </a>
        ) : undefined
      }
    >
      <div data-testid="payment-screenshot-sheet">
        {payment?.reference ? <p className="text-xs text-muted-foreground mb-3">Ref {payment.reference}</p> : null}
        <div className="rounded-xl overflow-hidden bg-brand-surface flex items-center justify-center p-2">
          {url ? (
            <img
              data-testid="screenshot-img"
              src={url}
              alt="payment screenshot"
              className="max-w-full max-h-[60vh] object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8" data-testid="screenshot-loading">
              {failed ? "Couldn't load this screenshot." : "Loading screenshot…"}
            </p>
          )}
        </div>
      </div>
    </AppSheet>
  );
}
