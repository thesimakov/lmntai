/**
 * Файлы лендинга IT-шаблона (адаптация проекта it с Desktop):
 * много .tsx в src/components/landing/* — без единого HTML, только react + lucide-react.
 */
export const IT_STARTUP_LANDING_FILES: Record<string, string> = {
  "src/components/landing/Header.tsx": `import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Возможности" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#testimonials", label: "Отзывы" },
  { href: "#faq", label: "FAQ" }
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header data-lmnt-layer="nav" className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">FlowSync</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                {link.label}
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

          <button
            type="button"
            className="p-2 text-slate-900 md:hidden"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Меню"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-b border-slate-200 bg-white md:hidden">
          <nav className="flex flex-col gap-4 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
              <button type="button" className="w-full rounded-lg py-2 text-sm text-slate-600">
                Войти
              </button>
              <button type="button" className="w-full rounded-lg bg-sky-600 py-2 text-sm text-white">
                Попробовать бесплатно
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
`,

  "src/components/landing/Hero.tsx": `import { ArrowRight, Play, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
            <Sparkles className="h-4 w-4" />
            <span>Новое: ИИ-помощник для автоматизации</span>
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
            Управляйте бизнесом <span className="text-sky-600">эффективнее</span> с FlowSync
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg leading-relaxed text-slate-500 sm:text-xl">
            Объедините все процессы в одной платформе. Автоматизируйте рутину, синхронизируйте команду и принимайте решения на
            основе данных.
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
  );
}
`,

  "src/components/landing/Logos.tsx": `export function Logos() {
  const companies = ["Сбербанк", "Яндекс", "Тинькофф", "VK", "Ozon", "Wildberries"];

  return (
    <section className="border-y border-slate-200 bg-slate-50/80 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-8 text-center text-sm text-slate-500">Нам доверяют более 1000+ компаний по всей России</p>
        <div className="flex flex-wrap items-center justify-center gap-8 text-xl font-bold text-slate-300 transition md:gap-16">
          {companies.map((c) => (
            <span key={c} className="hover:text-slate-500">
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/landing/Features.tsx": `import { BarChart3, Users, Zap, Shield, Clock, Globe } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Аналитика в реальном времени",
    description:
      "Отслеживайте ключевые метрики бизнеса и принимайте решения на основе актуальных данных."
  },
  {
    icon: Users,
    title: "Командная работа",
    description: "Объедините отделы в единое пространство с задачами, комментариями и общими файлами."
  },
  {
    icon: Zap,
    title: "Автоматизация процессов",
    description: "Настройте автоматические сценарии для рутинных задач и сэкономьте до 10 часов в неделю."
  },
  {
    icon: Shield,
    title: "Безопасность данных",
    description: "Шифрование на уровне банков, двухфакторная аутентификация и резервное копирование."
  },
  {
    icon: Clock,
    title: "Учёт времени",
    description: "Встроенный трекер времени для проектов с детальными отчётами по сотрудникам."
  },
  {
    icon: Globe,
    title: "Интеграции",
    description: "Подключите 50+ популярных сервисов: 1С, Битрикс, Telegram, Slack и другие."
  }
];

export function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-balance text-slate-900 sm:text-4xl">Всё для эффективного управления</h2>
          <p className="text-pretty text-lg text-slate-500">
            Инструменты, которые помогут вашей команде работать быстрее и достигать большего.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-sky-200 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 transition group-hover:bg-sky-100">
                <f.icon className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="leading-relaxed text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/landing/Pricing.tsx": `import { Check } from "lucide-react";

const plans = [
  {
    name: "Старт",
    price: "0",
    description: "Для небольших команд до 5 человек",
    features: [
      "До 5 пользователей",
      "3 проекта",
      "Базовая аналитика",
      "Email поддержка",
      "1 ГБ хранилище"
    ],
    cta: "Начать бесплатно",
    popular: false
  },
  {
    name: "Бизнес",
    price: "2 990",
    description: "Для растущих компаний",
    features: [
      "До 25 пользователей",
      "Безлимит проектов",
      "Расширенная аналитика",
      "Приоритетная поддержка",
      "50 ГБ хранилище",
      "Автоматизации",
      "Интеграции API"
    ],
    cta: "Попробовать 14 дней",
    popular: true
  },
  {
    name: "Корпорация",
    price: "9 990",
    description: "Для крупных организаций",
    features: [
      "Безлимит пользователей",
      "Безлимит проектов",
      "Кастомная аналитика",
      "Персональный менеджер",
      "500 ГБ хранилища",
      "Расширенные автоматизации",
      "SLA 99.9%",
      "On-premise опция"
    ],
    cta: "Связаться с нами",
    popular: false
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50/50 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-balance text-slate-900 sm:text-4xl">Простые и понятные тарифы</h2>
          <p className="text-pretty text-lg text-slate-500">
            Выберите план, который подходит вашему бизнесу. Масштабируйтесь без переплат.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:items-start lg:gap-8">
          {plans.map((p) => (
            <div
              key={p.name}
              className={
                "relative flex flex-col rounded-2xl border bg-white p-6 lg:p-8 " +
                (p.popular ? "z-[1] scale-105 border-sky-600 shadow-lg" : "border-slate-200")
              }
            >
              {p.popular ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white">
                  Популярный
                </div>
              ) : null}

              <h3 className="mb-2 text-xl font-bold text-slate-900">{p.name}</h3>
              <p className="mb-6 text-sm text-slate-500">{p.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">
                  {p.price === "0" ? "Бесплатно" : "₽" + p.price}
                </span>
                {p.price !== "0" ? <span className="text-slate-500">/месяц</span> : null}
              </div>

              <ul className="mb-8 grow space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
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
  );
}
`,

  "src/components/landing/Testimonials.tsx": `import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Алексей Петров",
    role: "CEO, TechStart",
    content:
      "FlowSync полностью изменил то, как мы работаем. Раньше тратили часы на координацию команды, теперь всё автоматизировано.",
    rating: 5
  },
  {
    name: "Мария Иванова",
    role: "Операционный директор, RetailPro",
    content: "Лучшая инвестиция в инструменты за последние годы. ROI окупился за первый месяц использования.",
    rating: 5
  },
  {
    name: "Дмитрий Козлов",
    role: "Основатель, DesignStudio",
    content: "Простой интерфейс, мощные функции. Команда освоила платформу за один день без обучения.",
    rating: 5
  }
];

export function Testimonials() {
  return (
    <section id="testimonials" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-balance text-slate-900 sm:text-4xl">Что говорят наши клиенты</h2>
          <p className="text-pretty text-lg text-slate-500">Более 1000 компаний уже выбрали FlowSync для своего бизнеса.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-sky-500 text-sky-500" />
                ))}
              </div>
              <p className="mb-6 leading-relaxed text-slate-800">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50">
                  <span className="font-semibold text-sky-600">{t.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/landing/FAQ.tsx": `const faqs = [
  {
    q: "Можно ли попробовать FlowSync бесплатно?",
    a: "Да! У нас есть бесплатный тариф для команд до 5 человек, а также 14-дневный пробный период для платных тарифов без привязки карты."
  },
  {
    q: "Как происходит миграция данных?",
    a: "Мы предоставляем бесплатную помощь в миграции данных из других систем. Наша команда поддержки проведёт вас через весь процесс."
  },
  {
    q: "Есть ли интеграция с 1С?",
    a: "Да, FlowSync интегрируется с 1С, Битрикс24, AmoCRM, Telegram, Slack и более чем 50 другими сервисами через API и готовые коннекторы."
  },
  {
    q: "Насколько безопасны мои данные?",
    a: "Мы используем шифрование AES-256, храним данные в сертифицированных дата-центрах на территории РФ, делаем ежедневные резервные копии и соответствуем требованиям 152-ФЗ."
  },
  {
    q: "Можно ли развернуть FlowSync на своих серверах?",
    a: "Да, на тарифе «Корпорация» доступна опция on-premise установки с полным контролем над инфраструктурой."
  }
];

