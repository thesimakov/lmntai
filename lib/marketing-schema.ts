import { z } from "zod";

const marketingKpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.string().optional(),
  trend: z.enum(["up", "down", "neutral"]),
});

const marketingChannelSchema = z.object({
  name: z.string(),
  spend: z.number().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  kpis: z.array(marketingKpiSchema),
  trend: z.enum(["up", "down", "neutral"]),
  narrative: z.string(),
});

const marketingChartSchema = z.object({
  id: z.string(),
  type: z.enum(["bar", "line", "pie"]),
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number() }).passthrough()),
});

export const marketingDashboardSchema = z.object({
  meta: z.object({
    companyName: z.string(),
    period: z.string(),
    dataSource: z.string(),
    analyzedAt: z.string().datetime(),
  }),
  summary: z.object({
    executive: z.string(),
    topFindings: z.array(z.string()).min(1),
    recommendations: z.array(z.string()).min(1),
  }),
  channels: z.array(marketingChannelSchema).min(1).max(6),
  kpis: z.array(marketingKpiSchema),
  charts: z.array(marketingChartSchema),
  narrative: z.string(),
});

export type MarketingDashboard = z.infer<typeof marketingDashboardSchema>;
export type MarketingChannel = z.infer<typeof marketingChannelSchema>;
export type MarketingKpi = z.infer<typeof marketingKpiSchema>;
export type MarketingChart = z.infer<typeof marketingChartSchema>;
