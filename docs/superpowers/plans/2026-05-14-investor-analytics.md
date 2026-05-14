# Investor Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "🚀 Investor" tab to the Analytics editor left panel that generates and downloads VC Pitch (10 slides), Board Report (14 slides), and Due Diligence (8 slides) PPTX files from an existing `analysis.json`.

**Architecture:** A single `POST /api/analytics/[id]/investor` route reads the already-computed `AnalysisDashboard`, sends it to Claude Sonnet via RouterAI, and stores `InvestorReport` JSON in `SandboxProjectState.files["investor.json"]`. The existing export route is extended with three new format values that build PPTX from that cached JSON. The left panel in `analytics-editor.tsx` gains a second "Investor" tab alongside the existing Chat tab.

**Tech Stack:** Next.js App Router, TypeScript strict, Zod, PptxGenJS (already installed), `requestRouterAIJson` from `lib/routerai-client.ts`, `chargeTokensSafely` from `lib/token-billing.ts`, Zustand, Vitest.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/investor-schema.ts` | Create | Zod schema + TS type for `InvestorReport` |
| `lib/investor-schema.test.ts` | Create | Zod validation tests |
| `lib/investor-prompt.ts` | Create | AI prompt builder (reads `AnalysisDashboard`, outputs messages array) |
| `lib/investor-prompt.test.ts` | Create | Prompt builder tests |
| `lib/investor-pptx-export.ts` | Create | Three PPTX builders: VC Pitch, Board Report, Due Diligence |
| `lib/investor-pptx-export.test.ts` | Create | Smoke tests: each builder returns a non-empty Buffer |
| `lib/stores/use-analytics-store.ts` | Modify | Add `investorReport`, `investorStatus`, `setInvestorReport`, `setInvestorStatus` |
| `app/api/analytics/[id]/investor/route.ts` | Create | POST: auth → read analysis.json → AI call → store investor.json → return |
| `app/api/analytics/[id]/export/route.ts` | Modify | Add `"investor-vc-pptx" \| "investor-board-pptx" \| "investor-dd-pptx"` to format enum |
| `components/playground/analytics/analytics-investor-panel.tsx` | Create | Left panel tab UI: risk score, forecast, 3 download buttons |
| `components/playground/analytics/analytics-editor.tsx` | Modify | Replace chat-only left panel with 2-tab panel (Chat / Investor) |

---

## Task 1: InvestorReport Zod Schema

**Files:**
- Create: `lib/investor-schema.ts`
- Create: `lib/investor-schema.test.ts`

### Context

This project uses Zod for all API request/response schemas. See `lib/analytics-schema.ts` for the pattern: define a `z.object(...)`, export it as `const fooSchema`, and export the inferred type as `type Foo = z.infer<typeof fooSchema>`.

- [ ] **Step 1: Write the failing test**

Create `lib/investor-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { investorReportSchema } from "./investor-schema";

const MINIMAL_VALID: unknown = {
  generatedAt: "2024-01-01T00:00:00.000Z",
  riskScore: 65,
  riskLabel: "Medium",
  riskFactors: [{ factor: "High burn rate", severity: "high" }],
  investmentHighlights: ["Strong revenue growth"],
  forecast: {
    horizon: "12m",
    scenarios: {
      optimistic: { revenue: "$5M", ebitda: "$1M", narrative: "Bull case" },
      base: { revenue: "$4M", ebitda: "$500K", narrative: "Base case" },
      pessimistic: { revenue: "$3M", ebitda: "-$200K", narrative: "Bear case" },
    },
  },
  vcPitch: {
    slides: [{ title: "Cover", content: "Company overview" }],
  },
  boardReport: {
    slides: [{ title: "Exec Summary", content: "Overview" }],
  },
  dueDiligence: {
    slides: [{ title: "Overview", content: "DD overview" }],
    keyQuestions: ["What is the runway?"],
    dataRoomChecklist: ["Cap table", "Financials"],
  },
};

