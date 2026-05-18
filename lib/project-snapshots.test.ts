import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем prisma до импорта модуля
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectSnapshot: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listSnapshotsMeta,
  createSnapshot,
  getSnapshotById,
  deleteSnapshot,
  type CreateSnapshotInput,
} from "@/lib/project-snapshots";

const mockPrisma = prisma as unknown as {
  projectSnapshot: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction: ReturnType<typeof vi.fn>;
};

describe("listSnapshotsMeta", () => {
  it("returns snapshots ordered by createdAt desc", async () => {
    const rows = [
      { id: "s2", versionNum: 2, promptText: "v2", createdAt: new Date("2026-01-02") },
      { id: "s1", versionNum: 1, promptText: "v1", createdAt: new Date("2026-01-01") },
    ];
    mockPrisma.projectSnapshot.findMany.mockResolvedValue(rows);

    const result = await listSnapshotsMeta("proj1");

    expect(mockPrisma.projectSnapshot.findMany).toHaveBeenCalledWith({
      where: { projectId: "proj1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, versionNum: true, promptText: true, createdAt: true },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("s2");
  });
});

describe("createSnapshot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates snapshot with next versionNum and returns meta", async () => {
    const created = {
      id: "new-id",
      versionNum: 1,
      promptText: "hello",
      createdAt: new Date("2026-01-01"),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        projectSnapshot: {
          count: vi.fn().mockResolvedValue(0),
          findMany: vi.fn().mockResolvedValue([]),
          delete: vi.fn(),
          create: vi.fn().mockResolvedValue(created),
          aggregate: vi.fn().mockResolvedValue({ _max: { versionNum: 0 } }),
        },
      };
      return fn(fakeTx);
    });

    const input: CreateSnapshotInput = {
      projectId: "proj1",
      promptText: "hello",
      sandboxHtml: "<html/>",
      sandboxCss: "",
      sandboxId: "sb1",
    };
    const result = await createSnapshot(input);

    expect(result.id).toBe("new-id");
    expect(result.versionNum).toBe(1);
  });

  it("evicts oldest snapshot when count >= 50", async () => {
    const oldSnapshots = Array.from({ length: 50 }, (_, i) => ({
      id: `snap-${i}`,
      versionNum: i + 1,
      promptText: "",
      createdAt: new Date(),
    }));
    const created = {
      id: "new-id",
      versionNum: 51,
      promptText: "new",
      createdAt: new Date(),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        projectSnapshot: {
          count: vi.fn().mockResolvedValue(50),
          findMany: vi.fn().mockResolvedValue(oldSnapshots),
          delete: vi.fn(),
          create: vi.fn().mockResolvedValue(created),
          aggregate: vi.fn().mockResolvedValue({ _max: { versionNum: 50 } }),
        },
      };
      return fn(fakeTx);
    });

    const result = await createSnapshot({
      projectId: "proj1",
      promptText: "new",
      sandboxHtml: "<html/>",
      sandboxCss: "",
    });

    expect(result.id).toBe("new-id");
  });
});

describe("getSnapshotById", () => {
  it("returns null when snapshot not found", async () => {
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue(null);
    const result = await getSnapshotById("proj1", "no-id");
    expect(result).toBeNull();
  });

  it("returns full snapshot when found", async () => {
    const snap = {
      id: "s1",
      versionNum: 1,
      promptText: "p",
      sandboxHtml: "<html/>",
      sandboxCss: "",
      sandboxId: null,
      createdAt: new Date(),
    };
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue(snap);
    const result = await getSnapshotById("proj1", "s1");
    expect(result?.sandboxHtml).toBe("<html/>");
  });
});

describe("deleteSnapshot", () => {
  it("returns false when snapshot not found", async () => {
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue(null);
    const result = await deleteSnapshot("proj1", "no-id");
    expect(result).toBe(false);
  });

  it("deletes and returns true when found", async () => {
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue({ id: "s1" });
    mockPrisma.projectSnapshot.delete.mockResolvedValue({});
    const result = await deleteSnapshot("proj1", "s1");
    expect(result).toBe(true);
  });
});
