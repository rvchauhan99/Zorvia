"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CaretDown,
  CaretRight,
  DotsThree,
  Eye,
  EyeSlash,
  MapPin,
  NavigationArrow,
  WarningCircle,
} from "@phosphor-icons/react";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { CustomerWhatsAppContact } from "@/components/CustomerWhatsAppContact";
import { OPS_DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import MoveStopSheet from "./MoveStopSheet";
import type { Driver, PoolSection, Stop } from "./types";
import {
  driverColor,
  isIssueStop,
  mapsUrlForStops,
  seqSpan,
  stopAddress,
  stopMatchesQuery,
} from "./utils";

type Props = {
  sections: PoolSection[];
  drivers: Driver[];
  selected: Set<string>;
  highlightedStopId: string | null;
  listFilter: string;
  searchQuery: string;
  originLine: string;
  busy: boolean;
  routingConfigured: boolean;
  hiddenDriverKeys?: Set<string>;
  onToggleDriverVisibility?: (sectionKey: string) => void;
  onToggleStop: (id: string) => void;
  onToggleSection: (stops: Stop[]) => void;
  onHighlight: (id: string | null) => void;
  onReorder: (section: PoolSection, orderedIds: string[]) => void;
  onReassign: (customerIds: string[], driverId: string | null) => void;
  onOpenStart: (stop: Stop) => void;
  onPlace: (stop: Stop) => void;
  onBestFit?: (stop: Stop) => void;
  onBestFitAllUnassigned?: () => void;
  onMoveDriver: (stop: Stop, driverId: string | null) => void;
  viewHrefForSection?: (section: PoolSection) => string;
};

function SectionDropHeader({
  sectionKey,
  children,
  className,
}: {
  sectionKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `section:${sectionKey}` });
  return (
    <div
      ref={setNodeRef}
      className={`${className || ""} ${isOver ? "bg-primary/10" : ""}`}
    >
      {children}
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="opacity-70">
      <circle cx="5" cy="3.5" r="1.25" fill="currentColor" />
      <circle cx="11" cy="3.5" r="1.25" fill="currentColor" />
      <circle cx="5" cy="8" r="1.25" fill="currentColor" />
      <circle cx="11" cy="8" r="1.25" fill="currentColor" />
      <circle cx="5" cy="12.5" r="1.25" fill="currentColor" />
      <circle cx="11" cy="12.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function SortableStopRow({
  stop,
  selected,
  highlighted,
  busy,
  routingConfigured,
  dragDisabled,
  onToggle,
  onHighlight,
  onOpenStart,
  onPlace,
  onOpenMove,
  onBestFit,
}: {
  stop: Stop;
  selected: boolean;
  highlighted: boolean;
  busy: boolean;
  routingConfigured: boolean;
  dragDisabled: boolean;
  onToggle: () => void;
  onHighlight: () => void;
  onOpenStart: () => void;
  onPlace: () => void;
  onOpenMove: () => void;
  onBestFit?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: dragDisabled,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const issue = isIssueStop(stop);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const needsPlace =
    routingConfigured && (stop.delivery_sequence == null || stop.geocode_status !== "ok");

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative px-2 py-1.5 flex items-center gap-1.5 text-xs border-b border-[#E5E9EF] last:border-0 ${
        highlighted ? "bg-[#00BFA5]/10" : "bg-white"
      } ${selected ? "ring-1 ring-inset ring-[#00BFA5]/30" : ""}`}
      data-testid={`route-stop-row-${stop.id}`}
      onClick={onHighlight}
      id={`route-stop-${stop.id}`}
    >
      <button
        type="button"
        className="shrink-0 h-9 w-8 touch-none cursor-grab active:cursor-grabbing text-[#5C6570] hover:text-[#0B1220] hover:bg-[#F4F6F8] rounded-lg inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Drag to reorder"
        title={dragDisabled ? "Clear search to drag-reorder" : "Drag up or down"}
        data-testid={`route-stop-drag-${stop.id}`}
        disabled={dragDisabled || busy}
        {...(dragDisabled ? {} : { ...attributes, ...listeners })}
        onClick={(e) => e.stopPropagation()}
      >
        <DragHandleIcon />
      </button>

      <label className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-[#E5E9EF]"
          data-testid={`route-stop-check-${stop.id}`}
        />
      </label>

      <span className="font-mono text-[#5C6570] shrink-0 w-7 text-[11px]">
        {stop.delivery_sequence != null ? `#${stop.delivery_sequence}` : "—"}
      </span>

      <div className="min-w-0 flex-1">
        <CustomerWhatsAppContact
          customerName={stop.name || stop.id}
          phone={stop.phone}
          nameAsLink
          testId={`route-stop-name-${stop.id}`}
          phoneTestId={`route-stop-phone-${stop.id}`}
          phoneClassName="text-[#5C6570] text-[11px] underline-offset-2 hover:underline truncate"
        />
        <p className="text-[#5C6570] truncate text-[11px] leading-tight">
          {stopAddress(stop) || "No address"}
        </p>
        {issue && (
          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-amber-700">
            <WarningCircle size={11} />
            {stop.geocode_status !== "ok" ? "Geocode" : "Unplaced"}
          </span>
        )}
      </div>

      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="h-9 w-9 rounded-lg text-[#5C6570] hover:bg-[#F4F6F8] inline-flex items-center justify-center"
          aria-label="Stop actions"
          aria-expanded={menuOpen}
          data-testid={`route-stop-menu-${stop.id}`}
          disabled={busy}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <DotsThree size={18} weight="bold" />
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-xl border border-[#E5E9EF] bg-white shadow-lg py-1 text-[12px]">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-[#F4F6F8] text-[#0B1220]"
                data-testid={`route-stop-start-${stop.id}`}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenStart();
                }}
              >
                Set as start
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-[#F4F6F8] text-[#0B1220]"
                data-testid={`route-stop-move-${stop.id}`}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenMove();
                }}
              >
                Move…
              </button>
              {needsPlace && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-[#F4F6F8] text-[#0B1220]"
                  data-testid={`route-stop-place-${stop.id}`}
                  onClick={() => {
                    setMenuOpen(false);
                    onPlace();
                  }}
                >
                  Place in route
                </button>
              )}
              {!stop.driver_id && onBestFit ? (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-[#F4F6F8] text-[#0B1220]"
                  data-testid={`route-stop-best-fit-${stop.id}`}
                  onClick={() => {
                    setMenuOpen(false);
                    onBestFit();
                  }}
                >
                  Best fit
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

export default function StopListPane({
  sections,
  drivers,
  selected,
  highlightedStopId,
  listFilter,
  searchQuery,
  originLine,
  busy,
  routingConfigured,
  hiddenDriverKeys,
  onToggleDriverVisibility,
  onToggleStop,
  onToggleSection,
  onHighlight,
  onReorder,
  onReassign,
  onOpenStart,
  onPlace,
  onBestFit,
  onBestFitAllUnassigned,
  onMoveDriver,
  viewHrefForSection,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overSectionKey, setOverSectionKey] = useState<string | null>(null);
  const [moveStop, setMoveStop] = useState<Stop | null>(null);
  const paging = useCursorPagination({ initialPageSize: OPS_DEFAULT_PAGE_SIZE });
  const [pagingSectionKey, setPagingSectionKey] = useState<string | null>(null);

  const dragDisabled = searchQuery.trim().length > 0;

  const visibleSections = useMemo(() => {
    let base = sections;
    if (listFilter === "unassigned") base = sections.filter((s) => s.key === "unassigned");
    else if (listFilter === "issues") {
      base = sections
        .map((s) => ({ ...s, stops: s.stops.filter(isIssueStop) }))
        .filter((s) => s.stops.length > 0);
    } else if (listFilter !== "all") {
      base = sections.filter((s) => s.key === listFilter);
    }

    if (!searchQuery.trim()) return base;
    // Keep Unassigned header visible as a drop target even when empty/no matches.
    return base
      .map((s) => ({
        ...s,
        stops: s.stops.filter((st) => stopMatchesQuery(st, searchQuery)),
      }))
      .filter((s) => s.stops.length > 0 || s.key === "unassigned");
  }, [sections, listFilter, searchQuery]);

  useEffect(() => {
    if (!highlightedStopId) return;
    const el = document.getElementById(`route-stop-${highlightedStopId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlightedStopId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findSectionForStop = (stopId: string) =>
    sections.find((s) => s.stops.some((st) => st.id === stopId));

  const onDragStart = (event: DragStartEvent) => {
    if (dragDisabled) return;
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) {
      setOverSectionKey(null);
      return;
    }
    if (overId.startsWith("section:")) {
      setOverSectionKey(overId.replace("section:", ""));
      return;
    }
    const sec = findSectionForStop(overId);
    setOverSectionKey(sec?.key ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverSectionKey(null);
    if (dragDisabled || !over) return;
    const activeStopId = String(active.id);
    const overId = String(over.id);
    const fromSection = findSectionForStop(activeStopId);
    if (!fromSection) return;

    let toSection = fromSection;
    if (overId.startsWith("section:")) {
      const key = overId.replace("section:", "");
      toSection = sections.find((s) => s.key === key) || fromSection;
    } else {
      toSection = findSectionForStop(overId) || fromSection;
    }

    if (fromSection.key !== toSection.key) {
      onReassign([activeStopId], toSection.driverId);
      return;
    }

    const oldIndex = fromSection.stops.findIndex((s) => s.id === activeStopId);
    const newIndex = overId.startsWith("section:")
      ? fromSection.stops.length - 1
      : fromSection.stops.findIndex((s) => s.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const next = arrayMove(fromSection.stops, oldIndex, newIndex);
    onReorder(
      fromSection,
      next.map((s) => s.id)
    );
  };

  const activeStop = activeId
    ? sections.flatMap((s) => s.stops).find((s) => s.id === activeId)
    : null;

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!pagingSectionKey && visibleSections[0]) {
      setPagingSectionKey(visibleSections[0].key);
    }
  }, [visibleSections, pagingSectionKey]);

  const pagingSection = visibleSections.find((s) => s.key === pagingSectionKey) || null;

  useEffect(() => {
    paging.resetToFirstPage();
  }, [pagingSectionKey, searchQuery, paging.resetToFirstPage]);

  useEffect(() => {
    if (!pagingSection) return;
    const total = pagingSection.stops.length;
    const start = (paging.currentPage - 1) * paging.pageSize;
    if (total > 0 && start >= total) {
      paging.resetToFirstPage();
      return;
    }
    const hasMore = paging.currentPage * paging.pageSize < total;
    paging.applyPageResult({
      total,
      has_more: hasMore,
      next_cursor: hasMore ? `p${paging.currentPage}` : null,
    });
  }, [
    pagingSection,
    paging.currentPage,
    paging.pageSize,
    paging.applyPageResult,
    paging.resetToFirstPage,
  ]);

  const sliceFor = (section: PoolSection) => {
    if (section.key !== pagingSectionKey || section.stops.length <= paging.pageSize) {
      return section.stops;
    }
    const start = (paging.currentPage - 1) * paging.pageSize;
    return section.stops.slice(start, start + paging.pageSize);
  };

  if (!visibleSections.length) {
    return (
      <div className="rounded-xl bg-[#F4F6F8] p-4 text-sm text-[#5C6570]" data-testid="route-list-empty">
        {searchQuery.trim()
          ? "No stops match this search."
          : "No stops match this filter."}
      </div>
    );
  }

  const driverIds = drivers.map((d) => d.id);
  const hidden = hiddenDriverKeys || new Set<string>();

  return (
    <div className="flex flex-col gap-2" data-testid="route-stop-list">
      {dragDisabled ? (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Search is active — drag to reorder is paused. Clear search to drag.
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        {visibleSections.map((section) => {
          const isCollapsed = collapsed.has(section.key);
          const span = seqSpan(section.stops);
          const spanLabel = span
            ? span.min === span.max
              ? `#${span.min}`
              : `#${span.min}–#${span.max}`
            : "No sequence";
          const mapsStops = section.stops.filter((s) => s.delivery_sequence != null);
          const fullSection = sections.find((s) => s.key === section.key) || section;
          const sectionIds = section.stops.map((s) => s.id);
          const allSelected =
            sectionIds.length > 0 && sectionIds.every((id) => selected.has(id));
          const paged = sliceFor(section);
          const dropTarget = overSectionKey === section.key;
          const poolColor = driverColor(section.driverId, driverIds);
          const isHidden = hidden.has(section.key);

          return (
            <div
              key={section.key}
              className={`rounded-xl border border-[#E5E9EF] bg-white overflow-visible ${
                dropTarget ? "ring-2 ring-[#00BFA5]/40" : ""
              } ${isHidden ? "opacity-60" : ""}`}
              data-testid={`route-pool-${section.key}`}
            >
              <SectionDropHeader
                sectionKey={section.key}
                className="px-2 py-1.5 flex flex-wrap items-center gap-1 border-b border-[#E5E9EF]"
              >
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg hover:bg-[#F4F6F8] inline-flex items-center justify-center text-[#5C6570]"
                  onClick={() => toggleCollapsed(section.key)}
                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                  data-testid={`route-pool-toggle-${section.key}`}
                >
                  {isCollapsed ? <CaretRight size={14} /> : <CaretDown size={14} />}
                </button>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: poolColor }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[13px] text-[#0B1220] truncate leading-tight">
                    {section.title}
                  </p>
                  <p className="text-[10px] text-[#5C6570] leading-tight">
                    {section.stops.length} · {spanLabel}
                  </p>
                </div>
                {onToggleDriverVisibility ? (
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg hover:bg-[#F4F6F8] inline-flex items-center justify-center text-[#5C6570]"
                    aria-label={isHidden ? "Show on map" : "Hide on map"}
                    data-testid={`route-pool-eye-${section.key}`}
                    onClick={() => onToggleDriverVisibility(section.key)}
                  >
                    {isHidden ? <EyeSlash size={14} /> : <Eye size={14} />}
                  </button>
                ) : null}
                <label className="text-[11px] text-[#5C6570] inline-flex items-center gap-1 h-8 px-1">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleSection(section.stops)}
                    disabled={!section.stops.length}
                    data-testid={`route-pool-select-all-${section.key}`}
                  />
                  All
                </label>
                <a
                  href={mapsUrlForStops(originLine, mapsStops)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-2 rounded-lg text-[11px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] inline-flex items-center gap-1"
                  data-testid={`route-pool-maps-${section.key}`}
                >
                  <MapPin size={12} /> Maps
                </a>
                {viewHrefForSection ? (
                  <a
                    href={viewHrefForSection(section)}
                    className="h-8 px-2 rounded-lg text-[11px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] inline-flex items-center gap-1"
                    data-testid={`route-pool-view-${section.key}`}
                  >
                    <NavigationArrow size={12} /> View
                  </a>
                ) : null}
                {section.key === "unassigned" &&
                section.stops.length > 0 &&
                onBestFitAllUnassigned ? (
                  <button
                    type="button"
                    className="h-8 px-2 rounded-lg text-[11px] font-medium text-[#0B1220] hover:bg-[#F4F6F8] disabled:opacity-50"
                    disabled={busy || !routingConfigured}
                    onClick={onBestFitAllUnassigned}
                    data-testid="route-best-fit-all"
                    title="Place each unassigned stop into the lowest-cost driver gap"
                  >
                    Best fit all
                  </button>
                ) : null}
                {section.stops.length > paging.pageSize && (
                  <button
                    type="button"
                    className="h-8 px-2 rounded-lg text-[11px] font-medium text-[#5C6570] hover:bg-[#F4F6F8]"
                    onClick={() => setPagingSectionKey(section.key)}
                    data-testid={`route-pool-page-focus-${section.key}`}
                  >
                    Page
                  </button>
                )}
              </SectionDropHeader>

              {!isCollapsed && (
                <SortableContext
                  items={paged.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul data-testid={`route-pool-stops-${section.key}`}>
                    {paged.length === 0 ? (
                      <li className="px-3 py-3 text-xs text-[#5C6570]">No stops in this pool.</li>
                    ) : (
                      paged.map((stop) => (
                        <SortableStopRow
                          key={stop.id}
                          stop={stop}
                          selected={selected.has(stop.id)}
                          highlighted={highlightedStopId === stop.id}
                          busy={busy}
                          routingConfigured={routingConfigured}
                          dragDisabled={dragDisabled}
                          onToggle={() => onToggleStop(stop.id)}
                          onHighlight={() => onHighlight(stop.id)}
                          onOpenStart={() => onOpenStart(stop)}
                          onPlace={() => onPlace(stop)}
                          onBestFit={
                            section.key === "unassigned" && onBestFit
                              ? () => onBestFit(stop)
                              : undefined
                          }
                          onOpenMove={() => setMoveStop(stop)}
                        />
                      ))
                    )}
                  </ul>
                </SortableContext>
              )}

              <div
                id={`section:${section.key}`}
                data-testid={`route-pool-drop-${section.key}`}
                className="sr-only"
                aria-hidden
              />
            </div>
          );
        })}

        <DragOverlay>
          {activeStop ? (
            <div className="rounded-xl border border-[#00BFA5] bg-white shadow-lg px-3 py-2 text-xs font-medium text-[#0B1220]">
              <NavigationArrow size={12} className="inline mr-1" />
              {activeStop.name || activeStop.id}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pagingSection && pagingSection.stops.length > paging.pageSize && (
        <CursorPaginationBar
          currentPage={paging.currentPage}
          totalPages={paging.totalPages}
          from={paging.from}
          to={paging.to}
          total={paging.total}
          pageSize={paging.pageSize}
          hasMore={paging.hasMore}
          loading={busy}
          onPrev={() => {
            paging.goPrev();
          }}
          onNext={() => {
            paging.goNext();
          }}
          onPageSizeChange={paging.setPageSize}
          testidPrefix="route-stops"
        />
      )}

      <MoveStopSheet
        stop={moveStop}
        drivers={drivers}
        busy={busy}
        onClose={() => setMoveStop(null)}
        onPick={(driverId) => {
          if (!moveStop) return;
          onMoveDriver(moveStop, driverId);
          setMoveStop(null);
        }}
      />
    </div>
  );
}
