import { z } from "zod";

export const kpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.string().optional(),
  trend: z.enum(["up", "down", "neutral"]),
  category: z.enum(["revenue", "profitability", "liquidity", "growth", "efficiency"]),
});

export const chartSchema = z.object({
  id: z.string(),
  type: z.enum(["bar", "line", "area", "pie", "waterfall"]),
  title: z.string(),
  description: z.string().optional(),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
});

export const tableSchema = z.object({
  title: z.string(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const analysisDashboardSchema = z.object({
  meta: z.object({
    companyName: z.string(),
    period: z.string(),
    documentType: z.string(),
    currency: z.string(),
    analyzedAt: z.string().datetime(),
  }),
  summary: z.object({
    executive: z.string(),
    keyFindings: z.array(z.string()),
    redFlags: z.array(z.string()),
    opportunities: z.array(z.string()),
  }),
  kpis: z.array(kpiSchema),
  charts: z.array(chartSchema),
  tables: z.array(tableSchema),
  narrative: z.string(),
});

export type AnalysisDashboard = z.infer<typeof analysisDashboardSchema>;
export type Kpi = z.infer<typeof kpiSchema>;
export type Chart = z.infer<typeof chartSchema>;
export type AnalysisTable = z.infer<typeof tableSchema>;
