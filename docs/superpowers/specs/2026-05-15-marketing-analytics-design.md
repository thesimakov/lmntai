# Marketing Analytics — Design Spec

**Date:** 2026-05-15
**Context:** Lemnity already has a financial Analytics MVP (PDF → AnalysisDashboard → dashboard + chat + PPTX + InvestorReport + Forecasting). This spec adds a separate Marketing Analytics mode: users upload CSV/XLSX/PDF marketing data, AI builds a channels-first dashboard, and exports to PPTX.

---

## Goal

From CSV/XLSX/PDF marketing data (Google Ads, Meta, Яндекс, CRM exports, etc.), generate an interactive channels-first dashboard with channel KPIs, spend/revenue breakdown, and AI recommendations. Export to an 8-slide PPTX.

---

## Architecture

```
CSV / XLSX / PDF upload (up to 5 files)
    ↓
POST /api/marketing/[id]/upload   ← xlsx npm for CSV/XLSX, Bridge OCR for PDF
    ↓ files["marketing_raw.txt"]
POST /api/marketing/[id]/analyze  ← RouterAI (Claude Sonnet), JSON mode
    ↓ files["marketing.json"]
    ├── marketing-editor.tsx      ← left panel (upload/chat tabs) + right dashboard
    ├── POST /api/marketing/[id]/chat  ← SSE AI chat with marketing.json context
    └── POST /api/marketing/[id]/export { format: "marketing-pptx" } → 8-slide PPTX
```

**Constraints:**
- New project type `"marketing"` — separate from `"analytics"`, route `/playground/marketing`
- No new Prisma models — data lives in `SandboxProjectState.files`
- Auth: `requireDbUser()` + `requireProjectScopeForOwner()` (same as analytics routes)
- Billing: `chargeTokensSafely()` same as existing AI routes
- New dependency: `xlsx` npm package (for CSV/XLSX parsing) — check if already present

---

## MarketingDashboard JSON Schema

File: `lib/marketing-schema.ts`

```typescript
export interface MarketingKpi {
  label: string;     // "ROAS", "CAC", "CTR", "CPC", "CVR", "Open Rate"
  value: string;     // "3.2x", "$42", "4.8%"
  change?: string;   // "+0.4x MoM"
  trend: "up" | "down" | "neutral";
}

export interface MarketingChannel {
  name: string;           // "Meta Ads", "Google Ads", "Organic", "Email"
  spend?: number;         // in document currency
  revenue?: number;
  kpis: MarketingKpi[];   // AI determines relevant set per channel
  trend: "up" | "down" | "neutral";
  narrative: string;      // 1–2 sentences
}

export interface MarketingChart {
  id: string;
  type: "bar" | "line" | "pie";
  title: string;
  data: Array<{ name: string; value: number; [key: string]: unknown }>;
}

export interface MarketingDashboard {
  meta: {
    companyName: string;
    period: string;        // "Jan–Mar 2024"
    dataSource: string;    // "Google Ads CSV + Meta PDF"
    analyzedAt: string;    // ISO — set by server after parsing
  };
  summary: {
    executive: string;
    topFindings: string[];      // 3–5 bullet points
    recommendations: string[];  // 3–5 actionable recommendations
  };
  channels: MarketingChannel[];   // 1–6 channels
  kpis: MarketingKpi[];           // summary metrics: Total Spend, Total Revenue, Blended ROAS, Avg CAC
  charts: MarketingChart[];       // 2–3 charts (spend by channel, ROAS comparison, funnel)
  narrative: string;
}
```

Zod schema next to the interface. `channels` array: `.min(1).max(6)`. One retry if AI returns invalid JSON. Server overwrites `meta.analyzedAt` after successful parse.

---

## AI Prompt Strategy

File: `lib/marketing-prompt.ts`

- Input: full raw text from all uploaded files (combined into `marketing_raw.txt`)
- System prompt: "You are a marketing analytics expert. Analyze the provided marketing data and generate a channels-first performance report in strict JSON."
- Specifies: identify channels from data, compute or extract KPIs per channel, determine relevant metrics (ROAS for paid, CVR for organic, open rate for email, etc.), 1–6 channels, 3–5 summary KPIs
- Response format: `{ type: "json_object" }` via RouterAI
- Model: `anthropic/claude-sonnet-4-5`
- Expected tokens: ~4 000 in / ~3 000 out

---

## API Routes

### New: `POST /api/marketing/[id]/upload`

