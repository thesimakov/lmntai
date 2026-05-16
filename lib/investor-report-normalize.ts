import { investorReportSchema, type InvestorReport } from "@/lib/investor-schema";

const VC_SLIDES = 10;
const BOARD_SLIDES = 14;
const DD_SLIDES = 8;

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item) => item.length > 0);
}

function toRiskScore(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(",", "."))
        : NaN;
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function toRiskLabel(raw: unknown, score: number): "Low" | "Medium" | "High" | "Critical" {
  const normalized = asString(raw).trim().toLowerCase();
  if (["low", "низкий", "паст", "кам"].includes(normalized)) return "Low";
  if (["medium", "средний", "умеренный", "миёна"].includes(normalized)) return "Medium";
  if (["high", "высокий", "баланд"].includes(normalized)) return "High";
  if (["critical", "критический", "ҷиддӣ", "очень высокий"].includes(normalized)) return "Critical";
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function toSeverity(raw: unknown): "low" | "medium" | "high" {
  const normalized = asString(raw).trim().toLowerCase();
  if (["high", "высокий", "баланд"].includes(normalized)) return "high";
  if (["medium", "средний", "умеренный", "миёна"].includes(normalized)) return "medium";
  return "low";
}

function normalizeSlide(raw: unknown, idx: number, prefix: string) {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const title = asString(obj.title, `${prefix} ${idx + 1}`);
  const content = asString(obj.content, "");
  const bullets = asStringArray(obj.bullets);
  const speakerNotes = asString(obj.speakerNotes);
  const tableDataRaw = Array.isArray(obj.tableData) ? obj.tableData : [];
  const tableData = tableDataRaw
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => row.map((cell) => asString(cell)));

  return {
    title,
    content,
    ...(bullets.length > 0 ? { bullets } : {}),
    ...(speakerNotes.length > 0 ? { speakerNotes } : {}),
    ...(tableData.length > 0 ? { tableData } : {}),
  };
}

function normalizeSlides(raw: unknown, targetCount: number, prefix: string) {
  const source = Array.isArray(raw) ? raw : [];
  const normalized = source.map((slide, idx) => normalizeSlide(slide, idx, prefix));
  if (normalized.length >= targetCount) {
    return normalized.slice(0, targetCount);
  }
  while (normalized.length < targetCount) {
    const idx = normalized.length;
    normalized.push(normalizeSlide({}, idx, prefix));
  }
  return normalized;
}

function normalizeGeneratedAt(raw: unknown): string {
  const candidate = asString(raw).trim();
  if (candidate.length > 0 && !Number.isNaN(Date.parse(candidate))) {
    return new Date(candidate).toISOString();
  }
  return new Date().toISOString();
}

export function normalizeInvestorReport(raw: unknown): InvestorReport | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const score = toRiskScore(root.riskScore);

  const normalized: unknown = {
    generatedAt: normalizeGeneratedAt(root.generatedAt),
    riskScore: score,
    riskLabel: toRiskLabel(root.riskLabel, score),
    riskFactors: (Array.isArray(root.riskFactors) ? root.riskFactors : []).map((rf) => {
      const obj = rf && typeof rf === "object" ? (rf as Record<string, unknown>) : {};
      return {
        factor: asString(obj.factor, "Risk factor"),
        severity: toSeverity(obj.severity),
      };
    }),
    investmentHighlights: asStringArray(root.investmentHighlights),
    forecast: {
      horizon: "12m",
      scenarios: {
        optimistic: {
          revenue: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.optimistic && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).optimistic as Record<string, unknown>)?.revenue),
          ebitda: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.optimistic && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).optimistic as Record<string, unknown>)?.ebitda),
          narrative: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.optimistic && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).optimistic as Record<string, unknown>)?.narrative),
        },
        base: {
          revenue: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.base && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).base as Record<string, unknown>)?.revenue),
          ebitda: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.base && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).base as Record<string, unknown>)?.ebitda),
          narrative: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.base && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).base as Record<string, unknown>)?.narrative),
        },
        pessimistic: {
          revenue: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.pessimistic && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).pessimistic as Record<string, unknown>)?.revenue),
          ebitda: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.pessimistic && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).pessimistic as Record<string, unknown>)?.ebitda),
          narrative: asString((root.forecast as Record<string, unknown> | undefined)?.scenarios && ((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>)?.pessimistic && (((root.forecast as Record<string, unknown>).scenarios as Record<string, unknown>).pessimistic as Record<string, unknown>)?.narrative),
        },
      },
    },
    vcPitch: {
      slides: normalizeSlides(
        ((root.vcPitch as Record<string, unknown> | undefined)?.slides ?? []),
        VC_SLIDES,
        "VC Slide"
      ),
    },
    boardReport: {
      slides: normalizeSlides(
        ((root.boardReport as Record<string, unknown> | undefined)?.slides ?? []),
        BOARD_SLIDES,
        "Board Slide"
      ),
    },
    dueDiligence: {
      slides: normalizeSlides(
        ((root.dueDiligence as Record<string, unknown> | undefined)?.slides ?? []),
        DD_SLIDES,
        "Due Diligence Slide"
      ),
      keyQuestions: asStringArray((root.dueDiligence as Record<string, unknown> | undefined)?.keyQuestions),
      dataRoomChecklist: asStringArray((root.dueDiligence as Record<string, unknown> | undefined)?.dataRoomChecklist),
    },
  };

  const parsed = investorReportSchema.safeParse(normalized);
  if (!parsed.success) return null;
  return parsed.data;
}
