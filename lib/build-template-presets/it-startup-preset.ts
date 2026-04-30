/**
 * Пресет «Стартап IT продукт» (FlowSync) — вариант исходного it (много TSX, без единого HTML)
 * `src/components/landing/*`, в превью только react + lucide-react.
 */

import { LMNT_LAYER_RULES_BLOCK_RU } from "@/lib/lmnt-layer-spec";
import { IT_STARTUP_LANDING_FILES } from "./it-startup-landing-files";

export const IT_STARTUP_TEMPLATE_SLUG = "it-startup";

export const IT_STARTUP_TEMPLATE_NAME = "Стартап IT продукт";

export const IT_STARTUP_TEMPLATE_DESCRIPTION =
  "SaaS / IT-продукт: лендинг FlowSync как в источнике `work/лемнити/ai/it` (секции в отдельных TSX). В студии — Vite-снимок без Next/shadcn. Поменяйте бренд, цены и тексты.";

export const IT_STARTUP_DEFAULT_USER_PROMPT = `Лендинг IT/SaaS на базе шаблона FlowSync. Стиль: светлая сетка, акцентный синий, воздух.

Сделай:
- Название продукта, слоган, hero и все секции; замени плейсхолдеры на данные бренда клиента.
- Сохрани навигацию и якоря: #features, #pricing, #testimonials, #faq.
- Правь по файлам-секциям: \`src/components/landing/Header.tsx\`, \`Hero.tsx\`, \`Logos.tsx\`, \`Features.tsx\`, \`Pricing.tsx\`, \`Testimonials.tsx\`, \`FAQ.tsx\`, \`CTA.tsx\`, \`Footer.tsx\` и при необходимости \`src/App.tsx\`.
- Тарифы, отзывы, FAQ — согласуй с позиционированием (B2B / SMB).

Правь существующие компоненты, не переписывай весь проект с нуля.`;

export const IT_STARTUP_TEMPLATE_RULES = `ИНСТРУКЦИЯ ПО ШАБЛОНУ «СТАРТАП IT ПРОДУКТ» (FlowSync / SaaS):
- Ниже — УЖЕ СОБРАННЫЙ мини-проект: \`src/main.tsx\` + \`src/App.tsx\` + \`src/components/landing/*\` (Vite+React+TS, Tailwind через CDN). Не сливай в один HTML-файл: сохраняй отдельные TSX.
- Секции по файлам: Header (фикс), Hero, Logos, Features (#features), Pricing (#pricing), Testimonials (#testimonials), FAQ (#faq, <details>), CTA, Footer.
- Якоря в шапке: #features, #pricing, #testimonials, #faq — не ломайте без запроса.
- Бренд по умолчанию «FlowSync»; меняйте на бренд пользователя, обновляйте hero, кнопки, футер.
- Кнопки — <button> или <a>, Tailwind; не подключайте Next.js, next/link, shadcn из npm.
- Разрешены только: react, react-dom, lucide-react.
- Ответ: полные файлы \`\`\`tsx:путь\` … \`\`\` для каждого изменённого. Не дублируйте неизменённые.
- \`puck.json\` — визуальный макет в Puck: блоки по смыслу совпадают с секциями; при правках лендинга держи puck в согласовании.${LMNT_LAYER_RULES_BLOCK_RU}`;

const MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const IT_STARTUP_PUCK_DATA = {
  root: { props: { title: "FlowSync — макет по секциям" } },
  content: [
    { type: "Heading" as const, props: { text: "Секция: Header", level: "3" } },
    { type: "TextBlock" as const, props: { text: "FlowSync — логотип, якоря Возможности / Тарифы / Отзывы / FAQ, кнопки Войти и Попробовать бесплатно.", size: "sm" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: Hero", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Новое: ИИ-помощник для автоматизации", size: "sm" } },
    { type: "Heading" as const, props: { text: "Управляйте бизнесом эффективнее с FlowSync", level: "1" } },
    {
      type: "TextBlock" as const,
      props: {
        text: "Объедините все процессы в одной платформе. Автоматизируйте рутину, синхронизируйте команду и принимайте решения на основе данных.",
        size: "md"
      }
    },
    { type: "ButtonBlock" as const, props: { label: "Начать бесплатно", href: "#", variant: "solid" } },
    { type: "ButtonBlock" as const, props: { label: "Смотреть демо", href: "#", variant: "ghost" } },
    { type: "TextBlock" as const, props: { text: "14 дней бесплатно • Без карты • Отмена в любой момент", size: "sm" } },
    {
      type: "ImageBlock" as const,
      props: {
        src: "https://picsum.photos/seed/flowsync-hero/960/540",
        alt: "Интерактивная панель управления",
        width: "full"
      }
    },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Секция: Logos", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Нам доверяют более 1000+ компаний по всей России (логотипы-плейсхолдеры).", size: "sm" } },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Секция: Features", level: "3" } },
    { type: "Heading" as const, props: { text: "Всё для эффективного управления", level: "2" } },
    { type: "TextBlock" as const, props: { text: "Инструменты, чтобы команда работала быстрее и достигала большего.", size: "md" } },
    {
      type: "Card" as const,
      props: {
        title: "Аналитика в реальном времени",
        body: "Отслеживайте ключевые метрики бизнеса и принимайте решения на основе актуальных данных."
      }
    },
    {
      type: "Card" as const,
      props: {
        title: "Командная работа",
        body: "Объедините отделы в единое пространство с задачами, комментариями и общими файлами."
      }
    },
    {
      type: "Card" as const,
      props: {
        title: "Автоматизация процессов",
        body: "Сценарии для рутины — сэкономьте до 10 часов в неделю."
      }
    },
    {
      type: "Card" as const,
      props: {
        title: "Безопасность данных",
        body: "Шифрование, 2FA, резервное копирование."
      }
    },
    {
      type: "Card" as const,
      props: {
        title: "Учёт времени",
        body: "Трекер по проектам и отчёты по сотрудникам."
      }
    },
    {
      type: "Card" as const,
      props: {
        title: "Интеграции",
        body: "50+ сервисов: 1С, Битрикс, Telegram, Slack…"
      }
    },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Секция: Pricing", level: "3" } },
    { type: "Heading" as const, props: { text: "Простые и понятные тарифы", level: "2" } },
    { type: "TextBlock" as const, props: { text: "Масштабируйтесь без переплат.", size: "md" } },
    { type: "Card" as const, props: { title: "Старт", body: "Бесплатно — до 5 пользователей, 3 проекта, базовая аналитика, email, 1 ГБ." } },
    { type: "Card" as const, props: { title: "Бизнес (популярный)", body: "₽2 990/мес — до 25 пользователей, безлимит проектов, API, 50 ГБ, автоматизации." } },
    { type: "Card" as const, props: { title: "Корпорация", body: "₽9 990/мес — безлимит, менеджер, 500 ГБ, on-premise." } },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Секция: Testimonials", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Что говорят клиенты (карточки с рейтингом).", size: "sm" } },
    { type: "Card" as const, props: { title: "Алексей Петров, CEO", body: "FlowSync изменил, как мы работаем — координация автоматизирована." } },
    { type: "Card" as const, props: { title: "Мария Иванова, COO", body: "Лучшая инвестиция в инструменты — окупилось за месяц." } },
    { type: "Card" as const, props: { title: "Дмитрий Козлов", body: "Освоили за день, без длинного обучения." } },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Секция: FAQ", level: "3" } },
    { type: "Card" as const, props: { title: "Пробный период?", body: "Бесплатно до 5 человек, 14 дней платных без карты." } },
    { type: "Card" as const, props: { title: "Миграция", body: "Помощь поддержки при переносе из других систем." } },
    { type: "Card" as const, props: { title: "1С и интеграции", body: "50+ интеграций через API и коннекторы." } },
    { type: "Spacer" as const, props: { height: 20 } },
    { type: "Heading" as const, props: { text: "Секция: CTA", level: "3" } },
    { type: "Heading" as const, props: { text: "Готовы начать?", level: "2" } },
    { type: "ButtonBlock" as const, props: { label: "Начать бесплатно", href: "#", variant: "solid" } },
    { type: "ButtonBlock" as const, props: { label: "Запросить демо", href: "#", variant: "ghost" } },
    { type: "Spacer" as const, props: { height: 16 } },
    { type: "Heading" as const, props: { text: "Секция: Footer", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Колонки ссылок Продукт / Компания / Ресурсы / Право, копирайт FlowSync, соцсети.", size: "sm" } }
  ]
};

export const IT_STARTUP_PUCK_JSON = JSON.stringify(IT_STARTUP_PUCK_DATA);

export const IT_STARTUP_PRESET_FILES: Record<string, string> = {
  "src/main.tsx": MAIN,
  ...IT_STARTUP_LANDING_FILES,
  "puck.json": IT_STARTUP_PUCK_JSON
};
