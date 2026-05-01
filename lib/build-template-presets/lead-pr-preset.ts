/**
 * 1:1 клон шаблона из папки Desktop `work/лемнити/ai/pr`.
 * Оригинальные файлы перенесены без правок в `template-sources/pr` и сериализованы в PR_CLONE_FILES.
 * Для превью добавлен только Vite-совместимый entry (`src/main.tsx`) поверх неизменённой структуры.
 */

import { LMNT_LAYER_RULES_BLOCK_RU } from "@/lib/lmnt-layer-spec";
import { PR_CLONE_FILES } from "./lead-pr-clone-files";

export const PR_LEAD_TEMPLATE_SLUG = "lead-pr-sales";

export const PR_LEAD_TEMPLATE_NAME = "Лиды и рост продаж (PR)";

export const PR_LEAD_TEMPLATE_DESCRIPTION =
  "1:1 клон папки ai/pr: app/page.tsx, sections, ui-компоненты и утилиты сохранены как в исходнике. Подходит для пофайлового редактирования в редакторе.";

export const PR_LEAD_DEFAULT_USER_PROMPT = `Шаблон из папки ai/pr (lead generation).

Сделай:
- Меняй тексты/оффер/контакты и секции точечно, сохраняя текущую файловую структуру.
- Приоритетно правь: \`app/page.tsx\`, \`components/sections/*\`, \`components/lead-form.tsx\`, \`components/countdown-timer.tsx\`.
- Не переписывай всё в один файл и не ломай импорты \`@/\`.

Формат ответа: только изменённые файлы.`;

export const PR_LEAD_TEMPLATE_RULES = `ИНСТРУКЦИЯ ПО ШАБЛОНУ «ЛИДЫ И РОСТ ПРОДАЖ (PR) — КЛОН AI/PR»:
- Ниже проект передан 1:1 из исходной папки: \`app/page.tsx\`, \`components/*\`, \`hooks/*\`, \`lib/utils.ts\`, css/json config-файлы.
- Разрешены импорты с алиасом \`@/\` (например \`@/components/sections/hero-section\`).
- Для правок держите исходную структуру: изменяйте существующие файлы, не схлопывайте секции в один файл.
- Разрешены: react, react-dom, lucide-react и уже используемые зависимости из проекта.
- Ответ: только изменённые файлы в блоках вида \`\`\`tsx:путь\` ... \`\`\`.
- \`puck.json\` — отдельная визуальная схема секций, держите её в согласии с контентом.${LMNT_LAYER_RULES_BLOCK_RU}`;

const MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LandingPage from "../app/page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>
);
`;

const PR_LEAD_PUCK_DATA = {
  root: { props: { title: "PR lead — ai/pr clone" } },
  content: [
    { type: "Heading" as const, props: { text: "Секция: Hero", level: "3" } },
    { type: "Heading" as const, props: { text: "Увеличим продажи вашего бизнеса на 150% за 14 дней", level: "1" } },
    {
      type: "TextBlock" as const,
      props: {
        text: "Структура клона: Hero, Problems, Solution, Benefits, Steps, Testimonials, CTA, Footer.",
        size: "md"
      }
    },
    { type: "Spacer" as const, props: { height: 18 } },
    { type: "Card" as const, props: { title: "Проблемы", body: "Блок с болью клиента и иконками." } },
    { type: "Card" as const, props: { title: "Решение", body: "Описание продукта/подхода." } },
    { type: "Card" as const, props: { title: "Преимущества", body: "Ключевые выгоды и доказательства." } },
    { type: "Card" as const, props: { title: "Отзывы", body: "Социальное доказательство." } },
    { type: "Spacer" as const, props: { height: 18 } },
    { type: "ButtonBlock" as const, props: { label: "Получить консультацию", href: "#", variant: "solid" } },
    { type: "TextBlock" as const, props: { text: "Контент и визуал редактируются в исходных файлах клона ai/pr.", size: "sm" } }
  ]
};

export const PR_LEAD_PUCK_JSON = JSON.stringify(PR_LEAD_PUCK_DATA);

export const PR_LEAD_PRESET_FILES: Record<string, string> = {
  "src/main.tsx": MAIN,
  ...PR_CLONE_FILES,
  "puck.json": PR_LEAD_PUCK_JSON
};
