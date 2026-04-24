import { convertMinorCurrency, type ReferralCurrency } from "@/lib/referrals-currency";

export type TokenPackId = "starter" | "optimal" | "max";

/** Цены в копейках. Ориентир: Pro = 1 990 ₽ за 1M токенов/мес; докупка — наценка за разовый объём без смены тарифа. */
export const TOKEN_PACKS: Record<TokenPackId, { tokens: number; baseRubMinor: number }> = {
  starter: { tokens: 100_000, baseRubMinor: 22_900 },
  optimal: { tokens: 300_000, baseRubMinor: 64_900 },
  max: { tokens: 1_000_000, baseRubMinor: 219_000 }
};

export function parseTokenPackId(raw: string | null | undefined): TokenPackId | null {
  if (raw === "starter" || raw === "optimal" || raw === "max") return raw;
  return null;
}

export function tokenPackPriceMinor(packId: TokenPackId, currency: ReferralCurrency): number {
  const base = TOKEN_PACKS[packId].baseRubMinor;
  return convertMinorCurrency(base, "RUB", currency).amountMinor;
}
