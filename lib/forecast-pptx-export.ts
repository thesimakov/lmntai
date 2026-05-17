import PptxGenJS from "pptxgenjs";
import type { ForecastReport, ForecastMetric } from "./forecast-schema";
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

// ── Localisation ──────────────────────────────────────────────────────────────
function i18n(lang: UiLanguage) {
  if (lang === "en") return {
    forecastTitle:  "Financial Forecast",
    execSummary:    "Executive Summary",
    revenue:        "Revenue Forecast",
    ebitda:         "EBITDA & Profitability",
    keyMetrics:     "Key Metrics",
    assumptions:    "Assumptions & Methodology",
    historical:     "Historical",
    forecast:       "Forecast",
    projectedCagr:  "Projected CAGR",
    histPeriods:    "Historical periods used",
    seeDashboard:   "See analysis dashboard",
    confidenceBand: "Confidence bands represent ±10–20% uncertainty based on historical volatility. All forecasts are AI-generated estimates and should not be used as the sole basis for investment decisions.",
    noData:         "Data not available.",
    basePeriod:     "Base period",
    projected:      "projected",
  } as const;
  if (lang === "tg") return {
    forecastTitle:  "Пешгӯии молиявӣ",
    execSummary:    "Хулосаи иҷроӣ",
    revenue:        "Пешгӯии даромад",
    ebitda:         "EBITDA ва фоиданокӣ",
    keyMetrics:     "Нишондиҳандаҳои асосӣ",
    assumptions:    "Фарзияҳо ва методология",
    historical:     "Таърихӣ",
    forecast:       "Пешгӯӣ",
    projectedCagr:  "CAGR-и пешгӯишуда",
    histPeriods:    "Давраҳои таърихии истифодашуда",
    seeDashboard:   "Ба панели таҳлил нигаред",
    confidenceBand: "Диапазонҳои боварӣ ±10–20% номуайяниро нишон медиҳанд. Ҳамаи пешгӯиҳо аз ҷониби AI тавлид шудаанд.",
    noData:         "Маълумот мавҷуд нест.",
    basePeriod:     "Давраи асос",
    projected:      "пешгӯишуда",
  } as const;
  return {
    forecastTitle:  "Финансовый прогноз",
    execSummary:    "Исполнительное резюме",
    revenue:        "Прогноз выручки",
    ebitda:         "EBITDA и прибыльность",
    keyMetrics:     "Ключевые метрики",
    assumptions:    "Допущения и методология",
    historical:     "Исторические данные",
    forecast:       "Прогноз",
    projectedCagr:  "Прогнозируемый CAGR",
    histPeriods:    "Использованные исторические периоды",
    seeDashboard:   "Смотрите панель анализа",
    confidenceBand: "Доверительные диапазоны ±10–20% основаны на исторической волатильности. Все прогнозы генерируются AI и не являются единственной основой для инвестиционных решений.",
    noData:         "Данные недоступны.",
    basePeriod:     "Базовый период",
    projected:      "прогноз",
  } as const;
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
function formatMetricValue(unit: string, value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${unit}${n.toLocaleString("ru-RU")}`;
}

function metricToLineSeries(metric: ForecastMetric) {
  const hist = metric.points.filter((p) => p.isHistorical);
  const fore = metric.points.filter((p) => !p.isHistorical);
  const labels = [...new Set([...hist.map((p) => p.period), ...fore.map((p) => p.period)])];
  const histValues = labels.map((period) => hist.find((p) => p.period === period)?.value ?? null);
  const foreValues = labels.map((period) => fore.find((p) => p.period === period)?.value ?? null);
  return {
    labels,
    historical: { name: "", labels, values: histValues },
    forecast: { name: "", labels, values: foreValues },
  };
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildForecastPptx(report: ForecastReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const instance = new PptxGenJS();
  instance.layout = "LAYOUT_WIDE";

  const tx      = i18n(lang);
  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `${tx.forecastTitle} · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";

  let page = 0;

  // ── Helpers ──────────────────────────────────────────────────────────────
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

  const addMetricSlide = (title: string, metric: ForecastMetric | undefined, fallback: string, dn: string, pg: number, web: string) => {
    const s = addSlide(title, dn, pg, web);
    if (!metric) {
      s.addText(fallback, { x: MX, y: CY + 0.60, w: CW, h: 0.5, fontSize: 13, color: T.mute, fontFace: "Calibri" });
      return;
    }

    const contentY  = CY + 0.56;
    const hasCagr   = !!metric.projectedCagr;
    const cagrColor = metric.trend === "up" ? T.green : metric.trend === "down" ? T.red : T.navy;
    const narW      = hasCagr ? CW * 0.62 : CW;

    s.addText(metric.narrative, { x: MX, y: contentY, w: narW, h: 0.42, fontSize: 12, color: T.sub, fontFace: "Calibri", italic: true, valign: "top" });

    if (hasCagr) {
      const bx = MX + narW + 0.24;
      const bw = CW - narW - 0.24;
      s.addShape(instance.ShapeType.rect, { x: bx, y: contentY, w: bw, h: 0.42, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
      s.addShape(instance.ShapeType.rect, { x: bx, y: contentY, w: 0.06, h: 0.42, fill: { color: cagrColor }, line: { type: "none" } });
      s.addText(`${tx.projectedCagr}: ${metric.projectedCagr}`, { x: bx + 0.12, y: contentY, w: bw - 0.16, h: 0.42, fontSize: 11, bold: true, color: cagrColor, fontFace: "Calibri", valign: "middle" });
    }

    const chartY = contentY + 0.54;
    const chartH = FY - chartY - 0.12;
    const { labels: allLabels, historical, forecast } = metricToLineSeries(metric);
    historical.name = tx.historical;
    forecast.name = tx.forecast;
    const histValues = historical.values.map((v) => (v === null ? 0 : v));
    const foreValues = forecast.values.map((v) => (v === null ? 0 : v));

    if (allLabels.length >= 2) {
      s.addChart(instance.ChartType.line, [
        { name: tx.historical, labels: allLabels, values: histValues },
        { name: tx.forecast, labels: allLabels, values: foreValues },
      ], {
        x: MX, y: chartY, w: CW, h: chartH,
        lineDataSymbol: "none", lineSmooth: false,
        chartColors: ["1D4ED8", "0F1C35"],
        catAxisLabelColor: T.mute, valAxisLabelColor: T.mute,
        catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
        showLegend: true, legendPos: "b", legendFontSize: 9,
        showTitle: false, showValue: false,
      } as PptxGenJS.IChartOpts);
    } else {
      const tableData = [
        [
          { text: "Period", options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } },
          { text: "Value",  options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } },
          { text: "Type",   options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } },
        ],
        ...metric.points.map((p, ri) => [
          { text: p.period,   options: { color: T.sub, fill: { color: ri % 2 === 0 ? T.panel : T.bg } } },
          { text: formatMetricValue(metric.unit, p.value), options: { color: T.sub, fill: { color: ri % 2 === 0 ? T.panel : T.bg } } },
          { text: p.isHistorical ? tx.historical : tx.forecast, options: { color: p.isHistorical ? T.mute : T.blue, fill: { color: ri % 2 === 0 ? T.panel : T.bg } } },
        ]),
      ];
      s.addTable(tableData, { x: MX, y: chartY, w: CW * 0.65, fontSize: 11, border: { color: T.border, pt: 0.5 }, rowH: 0.32 });
    }
  };

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  {
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
    s.addText(website, { x: SPLIT + 0.36, y: 6.58, w: SW - SPLIT - 0.72, h: 0.26, fontSize: 7.5, color: "FFFFFF", fontFace: "Calibri", transparency: 40 });

    s.addText(company, { x: MX, y: 1.8, w: SPLIT - MX * 2, h: 1.1, fontSize: 38, bold: true, fontFace: "Calibri", color: T.navy, valign: "middle" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.02, w: 2.8, h: 0.048, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(tx.forecastTitle.toUpperCase(), { x: MX, y: 3.16, w: SPLIT - MX * 2, h: 0.46, fontSize: 11, color: T.blue, fontFace: "Calibri", charSpacing: 3.5 });
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.74, w: SPLIT - MX * 2 - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(`${period}  ·  ${tx.basePeriod}: ${report.basePeriod}`, { x: MX, y: 3.90, w: SPLIT - MX * 2, h: 0.38, fontSize: 11, color: T.mute, fontFace: "Calibri" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: FY, w: SPLIT - MX - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(docName, { x: MX, y: FY + 0.08, w: SPLIT - MX - 0.2, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri" });
  }

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s        = addSlide(tx.execSummary, docName, page, website);
    const contentY = CY + 0.56;
    s.addText(report.executiveSummary, { x: MX, y: contentY, w: CW, h: 1.4, fontSize: 13, color: T.sub, valign: "top", paraSpaceAfter: 4, fontFace: "Calibri" });
    s.addText(`${tx.basePeriod}: ${report.basePeriod}`, { x: MX, y: contentY + 1.5, w: CW, h: 0.34, fontSize: 11, color: T.mute, fontFace: "Calibri" });

    const highlights = report.metrics.filter((m) => m.projectedCagr).map((m) => `${m.label}: ${m.projectedCagr ?? ""}`);
    highlights.forEach((item, i) => {
      const y = contentY + 2.0 + i * 0.52;
      if (y + 0.42 > FY) return;
      s.addShape(instance.ShapeType.rect, { x: MX, y: y + 0.06, w: 0.26, h: 0.26, fill: { color: T.blue }, line: { type: "none" }, rectRadius: 0.04 });
      s.addText(item, { x: MX + 0.36, y, w: CW - 0.36, h: 0.42, fontSize: 12.5, color: T.sub, valign: "middle", fontFace: "Calibri" });
    });
  }

  // ── 3. Revenue Forecast ───────────────────────────────────────────────────
  page++;
  addMetricSlide(tx.revenue, report.metrics.find((m) => m.key === "revenue"), tx.noData, docName, page, website);

  // ── 4. EBITDA & Profitability ─────────────────────────────────────────────
  page++;
  addMetricSlide(tx.ebitda, report.metrics.find((m) => m.key === "ebitda"), tx.noData, docName, page, website);

  // ── 5. Other Metrics ─────────────────────────────────────────────────────
  const others = report.metrics.filter((m) => m.key !== "revenue" && m.key !== "ebitda");
  if (others.length > 0) {
    page++;
    const s    = addSlide(tx.keyMetrics, docName, page, website);
    let yPos   = CY + 0.60;

    for (const metric of others) {
      if (yPos + 0.96 > FY) break;
      const lastPoint  = [...metric.points].reverse().find((p) => !p.isHistorical) ?? metric.points[metric.points.length - 1];
      const trendColor = metric.trend === "up" ? T.green : metric.trend === "down" ? T.red : T.sub;

      s.addShape(instance.ShapeType.rect, { x: MX, y: yPos, w: CW, h: 0.84, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
      s.addShape(instance.ShapeType.rect, { x: MX, y: yPos, w: 0.06, h: 0.84, fill: { color: T.blue }, line: { type: "none" } });
      s.addText(metric.label, { x: MX + 0.14, y: yPos + 0.10, w: 3.0, h: 0.34, fontSize: 13, bold: true, color: T.navy, fontFace: "Calibri" });
      s.addText(
        lastPoint ? `${formatMetricValue(metric.unit, lastPoint.value)} ${tx.projected}` : "—",
        { x: MX + 3.3, y: yPos + 0.10, w: 3.5, h: 0.34, fontSize: 13, color: trendColor, fontFace: "Calibri" }
      );
      if (metric.projectedCagr) {
        s.addText(metric.projectedCagr, { x: MX + 6.9, y: yPos + 0.10, w: 2.5, h: 0.34, fontSize: 12, color: T.blue, fontFace: "Calibri" });
      }
      s.addText(metric.narrative, { x: MX + 0.14, y: yPos + 0.44, w: CW - 0.28, h: 0.34, fontSize: 10, color: T.mute, italic: true, fontFace: "Calibri" });
      yPos += 1.02;
    }
  }

  // ── 6. Assumptions ────────────────────────────────────────────────────────
  page++;
  {
    const s           = addSlide(tx.assumptions, docName, page, website);
    const contentY    = CY + 0.56;
    const histPeriods = (report.metrics[0]?.points.filter((p) => p.isHistorical).map((p) => p.period)) ?? [];

    s.addText(tx.histPeriods + ":", { x: MX, y: contentY, w: CW, h: 0.34, fontSize: 12, bold: true, color: T.navy, fontFace: "Calibri" });
    s.addText(histPeriods.join("  ·  ") || tx.seeDashboard, { x: MX, y: contentY + 0.38, w: CW, h: 0.38, fontSize: 11, color: T.sub, fontFace: "Calibri" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: contentY + 0.90, w: CW, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(tx.confidenceBand, { x: MX, y: contentY + 1.06, w: CW, h: 1.2, fontSize: 11, color: T.mute, italic: true, valign: "top", paraSpaceAfter: 4, fontFace: "Calibri" });
  }

  const output = await instance.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
