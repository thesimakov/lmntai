import type { LemnityBoxCanvasContent } from "@/lib/lemnity-box-editor-schema";
import { mergeLemnityBoxSectionMotionCss } from "@/lib/lemnity-box-section-motion";

const BASE_BODY = `body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#f8fafc;}`;

/** Пустой холст: без заготовленного hero из createStarterContent. */
export function getEmptyBoxStarterCanvas(): LemnityBoxCanvasContent {
  return {
    html: `<section class="lemnity-section" style="padding:48px 24px;min-height:200px;"></section>`,
    css: mergeLemnityBoxSectionMotionCss(BASE_BODY),
  };
}
