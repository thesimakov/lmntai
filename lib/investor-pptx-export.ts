import PptxGenJS from "pptxgenjs";
import type { InvestorReport } from "./investor-schema";
import type { AnalysisDashboard } from "./analytics-schema";
import type { UiLanguage } from "./i18n";

// ── Infographic Design System ─────────────────────────────────────────────────
const T = {
  bg:     "F3EDE3",
  panel:  "FDFAF5",
  border: "D6CEBD",
  a1:     "3D7FA6",
  a2:     "9A4535",
  gold:   "B8862A",
  text:   "1A1A1A",
  sub:    "5E5650",
  mute:   "9A908A",
  green:  "3A8A65",
  red:    "AC3828",
  amber:  "C08A2A",
};

const SW = 13.33;
const MX = 0.40;
const HY = 0.66;
const FY = 6.84;
const CY = HY + 0.14;
const CW = SW - MX * 2;

// ── Risk color ────────────────────────────────────────────────────────────────
function riskColor(score: number): string {
  if (score < 40) return T.green;
  if (score < 70) return T.amber;
  return T.red;
}

// ── Localisation ──────────────────────────────────────────────────────────────
function i18n(lang: UiLanguage) {
  if (lang === "en") return {
    noData:               "No data available.",
    riskAssessment:       "Risk Assessment",
    riskLevel:            "Risk Level",
    vcDeck:               "VC Pitch Deck",
    confidential:         "CONFIDENTIAL INVESTOR MATERIALS",
    investmentHighlights: "Investment Highlights",
    keyMetrics:           "Key Metrics",
    boardReport:          "Board Report",
    prepared:             "Prepared",
    dueDiligence:         "Due Diligence",
    ddPackage:            "INVESTOR DUE DILIGENCE PACKAGE",
    keyDdQuestions:       "Key Due Diligence Questions",
    dataRoomChecklist:    "Data Room Checklist",
  } as const;
  if (lang === "tg") return {
    noData:               "Маълумот мавҷуд нест.",
    riskAssessment:       "Арзёбии хатар",
    riskLevel:            "Сатҳи хатар",
    vcDeck:               "Питч-дек барои VC",
    confidential:         "МАВОДИ МАХФИИ САРМОЯГУЗОРОН",
    investmentHighlights: "Нуқтаҳои асосии сармоягузорӣ",
    keyMetrics:           "Нишондиҳандаҳои асосӣ",
    boardReport:          "Ҳисобот ба ҳайати директорон",
    prepared:             "Таҳияшуда",
    dueDiligence:         "Санҷиши ҳамаҷониба",
    ddPackage:            "ПАКЕТИ ҲУҶҶАТҲО БАРОИ DUE DILIGENCE",
    keyDdQuestions:       "Саволҳои асосии due diligence",
    dataRoomChecklist:    "Чеклисти data room",
  } as const;
  return {
    noData:               "Данные отсутствуют.",
    riskAssessment:       "Оценка рисков",
    riskLevel:            "Уровень риска",
    vcDeck:               "Питч-дек для VC",
    confidential:         "КОНФИДЕНЦИАЛЬНЫЕ МАТЕРИАЛЫ ДЛЯ ИНВЕСТОРОВ",
    investmentHighlights: "Ключевые инвестиционные тезисы",
    keyMetrics:           "Ключевые метрики",
    boardReport:          "Отчёт совету директоров",
    prepared:             "Подготовлено",
    dueDiligence:         "Комплексная проверка",
    ddPackage:            "ПАКЕТ ДОКУМЕНТОВ ДЛЯ DUE DILIGENCE",
    keyDdQuestions:       "Ключевые вопросы due diligence",
    dataRoomChecklist:    "Чеклист data room",
  } as const;
}

