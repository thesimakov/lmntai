import PptxGenJS from "pptxgenjs";
import type { AnalysisDashboard, Chart } from "./analytics-schema";

// ── Design System ─────────────────────────────────────────────────────────────
const T = {
  bg:     "FFFFFF",  // white canvas
  card:   "F7F8FC",  // subtle card fill
  border: "E2E8F0",  // dividers & card borders
  accent: "2563EB",  // primary blue
  sky:    "0EA5E9",  // secondary blue
  text:   "111827",  // near-black body text
  sub:    "6B7280",  // medium-gray supporting text
  mute:   "9CA3AF",  // muted (footer, logo placeholder)
  green:  "10B981",  // positive / up
  red:    "EF4444",  // negative / down
  amber:  "F59E0B",  // warning
};

// Layout — LAYOUT_WIDE = 13.33" × 7.5"
const SW   = 13.33;
const MX   = 0.40;          // horizontal margin
const HY   = 0.66;          // header divider y
const FY   = 6.84;          // footer divider y
const CY   = HY + 0.14;     // content-title y
const CW   = SW - MX * 2;   // usable content width

const CHART_COLORS = ["2563EB", "0EA5E9", "10B981", "F59E0B", "EF4444", "8B5CF6"];

// ── Frame (header + footer on every slide) ───────────────────────────────────
function addFrame(
  s: PptxGenJS.Slide,
  pptx: PptxGenJS,
  docName: string,
  page: number,
  website: string,
) {
  // Logo placeholder
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: 0.13, w: 1.55, h: 0.38,
    fill: { color: T.card },
    line: { color: T.border, width: 0.75 },
  });
  s.addText("LOGO", {
    x: MX, y: 0.13, w: 1.55, h: 0.38,
    fontSize: 8.5, color: T.mute, align: "center", valign: "middle",
    bold: true, charSpacing: 2,
  });

  // Website (top-right)
  s.addText(website, {
    x: SW - MX - 3.0, y: 0.19, w: 3.0, h: 0.28,
    fontSize: 8.5, color: T.sub, align: "right",
  });

  // Header divider
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: HY, w: CW, h: 0.012,
    fill: { color: T.border }, line: { color: T.border, width: 0 },
  });

  // Footer divider
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: FY, w: CW, h: 0.012,
    fill: { color: T.border }, line: { color: T.border, width: 0 },
  });

  // Document name (bottom-left)
  s.addText(docName, {
    x: MX, y: FY + 0.09, w: 8.0, h: 0.28,
    fontSize: 7.5, color: T.mute,
  });

  // Page number (bottom-right)
  s.addText(String(page), {
    x: SW - MX - 0.7, y: FY + 0.09, w: 0.7, h: 0.28,
    fontSize: 7.5, color: T.mute, align: "right",
  });
}

// ── Cover slide ───────────────────────────────────────────────────────────────
function addCoverSlide(
  pptx: PptxGenJS,
  company: string,
  docType: string,
  period: string,
  date: string,
  docName: string,
  website: string,
) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, 1, website);

  // Accent horizontal bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 3.58, w: SW, h: 0.06,
    fill: { color: T.accent }, line: { color: T.accent, width: 0 },
  });

  // Company name
  s.addText(company, {
    x: MX, y: 1.7, w: CW, h: 1.6,
    fontSize: 46, bold: true, color: T.text, align: "center", valign: "bottom",
  });

  // Document type (below accent bar)
  s.addText(docType, {
    x: MX, y: 3.76, w: CW, h: 0.62,
    fontSize: 19, color: T.accent, align: "center",
  });

  // Period · Date
  s.addText(`${period}  ·  ${date}`, {
    x: MX, y: 4.46, w: CW, h: 0.42,
    fontSize: 12.5, color: T.sub, align: "center",
  });
}

