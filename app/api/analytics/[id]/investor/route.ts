import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildInvestorPrompt } from "@/lib/investor-prompt";
import { analysisDashboardSchema, type AnalysisDashboard } from "@/lib/analytics-schema";
import { investorReportSchema, type InvestorReport } from "@/lib/investor-schema";
import { normalizeInvestorReport } from "@/lib/investor-report-normalize";
import { chargeTokensSafely } from "@/lib/token-billing";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";
import type { UiLanguage } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INVESTOR_MODEL = "anthropic/claude-sonnet-4.5";

function buildRetryMessage(lang: UiLanguage): string {
  const language = lang === "en" ? "English" : lang === "tg" ? "Tajik" : "Russian";
  return (
    "Your response was not valid JSON or did not match the required schema. " +
    "Return ONLY the JSON object, no markdown, no code fences. " +
    `All human-readable text must be in ${language}. ` +
    "Ensure vcPitch has 10 slides, boardReport has 14 slides, dueDiligence has 8 slides. " +
    "Use riskLabel only: Low, Medium, High, Critical. Use severity only: low, medium, high."
  );
}

function tryParseReport(text: string): ReturnType<typeof investorReportSchema.safeParse> | null {
  try {
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const parsed = JSON.parse(jsonText) as unknown;
    const strict = investorReportSchema.safeParse(parsed);
    if (strict.success) return strict;
    const repaired = normalizeInvestorReport(parsed);
    if (!repaired) return strict;
    return investorReportSchema.safeParse(repaired);
  } catch {
    return null;
  }
}

class AICallError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "AICallError";
  }
}

function fallbackTexts(lang: UiLanguage) {
  if (lang === "en") {
    return {
      vcTitles: [
        "Cover",
        "Investment Highlights",
        "Key Metrics",
        "Revenue Story",
        "Growth Trajectory",
        "Unit Economics",
        "12M Forecast",
        "Risk Assessment",
        "Use of Funds",
        "The Ask",
      ],
      boardTitles: [
        "Executive Summary",
        "P&L Overview",
        "Revenue Breakdown",
        "Cost Structure",
        "EBITDA & Margins",
        "Burn & Runway",
        "Unit Economics",
        "LTV/CAC",
        "Cashflow",
        "KPI Trends",
        "Variance Analysis",
        "3-Scenario Forecast",
        "Red Flags",
        "Recommendations",
      ],
      ddTitles: [
        "Cover",
        "Business Overview",
        "Financial Health",
        "Revenue Quality",
        "Cost Analysis",
        "Key Risks",
        "DD Questions",
        "Data Room Checklist",
      ],
      fallbackNote: "Generated via fallback synthesis due to strict schema mismatch.",
      askContent: "Requested: investment committee review and staged funding decision.",
      recommendation: "Prioritize runway control and validate demand assumptions with pilot metrics.",
      ddQuestions: [
        "Which assumptions are validated by real customer behavior?",
        "What downside protection exists if demand is below plan?",
        "How quickly can costs be reduced in a pessimistic scenario?",
      ],
      ddChecklist: [
        "P&L for the last 24 months",
        "Cashflow statement and runway model",
        "Unit economics by channel",
        "Contracts, liabilities, and grant documentation",
      ],
    } as const;
  }

  return {
    vcTitles: [
      "Титульный слайд",
      "Ключевые инвестиционные тезисы",
      "Ключевые метрики",
      "История выручки",
      "Траектория роста",
      "Юнит-экономика",
      "Прогноз на 12 месяцев",
      "Оценка рисков",
      "Использование инвестиций",
      "Инвестиционный запрос",
    ],
    boardTitles: [
      "Краткое резюме",
      "Обзор P&L",
      "Структура выручки",
      "Структура затрат",
      "EBITDA и маржинальность",
      "Burn rate и runway",
      "Юнит-экономика",
      "LTV/CAC",
      "Денежный поток",
      "Динамика KPI",
      "Анализ отклонений",
      "Прогноз по 3 сценариям",
      "Красные флаги",
      "Рекомендации",
    ],
    ddTitles: [
      "Титульный слайд",
      "Обзор бизнеса",
      "Финансовое состояние",
      "Качество выручки",
      "Анализ затрат",
      "Ключевые риски",
      "Вопросы DD",
      "Чеклист data room",
    ],
    fallbackNote: "Отчет собран в fallback-режиме из доступных структурированных данных.",
    askContent: "Запрос: рассмотрение инвесткомитетом и поэтапное финансирование.",
    recommendation: "Сфокусироваться на управлении runway и валидации спроса через пилотные метрики.",
    ddQuestions: [
      "Какие предпосылки подтверждены фактическим поведением клиентов?",
      "Какая защита downside предусмотрена при спросе ниже плана?",
      "Как быстро можно снизить расходы в пессимистичном сценарии?",
    ],
    ddChecklist: [
      "P&L за последние 24 месяца",
      "Cashflow и модель runway",
      "Юнит-экономика по каналам",
      "Договоры, обязательства и документы по грантам",
    ],
  } as const;
}

