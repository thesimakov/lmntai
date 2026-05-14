# Marketing Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "marketing" project type with CSV/XLSX/PDF upload → AI channels-first dashboard → PPTX export, separate from the existing financial Analytics mode.

**Architecture:** New project type `"marketing"` at `/playground/marketing`. Four API routes (`upload`, `analyze`, `chat`, `export`) mirror the analytics pattern — file state in `SandboxProjectState.files`, non-streaming JSON AI for analyze (like investor route), SSE streaming for chat. UI: `marketing-editor.tsx` with upload-panel + dashboard + chat panel tabs.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Zod, `xlsx` (new), `pdf-parse` (existing), RouterAI (`requestRouterAIJson` / `requestRouterAIStream`), PptxGenJS, Recharts, Zustand, Tailwind + shadcn/ui.

---

## File Map

**New files:**
- `lib/marketing-schema.ts` — Zod schema + TS types for `MarketingDashboard`
- `lib/marketing-prompt.ts` — AI prompt builders (analyze + chat)
- `lib/stores/use-marketing-store.ts` — Zustand store
- `lib/marketing-pptx-export.ts` — 8-slide PptxGenJS builder
- `app/api/marketing/[id]/upload/route.ts` — multipart file upload + parse
- `app/api/marketing/[id]/analyze/route.ts` — non-streaming JSON AI analysis
- `app/api/marketing/[id]/chat/route.ts` — SSE streaming chat
- `app/api/marketing/[id]/export/route.ts` — PPTX export
- `app/(builder)/playground/marketing/layout.tsx` — standalone layout (no sidebar)
- `app/(builder)/playground/marketing/page.tsx` — page entry point
- `components/playground/marketing/marketing-editor.tsx` — main component
- `components/playground/marketing/marketing-upload-panel.tsx` — upload zone + file list
- `components/playground/marketing/marketing-dashboard.tsx` — KPI row + channels + chart
- `components/playground/marketing/marketing-channel-card.tsx` — single channel card
- `components/playground/marketing/marketing-chart-block.tsx` — Recharts bar chart
- `components/playground/marketing/marketing-chat-panel.tsx` — SSE chat panel

**Modified files:**
- `lib/lemnity-ai-prompt-spec.ts` — add `"marketing"` to `PROJECT_KINDS`
- `lib/playground-project-edit-url.ts` — add `PreferredPlaygroundEditor` value + URL builder

---

### Task 1: Install xlsx + marketing schema

**Files:**
- Modify: `package.json`
- Create: `lib/marketing-schema.ts`
- Create: `lib/marketing-schema.test.ts`

- [ ] **Step 1: Install xlsx**

```bash
npm install xlsx
```

Expected: `package.json` gains `"xlsx": "^0.18.x"` (or similar).

- [ ] **Step 2: Write the failing test**

Create `lib/marketing-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { marketingDashboardSchema } from "./marketing-schema";

const validDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    dataSource: "Google Ads CSV",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong performance across paid channels.",
    topFindings: ["Google Ads ROAS 4.1x", "Email CAC rising"],
    recommendations: ["Increase Google budget by 15%"],
  },
  channels: [
    {
      name: "Google Ads",
      spend: 12400,
      revenue: 50840,
      kpis: [{ label: "ROAS", value: "4.1x", trend: "up" as const }],
      trend: "up" as const,
      narrative: "Top performer.",
    },
  ],
  kpis: [{ label: "Total Spend", value: "$48.2K", trend: "up" as const }],
  charts: [
    {
      id: "spend-by-channel",
      type: "bar" as const,
      title: "Spend by Channel",
      data: [{ name: "Google Ads", value: 12400 }],
    },
  ],
  narrative: "Overall strong quarter.",
};

describe("marketingDashboardSchema", () => {
  it("validates a correct dashboard", () => {
    const result = marketingDashboardSchema.safeParse(validDashboard);
    expect(result.success).toBe(true);
  });

  it("rejects empty channels array", () => {
    const result = marketingDashboardSchema.safeParse({
      ...validDashboard,
      channels: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 channels", () => {
    const channel = validDashboard.channels[0];
    const result = marketingDashboardSchema.safeParse({
      ...validDashboard,
      channels: Array(7).fill(channel),
    });
    expect(result.success).toBe(false);
  });

  it("allows optional spend and revenue on channel", () => {
    const { spend: _s, revenue: _r, ...channelWithout } = validDashboard.channels[0];
    const result = marketingDashboardSchema.safeParse({
      ...validDashboard,
      channels: [channelWithout],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npx vitest run lib/marketing-schema.test.ts
```

Expected: FAIL with "Cannot find module './marketing-schema'"

- [ ] **Step 4: Implement `lib/marketing-schema.ts`**

```typescript
import { z } from "zod";

const marketingKpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.string().optional(),
  trend: z.enum(["up", "down", "neutral"]),
});

const marketingChannelSchema = z.object({
  name: z.string(),
  spend: z.number().optional(),
  revenue: z.number().optional(),
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
    analyzedAt: z.string(),
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
```

- [ ] **Step 5: Run to verify tests pass**

```bash
npx vitest run lib/marketing-schema.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/marketing-schema.ts lib/marketing-schema.test.ts package.json package-lock.json
git commit -m "feat: add marketing-schema (Zod) and install xlsx"
```

---

### Task 2: Marketing prompt builder

**Files:**
- Create: `lib/marketing-prompt.ts`
- Create: `lib/marketing-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/marketing-prompt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildMarketingPrompt, buildMarketingChatPrompt } from "./marketing-prompt";
import type { MarketingDashboard } from "./marketing-schema";

const minimalDashboard: MarketingDashboard = {
  meta: { companyName: "Acme", period: "Q1 2024", dataSource: "CSV", analyzedAt: "2024-01-01T00:00:00.000Z" },
  summary: { executive: "Good quarter.", topFindings: ["ROAS up"], recommendations: ["Increase budget"] },
  channels: [{ name: "Google Ads", kpis: [{ label: "ROAS", value: "4x", trend: "up" }], trend: "up", narrative: "Top channel." }],
  kpis: [{ label: "Total Spend", value: "$10K", trend: "neutral" }],
  charts: [],
  narrative: "Overall good.",
};

describe("buildMarketingPrompt", () => {
  it("returns array of messages with system and user roles", () => {
    const messages = buildMarketingPrompt("Channel: Google Ads\nSpend: $10K");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("includes raw text in user message", () => {
    const rawText = "Google Ads,Spend,Revenue\nSearch,10000,41000";
    const messages = buildMarketingPrompt(rawText);
    expect(messages[1].content).toContain(rawText);
  });

  it("system prompt mentions JSON", () => {
    const messages = buildMarketingPrompt("data");
    expect(messages[0].content).toContain("JSON");
  });
});

describe("buildMarketingChatPrompt", () => {
  it("includes dashboard context in system message", () => {
    const messages = buildMarketingChatPrompt(minimalDashboard, "Which channel is best?", []);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Google Ads");
  });

  it("appends history and user message", () => {
    const history = [{ role: "user" as const, content: "prev question" }, { role: "assistant" as const, content: "prev answer" }];
    const messages = buildMarketingChatPrompt(minimalDashboard, "new question", history);
    const last = messages[messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toBe("new question");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run lib/marketing-prompt.test.ts
```

Expected: FAIL with "Cannot find module './marketing-prompt'"

- [ ] **Step 3: Implement `lib/marketing-prompt.ts`**

