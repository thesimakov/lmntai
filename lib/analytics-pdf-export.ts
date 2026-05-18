"use client";

import type { AnalysisDashboard } from "./analytics-schema";

// A4 landscape: 1122 × 794 px (at 96 dpi)
const PW = 1122;
const PH = 794;

const COLORS = ["#1D4ED8", "#0F1C35", "#3B82F6", "#60A5FA", "#6B7280", "#D1D5DB"];

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:     "#FFFFFF",
  panel:  "#F8FAFC",
  border: "#D1D5DB",
  a1:     "#1D4ED8",
  a2:     "#0F1C35",
  gold:   "#F59E0B",
  text:   "#0F1C35",
  sub:    "#374151",
  mute:   "#6B7280",
  green:  "#059669",
  red:    "#DC2626",
};

// ── Shared page shell ─────────────────────────────────────────────────────────
function shell(content: string, company: string, docTitle: string, pageNum: number): string {
  return `<div style="
    width:${PW}px;height:${PH}px;background:${D.bg};
    font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;
    position:relative;overflow:hidden;
  ">
    <!-- Left accent stripes -->
    <div style="position:absolute;left:0;top:44px;width:14px;height:${PH - 56}px;background:${D.a2}"></div>
    <div style="position:absolute;left:17px;top:44px;width:5px;height:${PH - 56}px;background:${D.a1}"></div>
    <div style="position:absolute;left:25px;top:44px;width:3px;height:${PH - 56}px;background:#3B82F6"></div>

    <!-- Header -->
    <div style="position:absolute;top:10px;left:38px;right:38px;height:30px;background:${D.panel};border:1px solid ${D.border};display:flex;align-items:center;padding:0 10px;gap:10px;">
      <div style="width:56px;height:20px;background:${D.bg};border:1px solid ${D.border};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:7px;color:${D.mute};font-weight:700;letter-spacing:1px">LOGO</span>
      </div>
      <span style="font-size:12px;font-weight:700;color:${D.text};flex:1">${esc(company)}</span>
      <span style="font-size:10px;color:${D.sub}">${esc(docTitle)}</span>
    </div>

    <!-- Content area -->
    <div style="position:absolute;top:50px;left:38px;right:38px;bottom:30px;overflow:hidden;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:10px;left:38px;right:38px;height:16px;border-top:1px solid ${D.border};display:flex;align-items:center;justify-content:space-between;padding:0 4px;">
      <span style="font-size:8px;color:${D.mute}">${esc(docTitle)}</span>
      <span style="font-size:8px;color:${D.mute}">${pageNum}</span>
    </div>
  </div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function kpiCard(kpi: { label: string; value: string; change?: string; trend?: string }): string {
  const cc = kpi.trend === "up" ? D.green : kpi.trend === "down" ? D.red : D.mute;
  const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
  return `<div style="background:${D.panel};border:1px solid ${D.border};padding:14px 10px 10px;flex:1;min-width:0;position:relative;">
    <div style="width:12px;height:12px;background:${D.a1};border-radius:50%;position:absolute;top:8px;left:8px;"></div>
    <div style="font-size:20px;font-weight:700;color:${D.a1};text-align:center;margin:10px 0 5px">${esc(kpi.value)}</div>
    <div style="font-size:9px;color:${D.text};text-align:center;line-height:1.3">${esc(kpi.label)}</div>
    ${kpi.change ? `<div style="font-size:8px;color:${cc};text-align:center;margin-top:4px">${esc(kpi.change)}${arrow}</div>` : ""}
  </div>`;
}

// ── Bar chart (div-based, no canvas — html2canvas safe) ───────────────────────
function barChart(
  title: string,
  labels: string[], values: number[],
  w: number, h: number,
): string {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const chartH = h - 42;
  const n = Math.min(values.length, 10);
  const bars = values.slice(0, n).map((v, i) => {
    const bh = Math.round((v / max) * chartH);
    const color = COLORS[i % COLORS.length]!;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;">
      <div style="width:80%;background:${color};height:${bh}px;margin-top:${chartH - bh}px;"></div>
      <div style="font-size:7px;color:${D.sub};text-align:center;word-break:break-word;max-width:70px;line-height:1.2">${esc((labels[i] ?? "").slice(0, 16))}</div>
    </div>`;
  }).join("");

  return `<div style="background:${D.panel};border:1px solid ${D.border};padding:10px;width:${w}px;height:${h}px;overflow:hidden;">
    <div style="font-size:9px;font-weight:600;color:${D.sub};margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title)}</div>
    <div style="border-bottom:1px solid ${D.border};padding-bottom:6px;height:${h - 42}px;">
      <div style="display:flex;align-items:flex-end;height:${chartH}px;gap:3px;">${bars}</div>
    </div>
  </div>`;
}

