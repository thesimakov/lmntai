import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const USER_VIRTUAL_STORAGE_LIMIT_BYTES = 1024n * 1024n * 1024n; // 1 GiB

function dayFolder(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function safeContentSizeBytes(content: unknown): number {
  try {
    const json = JSON.stringify(content ?? null);
    return Buffer.byteLength(json, "utf8");
  } catch {
    return 0;
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return (value ?? null) as Prisma.InputJsonValue;
}

export async function ensureUserVirtualWorkspace(userId: string) {
  await prisma.userVirtualWorkspace.upsert({
    where: { userId },
    create: {
      userId,
      limitBytes: USER_VIRTUAL_STORAGE_LIMIT_BYTES,
      usedBytes: 0n
    },
    update: {}
  });
}

/**
 * Логирует виртуальный файл в user-folder, если хватает квоты.
 * Формат пути: requests/YYYY-MM-DD/<timestamp>-<kind>.json
 */
export async function appendUserVirtualEntry(input: {
  userId: string;
  projectId?: string;
  kind: "request" | "data";
  content: unknown;
}) {
  const sizeBytes = safeContentSizeBytes(input.content);
  if (sizeBytes <= 0) {
    return { ok: false as const, reason: "empty" as const };
  }

  const now = Date.now();
  const virtualPath = `${input.kind}s/${dayFolder()}/${now}-${input.kind}.json`;

  const result = await prisma.$transaction(async (tx) => {
    const ws = await tx.userVirtualWorkspace.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        limitBytes: USER_VIRTUAL_STORAGE_LIMIT_BYTES,
        usedBytes: 0n
      },
      update: {},
      select: { limitBytes: true, usedBytes: true }
    });

    const nextUsed = ws.usedBytes + BigInt(sizeBytes);
    if (nextUsed > ws.limitBytes) {
      return { ok: false as const, reason: "quota_exceeded" as const };
    }

    await tx.userVirtualEntry.create({
      data: {
        workspaceUserId: input.userId,
        projectId: input.projectId ?? null,
        virtualPath,
        kind: input.kind,
        content: toJsonValue(input.content),
        sizeBytes
      }
    });

    await tx.userVirtualWorkspace.update({
      where: { userId: input.userId },
      data: {
        usedBytes: { increment: BigInt(sizeBytes) }
      }
    });

    return { ok: true as const, path: virtualPath, sizeBytes };
  });

  return result;
}

export async function getUserVirtualWorkspaceSummary(userId: string) {
  const ws = await prisma.userVirtualWorkspace.findUnique({
    where: { userId },
    select: {
      limitBytes: true,
      usedBytes: true,
      updatedAt: true,
      _count: { select: { entries: true } }
    }
  });
  if (!ws) {
    return {
      userId,
      limitBytes: USER_VIRTUAL_STORAGE_LIMIT_BYTES,
      usedBytes: 0n,
      entriesCount: 0,
      updatedAt: null as Date | null
    };
  }
  return {
    userId,
    limitBytes: ws.limitBytes,
    usedBytes: ws.usedBytes,
    entriesCount: ws._count.entries,
    updatedAt: ws.updatedAt
  };
}