function buildSlides(
  titles: readonly string[],
  dashboard: AnalysisDashboard,
  extra: string
): Array<{ title: string; content: string; bullets: string[]; speakerNotes: string }> {
  const findings = dashboard.summary.keyFindings.slice(0, 3);
  const opportunities = dashboard.summary.opportunities.slice(0, 3);
  return titles.map((title, idx) => ({
    title,
    content: idx === 0 ? dashboard.summary.executive : dashboard.narrative,
    bullets: (idx % 2 === 0 ? findings : opportunities).slice(0, 3),
    speakerNotes: extra,
  }));
}

function estimateRisk(dashboard: AnalysisDashboard): number {
  const redFlags = dashboard.summary.redFlags.length;
  const downTrends = dashboard.kpis.filter((kpi) => kpi.trend === "down").length;
  const raw = 35 + redFlags * 8 + downTrends * 5;
  return Math.max(20, Math.min(95, Math.round(raw)));
}

function buildFallbackReport(dashboard: AnalysisDashboard, lang: UiLanguage): InvestorReport {
  const texts = fallbackTexts(lang);
  const now = new Date().toISOString();
  const score = estimateRisk(dashboard);
  const label: InvestorReport["riskLabel"] =
    score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 40 ? "Medium" : "Low";

  const revenueKpi = dashboard.kpis.find((kpi) => kpi.category === "revenue")?.value ?? "n/a";
  const profitabilityKpi = dashboard.kpis.find((kpi) => kpi.category === "profitability")?.value ?? "n/a";

  const riskFactors = dashboard.summary.redFlags.slice(0, 4).map((flag) => ({
    factor: flag,
    severity: score >= 70 ? ("high" as const) : score >= 45 ? ("medium" as const) : ("low" as const),
  }));

  const vcSlides = buildSlides(texts.vcTitles, dashboard, texts.fallbackNote);
  const boardSlides = buildSlides(texts.boardTitles, dashboard, texts.fallbackNote).map((slide, idx) => ({
    ...slide,
    tableData:
      idx === 1 && dashboard.tables[0]
        ? [dashboard.tables[0].headers, ...(dashboard.tables[0].rows.slice(0, 4) ?? [])]
        : undefined,
  }));
  const ddSlides = texts.ddTitles.map((title, idx) => ({
    title,
    content: idx === texts.ddTitles.length - 1 ? texts.askContent : dashboard.summary.executive,
    bullets: dashboard.summary.redFlags.slice(0, 3),
  }));

  return investorReportSchema.parse({
    generatedAt: now,
    riskScore: score,
    riskLabel: label,
    riskFactors,
    investmentHighlights: dashboard.summary.opportunities.slice(0, 5),
    forecast: {
      horizon: "12m",
      scenarios: {
        optimistic: {
          revenue: `${revenueKpi} (+15%)`,
          ebitda: `${profitabilityKpi} (+8pp)`,
          narrative: dashboard.summary.opportunities[0] ?? dashboard.narrative,
        },
        base: {
          revenue: `${revenueKpi} (+6%)`,
          ebitda: `${profitabilityKpi} (+3pp)`,
          narrative: dashboard.summary.keyFindings[0] ?? dashboard.narrative,
        },
        pessimistic: {
          revenue: `${revenueKpi} (-8%)`,
          ebitda: `${profitabilityKpi} (-5pp)`,
          narrative: dashboard.summary.redFlags[0] ?? dashboard.narrative,
        },
      },
    },
    vcPitch: { slides: vcSlides },
    boardReport: { slides: boardSlides },
    dueDiligence: {
      slides: ddSlides,
      keyQuestions: texts.ddQuestions,
      dataRoomChecklist: texts.ddChecklist,
    },
  });
}

