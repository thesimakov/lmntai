"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { MARKETING_DOCS_SECTIONS } from "@/lib/marketing-docs-sections";

export default function PublicDocsIndexPage() {
  const { t } = useI18n();

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
        {t("marketing_docs_page_title")}
      </h1>
      <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">{t("marketing_docs_lead")}</p>

      <nav className="mt-10" aria-label={t("marketing_docs_page_title")}>
        <ul className="flex flex-col gap-2">
          {MARKETING_DOCS_SECTIONS.map((section) => (
            <li key={section.slug}>
              <Link
                href={`/docs/${section.slug}`}
                className="block rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3.5 text-base font-medium text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/80"
              >
                {t(section.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
