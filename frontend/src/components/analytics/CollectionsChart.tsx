"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCAD } from "@/lib/format";

export function CollectionsChart({ data }: { data: any[] }) {
  return (
    <div className="card-tinted p-5" data-testid="chart-collections">
      <div className="mb-4">
        <h2 className="font-display font-bold text-xl">Collections</h2>
        <p className="text-sm text-muted-foreground">Verified Interac payments by day.</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(value) => fmtCAD(Number(value || 0))} />
            <Bar dataKey="collections_amount" fill="#0E8F8B" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
