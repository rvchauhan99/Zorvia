"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCAD } from "@/lib/format";

export function AreaChart({ data }: { data: Array<{ area: string; customers: number; outstanding: number }> }) {
  return (
    <div className="card-tinted p-5" data-testid="chart-area">
      <div className="mb-4">
        <h2 className="font-display font-bold text-xl">Area concentration</h2>
        <p className="text-sm text-muted-foreground">Outstanding balance by postal area.</p>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <YAxis dataKey="area" type="category" tick={{ fontSize: 12 }} width={44} />
            <Tooltip formatter={(value, name) => name === "outstanding" ? fmtCAD(Number(value || 0)) : value} />
            <Bar dataKey="outstanding" fill="#0E8F8B" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
