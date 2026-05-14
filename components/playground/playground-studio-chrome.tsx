"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { PlaygroundStudioProfileMenu } from "@/components/playground/playground-studio-profile-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PlaygroundStudioChromeProps = {
  /** Основной заголовок слева; можно не передавать — блок скрывается */
  segmentLabel?: ReactNode | null;
  contextLine?: ReactNode | null;
  backHref?: string | null;
  backLabel?: string;
  /** Контент между заголовком слева и блоком профиля (поиск в CMS, puck.json и т.д.), прижат к правому краю полосы. */
  centerSlot?: ReactNode;
  endSlot?: ReactNode;
  className?: string;
};

export function PlaygroundStudioChrome({
  segmentLabel,
  contextLine,
  backHref,
  backLabel = "Назад",
  centerSlot,
  endSlot,
  className,
}: PlaygroundStudioChromeProps) {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border bg-white px-3 text-foreground md:flex-nowrap md:gap-x-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-[1_1_auto] flex-wrap items-center gap-x-1.5 gap-y-2 md:flex-nowrap md:gap-x-2">
        {backHref ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-fit shrink-0 gap-1.5 px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        {segmentLabel || contextLine ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {segmentLabel ? (
              <span className="text-sm font-semibold leading-tight">{segmentLabel}</span>
            ) : null}
            {contextLine ? (
              <span className="min-w-0 max-w-[min(42vw,16rem)] truncate text-sm text-muted-foreground sm:max-w-[20rem]">
                {contextLine}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-h-[2rem] min-w-0 items-center justify-end overflow-hidden",
          centerSlot ? "order-last w-full flex-[1_1_280px] md:order-none md:w-auto md:flex-1 md:max-w-xl" : "flex-1",
        )}
      >
        {centerSlot ? (
          <div className="relative w-full min-w-0 max-w-xl md:mx-auto md:pr-2 lg:mx-0 lg:ml-auto">{centerSlot}</div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:order-none">
        {endSlot}
        <PlaygroundStudioProfileMenu />
      </div>
    </header>
  );
}
