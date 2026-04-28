"use client";

import { ArrowRight, Boxes, ExternalLink, Sparkles, Terminal } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REPO_URL = "https://github.com/gosgconsulting/lovable-cms";
const PUCK_DEMO_URL = "https://demo.puckeditor.com/edit";

type Status = {
  cloned: boolean;
  packageName: string | null;
  packageDescription: string | null;
};

export function BuildBoxPanel({ className }: { className?: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/box/status", { cache: "no-store" });
        if (!res.ok) throw new Error("status");
        const data = (await res.json()) as Status;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) {
          setError(true);
          setStatus({ cloned: false, packageName: null, packageDescription: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cloneCmd = "git clone --depth 1 https://github.com/gosgconsulting/lovable-cms.git lovable-cms";

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-border bg-background p-4 sm:p-6 ${className ?? ""}`}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Boxes className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">{t("build_box_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("build_box_intro")}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{t("build_box_status_error")}</p> : null}

      {status?.cloned ? (
        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium text-emerald-800 dark:text-emerald-200">{t("build_box_cloned_ok")}</p>
          {status.packageName ? (
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground/90">{status.packageName}</span>
              {status.packageDescription ? ` — ${status.packageDescription}` : null}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            {t("build_box_path_hint")} <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">lovable-cms/</code>
          </p>
          <p className="text-xs text-muted-foreground">{t("build_box_dev_hint")}</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">{t("build_box_not_cloned")}</p>
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 font-mono text-xs text-foreground sm:text-sm">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <code className="min-w-0 break-all whitespace-pre-wrap">{cloneCmd}</code>
          </div>
          <p className="text-xs text-muted-foreground">{t("build_box_after_clone")}</p>
        </div>
      )}

      <div className="mt-6 space-y-3 rounded-xl border border-border bg-muted/15 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{t("build_box_page_role")}</p>
        <p className="text-sm font-semibold text-foreground">{t("build_box_next_title")}</p>
        <ul className="grid gap-2 sm:grid-cols-1 sm:gap-3">
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

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/docs" className="underline underline-offset-2 hover:text-foreground">
          {t("sidebar_popover_docs")}
        </Link>
      </p>
    </div>
  );
}
