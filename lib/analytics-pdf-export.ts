import { jsPDF } from "jspdf";
import type { AnalysisDashboard } from "./analytics-schema";

// A4 landscape: 297×210 mm
const W   = 297;
const H   = 210;
const MX  = 14;   // horizontal margin
const MY  = 12;   // vertical margin
const CW  = W - MX * 2;

// Warm infographic palette (hex → rgb helpers below)
const P = {
  bg:     "#F3EDE3",
  panel:  "#FDFAF5",
  border: "#D6CEBD",
  a1:     "#3D7FA6",
  a2:     "#9A4535",
  gold:   "#B8862A",
  text:   "#1A1A1A",
  sub:    "#5E5650",
  mute:   "#9A908A",
  green:  "#3A8A65",
  red:    "#AC3828",
};

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function fill(doc: jsPDF, hex: string) { doc.setFillColor(...rgb(hex)); }
function textCol(doc: jsPDF, hex: string) { doc.setTextColor(...rgb(hex)); }
function drawCol(doc: jsPDF, hex: string) { doc.setDrawColor(...rgb(hex)); }

// ── Page background + header/footer ──────────────────────────────────────────
function drawPageShell(doc: jsPDF, company: string, docTitle: string, page: number) {
  // Background
  fill(doc, P.bg);
  doc.rect(0, 0, W, H, "F");

  // Left accent bars
  fill(doc, P.a1);
  doc.rect(0, 0, 4, H, "F");
  fill(doc, P.a2);
  doc.rect(4.5, 0, 1.8, H, "F");
  fill(doc, P.gold);
  doc.rect(6.8, 0, 0.9, H, "F");

  // Header area (white panel)
  fill(doc, P.panel);
  doc.rect(MX, MY, CW, 14, "F");
  drawCol(doc, P.border);
  doc.setLineWidth(0.3);
  doc.rect(MX, MY, CW, 14, "S");

  // Logo placeholder
  fill(doc, P.bg);
  doc.rect(MX + 2, MY + 2, 28, 10, "F");
  drawCol(doc, P.border);
  doc.setLineWidth(0.2);
  doc.rect(MX + 2, MY + 2, 28, 10, "S");
  doc.setFontSize(6);
  textCol(doc, P.mute);
  doc.setFont("helvetica", "bold");
  doc.text("LOGO", MX + 16, MY + 7.5, { align: "center" });

  // Company name in header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  textCol(doc, P.text);
  doc.text(company, MX + 34, MY + 8.5);

  // Document title (right-aligned in header)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  textCol(doc, P.sub);
  doc.text(docTitle, MX + CW - 2, MY + 8.5, { align: "right" });

  // Footer
  fill(doc, P.panel);
  doc.rect(MX, H - MY - 8, CW, 8, "F");
  drawCol(doc, P.border);
  doc.setLineWidth(0.2);
  doc.line(MX, H - MY - 8, MX + CW, H - MY - 8);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  textCol(doc, P.mute);
  doc.text(docTitle, MX + 2, H - MY - 2.5);
  doc.text(String(page), MX + CW - 2, H - MY - 2.5, { align: "right" });
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function drawKpiCard(doc: jsPDF, kpi: { label: string; value: string; change?: string; trend?: string }, x: number, y: number, w: number, h: number) {
  fill(doc, P.panel);
  drawCol(doc, P.border);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "FD");

  // Top accent dot
  fill(doc, P.a1);
  doc.circle(x + 3.5, y + 3.5, 1.8, "F");

  // Value
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  textCol(doc, P.a1);
  const valueLines = doc.splitTextToSize(kpi.value, w - 4) as string[];
  doc.text(valueLines[0] ?? kpi.value, x + w / 2, y + h * 0.44, { align: "center" });

  // Label
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  textCol(doc, P.text);
  const labelLines = doc.splitTextToSize(kpi.label, w - 4) as string[];
  doc.text(labelLines[0] ?? kpi.label, x + w / 2, y + h * 0.63, { align: "center" });

  // Change/trend
  if (kpi.change) {
    const cc = kpi.trend === "up" ? P.green : kpi.trend === "down" ? P.red : P.mute;
    const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
    doc.setFontSize(7);
    textCol(doc, cc);
    doc.text(`${kpi.change}${arrow}`, x + w / 2, y + h * 0.82, { align: "center" });
  }
}

