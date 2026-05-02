import { prisma } from "@/lib/prisma";

async function resolveSandboxShareProjectIds(
  sandboxId: string,
  ownerId: string
): Promise<{ fkProjectId: string; storageKey: string }> {
  if (!sandboxId.startsWith("artifact_")) {
    return { fkProjectId: sandboxId, storageKey: sandboxId };
  }
  const link = await prisma.manusSessionLink.findFirst({
    where: { userId: ownerId, previewArtifactId: sandboxId },
    select: { projectId: true }
  });
  if (!link) {
    throw new Error("FORBIDDEN");
  }
  return { fkProjectId: link.projectId, storageKey: sandboxId };
}

function sandboxShareWhereByStorageOrProjectKey(key: string) {
  return { OR: [{ projectId: key }, { sandboxId: key }] };
}

export async function getSandboxShareState(
  projectId: string
): Promise<{ isPublic: boolean; hideLemnityHeader: boolean }> {
  const row = await prisma.sandboxShare.findFirst({
    where: sandboxShareWhereByStorageOrProjectKey(projectId),
    select: { isPublic: true, hideLemnityHeader: true }
  });
  return {
    isPublic: row?.isPublic ?? false,
    hideLemnityHeader: row?.hideLemnityHeader ?? false
  };
}

/**
 * Состояние для сессии владельца: эффективный hide (Pro/Team без строки = скрыт по умолчанию) + готовый флаг для футера превью.
 */
export async function getOwnerShareStateForBuilder(
  projectId: string,
  owner: { id: string; plan: string; shareBrandingRemovalPaidAt: Date | null }
): Promise<{
  isPublic: boolean;
  hideLemnityHeader: boolean;
  showLemnityBranding: boolean;
}> {
  const row = await prisma.sandboxShare.findFirst({
    where: sandboxShareWhereByStorageOrProjectKey(projectId),
    select: { isPublic: true, hideLemnityHeader: true }
  });
  const pro = isProOrTeamPlan(owner.plan);
  const rawHide = row?.hideLemnityHeader;
  const effectiveHide = rawHide ?? (pro ? true : false);
  return {
    isPublic: row?.isPublic ?? false,
    hideLemnityHeader: effectiveHide,
    showLemnityBranding: computeShowLemnityBranding({
      plan: owner.plan,
      hideLemnityHeader: effectiveHide,
      shareBrandingRemovalPaid: owner.shareBrandingRemovalPaidAt != null
    })
  };
}

export async function isSandboxLinkPublic(projectId: string): Promise<boolean> {
  const row = await prisma.sandboxShare.findFirst({
    where: sandboxShareWhereByStorageOrProjectKey(projectId),
    select: { isPublic: true }
  });
  return row?.isPublic === true;
}

function isProOrTeamPlan(plan: string): boolean {
  const p = plan.toUpperCase();
  return p === "PRO" || p === "TEAM" || p === "BUSINESS";
}

/**
 * Видна ли подпись «Сделано на Lemnity» (превью в студии, /share, экспорт):
 * - Стандарт (FREE) и купившие снятие: по умолчанию включена; снятие — разовая оплата + hide.
 * - Pro/Team: по умолчанию выкл. (`hideLemnityHeader` true), можно включить в настройках.
 */
export function computeShowLemnityBranding(input: {
  plan: string;
  hideLemnityHeader: boolean;
  shareBrandingRemovalPaid: boolean;
}): boolean {
  if (isProOrTeamPlan(input.plan)) {
    return !input.hideLemnityHeader;
  }
  if (input.shareBrandingRemovalPaid && input.hideLemnityHeader) {
    return false;
  }
  return true;
}

/** Публичный /share — только если есть строка share (иначе страница не открывается). */
export async function getSandboxShareHeaderBranding(projectId: string): Promise<{ showLemnityBranding: boolean }> {
  const row = await prisma.sandboxShare.findFirst({
    where: sandboxShareWhereByStorageOrProjectKey(projectId),
    select: { ownerId: true, hideLemnityHeader: true }
  });
  if (!row) {
    return { showLemnityBranding: true };
  }
  const user = await prisma.user.findUnique({
    where: { id: row.ownerId },
    select: { plan: true, shareBrandingRemovalPaidAt: true }
  });
  return {
    showLemnityBranding: computeShowLemnityBranding({
      plan: user?.plan ?? "FREE",
      hideLemnityHeader: row.hideLemnityHeader,
      shareBrandingRemovalPaid: user?.shareBrandingRemovalPaidAt != null
    })
  };
}

/**
 * Владелец включает или выключает публичную ссылку /share/:sandboxId
 */
export async function setSandboxSharePublic(sandboxId: string, ownerId: string, isPublic: boolean): Promise<void> {
  const { fkProjectId, storageKey } = await resolveSandboxShareProjectIds(sandboxId, ownerId);
  const existing = await prisma.sandboxShare.findFirst({
    where: {
      OR: [{ projectId: fkProjectId }, { sandboxId: storageKey }]
    },
    select: { ownerId: true }
  });
  if (existing && existing.ownerId !== ownerId) {
    throw new Error("FORBIDDEN");
  }
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { plan: true }
  });
  const pro = isProOrTeamPlan(owner?.plan ?? "FREE");
  await prisma.sandboxShare.upsert({
    where: { projectId: fkProjectId },
    create: {
      projectId: fkProjectId,
      sandboxId: storageKey,
      ownerId,
      isPublic,
      hideLemnityHeader: pro ? true : false
    },
    update: { isPublic, sandboxId: storageKey }
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
  const { fkProjectId, storageKey } = await resolveSandboxShareProjectIds(sandboxId, ownerId);
  const existing = await prisma.sandboxShare.findFirst({
    where: {
      OR: [{ projectId: fkProjectId }, { sandboxId: storageKey }]
    },
    select: { ownerId: true }
  });
  if (existing && existing.ownerId !== ownerId) {
    throw new Error("FORBIDDEN");
  }
  await prisma.sandboxShare.upsert({
    where: { projectId: fkProjectId },
    create: {
      projectId: fkProjectId,
      sandboxId: storageKey,
      ownerId,
      isPublic: false,
      hideLemnityHeader: hide
    },
    update: { hideLemnityHeader: hide, sandboxId: storageKey }
  });
}
