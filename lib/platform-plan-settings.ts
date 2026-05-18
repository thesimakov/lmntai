import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  MIN_TOKENS_GENERATE_STREAM,
  MIN_TOKENS_PROMPT_BUILDER,
  MONTHLY_TOKEN_ALLOWANCE,
  TEAM_SEAT_LIMIT,
  normalizePlanId,
  type PlanId,
} from "@/lib/plan-config";
import {
  getDefaultPlatformPlanData,
  mergePlanRow,
  parsePlatformPlanData,
  type PlatformPlanDataV1,
} from "@/lib/platform-plan-catalog";

export type { PlanRow, PlatformPlanDataV1 } from "@/lib/platform-plan-catalog";
export { PLATFORM_FEATURE_CATALOG, getDefaultPlatformPlanData } from "@/lib/platform-plan-catalog";

const SINGLETON_ID = "default" as const;

/** In-memory: снижает нагрузку на БД (каждый API-вызов раньше делал findUnique). */
const PLAN_DATA_CACHE_TTL_MS = 60_000;
const PLAN_DATA_CACHE_FALLBACK_TTL_MS = 15_000;
let planDataCache: { data: PlatformPlanDataV1; expiresAt: number } | null = null;

export async function getPlatformPlanData(): Promise<PlatformPlanDataV1> {
  const now = Date.now();
  if (planDataCache && planDataCache.expiresAt > now) {
    return planDataCache.data;
  }
  try {
    const row = await prisma.platformPlanSettings.findUnique({ where: { id: SINGLETON_ID } });
    const data = !row?.data ? getDefaultPlatformPlanData() : parsePlatformPlanData(row.data);
    planDataCache = { data, expiresAt: now + PLAN_DATA_CACHE_TTL_MS };
    return data;
  } catch (err) {
    // В dev/offline-режимах БД может быть недоступна: не роняем генерацию, используем дефолтные лимиты.
    console.warn("[platform-plan-settings] fallback to defaults due to db error", err);
    const data = getDefaultPlatformPlanData();
    planDataCache = { data, expiresAt: now + PLAN_DATA_CACHE_FALLBACK_TTL_MS };
    return data;
  }
}

export async function savePlatformPlanData(data: PlatformPlanDataV1) {
  const normalized: PlatformPlanDataV1 = {
    version: 1,
    plans: {
      FREE: mergePlanRow("FREE", data.plans.FREE),
      PRO: mergePlanRow("PRO", data.plans.PRO),
      TEAM: mergePlanRow("TEAM", data.plans.TEAM),
    },
  };
  const json = normalized as unknown as Prisma.InputJsonValue;
  await prisma.platformPlanSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, data: json },
    update: { data: json },
  });
  planDataCache = { data: normalized, expiresAt: Date.now() + PLAN_DATA_CACHE_TTL_MS };
  return normalized;
}

export async function getEffectiveMonthlyAllowance(plan: PlanId): Promise<number> {
  const data = await getPlatformPlanData();
  return data.plans[plan]?.monthlyTokens ?? MONTHLY_TOKEN_ALLOWANCE[plan];
}

export async function getEffectiveStreamMinimum(planRaw: string | null | undefined): Promise<number> {
  const plan = normalizePlanId(planRaw);
  const data = await getPlatformPlanData();
  return data.plans[plan]?.minStream ?? MIN_TOKENS_GENERATE_STREAM;
}

export async function getEffectivePromptBuilderMinimum(
  planRaw: string | null | undefined
): Promise<number> {
  const plan = normalizePlanId(planRaw);
  const data = await getPlatformPlanData();
  return data.plans[plan]?.minPromptBuilder ?? MIN_TOKENS_PROMPT_BUILDER;
}

export async function getEffectiveTeamSeatLimit(planRaw: string | null | undefined): Promise<number> {
  const plan = normalizePlanId(planRaw);
  const data = await getPlatformPlanData();
  const limit = data.plans[plan]?.teamSeats;
  if (typeof limit === "number") return Math.max(0, Math.floor(limit));
  return plan === "TEAM" ? TEAM_SEAT_LIMIT : 0;
}