1. Auth: `requireDbUser()` + `requireProjectScopeForOwner()`
2. `multipart/form-data` — accepts 1–5 files (CSV / XLSX / PDF)
3. CSV/XLSX: parse via `xlsx` npm → extract as text table
4. PDF: proxy to Bridge `/analytics/ocr` → get text string
5. Reject unsupported types with 400
6. Combine all extracted text into single string
7. Save to `files["marketing_raw.txt"]`
8. Return `apiOk({ fileCount, charCount })`

### New: `POST /api/marketing/[id]/analyze`

1. Auth: `requireDbUser()` + `requireProjectScopeForOwner()`
2. Read `files["marketing_raw.txt"]` — 400 if missing
3. Build prompt via `buildMarketingPrompt(rawText)` from `lib/marketing-prompt.ts`
4. Call RouterAI (non-streaming, JSON mode)
5. Parse + validate with `marketingDashboardSchema` (1 retry on failure)
6. Override `meta.analyzedAt: new Date().toISOString()`
7. Re-fetch state, save to `files["marketing.json"]`
8. `chargeTokensSafely()`
9. Return `apiOk({ report: MarketingDashboard })`

### New: `POST /api/marketing/[id]/chat` (SSE)

- Auth: `requireDbUser()` + `requireProjectScopeForOwner()`
- Context: `files["marketing.json"]` + message history from request body
- System prompt: marketing analyst with full channel data
- Same SSE pattern as `/api/analytics/[id]/chat`

### New: `POST /api/marketing/[id]/export`

- Auth: `requireDbUser()` + `requireProjectScopeForOwner()`
- Body: `{ format: "marketing-pptx" }`
- Read `files["marketing.json"]` — 404 if missing
- Parse + validate with `marketingDashboardSchema`
- Call `buildMarketingPptx(report)` from `lib/marketing-pptx-export.ts`
- Return `apiFile(buffer, "marketing.pptx", PPTX_MIME)`

---

## PPTX Slide Structure — `buildMarketingPptx()`

8 slides, same theme as investor PPTX (`bg: 1A1A2E`, `accent: 4F8EF7`). Numeric tables with trend color coding (green/red cells).

| # | Slide | Data source |
|---|---|---|
| 1 | Cover | `meta.companyName`, `meta.period`, "Marketing Performance Report" |
| 2 | Executive Summary | `summary.executive` + `summary.topFindings[]` |
| 3 | Key Metrics | `kpis[]` — table: Total Spend / Revenue / Blended ROAS / Avg CAC |
| 4 | Channels Overview | per channel: name + key KPIs + trend color coding |
| 5 | Top Channel Deep Dive | best channel by ROAS — all KPIs + `narrative` |
| 6 | Channel Comparison | table: spend / revenue / ROAS per channel |
| 7 | Recommendations | `summary.recommendations[]` + `summary.topFindings[]` |
| 8 | Disclaimer | "AI-generated analysis" + `meta.dataSource` |

---

## UI — Marketing Editor

Route: `app/(builder)/playground/marketing/page.tsx`
Layout: `app/(builder)/playground/marketing/layout.tsx` (standalone, no dashboard sidebar)
Main component: `components/playground/marketing/marketing-editor.tsx`

**Left panel — 2 tabs:**

| Tab | Icon | Content |
|---|---|---|
| Upload | 📤 | Upload zone (drag-and-drop CSV/XLSX/PDF, up to 5 files) + file list + "Анализировать" button |
| Chat | 💬 | SSE chat panel — same pattern as `analytics-chat-panel.tsx` |

**Right panel — dashboard:**

**State 1 — Empty:** centered prompt "Загрузите маркетинговые данные и нажмите «Анализировать»"

**State 2 — Analyzing:** spinner overlay "Анализируем данные…"

**State 3 — Ready:**
- Summary KPI row (4 cards: Total Spend / Total Revenue / Blended ROAS / Avg CAC)
- Channel cards grid (2 columns): per-channel KPI mini-table + trend badge + narrative
- Chart: Spend vs Revenue bar chart by channel (Recharts)
- "↓ Экспорт PPTX" button in top bar

**Components (`components/playground/marketing/`):**

