"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { agingRows, overdueAgingRows, type BusinessInsights, type OverdueAgingBuckets } from "@/lib/analytics";
import { fmtCAD } from "@/lib/format";

export function AgingChart({
  data,
  variant = "receivables",
}: {
  data: BusinessInsights["ar_aging"] | OverdueAgingBuckets;
  variant?: "receivables" | "overdue";
}) {
  const overdue = variant === "overdue";
  const rows = overdue
    ? overdueAgingRows(data as OverdueAgingBuckets)
    : agingRows(data as BusinessInsights["ar_aging"]);
  return (
    <div className="card-tinted p-5" data-testid={overdue ? "chart-overdue-aging" : "chart-aging"}>
      <div className="mb-4">
        <h2 className="font-display font-bold text-xl">
          {overdue ? "Overdue by days past collection" : "Receivables aging"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {overdue
            ? "Balances past the customer payment collection day."
            : "Uncovered delivered meals after verified payments."}
        </p>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(value) => fmtCAD(Number(value || 0))} />
            <Bar dataKey="value" fill={overdue ? "#E11D48" : "#F5A524"} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
