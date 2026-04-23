import type { ProjectKind } from "@/lib/manus-prompt-spec";
import { MONTHLY_TOKEN_ALLOWANCE, type PlanId } from "@/lib/plan-config";
import { AGENT_PROFILES, resolveAgentForTask } from "@/lib/agent-models";

function parseRubPerMillion(envValue: string | undefined, fallback: number) {
  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export const MODEL_COGS_RUB_PER_1M: Record<string, number> = {
  // Public RouterAI catalog calibration (RUB / 1M effective), with conservative output mix.
  // GPT-4.1 baseline may vary by account; default approximates current OpenAI flagship tier.
  [AGENT_PROFILES["GPT-4.1"].modelId]: parseRubPerMillion(process.env.ECON_COGS_GPT41_RUB_PER_1M, 670),
  [AGENT_PROFILES["Gemini 3 Pro"].modelId]: parseRubPerMillion(process.env.ECON_COGS_GEMINI3PRO_RUB_PER_1M, 536),
  [AGENT_PROFILES["Claude Sonnet"].modelId]: parseRubPerMillion(process.env.ECON_COGS_CLAUDE_SONNET_RUB_PER_1M, 702),
  [AGENT_PROFILES["Kimi K2.6"].modelId]: parseRubPerMillion(process.env.ECON_COGS_KIMI_RUB_PER_1M, 167)
};

export const PRO_KIND_MIX: Record<ProjectKind, number> = {
  website: 0.4,
  presentation: 0.35,
  resume: 0.25,
  design: 0,
  visitcard: 0
};

export const FREE_KIND_MIX: Record<ProjectKind, number> = {
  website: 0.45,
  presentation: 0.35,
  resume: 0.2,
  design: 0,
  visitcard: 0
};

export function estimateUsageCostRub(modelId: string, totalTokens: number): number {
  const rubPer1M = MODEL_COGS_RUB_PER_1M[modelId] ?? MODEL_COGS_RUB_PER_1M[AGENT_PROFILES["GPT-4.1"].modelId];
  return (Math.max(0, totalTokens) / 1_000_000) * rubPer1M;
}

export function weightedCogsRubPer1M(plan: PlanId): number {
  if (plan === "FREE") {
    let freeSum = 0;
    for (const [kind, share] of Object.entries(FREE_KIND_MIX) as Array<[ProjectKind, number]>) {
      if (share <= 0) continue;
      const model = resolveAgentForTask({ plan: "FREE", projectKind: kind, task: "generate-stream" });
      freeSum += (MODEL_COGS_RUB_PER_1M[model.modelId] ?? 0) * share;
    }
    return freeSum;
  }
  let sum = 0;
  for (const [kind, share] of Object.entries(PRO_KIND_MIX) as Array<[ProjectKind, number]>) {
    if (share <= 0) continue;
    const model = resolveAgentForTask({ plan, projectKind: kind, task: "generate-stream" });
    sum += (MODEL_COGS_RUB_PER_1M[model.modelId] ?? 0) * share;
  }
  return sum;
}

export function projectedMonthlyCogsRub(plan: PlanId): number {
  return (MONTHLY_TOKEN_ALLOWANCE[plan] / 1_000_000) * weightedCogsRubPer1M(plan);
}

export type TariffEconomicsRow = {
  plan: PlanId;
  monthlyTokens: number;
  weightedCogsRubPer1M: number;
  projectedMonthlyCogsRub: number;
  monthlyPriceRub: number;
  projectedMarginRub: number;
  projectedMarginPercent: number;
};

export function buildTariffEconomics(pricesRub: Record<PlanId, number>): TariffEconomicsRow[] {
  return (["FREE", "PRO", "TEAM"] as const).map((plan) => {
    const monthlyTokens = MONTHLY_TOKEN_ALLOWANCE[plan];
    const weighted = weightedCogsRubPer1M(plan);
    const cogs = projectedMonthlyCogsRub(plan);
    const price = pricesRub[plan];
    const margin = price - cogs;
    const marginPct = price > 0 ? (margin / price) * 100 : 0;
    return {
      plan,
      monthlyTokens,
      weightedCogsRubPer1M: weighted,
      projectedMonthlyCogsRub: cogs,
      monthlyPriceRub: price,
      projectedMarginRub: margin,
      projectedMarginPercent: marginPct
    };
  });
}

export const DEFAULT_TARIFF_PRICES_RUB: Record<PlanId, number> = {
  FREE: 0,
  PRO: 990,
  TEAM: 2490
};
