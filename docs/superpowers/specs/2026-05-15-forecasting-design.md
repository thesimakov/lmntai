# Forecasting — Design Spec

**Date:** 2026-05-15
**Context:** Lemnity Analytics MVP already exists: PDF → AI → `AnalysisDashboard` JSON → dashboard + chat + PPTX + InvestorReport. This spec adds a standalone Forecasting layer on top of the existing analysis.

---

## Goal

From an already-analyzed financial document, generate interactive time-series forecast charts (history + projection + confidence band) for key financial metrics, accessible via a new "Forecast" tab in the left panel of the analytics editor. Export to a 6-slide PPTX.

---

## Architecture

```
AnalysisDashboard (files["analysis.json"] — already exists)
    ↓
POST /api/analytics/[id]/forecast   ← new endpoint
    ↓
RouterAI (Claude Sonnet) — forecast prompt, JSON mode
    ↓
ForecastReport JSON → files["forecast.json"]
    ↓
    ├── analytics-forecast-panel.tsx — metric selector + horizon toggle + Recharts AreaChart
    └── POST /export { format: "forecast-pptx" } → 6-slide PPTX
```

**Constraints:**
- No new Prisma models — data lives in `SandboxProjectState.files`
- No new npm deps — Recharts and pptxgenjs already in project
- Auth: `requireDbUser()` + `requireProjectScopeForOwner()` (same as investor route)
- Billing: `chargeTokensSafely()` same as existing AI routes

---

## ForecastReport JSON Schema

File: `lib/forecast-schema.ts`

```typescript
export interface ForecastPoint {
  period: string;        // "2024-01" | "2024-Q1" | "FY2024"
  value: number;
  isHistorical: boolean;
  low?: number;          // confidence band lower bound
  high?: number;         // confidence band upper bound
}

export interface ForecastMetric {
  key: string;           // "revenue" | "ebitda" | "burn_rate" | "runway" | "mrr"
  label: string;         // "Revenue"
  unit: string;          // "$" | "%" | "months"
  points: ForecastPoint[];  // historical + forecast points (up to 24m forward)
  trend: "up" | "down" | "neutral";
  projectedCagr?: string;   // "+18% projected CAGR"
  narrative: string;     // 1–2 sentences about this metric's forecast
}

export interface ForecastReport {
  generatedAt: string;   // ISO — set by server after parsing
  basePeriod: string;    // "2024-12" — last historical data point
  metrics: ForecastMetric[];  // 3–5 metrics, min 3
  executiveSummary: string;   // 2–3 sentences
}
```

Zod schema next to the interface. `metrics` array: `.min(3).max(5)`. One retry if AI returns invalid JSON (same pattern as `/investor`). Server overwrites `generatedAt` after successful parse.

---

## AI Prompt Strategy

File: `lib/forecast-prompt.ts`

- Input: full `AnalysisDashboard` JSON
- System prompt: "You are a financial forecasting analyst. Generate a 24-month forward forecast in strict JSON."
- Specifies: extract historical data points from dashboard, generate monthly or quarterly forecast points, include confidence bands (±10–20% of projected value based on uncertainty), provide 3–5 metrics
- Response format: `{ type: "json_object" }` via RouterAI
- Model: `anthropic/claude-sonnet-4-5`
- Expected tokens: ~3 000 in / ~4 000 out

---

## API Routes

### New: `POST /api/analytics/[id]/forecast`

1. Auth: `requireDbUser()` + `requireProjectScopeForOwner()`
2. Read `files["analysis.json"]` — 400 if missing
3. Parse + validate with `analysisDashboardSchema`
4. Build prompt via `buildForecastPrompt(dashboard)` from `lib/forecast-prompt.ts`
5. Call RouterAI (non-streaming, JSON mode)
6. Parse + validate with `forecastReportSchema` (1 retry on failure)
7. Override `generatedAt: new Date().toISOString()`
8. Re-fetch state, save to `files["forecast.json"]`
9. `chargeTokensSafely()`
10. Return `apiOk({ report: ForecastReport })`

### Modified: `POST /api/analytics/[id]/export`

Extend `exportBodySchema` enum with `"forecast-pptx"`:

```typescript
format: z.enum(["pptx", "investor-vc-pptx", "investor-board-pptx", "investor-dd-pptx", "forecast-pptx"])
```

