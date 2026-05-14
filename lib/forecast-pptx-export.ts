import PptxGenJS from "pptxgenjs";
import type { ForecastReport, ForecastMetric } from "./forecast-schema";
import type { AnalysisDashboard } from "./analytics-schema";

const THEME = {
  bg: "1A1A2E",
  accent: "4F8EF7",
  text: "FFFFFF",
  subtext: "AAAACC",
  dark: "16213E",
  green: "4CAF50",
  red: "F44336",
  muted: "555577",
};

function addSlide(pptx: PptxGenJS, title: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  s.addText(title, {
    x: 0.5, y: 0.2, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent,
  });
  return s;
}

function findMetric(report: ForecastReport, key: string): ForecastMetric | undefined {
  return report.metrics.find((m) => m.key === key);
}

function metricToTableRows(metric: ForecastMetric): string[][] {
  return metric.points.map((p) => {
    const bandStr =
      p.low !== undefined && p.high !== undefined
        ? `${metric.unit}${p.low.toLocaleString()} – ${metric.unit}${p.high.toLocaleString()}`
        : "—";
    return [
      p.period,
      `${metric.unit}${p.value.toLocaleString()}`,
      p.isHistorical ? "Historical" : "Forecast",
      bandStr,
    ];
  });
}

function addMetricSlide(
  pptx: PptxGenJS,
  title: string,
  metric: ForecastMetric | undefined,
  fallbackMessage: string
) {
  const s = addSlide(pptx, title);
  if (!metric) {
    s.addText(fallbackMessage, {
      x: 0.5, y: 1.2, w: "90%", h: 0.5,
      fontSize: 14, color: THEME.subtext,
    });
    return;
  }

  s.addText(metric.narrative, {
    x: 0.5, y: 1.0, w: "90%", h: 0.6,
    fontSize: 13, color: THEME.subtext, italic: true,
  });

  if (metric.projectedCagr) {
    s.addText(`Projected: ${metric.projectedCagr}`, {
      x: 0.5, y: 1.65, w: "90%", h: 0.4,
      fontSize: 13, bold: true,
      color: metric.trend === "up" ? THEME.green : metric.trend === "down" ? THEME.red : THEME.text,
    });
  }

  const rows = metricToTableRows(metric);
  const tableData = [
    [
      { text: "Period", options: { bold: true, color: THEME.text } },
      { text: "Value", options: { bold: true, color: THEME.text } },
      { text: "Type", options: { bold: true, color: THEME.text } },
      { text: "Range", options: { bold: true, color: THEME.text } },
    ],
    ...rows.map((row) =>
      row.map((cell, i) => ({
        text: cell,
        options: {
          color:
            i === 2 && cell === "Forecast"
              ? THEME.accent
              : THEME.text,
        },
      }))
    ),
  ];

  s.addTable(tableData, {
    x: 0.5, y: 2.1, w: "90%",
    fontSize: 11,
    border: { type: "solid", color: THEME.muted, pt: 0.5 },
    fill: { color: THEME.dark },
    color: THEME.text,
  });
}

