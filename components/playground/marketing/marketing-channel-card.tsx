"use client";

import { cn } from "@/lib/utils";
import type { MarketingChannel } from "@/lib/marketing-schema";

const TREND_COLOR = {
  up: "text-green-500",
  down: "text-red-500",
  neutral: "text-muted-foreground",
};

const TREND_DOT_COLOR = {
  up: "bg-green-500",
  down: "bg-red-500",
  neutral: "bg-muted-foreground",
};

const TREND_LABEL = {
  up: "↑",
  down: "↓",
  neutral: "—",
};

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function MarketingChannelCard({ channel }: { channel: MarketingChannel }) {
  const { name, trend, spend, revenue, kpis, narrative } = channel;
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate">{name}</span>
        <div className={cn("flex items-center gap-1.5 text-xs font-medium shrink-0", TREND_COLOR[trend])}>
          <span className={cn("w-2 h-2 rounded-full", TREND_DOT_COLOR[trend])} />
          {TREND_LABEL[trend]}
        </div>
      </div>

      {(spend != null || revenue != null) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {spend != null && (
            <span>Spend: <span className="font-medium text-foreground">{formatNumber(spend)}</span></span>
          )}
          {revenue != null && (
            <span>Revenue: <span className="font-medium text-foreground">{formatNumber(revenue)}</span></span>
          )}
        </div>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {kpis.slice(0, 4).map((kpi) => (
            <div key={kpi.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground truncate">{kpi.label}</span>
              <span className="font-medium ml-2 shrink-0">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{narrative}</p>
    </div>
  );
}
