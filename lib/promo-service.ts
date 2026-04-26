import type { PromoCode } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  type BillingPeriod,
  subscriptionBillingMinor,
} from "@/lib/pricing-billing";
import {
  convertMinorCurrency,
  referralCurrencyForLanguage,
  type ReferralCurrency
} from "@/lib/referrals-currency";
import { type UiLanguage, parseUiLanguage } from "@/lib/i18n";

const SUBSCRIPTION_PRICES_RUB_MINOR = {
  pro: 199_000,
  team: 499_000,
} as const;

export type PaidPlanKey = "PRO" | "TEAM";

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function plansAllow(promo: PromoCode, plan: PaidPlanKey): boolean {
  const raw = promo.appliesToPlans;
  if (raw == null) return true;
  if (Array.isArray(raw)) {
    const list = raw.filter((x): x is string => typeof x === "string");
    if (list.length === 0) return true;
    return list.includes(plan);
  }
  return true;
}

function isValidWindow(promo: PromoCode, now: Date): boolean {
  if (promo.validFrom && now < promo.validFrom) return false;
  if (promo.validTo && now > promo.validTo) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  return true;
}

export async function getPromoByCodeNormalized(
  codeNorm: string
): Promise<PromoCode | null> {
  if (!codeNorm) return null;
  return prisma.promoCode.findUnique({ where: { code: codeNorm } });
}

export function promoRowIsUsable(
  promo: PromoCode,
  now = new Date()
): { ok: true } | { ok: false; reason: string } {
  if (!promo.isActive) return { ok: false, reason: "inactive" };
  if (!isValidWindow(promo, now)) return { ok: false, reason: "expired_or_limit" };
  if (promo.kind === "DISCOUNT") {
    const p = promo.discountPercent;
    if (typeof p !== "number" || p < 1 || p > 100) {
      return { ok: false, reason: "invalid_config" };
    }
  } else if (promo.kind === "BONUS_TOKENS") {
    const t = promo.bonusTokens;
    if (typeof t !== "number" || t < 1) return { ok: false, reason: "invalid_config" };
  } else {
    return { ok: false, reason: "invalid_config" };
  }
  return { ok: true };
}

export type PromoPlanPreview = {
  applicable: boolean;
  reason?: string;
  kind: "DISCOUNT" | "BONUS_TOKENS" | "NONE";
  totalMinor: number;
  originalMinor: number;
  discountPercent: number | null;
  bonusTokens: number | null;
};

/**
 * Сумма подписки Pro/Team в minor units для валюты (как в buildPricingDisplay).
 */
export function baseMonthlyMinorForPlan(
  plan: "pro" | "team",
  currency: ReferralCurrency
): number {
  const rub =
    plan === "pro" ? SUBSCRIPTION_PRICES_RUB_MINOR.pro : SUBSCRIPTION_PRICES_RUB_MINOR.team;
  return convertMinorCurrency(rub, "RUB", currency).amountMinor;
}

/**
 * Считает итог для Pro/Team с учётом периода и промо (тот же pipeline, что и на /pricing).
 */
export function buildPlanPromoPreview(
  promo: PromoCode | null,
  plan: PaidPlanKey,
  period: BillingPeriod,
  language: UiLanguage | null | undefined
): PromoPlanPreview {
  const cur = referralCurrencyForLanguage(parseUiLanguage(language) ?? "ru");
  const monthly =
    plan === "PRO" ? baseMonthlyMinorForPlan("pro", cur) : baseMonthlyMinorForPlan("team", cur);
  const base = subscriptionBillingMinor(monthly, period);
  if (!promo) {
    return {
      applicable: true,
      kind: "NONE",
      totalMinor: base.totalMinor,
      originalMinor: base.totalMinor,
      discountPercent: null,
      bonusTokens: null
    };
  }
  if (!plansAllow(promo, plan)) {
    return {
      applicable: false,
      reason: "plan",
      kind: "NONE",
      totalMinor: base.totalMinor,
      originalMinor: base.totalMinor,
      discountPercent: null,
      bonusTokens: null
    };
  }
  const u = promoRowIsUsable(promo);
  if (!u.ok) {
    return {
      applicable: false,
      reason: u.reason,
      kind: "NONE",
      totalMinor: base.totalMinor,
      originalMinor: base.totalMinor,
      discountPercent: null,
      bonusTokens: null
    };
  }
  if (promo.kind === "BONUS_TOKENS") {
    return {
      applicable: true,
      kind: "BONUS_TOKENS",
      totalMinor: base.totalMinor,
      originalMinor: base.totalMinor,
      discountPercent: null,
      bonusTokens: promo.bonusTokens ?? 0
    };
  }
  const pct = promo.discountPercent ?? 0;
  const totalMinor = Math.max(0, Math.round((base.totalMinor * (100 - pct)) / 100));
  return {
    applicable: true,
    kind: "DISCOUNT",
    totalMinor,
    originalMinor: base.totalMinor,
    discountPercent: pct,
    bonusTokens: null
  };
}

/** Служебно: валидация кода (публичный preview). */
export async function resolvePromoForPreview(
  codeRaw: string
): Promise<{ promo: PromoCode | null; error?: string }> {
  const code = normalizePromoCode(codeRaw);
  if (!code) return { promo: null, error: "empty" };
  const row = await getPromoByCodeNormalized(code);
  if (!row) return { promo: null, error: "not_found" };
  const u = promoRowIsUsable(row);
  if (!u.ok) return { promo: null, error: u.reason };
  return { promo: row };
}

export { SUBSCRIPTION_PRICES_RUB_MINOR };
