import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizePlanId } from "@/lib/plan-config";

/** Начало календарного дня локального времени сервера (совпадает с агрегатами в `/api/profile`). */
export function startOfLocalCalendarDay(reference = new Date()): Date {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const STARTER_TRIAL_DAYS = 7;
export const STARTER_TRIAL_MS = STARTER_TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const STARTER_TOKENS_PER_DAY_TRIAL = 10;
export const STARTER_TOKENS_PER_DAY_PAID = 50;

/** Вебхук биллинга: продление доступа по подписке «Старт». */
export const STARTER_MONTHLY_SUBSCRIPTION_PLAN_ID = "STARTER";

/** Сообщение при блокировке кабинета (тариф FREE, триал истёк, подписка не оплачена). */
export const STARTER_EXPIRED_LOCK_MESSAGE =
  "У вас закончились дни, приобретите подписку.";

export type StarterCabinetGateUser = Pick<User, "plan" | "role" | "createdAt" | "starterPaidUntil">;

export function getStarterTrialEndsAt(user: Pick<User, "createdAt">): Date {
  return new Date(user.createdAt.getTime() + STARTER_TRIAL_MS);
}

export function starterPaidSubscriptionActive(
  starterPaidUntil: Date | null,
  reference = new Date()
): boolean {
  return starterPaidUntil != null && reference.getTime() < starterPaidUntil.getTime();
}

export function starterTrialActive(
  user: Pick<User, "createdAt">,
  reference = new Date()
): boolean {
  return reference.getTime() < getStarterTrialEndsAt(user).getTime();
}

/**
 * На тарифе FREE кабинет заблокирован, если истёк 7-дневный пробный период
 * и нет активной оплаченной подписки «Старт».
 */
export function isStarterCabinetBlocked(user: StarterCabinetGateUser, reference = new Date()): boolean {
  if (user.role === "ADMIN") return false;
  if (normalizePlanId(user.plan) !== "FREE") return false;
  if (starterPaidSubscriptionActive(user.starterPaidUntil, reference)) return false;
  if (starterTrialActive(user, reference)) return false;
  return true;
}

export function starterDailyTokenCap(user: StarterCabinetGateUser, reference = new Date()): number {
  if (normalizePlanId(user.plan) !== "FREE") return Number.POSITIVE_INFINITY;
  if (user.role === "ADMIN") return Number.POSITIVE_INFINITY;
  if (starterPaidSubscriptionActive(user.starterPaidUntil, reference)) return STARTER_TOKENS_PER_DAY_PAID;
  if (starterTrialActive(user, reference)) return STARTER_TOKENS_PER_DAY_TRIAL;
  return 0;
}

export async function aggregateTokensUsedSince(userId: string, since: Date): Promise<number> {
  const row = await prisma.tokenUsageLog.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { totalTokens: true }
  });
  return row._sum.totalTokens ?? 0;
}

/**
 * Выравнивает `tokenBalance` / `tokenLimit` для тарифа FREE по остатку на сегодня.
 */
export async function syncStarterDailyTokenBudget(
  user: Pick<User, "id" | "plan" | "role" | "createdAt" | "starterPaidUntil">
): Promise<void> {
  if (normalizePlanId(user.plan) !== "FREE" || user.role === "ADMIN") return;
  if (isStarterCabinetBlocked(user)) return;

  const cap = starterDailyTokenCap(user);
  const start = startOfLocalCalendarDay();
  const used = await aggregateTokensUsedSince(user.id, start);
  const remaining = Math.max(0, cap - used);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tokenBalance: remaining,
      tokenLimit: cap
    }
  });
}
