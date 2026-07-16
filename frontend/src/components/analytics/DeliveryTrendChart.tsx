"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DeliveryTrendChart({ data }: { data: any[] }) {
  return (
    <div className="card-tinted p-5" data-testid="chart-delivery-trend">
      <div className="mb-4">
        <h2 className="font-display font-bold text-xl">Delivery trend</h2>
        <p className="text-sm text-muted-foreground">Delivered, missed, and cancelled meals by day.</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey="delivered" stackId="1" stroke="#2A9D7A" fill="#2A9D7A" fillOpacity={0.28} />
            <Area type="monotone" dataKey="missed" stackId="1" stroke="#F5A524" fill="#F5A524" fillOpacity={0.26} />
            <Area type="monotone" dataKey="cancelled" stackId="1" stroke="#0E8F8B" fill="#0E8F8B" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
