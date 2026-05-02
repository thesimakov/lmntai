"use client";

import Link from "next/link";
import { useId } from "react";

import { useI18n } from "@/components/i18n-provider";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

type LemnityStudioBadgeProps = {
  className?: string;
};

/**
 * Плавающий шильдик «Сделано на Лемнити» (как у Lovable): только для тарифов с обязательным брендингом;
 * без кнопки закрытия — снятие через Pro или разовую оплату в настройках.
 */
export function LemnityStudioBadge({ className }: LemnityStudioBadgeProps) {
  const { t } = useI18n();
  const gradId = `lsb-h-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <Link
      href={SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("build_studio_badge_aria")}
      className={cn(
        "inline-flex max-w-[min(100%,14rem)] items-center gap-1 rounded-full border border-white/10 bg-[#1a1a1a] px-2 py-1 text-xs shadow-md transition-opacity hover:opacity-95",
        className
      )}
    >
      <span className="shrink-0 text-[var(--tw-ring-offset-color)]">
        {t("build_studio_badge_prefix")}
      </span>
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fb923c" />
            <stop offset="0.45" stopColor="#e879f9" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <path
          d="M12 21s-6.716-4.38-9-8.5C.5 9.5 2 6 6 6c2.5 0 4 2 6 4 2-2 3.5-4 6-4 4 0 5.5 3.5 3 6.5C18.716 16.62 12 21 12 21Z"
          fill={`url(#${gradId})`}
        />
      </svg>
      <span className="font-semibold text-white">{t("build_studio_badge_brand")}</span>
    </Link>
  );
}