| File | Role |
|---|---|
| `marketing-editor.tsx` | Main component, tab state, layout |
| `marketing-upload-panel.tsx` | Upload zone + file list + analyze button |
| `marketing-dashboard.tsx` | Dashboard orchestrator (KPIs + channels + chart) |
| `marketing-kpi-row.tsx` | 4-card summary KPI row |
| `marketing-channel-card.tsx` | Single channel card with KPI grid |
| `marketing-chart-block.tsx` | Recharts bar chart (spend vs revenue) |
| `marketing-chat-panel.tsx` | SSE chat panel (reuse pattern from analytics) |

---

## Zustand Store

File: `lib/stores/use-marketing-store.ts`

```typescript
export type MarketingStatus = "idle" | "uploading" | "analyzing" | "ready" | "error";

interface MarketingStore {
  projectId: string | null;
  dashboard: MarketingDashboard | null;
  status: MarketingStatus;
  errorMessage: string | null;
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;

  setProjectId: (id: string) => void;
  setDashboard: (d: MarketingDashboard) => void;
  setStatus: (s: MarketingStatus) => void;
  setError: (msg: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatStreaming: (v: boolean) => void;
  reset: () => void;
}
```

`ChatMessage` type reused from `use-analytics-store.ts` — extract to `lib/stores/chat-types.ts` if not already shared.

---

## Project Type Registration

### `lib/lemnity-ai-prompt-spec.ts`
Add `"marketing"` to `PROJECT_KINDS`.

### `lib/playground-project-edit-url.ts`
Add mapping: `marketing → /playground/marketing`.

---

## Files Changed

### New files

| File | Purpose |
|---|---|
| `lib/marketing-schema.ts` | Zod schema + TS interfaces |
| `lib/marketing-prompt.ts` | AI prompt builder |
| `lib/marketing-pptx-export.ts` | 8-slide PPTX builder |
| `lib/stores/use-marketing-store.ts` | Zustand store |
| `app/(builder)/playground/marketing/layout.tsx` | Standalone layout |
| `app/(builder)/playground/marketing/page.tsx` | Page entry point |
| `app/api/marketing/[id]/upload/route.ts` | File upload + parse |
| `app/api/marketing/[id]/analyze/route.ts` | AI analysis |
| `app/api/marketing/[id]/chat/route.ts` | SSE chat |
| `app/api/marketing/[id]/export/route.ts` | PPTX export |
| `components/playground/marketing/marketing-editor.tsx` | Main editor |
| `components/playground/marketing/marketing-upload-panel.tsx` | Upload panel |
| `components/playground/marketing/marketing-dashboard.tsx` | Dashboard orchestrator |
| `components/playground/marketing/marketing-kpi-row.tsx` | KPI summary row |
| `components/playground/marketing/marketing-channel-card.tsx` | Channel card |
| `components/playground/marketing/marketing-chart-block.tsx` | Recharts bar chart |
| `components/playground/marketing/marketing-chat-panel.tsx` | Chat panel |

### Modified files

| File | Change |
|---|---|
| `lib/lemnity-ai-prompt-spec.ts` | Add `"marketing"` to `PROJECT_KINDS` |
| `lib/playground-project-edit-url.ts` | Add `marketing` → `/playground/marketing` mapping |

### New dependency

| Package | Purpose |
|---|---|
| `xlsx` | Parse CSV and XLSX files server-side (check if already installed) |

---

## Error Handling

| Scenario | Handling |
|---|---|
| Unsupported file type | 400 "Unsupported file type. Use CSV, XLSX, or PDF." |
| XLSX/CSV parse failure | 400 "Could not parse file — check format" |
| PDF OCR failure | 400 "Could not extract text from PDF" |
| No usable data after parsing | 400 "No usable data found in uploaded files" |
| AI returns invalid JSON | 1 retry with corrective prompt, then 422 |
| RouterAI unavailable | 502 "AI service temporarily unavailable" |
| `marketing.json` missing on export | 404 "Run analysis first" |
| Insufficient tokens | Standard `TOKEN_LIMIT` apiError |
| AI generates 0 channels | Zod `.min(1)` fails → retry |

---

## Verification

1. Create project type `marketing` → opens `/playground/marketing?projectId=X`
2. Upload Google Ads CSV + Meta XLSX → file list appears, "Анализировать" enabled
3. Click "Анализировать" → spinner → dashboard with channel cards
4. Channel cards show correct KPIs with trend colors
5. AI chat: ask "какой канал лучше всего?" → relevant answer citing channel data
6. "Экспорт PPTX" → 8 slides open in PowerPoint
7. `npx tsc --noEmit` — clean
8. Token charge logged in admin panel after analysis