export async function buildForecastPptx(
  report: ForecastReport,
  dashboard: AnalysisDashboard
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const company = dashboard.meta.companyName;
  const period = dashboard.meta.period;

  // Slide 1: Cover
  const cover = pptx.addSlide();
  cover.background = { color: THEME.dark };
  cover.addText(company, {
    x: 0.5, y: 1.8, w: "90%", h: 1.0,
    fontSize: 36, bold: true, color: THEME.text, align: "center",
  });
  cover.addText("Financial Forecast", {
    x: 0.5, y: 2.9, w: "90%", h: 0.7,
    fontSize: 22, color: THEME.accent, align: "center",
  });
  cover.addText(`${period} · Base period: ${report.basePeriod}`, {
    x: 0.5, y: 3.7, w: "90%", h: 0.4,
    fontSize: 13, color: THEME.subtext, align: "center",
  });

  // Slide 2: Executive Summary
  const summary = addSlide(pptx, "Executive Summary");
  summary.addText(report.executiveSummary, {
    x: 0.5, y: 1.0, w: "90%", h: 1.5,
    fontSize: 16, color: THEME.text, valign: "top",
  });
  summary.addText(`Base period: ${report.basePeriod}`, {
    x: 0.5, y: 2.8, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.subtext,
  });
  const highlightMetrics = report.metrics
    .filter((m) => m.projectedCagr)
    .map((m) => `${m.label}: ${m.projectedCagr ?? ""}`);
  if (highlightMetrics.length > 0) {
    const parts = highlightMetrics.map((item) => ({ text: `• ${item}`, options: { color: THEME.accent } }));
    summary.addText(parts, {
      x: 0.5, y: 3.3, w: "90%", h: 1.5,
      fontSize: 14, paraSpaceAfter: 6, valign: "top",
    });
  }

  // Slide 3: Revenue Forecast
  addMetricSlide(pptx, "Revenue Forecast", findMetric(report, "revenue"), "Revenue data not available in this analysis.");

  // Slide 4: EBITDA & Profitability
  addMetricSlide(pptx, "EBITDA & Profitability", findMetric(report, "ebitda"), "EBITDA data not available in this analysis.");

  // Slide 5: Key Metrics
  const keySlide = addSlide(pptx, "Key Metrics");
  const otherMetrics = report.metrics.filter(
    (m) => m.key !== "revenue" && m.key !== "ebitda"
  );
  let yPos = 1.0;
  for (const metric of otherMetrics) {
    const lastPoint = [...metric.points].reverse().find((p) => !p.isHistorical) ?? metric.points[metric.points.length - 1];
    const trendColor = metric.trend === "up" ? THEME.green : metric.trend === "down" ? THEME.red : THEME.text;
    keySlide.addText(metric.label, {
      x: 0.5, y: yPos, w: 3.0, h: 0.4,
      fontSize: 14, bold: true, color: THEME.text,
    });
    keySlide.addText(
      `${metric.unit}${lastPoint?.value.toLocaleString() ?? "—"} projected`,
      { x: 3.5, y: yPos, w: 3.0, h: 0.4, fontSize: 14, color: trendColor }
    );
    if (metric.projectedCagr) {
      keySlide.addText(metric.projectedCagr, {
        x: 6.5, y: yPos, w: 2.5, h: 0.4,
        fontSize: 13, color: THEME.accent,
      });
    }
    keySlide.addText(metric.narrative, {
      x: 0.5, y: yPos + 0.4, w: "90%", h: 0.35,
      fontSize: 11, color: THEME.subtext, italic: true,
    });
    yPos += 1.0;
  }

  // Slide 6: Assumptions & Disclaimer
  const assumptionsSlide = addSlide(pptx, "Assumptions & Methodology");
  const historicalPeriods = report.metrics[0]?.points
    .filter((p) => p.isHistorical)
    .map((p) => p.period) ?? [];
  assumptionsSlide.addText("Historical data periods used:", {
    x: 0.5, y: 1.0, w: "90%", h: 0.4,
    fontSize: 13, bold: true, color: THEME.text,
  });
  assumptionsSlide.addText(historicalPeriods.join(" · ") || "See analysis dashboard", {
    x: 0.5, y: 1.5, w: "90%", h: 0.5,
    fontSize: 12, color: THEME.subtext,
  });
  assumptionsSlide.addText(
    "Confidence bands represent ±10–20% uncertainty range based on historical volatility. " +
    "All forecasts are AI-generated estimates and should not be used as the sole basis for investment decisions.",
    {
      x: 0.5, y: 3.5, w: "90%", h: 1.2,
      fontSize: 11, color: THEME.subtext, italic: true,
    }
  );

  const output = await pptx.write({ outputType: "arraybuffer" });
  if (!(output instanceof ArrayBuffer)) {
    throw new Error("pptxgenjs returned unexpected type");
  }
  return Buffer.from(output);
}
