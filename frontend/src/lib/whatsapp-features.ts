/** Whether WhatsApp product features are enabled (backend kill-switch). */

import { api } from "@/lib/api";

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

export async function fetchWhatsappFeaturesEnabled(): Promise<boolean> {
  if (cached !== null) return cached;
  if (inflight) return inflight;
  inflight = api
    .get("/health")
    .then(({ data }) => {
      cached = !!data?.whatsapp_features_enabled;
      return cached;
    })
    .catch(() => {
      cached = false;
      return false;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Reset cache (e.g. after tests). */
export function clearWhatsappFeaturesCache(): void {
  cached = null;
  inflight = null;
}
