import PptxGenJS from "pptxgenjs";
import type { MarketingDashboard, MarketingChannel, MarketingKpi } from "./marketing-schema";

const THEME = {
  bg: "1A1A2E",
  accent: "4F8EF7",
  text: "FFFFFF",
  subtext: "AAAACC",
  dark: "16213E",
};

const PPTX_COLS = 3;
const CELL_W = 4.0;
const CELL_H = 1.4;
const CELL_GAP = 0.2;

export async function buildMarketingPptx(report: MarketingDashboard): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addCoverSlide(pptx, report);
  addExecutiveSummarySlide(pptx, report);
  addKeyMetricsSlide(pptx, report);
  addChannelsOverviewSlide(pptx, report);
  addTopChannelSlide(pptx, report);
  addChannelComparisonSlide(pptx, report);
  addRecommendationsSlide(pptx, report);
  addDisclaimerSlide(pptx, report);

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

function addSlide(pptx: PptxGenJS, title: string): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  s.addText(title, {
    x: 0.5, y: 0.2, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent,
  });
  return s;
}

function addCoverSlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const s = pptx.addSlide();
  s.background = { color: THEME.dark };
  s.addText(r.meta.companyName, {
    x: 0.5, y: 1.8, w: "90%", h: 1.2,
    fontSize: 40, bold: true, color: THEME.text, align: "center",
  });
  s.addText("Marketing Performance Report", {
    x: 0.5, y: 3.1, w: "90%", h: 0.5,
    fontSize: 20, color: THEME.accent, align: "center",
  });
  s.addText(r.meta.period, {
    x: 0.5, y: 3.7, w: "90%", h: 0.4,
    fontSize: 16, color: THEME.subtext, align: "center",
  });
  s.addText(`Generated ${new Date(r.meta.analyzedAt).toLocaleDateString()}`, {
    x: 0.5, y: 4.3, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.subtext, align: "center",
  });
}

function addExecutiveSummarySlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const s = addSlide(pptx, "Executive Summary");
  s.addText(r.summary.executive, {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 14, color: THEME.text, valign: "top",
  });
}

function addKpiCard(s: PptxGenJS.Slide, pptx: PptxGenJS, kpi: MarketingKpi, x: number, y: number) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w: CELL_W, h: CELL_H,
    fill: { color: THEME.dark },
    line: { color: THEME.accent, width: 1 },
  });
  s.addText(kpi.value, {
    x, y: y + 0.1, w: CELL_W, h: 0.7,
    fontSize: 22, bold: true, color: THEME.accent, align: "center",
  });
  s.addText(kpi.label, {
    x, y: y + 0.75, w: CELL_W, h: 0.35,
    fontSize: 11, color: THEME.subtext, align: "center",
  });
  if (kpi.change) {
    const changeColor = kpi.trend === "up" ? "4CAF50" : kpi.trend === "down" ? "F44336" : THEME.subtext;
    const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
    s.addText(`${kpi.change}${arrow}`, {
      x, y: y + 1.05, w: CELL_W, h: 0.25,
      fontSize: 10, color: changeColor, align: "center",
    });
  }
}

function addKeyMetricsSlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const s = addSlide(pptx, "Key Metrics");
  const kpis = r.kpis.slice(0, 6);
  kpis.forEach((kpi, i) => {
    const col = i % PPTX_COLS;
    const row = Math.floor(i / PPTX_COLS);
    const x = 0.5 + col * (CELL_W + CELL_GAP);
    const y = 1.1 + row * (CELL_H + 0.15);
    addKpiCard(s, pptx, kpi, x, y);
  });
}

function addChannelsOverviewSlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const s = addSlide(pptx, "Channels Overview");
  const rowH = 1.5;
  const colW = 6.2;
  r.channels.slice(0, 4).forEach((ch, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * (colW + 0.2);
    const y = 1.1 + row * (rowH + 0.2);
    const trendArrow = ch.trend === "up" ? " ▲" : ch.trend === "down" ? " ▼" : " →";
    const trendColor = ch.trend === "up" ? "4CAF50" : ch.trend === "down" ? "F44336" : THEME.subtext;
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: colW, h: rowH,
      fill: { color: THEME.dark },
      line: { color: THEME.accent, width: 1 },
    });
    s.addText(`${ch.name}${trendArrow}`, {
      x: x + 0.1, y: y + 0.1, w: colW - 0.2, h: 0.4,
      fontSize: 14, bold: true, color: trendColor,
    });
    const topKpis = ch.kpis.slice(0, 2);
    const kpiText = topKpis.map((k) => `${k.label}: ${k.value}`).join("  |  ");
    s.addText(kpiText, {
      x: x + 0.1, y: y + 0.6, w: colW - 0.2, h: 0.6,
      fontSize: 11, color: THEME.text,
    });
  });
}

