import PptxGenJS from "pptxgenjs";
import {
  SLIDE_CANVAS_H,
  SLIDE_CANVAS_W,
  defaultElementFrame,
  isSlideFreeform,
} from "./freeform";
import type { Slide, SlideElement, SlideElementFrame, SlideGraph, SlideTheme } from "./types";

/** pptxgenjs LAYOUT_WIDE — 13.33" × 7.5" */
const SLIDE_W_IN = 13.333;
const SLIDE_H_IN = 7.5;

const DARK_LAYOUTS = new Set<Slide["layout"]>(["dark-solution", "dark-metrics", "cta-split"]);

type PptxSlide = ReturnType<PptxGenJS["addSlide"]>;

type ThemeOpts = {
  fontFace: string;
  textColor: string;
  accentColor: string;
};

type Box = { x: number; y: number; w: number; h: number };

function hexNoHash(color: string): string {
  return color.replace(/^#/, "");
}

function frameToBox(frame: SlideElementFrame): Box {
  return {
    x: (frame.x / SLIDE_CANVAS_W) * SLIDE_W_IN,
    y: (frame.y / SLIDE_CANVAS_H) * SLIDE_H_IN,
    w: Math.max(0.45, (frame.w / SLIDE_CANVAS_W) * SLIDE_W_IN),
    h: Math.max(0.28, (frame.h / SLIDE_CANVAS_H) * SLIDE_H_IN),
  };
}

function elementToText(el: SlideElement): string {
  switch (el.type) {
    case "bullet-list":
      return (el.items ?? []).join("\n");
    case "metric-card":
      return [el.label, el.description, el.value].filter(Boolean).join("\n");
    case "stat-number":
      return [el.value, el.label, el.change].filter(Boolean).join("\n");
    case "feature-card":
      return [el.badge, el.content ?? el.label, el.description].filter(Boolean).join("\n");
    case "step-card":
      return [el.stepNumber != null ? String(el.stepNumber) : "", el.content ?? el.label, el.description]
        .filter(Boolean)
        .join("\n");
    case "pricing-card":
      return [
        el.planName ?? el.content,
        [el.price, el.period].filter(Boolean).join(" "),
        ...(el.features ?? []),
      ]
        .filter(Boolean)
        .join("\n");
    case "timeline-col":
      return [el.period ?? el.label, el.content ?? el.planName, ...(el.items ?? [])]
        .filter(Boolean)
        .join("\n");
    default:
      return el.content ?? el.label ?? el.alt ?? el.value ?? "";
  }
}

function textColorFor(el: SlideElement, opts: ThemeOpts): string {
  if (el.style?.color) return hexNoHash(el.style.color);
  return opts.textColor;
}

function addImageSafe(s: PptxSlide, src: string, box: Box): void {
  if (!src.trim()) return;
  try {
    s.addImage({ path: src, x: box.x, y: box.y, w: box.w, h: box.h });
  } catch {
    // Remote or invalid URLs — skip image, keep text elements
  }
}

function addElementAtBox(s: PptxSlide, el: SlideElement, box: Box, opts: ThemeOpts): void {
  const fontFace = opts.fontFace;
  const color = textColorFor(el, opts);
  const align = el.style?.textAlign ?? "left";
  const bold = el.style?.fontWeight === "bold";
  const italic = el.style?.italic === true;

  switch (el.type) {
    case "heading":
      s.addText(elementToText(el), {
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        fontSize: 28,
        bold: true,
        color,
        fontFace,
        align,
        valign: "top",
      });
      return;
    case "subheading":
      s.addText(elementToText(el), {
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        fontSize: 18,
        bold: true,
        color: opts.accentColor,
        fontFace,
        align,
        valign: "top",
      });
      return;
    case "body":
    case "caption":
    case "label":
      s.addText(elementToText(el), {
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        fontSize: el.type === "label" ? 11 : 15,
        color,
        fontFace,
        align,
        italic,
        bold,
        valign: "top",
      });
      return;
    case "quote":
      s.addText(`"${elementToText(el)}"`, {
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        fontSize: 22,
        italic: true,
        color,
        fontFace,
        align: "center",
        valign: "middle",
      });
      return;
    case "bullet-list": {
      const items = (el.items ?? []).filter(Boolean);
      if (!items.length) return;
      const rows = items.map((item) => ({
        text: item,
        options: { bullet: { type: "bullet" as const }, color, fontSize: 14 },
      }));
      s.addText(rows, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace, valign: "top" });
      return;
    }
    case "image":
      addImageSafe(s, el.src ?? "", box);
      if (!el.src?.trim() && el.alt) {
        s.addText(el.alt, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          fontSize: 12,
          color: opts.accentColor,
          fontFace,
          align: "center",
          valign: "middle",
        });
      }
      return;
    case "metric-card": {
      const lines: PptxGenJS.TextProps[] = [];
      if (el.label) lines.push({ text: el.label, options: { fontSize: 13, bold: true, breakLine: true } });
      if (el.description) lines.push({ text: el.description, options: { fontSize: 11, breakLine: true } });
      if (el.value) lines.push({ text: el.value, options: { fontSize: 12, bold: true } });
      if (lines.length) s.addText(lines, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace, color, valign: "top" });
      return;
    }
    case "stat-number": {
      const lines: PptxGenJS.TextProps[] = [];
      if (el.value) lines.push({ text: el.value, options: { fontSize: 26, bold: true, color: opts.accentColor, breakLine: true } });
      if (el.change) lines.push({ text: el.change, options: { fontSize: 11, color: "22c55e", breakLine: true } });
      if (el.label) lines.push({ text: el.label, options: { fontSize: 11 } });
      if (lines.length) s.addText(lines, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace, color, align: "center", valign: "top" });
      return;
    }
    case "feature-card": {
      const lines: PptxGenJS.TextProps[] = [];
      if (el.badge) lines.push({ text: el.badge.toUpperCase(), options: { fontSize: 9, bold: true, color: opts.accentColor, breakLine: true } });
      const title = el.content ?? el.label;
      if (title) lines.push({ text: title, options: { fontSize: 12, bold: true, breakLine: true } });
      if (el.description) lines.push({ text: el.description, options: { fontSize: 10, breakLine: true } });
      if (lines.length) s.addText(lines, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace, color, valign: "top" });
      return;
    }
    case "step-card": {
      const lines: PptxGenJS.TextProps[] = [];
      if (el.stepNumber != null) lines.push({ text: String(el.stepNumber), options: { fontSize: 16, bold: true, color: opts.accentColor, breakLine: true } });
      const title = el.content ?? el.label;
      if (title) lines.push({ text: title, options: { fontSize: 12, bold: true, breakLine: true } });
      if (el.description) lines.push({ text: el.description, options: { fontSize: 10 } });
      if (lines.length) s.addText(lines, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace, color, valign: "top" });
      return;
    }
    case "pricing-card": {
      const lines: PptxGenJS.TextProps[] = [];
      const plan = el.planName ?? el.content;
      if (plan) lines.push({ text: plan, options: { fontSize: 13, bold: true, breakLine: true } });
      if (el.price) {
        const priceLine = [el.price, el.period].filter(Boolean).join(" ");
        lines.push({ text: priceLine, options: { fontSize: 20, bold: true, color: opts.accentColor, breakLine: true } });
      }
      for (const feat of el.features ?? []) {
        lines.push({ text: feat, options: { fontSize: 10, bullet: { type: "bullet" as const }, breakLine: true } });
      }
      if (lines.length) s.addText(lines, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace, color, valign: "top" });
      return;
    }
    case "timeline-col": {
      const lines: PptxGenJS.TextProps[] = [];
      const period = el.period ?? el.label;
      if (period) lines.push({ text: period, options: { fontSize: 10, bold: true, color: opts.accentColor, breakLine: true } });
      const title = el.content ?? el.planName;
      if (title) lines.push({ text: title, options: { fontSize: 12, bold: true, breakLine: true } });
      for (const item of el.items ?? []) {
        lines.push({ text: item, options: { fontSize: 10, bullet: { type: "bullet" as const }, breakLine: true } });
      }
      if (lines.length) s.addText(lines, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace, color, valign: "top" });
      return;
    }
    default: {
      const text = elementToText(el);
      if (!text) return;
      s.addText(text, {
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        fontSize: 14,
        color,
        fontFace,
        valign: "top",
      });
    }
  }
}

