import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guards", () => ({ requireDbUser: vi.fn() }));
vi.mock("@/lib/project-context", () => ({ requireProjectScopeForOwner: vi.fn() }));
vi.mock("@/lib/sandbox-project-state-db", () => ({
  getSandboxProjectState: vi.fn(),
}));
vi.mock("@/lib/routerai-client", () => ({ requestRouterAIStream: vi.fn() }));
vi.mock("@/lib/token-billing", () => ({
  chargeTokensSafely: vi.fn(),
  estimateUsageFromText: vi.fn().mockReturnValue({ total_tokens: 100 }),
}));

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIStream } from "@/lib/routerai-client";
import { chargeTokensSafely } from "@/lib/token-billing";
import { POST } from "./route";

const mockAuth = requireDbUser as ReturnType<typeof vi.fn>;
const mockScope = requireProjectScopeForOwner as ReturnType<typeof vi.fn>;
const mockGetState = getSandboxProjectState as ReturnType<typeof vi.fn>;
const mockStream = requestRouterAIStream as ReturnType<typeof vi.fn>;
const mockCharge = chargeTokensSafely as ReturnType<typeof vi.fn>;

const validDashboard = {
  meta: {
    companyName: "Acme",
    period: "Q1 2024",
    dataSource: "CSV",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Good quarter.",
    topFindings: ["ROAS up"],
    recommendations: ["Increase budget"],
  },
  channels: [
    {
      name: "Google Ads",
      kpis: [{ label: "ROAS", value: "4x", trend: "up" as const }],
      trend: "up" as const,
      narrative: "Top channel.",
    },
  ],
  kpis: [{ label: "Total Spend", value: "$10K", trend: "neutral" as const }],
  charts: [
    {
      id: "c1",
      type: "bar" as const,
      title: "Spend by Channel",
      data: [{ name: "Google", value: 10000 }],
    },
  ],
  narrative: "Overall solid performance.",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/marketing/p1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Build a minimal ReadableStream that emits SSE delta chunks and closes. */
function makeStreamBody(chunks: string[]) {
  const lines = chunks.map(
    (text) =>
      `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
  );
  const encoder = new TextEncoder();
  let idx = 0;
  return new ReadableStream({
    pull(controller) {
      if (idx < lines.length) {
        controller.enqueue(encoder.encode(lines[idx++]));
      } else {
        controller.close();
      }
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ ok: true, data: { user: { id: "user-1" } } });
  mockScope.mockResolvedValue(undefined);
  mockGetState.mockResolvedValue({
    sandboxId: "",
    html: "",
    title: "",
    ownerId: "user-1",
    files: { "marketing.json": JSON.stringify(validDashboard) },
  });
  mockCharge.mockResolvedValue(undefined);
});

describe("POST /api/marketing/[id]/chat", () => {
  it("returns 400 when marketing.json is missing from state", async () => {
    mockGetState.mockResolvedValue({ files: {} });
    const req = makeRequest({ message: "What is the ROAS?" });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/No analysis found/);
  });

  it("returns 400 when message is missing from body", async () => {
    const req = makeRequest({ history: [] });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("returns 200 SSE stream with delta and done events for valid request", async () => {
    const streamBody = makeStreamBody(["Hello", " world"]);
    mockStream.mockResolvedValue({ ok: true, body: streamBody });

    const req = makeRequest({ message: "What is the ROAS?", history: [] });
    const res = await POST(req as never, makeParams("p1"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");

    const text = await res.text();
    const events = text
      .split("\n\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line.replace(/^data: /, "")));

    const deltaEvents = events.filter((e) => e.type === "delta");
    expect(deltaEvents.length).toBe(2);
    expect(deltaEvents[0]).toEqual({ type: "delta", text: "Hello" });
    expect(deltaEvents[1]).toEqual({ type: "delta", text: " world" });

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toEqual({ type: "done" });

    expect(mockCharge).toHaveBeenCalledOnce();
  });
});
