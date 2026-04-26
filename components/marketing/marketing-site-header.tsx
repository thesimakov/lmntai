"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languageLabel, type UiLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LANG_OPTIONS: readonly UiLanguage[] = ["ru", "en", "tg"] as const;

/** Шапка лендинга и публичных страниц «Тарифы» / «Документация». */
export function MarketingSiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { data: session, status } = useSession();
  const authed = status === "authenticated" && Boolean(session);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-[#f4f4f3]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-w.svg"
            alt="Lemnity"
            width={128}
            height={32}
            className="h-7 w-auto brightness-0"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
          <Link href="/#hero-input" className="transition hover:text-foreground">
            {t("landing_simple_nav_product")}
          </Link>
          <Link href="/plans" className="transition hover:text-foreground">
            {t("landing_simple_nav_pricing")}
          </Link>
          <Link href="/docs" className="transition hover:text-foreground">
            {t("landing_simple_nav_docs")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Select value={lang} onValueChange={(v) => setLang(v as UiLanguage)}>
            <SelectTrigger
              size="sm"
              className={cn(
                "h-7 w-[7.75rem] shrink-0 rounded-full border-zinc-200/90 bg-white/80 pl-2 pr-1.5 text-left text-[11px] font-medium leading-none text-zinc-800 shadow-sm ring-1 ring-black/5 backdrop-blur-sm",
                "hover:bg-white data-[state=open]:ring-zinc-300/80 sm:h-8 sm:w-[8.25rem] sm:text-xs",
                "focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-200/90",
                "[&_svg]:size-3.5 [&_svg]:opacity-55",
              )}
              aria-label={t("marketing_header_lang_group")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="end"
              position="popper"
              sideOffset={6}
              className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] rounded-lg border-zinc-200/90 p-0.5 shadow-lg"
            >
              {LANG_OPTIONS.map((code) => (
                <SelectItem
                  key={code}
                  value={code}
                  className="cursor-pointer rounded-md py-1.5 pl-2 pr-7 text-xs data-[highlighted]:bg-zinc-100"
                >
                  {languageLabel[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {authed ? (
            <Button asChild size="sm" className="rounded-full px-5">
              <Link href="/playground">{t("landing_open_dashboard")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-full bg-zinc-900 px-5 text-white hover:bg-zinc-800">
              <Link href="/login">{t("landing_login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
