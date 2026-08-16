/** Types + helpers for the optional detailed menu (item master + weekly plan). */

export type MenuItemCategory =
  | "sabzi"
  | "bread"
  | "rice"
  | "dal"
  | "salad"
  | "sweet"
  | "extra"
  | "other"

export type MenuItemUnit = "pc" | "g" | "ml" | "serving"

export type MenuPlanSlot = "all" | "lunch" | "dinner"

export interface MenuItem {
  id: string
  name: string
  category: MenuItemCategory
  unit: MenuItemUnit
  default_quantity: number
  is_veg: boolean
  active: boolean
  is_starter: boolean
  sort_order: number
  notes: string
}

export interface MenuPlanLine {
  item_id: string
  quantity: number
}

export interface MenuPlanGroupOption {
  item_id: string
  quantity: number
  is_default: boolean
}

export interface MenuPlanGroup {
  id: string
  label: string
  choose: number
  options: MenuPlanGroupOption[]
}

export interface MenuPlanEntry {
  weekday: number
  meal_type_id: string
  slot: MenuPlanSlot
  lines: MenuPlanLine[]
  groups: MenuPlanGroup[]
}

export interface MenuPlanImage {
  url: string
  updated_at?: string
}

export interface MenuPlan {
  split_by_slot: boolean
  images: Record<string, MenuPlanImage>
  entries: MenuPlanEntry[]
  configured: boolean
  updated_at?: string | null
  meal_types: { id: string; name: string }[]
  items: MenuItem[]
}

export interface MenuWeekItem {
  item_id: string
  name: string
  category: MenuItemCategory
  unit: MenuItemUnit
  quantity: number
}

export interface MenuWeekGroupOption extends MenuWeekItem {
  is_default: boolean
}

export interface MenuWeekGroup {
  id: string
  label: string
  choose: number
  options: MenuWeekGroupOption[]
  selected: string[]
  is_custom: boolean
}

export interface MenuWeekMeal {
  plan_slot: MenuPlanSlot
  slots: string[]
  meal_type_id: string
  meal_type_name: string
  image_url: string | null
  items: MenuWeekItem[]
  groups: MenuWeekGroup[]
}

export interface MenuWeekDay {
  weekday: number
  weekday_name: string
  meals: MenuWeekMeal[]
}

export interface MenuWeek {
  enabled: boolean
  split_by_slot: boolean
  days: MenuWeekDay[]
  group_ids: string[]
  cutoff_hours?: number
}

export const ITEM_CATEGORIES: { value: MenuItemCategory; label: string }[] = [
  { value: "sabzi", label: "Sabzi" },
  { value: "bread", label: "Bread" },
  { value: "rice", label: "Rice" },
  { value: "dal", label: "Dal" },
  { value: "salad", label: "Salad" },
  { value: "sweet", label: "Sweet" },
  { value: "extra", label: "Extra" },
  { value: "other", label: "Other" },
]

export const ITEM_UNITS: { value: MenuItemUnit; label: string }[] = [
  { value: "serving", label: "Serving" },
  { value: "pc", label: "Piece" },
  { value: "g", label: "Gram" },
  { value: "ml", label: "ml" },
]

export const DIET_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Veg + Non-veg" },
  { value: "veg", label: "Veg only" },
  { value: "non_veg", label: "Non-veg only" },
]

export const categoryLabel = (value: string): string =>
  ITEM_CATEGORIES.find((c) => c.value === value)?.label || "Other"

export const unitLabel = (value: string): string =>
  ITEM_UNITS.find((u) => u.value === value)?.label || value

export const fmtQty = (value: number | undefined | null): string => String(Number(value || 0))

export const entryKey = (weekday: number, mealTypeId: string, slot: MenuPlanSlot): string =>
  `${weekday}|${mealTypeId}|${slot}`

export const findEntry = (
  entries: MenuPlanEntry[],
  weekday: number,
  mealTypeId: string,
  slot: MenuPlanSlot,
): MenuPlanEntry | undefined =>
  entries.find(
    (e) => e.weekday === weekday && e.meal_type_id === mealTypeId && e.slot === slot,
  )

export const emptyEntry = (
  weekday: number,
  mealTypeId: string,
  slot: MenuPlanSlot,
): MenuPlanEntry => ({ weekday, meal_type_id: mealTypeId, slot, lines: [], groups: [] })

export const entryIsEmpty = (entry: MenuPlanEntry | undefined): boolean =>
  !entry || (entry.lines.length === 0 && entry.groups.length === 0)

export const slotLabel = (slot: MenuPlanSlot): string => {
  if (slot === "lunch") return "Lunch"
  if (slot === "dinner") return "Dinner"
  return "All day"
}
