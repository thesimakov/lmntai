# Forecasting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Forecasting feature that generates interactive time-series forecast charts (history + projection + confidence band) from an existing `AnalysisDashboard`, with a 6-slide PPTX export.

**Architecture:** AI reads `analysis.json`, generates `forecast.json` with structured time-series data for 3–5 financial metrics (up to 24 months forward). A new "Forecast" tab in the analytics editor's left panel renders a Recharts `ComposedChart` with metric selector and horizon toggle. Export via existing `/export` endpoint with `"forecast-pptx"` format.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Zod, Zustand, Recharts (already installed), PptxGenJS (already installed), RouterAI gateway

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/forecast-schema.ts` | Create | Zod schema + TS types |
| `lib/forecast-schema.test.ts` | Create | Schema validation tests |
| `lib/forecast-prompt.ts` | Create | AI prompt builder |
| `lib/forecast-prompt.test.ts` | Create | Prompt structure tests |
| `lib/stores/use-analytics-store.ts` | Modify | Add forecast state fields |
| `app/api/analytics/[id]/forecast/route.ts` | Create | POST endpoint — generate forecast |
| `lib/forecast-pptx-export.ts` | Create | 6-slide PPTX builder |
| `lib/forecast-pptx-export.test.ts` | Create | PPTX smoke tests |
| `app/api/analytics/[id]/export/route.ts` | Modify | Add `"forecast-pptx"` format |
| `components/playground/analytics/analytics-forecast-panel.tsx` | Create | Left panel tab UI |
| `components/playground/analytics/analytics-editor.tsx` | Modify | Add Forecast tab |

---

### Task 1: Forecast Schema

**Files:**
- Create: `lib/forecast-schema.ts`
- Create: `lib/forecast-schema.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/forecast-schema.test.ts
import { describe, it, expect } from "vitest";
import { forecastReportSchema } from "./forecast-schema";

function makePoint(period: string, isHistorical: boolean) {
  return {
    period,
    value: 1000,
    isHistorical,
    ...(isHistorical ? {} : { low: 900, high: 1100 }),
  };
}

function makeMetric(key: string) {
  return {
    key,
    label: key,
    unit: "$",
    trend: "up" as const,
    narrative: "Test narrative.",
    points: [makePoint("2023-10", true), makePoint("2024-01", false)],
  };
}

const VALID_REPORT = {
  generatedAt: "2024-01-15T10:00:00.000Z",
  basePeriod: "2023-12",
  executiveSummary: "Strong revenue growth expected.",
  metrics: [makeMetric("revenue"), makeMetric("ebitda"), makeMetric("burn_rate")],
};