function estimateStackHeight(el: SlideElement): number {
  switch (el.type) {
    case "heading":
      return 0.85;
    case "subheading":
      return 0.55;
    case "body":
      return 0.75;
    case "bullet-list":
      return Math.max(0.5, (el.items?.length ?? 1) * 0.36);
    case "image":
      return 2.6;
    case "metric-card":
    case "feature-card":
    case "step-card":
    case "pricing-card":
    case "timeline-col":
      return 1.35;
    case "stat-number":
      return 1.1;
    case "quote":
      return 1.8;
    default:
      return 0.55;
  }
}

function exportFreeformSlide(s: PptxSlide, slide: Slide, opts: ThemeOpts): void {
  const sorted = [...slide.elements].sort(
    (a, b) => (a.frame?.zIndex ?? 0) - (b.frame?.zIndex ?? 0)
  );
  sorted.forEach((el, index) => {
    const frame = el.frame ?? defaultElementFrame(index, el.type);
    addElementAtBox(s, el, frameToBox(frame), opts);
  });
}

function exportStackedSlide(s: PptxSlide, slide: Slide, opts: ThemeOpts, start: { x: number; y: number; w: number }): void {
  let curY = start.y;
  for (const el of slide.elements) {
    const h = estimateStackHeight(el);
    addElementAtBox(s, el, { x: start.x, y: curY, w: start.w, h }, opts);
    curY += h + 0.12;
  }
}

