import PptxGenJS from "pptxgenjs";
import type { MarketingDashboard, MarketingChannel, MarketingKpi } from "./marketing-schema";
import type { UiLanguage } from "./i18n";

// ── Corporate Clean Design System ─────────────────────────────────────────────
const T = {
  bg:     "FFFFFF",
  navy:   "0F1C35",
  blue:   "1D4ED8",
  panel:  "F8FAFC",
  border: "D1D5DB",
  text:   "0F1C35",
  sub:    "374151",
  mute:   "6B7280",
  green:  "059669",
  red:    "DC2626",
  amber:  "D97706",
};

const SW    = 13.33;
const MX    = 0.48;
const HY    = 0.56;
const FY    = 6.84;
const CY    = HY + 0.10;
const CW    = SW - MX * 2;
const SPLIT = 7.8;

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

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildMarketingPptx(report: MarketingDashboard, lang: UiLanguage = "ru"): Promise<Buffer> {
  const texts = i18n(lang);
  const instance = new PptxGenJS();
  instance.layout = "LAYOUT_WIDE";

  const r       = report;
  const docName = `${texts.title} · ${r.meta.period}`;
  const website = r.meta.companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  const locale  = lang === "en" ? "en-US" : "ru-RU";
  const date    = new Date(r.meta.analyzedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  let page = 0;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const frame = (s: PptxGenJS.Slide, dn: string, pg: number, web: string) => {
    s.addShape(instance.ShapeType.rect, { x: MX, y: 0.12, w: 1.6, h: 0.36, fill: { color: T.panel }, line: { color: T.border, width: 0.5 } });
    s.addText("LOGO", { x: MX, y: 0.12, w: 1.6, h: 0.36, fontSize: 8, color: T.navy, fontFace: "Calibri", align: "center", valign: "middle", bold: true, charSpacing: 2 });
    s.addText(web, { x: SW - MX - 3.0, y: 0.16, w: 2.6, h: 0.28, fontSize: 8.5, color: T.mute, fontFace: "Calibri", align: "right" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: HY, w: CW, h: 0.012, fill: { color: T.border }, line: { type: "none" } });
    s.addShape(instance.ShapeType.rect, { x: MX, y: FY, w: CW, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(dn, { x: MX, y: FY + 0.08, w: 8.0, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri" });
    s.addText(String(pg), { x: SW - MX - 0.7, y: FY + 0.08, w: 0.7, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri", align: "right" });
  };

  const addSlide = (title: string, dn: string, pg: number, web: string) => {
    const s = instance.addSlide();
    s.background = { color: T.bg };
    frame(s, dn, pg, web);
    s.addShape(instance.ShapeType.rect, { x: MX, y: CY + 0.07, w: 0.10, h: 0.28, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(title, { x: MX + 0.18, y: CY, w: CW - 1.8, h: 0.44, fontSize: 20, bold: true, fontFace: "Calibri", color: T.navy });
    return s;
  };

  const addKpiCard = (s: PptxGenJS.Slide, kpi: MarketingKpi, x: number, y: number, w: number, h: number) => {
    s.addShape(instance.ShapeType.rect, { x, y, w, h, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
    s.addShape(instance.ShapeType.rect, { x, y, w: 0.06, h, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(kpi.value, { x: x + 0.08, y: y + 0.08, w: w - 0.16, h: h * 0.52, fontSize: 26, bold: true, color: T.navy, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText(kpi.label, { x: x + 0.10, y: y + h * 0.62, w: w - 0.20, h: h * 0.24, fontSize: 9.5, color: T.mute, align: "center", fontFace: "Calibri" });
    if (kpi.change) {
      const cc = kpi.trend === "up" ? T.green : kpi.trend === "down" ? T.red : T.mute;
      const arrow = kpi.trend === "up" ? " ▲" : kpi.trend === "down" ? " ▼" : "";
      s.addText(`${kpi.change}${arrow}`, { x, y: y + h * 0.86, w, h: h * 0.13, fontSize: 9, color: cc, align: "center", fontFace: "Calibri" });
    }
  };

  const stepBox = (s: PptxGenJS.Slide, n: number, x: number, y: number, color: string) => {
    s.addShape(instance.ShapeType.rect, { x, y, w: 0.36, h: 0.36, fill: { color }, line: { type: "none" }, rectRadius: 0.04 });
    s.addText(String(n).padStart(2, "0"), { x, y, w: 0.36, h: 0.36, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Calibri" });
  };

  // ── 1. Cover ──────────────────────────────────────────────────────────────
  page++;
  {
    const s = instance.addSlide();
    s.background = { color: T.bg };

    // Right dark navy panel
    s.addShape(instance.ShapeType.rect, { x: SPLIT, y: 0, w: SW - SPLIT, h: 7.5, fill: { color: T.navy }, line: { type: "none" } });
    // Horizontal accent lines on right panel
    [1.5, 2.5, 3.5, 4.5, 5.5].forEach((y) => {
      s.addShape(instance.ShapeType.rect, { x: SPLIT + 0.36, y, w: SW - SPLIT - 0.72, h: 0.010, fill: { color: "FFFFFF", transparency: 78 }, line: { type: "none" } });
    });
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.8, y: 3.8, w: 4.4, h: 4.4, fill: { color: "FFFFFF", transparency: 94 }, line: { type: "none" } });
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.38, y: 6.42, w: 0.14, h: 0.14, fill: { color: "FFFFFF", transparency: 60 }, line: { type: "none" } });
    s.addShape(instance.ShapeType.ellipse, { x: SPLIT + 0.60, y: 6.44, w: 0.10, h: 0.10, fill: { color: "FFFFFF", transparency: 70 }, line: { type: "none" } });

    // Logo on right panel
    s.addShape(instance.ShapeType.rect, { x: SPLIT + 0.36, y: 0.22, w: 1.9, h: 0.48, fill: { color: "FFFFFF", transparency: 88 }, line: { color: "FFFFFF", width: 0.75, transparency: 60 } });
    s.addText("LOGO", { x: SPLIT + 0.36, y: 0.22, w: 1.9, h: 0.48, fontSize: 9, color: "FFFFFF", fontFace: "Calibri", align: "center", valign: "middle", bold: true, charSpacing: 2 });
    s.addText(website, { x: SPLIT + 0.36, y: 6.58, w: SW - SPLIT - 0.72, h: 0.26, fontSize: 7.5, color: "FFFFFF", fontFace: "Calibri", transparency: 40 });

    // Left text
    s.addText(r.meta.companyName, { x: MX, y: 1.8, w: SPLIT - MX * 2, h: 1.1, fontSize: 38, bold: true, fontFace: "Calibri", color: T.navy, valign: "middle" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.02, w: 2.8, h: 0.048, fill: { color: T.blue }, line: { type: "none" } });
    s.addText(texts.title.toUpperCase(), { x: MX, y: 3.16, w: SPLIT - MX * 2, h: 0.46, fontSize: 11, color: T.blue, fontFace: "Calibri", charSpacing: 3.5 });
    s.addShape(instance.ShapeType.rect, { x: MX, y: 3.74, w: SPLIT - MX * 2 - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(`${r.meta.period}  ·  ${date}`, { x: MX, y: 3.90, w: SPLIT - MX * 2, h: 0.38, fontSize: 11, color: T.mute, fontFace: "Calibri" });
    s.addShape(instance.ShapeType.rect, { x: MX, y: FY, w: SPLIT - MX - 0.2, h: 0.010, fill: { color: T.border }, line: { type: "none" } });
    s.addText(docName, { x: MX, y: FY + 0.08, w: SPLIT - MX - 0.2, h: 0.26, fontSize: 7.5, color: T.mute, fontFace: "Calibri" });
  }

  // ── 2. Executive Summary ──────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(texts.execSummary, docName, page, website);
    s.addText(r.summary.executive, { x: MX, y: CY + 0.56, w: CW, h: FY - CY - 0.72, fontSize: 13, color: T.sub, valign: "top", paraSpaceAfter: 5, fontFace: "Calibri" });
  }

  // ── 3. Key Metrics ────────────────────────────────────────────────────────
  page++;
  {
    const s    = addSlide(texts.keyMetrics, docName, page, website);
    const kpis = r.kpis.slice(0, 6);
    const cardW = (CW - 2 * 0.22) / 3;
    const cardH = 1.70;
    const gridY = CY + 0.58;
    kpis.forEach((kpi, i) => {
      addKpiCard(s, kpi, MX + (i % 3) * (cardW + 0.22), gridY + Math.floor(i / 3) * (cardH + 0.22), cardW, cardH);
    });
  }

  // ── 4. Channels Overview ──────────────────────────────────────────────────
  page++;
  {
    const s        = addSlide(texts.channelsOverview, docName, page, website);
    const channels = r.channels.slice(0, 4);
    const colW     = (CW - 0.30) / 2;
    const rowH     = 2.0;
    const gridY    = CY + 0.58;

    channels.forEach((ch: MarketingChannel, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x   = MX + col * (colW + 0.30);
      const y   = gridY + row * (rowH + 0.22);
      const trendColor = ch.trend === "up" ? T.green : ch.trend === "down" ? T.red : T.mute;

      s.addShape(instance.ShapeType.rect, { x, y, w: colW, h: rowH, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
      s.addShape(instance.ShapeType.rect, { x, y, w: 0.06, h: rowH, fill: { color: T.blue }, line: { type: "none" } });

      const arrow = ch.trend === "up" ? " ▲" : ch.trend === "down" ? " ▼" : " →";
      s.addText(`${ch.name}${arrow}`, { x: x + 0.14, y: y + 0.10, w: colW - 0.24, h: 0.42, fontSize: 13, bold: true, color: trendColor, fontFace: "Calibri" });

      const kpiText = ch.kpis.slice(0, 3).map((k) => `${k.label}: ${k.value}`).join("   ·   ");
      s.addText(kpiText, { x: x + 0.14, y: y + 0.58, w: colW - 0.24, h: 0.38, fontSize: 10, color: T.sub, fontFace: "Calibri" });

      if (ch.narrative) {
        s.addText(ch.narrative.slice(0, 120) + (ch.narrative.length > 120 ? "…" : ""), {
          x: x + 0.14, y: y + 1.04, w: colW - 0.24, h: 0.76, fontSize: 9.5, color: T.mute, valign: "top", fontFace: "Calibri",
        });
      }
    });
  }

  // ── 5. Channel Comparison (table + chart) ────────────────────────────────
  page++;
  {
    const s      = addSlide(texts.channelComparison, docName, page, website);
    const tableY = CY + 0.58;
    const tableW = CW * 0.52;

    const headers = [
      { text: texts.channel, options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } },
      { text: texts.spend,   options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } },
      { text: texts.revenue, options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } },
      { text: texts.trend,   options: { bold: true, color: "FFFFFF", fill: { color: T.navy } } },
    ];
    const dataRows = r.channels.length > 0
      ? r.channels.map((ch: MarketingChannel, ri) => {
          const bg        = ri % 2 === 0 ? T.panel : T.bg;
          const trendStr  = ch.trend === "up" ? "▲" : ch.trend === "down" ? "▼" : "→";
          const trendColor = ch.trend === "up" ? T.green : ch.trend === "down" ? T.red : T.mute;
          return [
            { text: ch.name, options: { color: T.sub, fill: { color: bg } } },
            { text: ch.spend   !== undefined ? `$${ch.spend.toLocaleString()}`   : "—", options: { color: T.sub,   fill: { color: bg } } },
            { text: ch.revenue !== undefined ? `$${ch.revenue.toLocaleString()}` : "—", options: { color: T.green, fill: { color: bg } } },
            { text: trendStr,  options: { color: trendColor, fill: { color: bg } } },
          ];
        })
      : [[
          { text: "—", options: { color: T.mute, fill: { color: T.panel } } },
          { text: "—", options: { color: T.mute, fill: { color: T.panel } } },
          { text: "—", options: { color: T.mute, fill: { color: T.panel } } },
          { text: "—", options: { color: T.mute, fill: { color: T.panel } } },
        ]];

    s.addTable([headers, ...dataRows], { x: MX, y: tableY, w: tableW, fontSize: 10, border: { color: T.border, pt: 0.5 }, rowH: 0.34 });

    const withData = r.channels.filter((ch: MarketingChannel) => ch.spend !== undefined || ch.revenue !== undefined);
    if (withData.length > 0) {
      const cx = MX + tableW + 0.35;
      const cw = SW - cx - MX;
      s.addChart(instance.ChartType.bar, [
        { name: texts.spend,   labels: withData.map((c: MarketingChannel) => c.name), values: withData.map((c: MarketingChannel) => c.spend   ?? 0) },
        { name: texts.revenue, labels: withData.map((c: MarketingChannel) => c.name), values: withData.map((c: MarketingChannel) => c.revenue ?? 0) },
      ], {
        x: cx, y: tableY, w: cw, h: FY - tableY - 0.15,
        barDir: "col", barGrouping: "clustered", barGapWidthPct: 40,
        chartColors: ["1D4ED8", "0F1C35"],
        catAxisLabelColor: T.mute, valAxisLabelColor: T.mute,
        catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
        showLegend: true, legendPos: "b", legendFontSize: 8,
        showTitle: false, showValue: false,
      } as PptxGenJS.IChartOpts);
    }
  }

  // ── 6. Recommendations ───────────────────────────────────────────────────
  page++;
  {
    const s        = addSlide(texts.recommendations, docName, page, website);
    const contentY = CY + 0.58;
    const leftW    = CW * 0.5 - 0.15;

    r.summary.recommendations.slice(0, 6).forEach((rec, i) => {
      const y = contentY + i * 0.58;
      if (y + 0.48 > FY) return;
      stepBox(s, i + 1, MX, y + 0.05, T.navy);
      s.addText(rec, { x: MX + 0.48, y, w: leftW - 0.52, h: 0.50, fontSize: 11.5, color: T.sub, valign: "middle", fontFace: "Calibri" });
    });

    if (r.summary.topFindings.length > 0) {
      const rx = MX + leftW + 0.30;
      const rw = CW - leftW - 0.30;
      s.addShape(instance.ShapeType.rect, { x: MX + leftW + 0.16, y: contentY, w: 0.012, h: FY - contentY - 0.15, fill: { color: T.border }, line: { type: "none" } });
      s.addText(texts.topFindings, { x: rx, y: contentY, w: rw, h: 0.34, fontSize: 11, bold: true, color: T.navy, fontFace: "Calibri" });
      r.summary.topFindings.slice(0, 6).forEach((f, i) => {
        const y = contentY + 0.40 + i * 0.52;
        if (y + 0.44 > FY) return;
        s.addShape(instance.ShapeType.rect, { x: rx, y: y + 0.14, w: 0.18, h: 0.036, fill: { color: T.blue }, line: { type: "none" } });
        s.addText(f, { x: rx + 0.26, y, w: rw - 0.26, h: 0.44, fontSize: 11.5, color: T.sub, valign: "middle", fontFace: "Calibri" });
      });
    }
  }

  // ── 7. Disclaimer ─────────────────────────────────────────────────────────
  page++;
  {
    const s = addSlide(texts.disclaimer, docName, page, website);
    s.addText(texts.aiGenerated, { x: MX, y: CY + 0.58, w: CW, h: 0.5, fontSize: 13, color: T.sub, align: "center", fontFace: "Calibri" });
    s.addText(`${texts.dataSource}: ${r.meta.dataSource}`, { x: MX, y: CY + 1.20, w: CW, h: 0.38, fontSize: 11, color: T.mute, align: "center", fontFace: "Calibri" });
    s.addText(`${texts.generated} ${new Date(r.meta.analyzedAt).toLocaleDateString(locale)}`, { x: MX, y: CY + 1.68, w: CW, h: 0.34, fontSize: 10, color: T.mute, align: "center", fontFace: "Calibri" });
  }

  const output = await instance.write({ outputType: "arraybuffer" });
  return Buffer.from(output as ArrayBuffer);
}
