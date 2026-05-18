"use client";

import type { MarketingDashboard, MarketingChannel } from "./marketing-schema";
import type { UiLanguage } from "./i18n";
import { localizeMarketingKpiLabel } from "./marketing-dashboard-localization";
import {
  parseMarketingChatMarkdown,
  stripInlineMarkdown,
  type MarketingChatMarkdownBlock,
} from "./marketing-chat-markdown";

const PW = 1122;
const PH = 794;

const COLORS = ["#1D4ED8", "#0F1C35", "#3B82F6", "#60A5FA", "#6B7280", "#D1D5DB"];

const D = {
  bg: "#FFFFFF",
  panel: "#F8FAFC",
  border: "#D1D5DB",
  a1: "#1D4ED8",
  a2: "#0F1C35",
  text: "#0F1C35",
  sub: "#374151",
  mute: "#6B7280",
  green: "#059669",
  red: "#DC2626",
};

export type MarketingPdfChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function pdfLabels(lang: UiLanguage) {
  if (lang === "en") {
    return {
      docTitle: "Marketing Performance Report",
      execSummary: "Executive Summary",
      keyMetrics: "Key Metrics",
      channels: "Channels",
      channel: "Channel",
      spend: "Spend",
      revenue: "Revenue",
      trend: "Trend",
      recommendations: "Recommendations",
      topFindings: "Key Findings",
      narrative: "Performance Narrative",
      spendVsRevenue: "Spend vs Revenue by Channel",
      charts: "Charts",
      aiConsultation: "AI Consultation",
      userQuestion: "Question",
      aiAnswer: "AI Answer",
      dataSource: "Data source",
      disclaimer: "AI-generated marketing analysis. For informational purposes only.",
      continued: "continued",
    } as const;
  }
  if (lang === "tg") {
    return {
      docTitle: "Ҳисоботи самаранокии маркетинг",
      execSummary: "Хулосаи иҷроия",
      keyMetrics: "Метрикаҳои асосӣ",
      channels: "Каналҳо",
      channel: "Канал",
      spend: "Хароҷот",
      revenue: "Даромад",
      trend: "Тамоюл",
      recommendations: "Тавсияҳо",
      topFindings: "Бозёфтҳои асосӣ",
      narrative: "Нарративи самаранокӣ",
      spendVsRevenue: "Хароҷот ва даромад аз рӯи канал",
      charts: "Диаграммаҳо",
      aiConsultation: "Машварати AI",
      userQuestion: "Савол",
      aiAnswer: "Ҷавоби AI",
      dataSource: "Манбаи маълумот",
      disclaimer: "Таҳлили маркетинг аз ҷониби AI. Танҳо барои иттилоот.",
      continued: "давом",
    } as const;
  }
  return {
    docTitle: "Отчёт по эффективности маркетинга",
    execSummary: "Краткое резюме",
    keyMetrics: "Ключевые метрики",
    channels: "Каналы",
    channel: "Канал",
    spend: "Расходы",
    revenue: "Выручка",
    trend: "Тренд",
    recommendations: "Рекомендации",
    topFindings: "Ключевые выводы",
    narrative: "Нарратив эффективности",
      spendVsRevenue: "Расходы и выручка по каналам",
      charts: "Диаграммы",
      aiConsultation: "Консультация AI",
    userQuestion: "Вопрос",
    aiAnswer: "Ответ AI",
    dataSource: "Источник данных",
    disclaimer: "AI-сгенерированный маркетинговый анализ. Только для ознакомления.",
    continued: "продолжение",
  } as const;
}

