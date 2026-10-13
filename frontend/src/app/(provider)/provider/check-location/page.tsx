"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCaPostal } from "@/lib/ca-provinces";
import CaAddressFields, { type CaAddressValues } from "@/components/CaAddressFields";
import { MapPin, Copy, Clock, Truck } from "@phosphor-icons/react";

type Suggestion = {
  driver_id: string;
  driver_name: string;
  delivery_sequence: number | null;
  extra_distance_m: number | null;
  stop_count: number;
  before: { id: string; name: string } | null;
  after: { id: string; name: string } | null;
  eta: {
    method: "road" | "estimate";
    start: string;
    assumed_start: boolean;
    start_source?: "driver" | "kitchen" | "default" | null;
    arrival: string;
    window: string;
    drive_minutes: number;
    service_minutes: number;
    stops_before: number;
  } | null;
};

type CheckResult = {
  routing_configured?: boolean;
  geocode_status?: string;
  geocode_warning?: string | null;
  suggestions?: Suggestion[];
  eta_start?: string | null;
  eta_start_assumed?: boolean;
  minutes_per_stop?: number;
};

const inputClass =
  "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all w-full text-sm";

function fmtKm(m: number | null | undefined) {
  if (m == null) return null;
  return `${(m / 1000).toFixed(1)} km`;
}

function clock12(hhmm: string | null | undefined) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return hhmm || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

