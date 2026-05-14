import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guards", () => ({ requireDbUser: vi.fn() }));
vi.mock("@/lib/project-context", () => ({ requireProjectScopeForOwner: vi.fn() }));
vi.mock("@/lib/sandbox-project-state-db", () => ({
  getSandboxProjectState: vi.fn(),
}));
vi.mock("@/lib/marketing-pptx-export", () => ({
  buildMarketingPptx: vi.fn(),
}));

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { buildMarketingPptx } from "@/lib/marketing-pptx-export";
import { POST } from "./route";

const mockAuth = requireDbUser as ReturnType<typeof vi.fn>;
const mockScope = requireProjectScopeForOwner as ReturnType<typeof vi.fn>;
const mockGetState = getSandboxProjectState as ReturnType<typeof vi.fn>;
const mockBuildPptx = buildMarketingPptx as ReturnType<typeof vi.fn>;

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const validDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    dataSource: "CSV upload",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong quarter with growth across all channels.",
    topFindings: ["ROAS improved by 20%"],
    recommendations: ["Increase Google Ads budget"],
  },
  channels: [
    {
      name: "Google Ads",
      spend: 10000,
      revenue: 40000,
      kpis: [{ label: "ROAS", value: "4x", trend: "up" as const }],
      trend: "up" as const,
      narrative: "Best performing channel.",
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
  narrative: "Overall solid performance across all channels.",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/marketing/p1/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
  mockBuildPptx.mockResolvedValue(Buffer.from("fake-pptx-content"));
});

describe("POST /api/marketing/[id]/export", () => {
  it("returns 404 when marketing.json is missing from state", async () => {
    mockGetState.mockResolvedValue({ files: {} });
    const req = makeRequest({ format: "marketing-pptx" });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/No analysis found/);
  });

  it("returns 200 with PPTX content-type for valid request", async () => {
    const req = makeRequest({ format: "marketing-pptx" });
    const res = await POST(req as never, makeParams("p1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(PPTX_MIME);
    expect(mockBuildPptx).toHaveBeenCalledOnce();
  });
});
