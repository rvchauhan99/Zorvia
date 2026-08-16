"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Copy,
  ImageSquare,
  PencilSimple,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import AppSheet from "@/components/AppSheet";
import MenuImageLightbox from "@/components/MenuImageLightbox";
import SearchableSelect from "@/components/SearchableSelect";
import Link from "next/link";
import { WEEKDAYS } from "@/lib/format";
import {
  emptyEntry,
  entryIsEmpty,
  findEntry,
  fmtQty,
  slotLabel,
  type MenuItem,
  type MenuPlan,
  type MenuPlanEntry,
  type MenuPlanGroup,
  type MenuPlanSlot,
} from "@/lib/menuPlan";

const WEEKDAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function errDetail(err: any, fallback: string): string {
  const d = err?.response?.data?.detail;
  return typeof d === "string" ? d : fallback;
}

function newGroupId(): string {
  return `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Client mirror of the server rules, so a provider sees the problem before saving. */
function groupError(group: MenuPlanGroup): string | null {
  if (group.options.length === 0) return "Add at least two options";
  if (group.choose < 1) return "Pick at least 1";
  if (group.choose >= group.options.length)
    return "Add more options than the number to pick, or move these items into the menu";
  const defaults = group.options.filter((o) => o.is_default).length;
  if (defaults !== group.choose) return `Mark exactly ${group.choose} default option(s)`;
  return null;
}

export default function WeeklyMenuTab({
  canMutate,
  onPlanConfiguredChange,
}: {
  canMutate: boolean;
  onPlanConfiguredChange?: () => void;
}) {
  const [plan, setPlan] = useState<MenuPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<MenuPlanEntry[]>([]);
  const [splitBySlot, setSplitBySlot] = useState(false);
  const [baseline, setBaseline] = useState("");
  const [mealTypeId, setMealTypeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ weekday: number; slot: MenuPlanSlot } | null>(null);
  const [draft, setDraft] = useState<MenuPlanEntry | null>(null);
  const [copySource, setCopySource] = useState<{ weekday: number; slot: MenuPlanSlot } | null>(
    null,
  );
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<MenuPlan>("/menu-plan");
      setPlan(data);
      setEntries(data.entries || []);
      setSplitBySlot(!!data.split_by_slot);
      setBaseline(JSON.stringify({ s: !!data.split_by_slot, e: data.entries || [] }));
      setMealTypeId((prev) =>
        prev && data.meal_types.some((t) => t.id === prev) ? prev : data.meal_types[0]?.id || "",
      );
    } catch {
      toast.error("Failed to load the weekly menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = plan?.items || [];
  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const dirty = useMemo(
    () => baseline !== JSON.stringify({ s: splitBySlot, e: entries }),
    [baseline, splitBySlot, entries],
  );

  const slotsForDay: MenuPlanSlot[] = splitBySlot ? ["lunch", "dinner"] : ["all"];

  const cellEntry = (weekday: number, slot: MenuPlanSlot) =>
    findEntry(entries, weekday, mealTypeId, slot);

  const itemName = (itemId: string) => itemsById.get(itemId)?.name || "Removed item";
  const itemUnit = (itemId: string) => itemsById.get(itemId)?.unit || "serving";

  const upsertEntry = (next: MenuPlanEntry) => {
    setEntries((prev) => {
      const rest = prev.filter(
        (e) =>
          !(
            e.weekday === next.weekday &&
            e.meal_type_id === next.meal_type_id &&
            e.slot === next.slot
          ),
      );
      return entryIsEmpty(next) ? rest : [...rest, next];
    });
  };

  const openEditor = (weekday: number, slot: MenuPlanSlot) => {
    const existing = cellEntry(weekday, slot);
    setDraft(
      existing
        ? JSON.parse(JSON.stringify(existing))
        : emptyEntry(weekday, mealTypeId, slot),
    );
    setEditing({ weekday, slot });
  };

  const closeEditor = () => {
    setEditing(null);
    setDraft(null);
  };

  const applyDraft = () => {
    if (!draft) return;
    for (const group of draft.groups) {
      const problem = groupError(group);
      if (problem) {
        toast.error(`${group.label || "Choice group"}: ${problem}`);
        return;
      }
    }
    upsertEntry(draft);
    closeEditor();
  };

  const clearCell = (weekday: number, slot: MenuPlanSlot) => {
    setEntries((prev) =>
      prev.filter(
        (e) => !(e.weekday === weekday && e.meal_type_id === mealTypeId && e.slot === slot),
      ),
    );
  };

  const applyCopy = () => {
    if (!copySource || copyTargets.length === 0) return;
    const source = cellEntry(copySource.weekday, copySource.slot);
    if (!source) return;
    setEntries((prev) => {
      const next = prev.filter(
        (e) =>
          !(
            e.meal_type_id === mealTypeId &&
            e.slot === copySource.slot &&
            copyTargets.includes(e.weekday)
          ),
      );
      copyTargets.forEach((weekday) => {
        next.push({
          ...JSON.parse(JSON.stringify(source)),
          weekday,
          groups: source.groups.map((g) => ({
            ...JSON.parse(JSON.stringify(g)),
            id: newGroupId(),
          })),
        });
      });
      return next;
    });
    toast.success(`Copied to ${copyTargets.length} day(s)`);
    setCopySource(null);
    setCopyTargets([]);
  };

  const handleSplitToggle = (next: boolean) => {
    if (!next) {
      const slotSpecific = entries.filter((e) => e.slot !== "all");
      if (
        slotSpecific.length > 0 &&
        !confirm("Lunch and dinner menus will be merged away. Continue?")
      ) {
        return;
      }
      setEntries((prev) => prev.filter((e) => e.slot === "all"));
    }
    setSplitBySlot(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put<MenuPlan>("/menu-plan", {
        split_by_slot: splitBySlot,
        entries,
      });
      setPlan(data);
      setEntries(data.entries || []);
      setSplitBySlot(!!data.split_by_slot);
      setBaseline(JSON.stringify({ s: !!data.split_by_slot, e: data.entries || [] }));
      toast.success("Weekly menu saved");
      onPlanConfiguredChange?.();
    } catch (err: any) {
      toast.error(errDetail(err, "Could not save the weekly menu"));
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !mealTypeId) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("meal_type_id", mealTypeId);
      const { data } = await api.post("/menu-plan/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPlan((prev) =>
        prev ? { ...prev, images: { ...prev.images, [mealTypeId]: data.image } } : prev,
      );
      toast.success("Menu image updated");
    } catch (err: any) {
      toast.error(errDetail(err, "Image upload failed"));
    } finally {
      setUploadingImage(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  };

  const handleImageRemove = async () => {
    if (!mealTypeId) return;
    try {
      await api.delete(`/menu-plan/image/${mealTypeId}`);
      setPlan((prev) => {
        if (!prev) return prev;
        const images = { ...prev.images };
        delete images[mealTypeId];
        return { ...prev, images };
      });
      toast.success("Menu image removed");
    } catch (err: any) {
      toast.error(errDetail(err, "Could not remove the image"));
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="card-tinted p-4 text-sm" data-testid="menu-plan-needs-items">
        <p className="font-medium">Add your items first</p>
        <p className="text-muted-foreground mt-1">
          The weekly menu is built from your item list. Open the Items tab if you have hidden the
          starter dishes, then come back here. Until you fill a day, customers still only see your
          menu picture.
        </p>
      </div>
    );
  }

  const currentImage = plan?.images?.[mealTypeId]?.url || null;

  return (
    <div className="flex flex-col gap-3" data-testid="menu-plan-tab">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-surface/30 p-2 border border-brand-border/60 rounded-xl">
        <div className="flex items-center gap-3 overflow-x-auto min-w-0">
          <div className="inline-flex p-0.5 bg-brand-surface rounded-lg border border-brand-border/60 shrink-0" role="tablist" aria-label="Meal type">
            {(plan?.meal_types || []).map((type) => (
              <button
                key={type.id}
                type="button"
                role="tab"
                aria-selected={mealTypeId === type.id}
                data-testid={`menu-plan-type-${type.id}`}
                onClick={() => setMealTypeId(type.id)}
                className={`shrink-0 px-3 h-7 rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 ${
                  mealTypeId === type.id
                    ? "bg-white text-neutral-900 shadow-sm border border-brand-border/40"
                    : "text-muted-foreground hover:text-neutral-900 hover:bg-white/40 border border-transparent"
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-2 border-l border-brand-border/60 shrink-0">
            <input
              ref={imageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              data-testid="menu-plan-image-input"
              onChange={handleImageUpload}
            />
            {currentImage ? (
              <button
                type="button"
                onClick={() => setViewingImage(currentImage)}
                data-testid={`menu-plan-image-${mealTypeId}`}
                className="shrink-0 cursor-pointer rounded overflow-hidden border border-brand-border hover:opacity-90"
                aria-label="View the weekly menu image"
              >
                <img src={currentImage} alt="" className="h-6 w-6 object-cover" />
              </button>
            ) : (
              <ImageSquare size={16} weight="duotone" className="text-primary" />
            )}
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {uploadingImage ? "Uploading..." : currentImage ? "Custom image set" : plan?.configured ? "Using global picture" : "No picture uploaded"}
            </span>
            {canMutate ? (
              <button
                type="button"
                data-testid="menu-plan-image-upload"
                className="text-xs font-medium text-primary hover:underline ml-1 disabled:opacity-60"
                disabled={uploadingImage}
                onClick={() => imageRef.current?.click()}
              >
                {currentImage ? "Replace" : "Upload"}
              </button>
            ) : null}
            {canMutate && currentImage ? (
              <button
                type="button"
                data-testid="menu-plan-image-remove"
                onClick={() => void handleImageRemove()}
                className="text-xs font-medium text-red-600 hover:underline ml-1"
                title="Remove image"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        {canMutate ? (
          <div className="flex flex-wrap items-center gap-3 shrink-0 pl-2 sm:pl-0 sm:border-0 border-l border-brand-border/60">
            <label className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                data-testid="menu-plan-split-slots"
                checked={splitBySlot}
                onChange={(e) => handleSplitToggle(e.target.checked)}
                className="rounded-sm border-brand-border/60 text-primary focus:ring-primary/20 w-3.5 h-3.5"
              />
              Split lunch/dinner
            </label>
            <button
              type="button"
              data-testid="menu-plan-save"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
              className="pill-btn btn-primary h-7 px-3 text-xs cursor-pointer disabled:opacity-60"
            >
              {saving ? "Saving…" : dirty ? "Save" : "Saved"}
            </button>
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {WEEKDAYS.map((day) => (
          <div
            key={day.i}
            className="card-tinted p-3 sm:p-4 flex flex-col gap-3 border border-brand-border/60 hover:border-brand-border hover:shadow-sm transition-all duration-300 group rounded-[16px]"
            data-testid={`menu-plan-day-${day.i}`}
          >
            <div className="font-display font-bold text-lg text-neutral-900 border-b border-brand-border/50 pb-2">{WEEKDAY_LONG[day.i]}</div>
            <div className="flex flex-col gap-3">
              {slotsForDay.map((slot) => {
                const entry = cellEntry(day.i, slot);
                return (
                  <div
                    key={slot}
                    className={`rounded-xl p-3 flex flex-col gap-3 transition-all duration-300 ${
                      entryIsEmpty(entry) ? "border border-dashed border-brand-border/80 bg-brand-surface/20 hover:bg-brand-surface/50" : "border border-brand-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] bg-white"
                    }`}
                    data-testid={`menu-plan-cell-${day.i}-${mealTypeId}-${slot}`}
                  >
                  {splitBySlot ? (
                    <div className="label-overline text-muted-foreground/80">{slotLabel(slot)}</div>
                  ) : null}
                  {entryIsEmpty(entry) ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center opacity-70">
                      <p className="text-sm font-medium text-neutral-500">Not set</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Click below to add</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {entry!.lines.length > 0 ? (
                        <ul className="text-sm flex flex-col gap-1.5">
                          {entry!.lines.map((line) => (
                            <li key={line.item_id} className="flex justify-between items-center gap-2 py-0.5 border-b border-brand-border/30 last:border-0">
                              <span className="truncate font-medium text-neutral-800">{itemName(line.item_id)}</span>
                              <span className="text-muted-foreground shrink-0 font-mono text-xs bg-brand-surface px-1.5 py-0.5 rounded">
                                {fmtQty(line.quantity)} {itemUnit(line.item_id)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {entry!.groups.map((group) => (
                        <div
                          key={group.id}
                          className="rounded-lg bg-brand-surface/40 border border-brand-border/40 px-3 py-2"
                          data-testid={`menu-plan-group-${group.id}`}
                        >
                          <div className="text-xs font-bold text-neutral-800 mb-1">
                            {group.label || "Choice"} <span className="font-normal text-muted-foreground ml-1">· pick {group.choose} of {group.options.length}</span>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-1.5 mt-1">
                            {group.options
                              .map((o) => (
                                <span key={o.item_id} className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-brand-border/60">
                                  {itemName(o.item_id)}{o.is_default ? <span className="text-secondary font-bold">✓</span> : ""}
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {canMutate ? (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-brand-border/30">
                      <button
                        type="button"
                        data-testid={`menu-plan-edit-${day.i}-${slot}`}
                        onClick={() => openEditor(day.i, slot)}
                        className={`pill-btn gap-1.5 h-9 text-xs font-medium cursor-pointer transition-all ${
                          entryIsEmpty(entry) 
                            ? "bg-primary text-white hover:bg-primary/90 hover:shadow-sm w-full justify-center" 
                            : "btn-outline hover:bg-brand-surface"
                        }`}
                      >
                        {entryIsEmpty(entry) ? <Plus size={14} /> : <PencilSimple size={14} />}
                        {entryIsEmpty(entry) ? "Set menu" : "Edit items"}
                      </button>
                      {!entryIsEmpty(entry) ? (
                        <>
                          <button
                            type="button"
                            data-testid={`menu-plan-copy-${day.i}-${slot}`}
                            onClick={() => {
                              setCopySource({ weekday: day.i, slot });
                              setCopyTargets([]);
                            }}
                            className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer hover:bg-brand-surface"
                          >
                            <Copy size={14} /> Copy to…
                          </button>
                          <button
                            type="button"
                            data-testid={`menu-plan-clear-${day.i}-${slot}`}
                            onClick={() => clearCell(day.i, slot)}
                            className="icon-btn icon-btn-danger ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Clear this day"
                          >
                            <Trash size={14} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            </div>
          </div>
        ))}
      </div>

      <CellEditorSheet
        open={!!editing && !!draft}
        onClose={closeEditor}
        onApply={applyDraft}
        draft={draft}
        setDraft={setDraft}
        items={items}
        title={
          editing
            ? `${WEEKDAY_LONG[editing.weekday]}${
                editing.slot === "all" ? "" : ` · ${slotLabel(editing.slot)}`
              }`
            : ""
        }
      />

      <AppSheet
        open={!!copySource}
        onClose={() => setCopySource(null)}
        title="Copy this menu to other days"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              data-testid="menu-plan-copy-cancel"
              className="pill-btn btn-outline h-11 cursor-pointer"
              onClick={() => setCopySource(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="menu-plan-copy-apply"
              disabled={copyTargets.length === 0}
              className="pill-btn btn-primary h-11 cursor-pointer disabled:opacity-60"
              onClick={applyCopy}
            >
              Copy
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Anything already set on the selected days is replaced.
          </p>
          {WEEKDAYS.filter((d) => d.i !== copySource?.weekday).map((day) => (
            <label
              key={day.i}
              className="flex items-center gap-2 text-sm min-h-[44px]"
              data-testid={`menu-plan-copy-target-${day.i}`}
            >
              <input
                type="checkbox"
                checked={copyTargets.includes(day.i)}
                onChange={(e) =>
                  setCopyTargets((prev) =>
                    e.target.checked ? [...prev, day.i] : prev.filter((i) => i !== day.i),
                  )
                }
              />
              {WEEKDAY_LONG[day.i]}
            </label>
          ))}
        </div>
      </AppSheet>

      <MenuImageLightbox
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        src={viewingImage || undefined}
        label="Weekly menu"
      />
    </div>
  );
}

function CellEditorSheet({
  open,
  onClose,
  onApply,
  draft,
  setDraft,
  items,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  draft: MenuPlanEntry | null;
  setDraft: (next: MenuPlanEntry) => void;
  items: MenuItem[];
  title: string;
}) {
  if (!open || !draft) return null;

  const usedInLines = new Set(draft.lines.map((l) => l.item_id));
  const itemById = (id: string) => items.find((i) => i.id === id);

  const addLine = (itemId: string) => {
    const item = itemById(itemId);
    if (!item || usedInLines.has(itemId)) return;
    setDraft({
      ...draft,
      lines: [...draft.lines, { item_id: itemId, quantity: item.default_quantity }],
    });
  };

  const updateLineQty = (itemId: string, quantity: number) => {
    setDraft({
      ...draft,
      lines: draft.lines.map((l) => (l.item_id === itemId ? { ...l, quantity } : l)),
    });
  };

  const removeLine = (itemId: string) => {
    setDraft({ ...draft, lines: draft.lines.filter((l) => l.item_id !== itemId) });
  };

  const updateGroup = (groupId: string, patch: Partial<MenuPlanGroup>) => {
    setDraft({
      ...draft,
      groups: draft.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    });
  };

  const addGroup = () => {
    setDraft({
      ...draft,
      groups: [
        ...draft.groups,
        { id: newGroupId(), label: "Pick your choice", choose: 1, options: [] },
      ],
    });
  };

  const removeGroup = (groupId: string) => {
    setDraft({ ...draft, groups: draft.groups.filter((g) => g.id !== groupId) });
  };

  const addOption = (group: MenuPlanGroup, itemId: string) => {
    const item = itemById(itemId);
    if (!item || group.options.some((o) => o.item_id === itemId)) return;
    updateGroup(group.id, {
      options: [
        ...group.options,
        { item_id: itemId, quantity: item.default_quantity, is_default: false },
      ],
    });
  };

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={title}
      size="2xl"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            data-testid="menu-plan-cell-cancel"
            className="pill-btn btn-outline h-11 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="menu-plan-cell-apply"
            className="pill-btn btn-primary h-11 cursor-pointer"
            onClick={onApply}
          >
            Done
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <div className="label-overline">Everyone gets</div>
          {draft.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing added yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {draft.lines.map((line) => (
                <li
                  key={line.item_id}
                  className="flex items-center gap-2"
                  data-testid={`menu-plan-line-${line.item_id}`}
                >
                  <span className="flex-1 min-w-0 truncate text-sm">
                    {itemById(line.item_id)?.name || "Removed item"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    aria-label="Quantity"
                    data-testid={`menu-plan-line-qty-${line.item_id}`}
                    className="h-11 w-20 rounded-xl border border-brand-border bg-white px-2 text-sm"
                    value={line.quantity}
                    onChange={(e) => updateLineQty(line.item_id, Number(e.target.value))}
                  />
                  <span className="text-xs text-muted-foreground w-14 shrink-0">
                    {itemById(line.item_id)?.unit || ""}
                  </span>
                  <button
                    type="button"
                    data-testid={`menu-plan-line-remove-${line.item_id}`}
                    className="icon-btn icon-btn-danger"
                    title="Remove"
                    onClick={() => removeLine(line.item_id)}
                  >
                    <Trash size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <SearchableSelect
            testid="menu-plan-add-line"
            value=""
            onChange={(next) => {
              if (next) addLine(next);
            }}
            options={items
              .filter((item) => !usedInLines.has(item.id))
              .map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            placeholder="Search and add an item…"
            inputClassName="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm w-full"
          />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="label-overline">Customer chooses</div>
            <button
              type="button"
              data-testid="menu-plan-add-group"
              className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer"
              onClick={addGroup}
            >
              <Plus size={14} /> Add choice
            </button>
          </div>
          {draft.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Use this for options like &ldquo;any 2 of 3 sabzis&rdquo;. The defaults you mark
              apply until a customer picks their own.
            </p>
          ) : null}
          {draft.groups.map((group) => {
            const problem = groupError(group);
            return (
              <div
                key={group.id}
                className="rounded-xl border border-brand-border bg-white p-3 flex flex-col gap-2"
                data-testid={`menu-plan-group-editor-${group.id}`}
              >
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Choice label"
                    data-testid={`menu-plan-group-label-${group.id}`}
                    className="h-11 flex-1 min-w-0 rounded-xl border border-brand-border bg-white px-3 text-sm"
                    placeholder="e.g. Pick 2 sabzis"
                    value={group.label}
                    onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                  />
                  <input
                    type="number"
                    min="1"
                    aria-label="How many the customer picks"
                    data-testid={`menu-plan-group-choose-${group.id}`}
                    className="h-11 w-16 rounded-xl border border-brand-border bg-white px-2 text-sm"
                    value={group.choose}
                    onChange={(e) =>
                      updateGroup(group.id, { choose: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                  <button
                    type="button"
                    data-testid={`menu-plan-group-remove-${group.id}`}
                    className="icon-btn icon-btn-danger"
                    title="Remove choice"
                    onClick={() => removeGroup(group.id)}
                  >
                    <Trash size={16} />
                  </button>
                </div>
                <ul className="flex flex-col gap-2">
                  {group.options.map((option) => (
                    <li
                      key={option.item_id}
                      className="flex items-center gap-2"
                      data-testid={`menu-plan-option-${group.id}-${option.item_id}`}
                    >
                      <label className="flex items-center gap-1.5 text-xs shrink-0">
                        <input
                          type="checkbox"
                          data-testid={`menu-plan-option-default-${group.id}-${option.item_id}`}
                          checked={option.is_default}
                          onChange={(e) =>
                            updateGroup(group.id, {
                              options: group.options.map((o) =>
                                o.item_id === option.item_id
                                  ? { ...o, is_default: e.target.checked }
                                  : o,
                              ),
                            })
                          }
                        />
                        Default
                      </label>
                      <span className="flex-1 min-w-0 truncate text-sm">
                        {itemById(option.item_id)?.name || "Removed item"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label="Quantity"
                        className="h-11 w-20 rounded-xl border border-brand-border bg-white px-2 text-sm"
                        value={option.quantity}
                        onChange={(e) =>
                          updateGroup(group.id, {
                            options: group.options.map((o) =>
                              o.item_id === option.item_id
                                ? { ...o, quantity: Number(e.target.value) }
                                : o,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        data-testid={`menu-plan-option-remove-${group.id}-${option.item_id}`}
                        className="icon-btn icon-btn-danger"
                        title="Remove option"
                        onClick={() =>
                          updateGroup(group.id, {
                            options: group.options.filter((o) => o.item_id !== option.item_id),
                          })
                        }
                      >
                        <Trash size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                <SearchableSelect
                  testid={`menu-plan-add-option-${group.id}`}
                  value=""
                  onChange={(next) => {
                    if (next) addOption(group, next);
                  }}
                  options={items
                    .filter((item) => !group.options.some((o) => o.item_id === item.id))
                    .map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  placeholder="Search and add an option…"
                  dropdownPlacement="up"
                  inputClassName="h-11 px-3 rounded-xl border border-brand-border bg-white text-sm w-full"
                />
                {problem ? (
                  <p
                    className="text-xs text-amber-800"
                    data-testid={`menu-plan-group-error-${group.id}`}
                  >
                    {problem}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
      </div>
    </AppSheet>
  );
}