// ── Content slide ─────────────────────────────────────────────────────────────
function addSlide(
  pptx: PptxGenJS,
  title: string,
  docName: string,
  page: number,
  website: string,
) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, page, website);

  // Title
  s.addText(title, {
    x: MX, y: CY, w: CW, h: 0.44,
    fontSize: 18, bold: true, color: T.text,
  });

  // Blue accent underline
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: CY + 0.44, w: 0.38, h: 0.035,
    fill: { color: T.accent }, line: { color: T.accent, width: 0 },
  });

  return s;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function addKpiCard(
  s: PptxGenJS.Slide,
  pptx: PptxGenJS,
  kpi: { label: string; value: string; change?: string; trend?: string },
  x: number, y: number, w: number, h: number,
) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: T.card },
    line: { color: T.border, width: 0.75 },
  });

  // Top accent cap
  s.addShape(pptx.ShapeType.rect, {
    x: x + 0.02, y, w: w - 0.04, h: 0.045,
    fill: { color: T.accent }, line: { color: T.accent, width: 0 },
  });

  s.addText(kpi.value, {
    x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h * 0.45,
    fontSize: 22, bold: true, color: T.accent, align: "center", valign: "middle",
  });

  s.addText(kpi.label, {
    x: x + 0.1, y: y + h * 0.54, w: w - 0.2, h: h * 0.26,
    fontSize: 10, color: T.text, align: "center",
  });

  if (kpi.change) {
    const cc = kpi.trend === "up" ? T.green : kpi.trend === "down" ? T.red : T.sub;
    const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
    s.addText(`${kpi.change}${arrow}`, {
      x: x + 0.1, y: y + h * 0.8, w: w - 0.2, h: h * 0.18,
      fontSize: 9, color: cc, align: "center",
    });
  }
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
export async function buildAnalysisPptx(dashboard: AnalysisDashboard): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const d = dashboard;
  const docName = `${d.meta.documentType} · ${d.meta.period}`;
  const website = d.meta.companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  const date = new Date(d.meta.analyzedAt).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });

  let page = 0;

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  addCoverSlide(pptx, d.meta.companyName, d.meta.documentType, d.meta.period, date, docName, website);

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, "Executive Summary", docName, page, website);
    s.addText(d.summary.executive, {
      x: MX, y: CY + 0.56, w: CW, h: FY - CY - 0.72,
      fontSize: 13.5, color: T.sub, valign: "top", paraSpaceAfter: 4,
    });
  }

  // ── 3. Key Metrics (KPI grid + chart) ─────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, "Key Metrics", docName, page, website);
    const kpis = d.kpis.slice(0, 6);
    const hasChart = d.charts.length > 0;

    const gridW = hasChart ? 7.6 : CW;
    const cardW = (gridW - 2 * 0.22) / 3;
    const cardH = 1.72;
    const gridY = CY + 0.58;

    kpis.forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MX + col * (cardW + 0.22);
      const y = gridY + row * (cardH + 0.24);
      addKpiCard(s, pptx, kpi, x, y, cardW, cardH);
    });

    if (hasChart) {
      const barData = analyticsChartToBarData(d.charts[0]!);
      if (barData.length) {
        const cx = MX + gridW + 0.35;
        const cw = SW - cx - MX;
        s.addText(d.charts[0]!.title, {
          x: cx, y: CY + 0.56, w: cw, h: 0.3,
          fontSize: 9.5, color: T.sub, bold: true,
        });
        s.addChart(pptx.ChartType.bar, barData, {
          x: cx, y: CY + 0.88, w: cw, h: FY - CY - 1.04,
          barDir: "col",
          barGapWidthPct: 55,
          chartColors: CHART_COLORS,
          catAxisLabelColor: T.sub,
          valAxisLabelColor: T.sub,
          catAxisLabelFontSize: 8,
          valAxisLabelFontSize: 8,
          showLegend: barData.length > 1,
          legendPos: "b",
          legendFontSize: 8,
          showTitle: false,
          showValue: false,
          valAxisHidden: false,
          catAxisHidden: false,
        } as PptxGenJS.IChartOpts);
      }
    }
  }

  // ── 4. Charts (one per chart in data, up to 2) ───────────────────────────
  for (const chart of d.charts.slice(0, 2)) {
    const barData = analyticsChartToBarData(chart);
    if (!barData.length) continue;
    page++;
    const s = addSlide(pptx, chart.title, docName, page, website);
    if (chart.description) {
      s.addText(chart.description, {
        x: MX, y: CY + 0.56, w: CW, h: 0.32,
        fontSize: 10, color: T.sub, italic: true,
      });
    }
    const chartY = chart.description ? CY + 0.96 : CY + 0.58;
    s.addChart(pptx.ChartType.bar, barData, {
      x: MX, y: chartY, w: CW, h: FY - chartY - 0.15,
      barDir: "col",
      barGapWidthPct: 55,
      chartColors: CHART_COLORS,
      catAxisLabelColor: T.sub,
      valAxisLabelColor: T.sub,
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      showLegend: barData.length > 1,
      legendPos: "b",
      legendFontSize: 9,
      showTitle: false,
      showValue: false,
    } as PptxGenJS.IChartOpts);
  }

  // ── 5. Key Findings & Red Flags ───────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, "Key Findings & Red Flags", docName, page, website);
    const contentY = CY + 0.58;
    const contentH = FY - contentY - 0.15;

    const findings = d.summary.keyFindings.map((f) => ({
      text: `• ${f}`, options: { color: T.text },
    }));
    const redFlags = d.summary.redFlags.map((f) => ({
      text: `⚠ ${f}`, options: { color: T.red },
    }));

    const leftW = CW * 0.5 - 0.2;
    const rightW = CW * 0.5 - 0.2;

    s.addText(findings, {
      x: MX, y: contentY, w: leftW, h: contentH,
      fontSize: 12.5, paraSpaceAfter: 8, valign: "top",
    });

    if (d.summary.redFlags.length > 0) {
      s.addText("Red Flags", {
        x: MX + leftW + 0.4, y: contentY, w: rightW, h: 0.32,
        fontSize: 10.5, bold: true, color: T.red,
      });
      s.addText(redFlags, {
        x: MX + leftW + 0.4, y: contentY + 0.36, w: rightW, h: contentH - 0.36,
        fontSize: 12.5, paraSpaceAfter: 8, valign: "top",
      });
      // Vertical divider
      s.addShape(pptx.ShapeType.rect, {
        x: MX + leftW + 0.18, y: contentY, w: 0.012, h: contentH,
        fill: { color: T.border }, line: { color: T.border, width: 0 },
      });
    }
  }

  // ── 6. Data Table (if present) ────────────────────────────────────────────
  if (d.tables.length > 0) {
    page++;
    const tbl = d.tables[0]!;
    const s = addSlide(pptx, tbl.title, docName, page, website);
    const headers = tbl.headers.map((h) => ({
      text: h,
      options: { bold: true, color: T.text, fill: { color: T.card } },
    }));
    const rows = tbl.rows.slice(0, 12).map((row, ri) => row.map((cell) => ({
      text: cell,
      options: { color: T.text, fill: { color: ri % 2 === 0 ? T.bg : T.card } },
    })));
    s.addTable([headers, ...rows], {
      x: MX, y: CY + 0.58, w: CW,
      fontSize: 10.5,
      border: { color: T.border, pt: 0.5 },
      rowH: 0.32,
    });
  }

  // ── 7. Opportunities ─────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, "Opportunities", docName, page, website);
    const items = d.summary.opportunities.length > 0
      ? d.summary.opportunities
      : ["No specific opportunities identified."];

    items.forEach((opp, i) => {
      const y = CY + 0.62 + i * 0.72;
      if (y + 0.55 > FY) return;

      // Number circle
      s.addShape(pptx.ShapeType.ellipse, {
        x: MX, y: y + 0.02, w: 0.38, h: 0.38,
        fill: { color: T.card },
        line: { color: T.accent, width: 1 },
      });
      s.addText(String(i + 1), {
        x: MX, y: y + 0.02, w: 0.38, h: 0.38,
        fontSize: 10, bold: true, color: T.accent, align: "center", valign: "middle",
      });

      s.addText(opp, {
        x: MX + 0.52, y, w: CW - 0.52, h: 0.52,
        fontSize: 12.5, color: T.text, valign: "middle",
      });
    });
  }

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
