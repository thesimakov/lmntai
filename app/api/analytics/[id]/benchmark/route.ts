/**
 * POST /api/analytics/[id]/benchmark
 *
 * Detects company industry from dashboard, matches KPIs to industry benchmarks,
 * then asks an AI agent to produce a positioning narrative.
 */
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { chargeTokensSafely } from "@/lib/token-billing";
import { detectIndustry, matchKpiToBenchmarks } from "@/lib/analytics-benchmarks";
import type { BenchmarkComparison } from "@/lib/analytics-benchmarks";
import { persistBenchmarkSamples, getEnrichedIndustryBenchmark, getBenchmarkSampleCount } from "@/lib/benchmark-db";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";
import type { UiLanguage } from "@/lib/i18n";

const BENCHMARK_MODEL = "anthropic/claude-haiku-4.5";

export type BenchmarkReport = {
  generatedAt: string;
  industry: { id: string; name: string };
  comparisons: BenchmarkComparison[];
  narrative: string;
  sampleCount?: number;
};

const METRIC_LABELS: Record<string, { ru: string; en: string; tg: string }> = {
  "ARR Growth (YoY)": { ru: "Рост ARR (г/г)", en: "ARR Growth (YoY)", tg: "Афзоиши ARR (солона)" },
  "Gross Margin": { ru: "Валовая маржа", en: "Gross Margin", tg: "Маржаи умумӣ" },
  "Net Revenue Retention": { ru: "Удержание чистой выручки (NRR)", en: "Net Revenue Retention", tg: "Нигоҳдории даромади соф (NRR)" },
  "Rule of 40": { ru: "Правило 40", en: "Rule of 40", tg: "Қоидаи 40" },
  "CAC Payback (months)": { ru: "Окупаемость CAC (месяцы)", en: "CAC Payback (months)", tg: "Бозгашти CAC (моҳҳо)" },
  "EBITDA Margin": { ru: "Маржа EBITDA", en: "EBITDA Margin", tg: "Маржаи EBITDA" },
  "Burn Multiple": { ru: "Burn Multiple", en: "Burn Multiple", tg: "Burn Multiple" },
  "Revenue Growth (YoY)": { ru: "Рост выручки (г/г)", en: "Revenue Growth (YoY)", tg: "Афзоиши даромад (солона)" },
  "Net Profit Margin": { ru: "Чистая маржа", en: "Net Profit Margin", tg: "Маржаи фоидаи соф" },
  "Inventory Turnover": { ru: "Оборачиваемость запасов", en: "Inventory Turnover", tg: "Гардиши захираҳо" },
  "Return Rate": { ru: "Доля возвратов", en: "Return Rate", tg: "Сатҳи баргардонидан" },
  "GMV Growth (YoY)": { ru: "Рост GMV (г/г)", en: "GMV Growth (YoY)", tg: "Афзоиши GMV (солона)" },
  "Take Rate": { ru: "Комиссионная ставка (Take Rate)", en: "Take Rate", tg: "Меъёри комиссия (Take Rate)" },
  "Supplier/Buyer Ratio": { ru: "Соотношение поставщики/покупатели", en: "Supplier/Buyer Ratio", tg: "Таносуби таъминкунанда/харидор" },
  "Default Rate": { ru: "Уровень дефолта", en: "Default Rate", tg: "Сатҳи дефолт" },
  "Utilization Rate": { ru: "Коэффициент загрузки", en: "Utilization Rate", tg: "Сатҳи истифода" },
  "Revenue per Employee": { ru: "Выручка на сотрудника", en: "Revenue per Employee", tg: "Даромад ба як корманд" },
  "Asset Turnover": { ru: "Оборачиваемость активов", en: "Asset Turnover", tg: "Гардиши дороиҳо" },
  "Inventory Days": { ru: "Дни запасов", en: "Inventory Days", tg: "Рӯзҳои захира" },
};

function localizeMetricLabel(label: string, lang: UiLanguage): string {
  const langKey = lang === "en" ? "en" : lang === "tg" ? "tg" : "ru";
  return METRIC_LABELS[label]?.[langKey] ?? label;
}