// ── Summary block ─────────────────────────────────────────────────────────────
function summaryBlock(heading: string, text: string): string {
  return `<div style="background:${D.panel};border:1px solid ${D.border};display:flex;gap:0;overflow:hidden;">
    <div style="width:4px;background:${D.a1};flex-shrink:0;"></div>
    <div style="padding:12px 14px;flex:1;min-width:0;">
      <div style="font-size:11px;font-weight:700;color:${D.text};margin-bottom:6px">${esc(heading)}</div>
      <div style="font-size:10px;color:${D.sub};line-height:1.6">${esc(text)}</div>
    </div>
  </div>`;
}

// ── Bullet list ───────────────────────────────────────────────────────────────
function bulletList(heading: string, items: string[], dotColor: string): string {
  const dots = items.slice(0, 7).map((item) =>
    `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:2px;"></div>
      <div style="font-size:9.5px;color:${D.text};line-height:1.4;flex:1;min-width:0;">${esc(item)}</div>
    </div>`
  ).join("");
  return `<div>
    <div style="font-size:11px;font-weight:700;color:${D.text};margin-bottom:8px">${esc(heading)}</div>
    ${dots}
  </div>`;
}

// ── Build all page HTML strings ───────────────────────────────────────────────
function buildPages(d: AnalysisDashboard): string[] {
  const company  = d.meta.companyName;
  const docTitle = `${d.meta.documentType || "Финансовый анализ"} · ${d.meta.period}`;
  const pages: string[] = [];

  // Page 1 — KPI grid + first chart
  {
    const kpis = d.kpis.slice(0, 6);
    const contentH = PH - 56 - 30; // header + footer
    const gridW = d.charts.length > 0 ? Math.round((PW - 76) * 0.56) : PW - 76;
    const chartW = PW - 76 - gridW - 12;

    // Two rows of KPI cards
    const row1 = kpis.slice(0, 3).map(kpiCard).join("<div style='width:10px;flex-shrink:0'></div>");
    const row2 = kpis.slice(3, 6).map(kpiCard).join("<div style='width:10px;flex-shrink:0'></div>");

    let chartHtml = "";
    if (d.charts.length > 0 && chartW > 80) {
      const chart = d.charts[0]!;
      const keys = Object.keys(chart.data[0] ?? {});
      const [lk, vk] = [keys[0], keys[1]];
      if (lk && vk) {
        const labels = chart.data.map((r) => String(r[lk] ?? ""));
        const values = chart.data.map((r) => (typeof r[vk] === "number" ? (r[vk] as number) : 0));
        chartHtml = barChart(chart.title, labels, values, chartW, contentH - 10);
      }
    }

    const cardH = Math.floor((contentH - 12) / 2);

    const content = `
      <div style="display:flex;gap:12px;width:100%;height:100%;">
        <div style="width:${gridW}px;display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;gap:10px;height:${cardH}px;">${row1}</div>
          <div style="display:flex;gap:10px;height:${cardH}px;">${row2}</div>
        </div>
        ${chartHtml ? `<div style="flex:1;">${chartHtml}</div>` : ""}
      </div>`;

    pages.push(shell(content, company, docTitle, 1));
  }

  // Page 2 — Charts (up to 4 in 2×2 grid)
  if (d.charts.length > 0) {
    const chartsToShow = d.charts.slice(0, 4);
    const contentH = PH - 56 - 30;
    const cellW = Math.floor((PW - 76 - 10) / 2);
    const cellH = Math.floor((contentH - 10) / 2);

    const cells = chartsToShow.map((chart) => {
      const keys = Object.keys(chart.data[0] ?? {});
      const [lk, vk] = [keys[0], keys[1]];
      if (!lk || !vk) return `<div style="width:${cellW}px;height:${cellH}px;"></div>`;
      const labels = chart.data.map((r) => String(r[lk] ?? ""));
      const values = chart.data.map((r) => (typeof r[vk] === "number" ? (r[vk] as number) : 0));
      return barChart(chart.title, labels, values, cellW, cellH);
    });

    const row1 = cells.slice(0, 2).join("<div style='width:10px'></div>");
    const row2 = cells.slice(2, 4).join("<div style='width:10px'></div>");

    const content = `
      <div style="display:flex;flex-direction:column;gap:10px;height:100%;">
        <div style="display:flex;gap:0;">${row1}</div>
        ${cells.length > 2 ? `<div style="display:flex;gap:0;">${row2}</div>` : ""}
      </div>`;
    pages.push(shell(content, company, docTitle, 2));
  }

  // Page 3 — Summary + Findings + Red Flags
  {
    const findings = d.summary.keyFindings;
    const redFlags = d.summary.redFlags;

    const content = `
      <div style="display:flex;flex-direction:column;gap:14px;height:100%;">
        ${summaryBlock(d.meta.documentType || "Анализ", d.summary.executive.slice(0, 600) + (d.summary.executive.length > 600 ? "…" : ""))}
        <div style="display:flex;gap:20px;flex:1;">
          ${findings.length > 0 ? `<div style="flex:1;">${bulletList("Ключевые выводы", findings, D.a1)}</div>` : ""}
          ${redFlags.length > 0 ? `<div style="flex:1;">${bulletList("Красные флаги", redFlags, D.red)}</div>` : ""}
        </div>
      </div>`;
    pages.push(shell(content, company, docTitle, 3));
  }

  // Page 4 — Table + Opportunities (only if there's content)
  if (d.tables.length > 0 || d.summary.opportunities.length > 0) {
    let tableHtml = "";
    if (d.tables.length > 0) {
      const tbl = d.tables[0]!;
      const cols = tbl.headers.length;
      const colW = Math.floor((PW - 76) / cols);
      const headerCells = tbl.headers.map((h) =>
        `<td style="width:${colW}px;padding:5px 6px;font-size:8px;font-weight:700;color:#FFFFFF;background:${D.a1};border:1px solid ${D.border}">${esc(h)}</td>`
      ).join("");
      const bodyRows = tbl.rows.slice(0, 10).map((row, ri) => {
        const bg = ri % 2 === 0 ? D.panel : D.bg;
        const cells = row.map((c) =>
          `<td style="width:${colW}px;padding:4px 6px;font-size:8px;color:${D.text};background:${bg};border:1px solid ${D.border}">${esc((c ?? "").slice(0, 30))}</td>`
        ).join("");
        return `<tr>${cells}</tr>`;
      }).join("");
      tableHtml = `
        <div style="background:${D.panel};border:1px solid ${D.border};padding:10px;overflow:hidden;">
          <div style="font-size:10px;font-weight:700;color:${D.text};margin-bottom:8px">${esc(tbl.title)}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>`;
    }

    const content = `
      <div style="display:flex;flex-direction:column;gap:14px;height:100%;">
        ${tableHtml}
        ${d.summary.opportunities.length > 0 ? bulletList("Возможности", d.summary.opportunities, D.a2) : ""}
      </div>`;
    pages.push(shell(content, company, docTitle, 4));
  }

  return pages;
}