function pickTopChannel(channels: MarketingChannel[]): MarketingChannel {
  const sorted = [...channels].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));
  return sorted[0];
}

function addTopChannelSlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const ch = pickTopChannel(r.channels);
  const s = addSlide(pptx, `Top Channel: ${ch.name}`);
  s.addText(ch.narrative, {
    x: 0.5, y: 1.0, w: "90%", h: 1.5,
    fontSize: 13, color: THEME.text, valign: "top",
  });
  ch.kpis.slice(0, 6).forEach((kpi, i) => {
    const col = i % PPTX_COLS;
    const row = Math.floor(i / PPTX_COLS);
    const x = 0.5 + col * (CELL_W + CELL_GAP);
    const y = 2.8 + row * (CELL_H + 0.15);
    addKpiCard(s, pptx, kpi, x, y);
  });
}

function addChannelComparisonSlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const s = addSlide(pptx, "Channel Comparison");
  const headers = [
    { text: "Channel", options: { bold: true, color: THEME.accent, fill: { color: THEME.dark } } },
    { text: "Spend", options: { bold: true, color: THEME.accent, fill: { color: THEME.dark } } },
    { text: "Revenue", options: { bold: true, color: THEME.accent, fill: { color: THEME.dark } } },
    { text: "Top KPI", options: { bold: true, color: THEME.accent, fill: { color: THEME.dark } } },
  ];
  const dataRows = r.channels.map((ch) => {
    const topKpi = ch.kpis[0];
    return [
      { text: ch.name, options: { color: THEME.text, fill: { color: THEME.bg } } },
      { text: ch.spend !== undefined ? `$${ch.spend.toLocaleString()}` : "—", options: { color: THEME.text, fill: { color: THEME.bg } } },
      { text: ch.revenue !== undefined ? `$${ch.revenue.toLocaleString()}` : "—", options: { color: THEME.text, fill: { color: THEME.bg } } },
      { text: topKpi ? `${topKpi.label}: ${topKpi.value}` : "—", options: { color: THEME.text, fill: { color: THEME.bg } } },
    ];
  });
  s.addTable([headers, ...dataRows], {
    x: 0.5, y: 1.0, w: 12.0, fontSize: 11,
    border: { color: THEME.accent, pt: 0.5 },
  });
}

function addRecommendationsSlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const s = addSlide(pptx, "Recommendations");
  const recs = r.summary.recommendations.map((rec) => ({
    text: `→ ${rec}`,
    options: { color: "4CAF50" },
  }));
  const findings = r.summary.topFindings.map((f) => ({
    text: `• ${f}`,
    options: { color: THEME.subtext },
  }));
  const spacer = { text: " ", options: { color: THEME.bg } };
  s.addText([...recs, spacer, ...findings], {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 14, paraSpaceAfter: 6, valign: "top",
  });
}

function addDisclaimerSlide(pptx: PptxGenJS, r: MarketingDashboard) {
  const s = pptx.addSlide();
  s.background = { color: THEME.dark };
  s.addText("Disclaimer", {
    x: 0.5, y: 1.5, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent, align: "center",
  });
  s.addText("AI-generated marketing analysis", {
    x: 0.5, y: 2.4, w: "90%", h: 0.5,
    fontSize: 16, color: THEME.text, align: "center",
  });
  s.addText(`Data source: ${r.meta.dataSource}`, {
    x: 0.5, y: 3.1, w: "90%", h: 0.4,
    fontSize: 13, color: THEME.subtext, align: "center",
  });
  s.addText(`Generated ${new Date(r.meta.analyzedAt).toLocaleDateString()}`, {
    x: 0.5, y: 3.7, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.subtext, align: "center",
  });
}
