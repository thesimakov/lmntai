import type { MessageKey } from "@/lib/i18n";

export type MarketingDocSlug = "about" | "offer" | "privacy" | "marketing";

export const MARKETING_DOCS_SECTIONS: Array<{
  slug: MarketingDocSlug;
  labelKey: MessageKey;
  bodyKey: MessageKey;
}> = [
  { slug: "about", labelKey: "marketing_docs_tab_about", bodyKey: "marketing_docs_about_body" },
  { slug: "offer", labelKey: "marketing_docs_tab_offer", bodyKey: "marketing_docs_offer_body" },
  { slug: "privacy", labelKey: "marketing_docs_tab_privacy", bodyKey: "marketing_docs_privacy_body" },
  { slug: "marketing", labelKey: "marketing_docs_tab_marketing", bodyKey: "marketing_docs_marketing_body" }
];

export function isMarketingDocSlug(value: string): value is MarketingDocSlug {
  return MARKETING_DOCS_SECTIONS.some((x) => x.slug === value);
}

export function getMarketingDocSection(slug: string) {
  return MARKETING_DOCS_SECTIONS.find((x) => x.slug === slug);
}
