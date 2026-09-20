"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Path } from "@phosphor-icons/react"
import AppSheet from "@/components/AppSheet"
import { InlineLoader } from "@/components/loaders"
import type { Driver, Stop } from "./types"

export type OptimizeScope =
  | "this_city"
  | "all_cities"
  | "unassigned_pool"
  | "full_rebalance"
  | "selected_drivers"

export type OptimizeConfirmOpts = {
  /** null/omit-as-null = all cities; string = that city */
  city: string | null
  driverIds?: string[]
  unassignedOnly?: boolean
  fullRebalance?: boolean
}

type Props = {
  open: boolean
  city: string
  busy: boolean
  drivers: Driver[]
  stops: Stop[]
  selected: Set<string>
  onClose: () => void
  onConfirm: (opts: OptimizeConfirmOpts) => void
}

function buildOpts(
  scope: OptimizeScope,
  hasCity: boolean,
  city: string,
  pickedDrivers: Set<string>
): OptimizeConfirmOpts {
  if (scope === "full_rebalance") return { city: null, fullRebalance: true }
  if (scope === "unassigned_pool") return { city: null, unassignedOnly: true }
  const opts: OptimizeConfirmOpts = {
    city: scope === "all_cities" || !hasCity ? null : city,
  }
  if (scope === "selected_drivers") {
    opts.driverIds = Array.from(pickedDrivers)
  }
  return opts
}

function confirmCopy(
  scope: OptimizeScope,
  city: string,
  unassignedCount: number,
  driverCount: number,
  pickedCount: number
): { title: string; body: string } {
  switch (scope) {
    case "this_city":
      return {
        title: "Confirm optimize this city?",
        body: `Re-sequence stops in ${city} within each pool. Assignments stay the same.`,
      }
    case "all_cities":
      return {
        title: "Confirm optimize all cities?",
        body: "Independent road-smart tour for every non-empty pool (drivers + Unassigned). Assignments stay the same.",
      }
    case "unassigned_pool":
      return {
        title: "Confirm optimize Unassigned?",
        body: `Build one kitchen tour for ${unassignedCount} unassigned stop${unassignedCount === 1 ? "" : "s"} (sequences 1…N). Drivers are not changed.`,
      }
    case "full_rebalance":
      return {
        title: "Confirm full rebalance?",
        body: `This unassigns every stop, builds one kitchen tour, even-splits across ${driverCount} active driver${driverCount === 1 ? "" : "s"}, then re-optimizes each route. Existing driver assignments will be replaced.`,
      }
    case "selected_drivers":
      return {
        title: "Confirm optimize selected drivers?",
        body: `Re-sequence ${pickedCount} selected driver pool${pickedCount === 1 ? "" : "s"} only. Unassigned is not touched.`,
      }
    default:
      return { title: "Confirm optimize?", body: "Run route optimize for the selected scope." }
  }
}

