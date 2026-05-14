# Analytics / BI Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `analytics` project type to Lemnity that lets users upload a PDF, get an AI-generated BI dashboard (KPI cards + charts), chat with their data, and export to PPTX or PDF.

**Architecture:** User uploads PDF → `pdf-parse` extracts text in the Next.js API route → `requestRouterAIJson` (Claude Sonnet) analyzes text and returns `AnalysisDashboard` JSON → stored in `SandboxProjectState.files["analysis.json"]` → React dashboard renders from JSON. PPTX generated server-side via `pptxgenjs`, PDF via existing client-side `html2canvas + jsPDF`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Zod, Recharts (already installed), pptxgenjs (new), pdf-parse (new), Zustand, Tailwind, shadcn/ui, Radix.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `lib/analytics-schema.ts` | Create | `AnalysisDashboard` TS type + Zod schema |
| `lib/analytics-schema.test.ts` | Create | Zod validation tests |
| `lib/analytics-prompt.ts` | Create | System + user prompt builder for financial analysis |
| `lib/analytics-prompt.test.ts` | Create | Prompt builder tests |
| `lib/analytics-pptx-export.ts` | Create | Build PPTX from `AnalysisDashboard` via pptxgenjs |
| `lib/analytics-pptx-export.test.ts` | Create | PPTX structure tests |
| `lib/stores/use-analytics-store.ts` | Create | Zustand store for editor state |
| `lib/lemnity-ai-prompt-spec.ts` | Modify | Add `"analytics"` to `PROJECT_KINDS` |
| `lib/playground-project-edit-url.ts` | Modify | Add `"analytics"` URL builder |
| `app/(builder)/playground/analytics/layout.tsx` | Create | Standalone layout (no sidebar) |
| `app/(builder)/playground/analytics/page.tsx` | Create | Entry point — renders `AnalyticsEditor` |
| `app/api/analytics/[id]/upload/route.ts` | Create | PDF upload → OCR via pdf-parse → store raw_text |
| `app/api/analytics/[id]/analyze/route.ts` | Create | SSE: read raw_text → RouterAI → store analysis.json |
| `app/api/analytics/[id]/chat/route.ts` | Create | SSE: AI chat with analysis.json as context |
| `app/api/analytics/[id]/export/route.ts` | Create | PPTX export from analysis.json |
| `app/api/analytics/[id]/route.ts` | Create | GET analysis.json for a project |
| `components/playground/analytics/analytics-editor.tsx` | Create | Main stateful component; orchestrates all sub-components |
| `components/playground/analytics/analytics-upload-zone.tsx` | Create | Drag-and-drop PDF drop zone |
| `components/playground/analytics/analytics-dashboard.tsx` | Create | Renders full `AnalysisDashboard` (KPIs + charts + summary) |
| `components/playground/analytics/analytics-kpi-grid.tsx` | Create | Grid of KPI cards |
| `components/playground/analytics/analytics-chart-block.tsx` | Create | Single chart (Recharts, switches by `type`) |
| `components/playground/analytics/analytics-chat-panel.tsx` | Create | Left-panel AI chat |
| `components/playground/analytics/analytics-progress-overlay.tsx` | Create | Full-screen progress overlay during analysis |
| `components/playground/analytics/analytics-export-menu.tsx` | Create | Dropdown: PDF (client), PPTX (server) |

---

## Task 1: Install Dependencies + Analytics Schema

**Files:**
- Create: `lib/analytics-schema.ts`
- Create: `lib/analytics-schema.test.ts`

- [ ] **Step 1: Install new npm packages**

```bash
cd /path/to/lmntai
npm install pptxgenjs pdf-parse
npm install -D @types/pdf-parse
```

Expected: packages added to `package.json`, no errors.

- [ ] **Step 2: Write the failing test**

Create `lib/analytics-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { analysisDashboardSchema } from "./analytics-schema";

const minimal: unknown = {
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
    redFlags: [],
    opportunities: ["Expand to EU"],
  },
  kpis: [
    { label: "Revenue", value: "$2.4M", trend: "up", category: "revenue" },
  ],
  charts: [
    {
      id: "rev-chart",
      type: "bar",
      title: "Monthly Revenue",
      data: [{ name: "Jan", value: 800000 }],
    },
  ],
  tables: [],
  narrative: "Full analysis narrative here.",
};

describe("analysisDashboardSchema", () => {
  it("accepts a valid dashboard", () => {
    expect(() => analysisDashboardSchema.parse(minimal)).not.toThrow();
  });

  it("rejects an invalid trend value", () => {
    const bad = structuredClone(minimal) as { kpis: Array<{ trend: string }> };
    bad.kpis[0].trend = "sideways";
    expect(() => analysisDashboardSchema.parse(bad)).toThrow();
  });

  it("rejects missing meta.companyName", () => {
    const bad = structuredClone(minimal) as { meta: Record<string, unknown> };
    delete bad.meta.companyName;
    expect(() => analysisDashboardSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- lib/analytics-schema.test.ts
```

Expected: FAIL — `analysisDashboardSchema` is not defined.

- [ ] **Step 4: Implement analytics schema**

Create `lib/analytics-schema.ts`:

```typescript
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
  data: z.array(z.record(z.string(), z.unknown())),
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
    analyzedAt: z.string(),
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- lib/analytics-schema.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics-schema.ts lib/analytics-schema.test.ts package.json package-lock.json
git commit -m "feat(analytics): add AnalysisDashboard schema with Zod validation"
```

---