// ── Simple bar chart (drawn natively with jsPDF rects) ───────────────────────
function drawBarChart(
  doc: jsPDF,
  labels: string[], values: number[], title: string,
  x: number, y: number, w: number, h: number,
) {
  const palette = [P.a1, P.a2, P.green, P.gold, P.red];
  const max = Math.max(...values, 1);
  const barAreaH = h - 16;
  const barAreaY = y + 10;
  const n = Math.min(labels.length, 8);
  const gap = 2;
  const barW = (w - gap * (n + 1)) / n;

  // Title
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  textCol(doc, P.sub);
  doc.text(doc.splitTextToSize(title, w)[0] as string, x, y + 5);

  // Bars
  values.slice(0, n).forEach((val, i) => {
    const bh = (val / max) * barAreaH;
    const bx = x + gap * (i + 1) + barW * i;
    const by = barAreaY + barAreaH - bh;
    fill(doc, palette[i % palette.length]!);
    doc.rect(bx, by, barW, bh, "F");

    // Label
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    textCol(doc, P.sub);
    const lbl = (labels[i] ?? "").slice(0, 12);
    doc.text(lbl, bx + barW / 2, barAreaY + barAreaH + 4, { align: "center" });
  });

  // Axis line
  drawCol(doc, P.border);
  doc.setLineWidth(0.3);
  doc.line(x, barAreaY + barAreaH, x + w, barAreaY + barAreaH);
}