// ── Frame ─────────────────────────────────────────────────────────────────────
function addFrame(s: PptxGenJS.Slide, pptx: PptxGenJS, docName: string, page: number, website: string) {
  s.addShape(pptx.ShapeType.rect, { x: MX, y: 0.13, w: 1.55, h: 0.38, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
  s.addText("LOGO", { x: MX, y: 0.13, w: 1.55, h: 0.38, fontSize: 8.5, color: T.mute, align: "center", valign: "middle", bold: true, charSpacing: 2 });
  s.addText(website, { x: SW - MX - 3.0, y: 0.19, w: 3.0, h: 0.28, fontSize: 8.5, color: T.sub, align: "right" });
  s.addShape(pptx.ShapeType.rect, { x: MX, y: HY, w: CW, h: 0.01, fill: { color: T.border }, line: { color: T.border, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: MX, y: FY, w: CW, h: 0.01, fill: { color: T.border }, line: { color: T.border, width: 0 } });
  s.addText(docName, { x: MX, y: FY + 0.09, w: 8.0, h: 0.28, fontSize: 7.5, color: T.mute });
  s.addText(String(page), { x: SW - MX - 0.7, y: FY + 0.09, w: 0.7, h: 0.28, fontSize: 7.5, color: T.mute, align: "right" });
}

// ── Content slide ─────────────────────────────────────────────────────────────
function addSlide(pptx: PptxGenJS, title: string, docName: string, page: number, website: string) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, page, website);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: HY + 0.01, w: 0.06, h: FY - HY - 0.01, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
  s.addText(title, { x: MX, y: CY, w: CW, h: 0.44, fontSize: 18, bold: true, color: T.text });
  s.addShape(pptx.ShapeType.rect, { x: MX, y: CY + 0.44, w: 0.45, h: 0.035, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: MX + 0.49, y: CY + 0.44, w: 0.14, h: 0.035, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
  return s;
}

// ── Cover ─────────────────────────────────────────────────────────────────────
function addCoverSlide(pptx: PptxGenJS, company: string, docType: string, badge: string, docName: string, website: string) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, 1, website);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: HY + 0.01, w: 0.18, h: FY - HY - 0.01, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: 0.22, y: HY + 0.01, w: 0.08, h: FY - HY - 0.01, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: 0.34, y: HY + 0.01, w: 0.04, h: FY - HY - 0.01, fill: { color: T.gold }, line: { color: T.gold, width: 0 } });
  s.addText(company, { x: MX + 0.2, y: 1.6, w: CW - 0.2, h: 1.8, fontSize: 52, bold: true, color: T.text, valign: "bottom" });
  s.addShape(pptx.ShapeType.rect, { x: MX + 0.2, y: 3.55, w: CW - 0.2, h: 0.055, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
  s.addText(docType, { x: MX + 0.2, y: 3.72, w: CW - 0.2, h: 0.6, fontSize: 20, color: T.a1 });
  s.addText(badge, { x: MX + 0.2, y: 4.42, w: CW - 0.2, h: 0.42, fontSize: 11, color: T.mute });
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function addKpiCard(s: PptxGenJS.Slide, pptx: PptxGenJS, x: number, y: number, w: number, h: number, value: string, label: string, valueColor = T.a1) {
  s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
  s.addShape(pptx.ShapeType.ellipse, { x: x + 0.12, y: y + 0.12, w: 0.2, h: 0.2, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
  s.addText(value, { x, y: y + 0.12, w, h: 0.72, fontSize: 22, bold: true, color: valueColor, align: "center", valign: "middle" });
  s.addText(label, { x, y: y + h - 0.38, w, h: 0.34, fontSize: 10, color: T.sub, align: "center" });
}

// ── Step circle ───────────────────────────────────────────────────────────────
function addStepCircle(s: PptxGenJS.Slide, pptx: PptxGenJS, n: number, x: number, y: number, color: string) {
  s.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.42, h: 0.42, fill: { color }, line: { color, width: 0 } });
  s.addText(String(n), { x, y, w: 0.42, h: 0.42, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
}

// ── Bullets slide ─────────────────────────────────────────────────────────────
function addBulletsSlide(pptx: PptxGenJS, title: string, items: string[], noDataText: string, docName: string, page: number, website: string, bulletColor = T.text) {
  const s = addSlide(pptx, title, docName, page, website);
  const contentY = CY + 0.60;
  if (items.length === 0) {
    s.addText(noDataText, { x: MX, y: contentY, w: CW, h: 0.5, fontSize: 13, color: T.sub });
    return s;
  }
  items.slice(0, 8).forEach((item, i) => {
    const y = contentY + i * 0.54;
    if (y + 0.46 > FY) return;
    addStepCircle(s, pptx, i + 1, MX, y + 0.04, T.a1);
    s.addText(item, { x: MX + 0.54, y, w: CW - 0.54, h: 0.46, fontSize: 12, color: bulletColor, valign: "middle" });
  });
  return s;
}

// ── Content slide (narrative + optional bullets) ───────────────────────────────
function addContentSlide(pptx: PptxGenJS, title: string, content: string, docName: string, page: number, website: string, bullets?: string[]) {
  const s = addSlide(pptx, title, docName, page, website);
  const contentY = CY + 0.60;
  const hasContent = content.trim().length > 0;
  const hasBullets = bullets && bullets.length > 0;

  if (hasContent) {
    const h = hasBullets ? 0.9 : 1.6;
    s.addText(content, { x: MX, y: contentY, w: CW, h, fontSize: 12, color: T.sub, italic: true, valign: "top" });
  }

  if (hasBullets) {
    const bulletsY = contentY + (hasContent ? 1.0 : 0);
    bullets!.slice(0, 7).forEach((item, i) => {
      const y = bulletsY + i * 0.52;
      if (y + 0.44 > FY) return;
      addStepCircle(s, pptx, i + 1, MX, y + 0.04, T.a2);
      s.addText(item, { x: MX + 0.54, y, w: CW - 0.54, h: 0.44, fontSize: 12, color: T.text, valign: "middle" });
    });
  }
  return s;
}

// ── Risk slide ────────────────────────────────────────────────────────────────
function addRiskSlide(pptx: PptxGenJS, report: InvestorReport, lang: UiLanguage, docName: string, page: number, website: string) {
  const tx = i18n(lang);
  const s = addSlide(pptx, tx.riskAssessment, docName, page, website);
  const color = riskColor(report.riskScore);
  const contentY = CY + 0.60;

  // Risk score card (left)
  const cardW = 3.6;
  const cardH = 2.5;
  s.addShape(pptx.ShapeType.rect, { x: MX, y: contentY, w: cardW, h: cardH, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
  s.addShape(pptx.ShapeType.rect, { x: MX, y: contentY, w: cardW, h: 0.06, fill: { color }, line: { color, width: 0 } });
  s.addText(`${report.riskScore}`, { x: MX, y: contentY + 0.18, w: cardW, h: 1.4, fontSize: 72, bold: true, color, align: "center", valign: "middle" });
  s.addText("/ 100", { x: MX, y: contentY + 1.6, w: cardW, h: 0.38, fontSize: 14, color: T.mute, align: "center" });
  s.addText(`${tx.riskLevel}: ${report.riskLabel}`, { x: MX, y: contentY + 2.05, w: cardW, h: 0.34, fontSize: 12, bold: true, color, align: "center" });

  // Risk factors list (right)
  if (report.riskFactors.length > 0) {
    const listX = MX + cardW + 0.4;
    const listW = CW - cardW - 0.4;
    report.riskFactors.slice(0, 6).forEach((rf, i) => {
      const y = contentY + i * 0.54;
      if (y + 0.46 > FY) return;
      const fc = rf.severity === "high" ? T.red : rf.severity === "medium" ? T.amber : T.mute;
      s.addShape(pptx.ShapeType.rect, { x: listX, y: y + 0.14, w: 0.05, h: 0.18, fill: { color: fc }, line: { color: fc, width: 0 } });
      s.addText(rf.factor, { x: listX + 0.14, y, w: listW - 0.14, h: 0.46, fontSize: 12, color: T.text, valign: "middle" });
    });
  }
}

// ─────────────────────────────────────────────────────────
// VC Pitch
// ─────────────────────────────────────────────────────────
export async function buildVcPitchPptx(report: InvestorReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const tx = i18n(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${tx.vcDeck} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";
  let page = 0;

  page++;
  addCoverSlide(pptx, company, tx.vcDeck, `${period}  ·  ${tx.confidential}`, docName, website);

  page++;
  addBulletsSlide(pptx, tx.investmentHighlights, report.investmentHighlights, tx.noData, docName, page, website);

  page++;
  {
    const s = addSlide(pptx, tx.keyMetrics, docName, page, website);
    const kpis = dashboard.kpis.slice(0, 6);
    const cols = 3;
    const cardW = (CW - (cols - 1) * 0.22) / cols;
    const cardH = 1.55;
    kpis.forEach((kpi, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      addKpiCard(s, pptx, MX + col * (cardW + 0.22), CY + 0.60 + row * (cardH + 0.2), cardW, cardH, kpi.value, kpi.label, T.a1);
    });
  }

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
// Board Report
// ─────────────────────────────────────────────────────────
export async function buildBoardReportPptx(report: InvestorReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const tx = i18n(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${tx.boardReport} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";
  const locale  = lang === "en" ? "en-US" : "ru-RU";
  let page = 0;

  page++;
  addCoverSlide(pptx, company, tx.boardReport, `${tx.prepared} ${new Date(report.generatedAt).toLocaleDateString(locale)}  ·  ${period}`, docName, website);

  report.boardReport.slides.slice(1).forEach((slide) => {
    page++;
    addContentSlide(pptx, slide.title, slide.content, docName, page, website, slide.bullets);
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─────────────────────────────────────────────────────────
// Due Diligence
// ─────────────────────────────────────────────────────────
export async function buildDueDiligencePptx(report: InvestorReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const tx = i18n(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${tx.dueDiligence} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";
  let page = 0;

  page++;
  addCoverSlide(pptx, company, tx.dueDiligence, `${period}  ·  ${tx.ddPackage}`, docName, website);

  page++;
  addRiskSlide(pptx, report, lang, docName, page, website);

  report.dueDiligence.slides.slice(2, 7).forEach((slide) => {
    page++;
    addContentSlide(pptx, slide.title, slide.content, docName, page, website, slide.bullets);
  });

  page++;
  addBulletsSlide(pptx, tx.keyDdQuestions, report.dueDiligence.keyQuestions, tx.noData, docName, page, website);

  page++;
  addBulletsSlide(pptx, tx.dataRoomChecklist, report.dueDiligence.dataRoomChecklist, tx.noData, docName, page, website, T.a1);

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