export function FAQ() {
  return (
    <section id="faq" className="bg-slate-50/50 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-balance text-slate-900 sm:text-4xl">Часто задаваемые вопросы</h2>
          <p className="text-pretty text-lg text-slate-500">Не нашли ответ? Напишите нам на support@flowsync.ru</p>
        </div>

        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="cursor-pointer list-none px-5 py-4 text-left font-medium text-slate-900 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                {f.q}
              </summary>
              <p className="px-5 pb-4 text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/landing/CTA.tsx": `import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl bg-sky-600 p-8 text-center sm:p-12 lg:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="relative z-10">
            <h2 className="mb-4 text-3xl font-bold text-balance text-white sm:text-4xl">Готовы начать?</h2>
            <p className="mx-auto mb-8 max-w-xl text-pretty text-lg text-sky-100">
              Присоединяйтесь к тысячам компаний, которые уже используют FlowSync для роста своего бизнеса.
            </p>
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
  );
}
`,

  "src/components/landing/Footer.tsx": `import { Zap } from "lucide-react";

const footerLinks = {
  product: {
    title: "Продукт",
    links: [
      { label: "Возможности", href: "#features" },
      { label: "Тарифы", href: "#pricing" },
      { label: "Интеграции", href: "#" }
    ]
  },
  company: {
    title: "Компания",
    links: [
      { label: "О нас", href: "#" },
      { label: "Блог", href: "#" },
      { label: "Карьера", href: "#" },
      { label: "Контакты", href: "#" }
    ]
  },
  resources: {
    title: "Ресурсы",
    links: [
      { label: "Документация", href: "#" },
      { label: "Помощь", href: "#" },
      { label: "API", href: "#" },
      { label: "Статус", href: "#" }
    ]
  },
  legal: {
    title: "Правовая информация",
    links: [
      { label: "Политика конфиденциальности", href: "#" },
      { label: "Условия использования", href: "#" },
      { label: "Cookie", href: "#" }
    ]
  }
};

export function Footer() {
  const y = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 md:gap-12">
          <div className="col-span-2">
            <a href="#" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">FlowSync</span>
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              Умная платформа для управления бизнесом. Автоматизируйте, анализируйте, масштабируйтесь.
            </p>
          </div>

          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-slate-500 transition hover:text-slate-900">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {y} FlowSync. Все права защищены.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-800">Telegram</a>
            <a href="#" className="hover:text-slate-800">VK</a>
            <a href="#" className="hover:text-slate-800">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
`,

  "src/App.tsx": `import { Header } from "./components/landing/Header";
import { Hero } from "./components/landing/Hero";
import { Logos } from "./components/landing/Logos";
import { Features } from "./components/landing/Features";
import { Pricing } from "./components/landing/Pricing";
import { Testimonials } from "./components/landing/Testimonials";
import { FAQ } from "./components/landing/FAQ";
import { CTA } from "./components/landing/CTA";
import { Footer } from "./components/landing/Footer";

export default function App() {
  return (
    <div data-lmnt-layout-root className="min-h-screen bg-white text-slate-900">
      <Header />
      <main data-lmnt-layer="base" className="min-h-screen">
        <Hero />
        <Logos />
        <Features />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
        <Footer />
      </main>
    </div>
  );
}
`
};
