import PptxGenJS from "pptxgenjs";
import type { ForecastReport, ForecastMetric } from "./forecast-schema";
import type { AnalysisDashboard } from "./analytics-schema";

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

// ── Forecast chart helpers ─────────────────────────────────────────────────────
function metricToLineSeries(
  metric: ForecastMetric,
): { historical: { name: string; labels: string[]; values: number[] }; forecast: { name: string; labels: string[]; values: number[] } } {
  const hist = metric.points.filter((p) => p.isHistorical);
  const fore = metric.points.filter((p) => !p.isHistorical);
  return {
    historical: { name: "Historical", labels: hist.map((p) => p.period), values: hist.map((p) => p.value) },
    forecast:   { name: "Forecast",   labels: fore.map((p) => p.period), values: fore.map((p) => p.value) },
  };
}

// ── Metric slide (with line chart) ────────────────────────────────────────────
function addMetricSlide(
  pptx: PptxGenJS,
  title: string,
  metric: ForecastMetric | undefined,
  fallback: string,
  docName: string,
  page: number,
  website: string,
) {
  const s = addSlide(pptx, title, docName, page, website);
  if (!metric) {
    s.addText(fallback, { x: MX, y: CY + 0.62, w: CW, h: 0.5, fontSize: 13, color: T.sub });
    return;
  }

  const contentY = CY + 0.58;

  // Narrative + CAGR
  const narrativeH = metric.projectedCagr ? 0.36 : 0.52;
  s.addText(metric.narrative, {
    x: MX, y: contentY, w: CW, h: narrativeH,
    fontSize: 12, color: T.sub, italic: true, valign: "top",
  });

  if (metric.projectedCagr) {
    const cagrColor = metric.trend === "up" ? T.green : metric.trend === "down" ? T.red : T.text;
    s.addText(`Projected CAGR: ${metric.projectedCagr}`, {
      x: MX, y: contentY + narrativeH + 0.04, w: CW, h: 0.34,
      fontSize: 13, bold: true, color: cagrColor,
    });
  }

  // Line chart
  const chartY = contentY + narrativeH + (metric.projectedCagr ? 0.48 : 0.12);
  const chartH = FY - chartY - 0.15;

  const { historical, forecast } = metricToLineSeries(metric);
  const allLabels = [...historical.labels, ...forecast.labels];
  const allHistValues = allLabels.map((l) => {
    const idx = historical.labels.indexOf(l);
    return idx >= 0 ? historical.values[idx]! : (0 as number);
  });
  const allForeValues = allLabels.map((l) => {
    const idx = forecast.labels.indexOf(l);
    return idx >= 0 ? forecast.values[idx]! : (0 as number);
  });

  const histSeries = { name: "Historical", labels: allLabels, values: allHistValues };
  const foreSeries = { name: "Forecast",   labels: allLabels, values: allForeValues };

  if (allLabels.length >= 2) {
    s.addChart(pptx.ChartType.line, [histSeries, foreSeries], {
      x: MX, y: chartY, w: CW, h: chartH,
      lineDataSymbol: "none",
      chartColors: [T.accent, T.green],
      catAxisLabelColor: T.sub,
      valAxisLabelColor: T.sub,
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 9,
      showTitle: false,
      showValue: false,
      lineSmooth: false,
    } as PptxGenJS.IChartOpts);
  } else {
    // Fallback: simple data table
    const tableData = [
      [
        { text: "Period", options: { bold: true, color: T.accent, fill: { color: T.card } } },
        { text: "Value",  options: { bold: true, color: T.accent, fill: { color: T.card } } },
        { text: "Type",   options: { bold: true, color: T.accent, fill: { color: T.card } } },
      ],
      ...metric.points.map((p, ri) => [
        { text: p.period, options: { color: T.text, fill: { color: ri % 2 === 0 ? T.bg : T.card } } },
        { text: `${metric.unit}${p.value.toLocaleString()}`, options: { color: T.text, fill: { color: ri % 2 === 0 ? T.bg : T.card } } },
        { text: p.isHistorical ? "Historical" : "Forecast", options: { color: p.isHistorical ? T.sub : T.accent, fill: { color: ri % 2 === 0 ? T.bg : T.card } } },
      ]),
    ];
    s.addTable(tableData, { x: MX, y: chartY, w: CW * 0.65, fontSize: 11, border: { color: T.border, pt: 0.5 }, rowH: 0.32 });
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildForecastPptx(report: ForecastReport, dashboard: AnalysisDashboard): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period  = dashboard.meta.period;
  const docName = `Financial Forecast · ${period}`;
  const website = company.toLowerCase().replace(/\s+/g, "") + ".com";

  let page = 0;

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  {
    const s = pptx.addSlide();
    s.background = { color: T.bg };
    addFrame(s, pptx, docName, page, website);
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 3.58, w: SW, h: 0.06, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
    s.addText(company, { x: MX, y: 1.7, w: CW, h: 1.6, fontSize: 46, bold: true, color: T.text, align: "center", valign: "bottom" });
    s.addText("Financial Forecast", { x: MX, y: 3.76, w: CW, h: 0.62, fontSize: 19, color: T.accent, align: "center" });
    s.addText(`${period}  ·  Base period: ${report.basePeriod}`, { x: MX, y: 4.46, w: CW, h: 0.42, fontSize: 12.5, color: T.sub, align: "center" });
  }

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, "Executive Summary", docName, page, website);
    const contentY = CY + 0.58;

    s.addText(report.executiveSummary, {
      x: MX, y: contentY, w: CW, h: 1.4,
      fontSize: 13.5, color: T.sub, valign: "top", paraSpaceAfter: 4,
    });
    s.addText(`Base period: ${report.basePeriod}`, {
      x: MX, y: contentY + 1.5, w: CW, h: 0.34,
      fontSize: 11, color: T.mute,
    });

    const highlights = report.metrics.filter((m) => m.projectedCagr).map((m) => `${m.label}: ${m.projectedCagr ?? ""}`);
    if (highlights.length > 0) {
      highlights.forEach((item, i) => {
        const y = contentY + 2.0 + i * 0.52;
        if (y + 0.42 > FY) return;
        s.addShape(pptx.ShapeType.rect, { x: MX, y: y + 0.1, w: 0.1, h: 0.1, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
        s.addText(item, { x: MX + 0.22, y, w: CW - 0.22, h: 0.42, fontSize: 13, color: T.text });
      });
    }
  }

  // ── 3. Revenue Forecast ───────────────────────────────────────────────────
  page++;
  addMetricSlide(pptx, "Revenue Forecast", report.metrics.find((m) => m.key === "revenue"), "Revenue data not available.", docName, page, website);

  // ── 4. EBITDA & Profitability ─────────────────────────────────────────────
  page++;
  addMetricSlide(pptx, "EBITDA & Profitability", report.metrics.find((m) => m.key === "ebitda"), "EBITDA data not available.", docName, page, website);

  // ── 5. Other Metrics (KPI summary rows) ───────────────────────────────────
  const others = report.metrics.filter((m) => m.key !== "revenue" && m.key !== "ebitda");
  if (others.length > 0) {
    page++;
    const s = addSlide(pptx, "Key Metrics", docName, page, website);
    let yPos = CY + 0.62;

    for (const metric of others) {
      if (yPos + 0.96 > FY) break;
      const lastPoint = [...metric.points].reverse().find((p) => !p.isHistorical) ?? metric.points[metric.points.length - 1];
      const trendColor = metric.trend === "up" ? T.green : metric.trend === "down" ? T.red : T.text;

      s.addShape(pptx.ShapeType.rect, {
        x: MX, y: yPos, w: CW, h: 0.86,
        fill: { color: T.card }, line: { color: T.border, width: 0.75 },
      });
      s.addShape(pptx.ShapeType.rect, { x: MX + 0.02, y: yPos, w: CW - 0.04, h: 0.04, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });

      s.addText(metric.label, { x: MX + 0.15, y: yPos + 0.1, w: 3.0, h: 0.34, fontSize: 13, bold: true, color: T.text });
      s.addText(`${metric.unit}${lastPoint?.value.toLocaleString() ?? "—"} projected`, { x: MX + 3.3, y: yPos + 0.1, w: 3.5, h: 0.34, fontSize: 13, color: trendColor });
      if (metric.projectedCagr) {
        s.addText(metric.projectedCagr, { x: MX + 6.9, y: yPos + 0.1, w: 2.5, h: 0.34, fontSize: 12, color: T.accent });
      }
      s.addText(metric.narrative, { x: MX + 0.15, y: yPos + 0.44, w: CW - 0.3, h: 0.34, fontSize: 10.5, color: T.sub, italic: true });

      yPos += 1.04;
    }
  }

  // ── 6. Assumptions ────────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, "Assumptions & Methodology", docName, page, website);
    const contentY = CY + 0.58;
    const histPeriods = (report.metrics[0]?.points.filter((p) => p.isHistorical).map((p) => p.period)) ?? [];

    s.addText("Historical periods used:", { x: MX, y: contentY, w: CW, h: 0.34, fontSize: 12, bold: true, color: T.text });
    s.addText(histPeriods.join("  ·  ") || "See analysis dashboard", { x: MX, y: contentY + 0.38, w: CW, h: 0.38, fontSize: 11.5, color: T.sub });

    s.addShape(pptx.ShapeType.rect, { x: MX, y: contentY + 0.92, w: CW, h: 0.012, fill: { color: T.border }, line: { color: T.border, width: 0 } });

    s.addText(
      "Confidence bands represent ±10–20% uncertainty range based on historical volatility. " +
      "All forecasts are AI-generated estimates and should not be used as the sole basis for investment decisions.",
      { x: MX, y: contentY + 1.08, w: CW, h: 1.2, fontSize: 11.5, color: T.sub, italic: true, valign: "top", paraSpaceAfter: 4 },
    );
  }

  const output = await pptx.write({ outputType: "arraybuffer" });
  if (!(output instanceof ArrayBuffer)) throw new Error("pptxgenjs returned unexpected type");
  return Buffer.from(output);
}
