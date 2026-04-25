import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import type { PresentationOutline } from "./presentation-pptx.js";
import { sanitizeFilename } from "./presentation-pptx.js";

export const ARTIFACT_MIME_PDF = "application/pdf";

const PAGE_W = 792;
const PAGE_H = 445;
const MARGIN = 40;

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function buildPdfFromOutline(
  outline: PresentationOutline
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const pdf = await PDFDocument.create();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < outline.slides.length; i++) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const slide = outline.slides[i];
    const titleSize = i === 0 ? 24 : 19;
    const subSize = 12;
    const bulletSize = 13;
    let y = PAGE_H - MARGIN - titleSize;

    const titleLines = wrapLines(slide.title, 48);
    for (const line of titleLines) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: titleSize,
        font: fontBold,
        color: rgb(0.21, 0.21, 0.21)
      });
      y -= titleSize * 1.25;
    }
    y -= 8;

    if (slide.subtitle) {
      for (const line of wrapLines(slide.subtitle, 72)) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: subSize,
          font,
          color: rgb(0.38, 0.38, 0.38)
        });
        y -= subSize * 1.2;
      }
      y -= 6;
    }

    if (slide.bullets?.length) {
      for (const b of slide.bullets) {
        const prefix = "• ";
        const lines = wrapLines(b, 70);
        for (let li = 0; li < lines.length; li++) {
          const t = li === 0 ? `${prefix}${lines[li]}` : `  ${lines[li]}`;
          if (y < MARGIN + 40) break;
          page.drawText(t, {
            x: MARGIN,
            y,
            size: bulletSize,
            font,
            color: rgb(0.2, 0.2, 0.2)
          });
          y -= bulletSize * 1.35;
        }
        y -= 4;
      }
    }
  }

  const bytes = await pdf.save();
  const filename = `${sanitizeFilename(outline.deck_title)}.pdf`;
  return { buffer: Buffer.from(bytes), filename, mimeType: ARTIFACT_MIME_PDF };
}
