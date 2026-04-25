"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import type { StreamStep } from "@/types/build-stream";

type BuildStreamStepsProps = {
  steps: StreamStep[];
  toolLine: string | null;
  className?: string;
};

export function BuildStreamSteps({ steps, toolLine, className }: BuildStreamStepsProps) {
  const { t } = useI18n();
  if (!steps.length && !toolLine) {
    return (
      <div
        className={cn("shrink-0 bg-muted/10 px-3 py-2 text-xs text-muted-foreground", className)}
      >
        {t("build_stream_empty_hint")}
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/15", className)}>
      <ul className="max-h-[min(40vh,280px)] overflow-y-auto px-3 py-2 text-xs">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2 py-0.5 text-foreground/90">
            {s.status === "completed" ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
            ) : s.status === "running" ? (
              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
            ) : s.status === "failed" ? (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{s.id}</span>{" "}
              {s.description}
            </span>
          </li>
        ))}
      </ul>
      {toolLine ? (
        <div className="bg-muted/20 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          {toolLine}
        </div>
      ) : null}
    </div>
  );
}
