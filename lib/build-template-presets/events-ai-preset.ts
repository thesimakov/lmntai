import { LMNT_LAYER_RULES_BLOCK_RU } from "@/lib/lmnt-layer-spec";
import { EVENTS_AI_CLONE_FILES } from "./events-ai-clone-files";

export const EVENTS_AI_TEMPLATE_SLUG = "events";
export const EVENTS_AI_TEMPLATE_NAME = "События";
export const EVENTS_AI_TEMPLATE_DESCRIPTION =
  "События: 1:1 клон исходной папки ai/events (template-sources/events), включая страницы, компоненты, стили и public.";

export const EVENTS_AI_DEFAULT_USER_PROMPT = `Сайт «События» на базе клона ai/events (EventHub-стиль).

Сделай:
- Точечно меняй тексты, карточки мероприятий и категории, сохраняя файловую структуру клона.
- Приоритетно: \`app/page.tsx\`, \`components/*\`, \`lib/events-data.ts\`.
- Не удаляй ассеты и не схлопывай проект в один файл.

Только изменённые файлы в ответе.`;

export const EVENTS_AI_TEMPLATE_RULES = `ИНСТРУКЦИЯ ПО ШАБЛОНУ «СОБЫТИЯ»:
- Это 1:1 клон папки ai/events: \`app/*\`, \`components/*\`, \`hooks/*\`, \`lib/*\`, \`styles/*\`, \`public/*\`, конфиг css/json рядом.
- Для превью добавлен только entry \`src/main.tsx\`: он повторяет разметку \`app/layout.tsx\` (Header, \`main\` с главной страницей, Footer) без второго уровня \`<html>\`/\`<body>\` — чтобы избежать вложенного документа в iframe-превью. Исправления в шапке/подвале правьте в \`components/header.tsx\` и \`components/footer.tsx\` (при необходимости синхронно с разметкой в \`app/layout.tsx\`).
- Разрешены импорты \`@/\`.
- Ответ: только изменённые файлы в блоках \`\`\`tsx:путь\`\`\`.
- Синхронизируй ключевые блоки текста с \`puck.json\` при правках.${LMNT_LAYER_RULES_BLOCK_RU}`;

const MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import HomePage from "../app/page";

function PreviewShell() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <HomePage />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreviewShell />
  </StrictMode>
);
`;

const EVENTS_AI_PUCK_DATA = {
  root: { props: { title: "События — каталог мероприятий" } },
  content: [
    { type: "Heading" as const, props: { text: "Header", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Навигация EventHub.", size: "sm" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Hero", level: "3" } },
    {
      type: "Heading" as const,
      props: { text: "Найди мероприятие, которое вдохновит", level: "1" }
    },
    { type: "TextBlock" as const, props: { text: "Поиск, категории, ближайшие события.", size: "md" } },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Категории и карточки", level: "3" } },
    {
      type: "Card" as const,
      props: { title: "Конференции и воркшопы", body: "Список и фильтры мероприятий как в коде шаблона." }
    },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Footer", level: "3" } }
  ]
};

export const EVENTS_AI_PUCK_JSON = JSON.stringify(EVENTS_AI_PUCK_DATA);

export const EVENTS_AI_PRESET_FILES: Record<string, string> = {
  "src/main.tsx": MAIN,
  ...EVENTS_AI_CLONE_FILES,
  "puck.json": EVENTS_AI_PUCK_JSON
};
