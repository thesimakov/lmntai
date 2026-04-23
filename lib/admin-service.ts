import { applyPlan } from "@/lib/token-manager";
import { prisma } from "@/lib/prisma";

export async function listAdminUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      isPartner: true,
      partnerApprovedAt: true,
      tokenBalance: true,
      tokenLimit: true
    }
  });
}

export async function getTokenSpendLast30Days() {
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  return prisma.tokenUsageLog.aggregate({
    where: { createdAt: { gte: last30 } },
    _sum: { totalTokens: true }
  });
}

export async function addTokensToUser(userId: string, amount: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { tokenBalance: { increment: amount } }
  });
}

export async function setUserPlan(userId: string, plan: string) {
  return applyPlan(userId, plan);
}

export async function setUserPartnerStatus(userId: string, isPartner: boolean, reviewerId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isPartner,
      partnerApprovedAt: isPartner ? new Date() : null,
      partnerApprovedById: isPartner ? reviewerId : null
    }
  });
}
