export type PeriodKey = "7d" | "30d" | "90d" | "mtd" | "last_month" | "ytd" | "custom";

export type MealSlotFilter = "all" | "lunch" | "dinner" | "uncategorized";

export type KpiValue = {
  value: number;
  prior?: number | null;
  delta_abs?: number | null;
  delta_pct?: number | null;
};

export type BusinessInsight = {
  severity: "success" | "info" | "warning" | "danger";
  title: string;
  body: string;
  href?: string;
};

export type AgingBuckets = Record<"0_7" | "8_14" | "15_30" | "30_plus", number>;
export type OverdueAgingBuckets = Record<"1_7" | "8_14" | "15_30" | "30_plus", number>;

export type BusinessInsights = {
  period: { key: PeriodKey | string; start: string; end: string };
  prior_period: { start: string; end: string };
  kpis: Record<string, KpiValue>;
  series: Array<{
    date: string;
    delivered: number;
    missed: number;
    cancelled: number;
    collections_amount: number;
  }>;
  ar_aging: AgingBuckets;
  overdue_aging?: OverdueAgingBuckets;
  top_outstanding: Array<{ customer_id?: string; name: string; outstanding: number }>;
  top_overdue?: Array<{
    customer_id?: string;
    name: string;
    outstanding: number;
    overdue_amount?: number;
    days_overdue?: number;
    payment_collection_day?: number | null;
    last_due_date?: string | null;
  }>;
  top_collectors: Array<{ customer_id?: string; name: string; amount: number; count: number }>;
  areas: Array<{ area: string; customers: number; outstanding: number }>;
  highlights: BusinessInsight[];
};

export type CustomerInsights = {
  customer_id: string;
  customer_name: string;
  period: { key: PeriodKey | string; start: string; end: string };
  prior_period: { start: string; end: string };
  kpis: Record<string, KpiValue>;
  series: BusinessInsights["series"];
  ar_aging: BusinessInsights["ar_aging"];
  overdue_aging?: OverdueAgingBuckets;
  is_overdue?: boolean;
  days_overdue?: number;
  last_due_date?: string | null;
  payment_collection_day?: number | null;
  highlights: BusinessInsight[];
};

export type CustomerTimelineEvent = {
  type: "delivery" | "payment" | "pause" | "note" | string;
  at?: string;
  date?: string;
  data?: Record<string, any>;
};

/** Preset chips (Custom is activated by editing From/To). */
export const PERIODS: Array<{ key: Exclude<PeriodKey, "custom">; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "mtd", label: "MTD" },
  { key: "last_month", label: "Last month" },
  { key: "ytd", label: "YTD" },
];

export const MEAL_SLOT_FILTERS: Array<{ key: MealSlotFilter; label: string }> = [
  { key: "all", label: "All slots" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "uncategorized", label: "Uncategorized" },
];

export function fmtDelta(kpi?: KpiValue, suffix = "") {
  if (!kpi || kpi.delta_abs == null) return "No prior period";
  const sign = kpi.delta_abs > 0 ? "+" : "";
  if (kpi.delta_pct == null) return `${sign}${kpi.delta_abs}${suffix}`;
  return `${sign}${kpi.delta_pct}%`;
}

export function deltaTone(kpi?: KpiValue, inverse = false) {
  if (!kpi || kpi.delta_abs == null || kpi.delta_abs === 0) return "neutral";
  const positive = kpi.delta_abs > 0;
  const good = inverse ? !positive : positive;
  return good ? "good" : "bad";
}

export function agingRows(ar: BusinessInsights["ar_aging"]) {
  return [
    { label: "0-7 days", value: ar["0_7"] || 0 },
    { label: "8-14 days", value: ar["8_14"] || 0 },
    { label: "15-30 days", value: ar["15_30"] || 0 },
    { label: "30+ days", value: ar["30_plus"] || 0 },
  ];
}

export function overdueAgingRows(ar?: OverdueAgingBuckets) {
  const d = ar || { "1_7": 0, "8_14": 0, "15_30": 0, "30_plus": 0 };
  return [
    { label: "1-7 days", value: d["1_7"] || 0 },
    { label: "8-14 days", value: d["8_14"] || 0 },
    { label: "15-30 days", value: d["15_30"] || 0 },
    { label: "30+ days", value: d["30_plus"] || 0 },
  ];
}

export type InsightsQuery = {
  period: PeriodKey;
  start?: string;
  end?: string;
  meal_slot?: MealSlotFilter;
};

export function insightsParams(q: InsightsQuery): Record<string, string> {
  const params: Record<string, string> = {};
  if (q.period === "custom" && q.start && q.end) {
    params.start = q.start;
    params.end = q.end;
  } else if (q.period !== "custom") {
    params.period = q.period;
  }
  if (q.meal_slot && q.meal_slot !== "all") {
    params.meal_slot = q.meal_slot;
  }
  return params;
}
