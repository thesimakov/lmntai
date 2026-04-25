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

/** Стабильное превью с Lorem Picsum (бесплатно, без ключа; seed = slug карточки). */
function showcaseStockImage(slug: string, width = 800, height = 600): string {
  const enc = encodeURIComponent(slug);
  return `https://picsum.photos/seed/${enc}/${width}/${height}`;
}

/**
 * Публичный каталог проектов на лендинге.
 * Подставьте `previewUrl` опубликованных сборок или замените массив ответом API.
 */
export const LANDING_SHOWCASE_ITEMS: readonly LandingShowcaseItem[] = [
  {
    slug: "portfolio",
    imageSrc: showcaseStockImage("portfolio"),
    titleKey: "landing_showcase_item_portfolio_title",
    descKey: "landing_showcase_item_portfolio_desc",
    category: "resume"
  },
  {
    slug: "architect",
    imageSrc: showcaseStockImage("architect"),
    titleKey: "landing_showcase_item_architect_title",
    descKey: "landing_showcase_item_architect_desc",
    category: "website"
  },
  {
    slug: "saas-dashboard",
    imageSrc: showcaseStockImage("saas-dashboard"),
    titleKey: "landing_showcase_item_saas_title",
    descKey: "landing_showcase_item_saas_desc",
    category: "website"
  },
  {
    slug: "creative-studio",
    imageSrc: showcaseStockImage("creative-studio"),
    titleKey: "landing_showcase_item_creative_title",
    descKey: "landing_showcase_item_creative_desc",
    category: "presentation"
  },
  {
    slug: "dev-product",
    imageSrc: showcaseStockImage("dev-product"),
    titleKey: "landing_showcase_item_dev_title",
    descKey: "landing_showcase_item_dev_desc",
    category: "website"
  },
  {
    slug: "mobile-app",
    imageSrc: showcaseStockImage("mobile-app"),
    titleKey: "landing_showcase_item_mobile_title",
    descKey: "landing_showcase_item_mobile_desc",
    category: "website"
  },
  {
    slug: "commerce",
    imageSrc: showcaseStockImage("commerce"),
    titleKey: "landing_showcase_item_commerce_title",
    descKey: "landing_showcase_item_commerce_desc",
    category: "website"
  },
  {
    slug: "team-hub",
    imageSrc: showcaseStockImage("team-hub"),
    titleKey: "landing_showcase_item_team_title",
    descKey: "landing_showcase_item_team_desc",
    category: "other"
  },
];

export function getShowcaseCardHref(item: LandingShowcaseItem): string {
  if (item.previewUrl?.trim()) return item.previewUrl.trim();
  return `${SITE_URL}/playground?showcase=${encodeURIComponent(item.slug)}`;
}
