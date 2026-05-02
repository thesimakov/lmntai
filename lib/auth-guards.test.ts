import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeServerSession: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  getSafeServerSession: mocks.getSafeServerSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      create: mocks.create
    }
  }
}));

import { requireDbUser } from "@/lib/auth-guards";

describe("requireDbUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses database user for offline demo session in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.getSafeServerSession.mockResolvedValue({
      user: {
        id: "offline-demo-user",
        email: "demo@example.com",
        role: "USER",
        plan: "FREE",
        demoOffline: true
      }
    });
    mocks.findUnique.mockResolvedValue({
      id: "db-user-1",
      email: "demo@example.com",
      role: "USER",
      plan: "FREE",
      tokenBalance: 100_000,
      tokenLimit: 500_000,
      adminPermissions: null
    });

    const result = await requireDbUser();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.id).toBe("db-user-1");
      expect(result.data.user.email).toBe("demo@example.com");
      expect(result.data.user.tokenBalance).toBe(100_000);
    }
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates database user for offline demo when missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.getSafeServerSession.mockResolvedValue({
      user: {
        id: "offline-demo-user",
        email: "new-demo@example.com",
        role: "USER",
        plan: "FREE",
        demoOffline: true
      }
    });
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.create.mockResolvedValue({
      id: "db-user-2",
      email: "new-demo@example.com",
      role: "USER",
      plan: "FREE",
      tokenBalance: 100_000,
      tokenLimit: 500_000,
      adminPermissions: null
    });

    const result = await requireDbUser();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.id).toBe("db-user-2");
      expect(result.data.user.email).toBe("new-demo@example.com");
    }
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("returns 503 for non-demo session when prisma fails", async () => {
    mocks.getSafeServerSession.mockResolvedValue({
      user: {
        id: "user-id",
        email: "user@example.com",
        role: "USER",
        plan: "FREE",
        demoOffline: false
      }
    });
    mocks.findUnique.mockRejectedValue(new Error("db denied"));

    const result = await requireDbUser();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.message).toContain("База данных недоступна");
    }
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });
});
