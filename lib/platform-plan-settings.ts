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

const SINGLETON_ID = "default" as const;

/** Флаги возможностей тарифа (для панели администратора и будущей сквозной логики). */
export const PLATFORM_FEATURE_CATALOG: {
  id: string;
  label: string;
  desc: string;
}[] = [
  { id: "playground", label: "Песочница / мастер идей", desc: "Доступ к основному сценарию создания" },
  { id: "ai_generate_stream", label: "Потоковая генерация", desc: "API и UI потоковой генерации" },
  { id: "ai_prompt_builder", label: "Prompt builder", desc: "Сборка промптов" },
  { id: "ai_prompt_coach", label: "Prompt coach", desc: "Сопровождение промптов" },
  { id: "team_seats", label: "Места в команде (Team)", desc: "Приглашения и места в команде" },
  { id: "integrations_pro", label: "Pro-интеграции", desc: "Telegram, аналитика и др., завязанные на Pro" },
  { id: "export_artefacts", label: "Экспорт / артефакты", desc: "Скачивание и расшаривание премиум" },
  { id: "api_access", label: "API / ключ", desc: "Серверный API-ключ при наличии" },
  { id: "referral_program", label: "Реферальная программа", desc: "Реф. баланс и вывод" },
  { id: "priority_queue", label: "Приоритет в очереди", desc: "Повышенный приоритет обработки" },
];

export type PlanRow = {
  monthlyTokens: number;
  minPromptBuilder: number;
  minStream: number;
  teamSeats: number;
  features: Record<string, boolean>;
};

export type PlatformPlanDataV1 = {
  version: 1;
  plans: Record<PlanId, PlanRow>;
};

function defaultFeatureMap(plan: PlanId): Record<string, boolean> {
  const all = Object.fromEntries(PLATFORM_FEATURE_CATALOG.map((f) => [f.id, false])) as Record<
    string,
    boolean
  >;
  if (plan === "FREE") {
    all.playground = true;
    all.ai_generate_stream = true;
    all.ai_prompt_builder = true;
    all.ai_prompt_coach = true;
    return all;
  }
  for (const f of PLATFORM_FEATURE_CATALOG) {
    all[f.id] = true;
  }
  if (plan === "PRO") {
    all.team_seats = false;
  }
  return all;
}

function defaultRow(plan: PlanId): PlanRow {
  return {
    monthlyTokens: MONTHLY_TOKEN_ALLOWANCE[plan],
    minPromptBuilder: MIN_TOKENS_PROMPT_BUILDER,
    minStream: MIN_TOKENS_GENERATE_STREAM,
    teamSeats: plan === "TEAM" ? TEAM_SEAT_LIMIT : 0,
    features: defaultFeatureMap(plan),
  };
}

export function getDefaultPlatformPlanData(): PlatformPlanDataV1 {
  return {
    version: 1,
    plans: {
      FREE: defaultRow("FREE"),
      PRO: defaultRow("PRO"),
      TEAM: defaultRow("TEAM"),
    },
  };
}

function mergeRow(plan: PlanId, row: Partial<PlanRow> | undefined): PlanRow {
  const d = defaultRow(plan);
  if (!row) return d;
  return {
    monthlyTokens: typeof row.monthlyTokens === "number" ? row.monthlyTokens : d.monthlyTokens,
    minPromptBuilder:
      typeof row.minPromptBuilder === "number" ? row.minPromptBuilder : d.minPromptBuilder,
    minStream: typeof row.minStream === "number" ? row.minStream : d.minStream,
    teamSeats: typeof row.teamSeats === "number" ? row.teamSeats : d.teamSeats,
    features: { ...d.features, ...(row.features && typeof row.features === "object" ? row.features : {}) },
  };
}

function parseData(raw: unknown): PlatformPlanDataV1 {
  const def = getDefaultPlatformPlanData();
  if (!raw || typeof raw !== "object") return def;
  const o = raw as { version?: number; plans?: unknown };
  if (o.version !== 1 && o.version != null) return def;
  const plansIn = o.plans as Partial<Record<PlanId, Partial<PlanRow>>> | undefined;
  if (!plansIn) return def;
  return {
    version: 1,
    plans: {
      FREE: mergeRow("FREE", plansIn.FREE),
      PRO: mergeRow("PRO", plansIn.PRO),
      TEAM: mergeRow("TEAM", plansIn.TEAM),
    },
  };
}

export async function getPlatformPlanData(): Promise<PlatformPlanDataV1> {
  const row = await prisma.platformPlanSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (!row?.data) return getDefaultPlatformPlanData();
  return parseData(row.data);
}

export async function savePlatformPlanData(data: PlatformPlanDataV1) {
  const normalized: PlatformPlanDataV1 = {
    version: 1,
    plans: {
      FREE: mergeRow("FREE", data.plans.FREE),
      PRO: mergeRow("PRO", data.plans.PRO),
      TEAM: mergeRow("TEAM", data.plans.TEAM),
    },
  };
  const json = normalized as unknown as Prisma.InputJsonValue;
  await prisma.platformPlanSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, data: json },
    update: { data: json },
  });
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
