import PptxGenJS from "pptxgenjs";
import type { AnalysisDashboard, Chart } from "./analytics-schema";
import type { UiLanguage } from "./i18n";

// ── Infographic Design System ─────────────────────────────────────────────────
const T = {
  bg:     "F3EDE3",  // warm cream canvas
  panel:  "FDFAF5",  // light panel / card
  border: "D6CEBD",  // warm border
  a1:     "3D7FA6",  // teal (primary accent)
  a2:     "9A4535",  // terracotta (secondary accent)
  gold:   "B8862A",  // warm gold
  text:   "1A1A1A",  // near-black
  sub:    "5E5650",  // warm mid-gray
  mute:   "9A908A",  // warm muted
  green:  "3A8A65",  // earthy green
  red:    "AC3828",  // warm red
  amber:  "C08A2A",  // amber
};

const SW = 13.33;
const MX = 0.40;
const HY = 0.66;
const FY = 6.84;
const CY = HY + 0.14;
const CW = SW - MX * 2;

const CHART_COLORS = ["3D7FA6", "9A4535", "3A8A65", "B8862A", "AC3828", "6B5EA8"];

// ── Localisation ──────────────────────────────────────────────────────────────
function i18n(lang: UiLanguage) {
  if (lang === "en") return {
    analysis:        "Financial Analysis",
    execSummary:     "Executive Summary",
    keyMetrics:      "Key Metrics",
    keyFindings:     "Key Findings",
    redFlags:        "Red Flags",
    opportunities:   "Opportunities",
    dataTable:       "Data Table",
    analyzedOn:      "Analyzed on",
    noOpportunities: "No specific opportunities identified.",
    noFindings:      "No key findings available.",
  };
  if (lang === "tg") return {
    analysis:        "Таҳлили молиявӣ",
    execSummary:     "Хулосаи иҷроӣ",
    keyMetrics:      "Нишондиҳандаҳои асосӣ",
    keyFindings:     "Бозёфтҳои калидӣ",
    redFlags:        "Нишонаҳои хатар",
    opportunities:   "Имкониятҳо",
    dataTable:       "Ҷадвали маълумот",
    analyzedOn:      "Таҳлил шуд",
    noOpportunities: "Имкониятҳои мушаххас муайян карда нашуданд.",
    noFindings:      "Бозёфтҳо мавҷуд нестанд.",
  };
  return { // ru (default)
    analysis:        "Финансовый анализ",
    execSummary:     "Исполнительное резюме",
    keyMetrics:      "Ключевые показатели",
    keyFindings:     "Ключевые выводы",
    redFlags:        "Красные флаги",
    opportunities:   "Возможности",
    dataTable:       "Таблица данных",
    analyzedOn:      "Проанализировано",
    noOpportunities: "Специфических возможностей не выявлено.",
    noFindings:      "Ключевые выводы отсутствуют.",
  };
}

