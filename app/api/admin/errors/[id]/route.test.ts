import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guards", () => ({ requireAdminUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    errorLog: {
      update: vi.fn(),
    },
  },
}));

import { requireAdminUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { PATCH } from "./route";

const mockAuth = requireAdminUser as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.errorLog.update as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/errors/err-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeCtx(id = "err-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ ok: true, data: { user: { id: "admin-1", role: "ADMIN" } } });
  mockUpdate.mockResolvedValue({ id: "err-1", resolved: true, resolvedAt: new Date() });
});

describe("PATCH /api/admin/errors/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ ok: false, status: 401, message: "Unauthorized" });
    const res = await PATCH(makeRequest({ resolved: true }) as never, makeCtx());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when record does not exist (P2025)", async () => {
    mockUpdate.mockRejectedValue({ code: "P2025" });
    const res = await PATCH(makeRequest({ resolved: true }) as never, makeCtx("nonexistent"));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Not found");
  });

  it("returns 400 when body is empty object", async () => {
    const res = await PATCH(makeRequest({}) as never, makeCtx());
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/resolved/i);
  });

  it("returns 400 when resolved is a string instead of boolean", async () => {
    const res = await PATCH(makeRequest({ resolved: "yes" }) as never, makeCtx());
    expect(res.status).toBe(400);
  });

  it("resolves the error record and sets resolvedAt", async () => {
    const before = Date.now();
    const res = await PATCH(makeRequest({ resolved: true }) as never, makeCtx("err-1"));
    const after = Date.now();

    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);

    expect(mockUpdate).toHaveBeenCalledOnce();
    const callArgs = mockUpdate.mock.calls[0][0] as {
      where: { id: string };
      data: { resolved: boolean; resolvedAt: Date | null };
    };
    expect(callArgs.where.id).toBe("err-1");
    expect(callArgs.data.resolved).toBe(true);
    expect(callArgs.data.resolvedAt).toBeInstanceOf(Date);
    const ts = (callArgs.data.resolvedAt as Date).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("unresolves the error record and sets resolvedAt to null", async () => {
    const res = await PATCH(makeRequest({ resolved: false }) as never, makeCtx("err-1"));
    expect(res.status).toBe(200);

    const callArgs = mockUpdate.mock.calls[0][0] as {
      data: { resolved: boolean; resolvedAt: null };
    };
    expect(callArgs.data.resolved).toBe(false);
    expect(callArgs.data.resolvedAt).toBeNull();
  });
});
