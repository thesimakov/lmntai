import type { AnalysisDashboard } from "./analytics-schema";

const SYSTEM_PROMPT = `You are a senior financial analyst AI. Analyze the provided document and extract key financial information.

Return ONLY a valid JSON object matching this exact TypeScript interface (no markdown, no code fences):

{
  "meta": {
    "companyName": string,       // company name from doc or "Unknown"
    "period": string,             // e.g. "Q1 2024", "FY2023"
    "documentType": string,       // "P&L" | "balance_sheet" | "cash_flow" | "mixed"
    "currency": string,           // "USD" | "RUB" | "EUR" | detected currency
    "analyzedAt": string          // current ISO timestamp, e.g. "2024-01-01T00:00:00.000Z"
  },
  "summary": {
    "executive": string,          // 2-3 paragraph executive summary
    "keyFindings": string[],      // 3-5 bullet points, most important findings
    "redFlags": string[],         // risk indicators, anomalies, concerns
    "opportunities": string[]     // growth opportunities, positive signals
  },
  "kpis": [                       // 4-8 key metrics from the document
    {
      "label": string,            // metric name
      "value": string,            // formatted value e.g. "$2.4M" or "18.5%"
      "change": string | null,    // change vs prior period e.g. "+18% YoY" or null
      "trend": "up" | "down" | "neutral",
      "category": "revenue" | "profitability" | "liquidity" | "growth" | "efficiency"
    }
  ],
  "charts": [                     // 2-4 charts that best visualize the data
    {
      "id": string,               // unique snake_case id
      "type": "bar" | "line" | "area" | "pie" | "waterfall",
      "title": string,
      "description": string | null,
      "data": [{ "name": string, "value": number }]
    }
  ],
  "tables": [                     // 0-2 tables for detailed breakdowns
    {
      "title": string,
      "headers": string[],
      "rows": string[][]
    }
  ],
  "narrative": string             // full 400-600 word analytical narrative for reports
}

Rules:
- Use ONLY data present in the document. Do not fabricate numbers.
- All monetary values in "value" fields must be formatted with currency symbol and unit (K/M/B).
- If a field cannot be determined, use an empty array [] or "Unknown" string as appropriate.
- Return ONLY the JSON — no preamble, no explanation, no markdown.`;

type Message = { role: "system" | "user" | "assistant"; content: string };

export function buildAnalysisPrompt(documentText: string): Message[] {
  const now = new Date().toISOString();
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\n--- DOCUMENT ---\n\n${documentText}`,
    },
  ];
}

export function buildChatPrompt(
  dashboard: AnalysisDashboard,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  ragChunks: string[] = []
): Message[] {
  const contextJson = JSON.stringify(dashboard, null, 2);

  const ragSection = ragChunks.length > 0
    ? `\n\n## Relevant excerpts from the source document\n\n${ragChunks.map((c, i) => `[Excerpt ${i + 1}]\n${c}`).join("\n\n")}`
    : "";

  const system = `You are a senior financial analyst. You have already analyzed a financial document. Here is the structured analysis:

\`\`\`json
${contextJson}
\`\`\`
${ragSection}

Answer the user's questions using the structured analysis and source excerpts above. Be concise, accurate, and cite specific numbers. Format your responses in Markdown.`;

  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];
}
