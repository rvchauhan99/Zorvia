"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { agingRows, type BusinessInsights } from "@/lib/analytics";
import { fmtCAD } from "@/lib/format";

export function AgingChart({ data }: { data: BusinessInsights["ar_aging"] }) {
  const rows = agingRows(data);
  return (
    <div className="card-tinted p-5" data-testid="chart-aging">
      <div className="mb-4">
        <h2 className="font-display font-bold text-xl">Receivables aging</h2>
        <p className="text-sm text-muted-foreground">Uncovered delivered meals after verified payments.</p>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(value) => fmtCAD(Number(value || 0))} />
            <Bar dataKey="value" fill="#F5A524" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
