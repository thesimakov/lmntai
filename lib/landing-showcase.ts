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

/** Подпись для атрибуции Unsplash (API /api/showcase-images). */
export type ShowcaseImageCredit = {
  name: string;
  profileUrl: string;
  photoPageUrl: string;
};

export type ShowcaseImageEntry = {
  url: string;
  credit?: ShowcaseImageCredit;
};

/** Запросы к Unsplash Search по slug (англ.; детерминированный выбор кадра внутри выдачи). */
export const SHOWCASE_UNSPLASH_QUERY_BY_SLUG: Record<string, string> = {
  portfolio: "minimalist creative workspace desk",
  architect: "modern architecture building exterior",
  "saas-dashboard": "data analytics dashboard screen dark",
  "creative-studio": "design studio interior creative",
  "dev-product": "software developer laptop code",
  "mobile-app": "smartphone mobile app mockup",
  commerce: "ecommerce shopping online store",
  "team-hub": "team collaboration office meeting"
};

/** Стабильное превью с Lorem Picsum (без ключа; seed = slug). Фолбэк без Unsplash. */
export function showcasePicsumUrl(slug: string, width = 800, height = 600): string {
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
    imageSrc: showcasePicsumUrl("portfolio"),
    titleKey: "landing_showcase_item_portfolio_title",
    descKey: "landing_showcase_item_portfolio_desc",
    category: "resume"
  },
  {
    slug: "architect",
    imageSrc: showcasePicsumUrl("architect"),
    titleKey: "landing_showcase_item_architect_title",
    descKey: "landing_showcase_item_architect_desc",
    category: "website"
  },
  {
    slug: "saas-dashboard",
    imageSrc: showcasePicsumUrl("saas-dashboard"),
    titleKey: "landing_showcase_item_saas_title",
    descKey: "landing_showcase_item_saas_desc",
    category: "website"
  },
  {
    slug: "creative-studio",
    imageSrc: showcasePicsumUrl("creative-studio"),
    titleKey: "landing_showcase_item_creative_title",
    descKey: "landing_showcase_item_creative_desc",
    category: "presentation"
  },
  {
    slug: "dev-product",
    imageSrc: showcasePicsumUrl("dev-product"),
    titleKey: "landing_showcase_item_dev_title",
    descKey: "landing_showcase_item_dev_desc",
    category: "website"
  },
  {
    slug: "mobile-app",
    imageSrc: showcasePicsumUrl("mobile-app"),
    titleKey: "landing_showcase_item_mobile_title",
    descKey: "landing_showcase_item_mobile_desc",
    category: "website"
  },
  {
    slug: "commerce",
    imageSrc: showcasePicsumUrl("commerce"),
    titleKey: "landing_showcase_item_commerce_title",
    descKey: "landing_showcase_item_commerce_desc",
    category: "website"
  },
  {
    slug: "team-hub",
    imageSrc: showcasePicsumUrl("team-hub"),
    titleKey: "landing_showcase_item_team_title",
    descKey: "landing_showcase_item_team_desc",
    category: "other"
  },
];

export function getShowcaseCardHref(item: LandingShowcaseItem): string {
  if (item.previewUrl?.trim()) return item.previewUrl.trim();
  return `${SITE_URL}/playground?showcase=${encodeURIComponent(item.slug)}`;
}
