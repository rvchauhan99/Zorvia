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
  CaretUp,
  MapPin,
  NavigationArrow,
  WarningCircle,
} from "@phosphor-icons/react";
import CursorPaginationBar from "@/components/CursorPaginationBar";
import { OPS_DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import MoveStopSheet from "./MoveStopSheet";
import type { Driver, PoolSection, Stop } from "./types";
import {
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
  onToggleStop: (id: string) => void;
  onToggleSection: (stops: Stop[]) => void;
  onHighlight: (id: string | null) => void;
  onReorder: (section: PoolSection, orderedIds: string[]) => void;
  onReassign: (customerIds: string[], driverId: string | null) => void;
  onOpenStart: (stop: Stop) => void;
  onPlace: (stop: Stop) => void;
  onMoveDriver: (stop: Stop, driverId: string | null) => void;
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
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
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
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: dragDisabled,
  });
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
      className={`px-2 py-2 flex flex-col gap-2 text-xs border-b border-brand-border/60 last:border-0 ${
        highlighted ? "bg-primary/8" : "bg-white"
      } ${selected ? "ring-1 ring-inset ring-primary/25" : ""}`}
      data-testid={`route-stop-row-${stop.id}`}
      onClick={onHighlight}
      id={`route-stop-${stop.id}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 min-h-[44px] min-w-[44px] touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-brand-surface rounded-xl inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Drag to reorder"
          title={dragDisabled ? "Clear search to drag-reorder" : "Drag up or down"}
          data-testid={`route-stop-drag-${stop.id}`}
          disabled={dragDisabled || busy}
          {...(dragDisabled ? {} : { ...attributes, ...listeners })}
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon />
        </button>

        <label className="mt-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-4 w-4 rounded border-brand-border"
            data-testid={`route-stop-check-${stop.id}`}
          />
        </label>

        <span className="font-mono text-muted-foreground shrink-0 w-8 mt-1.5">
          {stop.delivery_sequence != null ? `#${stop.delivery_sequence}` : "—"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-sm">{stop.name || stop.id}</p>
          <p className="text-muted-foreground truncate">{stopAddress(stop) || "No address"}</p>
          {issue && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-wide font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <WarningCircle size={12} />
              {stop.geocode_status !== "ok" ? "Geocode" : "Unplaced"}
            </span>
          )}
        </div>

        <div className="shrink-0 flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={busy || !canUp}
            onClick={onMoveUp}
            className="min-h-[28px] min-w-[28px] rounded-lg text-muted-foreground hover:bg-brand-surface disabled:opacity-30 inline-flex items-center justify-center"
            aria-label="Move up"
            data-testid={`route-stop-up-${stop.id}`}
          >
            <CaretUp size={14} />
          </button>
          <button
            type="button"
            disabled={busy || !canDown}
            onClick={onMoveDown}
            className="min-h-[28px] min-w-[28px] rounded-lg text-muted-foreground hover:bg-brand-surface disabled:opacity-30 inline-flex items-center justify-center"
            aria-label="Move down"
            data-testid={`route-stop-down-${stop.id}`}
          >
            <CaretDown size={14} />
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-1.5 pl-[52px] sm:pl-[60px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="pill-btn btn-outline h-9 text-[11px] px-3"
          disabled={busy}
          data-testid={`route-stop-start-${stop.id}`}
          onClick={onOpenStart}
        >
          Start
        </button>
        <button
          type="button"
          className="pill-btn btn-outline h-9 text-[11px] px-3"
          disabled={busy}
          data-testid={`route-stop-move-${stop.id}`}
          onClick={onOpenMove}
        >
          Move
        </button>
        {needsPlace && (
          <button
            type="button"
            className="pill-btn btn-outline h-9 text-[11px] px-3"
            disabled={busy}
            data-testid={`route-stop-place-${stop.id}`}
            onClick={onPlace}
          >
            Place
          </button>
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
  onToggleStop,
  onToggleSection,
  onHighlight,
  onReorder,
  onReassign,
  onOpenStart,
  onPlace,
  onMoveDriver,
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
    return base
      .map((s) => ({
        ...s,
        stops: s.stops.filter((st) => stopMatchesQuery(st, searchQuery)),
      }))
      .filter((s) => s.stops.length > 0);
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
      <div className="card-tinted p-4 text-sm text-muted-foreground" data-testid="route-list-empty">
        {searchQuery.trim()
          ? "No stops match this search."
          : "No stops match this filter."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="route-stop-list">
      {dragDisabled ? (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Search is active — drag to reorder is paused. Clear search to drag, or use ▲/▼.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Drag the grip handle to move a stop up or down. Drop on another driver header to reassign.
        </p>
      )}

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
          // Select-all / reorder indices use full pool from original sections when possible
          const fullSection = sections.find((s) => s.key === section.key) || section;
          const sectionIds = section.stops.map((s) => s.id);
          const allSelected =
            sectionIds.length > 0 && sectionIds.every((id) => selected.has(id));
          const paged = sliceFor(section);
          const dropTarget = overSectionKey === section.key;

          return (
            <div
              key={section.key}
              className={`card-tinted overflow-visible ${
                dropTarget ? "ring-2 ring-primary/40" : ""
              }`}
              data-testid={`route-pool-${section.key}`}
            >
              <SectionDropHeader
                sectionKey={section.key}
                className="p-3 flex flex-wrap items-center gap-2 border-b border-brand-border/60"
              >
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] rounded-full hover:bg-brand-surface inline-flex items-center justify-center"
                  onClick={() => toggleCollapsed(section.key)}
                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                  data-testid={`route-pool-toggle-${section.key}`}
                >
                  {isCollapsed ? <CaretRight size={16} /> : <CaretDown size={16} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-sm truncate">{section.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {section.stops.length} stop{section.stops.length === 1 ? "" : "s"}
                    <span className="mx-1">·</span>
                    {spanLabel}
                  </p>
                </div>
                {!section.driverId ? (
                  <span className="text-[10px] uppercase tracking-wide font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    Pool
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide font-medium text-secondary bg-secondary/10 border border-secondary/20 rounded-full px-2 py-0.5">
                    Driver
                  </span>
                )}
                <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5 min-h-[44px] px-1">
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
                  className="pill-btn btn-outline h-9 text-[11px] px-3 gap-1"
                  data-testid={`route-pool-maps-${section.key}`}
                >
                  <MapPin size={14} /> Maps
                </a>
                {section.stops.length > paging.pageSize && (
                  <button
                    type="button"
                    className="pill-btn btn-outline h-9 text-[11px] px-3"
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
                      <li className="px-3 py-4 text-xs text-muted-foreground">
                        No stops in this pool.
                      </li>
                    ) : (
                      paged.map((stop) => {
                        const fullIdx = fullSection.stops.findIndex((s) => s.id === stop.id);
                        return (
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
                            onOpenMove={() => setMoveStop(stop)}
                            onMoveUp={() => {
                              if (fullIdx <= 0) return;
                              const next = [...fullSection.stops];
                              const tmp = next[fullIdx - 1];
                              next[fullIdx - 1] = next[fullIdx];
                              next[fullIdx] = tmp;
                              onReorder(
                                fullSection,
                                next.map((s) => s.id)
                              );
                            }}
                            onMoveDown={() => {
                              if (fullIdx < 0 || fullIdx >= fullSection.stops.length - 1) return;
                              const next = [...fullSection.stops];
                              const tmp = next[fullIdx + 1];
                              next[fullIdx + 1] = next[fullIdx];
                              next[fullIdx] = tmp;
                              onReorder(
                                fullSection,
                                next.map((s) => s.id)
                              );
                            }}
                            canUp={fullIdx > 0}
                            canDown={fullIdx >= 0 && fullIdx < fullSection.stops.length - 1}
                          />
                        );
                      })
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
            <div className="rounded-xl border border-primary bg-white shadow-lg px-3 py-2 text-xs font-medium">
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