## Task 2: Register "analytics" Project Type

**Files:**
- Modify: `lib/lemnity-ai-prompt-spec.ts`
- Modify: `lib/playground-project-edit-url.ts`

- [ ] **Step 1: Add "analytics" to PROJECT_KINDS**

In `lib/lemnity-ai-prompt-spec.ts`, find the `PROJECT_KINDS` array and add `"analytics"`:

```typescript
// Before:
export const PROJECT_KINDS = [
  "website",
  "presentation",
  "resume",
  "design",
  "visitcard",
  "lovable",
  "box_html"
] as const;

// After:
export const PROJECT_KINDS = [
  "website",
  "presentation",
  "resume",
  "design",
  "visitcard",
  "lovable",
  "box_html",
  "analytics",
] as const;
```

- [ ] **Step 2: Add analytics URL builder**

In `lib/playground-project-edit-url.ts`, update `PreferredPlaygroundEditor` and add a URL builder:

```typescript
// Add "analytics" to the type:
export type PreferredPlaygroundEditor = "build" | "box" | "analytics";

// Add after the existing buildPlaygroundBoxEditUrl function:
export function buildPlaygroundAnalyticsEditUrl(projectId: string): string {
  return `/playground/analytics?projectId=${encodeURIComponent(projectId)}`;
}
```

Also update `normalizePreferredPlaygroundEditor` if it has a switch/conditional to include `"analytics"`, and update wherever `editUrl` is built (search for `buildPlaygroundBoxEditUrl` call sites) to handle `"analytics"`.

In `app/api/projects/route.ts` (or wherever `editUrl` is assembled), add:

```typescript
// Find the block that builds editUrl and add:
if (preferredEditor === "analytics") {
  editUrl = buildPlaygroundAnalyticsEditUrl(project.id);
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/lemnity-ai-prompt-spec.ts lib/playground-project-edit-url.ts
git commit -m "feat(analytics): register analytics project type and URL builder"
```

---

## Task 3: Analytics Prompt Builder

**Files:**
- Create: `lib/analytics-prompt.ts`
- Create: `lib/analytics-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/analytics-prompt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt } from "./analytics-prompt";

describe("buildAnalysisPrompt", () => {
  it("returns messages array with system and user roles", () => {
    const result = buildAnalysisPrompt("Revenue: $1M\nCosts: $800K");
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[1].role).toBe("user");
  });

  it("includes the document text in the user message", () => {
    const text = "EBITDA: $200K for Q3";
    const result = buildAnalysisPrompt(text);
    expect(result[1].content).toContain(text);
  });

  it("system prompt requests JSON output", () => {
    const result = buildAnalysisPrompt("some text");
    expect(result[0].content.toLowerCase()).toContain("json");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/analytics-prompt.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement prompt builder**

Create `lib/analytics-prompt.ts`:

```typescript
import type { AnalysisDashboard } from "./analytics-schema";

const SYSTEM_PROMPT = `You are a senior financial analyst AI. Analyze the provided document and extract key financial information.

Return ONLY a valid JSON object matching this exact TypeScript interface (no markdown, no code fences):

{
  "meta": {
    "companyName": string,       // company name from doc or "Unknown"
    "period": string,             // e.g. "Q1 2024", "FY2023"
    "documentType": string,       // "P&L" | "balance_sheet" | "cash_flow" | "mixed"
    "currency": string,           // "USD" | "RUB" | "EUR" | detected currency
    "analyzedAt": string          // current ISO timestamp
  },
  "summary": {
    "executive": string,          // 2-3 paragraph executive summary
    "keyFindings": string[],      // 3-5 bullet points, most important findings
    "redFlags": string[],         // risk indicators, anomalies, concerns
    "opportunities": string[]     // growth opportunities, positive signals
  },
  "kpis": [                       // 4-8 key metrics from the document
    {
      "label": string,            // metric name
      "value": string,            // formatted value e.g. "$2.4M" or "18.5%"
      "change": string | null,    // change vs prior period e.g. "+18% YoY" or null
      "trend": "up" | "down" | "neutral",
      "category": "revenue" | "profitability" | "liquidity" | "growth" | "efficiency"
    }
  ],
  "charts": [                     // 2-4 charts that best visualize the data
    {
      "id": string,               // unique snake_case id
      "type": "bar" | "line" | "area" | "pie",
      "title": string,
      "description": string | null,
      "data": [{ "name": string, "value": number }]  // use actual numbers, not strings
    }
  ],
  "tables": [                     // 0-2 tables for detailed breakdowns
    {
      "title": string,
      "headers": string[],
      "rows": string[][]           // all values as strings
    }
  ],
  "narrative": string             // full 400-600 word analytical narrative for reports
}

Rules:
- Use ONLY data present in the document. Do not fabricate numbers.
- All monetary values in "value" fields must be formatted with currency symbol and unit (K/M/B).
- If a field cannot be determined, use an empty array [] or "Unknown" string as appropriate.
- Return ONLY the JSON — no preamble, no explanation, no markdown.`;