function localeFor(lang: UiLanguage): string {
  if (lang === "en") return "en-US";
  if (lang === "tg") return "tg-TJ";
  return "ru-RU";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function shell(content: string, company: string, docTitle: string, pageNum: number): string {
  return `<div style="
    width:${PW}px;height:${PH}px;background:${D.bg};
    font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;
    position:relative;overflow:hidden;
  ">
    <div style="position:absolute;left:0;top:44px;width:14px;height:${PH - 56}px;background:${D.a2}"></div>
    <div style="position:absolute;left:17px;top:44px;width:5px;height:${PH - 56}px;background:${D.a1}"></div>
    <div style="position:absolute;left:25px;top:44px;width:3px;height:${PH - 56}px;background:#3B82F6"></div>
    <div style="position:absolute;top:10px;left:38px;right:38px;height:30px;background:${D.panel};border:1px solid ${D.border};display:flex;align-items:center;padding:0 10px;gap:10px;">
      <div style="width:56px;height:20px;background:${D.bg};border:1px solid ${D.border};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:7px;color:${D.mute};font-weight:700;letter-spacing:1px">LOGO</span>
      </div>
      <span style="font-size:12px;font-weight:700;color:${D.text};flex:1">${esc(company)}</span>
      <span style="font-size:10px;color:${D.sub}">${esc(docTitle)}</span>
    </div>
    <div style="position:absolute;top:50px;left:38px;right:38px;bottom:30px;overflow:hidden;">
      ${content}
    </div>
    <div style="position:absolute;bottom:10px;left:38px;right:38px;height:16px;border-top:1px solid ${D.border};display:flex;align-items:center;justify-content:space-between;padding:0 4px;">
      <span style="font-size:8px;color:${D.mute}">${esc(docTitle)}</span>
      <span style="font-size:8px;color:${D.mute}">${pageNum}</span>
    </div>
  </div>`;
}

function sectionTitle(title: string): string {
  return `<div style="font-size:11px;font-weight:700;color:${D.text};margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${D.a1}">${esc(title)}</div>`;
}

function kpiCard(
  label: string,
  value: string,
  change?: string,
  trend?: string
): string {
  const cc = trend === "up" ? D.green : trend === "down" ? D.red : D.mute;
  const arrow = trend === "up" ? " ▲" : trend === "down" ? " ▼" : "";
  return `<div style="background:${D.panel};border:1px solid ${D.border};padding:14px 10px 10px;flex:1;min-width:0;position:relative;">
    <div style="width:12px;height:12px;background:${D.a1};border-radius:50%;position:absolute;top:8px;left:8px;"></div>
    <div style="font-size:20px;font-weight:700;color:${D.a1};text-align:center;margin:10px 0 5px">${esc(value)}</div>
    <div style="font-size:9px;color:${D.text};text-align:center;line-height:1.3">${esc(label)}</div>
    ${change ? `<div style="font-size:8px;color:${cc};text-align:center;margin-top:4px">${esc(change)}${arrow}</div>` : ""}
  </div>`;
}

function barChart(title: string, labels: string[], values: number[], w: number, h: number): string {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const chartH = h - 42;
  const n = Math.min(values.length, 12);
  const bars = values.slice(0, n).map((v, i) => {
    const bh = Math.round((v / max) * chartH);
    const color = COLORS[i % COLORS.length]!;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;">
      <div style="width:80%;background:${color};height:${bh}px;margin-top:${chartH - bh}px;"></div>
      <div style="font-size:7px;color:${D.sub};text-align:center;word-break:break-word;max-width:90px;line-height:1.2">${esc((labels[i] ?? "").slice(0, 24))}</div>
    </div>`;
  }).join("");

  return `<div style="background:${D.panel};border:1px solid ${D.border};padding:10px;width:${w}px;height:${h}px;overflow:hidden;">
    <div style="font-size:9px;font-weight:600;color:${D.sub};margin-bottom:8px;">${esc(title)}</div>
    <div style="border-bottom:1px solid ${D.border};padding-bottom:6px;height:${h - 42}px;">
      <div style="display:flex;align-items:flex-end;height:${chartH}px;gap:3px;">${bars}</div>
    </div>
  </div>`;
}

function summaryBlock(heading: string, text: string): string {
  return `<div style="background:${D.panel};border:1px solid ${D.border};display:flex;gap:0;overflow:hidden;flex:1;min-width:0;">
    <div style="width:4px;background:${D.a1};flex-shrink:0;"></div>
    <div style="padding:12px 14px;flex:1;min-width:0;">
      <div style="font-size:11px;font-weight:700;color:${D.text};margin-bottom:6px">${esc(heading)}</div>
      <div style="font-size:10px;color:${D.sub};line-height:1.6">${esc(text)}</div>
    </div>
  </div>`;
}

function bulletList(heading: string, items: string[], dotColor: string): string {
  const dots = items.slice(0, 8).map((item) =>
    `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:2px;"></div>
      <div style="font-size:9.5px;color:${D.text};line-height:1.4;flex:1;min-width:0;">${esc(item)}</div>
    </div>`
  ).join("");
  return `<div style="flex:1;min-width:0;">
    <div style="font-size:11px;font-weight:700;color:${D.text};margin-bottom:8px">${esc(heading)}</div>
    ${dots}
  </div>`;
}

function formatMoney(value: number | undefined, locale: string): string {
  if (value == null) return "—";
  return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}

function trendGlyph(trend: MarketingChannel["trend"]): string {
  if (trend === "up") return "▲";
  if (trend === "down") return "▼";
  return "→";
}

function channelsTable(
  channels: MarketingChannel[],
  labels: ReturnType<typeof pdfLabels>,
  locale: string
): string {
  const colW = Math.floor((PW - 76) / 4);
  const headerCells = [labels.channel, labels.spend, labels.revenue, labels.trend].map(
    (h) =>
      `<td style="padding:6px 8px;font-size:9px;font-weight:700;color:#FFFFFF;background:${D.a2};border:1px solid ${D.border};width:${colW}px">${esc(h)}</td>`
  ).join("");

  const bodyRows = channels.map((ch, ri) => {
    const bg = ri % 2 === 0 ? D.panel : D.bg;
    const tc = ch.trend === "up" ? D.green : ch.trend === "down" ? D.red : D.mute;
    const cells = [
      ch.name,
      formatMoney(ch.spend, locale),
      formatMoney(ch.revenue, locale),
      trendGlyph(ch.trend),
    ].map((c, ci) =>
      `<td style="padding:5px 8px;font-size:9px;color:${ci === 3 ? tc : D.text};background:${bg};border:1px solid ${D.border}">${esc(c)}</td>`
    ).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `<div style="background:${D.panel};border:1px solid ${D.border};padding:10px;">
    ${sectionTitle(labels.channels)}
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
}

function renderMarkdownBlock(block: MarketingChatMarkdownBlock): string {
  switch (block.type) {
    case "heading": {
      const size = block.level === 1 ? 14 : block.level === 2 ? 12 : 11;
      return `<div style="font-size:${size}px;font-weight:700;color:${D.text};margin:12px 0 6px">${esc(stripInlineMarkdown(block.text))}</div>`;
    }
    case "paragraph":
      return `<p style="font-size:10px;color:${D.sub};line-height:1.55;margin:0 0 8px">${esc(stripInlineMarkdown(block.text))}</p>`;
    case "ul":
      return `<ul style="margin:0 0 10px;padding-left:18px;font-size:10px;color:${D.sub};line-height:1.5">${block.items
        .map((i) => `<li style="margin-bottom:4px">${esc(stripInlineMarkdown(i))}</li>`)
        .join("")}</ul>`;
    case "ol":
      return `<ol style="margin:0 0 10px;padding-left:18px;font-size:10px;color:${D.sub};line-height:1.5">${block.items
        .map((i) => `<li style="margin-bottom:4px">${esc(stripInlineMarkdown(i))}</li>`)
        .join("")}</ol>`;
    case "table": {
      const headerCells = block.headers
        .map(
          (h) =>
            `<td style="padding:5px 6px;font-size:8px;font-weight:700;color:#FFF;background:${D.a1};border:1px solid ${D.border}">${esc(stripInlineMarkdown(h))}</td>`
        )
        .join("");
      const bodyRows = block.rows
        .map((row, ri) => {
          const bg = ri % 2 === 0 ? D.panel : D.bg;
          const cells = row
            .map(
              (c) =>
                `<td style="padding:4px 6px;font-size:8px;color:${D.text};background:${bg};border:1px solid ${D.border}">${esc(stripInlineMarkdown(c))}</td>`
            )
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table style="width:100%;border-collapse:collapse;margin:8px 0 12px"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }
    case "hr":
      return `<hr style="border:none;border-top:1px solid ${D.border};margin:12px 0" />`;
    default:
      return "";
  }
}

function buildChatPages(
  messages: MarketingPdfChatMessage[],
  company: string,
  docTitle: string,
  startPage: number,
  labels: ReturnType<typeof pdfLabels>
): string[] {
  const pages: string[] = [];
  const pairs: Array<{ user?: string; assistant: string }> = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === "user") {
      const next = messages[i + 1];
      if (next?.role === "assistant" && next.content.trim()) {
        pairs.push({ user: m.content.trim(), assistant: next.content.trim() });
        i += 1;
      }
    } else if (m.role === "assistant" && m.content.trim()) {
      pairs.push({ assistant: m.content.trim() });
    }
  }

  if (pairs.length === 0) return pages;

  let pageNum = startPage;

  for (const pair of pairs) {
    const blocks = parseMarketingChatMarkdown(pair.assistant);
    const blockHtml = blocks.map(renderMarkdownBlock).join("");
    const questionHtml = pair.user
      ? `<div style="background:${D.panel};border:1px solid ${D.border};padding:10px 12px;margin-bottom:12px;">
          <div style="font-size:9px;font-weight:700;color:${D.a1};margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">${esc(labels.userQuestion)}</div>
          <div style="font-size:10px;color:${D.text};line-height:1.5">${esc(pair.user.slice(0, 800))}</div>
        </div>`
      : "";

    const content = `
      ${sectionTitle(labels.aiConsultation)}
      ${questionHtml}
      <div style="background:${D.bg};border:1px solid ${D.border};padding:12px 14px;">
        <div style="font-size:9px;font-weight:700;color:${D.a2};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">${esc(labels.aiAnswer)}</div>
        ${blockHtml || `<div style="font-size:10px;color:${D.sub};line-height:1.55;white-space:pre-wrap">${esc(pair.assistant.slice(0, 4000))}</div>`}
      </div>`;

    pages.push(shell(content, company, docTitle, pageNum));
    pageNum += 1;
  }

  return pages;
}

function buildPages(
  report: MarketingDashboard,
  chatMessages: MarketingPdfChatMessage[],
  lang: UiLanguage
): string[] {
  const labels = pdfLabels(lang);
  const locale = localeFor(lang);
  const company = report.meta.companyName;
  const docTitle = `${labels.docTitle} · ${report.meta.period}`;
  const pages: string[] = [];
  let pageNum = 1;

  // Page 1 — KPI grid + channel spend/revenue chart
  {
    const kpis = report.kpis.slice(0, 6);
    const contentH = PH - 86;
    const gridW = Math.round((PW - 76) * 0.52);
    const chartW = PW - 76 - gridW - 12;
    const cardH = Math.floor((contentH - 12) / 2);
    const row1 = kpis
      .slice(0, 3)
      .map((k) =>
        kpiCard(
          localizeMarketingKpiLabel(k.label, lang),
          k.value,
          k.change,
          k.trend
        )
      )
      .join("<div style='width:10px;flex-shrink:0'></div>");
    const row2 = kpis
      .slice(3, 6)
      .map((k) =>
        kpiCard(
          localizeMarketingKpiLabel(k.label, lang),
          k.value,
          k.change,
          k.trend
        )
      )
      .join("<div style='width:10px;flex-shrink:0'></div>");

    const withData = report.channels.filter((c) => c.spend != null || c.revenue != null);
    let chartHtml = "";
    if (withData.length > 0 && chartW > 80) {
      chartHtml = barChart(
        labels.spendVsRevenue,
        withData.map((c) => c.name),
        withData.map((c) => Math.max(c.revenue ?? 0, c.spend ?? 0)),
        chartW,
        contentH
      );
    }

    const content = `
      ${sectionTitle(labels.keyMetrics)}
      <div style="display:flex;gap:12px;width:100%;height:calc(100% - 28px);">
        <div style="width:${gridW}px;display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;gap:10px;height:${cardH}px;">${row1}</div>
          <div style="display:flex;gap:10px;height:${cardH}px;">${row2}</div>
        </div>
        ${chartHtml ? `<div style="flex:1;">${chartHtml}</div>` : ""}
      </div>`;
    pages.push(shell(content, company, docTitle, pageNum++));
  }

  // Page 2 — Channels table
  {
    const content = channelsTable(report.channels, labels, locale);
    pages.push(shell(content, company, docTitle, pageNum++));
  }

  // Page 3 — Summary + recommendations + findings
  {
    const content = `
      <div style="display:flex;flex-direction:column;gap:14px;height:100%;">
        ${summaryBlock(labels.execSummary, report.summary.executive.slice(0, 900))}
        <div style="display:flex;gap:20px;flex:1;min-height:0;">
          ${bulletList(labels.recommendations, report.summary.recommendations, D.a1)}
          ${bulletList(labels.topFindings, report.summary.topFindings, D.a2)}
        </div>
      </div>`;
    pages.push(shell(content, company, docTitle, pageNum++));
  }

  // Page 4 — Report charts (2×2 grid)
  if (report.charts.length > 0) {
    const chartsToShow = report.charts.slice(0, 4);
    const contentH = PH - 86;
    const cellW = Math.floor((PW - 76 - 10) / 2);
    const cellH = Math.floor((contentH - 36) / 2);
    const cells = chartsToShow.map((chart) => {
      const labelsArr = chart.data.map((d) => String(d.name ?? ""));
      const values = chart.data.map((d) =>
        typeof d.value === "number" ? d.value : 0
      );
      return barChart(chart.title, labelsArr, values, cellW, cellH);
    });
    const row1 = cells.slice(0, 2).join("<div style='width:10px'></div>");
    const row2 = cells.slice(2, 4).join("<div style='width:10px'></div>");
    const content = `
      ${sectionTitle(labels.charts)}
      <div style="display:flex;flex-direction:column;gap:10px;height:calc(100% - 28px);">
        <div style="display:flex;">${row1}</div>
        ${cells.length > 2 ? `<div style="display:flex;">${row2}</div>` : ""}
      </div>`;
    pages.push(shell(content, company, docTitle, pageNum++));
  }

  // Narrative page
  if (report.narrative?.trim()) {
    const content = summaryBlock(labels.narrative, report.narrative.slice(0, 1200));
    pages.push(shell(content, company, docTitle, pageNum++));
  }

  // Disclaimer footer page
  {
    const date = new Date(report.meta.analyzedAt).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const content = `
      <div style="display:flex;flex-direction:column;gap:16px;justify-content:center;height:100%;text-align:center;">
        <div style="font-size:12px;color:${D.sub};line-height:1.6">${esc(labels.disclaimer)}</div>
        <div style="font-size:10px;color:${D.mute}">${esc(labels.dataSource)}: ${esc(report.meta.dataSource)}</div>
        <div style="font-size:10px;color:${D.mute}">${esc(date)}</div>
      </div>`;
    pages.push(shell(content, company, docTitle, pageNum++));
  }

  pages.push(...buildChatPages(chatMessages, company, docTitle, pageNum, labels));

  return pages;
}

export async function downloadMarketingPdf(
  report: MarketingDashboard,
  chatMessages: MarketingPdfChatMessage[],
  lang: UiLanguage,
  filename: string
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
    const htmlPages = buildPages(report, chatMessages, lang);
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
