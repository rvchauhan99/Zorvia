/**
 * GA4 helpers for MealHQ marketing + signup funnels.
 * Set NEXT_PUBLIC_GA_MEASUREMENT_ID to enable (see docs/SEO.md).
 */

export type GaEvent =
  | "signup_start"
  | "signup_complete"
  | "consumer_signup"
  | "pricing_cta"
  | "contact_submit";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: GaEvent, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params || {});
  } catch {
    /* ignore */
  }
}

export function gaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return id && id.startsWith("G-") ? id : undefined;
}
