"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, PencilSimple, ArrowCounterClockwise, Prohibit } from "@phosphor-icons/react";
import AppSheet from "@/components/AppSheet";
import {
  DIET_FILTERS,
  ITEM_CATEGORIES,
  ITEM_UNITS,
  categoryLabel,
  fmtQty,
  unitLabel,
  type MenuItem,
  type MenuItemCategory,
  type MenuItemUnit,
} from "@/lib/menuPlan";

type Draft = {
  name: string;
  category: MenuItemCategory;
  unit: MenuItemUnit;
  default_quantity: string;
  is_veg: boolean;
  notes: string;
};

const emptyDraft: Draft = {
  name: "",
  category: "sabzi",
  unit: "serving",
  default_quantity: "1",
  is_veg: true,
  notes: "",
};

function errDetail(err: any, fallback: string): string {
  const d = err?.response?.data?.detail;
  return typeof d === "string" ? d : fallback;
}

export default function ItemsTab({
  canMutate,
  onItemsChanged,
}: {
  canMutate: boolean;
  onItemsChanged?: () => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [diet, setDiet] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/menu-items", { params: { include_inactive: true } });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      if (!showInactive && !item.active) return false;
      if (category !== "all" && item.category !== category) return false;
      if (diet === "veg" && !item.is_veg) return false;
      if (diet === "non_veg" && item.is_veg) return false;
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, category, diet, showInactive]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setSheetOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setDraft({
      name: item.name,
      category: item.category,
      unit: item.unit,
      default_quantity: String(item.default_quantity),
      is_veg: item.is_veg !== false,
      notes: item.notes || "",
    });
    setSheetOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      toast.error("Item name is required");
      return;
    }
    const quantity = Number(draft.default_quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Default quantity must be greater than 0");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name,
        category: draft.category,
        unit: draft.unit,
        default_quantity: quantity,
        is_veg: draft.is_veg,
        notes: draft.notes.trim(),
      };
      if (editing) {
        await api.patch(`/menu-items/${editing.id}`, body);
        toast.success("Item updated");
      } else {
        await api.post("/menu-items", body);
        toast.success("Item added");
      }
      setSheetOpen(false);
      await load();
      onItemsChanged?.();
    } catch (err: any) {
      toast.error(errDetail(err, "Could not save item"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item: MenuItem) => {
    try {
      await api.delete(`/menu-items/${item.id}`);
      toast.success(`${item.name} deactivated`);
      await load();
      onItemsChanged?.();
    } catch (err: any) {
      toast.error(errDetail(err, "Could not deactivate item"));
    }
  };

  const handleReactivate = async (item: MenuItem) => {
    try {
      await api.patch(`/menu-items/${item.id}`, { active: true });
      toast.success(`${item.name} is active again`);
      await load();
      onItemsChanged?.();
    } catch (err: any) {
      toast.error(errDetail(err, "Could not reactivate item"));
    }
  };

  return (
    <div className="flex flex-col gap-3" data-testid="menu-items-tab">
      <p className="text-sm text-muted-foreground">
        Every kitchen starts with a starter list of common veg and non-veg dishes. Edit or hide
        anything you don&rsquo;t cook. Filling the Weekly menu is optional &mdash; until you do,
        customers still only see your menu picture.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          data-testid="menu-item-search"
          className="h-11 flex-1 min-w-[180px] rounded-xl border border-brand-border bg-white px-3 text-sm"
          placeholder="Search items"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          data-testid="menu-item-category-filter"
          className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {ITEM_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          data-testid="menu-item-diet-filter"
          className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
          value={diet}
          onChange={(e) => setDiet(e.target.value)}
        >
          {DIET_FILTERS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm h-11 px-1">
          <input
            data-testid="menu-item-show-inactive"
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
        {canMutate ? (
          <button
            type="button"
            data-testid="menu-item-add"
            onClick={openCreate}
            className="pill-btn btn-primary gap-2 h-11 cursor-pointer"
          >
            <Plus size={18} /> Add item
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground p-4">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4" data-testid="menu-items-empty">
          {items.length === 0
            ? "No items yet. Add your dishes here first, then build the weekly menu."
            : "No items match these filters."}
        </p>
      ) : (
        <ul className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
          {visible.map((item) => (
            <li
              key={item.id}
              data-testid={`menu-item-row-${item.id}`}
              className="flex items-center gap-3 px-3 py-2.5 bg-white"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate flex items-center gap-1.5">
                  <span
                    aria-label={item.is_veg === false ? "Non-vegetarian" : "Vegetarian"}
                    title={item.is_veg === false ? "Non-vegetarian" : "Vegetarian"}
                    className={`inline-block w-3 h-3 shrink-0 rounded-[3px] border-2 ${
                      item.is_veg === false ? "border-red-600" : "border-green-600"
                    }`}
                  >
                    <span
                      className={`block w-full h-full rounded-full scale-50 ${
                        item.is_veg === false ? "bg-red-600" : "bg-green-600"
                      }`}
                    />
                  </span>
                  <span className="truncate">{item.name}</span>
                  {!item.active ? (
                    <span className="rounded-full bg-brand-surface px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                      Inactive
                    </span>
                  ) : null}
                  {item.is_starter && item.active ? (
                    <span className="rounded-full bg-brand-surface px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                      Starter
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {categoryLabel(item.category)} · {fmtQty(item.default_quantity)}{" "}
                  {unitLabel(item.unit)} per tiffin
                  {item.notes ? ` · ${item.notes}` : ""}
                </div>
              </div>
              {canMutate ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`menu-item-edit-${item.id}`}
                    className="icon-btn icon-btn-neutral"
                    title="Edit"
                    onClick={() => openEdit(item)}
                  >
                    <PencilSimple size={16} />
                  </button>
                  {item.active ? (
                    <button
                      type="button"
                      data-testid={`menu-item-deactivate-${item.id}`}
                      className="icon-btn icon-btn-danger"
                      title="Deactivate"
                      onClick={() => void handleDeactivate(item)}
                    >
                      <Prohibit size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid={`menu-item-reactivate-${item.id}`}
                      className="icon-btn icon-btn-neutral"
                      title="Reactivate"
                      onClick={() => void handleReactivate(item)}
                    >
                      <ArrowCounterClockwise size={16} />
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AppSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Edit item" : "Add item"}
        as="form"
        onSubmit={handleSave}
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              data-testid="menu-item-cancel"
              className="pill-btn btn-outline h-11 cursor-pointer"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="menu-item-save"
              disabled={saving}
              className="pill-btn btn-primary h-11 cursor-pointer disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save item"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Name</span>
            <input
              data-testid="menu-item-name"
              className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
              placeholder="e.g. Aloo Gobi"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Category</span>
              <select
                data-testid="menu-item-category"
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value as MenuItemCategory })
                }
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">Unit</span>
              <select
                data-testid="menu-item-unit"
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value as MenuItemUnit })}
              >
                {ITEM_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="label-overline">Veg or non-veg</legend>
            <div className="flex gap-2">
              {[
                { value: true, label: "Veg", testid: "menu-item-veg" },
                { value: false, label: "Non-veg", testid: "menu-item-non-veg" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  data-testid={option.testid}
                  aria-pressed={draft.is_veg === option.value}
                  onClick={() => setDraft({ ...draft, is_veg: option.value })}
                  className={`h-11 flex-1 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${
                    draft.is_veg === option.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-brand-border hover:bg-brand-surface"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Quantity per tiffin</span>
            <input
              data-testid="menu-item-quantity"
              type="number"
              min="0"
              step="0.5"
              className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
              value={draft.default_quantity}
              onChange={(e) => setDraft({ ...draft, default_quantity: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">
              Prefilled when you add this item to the weekly menu. You can override it per day.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Notes (optional)</span>
            <input
              data-testid="menu-item-notes"
              className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm"
              placeholder="e.g. no onion garlic"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
        </div>
      </AppSheet>
    </div>
  );
}
