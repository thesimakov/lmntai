"use client";

import { Check, Circle, Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import type { StreamStep } from "@/types/build-stream";

type BuildStreamStepsProps = {
  steps: StreamStep[];
  toolLine: string | null;
  className?: string;
};

const pillBase =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border border-stone-200/90 bg-stone-100/95 px-2.5 py-1 text-[11px] font-medium leading-none text-stone-600 shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:border-zinc-600/80 dark:bg-zinc-800/90 dark:text-zinc-300 dark:shadow-none";

function StepStatusPill({ status }: { status: StreamStep["status"] }) {
  const { t } = useI18n();
  if (status === "completed") {
    return (
      <div className={pillBase} role="status">
        <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden />
        <span>{t("build_stream_pill_done")}</span>
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className={pillBase} role="status">
        <Loader2
          className="h-3 w-3 shrink-0 animate-spin text-sky-600 dark:text-sky-400"
          strokeWidth={2.2}
          aria-hidden
        />
        <span>{t("build_stream_pill_running")}</span>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div
        className={cn(
          pillBase,
          "border-rose-200/90 bg-rose-50/95 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200/90"
        )}
        role="status"
      >
        <XCircle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={2.2} aria-hidden />
        <span>{t("build_stream_pill_failed")}</span>
      </div>
    );
  }
  return (
    <div className={pillBase} role="status">
      <Circle className="h-3 w-3 shrink-0 text-stone-400 dark:text-zinc-500" strokeWidth={2} aria-hidden />
      <span>{t("build_stream_pill_pending")}</span>
    </div>
  );
}

export function BuildStreamSteps({ steps, toolLine, className }: BuildStreamStepsProps) {
  const { t } = useI18n();
  if (!steps.length && !toolLine) {
    return (
      <div className={cn("shrink-0 text-xs text-muted-foreground", className)}>{t("build_stream_empty_hint")}</div>
    );
  }

  return (
    <div className={cn("bg-transparent", className)}>
      <div
        className="max-h-[min(40vh,320px)] space-y-4 overflow-y-auto pr-0.5"
        role="log"
        aria-label={t("build_stream_aria_log")}
        aria-live="polite"
        aria-relevant="additions"
      >
        {steps.map((s, index) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.24) }}
            className="space-y-1.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.id}</p>
            <p className="text-sm leading-relaxed text-foreground/95">{s.description}</p>
            <StepStatusPill status={s.status} />
          </motion.div>
        ))}

        {toolLine ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("build_stream_tool_activity")}
            </p>
            <p className="break-words font-mono text-[13px] leading-relaxed text-foreground/95">{toolLine}</p>
            {toolLine.trimStart().startsWith("✓") ? (
              <div className={pillBase} role="status">
                <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden />
                <span>{t("build_stream_pill_done")}</span>
              </div>
            ) : (
              <div className={pillBase} role="status">
                <Loader2
                  className="h-3 w-3 shrink-0 animate-spin text-sky-600 dark:text-sky-400"
                  strokeWidth={2.2}
                  aria-hidden
                />
                <span>{t("build_stream_pill_running")}</span>
              </div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
