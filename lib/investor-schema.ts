import { z } from "zod";

const investorSlideSchema = z.object({
  title: z.string(),
  content: z.string(),
  bullets: z.array(z.string()).optional(),
  speakerNotes: z.string().optional(),
  tableData: z.array(z.array(z.string())).optional(),
});

export const investorReportSchema = z.object({
  generatedAt: z.string().datetime(),
  riskScore: z.number().int().min(0).max(100),
  riskLabel: z.enum(["Low", "Medium", "High", "Critical"]),
  riskFactors: z.array(
    z.object({
      factor: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })
  ),
  investmentHighlights: z.array(z.string()),
  forecast: z.object({
    horizon: z.literal("12m"),
    scenarios: z.object({
      optimistic: z.object({ revenue: z.string(), ebitda: z.string(), narrative: z.string() }),
      base: z.object({ revenue: z.string(), ebitda: z.string(), narrative: z.string() }),
      pessimistic: z.object({ revenue: z.string(), ebitda: z.string(), narrative: z.string() }),
    }),
  }),
  vcPitch: z.object({ slides: z.array(investorSlideSchema).min(10).max(10) }),
  boardReport: z.object({ slides: z.array(investorSlideSchema).min(14).max(14) }),
  dueDiligence: z.object({
    slides: z.array(investorSlideSchema).min(8).max(8),
    keyQuestions: z.array(z.string()),
    dataRoomChecklist: z.array(z.string()),
  }),
});

export type InvestorReport = z.infer<typeof investorReportSchema>;
export type InvestorSlide = z.infer<typeof investorSlideSchema>;