export default function OptimizeSheet({
  open,
  city,
  busy,
  drivers,
  stops,
  selected,
  onClose,
  onConfirm,
}: Props) {
  const hasCity = !!city && city !== "all"
  const [scope, setScope] = useState<OptimizeScope>(hasCity ? "this_city" : "all_cities")
  const [pickedDrivers, setPickedDrivers] = useState<Set<string>>(new Set())
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [rebalanceAck, setRebalanceAck] = useState(false)

  const unassignedCount = useMemo(
    () => stops.filter((s) => !s.driver_id).length,
    [stops]
  )

  const driverCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of stops) {
      if (!s.driver_id) continue
      m.set(s.driver_id, (m.get(s.driver_id) || 0) + 1)
    }
    return m
  }, [stops])

  const assignedDriverStopCount = useMemo(() => {
    let n = 0
    for (const c of driverCounts.values()) n += c
    return n
  }, [driverCounts])

  const impliedDrivers = useMemo(() => {
    const ids = new Set<string>()
    for (const id of selected) {
      const stop = stops.find((s) => s.id === id)
      if (stop?.driver_id) ids.add(stop.driver_id)
    }
    return ids
  }, [selected, stops])

  useEffect(() => {
    if (!open) return
    const allOpen = unassignedCount > 0 && assignedDriverStopCount === 0
    if (allOpen) {
      setScope("unassigned_pool")
    } else {
      setScope(hasCity ? "this_city" : "all_cities")
    }
    setPickedDrivers(new Set(impliedDrivers))
    setPendingConfirm(false)
    setRebalanceAck(false)
  }, [open, hasCity, impliedDrivers, unassignedCount, assignedDriverStopCount])

  const canRun =
    scope === "unassigned_pool"
      ? unassignedCount > 0
      : scope === "full_rebalance"
        ? stops.length > 0 && drivers.length > 0
        : scope !== "selected_drivers" ||
          (pickedDrivers.size > 0 &&
            [...pickedDrivers].some((id) => (driverCounts.get(id) || 0) > 0))

  const handleToggleDriver = (id: string) => {
    setPickedDrivers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRequestConfirm = () => {
    if (!canRun || busy) return
    setRebalanceAck(false)
    setPendingConfirm(true)
  }

  const handleBackFromConfirm = () => {
    setPendingConfirm(false)
    setRebalanceAck(false)
  }

  const handleFinalConfirm = () => {
    if (!canRun || busy) return
    if (scope === "full_rebalance" && !rebalanceAck) return
    onConfirm(buildOpts(scope, hasCity, city, pickedDrivers))
  }

  const handleClose = () => {
    if (busy) return
    setPendingConfirm(false)
    setRebalanceAck(false)
    onClose()
  }

  const copy = confirmCopy(
    scope,
    city,
    unassignedCount,
    drivers.length,
    pickedDrivers.size
  )

  const confirmEnabled =
    canRun && (scope !== "full_rebalance" || rebalanceAck)

  const scopeOption = (
    key: OptimizeScope,
    title: string,
    hint: string,
    disabled?: boolean
  ) => {
    const active = scope === key
    return (
      <button
        type="button"
        disabled={disabled || busy || pendingConfirm}
        onClick={() => setScope(key)}
        data-testid={`route-optimize-scope-${key}`}
        className={`w-full text-left rounded-xl px-3 py-3 border transition-colors disabled:opacity-40 ${
          active
            ? "bg-[#00BFA5]/12 border-[#00BFA5] ring-1 ring-[#00BFA5]/40"
            : "bg-[#F4F6F8] border-transparent hover:border-[#E5E9EF]"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 ${
              active ? "border-[#00BFA5] bg-[#00BFA5]" : "border-[#94A3B8] bg-white"
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0B1220]">{title}</p>
            <p className="text-[11px] text-[#5C6570] mt-0.5">{hint}</p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <AppSheet
      open={open}
      onClose={busy ? () => undefined : handleClose}
      title={
        busy
          ? "Optimizing…"
          : pendingConfirm
            ? copy.title
            : "Optimize routes"
      }
      size="md"
      closeTestId="route-optimize-sheet-close"
      footer={
        busy ? null : pendingConfirm ? (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="h-11 px-4 rounded-xl bg-[#F4F6F8] text-sm font-medium text-[#0B1220]"
              onClick={handleBackFromConfirm}
              data-testid="route-optimize-confirm-back"
            >
              Back
            </button>
            <button
              type="button"
              className="h-11 px-4 rounded-xl bg-[#00BFA5] text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              onClick={handleFinalConfirm}
              disabled={!confirmEnabled}
              data-testid="route-optimize-confirm-run"
            >
              <Path size={16} /> Confirm & run
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="h-11 px-4 rounded-xl bg-[#F4F6F8] text-sm font-medium text-[#0B1220]"
              onClick={handleClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-11 px-4 rounded-xl bg-[#00BFA5] text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              onClick={handleRequestConfirm}
              disabled={busy || !canRun}
              data-testid="route-optimize-confirm"
            >
              <Path size={16} /> Run optimize
            </button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4" data-testid="route-optimize-sheet">
        {busy ? (
          <InlineLoader
            label="Optimizing route… This can take a while for large stop lists. Please wait."
            testid="route-optimize-busy"
            className="py-10"
          />
        ) : pendingConfirm ? (
          <div className="flex flex-col gap-3" data-testid="route-optimize-confirm-panel">
            <p className="text-sm text-[#5C6570]">{copy.body}</p>
            {scope === "full_rebalance" && (
              <>
                <p
                  className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2"
                  data-testid="route-optimize-rebalance-warn"
                >
                  This cannot be undone in one click. You would need to reassign or Full rebalance
                  again.
                </p>
                <label className="flex items-start gap-2 text-sm text-[#0B1220] min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={rebalanceAck}
                    onChange={(e) => setRebalanceAck(e.target.checked)}
                    data-testid="route-optimize-rebalance-ack"
                    className="mt-1 h-4 w-4 rounded border-[#E5E9EF]"
                  />
                  <span>I understand this reassigns every stop for this meal</span>
                </label>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-[#5C6570]">
              Most scopes only re-sequence within pools (assignments stay put).{" "}
              <strong className="font-semibold text-[#0B1220]">Full rebalance</strong> unassigns
              everyone, builds one kitchen tour, then even-splits to every active driver.
            </p>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6570] mb-2">
                Scope
              </p>
              <div className="flex flex-col gap-2">
                {scopeOption(
                  "this_city",
                  hasCity ? `This city (${city})` : "This city",
                  hasCity
                    ? "Splices this city’s tour into each pool’s full multi-city order (including Unassigned)."
                    : "Pick a city in the top bar to enable this scope.",
                  !hasCity
                )}
                {scopeOption(
                  "all_cities",
                  "All cities",
                  "Independent road-smart tour for every non-empty pool from the kitchen (drivers + Unassigned)."
                )}
                {scopeOption(
                  "unassigned_pool",
                  `Unassigned pool (${unassignedCount})`,
                  "One road-smart tour from the kitchen (1..N). Then use Bulk to split by sequence.",
                  unassignedCount === 0
                )}
                {scopeOption(
                  "full_rebalance",
                  `Full rebalance (auto-assign · ${drivers.length} drivers)`,
                  "Unassign all → one kitchen tour → even split to every active driver → re-optimize each route.",
                  stops.length === 0 || drivers.length === 0
                )}
                {scopeOption(
                  "selected_drivers",
                  "Selected drivers only",
                  "Optimize only the driver pools you choose below (not Unassigned)."
                )}
              </div>
            </div>

            {scope === "full_rebalance" && (
              <p
                className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2"
                data-testid="route-optimize-rebalance-warn"
              >
                Reassigns every stop for this meal. Contiguous tour slices go to each active driver
                (±1 stop). Existing driver routes are replaced.
              </p>
            )}

            {scope === "selected_drivers" && (
              <div
                className="rounded-xl border border-[#E5E9EF] bg-white p-3 space-y-2"
                data-testid="route-optimize-driver-picks"
              >
                <p className="text-[11px] font-medium text-[#0B1220]">Drivers to optimize</p>
                {drivers.length === 0 ? (
                  <p className="text-xs text-[#5C6570]">No drivers on staff.</p>
                ) : (
                  drivers.map((d) => {
                    const count = driverCounts.get(d.id) || 0
                    const checked = pickedDrivers.has(d.id)
                    return (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-sm text-[#0B1220] min-h-[36px]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy || count === 0}
                          onChange={() => handleToggleDriver(d.id)}
                          data-testid={`route-optimize-driver-${d.id}`}
                          className="h-4 w-4 rounded border-[#E5E9EF]"
                        />
                        <span className="truncate flex-1">{d.name}</span>
                        <span className="text-[11px] text-[#5C6570]">{count} stops</span>
                      </label>
                    )
                  })
                )}
                {pickedDrivers.size === 0 && (
                  <p className="text-[11px] text-amber-800">Select at least one driver with stops.</p>
                )}
              </div>
            )}

            <ul className="text-[11px] text-[#5C6570] space-y-1 list-disc pl-4">
              <li>Uses local VROOM + OSRM (Ontario) when configured.</li>
              <li>
                Unassigned can be optimized as one tour; assign drivers afterward with Bulk by
                sequence.
              </li>
              <li>You can drag-reorder manually afterward.</li>
            </ul>

            <p className="text-[11px] text-[#5C6570]" data-testid="route-planning-attribution">
              Geocoding powered by{" "}
              <a
                href="https://www.geoapify.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Geoapify
              </a>
              . Map data © OpenStreetMap contributors.
            </p>
          </>
        )}
      </div>
    </AppSheet>
  )
}