describe("investorReportSchema", () => {
  it("accepts valid investor report", () => {
    const result = investorReportSchema.safeParse(MINIMAL_VALID);
    expect(result.success).toBe(true);
  });

  it("rejects riskScore outside 0–100", () => {
    const bad = { ...MINIMAL_VALID as Record<string, unknown>, riskScore: 150 };
    expect(investorReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid riskLabel", () => {
    const bad = { ...MINIMAL_VALID as Record<string, unknown>, riskLabel: "Extreme" };
    expect(investorReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid forecast horizon", () => {
    const bad = {
      ...(MINIMAL_VALID as Record<string, unknown>),
      forecast: {
        horizon: "6m",
        scenarios: (MINIMAL_VALID as { forecast: { scenarios: unknown } }).forecast.scenarios,
      },
    };
    expect(investorReportSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/investor-schema.test.ts
```

Expected: FAIL — `Cannot find module './investor-schema'`

- [ ] **Step 3: Implement the schema**

Create `lib/investor-schema.ts`:

```typescript
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
  vcPitch: z.object({ slides: z.array(investorSlideSchema) }),
  boardReport: z.object({ slides: z.array(investorSlideSchema) }),
  dueDiligence: z.object({
    slides: z.array(investorSlideSchema),
    keyQuestions: z.array(z.string()),
    dataRoomChecklist: z.array(z.string()),
  }),
});

export type InvestorReport = z.infer<typeof investorReportSchema>;
export type InvestorSlide = z.infer<typeof investorSlideSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/investor-schema.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/investor-schema.ts lib/investor-schema.test.ts
git commit -m "feat: add InvestorReport Zod schema"
```

---

## Task 2: Investor Prompt Builder

**Files:**
- Create: `lib/investor-prompt.ts`
- Create: `lib/investor-prompt.test.ts`

### Context

`lib/analytics-prompt.ts` shows the pattern: `buildAnalysisPrompt(text)` returns `Array<{role, content}>`. The investor prompt takes the already-parsed `AnalysisDashboard` (not raw text) and asks the AI to produce `InvestorReport` JSON.

- [ ] **Step 1: Write the failing test**

Create `lib/investor-prompt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildInvestorPrompt } from "./investor-prompt";
import type { AnalysisDashboard } from "./analytics-schema";

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong quarter.",
    keyFindings: ["Revenue up 18%"],
    redFlags: ["Burn rate increasing"],
    opportunities: ["New market expansion"],
  },
  kpis: [
    { label: "Revenue", value: "$2.4M", change: "+18%", trend: "up", category: "revenue" },
  ],
  charts: [],
  tables: [],
  narrative: "Detailed narrative here.",
};

describe("buildInvestorPrompt", () => {
  it("returns an array with system and user messages", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("includes company name in user message", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages[1].content).toContain("Acme Corp");
  });

  it("system prompt mentions all three formats", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages[0].content).toContain("vcPitch");
    expect(messages[0].content).toContain("boardReport");
    expect(messages[0].content).toContain("dueDiligence");
  });

  it("system prompt mentions riskScore", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages[0].content).toContain("riskScore");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/investor-prompt.test.ts
```

Expected: FAIL — `Cannot find module './investor-prompt'`

- [ ] **Step 3: Implement the prompt builder**

Create `lib/investor-prompt.ts`:

```typescript
import type { AnalysisDashboard } from "./analytics-schema";

const SYSTEM_PROMPT = `You are a senior investment analyst. Given a structured financial analysis, generate comprehensive investor materials.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "generatedAt": string,           // current ISO timestamp
  "riskScore": number,             // 0-100 investment risk score (0=safest, 100=highest risk)
  "riskLabel": "Low" | "Medium" | "High" | "Critical",
  "riskFactors": [{ "factor": string, "severity": "low" | "medium" | "high" }],
  "investmentHighlights": string[], // 3-5 strongest positive signals for investors
  "forecast": {
    "horizon": "12m",
    "scenarios": {
      "optimistic": { "revenue": string, "ebitda": string, "narrative": string },
      "base":       { "revenue": string, "ebitda": string, "narrative": string },
      "pessimistic":{ "revenue": string, "ebitda": string, "narrative": string }
    }
  },
  "vcPitch": {
    "slides": [
      { "title": string, "content": string, "bullets": string[], "speakerNotes": string }
    ]
  },
  "boardReport": {
    "slides": [
      { "title": string, "content": string, "bullets": string[], "tableData": string[][] }
    ]
  },
  "dueDiligence": {
    "slides": [
      { "title": string, "content": string, "bullets": string[] }
    ],
    "keyQuestions": string[],
    "dataRoomChecklist": string[]
  }
}

VC Pitch must have exactly 10 slides in this order:
1. Cover, 2. Investment Highlights, 3. Key Metrics, 4. Revenue Story, 5. Growth Trajectory,
6. Unit Economics, 7. 12M Forecast, 8. Risk Assessment, 9. Use of Funds, 10. The Ask.

Board Report must have exactly 14 slides in this order:
1. Executive Summary, 2. P&L Overview, 3. Revenue Breakdown, 4. Cost Structure, 5. EBITDA & Margins,
6. Burn & Runway, 7. Unit Economics, 8. LTV/CAC, 9. Cashflow, 10. KPI Trends,
11. Variance Analysis, 12. 3-Scenario Forecast, 13. Red Flags, 14. Recommendations.

Due Diligence must have exactly 8 slides in this order:
1. Cover, 2. Business Overview, 3. Financial Health, 4. Revenue Quality,
5. Cost Analysis, 6. Key Risks, 7. DD Questions, 8. Data Room Checklist.

Rules:
- riskScore: derive from burn rate severity, revenue quality, margin trend, runway length. High burn + low margins = higher score.
- riskLabel: Low=0-39, Medium=40-59, High=60-79, Critical=80-100.
- Forecast scenarios must use actual currency from the analysis.
- Return ONLY the JSON — no preamble, no explanation, no markdown.`;

type Message = { role: "system" | "user" | "assistant"; content: string };

export function buildInvestorPrompt(dashboard: AnalysisDashboard): Message[] {
  const now = new Date().toISOString();
  const dashboardJson = JSON.stringify(dashboard, null, 2);
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\nCompany: ${dashboard.meta.companyName}\nPeriod: ${dashboard.meta.period}\n\n--- ANALYSIS DATA ---\n\n${dashboardJson}`,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/investor-prompt.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/investor-prompt.ts lib/investor-prompt.test.ts
git commit -m "feat: add investor AI prompt builder"
```

---

## Task 3: Extend Analytics Store

**Files:**
- Modify: `lib/stores/use-analytics-store.ts` (lines 1–72)

### Context

The store currently tracks `dashboard` and `status` for the base analysis. We need to add `investorReport` and `investorStatus` fields so `analytics-investor-panel.tsx` can read/write investor state without prop drilling.

`InvestorStatus` lifecycle: `"idle"` → `"generating"` → `"ready"` | `"error"`.

- [ ] **Step 1: Modify the store**

Replace the full content of `lib/stores/use-analytics-store.ts`:

```typescript
import { create } from "zustand";
import type { AnalysisDashboard } from "@/lib/analytics-schema";
import type { InvestorReport } from "@/lib/investor-schema";

export type AnalysisStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "ready"
  | "error";

export type InvestorStatus = "idle" | "generating" | "ready" | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface AnalyticsStore {
  projectId: string | null;
  dashboard: AnalysisDashboard | null;
  status: AnalysisStatus;
  progress: number;
  errorMessage: string | null;
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;

  investorReport: InvestorReport | null;
  investorStatus: InvestorStatus;
  investorError: string | null;

  setProjectId: (id: string) => void;
  setDashboard: (d: AnalysisDashboard) => void;
  setStatus: (s: AnalysisStatus) => void;
  setProgress: (p: number) => void;
  setError: (msg: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatStreaming: (v: boolean) => void;

  setInvestorReport: (r: InvestorReport) => void;
  setInvestorStatus: (s: InvestorStatus) => void;
  setInvestorError: (msg: string) => void;

  reset: () => void;
}

const initialState = {
  projectId: null,
  dashboard: null,
  status: "idle" as AnalysisStatus,
  progress: 0,
  errorMessage: null,
  chatMessages: [],
  isChatStreaming: false,
  investorReport: null,
  investorStatus: "idle" as InvestorStatus,
  investorError: null,
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),
  setDashboard: (dashboard) => set({ dashboard, status: "ready" }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (errorMessage) => set({ status: "error", errorMessage }),
  setIsChatStreaming: (isChatStreaming) => set({ isChatStreaming }),

  setInvestorReport: (investorReport) =>
    set({ investorReport, investorStatus: "ready", investorError: null }),
  setInvestorStatus: (investorStatus) => set({ investorStatus }),
  setInvestorError: (investorError) =>
    set({ investorStatus: "error", investorError }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.chatMessages];
      let lastIdx = -1;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") { lastIdx = i; break; }
      }
      if (lastIdx >= 0) msgs[lastIdx] = { ...msgs[lastIdx], content };
      return { chatMessages: msgs };
    }),

  reset: () => set(initialState),
}));
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `use-analytics-store.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/stores/use-analytics-store.ts
git commit -m "feat: add investor state to analytics store"
```

---

## Task 4: Investor API Route

**Files:**
- Create: `app/api/analytics/[id]/investor/route.ts`

### Context

Pattern comes from `app/api/analytics/[id]/analyze/route.ts`:
- `requireDbUser()` → `requireProjectScopeForOwner()` for auth
- `getSandboxProjectState()` to read files
- `requestRouterAIJson()` from `lib/routerai-client.ts` for AI call (returns `{ text, usage, model }`)
- `chargeTokensSafely()` for billing
- `upsertSandboxProjectState()` to write back

The investor route is non-streaming (simpler than analyze): one JSON call, validate, save, return.

Retry pattern: if JSON parse or Zod validation fails on first attempt, make a second AI call with a corrective message appended.

- [ ] **Step 1: Create the route**

Create `app/api/analytics/[id]/investor/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildInvestorPrompt } from "@/lib/investor-prompt";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { investorReportSchema } from "@/lib/investor-schema";
import { chargeTokensSafely } from "@/lib/token-billing";

const INVESTOR_MODEL = "anthropic/claude-sonnet-4.5";

const RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure vcPitch has 10 slides, boardReport has 14 slides, dueDiligence has 8 slides.";

function tryParseReport(text: string): ReturnType<typeof investorReportSchema.safeParse> | null {
  try {
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const parsed = JSON.parse(jsonText) as unknown;
    return investorReportSchema.safeParse(parsed);
  } catch {
    return null;
  }
}

async function callInvestorAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  userId: string,
  projectId: string
) {
  const result = await requestRouterAIJson({
    messages,
    model: INVESTOR_MODEL,
    settings: { temperature: 0.1, max_completion_tokens: 12000 },
    user: userId,
  });
  if (result.usage) {
    await chargeTokensSafely({
      userId,
      projectId,
      usage: result.usage,
      model: result.model ?? INVESTOR_MODEL,
    });
  }
  return result;
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
  } catch {
    return apiError("Project not found or access denied", 403);
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

  const messages = buildInvestorPrompt(dashboard);

  // First attempt
  const result1 = await callInvestorAI(messages, user.id, projectId);
  const v1 = tryParseReport(result1.text);

  if (v1?.success) {
    const report = v1.data;
    await upsertSandboxProjectState({
      projectId,
      sandboxId: state.sandboxId,
      ownerId: user.id,
      title: state.title,
      html: state.html,
      files: { ...state.files, "investor.json": JSON.stringify(report) },
    });
    return apiOk({ report });
  }

  // Retry once with corrective prompt
  const retryMessages = [
    ...messages,
    { role: "assistant" as const, content: result1.text },
    { role: "user" as const, content: RETRY_MESSAGE },
  ];
  const result2 = await callInvestorAI(retryMessages, user.id, projectId);
  const v2 = tryParseReport(result2.text);

  if (!v2?.success) {
    return apiError("AI response did not match expected schema after retry. Please try again.", 422);
  }

  const report = v2.data;

  await upsertSandboxProjectState({
    projectId,
    sandboxId: state.sandboxId,
    ownerId: user.id,
    title: state.title,
    html: state.html,
    files: {
      ...state.files,
      "investor.json": JSON.stringify(report),
    },
  });

  return apiOk({ report });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "investor/route"
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/\[id\]/investor/route.ts
git commit -m "feat: add POST /api/analytics/[id]/investor route"
```

---

## Task 5: Investor PPTX Builders

**Files:**
- Create: `lib/investor-pptx-export.ts`
- Create: `lib/investor-pptx-export.test.ts`

### Context

Pattern from `lib/analytics-pptx-export.ts`:
- `import PptxGenJS from "pptxgenjs"`
- `const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE";`
- `await pptx.write({ outputType: "arraybuffer" })` → `Buffer.from(output as ArrayBuffer)`
- Helper: `addSlide(pptx, title)` — dark background + blue title text
- `s.addText(...)`, `s.addShape(...)`, `s.addTable(...)`

THEME object is same as existing (reuse colors for brand consistency).

- [ ] **Step 1: Write smoke tests**

Create `lib/investor-pptx-export.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildVcPitchPptx, buildBoardReportPptx, buildDueDiligencePptx } from "./investor-pptx-export";
import type { InvestorReport } from "./investor-schema";
import type { AnalysisDashboard } from "./analytics-schema";

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: { executive: "Good quarter.", keyFindings: [], redFlags: [], opportunities: [] },
  kpis: [],
  charts: [],
  tables: [],
  narrative: "Narrative.",
};

const makeSlides = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    title: `Slide ${i + 1}`,
    content: `Content ${i + 1}`,
  }));

const MOCK_REPORT: InvestorReport = {
  generatedAt: "2024-01-01T00:00:00.000Z",
  riskScore: 55,
  riskLabel: "Medium",
  riskFactors: [{ factor: "Burn rate", severity: "medium" }],
  investmentHighlights: ["Strong growth"],
  forecast: {
    horizon: "12m",
    scenarios: {
      optimistic: { revenue: "$5M", ebitda: "$1M", narrative: "Bull" },
      base: { revenue: "$4M", ebitda: "$500K", narrative: "Base" },
      pessimistic: { revenue: "$3M", ebitda: "-$200K", narrative: "Bear" },
    },
  },
  vcPitch: { slides: makeSlides(10) },
  boardReport: { slides: makeSlides(14) },
  dueDiligence: {
    slides: makeSlides(8),
    keyQuestions: ["What is runway?"],
    dataRoomChecklist: ["Cap table"],
  },
};

describe("buildVcPitchPptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildVcPitchPptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
});

describe("buildBoardReportPptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildBoardReportPptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
});

describe("buildDueDiligencePptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildDueDiligencePptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/investor-pptx-export.test.ts
```

Expected: FAIL — `Cannot find module './investor-pptx-export'`

- [ ] **Step 3: Implement the PPTX builders**

Create `lib/investor-pptx-export.ts`:

```typescript
import PptxGenJS from "pptxgenjs";
import type { InvestorReport } from "./investor-schema";
import type { AnalysisDashboard } from "./analytics-schema";

const THEME = {
  bg: "1A1A2E",
  accent: "4F8EF7",
  gold: "F59E0B",
  text: "FFFFFF",
  subtext: "AAAACC",
  dark: "16213E",
  green: "4CAF50",
  red: "F44336",
  yellow: "FFC107",
};

function riskColor(score: number): string {
  if (score < 40) return THEME.green;
  if (score < 70) return THEME.yellow;
  return THEME.red;
}

function addSlide(pptx: PptxGenJS, title: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  s.addText(title, {
    x: 0.5, y: 0.2, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent,
  });
  return s;
}

function addTitleSlide(pptx: PptxGenJS, heading: string, sub: string, badge: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.dark };
  s.addText(heading, {
    x: 0.5, y: 1.8, w: "90%", h: 1.2,
    fontSize: 36, bold: true, color: THEME.text, align: "center",
  });
  s.addText(sub, {
    x: 0.5, y: 3.2, w: "90%", h: 0.6,
    fontSize: 18, color: THEME.subtext, align: "center",
  });
  s.addText(badge, {
    x: 0.5, y: 4.0, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.gold, align: "center",
  });
}

function addBulletsSlide(pptx: PptxGenJS, title: string, items: string[], color = THEME.text) {
  const s = addSlide(pptx, title);
  if (items.length === 0) {
    s.addText("No data available.", { x: 0.5, y: 1.2, w: "90%", h: 0.5, fontSize: 14, color: THEME.subtext });
    return s;
  }
  const parts = items.map((item) => ({ text: `• ${item}`, options: { color } }));
  s.addText(parts, { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 15, paraSpaceAfter: 8, valign: "top" });
  return s;
}

function addContentSlide(pptx: PptxGenJS, title: string, content: string, bullets?: string[]) {
  const s = addSlide(pptx, title);
  const hasContent = content && content.trim().length > 0;
  const hasBullets = bullets && bullets.length > 0;

  if (hasContent && !hasBullets) {
    s.addText(content, { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 14, color: THEME.text, valign: "top" });
  } else if (hasBullets) {
    if (hasContent) {
      s.addText(content, { x: 0.5, y: 1.0, w: "90%", h: 1.0, fontSize: 13, color: THEME.subtext, valign: "top" });
    }
    const yStart = hasContent ? 2.1 : 1.0;
    const parts = bullets!.map((b) => ({ text: `• ${b}`, options: { color: THEME.text } }));
    s.addText(parts, { x: 0.5, y: yStart, w: "90%", h: 4.0 - (hasContent ? 1.1 : 0), fontSize: 14, paraSpaceAfter: 6, valign: "top" });
  }
  return s;
}

function addForecastSlide(pptx: PptxGenJS, report: InvestorReport) {
  const s = addSlide(pptx, "12-Month Forecast");
  const { scenarios } = report.forecast;
  const cols = [
    ["Scenario", "Revenue", "EBITDA", "Outlook"],
    ["Optimistic", scenarios.optimistic.revenue, scenarios.optimistic.ebitda, scenarios.optimistic.narrative.slice(0, 60)],
    ["Base Case", scenarios.base.revenue, scenarios.base.ebitda, scenarios.base.narrative.slice(0, 60)],
    ["Pessimistic", scenarios.pessimistic.revenue, scenarios.pessimistic.ebitda, scenarios.pessimistic.narrative.slice(0, 60)],
  ];
  const tableRows = cols.map((row, ri) =>
    row.map((cell) => ({
      text: cell,
      options: {
        bold: ri === 0,
        color: ri === 0 ? THEME.accent : THEME.text,
        fill: { color: ri === 0 ? THEME.dark : THEME.bg },
      },
    }))
  );
  s.addTable(tableRows, { x: 0.5, y: 1.0, w: 12.0, fontSize: 12, border: { color: THEME.accent, pt: 0.5 } });
}

function addRiskSlide(pptx: PptxGenJS, report: InvestorReport) {
  const s = addSlide(pptx, "Risk Assessment");
  const color = riskColor(report.riskScore);
  s.addText(`${report.riskScore}/100`, {
    x: 0.5, y: 1.0, w: 4.0, h: 1.5,
    fontSize: 52, bold: true, color, align: "center",
  });
  s.addText(`Risk Level: ${report.riskLabel}`, {
    x: 0.5, y: 2.5, w: 4.0, h: 0.5,
    fontSize: 16, color, align: "center",
  });
  if (report.riskFactors.length > 0) {
    const parts = report.riskFactors.map((rf) => ({
      text: `• ${rf.factor}`,
      options: {
        color: rf.severity === "high" ? THEME.red : rf.severity === "medium" ? THEME.yellow : THEME.subtext,
      },
    }));
    s.addText(parts, { x: 4.8, y: 1.0, w: 7.7, h: 4.5, fontSize: 14, paraSpaceAfter: 6, valign: "top" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// VC Pitch — 10 slides
// ──────────────────────────────────────────────────────────────────────────────

export async function buildVcPitchPptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, dashboard.meta.companyName, `${dashboard.meta.period} · VC Pitch Deck`, "CONFIDENTIAL INVESTOR MATERIALS");

  addBulletsSlide(pptx, "Investment Highlights", report.investmentHighlights, THEME.green);

  // Key Metrics slide using dashboard KPIs
  const kpiSlide = addSlide(pptx, "Key Metrics");
  const kpis = dashboard.kpis.slice(0, 6);
  const cols = 3;
  const cellW = 4.0;
  const cellH = 1.4;
  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cellW + 0.2);
    const y = 1.1 + row * (cellH + 0.15);
    kpiSlide.addShape(pptx.ShapeType.rect, { x, y, w: cellW, h: cellH, fill: { color: THEME.dark }, line: { color: THEME.accent, width: 1 } });
    kpiSlide.addText(kpi.value, { x, y: y + 0.1, w: cellW, h: 0.7, fontSize: 22, bold: true, color: THEME.accent, align: "center" });
    kpiSlide.addText(kpi.label, { x, y: y + 0.75, w: cellW, h: 0.35, fontSize: 11, color: THEME.subtext, align: "center" });
  });

  // Slides 4–10 from AI-generated VC pitch slides (skip index 0=cover, use 3–9)
  const vcSlides = report.vcPitch.slides;
  const slideIndices = [3, 4, 5, 6, 7, 8, 9]; // 7 more slides after cover(0), highlights(1), metrics(2)
  slideIndices.forEach((idx) => {
    const slide = vcSlides[idx];
    if (slide) {
      addContentSlide(pptx, slide.title, slide.content, slide.bullets);
    }
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ──────────────────────────────────────────────────────────────────────────────
// Board Report — 14 slides
// ──────────────────────────────────────────────────────────────────────────────

export async function buildBoardReportPptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, dashboard.meta.companyName, `${dashboard.meta.period} · Board Report`, `Prepared ${new Date(report.generatedAt).toLocaleDateString()}`);

  // Slides 1–13 from AI-generated board slides (index 1 onward; slide 0 is cover above)
  report.boardReport.slides.slice(1).forEach((slide) => {
    addContentSlide(pptx, slide.title, slide.content, slide.bullets);
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ──────────────────────────────────────────────────────────────────────────────
// Due Diligence — 8 slides
// ──────────────────────────────────────────────────────────────────────────────

export async function buildDueDiligencePptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, dashboard.meta.companyName, `${dashboard.meta.period} · Due Diligence`, "INVESTOR DUE DILIGENCE PACKAGE");

  // Financial health slide with risk score
  addRiskSlide(pptx, report);

  // Slides 2–6 from AI-generated DD slides
  report.dueDiligence.slides.slice(2, 7).forEach((slide) => {
    addContentSlide(pptx, slide.title, slide.content, slide.bullets);
  });

  // DD Questions
  addBulletsSlide(pptx, "Key Due Diligence Questions", report.dueDiligence.keyQuestions);

  // Data Room Checklist
  addBulletsSlide(pptx, "Data Room Checklist", report.dueDiligence.dataRoomChecklist, THEME.gold);

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/investor-pptx-export.test.ts
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/investor-pptx-export.ts lib/investor-pptx-export.test.ts
git commit -m "feat: add investor PPTX builders (VC Pitch, Board Report, Due Diligence)"
```

---

## Task 6: Extend Export Route

**Files:**
- Modify: `app/api/analytics/[id]/export/route.ts`

### Context

Current file (54 lines) accepts `{ format: "pptx" }` and calls `buildAnalysisPptx`. We extend the schema to accept three new investor formats and route them to the new builders. Both `dashboard` and `report` are needed; `report` comes from `files["investor.json"]`.

- [ ] **Step 1: Read the current file**

Read `app/api/analytics/[id]/export/route.ts` (already in context from earlier — see lines 1–54).

- [ ] **Step 2: Replace with extended version**

Replace the full content of `app/api/analytics/[id]/export/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { investorReportSchema } from "@/lib/investor-schema";
import { buildAnalysisPptx } from "@/lib/analytics-pptx-export";
import {
  buildVcPitchPptx,
  buildBoardReportPptx,
  buildDueDiligencePptx,
} from "@/lib/investor-pptx-export";

const exportBodySchema = z.object({
  format: z.enum(["pptx", "investor-vc-pptx", "investor-board-pptx", "investor-dd-pptx"]),
});

function pptxResponse(buffer: Buffer, filename: string): Response {
  const safeFilename = filename.replace(/[";\r\n\\]/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const user = guard.data.user;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const bodyResult = await parseBody(req, exportBodySchema);
  if (!bodyResult.ok) return bodyResult.response;
  const { format } = bodyResult.data;

  const state = await getSandboxProjectState(projectId);
  if (!state) return apiError("No analysis found", 404);

  const rawDashboard = state.files["analysis.json"];
  if (!rawDashboard) return apiError("No analysis found", 404);

  let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
  try {
    dashboard = analysisDashboardSchema.parse(JSON.parse(rawDashboard));
  } catch {
    return apiError("Analysis data is corrupted.", 422);
  }

  const baseFilename = `${dashboard.meta.companyName.replace(/\s+/g, "_")}_${dashboard.meta.period.replace(/\s+/g, "_")}`;

  if (format === "pptx") {
    const buffer = await buildAnalysisPptx(dashboard);
    return pptxResponse(buffer, `${baseFilename}.pptx`);
  }

  // Investor formats — require investor.json
  const rawInvestor = state.files["investor.json"];
  if (!rawInvestor) {
    return apiError("Investor report not generated yet. Click 'Generate Investor Report' first.", 400);
  }

  let report: ReturnType<typeof investorReportSchema.parse>;
  try {
    report = investorReportSchema.parse(JSON.parse(rawInvestor));
  } catch {
    return apiError("Investor report data is corrupted.", 422);
  }

  if (format === "investor-vc-pptx") {
    const buffer = await buildVcPitchPptx(report, dashboard);
    return pptxResponse(buffer, `${baseFilename}_VC_Pitch.pptx`);
  }

  if (format === "investor-board-pptx") {
    const buffer = await buildBoardReportPptx(report, dashboard);
    return pptxResponse(buffer, `${baseFilename}_Board_Report.pptx`);
  }

  // investor-dd-pptx
  const buffer = await buildDueDiligencePptx(report, dashboard);
  return pptxResponse(buffer, `${baseFilename}_Due_Diligence.pptx`);
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "export/route"
```

Expected: no output

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all previously passing tests still pass

- [ ] **Step 5: Commit**

```bash
git add app/api/analytics/\[id\]/export/route.ts
git commit -m "feat: extend export route with investor PPTX formats"
```

---

## Task 7: Investor Panel Component

**Files:**
- Create: `components/playground/analytics/analytics-investor-panel.tsx`

### Context

This component lives in the left panel of `analytics-editor.tsx`. It reads `investorReport` and `investorStatus` from the analytics store. When status is `"idle"`, shows three format cards + a "Generate" button. When `"generating"`, shows spinner. When `"ready"`, shows risk score, forecast summary, and three download buttons.

Downloads use `POST /api/analytics/[id]/export` with the appropriate format, then create a blob URL and click it.

- [ ] **Step 1: Create the component**

Create `components/playground/analytics/analytics-investor-panel.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { TrendingUp, Loader2, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
}

const FORMAT_CARDS = [
  {
    id: "investor-vc-pptx" as const,
    label: "VC Pitch",
    description: "10 slides · Fundraising",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "investor-board-pptx" as const,
    label: "Board Report",
    description: "14 slides · CFO & Board",
    color: "text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
  },
  {
    id: "investor-dd-pptx" as const,
    label: "Due Diligence",
    description: "8 slides · Investors",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
  },
];

function riskColor(score: number) {
  if (score < 40) return "text-green-400";
  if (score < 70) return "text-amber-400";
  return "text-red-400";
}

function riskBg(score: number) {
  if (score < 40) return "bg-green-500/10 border-green-500/30";
  if (score < 70) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
}

async function downloadPptx(projectId: string, format: string, label: string) {
  const res = await fetch(`/api/analytics/${projectId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsInvestorPanel({ projectId }: Props) {
  const {
    dashboard,
    investorReport,
    investorStatus,
    investorError,
    setInvestorReport,
    setInvestorStatus,
    setInvestorError,
  } = useAnalyticsStore();

  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setInvestorStatus("generating");
    setDownloadError(null);
    try {
      const res = await fetch(`/api/analytics/${projectId}/investor`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setInvestorError(err.error ?? "Generation failed");
        return;
      }
      const data = await res.json() as { data?: { report?: unknown } };
      const { investorReportSchema } = await import("@/lib/investor-schema");
      const parsed = investorReportSchema.safeParse(data.data?.report);
      if (!parsed.success) {
        setInvestorError("Invalid response from server");
        return;
      }
      setInvestorReport(parsed.data);
    } catch (err) {
      setInvestorError(err instanceof Error ? err.message : "Generation failed");
    }
  }, [projectId, setInvestorReport, setInvestorStatus, setInvestorError]);

  const handleDownload = useCallback(
    async (format: string, label: string) => {
      setDownloadingFormat(format);
      setDownloadError(null);
      try {
        await downloadPptx(projectId, format, label);
      } catch (err) {
        setDownloadError(err instanceof Error ? err.message : "Download failed");
      } finally {
        setDownloadingFormat(null);
      }
    },
    [projectId]
  );

  if (!dashboard) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          Upload and analyze a PDF first to generate investor materials.
        </p>
      </div>
    );
  }

  if (investorStatus === "idle" || investorStatus === "error") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Generate investor-ready reports from your financial analysis.
        </p>

        <div className="flex flex-col gap-2">
          {FORMAT_CARDS.map((card) => (
            <div
              key={card.id}
              className={cn("rounded-md border p-3", card.bgColor, card.borderColor)}
            >
              <p className={cn("text-xs font-semibold", card.color)}>{card.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.description}</p>
            </div>
          ))}
        </div>

        {investorStatus === "error" && investorError && (
          <p className="text-xs text-red-500">{investorError}</p>
        )}

        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={() => void handleGenerate()}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Generate Investor Report
        </Button>
      </div>
    );
  }

  if (investorStatus === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground text-center">
          Generating investor reports…
          <br />
          This may take 30–60 seconds.
        </p>
      </div>
    );
  }

  // ready
  const report = investorReport!;
  const riskCls = riskColor(report.riskScore);
  const riskBgCls = riskBg(report.riskScore);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Risk score */}
      <div className={cn("rounded-md border p-3", riskBgCls)}>
        <p className="text-[11px] text-muted-foreground mb-1">Investment Risk Score</p>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold", riskCls)}>{report.riskScore}</span>
          <span className="text-xs text-muted-foreground">/100 · {report.riskLabel}</span>
        </div>
      </div>

      {/* Forecast preview */}
      <div className="rounded-md border border-border p-3 text-xs">
        <p className="text-[11px] font-medium text-foreground mb-1.5">12M Forecast</p>
        <div className="flex flex-col gap-1">
          {(["optimistic", "base", "pessimistic"] as const).map((key) => {
            const s = report.forecast.scenarios[key];
            const color = key === "optimistic" ? "text-green-400" : key === "pessimistic" ? "text-red-400" : "text-muted-foreground";
            return (
              <div key={key} className="flex items-center justify-between">
                <span className={cn("capitalize", color)}>{key}</span>
                <span className="text-muted-foreground">{s.revenue}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] text-muted-foreground font-medium">Download PPTX</p>
        {FORMAT_CARDS.map((card) => (
          <Button
            key={card.id}
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs h-8"
            disabled={downloadingFormat === card.id}
            onClick={() => void handleDownload(card.id, card.label)}
          >
            <span>{card.label}</span>
            {downloadingFormat === card.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>
        ))}
        {downloadError && (
          <p className="text-xs text-red-500 mt-1">{downloadError}</p>
        )}
      </div>

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

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "analytics-investor-panel"
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/playground/analytics/analytics-investor-panel.tsx
git commit -m "feat: add AnalyticsInvestorPanel component"
```

---

## Task 8: Wire Investor Tab into Analytics Editor

**Files:**
- Modify: `components/playground/analytics/analytics-editor.tsx`

### Context

Currently the left panel (line 170 in the existing file) is simply:
```tsx
<div className="w-64 shrink-0 overflow-hidden">
  <AnalyticsChatPanel projectId={projectId} />
</div>
```

We replace it with a two-tab panel (Chat / Investor). Use simple state tab switching — no external tab library needed, just a `useState` for `activeTab`.

- [ ] **Step 1: Modify analytics-editor.tsx**

The change is surgical: add the import, add `activeTab` state, replace the left panel section. Here is the complete updated file:

```tsx
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { AnalyticsUploadZone } from "./analytics-upload-zone";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { AnalyticsChatPanel } from "./analytics-chat-panel";
import { AnalyticsProgressOverlay } from "./analytics-progress-overlay";
import { AnalyticsExportMenu } from "./analytics-export-menu";
import { AnalyticsInvestorPanel } from "./analytics-investor-panel";
import { cn } from "@/lib/utils";
import type { AnalysisDashboard } from "@/lib/analytics-schema";

type LeftTab = "chat" | "investor";

export function AnalyticsEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId") ?? "";
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("chat");

  const {
    status,
    progress,
    dashboard,
    errorMessage,
    setProjectId,
    setDashboard,
    setStatus,
    setProgress,
    setError,
  } = useAnalyticsStore();

  // Load existing analysis on mount
  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);

    fetch(`/api/analytics/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: { dashboard?: AnalysisDashboard } } | null) => {
        if (data?.data?.dashboard) {
          setDashboard(data.data.dashboard);
        }
      })
      .catch(() => {});
  }, [projectId, setProjectId, setDashboard]);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setProgress(5);

      try {
        const form = new FormData();
        form.append("file", file);

        const uploadRes = await fetch(`/api/analytics/${projectId}/upload`, {
          method: "POST",
          body: form,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({})) as { error?: string };
          setError(err.error ?? "Upload failed");
          return;
        }

        setStatus("analyzing");
        setProgress(10);

        const analyzeRes = await fetch(`/api/analytics/${projectId}/analyze`, {
          method: "POST",
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.json().catch(() => ({})) as { error?: string };
          setError(err.error ?? "Analysis failed");
          return;
        }

        if (!analyzeRes.body) {
          setError("Analysis stream unavailable");
          return;
        }

        const reader = analyzeRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let isDone = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = JSON.parse(line.slice(6)) as {
              type: string;
              progress?: number;
              dashboard?: AnalysisDashboard;
              message?: string;
            };

            if (payload.type === "progress" && payload.progress !== undefined) {
              setProgress(payload.progress);
            } else if (payload.type === "complete" && payload.dashboard) {
              setDashboard(payload.dashboard);
              isDone = true;
              break;
            } else if (payload.type === "error") {
              setError(payload.message ?? "Analysis failed");
            }
          }

          if (isDone) break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unexpected error";
        setError(msg);
        setStatus("idle");
      }
    },
    [projectId, setStatus, setProgress, setDashboard, setError]
  );

  const isLoading = status === "uploading" || status === "analyzing";
  const progressMessage =
    status === "uploading" ? "Uploading PDF..." : "Analyzing financial data...";

  return (
    <div className="flex flex-col w-full h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          Projects
        </Button>
        <div className="flex-1" />
        <AnalyticsExportMenu projectId={projectId} dashboardRef={dashboardRef} />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {isLoading && (
          <AnalyticsProgressOverlay progress={progress} message={progressMessage} />
        )}

        {(status === "idle" || status === "error") ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm max-w-sm text-center">
              Upload a financial PDF — P&amp;L, balance sheet, cash flow report — and get an instant AI analysis.
            </p>
            <AnalyticsUploadZone onFile={(f) => void handleFile(f)} disabled={isLoading} />
            {status === "error" && errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel with tabs */}
            <div className="w-64 shrink-0 flex flex-col border-r border-border overflow-hidden">
              {/* Tab bar */}
              <div className="flex shrink-0 border-b border-border">
                <button
                  type="button"
                  onClick={() => setLeftTab("chat")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                    leftTab === "chat"
                      ? "text-foreground border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("investor")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                    leftTab === "investor"
                      ? "text-foreground border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Investor
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {leftTab === "chat" ? (
                  <AnalyticsChatPanel projectId={projectId} />
                ) : (
                  <AnalyticsInvestorPanel projectId={projectId} />
                )}
              </div>
            </div>

            {/* Center: dashboard */}
            <div ref={dashboardRef} className="flex-1 overflow-hidden">
              {dashboard && <AnalyticsDashboard dashboard={dashboard} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add components/playground/analytics/analytics-editor.tsx
git commit -m "feat: add Investor tab to analytics editor left panel"
```

---

## Final Verification

- [ ] Run full type-check: `npx tsc --noEmit` — zero errors
- [ ] Run all tests: `npx vitest run` — all pass
- [ ] Confirm new files compile: all 5 new files importable without errors
