import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSavedBlock: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listUserBlocks,
  createUserBlock,
  getUserBlockById,
  renameUserBlock,
  deleteUserBlock,
  type UserSavedBlockMeta,
  type CreateUserBlockInput,
} from "@/lib/user-saved-blocks";

const mockPrisma = prisma as unknown as {
  userSavedBlock: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  project: { findFirst: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => vi.clearAllMocks());

describe("listUserBlocks", () => {
  it("returns personal blocks ordered by createdAt desc", async () => {
    const rows = [
      { id: "b2", name: "Block 2", blockType: "grapesjs", teamProjectId: null, createdAt: new Date("2026-01-02") },
      { id: "b1", name: "Block 1", blockType: "grapesjs", teamProjectId: null, createdAt: new Date("2026-01-01") },
    ];
    mockPrisma.userSavedBlock.findMany.mockResolvedValue(rows);

    const result = await listUserBlocks("user1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("b2");
    expect(result[0].scope).toBe("personal");
  });

  it("includes team blocks when projectId given", async () => {
    const rows = [
      { id: "t1", name: "Team Block", blockType: "zero", teamProjectId: "proj1", createdAt: new Date() },
    ];
    mockPrisma.userSavedBlock.findMany.mockResolvedValue(rows);

    const result = await listUserBlocks("user1", "proj1");

    expect(result[0].scope).toBe("team");
  });
});

describe("createUserBlock", () => {
  it("creates personal block and returns meta", async () => {
    const created = {
      id: "new-id", name: "Hero", blockType: "grapesjs",
      teamProjectId: null, createdAt: new Date(),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        userSavedBlock: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue(created),
        },
      };
      return fn(fakeTx);
    });

    const input: CreateUserBlockInput = {
      userId: "user1", name: "Hero", blockType: "grapesjs",
      htmlContent: "<section>Hero</section>", cssContent: "",
    };
    const result = await createUserBlock(input);

    expect(result.id).toBe("new-id");
    expect(result.scope).toBe("personal");
  });

  it("throws when personal limit exceeded", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        userSavedBlock: {
          count: vi.fn().mockResolvedValue(200),
          create: vi.fn(),
        },
      };
      return fn(fakeTx);
    });

    await expect(
      createUserBlock({
        userId: "user1", name: "X", blockType: "grapesjs",
        htmlContent: "<p/>", cssContent: "",
      })
    ).rejects.toThrow("limit");
  });

  it("throws when team limit exceeded", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        userSavedBlock: {
          count: vi.fn().mockResolvedValue(500),
          create: vi.fn(),
        },
      };
      return fn(fakeTx);
    });

    await expect(
      createUserBlock({
        userId: "user1", name: "X", blockType: "grapesjs",
        htmlContent: "<p/>", cssContent: "", teamProjectId: "proj1",
      })
    ).rejects.toThrow("limit");
  });
});

describe("getUserBlockById", () => {
  it("returns null when not found", async () => {
    mockPrisma.userSavedBlock.findFirst.mockResolvedValue(null);
    const result = await getUserBlockById("no-id", "user1");
    expect(result).toBeNull();
  });

  it("returns full block when found", async () => {
    const row = {
      id: "b1", name: "Hero", blockType: "grapesjs", teamProjectId: null,
      htmlContent: "<section/>", cssContent: ".a{}", createdAt: new Date(),
    };
    mockPrisma.userSavedBlock.findFirst.mockResolvedValue(row);
    const result = await getUserBlockById("b1", "user1");
    expect(result?.htmlContent).toBe("<section/>");
  });

  it("returns team block for team member (projectId given)", async () => {
    const row = {
      id: "t1", name: "Team Block", blockType: "zero", teamProjectId: "proj1",
      htmlContent: "<section/>", cssContent: "", createdAt: new Date(),
    };
    mockPrisma.userSavedBlock.findFirst.mockResolvedValue(row);
    const result = await getUserBlockById("t1", "other-user", "proj1");
    expect(result?.htmlContent).toBe("<section/>");
  });
});

describe("renameUserBlock", () => {
  it("returns false when block not found", async () => {
    mockPrisma.userSavedBlock.updateMany.mockResolvedValue({ count: 0 });
    const result = await renameUserBlock("no-id", "user1", "New Name");
    expect(result).toBe(false);
  });

  it("updates name and returns true", async () => {
    mockPrisma.userSavedBlock.updateMany.mockResolvedValue({ count: 1 });
    const result = await renameUserBlock("b1", "user1", "New Name");
    expect(result).toBe(true);
    expect(mockPrisma.userSavedBlock.updateMany).toHaveBeenCalledWith({
      where: { id: "b1", userId: "user1" },
      data: { name: "New Name" },
    });
  });
});

describe("deleteUserBlock", () => {
  it("returns false when block not found", async () => {
    mockPrisma.userSavedBlock.deleteMany.mockResolvedValue({ count: 0 });
    const result = await deleteUserBlock("no-id", "user1");
    expect(result).toBe(false);
  });

  it("deletes and returns true when found", async () => {
    mockPrisma.userSavedBlock.deleteMany.mockResolvedValue({ count: 1 });
    const result = await deleteUserBlock("b1", "user1");
    expect(result).toBe(true);
  });
});
