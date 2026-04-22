"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type UsagePoint = {
  day: string;
  projects: number;
};

type UsageChartProps = {
  data: UsagePoint[];
};

export function UsageChart({ data }: UsageChartProps) {
  return (
    <div className="glass rounded-3xl border p-4">
      <h3 className="mb-4 text-lg font-semibold">Активность за 7 дней</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip
              contentStyle={{
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14
              }}
            />
            <Bar dataKey="projects" radius={[10, 10, 4, 4]} fill="url(#usageGradient)" animationDuration={900} />
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={1} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.65} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
