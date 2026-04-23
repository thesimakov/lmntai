"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/** Шапка лендинга и публичных страниц «Тарифы» / «Документация». */
export function MarketingSiteHeader() {
  const { t } = useI18n();
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
          <Link href="/pricing" className="transition hover:text-foreground">
            {t("landing_simple_nav_pricing")}
          </Link>
          <Link href="/docs" className="transition hover:text-foreground">
            {t("landing_simple_nav_docs")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {authed ? (
            <Button asChild size="sm" className="rounded-full px-5">
              <Link href="/playground">{t("landing_open_dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full text-zinc-700">
                <Link href="/login">{t("landing_login")}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full bg-zinc-900 px-5 text-white hover:bg-zinc-800">
                <Link href="/login">{t("landing_simple_nav_cta")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
