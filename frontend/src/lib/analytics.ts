export type PeriodKey = "7d" | "30d" | "90d" | "mtd";

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

export type BusinessInsights = {
  period: { key: PeriodKey; start: string; end: string };
  prior_period: { start: string; end: string };
  kpis: Record<string, KpiValue>;
  series: Array<{
    date: string;
    delivered: number;
    missed: number;
    cancelled: number;
    collections_amount: number;
  }>;
  ar_aging: Record<"0_7" | "8_14" | "15_30" | "30_plus", number>;
  top_outstanding: Array<{ customer_id?: string; name: string; outstanding: number }>;
  top_collectors: Array<{ customer_id?: string; name: string; amount: number; count: number }>;
  areas: Array<{ area: string; customers: number; outstanding: number }>;
  highlights: BusinessInsight[];
};

export type CustomerInsights = {
  customer_id: string;
  customer_name: string;
  period: { key: PeriodKey; start: string; end: string };
  prior_period: { start: string; end: string };
  kpis: Record<string, KpiValue>;
  series: BusinessInsights["series"];
  ar_aging: BusinessInsights["ar_aging"];
  highlights: BusinessInsight[];
};

export type CustomerTimelineEvent = {
  type: "delivery" | "payment" | "pause" | "note" | string;
  at?: string;
  date?: string;
  data?: Record<string, any>;
};

export const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "mtd", label: "MTD" },
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
