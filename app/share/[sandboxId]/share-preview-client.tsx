"use client";

import { LemnityStudioBadge } from "@/components/playground/lemnity-studio-badge";

type SharePreviewClientProps = {
  sandboxId?: string;
  /** Согласно тарифу и настройкам владельца */
  showLemnityBranding: boolean;
  /** Шапка с подписью «Публичное превью» (на поддомене *.lemnity.com скрыта — это уже опубликованный сайт). */
  showPublicPreviewHeader?: boolean;
};

/** Публичная оболочка превью: iframe на /api/sandbox + шильдик Lemnity (не в редакторе студии). */
export function SharePreviewClient({
  sandboxId,
  showLemnityBranding,
  showPublicPreviewHeader = true
}: SharePreviewClientProps) {
  const src = sandboxId ? `/api/sandbox/${encodeURIComponent(sandboxId)}` : "/api/sandbox";
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background">
      {showPublicPreviewHeader ? (
        <header className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:flex-row sm:gap-2 sm:px-4">
          <span className="truncate text-center text-sm font-semibold text-foreground" title="Просмотр черновика">
            Просмотр
          </span>
          <span className="truncate text-center text-xs text-muted-foreground" title="Публичное превью песочницы">
            Публичное превью · черновик
          </span>
        </header>
      ) : null}
      <div className="relative min-h-0 flex-1">
        <iframe
          title="Превью"
          className="absolute inset-0 h-full w-full border-0"
          src={src}
          sandbox="allow-scripts allow-same-origin"
        />
        {showLemnityBranding ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 sm:bottom-4 sm:right-4">
            <LemnityStudioBadge className="pointer-events-auto shadow-black/40" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
