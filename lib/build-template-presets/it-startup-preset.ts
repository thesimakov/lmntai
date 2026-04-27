/**
 * Пресет «Стартап IT продукт» (FlowSync) — адаптация Next/ shadcn → Vite+React+TSX для esbuild-превью.
 * Импорты: только `react`, `react-dom`, `lucide-react` (см. massage-preset).
 * Исходник: work/лемнити/ai/it
 */

export const IT_STARTUP_TEMPLATE_SLUG = "it-startup";

export const IT_STARTUP_TEMPLATE_NAME = "Стартап IT продукт";

export const IT_STARTUP_TEMPLATE_DESCRIPTION =
  "SaaS / IT-продукт: лендинг в духе FlowSync — шапка, hero, логи доверия, фичи, тарифы, отзывы, FAQ, CTA, футер. Поменяйте бренд, цены и копирайт.";

export const IT_STARTUP_DEFAULT_USER_PROMPT = `Лендинг IT/SaaS на базе шаблона FlowSync. Стиль: светлая сетка, акцентный синий, воздух.

Сделай:
- Название продукта, слоган, hero и все секции; замени плейсхолдеры на данные бренда клиента.
- Сохрани навигацию и якоря: #features, #pricing, #testimonials, #faq.
- Тарифы, отзывы, FAQ — согласуй с позиционированием (B2B / SMB).
- Не ломай структуру файлов: правь \`src/App.tsx\` и при необходимости выноси в \`src/components/...\` мелкие блоки, если дублирование.

Правь существующие компоненты, не переписывай весь проект с нуля.`;

export const IT_STARTUP_TEMPLATE_RULES = `ИНСТРУКЦИЯ ПО ШАБЛОНУ «СТАРТАП IT ПРОДУКТ» (FlowSync / SaaS):
- Ниже — УЖЕ СОБРАННЫЙ мини-проект (Vite+React+TS, Tailwind через CDN). Редактируйте файлы по запросу, не создавайте пустой репозиторий.
- Сохраняйте сетку: Header (фикс), Hero с бейджем и CTA, блок логотипов, Features (#features), Pricing (#pricing), Testimonials (#testimonials), FAQ (#faq, раскрывающиеся пункты), CTA, Footer.
- Якоря ссылок в шапке: #features, #pricing, #testimonials, #faq — не ломайте без запроса.
- Бренд по умолчанию «FlowSync»; меняйте на бренд пользователя, обновляйте hero, кнопки, футер и юр. ссылки-заглушки.
- Кнопки — обычные <button> или <a>, стили на Tailwind; не подключайте Next.js, next/link, shadcn из npm.
- Разрешены только зависимости превью: react, react-dom, lucide-react.
- Ответ: полные файлы в фенсах \`\`\`tsx:путь\` … \`\`\` для каждого изменённого файла. Не дублируйте неизменённые.`;

const MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const APP = `import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Globe,
  Menu,
  Play,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
  Zap
} from "lucide-react";

const nav = [
  { href: "#features", label: "Возможности" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#testimonials", label: "Отзывы" },
  { href: "#faq", label: "FAQ" }
];

const featureItems = [
  { Icon: BarChart3, title: "Аналитика в реальном времени", text: "Отслеживайте метрики и принимайте решения на основе актуальных данных." },
  { Icon: Users, title: "Командная работа", text: "Единое пространство: задачи, комментарии, общие файлы." },
  { Icon: Zap, title: "Автоматизация", text: "Сценарии для рутины — до 10 часов экономии в неделю." },
  { Icon: Shield, title: "Безопасность", text: "Шифрование, 2FA, бэкапы." },
  { Icon: Clock, title: "Учёт времени", text: "Трекер по проектам и отчёты." },
  { Icon: Globe, title: "Интеграции", text: "50+ сервисов: 1С, Битрикс, Telegram, Slack…" }
];

const plans = [
  { name: "Старт", price: "0", desc: "Для команд до 5 человек", popular: false, cta: "Начать бесплатно", features: ["До 5 пользователей", "3 проекта", "Базовая аналитика", "Email поддержка", "1 ГБ"] },
  { name: "Бизнес", price: "2 990", desc: "Для растущих компаний", popular: true, cta: "Попробовать 14 дней", features: ["До 25 пользователей", "Безлимит проектов", "Расширенная аналитика", "Приоритет", "50 ГБ", "Автоматизации", "API"] },
  { name: "Корпорация", price: "9 990", desc: "Крупные организации", popular: false, cta: "Связаться с нами", features: ["Безлимит пользователей", "Безлимит проектов", "Кастомная аналитика", "Менеджер", "500 ГБ", "On-premise"] }
];

const testimonials = [
  { name: "Алексей Петров", role: "CEO, TechStart", text: "FlowSync изменил, как мы работаем. Координация автоматизирована.", r: 5 },
  { name: "Мария Иванова", role: "COO, RetailPro", text: "Лучшая инвестиция в инструменты. Окупилось за месяц.", r: 5 },
  { name: "Дмитрий Козлов", role: "Основатель, DesignStudio", text: "Освоили за день, без длинного обучения.", r: 5 }
];

const faqs = [
  { q: "Можно ли попробовать бесплатно?", a: "Да, бесплатный тариф до 5 человек и 14 дней платных без карты." },
  { q: "Как миграция данных?", a: "Помощь в переносе из других систем — поддержка проведёт." },
  { q: "Есть ли 1С?", a: "Да, и ещё 50+ интеграций через API и коннекторы." },
  { q: "Насколько безопасно?", a: "AES-256, дата-центры в РФ, бэкапы, 152-ФЗ." },
  { q: "On-premise?", a: "На тарифе «Корпорация» — опция на своих серверах." }
];

const companies = ["Сбербанк", "Яндекс", "Тинькофф", "VK", "Ozon", "Wildberries"];

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">FlowSync</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-slate-500 transition hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button type="button" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Войти
            </button>
            <button
              type="button"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-500"
            >
              Попробовать бесплатно
            </button>
          </div>
          <button type="button" className="p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Меню">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open ? (
          <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {nav.map((l) => (
                <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600" onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-3">
                <button type="button" className="w-full rounded-lg py-2 text-sm text-slate-600">
                  Войти
                </button>
                <button type="button" className="w-full rounded-lg bg-sky-600 py-2 text-sm text-white">
                  Попробовать бесплатно
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
              <Sparkles className="h-4 w-4" />
              <span>Новое: ИИ-помощник для автоматизации</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-balance sm:text-5xl lg:text-6xl">
              Управляйте бизнесом <span className="text-sky-600">эффективнее</span> с FlowSync
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg text-slate-500 sm:text-xl">
              Объедините все процессы в одной платформе. Автоматизируйте рутину, синхронизируйте команду и принимайте решения на основе
              данных.
            </p>
            <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-base font-medium text-white shadow transition hover:bg-sky-500 sm:w-auto"
              >
                Начать бесплатно
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-base font-medium text-slate-800 transition hover:bg-slate-50 sm:w-auto"
              >
                <Play className="h-4 w-4" />
                Смотреть демо
              </button>
            </div>
            <p className="text-sm text-slate-500">14 дней бесплатно • Без карты • Отмена в любой момент</p>
          </div>

          <div className="relative mt-16">
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-white via-transparent to-transparent" />
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-sky-50 via-white to-slate-100">
                <div className="px-4 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-100">
                    <Sparkles className="h-10 w-10 text-sky-600" />
                  </div>
                  <p className="text-lg text-slate-500">Интерактивная панель управления</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/80 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-center text-sm text-slate-500">Нам доверяют 1000+ компаний по всей России</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-xl font-bold text-slate-300 md:gap-16">
            {companies.map((c) => (
              <span key={c} className="transition hover:text-slate-500">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-balance sm:text-4xl">Всё для эффективного управления</h2>
            <p className="text-pretty text-lg text-slate-500">Инструменты, чтобы команда работала быстрее и достигала большего.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-sky-200 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 transition group-hover:bg-sky-100">
                  <f.Icon className="h-6 w-6 text-sky-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-slate-50/50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-balance sm:text-4xl">Простые и понятные тарифы</h2>
            <p className="text-pretty text-lg text-slate-500">Масштабируйтесь без переплат.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 md:items-start lg:gap-8">
            {plans.map((p) => (
              <div
                key={p.name}
                className={
                  "relative flex flex-col rounded-2xl border bg-white p-6 lg:p-8 " +
                  (p.popular ? "scale-105 border-sky-600 shadow-lg" : "border-slate-200")
                }
              >
                {p.popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white">
                    Популярный
                  </div>
                ) : null}
                <h3 className="mb-2 text-xl font-bold">{p.name}</h3>
                <p className="mb-6 text-sm text-slate-500">{p.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{p.price === "0" ? "Бесплатно" : "₽" + p.price}</span>
                  {p.price !== "0" ? <span className="text-slate-500">/мес</span> : null}
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={
                    "w-full rounded-lg py-2.5 text-sm font-medium " +
                    (p.popular ? "bg-sky-600 text-white hover:bg-sky-500" : "border border-slate-200 bg-white hover:bg-slate-50")
                  }
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Что говорят клиенты</h2>
            <p className="text-lg text-slate-500">1000+ компаний выбрали FlowSync.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: t.r }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-sky-500 text-sky-500" />
                  ))}
                </div>
                <p className="mb-6 text-slate-800">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50">
                    <span className="font-semibold text-sky-600">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-slate-50/50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Часто задаваемые вопросы</h2>
            <p className="text-lg text-slate-500">Не нашли ответ? support@flowsync.ru</p>
          </div>
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group border-slate-200 p-0">
                <summary className="cursor-pointer list-none px-5 py-4 text-left font-medium text-slate-900 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="px-5 pb-4 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-sky-600 p-8 text-center sm:p-12 lg:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Готовы начать?</h2>
              <p className="mb-8 mx-auto max-w-xl text-lg text-sky-100">Присоединяйтесь к тысячам компаний, которые растут с FlowSync.</p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-sky-600 shadow sm:w-auto"
                >
                  Начать бесплатно
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-transparent px-6 py-3 font-medium text-white hover:bg-white/10 sm:w-auto"
                >
                  Запросить демо
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5 md:gap-12">
            <div className="col-span-2">
              <a href="#" className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">FlowSync</span>
              </a>
              <p className="max-w-xs text-sm leading-relaxed text-slate-500">Умная платформа для управления бизнесом. Автоматизируйте, анализируйте, масштабируйтесь.</p>
            </div>
            {[
              {
                t: "Продукт",
                links: [
                  ["Возможности", "#features"],
                  ["Тарифы", "#pricing"],
                  ["Интеграции", "#"]
                ]
              },
              { t: "Компания", links: [["О нас", "#"], ["Блог", "#"], ["Карьера", "#"], ["Контакты", "#"]] },
              { t: "Ресурсы", links: [["Документация", "#"], ["Помощь", "#"], ["API", "#"], ["Статус", "#"]] },
              { t: "Право", links: [["Политика", "#"], ["Условия", "#"], ["Cookie", "#"]] }
            ].map((col) => (
              <div key={col.t}>
                <h3 className="mb-3 text-sm font-semibold">{col.t}</h3>
                <ul className="space-y-2">
                  {col.links.map(([a, b]) => (
                    <li key={a}>
                      <a href={b} className="text-sm text-slate-500 transition hover:text-slate-900">
                        {a}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
            <p className="text-sm text-slate-500">© \${new Date().getFullYear()} FlowSync. Все права защищены.</p>
            <div className="flex gap-4 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-800">
                Telegram
              </a>
              <a href="#" className="hover:text-slate-800">
                VK
              </a>
              <a href="#" className="hover:text-slate-800">
                YouTube
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
`;

export const IT_STARTUP_PRESET_FILES: Record<string, string> = {
  "src/main.tsx": MAIN,
  "src/App.tsx": APP
};
