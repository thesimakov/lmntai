"use client";

import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";

export default function PublicDocsPage() {
  const { t } = useI18n();

  const blocks: { h: MessageKey; p: MessageKey }[] = [
    { h: "marketing_docs_s1", p: "marketing_docs_s1p" },
    { h: "marketing_docs_s2", p: "marketing_docs_s2p" },
    { h: "marketing_docs_s3", p: "marketing_docs_s3p" }
  ];

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        {t("marketing_docs_page_title")}
      </h1>
      <p className="mt-3 text-lg text-zinc-600">{t("marketing_docs_lead")}</p>
      <div className="mt-10 space-y-10">
        {blocks.map((b) => (
          <section key={b.h}>
            <h2 className="text-lg font-medium text-zinc-900">{t(b.h)}</h2>
            <p className="mt-2 text-base leading-relaxed text-zinc-600">{t(b.p)}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
