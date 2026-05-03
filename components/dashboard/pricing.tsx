"use client"

import { motion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { MessageKey, UiLanguage } from "@/lib/i18n"
import { normalizePlanId } from "@/lib/plan-config"
import {
  type BillingPeriod,
  subscriptionBillingLinearMinor,
  subscriptionBillingMinor,
} from "@/lib/pricing-billing"
import {
  type PricingDisplayPayload,
  localeForLanguage,
} from "@/lib/pricing-display"
import { formatCurrencyMinor, type ReferralCurrency } from "@/lib/referrals-currency"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const faqIds = [1, 2, 3, 4, 5, 6] as const
type FaqId = (typeof faqIds)[number]
type TokenPackId = "starter" | "optimal" | "max"
function formatPaidPlanLine(
  monthlyMinor: number,
  currency: ReferralCurrency,
  locale: string,
  period: BillingPeriod,
  t: (k: MessageKey) => string,
  periodTextKey: "pricing_plan_pro_period" | "pricing_plan_team_period"
): { price: string; period: string; subline?: string; discount?: string } {
  const b = subscriptionBillingMinor(monthlyMinor, period)
  if (period === "monthly") {
    return {
      price: formatCurrencyMinor(b.totalMinor, currency, locale),
      period: t(periodTextKey),
    }
  }
  return {
    price: formatCurrencyMinor(b.totalMinor, currency, locale),
    period:
      period === "quarter"
        ? t("pricing_billing_period_for_quarter")
        : t("pricing_billing_period_for_year"),
    subline: `≈ ${formatCurrencyMinor(
      b.effectiveMonthlyMinor,
      currency,
      locale
    )}${t("pricing_billing_per_month_mean")}`,
    discount:
      period === "quarter"
        ? t("pricing_billing_discount_10")
        : t("pricing_billing_discount_15"),
  }
}

/** «Старт» — скидок за 3 мес/год нет: только 3× и 12× от месячной цены. */
function formatStarterPlanLine(
  monthlyMinor: number,
  currency: ReferralCurrency,
  locale: string,
  period: BillingPeriod,
  t: (k: MessageKey) => string
): { price: string; period: string; subline?: string; discount?: string } {
  const b = subscriptionBillingLinearMinor(monthlyMinor, period)
  if (period === "monthly") {
    return {
      price: formatCurrencyMinor(b.totalMinor, currency, locale),
      period: t("pricing_plan_starter_period"),
    }
  }
  return {
    price: formatCurrencyMinor(b.totalMinor, currency, locale),
    period:
      period === "quarter"
        ? t("pricing_billing_period_for_quarter")
        : t("pricing_billing_period_for_year"),
    subline: `≈ ${formatCurrencyMinor(
      b.effectiveMonthlyMinor,
      currency,
      locale
    )}${t("pricing_billing_per_month_mean")}`,
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function starterTrialRemainLabel(lang: UiLanguage, n: number): string {
  if (lang === "ru") {
    const abs = n % 100
    const d = n % 10
    let word = "дней"
    if (abs < 11 || abs > 14) {
      if (d === 1) word = "день"
      else if (d >= 2 && d <= 4) word = "дня"
    }
    return `Ещё ${n} ${word} пробного периода`
  }
  if (lang === "tg") {
    return `Боз ${n} рӯзи санҷиш`
  }
  return n === 1 ? `${n} day left in trial` : `${n} days left in trial`
}

type ProfileTrialFields = {
  plan: string
  starterPaidUntil: string | null
  starterTrialEndsAt: string | null
}

const billingOptions: { id: BillingPeriod; tab: MessageKey }[] = [
  { id: "monthly", tab: "pricing_billing_tab_month" },
  { id: "quarter", tab: "pricing_billing_tab_quarter" },
  { id: "yearly", tab: "pricing_billing_tab_year" },
]

type PromoPreviewResponse = {
  valid: boolean
  error?: string
  code?: string
  pro: {
    applicable: boolean
    kind: string
    totalMinor: number
    originalMinor: number
    discountPercent: number | null
    bonusTokens: number | null
    formattedTotal: string
    formattedOriginal: string | null
  } | null
  team: {
    applicable: boolean
    kind: string
    totalMinor: number
    originalMinor: number
    discountPercent: number | null
    bonusTokens: number | null
    formattedTotal: string
    formattedOriginal: string | null
  } | null
}

export function Pricing() {
  const { t, lang } = useI18n()
  const { status } = useSession()
  const [profileTrialSlice, setProfileTrialSlice] = useState<
    ProfileTrialFields | null
  >(null)
  const [displayPricing, setDisplayPricing] = useState<PricingDisplayPayload | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly")
  const [promoInput, setPromoInput] = useState("")
  const [promoResult, setPromoResult] = useState<PromoPreviewResponse | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const showBilling = displayPricing != null
  const appliedPromoCodeRef = useRef<string | null>(null)

  const applyPromoWithCode = useCallback(
    async (code: string) => {
      const c = code.trim()
      if (!c) {
        setPromoResult(null)
        appliedPromoCodeRef.current = null
        setPromoError(null)
        return
      }
      setPromoLoading(true)
      setPromoError(null)
      try {
        const res = await fetch("/api/promo/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: c, billingPeriod, lang })
        })
        const j = (await res.json()) as PromoPreviewResponse & { error?: string }
        if (!res.ok) {
          setPromoResult(null)
          setPromoError("Не удалось проверить промокод")
          return
        }
        setPromoResult(j)
        if (!j.valid) {
          appliedPromoCodeRef.current = null
          setPromoError(
            j.error === "not_found"
              ? "Промокод не найден"
              : j.error === "empty"
                ? "Введите код"
                : "Промокод недействителен"
          )
          return
        }
        appliedPromoCodeRef.current = j.code ?? c
        setPromoError(null)
      } catch {
        setPromoError("Ошибка сети")
        setPromoResult(null)
        appliedPromoCodeRef.current = null
      } finally {
        setPromoLoading(false)
      }
    },
    [billingPeriod, lang]
  )

  useEffect(() => {
    const c = appliedPromoCodeRef.current
    if (!c) return
    void applyPromoWithCode(c)
  }, [billingPeriod, lang, applyPromoWithCode])

  useEffect(() => {
    if (status !== "authenticated") {
      setProfileTrialSlice(null)
      return
    }
    let cancelled = false
    void fetch("/api/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { user?: ProfileTrialFields } | null) => {
        if (cancelled || !body?.user) return
        setProfileTrialSlice({
          plan: body.user.plan,
          starterPaidUntil: body.user.starterPaidUntil,
          starterTrialEndsAt: body.user.starterTrialEndsAt,
        })
      })
      .catch(() => {
        if (!cancelled) setProfileTrialSlice(null)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    let cancelled = false
    setDisplayPricing(null)

    async function loadDisplayPricing() {
      try {
        const res = await fetch(`/api/pricing/display?lang=${lang}`)
        if (!res.ok) return
        const payload = (await res.json()) as PricingDisplayPayload
        if (!cancelled) {
          setDisplayPricing(payload)
        }
      } catch {
        // Keep i18n fallback prices on network/API errors.
      }
    }

    void loadDisplayPricing()
    return () => {
      cancelled = true
    }
  }, [lang])

  function resolvePackBody(packId: TokenPackId, fallbackKey: MessageKey) {
    const fallbackBody = t(fallbackKey)
    const formattedPrice = displayPricing?.packs[packId]?.formattedPrice
    if (!formattedPrice) return fallbackBody
    return fallbackBody.replace(/·\s*[^·]+$/u, `· ${formattedPrice}`)
  }

  const plans = useMemo(() => {
    const locale = displayPricing
      ? localeForLanguage(displayPricing.language)
      : localeForLanguage(lang)
    const currency = displayPricing?.currency

    const starterLine =
      currency && displayPricing
        ? formatStarterPlanLine(
            displayPricing.subscriptions.starter.amountMinor,
            currency,
            locale,
            showBilling ? billingPeriod : "monthly",
            t
          )
        : {
            price: t("pricing_plan_starter_price"),
            period: t("pricing_plan_starter_period"),
            subline: undefined,
            discount: undefined,
          }

    const starterBadgeRaw = t("pricing_plan_starter_badge").trim()
    const starter = {
      id: "starter" as const,
      name: t("pricing_plan_starter_name"),
      price: starterLine.price,
      period: starterLine.period,
      subline: starterLine.subline,
      discount: starterLine.discount,
      description: t("pricing_plan_starter_desc"),
      features: [
        t("pricing_plan_starter_feat_1"),
        t("pricing_plan_starter_feat_2"),
        t("pricing_plan_starter_feat_3"),
      ],
      cta: t("pricing_plan_starter_cta"),
      current: true,
      highlighted: false,
      badge: starterBadgeRaw || undefined,
    }

    const proLineBase =
      currency && displayPricing
        ? formatPaidPlanLine(
            displayPricing.subscriptions.pro.amountMinor,
            currency,
            locale,
            showBilling ? billingPeriod : "monthly",
            t,
            "pricing_plan_pro_period"
          )
        : {
            price: t("pricing_plan_pro_price_monthly"),
            period: t("pricing_plan_pro_period"),
          }

    const teamLineBase =
      currency && displayPricing
        ? formatPaidPlanLine(
            displayPricing.subscriptions.team.amountMinor,
            currency,
            locale,
            showBilling ? billingPeriod : "monthly",
            t,
            "pricing_plan_team_period"
          )
        : {
            price: t("pricing_plan_team_price_monthly"),
            period: t("pricing_plan_team_period"),
          }

    const pr = promoResult?.valid && promoResult.pro ? promoResult.pro : null
    const tm = promoResult?.valid && promoResult.team ? promoResult.team : null

    let proLine: typeof proLineBase & { priceWas?: string; promoLine?: string } = { ...proLineBase }
    if (pr?.applicable && pr.kind === "DISCOUNT" && pr.formattedOriginal) {
      proLine = {
        price: pr.formattedTotal,
        period: proLineBase.period,
        subline: proLineBase.subline,
        discount: pr.discountPercent
          ? `−${pr.discountPercent}% ${t("pricing_promo_applied")}`
          : proLineBase.discount,
        priceWas: pr.formattedOriginal
      }
    } else if (pr?.applicable && pr.kind === "BONUS_TOKENS" && (pr.bonusTokens ?? 0) > 0) {
      proLine = {
        ...proLineBase,
        promoLine: `+${(pr.bonusTokens ?? 0).toLocaleString("ru-RU")} ${t("pricing_promo_tokens_gift")}`
      }
    }

    let teamLine: typeof teamLineBase & { priceWas?: string; promoLine?: string } = { ...teamLineBase }
    if (tm?.applicable && tm.kind === "DISCOUNT" && tm.formattedOriginal) {
      teamLine = {
        price: tm.formattedTotal,
        period: teamLineBase.period,
        subline: teamLineBase.subline,
        discount: tm.discountPercent
          ? `−${tm.discountPercent}% ${t("pricing_promo_applied")}`
          : teamLineBase.discount,
        priceWas: tm.formattedOriginal
      }
    } else if (tm?.applicable && tm.kind === "BONUS_TOKENS" && (tm.bonusTokens ?? 0) > 0) {
      teamLine = {
        ...teamLineBase,
        promoLine: `+${(tm.bonusTokens ?? 0).toLocaleString("ru-RU")} ${t("pricing_promo_tokens_gift")}`
      }
    }

    const pro = {
      id: "pro" as const,
      name: t("pricing_plan_pro_name"),
      price: proLine.price,
      priceWas: "priceWas" in proLine ? proLine.priceWas : undefined,
      promoLine: "promoLine" in proLine ? proLine.promoLine : undefined,
      period: proLine.period,
      subline: proLine.subline,
      discount: proLine.discount,
      description: t("pricing_plan_pro_desc"),
      features: [
        t("pricing_plan_pro_feat_1"),
        t("pricing_plan_pro_feat_2"),
        t("pricing_plan_pro_feat_3"),
        t("pricing_plan_pro_feat_4"),
      ],
      cta: t("pricing_plan_pro_cta"),
      current: false,
      highlighted: true,
      badge: t("pricing_recommended_badge"),
    }

    const team = {
      id: "team" as const,
      name: t("pricing_plan_team_name"),
      price: teamLine.price,
      priceWas: "priceWas" in teamLine ? teamLine.priceWas : undefined,
      promoLine: "promoLine" in teamLine ? teamLine.promoLine : undefined,
      period: teamLine.period,
      subline: teamLine.subline,
      discount: teamLine.discount,
      description: t("pricing_plan_team_desc"),
      features: [
        t("pricing_plan_team_feat_1"),
        t("pricing_plan_team_feat_2"),
        t("pricing_plan_team_feat_3"),
      ],
      cta: t("pricing_plan_team_cta"),
      current: false,
      highlighted: false,
      badge: undefined as string | undefined,
    }

    return [starter, pro, team]
  }, [displayPricing, t, lang, billingPeriod, showBilling, promoResult])

  const starterTrialRemainText = useMemo(() => {
    if (!profileTrialSlice?.starterTrialEndsAt) return null
    if (normalizePlanId(profileTrialSlice.plan) !== "FREE") return null
    if (profileTrialSlice.starterPaidUntil) {
      const paidUntil = new Date(profileTrialSlice.starterPaidUntil)
      if (
        Number.isFinite(paidUntil.getTime()) &&
        paidUntil.getTime() > Date.now()
      ) {
        return null
      }
    }
    const ends = new Date(profileTrialSlice.starterTrialEndsAt)
    const msLeft = ends.getTime() - Date.now()
    if (!Number.isFinite(msLeft) || msLeft <= 0) return null
    const days = Math.max(1, Math.ceil(msLeft / MS_PER_DAY))
    return starterTrialRemainLabel(lang, days)
  }, [profileTrialSlice, lang])

  const paygPacks = useMemo(
    () =>
      (["starter", "optimal", "max"] as const).map((pack: TokenPackId) => ({
        id: pack,
        labelKey: `pricing_payg_pack_${pack}_label` as MessageKey,
        fallbackBodyKey: `pricing_payg_pack_${pack}_body` as MessageKey,
        highlight: pack === "optimal",
      })),
    [],
  )

  const faqs = useMemo(
    () =>
      (faqIds as readonly FaqId[]).map((id) => ({
        id,
        q: t(`pricing_faq_q${id}` as MessageKey),
        a: t(`pricing_faq_a${id}` as MessageKey),
      })),
    [t],
  )

  async function purchaseWithReferralWallet(packId: "starter" | "optimal" | "max") {
    try {
      const res = await fetch("/api/referrals/spend", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, lang })
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { reason?: string } | null
        if (body?.reason === "insufficient_balance") {
          toast.error(t("pricing_payg_wallet_insufficient"))
          return
        }
        toast.error(t("retry"))
        return
      }
      toast.success(t("pricing_payg_wallet_success"))
    } catch {
      toast.message(t("pricing_payg_toast"), {
        description: t(`pricing_payg_pack_${packId}_label` as MessageKey),
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-12">
        <div className="text-center">
          <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            {t("pricing_title")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("pricing_header_lead")}
          </p>
        </div>
      </div>

      {showBilling ? (
        <div
          className="mx-auto mb-8 flex max-w-lg flex-col items-center gap-2"
          role="group"
          aria-label={t("pricing_billing_aria")}
        >
          <div className="inline-flex flex-wrap justify-center gap-1 rounded-2xl border border-border/60 bg-muted/25 p-1 shadow-sm">
            {billingOptions.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                variant={billingPeriod === opt.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm",
                  billingPeriod !== opt.id && "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setBillingPeriod(opt.id);
                }}
              >
                {t(opt.tab)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {showBilling ? (
        <div className="mx-auto mb-8 w-full max-w-md">
          <label className="mb-1 block text-left text-xs font-medium text-muted-foreground">
            {t("pricing_promo_label")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Input
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value)
                if (promoError) setPromoError(null)
              }}
              placeholder={t("pricing_promo_placeholder")}
              className="min-w-0 flex-1 rounded-xl border-border/60"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full shrink-0 rounded-xl sm:w-auto"
              disabled={promoLoading}
              onClick={() => void applyPromoWithCode(promoInput)}
            >
              {promoLoading ? "…" : t("pricing_promo_apply")}
            </Button>
          </div>
          <div className="pt-1" aria-live="polite">
            {promoError ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{promoError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className={cn(
              "relative flex h-full flex-col overflow-visible rounded-2xl p-6 transition-all duration-300",
              plan.highlighted
                ? "gradient-border bg-muted/30 shadow-lg shadow-purple-500/10"
                : "glass glass-hover"
            )}
          >
            {/* Badge */}
            {plan.badge ? (
              <div className="absolute right-4 top-0 z-10 max-w-[10rem] -translate-y-2 text-right sm:max-w-none sm:-translate-y-2.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                    plan.highlighted
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "border border-border/60 bg-muted/40 text-foreground/90"
                  )}
                >
                  {plan.highlighted ? <Sparkles className="h-3 w-3 shrink-0" /> : null}
                  {plan.badge}
                </span>
              </div>
            ) : null}

            {/* Plan Header */}
            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <h3 className="text-lg font-medium text-foreground">{plan.name}</h3>
                {plan.id === "starter" && starterTrialRemainText ? (
                  <span className="ml-auto shrink-0 text-right text-xs font-normal tabular-nums leading-snug text-muted-foreground sm:text-[13px]">
                    {starterTrialRemainText}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                {"priceWas" in plan && plan.priceWas ? (
                  <span className="mr-1 text-lg font-medium line-through tabular-nums text-muted-foreground">
                    {plan.priceWas as string}
                  </span>
                ) : null}
                <span className="text-4xl font-bold tabular-nums text-foreground">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-base text-muted-foreground">{plan.period}</span>
                ) : null}
                {plan.discount ? (
                  <span className="rounded-md border border-border/80 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground/90">
                    {plan.discount}
                  </span>
                ) : null}
              </div>
              {"promoLine" in plan && plan.promoLine ? (
                <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {String(plan.promoLine)}
                </p>
              ) : null}
              {plan.subline ? (
                <p className="mt-1 text-xs text-muted-foreground">{plan.subline}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            </div>

            {/* Features */}
            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      plan.highlighted ? "bg-purple-500/20" : "bg-muted/50"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3",
                        plan.highlighted ? "text-purple-400" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <span className="text-sm text-foreground/80">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div className="mt-auto">
              <Button
                className={cn(
                  "w-full rounded-xl py-5",
                  plan.current
                    ? "border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/40"
                    : plan.highlighted
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                )}
                disabled={plan.current}
              >
                {plan.cta}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pay-as-you-go */}
      <div className="mx-auto mt-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          <h2 className="text-xl font-semibold text-foreground">{t("pricing_payg_title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("pricing_payg_subtitle")}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {paygPacks.map((pack) => (
              <div
                key={pack.id}
                className={cn(
                  "flex min-h-[200px] flex-col rounded-xl border p-5 text-center",
                  pack.highlight
                    ? "border-purple-500/35 bg-muted/35 shadow-md shadow-purple-500/10"
                    : "border-border/60 bg-muted/20",
                )}
              >
                {pack.highlight ? (
                  <div className="mb-3 flex justify-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white sm:text-xs">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      {t("pricing_payg_popular")}
                    </span>
                  </div>
                ) : null}
                <p className="text-sm font-medium text-foreground">{t(pack.labelKey)}</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                  {resolvePackBody(pack.id, pack.fallbackBodyKey)}
                </p>
                <div className="mt-auto flex flex-1 flex-col justify-end pt-6">
                  <Button
                    type="button"
                    className={cn(
                      "w-full rounded-xl py-5 text-sm font-medium",
                      pack.highlight
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
                        : "bg-primary text-primary-foreground hover:opacity-90",
                    )}
                    onClick={() =>
                      void purchaseWithReferralWallet(pack.id)
                    }
                  >
                    {t("pricing_payg_cta")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {t("pricing_payg_footnote")}
          </p>
        </motion.div>
      </div>

      {/* FAQ */}
      <div id="faq" className="mx-auto mt-12 max-w-5xl">
        <h2 className="text-xl font-semibold text-foreground">{t("pricing_faq_title")}</h2>
        <div className="glass mt-4 rounded-2xl p-2">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, idx) => (
              <AccordionItem
                key={item.id}
                value={`faq-${idx}`}
                className="border-border/60 px-4"
              >
                <AccordionTrigger className="text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="leading-relaxed">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </div>
    </motion.div>
  )
}