// ── Frame ─────────────────────────────────────────────────────────────────────
function addFrame(s: PptxGenJS.Slide, pptx: PptxGenJS, docName: string, page: number, website: string) {
  // Logo placeholder (top-left)
  s.addShape(pptx.ShapeType.rect, { x: MX, y: 0.13, w: 1.55, h: 0.38, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
  s.addText("LOGO", { x: MX, y: 0.13, w: 1.55, h: 0.38, fontSize: 8.5, color: T.mute, align: "center", valign: "middle", bold: true, charSpacing: 2 });
  // Website (top-right)
  s.addText(website, { x: SW - MX - 3.0, y: 0.19, w: 3.0, h: 0.28, fontSize: 8.5, color: T.sub, align: "right" });
  // Header divider (warm)
  s.addShape(pptx.ShapeType.rect, { x: MX, y: HY, w: CW, h: 0.01, fill: { color: T.border }, line: { color: T.border, width: 0 } });
  // Footer divider
  s.addShape(pptx.ShapeType.rect, { x: MX, y: FY, w: CW, h: 0.01, fill: { color: T.border }, line: { color: T.border, width: 0 } });
  // Doc name (bottom-left)
  s.addText(docName, { x: MX, y: FY + 0.09, w: 8.0, h: 0.28, fontSize: 7.5, color: T.mute });
  // Page number (bottom-right)
  s.addText(String(page), { x: SW - MX - 0.7, y: FY + 0.09, w: 0.7, h: 0.28, fontSize: 7.5, color: T.mute, align: "right" });
}

// ── Cover slide ───────────────────────────────────────────────────────────────
function addCoverSlide(pptx: PptxGenJS, company: string, docType: string, period: string, date: string, docName: string, website: string, lang: string) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, 1, website);

  // Left decorative band
  s.addShape(pptx.ShapeType.rect, { x: 0, y: HY + 0.01, w: 0.18, h: FY - HY - 0.01, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: 0.22, y: HY + 0.01, w: 0.08, h: FY - HY - 0.01, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: 0.34, y: HY + 0.01, w: 0.04, fill: { color: T.gold }, h: FY - HY - 0.01, line: { color: T.gold, width: 0 } });

  // Decorative horizontal accent below header
  s.addShape(pptx.ShapeType.rect, { x: MX + 0.2, y: CY + 0.06, w: CW * 0.22, h: 0.055, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });

  // Company name (large)
  s.addText(company, { x: MX + 0.2, y: 1.6, w: CW - 0.2, h: 1.8, fontSize: 52, bold: true, color: T.text, valign: "bottom" });

  // Horizontal accent bar
  s.addShape(pptx.ShapeType.rect, { x: MX + 0.2, y: 3.55, w: CW - 0.2, h: 0.055, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });

  // Document type
  s.addText(docType, { x: MX + 0.2, y: 3.72, w: CW - 0.2, h: 0.6, fontSize: 20, color: T.a1, bold: false });

  // Period · Date
  s.addText(`${period}  ·  ${date}`, { x: MX + 0.2, y: 4.42, w: CW - 0.2, h: 0.42, fontSize: 12, color: T.sub });
}

// ── Content slide ─────────────────────────────────────────────────────────────
function addSlide(pptx: PptxGenJS, title: string, docName: string, page: number, website: string) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, page, website);

  // Left side accent strip
  s.addShape(pptx.ShapeType.rect, { x: 0, y: HY + 0.01, w: 0.06, h: FY - HY - 0.01, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });

  s.addText(title, { x: MX, y: CY, w: CW, h: 0.44, fontSize: 18, bold: true, color: T.text });
  // Warm accent underline
  s.addShape(pptx.ShapeType.rect, { x: MX, y: CY + 0.44, w: 0.45, h: 0.035, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: MX + 0.49, y: CY + 0.44, w: 0.14, h: 0.035, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });

  return s;
}

// ── KPI card (infographic style) ──────────────────────────────────────────────
function addKpiCard(
  s: PptxGenJS.Slide, pptx: PptxGenJS,
  kpi: { label: string; value: string; change?: string; trend?: string },
  x: number, y: number, w: number, h: number,
) {
  // Card body
  s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });

  // Small accent dot (top-left)
  s.addShape(pptx.ShapeType.ellipse, { x: x + 0.12, y: y + 0.12, w: 0.2, h: 0.2, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });

  // Value
  s.addText(kpi.value, { x, y: y + 0.08, w, h: h * 0.48, fontSize: 21, bold: true, color: T.a1, align: "center", valign: "middle" });

  // Label
  s.addText(kpi.label, { x: x + 0.08, y: y + h * 0.55, w: w - 0.16, h: h * 0.26, fontSize: 9.5, color: T.text, align: "center" });

  // Change / trend
  if (kpi.change) {
    const cc = kpi.trend === "up" ? T.green : kpi.trend === "down" ? T.red : T.sub;
    const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
    s.addText(`${kpi.change}${arrow}`, { x, y: y + h * 0.82, w, h: h * 0.16, fontSize: 9, color: cc, align: "center" });
  }
}

