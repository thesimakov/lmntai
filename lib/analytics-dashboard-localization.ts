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

function isLikelyLocalized(dashboard: AnalysisDashboard, lang: UiLanguage): boolean {
  const sample = [
    dashboard.summary.executive,
    ...dashboard.summary.keyFindings.slice(0, 2),
    ...dashboard.kpis.slice(0, 2).map((k) => k.label),
    ...dashboard.charts.slice(0, 1).map((c) => c.title),
  ].join(" ");

  if (lang === "en") return /[A-Za-z]/.test(sample);
  if (lang === "ru") return /[А-Яа-яЁё]/.test(sample);
  return /[ӣҷқӯғҳ]/i.test(sample) || /[А-Яа-яЁё]/.test(sample);
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
