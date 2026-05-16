"use client";

import { useI18n } from "@/components/i18n-provider";
import type { MarketingChannel } from "@/lib/marketing-schema";
import { localizeMarketingKpiLabel } from "@/lib/marketing-dashboard-localization";
import { MarketingTrendBadge } from "./marketing-trend-badge";

export function MarketingChannelCard({ channel }: { channel: MarketingChannel }) {
  const { t, lang } = useI18n();
  const { name, trend, spend, revenue, kpis, narrative } = channel;
  const locale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU";
  const formatLocalizedNumber = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 0 });
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate">{name}</span>
        <MarketingTrendBadge trend={trend} showDot />
      </div>

      {(spend != null || revenue != null) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {spend != null && (
            <span>{t("marketing_bi_spend_label")}: <span className="font-medium text-foreground">{formatLocalizedNumber(spend)}</span></span>
          )}
          {revenue != null && (
            <span>{t("marketing_bi_revenue_label")}: <span className="font-medium text-foreground">{formatLocalizedNumber(revenue)}</span></span>
          )}
        </div>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {kpis.slice(0, 4).map((kpi) => (
            <div key={kpi.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground truncate">{localizeMarketingKpiLabel(kpi.label, lang)}</span>
              <span className="font-medium ml-2 shrink-0">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{narrative}</p>
    </div>
  );
}
