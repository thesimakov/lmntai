# Investor Analytics — Design Spec

**Date:** 2026-05-14  
**Context:** Lemnity Analytics MVP already exists: PDF → AI → `AnalysisDashboard` JSON → dashboard + chat + PPTX. This spec adds an Investor Analytics layer on top of the existing analysis.

---

## Goal

From an already-analyzed financial document, generate three investor-ready PPTX formats: VC Pitch (10 slides), Board Report (14 slides), Due Diligence (8 slides). Triggered via a new "🚀 Investor" tab in the left panel of the analytics editor.

---

## Architecture

```
AnalysisDashboard (files["analysis.json"] — already exists)
    ↓
POST /api/analytics/[id]/investor   ← new endpoint
    ↓
RouterAI (Claude Sonnet) — investor-specific prompt
    ↓
InvestorReport JSON → files["investor.json"]
    ↓
    ├── analytics-investor-panel.tsx — risk score, forecast, 3 format cards
    ├── POST /export { format: "investor-vc-pptx" }     → 10-slide PPTX
    ├── POST /export { format: "investor-board-pptx" }  → 14-slide PPTX
    └── POST /export { format: "investor-dd-pptx" }     → 8-slide PPTX
```

**Constraints:**
- No new Prisma models — data lives in `SandboxProjectState.files`
- No new npm deps — `pptxgenjs` already in project
- Auth: `requireDbUser()` + `requireProjectScopeForOwner()` pattern (same as chat/export)
- Billing: `chargeTokensSafely()` same as existing AI routes

---

## InvestorReport JSON Schema

File: `lib/investor-schema.ts`

```typescript
export interface InvestorReport {
  generatedAt: string; // ISO timestamp

  riskScore: number;   // 0–100
  riskLabel: "Low" | "Medium" | "High" | "Critical";
  riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high";
  }>;
  investmentHighlights: string[]; // 3–5 bullets

  forecast: {
    horizon: "12m";
    scenarios: {
      optimistic: { revenue: string; ebitda: string; narrative: string };
      base:       { revenue: string; ebitda: string; narrative: string };
      pessimistic:{ revenue: string; ebitda: string; narrative: string };
    };
  };

  vcPitch: {
    slides: Array<{
      title: string;
      content: string;
      bullets?: string[];
      speakerNotes?: string;
    }>;
  };

  boardReport: {
    slides: Array<{
      title: string;
      content: string;
      bullets?: string[];
      tableData?: string[][];
    }>;
  };

  dueDiligence: {
    slides: Array<{
      title: string;
      content: string;
      bullets?: string[];
    }>;
    keyQuestions: string[];
    dataRoomChecklist: string[];
  };
}
```

Zod schema next to the interface. One retry if AI returns invalid JSON (same pattern as `analyze` route).

---

## AI Prompt Strategy

File: `lib/investor-prompt.ts`

- Input: full `AnalysisDashboard` JSON (summary, kpis, charts, tables, narrative)
- System prompt: "You are an investment analyst. Generate investor materials in strict JSON."
- Response format: `{ type: "json_object" }` via RouterAI
- Model: `anthropic/claude-sonnet-4-5` (same as base analyze)
- Expected tokens: ~3 000 in / ~4 000 out

Output must match `InvestorReport` schema exactly. riskScore derivation: AI infers from burn rate, revenue quality, runway, margin trends.

---

## API Routes

### New: `POST /api/analytics/[id]/investor`

1. Auth guard: `requireDbUser()` + `requireProjectScopeForOwner()`
2. Read `files["analysis.json"]` — 400 if missing
3. Parse + validate with `analysisDashboardSchema`
4. Build investor prompt from dashboard
5. Call RouterAI (non-streaming, JSON mode)
6. Parse + validate with `investorReportSchema` (1 retry on failure)
7. Save to `files["investor.json"]`
8. Charge tokens via `chargeTokensSafely()`
9. Return `{ ok: true, report: InvestorReport }`

### Modified: `POST /api/analytics/[id]/export`

