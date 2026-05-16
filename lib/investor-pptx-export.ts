import PptxGenJS from "pptxgenjs";
import type { InvestorReport } from "./investor-schema";
import type { AnalysisDashboard } from "./analytics-schema";
import type { UiLanguage } from "./i18n";

// ── Design System ─────────────────────────────────────────────────────────────
const T = {
  bg:     "FFFFFF",
  card:   "F7F8FC",
  border: "E2E8F0",
  accent: "2563EB",
  sky:    "0EA5E9",
  text:   "111827",
  sub:    "6B7280",
  mute:   "9CA3AF",
  green:  "10B981",
  red:    "EF4444",
  amber:  "F59E0B",
};

const SW = 13.33;
const MX = 0.40;
const HY = 0.66;
const FY = 6.84;
const CY = HY + 0.14;
const CW = SW - MX * 2;

// ── Frame ─────────────────────────────────────────────────────────────────────
function addFrame(s: PptxGenJS.Slide, pptx: PptxGenJS, docName: string, page: number, website: string) {
  s.addShape(pptx.ShapeType.rect, { x: MX, y: 0.13, w: 1.55, h: 0.38, fill: { color: T.card }, line: { color: T.border, width: 0.75 } });
  s.addText("LOGO", { x: MX, y: 0.13, w: 1.55, h: 0.38, fontSize: 8.5, color: T.mute, align: "center", valign: "middle", bold: true, charSpacing: 2 });
  s.addText(website, { x: SW - MX - 3.0, y: 0.19, w: 3.0, h: 0.28, fontSize: 8.5, color: T.sub, align: "right" });
  s.addShape(pptx.ShapeType.rect, { x: MX, y: HY, w: CW, h: 0.012, fill: { color: T.border }, line: { color: T.border, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: MX, y: FY, w: CW, h: 0.012, fill: { color: T.border }, line: { color: T.border, width: 0 } });
  s.addText(docName, { x: MX, y: FY + 0.09, w: 8.0, h: 0.28, fontSize: 7.5, color: T.mute });
  s.addText(String(page), { x: SW - MX - 0.7, y: FY + 0.09, w: 0.7, h: 0.28, fontSize: 7.5, color: T.mute, align: "right" });
}

function addSlide(pptx: PptxGenJS, title: string, docName: string, page: number, website: string) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, page, website);
  s.addText(title, { x: MX, y: CY, w: CW, h: 0.44, fontSize: 18, bold: true, color: T.text });
  s.addShape(pptx.ShapeType.rect, { x: MX, y: CY + 0.44, w: 0.38, h: 0.035, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
  return s;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function addKpiCard(
  s: PptxGenJS.Slide,
  pptx: PptxGenJS,
  x: number, y: number, w: number, h: number,
  value: string, label: string, valueColor = T.accent,
) {
  s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: T.card }, line: { color: T.border, width: 0.75 } });
  s.addShape(pptx.ShapeType.rect, { x: x + 0.02, y, w: w - 0.04, h: 0.045, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
  s.addText(value, { x, y: y + 0.12, w, h: 0.72, fontSize: 22, bold: true, color: valueColor, align: "center", valign: "middle" });
  s.addText(label, { x, y: y + h - 0.38, w, h: 0.34, fontSize: 10, color: T.sub, align: "center" });
}

// ── Risk color ────────────────────────────────────────────────────────────────
function riskColor(score: number): string {
  if (score < 40) return T.green;
  if (score < 70) return T.amber;
  return T.red;
}

// ── Localisation ──────────────────────────────────────────────────────────────
function deckTexts(lang: UiLanguage) {
  if (lang === "en") {
    return {
      noData: "No data available.",
      riskAssessment: "Risk Assessment",
      riskLevel: "Risk Level",
      vcDeck: "VC Pitch Deck",
      confidential: "CONFIDENTIAL INVESTOR MATERIALS",
      investmentHighlights: "Investment Highlights",
      keyMetrics: "Key Metrics",
      boardReport: "Board Report",
      prepared: "Prepared",
      dueDiligence: "Due Diligence",
      ddPackage: "INVESTOR DUE DILIGENCE PACKAGE",
      keyDdQuestions: "Key Due Diligence Questions",
      dataRoomChecklist: "Data Room Checklist",
    } as const;
  }
  return {
    noData: "Данные отсутствуют.",
    riskAssessment: "Оценка рисков",
    riskLevel: "Уровень риска",
    vcDeck: "Питч-дек для VC",
    confidential: "КОНФИДЕНЦИАЛЬНЫЕ МАТЕРИАЛЫ ДЛЯ ИНВЕСТОРОВ",
    investmentHighlights: "Ключевые инвестиционные тезисы",
    keyMetrics: "Ключевые метрики",
    boardReport: "Отчёт совету директоров",
    prepared: "Подготовлено",
    dueDiligence: "Комплексная проверка",
    ddPackage: "ПАКЕТ ДОКУМЕНТОВ ДЛЯ DUE DILIGENCE",
    keyDdQuestions: "Ключевые вопросы due diligence",
    dataRoomChecklist: "Чеклист data room",
  } as const;
}

// ── Cover slide ───────────────────────────────────────────────────────────────
function addCoverSlide(
  pptx: PptxGenJS,
  company: string,
  docType: string,
  badge: string,
  docName: string,
  website: string,
) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, 1, website);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 3.58, w: SW, h: 0.06, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
  s.addText(company, { x: MX, y: 1.7, w: CW, h: 1.6, fontSize: 46, bold: true, color: T.text, align: "center", valign: "bottom" });
  s.addText(docType, { x: MX, y: 3.76, w: CW, h: 0.62, fontSize: 19, color: T.accent, align: "center" });
  s.addText(badge, { x: MX, y: 4.46, w: CW, h: 0.42, fontSize: 11, color: T.sub, align: "center" });
}

