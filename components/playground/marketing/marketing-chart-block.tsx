"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MarketingChannel } from "@/lib/marketing-schema";
import { useI18n } from "@/components/i18n-provider";

const SPEND_COLOR = "#4F8EF7";
const REVENUE_COLOR = "#10B981";

interface ChartEntry {
  name: string;
  Spend: number;
  Revenue: number;
}

export function MarketingChartBlock({ channels }: { channels: MarketingChannel[] }) {
  const { t } = useI18n();
  const data: ChartEntry[] = channels
    .filter((c) => c.spend != null || c.revenue != null)
    .map((c) => ({ name: c.name, Spend: c.spend ?? 0, Revenue: c.revenue ?? 0 }));

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-2">
      <h3 className="font-semibold text-sm">{t("marketing_bi_spend_vs_revenue_title")}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Spend" name={t("marketing_bi_spend_label")} fill={SPEND_COLOR} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Revenue" name={t("marketing_bi_revenue_label")} fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
