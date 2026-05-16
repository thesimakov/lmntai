import { prisma } from "@/lib/prisma";
import {
  ANALYTICS_ROLES,
  isAnalyticsRole,
  type AnalyticsRole,
} from "@/lib/analytics-share-contract";

export { ANALYTICS_ROLES, isAnalyticsRole, type AnalyticsRole };

export async function createAnalyticsShare(
  projectId: string,
  ownerId: string,
  role: AnalyticsRole,
  label?: string,
  expiresAt?: Date
) {
  return prisma.analyticsShare.create({
    data: { projectId, ownerId, role, label, expiresAt },
  });
}

export async function getAnalyticsShareByToken(token: string) {
  return prisma.analyticsShare.findUnique({ where: { token } });
}

export async function listAnalyticsShares(projectId: string, ownerId: string) {
  return prisma.analyticsShare.findMany({
    where: { projectId, ownerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAnalyticsShare(id: string, ownerId: string) {
  return prisma.analyticsShare.deleteMany({ where: { id, ownerId } });
}

export function isShareExpired(share: { expiresAt: Date | null }): boolean {
  return share.expiresAt !== null && share.expiresAt < new Date();
}
