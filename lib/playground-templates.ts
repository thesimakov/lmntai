import type { MessageKey } from "@/lib/i18n";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";

/**
 * Квик-шаблоны панели «Шаблоны» на /playground.
 * Тексты заголовков/промптов — в i18n (`playground_home_tpl_*`).
 * Внешний upstream builder в репозиторий не входит.
 */
export type PlaygroundQuickTemplate = {
  id: string;
  titleKey: MessageKey;
  valueKey: MessageKey;
  /**
   * Категория для handoff (`saveBuilderHandoff`) и чипа в HomeHero
   * (согласуется с `ProjectKind` / `lemnity-ai-prompt-spec`).
   */
  defaultCategory: ProjectKind;
};

export const PLAYGROUND_QUICK_TEMPLATES: readonly PlaygroundQuickTemplate[] = [
  {
    id: "saas",
    titleKey: "playground_home_tpl_saas",
    valueKey: "playground_home_tpl_saas_prompt",
    defaultCategory: "website"
  },
  {
    id: "course",
    titleKey: "playground_home_tpl_course",
    valueKey: "playground_home_tpl_course_prompt",
    defaultCategory: "website"
  },
  {
    id: "fitness",
    titleKey: "playground_home_tpl_fitness",
    valueKey: "playground_home_tpl_fitness_prompt",
    defaultCategory: "website"
  },
  {
    id: "cafe",
    titleKey: "playground_home_tpl_cafe",
    valueKey: "playground_home_tpl_cafe_prompt",
    defaultCategory: "website"
  }
];
