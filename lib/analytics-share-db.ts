import { prisma } from "@/lib/prisma";

export type AnalyticsRole = "viewer" | "investor" | "analyst";

export const ANALYTICS_ROLES: Record<AnalyticsRole, { label: string; description: string }> = {
  viewer: { label: "Viewer", description: "KPIs and charts" },
  investor: { label: "Investor", description: "KPIs, charts, investor deck" },
  analyst: { label: "Analyst", description: "Full access including forecast, agents, benchmarks" },
};

export function isAnalyticsRole(r: string): r is AnalyticsRole {
  return r === "viewer" || r === "investor" || r === "analyst";
}

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
