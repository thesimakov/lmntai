"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import {
  marketingTableToChartPoints,
  parseMarketingChatMarkdown,
  stripInlineMarkdown,
  type MarketingChatMarkdownBlock,
} from "@/lib/marketing-chat-markdown";

const CHART_COLOR = "#3D7FA6";
const CHART_FONT_SIZE = 15;

function formatCompact(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function InlineText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const bold = /^\*\*(.+)\*\*$/.exec(part);
        if (bold) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {bold[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function InsightTable({
  headers,
  rows,
  locale,
  chartTitle,
}: {
  headers: string[];
  rows: string[][];
  locale: string;
  chartTitle: string;
}) {
  const chartPoints = useMemo(
    () => marketingTableToChartPoints(headers, rows),
    [headers, rows]
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[320px] border-collapse text-left text-[15px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold text-foreground">
                  {stripInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/60 last:border-0">
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-2.5 text-muted-foreground">
                    <InlineText text={row[ci] ?? ""} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chartPoints ? (
        <div className="rounded-lg border border-border/70 bg-gradient-to-b from-white to-zinc-50/80 p-4">
          <p className="mb-3 text-[15px] font-semibold text-foreground">{chartTitle}</p>
          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartPoints} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E4E4E7" strokeDasharray="4 6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: CHART_FONT_SIZE, fill: "#71717A" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={chartPoints.length > 3 ? -18 : 0}
                  textAnchor={chartPoints.length > 3 ? "end" : "middle"}
                  height={chartPoints.length > 3 ? 56 : 32}
                />
                <YAxis
                  tick={{ fontSize: CHART_FONT_SIZE, fill: "#71717A" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(Number(v), locale)}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E4E4E7",
                    fontSize: CHART_FONT_SIZE,
                  }}
                  formatter={(value: number) => [
                    Number(value).toLocaleString(locale, { maximumFractionDigits: 0 }),
                    chartTitle,
                  ]}
                />
                <Bar dataKey="value" fill={CHART_COLOR} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BlockView({
  block,
  locale,
  chartTitle,
}: {
  block: MarketingChatMarkdownBlock;
  locale: string;
  chartTitle: string;
}) {
  switch (block.type) {
    case "heading":
      if (block.level === 1) {
        return (
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            <InlineText text={block.text} />
          </h2>
        );
      }
      if (block.level === 2) {
        return (
          <h3 className="text-lg font-semibold text-foreground">
            <InlineText text={block.text} />
          </h3>
        );
      }
      return (
        <h4 className="text-[15px] font-semibold text-foreground">
          <InlineText text={block.text} />
        </h4>
      );
    case "paragraph":
      return (
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          <InlineText text={block.text} />
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-muted-foreground">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-muted-foreground">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              <InlineText text={item} />
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <InsightTable
          headers={block.headers}
          rows={block.rows}
          locale={locale}
          chartTitle={chartTitle}
        />
      );
    case "hr":
      return <hr className="border-border/80" />;
    default:
      return null;
  }
}

interface Props {
  content: string;
  isStreaming?: boolean;
  userQuestion?: string;
}

export function MarketingChatInsight({ content, isStreaming, userQuestion }: Props) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU";
  const blocks = useMemo(() => parseMarketingChatMarkdown(content), [content]);
  const chartTitle = t("marketing_bi_chat_chart_from_table");

  if (!content.trim() && !isStreaming) return null;

  return (
    <section
      className="rounded-xl border border-emerald-200/60 bg-white p-5 shadow-sm dark:border-emerald-900/40"
      aria-live="polite"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100">
          <Bot className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-foreground">{t("marketing_bi_chat_insight_title")}</h2>
          {userQuestion ? (
            <p className="truncate text-[15px] text-muted-foreground">{userQuestion}</p>
          ) : null}
        </div>
        {isStreaming ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      <div className={cn("space-y-4", isStreaming && "opacity-90")}>
        {blocks.length > 0 ? (
          blocks.map((block, i) => (
            <BlockView key={i} block={block} locale={locale} chartTitle={chartTitle} />
          ))
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
            {content}
            {isStreaming ? <span className="ml-0.5 animate-pulse">▋</span> : null}
          </p>
        )}
        {isStreaming && blocks.length > 0 ? (
          <span className="inline-block h-4 w-px animate-pulse bg-foreground/50" aria-hidden />
        ) : null}
      </div>
    </section>
  );
}
