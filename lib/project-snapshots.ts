import { prisma } from "@/lib/prisma";

export type ProjectSnapshotMeta = {
  id: string;
  versionNum: number;
  promptText: string;
  createdAt: string; // ISO
};

export type ProjectSnapshotFull = ProjectSnapshotMeta & {
  sandboxHtml: string;
  sandboxCss: string;
  sandboxId: string | null;
};

export type CreateSnapshotInput = {
  projectId: string;
  promptText: string;
  sandboxHtml: string;
  sandboxCss: string;
  sandboxId?: string | null;
};

const MAX_SNAPSHOTS = 50;

export async function listSnapshotsMeta(projectId: string): Promise<ProjectSnapshotMeta[]> {
  const rows = await prisma.projectSnapshot.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, versionNum: true, promptText: true, createdAt: true },
  });
  return rows.map((r: { id: string; versionNum: number; promptText: string; createdAt: Date }) => ({
    id: r.id,
    versionNum: r.versionNum,
    promptText: r.promptText,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createSnapshot(input: CreateSnapshotInput): Promise<ProjectSnapshotMeta> {
  const { projectId, promptText, sandboxHtml, sandboxCss, sandboxId } = input;

  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.projectSnapshot.count({ where: { projectId } });

    if (count >= MAX_SNAPSHOTS) {
      const oldest = await tx.projectSnapshot.findMany({
        where: { projectId },
        orderBy: { versionNum: "asc" },
        take: count - MAX_SNAPSHOTS + 1,
        select: { id: true },
      });
      for (const snap of oldest) {
        await tx.projectSnapshot.delete({ where: { id: snap.id } });
      }
    }

    const agg = await tx.projectSnapshot.aggregate({
      where: { projectId },
      _max: { versionNum: true },
    });
    const nextVersion = (agg._max.versionNum ?? 0) + 1;

    return tx.projectSnapshot.create({
      data: { projectId, promptText, sandboxHtml, sandboxCss: sandboxCss ?? "", sandboxId, versionNum: nextVersion },
      select: { id: true, versionNum: true, promptText: true, createdAt: true },
    });
  });

  return {
    id: created.id,
    versionNum: created.versionNum,
    promptText: created.promptText,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function getSnapshotById(
  projectId: string,
  snapshotId: string,
): Promise<ProjectSnapshotFull | null> {
  const row = await prisma.projectSnapshot.findFirst({
    where: { id: snapshotId, projectId },
  });
  if (!row) return null;
  return {
    id: row.id,
    versionNum: row.versionNum,
    promptText: row.promptText,
    sandboxHtml: row.sandboxHtml,
    sandboxCss: row.sandboxCss,
    sandboxId: row.sandboxId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteSnapshot(projectId: string, snapshotId: string): Promise<boolean> {
  const row = await prisma.projectSnapshot.findFirst({
    where: { id: snapshotId, projectId },
    select: { id: true },
  });
  if (!row) return false;
  await prisma.projectSnapshot.delete({ where: { id: row.id } });
  return true;
}
