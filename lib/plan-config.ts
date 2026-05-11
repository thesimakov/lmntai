/**
 * Единый источник правды по тарифам: квоты токенов и пороги для операций.
 * FREE («Старт»): см. `lib/starter-plan.ts` — дневная квота и 3-дневный триал; здесь `MONTHLY_TOKEN_ALLOWANCE.FREE` — стартовый пул / отображаемый базовый лимит (день 1).
 */
export type PlanId = "FREE" | "PRO" | "TEAM";

/**
 * Лимит токенов по тарифам. Для FREE («Старт») — дневная квота (синхронизация в `syncStarterDailyTokenBudget`);
 * стартовое значение баланса при регистрации совпадает с квотой первого дня (пробный период — 10).
 */
export const MONTHLY_TOKEN_ALLOWANCE: Record<PlanId, number> = {
  FREE: 10,
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
  const plan = normalizePlanId(rawPlan);
  const base = MAX_ACTIVE_PROJECTS_BY_PLAN[plan];
  if (process.env.NODE_ENV === "development" && plan === "FREE") {
    const raw = process.env.LMNTAI_DEV_MAX_ACTIVE_PROJECTS_FREE?.trim();
    if (raw && /^\d+$/.test(raw)) {
      const n = parseInt(raw, 10);
      if (n >= 1) return Math.max(base, n);
    }
  }
  return base;
}

export function planAllowsTeamSeats(rawPlan: string | null | undefined): boolean {
  return normalizePlanId(rawPlan) === "TEAM";
}

/** Минимум баланса для запуска prompt-builder (до фактического списания). */
export const MIN_TOKENS_PROMPT_BUILDER = 400;

/** Минимум баланса для потоковой генерации. Для FREE эффективный порог задаётся в настройках платформы (обычно 1). */
export const MIN_TOKENS_GENERATE_STREAM = 1_000;
