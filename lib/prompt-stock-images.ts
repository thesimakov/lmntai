/**
 * Правила для LLM: какие URL изображений допустимы в сгенерированном коде
 * (согласовано с `next.config.mjs` → `images.remotePatterns`: unsplash, picsum).
 */

/** Английский текст для RouterAI / builder (модель читает как инструкцию). */
export const PROMPT_STOCK_IMAGES_RULES_EN =
  "Images (hero, sections, cards): use only real HTTPS `src` URLs. For stable placeholders use `https://picsum.photos/seed/<short-ascii-seed>/<width>/<height>`. For editorial photos you may use direct `https://images.unsplash.com/...` URLs; add a visible one-line credit (photographer name + link to their Unsplash profile). Do not use deprecated `source.unsplash.com`, `placehold.co` as default stock, broken `example.com` placeholders, or invented image hosts.";
