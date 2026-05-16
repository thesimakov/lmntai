import type { AnalysisDashboard } from "./analytics-schema";
import type { UiLanguage } from "./i18n";

type Message = { role: "system" | "user" | "assistant"; content: string };

function promptLanguageLabel(lang: UiLanguage): string {
  if (lang === "en") return "English";
  if (lang === "tg") return "Tajik";
  return "Russian";
}

function orderedTitles(lang: UiLanguage) {
  if (lang === "en") {
    return {
      vc: "1. Cover, 2. Investment Highlights, 3. Key Metrics, 4. Revenue Story, 5. Growth Trajectory, 6. Unit Economics, 7. 12M Forecast, 8. Risk Assessment, 9. Use of Funds, 10. The Ask.",
      board:
        "1. Executive Summary, 2. P&L Overview, 3. Revenue Breakdown, 4. Cost Structure, 5. EBITDA & Margins, 6. Burn & Runway, 7. Unit Economics, 8. LTV/CAC, 9. Cashflow, 10. KPI Trends, 11. Variance Analysis, 12. 3-Scenario Forecast, 13. Red Flags, 14. Recommendations.",
      dd: "1. Cover, 2. Business Overview, 3. Financial Health, 4. Revenue Quality, 5. Cost Analysis, 6. Key Risks, 7. DD Questions, 8. Data Room Checklist.",
    } as const;
  }

  if (lang === "tg") {
    return {
      vc: "1. Слайди муқова, 2. Тезисҳои асосии сармоягузорӣ, 3. Метрикаҳои асосӣ, 4. Ҳикояи даромад, 5. Траекторияи рушд, 6. Юнит-иқтисодиёт, 7. Пешбинии 12-моҳа, 8. Арзёбии хавф, 9. Самтҳои истифодаи сармоя, 10. Дархости сармоя.",
      board:
        "1. Хулосаи иҷроия, 2. Шарҳи P&L, 3. Таркиби даромад, 4. Таркиби хароҷот, 5. EBITDA ва маржа, 6. Burn ва runway, 7. Юнит-иқтисодиёт, 8. LTV/CAC, 9. Cashflow, 10. Динамикаи KPI, 11. Таҳлили инҳироф, 12. Пешбинии 3 сенария, 13. Парчамҳои сурх, 14. Тавсияҳо.",
      dd: "1. Слайди муқова, 2. Шарҳи бизнес, 3. Саломатии молиявӣ, 4. Сифати даромад, 5. Таҳлили хароҷот, 6. Хавфҳои асосӣ, 7. Саволҳои DD, 8. Рӯйхати санҷиши data room.",
    } as const;
  }

  return {
    vc: "1. Титульный слайд, 2. Ключевые инвестиционные тезисы, 3. Ключевые метрики, 4. История выручки, 5. Траектория роста, 6. Юнит-экономика, 7. Прогноз на 12 месяцев, 8. Оценка рисков, 9. Использование инвестиций, 10. Инвестиционный запрос.",
    board:
      "1. Краткое резюме, 2. Обзор P&L, 3. Структура выручки, 4. Структура затрат, 5. EBITDA и маржинальность, 6. Burn rate и runway, 7. Юнит-экономика, 8. LTV/CAC, 9. Денежный поток, 10. Динамика KPI, 11. Анализ отклонений, 12. Прогноз по 3 сценариям, 13. Красные флаги, 14. Рекомендации.",
    dd: "1. Титульный слайд, 2. Обзор бизнеса, 3. Финансовое состояние, 4. Качество выручки, 5. Анализ затрат, 6. Ключевые риски, 7. Вопросы DD, 8. Чеклист data room.",
  } as const;
}

function buildSystemPrompt(lang: UiLanguage): string {
  const languageLabel = promptLanguageLabel(lang);
  const titles = orderedTitles(lang);
  return `You are a senior investment analyst. Given a structured financial analysis, generate comprehensive investor materials.

Target language for all human-readable text fields: ${languageLabel}.
- All slide titles, slide content, bullet points, speaker notes, keyQuestions, dataRoomChecklist, riskFactors.factor, investmentHighlights, and forecast narratives must be in ${languageLabel}.
- Keep enum fields exactly as schema requires: riskLabel must be one of Low|Medium|High|Critical, severity must be low|medium|high, and horizon must be "12m".

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "generatedAt": string,           // current ISO timestamp
  "riskScore": number,             // 0-100 investment risk score (0=safest, 100=highest risk)
  "riskLabel": "Low" | "Medium" | "High" | "Critical",
  "riskFactors": [{ "factor": string, "severity": "low" | "medium" | "high" }],
  "investmentHighlights": string[], // 3-5 strongest positive signals for investors
  "forecast": {
    "horizon": "12m",
    "scenarios": {
      "optimistic": { "revenue": string, "ebitda": string, "narrative": string },
      "base":       { "revenue": string, "ebitda": string, "narrative": string },
      "pessimistic":{ "revenue": string, "ebitda": string, "narrative": string }
    }
  },
  "vcPitch": {
    "slides": [
      { "title": string, "content": string, "bullets": string[], "speakerNotes": string }
    ]
  },
  "boardReport": {
    "slides": [
      { "title": string, "content": string, "bullets": string[], "tableData": string[][] }
    ]
  },
  "dueDiligence": {
    "slides": [
      { "title": string, "content": string, "bullets": string[] }
    ],
    "keyQuestions": string[],
    "dataRoomChecklist": string[]
  }
}

VC Pitch must have exactly 10 slides in this order:
${titles.vc}

Board Report must have exactly 14 slides in this order:
${titles.board}

Due Diligence must have exactly 8 slides in this order:
${titles.dd}

Rules:
- riskScore: derive from burn rate severity, revenue quality, margin trend, runway length. High burn + low margins = higher score.
- riskLabel: Low=0-39, Medium=40-59, High=60-79, Critical=80-100.
- Forecast scenarios must use actual currency from the analysis.
- Return ONLY the JSON — no preamble, no explanation, no markdown.`;
}

export function buildInvestorPrompt(dashboard: AnalysisDashboard, lang: UiLanguage = "ru"): Message[] {
  const now = new Date().toISOString();
  const dashboardJson = JSON.stringify(dashboard, null, 2);
  return [
    { role: "system", content: buildSystemPrompt(lang) },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\nCompany: ${dashboard.meta.companyName}\nPeriod: ${dashboard.meta.period}\n\n--- ANALYSIS DATA ---\n\n${dashboardJson}`,
    },
  ];
}
