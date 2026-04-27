import type { MessageKey } from "@/lib/i18n";

/** Известные id плана с бэкенда → ключи i18n */
const STEP_ID_TO_KEY: Partial<Record<string, MessageKey>> = {
  "PROJECT-STRUCTURE": "build_stream_slug_project_structure",
  "MAIN-PAGES-AND-NAVIGATION": "build_stream_slug_main_pages_navigation",
  "CART-AND-CHECKOUT": "build_stream_slug_cart_checkout",
  "PRODUCT-CARD-AND-PAGE": "build_stream_slug_product_card",
  "CHECKOUT-AND-THANK-YOU": "build_stream_slug_checkout_thankyou",
  "UI-POLISH-AND-ACCESSIBILITY": "build_stream_slug_ui_polish",
  "DATA-MOCKS-AND-STATE": "build_stream_slug_data_mocks"
};

function humanizeSlug(id: string): string {
  const t = id.trim();
  if (!t) return "";
  return t
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Заголовок шага для UI (без сырого SCREAMING-KEBAB, если есть перевод). */
export function getStreamStepTitle(id: string, t: (key: MessageKey) => string): string {
  const key = STEP_ID_TO_KEY[id];
  if (key) return t(key);
  return humanizeSlug(id);
}
