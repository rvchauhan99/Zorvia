export type MealSlot = "lunch" | "dinner";

export type Stop = {
  id: string;
  name?: string;
  address?: string;
  apartment?: string;
  city?: string;
  city_key?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  driver_id?: string | null;
  driver_name?: string | null;
  delivery_sequence?: number | null;
  geocode_status?: string | null;
  lat?: number | null;
  lng?: number | null;
  meal_slots?: string[];
};

export type CityChip = {
  name: string;
  key: string;
  count: number;
};

export type Kitchen = {
  address?: string;
  street?: string;
  apartment?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  geocode_status?: string | null;
  geocode_query?: string;
};

export type EffectiveStart = {
  type?: string;
  customer_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  label?: string;
  source?: "override" | "default" | "kitchen_fallback" | string;
  city_key?: string;
  override?: {
    id?: string;
    starts_on?: string;
    ends_on?: string;
    customer_id?: string;
  } | null;
};

export type CityStartDefault = {
  type?: string;
  customer_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  label?: string;
  updated_at?: string;
};

export type ActiveOverride = {
  id?: string;
  city?: string;
  customer_id?: string;
  starts_on?: string;
  ends_on?: string;
  created_at?: string;
};

export type RoutePlan = {
  meal_slot?: MealSlot | string;
  routing_configured?: boolean;
  local_routing?: boolean;
  kitchen?: Kitchen;
  cities?: CityChip[];
  city?: string | null;
  city_key?: string | null;
  planning_date?: string;
  city_starts?: Record<string, CityStartDefault>;
  city_start_default?: CityStartDefault | null;
  active_override?: ActiveOverride | null;
  effective_start?: EffectiveStart | null;
  stops?: Stop[];
  unplaced?: Stop[];
  geocode_failed?: Stop[];
  total?: number;
  next_cursor?: string | null;
  has_more?: boolean;
  page_size?: number;
};

export type Driver = {
  id: string;
  name: string;
};

export type PoolSection = {
  key: string;
  driverId: string | null;
  title: string;
  stops: Stop[];
};

export type BulkRangeRow = {
  id: string;
  from: string;
  to: string;
  driverId: string; // "" = unassigned
};

export type StartSheetState = {
  customerId: string;
  customerName: string;
  mode: "default" | "temporary";
  duration: "today" | "days";
  days: number;
};

export type PageMode = "overview" | "plan";

export type ListFilter = "all" | "unassigned" | "issues" | string;
