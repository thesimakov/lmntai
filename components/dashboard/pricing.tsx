"use client"

import { motion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

const faqIds = [1, 2, 3, 4, 5, 6] as const
type FaqId = (typeof faqIds)[number]

export function Pricing() {
  const { t } = useI18n()
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly")

  const plans = useMemo(() => {
    const exploration = {
      id: "exploration" as const,
      name: t("pricing_plan_exploration_name"),
      price: t("pricing_plan_exploration_price"),
      description: t("pricing_plan_exploration_desc"),
      features: [
        t("pricing_plan_exploration_feat_1"),
        t("pricing_plan_exploration_feat_2"),
        t("pricing_plan_exploration_feat_3"),
        t("pricing_plan_exploration_feat_4"),
      ],
      cta: t("pricing_plan_exploration_cta"),
      current: true,
      highlighted: false,
      badge: undefined as string | undefined,
      period: undefined as string | undefined,
    }

    const pro = {
      id: "pro" as const,
      name: t("pricing_plan_pro_name"),
      price:
        billing === "yearly" ? t("pricing_plan_pro_price_yearly") : t("pricing_plan_pro_price_monthly"),
      period: t("pricing_plan_pro_period"),
      description: t("pricing_plan_pro_desc"),
      features: [
        t("pricing_plan_pro_feat_1"),
        t("pricing_plan_pro_feat_2"),
        t("pricing_plan_pro_feat_3"),
        t("pricing_plan_pro_feat_4"),
        t("pricing_plan_pro_feat_5"),
      ],
      cta: t("pricing_plan_pro_cta"),
      current: false,
      highlighted: false,
      badge: undefined as string | undefined,
    }

    const business = {
      id: "business" as const,
      name: t("pricing_plan_business_name"),
      price:
        billing === "yearly"
          ? t("pricing_plan_business_price_yearly")
          : t("pricing_plan_business_price_monthly"),
      period: t("pricing_plan_business_period"),
      description: t("pricing_plan_business_desc"),
      features: [
        t("pricing_plan_business_feat_1"),
        t("pricing_plan_business_feat_2"),
        t("pricing_plan_business_feat_3"),
        t("pricing_plan_business_feat_4"),
        t("pricing_plan_business_feat_5"),
      ],
      cta: t("pricing_plan_business_cta"),
      current: false,
      highlighted: true,
      badge: t("pricing_recommended_badge"),
    }

    return [exploration, pro, business]
  }, [billing, t])

  const faqs = useMemo(
    () =>
      (faqIds as readonly FaqId[]).map((id) => ({
        id,
        q: t(`pricing_faq_q${id}` as any),
        a: t(`pricing_faq_a${id}` as any),
      })),
    [t],
  )

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
      </div>

      {/* Billing toggle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              billing === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {t("pricing_billing_monthly")}
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              billing === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {t("pricing_billing_yearly")}{" "}
            <span
              className={cn(
                "ml-1 rounded-full px-2 py-0.5 text-xs",
                billing === "yearly"
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-500/15 text-emerald-300"
              )}
            >
              {t("pricing_discount_badge")}
            </span>
          </button>
        </div>
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
            {plan.badge && (
              <div className="absolute right-4 top-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-medium text-white">
                  <Sparkles className="h-3 w-3" />
                  {plan.badge}
                </span>
              </div>
            )}

            {/* Plan Header */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-foreground">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              {billing === "yearly" && plan.id !== "exploration" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("pricing_yearly_note")}
                </p>
              ) : null}
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
