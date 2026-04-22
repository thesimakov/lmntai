import type { User } from "@prisma/client";

export type Plan = "FREE" | "PRO" | "BUSINESS";

import { prisma } from "@/lib/prisma";

export const PLAN_LIMITS: Record<Plan, number> = {
  FREE: 20_000,
  PRO: 300_000,
  BUSINESS: 2_000_000
};

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function ensureUser(email: string, name?: string | null) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: name ?? undefined,
      tokenBalance: PLAN_LIMITS.FREE,
      tokenLimit: PLAN_LIMITS.FREE
    }
  });
}

export function hasEnoughTokens(user: Pick<User, "tokenBalance">, minimum = 1000) {
  return user.tokenBalance >= minimum;
}

export function getPlanLimit(plan: Plan) {
  return PLAN_LIMITS[plan];
}

export async function applyPlan(userId: string, plan: Plan) {
  const limit = getPlanLimit(plan);
  return prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      tokenLimit: limit,
      tokenBalance: limit
    }
  });
}
