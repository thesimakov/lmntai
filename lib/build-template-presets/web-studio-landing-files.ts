/**
 * Снимок из `work/лемнити/ai/web` (Next + shadcn). В превью: Vite + react + lucide-react, Tailwind CDN.
 */
export const WEB_STUDIO_LANDING_FILES: Record<string, string> = {
  "src/components/web-studio/Header.tsx": `import { useState } from "react";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Услуги", href: "#services" },
  { name: "Портфолио", href: "#portfolio" },
  { name: "О нас", href: "#about" },
  { name: "Этапы работ", href: "#steps" },
  { name: "Контакты", href: "#contact" }
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header data-lmnt-layer="nav" className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <span className="text-lg font-bold text-white">W</span>
            </div>
            <span className="text-xl font-bold text-slate-900">WebStudio</span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
                {item.name}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">+7 (800) 555-35-35</span>
            <button type="button" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-500">
              Обсудить проект
            </button>
          </div>

          <button type="button" className="p-2 text-slate-900 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Меню">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="flex flex-col gap-4 px-4 py-6">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-lg font-medium text-slate-600" onClick={() => setOpen(false)}>
                {item.name}
              </a>
            ))}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <span className="w-full rounded-lg border border-slate-200 py-2 text-center text-sm">+7 (800) 555-35-35</span>
              <button type="button" className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white">
                Обсудить проект
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
`,

  "src/components/web-studio/Hero.tsx": `import { ArrowRight, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-violet-100/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-600" />
              <span className="text-sm font-medium text-violet-700">Веб-студия WebStudio</span>
            </div>

            <h1 className="text-balance text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Разрабатываем сайты для <span className="text-violet-600">роста ваших продаж</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-slate-500">
              Объединяем разработку, дизайн и экспертизу в онлайн-торговле. Создаём решения, которые работают на рост вашего
              бизнеса: от стратегии до запуска и развития
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-violet-500">
                Обсудить проект
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
              >
                <Play className="h-4 w-4" />
                Смотреть портфолио
              </button>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="-space-x-3 flex">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-600"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-slate-900">470+ проектов</p>
                <p className="text-sm text-slate-500">успешно запущено</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-200/30 via-transparent to-transparent" />
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-100/50 to-transparent" />
                <div className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-400/60" />
                    <div className="h-3 w-3 rounded-full bg-amber-400/60" />
                    <div className="h-3 w-3 rounded-full bg-violet-400/70" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                    <div className="h-3 w-2/3 rounded bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {[0, 1, 2, 3].map((k) => (
                      <div key={k} className="h-24 rounded-xl bg-slate-200/80" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 -top-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg">📈</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">+35%</p>
                  <p className="text-xs text-slate-500">конверсия</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg">⚡</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">16+ лет</p>
                  <p className="text-xs text-slate-500">опыта</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/web-studio/Services.tsx": `import { ArrowRight, ShoppingCart, Layout, Briefcase, FolderOpen, Users, Rocket } from "lucide-react";

const services = [
  {
    icon: ShoppingCart,
    title: "Интернет-магазин",
    description: "Полноценный онлайн-магазин с каталогом, корзиной, оплатой и интеграциями с CRM и 1С",
    price: "от 150 000₽",
    features: ["Каталог товаров", "Корзина и оплата", "Личный кабинет", "Интеграции"],
    popular: true
  },
  {
    icon: Layout,
    title: "Лендинг",
    description: "Продающая одностраничная посадочная страница для ваших товаров или услуг",
    price: "от 25 000₽",
    features: ["Адаптивный дизайн", "Форма заявки", "Аналитика", "SEO оптимизация"],
    popular: false
  },
  {
    icon: Briefcase,
    title: "Сайт-визитка",
    description: "Стильный и информативный сайт для представления вашей компании",
    price: "от 35 000₽",
    features: ["До 5 страниц", "Контактная форма", "Карта проезда", "Мобильная версия"],
    popular: false
  },
  {
    icon: FolderOpen,
    title: "Сайт-портфолио",
    description: "Красивая презентация ваших работ и проектов для привлечения клиентов",
    price: "от 25 000₽",
    features: ["Галерея работ", "Фильтрация", "Lightbox", "Анимации"],
    popular: false
  },
  {
    icon: Users,
    title: "B2B личный кабинет",
    description: "Личный кабинет для оптовых клиентов с индивидуальными ценами и условиями",
    price: "от 100 000₽",
    features: ["Авторизация", "История заказов", "Индивидуальные цены", "API интеграция"],
    popular: false
  },
  {
    icon: Rocket,
    title: "Спецпроект",
    description: "Уникальное решение под ваши специфические бизнес-задачи",
    price: "по запросу",
    features: ["Индивидуальный дизайн", "Кастомная разработка", "Уникальный функционал", "Полная поддержка"],
    popular: false
  }
];

export function Services() {
  return (
    <section id="services" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 space-y-4 text-center">
          <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-700">
            Наши услуги
          </span>
          <h2 className="text-balance text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">Какие сайты мы делаем</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500">
            Разрабатываем сайты любой сложности — от простых лендингов до сложных интернет-магазинов с интеграциями
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className={
                "group relative flex flex-col rounded-2xl border bg-white p-6 transition-all duration-300 hover:border-violet-300 " +
                (service.popular ? "border-violet-300 shadow-lg shadow-violet-500/10" : "border-slate-200")
              }
            >
              {service.popular ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white">
                  Популярное
                </div>
              ) : null}
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 group-hover:bg-violet-100">
                <service.icon className="h-7 w-7 text-violet-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{service.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{service.description}</p>
              <ul className="mt-4 grow space-y-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-lg font-bold text-slate-900">{service.price}</span>
                <button type="button" className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-500">
                  Подробнее
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/web-studio/Stats.tsx": `const stats = [
  { value: ">16", unit: "лет", label: "Опыта в e-commerce" },
  { value: "470+", unit: "", label: "Реализованных проектов под ключ" },
  { value: "1 млн+", unit: "", label: "Посетителей сайтов клиентов ежедневно" },
  { value: "500+", unit: "", label: "Интеграций для ваших проектов" },
  { value: "35%", unit: "", label: "Средняя конверсия наших сайтов" }
];

export function Stats() {
  return (
    <section id="about" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-50/40 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-6">
            <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-700">
              О команде
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
              О команде <span className="text-violet-600">WebStudio</span>
            </h2>
            <div className="space-y-4 leading-relaxed text-slate-500">
              <p>
                Основой нашей экспертизы стал собственный SaaS-сервис по созданию сайтов, где мы выстроили сильную техническую
                базу и отточили процессы разработки.
              </p>
              <p>
                Сегодня реализуем проекты разного масштаба: от лендингов до корпоративных порталов с личными кабинетами,
                интеграциями с 1С и многоуровневыми каталогами.
              </p>
              <p>Команда базируется в Москве, работаем по всей России.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="mb-2 text-xl font-semibold text-slate-900">Как мы работаем</h3>
              <p className="text-slate-500">в цифрах</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-center transition-colors hover:border-violet-300"
                >
                  <p className="text-3xl font-bold text-violet-600 lg:text-4xl">
                    {stat.value}
                    <span className="ml-1 text-lg font-medium">{stat.unit}</span>
                  </p>
                  <p className="mt-2 text-sm leading-tight text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/web-studio/Steps.tsx": `const steps = [
  {
    number: "01",
    title: "Анализируем ваши потребности",
    description:
      "После вашей заявки мы связываемся, чтобы познакомиться и разобраться в задачах бизнеса. Узнаём цели проекта, целевую аудиторию, пожелания по дизайну и техническим возможностям сайта."
  },
  {
    number: "02",
    title: "Подбираем решения",
    description:
      "Предлагаем эффективные решения с учётом специфики вашего бизнеса, конкурентной среды и аудитории. Продумываем структуру сайта и пользовательские сценарии."
  },
  {
    number: "03",
    title: "Формируем интерфейс",
    description:
      "Продумываем структуру сайта и ключевые элементы страниц, чтобы пользовательский путь был логичным и удобным. Оформляем все страницы и адаптируем под мобильные устройства."
  },
  {
    number: "04",
    title: "Разрабатываем и наполняем",
    description:
      "Верстаем и программируем страницы, подключаем необходимые сервисы — CRM, оплату, доставку. Загружаем товары, тексты и изображения, тестируем на всех устройствах."
  },
  {
    number: "05",
    title: "Запускаем и сопровождаем",
    description:
      "Передаём готовый сайт и показываем, как им управлять. После запуска остаёмся на связи: помогаем с правками, отвечаем на вопросы и дорабатываем функционал."
  }
];

export function Steps() {
  return (
    <section id="steps" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 space-y-4 text-center">
          <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-700">
            Процесс работы
          </span>
          <h2 className="text-balance text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">Этапы работ</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500">
            Прозрачный и отлаженный процесс разработки от первого контакта до запуска
          </p>
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-8 top-0 hidden w-0.5 bg-gradient-to-b from-violet-400/50 via-violet-200/40 to-transparent lg:left-1/2 lg:block lg:-translate-x-px" />

          <div className="space-y-8 lg:space-y-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={
                  "relative flex flex-col items-start gap-6 lg:flex-row lg:gap-12 " +
                  (index % 2 === 1 ? "lg:flex-row-reverse" : "")
                }
              >
                <div className={"flex-1 " + (index % 2 === 0 ? "lg:text-right" : "lg:text-left")}>
                  <div
                    className={
                      "rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-violet-300 lg:max-w-lg lg:p-8 " +
                      (index % 2 === 0 ? "lg:ml-auto" : "lg:mr-auto")
                    }
                  >
                    <span className="text-5xl font-bold text-violet-200 lg:text-6xl">{step.number}</span>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900 lg:text-2xl">{step.title}</h3>
                    <p className="mt-3 leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>

                <div className="absolute left-1/2 top-8 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white bg-violet-600 shadow-lg shadow-violet-500/40 lg:flex" />

                <div className="hidden flex-1 lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/web-studio/Portfolio.tsx": `import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";

const categories = ["Все", "Интернет-магазины", "Лендинги", "Корпоративные"];

const projects = [
  { title: "TechStore", category: "Интернет-магазины", description: "Магазин электроники с интеграцией 1С и онлайн-оплатой", color: "from-blue-500/20 to-cyan-500/20", stats: "+45% конверсия" },
  { title: "FashionBrand", category: "Интернет-магазины", description: "Модный бутик с персональными рекомендациями", color: "from-pink-500/20 to-rose-500/20", stats: "10k+ заказов/мес" },
  { title: "AutoService Pro", category: "Корпоративные", description: "Корпоративный портал автосервиса с онлайн-записью", color: "from-orange-500/20 to-amber-500/20", stats: "B2B кабинет" },
  { title: "FoodDelivery", category: "Интернет-магазины", description: "Сервис доставки еды с мобильным приложением", color: "from-green-500/20 to-emerald-500/20", stats: "50k+ пользователей" },
  { title: "Startup Launch", category: "Лендинги", description: "Продающий лендинг для SaaS-стартапа", color: "from-violet-500/20 to-purple-500/20", stats: "12% конверсия" },
  { title: "RealEstate", category: "Корпоративные", description: "Портал недвижимости с базой объектов и CRM", color: "from-teal-500/20 to-cyan-500/20", stats: "500+ объектов" }
];

export function Portfolio() {
  const [activeCategory, setActiveCategory] = useState("Все");
  const filtered = activeCategory === "Все" ? projects : projects.filter((p) => p.category === activeCategory);

  return (
    <section id="portfolio" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-50/40 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 space-y-4 text-center">
          <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-700">
            Портфолио
          </span>
          <h2 className="text-balance text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">Наше портфолио</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500">
            Посмотрите наши лучшие работы и результаты, которых мы достигли для клиентов
          </p>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={
                "rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                (activeCategory === category
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
              }
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <div
              key={project.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-violet-300"
            >
              <div className={"relative aspect-[4/3] bg-gradient-to-br " + project.color}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-3/4 w-3/4 rounded-xl border border-slate-200/50 bg-white/80 p-4 backdrop-blur-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-rose-400/70" />
                      <div className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <div className="h-2 w-2 rounded-full bg-violet-400/70" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-3/4 rounded bg-slate-200" />
                      <div className="h-2 w-1/2 rounded bg-slate-200" />
                      <div className="h-2 w-2/3 rounded bg-slate-200" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="h-12 rounded bg-slate-200/90" />
                      <div className="h-12 rounded bg-slate-200/90" />
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                    Смотреть кейс
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{project.stats}</span>
                </div>
                <p className="mb-3 text-sm text-slate-500">{project.description}</p>
                <span className="inline-block rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{project.category}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-base font-medium hover:bg-slate-50">
            Смотреть все проекты
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/web-studio/CTA.tsx": `import { useState } from "react";
import { ArrowRight, Phone, Mail, MapPin } from "lucide-react";

export function CTA() {
  const [agreed, setAgreed] = useState(false);

  return (
    <section id="contact" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-violet-100/60 to-transparent" />

          <div className="relative grid gap-12 p-8 lg:grid-cols-2 lg:p-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-700">
                  Связаться с нами
                </span>
                <h2 className="text-balance text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">Обсудим ваш проект?</h2>
                <p className="text-lg leading-relaxed text-slate-500">
                  Оставьте заявку и мы свяжемся с вами в течение 30 минут, чтобы обсудить ваш проект и предложить оптимальное
                  решение
                </p>
              </div>

              <div className="space-y-4">
                <a href="tel:+78005553535" className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                    <Phone className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Телефон</p>
                    <p className="font-semibold text-slate-900">+7 (800) 555-35-35</p>
                  </div>
                </a>
                <a href="mailto:hello@webstudio.ru" className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                    <Mail className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-semibold text-slate-900">hello@webstudio.ru</p>
                  </div>
                </a>
                <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                    <MapPin className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Офис</p>
                    <p className="font-semibold text-slate-900">Москва, ул. Примерная, 123</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 lg:p-8">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <label htmlFor="ws-name" className="text-sm font-medium text-slate-800">
                    Ваше имя
                  </label>
                  <input id="ws-name" placeholder="Иван Иванов" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ws-phone" className="text-sm font-medium text-slate-800">
                    Телефон
                  </label>
                  <input id="ws-phone" type="tel" placeholder="+7 (___) ___-__-__" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ws-email" className="text-sm font-medium text-slate-800">
                    Email
                  </label>
                  <input id="ws-email" type="email" placeholder="example@mail.ru" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ws-message" className="text-sm font-medium text-slate-800">
                    Расскажите о проекте
                  </label>
                  <textarea
                    id="ws-message"
                    rows={4}
                    placeholder="Опишите ваш проект, задачи и пожелания..."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <input
                    id="ws-agree"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600"
                  />
                  <label htmlFor="ws-agree" className="cursor-pointer text-sm leading-tight text-slate-500">
                    Я ознакомлен и согласен с условиями политики конфиденциальности
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!agreed}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-base font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Отправить заявку
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`,

  "src/components/web-studio/Footer.tsx": `const footerLinks = {
  services: [
    { name: "Интернет-магазины", href: "#" },
    { name: "Лендинги", href: "#" },
    { name: "Сайты-визитки", href: "#" },
    { name: "B2B кабинеты", href: "#" },
    { name: "Спецпроекты", href: "#" }
  ],
  company: [
    { name: "О компании", href: "#about" },
    { name: "Портфолио", href: "#portfolio" },
    { name: "Этапы работ", href: "#steps" },
    { name: "Контакты", href: "#contact" }
  ],
  legal: [
    { name: "Политика конфиденциальности", href: "#" },
    { name: "Оферта", href: "#" }
  ]
};

export function Footer() {
  const y = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          <div className="col-span-2 space-y-4 md:col-span-1">
            <a href="#" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
                <span className="text-lg font-bold text-white">W</span>
              </div>
              <span className="text-xl font-bold text-slate-900">WebStudio</span>
            </a>
            <p className="text-sm leading-relaxed text-slate-500">Разрабатываем сайты для роста ваших продаж с 2008 года</p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Услуги</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Компания</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Контакты</h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:+78005553535" className="text-sm text-slate-500 hover:text-slate-900">
                  +7 (800) 555-35-35
                </a>
              </li>
              <li>
                <a href="mailto:hello@webstudio.ru" className="text-sm text-slate-500 hover:text-slate-900">
                  hello@webstudio.ru
                </a>
              </li>
              <li className="text-sm text-slate-500">Москва, ул. Примерная, 123</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">© {y} WebStudio. Все права защищены.</p>
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link) => (
              <a key={link.name} href={link.href} className="text-sm text-slate-500 hover:text-slate-900">
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
`,

  "src/App.tsx": `import { Header } from "./components/web-studio/Header";
import { Hero } from "./components/web-studio/Hero";
import { Services } from "./components/web-studio/Services";
import { Stats } from "./components/web-studio/Stats";
import { Steps } from "./components/web-studio/Steps";
import { Portfolio } from "./components/web-studio/Portfolio";
import { CTA } from "./components/web-studio/CTA";
import { Footer } from "./components/web-studio/Footer";

export default function App() {
  return (
    <div data-lmnt-layout-root className="min-h-screen bg-white text-slate-900">
      <Header />
      <main data-lmnt-layer="base" className="min-h-screen">
        <Hero />
        <Services />
        <Stats />
        <Steps />
        <Portfolio />
        <CTA />
        <Footer />
      </main>
    </div>
  );
}
`
};
