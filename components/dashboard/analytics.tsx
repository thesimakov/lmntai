"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"
import { useI18n } from "@/components/i18n-provider"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Layers, Zap, Clock, TrendingUp } from "lucide-react"

export type AnalyticsChartPoint = { name: string; projects: number }

export type AnalyticsStatValues = {
  projects: number
  tokens: number
  time: string
  efficiency: string
}

type AnalyticsProps = {
  chartData?: AnalyticsChartPoint[]
  statValues?: AnalyticsStatValues
}

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

export function Analytics({ chartData: chartDataProp, statValues }: AnalyticsProps) {
  const { t } = useI18n()

  const demoChartData = useMemo(
    () => [
      { name: t("analytics_day_mon"), projects: 4 },
      { name: t("analytics_day_tue"), projects: 7 },
      { name: t("analytics_day_wed"), projects: 5 },
      { name: t("analytics_day_thu"), projects: 12 },
      { name: t("analytics_day_fri"), projects: 8 },
      { name: t("analytics_day_sat"), projects: 3 },
      { name: t("analytics_day_sun"), projects: 6 },
    ],
    [t],
  )

  const chartData = chartDataProp ?? demoChartData

  const stats = useMemo(() => {
    const live = Boolean(statValues)
    return [
      {
        id: "projects",
        label: t("analytics_stat_projects"),
        value: live ? String(statValues!.projects) : "47",
        change: live ? "—" : "+12%",
        trend: "up" as const,
        icon: Layers,
        color: "from-purple-500 to-pink-500",
      },
      {
        id: "tokens",
        label: t("analytics_stat_coins_spent"),
        value: live ? formatTokensShort(statValues!.tokens) : "124.5K",
        change: live ? "—" : "+8%",
        trend: "up" as const,
        icon: Zap,
        color: "from-blue-500 to-cyan-500",
      },
      {
        id: "time",
        label: t("analytics_stat_avg_time"),
        value: live ? statValues!.time : "12.4с",
        change: live ? "—" : "-15%",
        trend: "down" as const,
        icon: Clock,
        color: "from-green-500 to-emerald-500",
      },
      {
        id: "efficiency",
        label: t("analytics_stat_efficiency"),
        value: live ? statValues!.efficiency : "94%",
        change: live ? "—" : "+5%",
        trend: "up" as const,
        icon: TrendingUp,
        color: "from-orange-500 to-amber-500",
      },
    ]
  }, [statValues, t])
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("analytics_title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("analytics_subtitle")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
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
          )
        })}
      </div>

      {/* Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="glass rounded-2xl p-6"
      >
        <h2 className="mb-6 text-lg font-medium text-foreground">{t("analytics_week_activity")}</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "15px",
                  color: "var(--popover-foreground)",
                }}
                cursor={{ fill: "color-mix(in oklab, var(--muted) 50%, transparent)" }}
              />
              <Bar
                dataKey="projects"
                fill="url(#gradient)"
                radius={[15, 15, 0, 0]}
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass mt-6 rounded-2xl p-6"
      >
        <h2 className="mb-4 text-lg font-medium text-foreground">{t("analytics_recent_generations")}</h2>
        <div className="space-y-3">
          {[
            { name: t("analytics_recent_name_1"), time: t("analytics_recent_time_2m"), tokens: "2.4K" },
            { name: t("analytics_recent_name_2"), time: t("analytics_recent_time_15m"), tokens: "3.1K" },
            { name: t("analytics_recent_name_3"), time: t("analytics_recent_time_1h"), tokens: "5.2K" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {item.tokens} {t("analytics_coins_suffix")}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
