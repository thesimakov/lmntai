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

const originalNodeEnv = process.env.NODE_ENV;

describe("requireDbUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("uses offline demo session without prisma in development", async () => {
    process.env.NODE_ENV = "development";
    mocks.getSafeServerSession.mockResolvedValue({
      user: {
        id: "offline-demo-user",
        email: "demo@example.com",
        role: "USER",
        plan: "FREE",
        demoOffline: true
      }
    });

    const result = await requireDbUser();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.id).toBe("offline-demo-user");
      expect(result.data.user.email).toBe("demo@example.com");
      expect(result.data.user.tokenBalance).toBe(100_000);
    }
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
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
