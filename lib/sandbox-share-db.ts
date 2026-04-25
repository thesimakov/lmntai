import { prisma } from "@/lib/prisma";

export async function getSandboxShareState(
  sandboxId: string
): Promise<{ isPublic: boolean; hideLemnityHeader: boolean }> {
  const row = await prisma.sandboxShare.findUnique({
    where: { sandboxId },
    select: { isPublic: true, hideLemnityHeader: true }
  });
  return {
    isPublic: row?.isPublic ?? false,
    hideLemnityHeader: row?.hideLemnityHeader ?? false
  };
}

export async function isSandboxLinkPublic(sandboxId: string): Promise<boolean> {
  const row = await prisma.sandboxShare.findUnique({
    where: { sandboxId },
    select: { isPublic: true }
  });
  return row?.isPublic === true;
}

function isProOrTeamPlan(plan: string): boolean {
  const p = plan.toUpperCase();
  return p === "PRO" || p === "TEAM" || p === "BUSINESS";
}

/** Ссылка на Lemnity в футере /share: скрыта для Pro/Team или после оплаты + включённого переключателя. */
export async function getSandboxShareHeaderBranding(sandboxId: string): Promise<{ showLemnityBranding: boolean }> {
  const row = await prisma.sandboxShare.findUnique({
    where: { sandboxId },
    select: { ownerId: true, hideLemnityHeader: true }
  });
  if (!row) {
    return { showLemnityBranding: true };
  }
  const user = await prisma.user.findUnique({
    where: { id: row.ownerId },
    select: { plan: true, shareBrandingRemovalPaidAt: true }
  });
  const plan = user?.plan ?? "FREE";
  if (isProOrTeamPlan(plan)) {
    return { showLemnityBranding: false };
  }
  const paidRemoval = user?.shareBrandingRemovalPaidAt != null;
  if (paidRemoval && row.hideLemnityHeader) {
    return { showLemnityBranding: false };
  }
  return { showLemnityBranding: true };
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

export async function assertCanHideShareBranding(userId: string, hide: boolean): Promise<boolean> {
  if (!hide) return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, shareBrandingRemovalPaidAt: true }
  });
  const plan = user?.plan ?? "FREE";
  if (isProOrTeamPlan(plan)) return true;
  return user?.shareBrandingRemovalPaidAt != null;
}

export async function setSandboxShareHideHeader(sandboxId: string, ownerId: string, hide: boolean): Promise<void> {
  const existing = await prisma.sandboxShare.findUnique({
    where: { sandboxId },
    select: { ownerId: true }
  });
  if (existing && existing.ownerId !== ownerId) {
    throw new Error("FORBIDDEN");
  }
  await prisma.sandboxShare.upsert({
    where: { sandboxId },
    create: { sandboxId, ownerId, isPublic: false, hideLemnityHeader: hide },
    update: { hideLemnityHeader: hide }
  });
}
