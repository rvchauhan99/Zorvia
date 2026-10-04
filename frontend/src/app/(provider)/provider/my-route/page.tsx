"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { DownloadSimple, MapPin, Path } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isDriver } from "@/lib/roles";
import { fmtDate } from "@/lib/format";
import { useQueryLoad } from "@/hooks/useQueryLoad";
import { InlineLoader, PageLoader } from "@/components/loaders";
import AppSheet from "@/components/AppSheet";
import { CustomerWhatsAppContact } from "@/components/CustomerWhatsAppContact";
import type { RoutePolyline } from "../route-planning/RouteMap";
import type { EffectiveStart, Kitchen, MealSlot, Stop } from "../route-planning/types";
import {
  chunkStopsForGoogleMaps,
  formatDistanceKm,
  formatDurationMin,
  kitchenAddressLine,
  needsGoogleMapsTourChunks,
  stopAddress,
} from "../route-planning/utils";

const RouteMap = dynamic(() => import("../route-planning/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#1A2332] flex items-center justify-center">
      <InlineLoader label="Loading map…" />
    </div>
  ),
});

type MyRouteStop = Stop & {
  meal_type_label?: string;
  meal_type_name?: string;
  quantity?: number;
  notes?: string;
  delivery_status?: string | null;
};

type MyRouteResponse = {
  meal_slot: MealSlot;
  planning_date: string;
  driver_id: string;
  driver_name?: string;
  kitchen?: Kitchen;
  pool_start?: EffectiveStart | null;
  pool_end?: EffectiveStart | null;
  stops?: MyRouteStop[];
  stop_count?: number;
  distance_m?: number | null;
  duration_s?: number | null;
  polyline?: RoutePolyline | null;
  view_only?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mapsUrlForSingleStop(stop: MyRouteStop) {
  const q = stopAddress(stop) || stop.name || "";
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
}

export default function DriverMyRoutePage() {
  const { session } = useAuth();
  const driver = isDriver(session);
  const [slot, setSlot] = useState<MealSlot>("dinner");
  const paintedRef = useRef(false);
  const { loading, run, isAbortError } = useQueryLoad(true);
  const [route, setRoute] = useState<MyRouteResponse | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const load = useCallback(async () => {
    const mode = paintedRef.current ? "soft" : "hard";
    const key = `my-route:${slot}`;
    try {
      const data = await run(
        async (signal) => {
          const { data: body } = await api.get<MyRouteResponse>("/route-planning/my-route", {
            params: { meal_slot: slot },
            signal,
          });
          return body;
        },
        { mode, key },
      );
      if (data === undefined) return;
      setRoute(data);
      paintedRef.current = true;
    } catch (e: any) {
      if (isAbortError(e)) return;
      toast.error(e?.response?.data?.detail || "Failed to load your route");
      if (mode === "hard") setRoute(null);
    }
  }, [slot, run, isAbortError]);

  useEffect(() => {
    if (!driver) return;
    void load();
  }, [driver, load]);

  const stops = useMemo(
    () => (Array.isArray(route?.stops) ? route!.stops! : []),
    [route],
  );
  const kitchen = route?.kitchen || {};
  const poolStart = route?.pool_start || null;
  const originLine =
    (poolStart?.label as string | undefined) || kitchenAddressLine(kitchen) || "";
  const tourChunks = useMemo(
    () => chunkStopsForGoogleMaps(originLine, stops),
    [originLine, stops],
  );
  const tourNeedsParts = useMemo(
    () => needsGoogleMapsTourChunks(originLine, stops),
    [originLine, stops],
  );
  const distanceLabel = formatDistanceKm(route?.distance_m ?? route?.polyline?.distance_m);
  const durationLabel = formatDurationMin(route?.duration_s ?? route?.polyline?.duration_s);
  const polyline = route?.polyline || null;
  const planningDate = route?.planning_date || "";

  const nextStop = useMemo(() => {
    const pending = stops.find((s) => !s.delivery_status || s.delivery_status === "pending");
    return pending || stops[0] || null;
  }, [stops]);

  const handleNavigateNext = () => {
    if (!nextStop) {
      toast.message("No stops to navigate");
      return;
    }
    window.open(mapsUrlForSingleStop(nextStop), "_blank", "noopener,noreferrer");
  };

  const handleOpenTour = () => {
    if (!stops.length) {
      toast.message("No stops to open");
      return;
    }
    setTourOpen(true);
  };

  const handleDownloadPdf = async () => {
    if (!planningDate) return;
    setPdfBusy(true);
    try {
      const res = await api.get("/route-planning/driver-route.pdf", {
        params: { meal_slot: slot, planning_date: planningDate },
        responseType: "blob",
      });
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], { type: "application/pdf" });
      downloadBlob(blob, `mealhq-my-route-${slot}-${planningDate}.pdf`);
      toast.success("Route PDF downloaded");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "PDF download failed");
    } finally {
      setPdfBusy(false);
    }
  };

  if (!driver) {
    return (
      <div className="p-4" data-testid="my-route-admins-blocked">
        <p className="text-sm text-muted-foreground">
          This Route screen is for drivers. Use Route planning as an admin.
        </p>
      </div>
    );
  }

  if (!paintedRef.current && loading && !route) {
    return <PageLoader testid="my-route-loader" />;
  }

  return (
    <div
      className="flex flex-col gap-3 -mx-3 sm:-mx-4 lg:mx-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
      data-testid="my-route-page"
    >
      <header
        className="sticky top-[calc(env(safe-area-inset-top,0px)+3rem)] lg:static z-20 px-3 sm:px-0 py-2 bg-brand-cream/95 backdrop-blur-sm border-b border-brand-border lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
        data-testid="my-route-header"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-primary">
              <Path size={18} weight="fill" />
              <h1 className="font-display font-black text-xl">My route</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="my-route-date">
              {planningDate ? fmtDate(planningDate) : "Today"} · view only
            </p>
          </div>
        </div>
        <div
          className="mt-2 inline-flex p-0.5 rounded-full bg-white border border-brand-border"
          role="tablist"
          aria-label="Meal slot"
          data-testid="my-route-slot-toggle"
        >
          {(["lunch", "dinner"] as MealSlot[]).map((s) => {
            const active = slot === s;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`my-route-slot-${s}`}
                onClick={() => setSlot(s)}
                className={`h-9 min-w-[88px] px-4 rounded-full text-sm font-semibold capitalize transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </header>

      <div
        className="h-[min(40vh,300px)] mx-3 sm:mx-0 rounded-2xl overflow-hidden border border-brand-border bg-[#1A2332] relative"
        data-testid="my-route-map"
      >
        {loading && !route ? (
          <div className="h-full flex items-center justify-center">
            <InlineLoader label="Loading map…" />
          </div>
        ) : (
          <RouteMap
            stops={stops}
            kitchen={kitchen}
            effectiveStart={poolStart}
            driverIds={route?.driver_id ? [route.driver_id] : []}
            roadPolylines={polyline ? [polyline] : []}
            highlightedStopId={nextStop?.id ?? null}
            fullBleed
          />
        )}
      </div>

      <div
        className="mx-3 sm:mx-0 px-3 py-2 rounded-xl bg-white border border-brand-border flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        data-testid="my-route-meta"
      >
        <span className="font-semibold text-foreground">
          {stops.length} stop{stops.length === 1 ? "" : "s"}
        </span>
        <span className="text-muted-foreground">{distanceLabel}</span>
        <span className="text-muted-foreground">{durationLabel}</span>
        {originLine ? (
          <span className="text-muted-foreground truncate max-w-full" title={originLine}>
            Start: {originLine}
          </span>
        ) : null}
      </div>

      <div className="mx-3 sm:mx-0 card-tinted overflow-hidden" data-testid="my-route-stops">
        {loading && !route ? (
          <InlineLoader testid="my-route-stops-loader" />
        ) : stops.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center" data-testid="my-route-empty">
            No stops for this slot today.
          </p>
        ) : (
          <ol className="divide-y divide-brand-border">
            {stops.map((s) => {
              const qty = Number(s.quantity);
              const typeLabel =
                (s.meal_type_label || s.meal_type_name || "").trim() ||
                (Number.isFinite(qty) && qty >= 1 ? `${qty} meal${qty === 1 ? "" : "s"}` : "");
              const status = (s.delivery_status || "").toLowerCase();
              const isNext = nextStop?.id === s.id;
              return (
                <li
                  key={s.id}
                  className={`px-3 py-3 flex flex-col gap-2 ${
                    isNext ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
                  }`}
                  data-testid={`my-route-stop-${s.id}`}
                  data-next={isNext ? "true" : undefined}
                >
                  <div className="flex gap-2 items-start">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center">
                      {s.delivery_sequence ?? "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <CustomerWhatsAppContact
                          customerName={s.name || "Customer"}
                          phone={s.phone}
                          nameAsLink
                          testId={`my-route-stop-name-${s.id}`}
                          phoneTestId={`my-route-stop-phone-${s.id}`}
                          phoneClassName="text-muted-foreground text-xs underline-offset-2 hover:underline"
                        />
                        {status ? (
                          <span
                            className={`text-[10px] uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded-full ${
                              status === "delivered"
                                ? "bg-emerald-100 text-emerald-900"
                                : status === "pending"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {status}
                          </span>
                        ) : null}
                      </div>
                      {typeLabel ? (
                        <p className="text-xs font-medium text-foreground mt-0.5">{typeLabel}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-0.5">{stopAddress(s)}</p>
                      {s.notes ? (
                        <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap">{s.notes}</p>
                      ) : null}
                    </div>
                  </div>
                  <a
                    href={mapsUrlForSingleStop(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 rounded-xl border border-brand-border bg-white text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-brand-surface"
                    data-testid={`my-route-stop-maps-${s.id}`}
                    aria-label={`Open maps for ${s.name || "stop"}`}
                  >
                    <MapPin size={16} /> Open in Maps
                  </a>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div
        className="fixed inset-x-0 z-30 px-3 pt-2 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:static lg:px-0 lg:pb-0 lg:pt-0 bg-gradient-to-t from-brand-cream via-brand-cream/95 to-transparent lg:bg-none"
        style={{ bottom: 0 }}
        data-testid="my-route-actions"
      >
        <div className="flex gap-2 max-w-6xl mx-auto lg:mx-0">
          <button
            type="button"
            onClick={handleNavigateNext}
            disabled={!nextStop}
            className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            data-testid="my-route-navigate-next"
            aria-label="Navigate to next stop"
          >
            <MapPin size={18} weight="bold" />
            Navigate next
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={pdfBusy || stops.length === 0}
            className="h-12 px-4 rounded-full border border-brand-border bg-white font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            data-testid="my-route-download-pdf"
            aria-label="Download route PDF"
          >
            <DownloadSimple size={18} />
            {pdfBusy ? "…" : "PDF"}
          </button>
          <button
            type="button"
            onClick={handleOpenTour}
            disabled={stops.length === 0}
            className="h-12 px-4 rounded-full border border-brand-border bg-white font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            data-testid="my-route-open-tour"
            aria-label={
              tourNeedsParts
                ? "Open tour in Maps as multiple parts"
                : "Open full tour in Maps"
            }
          >
            Tour
          </button>
        </div>
      </div>

      <AppSheet
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        title="Tour in Google Maps"
        size="md"
        autoFocus={false}
        closeTestId="my-route-tour-sheet-close"
      >
        <div className="space-y-3" data-testid="my-route-tour-sheet">
          <p className="text-sm text-muted-foreground">
            Google Maps allows about 10 stops per directions link. Open each part in order
            so the legs connect.
          </p>
          <ol className="space-y-2">
            {tourChunks.map((chunk, idx) => (
              <li key={`${chunk.stopFrom}-${chunk.stopTo}-${idx}`}>
                <a
                  href={chunk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 h-12 px-3 rounded-xl border border-brand-border bg-white text-sm font-semibold hover:bg-brand-surface"
                  data-testid={`my-route-tour-part-${idx + 1}`}
                  aria-label={`Open ${chunk.label} in Google Maps`}
                >
                  <span className="truncate">{chunk.label}</span>
                  <MapPin size={16} className="shrink-0 text-primary" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </AppSheet>
    </div>
  );
}
