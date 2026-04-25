import { createRequire } from "node:module";

import type { BuilderPlan } from "./prompts.js";
import { requestJsonCompletion } from "./routerai.js";
import { ARTIFACT_MIME_PPTX } from "./types.js";

export { ARTIFACT_MIME_PPTX };

const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs") as new () => import("pptxgenjs").default;

export type SlideOutline = {
  title: string;
  subtitle?: string;
  bullets?: string[];
};

export type PresentationOutline = {
  deck_title: string;
  slides: SlideOutline[];
};

function stripCodeFence(text: string): string {
  const m = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m?.[1]?.trim() ?? text.trim();
}

export function sanitizeFilename(name: string): string {
  const s = name
    .trim()
    .slice(0, 80)
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_");
  return s || "presentation";
}

function outlinePrompt(message: string, plan: BuilderPlan): string {
  const isRu = plan.language === "ru" || /[\u0400-\u04FF]/.test(message);
  return [
    "You output ONLY valid JSON for a Microsoft PowerPoint deck (.pptx structure as data). No markdown, no prose.",
    "TypeScript shape:",
    "```typescript",
    "interface PresentationOutline {",
    "  deck_title: string;",
    "  slides: Array<{ title: string; subtitle?: string; bullets?: string[] }>;",
    "}",
    "```",
    "Rules:",
    "- 4 to 12 slides. Slide 1 is the title slide (big title; optional subtitle).",
    isRu ? "- All slide text in Russian." : "- Slide text in the same language as the user message.",
    "- bullets: at most 6 strings per slide; keep lines short.",
    "",
    `Session / deck title hint: ${plan.title}`,
    `Goal: ${plan.goal}`,
    "",
    "User request:",
    message
  ].join("\n");
}

function parseOutline(json: string, message: string, plan: BuilderPlan): PresentationOutline {
  try {
    const raw = JSON.parse(stripCodeFence(json)) as Partial<PresentationOutline>;
    const slides = Array.isArray(raw.slides)
      ? raw.slides
          .map((s) => ({
            title: typeof s?.title === "string" ? s.title.trim() : "",
            subtitle: typeof s?.subtitle === "string" ? s.subtitle.trim() : undefined,
            bullets: Array.isArray(s?.bullets)
              ? s.bullets
                  .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
                  .map((b) => b.trim())
                  .slice(0, 8)
              : undefined
          }))
          .filter((s) => s.title.length > 0)
      : [];
    const deck_title =
      typeof raw.deck_title === "string" && raw.deck_title.trim()
        ? raw.deck_title.trim()
        : plan.title;
    if (slides.length) return { deck_title, slides };
  } catch {
    /* fallback */
  }
  const isRu = /[\u0400-\u04FF]/.test(message);
  return {
    deck_title: plan.title,
    slides: [
      {
        title: isRu ? "Презентация" : "Presentation",
        subtitle: message.trim().slice(0, 220) || undefined
      },
      {
        title: isRu ? "Ключевые тезисы" : "Key points",
        bullets: isRu
          ? ["Сформулируйте цель и аудиторию", "Структурируйте аргументы", "Завершите призывом к действию"]
          : ["Define goal and audience", "Structure your case", "Close with a clear call to action"]
      }
    ]
  };
}

/** Один вызов модели: структура слайдов для .pptx и .pdf. */
export async function getPresentationOutline(input: {
  message: string;
  plan: BuilderPlan;
  model: string;
  user?: string;
}): Promise<PresentationOutline> {
  const jsonText = await requestJsonCompletion({
    model: input.model,
    prompt: outlinePrompt(input.message, input.plan),
    user: input.user
  });
  return parseOutline(jsonText, input.message, input.plan);
}

export async function buildPptxFromOutline(
  outline: PresentationOutline
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const pptx = new PptxGenJS();
  pptx.title = outline.deck_title;
  pptx.subject = outline.deck_title;
  pptx.layout = "LAYOUT_16x9";

  for (let i = 0; i < outline.slides.length; i++) {
    const slideData = outline.slides[i];
    const slide = pptx.addSlide();
    slide.addText(slideData.title, {
      x: 0.45,
      y: 0.65,
      w: 9,
      h: 1,
      fontSize: i === 0 ? 32 : 26,
      bold: true,
      color: "363636"
    });
    let y = 1.75;
    if (slideData.subtitle) {
      slide.addText(slideData.subtitle, {
        x: 0.45,
        y,
        w: 9,
        h: 0.55,
        fontSize: 14,
        color: "666666"
      });
      y += 0.65;
    }
    if (slideData.bullets?.length) {
      slide.addText(
        slideData.bullets.map((text) => ({
          text,
          options: { bullet: true, fontSize: 15, color: "333333" }
        })),
        { x: 0.55, y, w: 8.9, h: 3.8, valign: "top" }
      );
    }
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  const buffer = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
  const filename = `${sanitizeFilename(outline.deck_title)}.pptx`;
  return { buffer, filename, mimeType: ARTIFACT_MIME_PPTX };
}

export async function generatePresentationPptx(input: {
  message: string;
  plan: BuilderPlan;
  model: string;
  user?: string;
}): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const outline = await getPresentationOutline(input);
  return buildPptxFromOutline(outline);
}