export function buildAnalysisPrompt(
  documentText: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const now = new Date().toISOString();
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\n--- DOCUMENT ---\n\n${documentText}`,
    },
  ];
}

export function buildChatPrompt(
  dashboard: AnalysisDashboard,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const contextJson = JSON.stringify(dashboard, null, 2);
  const system = `You are a senior financial analyst. You have already analyzed a financial document. Here is the structured analysis:

\`\`\`json
${contextJson}
\`\`\`

Answer the user's questions based solely on this analysis. Be concise, accurate, and use specific numbers from the data. Format your responses in Markdown.`;

  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- lib/analytics-prompt.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics-prompt.ts lib/analytics-prompt.test.ts
git commit -m "feat(analytics): add financial analysis prompt builder"
```

---

## Task 4: Zustand Store

**Files:**
- Create: `lib/stores/use-analytics-store.ts`

- [ ] **Step 1: Create the store**

Create `lib/stores/use-analytics-store.ts`:

```typescript
import { create } from "zustand";
import type { AnalysisDashboard } from "@/lib/analytics-schema";

export type AnalysisStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "ready"
  | "error";

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

  setProjectId: (id: string) => void;
  setDashboard: (d: AnalysisDashboard) => void;
  setStatus: (s: AnalysisStatus) => void;
  setProgress: (p: number) => void;
  setError: (msg: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatStreaming: (v: boolean) => void;
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
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),
  setDashboard: (dashboard) => set({ dashboard, status: "ready" }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (errorMessage) => set({ status: "error", errorMessage }),
  setIsChatStreaming: (isChatStreaming) => set({ isChatStreaming }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.chatMessages];
      const lastIdx = msgs.findLastIndex((m) => m.role === "assistant");
      if (lastIdx >= 0) msgs[lastIdx] = { ...msgs[lastIdx], content };
      return { chatMessages: msgs };
    }),

  reset: () => set(initialState),
}));
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stores/use-analytics-store.ts
git commit -m "feat(analytics): add Zustand store for analytics editor state"
```

---

## Task 5: Upload API Route

**Files:**
- Create: `app/api/analytics/[id]/upload/route.ts`

- [ ] **Step 1: Create the upload route**

Create `app/api/analytics/[id]/upload/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import pdfParse from "pdf-parse";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectAccess } from "@/lib/auth-guards";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { upsertSandboxProjectState, getSandboxProjectState } from "@/lib/sandbox-project-state-db";

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (guard.status !== 200) return apiGuardError(guard);
  const { user } = guard;

  const { id: projectId } = await params;

  const accessGuard = await requireProjectAccess(projectId, user.id);
  if (accessGuard.status !== 200) return apiGuardError(accessGuard);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return apiError("No file provided", 400);
  if (!file.type.includes("pdf")) return apiError("Only PDF files are supported", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_PDF_BYTES) return apiError("PDF too large (max 50 MB)", 413);

  let extractedText: string;
  try {
    const parsed = await pdfParse(buffer);
    extractedText = parsed.text.trim();
  } catch {
    return apiError("Could not read the PDF. Try a different file or a text-based PDF.", 422);
  }

  if (extractedText.length < 50) {
    return apiError("The PDF appears to be empty or image-only. Text-based PDFs are required.", 422);
  }

  const existing = await getSandboxProjectState(projectId);
  const existingFiles = existing?.files ?? {};

  await upsertSandboxProjectState({
    projectId,
    ownerId: user.id,
    files: {
      ...existingFiles,
      "raw_text.txt": extractedText,
    },
    title: file.name.replace(/\.pdf$/i, ""),
  });

  return apiOk({ pages: extractedText.length, filename: file.name });
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start dev server (`npm run dev`) and POST a PDF to `/api/analytics/test-id/upload` with a valid session cookie. Expect `{ data: { pages: N, filename: "..." } }`.

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/[id]/upload/route.ts
git commit -m "feat(analytics): add PDF upload route with pdf-parse text extraction"
```

---

## Task 6: Analyze API Route (SSE)

**Files:**
- Create: `app/api/analytics/[id]/analyze/route.ts`
- Create: `app/api/analytics/[id]/route.ts`

- [ ] **Step 1: Create the analyze SSE route**

Create `app/api/analytics/[id]/analyze/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { requireDbUser, requireProjectAccess } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildAnalysisPrompt } from "@/lib/analytics-prompt";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { chargeTokensSafely } from "@/lib/token-billing";

