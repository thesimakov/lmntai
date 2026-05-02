"use client";

import { LayoutTemplate } from "lucide-react";

import { cn } from "@/lib/utils";

/** Статические превью в `public/build-templates/` (по slug шаблона). */
export const PREVIEW_SRC_BY_SLUG: Partial<Record<string, string>> = {
  massage: "/build-templates/massage.png",
  "it-startup": "/build-templates/it-startup.jpg",
  "lead-pr-sales": "/build-templates/lead-pr-sales.png",
  "web-studio": "/build-templates/web-studio.png"
};

/** Детерминированный градиент по строке — для slug без своей картинки или произвольного текста. */
export function previewGradientFromSeed(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i);
  const u = h >>> 0;
  const h1 = u % 360;
  const h2 = (u * 7 + 140) % 360;
  const h3 = (u * 13 + 260) % 360;
  return `linear-gradient(135deg, hsl(${h1} 42% 24%) 0%, hsl(${h2} 48% 18%) 45%, hsl(${h3} 36% 12%) 100%)`;
}

export type BuildTemplateThumbnailProps = {
  /** Если задан и есть файл в PREVIEW_SRC_BY_SLUG — показываем картинку. */
  slug?: string | null;
  /** Когда slug нет (или нужен альтернативный ключ) — градиент от этой строки. */
  fallbackSeed?: string | null;
  className?: string;
  /** Компактный ряд («Недавние», меню) — те же элементы, чуть компактнее. */
  density?: "card" | "compact";
};

/**
 * То же превью, что и у карточки шаблона в каталоге: картинка из public или фирменный градиент.
 */
export function BuildTemplateThumbnail({
  slug,
  fallbackSeed,
  className,
  density = "card"
}: BuildTemplateThumbnailProps) {
  const slugKey = typeof slug === "string" ? slug.trim() : "";
  const previewSrc = slugKey.length > 0 ? PREVIEW_SRC_BY_SLUG[slugKey] : undefined;
  const seed =
    slugKey ||
    (typeof fallbackSeed === "string" && fallbackSeed.trim() ? fallbackSeed.trim() : null) ||
    "default";

  const isCompact = density === "compact";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border bg-muted/30 shadow-inner",
        isCompact ? "h-full min-h-0 rounded-lg border-0 bg-muted/20 shadow-none" : "aspect-[16/10]",
        className
      )}
      style={previewSrc ? undefined : { background: previewGradientFromSeed(seed) }}
      aria-hidden
    >
      {previewSrc ? (
        <img
          src={previewSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          aria-hidden
          style={{
            backgroundImage: `repeating-linear-gradient(
            -12deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.04) 2px,
            rgba(0,0,0,0.04) 3px
          )`
          }}
        />
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          previewSrc
            ? "bg-gradient-to-t from-black/30 via-black/5 to-transparent"
            : "bg-gradient-to-t from-black/20 via-transparent to-white/30"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute rounded-lg border border-border/50 bg-background/90 shadow-sm backdrop-blur-sm dark:bg-zinc-900/80",
          isCompact ? "right-1 top-1 p-1" : "right-2 top-2 p-1.5"
        )}
      >
        <LayoutTemplate
          className={cn(
            "text-sky-600",
            isCompact ? "h-3 w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}
