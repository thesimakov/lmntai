"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { SITE_URL } from "@/lib/site";

type SharePreviewClientProps = {
  sandboxId: string;
  /** Согласно тарифу и настройкам владельца */
  showLemnityBranding: boolean;
};

/** Публичная оболочка превью: iframe на /api/sandbox. */
export function SharePreviewClient({ sandboxId, showLemnityBranding }: SharePreviewClientProps) {
  const { t } = useI18n();
  const src = `/api/sandbox/${encodeURIComponent(sandboxId)}`;
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-center border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4">
        <span className="truncate text-center text-sm text-muted-foreground" title="Публичное превью">
          Публичное превью
        </span>
      </header>
      <iframe title="Превью" className="min-h-0 w-full flex-1 border-0" src={src} sandbox="allow-scripts allow-same-origin" />
      {showLemnityBranding ? (
        <footer className="flex shrink-0 items-center justify-center border-t border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4">
          <Link
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground hover:underline"
          >
            {t("build_preview_footer_made_on")}
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
