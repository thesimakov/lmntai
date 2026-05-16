"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Trend = "up" | "down" | "neutral";

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
} as const;

const TREND_COLOR = {
  up: "text-green-500",
  down: "text-red-500",
  neutral: "text-muted-foreground",
} as const;

const TREND_DOT = {
  up: "bg-green-500",
  down: "bg-red-500",
  neutral: "bg-muted-foreground",
} as const;

const TREND_I18N_KEY = {
  up: "marketing_bi_trend_up",
  down: "marketing_bi_trend_down",
  neutral: "marketing_bi_trend_neutral",
} as const;

interface MarketingTrendBadgeProps {
  trend: Trend;
  /** Colored dot before the icon (channel cards). */
  showDot?: boolean;
  /** Extra text after the icon, e.g. KPI change %. */
  suffix?: string;
}

export function MarketingTrendBadge({ trend, showDot = false, suffix }: MarketingTrendBadgeProps) {
  const { t } = useI18n();
  const Icon = TREND_ICON[trend];
  const tooltipText = suffix ? `${t(TREND_I18N_KEY[trend])} · ${suffix}` : t(TREND_I18N_KEY[trend]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold shrink-0",
              "cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              TREND_COLOR[trend]
            )}
            tabIndex={0}
            aria-label={tooltipText}
          >
            {showDot && (
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", TREND_DOT[trend])} aria-hidden />
            )}
            <Icon className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {suffix ? <span className="tabular-nums">{suffix}</span> : null}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
