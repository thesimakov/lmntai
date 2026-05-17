import { analysisDashboardSchema, type AnalysisDashboard } from "@/lib/analytics-schema";
import type { UiLanguage } from "@/lib/i18n";
import { requestRouterAIJson } from "@/lib/routerai-client";

function targetLanguageLabel(lang: UiLanguage): string {
  if (lang === "ru") return "Russian";
  if (lang === "tg") return "Tajik";
  return "English";
}

function extractJsonFromModel(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(jsonText);
}

const RU_COMMON_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bUnknown Company\b/gi, "Неизвестная компания"],
  [/\bUnknown\b/gi, "Неизвестно"],
  [/\bTotal Dev Budget\b/gi, "Общий бюджет разработки"],
  [/\bTotal Revenue\b/gi, "Общая выручка"],
  [/\bProjected Annual Revenue\b/gi, "Прогнозируемая годовая выручка"],
  [/\bProjected ROI\b/gi, "Прогнозируемый ROI"],
  [/\bMVP Launch Date\b/gi, "Дата запуска MVP"],
  [/\bMVP Launch\b/gi, "Запуск MVP"],
  [/\bRussian game development budget & monetization plan\b/gi, "Российский бюджет разработки игр и план монетизации"],
  [/\bFinancial Positioning Assessment\b/gi, "Оценка финансового позиционирования"],
];

const EN_TO_RU_MONTHS: Array<[RegExp, string]> = [
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

function applyPhraseFallback(text: string, lang: UiLanguage): string {
  if (lang === "en") return text;
  if (lang === "tg") return text;
  let out = text;
  for (const [pattern, replacement] of RU_COMMON_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of EN_TO_RU_MONTHS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function applyDashboardLanguageFallback(
  dashboard: AnalysisDashboard,
  lang: UiLanguage
): AnalysisDashboard {
  if (lang === "en") return dashboard;
  return {
    ...dashboard,
    meta: {
      ...dashboard.meta,
      companyName: applyPhraseFallback(dashboard.meta.companyName, lang),
      period: applyPhraseFallback(dashboard.meta.period, lang),
      documentType: applyPhraseFallback(dashboard.meta.documentType, lang),
      currency: applyPhraseFallback(dashboard.meta.currency, lang),
    },
    summary: {
      executive: applyPhraseFallback(dashboard.summary.executive, lang),
      keyFindings: dashboard.summary.keyFindings.map((item) => applyPhraseFallback(item, lang)),
      redFlags: dashboard.summary.redFlags.map((item) => applyPhraseFallback(item, lang)),
      opportunities: dashboard.summary.opportunities.map((item) => applyPhraseFallback(item, lang)),
    },
    kpis: dashboard.kpis.map((kpi) => ({
      ...kpi,
      label: applyPhraseFallback(kpi.label, lang),
      value: applyPhraseFallback(kpi.value, lang),
      change: kpi.change ? applyPhraseFallback(kpi.change, lang) : undefined,
    })),
    charts: dashboard.charts.map((chart) => ({
      ...chart,
      title: applyPhraseFallback(chart.title, lang),
      description: chart.description ? applyPhraseFallback(chart.description, lang) : undefined,
      data: chart.data.map((entry) => {
        const name = entry.name;
        return typeof name === "string"
          ? { ...entry, name: applyPhraseFallback(name, lang) }
          : entry;
      }),
    })),
    tables: dashboard.tables.map((table) => ({
      ...table,
      title: applyPhraseFallback(table.title, lang),
      headers: table.headers.map((h) => applyPhraseFallback(h, lang)),
      rows: table.rows.map((row) => row.map((cell) => applyPhraseFallback(cell, lang))),
    })),
    narrative: applyPhraseFallback(dashboard.narrative, lang),
  };
}

function isLikelyLocalized(dashboard: AnalysisDashboard, lang: UiLanguage): boolean {
  const sample = [
    dashboard.summary.executive,
    ...dashboard.summary.keyFindings.slice(0, 2),
    ...dashboard.kpis.slice(0, 2).map((k) => k.label),
    ...dashboard.charts.slice(0, 1).map((c) => c.title),
  ].join(" ");

  const latinCount = (sample.match(/[A-Za-z]/g) ?? []).length;
  const cyrillicCount = (sample.match(/[А-Яа-яЁё]/g) ?? []).length;
  if (lang === "en") return latinCount > cyrillicCount;
  if (lang === "ru") return cyrillicCount > 0 && cyrillicCount >= latinCount * 0.5;
  return /[ӣҷқӯғҳ]/i.test(sample) || (cyrillicCount > 0 && cyrillicCount >= latinCount * 0.5);
}

export async function localizeAnalysisDashboard(
  dashboard: AnalysisDashboard,
  targetLang: UiLanguage,
  userId?: string
): Promise<AnalysisDashboard> {
  if (isLikelyLocalized(dashboard, targetLang)) {
    return dashboard;
  }

  const targetLanguage = targetLanguageLabel(targetLang);
  const sourceJson = JSON.stringify(dashboard, null, 2);
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content:
        `You are a strict JSON translator for financial dashboards.
Translate ONLY human-readable text fields to ${targetLanguage}.
Do not change numeric values, arrays length, object structure, IDs, trends, categories, currencies, or timestamps.
Return ONLY valid JSON, without markdown or explanations.`,
    },
    {
      role: "user",
      content:
        `Translate this JSON dashboard to ${targetLanguage}:\n\n${sourceJson}`,
    },
  ];

  const result = await requestRouterAIJson({
    messages,
    model: "anthropic/claude-haiku-4.5",
    settings: { temperature: 0, max_completion_tokens: 6000 },
    user: userId,
  });

  const translated = extractJsonFromModel(result.text);
  const parsed = analysisDashboardSchema.safeParse(translated);
  if (!parsed.success) {
    throw new Error("Localized dashboard schema validation failed");
  }
  return parsed.data;
}