Extend `exportBodySchema` to accept three new format values:

```typescript
format: z.enum(["pptx", "investor-vc-pptx", "investor-board-pptx", "investor-dd-pptx"])
```

For investor formats:
1. Read `files["investor.json"]` — 404 if not generated yet
2. Call appropriate builder from `lib/investor-pptx-export.ts`
3. Return `.pptx` file download

---

## PPTX Slide Structure

### VC Pitch (10 slides) — `buildVcPitchPptx()`

| # | Slide | Data source |
|---|---|---|
| 1 | Cover | `meta.companyName`, `meta.period` |
| 2 | Investment Highlights | `investmentHighlights` |
| 3 | Key Metrics | `kpis` (top 6) |
| 4 | Revenue Story | `vcPitch.slides[3]` |
| 5 | Growth Trajectory | `charts` bar/line |
| 6 | Unit Economics | `vcPitch.slides[5]` |
| 7 | 12M Forecast | `forecast.scenarios` table |
| 8 | Risk Assessment | `riskScore` gauge + `riskFactors` |
| 9 | Use of Funds | `vcPitch.slides[8]` |
| 10 | The Ask | `vcPitch.slides[9]` |

### Board Report (14 slides) — `buildBoardReportPptx()`

Executive Summary → P&L → Revenue Breakdown → Cost Structure → EBITDA → Burn & Runway → Unit Economics → LTV/CAC → Cashflow → KPI Trends → Variance → 3-Scenario Forecast → Red Flags → Recommendations.

### Due Diligence (8 slides) — `buildDueDiligencePptx()`

Cover → Business Overview → Financial Health (riskScore) → Revenue Quality → Cost Analysis → Key Risks → DD Questions → Data Room Checklist.

---

## UI — Left Panel "Investor" Tab

File: `components/playground/analytics/analytics-investor-panel.tsx`

**States:**

1. **Not generated** — three format cards (VC Pitch / Board Report / Due Diligence) + "Generate Investor Report" button
2. **Generating** — spinner + progress text
3. **Ready** — risk score gauge (0–100 color-coded), 3-scenario forecast preview, three download buttons

**Integration point:** `analytics-editor.tsx` gets a new tab alongside File / Data / Chat / Export. Tab icon: `TrendingUp` from lucide-react.

```tsx
// New tab in left panel
{ id: "investor", label: "Investor", icon: TrendingUp }
```

Panel calls `POST /api/analytics/[id]/investor` to generate, then `POST /export` with format to download.

---

## Files Changed

### New files
| File | Purpose |
|---|---|
| `lib/investor-schema.ts` | Zod schema + TS interface |
| `lib/investor-prompt.ts` | AI prompt builder |
| `lib/investor-pptx-export.ts` | Three PPTX builders |
| `app/api/analytics/[id]/investor/route.ts` | Generate investor report |
| `components/playground/analytics/analytics-investor-panel.tsx` | Left panel tab UI |

### Modified files
| File | Change |
|---|---|
| `app/api/analytics/[id]/export/route.ts` | Add 3 new format values to schema + routing |
| `components/playground/analytics/analytics-editor.tsx` | Add Investor tab |

---

## Error Handling

| Scenario | Handling |
|---|---|
| `analysis.json` missing | 400 "Run base analysis first" |
| AI returns invalid JSON | 1 retry with corrective prompt |
| RouterAI timeout | 502 + client shows "Retry" button |
| `investor.json` missing on export | 404 "Generate investor report first" |
| Insufficient tokens | Standard `TOKEN_LIMIT` apiError |

---

## Verification

1. Analytics project with existing `analysis.json` → Investor tab visible
2. Click "Generate" → spinner → report appears with risk score
3. Risk score 0–100 color-coded (green <40, yellow 40–70, red >70)
4. Download VC Pitch → 10-slide PPTX opens in PowerPoint
5. Download Board Report → 14 slides
6. Download Due Diligence → 8 slides + Key Questions list
7. `npx tsc --noEmit` — clean
8. Token charge logged in admin panel after generation