function sseEncode(controller: ReadableStreamDefaultController, payload: unknown) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (guard.status !== 200) return apiGuardError(guard);
  const { user } = guard;

  const { id: projectId } = await params;

  const accessGuard = await requireProjectAccess(projectId, user.id);
  if (accessGuard.status !== 200) return apiGuardError(accessGuard);

  const state = await getSandboxProjectState(projectId);
  const rawText = state?.files?.["raw_text.txt"];
  if (!rawText) {
    return apiError("No document uploaded. Upload a PDF first.", 400);
  }

  const messages = buildAnalysisPrompt(rawText);

  const stream = new ReadableStream({
    async start(controller) {
      sseEncode(controller, { type: "progress", progress: 10 });

      // Simulate incremental progress while waiting for RouterAI
      let fakeProgress = 10;
      const ticker = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + 4, 75);
        sseEncode(controller, { type: "progress", progress: fakeProgress });
      }, 2500);

      try {
        const result = await requestRouterAIJson({
          messages,
          model: "anthropic/claude-sonnet-4.5",
          settings: { temperature: 0.1, max_completion_tokens: 8000 },
          user: user.id,
        });

        clearInterval(ticker);
        sseEncode(controller, { type: "progress", progress: 85 });

        // Parse the JSON (AI sometimes wraps in ```json ... ```)
        let jsonText = result.text.trim();
        const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) jsonText = fenceMatch[1].trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          sseEncode(controller, {
            type: "error",
            message: "AI returned invalid JSON. Please try again.",
          });
          controller.close();
          return;
        }

        const validation = analysisDashboardSchema.safeParse(parsed);
        if (!validation.success) {
          sseEncode(controller, {
            type: "error",
            message: "AI response did not match expected schema. Please try again.",
          });
          controller.close();
          return;
        }

        const dashboard = validation.data;

        // Store analysis
        await upsertSandboxProjectState({
          projectId,
          ownerId: user.id,
          files: {
            ...(state?.files ?? {}),
            "analysis.json": JSON.stringify(dashboard),
          },
        });

        // Charge tokens
        if (result.usage) {
          await chargeTokensSafely({
            userId: user.id,
            usage: result.usage,
            projectId,
            model: result.model ?? "anthropic/claude-sonnet-4.5",
            flow: "analytics-analyze",
          });
        }

        sseEncode(controller, { type: "progress", progress: 100 });
        sseEncode(controller, { type: "complete", dashboard });
      } catch (err) {
        clearInterval(ticker);
        const msg = err instanceof Error ? err.message : "Analysis failed";
        sseEncode(controller, { type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Create the GET route for fetching existing analysis**

Create `app/api/analytics/[id]/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { requireDbUser, requireProjectAccess } from "@/lib/auth-guards";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (guard.status !== 200) return apiGuardError(guard);
  const { user } = guard;

  const { id: projectId } = await params;

  const accessGuard = await requireProjectAccess(projectId, user.id);
  if (accessGuard.status !== 200) return apiGuardError(accessGuard);

  const state = await getSandboxProjectState(projectId);
  const raw = state?.files?.["analysis.json"];
  if (!raw) return apiError("No analysis found", 404);

  const validation = analysisDashboardSchema.safeParse(JSON.parse(raw));
  if (!validation.success) return apiError("Stored analysis is corrupt", 500);

  return apiOk({ dashboard: validation.data, hasRawText: !!state.files["raw_text.txt"] });
}
```

- [ ] **Step 3: Check chargeTokensSafely signature**

Open `lib/token-billing.ts` and confirm the parameter shape for `chargeTokensSafely`. If the signature differs from the code above, adjust accordingly. The key fields needed: `userId`, `usage` (with `prompt_tokens`, `completion_tokens`), `projectId`, `model`, `flow`.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any signature mismatches from step 3.

- [ ] **Step 5: Commit**

```bash
git add app/api/analytics/[id]/analyze/route.ts app/api/analytics/[id]/route.ts
git commit -m "feat(analytics): add SSE analyze route and GET dashboard route"
```

---

## Task 7: Chat API Route (SSE)

**Files:**
- Create: `app/api/analytics/[id]/chat/route.ts`

- [ ] **Step 1: Create the chat SSE route**

Create `app/api/analytics/[id]/chat/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { requireDbUser, requireProjectAccess } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIStream } from "@/lib/routerai-client";
import { splitSseLines, extractDataJson } from "@/lib/sse-parser";
import { buildChatPrompt } from "@/lib/analytics-prompt";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { chargeTokensSafely, estimateUsageFromText } from "@/lib/token-billing";
import type { ChatMessage } from "@/lib/stores/use-analytics-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (guard.status !== 200) return apiGuardError(guard);
  const { user } = guard;

  const { id: projectId } = await params;

  const accessGuard = await requireProjectAccess(projectId, user.id);
  if (accessGuard.status !== 200) return apiGuardError(accessGuard);

  const body = await req.json() as {
    message: string;
    history: ChatMessage[];
  };

  if (!body.message?.trim()) return apiError("Empty message", 400);

  const state = await getSandboxProjectState(projectId);
  const rawAnalysis = state?.files?.["analysis.json"];
  if (!rawAnalysis) return apiError("No analysis found. Upload and analyze a PDF first.", 400);

  const dashboard = analysisDashboardSchema.parse(JSON.parse(rawAnalysis));
  const history = (body.history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const messages = buildChatPrompt(dashboard, body.message, history);

  const routerRes = await requestRouterAIStream({
    messages,
    model: "anthropic/claude-haiku-4.5",
    settings: { temperature: 0.3, max_completion_tokens: 2000 },
    user: user.id,
  });

  if (!routerRes.ok || !routerRes.body) {
    return apiError("AI service unavailable", 502);
  }

  const stream = new ReadableStream({
    async start(controller) {
      function sse(payload: unknown) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      }

      let assembled = "";
      const decoder = new TextDecoder();

      try {
        for await (const chunk of routerRes.body as AsyncIterable<Uint8Array>) {
          const text = decoder.decode(chunk, { stream: true });
          for (const line of splitSseLines(text)) {
            const data = extractDataJson(line);
            if (!data) continue;
            const delta = data?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assembled += delta;
              sse({ type: "delta", text: delta });
            }
            const usage = data?.usage;
            if (usage) {
              await chargeTokensSafely({
                userId: user.id,
                usage,
                projectId,
                model: "anthropic/claude-haiku-4.5",
                flow: "analytics-chat",
              });
            }
          }
        }

        if (!assembled) {
          await chargeTokensSafely({
            userId: user.id,
            usage: estimateUsageFromText(body.message, assembled),
            projectId,
            model: "anthropic/claude-haiku-4.5",
            flow: "analytics-chat",
          });
        }

        sse({ type: "done" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Chat error";
        sse({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify splitSseLines and extractDataJson exist**

```bash
grep -n "export.*splitSseLines\|export.*extractDataJson" lib/sse-parser.ts
```

Expected: both functions found. If named differently, update the import in the chat route.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/[id]/chat/route.ts
git commit -m "feat(analytics): add SSE chat route with dashboard context"
```

---

## Task 8: PPTX Export Library + Export API Route

**Files:**
- Create: `lib/analytics-pptx-export.ts`
- Create: `lib/analytics-pptx-export.test.ts`
- Create: `app/api/analytics/[id]/export/route.ts`

- [ ] **Step 1: Write failing test for PPTX library**

Create `lib/analytics-pptx-export.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildAnalysisPptx } from "./analytics-pptx-export";
import type { AnalysisDashboard } from "./analytics-schema";

const sampleDashboard: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong quarter with 18% revenue growth.",
    keyFindings: ["Revenue up 18%", "Margins improved"],
    redFlags: ["High burn rate"],
    opportunities: ["Expand to EU"],
  },
  kpis: [
    { label: "Revenue", value: "$2.4M", trend: "up", category: "revenue" },
    { label: "EBITDA", value: "$480K", change: "+22%", trend: "up", category: "profitability" },
  ],
  charts: [
    {
      id: "revenue-chart",
      type: "bar",
      title: "Monthly Revenue",
      data: [{ name: "Jan", value: 800000 }, { name: "Feb", value: 850000 }],
    },
  ],
  tables: [],
  narrative: "Full narrative here.",
};

describe("buildAnalysisPptx", () => {
  it("returns a Buffer", async () => {
    const result = await buildAnalysisPptx(sampleDashboard);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.byteLength).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- lib/analytics-pptx-export.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement PPTX export library**

Create `lib/analytics-pptx-export.ts`:

```typescript
import PptxGenJS from "pptxgenjs";
import type { AnalysisDashboard } from "./analytics-schema";

const THEME = {
  bg: "1A1A2E",
  accent: "4F8EF7",
  text: "FFFFFF",
  subtext: "AAAACC",
  dark: "16213E",
};

export async function buildAnalysisPptx(dashboard: AnalysisDashboard): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };

  addTitleSlide(pptx, dashboard);
  addExecutiveSummarySlide(pptx, dashboard);
  addKpiSlide(pptx, dashboard);
  addKeyFindingsSlide(pptx, dashboard);
  if (dashboard.tables.length > 0) addTableSlide(pptx, dashboard);
  addOpportunitiesSlide(pptx, dashboard);

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

function slide(pptx: PptxGenJS, title: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  s.addText(title, {
    x: 0.5, y: 0.2, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent,
  });
  return s;
}

function addTitleSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = pptx.addSlide();
  s.background = { color: THEME.dark };
  s.addText(d.meta.companyName, {
    x: 0.5, y: 2.5, w: "90%", h: 1.2,
    fontSize: 40, bold: true, color: THEME.text, align: "center",
  });
  s.addText(`${d.meta.period} · ${d.meta.documentType} · ${d.meta.currency}`, {
    x: 0.5, y: 3.8, w: "90%", h: 0.5,
    fontSize: 18, color: THEME.subtext, align: "center",
  });
  s.addText(`Generated ${new Date(d.meta.analyzedAt).toLocaleDateString()}`, {
    x: 0.5, y: 4.5, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.subtext, align: "center",
  });
}

function addExecutiveSummarySlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = slide(pptx, "Executive Summary");
  s.addText(d.summary.executive, {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 14, color: THEME.text, valign: "top",
  });
}

function addKpiSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = slide(pptx, "Key Metrics");
  const kpis = d.kpis.slice(0, 6);
  const cols = 3;
  const cellW = 4.0;
  const cellH = 1.4;
  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cellW + 0.2);
    const y = 1.1 + row * (cellH + 0.15);
    s.addShape("rect", {
      x, y, w: cellW, h: cellH, fill: { color: THEME.dark }, line: { color: THEME.accent, width: 1 },
    });
    s.addText(kpi.value, {
      x, y: y + 0.1, w: cellW, h: 0.7,
      fontSize: 22, bold: true, color: THEME.accent, align: "center",
    });
    s.addText(kpi.label, {
      x, y: y + 0.75, w: cellW, h: 0.35,
      fontSize: 11, color: THEME.subtext, align: "center",
    });
    if (kpi.change) {
      const changeColor = kpi.trend === "up" ? "4CAF50" : kpi.trend === "down" ? "F44336" : THEME.subtext;
      s.addText(kpi.change, {
        x, y: y + 1.05, w: cellW, h: 0.25,
        fontSize: 10, color: changeColor, align: "center",
      });
    }
  });
}

function addKeyFindingsSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = slide(pptx, "Key Findings & Red Flags");
  const findings = d.summary.keyFindings.map((f) => ({ text: `• ${f}`, options: { color: THEME.text } }));
  const redFlags = d.summary.redFlags.map((f) => ({ text: `⚠ ${f}`, options: { color: "F44336" } }));
  s.addText([...findings, { text: "" }, ...redFlags], {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 14, paraSpaceAfter: 6, valign: "top",
  });
}

function addTableSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const table = d.tables[0];
  const s = slide(pptx, table.title);
  const rows = [
    table.headers.map((h) => ({ text: h, options: { bold: true, color: THEME.accent, fill: { color: THEME.dark } } })),
    ...table.rows.slice(0, 10).map((row) =>
      row.map((cell) => ({ text: cell, options: { color: THEME.text, fill: { color: THEME.bg } } }))
    ),
  ];
  s.addTable(rows, { x: 0.5, y: 1.0, w: 12.0, fontSize: 11, border: { color: THEME.accent, pt: 0.5 } });
}

function addOpportunitiesSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = slide(pptx, "Opportunities");
  const items = d.summary.opportunities.map((o) => ({ text: `→ ${o}`, options: { color: "4CAF50" } }));
  s.addText(items.length ? items : [{ text: "No specific opportunities identified.", options: { color: THEME.subtext } }], {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 15, paraSpaceAfter: 8, valign: "top",
  });
}
```

- [ ] **Step 4: Run PPTX test**

```bash
npm test -- lib/analytics-pptx-export.test.ts
```

Expected: 1 test PASS.

- [ ] **Step 5: Create the export API route**

Create `app/api/analytics/[id]/export/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { requireDbUser, requireProjectAccess } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { buildAnalysisPptx } from "@/lib/analytics-pptx-export";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (guard.status !== 200) return apiGuardError(guard);
  const { user } = guard;

  const { id: projectId } = await params;

  const accessGuard = await requireProjectAccess(projectId, user.id);
  if (accessGuard.status !== 200) return apiGuardError(accessGuard);

  const body = await req.json() as { format: string };
  if (body.format !== "pptx") return apiError("Only pptx format is supported", 400);

  const state = await getSandboxProjectState(projectId);
  const raw = state?.files?.["analysis.json"];
  if (!raw) return apiError("No analysis found", 404);

  const dashboard = analysisDashboardSchema.parse(JSON.parse(raw));
  const buffer = await buildAnalysisPptx(dashboard);
  const filename = `${dashboard.meta.companyName.replace(/\s+/g, "_")}_${dashboard.meta.period.replace(/\s+/g, "_")}.pptx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add lib/analytics-pptx-export.ts lib/analytics-pptx-export.test.ts app/api/analytics/[id]/export/route.ts
git commit -m "feat(analytics): add PPTX export library and export API route"
```

---

## Task 9: Analytics Layout + Page Shell

**Files:**
- Create: `app/(builder)/playground/analytics/layout.tsx`
- Create: `app/(builder)/playground/analytics/page.tsx`

- [ ] **Step 1: Create standalone layout (no sidebar)**

Create `app/(builder)/playground/analytics/layout.tsx`:

```typescript
import type { ReactNode } from "react";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create the page entry point**

Create `app/(builder)/playground/analytics/page.tsx`:

```typescript
import { Suspense } from "react";
import { AnalyticsEditor } from "@/components/playground/analytics/analytics-editor";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <AnalyticsEditor />
    </Suspense>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

This will fail because `AnalyticsEditor` doesn't exist yet — that's expected. Confirm the error is only about missing `AnalyticsEditor`.

- [ ] **Step 4: Commit**

```bash
git add app/(builder)/playground/analytics/layout.tsx app/(builder)/playground/analytics/page.tsx
git commit -m "feat(analytics): add analytics page layout and entry point"
```

---

## Task 10: Core UI Components

**Files:**
- Create: `components/playground/analytics/analytics-upload-zone.tsx`
- Create: `components/playground/analytics/analytics-kpi-grid.tsx`
- Create: `components/playground/analytics/analytics-chart-block.tsx`
- Create: `components/playground/analytics/analytics-dashboard.tsx`
- Create: `components/playground/analytics/analytics-progress-overlay.tsx`

- [ ] **Step 1: Create upload zone**

Create `components/playground/analytics/analytics-upload-zone.tsx`:

```typescript
"use client";

import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function AnalyticsUploadZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (file: File) => {
      if (!file.type.includes("pdf")) return;
      onFile(file);
    },
    [onFile]
  );

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-4 w-full max-w-lg h-64",
        "border-2 border-dashed rounded-xl cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
        disabled && "opacity-50 pointer-events-none"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handle(f);
      }}
    >
      <input
        type="file"
        accept="application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
      />
      <div className="p-4 rounded-full bg-primary/10">
        <FileText className="w-8 h-8 text-primary" />
      </div>
      <div className="text-center">
        <p className="font-medium">Drop a PDF here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">P&L, balance sheets, cash flow reports · max 50 MB</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Upload className="w-3 h-3" /> PDF only
      </div>
    </label>
  );
}
```

- [ ] **Step 2: Create KPI grid**

Create `components/playground/analytics/analytics-kpi-grid.tsx`:

```typescript
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/analytics-schema";

interface Props { kpis: Kpi[] }

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const TREND_COLOR = {
  up: "text-green-500",
  down: "text-red-500",
  neutral: "text-muted-foreground",
};

export function AnalyticsKpiGrid({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {kpis.slice(0, 6).map((kpi) => {
        const Icon = TREND_ICON[kpi.trend];
        return (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-4 flex flex-col gap-1"
          >
            <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
            <span className="text-xl font-bold tracking-tight">{kpi.value}</span>
            {kpi.change && (
              <div className={cn("flex items-center gap-1 text-xs", TREND_COLOR[kpi.trend])}>
                <Icon className="w-3 h-3" />
                {kpi.change}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create chart block**

Create `components/playground/analytics/analytics-chart-block.tsx`:

```typescript
"use client";

import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { Chart } from "@/lib/analytics-schema";

