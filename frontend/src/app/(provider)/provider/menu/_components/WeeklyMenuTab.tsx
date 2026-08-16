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

export default function WeeklyMenuTab({ canMutate }: { canMutate: boolean }) {
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
      <p className="text-sm text-muted-foreground">
        Optional. Set what goes in each tiffin per weekday, and let customers pick their options.
        Leave it empty to keep sharing the menu as a picture only.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Meal type">
          {(plan?.meal_types || []).map((type) => (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={mealTypeId === type.id}
              data-testid={`menu-plan-type-${type.id}`}
              onClick={() => setMealTypeId(type.id)}
              className={`shrink-0 px-3.5 h-9 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
                mealTypeId === type.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-brand-border hover:bg-brand-surface"
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {canMutate ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="menu-plan-split-slots"
                checked={splitBySlot}
                onChange={(e) => handleSplitToggle(e.target.checked)}
              />
              Different lunch and dinner
            </label>
            <button
              type="button"
              data-testid="menu-plan-save"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
              className="pill-btn btn-primary h-11 cursor-pointer disabled:opacity-60"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </>
        ) : null}
      </div>

      <div
        className="card-tinted p-3 flex flex-wrap items-center gap-3"
        data-testid="menu-plan-image-section"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ImageSquare size={20} weight="duotone" className="text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Weekly image for this meal type</div>
            <div className="text-xs text-muted-foreground">
              One picture for the whole week. Customers see it with their menu.
            </div>
          </div>
        </div>
        {currentImage ? (
          <button
            type="button"
            onClick={() => setViewingImage(currentImage)}
            data-testid={`menu-plan-image-${mealTypeId}`}
            className="shrink-0 cursor-pointer rounded-lg border border-brand-border p-0 overflow-hidden hover:opacity-95"
            aria-label="View the weekly menu image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentImage} alt="" className="h-14 w-14 object-cover" />
          </button>
        ) : null}
        {canMutate ? (
          <div className="flex gap-2">
            <input
              ref={imageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              data-testid="menu-plan-image-input"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              data-testid="menu-plan-image-upload"
              disabled={uploadingImage}
              onClick={() => imageRef.current?.click()}
              className="pill-btn btn-outline gap-2 h-9 text-xs cursor-pointer disabled:opacity-60"
            >
              <UploadSimple size={14} />
              {uploadingImage ? "Uploading…" : currentImage ? "Replace" : "Upload"}
            </button>
            {currentImage ? (
              <button
                type="button"
                data-testid="menu-plan-image-remove"
                onClick={() => void handleImageRemove()}
                className="icon-btn icon-btn-danger"
                title="Remove image"
              >
                <Trash size={16} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {WEEKDAYS.map((day) => (
          <div
            key={day.i}
            className="card-tinted p-3 flex flex-col gap-2"
            data-testid={`menu-plan-day-${day.i}`}
          >
            <div className="font-display font-bold text-sm">{WEEKDAY_LONG[day.i]}</div>
            {slotsForDay.map((slot) => {
              const entry = cellEntry(day.i, slot);
              return (
                <div
                  key={slot}
                  className="rounded-xl border border-brand-border bg-white p-2.5 flex flex-col gap-2"
                  data-testid={`menu-plan-cell-${day.i}-${mealTypeId}-${slot}`}
                >
                  {splitBySlot ? (
                    <div className="label-overline">{slotLabel(slot)}</div>
                  ) : null}
                  {entryIsEmpty(entry) ? (
                    <p className="text-xs text-muted-foreground">Not set</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {entry!.lines.length > 0 ? (
                        <ul className="text-sm flex flex-col gap-0.5">
                          {entry!.lines.map((line) => (
                            <li key={line.item_id} className="flex justify-between gap-2">
                              <span className="truncate">{itemName(line.item_id)}</span>
                              <span className="text-muted-foreground shrink-0 font-mono text-xs">
                                {fmtQty(line.quantity)} {itemUnit(line.item_id)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {entry!.groups.map((group) => (
                        <div
                          key={group.id}
                          className="rounded-lg bg-brand-surface px-2 py-1.5"
                          data-testid={`menu-plan-group-${group.id}`}
                        >
                          <div className="text-xs font-medium">
                            {group.label || "Choice"} · pick {group.choose} of{" "}
                            {group.options.length}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {group.options
                              .map((o) => `${itemName(o.item_id)}${o.is_default ? " ✓" : ""}`)
                              .join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {canMutate ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        data-testid={`menu-plan-edit-${day.i}-${slot}`}
                        onClick={() => openEditor(day.i, slot)}
                        className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer"
                      >
                        {entryIsEmpty(entry) ? <Plus size={14} /> : <PencilSimple size={14} />}
                        {entryIsEmpty(entry) ? "Set menu" : "Edit"}
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
                            className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer"
                          >
                            <Copy size={14} /> Copy to…
                          </button>
                          <button
                            type="button"
                            data-testid={`menu-plan-clear-${day.i}-${slot}`}
                            onClick={() => clearCell(day.i, slot)}
                            className="icon-btn icon-btn-danger"
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
          <select
            data-testid="menu-plan-add-line"
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
            value=""
            onChange={(e) => {
              addLine(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Add an item…</option>
            {items
              .filter((item) => !usedInLines.has(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
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
                <select
                  data-testid={`menu-plan-add-option-${group.id}`}
                  className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
                  value=""
                  onChange={(e) => {
                    addOption(group, e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">Add an option…</option>
                  {items
                    .filter((item) => !group.options.some((o) => o.item_id === item.id))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
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
