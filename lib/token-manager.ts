import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getMonthlyTokenAllowance,
  MIN_TOKENS_GENERATE_STREAM,
  MONTHLY_TOKEN_ALLOWANCE,
  normalizePlanId,
  type PlanId
} from "@/lib/plan-config";

export type Plan = PlanId;

export const PLAN_LIMITS: Record<Plan, number> = MONTHLY_TOKEN_ALLOWANCE;

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function ensureUser(email: string, name?: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const free = MONTHLY_TOKEN_ALLOWANCE.FREE;
  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: {
      email: normalizedEmail,
      name: name ?? undefined,
      tokenBalance: free,
      tokenLimit: free
    }
  });
}

export function hasEnoughTokens(
  user: Pick<User, "tokenBalance">,
  minimum = MIN_TOKENS_GENERATE_STREAM
) {
  return user.tokenBalance >= minimum;
}

export function getPlanLimit(plan: string) {
  return getMonthlyTokenAllowance(normalizePlanId(plan));
}

/** Принимает `FREE` | `PRO` | `TEAM` и устаревший `BUSINESS` (сохраняется как `TEAM`). */
export async function applyPlan(userId: string, plan: string) {
  const normalized = normalizePlanId(plan);
  const limit = getMonthlyTokenAllowance(normalized);
  return prisma.user.update({
    where: { id: userId },
    data: {
      plan: normalized,
      tokenLimit: limit,
      tokenBalance: limit
    }
  });
}