export default function CheckLocationPage() {
  const [slot, setSlot] = useState<"lunch" | "dinner">("dinner");
  const [addr, setAddr] = useState<CaAddressValues>({
    province: "ON",
    city: "",
    postal_code: "",
    address: "",
    apartment: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function check(e?: React.FormEvent) {
    e?.preventDefault();
    if (!addr.address.trim()) {
      toast.error("Enter a street address");
      return;
    }
    if (!addr.city.trim()) {
      toast.error("Select a city");
      return;
    }
    setBusy(true);
    setErrorMsg("");
    setResult(null);
    try {
      const { data } = await api.post("/route-planning/check-location", {
        address: addr.address.trim(),
        apartment: addr.apartment.trim(),
        city: addr.city.trim(),
        province: addr.province,
        postal_code: formatCaPostal(addr.postal_code),
        meal_slot: slot,
        limit: 3,
      });
      setResult(data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : "Could not check this address. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const best = result?.suggestions?.[0] || null;
  const others = (result?.suggestions || []).slice(1);
  const addressLine = [addr.address.trim(), addr.city.trim()].filter(Boolean).join(", ");

  async function copyReply() {
    if (!best?.eta) return;
    const text = `We can deliver to ${addressLine}. Your ${slot} tiffin would arrive around ${best.eta.window}.`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy. Select the text instead.");
    }
  }

  let notice = "";
  if (result) {
    if (result.routing_configured === false) {
      notice = "Address lookup is not set up on this server yet, so the location cannot be checked.";
    } else if (result.geocode_status !== "ok") {
      notice =
        result.geocode_warning === "address_mismatch"
          ? "That address does not match a real street address. Check the street, city and postal code."
          : "Could not confirm that address. Check the street, city, province and postal code.";
    } else if (!result.suggestions?.length) {
      notice = "No drivers have a route for this meal yet, so there is nothing to compare with. Add a driver and customers first.";
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl" data-testid="check-location-page">
      <div>
        <div className="label-overline">Prospects</div>
        <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5">Check location</h1>
        <p className="text-sm text-muted-foreground mt-1">
          See which driver an address would go to and about what time it would be delivered. Nothing is saved, so the
          person does not need to be a customer.
        </p>
      </div>

      <form onSubmit={check} className="card-tinted p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex gap-2" role="radiogroup" aria-label="Meal">
          {(["lunch", "dinner"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={slot === s}
              data-testid={`check-slot-${s}`}
              onClick={() => setSlot(s)}
              className={`h-11 px-5 rounded-full border text-sm font-semibold capitalize cursor-pointer transition-colors ${
                slot === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-brand-border hover:bg-brand-surface"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CaAddressFields
            values={addr}
            onChange={(patch) => setAddr((prev) => ({ ...prev, ...patch }))}
            inputClassName={inputClass}
            testidPrefix="check"
            showRequiredMarks
            postalRequired={false}
          />
        </div>

        <button
          type="submit"
          data-testid="check-submit"
          disabled={busy}
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer self-start"
        >
          <MapPin size={16} weight="bold" className={busy ? "animate-pulse" : ""} />
          {busy ? "Checking…" : "Check location"}
        </button>
      </form>

      {errorMsg ? (
        <div data-testid="check-error" className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm p-3">
          {errorMsg}
        </div>
      ) : null}

      {notice ? (
        <div data-testid="check-notice" className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3">
          {notice}
        </div>
      ) : null}

      {best ? (
        <div className="flex flex-col gap-3" data-testid="check-result">
          <div className="card-tinted p-4 border-primary/30 ring-1 ring-primary/20 bg-white">
            <div className="label-overline">Best fit</div>
            <div className="flex items-center gap-2 mt-1 text-lg font-bold">
              <Truck size={20} /> {best.driver_name}
            </div>
            <div className="text-sm text-muted-foreground mt-1" data-testid="check-stop">
              Would be stop <b>#{best.delivery_sequence ?? "?"}</b> of {best.stop_count + 1} on this route
              {best.before || best.after ? (
                <>
                  {" "}
                  (
                  {best.before ? `after ${best.before.name}` : ""}
                  {best.before && best.after ? ", " : ""}
                  {best.after ? `before ${best.after.name}` : ""}
                  )
                </>
              ) : null}
              {fmtKm(best.extra_distance_m) ? <> · adds about {fmtKm(best.extra_distance_m)} to the route</> : null}
            </div>

            {best.eta ? (
              <div className="mt-3 rounded-xl bg-brand-surface p-3" data-testid="check-eta">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock size={16} /> Estimated delivery
                </div>
                <div className="text-2xl font-black mt-1" data-testid="check-eta-window">
                  {best.eta.window}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  About {best.eta.arrival}. {best.driver_name} leaves at {clock12(best.eta.start)}, about{" "}
                  {best.eta.drive_minutes} min of driving plus {best.eta.service_minutes} min at the{" "}
                  {best.eta.stops_before} stop{best.eta.stops_before === 1 ? "" : "s"} before it.{" "}
                  {best.eta.method === "road"
                    ? "Based on real road travel time."
                    : "Rough estimate from straight-line distance."}
                </div>
                {best.eta.assumed_start ? (
                  <div className="text-xs text-amber-800 mt-1" data-testid="check-assumed">
                    This assumes {best.driver_name} leaves at {clock12(best.eta.start)}.{" "}
                    <Link href="/provider/settings" className="underline">
                      Set the real start time in Settings
                    </Link>
                    .
                  </div>
                ) : null}
                <button
                  type="button"
                  data-testid="check-copy"
                  onClick={copyReply}
                  className="mt-3 h-10 px-4 rounded-full border border-brand-border bg-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-brand-surface"
                >
                  <Copy size={15} /> Copy a reply to send
                </button>
              </div>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground" data-testid="check-no-eta">
                No delivery time for this meal. Time estimates work for lunch and dinner.
              </div>
            )}
          </div>

          {others.length ? (
            <div className="card-tinted p-3 sm:p-4" data-testid="check-others">
              <div className="label-overline mb-2">Other options</div>
              <ul className="flex flex-col gap-2">
                {others.map((s) => (
                  <li key={s.driver_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{s.driver_name}</span>
                    <span className="text-muted-foreground">
                      stop #{s.delivery_sequence ?? "?"}
                      {s.eta ? ` · ${s.eta.window}` : ""}
                      {fmtKm(s.extra_distance_m) ? ` · +${fmtKm(s.extra_distance_m)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            This is an estimate. Traffic and the order of stops can change it on the day, so give customers a window, not
            an exact time.
          </p>
        </div>
      ) : null}
    </div>
  );
}
