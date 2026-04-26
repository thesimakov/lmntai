import type { NextRequest } from "next/server";

import { type BillingPeriod } from "@/lib/pricing-billing";
import { buildPlanPromoPreview, normalizePromoCode, resolvePromoForPreview } from "@/lib/promo-service";
import { formatCurrencyMinor, referralCurrencyForLanguage } from "@/lib/referrals-currency";
import { parseUiLanguage } from "@/lib/i18n";
import { withApiLogging } from "@/lib/with-api-logging";
import { localeForLanguage } from "@/lib/pricing-display";

export const runtime = "nodejs";

const PERIODS: readonly BillingPeriod[] = ["monthly", "quarter", "yearly"];

async function postPreview(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { code?: string; billingPeriod?: string; lang?: string }
    | null;
  const code = typeof body?.code === "string" ? body.code : "";
  const period = body?.billingPeriod;
  if (!period || !PERIODS.includes(period as BillingPeriod)) {
    return Response.json({ error: "invalid_period" }, { status: 400 });
  }
  const lang = parseUiLanguage(body?.lang) ?? "ru";
  const currency = referralCurrencyForLanguage(lang);
  const locale = localeForLanguage(lang);
  if (!normalizePromoCode(code)) {
    return Response.json({ valid: false, error: "empty", pro: null, team: null }, { status: 200 });
  }
  const { promo, error } = await resolvePromoForPreview(code);
  if (!promo) {
    return Response.json(
      { valid: false, error: error ?? "not_found", pro: null, team: null },
      { status: 200 }
    );
  }
  const bp = period as BillingPeriod;
  const proP = buildPlanPromoPreview(promo, "PRO", bp, lang);
  const teamP = buildPlanPromoPreview(promo, "TEAM", bp, lang);

  return Response.json({
    valid: true,
    code: promo.code,
    pro: { ...proP, ...formatPreview(proP, currency, locale) },
    team: { ...teamP, ...formatPreview(teamP, currency, locale) }
  });
}

function formatPreview(
  p: ReturnType<typeof buildPlanPromoPreview>,
  currency: import("@/lib/referrals-currency").ReferralCurrency,
  locale: string
) {
  return {
    formattedTotal: formatCurrencyMinor(p.totalMinor, currency, locale),
    formattedOriginal:
      p.kind === "DISCOUNT" && p.applicable
        ? formatCurrencyMinor(p.originalMinor, currency, locale)
        : null
  };
}

export const POST = withApiLogging("/api/promo/preview", postPreview);
