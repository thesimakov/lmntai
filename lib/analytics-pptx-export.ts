import PptxGenJS from "pptxgenjs";
import type { AnalysisDashboard, Chart } from "./analytics-schema";
import type { UiLanguage } from "./i18n";
import { sanitizePptxBrandAssets, sanitizePptxHex, type PptxBrandAssets } from "./pptx-sanitize";

export type { PptxBrandAssets };

// ── Corporate Clean Design System ─────────────────────────────────────────────
const DEFAULT_THEME = {
  bg:     "FFFFFF",
  navy:   "0F1C35",   // primary dark navy
  blue:   "1D4ED8",   // accent blue
  panel:  "F8FAFC",   // subtle panel
  border: "D1D5DB",   // clean gray border
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
const SPLIT = 7.8;   // cover: left text panel / right navy panel

const DEFAULT_CHART_COLORS = ["1D4ED8", "0F1C35", "3B82F6", "60A5FA", "6B7280", "D1D5DB"];

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
  return {
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

function stripHash(hex: string): string {
  return sanitizePptxHex(hex, "0F1C35");
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildAnalysisPptx(
  dashboard: AnalysisDashboard,
  lang: UiLanguage = "ru",
  brand?: PptxBrandAssets | null
): Promise<Buffer> {
  const safeBrand = sanitizePptxBrandAssets(brand ?? undefined);
  const instance = new PptxGenJS();
  instance.layout = "LAYOUT_WIDE";

  const T = {
    ...DEFAULT_THEME,
    ...(safeBrand?.primaryHex
      ? { navy: stripHash(safeBrand.primaryHex), text: stripHash(safeBrand.primaryHex) }
      : {}),
    ...(safeBrand?.accentHex ? { blue: stripHash(safeBrand.accentHex) } : {}),
  };
  const CHART_COLORS = safeBrand?.accentHex
    ? [stripHash(safeBrand.accentHex), T.navy, ...DEFAULT_CHART_COLORS.slice(2)]
    : DEFAULT_CHART_COLORS;

  const d      = dashboard;
  const tx     = i18n(lang);
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const docName = `${tx.analysis} · ${d.meta.period}`;
  const website = d.meta.companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  const date    = new Date(d.meta.analyzedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  let page = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const cover = (company: string, docType: string, period: string, dt: string, dn: string, web: string) => {
    const s = instance.addSlide();
    s.background = { color: T.bg };

    // Right dark navy panel
    s.addShape(instance.ShapeType.rect, { x: SPLIT, y: 0, w: SW - SPLIT, h: 7.5, fill: { color: T.navy }, line: { type: "none" } });

    // Right panel: horizontal accent lines
    [1.5, 2.5, 3.5, 4.5, 5.5].forEach((y) => {
      s.addShape(instance.ShapeType.rect, {
        x: SPLIT + 0.36, y, w: SW - SPLIT - 0.72, h: 0.010,
        fill: { color: "FFFFFF", transparency: 78 }, line: { type: "none" },
      });
    });
    // Large subtle circle
    s.addShape(instance.ShapeType.ellipse, {
      x: SPLIT + 0.8, y: 3.8, w: 4.4, h: 4.4,
      fill: { color: "FFFFFF", transparency: 94 }, line: { type: "none" },
    });
    // Small accent dots
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.38, y: 6.42, w: 0.14, h: 0.14, fill: { color: "FFFFFF", transparency: 60 }, line: { type: "none" } });
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.60, y: 6.44, w: 0.10, h: 0.10, fill: { color: "FFFFFF", transparency: 70 }, line: { type: "none" } });

    // Logo on right panel
    if (safeBrand?.logoData) {
      s.addImage({ data: `data:${safeBrand.logoData.mime};base64,${safeBrand.logoData.base64}`, x: SPLIT + 0.36, y: 0.20, w: 1.9, h: 0.52, sizing: { type: "contain", w: 1.9, h: 0.52 } });
    } else {
      s.addShape(instance.ShapeType.rect, { x: SPLIT + 0.36, y: 0.22, w: 1.9, h: 0.48, fill: { color: "FFFFFF", transparency: 88 }, line: { color: "FFFFFF", width: 0.75, transparency: 60 } });
      s.addText("LOGO", { x: SPLIT + 0.36, y: 0.22, w: 1.9, h: 0.48, fontSize: 9, color: "FFFFFF", fontFace: "Calibri", align: "center", valign: "middle", bold: true, charSpacing: 2 });
    }
    // Web on right panel
    s.addText(web, { x: SPLIT + 0.36, y: 6.58, w: SW - SPLIT - 0.72, h: 0.26, fontSize: 7.5, color: "FFFFFF", fontFace: "Calibri", transparency: 40 });

    // Left: company name
    s.addText(company, { x: MX, y: 1.8, w: SPLIT - MX * 2, h: 1.1, fontSize: 38, bold: true, fontFace: "Calibri", color: T.navy, valign: "middle" });
    // Blue accent bar
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.02, w: 2.8, h: 0.048, fill: { color: T.blue }, line: { type: "none" } });
    // Doc type
    s.addText(docType.toUpperCase(), { x: MX, y: 3.16, w: SPLIT - MX * 2, h: 0.46, fontSize: 11, color: T.blue, fontFace: "Calibri", charSpacing: 3.5 });
    // Divider
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.74, w: SPLIT - MX * 2 - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    // Period & date
    s.addText(`${period}  ·  ${dt}`, { x: MX, y: 3.90, w: SPLIT - MX * 2, h: 0.38, fontSize: 11, color: T.mute, fontFace: "Calibri" });

    // Footer (left side only)
    s.addShape(instance.ShapeType.rect, { x: MX, y: FY, w: SPLIT - MX - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(dn, { x: MX, y: FY + 0.08, w: SPLIT - MX - 0.2, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri" });
  };

  const frame = (s: PptxGenJS.Slide, dn: string, pg: number, web: string) => {
    // Logo box
    if (safeBrand?.logoData) {
      s.addImage({ data: `data:${safeBrand.logoData.mime};base64,${safeBrand.logoData.base64}`, x: MX, y: 0.12, w: 1.6, h: 0.36, sizing: { type: "contain", w: 1.6, h: 0.36 } });
    } else {
      s.addShape(instance.ShapeType.rect, { x: MX, y: 0.12, w: 1.6, h: 0.36, fill: { color: T.panel }, line: { color: T.border, width: 0.5 } });
      s.addText("LOGO", { x: MX, y: 0.12, w: 1.6, h: 0.36, fontSize: 8, color: T.navy, fontFace: "Calibri", align: "center", valign: "middle", bold: true, charSpacing: 2 });
    }
    // Website
    s.addText(web, { x: SW - MX - 3.0, y: 0.16, w: 2.6, h: 0.28, fontSize: 8.5, color: T.mute, fontFace: "Calibri", align: "right" });
    // Separator
    s.addShape(instance.ShapeType.rect, { x: MX, y: HY, w: CW, h: 0.012, fill: { color: T.border }, line: { type: "none" } });
    // Footer
    s.addShape(instance.ShapeType.rect, { x: MX, y: FY, w: CW, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(dn, { x: MX, y: FY + 0.08, w: 8.0, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri" });
    s.addText(String(pg), { x: SW - MX - 0.7, y: FY + 0.08, w: 0.7, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri", align: "right" });
  };

  const slide = (title: string, dn: string, pg: number, web: string) => {
    const s = instance.addSlide();
    s.background = { color: T.bg };
    frame(s, dn, pg, web);
    s.addShape(instance.ShapeType.rect, { x: MX, y: CY + 0.07, w: 0.10, h: 0.28, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(title, { x: MX + 0.18, y: CY, w: CW - 1.8, h: 0.44, fontSize: 20, bold: true, fontFace: "Calibri", color: T.navy });
    return s;
  };

  const kpiCard = (s: PptxGenJS.Slide, kpi: { label: string; value: string; change?: string; trend?: string }, x: number, y: number, w: number, h: number) => {
    s.addShape(instance.ShapeType.rect, { x, y, w, h, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
    s.addShape(instance.ShapeType.rect, { x, y, w: 0.06, h, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(kpi.value, { x: x + 0.08, y: y + 0.08, w: w - 0.16, h: h * 0.52, fontSize: 28, bold: true, color: T.navy, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText(kpi.label, { x: x + 0.10, y: y + h * 0.62, w: w - 0.20, h: h * 0.25, fontSize: 9, color: T.mute, align: "center", fontFace: "Calibri" });
    if (kpi.change) {
      const cc = kpi.trend === "up" ? T.green : kpi.trend === "down" ? T.red : T.mute;
      const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
      s.addText(`${kpi.change}${arrow}`, { x, y: y + h * 0.87, w, h: h * 0.12, fontSize: 8.5, color: cc, align: "center", fontFace: "Calibri" });
    }
  };

  const stepBox = (s: PptxGenJS.Slide, n: number, x: number, y: number, color: string) => {
    s.addShape(instance.ShapeType.rect, { x, y, w: 0.36, h: 0.36, fill: { color }, line: { type: "none" }, rectRadius: 0.04 });
    s.addText(String(n).padStart(2, "0"), { x, y, w: 0.36, h: 0.36, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Calibri" });
  };

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  cover(d.meta.companyName, d.meta.documentType || tx.analysis, d.meta.period, `${tx.analyzedOn}: ${date}`, docName, website);

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = slide(tx.execSummary, docName, page, website);
    s.addText(d.summary.executive, { x: MX, y: CY + 0.58, w: CW, h: FY - CY - 0.76, fontSize: 13, color: T.sub, valign: "top", paraSpaceAfter: 5, fontFace: "Calibri" });
  }

  // ── 3. Key Metrics ────────────────────────────────────────────────────────
  page++;
  let firstChartOnMetrics = false;
  {
    const s = slide(tx.keyMetrics, docName, page, website);
    const kpis = d.kpis.slice(0, 6);
    const hasChart = d.charts.length > 0;
    const gridW  = hasChart ? 7.4 : CW;
    const cols   = 3;
    const cardW  = (gridW - (cols - 1) * 0.22) / cols;
    const cardH  = 1.66;
    const gridY  = CY + 0.60;

    kpis.forEach((kpi, i) => {
      kpiCard(s, kpi, MX + (i % cols) * (cardW + 0.22), gridY + Math.floor(i / cols) * (cardH + 0.22), cardW, cardH);
    });

    if (hasChart) {
      const barData = analyticsChartToBarData(d.charts[0]!);
      if (barData.length) {
        firstChartOnMetrics = true;
        const cx = MX + gridW + 0.35;
        const cw = SW - cx - MX;
        s.addText(d.charts[0]!.title, { x: cx, y: CY + 0.56, w: cw, h: 0.28, fontSize: 8.5, color: T.sub, bold: true, fontFace: "Calibri" });
        try {
          s.addChart(instance.ChartType.bar, barData, {
            x: cx, y: CY + 0.88, w: cw, h: FY - CY - 1.04,
            barDir: "col", barGapWidthPct: 55,
            chartColors: CHART_COLORS,
            catAxisLabelColor: T.mute, valAxisLabelColor: T.mute,
            catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
            showLegend: barData.length > 1, legendPos: "b", legendFontSize: 8,
            showTitle: false, showValue: false,
          } as PptxGenJS.IChartOpts);
        } catch {
          /* пропускаем график с несовместимыми данными */
        }
      }
    }
  }

  // ── 4. Chart slides — skip chart[0] if already shown on metrics ───────────
  const chartsToShow = firstChartOnMetrics ? d.charts.slice(1, 3) : d.charts.slice(0, 2);
  for (const chart of chartsToShow) {
    const barData = analyticsChartToBarData(chart);
    if (!barData.length) continue;
    page++;
    const s = slide(chart.title, docName, page, website);
    if (chart.description) {
      s.addText(chart.description, { x: MX, y: CY + 0.56, w: CW, h: 0.30, fontSize: 9.5, color: T.mute, italic: true, fontFace: "Calibri" });
    }
    const chartY = chart.description ? CY + 0.94 : CY + 0.58;
    try {
      s.addChart(instance.ChartType.bar, barData, {
        x: MX, y: chartY, w: CW, h: FY - chartY - 0.16,
        barDir: "col", barGapWidthPct: 55,
        chartColors: CHART_COLORS,
        catAxisLabelColor: T.mute, valAxisLabelColor: T.mute,
        catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
        showLegend: barData.length > 1, legendPos: "b", legendFontSize: 9,
        showTitle: false, showValue: false,
      } as PptxGenJS.IChartOpts);
    } catch {
      /* пропускаем график с несовместимыми данными */
    }
  }

  // ── 5. Key Findings & Red Flags ───────────────────────────────────────────
  page++;
  {
    const s = slide(`${tx.keyFindings} & ${tx.redFlags}`, docName, page, website);
    const contentY = CY + 0.60;
    const leftW    = CW * 0.5 - 0.18;
    const findings = d.summary.keyFindings.length > 0 ? d.summary.keyFindings : [tx.noFindings];

    findings.slice(0, 6).forEach((f, i) => {
      const y = contentY + i * 0.58;
      if (y + 0.46 > FY) return;
      stepBox(s, i + 1, MX, y + 0.04, T.navy);
      s.addText(f, { x: MX + 0.48, y, w: leftW - 0.52, h: 0.48, fontSize: 11, color: T.sub, valign: "middle", fontFace: "Calibri" });
    });

    if (d.summary.redFlags.length > 0) {
      s.addShape(instance.ShapeType.rect, { x: MX + leftW + 0.18, y: contentY, w: 0.012, h: FY - contentY - 0.16, fill: { color: T.border }, line: { type: "none" } });
      const rx = MX + leftW + 0.36;
      const rw = CW - leftW - 0.36;
      s.addText(tx.redFlags, { x: rx, y: contentY, w: rw, h: 0.34, fontSize: 11, bold: true, color: T.red, fontFace: "Calibri" });
      d.summary.redFlags.slice(0, 6).forEach((f, i) => {
        const y = contentY + 0.40 + i * 0.54;
        if (y + 0.44 > FY) return;
        s.addShape(instance.ShapeType.rect, { x: rx, y: y + 0.15, w: 0.18, h: 0.036, fill: { color: T.red }, line: { type: "none" } });
        s.addText(f, { x: rx + 0.26, y, w: rw - 0.26, h: 0.44, fontSize: 11, color: T.sub, valign: "middle", fontFace: "Calibri" });
      });
    }
  }

  // ── 6. Data Table ─────────────────────────────────────────────────────────
  if (d.tables.length > 0) {
    page++;
    const tbl = d.tables[0]!;
    const s   = slide(tbl.title || tx.dataTable, docName, page, website);
    const headers = tbl.headers.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } }));
    const rows = tbl.rows.slice(0, 12).map((row, ri) =>
      row.map((cell) => ({ text: cell, options: { color: T.sub, fill: { color: ri % 2 === 0 ? T.panel : T.bg } } })),
    );
    s.addTable([headers, ...rows], { x: MX, y: CY + 0.60, w: CW, fontSize: 10, border: { color: T.border, pt: 0.5 }, rowH: 0.32 });
  }

  // ── 7. Opportunities ─────────────────────────────────────────────────────
  page++;
  {
    const s     = slide(tx.opportunities, docName, page, website);
    const items = d.summary.opportunities.length > 0 ? d.summary.opportunities : [tx.noOpportunities];
    const mid   = Math.ceil(Math.min(items.length, 8) / 2);
    const left  = items.slice(0, mid);
    const right = items.slice(mid, 8);
    const colW  = right.length > 0 ? CW * 0.5 - 0.15 : CW;
    const contentY = CY + 0.62;

    left.forEach((opp, i) => {
      const y = contentY + i * 0.72;
      if (y + 0.56 > FY) return;
      stepBox(s, i + 1, MX, y + 0.10, T.blue);
      s.addText(opp, { x: MX + 0.48, y, w: colW - 0.52, h: 0.56, fontSize: 11, color: T.sub, valign: "middle", fontFace: "Calibri" });
    });

    if (right.length > 0) {
      const rx = MX + colW + 0.30;
      right.forEach((opp, i) => {
        const y = contentY + i * 0.72;
        if (y + 0.56 > FY) return;
        stepBox(s, mid + i + 1, rx, y + 0.10, T.blue);
        s.addText(opp, { x: rx + 0.48, y, w: colW - 0.52, h: 0.56, fontSize: 11, color: T.sub, valign: "middle", fontFace: "Calibri" });
      });
    }
  }

  const output = await instance.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
