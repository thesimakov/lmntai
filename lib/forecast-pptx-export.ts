import PptxGenJS from "pptxgenjs";
import type { ForecastReport, ForecastMetric } from "./forecast-schema";
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

// ── Localisation ──────────────────────────────────────────────────────────────
function i18n(lang: UiLanguage) {
  if (lang === "en") return {
    forecastTitle:   "Financial Forecast",
    execSummary:     "Executive Summary",
    revenue:         "Revenue Forecast",
    ebitda:          "EBITDA & Profitability",
    keyMetrics:      "Key Metrics",
    assumptions:     "Assumptions & Methodology",
    historical:      "Historical",
    forecast:        "Forecast",
    projectedCagr:   "Projected CAGR",
    histPeriods:     "Historical periods used",
    seeDashboard:    "See analysis dashboard",
    confidenceBand:  "Confidence bands represent ±10–20% uncertainty based on historical volatility. All forecasts are AI-generated estimates and should not be used as the sole basis for investment decisions.",
    noData:          "Data not available.",
    basePeriod:      "Base period",
    projected:       "projected",
  } as const;
  if (lang === "tg") return {
    forecastTitle:   "Пешгӯии молиявӣ",
    execSummary:     "Хулосаи иҷроӣ",
    revenue:         "Пешгӯии даромад",
    ebitda:          "EBITDA ва фоиданокӣ",
    keyMetrics:      "Нишондиҳандаҳои асосӣ",
    assumptions:     "Фарзияҳо ва методология",
    historical:      "Таърихӣ",
    forecast:        "Пешгӯӣ",
    projectedCagr:   "CAGR-и пешгӯишуда",
    histPeriods:     "Давраҳои таърихии истифодашуда",
    seeDashboard:    "Ба панели таҳлил нигаред",
    confidenceBand:  "Диапазонҳои боварӣ ±10–20% номуайяниро нишон медиҳанд. Ҳамаи пешгӯиҳо аз ҷониби AI тавлид шудаанд.",
    noData:          "Маълумот мавҷуд нест.",
    basePeriod:      "Давраи асос",
    projected:       "пешгӯишуда",
  } as const;
  return {
    forecastTitle:   "Финансовый прогноз",
    execSummary:     "Исполнительное резюме",
    revenue:         "Прогноз выручки",
    ebitda:          "EBITDA и прибыльность",
    keyMetrics:      "Ключевые метрики",
    assumptions:     "Допущения и методология",
    historical:      "Исторические данные",
    forecast:        "Прогноз",
    projectedCagr:   "Прогнозируемый CAGR",
    histPeriods:     "Использованные исторические периоды",
    seeDashboard:    "Смотрите панель анализа",
    confidenceBand:  "Доверительные диапазоны ±10–20% основаны на исторической волатильности. Все прогнозы генерируются AI и не являются единственной основой для инвестиционных решений.",
    noData:          "Данные недоступны.",
    basePeriod:      "Базовый период",
    projected:       "прогноз",
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

// ── Chart helpers ─────────────────────────────────────────────────────────────
function metricToLineSeries(metric: ForecastMetric) {
  const hist = metric.points.filter((p) => p.isHistorical);
  const fore = metric.points.filter((p) => !p.isHistorical);
  return {
    historical: { name: "", labels: hist.map((p) => p.period), values: hist.map((p) => p.value) },
    forecast:   { name: "", labels: fore.map((p) => p.period), values: fore.map((p) => p.value) },
  };
}

// ── Metric slide (line chart) ─────────────────────────────────────────────────
function addMetricSlide(
  pptx: PptxGenJS, title: string, metric: ForecastMetric | undefined,
  fallback: string, docName: string, page: number, website: string,
  tx: ReturnType<typeof i18n>,
) {
  const s = addSlide(pptx, title, docName, page, website);
  if (!metric) {
    s.addText(fallback, { x: MX, y: CY + 0.62, w: CW, h: 0.5, fontSize: 13, color: T.sub });
    return;
  }

  const contentY = CY + 0.58;
  const narrativeH = metric.projectedCagr ? 0.36 : 0.52;

  s.addText(metric.narrative, { x: MX, y: contentY, w: CW, h: narrativeH, fontSize: 12, color: T.sub, italic: true, valign: "top" });

  if (metric.projectedCagr) {
    const cagrColor = metric.trend === "up" ? T.green : metric.trend === "down" ? T.red : T.text;
    // CAGR badge
    s.addShape(pptx.ShapeType.rect, { x: MX, y: contentY + narrativeH + 0.04, w: 2.8, h: 0.36, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
    s.addShape(pptx.ShapeType.rect, { x: MX, y: contentY + narrativeH + 0.04, w: 0.04, h: 0.36, fill: { color: cagrColor }, line: { color: cagrColor, width: 0 } });
    s.addText(`${tx.projectedCagr}: ${metric.projectedCagr}`, {
      x: MX + 0.1, y: contentY + narrativeH + 0.04, w: 2.7, h: 0.36,
      fontSize: 12, bold: true, color: cagrColor, valign: "middle",
    });
  }

  const chartY = contentY + narrativeH + (metric.projectedCagr ? 0.52 : 0.12);
  const chartH = FY - chartY - 0.15;

  const { historical, forecast } = metricToLineSeries(metric);
  historical.name = tx.historical;
  forecast.name   = tx.forecast;
  const allLabels = [...historical.labels, ...forecast.labels];
  const allHistValues = allLabels.map((l) => { const idx = historical.labels.indexOf(l); return idx >= 0 ? historical.values[idx]! : 0; });
  const allForeValues = allLabels.map((l) => { const idx = forecast.labels.indexOf(l);  return idx >= 0 ? forecast.values[idx]!  : 0; });

  if (allLabels.length >= 2) {
    s.addChart(pptx.ChartType.line, [
      { name: tx.historical, labels: allLabels, values: allHistValues },
      { name: tx.forecast,   labels: allLabels, values: allForeValues },
    ], {
      x: MX, y: chartY, w: CW, h: chartH,
      lineDataSymbol: "none", lineSmooth: false,
      chartColors: [T.a1, T.green],
      catAxisLabelColor: T.sub, valAxisLabelColor: T.sub,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      showLegend: true, legendPos: "b", legendFontSize: 9,
      showTitle: false, showValue: false,
    } as PptxGenJS.IChartOpts);
  } else {
    const tableData = [
      [
        { text: "Period", options: { bold: true, color: T.panel, fill: { color: T.a1 } } },
        { text: "Value",  options: { bold: true, color: T.panel, fill: { color: T.a1 } } },
        { text: "Type",   options: { bold: true, color: T.panel, fill: { color: T.a1 } } },
      ],
      ...metric.points.map((p, ri) => [
        { text: p.period, options: { color: T.text, fill: { color: ri % 2 === 0 ? T.panel : T.bg } } },
        { text: `${metric.unit}${p.value.toLocaleString()}`, options: { color: T.text, fill: { color: ri % 2 === 0 ? T.panel : T.bg } } },
        { text: p.isHistorical ? tx.historical : tx.forecast, options: { color: p.isHistorical ? T.sub : T.a1, fill: { color: ri % 2 === 0 ? T.panel : T.bg } } },
      ]),
    ];
    s.addTable(tableData, { x: MX, y: chartY, w: CW * 0.65, fontSize: 11, border: { color: T.border, pt: 0.5 }, rowH: 0.32 });
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildForecastPptx(report: ForecastReport, dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const tx = i18n(lang);
  const company  = dashboard.meta.companyName;
  const period   = dashboard.meta.period;
  const docName  = `${tx.forecastTitle} · ${period}`;
  const website  = company.toLowerCase().replace(/\s+/g, "") + ".com";

  let page = 0;

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  {
    const s = pptx.addSlide();
    s.background = { color: T.bg };
    addFrame(s, pptx, docName, page, website);
    s.addShape(pptx.ShapeType.rect, { x: 0, y: HY + 0.01, w: 0.18, h: FY - HY - 0.01, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.22, y: HY + 0.01, w: 0.08, h: FY - HY - 0.01, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.34, y: HY + 0.01, w: 0.04, h: FY - HY - 0.01, fill: { color: T.gold }, line: { color: T.gold, width: 0 } });
    s.addText(company, { x: MX + 0.2, y: 1.6, w: CW - 0.2, h: 1.8, fontSize: 52, bold: true, color: T.text, valign: "bottom" });
    s.addShape(pptx.ShapeType.rect, { x: MX + 0.2, y: 3.55, w: CW - 0.2, h: 0.055, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
    s.addText(tx.forecastTitle, { x: MX + 0.2, y: 3.72, w: CW - 0.2, h: 0.6, fontSize: 20, color: T.a1 });
    s.addText(`${period}  ·  ${tx.basePeriod}: ${report.basePeriod}`, { x: MX + 0.2, y: 4.42, w: CW - 0.2, h: 0.42, fontSize: 12, color: T.sub });
  }

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, tx.execSummary, docName, page, website);
    const contentY = CY + 0.58;
    s.addText(report.executiveSummary, { x: MX, y: contentY, w: CW, h: 1.4, fontSize: 13, color: T.sub, valign: "top", paraSpaceAfter: 4 });
    s.addText(`${tx.basePeriod}: ${report.basePeriod}`, { x: MX, y: contentY + 1.5, w: CW, h: 0.34, fontSize: 11, color: T.mute });

    const highlights = report.metrics.filter((m) => m.projectedCagr).map((m) => `${m.label}: ${m.projectedCagr ?? ""}`);
    highlights.forEach((item, i) => {
      const y = contentY + 2.0 + i * 0.52;
      if (y + 0.42 > FY) return;
      s.addShape(pptx.ShapeType.ellipse, { x: MX, y: y + 0.07, w: 0.28, h: 0.28, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
      s.addText(item, { x: MX + 0.38, y, w: CW - 0.38, h: 0.42, fontSize: 12.5, color: T.text, valign: "middle" });
    });
  }

  // ── 3. Revenue Forecast ───────────────────────────────────────────────────
  page++;
  addMetricSlide(pptx, tx.revenue, report.metrics.find((m) => m.key === "revenue"), tx.noData, docName, page, website, tx);

  // ── 4. EBITDA & Profitability ─────────────────────────────────────────────
  page++;
  addMetricSlide(pptx, tx.ebitda, report.metrics.find((m) => m.key === "ebitda"), tx.noData, docName, page, website, tx);

  // ── 5. Other Metrics ─────────────────────────────────────────────────────
  const others = report.metrics.filter((m) => m.key !== "revenue" && m.key !== "ebitda");
  if (others.length > 0) {
    page++;
    const s = addSlide(pptx, tx.keyMetrics, docName, page, website);
    let yPos = CY + 0.62;

    for (const metric of others) {
      if (yPos + 0.96 > FY) break;
      const lastPoint = [...metric.points].reverse().find((p) => !p.isHistorical) ?? metric.points[metric.points.length - 1];
      const trendColor = metric.trend === "up" ? T.green : metric.trend === "down" ? T.red : T.text;

      s.addShape(pptx.ShapeType.rect, { x: MX, y: yPos, w: CW, h: 0.86, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
      s.addShape(pptx.ShapeType.rect, { x: MX, y: yPos, w: 0.06, h: 0.86, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });

      s.addText(metric.label, { x: MX + 0.16, y: yPos + 0.10, w: 3.0, h: 0.34, fontSize: 13, bold: true, color: T.text });
      s.addText(`${metric.unit}${lastPoint?.value.toLocaleString() ?? "—"} ${tx.projected}`, { x: MX + 3.3, y: yPos + 0.10, w: 3.5, h: 0.34, fontSize: 13, color: trendColor });
      if (metric.projectedCagr) {
        s.addText(metric.projectedCagr, { x: MX + 6.9, y: yPos + 0.10, w: 2.5, h: 0.34, fontSize: 12, color: T.a1 });
      }
      s.addText(metric.narrative, { x: MX + 0.16, y: yPos + 0.44, w: CW - 0.3, h: 0.34, fontSize: 10, color: T.sub, italic: true });

      yPos += 1.04;
    }
  }

  // ── 6. Assumptions ────────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, tx.assumptions, docName, page, website);
    const contentY = CY + 0.58;
    const histPeriods = (report.metrics[0]?.points.filter((p) => p.isHistorical).map((p) => p.period)) ?? [];

    s.addText(tx.histPeriods + ":", { x: MX, y: contentY, w: CW, h: 0.34, fontSize: 12, bold: true, color: T.text });
    s.addText(histPeriods.join("  ·  ") || tx.seeDashboard, { x: MX, y: contentY + 0.38, w: CW, h: 0.38, fontSize: 11, color: T.sub });
    s.addShape(pptx.ShapeType.rect, { x: MX, y: contentY + 0.92, w: CW, h: 0.01, fill: { color: T.border }, line: { color: T.border, width: 0 } });
    s.addText(tx.confidenceBand, {
      x: MX, y: contentY + 1.08, w: CW, h: 1.2,
      fontSize: 11, color: T.sub, italic: true, valign: "top", paraSpaceAfter: 4,
    });
  }

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