describe("forecastReportSchema", () => {
  it("accepts a valid report", () => {
    expect(forecastReportSchema.safeParse(VALID_REPORT).success).toBe(true);
  });

  it("rejects fewer than 3 metrics", () => {
    const bad = { ...VALID_REPORT, metrics: [makeMetric("revenue"), makeMetric("ebitda")] };
    expect(forecastReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects more than 5 metrics", () => {
    const bad = {
      ...VALID_REPORT,
      metrics: ["a", "b", "c", "d", "e", "f"].map(makeMetric),
    };
    expect(forecastReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid generatedAt datetime", () => {
    const bad = { ...VALID_REPORT, generatedAt: "not-a-date" };
    expect(forecastReportSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/forecast-schema.test.ts
```

Expected: FAIL — `Cannot find module './forecast-schema'`

- [ ] **Step 3: Implement the schema**

```typescript
// lib/forecast-schema.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/forecast-schema.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-schema.ts lib/forecast-schema.test.ts
git commit -m "feat: add ForecastReport Zod schema"
```

---

### Task 2: Forecast AI Prompt

**Files:**
- Create: `lib/forecast-prompt.ts`
- Create: `lib/forecast-prompt.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/forecast-prompt.test.ts
import { describe, it, expect } from "vitest";
import { buildForecastPrompt } from "./forecast-prompt";
import type { AnalysisDashboard } from "./analytics-schema";

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "FY2023",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-15T10:00:00.000Z",
  },
  summary: {
    executive: "Strong performance.",
    keyFindings: ["Revenue grew 18%"],
    redFlags: [],
    opportunities: ["International expansion"],
  },
  kpis: [],
  charts: [],
  tables: [],
  narrative: "Full narrative here.",
};

describe("buildForecastPrompt", () => {
  it("returns exactly 2 messages", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs).toHaveLength(2);
  });

  it("first message is system role", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs[0].role).toBe("system");
  });

  it("system prompt mentions forecast and 24 months", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs[0].content).toContain("forecast");
    expect(msgs[0].content).toContain("24");
  });

  it("user message contains company name", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs[1].content).toContain("Acme Corp");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/forecast-prompt.test.ts
```

Expected: FAIL — `Cannot find module './forecast-prompt'`

- [ ] **Step 3: Implement the prompt builder**

```typescript
// lib/forecast-prompt.ts
import type { AnalysisDashboard } from "./analytics-schema";

const SYSTEM_PROMPT = `You are a financial forecasting analyst. Given a structured financial analysis, generate a 24-month forward forecast.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "generatedAt": string,         // current ISO timestamp (will be overridden by server)
  "basePeriod": string,          // last historical data period, e.g. "2023-12" or "FY2023"
  "executiveSummary": string,    // 2-3 sentences summarising the forecast outlook
  "metrics": [                   // 3 to 5 metrics
    {
      "key": string,             // one of: "revenue", "ebitda", "burn_rate", "runway", "mrr", "gross_profit"
      "label": string,           // human-readable label, e.g. "Revenue"
      "unit": string,            // "$", "%", "months", or the document currency symbol
      "trend": "up" | "down" | "neutral",
      "projectedCagr": string,   // optional, e.g. "+18% projected CAGR"
      "narrative": string,       // 1-2 sentences about this metric's forecast
      "points": [                // historical then forecast, chronological order
        {
          "period": string,      // "2023-01", "2023-Q1", or "FY2023" — match document granularity
          "value": number,       // always a raw number (no currency symbols)
          "isHistorical": boolean,
          "low": number,         // only for forecast points: lower confidence bound (value * 0.85 to 0.90)
          "high": number         // only for forecast points: upper confidence bound (value * 1.10 to 1.15)
        }
      ]
    }
  ]
}

Rules:
- Always include "revenue" as the first metric if data is available.
- Include 4-8 historical data points per metric extracted from the dashboard data.
- Generate 12-24 future forecast points per metric (monthly or quarterly, matching the document granularity).
- Confidence bands: forecast points should have low/high bounds. Higher uncertainty = wider band.
- "burn_rate" trend is "down" if decreasing (improving), "up" if worsening.
- All values must be raw numbers — no currency symbols, no commas, no "M" or "K" suffixes.
- Return ONLY the JSON — no preamble, no explanation, no markdown.`;

type Message = { role: "system" | "user" | "assistant"; content: string };

export function buildForecastPrompt(dashboard: AnalysisDashboard): Message[] {
  const now = new Date().toISOString();
  const dashboardJson = JSON.stringify(dashboard, null, 2);
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\nCompany: ${dashboard.meta.companyName}\nPeriod: ${dashboard.meta.period}\nCurrency: ${dashboard.meta.currency}\n\n--- ANALYSIS DATA ---\n\n${dashboardJson}`,
    },
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/forecast-prompt.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-prompt.ts lib/forecast-prompt.test.ts
git commit -m "feat: add forecast AI prompt builder"
```

---

### Task 3: Zustand Store — Forecast Fields

**Files:**
- Modify: `lib/stores/use-analytics-store.ts`

Read the current file before editing. It already has `InvestorStatus` and investor fields — add forecast fields following the exact same pattern.

- [ ] **Step 1: Add `ForecastStatus` export and forecast fields**

In `lib/stores/use-analytics-store.ts`, make these changes:

1. Add import at top (after the existing InvestorReport import):
```typescript
import type { ForecastReport } from "@/lib/forecast-schema";
```

2. Add the type export after `InvestorStatus`:
```typescript
export type ForecastStatus = "idle" | "generating" | "ready" | "error";
```

3. In `AnalyticsStore` interface, add after the investor fields:
```typescript
forecastReport: ForecastReport | null;
forecastStatus: ForecastStatus;
forecastError: string | null;

setForecastReport: (r: ForecastReport) => void;
setForecastStatus: (s: ForecastStatus) => void;
setForecastError: (msg: string) => void;
```

4. In `initialState`, add after investor initial values:
```typescript
forecastReport: null,
forecastStatus: "idle" as ForecastStatus,
forecastError: null,
```

5. In the `create()` call, add after the investor setters:
```typescript
setForecastReport: (forecastReport) =>
  set({ forecastReport, forecastStatus: "ready", forecastError: null }),
setForecastStatus: (forecastStatus) => set({ forecastStatus }),
setForecastError: (forecastError) =>
  set({ forecastStatus: "error", forecastError }),
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all existing tests still pass

- [ ] **Step 4: Commit**

```bash
git add lib/stores/use-analytics-store.ts
git commit -m "feat: add forecast state to analytics store"
```

---

### Task 4: POST /api/analytics/[id]/forecast

**Files:**
- Create: `app/api/analytics/[id]/forecast/route.ts`

This follows the exact same pattern as `app/api/analytics/[id]/investor/route.ts`. Read that file before writing.

- [ ] **Step 1: Create the route**

```typescript
// app/api/analytics/[id]/forecast/route.ts
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildForecastPrompt } from "@/lib/forecast-prompt";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { forecastReportSchema } from "@/lib/forecast-schema";
import { chargeTokensSafely } from "@/lib/token-billing";

const FORECAST_MODEL = "anthropic/claude-sonnet-4.5";

const RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure metrics has 3-5 items, each with at least 1 point, and generatedAt is a valid ISO timestamp.";

function tryParseReport(text: string): ReturnType<typeof forecastReportSchema.safeParse> | null {
  try {
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const parsed = JSON.parse(jsonText) as unknown;
    return forecastReportSchema.safeParse(parsed);
  } catch {
    return null;
  }
}

class AICallError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "AICallError";
  }
}

