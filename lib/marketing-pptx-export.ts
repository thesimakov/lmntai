import PptxGenJS from "pptxgenjs";
import type { MarketingDashboard, MarketingChannel, MarketingKpi } from "./marketing-schema";
import type { UiLanguage } from "./i18n";

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

const CHART_COLORS = ["2563EB", "0EA5E9", "10B981", "F59E0B", "EF4444", "8B5CF6"];

// ── Frame ─────────────────────────────────────────────────────────────────────
function addFrame(
  s: PptxGenJS.Slide, pptx: PptxGenJS,
  docName: string, page: number, website: string,
) {
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: 0.13, w: 1.55, h: 0.38,
    fill: { color: T.card }, line: { color: T.border, width: 0.75 },
  });
  s.addText("LOGO", {
    x: MX, y: 0.13, w: 1.55, h: 0.38,
    fontSize: 8.5, color: T.mute, align: "center", valign: "middle",
    bold: true, charSpacing: 2,
  });
  s.addText(website, {
    x: SW - MX - 3.0, y: 0.19, w: 3.0, h: 0.28,
    fontSize: 8.5, color: T.sub, align: "right",
  });
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: HY, w: CW, h: 0.012,
    fill: { color: T.border }, line: { color: T.border, width: 0 },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: FY, w: CW, h: 0.012,
    fill: { color: T.border }, line: { color: T.border, width: 0 },
  });
  s.addText(docName, {
    x: MX, y: FY + 0.09, w: 8.0, h: 0.28,
    fontSize: 7.5, color: T.mute,
  });
  s.addText(String(page), {
    x: SW - MX - 0.7, y: FY + 0.09, w: 0.7, h: 0.28,
    fontSize: 7.5, color: T.mute, align: "right",
  });
}

