import { hashPassword } from "@/lib/password-crypto";
import { applyPlan, registerUserWithPassword } from "@/lib/token-manager";
import { normalizePlanId } from "@/lib/plan-config";
import { isStaffPermission, type StaffPermission } from "@/lib/staff-permissions";
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
      tokenLimit: true,
      adminPermissions: true,
      virtualWorkspace: {
        select: {
          usedBytes: true,
          limitBytes: true
        }
      }
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

export async function deleteUserById(userId: string) {
  return prisma.user.delete({ where: { id: userId } });
}

export type AdminCreateUserInput = {
  email: string;
  password: string;
  name: string;
  plan: string;
  role: "USER" | "ADMIN";
  tokenBalance: number;
};

export async function adminCreateUser(input: AdminCreateUserInput) {
  const email = input.email.trim().toLowerCase();
  const created = await registerUserWithPassword(
    email,
    input.password,
    input.name || email.split("@")[0] || "User"
  );
  if ("kind" in created) {
    return { ok: false as const, error: "duplicate" };
  }
  const plan = normalizePlanId(input.plan);
  await applyPlan(created.id, plan);
  return prisma.user.update({
    where: { id: created.id },
    data: {
      role: input.role,
      tokenBalance: input.tokenBalance,
      tokenLimit: input.tokenBalance
    },
    select: { id: true, email: true, role: true, plan: true, tokenBalance: true }
  });
}

export type CreateManagerInput = {
  email: string;
  password: string;
  name: string;
  permissions: StaffPermission[];
  createdById: string;
};

export async function createManagerUser(
  input: CreateManagerInput
): Promise<{ ok: false; error: "duplicate" } | { id: string; email: string; role: string }> {
  const perms = input.permissions.filter((p) => isStaffPermission(p));
  const email = input.email.trim().toLowerCase();
  const created = await registerUserWithPassword(
    email,
    input.password,
    input.name || email.split("@")[0] || "Manager"
  );
  if ("kind" in created) {
    return { ok: false, error: "duplicate" as const };
  }
  const u = await prisma.user.update({
    where: { id: created.id },
    data: {
      role: "MANAGER",
      adminPermissions: perms,
      createdByAdminId: input.createdById,
      tokenBalance: 50_000,
      tokenLimit: 50_000
    },
    select: { id: true, email: true, role: true }
  });
  return u;
}

export async function listManagerUsers() {
  return prisma.user.findMany({
    where: { role: "MANAGER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      adminPermissions: true,
      createdByAdminId: true,
      createdAt: true
    }
  });
}

export async function setUserPassword(userId: string, plainPassword: string) {
  const passwordHash = await hashPassword(plainPassword);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
}
