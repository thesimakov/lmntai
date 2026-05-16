import PptxGenJS from "pptxgenjs";
import type { MarketingDashboard, MarketingChannel, MarketingKpi } from "./marketing-schema";
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
    title:            "Marketing Performance Report",
    generated:        "Generated",
    execSummary:      "Executive Summary",
    keyMetrics:       "Key Metrics",
    channelsOverview: "Channels Overview",
    channelComparison:"Channel Comparison",
    recommendations:  "Recommendations",
    topFindings:      "Top Findings",
    disclaimer:       "Disclaimer",
    aiGenerated:      "AI-generated marketing analysis. For informational purposes only.",
    dataSource:       "Data source",
    channel:          "Channel",
    spend:            "Spend",
    revenue:          "Revenue",
    trend:            "Trend",
  } as const;
  if (lang === "tg") return {
    title:            "Ҳисоботи самаранокии маркетинг",
    generated:        "Таҳияшуда",
    execSummary:      "Хулосаи иҷроия",
    keyMetrics:       "Метрикаҳои асосӣ",
    channelsOverview: "Шарҳи каналҳо",
    channelComparison:"Муқоисаи каналҳо",
    recommendations:  "Тавсияҳо",
    topFindings:      "Бозёфтҳои асосӣ",
    disclaimer:       "Огоҳӣ",
    aiGenerated:      "Таҳлили маркетинг аз ҷониби AI. Танҳо барои иттилоот.",
    dataSource:       "Манбаи маълумот",
    channel:          "Канал",
    spend:            "Хароҷот",
    revenue:          "Даромад",
    trend:            "Тамоюл",
  } as const;
  return {
    title:            "Отчёт по эффективности маркетинга",
    generated:        "Сформировано",
    execSummary:      "Краткое резюме",
    keyMetrics:       "Ключевые метрики",
    channelsOverview: "Обзор каналов",
    channelComparison:"Сравнение каналов",
    recommendations:  "Рекомендации",
    topFindings:      "Ключевые выводы",
    disclaimer:       "Дисклеймер",
    aiGenerated:      "AI-сгенерированный маркетинговый анализ. Только для ознакомления.",
    dataSource:       "Источник данных",
    channel:          "Канал",
    spend:            "Расходы",
    revenue:          "Выручка",
    trend:            "Тренд",
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

// ── KPI card ──────────────────────────────────────────────────────────────────
function addKpiCard(s: PptxGenJS.Slide, pptx: PptxGenJS, kpi: MarketingKpi, x: number, y: number, w: number, h: number) {
  s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
  s.addShape(pptx.ShapeType.ellipse, { x: x + 0.12, y: y + 0.12, w: 0.2, h: 0.2, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
  s.addText(kpi.value, { x, y: y + 0.08, w, h: h * 0.48, fontSize: 21, bold: true, color: T.a1, align: "center", valign: "middle" });
  s.addText(kpi.label, { x: x + 0.08, y: y + h * 0.55, w: w - 0.16, h: h * 0.26, fontSize: 9.5, color: T.text, align: "center" });
  if (kpi.change) {
    const cc = kpi.trend === "up" ? T.green : kpi.trend === "down" ? T.red : T.sub;
    const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
    s.addText(`${kpi.change}${arrow}`, { x, y: y + h * 0.82, w, h: h * 0.16, fontSize: 9, color: cc, align: "center" });
  }
}

// ── Step circle ───────────────────────────────────────────────────────────────
function addStepCircle(s: PptxGenJS.Slide, pptx: PptxGenJS, n: number, x: number, y: number, color: string) {
  s.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.42, h: 0.42, fill: { color }, line: { color, width: 0 } });
  s.addText(String(n), { x, y, w: 0.42, h: 0.42, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildMarketingPptx(report: MarketingDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const texts = i18n(lang);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const r = report;
  const docName = `${texts.title} · ${r.meta.period}`;
  const website = r.meta.companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const date = new Date(r.meta.analyzedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

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
    s.addShape(pptx.ShapeType.rect, { x: MX + 0.2, y: CY + 0.06, w: CW * 0.22, h: 0.055, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
    s.addText(r.meta.companyName, { x: MX + 0.2, y: 1.6, w: CW - 0.2, h: 1.8, fontSize: 52, bold: true, color: T.text, valign: "bottom" });
    s.addShape(pptx.ShapeType.rect, { x: MX + 0.2, y: 3.55, w: CW - 0.2, h: 0.055, fill: { color: T.a2 }, line: { color: T.a2, width: 0 } });
    s.addText(texts.title, { x: MX + 0.2, y: 3.72, w: CW - 0.2, h: 0.6, fontSize: 20, color: T.a1 });
    s.addText(`${r.meta.period}  ·  ${date}`, { x: MX + 0.2, y: 4.42, w: CW - 0.2, h: 0.42, fontSize: 12, color: T.sub });
  }

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.execSummary, docName, page, website);
    s.addText(r.summary.executive, {
      x: MX, y: CY + 0.58, w: CW, h: FY - CY - 0.74,
      fontSize: 13, color: T.sub, valign: "top", paraSpaceAfter: 5,
    });
  }

  // ── 3. Key Metrics ────────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.keyMetrics, docName, page, website);
    const kpis = r.kpis.slice(0, 6);
    const cardW = (CW - 2 * 0.22) / 3;
    const cardH = 1.72;
    const gridY = CY + 0.60;
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
    const gridY = CY + 0.60;

    channels.forEach((ch, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MX + col * (colW + 0.3);
      const y = gridY + row * (rowH + 0.24);
      const trendColor = ch.trend === "up" ? T.green : ch.trend === "down" ? T.red : T.sub;

      s.addShape(pptx.ShapeType.rect, { x, y, w: colW, h: rowH, fill: { color: T.panel }, line: { color: T.border, width: 0.75 } });
      // Side accent bar
      s.addShape(pptx.ShapeType.rect, { x, y: y + 0.02, w: 0.05, h: rowH - 0.04, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });

      const arrow = ch.trend === "up" ? " ▲" : ch.trend === "down" ? " ▼" : " →";
      s.addText(`${ch.name}${arrow}`, { x: x + 0.15, y: y + 0.10, w: colW - 0.25, h: 0.42, fontSize: 13, bold: true, color: trendColor });

      const kpiText = ch.kpis.slice(0, 3).map((k) => `${k.label}: ${k.value}`).join("   ·   ");
      s.addText(kpiText, { x: x + 0.15, y: y + 0.58, w: colW - 0.25, h: 0.38, fontSize: 10, color: T.text });

      if (ch.narrative) {
        s.addText(ch.narrative.slice(0, 120) + (ch.narrative.length > 120 ? "…" : ""), {
          x: x + 0.15, y: y + 1.04, w: colW - 0.25, h: 0.76, fontSize: 9.5, color: T.sub, valign: "top",
        });
      }
    });
  }

  // ── 5. Channel Comparison (table + chart) ────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.channelComparison, docName, page, website);
    const tableY = CY + 0.60;
    const tableW = CW * 0.52;

    const headers = [
      { text: texts.channel, options: { bold: true, color: T.panel, fill: { color: T.a1 } } },
      { text: texts.spend,   options: { bold: true, color: T.panel, fill: { color: T.a1 } } },
      { text: texts.revenue, options: { bold: true, color: T.panel, fill: { color: T.a1 } } },
      { text: texts.trend,   options: { bold: true, color: T.panel, fill: { color: T.a1 } } },
    ];
    const dataRows = r.channels.length > 0
      ? r.channels.map((ch, ri) => {
          const bg = ri % 2 === 0 ? T.panel : T.bg;
          const trendStr = ch.trend === "up" ? "▲" : ch.trend === "down" ? "▼" : "→";
          const trendColor = ch.trend === "up" ? T.green : ch.trend === "down" ? T.red : T.sub;
          return [
            { text: ch.name, options: { color: T.text, fill: { color: bg } } },
            { text: ch.spend !== undefined ? `$${ch.spend.toLocaleString()}` : "—", options: { color: T.text, fill: { color: bg } } },
            { text: ch.revenue !== undefined ? `$${ch.revenue.toLocaleString()}` : "—", options: { color: T.green, fill: { color: bg } } },
            { text: trendStr, options: { color: trendColor, fill: { color: bg } } },
          ];
        })
      : [[{ text: "—", options: { color: T.sub, fill: { color: T.panel } } }, { text: "—", options: { color: T.sub, fill: { color: T.panel } } }, { text: "—", options: { color: T.sub, fill: { color: T.panel } } }, { text: "—", options: { color: T.sub, fill: { color: T.panel } } }]];

    s.addTable([headers, ...dataRows], { x: MX, y: tableY, w: tableW, fontSize: 10, border: { color: T.border, pt: 0.5 }, rowH: 0.34 });

    const channelsWithData = r.channels.filter((ch) => ch.spend !== undefined || ch.revenue !== undefined);
    if (channelsWithData.length > 0) {
      const cx = MX + tableW + 0.35;
      const cw = SW - cx - MX;
      const spendSeries = { name: texts.spend, labels: channelsWithData.map((c) => c.name), values: channelsWithData.map((c) => c.spend ?? 0) };
      const revSeries   = { name: texts.revenue, labels: channelsWithData.map((c) => c.name), values: channelsWithData.map((c) => c.revenue ?? 0) };
      s.addChart(pptx.ChartType.bar, [spendSeries, revSeries], {
        x: cx, y: tableY, w: cw, h: FY - tableY - 0.15,
        barDir: "col", barGrouping: "clustered", barGapWidthPct: 40,
        chartColors: [T.a1, T.green],
        catAxisLabelColor: T.sub, valAxisLabelColor: T.sub,
        catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
        showLegend: true, legendPos: "b", legendFontSize: 8,
        showTitle: false, showValue: false,
      } as PptxGenJS.IChartOpts);
    }
  }

  // ── 6. Recommendations ───────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.recommendations, docName, page, website);
    const contentY = CY + 0.60;
    const leftW = CW * 0.5 - 0.15;

    r.summary.recommendations.slice(0, 6).forEach((rec, i) => {
      const y = contentY + i * 0.58;
      if (y + 0.48 > FY) return;
      addStepCircle(s, pptx, i + 1, MX, y + 0.05, T.a2);
      s.addText(rec, { x: MX + 0.54, y, w: leftW - 0.54, h: 0.50, fontSize: 11.5, color: T.text, valign: "middle" });
    });

    if (r.summary.topFindings.length > 0) {
      const rx = MX + leftW + 0.3;
      const rw = CW - leftW - 0.3;
      s.addShape(pptx.ShapeType.rect, { x: MX + leftW + 0.16, y: contentY, w: 0.01, h: FY - contentY - 0.15, fill: { color: T.border }, line: { color: T.border, width: 0 } });
      s.addText(texts.topFindings, { x: rx, y: contentY, w: rw, h: 0.34, fontSize: 11, bold: true, color: T.a1 });
      r.summary.topFindings.slice(0, 6).forEach((f, i) => {
        const y = contentY + 0.40 + i * 0.52;
        if (y + 0.44 > FY) return;
        s.addShape(pptx.ShapeType.rect, { x: rx, y: y + 0.14, w: 0.18, h: 0.035, fill: { color: T.a1 }, line: { color: T.a1, width: 0 } });
        s.addText(f, { x: rx + 0.26, y, w: rw - 0.26, h: 0.44, fontSize: 11.5, color: T.text, valign: "middle" });
      });
    }
  }

  // ── 7. Disclaimer ─────────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(pptx, texts.disclaimer, docName, page, website);
    s.addText(texts.aiGenerated, { x: MX, y: CY + 0.58, w: CW, h: 0.5, fontSize: 13, color: T.sub, align: "center" });
    s.addText(`${texts.dataSource}: ${r.meta.dataSource}`, { x: MX, y: CY + 1.2, w: CW, h: 0.38, fontSize: 11, color: T.mute, align: "center" });
    s.addText(`${texts.generated} ${new Date(r.meta.analyzedAt).toLocaleDateString(locale)}`, { x: MX, y: CY + 1.68, w: CW, h: 0.34, fontSize: 10, color: T.mute, align: "center" });
  }

  const output = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