// ── Bullets slide ─────────────────────────────────────────────────────────────
function addBulletsSlide(
  pptx: PptxGenJS,
  title: string,
  items: string[],
  noDataText: string,
  docName: string,
  page: number,
  website: string,
  bulletColor = T.text,
) {
  const s = addSlide(pptx, title, docName, page, website);
  const contentY = CY + 0.58;
  if (items.length === 0) {
    s.addText(noDataText, { x: MX, y: contentY, w: CW, h: 0.5, fontSize: 13, color: T.sub });
    return s;
  }
  items.forEach((item, i) => {
    const y = contentY + i * 0.52;
    if (y + 0.44 > FY) return;
    s.addShape(pptx.ShapeType.rect, { x: MX, y: y + 0.13, w: 0.1, h: 0.1, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
    s.addText(item, { x: MX + 0.22, y, w: CW - 0.22, h: 0.44, fontSize: 13, color: bulletColor });
  });
  return s;
}

// ── Content slide (narrative + optional bullets) ───────────────────────────────
function addContentSlide(
  pptx: PptxGenJS,
  title: string,
  content: string,
  docName: string,
  page: number,
  website: string,
  bullets?: string[],
) {
  const s = addSlide(pptx, title, docName, page, website);
  const contentY = CY + 0.58;
  const hasContent = content.trim().length > 0;
  const hasBullets = bullets && bullets.length > 0;

  if (hasContent) {
    const h = hasBullets ? 0.9 : 1.6;
    s.addText(content, { x: MX, y: contentY, w: CW, h, fontSize: 12.5, color: T.sub, italic: true, valign: "top" });
  }

  if (hasBullets) {
    const bulletsY = contentY + (hasContent ? 1.0 : 0);
    bullets!.forEach((item, i) => {
      const y = bulletsY + i * 0.50;
      if (y + 0.42 > FY) return;
      s.addShape(pptx.ShapeType.rect, { x: MX, y: y + 0.12, w: 0.1, h: 0.1, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
      s.addText(item, { x: MX + 0.22, y, w: CW - 0.22, h: 0.42, fontSize: 12.5, color: T.text });
    });
  }
  return s;
}

// ── Risk slide ────────────────────────────────────────────────────────────────
function addRiskSlide(
  pptx: PptxGenJS,
  report: InvestorReport,
  lang: UiLanguage,
  docName: string,
  page: number,
  website: string,
) {
  const texts = deckTexts(lang);
  const s = addSlide(pptx, texts.riskAssessment, docName, page, website);
  const color = riskColor(report.riskScore);
  const contentY = CY + 0.58;

  // Large risk score card on the left
  const cardW = 3.6;
  const cardH = 2.4;
  const cardX = MX;
  const cardY = contentY;
  s.addShape(pptx.ShapeType.rect, { x: cardX, y: cardY, w: cardW, h: cardH, fill: { color: T.card }, line: { color: T.border, width: 0.75 } });
  s.addShape(pptx.ShapeType.rect, { x: cardX + 0.02, y: cardY, w: cardW - 0.04, h: 0.045, fill: { color }, line: { color, width: 0 } });
  s.addText(`${report.riskScore}`, { x: cardX, y: cardY + 0.2, w: cardW, h: 1.4, fontSize: 72, bold: true, color, align: "center", valign: "middle" });
  s.addText(`/ 100`, { x: cardX, y: cardY + 1.55, w: cardW, h: 0.38, fontSize: 14, color: T.mute, align: "center" });
  s.addText(`${texts.riskLevel}: ${report.riskLabel}`, { x: cardX, y: cardY + 1.95, w: cardW, h: 0.34, fontSize: 12, bold: true, color, align: "center" });

  // Risk factors list on the right
  if (report.riskFactors.length > 0) {
    const listX = MX + cardW + 0.4;
    const listW = CW - cardW - 0.4;
    report.riskFactors.forEach((rf, i) => {
      const y = contentY + i * 0.52;
      if (y + 0.44 > FY) return;
      const fc = rf.severity === "high" ? T.red : rf.severity === "medium" ? T.amber : T.sub;
      s.addShape(pptx.ShapeType.rect, { x: listX, y: y + 0.13, w: 0.1, h: 0.1, fill: { color: fc }, line: { color: fc, width: 0 } });
      s.addText(rf.factor, { x: listX + 0.22, y, w: listW - 0.22, h: 0.44, fontSize: 12.5, color: T.text });
    });
  }
}

// ─────────────────────────────────────────────────────────
// VC Pitch — 10 slides
// ─────────────────────────────────────────────────────────

export async function buildVcPitchPptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard,
  lang: UiLanguage = "ru"
): Promise<Buffer> {
  const texts = deckTexts(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${texts.vcDeck} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";

  let page = 0;

  // 1. Cover
  page++;
  addCoverSlide(pptx, company, texts.vcDeck, `${period}  ·  ${texts.confidential}`, docName, website);

  // 2. Investment Highlights
  page++;
  addBulletsSlide(pptx, texts.investmentHighlights, report.investmentHighlights, texts.noData, docName, page, website, T.text);

  // 3. Key Metrics grid
  page++;
  {
    const s = addSlide(pptx, texts.keyMetrics, docName, page, website);
    const kpis = dashboard.kpis.slice(0, 6);
    const cols = 3;
    const cardW = (CW - (cols - 1) * 0.22) / cols;
    const cardH = 1.55;
    kpis.forEach((kpi, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = MX + col * (cardW + 0.22);
      const y = CY + 0.58 + row * (cardH + 0.2);
      addKpiCard(s, pptx, x, y, cardW, cardH, kpi.value, kpi.label, T.accent);
    });
  }

  // 4–10. VC pitch slides (indices 3–9)
  const vcSlides = report.vcPitch.slides;
  [3, 4, 5, 6, 7, 8, 9].forEach((idx) => {
    const slide = vcSlides[idx];
    if (!slide) return;
    page++;
    addContentSlide(pptx, slide.title, slide.content, docName, page, website, slide.bullets);
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─────────────────────────────────────────────────────────
// Board Report — 14 slides
// ─────────────────────────────────────────────────────────

export async function buildBoardReportPptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard,
  lang: UiLanguage = "ru"
): Promise<Buffer> {
  const texts = deckTexts(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${texts.boardReport} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";
  const locale  = lang === "en" ? "en-US" : "ru-RU";

  let page = 0;

  // 1. Cover
  page++;
  addCoverSlide(
    pptx, company, texts.boardReport,
    `${texts.prepared} ${new Date(report.generatedAt).toLocaleDateString(locale)}  ·  ${period}`,
    docName, website,
  );

  // Remaining slides from boardReport
  report.boardReport.slides.slice(1).forEach((slide) => {
    page++;
    addContentSlide(pptx, slide.title, slide.content, docName, page, website, slide.bullets);
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─────────────────────────────────────────────────────────
// Due Diligence — 8 slides
// ─────────────────────────────────────────────────────────

export async function buildDueDiligencePptx(
  report: InvestorReport,
  dashboard: AnalysisDashboard,
  lang: UiLanguage = "ru"
): Promise<Buffer> {
  const texts = deckTexts(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${texts.dueDiligence} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";

  let page = 0;

  // 1. Cover
  page++;
  addCoverSlide(pptx, company, texts.dueDiligence, `${period}  ·  ${texts.ddPackage}`, docName, website);

  // 2. Risk Assessment
  page++;
  addRiskSlide(pptx, report, lang, docName, page, website);

  // 3–7. Due diligence content slides (indices 2–6)
  report.dueDiligence.slides.slice(2, 7).forEach((slide) => {
    page++;
    addContentSlide(pptx, slide.title, slide.content, docName, page, website, slide.bullets);
  });

  // Key DD questions
  page++;
  addBulletsSlide(pptx, texts.keyDdQuestions, report.dueDiligence.keyQuestions, texts.noData, docName, page, website);

  // Data room checklist
  page++;
  addBulletsSlide(pptx, texts.dataRoomChecklist, report.dueDiligence.dataRoomChecklist, texts.noData, docName, page, website, T.accent);

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
