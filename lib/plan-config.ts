/**
 * Единый источник правды по тарифам: квоты токенов/мес и пороги для операций.
 * Числа совпадают с /plans и /pricing (lib/i18n: лимиты в описании тарифов).
 */
export type PlanId = "FREE" | "PRO" | "TEAM";

export const MONTHLY_TOKEN_ALLOWANCE: Record<PlanId, number> = {
  FREE: 10_000,
  PRO: 500_000,
  TEAM: 2_000_000
};

/** Максимум одновременных проектов (песочниц / сессий Lemnity AI) по тарифу. */
export const MAX_ACTIVE_PROJECTS_BY_PLAN: Record<PlanId, number> = {
  FREE: 1,
  PRO: 5,
  TEAM: 15
};

/**
 * Участников в команде на тарифе Team (дольщики кроме владельца: до 9, всего 10 вместе с вами).
 * Должно совпадать с описанием в тарифах и FAQ.
 */
export const TEAM_SEAT_LIMIT = 10;

/** Старое имя плана в БД и внешних вебхуках → канонический `PlanId`. */
const LEGACY_PLAN_ALIASES: Record<string, PlanId> = {
  FREE: "FREE",
  PRO: "PRO",
  TEAM: "TEAM",
  BUSINESS: "TEAM"
};

export function normalizePlanId(raw: string | null | undefined): PlanId {
  if (!raw) return "FREE";
  return LEGACY_PLAN_ALIASES[raw.trim().toUpperCase()] ?? "FREE";
}

export function getMonthlyTokenAllowance(plan: PlanId): number {
  return MONTHLY_TOKEN_ALLOWANCE[plan];
}

export function getMaxActiveProjectsForPlan(rawPlan: string | null | undefined): number {
  return MAX_ACTIVE_PROJECTS_BY_PLAN[normalizePlanId(rawPlan)];
}

export function planAllowsTeamSeats(rawPlan: string | null | undefined): boolean {
  return normalizePlanId(rawPlan) === "TEAM";
}

/** Минимум баланса для запуска prompt-builder (до фактического списания). */
export const MIN_TOKENS_PROMPT_BUILDER = 400;

/** Минимум баланса для потоковой генерации. */
export const MIN_TOKENS_GENERATE_STREAM = 1_000;
