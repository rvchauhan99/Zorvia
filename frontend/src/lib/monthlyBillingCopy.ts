/** Display helpers for adjustable / fixed monthly charge tiers. */

export function monthlyTierLabel(tier?: string | null): string | null {
  if (!tier) return null;
  if (tier === "recalc_daily") return "recalc daily";
  if (tier === "flat_with_deductions") return "flat with deductions";
  if (tier === "fixed_monthly") return "fixed monthly";
  return String(tier).replace(/_/g, " ");
}

export function formatBillingMonthLabel(billingMonth?: string | null): string {
  if (!billingMonth || !/^\d{4}-\d{2}$/.test(billingMonth)) return billingMonth || "—";
  const [y, m] = billingMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-CA", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function collapsedMonthHint(row: {
  policy_variant?: string | null;
  tier_applied?: string | null;
  cancelled_units?: number | null;
  delivered_units?: number | null;
}): string | null {
  if (row.policy_variant === "monthly_fixed") return null;
  const cancelled = row.cancelled_units;
  const tier = monthlyTierLabel(row.tier_applied);
  if (cancelled == null && !tier) return null;
  const parts: string[] = [];
  if (cancelled != null) parts.push(`${cancelled} cancelled`);
  if (tier) parts.push(tier);
  return parts.join(" · ") || null;
}
