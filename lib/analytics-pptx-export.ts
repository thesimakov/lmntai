import PptxGenJS from "pptxgenjs";
import type { AnalysisDashboard } from "./analytics-schema";

const THEME = {
  bg: "1A1A2E",
  accent: "4F8EF7",
  text: "FFFFFF",
  subtext: "AAAACC",
  dark: "16213E",
};

export async function buildAnalysisPptx(dashboard: AnalysisDashboard): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, dashboard);
  addExecutiveSummarySlide(pptx, dashboard);
  addKpiSlide(pptx, dashboard);
  addKeyFindingsSlide(pptx, dashboard);
  if (dashboard.tables.length > 0) addTableSlide(pptx, dashboard);
  addOpportunitiesSlide(pptx, dashboard);

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}

function addSlide(pptx: PptxGenJS, title: string) {
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  s.addText(title, {
    x: 0.5, y: 0.2, w: "90%", h: 0.6,
    fontSize: 24, bold: true, color: THEME.accent,
  });
  return s;
}

function addTitleSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = pptx.addSlide();
  s.background = { color: THEME.dark };
  s.addText(d.meta.companyName, {
    x: 0.5, y: 2.5, w: "90%", h: 1.2,
    fontSize: 40, bold: true, color: THEME.text, align: "center",
  });
  s.addText(`${d.meta.period} · ${d.meta.documentType} · ${d.meta.currency}`, {
    x: 0.5, y: 3.8, w: "90%", h: 0.5,
    fontSize: 18, color: THEME.subtext, align: "center",
  });
  s.addText(`Generated ${new Date(d.meta.analyzedAt).toLocaleDateString()}`, {
    x: 0.5, y: 4.5, w: "90%", h: 0.4,
    fontSize: 12, color: THEME.subtext, align: "center",
  });
}

function addExecutiveSummarySlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = addSlide(pptx, "Executive Summary");
  s.addText(d.summary.executive, {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 14, color: THEME.text, valign: "top",
  });
}

function addKpiSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = addSlide(pptx, "Key Metrics");
  const kpis = d.kpis.slice(0, 6);
  const cols = 3;
  const cellW = 4.0;
  const cellH = 1.4;
  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cellW + 0.2);
    const y = 1.1 + row * (cellH + 0.15);
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: cellW, h: cellH,
      fill: { color: THEME.dark },
      line: { color: THEME.accent, width: 1 },
    });
    s.addText(kpi.value, {
      x, y: y + 0.1, w: cellW, h: 0.7,
      fontSize: 22, bold: true, color: THEME.accent, align: "center",
    });
    s.addText(kpi.label, {
      x, y: y + 0.75, w: cellW, h: 0.35,
      fontSize: 11, color: THEME.subtext, align: "center",
    });
    if (kpi.change) {
      const changeColor = kpi.trend === "up" ? "4CAF50" : kpi.trend === "down" ? "F44336" : THEME.subtext;
      s.addText(kpi.change, {
        x, y: y + 1.05, w: cellW, h: 0.25,
        fontSize: 10, color: changeColor, align: "center",
      });
    }
  });
}

function addKeyFindingsSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = addSlide(pptx, "Key Findings & Red Flags");
  const findings = d.summary.keyFindings.map((f) => ({ text: `• ${f}`, options: { color: THEME.text } }));
  const redFlags = d.summary.redFlags.map((f) => ({ text: `⚠ ${f}`, options: { color: "F44336" } }));
  s.addText([...findings, { text: "" }, ...redFlags], {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 14, paraSpaceAfter: 6, valign: "top",
  });
}

function addTableSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const table = d.tables[0];
  const s = addSlide(pptx, table.title);
  const rows = [
    table.headers.map((h) => ({ text: h, options: { bold: true, color: THEME.accent, fill: { color: THEME.dark } } })),
    ...table.rows.slice(0, 10).map((row) =>
      row.map((cell) => ({ text: cell, options: { color: THEME.text, fill: { color: THEME.bg } } }))
    ),
  ];
  s.addTable(rows, { x: 0.5, y: 1.0, w: 12.0, fontSize: 11, border: { color: THEME.accent, pt: 0.5 } });
}

function addOpportunitiesSlide(pptx: PptxGenJS, d: AnalysisDashboard) {
  const s = addSlide(pptx, "Opportunities");
  const items = d.summary.opportunities.length > 0
    ? d.summary.opportunities.map((o) => ({ text: `→ ${o}`, options: { color: "4CAF50" } }))
    : [{ text: "No specific opportunities identified.", options: { color: THEME.subtext } }];
  s.addText(items, {
    x: 0.5, y: 1.0, w: "90%", h: 4.5,
    fontSize: 15, paraSpaceAfter: 8, valign: "top",
  });
}