export type PdfBrandColors = {
  accentHex?: string;   // replaces D.a1 (#1D4ED8)
  primaryHex?: string;  // replaces D.a2 (#0F1C35)
};

// ── Main export ───────────────────────────────────────────────────────────────
export async function downloadAnalyticsPdf(
  dashboard: AnalysisDashboard,
  filename: string,
  brand?: PdfBrandColors | null
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pdfW = doc.internal.pageSize.getWidth();
  const pdfH = doc.internal.pageSize.getHeight();

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1000;pointer-events:none;";
  document.body.appendChild(wrapper);

  try {
    let htmlPages = buildPages(dashboard);
    if (brand?.accentHex || brand?.primaryHex) {
      htmlPages = htmlPages.map((html) => {
        let out = html;
        if (brand.accentHex) out = out.replaceAll("#1D4ED8", brand.accentHex);
        if (brand.primaryHex) out = out.replaceAll("#0F1C35", brand.primaryHex);
        return out;
      });
    }
    for (let i = 0; i < htmlPages.length; i++) {
      wrapper.innerHTML = htmlPages[i]!;
      const el = wrapper.firstElementChild as HTMLElement;

      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: D.bg,
        width: PW,
        height: PH,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) doc.addPage();
      doc.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
    }

    const name = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    doc.save(name);
  } finally {
    document.body.removeChild(wrapper);
  }
}
