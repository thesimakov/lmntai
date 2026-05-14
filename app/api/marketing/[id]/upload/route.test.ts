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
