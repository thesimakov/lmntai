import type { AnalysisDashboard } from "./analytics-schema";

const SYSTEM_PROMPT = `You are a senior investment analyst. Given a structured financial analysis, generate comprehensive investor materials.

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
1. Cover, 2. Investment Highlights, 3. Key Metrics, 4. Revenue Story, 5. Growth Trajectory,
6. Unit Economics, 7. 12M Forecast, 8. Risk Assessment, 9. Use of Funds, 10. The Ask.

Board Report must have exactly 14 slides in this order:
1. Executive Summary, 2. P&L Overview, 3. Revenue Breakdown, 4. Cost Structure, 5. EBITDA & Margins,
6. Burn & Runway, 7. Unit Economics, 8. LTV/CAC, 9. Cashflow, 10. KPI Trends,
11. Variance Analysis, 12. 3-Scenario Forecast, 13. Red Flags, 14. Recommendations.

Due Diligence must have exactly 8 slides in this order:
1. Cover, 2. Business Overview, 3. Financial Health, 4. Revenue Quality,
5. Cost Analysis, 6. Key Risks, 7. DD Questions, 8. Data Room Checklist.

Rules:
- riskScore: derive from burn rate severity, revenue quality, margin trend, runway length. High burn + low margins = higher score.
- riskLabel: Low=0-39, Medium=40-59, High=60-79, Critical=80-100.
- Forecast scenarios must use actual currency from the analysis.
- Return ONLY the JSON — no preamble, no explanation, no markdown.`;

type Message = { role: "system" | "user" | "assistant"; content: string };

export function buildInvestorPrompt(dashboard: AnalysisDashboard): Message[] {
  const now = new Date().toISOString();
  const dashboardJson = JSON.stringify(dashboard, null, 2);
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Current timestamp: ${now}\n\nCompany: ${dashboard.meta.companyName}\nPeriod: ${dashboard.meta.period}\n\n--- ANALYSIS DATA ---\n\n${dashboardJson}`,
    },
  ];
}
