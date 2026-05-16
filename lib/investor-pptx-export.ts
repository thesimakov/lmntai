import PptxGenJS from "pptxgenjs";
import type { InvestorReport } from "./investor-schema";
import type { AnalysisDashboard } from "./analytics-schema";
import type { UiLanguage } from "./i18n";

// ── Corporate Clean Design System ─────────────────────────────────────────────
const T = {
  bg:     "FFFFFF",
  navy:   "0F1C35",
  blue:   "1D4ED8",
  panel:  "F8FAFC",
  border: "D1D5DB",
  text:   "0F1C35",
  sub:    "374151",
  mute:   "6B7280",
  green:  "059669",
  red:    "DC2626",
  amber:  "D97706",
};

const SW    = 13.33;
const MX    = 0.48;
const HY    = 0.56;
const FY    = 6.84;
const CY    = HY + 0.10;
const CW    = SW - MX * 2;
const SPLIT = 7.8;

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

// ── Shared slide builders ─────────────────────────────────────────────────────
function makeHelpers(instance: PptxGenJS) {
  const frame = (s: PptxGenJS.Slide, dn: string, pg: number, web: string) => {
    s.addShape(instance.ShapeType.rect, { x: MX, y: 0.12, w: 1.6, h: 0.36, fill: { color: T.panel }, line: { color: T.border, width: 0.5 } });
    s.addText("LOGO", { x: MX, y: 0.12, w: 1.6, h: 0.36, fontSize: 8, color: T.navy, fontFace: "Calibri", align: "center", valign: "middle", bold: true, charSpacing: 2 });
    s.addText(web, { x: SW - MX - 3.0, y: 0.16, w: 2.6, h: 0.28, fontSize: 8.5, color: T.mute, fontFace: "Calibri", align: "right" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: HY, w: CW, h: 0.012, fill: { color: T.border }, line: { type: "none" } });
    s.addShape(instance.ShapeType.rect, { x: MX, y: FY, w: CW, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(dn, { x: MX, y: FY + 0.08, w: 8.0, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri" });
    s.addText(String(pg), { x: SW - MX - 0.7, y: FY + 0.08, w: 0.7, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri", align: "right" });
  };

  const addSlide = (title: string, dn: string, pg: number, web: string) => {
    const s = instance.addSlide();
    s.background = { color: T.bg };
    frame(s, dn, pg, web);
    s.addShape(instance.ShapeType.rect, { x: MX, y: CY + 0.07, w: 0.10, h: 0.28, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(title, { x: MX + 0.18, y: CY, w: CW - 1.8, h: 0.44, fontSize: 20, bold: true, fontFace: "Calibri", color: T.navy });
    return s;
  };

  const addCoverSlide = (company: string, docType: string, badge: string, dn: string, web: string) => {
    const s = instance.addSlide();
    s.background = { color: T.bg };

    // Right dark navy panel
    s.addShape(instance.ShapeType.rect, { x: SPLIT, y: 0, w: SW - SPLIT, h: 7.5, fill: { color: T.navy }, line: { type: "none" } });
    [1.5, 2.5, 3.5, 4.5, 5.5].forEach((y) => {
      s.addShape(instance.ShapeType.rect, { x: SPLIT + 0.36, y, w: SW - SPLIT - 0.72, h: 0.010, fill: { color: "FFFFFF", transparency: 78 }, line: { type: "none" } });
    });
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.8, y: 3.8, w: 4.4, h: 4.4, fill: { color: "FFFFFF", transparency: 94 }, line: { type: "none" } });
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.38, y: 6.42, w: 0.14, h: 0.14, fill: { color: "FFFFFF", transparency: 60 }, line: { type: "none" } });
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.60, y: 6.44, w: 0.10, h: 0.10, fill: { color: "FFFFFF", transparency: 70 }, line: { type: "none" } });

    s.addShape(instance.ShapeType.rect, { x: SPLIT + 0.36, y: 0.22, w: 1.9, h: 0.48, fill: { color: "FFFFFF", transparency: 88 }, line: { color: "FFFFFF", width: 0.75, transparency: 60 } });
    s.addText("LOGO", { x: SPLIT + 0.36, y: 0.22, w: 1.9, h: 0.48, fontSize: 9, color: "FFFFFF", fontFace: "Calibri", align: "center", valign: "middle", bold: true, charSpacing: 2 });
    s.addText(web, { x: SPLIT + 0.36, y: 6.58, w: SW - SPLIT - 0.72, h: 0.26, fontSize: 7.5, color: "FFFFFF", fontFace: "Calibri", transparency: 40 });

    s.addText(company, { x: MX, y: 1.8, w: SPLIT - MX * 2, h: 1.1, fontSize: 38, bold: true, fontFace: "Calibri", color: T.navy, valign: "middle" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.02, w: 2.8, h: 0.048, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(docType.toUpperCase(), { x: MX, y: 3.16, w: SPLIT - MX * 2, h: 0.46, fontSize: 11, color: T.blue, fontFace: "Calibri", charSpacing: 3.5 });
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.74, w: SPLIT - MX * 2 - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(badge, { x: MX, y: 3.90, w: SPLIT - MX * 2, h: 0.38, fontSize: 11, color: T.mute, fontFace: "Calibri" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: FY, w: SPLIT - MX - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(dn, { x: MX, y: FY + 0.08, w: SPLIT - MX - 0.2, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri" });
  };

  const addKpiCard = (s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, value: string, label: string, valueColor = T.navy) => {
    s.addShape(instance.ShapeType.rect, { x, y, w, h, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
    s.addShape(instance.ShapeType.rect, { x, y, w: 0.06, h, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(value, { x: x + 0.08, y: y + 0.10, w: w - 0.16, h: 0.72, fontSize: 26, bold: true, color: valueColor, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText(label, { x: x + 0.08, y: y + h - 0.38, w: w - 0.16, h: 0.34, fontSize: 10, color: T.mute, align: "center", fontFace: "Calibri" });
  };

  const stepBox = (s: PptxGenJS.Slide, n: number, x: number, y: number, color: string) => {
    s.addShape(instance.ShapeType.rect, { x, y, w: 0.36, h: 0.36, fill: { color }, line: { type: "none" }, rectRadius: 0.04 });
    s.addText(String(n).padStart(2, "0"), { x, y, w: 0.36, h: 0.36, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Calibri" });
  };

  const addBulletsSlide = (title: string, items: string[], noDataText: string, dn: string, pg: number, web: string, bulletColor = T.sub) => {
    const s = addSlide(title, dn, pg, web);
    const contentY = CY + 0.58;
    if (items.length === 0) {
      s.addText(noDataText, { x: MX, y: contentY, w: CW, h: 0.5, fontSize: 13, color: T.mute, fontFace: "Calibri" });
      return s;
    }
    items.slice(0, 8).forEach((item, i) => {
      const y = contentY + i * 0.54;
      if (y + 0.46 > FY) return;
      stepBox(s, i + 1, MX, y + 0.04, T.navy);
      s.addText(item, { x: MX + 0.48, y, w: CW - 0.52, h: 0.46, fontSize: 12, color: bulletColor, valign: "middle", fontFace: "Calibri" });
    });
    return s;
  };

  const addContentSlide = (title: string, content: string, dn: string, pg: number, web: string, bullets?: string[]) => {
    const s = addSlide(title, dn, pg, web);
    const contentY   = CY + 0.58;
    const hasContent = content.trim().length > 0;
    const hasBullets = bullets && bullets.length > 0;

    if (hasContent) {
      s.addText(content, { x: MX, y: contentY, w: CW, h: hasBullets ? 0.9 : 1.6, fontSize: 12, color: T.sub, italic: true, valign: "top", fontFace: "Calibri" });
    }
    if (hasBullets) {
      const bulletsY = contentY + (hasContent ? 1.0 : 0);
      bullets!.slice(0, 7).forEach((item, i) => {
        const y = bulletsY + i * 0.52;
        if (y + 0.44 > FY) return;
        stepBox(s, i + 1, MX, y + 0.04, T.blue);
        s.addText(item, { x: MX + 0.48, y, w: CW - 0.52, h: 0.44, fontSize: 12, color: T.sub, valign: "middle", fontFace: "Calibri" });
      });
    }
    return s;
  };

  const addRiskSlide = (report: InvestorReport, tx: ReturnType<typeof i18n>, dn: string, pg: number, web: string) => {
    const s       = addSlide(tx.riskAssessment, dn, pg, web);
    const color   = riskColor(report.riskScore);
    const contentY = CY + 0.58;
    const cardW   = 3.6;
    const cardH   = 2.5;

    // Risk score card
    s.addShape(instance.ShapeType.rect, { x: MX, y: contentY, w: cardW, h: cardH, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
    s.addShape(instance.ShapeType.rect, { x: MX, y: contentY, w: cardW, h: 0.06, fill: { color }, line: { type: "none" } });
    s.addText(`${report.riskScore}`, { x: MX, y: contentY + 0.18, w: cardW, h: 1.4, fontSize: 72, bold: true, color, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText("/ 100", { x: MX, y: contentY + 1.60, w: cardW, h: 0.38, fontSize: 14, color: T.mute, align: "center", fontFace: "Calibri" });
    s.addText(`${tx.riskLevel}: ${report.riskLabel}`, { x: MX, y: contentY + 2.05, w: cardW, h: 0.34, fontSize: 12, bold: true, color, align: "center", fontFace: "Calibri" });

    if (report.riskFactors.length > 0) {
      const listX = MX + cardW + 0.40;
      const listW = CW - cardW - 0.40;
      report.riskFactors.slice(0, 6).forEach((rf, i) => {
        const y  = contentY + i * 0.54;
        if (y + 0.46 > FY) return;
        const fc = rf.severity === "high" ? T.red : rf.severity === "medium" ? T.amber : T.mute;
        s.addShape(instance.ShapeType.rect, { x: listX, y: y + 0.08, w: 0.06, h: 0.28, fill: { color: fc }, line: { type: "none" }, rectRadius: 0.02 });
        s.addText(rf.factor, { x: listX + 0.14, y, w: listW - 0.14, h: 0.46, fontSize: 12, color: T.sub, valign: "middle", fontFace: "Calibri" });
      });
    }
  };

  return { addSlide, addCoverSlide, addKpiCard, addBulletsSlide, addContentSlide, addRiskSlide };
}

// ─────────────────────────────────────────────────────────
// VC Pitch
// ─────────────────────────────────────────────────────────
export async function buildVcPitchPptx(report: InvestorReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const tx = i18n(lang);
  const instance = new PptxGenJS();
  instance.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${tx.vcDeck} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";
  const H = makeHelpers(instance);
  let page = 0;

  page++;
  H.addCoverSlide(company, tx.vcDeck, `${period}  ·  ${tx.confidential}`, docName, website);

  page++;
  H.addBulletsSlide(tx.investmentHighlights, report.investmentHighlights, tx.noData, docName, page, website);

  page++;
  {
    const s    = H.addSlide(tx.keyMetrics, docName, page, website);
    const kpis = dashboard.kpis.slice(0, 6);
    const cols = 3;
    const cardW = (CW - (cols - 1) * 0.22) / cols;
    const cardH = 1.55;
    kpis.forEach((kpi, i) => {
      H.addKpiCard(s, MX + (i % cols) * (cardW + 0.22), CY + 0.58 + Math.floor(i / cols) * (cardH + 0.20), cardW, cardH, kpi.value, kpi.label);
    });
  }

  const vcSlides = report.vcPitch.slides;
  [3, 4, 5, 6, 7, 8, 9].forEach((idx) => {
    const sl = vcSlides[idx];
    if (!sl) return;
    page++;
    H.addContentSlide(sl.title, sl.content, docName, page, website, sl.bullets);
  });

  const output = await instance.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─────────────────────────────────────────────────────────
// Board Report
// ─────────────────────────────────────────────────────────
export async function buildBoardReportPptx(report: InvestorReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const tx = i18n(lang);
  const instance = new PptxGenJS();
  instance.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${tx.boardReport} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";
  const locale  = lang === "en" ? "en-US" : "ru-RU";
  const H = makeHelpers(instance);
  let page = 0;

  page++;
  H.addCoverSlide(company, tx.boardReport, `${tx.prepared} ${new Date(report.generatedAt).toLocaleDateString(locale)}  ·  ${period}`, docName, website);

  report.boardReport.slides.slice(1).forEach((sl) => {
    page++;
    H.addContentSlide(sl.title, sl.content, docName, page, website, sl.bullets);
  });

  const output = await instance.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─────────────────────────────────────────────────────────
// Due Diligence
// ─────────────────────────────────────────────────────────
export async function buildDueDiligencePptx(report: InvestorReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const tx = i18n(lang);
  const instance = new PptxGenJS();
  instance.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${tx.dueDiligence} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";
  const H = makeHelpers(instance);
  let page = 0;

  page++;
  H.addCoverSlide(company, tx.dueDiligence, `${period}  ·  ${tx.ddPackage}`, docName, website);

  page++;
  H.addRiskSlide(report, tx, docName, page, website);

  report.dueDiligence.slides.slice(2, 7).forEach((sl) => {
    page++;
    H.addContentSlide(sl.title, sl.content, docName, page, website, sl.bullets);
  });

  page++;
  H.addBulletsSlide(tx.keyDdQuestions, report.dueDiligence.keyQuestions, tx.noData, docName, page, website);

  page++;
  H.addBulletsSlide(tx.dataRoomChecklist, report.dueDiligence.dataRoomChecklist, tx.noData, docName, page, website, T.blue);

  const output = await instance.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