async function callForecastAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  userId: string,
  projectId: string
) {
  try {
    const result = await requestRouterAIJson({
      messages,
      model: FORECAST_MODEL,
      settings: { temperature: 0.1, max_completion_tokens: 12000 },
      user: userId,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId,
        projectId,
        usage: result.usage,
        model: result.model ?? FORECAST_MODEL,
      });
    }
    return result;
  } catch (err) {
    throw new AICallError(err);
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const user = guard.data.user;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch (err) {
    if (err instanceof Error && err.message === "PROJECT_NOT_FOUND") {
      return apiError("Project not found or access denied", 403);
    }
    throw err;
  }

  const state = await getSandboxProjectState(projectId);
  if (!state) return apiError("No analysis found. Upload and analyze a PDF first.", 400);
  const rawAnalysis = state.files["analysis.json"];
  if (!rawAnalysis) return apiError("No analysis found. Upload and analyze a PDF first.", 400);

  let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
  try {
    dashboard = analysisDashboardSchema.parse(JSON.parse(rawAnalysis));
  } catch {
    return apiError("Analysis data is corrupted.", 422);
  }

  const messages = buildForecastPrompt(dashboard);

  // First attempt
  let result1: Awaited<ReturnType<typeof callForecastAI>>;
  try {
    result1 = await callForecastAI(messages, user.id, projectId);
  } catch {
    return apiError("AI service temporarily unavailable", 502);
  }
  const v1 = tryParseReport(result1.text);

  if (v1?.success) {
    const reportWithTimestamp = { ...v1.data, generatedAt: new Date().toISOString() };
    const freshState1 = await getSandboxProjectState(projectId);
    const freshFiles1 = freshState1?.files ?? {};
    await upsertSandboxProjectState({
      projectId,
      sandboxId: state.sandboxId,
      ownerId: user.id,
      title: state.title,
      html: state.html,
      files: { ...freshFiles1, "forecast.json": JSON.stringify(reportWithTimestamp) },
    });
    return apiOk({ report: reportWithTimestamp });
  }

  // Retry once
  const retryMessages = [
    ...messages,
    { role: "assistant" as const, content: result1.text },
    { role: "user" as const, content: RETRY_MESSAGE },
  ];
  let result2: Awaited<ReturnType<typeof callForecastAI>>;
  try {
    result2 = await callForecastAI(retryMessages, user.id, projectId);
  } catch {
    return apiError("AI service temporarily unavailable", 502);
  }
  const v2 = tryParseReport(result2.text);

  if (!v2?.success) {
    return apiError("AI response did not match expected schema after retry. Please try again.", 422);
  }

  const reportWithTimestamp = { ...v2.data, generatedAt: new Date().toISOString() };
  const freshState2 = await getSandboxProjectState(projectId);
  const freshFiles2 = freshState2?.files ?? {};
  await upsertSandboxProjectState({
    projectId,
    sandboxId: state.sandboxId,
    ownerId: user.id,
    title: state.title,
    html: state.html,
    files: { ...freshFiles2, "forecast.json": JSON.stringify(reportWithTimestamp) },
  });

  return apiOk({ report: reportWithTimestamp });
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/[id]/forecast/route.ts
git commit -m "feat: add POST /api/analytics/[id]/forecast endpoint"
```

---

### Task 5: Forecast PPTX Builder

**Files:**
- Create: `lib/forecast-pptx-export.ts`
- Create: `lib/forecast-pptx-export.test.ts`

Read `lib/investor-pptx-export.ts` before writing — reuse the same THEME object and helper functions (`addSlide`, `addTitleSlide`, `addBulletsSlide`).

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/forecast-pptx-export.test.ts
import { describe, it, expect } from "vitest";
import { buildForecastPptx } from "./forecast-pptx-export";
import type { ForecastReport } from "./forecast-schema";
import type { AnalysisDashboard } from "./analytics-schema";

function makePoint(period: string, isHistorical: boolean) {
  return { period, value: 1000000, isHistorical, low: isHistorical ? undefined : 900000, high: isHistorical ? undefined : 1100000 };
}

const MOCK_REPORT: ForecastReport = {
  generatedAt: "2024-01-15T10:00:00.000Z",
  basePeriod: "2023-12",
  executiveSummary: "Revenue is expected to grow 18% over the next 12 months.",
  metrics: [
    { key: "revenue", label: "Revenue", unit: "$", trend: "up", projectedCagr: "+18%", narrative: "Strong growth expected.", points: [makePoint("2023-10", true), makePoint("2023-11", true), makePoint("2024-01", false), makePoint("2024-02", false)] },
    { key: "ebitda", label: "EBITDA", unit: "$", trend: "up", narrative: "Margins improving.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
    { key: "burn_rate", label: "Burn Rate", unit: "$", trend: "down", narrative: "Burn rate stabilising.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
  ],
};

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: { companyName: "Acme Corp", period: "FY2023", documentType: "P&L", currency: "USD", analyzedAt: "2024-01-15T10:00:00.000Z" },
  summary: { executive: "Good.", keyFindings: [], redFlags: [], opportunities: [] },
  kpis: [],
  charts: [],
  tables: [],
  narrative: "",
};

describe("buildForecastPptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildForecastPptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("handles missing revenue/ebitda metrics gracefully", async () => {
    const noRevenue: ForecastReport = {
      ...MOCK_REPORT,
      metrics: [
        { key: "mrr", label: "MRR", unit: "$", trend: "up", narrative: "Growing.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
        { key: "burn_rate", label: "Burn Rate", unit: "$", trend: "down", narrative: "Stable.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
        { key: "runway", label: "Runway", unit: "months", trend: "neutral", narrative: "14 months.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
      ],
    };
    const buf = await buildForecastPptx(noRevenue, MOCK_DASHBOARD);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/forecast-pptx-export.test.ts
```

Expected: FAIL — `Cannot find module './forecast-pptx-export'`

- [ ] **Step 3: Implement the PPTX builder**

```typescript
// lib/forecast-pptx-export.ts
import PptxGenJS from "pptxgenjs";
import type { ForecastReport, ForecastMetric } from "./forecast-schema";
import type { AnalysisDashboard } from "./analytics-schema";

const THEME = {
  bg: "1A1A2E",
  accent: "4F8EF7",
  text: "FFFFFF",
  subtext: "AAAACC",
  dark: "16213E",
  green: "4CAF50",
  red: "F44336",
  muted: "555577",
};

function addSlide(pptx: PptxGenJS, title: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  s.addText(title, {
    x: 0.5, y: 0.2, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent,
  });
  return s;
}

function findMetric(report: ForecastReport, key: string): ForecastMetric | undefined {
  return report.metrics.find((m) => m.key === key);
}

function metricToTableRows(metric: ForecastMetric): string[][] {
  return metric.points.map((p) => {
    const bandStr =
      p.low !== undefined && p.high !== undefined
        ? `${metric.unit}${p.low.toLocaleString()} – ${metric.unit}${p.high.toLocaleString()}`
        : "—";
    return [
      p.period,
      `${metric.unit}${p.value.toLocaleString()}`,
      p.isHistorical ? "Historical" : "Forecast",
      bandStr,
    ];
  });
}

function addMetricSlide(
  pptx: PptxGenJS,
  title: string,
  metric: ForecastMetric | undefined,
  fallbackMessage: string
) {
  const s = addSlide(pptx, title);
  if (!metric) {
    s.addText(fallbackMessage, {
      x: 0.5, y: 1.2, w: "90%", h: 0.5,
      fontSize: 14, color: THEME.subtext,
    });
    return;
  }

  s.addText(metric.narrative, {
    x: 0.5, y: 1.0, w: "90%", h: 0.6,
    fontSize: 13, color: THEME.subtext, italic: true,
  });

  if (metric.projectedCagr) {
    s.addText(`Projected: ${metric.projectedCagr}`, {
      x: 0.5, y: 1.65, w: "90%", h: 0.4,
      fontSize: 13, bold: true,
      color: metric.trend === "up" ? THEME.green : metric.trend === "down" ? THEME.red : THEME.text,
    });
  }

  const rows = metricToTableRows(metric);
  const tableData = [
    [
      { text: "Period", options: { bold: true, color: THEME.text } },
      { text: "Value", options: { bold: true, color: THEME.text } },
      { text: "Type", options: { bold: true, color: THEME.text } },
      { text: "Range", options: { bold: true, color: THEME.text } },
    ],
    ...rows.map((row) =>
      row.map((cell, i) => ({
        text: cell,
        options: {
          color:
            i === 2 && cell === "Forecast"
              ? THEME.accent
              : THEME.text,
        },
      }))
    ),
  ];

  s.addTable(tableData, {
    x: 0.5, y: 2.1, w: "90%",
    fontSize: 11,
    border: { type: "solid", color: THEME.muted, pt: 0.5 },
    fill: { color: THEME.dark },
    color: THEME.text,
  });
}

export async function buildForecastPptx(
  report: ForecastReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period = dashboard.meta.period;

  // Slide 1: Cover
  const cover = pptx.addSlide();
  cover.background = { color: THEME.dark };
  cover.addText(company, {
    x: 0.5, y: 1.8, w: "90%", h: 1.0,
    fontSize: 36, bold: true, color: THEME.text, align: "center",
  });
  cover.addText("Financial Forecast", {
    x: 0.5, y: 2.9, w: "90%", h: 0.7,
    fontSize: 22, color: THEME.accent, align: "center",
  });
  cover.addText(`${period} · Base period: ${report.basePeriod}`, {
    x: 0.5, y: 3.7, w: "90%", h: 0.4,
    fontSize: 13, color: THEME.subtext, align: "center",
  });

  // Slide 2: Executive Summary
  const summary = addSlide(pptx, "Executive Summary");
  summary.addText(report.executiveSummary, {
    x: 0.5, y: 1.0, w: "90%", h: 1.5,
    fontSize: 16, color: THEME.text, valign: "top",
  });
  summary.addText(`Base period: ${report.basePeriod}`, {
    x: 0.5, y: 2.8, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.subtext,
  });
  const highlightMetrics = report.metrics
    .filter((m) => m.projectedCagr)
    .map((m) => `${m.label}: ${m.projectedCagr ?? ""}`);
  if (highlightMetrics.length > 0) {
    const parts = highlightMetrics.map((item) => ({ text: `• ${item}`, options: { color: THEME.accent } }));
    summary.addText(parts, {
      x: 0.5, y: 3.3, w: "90%", h: 1.5,
      fontSize: 14, paraSpaceAfter: 6, valign: "top",
    });
  }

  // Slide 3: Revenue Forecast
  addMetricSlide(pptx, "Revenue Forecast", findMetric(report, "revenue"), "Revenue data not available in this analysis.");

  // Slide 4: EBITDA & Profitability
  addMetricSlide(pptx, "EBITDA & Profitability", findMetric(report, "ebitda"), "EBITDA data not available in this analysis.");

  // Slide 5: Key Metrics
  const keySlide = addSlide(pptx, "Key Metrics");
  const otherMetrics = report.metrics.filter(
    (m) => m.key !== "revenue" && m.key !== "ebitda"
  );
  let yPos = 1.0;
  for (const metric of otherMetrics) {
    const lastPoint = [...metric.points].reverse().find((p) => !p.isHistorical) ?? metric.points[metric.points.length - 1];
    const trendColor = metric.trend === "up" ? THEME.green : metric.trend === "down" ? THEME.red : THEME.text;
    keySlide.addText(metric.label, {
      x: 0.5, y: yPos, w: 3.0, h: 0.4,
      fontSize: 14, bold: true, color: THEME.text,
    });
    keySlide.addText(
      `${metric.unit}${lastPoint?.value.toLocaleString() ?? "—"} projected`,
      { x: 3.5, y: yPos, w: 3.0, h: 0.4, fontSize: 14, color: trendColor }
    );
    if (metric.projectedCagr) {
      keySlide.addText(metric.projectedCagr, {
        x: 6.5, y: yPos, w: 2.5, h: 0.4,
        fontSize: 13, color: THEME.accent,
      });
    }
    keySlide.addText(metric.narrative, {
      x: 0.5, y: yPos + 0.4, w: "90%", h: 0.35,
      fontSize: 11, color: THEME.subtext, italic: true,
    });
    yPos += 1.0;
  }

  // Slide 6: Assumptions & Disclaimer
  const assumptionsSlide = addSlide(pptx, "Assumptions & Methodology");
  const historicalPeriods = report.metrics[0]?.points
    .filter((p) => p.isHistorical)
    .map((p) => p.period) ?? [];
  assumptionsSlide.addText("Historical data periods used:", {
    x: 0.5, y: 1.0, w: "90%", h: 0.4,
    fontSize: 13, bold: true, color: THEME.text,
  });
  assumptionsSlide.addText(historicalPeriods.join(" · ") || "See analysis dashboard", {
    x: 0.5, y: 1.5, w: "90%", h: 0.5,
    fontSize: 12, color: THEME.subtext,
  });
  assumptionsSlide.addText(
    "Confidence bands represent ±10–20% uncertainty range based on historical volatility. " +
    "All forecasts are AI-generated estimates and should not be used as the sole basis for investment decisions.",
    {
      x: 0.5, y: 3.5, w: "90%", h: 1.2,
      fontSize: 11, color: THEME.subtext, italic: true,
    }
  );

  const output = await pptx.write({ outputType: "arraybuffer" });
  if (!(output instanceof ArrayBuffer)) {
    throw new Error("pptxgenjs returned unexpected type");
  }
  return Buffer.from(output);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/forecast-pptx-export.test.ts
```

Expected: 2 tests PASS

- [ ] **Step 5: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add lib/forecast-pptx-export.ts lib/forecast-pptx-export.test.ts
git commit -m "feat: add 6-slide forecast PPTX builder"
```

---

### Task 6: Extend Export Route

**Files:**
- Modify: `app/api/analytics/[id]/export/route.ts`

Read the current file before editing. The current enum is:
```typescript
format: z.enum(["pptx", "investor-vc-pptx", "investor-board-pptx", "investor-dd-pptx"])
```

- [ ] **Step 1: Add `"forecast-pptx"` to the enum and handler**

Make these changes to `app/api/analytics/[id]/export/route.ts`:

1. Add import at the top:
```typescript
import { buildForecastPptx } from "@/lib/forecast-pptx-export";
import { forecastReportSchema } from "@/lib/forecast-schema";
```

2. Change the enum:
```typescript
format: z.enum(["pptx", "investor-vc-pptx", "investor-board-pptx", "investor-dd-pptx", "forecast-pptx"]),
```

3. Before the final `// investor-dd-pptx` block, add:
```typescript
  if (format === "forecast-pptx") {
    const rawForecast = state.files["forecast.json"];
    if (!rawForecast) {
      return apiError("Forecast not generated yet. Click 'Generate Forecast' first.", 404);
    }
    let forecastReport: ReturnType<typeof forecastReportSchema.parse>;
    try {
      forecastReport = forecastReportSchema.parse(JSON.parse(rawForecast));
    } catch {
      return apiError("Forecast data is corrupted.", 422);
    }
    const buffer = await buildForecastPptx(forecastReport, dashboard);
    return pptxResponse(buffer, `${baseFilename}_Forecast.pptx`);
  }
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/[id]/export/route.ts
git commit -m "feat: add forecast-pptx format to export route"
```

---

### Task 7: Forecast Panel UI

**Files:**
- Create: `components/playground/analytics/analytics-forecast-panel.tsx`

Read `components/playground/analytics/analytics-investor-panel.tsx` before writing — use it as a structural model.

- [ ] **Step 1: Create the panel component**

```typescript
// components/playground/analytics/analytics-forecast-panel.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { LineChart, Loader2, Download, ChevronRight } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { cn } from "@/lib/utils";
import type { ForecastReport, ForecastMetric } from "@/lib/forecast-schema";

interface Props {
  projectId: string;
}

type Horizon = "6m" | "12m" | "24m";

const HORIZON_COUNTS: Record<Horizon, number> = { "6m": 6, "12m": 12, "24m": 24 };

function buildChartData(metric: ForecastMetric, horizon: Horizon) {
  const maxFuture = HORIZON_COUNTS[horizon];
  const historical = metric.points.filter((p) => p.isHistorical);
  const forecast = metric.points.filter((p) => !p.isHistorical).slice(0, maxFuture);
  return [...historical, ...forecast].map((p) => ({
    period: p.period,
    historicalValue: p.isHistorical ? p.value : undefined,
    forecastValue: !p.isHistorical ? p.value : undefined,
    bandHigh: !p.isHistorical ? (p.high ?? undefined) : undefined,
    bandLow: !p.isHistorical ? (p.low ?? undefined) : undefined,
  }));
}

async function downloadForecastPptx(projectId: string) {
  const res = await fetch(`/api/analytics/${projectId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format: "forecast-pptx" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "forecast.pptx";
  a.click();
  URL.revokeObjectURL(url);
}

function ForecastChart({
  metric,
  horizon,
  basePeriod,
}: {
  metric: ForecastMetric;
  horizon: Horizon;
  basePeriod: string;
}) {
  const data = useMemo(() => buildChartData(metric, horizon), [metric, horizon]);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 9, fill: "#888" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#888" }}
          width={40}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${metric.unit}${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `${metric.unit}${(v / 1_000).toFixed(0)}K`
              : `${metric.unit}${v}`
          }
        />
        <Tooltip
          contentStyle={{ background: "#1A1A2E", border: "1px solid #333", fontSize: 11 }}
          formatter={(value: number) => [`${metric.unit}${value.toLocaleString()}`, ""]}
        />
        {/* Confidence band: high fill, then low fill cuts it */}
        <Area
          type="monotone"
          dataKey="bandHigh"
          stroke="none"
          fill="#4F8EF7"
          fillOpacity={0.15}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="bandLow"
          stroke="none"
          fill="hsl(var(--card))"
          fillOpacity={1}
          connectNulls={false}
          isAnimationActive={false}
        />
        {/* Historical area */}
        <Area
          type="monotone"
          dataKey="historicalValue"
          stroke="#4F8EF7"
          strokeWidth={2}
          fill="url(#histGrad)"
          dot={false}
          connectNulls={false}
        />
        {/* Forecast line (dashed) */}
        <Line
          type="monotone"
          dataKey="forecastValue"
          stroke="#4F8EF7"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          connectNulls={false}
        />
        <ReferenceLine
          x={basePeriod}
          stroke="#555"
          strokeDasharray="3 3"
          label={{ value: "now", fill: "#666", fontSize: 9 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsForecastPanel({ projectId }: Props) {
  const {
    dashboard,
    forecastReport,
    forecastStatus,
    forecastError,
    setForecastReport,
    setForecastStatus,
    setForecastError,
  } = useAnalyticsStore();

  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>("12m");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setForecastError("");
    setForecastStatus("generating");
    setDownloadError(null);
    try {
      const res = await fetch(`/api/analytics/${projectId}/forecast`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setForecastError(err.error ?? "Generation failed");
        return;
      }
      const data = await res.json() as { data?: { report?: unknown } };
      const { forecastReportSchema } = await import("@/lib/forecast-schema");
      const parsed = forecastReportSchema.safeParse(data.data?.report);
      if (!parsed.success) {
        setForecastError("Invalid response from server");
        return;
      }
      setForecastReport(parsed.data);
      setSelectedMetricKey(parsed.data.metrics[0]?.key ?? null);
    } catch (err) {
      setForecastError(err instanceof Error ? err.message : "Generation failed");
    }
  }, [projectId, setForecastReport, setForecastStatus, setForecastError]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadForecastPptx(projectId);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }, [projectId]);

  if (!dashboard) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          Upload and analyze a PDF first to generate a financial forecast.
        </p>
      </div>
    );
  }

  if (forecastStatus === "idle" || forecastStatus === "error") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Generate a 24-month financial forecast with confidence bands for key metrics.
        </p>
        <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-col gap-1">
          <p className="text-xs font-medium text-foreground">What you get</p>
          <p className="text-[11px] text-muted-foreground">• Revenue, EBITDA & key metrics forecast</p>
          <p className="text-[11px] text-muted-foreground">• Confidence bands (±10–20%)</p>
          <p className="text-[11px] text-muted-foreground">• 6-slide PPTX export</p>
        </div>
        {forecastStatus === "error" && forecastError && (
          <p className="text-xs text-red-500">{forecastError}</p>
        )}
        <Button size="sm" className="w-full gap-1.5" onClick={() => void handleGenerate()}>
          <LineChart className="w-3.5 h-3.5" />
          Generate Forecast
        </Button>
      </div>
    );
  }

  if (forecastStatus === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground text-center">
          Generating forecast…
          <br />
          This may take 30–60 seconds.
        </p>
      </div>
    );
  }

  // ready
  const report = forecastReport as ForecastReport;
  const activeMetric =
    report.metrics.find((m) => m.key === selectedMetricKey) ?? report.metrics[0];

  if (!activeMetric) return null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-1">
        {report.metrics.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSelectedMetricKey(m.key)}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
              m.key === activeMetric.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Horizon toggle */}
      <div className="flex gap-1">
        {(["6m", "12m", "24m"] as Horizon[]).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            className={cn(
              "flex-1 py-0.5 rounded text-[11px] font-medium border transition-colors",
              horizon === h
                ? "bg-muted text-foreground border-border"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-md border border-border bg-card/50 p-2">
        <ForecastChart
          metric={activeMetric}
          horizon={horizon}
          basePeriod={report.basePeriod}
        />
      </div>

      {/* Narrative */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {activeMetric.narrative}
        {activeMetric.projectedCagr && (
          <span className="ml-1 text-primary font-medium">{activeMetric.projectedCagr}</span>
        )}
      </p>

      {/* Download */}
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 text-xs"
        disabled={isDownloading}
        onClick={() => void handleDownload()}
      >
        {isDownloading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        Download Forecast PPTX
      </Button>
      {downloadError && <p className="text-xs text-red-500">{downloadError}</p>}

      {/* Regenerate */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-1.5 text-xs text-muted-foreground"
        onClick={() => void handleGenerate()}
      >
        <ChevronRight className="w-3 h-3" />
        Regenerate
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/playground/analytics/analytics-forecast-panel.tsx
git commit -m "feat: add analytics forecast panel UI with Recharts chart"
```

---

### Task 8: Add Forecast Tab to Analytics Editor

**Files:**
- Modify: `components/playground/analytics/analytics-editor.tsx`

Read the current file before editing. Current `LeftTab = "chat" | "investor"`. Add `"forecast"`.

- [ ] **Step 1: Apply changes**

In `components/playground/analytics/analytics-editor.tsx`, make these changes:

1. Add to the existing imports:
```typescript
import { LineChart } from "lucide-react";  // add to existing lucide import line
import { AnalyticsForecastPanel } from "./analytics-forecast-panel";
```

2. Change the `LeftTab` type:
```typescript
type LeftTab = "chat" | "investor" | "forecast";
```

3. In the tab bar section (after the Investor tab button), add:
```typescript
<button
  type="button"
  onClick={() => setLeftTab("forecast")}
  className={cn(
    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
    leftTab === "forecast"
      ? "text-foreground border-b-2 border-primary -mb-px"
      : "text-muted-foreground hover:text-foreground"
  )}
>
  <LineChart className="w-3.5 h-3.5" />
  Forecast
</button>
```

4. In the tab content section, add the Forecast panel case:
```typescript
{leftTab === "chat" ? (
  <AnalyticsChatPanel projectId={projectId} />
) : leftTab === "investor" ? (
  <AnalyticsInvestorPanel projectId={projectId} />
) : (
  <AnalyticsForecastPanel projectId={projectId} />
)}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all 168+ tests pass

- [ ] **Step 4: Commit**

```bash
git add components/playground/analytics/analytics-editor.tsx
git commit -m "feat: add Forecast tab to analytics editor"
```
