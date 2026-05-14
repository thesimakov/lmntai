import { z } from "zod";

const forecastPointSchema = z.object({
  period: z.string(),
  value: z.number(),
  isHistorical: z.boolean(),
  low: z.number().optional(),
  high: z.number().optional(),
});

const forecastMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string(),
  points: z.array(forecastPointSchema).min(1),
  trend: z.enum(["up", "down", "neutral"]),
  projectedCagr: z.string().optional(),
  narrative: z.string(),
});

export const forecastReportSchema = z.object({
  generatedAt: z.string().datetime(),
  basePeriod: z.string(),
  metrics: z.array(forecastMetricSchema).min(3).max(5),
  executiveSummary: z.string(),
});

export type ForecastReport = z.infer<typeof forecastReportSchema>;
export type ForecastMetric = z.infer<typeof forecastMetricSchema>;
export type ForecastPoint = z.infer<typeof forecastPointSchema>;
