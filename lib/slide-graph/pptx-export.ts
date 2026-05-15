import PptxGenJS from "pptxgenjs";
import type { SlideGraph, Slide, SlideElement } from "./types";

function hexNoHash(color: string): string {
  return color.replace(/^#/, "");
}

function elementToText(el: SlideElement): string {
  if (el.type === "bullet-list") return (el.items ?? []).join("\n");
  return el.content ?? el.alt ?? "";
}

function layoutSlide(pptx: PptxGenJS, slide: Slide, theme: SlideGraph["meta"]["theme"]): void {
  const s = pptx.addSlide();

  const bgColor = hexNoHash(slide.background?.color ?? theme.backgroundColor);
  s.background = { color: bgColor };

  const textColor = hexNoHash(theme.textColor);
  const accentColor = hexNoHash(theme.primaryColor);
  const fontFace = theme.fontFamily.split(",")[0].trim().replace(/['"]/g, "");

  switch (slide.layout) {
    case "title": {
      const heading = slide.elements.find((e) => e.type === "heading");
      const sub = slide.elements.find((e) => e.type === "subheading" || e.type === "body");
      if (heading) {
        s.addText(elementToText(heading), {
          x: 0.8, y: 1.8, w: 8.4, h: 1.4,
          fontSize: 40, bold: true, color: textColor,
          fontFace, align: "center",
        });
      }
      if (sub) {
        s.addText(elementToText(sub), {
          x: 0.8, y: 3.4, w: 8.4, h: 0.8,
          fontSize: 22, color: accentColor,
          fontFace, align: "center",
        });
      }
      s.addShape("rect", { x: 3.5, y: 4.5, w: 3, h: 0.05, fill: { color: accentColor } });
      break;
    }

    case "section-divider": {
      const heading = slide.elements.find((e) => e.type === "heading");
      if (heading) {
        s.addText(elementToText(heading), {
          x: 0.8, y: 2.5, w: 8.4, h: 0.9,
          fontSize: 36, bold: true, color: accentColor,
          fontFace, align: "center",
        });
      }
      s.addShape("rect", { x: 3.5, y: 3.6, w: 3, h: 0.05, fill: { color: accentColor } });
      break;
    }

    case "quote": {
      const quote = slide.elements.find((e) => e.type === "quote");
      const caption = slide.elements.find((e) => e.type === "caption");
      if (quote) {
        s.addText(`"${elementToText(quote)}"`, {
          x: 1, y: 1.5, w: 8, h: 2.5,
          fontSize: 24, italic: true, color: textColor,
          fontFace, align: "center",
        });
      }
      if (caption) {
        s.addText(`— ${elementToText(caption)}`, {
          x: 1, y: 4.2, w: 8, h: 0.5,
          fontSize: 16, color: accentColor,
          fontFace, align: "center",
        });
      }
      s.addShape("rect", { x: 0.6, y: 1.3, w: 0.08, h: 2.8, fill: { color: accentColor } });
      break;
    }

    case "two-column": {
      const heading = slide.elements.find((e) => e.type === "heading");
      const others = slide.elements.filter((e) => e.type !== "heading");
      const leftEls = others.slice(0, Math.ceil(others.length / 2));
      const rightEls = others.slice(Math.ceil(others.length / 2));
      if (heading) {
        s.addText(elementToText(heading), {
          x: 0.5, y: 0.3, w: 9, h: 0.7,
          fontSize: 26, bold: true, color: textColor, fontFace,
        });
      }
      addElementsToSlide(s, leftEls, { x: 0.5, y: 1.2, w: 4.2, fontFace, textColor, accentColor });
      addElementsToSlide(s, rightEls, { x: 5.3, y: 1.2, w: 4.2, fontFace, textColor, accentColor });
      break;
    }

    case "image-left":
    case "image-right": {
      const img = slide.elements.find((e) => e.type === "image");
      const textEls = slide.elements.filter((e) => e.type !== "image");
      const imgX = slide.layout === "image-left" ? 0 : 5;
      const textX = slide.layout === "image-left" ? 5.2 : 0.5;
      if (img?.src) {
        try {
          s.addImage({ path: img.src, x: imgX, y: 0, w: 5, h: 5.63 });
        } catch {
          // skip broken image
        }
      }
      addElementsToSlide(s, textEls, { x: textX, y: 1, w: 4.3, fontFace, textColor, accentColor });
      break;
    }

    default: {
      // content / blank layouts
      const heading = slide.elements.find((e) => e.type === "heading");
      const rest = slide.elements.filter((e) => e.type !== "heading");
      if (heading) {
        s.addText(elementToText(heading), {
          x: 0.5, y: 0.3, w: 9, h: 0.75,
          fontSize: 28, bold: true, color: textColor, fontFace,
        });
        s.addShape("rect", { x: 0.5, y: 1.08, w: 1.5, h: 0.05, fill: { color: accentColor } });
      }
      addElementsToSlide(s, rest, { x: 0.5, y: 1.3, w: 9, fontFace, textColor, accentColor });
      break;
    }
  }
}

function addElementsToSlide(
  s: ReturnType<PptxGenJS["addSlide"]>,
  elements: SlideElement[],
  opts: { x: number; y: number; w: number; fontFace: string; textColor: string; accentColor: string }
) {
  let curY = opts.y;
  for (const el of elements) {
    switch (el.type) {
      case "subheading":
        s.addText(elementToText(el), {
          x: opts.x, y: curY, w: opts.w, h: 0.5,
          fontSize: 18, bold: true, color: opts.accentColor, fontFace: opts.fontFace,
        });
        curY += 0.55;
        break;
      case "body":
        s.addText(elementToText(el), {
          x: opts.x, y: curY, w: opts.w, h: 0.6,
          fontSize: 15, color: opts.textColor, fontFace: opts.fontFace,
        });
        curY += 0.7;
        break;
      case "bullet-list": {
        const items = (el.items ?? []).map((item) => ({
          text: item,
          options: { bullet: { type: "bullet" as const }, color: opts.textColor, fontSize: 15 },
        }));
        if (items.length) {
          const h = items.length * 0.38;
          s.addText(items, { x: opts.x, y: curY, w: opts.w, h, fontFace: opts.fontFace });
          curY += h + 0.15;
        }
        break;
      }
      case "image":
        if (el.src) {
          try {
            s.addImage({ path: el.src, x: opts.x, y: curY, w: Math.min(opts.w, 4), h: 2.5 });
            curY += 2.65;
          } catch {
            // skip broken image
          }
        }
        break;
      case "caption":
        s.addText(elementToText(el), {
          x: opts.x, y: curY, w: opts.w, h: 0.35,
          fontSize: 11, color: opts.accentColor, fontFace: opts.fontFace,
        });
        curY += 0.4;
        break;
      default:
        break;
    }
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
