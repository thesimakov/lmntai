/**
 * Правила для LLM: какие URL изображений допустимы в сгенерированном коде
 * (согласовано с `next.config.mjs` → `images.remotePatterns`: unsplash, picsum, wikimedia).
 */

/** Английский текст для RouterAI / builder (модель читает как инструкцию). */
export const PROMPT_STOCK_IMAGES_RULES_EN =
  "Images (hero, sections, cards): use only real HTTPS `src` URLs. Prefer `https://upload.wikimedia.org/wikipedia/commons/...` (Wikimedia Commons) for editorial/photo placeholders — add a visible one-line credit (title + link to the file page on Commons). As an alternative, `https://picsum.photos/seed/<short-ascii-seed>/<width>/<height>` or `https://images.unsplash.com/...` (with photographer credit) may be used where the network allows. Do not use deprecated `source.unsplash.com`, `placehold.co` as default stock, broken `example.com` placeholders, or invented image hosts.";