```typescript
import type { MarketingDashboard } from "./marketing-schema";

type Message = { role: "system" | "user" | "assistant"; content: string };

const ANALYZE_SYSTEM_PROMPT = `You are a marketing analytics expert. Analyze the provided marketing data and generate a channels-first performance report.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "meta": {
    "companyName": string,      // infer from data or use "Unknown Company"
    "period": string,           // e.g. "Jan–Mar 2024"
    "dataSource": string,       // describe what files/sources were found, e.g. "Google Ads CSV + Meta XLSX"
    "analyzedAt": string        // current ISO timestamp (will be overridden by server)
  },
  "summary": {
    "executive": string,        // 2–3 sentence executive summary
    "topFindings": string[],    // 3–5 bullet points of key insights
    "recommendations": string[] // 3–5 actionable recommendations
  },
  "channels": [                 // 1 to 6 channels identified in the data
    {
      "name": string,           // e.g. "Google Ads", "Meta Ads", "Organic", "Email", "Yandex"
      "spend": number,          // optional, raw number (no symbols)
      "revenue": number,        // optional, raw number (no symbols)
      "kpis": [
        {
          "label": string,      // e.g. "ROAS", "CAC", "CTR", "CPC", "CVR", "Open Rate"
          "value": string,      // formatted string e.g. "4.1x", "$42", "6.2%"
          "change": string,     // optional, e.g. "+0.4x MoM"
          "trend": "up" | "down" | "neutral"
        }
      ],
      "trend": "up" | "down" | "neutral",
      "narrative": string       // 1–2 sentences about this channel's performance
    }
  ],
  "kpis": [                     // 3–5 summary metrics across all channels
    {
      "label": string,          // e.g. "Total Spend", "Total Revenue", "Blended ROAS", "Avg CAC"
      "value": string,
      "change": string,
      "trend": "up" | "down" | "neutral"
    }
  ],
  "charts": [                   // 2–3 charts
    {
      "id": string,
      "type": "bar" | "line" | "pie",
      "title": string,
      "data": [{ "name": string, "value": number }]
    }
  ],
  "narrative": string           // 2–3 sentence overall performance narrative
}

Rules:
- Identify channels from column names, sheet names, or explicit labels in the data.
- For paid channels (Google Ads, Meta, Yandex): always include ROAS if spend + revenue are present.
- For organic channels: include CVR and sessions if available.
- For email: include open rate and CTR if available.
- All numeric values in "spend" and "revenue" must be raw numbers — no symbols, no commas.
- Return ONLY the JSON — no preamble, no explanation, no markdown fences.`;

const CHAT_SYSTEM_PROMPT_PREFIX = `You are a marketing analytics assistant. You have access to the following marketing performance data for this company:

--- MARKETING DATA ---
`;

export function buildMarketingPrompt(rawText: string): Message[] {
  const now = new Date().toISOString();
  return [
    { role: "system", content: ANALYZE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\n--- MARKETING DATA ---\n\n${rawText}`,
    },
  ];
}

