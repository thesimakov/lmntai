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
    const body = await res.json() as { report: typeof validReport };
    expect(body.report.channels[0].name).toBe("Google Ads");
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
