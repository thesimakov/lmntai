/**
 * Пресет «Веб-студия WebStudio» — снимок проекта из `work/лемнити/ai/web`.
 * Vite + React + отдельные TSX под `src/components/web-studio/*`, только react + lucide-react.
 */

import { LMNT_LAYER_RULES_BLOCK_RU } from "@/lib/lmnt-layer-spec";
import { WEB_STUDIO_LANDING_FILES } from "./web-studio-landing-files";

export const WEB_STUDIO_TEMPLATE_SLUG = "web-studio";

export const WEB_STUDIO_TEMPLATE_NAME = "Веб-студия (агентство)";

export const WEB_STUDIO_TEMPLATE_DESCRIPTION =
  "Сайт веб-студии: шапка, hero, услуги с тарифами, блок «о команде» и цифры, этапы работ, портфолио с фильтром, форма заявки, футер. Исходник: work/лемнити/ai/web.";

export const WEB_STUDIO_DEFAULT_USER_PROMPT = `Лендинг веб-студии на базе шаблона WebStudio. Акцент: фиолетовый, светлый фон.

Сделай:
- Замени бренд WebStudio на клиента; обнови телефон, email, адрес и тексты услуг/кейсов.
- Сохрани якоря: #services, #portfolio, #about, #steps, #contact.
- Правь по файлам: \`Header.tsx\`, \`Hero.tsx\`, \`Services.tsx\`, \`Stats.tsx\`, \`Steps.tsx\`, \`Portfolio.tsx\`, \`CTA.tsx\`, \`Footer.tsx\`, при необходимости \`App.tsx\`.

Не переписывай проект целиком — точечные правки TSX и puck.json в согласии.`;

export const WEB_STUDIO_TEMPLATE_RULES = `ИНСТРУКЦИЯ ПО ШАБЛОНУ «ВЕБ-СТУДИЯ (WEB STUDIO)»:
- Уже собран мини-проект: \`src/main.tsx\` + \`src/App.tsx\` + \`src/components/web-studio/*\` (Vite+React+TS, Tailwind через CDN).
- Якоря в меню: #services, #portfolio, #about, #steps, #contact.
- Запрещены: Next.js, next/link, shadcn, импорты \`@/\` — только относительные пути (\`./App\`, \`./components/web-studio/...\`).
- Разрешены: react, react-dom, lucide-react.
- Ответ: полные файлы \`\`\`tsx:путь\` … \`\`\` только для изменённых файлов.
- \`puck.json\` — макет Puck; держите блоки по смыслу в согласии с секциями.${LMNT_LAYER_RULES_BLOCK_RU}`;

const MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const WEB_STUDIO_PUCK_DATA = {
  root: { props: { title: "WebStudio — секции сайта студии" } },
  content: [
    { type: "Heading" as const, props: { text: "Секция: Header / навигация", level: "3" } },
    { type: "TextBlock" as const, props: { text: "WebStudio, якоря к услугам и контактам.", size: "sm" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: Hero", level: "3" } },
    { type: "Heading" as const, props: { text: "Разрабатываем сайты для роста продаж", level: "1" } },
    {
      type: "TextBlock" as const,
      props: {
        text: "Разработка, дизайн и e-commerce-экспертиза под ключ.",
        size: "md"
      }
    },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Секция: Услуги", level: "3" } },
    { type: "Card" as const, props: { title: "Интернет-магазин", body: "от 150 000₽ • каталог, оплата, интеграции" } },
    { type: "Card" as const, props: { title: "Лендинг", body: "от 25 000₽ • форма заявки, аналитика" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: О команде и цифры", level: "3" } },
    { type: "TextBlock" as const, props: { text: ">16 лет, 470+ проектов, 35% средняя конверсия (плейсхолдеры).", size: "sm" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: Этапы работ", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Пять шагов: от анализа до сопровождения.", size: "sm" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: Портфолио", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Фильтр по типам кейсов и сетка карточек.", size: "sm" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: CTA / контакты", level: "3" } },
    { type: "ButtonBlock" as const, props: { label: "Отправить заявку", href: "#contact", variant: "solid" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: Footer", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Услуги, компания, контакты, юр. ссылки.", size: "sm" } }
  ]
};

export const WEB_STUDIO_PUCK_JSON = JSON.stringify(WEB_STUDIO_PUCK_DATA);

export const WEB_STUDIO_PRESET_FILES: Record<string, string> = {
  "src/main.tsx": MAIN,
  ...WEB_STUDIO_LANDING_FILES,
  "puck.json": WEB_STUDIO_PUCK_JSON
};