function localizeIndustryName(id: string, fallbackName: string, lang: UiLanguage): string {
  if (lang === "en") return fallbackName;
  const ru: Record<string, string> = {
    saas: "SaaS / Программное обеспечение",
    ecommerce: "Электронная коммерция / Ритейл",
    marketplace: "Маркетплейс / Платформа",
    fintech: "Финтех",
    services: "Профессиональные услуги",
    manufacturing: "Производство / Промышленность",
  };
  const tg: Record<string, string> = {
    saas: "SaaS / Нармафзор",
    ecommerce: "Тиҷорати электронӣ / Ритейл",
    marketplace: "Маркетплейс / Платформа",
    fintech: "Финтех",
    services: "Хидматҳои касбӣ",
    manufacturing: "Истеҳсолот / Саноат",
  };
  return lang === "tg" ? (tg[id] ?? fallbackName) : (ru[id] ?? fallbackName);
}

function buildFallbackNarrative(
  companyName: string,
  comparisons: BenchmarkComparison[],
  lang: UiLanguage
): string {
  const strengths = comparisons.filter((c) => c.status === "above").slice(0, 2);
  const weaknesses = comparisons.filter((c) => c.status === "below").slice(0, 2);
  const neutral = comparisons.filter((c) => c.status === "on-par").slice(0, 1);
  if (lang === "en") {
    return [
      `# Financial Positioning Assessment: ${companyName}`,
      "",
      "## Strengths",
      ...(strengths.length > 0 ? strengths.map((c) => `- ${c.label}: above industry benchmark.`) : ["- No clear outperformance signal based on available metrics."]),
      "",
      "## Weaknesses",
      ...(weaknesses.length > 0 ? weaknesses.map((c) => `- ${c.label}: below industry benchmark.`) : ["- No critical lagging metric identified from parsed values."]),
      "",
      "## Recommendation",
      `Focus on improving ${weaknesses[0]?.label ?? neutral[0]?.label ?? "the weakest KPI cluster"} while preserving momentum in ${strengths[0]?.label ?? "the strongest metric"}.`,
    ].join("\n");
  }
  if (lang === "tg") {
    return [
      `# Арзёбии мавқеи молиявӣ: ${companyName}`,
      "",
      "## Бартариҳо",
      ...(strengths.length > 0 ? strengths.map((c) => `- ${c.label}: аз меъёри миёнаи соҳа болотар аст.`) : ["- Аз рӯи метрикаҳои дастрас бартарии равшан ошкор нашуд."]),
      "",
      "## Нуқсонҳо",
      ...(weaknesses.length > 0 ? weaknesses.map((c) => `- ${c.label}: аз меъёри миёнаи соҳа поёнтар аст.`) : ["- Метрикаи хеле қафомонда дар арзишҳои ҷудошуда ёфт нашуд."]),
      "",
      "## Тавсия",
      `Тамаркузро ба беҳтар кардани ${weaknesses[0]?.label ?? neutral[0]?.label ?? "кластерҳои KPI-и заиф"} гузоред ва ҳамзамон рушдро дар ${strengths[0]?.label ?? "метрикаи қавитарин"} нигоҳ доред.`,
    ].join("\n");
  }
  return [
    `# Оценка финансового позиционирования: ${companyName}`,
    "",
    "## Сильные стороны",
    ...(strengths.length > 0 ? strengths.map((c) => `- ${c.label}: выше отраслевого бенчмарка.`) : ["- По доступным метрикам явного опережения не выявлено."]),
    "",
    "## Слабые стороны",
    ...(weaknesses.length > 0 ? weaknesses.map((c) => `- ${c.label}: ниже отраслевого бенчмарка.`) : ["- Критических отставаний по распознанным значениям не обнаружено."]),
    "",
    "## Рекомендация",
    `Сфокусируйтесь на улучшении ${weaknesses[0]?.label ?? neutral[0]?.label ?? "наиболее слабого кластера KPI"} при сохранении динамики по ${strengths[0]?.label ?? "самой сильной метрике"}.`,
  ].join("\n");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;
  const uiLanguage = resolveUiLanguageFromRequest(req);

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const state = await getSandboxProjectState(projectId);
  if (!state?.files?.["analysis.json"]) {
    return apiError("No analysis found. Upload and analyze a file first.", 400);
  }

  let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
  try {
    dashboard = analysisDashboardSchema.parse(JSON.parse(state.files["analysis.json"]));
  } catch {
    return apiError("Analysis data is corrupted.", 422);
  }

  // Build a text fingerprint for industry detection
  const fingerprint = [
    dashboard.meta.documentType,
    dashboard.summary.executive,
    ...dashboard.summary.keyFindings,
    ...dashboard.kpis.map((k) => k.label),
    state.files["raw_text.txt"]?.slice(0, 2000) ?? "",
  ].join(" ");

  const industryHardcoded = detectIndustry(fingerprint);

  // Enrich benchmarks with real DB data (falls back gracefully if < 5 samples)
  const industry = await getEnrichedIndustryBenchmark(industryHardcoded.id) ?? industryHardcoded;

  // Build KPI text for numeric extraction
  const kpiText = dashboard.kpis
    .map((k) => `${k.label}: ${k.value}${k.change ? ` (${k.change})` : ""}`)
    .join("\n");

  const comparisons = matchKpiToBenchmarks(kpiText, industry);

  // Persist anonymised samples for future cross-company benchmarking
  await persistBenchmarkSamples(industry.id, comparisons).catch(() => {});

  const sampleCount = await getBenchmarkSampleCount(industry.id).catch(() => 0);

  // AI narrative
  const localizedComparisons = comparisons.map((c) => ({
    ...c,
    label: localizeMetricLabel(c.label, uiLanguage),
  }));

  const comparedStr = localizedComparisons
    .map((c) => {
      const val = c.companyValue !== null ? `${c.companyValue}${c.unit}` : "N/A";
      return `- ${c.label}: company=${val}, industry median=${c.median}${c.unit}, status=${c.status}`;
    })
    .join("\n");

  const languageLabel = uiLanguage === "en" ? "English" : uiLanguage === "tg" ? "Tajik" : "Russian";
  const systemPrompt = `You are a financial benchmarking analyst specializing in ${industry.name} companies.
Given benchmark comparison data, write a 200-250 word positioning assessment covering:
1. Where the company outperforms the industry (top 1-2 strengths)
2. Where the company lags (top 1-2 weaknesses)
3. One strategic recommendation based on the gaps
Be specific with numbers. Use bullet points for the strengths/weaknesses, then a short paragraph for the recommendation.
All narrative text must be in ${languageLabel}.
Do not use markdown code fences.`;

  const userContent = `Company: ${dashboard.meta.companyName}
Industry: ${industry.name}
Period: ${dashboard.meta.period}

Benchmark comparisons:
${comparedStr}

Company KPIs:
${kpiText}`;

  let narrative = "";
  try {
    const result = await requestRouterAIJson({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      model: BENCHMARK_MODEL,
      settings: { temperature: 0.3, max_completion_tokens: 600 },
      user: user.id,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId: user.id,
        projectId,
        usage: result.usage,
        model: result.model ?? BENCHMARK_MODEL,
      });
    }
    narrative = result.text;
  } catch {
    narrative = buildFallbackNarrative(dashboard.meta.companyName, localizedComparisons, uiLanguage);
  }

  const englishSignal = (narrative.match(/[A-Za-z]/g) ?? []).length;
  const cyrillicSignal = (narrative.match(/[А-Яа-яЁё]/g) ?? []).length;
  if (uiLanguage === "ru" && englishSignal > cyrillicSignal * 2) {
    narrative = buildFallbackNarrative(dashboard.meta.companyName, localizedComparisons, uiLanguage);
  }

  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    industry: { id: industry.id, name: localizeIndustryName(industry.id, industry.name, uiLanguage) },
    comparisons: localizedComparisons,
    narrative,
    sampleCount,
  };

  // Persist
  const freshState = await getSandboxProjectState(projectId);
  await upsertSandboxProjectState({
    projectId,
    sandboxId: state.sandboxId,
    ownerId: user.id,
    title: state.title,
    html: state.html,
    files: {
      ...(freshState?.files ?? {}),
      "benchmark_report.json": JSON.stringify(report),
    },
  });

  return apiOk({ report, data: { report } });
}
