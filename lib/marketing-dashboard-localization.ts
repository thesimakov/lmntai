import type { UiLanguage } from "@/lib/i18n";
import type { MarketingDashboard } from "@/lib/marketing-schema";

const KPI_LABEL_MAP: Record<string, { ru: string; en: string; tg: string }> = {
  "Total Spend": { ru: "Общие расходы", en: "Total Spend", tg: "Хароҷоти умумӣ" },
  "Total Revenue": { ru: "Общая выручка", en: "Total Revenue", tg: "Даромади умумӣ" },
  "Blended ROAS": { ru: "Сводный ROAS", en: "Blended ROAS", tg: "ROAS-и умумӣ" },
  "Avg CAC": { ru: "Средний CAC", en: "Avg CAC", tg: "CAC миёна" },
  Revenue: { ru: "Выручка", en: "Revenue", tg: "Даромад" },
  Spend: { ru: "Расходы", en: "Spend", tg: "Хароҷот" },
  "Unknown Company": { ru: "Неизвестная компания", en: "Unknown Company", tg: "Ширкати номаълум" },
};

const MONTHS_RU: Array<[RegExp, string]> = [
  [/\bJanuary\b/g, "январь"],
  [/\bFebruary\b/g, "февраль"],
  [/\bMarch\b/g, "март"],
  [/\bApril\b/g, "апрель"],
  [/\bMay\b/g, "май"],
  [/\bJune\b/g, "июнь"],
  [/\bJuly\b/g, "июль"],
  [/\bAugust\b/g, "август"],
  [/\bSeptember\b/g, "сентябрь"],
  [/\bOctober\b/g, "октябрь"],
  [/\bNovember\b/g, "ноябрь"],
  [/\bDecember\b/g, "декабрь"],
  [/\bJan\b/g, "янв"],
  [/\bFeb\b/g, "фев"],
  [/\bMar\b/g, "мар"],
  [/\bApr\b/g, "апр"],
  [/\bJun\b/g, "июн"],
  [/\bJul\b/g, "июл"],
  [/\bAug\b/g, "авг"],
  [/\bSep\b/g, "сен"],
  [/\bOct\b/g, "окт"],
  [/\bNov\b/g, "ноя"],
  [/\bDec\b/g, "дек"],
];

const MONTHS_TG: Array<[RegExp, string]> = [
  [/\bJanuary\b/g, "январ"],
  [/\bFebruary\b/g, "феврал"],
  [/\bMarch\b/g, "март"],
  [/\bApril\b/g, "апрел"],
  [/\bMay\b/g, "май"],
  [/\bJune\b/g, "июн"],
  [/\bJuly\b/g, "июл"],
  [/\bAugust\b/g, "август"],
  [/\bSeptember\b/g, "сентябр"],
  [/\bOctober\b/g, "октябр"],
  [/\bNovember\b/g, "ноябр"],
  [/\bDecember\b/g, "декабр"],
];

export function localizeMarketingKpiLabel(label: string, lang: UiLanguage): string {
  const langKey = lang === "en" ? "en" : lang === "tg" ? "tg" : "ru";
  return KPI_LABEL_MAP[label]?.[langKey] ?? label;
}

function applyMonthLocalization(text: string, lang: UiLanguage): string {
  if (lang === "en") return text;
  const monthMap = lang === "tg" ? MONTHS_TG : MONTHS_RU;
  let out = text;
  for (const [pattern, replacement] of monthMap) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function applyCommonLocalization(text: string, lang: UiLanguage): string {
  if (lang === "en") return text;
  let out = text;
  for (const [source, target] of Object.entries(KPI_LABEL_MAP)) {
    const translated = lang === "tg" ? target.tg : target.ru;
    out = out.replace(new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), translated);
  }
  return applyMonthLocalization(out, lang);
}

export function applyMarketingLanguageFallback(
  report: MarketingDashboard,
  lang: UiLanguage
): MarketingDashboard {
  if (lang === "en") return report;
  return {
    ...report,
    meta: {
      ...report.meta,
      companyName: applyCommonLocalization(report.meta.companyName, lang),
      period: applyCommonLocalization(report.meta.period, lang),
      dataSource: applyCommonLocalization(report.meta.dataSource, lang),
    },
    summary: {
      executive: applyCommonLocalization(report.summary.executive, lang),
      topFindings: report.summary.topFindings.map((x) => applyCommonLocalization(x, lang)),
      recommendations: report.summary.recommendations.map((x) => applyCommonLocalization(x, lang)),
    },
    channels: report.channels.map((channel) => ({
      ...channel,
      name: applyCommonLocalization(channel.name, lang),
      kpis: channel.kpis.map((kpi) => ({
        ...kpi,
        label: localizeMarketingKpiLabel(kpi.label, lang),
        value: applyCommonLocalization(kpi.value, lang),
        change: kpi.change ? applyCommonLocalization(kpi.change, lang) : undefined,
      })),
      narrative: applyCommonLocalization(channel.narrative, lang),
    })),
    kpis: report.kpis.map((kpi) => ({
      ...kpi,
      label: localizeMarketingKpiLabel(kpi.label, lang),
      value: applyCommonLocalization(kpi.value, lang),
      change: kpi.change ? applyCommonLocalization(kpi.change, lang) : undefined,
    })),
    charts: report.charts.map((chart) => ({
      ...chart,
      title: applyCommonLocalization(chart.title, lang),
      data: chart.data.map((entry) => ({
        ...entry,
        name: applyCommonLocalization(entry.name, lang),
      })),
    })),
    narrative: applyCommonLocalization(report.narrative, lang),
  };
}
