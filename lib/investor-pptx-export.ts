import PptxGenJS from "pptxgenjs";
import type { InvestorReport } from "./investor-schema";
import type { AnalysisDashboard } from "./analytics-schema";

const THEME = {
  bg: "1A1A2E",
  accent: "4F8EF7",
  gold: "F59E0B",
  text: "FFFFFF",
  subtext: "AAAACC",
  dark: "16213E",
  green: "4CAF50",
  red: "F44336",
  yellow: "FFC107",
};

function riskColor(score: number): string {
  if (score < 40) return THEME.green;
  if (score < 70) return THEME.yellow;
  return THEME.red;
}

function addSlide(pptx: PptxGenJS, title: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  s.addText(title, {
    x: 0.5, y: 0.2, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent,
  });
  return s;
}

function addTitleSlide(pptx: PptxGenJS, heading: string, sub: string, badge: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.dark };
  s.addText(heading, {
    x: 0.5, y: 1.8, w: "90%", h: 1.2,
    fontSize: 36, bold: true, color: THEME.text, align: "center",
  });
  s.addText(sub, {
    x: 0.5, y: 3.2, w: "90%", h: 0.6,
    fontSize: 18, color: THEME.subtext, align: "center",
  });
  s.addText(badge, {
    x: 0.5, y: 4.0, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.gold, align: "center",
  });
}

function addBulletsSlide(pptx: PptxGenJS, title: string, items: string[], color = THEME.text) {
  const s = addSlide(pptx, title);
  if (items.length === 0) {
    s.addText("No data available.", { x: 0.5, y: 1.2, w: "90%", h: 0.5, fontSize: 14, color: THEME.subtext });
    return s;
  }
  const parts = items.map((item) => ({ text: `• ${item}`, options: { color } }));
  s.addText(parts, { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 15, paraSpaceAfter: 8, valign: "top" });
  return s;
}

function addContentSlide(pptx: PptxGenJS, title: string, content: string, bullets?: string[]) {
  const s = addSlide(pptx, title);
  const hasContent = content && content.trim().length > 0;
  const hasBullets = bullets && bullets.length > 0;

  if (hasContent && !hasBullets) {
    s.addText(content, { x: 0.5, y: 1.0, w: "90%", h: 4.5, fontSize: 14, color: THEME.text, valign: "top" });
  } else if (hasBullets) {
    if (hasContent) {
      s.addText(content, { x: 0.5, y: 1.0, w: "90%", h: 1.0, fontSize: 13, color: THEME.subtext, valign: "top" });
    }
    const yStart = hasContent ? 2.1 : 1.0;
    const parts = bullets!.map((b) => ({ text: `• ${b}`, options: { color: THEME.text } }));
    s.addText(parts, { x: 0.5, y: yStart, w: "90%", h: 4.0 - (hasContent ? 1.1 : 0), fontSize: 14, paraSpaceAfter: 6, valign: "top" });
  }
  return s;
}

function addRiskSlide(pptx: PptxGenJS, report: InvestorReport) {
  const s = addSlide(pptx, "Risk Assessment");
  const color = riskColor(report.riskScore);
  s.addText(`${report.riskScore}/100`, {
    x: 0.5, y: 1.0, w: 4.0, h: 1.5,
    fontSize: 52, bold: true, color, align: "center",
  });
  s.addText(`Risk Level: ${report.riskLabel}`, {
    x: 0.5, y: 2.5, w: 4.0, h: 0.5,
    fontSize: 16, color, align: "center",
  });
  if (report.riskFactors.length > 0) {
    const parts = report.riskFactors.map((rf) => ({
      text: `• ${rf.factor}`,
      options: {
        color: rf.severity === "high" ? THEME.red : rf.severity === "medium" ? THEME.yellow : THEME.subtext,
      },
    }));
    s.addText(parts, { x: 4.8, y: 1.0, w: 7.7, h: 4.5, fontSize: 14, paraSpaceAfter: 6, valign: "top" });
  }
}

// ─────────────────────────────────────────────────────────
// VC Pitch — 10 slides
// ─────────────────────────────────────────────────────────

export async function buildVcPitchPptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, dashboard.meta.companyName, `${dashboard.meta.period} · VC Pitch Deck`, "CONFIDENTIAL INVESTOR MATERIALS");

  addBulletsSlide(pptx, "Investment Highlights", report.investmentHighlights, THEME.green);

  // Key Metrics slide using dashboard KPIs
  const kpiSlide = addSlide(pptx, "Key Metrics");
  const kpis = dashboard.kpis.slice(0, 6);
  const cols = 3;
  const cellW = 4.0;
  const cellH = 1.4;
  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cellW + 0.2);
    const y = 1.1 + row * (cellH + 0.15);
    kpiSlide.addShape(pptx.ShapeType.rect, { x, y, w: cellW, h: cellH, fill: { color: THEME.dark }, line: { color: THEME.accent, width: 1 } });
    kpiSlide.addText(kpi.value, { x, y: y + 0.1, w: cellW, h: 0.7, fontSize: 22, bold: true, color: THEME.accent, align: "center" });
    kpiSlide.addText(kpi.label, { x, y: y + 0.75, w: cellW, h: 0.35, fontSize: 11, color: THEME.subtext, align: "center" });
  });

  // Slides 4–10 from AI-generated VC pitch slides (indices 3–9)
  const vcSlides = report.vcPitch.slides;
  [3, 4, 5, 6, 7, 8, 9].forEach((idx) => {
    const slide = vcSlides[idx];
    if (slide) addContentSlide(pptx, slide.title, slide.content, slide.bullets);
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─────────────────────────────────────────────────────────
// Board Report — 14 slides
// ─────────────────────────────────────────────────────────

export async function buildBoardReportPptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, dashboard.meta.companyName, `${dashboard.meta.period} · Board Report`, `Prepared ${new Date(report.generatedAt).toLocaleDateString()}`);

  report.boardReport.slides.slice(1).forEach((slide) => {
    addContentSlide(pptx, slide.title, slide.content, slide.bullets);
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─────────────────────────────────────────────────────────
// Due Diligence — 8 slides
// ─────────────────────────────────────────────────────────

export async function buildDueDiligencePptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, dashboard.meta.companyName, `${dashboard.meta.period} · Due Diligence`, "INVESTOR DUE DILIGENCE PACKAGE");

  addRiskSlide(pptx, report);

  report.dueDiligence.slides.slice(2, 7).forEach((slide) => {
    addContentSlide(pptx, slide.title, slide.content, slide.bullets);
  });

  addBulletsSlide(pptx, "Key Due Diligence Questions", report.dueDiligence.keyQuestions);
  addBulletsSlide(pptx, "Data Room Checklist", report.dueDiligence.dataRoomChecklist, THEME.gold);

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
