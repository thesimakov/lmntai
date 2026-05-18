import type { MarketingDashboard } from "./marketing-schema";
import type { UiLanguage } from "./i18n";

type Message = { role: "system" | "user" | "assistant"; content: string };

const ANALYZE_SYSTEM_PROMPT = `You are a marketing analytics expert. Analyze the provided marketing data and generate a channels-first performance report.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "meta": {
    "companyName": string,      // infer from data or use "Unknown Company"
    "period": string,           // e.g. "Jan–Mar 2024"
    "dataSource": string,       // describe what files/sources were found, e.g. "Google Ads CSV + Meta XLSX"
    "analyzedAt": string        // current ISO timestamp (will be overridden by server)
  },
  "summary": {
    "executive": string,        // 2–3 sentence executive summary
    "topFindings": string[],    // 3–5 bullet points of key insights
    "recommendations": string[] // 3–5 actionable recommendations
  },
  "channels": [                 // 1 to 6 channels identified in the data
    {
      "name": string,           // e.g. "Google Ads", "Meta Ads", "Organic", "Email", "Yandex"
      "spend": number,          // optional, raw number (no symbols)
      "revenue": number,        // optional, raw number (no symbols)
      "kpis": [
        {
          "label": string,      // e.g. "ROAS", "CAC", "CTR", "CPC", "CVR", "Open Rate"
          "value": string,      // formatted string e.g. "4.1x", "$42", "6.2%"
          "change": string,     // optional, e.g. "+0.4x MoM"
          "trend": "up" | "down" | "neutral"
        }
      ],
      "trend": "up" | "down" | "neutral",
      "narrative": string       // 1–2 sentences about this channel's performance
    }
  ],
  "kpis": [                     // 3–5 summary metrics across all channels
    {
      "label": string,          // e.g. "Total Spend", "Total Revenue", "Blended ROAS", "Avg CAC"
      "value": string,
      "change": string,
      "trend": "up" | "down" | "neutral"
    }
  ],
  "charts": [                   // 2–3 charts
    {
      "id": string,
      "type": "bar" | "line" | "pie",
      "title": string,
      "data": [{ "name": string, "value": number }]
    }
  ],
  "narrative": string           // 2–3 sentence overall performance narrative
}

Rules:
- Identify channels from column names, sheet names, or explicit labels in the data.
- For paid channels (Google Ads, Meta, Yandex): always include ROAS if spend + revenue are present.
- For organic channels: include CVR and sessions if available.
- For email: include open rate and CTR if available.
- All numeric values in "spend" and "revenue" must be raw numbers — no symbols, no commas.
- Return ONLY the JSON — no preamble, no explanation, no markdown fences.`;

const CHAT_SYSTEM_PROMPT_PREFIX = `You are a marketing analytics assistant. You have access to the following marketing performance data for this company:

--- MARKETING DATA ---
`;

function promptLanguageLabel(lang: UiLanguage): string {
  if (lang === "en") return "English";
  if (lang === "tg") return "Tajik";
  return "Russian";
}

function buildAnalyzeSystemPrompt(lang: UiLanguage): string {
  const responseLanguage = promptLanguageLabel(lang);
  return `${ANALYZE_SYSTEM_PROMPT}

All human-readable text fields in output JSON must be in ${responseLanguage}.
Do not translate enum values "up", "down", "neutral".`;
}

export function buildMarketingPrompt(rawText: string, lang: UiLanguage = "ru"): Message[] {
  const now = new Date().toISOString();
  return [
    { role: "system", content: buildAnalyzeSystemPrompt(lang) },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\n--- MARKETING DATA ---\n\n${rawText}`,
    },
  ];
}

export function buildMarketingChatPrompt(
  dashboard: MarketingDashboard,
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  lang: UiLanguage = "ru"
): Message[] {
  const context = JSON.stringify(dashboard, null, 2);
  const responseLanguage = promptLanguageLabel(lang);
  const systemContent =
    CHAT_SYSTEM_PROMPT_PREFIX +
    context +
    `\n\nAnswer questions about channel performance, KPIs, spend, revenue, and recommendations. ` +
    `Respond in ${responseLanguage}. Format answers in Markdown: use ## and ### headings, bullet lists, and GitHub-style tables for comparisons. ` +
    `Put numeric comparisons in tables so the UI can render charts. Cite specific numbers from the data.`;

  return [
    { role: "system", content: systemContent },
    ...history,
    { role: "user", content: message },
  ];
}