export function buildMarketingChatPrompt(
  dashboard: MarketingDashboard,
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Message[] {
  const context = JSON.stringify(dashboard, null, 2);
  const systemContent =
    CHAT_SYSTEM_PROMPT_PREFIX +
    context +
    "\n\nAnswer questions about channel performance, KPIs, spend, revenue, and recommendations. Be concise and cite specific numbers from the data.";

  return [
    { role: "system", content: systemContent },
    ...history,
    { role: "user", content: message },
  ];
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx vitest run lib/marketing-prompt.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/marketing-prompt.ts lib/marketing-prompt.test.ts
git commit -m "feat: add marketing prompt builders (analyze + chat)"
```

---

### Task 3: Zustand store

**Files:**
- Create: `lib/stores/use-marketing-store.ts`
- Create: `lib/stores/use-marketing-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/stores/use-marketing-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useMarketingStore } from "./use-marketing-store";
import type { MarketingDashboard } from "@/lib/marketing-schema";

const minimalDashboard: MarketingDashboard = {
  meta: { companyName: "Acme", period: "Q1 2024", dataSource: "CSV", analyzedAt: "2024-01-01T00:00:00.000Z" },
  summary: { executive: "Good.", topFindings: ["ROAS up"], recommendations: ["More budget"] },
  channels: [{ name: "Google Ads", kpis: [], trend: "up", narrative: "Top." }],
  kpis: [],
  charts: [],
  narrative: "Overall good.",
};

describe("useMarketingStore", () => {
  beforeEach(() => {
    useMarketingStore.getState().reset();
  });

  it("starts idle with no dashboard", () => {
    const { status, dashboard } = useMarketingStore.getState();
    expect(status).toBe("idle");
    expect(dashboard).toBeNull();
  });

  it("setDashboard sets status to ready and clears error", () => {
    useMarketingStore.getState().setError("prev error");
    useMarketingStore.getState().setDashboard(minimalDashboard);
    const { status, dashboard, errorMessage } = useMarketingStore.getState();
    expect(status).toBe("ready");
    expect(dashboard).toEqual(minimalDashboard);
    expect(errorMessage).toBeNull();
  });

  it("setError sets status to error", () => {
    useMarketingStore.getState().setError("something went wrong");
    const { status, errorMessage } = useMarketingStore.getState();
    expect(status).toBe("error");
    expect(errorMessage).toBe("something went wrong");
  });

  it("addChatMessage appends to chatMessages", () => {
    useMarketingStore.getState().addChatMessage({ id: "1", role: "user", content: "Hello" });
    expect(useMarketingStore.getState().chatMessages).toHaveLength(1);
  });

  it("updateLastAssistantMessage updates last assistant content", () => {
    useMarketingStore.getState().addChatMessage({ id: "1", role: "user", content: "Q" });
    useMarketingStore.getState().addChatMessage({ id: "2", role: "assistant", content: "" });
    useMarketingStore.getState().updateLastAssistantMessage("Answer here");
    expect(useMarketingStore.getState().chatMessages[1].content).toBe("Answer here");
  });

  it("reset returns to initial state", () => {
    useMarketingStore.getState().setDashboard(minimalDashboard);
    useMarketingStore.getState().reset();
    expect(useMarketingStore.getState().status).toBe("idle");
    expect(useMarketingStore.getState().dashboard).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run lib/stores/use-marketing-store.test.ts
```

Expected: FAIL with "Cannot find module './use-marketing-store'"

- [ ] **Step 3: Implement `lib/stores/use-marketing-store.ts`**

```typescript
import { create } from "zustand";
import type { MarketingDashboard } from "@/lib/marketing-schema";

export type MarketingStatus = "idle" | "uploading" | "analyzing" | "ready" | "error";

export interface MarketingChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface MarketingStore {
  projectId: string | null;
  dashboard: MarketingDashboard | null;
  status: MarketingStatus;
  errorMessage: string | null;
  chatMessages: MarketingChatMessage[];
  isChatStreaming: boolean;

  setProjectId: (id: string) => void;
  setDashboard: (d: MarketingDashboard) => void;
  setStatus: (s: MarketingStatus) => void;
  setError: (msg: string) => void;
  addChatMessage: (msg: MarketingChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatStreaming: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  projectId: null,
  dashboard: null,
  status: "idle" as MarketingStatus,
  errorMessage: null,
  chatMessages: [],
  isChatStreaming: false,
};

export const useMarketingStore = create<MarketingStore>((set) => ({
  ...initialState,

  setProjectId: (projectId) => set({ projectId }),
  setDashboard: (dashboard) => set({ dashboard, status: "ready", errorMessage: null }),
  setStatus: (status) => set({ status }),
  setError: (errorMessage) => set({ status: "error", errorMessage }),
  setIsChatStreaming: (isChatStreaming) => set({ isChatStreaming }),

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

- [ ] **Step 4: Run to verify tests pass**

```bash
npx vitest run lib/stores/use-marketing-store.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/stores/use-marketing-store.ts lib/stores/use-marketing-store.test.ts
git commit -m "feat: add useMarketingStore (Zustand)"
```

---

### Task 4: Upload API route

**Files:**
- Create: `app/api/marketing/[id]/upload/route.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/marketing/[id]/upload/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guards", () => ({
  requireDbUser: vi.fn(),
}));
vi.mock("@/lib/project-context", () => ({
  requireProjectScopeForOwner: vi.fn(),
}));
vi.mock("@/lib/sandbox-project-state-db", () => ({
  getSandboxProjectState: vi.fn(),
  upsertSandboxProjectState: vi.fn(),
}));

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { POST } from "./route";

const mockRequireDbUser = requireDbUser as ReturnType<typeof vi.fn>;
const mockRequireProjectScope = requireProjectScopeForOwner as ReturnType<typeof vi.fn>;
const mockGetState = getSandboxProjectState as ReturnType<typeof vi.fn>;
const mockUpsert = upsertSandboxProjectState as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireDbUser.mockResolvedValue({ ok: true, data: { user: { id: "user-1" } } });
  mockRequireProjectScope.mockResolvedValue(undefined);
  mockGetState.mockResolvedValue({ sandboxId: "", html: "", files: {}, title: "", ownerId: "user-1" });
  mockUpsert.mockResolvedValue(undefined);
});

describe("POST /api/marketing/[id]/upload", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireDbUser.mockResolvedValue({ ok: false, status: 401, message: "Unauthorized" });
    const form = new FormData();
    const req = new Request("http://localhost/api/marketing/p1/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no files provided", async () => {
    const form = new FormData();
    const req = new Request("http://localhost/api/marketing/p1/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("No files");
  });

  it("returns 400 for unsupported file type", async () => {
    const form = new FormData();
    form.append("files", new File(["data"], "report.docx", { type: "application/msword" }));
    const req = new Request("http://localhost/api/marketing/p1/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Unsupported");
  });

  it("returns 200 with CSV file", async () => {
    const csvContent = "Channel,Spend,Revenue\nGoogle Ads,10000,41000";
    const form = new FormData();
    form.append("files", new File([csvContent], "ads.csv", { type: "text/csv" }));
    const req = new Request("http://localhost/api/marketing/p1/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { fileCount: number; charCount: number } };
    expect(body.data.fileCount).toBe(1);
    expect(body.data.charCount).toBeGreaterThan(0);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run "app/api/marketing/\[id\]/upload/route.test.ts"
```

Expected: FAIL with module not found

- [ ] **Step 3: Implement `app/api/marketing/[id]/upload/route.ts`**

```typescript
import { type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import {
  upsertSandboxProjectState,
  getSandboxProjectState,
} from "@/lib/sandbox-project-state-db";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 5;
const SUPPORTED_TYPES = new Set([
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/pdf",
]);

function isCsvOrXlsx(file: File): boolean {
  return (
    file.type === "text/csv" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  );
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.endsWith(".pdf");
}

async function extractCsvText(buffer: Buffer, filename: string): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [`=== File: ${filename} ===`];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        parts.push(`--- Sheet: ${sheetName} ---`);
        parts.push(csv);
      }
    }
    return parts.join("\n");
  } catch {
    throw new Error(`Could not parse file "${filename}" — check format`);
  }
}

async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text.trim();
    if (text.length < 20) {
      throw new Error(`The PDF "${filename}" appears to be empty or image-only.`);
    }
    return `=== File: ${filename} ===\n${text}`;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Could not extract text from "${filename}".`);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return apiError("No files provided", 400);
  if (files.length > MAX_FILES) return apiError(`Maximum ${MAX_FILES} files allowed`, 400);

  const textParts: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return apiError(`File "${file.name}" exceeds 50 MB limit`, 413);
    }
    if (!SUPPORTED_TYPES.has(file.type) && !isCsvOrXlsx(file) && !isPdf(file)) {
      return apiError(
        `Unsupported file type for "${file.name}". Use CSV, XLSX, or PDF.`,
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    try {
      if (isPdf(file)) {
        text = await extractPdfText(buffer, file.name);
      } else {
        text = await extractCsvText(buffer, file.name);
      }
    } catch (err) {
      return apiError(err instanceof Error ? err.message : `Could not parse "${file.name}"`, 400);
    }

    textParts.push(text);
  }

  const combined = textParts.join("\n\n");
  if (combined.trim().length < 20) {
    return apiError("No usable data found in uploaded files", 400);
  }

  const existing = await getSandboxProjectState(projectId);
  const existingFiles = existing?.files ?? {};

  await upsertSandboxProjectState({
    projectId,
    sandboxId: existing?.sandboxId ?? "",
    ownerId: user.id,
    html: existing?.html ?? "",
    files: { ...existingFiles, "marketing_raw.txt": combined },
    title: existing?.title ?? "Marketing Analysis",
  });

  return apiOk({ fileCount: files.length, charCount: combined.length });
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx vitest run "app/api/marketing/\[id\]/upload/route.test.ts"
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/api/marketing/[id]/upload/"
git commit -m "feat: add marketing upload route (CSV/XLSX/PDF → marketing_raw.txt)"
```

---

### Task 5: Analyze API route

**Files:**
- Create: `app/api/marketing/[id]/analyze/route.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/marketing/[id]/analyze/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guards", () => ({ requireDbUser: vi.fn() }));
vi.mock("@/lib/project-context", () => ({ requireProjectScopeForOwner: vi.fn() }));
vi.mock("@/lib/sandbox-project-state-db", () => ({
  getSandboxProjectState: vi.fn(),
  upsertSandboxProjectState: vi.fn(),
}));
vi.mock("@/lib/routerai-client", () => ({ requestRouterAIJson: vi.fn() }));
vi.mock("@/lib/token-billing", () => ({ chargeTokensSafely: vi.fn() }));

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { POST } from "./route";

const mockAuth = requireDbUser as ReturnType<typeof vi.fn>;
const mockScope = requireProjectScopeForOwner as ReturnType<typeof vi.fn>;
const mockGetState = getSandboxProjectState as ReturnType<typeof vi.fn>;
const mockUpsert = upsertSandboxProjectState as ReturnType<typeof vi.fn>;
const mockAI = requestRouterAIJson as ReturnType<typeof vi.fn>;

const validReport = {
  meta: { companyName: "Acme", period: "Q1 2024", dataSource: "CSV", analyzedAt: "2024-01-01T00:00:00.000Z" },
  summary: { executive: "Good.", topFindings: ["ROAS up"], recommendations: ["More budget"] },
  channels: [{ name: "Google Ads", kpis: [{ label: "ROAS", value: "4x", trend: "up" }], trend: "up", narrative: "Top." }],
  kpis: [{ label: "Total Spend", value: "$10K", trend: "neutral" }],
  charts: [{ id: "c1", type: "bar", title: "Spend", data: [{ name: "Google", value: 10000 }] }],
  narrative: "Good quarter.",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ ok: true, data: { user: { id: "user-1" } } });
  mockScope.mockResolvedValue(undefined);
  mockGetState.mockResolvedValue({
    sandboxId: "", html: "", title: "", ownerId: "user-1",
    files: { "marketing_raw.txt": "Channel,Spend\nGoogle,10000" },
  });
  mockUpsert.mockResolvedValue(undefined);
});

describe("POST /api/marketing/[id]/analyze", () => {
  it("returns 400 when marketing_raw.txt is missing", async () => {
    mockGetState.mockResolvedValue({ files: {} });
    const req = new Request("http://localhost/api/marketing/p1/analyze", { method: "POST" });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with valid AI response", async () => {
    mockAI.mockResolvedValue({ text: JSON.stringify(validReport), usage: null });
    const req = new Request("http://localhost/api/marketing/p1/analyze", { method: "POST" });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { report: typeof validReport } };
    expect(body.data.report.channels[0].name).toBe("Google Ads");
    expect(mockUpsert).toHaveBeenCalledOnce();
  });

  it("returns 422 after two failed AI attempts", async () => {
    mockAI.mockResolvedValue({ text: "not json at all", usage: null });
    const req = new Request("http://localhost/api/marketing/p1/analyze", { method: "POST" });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(422);
    expect(mockAI).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run "app/api/marketing/\[id\]/analyze/route.test.ts"
```

Expected: FAIL with module not found

- [ ] **Step 3: Implement `app/api/marketing/[id]/analyze/route.ts`**

```typescript
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildMarketingPrompt } from "@/lib/marketing-prompt";
import { marketingDashboardSchema } from "@/lib/marketing-schema";
import { chargeTokensSafely } from "@/lib/token-billing";

const MARKETING_MODEL = "anthropic/claude-sonnet-4.5";
const MAX_RAW_CHARS = 200_000;

const RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure channels array has 1–6 items.";

function tryParseDashboard(text: string): ReturnType<typeof marketingDashboardSchema.safeParse> | null {
  try {
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    return marketingDashboardSchema.safeParse(JSON.parse(jsonText));
  } catch {
    return null;
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
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const state = await getSandboxProjectState(projectId);
  const rawText = state?.files?.["marketing_raw.txt"];
  if (!rawText) {
    return apiError("No data uploaded. Upload CSV/XLSX/PDF files first.", 400);
  }

  const truncated =
    rawText.length > MAX_RAW_CHARS
      ? rawText.slice(0, MAX_RAW_CHARS) + "\n\n[Data truncated — first 200k characters shown]"
      : rawText;

  const messages = buildMarketingPrompt(truncated);

  async function callAI(msgs: typeof messages) {
    const result = await requestRouterAIJson({
      messages: msgs,
      model: MARKETING_MODEL,
      settings: { temperature: 0.1, max_completion_tokens: 8000 },
      user: user.id,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId: user.id,
        projectId,
        usage: result.usage,
        model: result.model ?? MARKETING_MODEL,
      });
    }
    return result;
  }

  let result1: Awaited<ReturnType<typeof callAI>>;
  try {
    result1 = await callAI(messages);
  } catch {
    return apiError("AI service temporarily unavailable", 502);
  }

  const v1 = tryParseDashboard(result1.text);
  if (v1?.success) {
    const report = { ...v1.data, meta: { ...v1.data.meta, analyzedAt: new Date().toISOString() } };
    const freshState = await getSandboxProjectState(projectId);
    await upsertSandboxProjectState({
      projectId,
      sandboxId: state.sandboxId,
      ownerId: user.id,
      title: state.title,
      html: state.html,
      files: { ...(freshState?.files ?? {}), "marketing.json": JSON.stringify(report) },
    });
    return apiOk({ report });
  }

  const retryMessages = [
    ...messages,
    { role: "assistant" as const, content: result1.text },
    { role: "user" as const, content: RETRY_MESSAGE },
  ];

  let result2: Awaited<ReturnType<typeof callAI>>;
  try {
    result2 = await callAI(retryMessages);
  } catch {
    return apiError("AI service temporarily unavailable", 502);
  }

  const v2 = tryParseDashboard(result2.text);
  if (!v2?.success) {
    return apiError("AI response did not match expected schema after retry. Please try again.", 422);
  }

  const report = { ...v2.data, meta: { ...v2.data.meta, analyzedAt: new Date().toISOString() } };
  const freshState2 = await getSandboxProjectState(projectId);
  await upsertSandboxProjectState({
    projectId,
    sandboxId: state.sandboxId,
    ownerId: user.id,
    title: state.title,
    html: state.html,
    files: { ...(freshState2?.files ?? {}), "marketing.json": JSON.stringify(report) },
  });

  return apiOk({ report });
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx vitest run "app/api/marketing/\[id\]/analyze/route.test.ts"
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/api/marketing/[id]/analyze/"
git commit -m "feat: add marketing analyze route (non-streaming JSON AI with retry)"
```

---

### Task 6: Chat API route

**Files:**
- Create: `app/api/marketing/[id]/chat/route.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/marketing/[id]/chat/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guards", () => ({ requireDbUser: vi.fn() }));
vi.mock("@/lib/project-context", () => ({ requireProjectScopeForOwner: vi.fn() }));
vi.mock("@/lib/sandbox-project-state-db", () => ({ getSandboxProjectState: vi.fn() }));
vi.mock("@/lib/routerai-client", () => ({ requestRouterAIStream: vi.fn() }));
vi.mock("@/lib/token-billing", () => ({
  chargeTokensSafely: vi.fn(),
  estimateUsageFromText: vi.fn().mockReturnValue({ total_tokens: 100 }),
}));

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIStream } from "@/lib/routerai-client";
import { POST } from "./route";

const mockAuth = requireDbUser as ReturnType<typeof vi.fn>;
const mockScope = requireProjectScopeForOwner as ReturnType<typeof vi.fn>;
const mockGetState = getSandboxProjectState as ReturnType<typeof vi.fn>;
const mockStream = requestRouterAIStream as ReturnType<typeof vi.fn>;

const validDashboard = {
  meta: { companyName: "Acme", period: "Q1 2024", dataSource: "CSV", analyzedAt: "2024-01-01T00:00:00.000Z" },
  summary: { executive: "Good.", topFindings: ["ROAS up"], recommendations: ["Budget up"] },
  channels: [{ name: "Google Ads", kpis: [{ label: "ROAS", value: "4x", trend: "up" }], trend: "up", narrative: "Top." }],
  kpis: [{ label: "Total Spend", value: "$10K", trend: "neutral" }],
  charts: [],
  narrative: "Good.",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: object) {
  return new Request("http://localhost/api/marketing/p1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ ok: true, data: { user: { id: "user-1" } } });
  mockScope.mockResolvedValue(undefined);
  mockGetState.mockResolvedValue({ files: { "marketing.json": JSON.stringify(validDashboard) } });
});

describe("POST /api/marketing/[id]/chat", () => {
  it("returns 400 when marketing.json is missing", async () => {
    mockGetState.mockResolvedValue({ files: {} });
    const res = await POST(makeRequest({ message: "hi", history: [] }) as never, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is empty", async () => {
    const res = await POST(makeRequest({ message: "", history: [] }) as never, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("returns 502 when RouterAI fails", async () => {
    mockStream.mockResolvedValue({ ok: false, body: null });
    const res = await POST(makeRequest({ message: "Which channel?", history: [] }) as never, makeParams("p1"));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run "app/api/marketing/\[id\]/chat/route.test.ts"
```

Expected: FAIL with module not found

- [ ] **Step 3: Implement `app/api/marketing/[id]/chat/route.ts`**

```typescript
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIStream } from "@/lib/routerai-client";
import { splitSseLines, extractDataJson } from "@/lib/sse-parser";
import { buildMarketingChatPrompt } from "@/lib/marketing-prompt";
import { marketingDashboardSchema } from "@/lib/marketing-schema";
import { chargeTokensSafely, estimateUsageFromText } from "@/lib/token-billing";

const CHAT_MODEL = "anthropic/claude-haiku-4.5";

const chatBodySchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    id: z.string(),
  })).default([]),
});

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

  const bodyResult = await parseBody(req, chatBodySchema);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const state = await getSandboxProjectState(projectId);
  const rawDashboard = state?.files?.["marketing.json"];
  if (!rawDashboard) {
    return apiError("No analysis found. Upload and analyze files first.", 400);
  }

  let dashboard: ReturnType<typeof marketingDashboardSchema.parse>;
  try {
    dashboard = marketingDashboardSchema.parse(JSON.parse(rawDashboard));
  } catch {
    return apiError("Marketing data is corrupted or invalid.", 422);
  }

  const history = body.history.map((m) => ({ role: m.role, content: m.content }));
  const messages = buildMarketingChatPrompt(dashboard, body.message, history);

  const routerRes = await requestRouterAIStream({
    messages,
    model: CHAT_MODEL,
    settings: { temperature: 0.3, max_completion_tokens: 2000 },
    user: user.id,
  });

  if (!routerRes.ok || !routerRes.body) {
    return apiError("AI service unavailable", 502);
  }

  const stream = new ReadableStream({
    async start(controller) {
      function sse(payload: unknown) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`));
      }

      let assembled = "";
      let carry = "";
      let chargedFromStream = false;
      const decoder = new TextDecoder();
      const reader = routerRes.body!.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          const result = splitSseLines(text, carry);
          carry = result.carry;
          for (const line of result.lines) {
            const data = extractDataJson(line);
            if (!data) continue;
            const d = data as Record<string, unknown>;
            const delta = (d?.choices as Array<{ delta?: { content?: unknown } }>)?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assembled += delta;
              sse({ type: "delta", text: delta });
            }
            const usage = d?.usage as { total_tokens?: number } | undefined;
            if (usage?.total_tokens) {
              chargedFromStream = true;
              await chargeTokensSafely({ userId: user.id, usage, projectId, model: CHAT_MODEL });
            }
          }
        }

        if (!chargedFromStream) {
          await chargeTokensSafely({
            userId: user.id,
            usage: estimateUsageFromText(body.message, assembled),
            projectId,
            model: CHAT_MODEL,
          });
        }

        sse({ type: "done" });
      } catch (err) {
        sse({ type: "error", message: err instanceof Error ? err.message : "Chat error" });
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

- [ ] **Step 4: Run to verify tests pass**

```bash
npx vitest run "app/api/marketing/\[id\]/chat/route.test.ts"
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/api/marketing/[id]/chat/"
git commit -m "feat: add marketing chat route (SSE streaming)"
```

---

### Task 7: PPTX export + export route

**Files:**
- Create: `lib/marketing-pptx-export.ts`
- Create: `app/api/marketing/[id]/export/route.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/marketing-pptx-export.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildMarketingPptx } from "./marketing-pptx-export";
import type { MarketingDashboard } from "./marketing-schema";

const testDashboard: MarketingDashboard = {
  meta: { companyName: "Acme Corp", period: "Q1 2024", dataSource: "Google Ads CSV", analyzedAt: "2024-01-01T00:00:00.000Z" },
  summary: {
    executive: "Strong paid channel performance this quarter.",
    topFindings: ["Google ROAS 4.1x", "Email CAC rising"],
    recommendations: ["Increase Google budget", "Pause low-ROAS email campaigns"],
  },
  channels: [
    {
      name: "Google Ads",
      spend: 12400,
      revenue: 50840,
      kpis: [
        { label: "ROAS", value: "4.1x", change: "+0.3x", trend: "up" },
        { label: "CAC", value: "$38", trend: "neutral" },
      ],
      trend: "up",
      narrative: "Top performer with consistent ROAS improvement.",
    },
    {
      name: "Meta Ads",
      spend: 18100,
      revenue: 50680,
      kpis: [{ label: "ROAS", value: "2.8x", trend: "neutral" }],
      trend: "neutral",
      narrative: "Stable performance, room for optimization.",
    },
  ],
  kpis: [
    { label: "Total Spend", value: "$30.5K", trend: "up" },
    { label: "Blended ROAS", value: "3.3x", trend: "up" },
  ],
  charts: [{ id: "c1", type: "bar", title: "Spend vs Revenue", data: [{ name: "Google", value: 12400 }] }],
  narrative: "Overall strong quarter with 3.3x blended ROAS.",
};

describe("buildMarketingPptx", () => {
  it("returns a Buffer", async () => {
    const buf = await buildMarketingPptx(testDashboard);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it("returns non-empty buffer (valid PPTX magic bytes)", async () => {
    const buf = await buildMarketingPptx(testDashboard);
    expect(buf.length).toBeGreaterThan(1000);
    // PPTX is a ZIP file — starts with PK\x03\x04
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run lib/marketing-pptx-export.test.ts
```

Expected: FAIL with "Cannot find module './marketing-pptx-export'"

- [ ] **Step 3: Implement `lib/marketing-pptx-export.ts`**

```typescript
import PptxGenJS from "pptxgenjs";
import type { MarketingDashboard, MarketingChannel } from "./marketing-schema";

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

function trendColor(trend: "up" | "down" | "neutral"): string {
  if (trend === "up") return THEME.green;
  if (trend === "down") return THEME.red;
  return THEME.text;
}

function findTopChannel(channels: MarketingChannel[]): MarketingChannel {
  const paid = channels.filter((c) => c.spend !== undefined && c.revenue !== undefined);
  if (paid.length === 0) return channels[0];
  return paid.reduce((best, c) => {
    const roas = (c.revenue ?? 0) / (c.spend ?? 1);
    const bestRoas = (best.revenue ?? 0) / (best.spend ?? 1);
    return roas > bestRoas ? c : best;
  }, paid[0]);
}

export async function buildMarketingPptx(report: MarketingDashboard): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  // Slide 1: Cover
  {
    const s = pptx.addSlide();
    s.background = { color: THEME.bg };
    s.addText("Marketing Performance Report", {
      x: 0.5, y: 1.5, w: "90%", h: 1.2,
      fontSize: 40, bold: true, color: THEME.accent, align: "center",
    });
    s.addText(report.meta.companyName, {
      x: 0.5, y: 2.9, w: "90%", h: 0.7,
      fontSize: 28, color: THEME.text, align: "center",
    });
    s.addText(report.meta.period, {
      x: 0.5, y: 3.7, w: "90%", h: 0.5,
      fontSize: 18, color: THEME.subtext, align: "center",
    });
    s.addText(`Data: ${report.meta.dataSource}`, {
      x: 0.5, y: 4.4, w: "90%", h: 0.4,
      fontSize: 12, color: THEME.muted, align: "center",
    });
  }

  // Slide 2: Executive Summary
  {
    const s = addSlide(pptx, "Executive Summary");
    s.addText(report.summary.executive, {
      x: 0.5, y: 1.0, w: "90%", h: 0.8,
      fontSize: 14, color: THEME.subtext, italic: true,
    });
    const findingRows = report.summary.topFindings.map((f) => [{ text: `• ${f}`, options: { color: THEME.text } }]);
    s.addTable(findingRows, {
      x: 0.5, y: 2.0, w: 9, colW: [9],
      fill: { color: THEME.dark },
      border: { type: "none" },
      fontSize: 13,
    });
  }

  // Slide 3: Key Metrics
  {
    const s = addSlide(pptx, "Key Metrics");
    if (report.kpis.length > 0) {
      const headerRow = [
        { text: "Metric", options: { bold: true, color: THEME.text } },
        { text: "Value", options: { bold: true, color: THEME.text } },
        { text: "Change", options: { bold: true, color: THEME.text } },
        { text: "Trend", options: { bold: true, color: THEME.text } },
      ];
      const dataRows = report.kpis.map((k) => [
        { text: k.label, options: { color: THEME.text } },
        { text: k.value, options: { bold: true, color: trendColor(k.trend) } },
        { text: k.change ?? "—", options: { color: THEME.subtext } },
        { text: k.trend === "up" ? "↑" : k.trend === "down" ? "↓" : "→", options: { color: trendColor(k.trend) } },
      ]);
      s.addTable([headerRow, ...dataRows], {
        x: 0.5, y: 1.0, w: 9, colW: [3.5, 2, 2, 1.5],
        fill: { color: THEME.dark },
        border: { pt: 1, color: THEME.muted },
        fontSize: 13,
      });
    }
  }

  // Slide 4: Channels Overview
  {
    const s = addSlide(pptx, "Channels Overview");
    const headerRow = [
      { text: "Channel", options: { bold: true, color: THEME.text } },
      { text: "Spend", options: { bold: true, color: THEME.text } },
      { text: "Revenue", options: { bold: true, color: THEME.text } },
      { text: "Top KPI", options: { bold: true, color: THEME.text } },
      { text: "Trend", options: { bold: true, color: THEME.text } },
    ];
    const dataRows = report.channels.map((ch) => {
      const topKpi = ch.kpis[0];
      return [
        { text: ch.name, options: { color: THEME.text } },
        { text: ch.spend !== undefined ? `$${ch.spend.toLocaleString("en-US")}` : "—", options: { color: THEME.subtext } },
        { text: ch.revenue !== undefined ? `$${ch.revenue.toLocaleString("en-US")}` : "—", options: { color: trendColor(ch.trend) } },
        { text: topKpi ? `${topKpi.label}: ${topKpi.value}` : "—", options: { color: THEME.text } },
        { text: ch.trend === "up" ? "↑ Growing" : ch.trend === "down" ? "↓ Declining" : "→ Stable", options: { color: trendColor(ch.trend) } },
      ];
    });
    s.addTable([headerRow, ...dataRows], {
      x: 0.5, y: 1.0, w: 9, colW: [2.2, 1.5, 1.5, 2.8, 1.5],
      fill: { color: THEME.dark },
      border: { pt: 1, color: THEME.muted },
      fontSize: 12,
    });
  }

  // Slide 5: Top Channel Deep Dive
  {
    const top = findTopChannel(report.channels);
    const s = addSlide(pptx, `Top Channel: ${top.name}`);
    s.addText(top.narrative, {
      x: 0.5, y: 1.0, w: "90%", h: 0.7,
      fontSize: 14, color: THEME.subtext, italic: true,
    });
    if (top.kpis.length > 0) {
      const headerRow = [
        { text: "KPI", options: { bold: true, color: THEME.text } },
        { text: "Value", options: { bold: true, color: THEME.text } },
        { text: "Change", options: { bold: true, color: THEME.text } },
      ];
      const kpiRows = top.kpis.map((k) => [
        { text: k.label, options: { color: THEME.text } },
        { text: k.value, options: { bold: true, color: trendColor(k.trend) } },
        { text: k.change ?? "—", options: { color: THEME.subtext } },
      ]);
      s.addTable([headerRow, ...kpiRows], {
        x: 0.5, y: 1.9, w: 6, colW: [2.5, 2, 1.5],
        fill: { color: THEME.dark },
        border: { pt: 1, color: THEME.muted },
        fontSize: 13,
      });
    }
  }

  // Slide 6: Channel Comparison
  {
    const s = addSlide(pptx, "Channel Comparison");
    const paid = report.channels.filter((c) => c.spend !== undefined && c.revenue !== undefined);
    if (paid.length > 0) {
      const headerRow = [
        { text: "Channel", options: { bold: true, color: THEME.text } },
        { text: "Spend", options: { bold: true, color: THEME.text } },
        { text: "Revenue", options: { bold: true, color: THEME.text } },
        { text: "ROAS", options: { bold: true, color: THEME.text } },
      ];
      const rows = paid.map((ch) => {
        const roas = ch.spend && ch.revenue ? (ch.revenue / ch.spend).toFixed(2) + "x" : "—";
        return [
          { text: ch.name, options: { color: THEME.text } },
          { text: `$${(ch.spend ?? 0).toLocaleString("en-US")}`, options: { color: THEME.subtext } },
          { text: `$${(ch.revenue ?? 0).toLocaleString("en-US")}`, options: { color: THEME.text } },
          { text: roas, options: { bold: true, color: THEME.accent } },
        ];
      });
      s.addTable([headerRow, ...rows], {
        x: 0.5, y: 1.0, w: 9, colW: [3, 2, 2, 2],
        fill: { color: THEME.dark },
        border: { pt: 1, color: THEME.muted },
        fontSize: 13,
      });
    } else {
      s.addText("No paid channel data available for comparison.", {
        x: 0.5, y: 2.0, w: "90%", h: 0.5,
        fontSize: 14, color: THEME.subtext,
      });
    }
  }

  // Slide 7: Recommendations
  {
    const s = addSlide(pptx, "Recommendations");
    const recRows = report.summary.recommendations.map((r) => [
      { text: `• ${r}`, options: { color: THEME.text } },
    ]);
    s.addTable(recRows, {
      x: 0.5, y: 1.0, w: 9, colW: [9],
      fill: { color: THEME.dark },
      border: { type: "none" },
      fontSize: 14,
    });
  }

  // Slide 8: Disclaimer
  {
    const s = addSlide(pptx, "Data Sources & Disclaimer");
    s.addText(`Data Sources: ${report.meta.dataSource}`, {
      x: 0.5, y: 1.0, w: "90%", h: 0.5,
      fontSize: 13, color: THEME.subtext,
    });
    s.addText(
      "This report was generated by AI analysis (Lemnity Analytics). All figures are derived from the uploaded data. AI-generated insights are for informational purposes only and should be validated against primary data sources before making business decisions.",
      {
        x: 0.5, y: 2.0, w: "90%", h: 1.5,
        fontSize: 12, color: THEME.muted, italic: true,
      }
    );
    s.addText(`Generated: ${new Date(report.meta.analyzedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, {
      x: 0.5, y: 4.0, w: "90%", h: 0.4,
      fontSize: 11, color: THEME.muted,
    });
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return output as Buffer;
}
```

- [ ] **Step 4: Run PPTX tests to verify they pass**

```bash
npx vitest run lib/marketing-pptx-export.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Implement `app/api/marketing/[id]/export/route.ts`**

```typescript
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiFile } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { marketingDashboardSchema } from "@/lib/marketing-schema";
import { buildMarketingPptx } from "@/lib/marketing-pptx-export";

const exportBodySchema = z.object({
  format: z.enum(["marketing-pptx"]),
});

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

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

  const state = await getSandboxProjectState(projectId);
  const rawDashboard = state?.files?.["marketing.json"];
  if (!rawDashboard) {
    return apiError("Generate analysis first before exporting.", 404);
  }

  let dashboard: ReturnType<typeof marketingDashboardSchema.parse>;
  try {
    dashboard = marketingDashboardSchema.parse(JSON.parse(rawDashboard));
  } catch {
    return apiError("Marketing data is corrupted.", 422);
  }

  const buffer = await buildMarketingPptx(dashboard);
  const filename = `${dashboard.meta.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_Marketing.pptx`;
  return apiFile(buffer, filename, PPTX_MIME);
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to new files

- [ ] **Step 7: Commit**

```bash
git add lib/marketing-pptx-export.ts lib/marketing-pptx-export.test.ts "app/api/marketing/[id]/export/"
git commit -m "feat: add marketing PPTX export (8 slides) and export route"
```

---

### Task 8: UI components

**Files:**
- Create: `components/playground/marketing/marketing-upload-panel.tsx`
- Create: `components/playground/marketing/marketing-channel-card.tsx`
- Create: `components/playground/marketing/marketing-chart-block.tsx`
- Create: `components/playground/marketing/marketing-dashboard.tsx`

- [ ] **Step 1: Create `components/playground/marketing/marketing-channel-card.tsx`**

```typescript
"use client";

import { cn } from "@/lib/utils";
import type { MarketingChannel } from "@/lib/marketing-schema";

interface Props {
  channel: MarketingChannel;
}

function trendBadge(trend: "up" | "down" | "neutral") {
  if (trend === "up") return { label: "↑ Growing", cls: "bg-green-500/10 text-green-400 border-green-500/30" };
  if (trend === "down") return { label: "↓ Declining", cls: "bg-red-500/10 text-red-400 border-red-500/30" };
  return { label: "→ Stable", cls: "bg-muted/50 text-muted-foreground border-border" };
}

function kpiValueColor(trend: "up" | "down" | "neutral") {
  if (trend === "up") return "text-green-400";
  if (trend === "down") return "text-red-400";
  return "text-foreground";
}

export function MarketingChannelCard({ channel }: Props) {
  const badge = trendBadge(channel.trend);

  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground truncate">{channel.name}</span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0", badge.cls)}>
          {badge.label}
        </span>
      </div>

      {(channel.spend !== undefined || channel.revenue !== undefined) && (
        <div className="flex gap-2 text-[11px]">
          {channel.spend !== undefined && (
            <div className="flex-1 bg-muted/30 rounded px-2 py-1">
              <div className="text-muted-foreground">Spend</div>
              <div className="font-medium">${channel.spend.toLocaleString("en-US")}</div>
            </div>
          )}
          {channel.revenue !== undefined && (
            <div className="flex-1 bg-muted/30 rounded px-2 py-1">
              <div className="text-muted-foreground">Revenue</div>
              <div className="font-medium text-green-400">${channel.revenue.toLocaleString("en-US")}</div>
            </div>
          )}
        </div>
      )}

      {channel.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {channel.kpis.map((kpi, i) => (
            <div key={i} className="bg-muted/20 rounded px-2 py-1 text-[10px]">
              <div className="text-muted-foreground">{kpi.label}</div>
              <div className={cn("font-semibold text-xs", kpiValueColor(kpi.trend))}>{kpi.value}</div>
              {kpi.change && <div className="text-muted-foreground">{kpi.change}</div>}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">{channel.narrative}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/playground/marketing/marketing-chart-block.tsx`**

```typescript
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { MarketingChart } from "@/lib/marketing-schema";

interface Props {
  chart: MarketingChart;
}

const COLORS = ["#4F8EF7", "#4ade80", "#f59e0b", "#f87171", "#a78bfa", "#34d399"];

export function MarketingChartBlock({ chart }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-3">{chart.title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chart.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: "#aaa" }}
            itemStyle={{ color: "#4F8EF7" }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {chart.data.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/playground/marketing/marketing-dashboard.tsx`**

```typescript
"use client";

import type { MarketingDashboard } from "@/lib/marketing-schema";
import { MarketingChannelCard } from "./marketing-channel-card";
import { MarketingChartBlock } from "./marketing-chart-block";
import { cn } from "@/lib/utils";

interface Props {
  dashboard: MarketingDashboard;
}

function trendColor(trend: "up" | "down" | "neutral") {
  if (trend === "up") return "text-green-400";
  if (trend === "down") return "text-red-400";
  return "text-foreground";
}

export function MarketingDashboard({ dashboard }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {dashboard.kpis.map((kpi, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground mb-1">{kpi.label}</p>
            <p className={cn("text-xl font-bold", trendColor(kpi.trend))}>{kpi.value}</p>
            {kpi.change && (
              <p className={cn("text-[10px] mt-0.5", trendColor(kpi.trend))}>{kpi.change}</p>
            )}
          </div>
        ))}
      </div>

      {/* Channels grid */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Channels</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {dashboard.channels.map((ch, i) => (
            <MarketingChannelCard key={i} channel={ch} />
          ))}
        </div>
      </div>

      {/* Charts */}
      {dashboard.charts.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {dashboard.charts.map((chart) => (
            <MarketingChartBlock key={chart.id} chart={chart} />
          ))}
        </div>
      )}

      {/* Narrative */}
      {dashboard.narrative && (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{dashboard.narrative}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `components/playground/marketing/marketing-upload-panel.tsx`**

```typescript
"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMarketingStore } from "@/lib/stores/use-marketing-store";

interface Props {
  projectId: string;
  onAnalyzed: (dashboard: import("@/lib/marketing-schema").MarketingDashboard) => void;
}

function FileTag({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/30 rounded px-2 py-1 text-[11px] text-muted-foreground">
      <span className="truncate max-w-[140px]">{name}</span>
      <button type="button" onClick={onRemove} className="shrink-0 hover:text-foreground">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function MarketingUploadPanel({ projectId, onAnalyzed }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { status, errorMessage, setStatus, setError, setDashboard } = useMarketingStore();

  const isLoading = status === "uploading" || status === "analyzing";

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const combined = [...prev, ...arr];
      return combined.slice(0, 5);
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleAnalyze() {
    if (files.length === 0 || isLoading) return;

    setStatus("uploading");
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));

      const uploadRes = await fetch(`/api/marketing/${projectId}/upload`, {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Upload failed");
        return;
      }

      setStatus("analyzing");
      const analyzeRes = await fetch(`/api/marketing/${projectId}/analyze`, { method: "POST" });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Analysis failed");
        return;
      }

      const data = await analyzeRes.json() as { data?: { report?: unknown } };
      const { marketingDashboardSchema } = await import("@/lib/marketing-schema");
      const parsed = marketingDashboardSchema.safeParse(data.data?.report);
      if (!parsed.success) {
        setError("Invalid response from server");
        return;
      }
      setDashboard(parsed.data);
      onAnalyzed(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Data Sources</p>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Drop CSV / XLSX / PDF</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Up to 5 files · 50 MB each</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          {files.map((f, i) => (
            <FileTag key={i} name={f.name} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}

      {status === "error" && errorMessage && (
        <p className="text-[11px] text-red-500">{errorMessage}</p>
      )}

      <Button
        size="sm"
        className="w-full gap-1.5"
        disabled={files.length === 0 || isLoading}
        onClick={() => void handleAnalyze()}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {status === "uploading" ? "Uploading…" : "Analyzing…"}
          </>
        ) : (
          "✦ Analyze"
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors in new component files

- [ ] **Step 6: Commit**

```bash
git add components/playground/marketing/
git commit -m "feat: add marketing UI components (dashboard, channel card, chart, upload panel)"
```

---

### Task 9: Chat panel + Marketing editor

**Files:**
- Create: `components/playground/marketing/marketing-chat-panel.tsx`
- Create: `components/playground/marketing/marketing-editor.tsx`

- [ ] **Step 1: Create `components/playground/marketing/marketing-chat-panel.tsx`**

Copy the analytics chat panel pattern, wired to the marketing store and `/api/marketing/[id]/chat`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMarketingStore } from "@/lib/stores/use-marketing-store";

interface Props { projectId: string }

export function MarketingChatPanel({ projectId }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chatMessages,
    isChatStreaming,
    addChatMessage,
    updateLastAssistantMessage,
    setIsChatStreaming,
  } = useMarketingStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || isChatStreaming) return;
    setInput("");

    addChatMessage({ id: crypto.randomUUID(), role: "user", content: message });
    const historySnapshot = [...chatMessages];
    setIsChatStreaming(true);

    try {
      const res = await fetch(`/api/marketing/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: historySnapshot }),
      });

      if (!res.body) { setIsChatStreaming(false); return; }

      addChatMessage({ id: crypto.randomUUID(), role: "assistant", content: "" });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";

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
            accumulated += payload.text;
            updateLastAssistantMessage(accumulated);
          }
        }
      }
    } finally {
      setIsChatStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        AI Chat
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">
            Ask about your channel performance
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
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
          }}
        />
        <Button size="icon" onClick={() => void sendMessage()} disabled={isChatStreaming || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/playground/marketing/marketing-editor.tsx`**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, MessageSquare, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMarketingStore } from "@/lib/stores/use-marketing-store";
import { MarketingUploadPanel } from "./marketing-upload-panel";
import { MarketingDashboard } from "./marketing-dashboard";
import { MarketingChatPanel } from "./marketing-chat-panel";
import type { MarketingDashboard as MarketingDashboardType } from "@/lib/marketing-schema";

type LeftTab = "upload" | "chat";

export function MarketingEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId") ?? "";
  const [leftTab, setLeftTab] = useState<LeftTab>("upload");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { status, dashboard, setProjectId, setDashboard, setStatus } = useMarketingStore();

  // Load existing analysis on mount
  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);
    fetch(`/api/marketing/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: { dashboard?: MarketingDashboardType } } | null) => {
        if (data?.data?.dashboard) {
          setDashboard(data.data.dashboard);
        }
      })
      .catch(() => {});
  }, [projectId, setProjectId, setDashboard]);

  const handleAnalyzed = useCallback((d: MarketingDashboardType) => {
    setLeftTab("chat");
  }, []);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/marketing/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "marketing-pptx" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setDownloadError(err.error ?? "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "marketing_report.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }, [projectId]);

  const isLoading = status === "uploading" || status === "analyzing";
  const hasDashboard = !!dashboard;

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
        {hasDashboard && (
          <div className="flex items-center gap-2">
            {downloadError && <span className="text-[11px] text-red-500">{downloadError}</span>}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              disabled={isDownloading}
              onClick={() => void handleDownload()}
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export PPTX
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {!hasDashboard && !isLoading ? (
          // Full-screen upload state
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <h1 className="text-2xl font-bold">Marketing Analytics</h1>
            <p className="text-muted-foreground text-sm max-w-sm text-center">
              Upload CSV, XLSX, or PDF files from Google Ads, Meta, Yandex, or any marketing platform for instant AI analysis.
            </p>
            <div className="w-full max-w-sm">
              <MarketingUploadPanel projectId={projectId} onAnalyzed={handleAnalyzed} />
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {status === "uploading" ? "Uploading files…" : "Analyzing marketing data…"}
            </p>
            <p className="text-xs text-muted-foreground/60">This may take 20–60 seconds.</p>
          </div>
        ) : (
          // Dashboard + left panel
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div className="w-60 shrink-0 flex flex-col border-r border-border overflow-hidden">
              {/* Tab bar */}
              <div className="flex shrink-0 border-b border-border">
                {(["upload", "chat"] as LeftTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLeftTab(tab)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                      leftTab === tab
                        ? "text-foreground border-b-2 border-primary -mb-px"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "upload" ? <Upload className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {tab === "upload" ? "Data" : "Chat"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {leftTab === "upload" ? (
                  <MarketingUploadPanel projectId={projectId} onAnalyzed={handleAnalyzed} />
                ) : (
                  <MarketingChatPanel projectId={projectId} />
                )}
              </div>
            </div>

            {/* Right: dashboard */}
            <div className="flex-1 overflow-hidden flex">
              {dashboard && <MarketingDashboard dashboard={dashboard} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/playground/marketing/marketing-chat-panel.tsx components/playground/marketing/marketing-editor.tsx
git commit -m "feat: add marketing-editor and marketing-chat-panel"
```

---

### Task 10: Page, layout, GET route, and project type registration

**Files:**
- Create: `app/(builder)/playground/marketing/layout.tsx`
- Create: `app/(builder)/playground/marketing/page.tsx`
- Create: `app/api/marketing/[id]/route.ts`
- Modify: `lib/lemnity-ai-prompt-spec.ts`
- Modify: `lib/playground-project-edit-url.ts`

- [ ] **Step 1: Create layout**

Create `app/(builder)/playground/marketing/layout.tsx`:

```typescript
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create page**

Create `app/(builder)/playground/marketing/page.tsx`:

```typescript
import { Suspense } from "react";
import { MarketingEditor } from "@/components/playground/marketing/marketing-editor";

export default function MarketingPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <MarketingEditor />
    </Suspense>
  );
}
```

- [ ] **Step 3: Create GET route (load existing analysis)**

Create `app/api/marketing/[id]/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { marketingDashboardSchema } from "@/lib/marketing-schema";

export async function GET(
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
  const rawDashboard = state?.files?.["marketing.json"];
  if (!rawDashboard) return apiOk({ dashboard: null });

  try {
    const dashboard = marketingDashboardSchema.parse(JSON.parse(rawDashboard));
    return apiOk({ dashboard });
  } catch {
    return apiOk({ dashboard: null });
  }
}
```

- [ ] **Step 4: Add `"marketing"` to PROJECT_KINDS in `lib/lemnity-ai-prompt-spec.ts`**

Read the file first. Find the `PROJECT_KINDS` array (currently ends with `"analytics"`), add `"marketing"` after it:

```typescript
export const PROJECT_KINDS = [
  "website",
  "presentation",
  "resume",
  "design",
  "visitcard",
  "lovable",
  "box_html",
  "analytics",
  /** Маркетинговая аналитика: CSV/XLSX/PDF → channels-first дашборд + PPTX. */
  "marketing"
] as const;
```

- [ ] **Step 5: Add marketing to `lib/playground-project-edit-url.ts`**

Add the new type and URL builder. After the existing `"analytics"` handling:

In `PreferredPlaygroundEditor` type — add `"marketing"`:
```typescript
export type PreferredPlaygroundEditor = "build" | "box" | "analytics" | "marketing";
```

In `parsePreferredPlaygroundEditor`:
```typescript
if (raw === "marketing") return "marketing";
```

In `normalizePreferredPlaygroundEditor`:
```typescript
if (raw === "marketing") return "marketing";
```

Add new builder function after `buildPlaygroundAnalyticsEditUrl`:
```typescript
/** Marketing analytics editor. */
export function buildPlaygroundMarketingEditUrl(projectId: string): string {
  return `/playground/marketing?projectId=${encodeURIComponent(projectId)}`;
}
```

In `buildPlaygroundEditUrlForStoredEditor`, add before the final `return`:
```typescript
if (editor === "marketing") {
  return buildPlaygroundMarketingEditUrl(opts.projectId);
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests pass (including the 178 existing + new marketing tests)

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean

- [ ] **Step 8: Commit**

```bash
git add \
  "app/(builder)/playground/marketing/" \
  "app/api/marketing/[id]/route.ts" \
  lib/lemnity-ai-prompt-spec.ts \
  lib/playground-project-edit-url.ts
git commit -m "feat: add marketing page/layout, GET route, and project type registration"
```

---

## Verification Checklist

After all tasks complete:

1. Navigate to `/playground/marketing?projectId=<id>` → full-screen upload state with drag-and-drop zone
2. Upload a Google Ads CSV (e.g. `Channel,Spend,Revenue\nGoogle Search,10000,41000\nMeta,8000,22400`) → spinner → dashboard with channel cards
3. Channel cards show ROAS / CAC / trend badge with correct color coding
4. Click "Chat" tab → type "Which channel has the best ROAS?" → streaming answer citing Google Ads numbers
5. Click "Export PPTX" → file downloads as `.pptx`, opens in PowerPoint/Keynote with 8 slides
6. Navigate back to `/` → project should link to `/playground/marketing?projectId=<id>` (if project type is `"marketing"`)
7. `npx tsc --noEmit` — clean
8. `npm test` — all tests pass
9. Admin panel shows token charge after analysis