// ── Content slide factory ─────────────────────────────────────────────────────
function addSlide(pptx: PptxGenJS, title: string, docName: string, page: number, website: string) {
  const s = pptx.addSlide();
  s.background = { color: T.bg };
  addFrame(s, pptx, docName, page, website);
  s.addText(title, {
    x: MX, y: CY, w: CW, h: 0.44,
    fontSize: 18, bold: true, color: T.text,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: MX, y: CY + 0.44, w: 0.38, h: 0.035,
    fill: { color: T.accent }, line: { color: T.accent, width: 0 },
  });
  return s;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function addKpiCard(
  s: PptxGenJS.Slide, pptx: PptxGenJS,
  kpi: MarketingKpi, x: number, y: number, w: number, h: number,
) {
  s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: T.card }, line: { color: T.border, width: 0.75 } });
  s.addShape(pptx.ShapeType.rect, { x: x + 0.02, y, w: w - 0.04, h: 0.045, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
  s.addText(kpi.value, {
    x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h * 0.45,
    fontSize: 21, bold: true, color: T.accent, align: "center", valign: "middle",
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

function deckTexts(lang: UiLanguage) {
  if (lang === "en") return {
    title: "Marketing Performance Report",
    generated: "Generated",
    executiveSummary: "Executive Summary",
    keyMetrics: "Key Metrics",
    channelsOverview: "Channels Overview",
    channelComparison: "Channel Comparison",
    recommendations: "Recommendations",
    disclaimer: "Disclaimer",
    aiGenerated: "AI-generated marketing analysis",
    dataSource: "Data source",
    channel: "Channel",
    spend: "Spend",
    revenue: "Revenue",
    topKpi: "Top KPI",
    trend: "Trend",
  } as const;

  if (lang === "tg") return {
    title: "Ҳисоботи самаранокии маркетинг",
    generated: "Таҳияшуда",
    executiveSummary: "Хулосаи иҷроия",
    keyMetrics: "Метрикаҳои асосӣ",
    channelsOverview: "Шарҳи каналҳо",
    channelComparison: "Муқоисаи каналҳо",
    recommendations: "Тавсияҳо",
    disclaimer: "Огоҳӣ",
    aiGenerated: "Таҳлили маркетинг аз ҷониби AI",
    dataSource: "Манбаи маълумот",
    channel: "Канал",
    spend: "Хароҷот",
    revenue: "Даромад",
    topKpi: "KPI-и асосӣ",
    trend: "Тамоюл",
  } as const;

  return {
    title: "Отчёт по эффективности маркетинга",
    generated: "Сформировано",
    executiveSummary: "Краткое резюме",
    keyMetrics: "Ключевые метрики",
    channelsOverview: "Обзор каналов",
    channelComparison: "Сравнение каналов",
    recommendations: "Рекомендации",
    disclaimer: "Дисклеймер",
    aiGenerated: "AI-сгенерированный маркетинговый анализ",
    dataSource: "Источник данных",
    channel: "Канал",
    spend: "Расходы",
    revenue: "Выручка",
    topKpi: "Ключевой KPI",
    trend: "Тренд",
  } as const;
}

function pickTopChannel(channels: MarketingChannel[]): MarketingChannel {
  if (!channels.length) return { name: "—", kpis: [], trend: "neutral", narrative: "" };
  return [...channels].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0]!;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildMarketingPptx(report: MarketingDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const texts = deckTexts(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const r = report;
  const docName = `${texts.title} · ${r.meta.period}`;
  const website = r.meta.companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  const date = new Date(r.meta.analyzedAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });

  let page = 0;

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  {
    const s = pptx.addSlide();
    s.background = { color: T.bg };
    addFrame(s, pptx, docName, page, website);
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 3.58, w: SW, h: 0.06,
      fill: { color: T.accent }, line: { color: T.accent, width: 0 },
    });
    s.addText(r.meta.companyName, {
      x: MX, y: 1.7, w: CW, h: 1.6,
      fontSize: 46, bold: true, color: T.text, align: "center", valign: "bottom",
    });
    s.addText(texts.title, {
      x: MX, y: 3.76, w: CW, h: 0.62,
      fontSize: 19, color: T.accent, align: "center",
    });
    s.addText(`${r.meta.period}  ·  ${date}`, {
      x: MX, y: 4.46, w: CW, h: 0.42,
      fontSize: 12.5, color: T.sub, align: "center",
    });
  }

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.executiveSummary, docName, page, website);
    s.addText(r.summary.executive, {
      x: MX, y: CY + 0.56, w: CW, h: FY - CY - 0.72,
      fontSize: 13.5, color: T.sub, valign: "top", paraSpaceAfter: 4,
    });
  }

  // ── 3. Key Metrics (KPI grid) ─────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.keyMetrics, docName, page, website);
    const kpis = r.kpis.slice(0, 6);
    const cardW = (CW - 2 * 0.22) / 3;
    const cardH = 1.72;
    const gridY = CY + 0.58;
    kpis.forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      addKpiCard(s, pptx, kpi, MX + col * (cardW + 0.22), gridY + row * (cardH + 0.24), cardW, cardH);
    });
  }

  // ── 4. Channels Overview ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.channelsOverview, docName, page, website);
    const channels = r.channels.slice(0, 4);
    const colW = (CW - 0.3) / 2;
    const rowH = 2.0;
    const gridY = CY + 0.58;

    channels.forEach((ch, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MX + col * (colW + 0.3);
      const y = gridY + row * (rowH + 0.24);
      const trendColor = ch.trend === "up" ? T.green : ch.trend === "down" ? T.red : T.sub;

      s.addShape(pptx.ShapeType.rect, { x, y, w: colW, h: rowH, fill: { color: T.card }, line: { color: T.border, width: 0.75 } });
      s.addShape(pptx.ShapeType.rect, { x: x + 0.02, y, w: colW - 0.04, h: 0.045, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });

      const arrow = ch.trend === "up" ? " ▲" : ch.trend === "down" ? " ▼" : " →";
      s.addText(`${ch.name}${arrow}`, {
        x: x + 0.15, y: y + 0.12, w: colW - 0.3, h: 0.42,
        fontSize: 14, bold: true, color: trendColor,
      });

      const kpiText = ch.kpis.slice(0, 3).map((k) => `${k.label}: ${k.value}`).join("   ·   ");
      s.addText(kpiText, {
        x: x + 0.15, y: y + 0.6, w: colW - 0.3, h: 0.38,
        fontSize: 10.5, color: T.text,
      });

      if (ch.narrative) {
        s.addText(ch.narrative.slice(0, 120) + (ch.narrative.length > 120 ? "…" : ""), {
          x: x + 0.15, y: y + 1.06, w: colW - 0.3, h: 0.72,
          fontSize: 10, color: T.sub, valign: "top",
        });
      }
    });
  }

  // ── 5. Channel Comparison (table + bar chart) ─────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.channelComparison, docName, page, website);
    const tableY = CY + 0.58;

    // Table
    const tableW = CW * 0.52;
    const headers = [
      { text: texts.channel, options: { bold: true, color: T.accent, fill: { color: T.card } } },
      { text: texts.spend,   options: { bold: true, color: T.accent, fill: { color: T.card } } },
      { text: texts.revenue, options: { bold: true, color: T.accent, fill: { color: T.card } } },
      { text: texts.trend,   options: { bold: true, color: T.accent, fill: { color: T.card } } },
    ];
    const dataRows = r.channels.length > 0
      ? r.channels.map((ch, ri) => {
          const bg = ri % 2 === 0 ? T.bg : T.card;
          const trendStr = ch.trend === "up" ? "▲" : ch.trend === "down" ? "▼" : "→";
          const trendColor = ch.trend === "up" ? T.green : ch.trend === "down" ? T.red : T.sub;
          return [
            { text: ch.name, options: { color: T.text, fill: { color: bg } } },
            { text: ch.spend !== undefined ? `$${ch.spend.toLocaleString()}` : "—", options: { color: T.text, fill: { color: bg } } },
            { text: ch.revenue !== undefined ? `$${ch.revenue.toLocaleString()}` : "—", options: { color: T.green, fill: { color: bg } } },
            { text: trendStr, options: { color: trendColor, fill: { color: bg } } },
          ];
        })
      : [[
          { text: "—", options: { color: T.sub, fill: { color: T.bg } } },
          { text: "—", options: { color: T.sub, fill: { color: T.bg } } },
          { text: "—", options: { color: T.sub, fill: { color: T.bg } } },
          { text: "—", options: { color: T.sub, fill: { color: T.bg } } },
        ]];

    s.addTable([headers, ...dataRows], {
      x: MX, y: tableY, w: tableW,
      fontSize: 10.5,
      border: { color: T.border, pt: 0.5 },
      rowH: 0.34,
    });

    // Bar chart: spend vs revenue
    const channelsWithData = r.channels.filter((ch) => ch.spend !== undefined || ch.revenue !== undefined);
    if (channelsWithData.length > 0) {
      const cx = MX + tableW + 0.35;
      const cw = SW - cx - MX;
      const spendSeries = { name: texts.spend, labels: channelsWithData.map((c) => c.name), values: channelsWithData.map((c) => c.spend ?? 0) };
      const revSeries   = { name: texts.revenue, labels: channelsWithData.map((c) => c.name), values: channelsWithData.map((c) => c.revenue ?? 0) };
      s.addChart(pptx.ChartType.bar, [spendSeries, revSeries], {
        x: cx, y: tableY, w: cw, h: FY - tableY - 0.15,
        barDir: "col",
        barGrouping: "clustered",
        barGapWidthPct: 40,
        chartColors: [T.sky, T.green],
        catAxisLabelColor: T.sub,
        valAxisLabelColor: T.sub,
        catAxisLabelFontSize: 8,
        valAxisLabelFontSize: 8,
        showLegend: true,
        legendPos: "b",
        legendFontSize: 8,
        showTitle: false,
        showValue: false,
      } as PptxGenJS.IChartOpts);
    }
  }

  // ── 6. Recommendations ───────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.recommendations, docName, page, website);
    const contentY = CY + 0.58;
    const contentH = FY - contentY - 0.15;
    const leftW = CW * 0.5 - 0.2;

    const recs = r.summary.recommendations.map((rec) => ({
      text: `• ${rec}`, options: { color: T.text },
    }));
    s.addText(recs, {
      x: MX, y: contentY, w: leftW, h: contentH,
      fontSize: 12.5, paraSpaceAfter: 9, valign: "top",
    });

    if (r.summary.topFindings.length > 0) {
      s.addShape(pptx.ShapeType.rect, {
        x: MX + leftW + 0.18, y: contentY, w: 0.012, h: contentH,
        fill: { color: T.border }, line: { color: T.border, width: 0 },
      });
      const findings = r.summary.topFindings.map((f) => ({
        text: `• ${f}`, options: { color: T.sub },
      }));
      s.addText(findings, {
        x: MX + leftW + 0.4, y: contentY, w: CW * 0.5 - 0.2, h: contentH,
        fontSize: 12, paraSpaceAfter: 8, valign: "top",
      });
    }
  }

  // ── 7. Disclaimer ─────────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.disclaimer, docName, page, website);
    s.addText(texts.aiGenerated, {
      x: MX, y: CY + 0.58, w: CW, h: 0.42,
      fontSize: 13.5, color: T.sub, align: "center",
    });
    s.addText(`${texts.dataSource}: ${r.meta.dataSource}`, {
      x: MX, y: CY + 1.15, w: CW, h: 0.38,
      fontSize: 11.5, color: T.mute, align: "center",
    });
    s.addText(`${texts.generated} ${new Date(r.meta.analyzedAt).toLocaleDateString()}`, {
      x: MX, y: CY + 1.65, w: CW, h: 0.35,
      fontSize: 10.5, color: T.mute, align: "center",
    });
  }

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
