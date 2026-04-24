/**
 * Единый источник правды по тарифам: квоты токенов/мес и пороги для операций.
 * Числа совпадают с /pricing (lib/i18n: лимиты в описании тарифов).
 */
export type PlanId = "FREE" | "PRO" | "TEAM";

export const MONTHLY_TOKEN_ALLOWANCE: Record<PlanId, number> = {
  FREE: 10_000,
  PRO: 500_000,
  TEAM: 2_000_000
};

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

/** Минимум баланса для запуска prompt-builder (до фактического списания). */
export const MIN_TOKENS_PROMPT_BUILDER = 400;

/** Минимум баланса для потоковой генерации. */
export const MIN_TOKENS_GENERATE_STREAM = 1_000;
