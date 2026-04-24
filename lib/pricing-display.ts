import { parseUiLanguage, type UiLanguage } from "@/lib/i18n";
import { TOKEN_PACKS, type TokenPackId, tokenPackPriceMinor } from "@/lib/referral-token-packs";
import {
  convertMinorCurrency,
  formatCurrencyMinor,
  referralCurrencyForLanguage,
  type ReferralCurrency,
} from "@/lib/referrals-currency";

const SUBSCRIPTION_PRICES_RUB_MINOR = {
  pro: 199_000,
  team: 499_000,
} as const;

const TOKEN_PACK_IDS: readonly TokenPackId[] = ["starter", "optimal", "max"] as const;

export type PricingDisplayPayload = {
  language: UiLanguage;
  currency: ReferralCurrency;
  subscriptions: {
    pro: { amountMinor: number; formatted: string };
    team: { amountMinor: number; formatted: string };
  };
  packs: Record<TokenPackId, { tokens: number; priceMinor: number; formattedPrice: string }>;
};

export function localeForLanguage(lang: UiLanguage): string {
  if (lang === "en") return "en-US";
  if (lang === "tg") return "tg-TJ";
  return "ru-RU";
}

export function buildPricingDisplay(rawLang: string | null | undefined): PricingDisplayPayload {
  const language = parseUiLanguage(rawLang) ?? "ru";
  const currency = referralCurrencyForLanguage(language);
  const locale = localeForLanguage(language);

  const proAmountMinor = convertMinorCurrency(
    SUBSCRIPTION_PRICES_RUB_MINOR.pro,
    "RUB",
    currency,
  ).amountMinor;
  const teamAmountMinor = convertMinorCurrency(
    SUBSCRIPTION_PRICES_RUB_MINOR.team,
    "RUB",
    currency,
  ).amountMinor;

  const packs = {} as Record<TokenPackId, { tokens: number; priceMinor: number; formattedPrice: string }>;
  for (const packId of TOKEN_PACK_IDS) {
    const priceMinor = tokenPackPriceMinor(packId, currency);
    packs[packId] = {
      tokens: TOKEN_PACKS[packId].tokens,
      priceMinor,
      formattedPrice: formatCurrencyMinor(priceMinor, currency, locale),
    };
  }

  return {
    language,
    currency,
    subscriptions: {
      pro: {
        amountMinor: proAmountMinor,
        formatted: formatCurrencyMinor(proAmountMinor, currency, locale),
      },
      team: {
        amountMinor: teamAmountMinor,
        formatted: formatCurrencyMinor(teamAmountMinor, currency, locale),
      },
    },
    packs,
  };
}
