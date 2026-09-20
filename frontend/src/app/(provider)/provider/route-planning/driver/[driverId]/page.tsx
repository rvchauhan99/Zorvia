"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  DownloadSimple,
  MapPin,
  Printer,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { InlineLoader } from "@/components/loaders";
import { CustomerWhatsAppContact } from "@/components/CustomerWhatsAppContact";
import {
  driverRoutePdfGreeting,
  whatsappChatUrl,
} from "@/lib/whatsapp-link";
import type { RoutePolyline } from "../../RouteMap";
import type { Driver, Kitchen, MealSlot, RoutePlan, Stop } from "../../types";
import {
  formatDistanceKm,
  formatDurationMin,
  kitchenAddressLine,
  mapsUrlForStops,
  sortPool,
  stopAddress,
} from "../../utils";

const RouteMap = dynamic(() => import("../../RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#1A2332] flex items-center justify-center">
      <InlineLoader label="Loading map…" />
    </div>
  ),
});

function plannerHref(mealSlot: string, planningDate: string, city?: string) {
  const q = new URLSearchParams();
  if (mealSlot) q.set("meal_slot", mealSlot);
  if (planningDate) q.set("planning_date", planningDate);
  if (city && city !== "all") q.set("city", city);
  const s = q.toString();
  return s ? `/provider/route-planning?${s}` : "/provider/route-planning";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DriverRouteDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const admin = canMutateAdmin(session);

  const driverIdParam = String(params?.driverId || "unassigned");
  const isUnassigned = driverIdParam === "unassigned";
  const slot = (searchParams.get("meal_slot") || "dinner") as MealSlot;
  const planningDate =
    searchParams.get("planning_date") ||
    new Date().toISOString().slice(0, 10);
  const city = searchParams.get("city") || "all";

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [polyline, setPolyline] = useState<RoutePolyline | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<RoutePlan>("/route-planning", {
        params: {
          meal_slot: slot,
          planning_date: planningDate,
          city: "all",
        },
      });
      setPlan(data);

      const geomBody: Record<string, string> = { meal_slot: slot };
      if (city && city !== "all") geomBody.city = city;
      geomBody.driver_id = isUnassigned ? "unassigned" : driverIdParam;
      const { data: geom } = await api.post<{
        polylines?: RoutePolyline[];
      }>("/route-planning/route-geometry", geomBody);
      const lines = geom?.polylines || [];
      setPolyline(lines[0] || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load driver route");
      setPlan(null);
      setPolyline(null);
    } finally {
      setLoading(false);
    }
  }, [slot, planningDate, city, driverIdParam, isUnassigned]);

  useEffect(() => {
    if (!admin) return;
    void load();
  }, [admin, load]);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: staff } = await api.get("/providers/me/staff");
        if (cancelled) return;
        setDrivers(
          (Array.isArray(staff) ? staff : [])
            .filter((s: any) => (s.role || "admin") === "driver")
            .map((s: any) => ({
              id: s.id,
              name: s.name || s.email || s.id,
              phone: s.phone || "",
            }))
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const allStops: Stop[] = useMemo(
    () => (Array.isArray(plan?.stops) ? plan!.stops! : []),
    [plan]
  );

  const cityFiltered = useMemo(() => {
    if (!city || city === "all") return allStops;
    const key = city.trim().toLowerCase();
    return allStops.filter((s) => {
      const c0 = (s.city || "").trim().toLowerCase();
      const c1 = (s.city_key || "").trim().toLowerCase();
      return c0 === key || c1 === key;
    });
  }, [allStops, city]);

  const stops = useMemo(() => {
    const pool = isUnassigned
      ? cityFiltered.filter((s) => !s.driver_id)
      : cityFiltered.filter((s) => s.driver_id === driverIdParam);
    return sortPool(pool);
  }, [cityFiltered, isUnassigned, driverIdParam]);

  const driverName = isUnassigned
    ? "Unassigned"
    : drivers.find((d) => d.id === driverIdParam)?.name ||
      stops[0]?.driver_name ||
      "Driver";

  const driverPhone = isUnassigned
    ? ""
    : drivers.find((d) => d.id === driverIdParam)?.phone || "";

  const kitchen: Kitchen = plan?.kitchen || {};
  const poolKey = isUnassigned ? "unassigned" : driverIdParam;
  const poolStart = plan?.effective_pool_starts?.[poolKey] || null;
  const originLine =
    (poolStart?.label as string | undefined) ||
    kitchenAddressLine(kitchen) ||
    "";
  const mapsUrl = mapsUrlForStops(originLine, stops);
  const backHref = plannerHref(slot, planningDate, city);

  const distanceLabel = formatDistanceKm(polyline?.distance_m);
  const durationLabel = formatDurationMin(polyline?.duration_s);

  const handleExport = async () => {
    setExportBusy(true);
    try {
      const params: Record<string, string> = {
        meal_slot: slot,
        planning_date: planningDate,
        driver_id: isUnassigned ? "unassigned" : driverIdParam,
      };
      if (city && city !== "all") params.city = city;
      const { data } = await api.get("/route-planning/export.csv", {
        params,
        responseType: "blob",
      });
      const blob =
        data instanceof Blob
          ? data
          : new Blob([data], { type: "text/csv;charset=utf-8" });
      downloadBlob(
        blob,
        `mealhq-route-${isUnassigned ? "unassigned" : driverIdParam.slice(0, 8)}-${planningDate}.csv`,
      );
      toast.success("CSV downloaded");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Export failed");
    } finally {
      setExportBusy(false);
    }
  };

  const handlePrintShare = async () => {
    setPrintBusy(true);
    try {
      const params: Record<string, string> = {
        meal_slot: slot,
        planning_date: planningDate,
        driver_id: isUnassigned ? "unassigned" : driverIdParam,
      };
      const res = await api.get("/route-planning/driver-route.pdf", {
        params,
        responseType: "blob",
      });
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], { type: "application/pdf" });
      downloadBlob(
        blob,
        `mealhq-route-${isUnassigned ? "unassigned" : driverIdParam.slice(0, 8)}-${planningDate}.pdf`,
      );

      if (isUnassigned) {
        toast.success("Route PDF downloaded");
        return;
      }

      const phoneFromHeader =
        (res.headers?.["x-driver-phone"] as string | undefined) || driverPhone;
      const wa = whatsappChatUrl(
        phoneFromHeader,
        driverRoutePdfGreeting(slot, planningDate),
      );
      if (!wa) {
        toast.message("PDF downloaded", {
          description:
            "Add a phone for this driver in Settings → Team to open WhatsApp.",
        });
        return;
      }
      window.open(wa, "_blank", "noopener,noreferrer");
      toast.success("PDF downloaded — attach it in WhatsApp");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Print / share failed",
      );
    } finally {
      setPrintBusy(false);
    }
  };

  if (!admin) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Admins only.</p>
      </div>
    );
  }

  return (
    <div
      className="h-dvh w-full flex flex-col bg-[#F4F6F8] overflow-hidden"
      data-testid="route-driver-detail"
    >
      <header
        className="shrink-0 z-20 px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 border-b border-[#E5E9EF] bg-white print:border-0"
        data-testid="route-driver-detail-header"
      >
        <Link
          href={backHref}
          className="h-9 w-9 rounded-lg hover:bg-[#F4F6F8] inline-flex items-center justify-center text-[#5C6570] print:hidden"
          aria-label="Back to route planning"
          data-testid="route-driver-detail-back"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold text-[#0B1220] truncate">
            {driverName}
          </h1>
          <p className="text-[11px] text-[#5C6570]">
            {slot} · {planningDate}
            {city && city !== "all" ? ` · ${city}` : ""} · {stops.length} stops
            {" · "}
            {distanceLabel}
            {" · "}
            {durationLabel}
          </p>
        </div>
        <div className="flex items-center gap-1.5 print:hidden">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-2.5 rounded-lg text-[12px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] inline-flex items-center gap-1"
            data-testid="route-driver-detail-maps"
          >
            <MapPin size={14} /> Maps
          </a>
          <button
            type="button"
            className="h-9 px-2.5 rounded-lg text-[12px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] inline-flex items-center gap-1 disabled:opacity-50"
            onClick={() => void handleExport()}
            disabled={exportBusy}
            data-testid="route-driver-detail-export"
          >
            <DownloadSimple size={14} />
            {exportBusy ? "…" : "CSV"}
          </button>
          <button
            type="button"
            className="h-9 px-2.5 rounded-lg bg-[#0B1220] text-white text-[12px] font-semibold hover:bg-[#1A2332] inline-flex items-center gap-1 disabled:opacity-60"
            onClick={() => void handlePrintShare()}
            disabled={printBusy}
            data-testid="route-driver-detail-print"
          >
            <Printer size={14} /> {printBusy ? "…" : "Print"}
          </button>
          <button
            type="button"
            className="h-9 px-2.5 rounded-lg border border-[#E5E9EF] text-[11px] text-[#5C6570] hover:bg-[#F4F6F8]"
            onClick={() => window.print()}
            data-testid="route-driver-detail-browser-print"
            title="Browser print (paper)"
          >
            Paper
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div
          className="h-[40vh] lg:h-auto lg:flex-1 min-h-0 relative print:hidden"
          data-testid="route-driver-detail-map"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <InlineLoader label="Loading…" />
            </div>
          ) : (
            <RouteMap
              stops={stops}
              kitchen={kitchen}
              effectiveStart={poolStart}
              driverIds={isUnassigned ? [] : [driverIdParam]}
              roadPolylines={polyline ? [polyline] : []}
              fullBleed
            />
          )}
        </div>

        <aside className="lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#E5E9EF] bg-white overflow-y-auto print:w-full print:border-0">
          <div className="p-3 border-b border-[#E5E9EF] print:block">
            <p className="text-[12px] font-semibold text-[#0B1220]">
              {driverName} · {stops.length} stops
            </p>
            <p className="text-[11px] text-[#5C6570] mt-0.5">
              Distance {distanceLabel} · Time {durationLabel}
              {polyline?.method === "straight"
                ? " (straight-line estimate)"
                : polyline?.method === "osrm"
                  ? " (OSRM roads)"
                  : ""}
            </p>
          </div>
          {loading ? (
            <div className="p-4">
              <InlineLoader label="Loading stops…" />
            </div>
          ) : stops.length === 0 ? (
            <p className="p-4 text-sm text-[#5C6570]">No stops in this pool.</p>
          ) : (
            <ol className="divide-y divide-[#E5E9EF]" data-testid="route-driver-detail-stops">
              {stops.map((s) => (
                <li
                  key={s.id}
                  className="px-3 py-2.5 text-xs"
                  data-testid={`route-driver-stop-${s.id}`}
                >
                  <div className="flex gap-2">
                    <span className="font-semibold text-[#0B1220] w-7 shrink-0">
                      #{s.delivery_sequence ?? "—"}
                    </span>
                    <div className="min-w-0">
                      <CustomerWhatsAppContact
                        customerName={s.name || "Customer"}
                        phone={s.phone}
                        nameAsLink
                        testId={`route-driver-stop-name-${s.id}`}
                        phoneTestId={`route-driver-stop-phone-${s.id}`}
                        phoneClassName="text-[#5C6570] text-[11px] underline-offset-2 hover:underline print:text-inherit print:no-underline"
                      />
                      <p className="text-[#5C6570] mt-0.5">{stopAddress(s)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
