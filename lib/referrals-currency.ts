import type { UiLanguage } from "@/lib/i18n";

export const REFERRAL_CURRENCIES = ["RUB", "USD", "TJS"] as const;
export type ReferralCurrency = (typeof REFERRAL_CURRENCIES)[number];

type FxConfig = {
  usdRub: number;
  usdTjs: number;
};

function parseEnvRate(value: string | undefined, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function getFxConfig(): FxConfig {
  return {
    usdRub: parseEnvRate(process.env.REFERRAL_FX_USD_RUB, 92),
    usdTjs: parseEnvRate(process.env.REFERRAL_FX_USD_TJS, 10.5)
  };
}

export function normalizeReferralCurrency(raw: string | null | undefined): ReferralCurrency | null {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "RUB" || v === "USD" || v === "TJS") return v;
  return null;
}

export function referralCurrencyForLanguage(lang: UiLanguage | null | undefined): ReferralCurrency {
  if (lang === "tg") return "TJS";
  if (lang === "en") return "USD";
  return "RUB";
}

export function referralCurrencySymbol(currency: ReferralCurrency): string {
  if (currency === "RUB") return "RUB";
  if (currency === "TJS") return "TJS";
  return "USD";
}

function toUsdRate(currency: ReferralCurrency, fx: FxConfig): number {
  if (currency === "USD") return 1;
  if (currency === "RUB") return 1 / fx.usdRub;
  return 1 / fx.usdTjs;
}

function fromUsdRate(currency: ReferralCurrency, fx: FxConfig): number {
  if (currency === "USD") return 1;
  if (currency === "RUB") return fx.usdRub;
  return fx.usdTjs;
}

export function convertMinorCurrency(
  amountMinor: number,
  from: ReferralCurrency,
  to: ReferralCurrency
): { amountMinor: number; rateUsed: number } {
  if (from === to) {
    return { amountMinor, rateUsed: 1 };
  }
  const fx = getFxConfig();
  const rateUsed = toUsdRate(from, fx) * fromUsdRate(to, fx);
  return {
    amountMinor: Math.max(0, Math.round(amountMinor * rateUsed)),
    rateUsed
  };
}

export function formatCurrencyMinor(
  amountMinor: number,
  currency: ReferralCurrency,
  locale: string
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(amountMinor / 100);
}
