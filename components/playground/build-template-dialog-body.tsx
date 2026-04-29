"use client";

import { Check, Loader2 } from "lucide-react";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuildTemplateThumbnail } from "@/components/playground/build-template-thumbnail";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type BuildTemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  defaultUserPrompt: string;
};

/** Короткая строка «категория» по описанию (до «:» или усечение). */
function categoryFromDescription(description: string): string {
  const t = description.trim();
  if (!t) return "";
  const i = t.indexOf(":");
  if (i > 0) return t.slice(0, i).trim();
  if (t.length > 64) return `${t.slice(0, 64).trimEnd()}…`;
  return t;
}

function TemplateCardPreview({ slug }: { slug: string }) {
  return <BuildTemplateThumbnail slug={slug} />;
}

export type BuildTemplateCatalogGridProps = {
  t: (key: MessageKey) => string;
  templateListLoading: boolean;
  templateList: BuildTemplateRow[];
  selectedSlug: string | null;
  onPick: (row: BuildTemplateRow) => void;
  /** Tailwind grid classes, e.g. `sm:grid-cols-2` for narrow panels */
  gridClassName?: string;
  /** Outer scroll/list wrapper (padding, max-height) */
  className?: string;
  dataSlot?: string;
};

export function BuildTemplateCatalogGrid({
  t,
  templateListLoading,
  templateList,
  selectedSlug,
  onPick,
  gridClassName = "grid-cols-1 content-start items-start gap-3 sm:grid-cols-3 sm:gap-4",
  className,
  dataSlot
}: BuildTemplateCatalogGridProps) {
  return (
    <div
      className={cn(
        "min-h-0 w-full max-w-full touch-pan-y overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]",
        className
      )}
      data-slot={dataSlot}
    >
      {templateListLoading ? (
        <div
          className="flex min-h-[140px] flex-col items-center justify-center gap-4 py-8"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="h-14 w-14 shrink-0 animate-spin text-sky-600 dark:text-sky-400"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-center text-base text-muted-foreground">{t("build_template_list_loading")}</p>
        </div>
      ) : null}

      <div className={cn("grid", gridClassName)}>
        {templateList.map((row) => {
          const selected = selectedSlug === row.slug;
          const category = categoryFromDescription(row.description);
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onPick(row)}
              className={cn(
                "group flex min-w-0 flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
                selected
                  ? "border-sky-500/70 bg-sky-50 ring-1 ring-sky-200/90 dark:border-sky-500/50 dark:bg-sky-950/30 dark:ring-sky-800/50"
                  : "border-border bg-card hover:border-sky-200/80 hover:bg-muted/50 dark:hover:border-slate-600"
              )}
            >
              <div className="relative p-1.5 sm:p-2">
                <TemplateCardPreview slug={row.slug} />
                {selected ? (
                  <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white shadow-md sm:right-4 sm:top-4">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 space-y-1 px-3 pb-3.5 pt-0 sm:px-3.5 sm:pb-4">
                <span
                  className={cn(
                    "block text-sm font-semibold sm:text-base",
                    selected ? "text-sky-800 dark:text-sky-200" : "text-foreground"
                  )}
                >
                  {row.name}
                </span>
                <div className="min-w-0 text-[11px] text-muted-foreground sm:text-xs">
                  <span className="block text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">
                    {t("build_template_card_category_label")}
                  </span>
                  {category ? (
                    <p className="mt-0.5 line-clamp-2 text-muted-foreground/90">{category}</p>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type BuildTemplateDialogBodyProps = {
  t: (key: MessageKey) => string;
  templateListLoading: boolean;
  templateList: BuildTemplateRow[];
  buildTemplate: { slug: string; name: string } | null;
  onPick: (row: BuildTemplateRow) => void;
};

export function BuildTemplateDialogBody({
  t,
  templateListLoading,
  templateList,
  buildTemplate,
  onPick
}: BuildTemplateDialogBodyProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 space-y-1 border-b border-border bg-background px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
        <DialogTitle className="text-balance text-left text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("build_template_dialog_headline")}
        </DialogTitle>
        <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {t("build_template_dialog_subhead")}
        </DialogDescription>
      </DialogHeader>

      <BuildTemplateCatalogGrid
        t={t}
        templateListLoading={templateListLoading}
        templateList={templateList}
        selectedSlug={buildTemplate?.slug ?? null}
        onPick={onPick}
        className="min-h-0 w-full max-h-full flex-1 overflow-y-auto scroll-smooth py-4 sm:px-6 sm:py-5 px-4"
        dataSlot="build-template-dialog-scroll"
      />
    </div>
  );
}