For `"forecast-pptx"`:
1. Read `files["forecast.json"]` — 404 if not generated
2. Read `files["analysis.json"]` — for `meta.companyName` and `meta.period`
3. Call `buildForecastPptx(report, dashboard)` from `lib/forecast-pptx-export.ts`
4. Return `apiFile(buffer, "forecast.pptx", PPTX_MIME)`

---

## PPTX Slide Structure — `buildForecastPptx()`

6 slides, same THEME as investor PPTX (`bg: 1A1A2E`, `accent: 4F8EF7`). Data presented as numeric tables with trend color coding (green/red cells) since pptxgenjs cannot render Recharts charts.

| # | Slide | Data source |
|---|---|---|
| 1 | Cover | `meta.companyName`, `meta.period`, "12-Month Financial Forecast" |
| 2 | Executive Summary | `report.executiveSummary` + `report.basePeriod` |
| 3 | Revenue Forecast | narrative + table of `metrics["revenue"]` points (historical + projected) |
| 4 | EBITDA & Profitability | narrative + table of `metrics["ebitda"]` points |
| 5 | Key Metrics | burn rate, runway, MRR — three columns with trend and `projectedCagr` |
| 6 | Assumptions | list of historical periods + disclaimer "AI-generated forecast" |

---

## UI — Left Panel "Forecast" Tab

File: `components/playground/analytics/analytics-forecast-panel.tsx`

**4 states:**

1. **No dashboard** — message "Run base analysis first"
2. **Idle / error** — description card + "Generate Forecast" button (+ error message if present); `setForecastError("")` called before each new generation attempt
3. **Generating** — spinner + "Generating forecast..."
4. **Ready:**
   - Metric selector pills (Revenue / EBITDA / Burn Rate / Runway / MRR)
   - Horizon toggle (6m / 12m / 24m) — UI-only filter, no new requests
   - `Recharts <AreaChart>`: solid line for history, dashed for forecast, grey `<ReferenceArea>` for confidence band, vertical `<ReferenceLine>` at `basePeriod`
   - Metric narrative (1–2 lines below chart)
   - "Download Forecast PPTX" button
   - "Regenerate" button (small, muted)

**Integration in `analytics-editor.tsx`:**
```tsx
{ id: "forecast", label: "Forecast", icon: LineChart }  // LineChart from lucide-react
```

Tab added alongside Chat and Investor tabs. `LeftTab` type extended with `"forecast"`.

---

## Zustand Store Extension

File: `lib/stores/use-analytics-store.ts`

Add:
```typescript
export type ForecastStatus = "idle" | "generating" | "ready" | "error";

// In AnalyticsStore interface:
forecastReport: ForecastReport | null;
forecastStatus: ForecastStatus;
forecastError: string | null;

setForecastReport: (r: ForecastReport) => void;   // sets report + status "ready" + clears error
setForecastStatus: (s: ForecastStatus) => void;
setForecastError: (msg: string) => void;           // sets error + status "error"
```

---

## Files Changed

### New files

| File | Purpose |
|---|---|
| `lib/forecast-schema.ts` | Zod schema + TS interfaces |
| `lib/forecast-prompt.ts` | AI prompt builder |
| `lib/forecast-pptx-export.ts` | 6-slide PPTX builder |
| `app/api/analytics/[id]/forecast/route.ts` | Generate forecast report |
| `components/playground/analytics/analytics-forecast-panel.tsx` | Left panel tab UI |

### Modified files

| File | Change |
|---|---|
| `app/api/analytics/[id]/export/route.ts` | Add `"forecast-pptx"` to format enum |
| `components/playground/analytics/analytics-editor.tsx` | Add Forecast tab |
| `lib/stores/use-analytics-store.ts` | Add forecast state fields |

---

## Error Handling

| Scenario | Handling |
|---|---|
| `analysis.json` missing | 400 "Run base analysis first" |
| AI returns invalid JSON | 1 retry with corrective prompt, then 422 |
| RouterAI unavailable | 502 "AI service temporarily unavailable" |
| `forecast.json` missing on export | 404 "Generate forecast first" |
| Insufficient tokens | Standard `TOKEN_LIMIT` apiError |
| AI generates < 3 metrics | Zod `.min(3)` fails → retry |

---

## Verification

1. Project with existing `analysis.json` → Forecast tab visible
2. Click "Generate" → spinner → chart with history + projected line appears
3. Switch metrics and horizons — no new network requests
4. Confidence band visible on forecast portion of chart
5. Download Forecast PPTX → 6 slides open in PowerPoint
6. `npx tsc --noEmit` — clean
7. Token charge logged in admin panel after generation
