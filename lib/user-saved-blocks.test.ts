import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSavedBlock: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
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
    count: ReturnType<typeof vi.fn>;
  };
  project: { findFirst: ReturnType<typeof vi.fn> };
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
    mockPrisma.userSavedBlock.count.mockResolvedValue(0);
    const created = {
      id: "new-id", name: "Hero", blockType: "grapesjs",
      teamProjectId: null, createdAt: new Date(),
    };
    mockPrisma.userSavedBlock.create.mockResolvedValue(created);

    const input: CreateUserBlockInput = {
      userId: "user1", name: "Hero", blockType: "grapesjs",
      htmlContent: "<section>Hero</section>", cssContent: "",
    };
    const result = await createUserBlock(input);

    expect(result.id).toBe("new-id");
    expect(result.scope).toBe("personal");
  });

  it("throws when personal limit exceeded", async () => {
    mockPrisma.userSavedBlock.count.mockResolvedValue(200);

    await expect(
      createUserBlock({
        userId: "user1", name: "X", blockType: "grapesjs",
        htmlContent: "<p/>", cssContent: "",
      })
    ).rejects.toThrow("limit");
  });

  it("throws when team limit exceeded", async () => {
    mockPrisma.userSavedBlock.count.mockResolvedValue(500);

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
});

describe("renameUserBlock", () => {
  it("returns false when block not found", async () => {
    mockPrisma.userSavedBlock.findFirst.mockResolvedValue(null);
    const result = await renameUserBlock("no-id", "user1", "New Name");
    expect(result).toBe(false);
  });

  it("updates name and returns true", async () => {
    mockPrisma.userSavedBlock.findFirst.mockResolvedValue({ id: "b1" });
    mockPrisma.userSavedBlock.update.mockResolvedValue({});
    const result = await renameUserBlock("b1", "user1", "New Name");
    expect(result).toBe(true);
    expect(mockPrisma.userSavedBlock.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { name: "New Name" },
    });
  });
});

describe("deleteUserBlock", () => {
  it("returns false when block not found", async () => {
    mockPrisma.userSavedBlock.findFirst.mockResolvedValue(null);
    const result = await deleteUserBlock("no-id", "user1");
    expect(result).toBe(false);
  });

  it("deletes and returns true when found", async () => {
    mockPrisma.userSavedBlock.findFirst.mockResolvedValue({ id: "b1" });
    mockPrisma.userSavedBlock.delete.mockResolvedValue({});
    const result = await deleteUserBlock("b1", "user1");
    expect(result).toBe(true);
  });
});
