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
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[15px] font-semibold leading-snug">{name}</span>
        <MarketingTrendBadge trend={trend} showDot />
      </div>

      {(spend != null || revenue != null) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-muted-foreground">
          {spend != null && (
            <span>
              {t("marketing_bi_spend_label")}:{" "}
              <span className="font-medium text-foreground">{formatLocalizedNumber(spend)}</span>
            </span>
          )}
          {revenue != null && (
            <span>
              {t("marketing_bi_revenue_label")}:{" "}
              <span className="font-medium text-foreground">{formatLocalizedNumber(revenue)}</span>
            </span>
          )}
        </div>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {kpis.slice(0, 4).map((kpi) => (
            <div key={kpi.label} className="flex justify-between gap-2 text-[15px]">
              <span className="truncate text-muted-foreground">
                {localizeMarketingKpiLabel(kpi.label, lang)}
              </span>
              <span className="ml-2 shrink-0 font-medium">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      <p className="line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">{narrative}</p>
    </div>
  );
}
