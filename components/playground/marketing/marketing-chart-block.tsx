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

const SPEND_COLOR = "#3D7FA6";
const REVENUE_COLOR = "#3A8A65";

interface ChartEntry {
  name: string;
  Spend: number;
  Revenue: number;
}

function formatAxisNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function MarketingChartBlock({ channels }: { channels: MarketingChannel[] }) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU";
  const data: ChartEntry[] = channels
    .filter((c) => c.spend != null || c.revenue != null)
    .map((c) => ({ name: c.name, Spend: c.spend ?? 0, Revenue: c.revenue ?? 0 }));

  if (data.length === 0) return null;

  const horizontal = data.length > 4 || data.some((d) => d.name.length > 12);

  return (
    <div className="rounded-xl border border-border/70 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{t("marketing_bi_spend_vs_revenue_title")}</h3>
      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280}>
          {horizontal ? (
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E4E4E7" strokeDasharray="4 6" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatAxisNumber(Number(v), locale)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#52525B" }}
                axisLine={false}
                tickLine={false}
                width={Math.min(120, Math.max(72, ...data.map((d) => d.name.length * 6)))}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E4E4E7",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Spend" name={t("marketing_bi_spend_label")} fill={SPEND_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22} />
              <Bar dataKey="Revenue" name={t("marketing_bi_revenue_label")} fill={REVENUE_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E4E4E7" strokeDasharray="4 6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatAxisNumber(Number(v), locale)}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E4E4E7",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Spend" name={t("marketing_bi_spend_label")} fill={SPEND_COLOR} radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Revenue" name={t("marketing_bi_revenue_label")} fill={REVENUE_COLOR} radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
