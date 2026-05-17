import {
  MIN_TOKENS_GENERATE_STREAM,
  MIN_TOKENS_PROMPT_BUILDER,
  MONTHLY_TOKEN_ALLOWANCE,
  TEAM_SEAT_LIMIT,
  type PlanId,
} from "@/lib/plan-config";

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
  const freeMins = plan === "FREE";
  return {
    monthlyTokens: MONTHLY_TOKEN_ALLOWANCE[plan],
    minPromptBuilder: freeMins ? 1 : MIN_TOKENS_PROMPT_BUILDER,
    minStream: freeMins ? 1 : MIN_TOKENS_GENERATE_STREAM,
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

export function mergePlanRow(plan: PlanId, row: Partial<PlanRow> | undefined): PlanRow {
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

export function parsePlatformPlanData(raw: unknown): PlatformPlanDataV1 {
  const def = getDefaultPlatformPlanData();
  if (!raw || typeof raw !== "object") return def;
  const o = raw as { version?: number; plans?: unknown };
  if (o.version !== 1 && o.version != null) return def;
  const plansIn = o.plans as Partial<Record<PlanId, Partial<PlanRow>>> | undefined;
  if (!plansIn) return def;
  return {
    version: 1,
    plans: {
      FREE: mergePlanRow("FREE", plansIn.FREE),
      PRO: mergePlanRow("PRO", plansIn.PRO),
      TEAM: mergePlanRow("TEAM", plansIn.TEAM),
    },
  };
}