async function callInvestorAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  userId: string,
  projectId: string
) {
  try {
    const result = await requestRouterAIJson({
      messages,
      model: INVESTOR_MODEL,
      settings: { temperature: 0.1, max_completion_tokens: 8000 },
      user: userId,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId,
        projectId,
        usage: result.usage,
        model: result.model ?? INVESTOR_MODEL,
      });
    }
    return result;
  } catch (err) {
    throw new AICallError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireDbUser();
    if (!guard.ok) return apiGuardError(guard);
    const user = guard.data.user;
    const uiLanguage = resolveUiLanguageFromRequest(req);

    const { id: projectId } = await params;

    try {
      await requireProjectScopeForOwner(projectId, user.id);
    } catch (err) {
      if (err instanceof Error && err.message === "PROJECT_NOT_FOUND") {
        return apiError("Project not found or access denied", 403);
      }
      throw err;
    }

    const state = await getSandboxProjectState(projectId);
    if (!state) return apiError("No analysis found. Upload and analyze a PDF first.", 400);
    const rawAnalysis = state.files["analysis.json"];
    if (!rawAnalysis) return apiError("No analysis found. Upload and analyze a PDF first.", 400);

    let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
    try {
      dashboard = analysisDashboardSchema.parse(JSON.parse(rawAnalysis));
    } catch {
      return apiError("Analysis data is corrupted.", 422);
    }

    const messages = buildInvestorPrompt(dashboard, uiLanguage);

    // First attempt
    let result1: Awaited<ReturnType<typeof callInvestorAI>>;
    try {
      result1 = await callInvestorAI(messages, user.id, projectId);
    } catch {
      return apiError("AI service temporarily unavailable", 502);
    }
    const v1 = tryParseReport(result1.text);

    if (v1?.success) {
      const reportWithTimestamp = { ...v1.data, generatedAt: new Date().toISOString() };
      const freshState1 = await getSandboxProjectState(projectId);
      const freshFiles1 = freshState1?.files ?? {};
      await upsertSandboxProjectState({
        projectId,
        sandboxId: state.sandboxId,
        ownerId: user.id,
        title: state.title,
        html: state.html,
        files: { ...freshFiles1, "investor.json": JSON.stringify(reportWithTimestamp) },
      });
      return apiOk({ report: reportWithTimestamp, data: { report: reportWithTimestamp } });
    }

    // Retry once with corrective prompt
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: result1.text },
      { role: "user" as const, content: buildRetryMessage(uiLanguage) },
    ];
    let result2: Awaited<ReturnType<typeof callInvestorAI>>;
    try {
      result2 = await callInvestorAI(retryMessages, user.id, projectId);
    } catch {
      return apiError("AI service temporarily unavailable", 502);
    }
    const v2 = tryParseReport(result2.text);

    if (!v2?.success) {
      const fallbackReport = buildFallbackReport(dashboard, uiLanguage);
      console.warn("[analytics/investor] AI schema mismatch after retry, returned fallback report");
      const fallbackWithTimestamp = { ...fallbackReport, generatedAt: new Date().toISOString() };
      const freshStateFallback = await getSandboxProjectState(projectId);
      const freshFilesFallback = freshStateFallback?.files ?? {};
      await upsertSandboxProjectState({
        projectId,
        sandboxId: state.sandboxId,
        ownerId: user.id,
        title: state.title,
        html: state.html,
        files: { ...freshFilesFallback, "investor.json": JSON.stringify(fallbackWithTimestamp) },
      });
      return apiOk({ report: fallbackWithTimestamp, data: { report: fallbackWithTimestamp } });
    }

    const reportWithTimestamp = { ...v2.data, generatedAt: new Date().toISOString() };
    const freshState2 = await getSandboxProjectState(projectId);
    const freshFiles2 = freshState2?.files ?? {};
    await upsertSandboxProjectState({
      projectId,
      sandboxId: state.sandboxId,
      ownerId: user.id,
      title: state.title,
      html: state.html,
      files: { ...freshFiles2, "investor.json": JSON.stringify(reportWithTimestamp) },
    });

    return apiOk({ report: reportWithTimestamp, data: { report: reportWithTimestamp } });
  } catch (err) {
    console.error("[analytics/investor] unexpected error:", err);
    return apiError("Failed to generate investor report", 500);
  }
}
