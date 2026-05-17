import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guards", () => ({ requireAdminUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    errorLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { requireAdminUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const mockAuth = requireAdminUser as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/admin/errors?${sp.toString()}`);
}

const fakeItems = [
  {
    id: "err-1",
    source: "client",
    errorType: "TypeError",
    module: "build-editor",
    message: "Cannot read properties of null",
    stack: null,
    url: null,
    method: null,
    statusCode: null,
    userAgent: null,
    viewport: null,
    ip: null,
    userId: "user-1",
    user: { id: "user-1", email: "a@example.com", name: "Alice" },
    meta: null,
    resolved: false,
    resolvedAt: null,
    createdAt: new Date("2024-01-15T10:00:00Z"),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ ok: true, data: { user: { id: "admin-1", role: "ADMIN" } } });
  mockTransaction.mockResolvedValue([fakeItems, 1]);
});

describe("GET /api/admin/errors", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ ok: false, status: 401, message: "Unauthorized" });
    const req = makeRequest();
    const res = await GET(req as never);
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when authenticated as non-admin", async () => {
    mockAuth.mockResolvedValue({ ok: false, status: 403, message: "Forbidden" });
    const req = makeRequest();
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("returns paginated items and total for authenticated admin", async () => {
    const req = makeRequest({ page: "1", limit: "10" });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; total: number; page: number; limit: number };
    // Dates are serialised to ISO strings in JSON responses
    const expectedItems = fakeItems.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));
    expect(body.items).toEqual(expectedItems);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
  });

  it("applies resolved=false filter when resolved param is 'false'", async () => {
    mockTransaction.mockResolvedValue([[], 0]);
    const req = makeRequest({ resolved: "false" });
    await GET(req as never);

    // $transaction receives an array of promises — check the where clause via the findMany mock
    expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ resolved: false }) }),
    );
  });

  it("applies resolved=true filter when resolved param is 'true'", async () => {
    mockTransaction.mockResolvedValue([[], 0]);
    const req = makeRequest({ resolved: "true" });
    await GET(req as never);
    expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ resolved: true }) }),
    );
  });

  it("does not filter by resolved when param is absent", async () => {
    const req = makeRequest();
    await GET(req as never);
    expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ resolved: expect.anything() }) }),
    );
  });

  it("clamps limit to maximum 100", async () => {
    const req = makeRequest({ limit: "999" });
    await GET(req as never);
    expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it("uses page 1 minimum when page=0 is provided", async () => {
    const req = makeRequest({ page: "0" });
    await GET(req as never);
    expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 }),
    );
  });
});