// ── Numbered step circle ──────────────────────────────────────────────────────
function addStepCircle(s: PptxGenJS.Slide, pptx: PptxGenJS, n: number, x: number, y: number, color: string) {
  s.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.42, h: 0.42, fill: { color }, line: { color, width: 0 } });
  s.addText(String(n), { x, y, w: 0.42, h: 0.42, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
type BarSeries = { name: string; labels: string[]; values: number[] };

function analyticsChartToBarData(chart: Chart): BarSeries[] {
  if (!chart.data.length) return [];
  const firstRow = chart.data[0]!;
  const keys = Object.keys(firstRow);
  if (keys.length < 2) return [];
  const [labelKey, ...valueKeys] = keys;
  const labels = chart.data.map((r) => String(r[labelKey!] ?? ""));
  return valueKeys
    .filter((k) => chart.data.some((r) => typeof r[k] === "number" && r[k] !== null))
    .slice(0, 5)
    .map((k) => ({
      name: k,
      labels,
      values: chart.data.map((r) => (typeof r[k] === "number" ? (r[k] as number) : 0)),
    }));
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildAnalysisPptx(dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const d = dashboard;
  const tx = i18n(lang);
  const locale = lang === "en" ? "en-US" : lang === "tg" ? "ru-RU" : "ru-RU";
  const docName = `${tx.analysis} · ${d.meta.period}`;
  const website = d.meta.companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  const date = new Date(d.meta.analyzedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  let page = 0;

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  addCoverSlide(pptx, d.meta.companyName, d.meta.documentType || tx.analysis, d.meta.period, `${tx.analyzedOn}: ${date}`, docName, website, lang);

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, tx.execSummary, docName, page, website);
    s.addText(d.summary.executive, {
      x: MX, y: CY + 0.58, w: CW, h: FY - CY - 0.74,
      fontSize: 13, color: T.sub, valign: "top", paraSpaceAfter: 5,
    });
  }

  // ── 3. Key Metrics (KPI grid + first chart) ───────────────────────────────
  page++;
  {
    const s = addSlide(pptx, tx.keyMetrics, docName, page, website);
    const kpis = d.kpis.slice(0, 6);
    const hasChart = d.charts.length > 0;

    const gridW = hasChart ? 7.4 : CW;
    const cols = 3;
    const cardW = (gridW - (cols - 1) * 0.22) / cols;
    const cardH = 1.68;
    const gridY = CY + 0.60;

    kpis.forEach((kpi, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      addKpiCard(s, pptx, kpi, MX + col * (cardW + 0.22), gridY + row * (cardH + 0.24), cardW, cardH);
    });

    if (hasChart) {
      const barData = analyticsChartToBarData(d.charts[0]!);
      if (barData.length) {
        const cx = MX + gridW + 0.35;
        const cw = SW - cx - MX;
        s.addText(d.charts[0]!.title, { x: cx, y: CY + 0.56, w: cw, h: 0.3, fontSize: 9, color: T.sub, bold: true });
        s.addChart(pptx.ChartType.bar, barData, {
          x: cx, y: CY + 0.88, w: cw, h: FY - CY - 1.04,
          barDir: "col", barGapWidthPct: 55,
          chartColors: CHART_COLORS,
          catAxisLabelColor: T.sub, valAxisLabelColor: T.sub,
          catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
          showLegend: barData.length > 1, legendPos: "b", legendFontSize: 8,
          showTitle: false, showValue: false,
        } as PptxGenJS.IChartOpts);
      }
    }
  }

  // ── 4. Chart slides (up to 2) ─────────────────────────────────────────────
  for (const chart of d.charts.slice(0, 2)) {
    const barData = analyticsChartToBarData(chart);
    if (!barData.length) continue;
    page++;
    const s = addSlide(pptx, chart.title, docName, page, website);
    if (chart.description) {
      s.addText(chart.description, { x: MX, y: CY + 0.56, w: CW, h: 0.3, fontSize: 9.5, color: T.sub, italic: true });
    }
    const chartY = chart.description ? CY + 0.94 : CY + 0.58;
    s.addChart(pptx.ChartType.bar, barData, {
      x: MX, y: chartY, w: CW, h: FY - chartY - 0.15,
      barDir: "col", barGapWidthPct: 55,
      chartColors: CHART_COLORS,
      catAxisLabelColor: T.sub, valAxisLabelColor: T.sub,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      showLegend: barData.length > 1, legendPos: "b", legendFontSize: 9,
      showTitle: false, showValue: false,
    } as PptxGenJS.IChartOpts);
  }

  // ── 5. Key Findings & Red Flags ───────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, `${tx.keyFindings} & ${tx.redFlags}`, docName, page, website);
    const contentY = CY + 0.60;
    const leftW = CW * 0.5 - 0.18;
    const findings = d.summary.keyFindings.length > 0 ? d.summary.keyFindings : [tx.noFindings];

    findings.slice(0, 6).forEach((f, i) => {
      const y = contentY + i * 0.56;
      if (y + 0.46 > FY) return;
      addStepCircle(s, pptx, i + 1, MX, y + 0.03, T.a1);
      s.addText(f, { x: MX + 0.54, y, w: leftW - 0.54, h: 0.48, fontSize: 11.5, color: T.text, valign: "middle" });
    });

    if (d.summary.redFlags.length > 0) {
      s.addShape(pptx.ShapeType.rect, { x: MX + leftW + 0.18, y: contentY, w: 0.01, h: FY - contentY - 0.15, fill: { color: T.border }, line: { color: T.border, width: 0 } });
      const rx = MX + leftW + 0.36;
      const rw = CW - leftW - 0.36;
      s.addText(tx.redFlags, { x: rx, y: contentY, w: rw, h: 0.34, fontSize: 11, bold: true, color: T.red });
      d.summary.redFlags.slice(0, 6).forEach((f, i) => {
        const y = contentY + 0.40 + i * 0.52;
        if (y + 0.44 > FY) return;
        s.addShape(pptx.ShapeType.rect, { x: rx, y: y + 0.14, w: 0.18, h: 0.035, fill: { color: T.red }, line: { color: T.red, width: 0 } });
        s.addText(f, { x: rx + 0.26, y, w: rw - 0.26, h: 0.44, fontSize: 11.5, color: T.text, valign: "middle" });
      });
    }
  }

  // ── 6. Data Table ─────────────────────────────────────────────────────────
  if (d.tables.length > 0) {
    page++;
    const tbl = d.tables[0]!;
    const s = addSlide(pptx, tbl.title || tx.dataTable, docName, page, website);
    const headers = tbl.headers.map((h) => ({ text: h, options: { bold: true, color: T.panel, fill: { color: T.a1 } } }));
    const rows = tbl.rows.slice(0, 12).map((row, ri) => row.map((cell) => ({
      text: cell,
      options: { color: T.text, fill: { color: ri % 2 === 0 ? T.panel : T.bg } },
    })));
    s.addTable([headers, ...rows], { x: MX, y: CY + 0.60, w: CW, fontSize: 10, border: { color: T.border, pt: 0.5 }, rowH: 0.32 });
  }

  // ── 7. Opportunities ─────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, tx.opportunities, docName, page, website);
    const items = d.summary.opportunities.length > 0 ? d.summary.opportunities : [tx.noOpportunities];

    // Two-column layout if many items
    const mid = Math.ceil(Math.min(items.length, 8) / 2);
    const leftItems = items.slice(0, mid);
    const rightItems = items.slice(mid, 8);
    const colW = rightItems.length > 0 ? CW * 0.5 - 0.15 : CW;
    const contentY = CY + 0.62;

    leftItems.forEach((opp, i) => {
      const y = contentY + i * 0.72;
      if (y + 0.55 > FY) return;
      addStepCircle(s, pptx, i + 1, MX, y + 0.08, T.a2);
      s.addShape(pptx.ShapeType.rect, { x: MX + 0.42, y: y + 0.22, w: colW - 0.54, h: 0.01, fill: { color: T.border }, line: { color: T.border, width: 0 } });
      s.addText(opp, { x: MX + 0.52, y, w: colW - 0.54, h: 0.56, fontSize: 11.5, color: T.text, valign: "middle" });
    });

    if (rightItems.length > 0) {
      const rx = MX + colW + 0.3;
      rightItems.forEach((opp, i) => {
        const y = contentY + i * 0.72;
        if (y + 0.55 > FY) return;
        addStepCircle(s, pptx, mid + i + 1, rx, y + 0.08, T.a2);
        s.addText(opp, { x: rx + 0.52, y, w: colW - 0.54, h: 0.56, fontSize: 11.5, color: T.text, valign: "middle" });
      });
    }
  }

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
