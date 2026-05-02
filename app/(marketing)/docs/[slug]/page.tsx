"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { getMarketingDocSection, isMarketingDocSlug } from "@/lib/marketing-docs-sections";

export default function PublicDocSectionPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { t } = useI18n();

  if (!isMarketingDocSlug(slug)) {
    notFound();
  }

  const section = getMarketingDocSection(slug);
  if (!section) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-2xl">
      <p className="mb-6">
        <Link
          href="/docs"
          className="text-sm font-medium text-blue-600 transition hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t("marketing_docs_back")}
        </Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
        {t(section.labelKey)}
      </h1>
      <div className="mt-8 rounded-xl border border-zinc-200/80 bg-white/60 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{t(section.bodyKey)}</p>
      </div>
    </article>
  );
}