const COLORS = ["#4F8EF7", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

interface Props { chart: Chart }

export function AnalyticsChartBlock({ chart }: Props) {
  const { type, title, data, description } = chart;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-2">
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        {type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
          </LineChart>
        ) : type === "area" ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={`${COLORS[0]}33`} />
          </AreaChart>
        ) : type === "pie" || type === "waterfall" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : (
          <BarChart data={data}><Bar dataKey="value" fill={COLORS[0]} /></BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create dashboard orchestrator**

Create `components/playground/analytics/analytics-dashboard.tsx`:

```typescript
import type { AnalysisDashboard } from "@/lib/analytics-schema";
import { AnalyticsKpiGrid } from "./analytics-kpi-grid";
import { AnalyticsChartBlock } from "./analytics-chart-block";

interface Props { dashboard: AnalysisDashboard }

export function AnalyticsDashboard({ dashboard }: Props) {
  const { summary, kpis, charts, tables } = dashboard;
  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto">
      <AnalyticsKpiGrid kpis={kpis} />

      {charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {charts.slice(0, 4).map((chart) => (
            <AnalyticsChartBlock key={chart.id} chart={chart} />
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">Executive Summary</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.executive}
        </p>
      </div>

      {summary.redFlags.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <h3 className="font-semibold text-sm text-red-500">Red Flags</h3>
          <ul className="space-y-1">
            {summary.redFlags.map((flag, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-red-500 shrink-0">⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tables.map((table) => (
        <div key={table.title} className="rounded-xl border bg-card p-4 overflow-x-auto">
          <h3 className="font-semibold text-sm mb-3">{table.title}</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                {table.headers.map((h) => (
                  <th key={h} className="text-left py-1.5 pr-4 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1.5 pr-4">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create progress overlay**

Create `components/playground/analytics/analytics-progress-overlay.tsx`:

```typescript
"use client";

import { Loader2 } from "lucide-react";

interface Props {
  progress: number;
  message: string;
}

export function AnalyticsProgressOverlay({ progress, message }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20 gap-6">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <div className="w-64 space-y-2 text-center">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add components/playground/analytics/
git commit -m "feat(analytics): add dashboard UI components (upload zone, KPI grid, charts, progress)"
```

---

## Task 11: Chat Panel + Export Menu

**Files:**
- Create: `components/playground/analytics/analytics-chat-panel.tsx`
- Create: `components/playground/analytics/analytics-export-menu.tsx`

- [ ] **Step 1: Create chat panel**

Create `components/playground/analytics/analytics-chat-panel.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";

interface Props { projectId: string }

export function AnalyticsChatPanel({ projectId }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chatMessages,
    isChatStreaming,
    addChatMessage,
    updateLastAssistantMessage,
    setIsChatStreaming,
  } = useAnalyticsStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || isChatStreaming) return;
    setInput("");

    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: message };
    addChatMessage(userMsg);
    const assistantMsg = { id: crypto.randomUUID(), role: "assistant" as const, content: "" };
    addChatMessage(assistantMsg);
    setIsChatStreaming(true);

    try {
      const res = await fetch(`/api/analytics/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: chatMessages.filter((m) => m.id !== assistantMsg.id),
        }),
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6)) as { type: string; text?: string };
          if (payload.type === "delta" && payload.text) {
            updateLastAssistantMessage(
              (chatMessages.find((m) => m.id === assistantMsg.id)?.content ?? "") + payload.text
            );
          }
        }
      }
    } finally {
      setIsChatStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full border-r bg-card">
      <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        AI Chat
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">
            Ask anything about the financial data
          </p>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
            <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-muted mt-0.5">
              {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
            </div>
            <div
              className={cn(
                "text-xs rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap leading-relaxed",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {msg.content || (isChatStreaming ? "▋" : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the data..."
          className="text-xs resize-none min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
        />
        <Button size="icon" onClick={sendMessage} disabled={isChatStreaming || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create export menu**

Create `components/playground/analytics/analytics-export-menu.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Download, FileText, Presentation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadHtmlAsPdf } from "@/lib/export-html-pdf";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";

interface Props {
  projectId: string;
  dashboardRef: React.RefObject<HTMLDivElement | null>;
}

export function AnalyticsExportMenu({ projectId, dashboardRef }: Props) {
  const [loadingPptx, setLoadingPptx] = useState(false);
  const { dashboard } = useAnalyticsStore();

  async function exportPptx() {
    if (!dashboard) return;
    setLoadingPptx(true);
    try {
      const res = await fetch(`/api/analytics/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pptx" }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dashboard.meta.companyName}_${dashboard.meta.period}.pptx`.replace(/\s+/g, "_");
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingPptx(false);
    }
  }

  async function exportPdf() {
    if (!dashboardRef.current) return;
    await downloadHtmlAsPdf(
      dashboardRef.current,
      `${dashboard?.meta.companyName ?? "report"}_analysis.pdf`
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!dashboard}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPdf} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPptx} disabled={loadingPptx} className="gap-2 cursor-pointer">
          {loadingPptx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
          PowerPoint (PPTX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Verify `downloadHtmlAsPdf` signature**

```bash
grep -n "export.*downloadHtmlAsPdf" lib/export-html-pdf.ts
```

Confirm function signature matches usage above. Adjust if needed.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/playground/analytics/analytics-chat-panel.tsx components/playground/analytics/analytics-export-menu.tsx
git commit -m "feat(analytics): add chat panel and export menu components"
```

---

## Task 12: Analytics Editor — Wire Everything Together

**Files:**
- Create: `components/playground/analytics/analytics-editor.tsx`

- [ ] **Step 1: Create the main editor component**

Create `components/playground/analytics/analytics-editor.tsx`:

```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { AnalyticsUploadZone } from "./analytics-upload-zone";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { AnalyticsChatPanel } from "./analytics-chat-panel";
import { AnalyticsProgressOverlay } from "./analytics-progress-overlay";
import { AnalyticsExportMenu } from "./analytics-export-menu";
import type { AnalysisDashboard } from "@/lib/analytics-schema";

export function AnalyticsEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId") ?? "";
  const dashboardRef = useRef<HTMLDivElement>(null);

  const {
    status,
    progress,
    dashboard,
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
      .then((data) => {
        if (data?.data?.dashboard) {
          setDashboard(data.data.dashboard as AnalysisDashboard);
        }
      })
      .catch(() => {});
  }, [projectId, setProjectId, setDashboard]);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setProgress(5);

      // Upload PDF
      const form = new FormData();
      form.append("file", file);

      const uploadRes = await fetch(`/api/analytics/${projectId}/upload`, {
        method: "POST",
        body: form,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        setError((err as { error?: string }).error ?? "Upload failed");
        return;
      }

      // Stream analysis
      setStatus("analyzing");
      setProgress(10);

      const analyzeRes = await fetch(`/api/analytics/${projectId}/analyze`, {
        method: "POST",
      });

      if (!analyzeRes.body) {
        setError("Analysis stream unavailable");
        return;
      }

      const reader = analyzeRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

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
          } else if (payload.type === "error") {
            setError(payload.message ?? "Analysis failed");
          }
        }
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
          onClick={() => router.push("/projects")}
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

        {status === "idle" || status === "error" ? (
          /* Upload state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm max-w-sm text-center">
              Upload a financial PDF — P&amp;L, balance sheet, cash flow report — and get an instant AI analysis.
            </p>
            <AnalyticsUploadZone onFile={handleFile} disabled={isLoading} />
            {status === "error" && (
              <p className="text-sm text-red-500">{useAnalyticsStore.getState().errorMessage}</p>
            )}
          </div>
        ) : (
          /* Dashboard state */
          <div className="flex flex-1 overflow-hidden">
            {/* Left: chat */}
            <div className="w-64 shrink-0">
              <AnalyticsChatPanel projectId={projectId} />
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
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and manual end-to-end test**

```bash
npm run dev
```

Navigate to `/playground/analytics?projectId=<existing-project-id>`. Verify:
- Upload zone renders correctly
- Drop a PDF → progress bar appears → dashboard renders with KPIs and charts
- AI chat responds to questions about the data
- Export PPTX → file downloads

- [ ] **Step 4: Commit**

```bash
git add components/playground/analytics/analytics-editor.tsx
git commit -m "feat(analytics): wire AnalyticsEditor — upload, analyze, dashboard, chat, export"
```

---

## Task 13: Navigation Entry Point

**Files:**
- Modify: `components/sidebar.tsx` (or dashboard new-project flow)

- [ ] **Step 1: Add Analytics link to sidebar**

In `components/sidebar.tsx`, find the `navItems` array and add an Analytics entry:

```typescript
import { BarChart2 } from "lucide-react"; // add to imports

// In navItems array, add after playground item:
{ href: "/analytics-redirect", labelKey: "nav_analytics_bi", icon: BarChart2 },
```

- [ ] **Step 2: Create the redirect API that creates an analytics project**

Create `app/api/analytics/new/route.ts`:

```typescript
import { requireDbUser } from "@/lib/auth-guards";
import { apiGuardError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function GET() {
  const guard = await requireDbUser();
  if (guard.status !== 200) return apiGuardError(guard);
  const { user } = guard;

  // Create a new analytics project
  const subdomain = `analytics-${Date.now()}`;
  const project = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: "New Analytics Report",
      subdomain,
      preferredEditor: "analytics",
    },
  });

  redirect(`/playground/analytics?projectId=${project.id}`);
}
```

- [ ] **Step 3: Add redirect page**

Create `app/(dashboard)/analytics-redirect/route.ts` (or add as a page that calls the API):

```typescript
// Simplest approach: just redirect to the API
import { redirect } from "next/navigation";

export default function AnalyticsRedirect() {
  redirect("/api/analytics/new");
}
```

- [ ] **Step 4: Add i18n key**

In `lib/i18n.ts`, add the key `nav_analytics_bi` with values:
- `en`: `"Analytics"`
- `ru`: `"Аналитика"`

Verify the exact pattern used by checking how other nav labels are added in `lib/i18n.ts`.

- [ ] **Step 5: Final type-check and test**

```bash
npx tsc --noEmit
npm test
```

Expected: all tests pass, no type errors.

- [ ] **Step 6: Final commit**

```bash
git add components/sidebar.tsx app/api/analytics/new/route.ts lib/i18n.ts
git commit -m "feat(analytics): add sidebar entry point and project creation redirect"
```

---

## Verification Checklist

1. `npm test` — all tests pass (schema, prompt, PPTX)
2. `npx tsc --noEmit` — zero type errors
3. Sidebar shows "Аналитика / Analytics" link
4. Clicking it creates a new analytics project and opens `/playground/analytics?projectId=X`
5. Drop a financial PDF → upload succeeds → analysis SSE streams → dashboard renders
6. KPI cards show correct values from the PDF
7. Charts render (bar/line/area/pie depending on AI choice)
8. AI chat answers "What is the revenue?" with specific numbers
9. Export PPTX → file downloads with correct company name in filename
10. Export PDF → browser downloads A4 PDF with dashboard
11. Refresh page → existing dashboard loads from `analysis.json`
12. Token usage visible in admin panel after analysis
