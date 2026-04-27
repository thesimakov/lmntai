/** Язык интерфейса Lemnity (согласован с `UiLanguage` в веб-приложении). */
export type AppUiLanguage = "ru" | "en" | "tg";

export function normalizeAppUiLanguage(raw: string | undefined | null): AppUiLanguage {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "en" || s === "tg" || s === "ru") return s;
  return "ru";
}

const PLANNER: Record<AppUiLanguage, { running: string; completed: string }> = {
  ru: { running: "Планирование сборки", completed: "Планирование сборки" },
  en: { running: "Planning the build", completed: "Planning the build" },
  tg: { running: "Нақшаи ҷамъсозӣ", completed: "Нақшаи ҷамъсозӣ" }
};

const PRESENTATION: Record<AppUiLanguage, { outline: string; pptx: string; pdf: string }> = {
  ru: {
    outline: "Структура слайдов",
    pptx: "Сборка PowerPoint (.pptx)",
    pdf: "Экспорт PDF"
  },
  en: {
    outline: "Slide structure",
    pptx: "Building PowerPoint (.pptx)",
    pdf: "Exporting PDF"
  },
  tg: {
    outline: "Сохтори слайдҳо",
    pptx: "Омодасозии PowerPoint (.pptx)",
    pdf: "Содироти PDF"
  }
};

export function plannerStepLabel(lang: AppUiLanguage, phase: "running" | "completed"): string {
  return PLANNER[lang][phase];
}

export function presentationStepLabel(
  lang: AppUiLanguage,
  key: "outline" | "pptx" | "pdf"
): string {
  return PRESENTATION[lang][key];
}

export function appLanguageInstruction(lang: AppUiLanguage): { code: string; labelEn: string } {
  switch (lang) {
    case "en":
      return { code: "en", labelEn: "English" };
    case "tg":
      return { code: "tg", labelEn: "Tajik (Cyrillic)" };
    default:
      return { code: "ru", labelEn: "Russian" };
  }
}
