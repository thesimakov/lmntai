"use client"

import { motion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"
import { useMemo } from "react"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const faqIds = [1, 2, 3, 4, 5, 6] as const
type FaqId = (typeof faqIds)[number]

export function Pricing() {
  const { t, lang } = useI18n()

  const plans = useMemo(() => {
    const starter = {
      id: "starter" as const,
      name: t("pricing_plan_starter_name"),
      price: t("pricing_plan_starter_price"),
      period: t("pricing_plan_starter_period"),
      priceNote: undefined as string | undefined,
      description: t("pricing_plan_starter_desc"),
      features: [
        t("pricing_plan_starter_feat_1"),
        t("pricing_plan_starter_feat_2"),
        t("pricing_plan_starter_feat_3"),
        t("pricing_plan_starter_feat_4"),
        t("pricing_plan_starter_feat_5"),
        t("pricing_plan_starter_feat_6"),
      ],
      cta: t("pricing_plan_starter_cta"),
      current: true,
      highlighted: false,
      badge: t("pricing_plan_starter_badge"),
    }

    const pro = {
      id: "pro" as const,
      name: t("pricing_plan_pro_name"),
      price: t("pricing_plan_pro_price_monthly"),
      period: t("pricing_plan_pro_period"),
      priceNote: t("pricing_plan_pro_price_note"),
      description: t("pricing_plan_pro_desc"),
      features: [
        t("pricing_plan_pro_feat_1"),
        t("pricing_plan_pro_feat_2"),
        t("pricing_plan_pro_feat_3"),
        t("pricing_plan_pro_feat_4"),
        t("pricing_plan_pro_feat_5"),
        t("pricing_plan_pro_feat_6"),
        t("pricing_plan_pro_feat_7"),
        t("pricing_plan_pro_feat_8"),
      ],
      cta: t("pricing_plan_pro_cta"),
      current: false,
      highlighted: true,
      badge: t("pricing_recommended_badge"),
    }

    const team = {
      id: "team" as const,
      name: t("pricing_plan_team_name"),
      price: t("pricing_plan_team_price_monthly"),
      period: t("pricing_plan_team_period"),
      priceNote: t("pricing_plan_team_price_note"),
      description: t("pricing_plan_team_desc"),
      features: [
        t("pricing_plan_team_feat_1"),
        t("pricing_plan_team_feat_2"),
        t("pricing_plan_team_feat_3"),
        t("pricing_plan_team_feat_4"),
        t("pricing_plan_team_feat_5"),
        t("pricing_plan_team_feat_6"),
        t("pricing_plan_team_feat_7"),
        t("pricing_plan_team_feat_8"),
        t("pricing_plan_team_feat_9"),
      ],
      cta: t("pricing_plan_team_cta"),
      current: false,
      highlighted: false,
      badge: undefined as string | undefined,
    }

    return [starter, pro, team]
  }, [t])

  const paygPacks = useMemo(
    () =>
      (["starter", "optimal", "max"] as const).map((pack) => ({
        id: pack,
        labelKey: `pricing_payg_pack_${pack}_label` as MessageKey,
        bodyKey: `pricing_payg_pack_${pack}_body` as MessageKey,
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
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("pricing_title")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("pricing_subtitle")}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
          {t("pricing_monthly_note")}
        </p>
      </div>

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
              "relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-all duration-300",
              plan.highlighted
                ? "gradient-border bg-muted/30 shadow-lg shadow-purple-500/10"
                : "glass glass-hover"
            )}
          >
            {/* Badge */}
            {plan.badge ? (
              <div className="absolute right-4 top-4 max-w-[10rem] text-right sm:max-w-none">
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
              <h3 className="text-lg font-medium text-foreground">{plan.name}</h3>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-0">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-muted-foreground">{plan.period}</span>
                ) : null}
              </div>
              {plan.priceNote ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {plan.priceNote}
                </p>
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
                  {t(pack.bodyKey)}
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
