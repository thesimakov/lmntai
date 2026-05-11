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
        "flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-white/20 bg-[#0061FF] px-4 py-3 text-white shadow-sm md:flex-nowrap md:gap-x-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-[1_1_auto] flex-wrap items-center gap-x-2 gap-y-2 md:flex-nowrap md:gap-x-3">
        {backHref ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-fit shrink-0 gap-2 px-2 text-white hover:bg-white/15 hover:text-white"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        {segmentLabel || contextLine ? (
          <div className="flex min-w-0 items-center gap-2">
            {segmentLabel ? (
              <span className="text-[18px] font-semibold leading-tight tracking-tight">{segmentLabel}</span>
            ) : null}
            {contextLine ? (
              <span className="min-w-0 max-w-[min(42vw,16rem)] truncate text-[18px] font-medium leading-tight text-white/90 sm:max-w-[20rem]">
                {contextLine}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-h-[2.25rem] min-w-0 items-center justify-end overflow-hidden",
          centerSlot ? "order-last w-full flex-[1_1_280px] md:order-none md:w-auto md:flex-1 md:max-w-xl" : "flex-1",
        )}
      >
        {centerSlot ? (
          <div className="relative w-full min-w-0 max-w-xl md:mx-auto md:pr-2 lg:mx-0 lg:ml-auto">{centerSlot}</div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:order-none">
        {endSlot}
        <PlaygroundStudioProfileMenu />
      </div>
    </header>
  );
}