function applySlideBackground(s: PptxSlide, slide: Slide, theme: SlideTheme): ThemeOpts {
  const dark =
    DARK_LAYOUTS.has(slide.layout) ||
    slide.background?.color?.toLowerCase() === "#1a1a2e";
  const bgColor = dark
    ? "1A1A2E"
    : hexNoHash(slide.background?.color ?? theme.backgroundColor);
  s.background = { color: bgColor };

  const fontFace = theme.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
  return {
    fontFace,
    textColor: dark ? "FFFFFF" : hexNoHash(theme.textColor),
    accentColor: hexNoHash(theme.accentColor ?? theme.primaryColor),
  };
}

function layoutSlide(pptx: PptxGenJS, slide: Slide, theme: SlideTheme): void {
  const s = pptx.addSlide();
  const opts = applySlideBackground(s, slide, theme);

  if (isSlideFreeform(slide)) {
    exportFreeformSlide(s, slide, opts);
    return;
  }

  switch (slide.layout) {
    case "title": {
      const heading = slide.elements.find((e) => e.type === "heading");
      const sub = slide.elements.find((e) => e.type === "subheading" || e.type === "body");
      if (heading) addElementAtBox(s, heading, { x: 0.8, y: 1.8, w: 8.4, h: 1.4 }, opts);
      if (sub) addElementAtBox(s, sub, { x: 0.8, y: 3.4, w: 8.4, h: 0.9 }, opts);
      s.addShape("rect", { x: 3.5, y: 4.5, w: 3, h: 0.05, fill: { color: opts.accentColor } });
      const rest = slide.elements.filter((e) => e !== heading && e !== sub);
      if (rest.length) exportStackedSlide(s, { ...slide, elements: rest }, opts, { x: 0.8, y: 4.7, w: 8.4 });
      break;
    }

    case "section-divider": {
      const heading = slide.elements.find((e) => e.type === "heading");
      if (heading) addElementAtBox(s, heading, { x: 0.8, y: 2.5, w: 8.4, h: 1 }, opts);
      s.addShape("rect", { x: 3.5, y: 3.6, w: 3, h: 0.05, fill: { color: opts.accentColor } });
      const rest = slide.elements.filter((e) => e !== heading);
      if (rest.length) exportStackedSlide(s, { ...slide, elements: rest }, opts, { x: 0.8, y: 3.8, w: 8.4 });
      break;
    }

    case "quote": {
      const quote = slide.elements.find((e) => e.type === "quote");
      const caption = slide.elements.find((e) => e.type === "caption");
      if (quote) addElementAtBox(s, quote, { x: 1, y: 1.5, w: 8, h: 2.5 }, opts);
      if (caption) addElementAtBox(s, caption, { x: 1, y: 4.2, w: 8, h: 0.55 }, opts);
      s.addShape("rect", { x: 0.6, y: 1.3, w: 0.08, h: 2.8, fill: { color: opts.accentColor } });
      const rest = slide.elements.filter((e) => e !== quote && e !== caption);
      if (rest.length) exportStackedSlide(s, { ...slide, elements: rest }, opts, { x: 0.5, y: 5, w: 9 });
      break;
    }

    case "two-column": {
      const heading = slide.elements.find((e) => e.type === "heading");
      const others = slide.elements.filter((e) => e !== heading);
      const mid = Math.ceil(others.length / 2);
      if (heading) addElementAtBox(s, heading, { x: 0.5, y: 0.3, w: 9, h: 0.75 }, opts);
      exportStackedSlide(s, { ...slide, elements: others.slice(0, mid) }, opts, { x: 0.5, y: 1.15, w: 4.2 });
      exportStackedSlide(s, { ...slide, elements: others.slice(mid) }, opts, { x: 5.3, y: 1.15, w: 4.2 });
      break;
    }

    case "image-left":
    case "image-right": {
      const img = slide.elements.find((e) => e.type === "image");
      const textEls = slide.elements.filter((e) => e.type !== "image");
      const imgX = slide.layout === "image-left" ? 0 : 5;
      const textX = slide.layout === "image-left" ? 5.2 : 0.5;
      if (img?.src) addImageSafe(s, img.src, { x: imgX, y: 0, w: 5, h: 5.63 });
      exportStackedSlide(s, { ...slide, elements: textEls }, opts, { x: textX, y: 0.5, w: 4.3 });
      break;
    }

    default:
      exportStackedSlide(s, slide, opts, { x: 0.5, y: 0.35, w: 9 });
      break;
  }
}

export async function buildSlideGraphPptx(graph: SlideGraph): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = graph.meta.title;
  pptx.author = "Lemnity AI";

  for (const slide of graph.slides) {
    layoutSlide(pptx, slide, graph.meta.theme);
  }

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}
