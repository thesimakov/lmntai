import { prisma } from "@/lib/prisma";

export async function getSandboxShareState(sandboxId: string): Promise<{ isPublic: boolean }> {
  const row = await prisma.sandboxShare.findUnique({
    where: { sandboxId },
    select: { isPublic: true }
  });
  return { isPublic: row?.isPublic ?? false };
}

export async function isSandboxLinkPublic(sandboxId: string): Promise<boolean> {
  const row = await prisma.sandboxShare.findUnique({
    where: { sandboxId },
    select: { isPublic: true }
  });
  return row?.isPublic === true;
}

/**
 * Владелец включает или выключает публичную ссылку /share/:sandboxId
 */
export async function setSandboxSharePublic(sandboxId: string, ownerId: string, isPublic: boolean): Promise<void> {
  const existing = await prisma.sandboxShare.findUnique({
    where: { sandboxId },
    select: { ownerId: true }
  });
  if (existing && existing.ownerId !== ownerId) {
    throw new Error("FORBIDDEN");
  }
  await prisma.sandboxShare.upsert({
    where: { sandboxId },
    create: { sandboxId, ownerId, isPublic },
    update: { isPublic }
  });
}
