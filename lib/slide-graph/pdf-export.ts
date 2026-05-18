import { jsPDF } from "jspdf";
import type { SlideGraph, Slide, SlideElement, SlideTheme } from "./types";

// Slide canvas: 254 × 142.875 mm (10" × 5.625", 16:9)
const W = 254;
const H = 142.875;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h.padEnd(6, "0");
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function setFill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function elementText(el: SlideElement): string {
  if (el.type === "bullet-list") return (el.items ?? []).map((i) => `• ${i}`).join("\n");
  return el.content ?? el.alt ?? "";
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function drawSlide(doc: jsPDF, slide: Slide, theme: SlideTheme, isFirst: boolean) {
  if (!isFirst) doc.addPage();

  const bgColor = slide.background?.color ?? theme.backgroundColor;
  setFill(doc, bgColor);
  doc.rect(0, 0, W, H, "F");

  const textRgb = hexToRgb(theme.textColor);
  const accentRgb = hexToRgb(theme.primaryColor);

  switch (slide.layout) {
    case "title":
      drawTitleSlide(doc, slide, theme, textRgb, accentRgb);
      break;
    case "section-divider":
      drawSectionDivider(doc, slide, theme, accentRgb);
      break;
    case "quote":
      drawQuoteSlide(doc, slide, theme, textRgb, accentRgb);
      break;
    case "two-column":
      drawTwoColumn(doc, slide, theme, textRgb, accentRgb);
      break;
    default:
      drawContentSlide(doc, slide, theme, textRgb, accentRgb);
  }
}

function drawTitleSlide(
  doc: jsPDF,
  slide: Slide,
  theme: SlideTheme,
  textRgb: [number, number, number],
  accentRgb: [number, number, number]
) {
  const heading = slide.elements.find((e) => e.type === "heading");
  const sub = slide.elements.find((e) => e.type === "subheading" || e.type === "body");

  if (heading) {
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textRgb);
    const lines = wrapText(doc, elementText(heading), W - 40);
    const totalH = lines.length * 14;
    let startY = H / 2 - totalH / 2 - (sub ? 8 : 0);
    for (const line of lines) {
      doc.text(line, W / 2, startY, { align: "center" });
      startY += 14;
    }
  }

  if (sub) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...accentRgb);
    const subY = heading ? H / 2 + 18 : H / 2;
    doc.text(wrapText(doc, elementText(sub), W - 60), W / 2, subY, { align: "center" });
  }

  // accent line
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 20, H * 0.72, W / 2 + 20, H * 0.72);
}

function drawSectionDivider(
  doc: jsPDF,
  slide: Slide,
  theme: SlideTheme,
  accentRgb: [number, number, number]
) {
  const heading = slide.elements.find((e) => e.type === "heading");

  // tinted background strip
  const [ar, ag, ab] = accentRgb;
  doc.setFillColor(ar, ag, ab);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.rect(0, H * 0.3, W, H * 0.4, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  if (heading) {
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accentRgb);
    doc.text(wrapText(doc, elementText(heading), W - 40), W / 2, H / 2, { align: "center", baseline: "middle" });
  }

  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 20, H * 0.65, W / 2 + 20, H * 0.65);
}

function drawQuoteSlide(
  doc: jsPDF,
  slide: Slide,
  theme: SlideTheme,
  textRgb: [number, number, number],
  accentRgb: [number, number, number]
) {
  const quote = slide.elements.find((e) => e.type === "quote");
  const caption = slide.elements.find((e) => e.type === "caption");

  if (quote) {
    doc.setFontSize(22);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...textRgb);
    const lines = wrapText(doc, `"${elementText(quote)}"`, W - 60);
    const totalH = lines.length * 10;
    let y = H / 2 - totalH / 2;
    for (const line of lines) {
      doc.text(line, W / 2, y, { align: "center" });
      y += 10;
    }
  }

  if (caption) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...accentRgb);
    const capY = quote ? H * 0.72 : H / 2;
    doc.text(`— ${elementText(caption)}`, W / 2, capY, { align: "center" });
  }

  // accent bar top
  setFill(doc, theme.primaryColor);
  doc.rect(W / 2 - 15, H * 0.18, 30, 0.8, "F");
}

function drawTwoColumn(
  doc: jsPDF,
  slide: Slide,
  theme: SlideTheme,
  textRgb: [number, number, number],
  accentRgb: [number, number, number]
) {
  const heading = slide.elements.find((e) => e.type === "heading");
  const rest = slide.elements.filter((e) => e.type !== "heading");
  const left = rest.slice(0, Math.ceil(rest.length / 2));
  const right = rest.slice(Math.ceil(rest.length / 2));

  let bodyStartY = 22;

  if (heading) {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textRgb);
    doc.text(wrapText(doc, elementText(heading), W - 20), 10, 15);
    setFill(doc, theme.primaryColor);
    doc.rect(10, 20, 20, 0.6, "F");
    bodyStartY = 26;
  }

  renderElementList(doc, left, 10, bodyStartY, W / 2 - 16, textRgb, accentRgb);
  renderElementList(doc, right, W / 2 + 6, bodyStartY, W / 2 - 16, textRgb, accentRgb);
}

function drawContentSlide(
  doc: jsPDF,
  slide: Slide,
  theme: SlideTheme,
  textRgb: [number, number, number],
  accentRgb: [number, number, number]
) {
  const heading = slide.elements.find((e) => e.type === "heading");
  const rest = slide.elements.filter((e) => e.type !== "heading");

  let bodyStartY = 16;

  if (heading) {
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textRgb);
    doc.text(wrapText(doc, elementText(heading), W - 20), 10, 16);
    setFill(doc, theme.primaryColor);
    doc.rect(10, 22, 20, 0.6, "F");
    bodyStartY = 28;
  }

  renderElementList(doc, rest, 10, bodyStartY, W - 20, textRgb, accentRgb);
}

function renderElementList(
  doc: jsPDF,
  elements: SlideElement[],
  x: number,
  startY: number,
  maxW: number,
  textRgb: [number, number, number],
  accentRgb: [number, number, number]
) {
  let y = startY;
  for (const el of elements) {
    if (y > H - 12) break;
    switch (el.type) {
      case "subheading":
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...accentRgb);
        doc.text(wrapText(doc, elementText(el), maxW), x, y);
        y += 10;
        break;
      case "body":
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textRgb);
        for (const line of wrapText(doc, elementText(el), maxW)) {
          doc.text(line, x, y);
          y += 7;
          if (y > H - 12) break;
        }
        y += 2;
        break;
      case "bullet-list": {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textRgb);
        for (const item of el.items ?? []) {
          if (y > H - 12) break;
          const bulletLines = wrapText(doc, item, maxW - 8);
          doc.text("•", x, y);
          doc.text(bulletLines[0] ?? "", x + 6, y);
          y += 7;
          for (let i = 1; i < bulletLines.length; i++) {
            if (y > H - 12) break;
            doc.text(bulletLines[i], x + 6, y);
            y += 7;
          }
        }
        y += 3;
        break;
      }
      case "caption":
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...accentRgb);
        doc.text(wrapText(doc, elementText(el), maxW), x, y);
        y += 8;
        break;
      default:
        break;
    }
  }
}

export function buildSlideGraphPdf(graph: SlideGraph): Buffer {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [W, H],
    compress: true,
  });

  graph.slides.forEach((slide, idx) => {
    drawSlide(doc, slide, graph.meta.theme, idx === 0);
  });

  return Buffer.from(doc.output("arraybuffer"));
}
