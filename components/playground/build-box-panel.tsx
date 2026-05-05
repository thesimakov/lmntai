"use client";

import { ArrowRight, ExternalLink, Layers, Sparkles } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PUCK_DEMO_URL = "https://demo.puckeditor.com/edit";

export function BuildBoxPanel({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-auto rounded-xl border border-border bg-background p-4 sm:p-6",
        className ?? ""
      )}
    >
      <div className="flex shrink-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Layers className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">{t("build_box_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("build_box_intro")}</p>
        </div>
      </div>

      <Link
        href="/playground/box/editor"
        className={cn(
          "group flex shrink-0 items-start gap-3 rounded-xl border-2 border-primary/35 bg-primary/5 p-4 transition-colors",
          "hover:border-primary/55 hover:bg-primary/10"
        )}
      >
        <Layers className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-base font-semibold text-foreground">
            {t("build_box_cta_editor")}
            <ArrowRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">{t("build_box_cta_editor_sub")}</span>
        </span>
      </Link>

      <div className="space-y-3 rounded-xl border border-border bg-muted/15 p-4 sm:p-5">
        <p className="text-sm font-semibold text-foreground">{t("build_box_next_title")}</p>
        <ul className="grid gap-2 sm:gap-3">
          <li>
            <Link
              href="/playground/build"
              className={cn(
                "group flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors",
                "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  {t("build_box_cta_studio")}
                  <ArrowRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t("build_box_cta_studio_sub")}</span>
              </span>
            </Link>
          </li>
          <li>
            <a
              href={PUCK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors",
                "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  {t("build_box_cta_demo")}
                  <ArrowRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t("build_box_cta_demo_sub")}</span>
              </span>
            </a>
          </li>
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <Button variant="link" className="h-auto p-0 text-xs font-normal" asChild>
          <Link href="/docs">{t("sidebar_popover_docs")}</Link>
        </Button>
      </p>
    </div>
  );
}
