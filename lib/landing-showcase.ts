import { SITE_URL } from "@/lib/site";

/** Тип проекта в каталоге (фильтр на лендинге). */
export type LandingShowcaseCategory = "website" | "resume" | "presentation" | "other";

export type LandingShowcaseItem = {
  slug: string;
  imageSrc: string;
  titleKey: string;
  descKey: string;
  /** Раздел каталога для фильтра. */
  category: LandingShowcaseCategory;
  /** Полный URL опубликованного проекта; иначе открывается playground с параметром showcase. */
  previewUrl?: string;
};

/**
 * Публичный каталог проектов на лендинге.
 * Подставьте `previewUrl` опубликованных сборок или замените массив ответом API.
 */
export const LANDING_SHOWCASE_ITEMS: readonly LandingShowcaseItem[] = [
  {
    slug: "portfolio",
    imageSrc:
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_portfolio_title",
    descKey: "landing_showcase_item_portfolio_desc",
    category: "resume"
  },
  {
    slug: "architect",
    imageSrc:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8623?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_architect_title",
    descKey: "landing_showcase_item_architect_desc",
    category: "website"
  },
  {
    slug: "saas-dashboard",
    imageSrc:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_saas_title",
    descKey: "landing_showcase_item_saas_desc",
    category: "website"
  },
  {
    slug: "creative-studio",
    imageSrc:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_creative_title",
    descKey: "landing_showcase_item_creative_desc",
    category: "presentation"
  },
  {
    slug: "dev-product",
    imageSrc:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_dev_title",
    descKey: "landing_showcase_item_dev_desc",
    category: "website"
  },
  {
    slug: "mobile-app",
    imageSrc:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_mobile_title",
    descKey: "landing_showcase_item_mobile_desc",
    category: "website"
  },
  {
    slug: "commerce",
    imageSrc:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_commerce_title",
    descKey: "landing_showcase_item_commerce_desc",
    category: "website"
  },
  {
    slug: "team-hub",
    imageSrc:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop&auto=format&q=80",
    titleKey: "landing_showcase_item_team_title",
    descKey: "landing_showcase_item_team_desc",
    category: "other"
  },
];

export function getShowcaseCardHref(item: LandingShowcaseItem): string {
  if (item.previewUrl?.trim()) return item.previewUrl.trim();
  return `${SITE_URL}/playground?showcase=${encodeURIComponent(item.slug)}`;
}