// ── Summary text block ────────────────────────────────────────────────────────
function drawSummaryBlock(doc: jsPDF, text: string, x: number, y: number, w: number, maxH: number, heading: string) {
  fill(doc, P.panel);
  drawCol(doc, P.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, maxH, "FD");
  // Left accent bar
  fill(doc, P.a1);
  doc.rect(x, y, 1.2, maxH, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  textCol(doc, P.text);
  doc.text(heading, x + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  textCol(doc, P.sub);
  const lines = doc.splitTextToSize(text, w - 6) as string[];
  const maxLines = Math.floor((maxH - 10) / 5.5);
  doc.text(lines.slice(0, maxLines), x + 4, y + 12);
}

// ── Bullet list block ─────────────────────────────────────────────────────────
function drawBulletList(doc: jsPDF, items: string[], x: number, y: number, w: number, heading: string, dotColor: string) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  textCol(doc, P.text);
  doc.text(heading, x, y);
  let cy = y + 8;
  items.slice(0, 6).forEach((item) => {
    fill(doc, dotColor);
    doc.circle(x + 1.5, cy - 1.5, 1.2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    textCol(doc, P.text);
    const lines = doc.splitTextToSize(item, w - 7) as string[];
    doc.text(lines[0] ?? item, x + 5, cy);
    cy += 7;
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function downloadAnalyticsPdf(dashboard: AnalysisDashboard, filename: string): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const d = dashboard;
  const company  = d.meta.companyName;
  const docTitle = `${d.meta.documentType || "Financial Analysis"} · ${d.meta.period}`;
  let page = 0;

  // ── Page 1: KPIs + first chart ────────────────────────────────────────────
  page++;
  drawPageShell(doc, company, docTitle, page);

  const contentY  = MY + 20;
  const contentH  = H - MY * 2 - 28; // usable height between header and footer
  const kpis      = d.kpis.slice(0, 6);
  const nCols     = 3;
  const cardGapX  = 3;
  const cardGapY  = 3;
  const gridW     = d.charts.length > 0 ? CW * 0.52 : CW;
  const cardW     = (gridW - cardGapX * (nCols - 1)) / nCols;
  const nRows     = Math.ceil(kpis.length / nCols);
  const cardH     = Math.min(38, (contentH - cardGapY * (nRows - 1)) / nRows);

  kpis.forEach((kpi, i) => {
    const col = i % nCols;
    const row = Math.floor(i / nCols);
    drawKpiCard(doc, kpi, MX + col * (cardW + cardGapX), contentY + row * (cardH + cardGapY), cardW, cardH);
  });

  // First chart (if available)
  if (d.charts.length > 0) {
    const chart = d.charts[0]!;
    if (chart.data.length > 0) {
      const keys   = Object.keys(chart.data[0] ?? {});
      const [lblKey, ...valKeys] = keys;
      const valKey = valKeys[0];
      if (lblKey && valKey) {
        const labels = chart.data.map((r) => String(r[lblKey] ?? ""));
        const values = chart.data.map((r) => (typeof r[valKey] === "number" ? (r[valKey] as number) : 0));
        const cx = MX + gridW + 4;
        drawBarChart(doc, labels, values, chart.title, cx, contentY, CW - gridW - 4, contentH);
      }
    }
  }

  // ── Page 2: Charts ────────────────────────────────────────────────────────
  const chartsToRender = d.charts.slice(0, 4);
  if (chartsToRender.length > 0) {
    doc.addPage();
    page++;
    drawPageShell(doc, company, docTitle, page);

    const chartRowH = contentH / 2 - 3;
    const chartColW = CW / 2 - 3;

    chartsToRender.forEach((chart, i) => {
      if (!chart.data.length) return;
      const keys = Object.keys(chart.data[0] ?? {});
      const [lblKey, ...valKeys] = keys;
      const valKey = valKeys[0];
      if (!lblKey || !valKey) return;
      const labels = chart.data.map((r) => String(r[lblKey] ?? ""));
      const values = chart.data.map((r) => (typeof r[valKey] === "number" ? (r[valKey] as number) : 0));
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = MX + col * (chartColW + 6);
      const cy = contentY + row * (chartRowH + 6);

      fill(doc, P.panel);
      drawCol(doc, P.border);
      doc.setLineWidth(0.2);
      doc.rect(cx, cy, chartColW, chartRowH, "FD");
      drawBarChart(doc, labels, values, chart.title, cx + 3, cy + 2, chartColW - 6, chartRowH - 4);
    });
  }

  // ── Page 3: Summary + Findings ────────────────────────────────────────────
  doc.addPage();
  page++;
  drawPageShell(doc, company, docTitle, page);

  const summaryH = contentH * 0.42;
  drawSummaryBlock(doc, d.summary.executive, MX, contentY, CW, summaryH,
    d.meta.documentType || "Executive Summary");

  const listsY = contentY + summaryH + 5;
  const listH  = H - MY - 8 - listsY;
  const colW2  = (CW - 6) / 2;

  if (d.summary.keyFindings.length > 0) {
    drawBulletList(doc, d.summary.keyFindings, MX, listsY, colW2, "Key Findings", P.a1);
  }
  if (d.summary.redFlags.length > 0) {
    drawBulletList(doc, d.summary.redFlags, MX + colW2 + 6, listsY, colW2, "Red Flags", P.red);
  }

  // ── Page 4: Tables + Opportunities ───────────────────────────────────────
  if (d.tables.length > 0 || d.summary.opportunities.length > 0) {
    doc.addPage();
    page++;
    drawPageShell(doc, company, docTitle, page);

    let curY = contentY;

    // Table
    if (d.tables.length > 0) {
      const tbl = d.tables[0]!;
      const tableH = Math.min(contentH * 0.55, contentH);

      fill(doc, P.panel);
      drawCol(doc, P.border);
      doc.setLineWidth(0.2);
      doc.rect(MX, curY, CW, tableH, "FD");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      textCol(doc, P.text);
      doc.text(tbl.title, MX + 3, curY + 6);

      const headers = tbl.headers;
      const colW3 = (CW - 6) / headers.length;
      const rowH2 = 7;

      // Header row
      fill(doc, P.a1);
      doc.rect(MX + 1, curY + 9, CW - 2, rowH2, "F");
      headers.forEach((h, hi) => {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        textCol(doc, "#FFFFFF");
        doc.text(h.slice(0, 18), MX + 2 + hi * colW3, curY + 14.5);
      });

      // Data rows
      tbl.rows.slice(0, 8).forEach((row, ri) => {
        const ry = curY + 9 + rowH2 * (ri + 1);
        if (ry + rowH2 > curY + tableH) return;
        if (ri % 2 === 0) { fill(doc, P.bg); doc.rect(MX + 1, ry, CW - 2, rowH2, "F"); }
        row.forEach((cell, ci) => {
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          textCol(doc, P.text);
          doc.text((cell ?? "").slice(0, 22), MX + 2 + ci * colW3, ry + 5);
        });
      });

      curY += tableH + 5;
    }

    // Opportunities
    if (d.summary.opportunities.length > 0 && curY + 20 < H - MY - 8) {
      drawBulletList(doc, d.summary.opportunities, MX, curY, CW, "Opportunities", P.a2);
    }
  }

  const name = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(name);
}
