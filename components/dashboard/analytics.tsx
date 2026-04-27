"use client";

import { motion } from "framer-motion";
import { useId, useMemo } from "react";
import { useI18n } from "@/components/i18n-provider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer
} from "recharts";
import { Layers, Zap, BarChart3, Percent } from "lucide-react";

export type AnalyticsChartPoint = { name: string; tokens: number };

export type AnalyticsRecentItem = {
  id: string;
  model: string;
  totalTokens: number;
  createdAt: string;
};

export type AnalyticsStatValues = {
  /** AI-запросов за 30 дней (строки TokenUsageLog) */
  requests: number;
  /** Сумма totalTokens за 30 дней */
  tokens: number;
  /** Среднее totalTokens на запрос за 30 дней */
  avgTokensPerRequest: number;
  /** Доля completion в (prompt+completion), % */
  completionSharePercent: number;
};

type AnalyticsProps = {
  chartData?: AnalyticsChartPoint[];
  statValues?: AnalyticsStatValues;
  recentGenerations?: AnalyticsRecentItem[];
};

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeShort(iso: string, lang: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) {
    return lang === "en" ? "just now" : lang === "tg" ? "ҳозир" : "только что";
  }
  if (min < 60) {
    return lang === "en" ? `${min} min ago` : lang === "tg" ? `${min} дақ пеш` : `${min} мин назад`;
  }
  if (hr < 24) {
    return lang === "en" ? `${hr} h ago` : lang === "tg" ? `${hr} соат пеш` : `${hr} ч назад`;
  }
  return lang === "en" ? `${day} d ago` : lang === "tg" ? `${day} рӯз пеш` : `${day} дн. назад`;
}

export function Analytics({ chartData: chartDataProp, statValues, recentGenerations }: AnalyticsProps) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU";

  const demoChartData = useMemo(
    () => [
      { name: t("analytics_day_mon"), tokens: 0 },
      { name: t("analytics_day_tue"), tokens: 0 },
      { name: t("analytics_day_wed"), tokens: 0 },
      { name: t("analytics_day_thu"), tokens: 0 },
      { name: t("analytics_day_fri"), tokens: 0 },
      { name: t("analytics_day_sat"), tokens: 0 },
      { name: t("analytics_day_sun"), tokens: 0 }
    ],
    [t]
  );

  const chartData = chartDataProp ?? demoChartData;

  const stats = useMemo(() => {
    const live = Boolean(statValues);
    const avg = live ? formatTokensShort(statValues!.avgTokensPerRequest) : "—";
    const share =
      live && statValues!.requests > 0 ? `${statValues!.completionSharePercent}%` : "—";
    return [
      {
        id: "requests",
        label: t("analytics_stat_requests"),
        value: live ? String(statValues!.requests) : "—",
        change: "—",
        trend: "up" as const,
        icon: Layers,
        color: "from-purple-500 to-pink-500"
      },
      {
        id: "tokens",
        label: t("analytics_stat_coins_spent"),
        value: live ? formatTokensShort(statValues!.tokens) : "—",
        change: "—",
        trend: "up" as const,
        icon: Zap,
        color: "from-blue-500 to-cyan-500"
      },
      {
        id: "avg",
        label: t("analytics_stat_avg_tokens"),
        value: avg,
        change: "—",
        trend: "up" as const,
        icon: BarChart3,
        color: "from-green-500 to-emerald-500"
      },
      {
        id: "completion",
        label: t("analytics_stat_completion_share"),
        value: share,
        change: "—",
        trend: "up" as const,
        icon: Percent,
        color: "from-orange-500 to-amber-500"
      }
    ];
  }, [statValues, t]);

  const recent = recentGenerations ?? [];
  const chartId = useId().replace(/:/g, "");
  const gradBar = `lg-bar-${chartId}`;
  const gradBarPeak = `lg-bar-peak-${chartId}`;

  const maxTokens = useMemo(
    () => (chartData.length ? Math.max(0, ...chartData.map((d) => d.tokens)) : 0),
    [chartData]
  );
  const yMaxPad = useMemo(() => {
    if (maxTokens <= 0) return 1;
    return Math.ceil(maxTokens * 1.12);
  }, [maxTokens]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("analytics_title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("analytics_subtitle")}</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass glass-hover rounded-2xl p-6 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.trend === "up" ? "text-green-400" : "text-blue-400"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="glass rounded-2xl p-6"
      >
        <h2 className="mb-2 text-lg font-medium text-foreground">{t("analytics_week_activity")}</h2>
        <p className="mb-5 text-xs text-muted-foreground">{t("analytics_week_activity_hint")}</p>
        <div className="h-72 w-full min-h-[200px] text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barCategoryGap="18%"
              barGap={4}
              margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id={gradBar} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity={0.95} />
                  <stop offset="55%" stopColor="#a855f7" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#db2777" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id={gradBarPeak} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e9d5ff" stopOpacity={1} />
                  <stop offset="40%" stopColor="#a78bfa" stopOpacity={1} />
                  <stop offset="100%" stopColor="#e879f9" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.5}
                strokeDasharray="4 6"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
                tickMargin={10}
                height={36}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 11 }}
                tickFormatter={(v) => formatTokensShort(Number(v))}
                width={44}
                domain={[0, yMaxPad]}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -8px rgb(0 0 0 / 0.12)",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                  padding: "10px 12px"
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4, color: "hsl(var(--foreground))" }}
                cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                formatter={(value: number) => [formatTokensShort(value as number), t("analytics_coins_suffix")]}
              />
              <Bar dataKey="tokens" maxBarSize={48} radius={[10, 10, 3, 3]} animationDuration={600}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={`${entry.name}-${i}`}
                    fill={
                      maxTokens > 0 && entry.tokens === maxTokens
                        ? `url(#${gradBarPeak})`
                        : `url(#${gradBar})`
                    }
                    fillOpacity={entry.tokens <= 0 ? 0.2 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass mt-6 rounded-2xl p-6"
      >
        <h2 className="mb-4 text-lg font-medium text-foreground">{t("analytics_recent_generations")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("analytics_recent_empty")}</p>
        ) : (
          <div className="space-y-3">
            {recent.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" title={item.model}>
                    {item.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}{" "}
                    ({formatRelativeShort(item.createdAt, lang)})
                  </p>
                </div>
                <span className="shrink-0 pl-2 text-sm text-muted-foreground">
                  {formatTokensShort(item.totalTokens)} {t("analytics_coins_suffix")}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
