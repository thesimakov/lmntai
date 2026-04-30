/**
 * Пресет из папки «pr» (лид-лендинг: hero + таймер + форма, секции проблем/решения/отзывов).
 * Адаптирован под превью Lemnity: Vite+React+TSX, lucide-react, Tailwind CDN (стандартные классы).
 */

import { LMNT_LAYER_RULES_BLOCK_RU } from "@/lib/lmnt-layer-spec";

export const PR_LEAD_TEMPLATE_SLUG = "lead-pr-sales";

export const PR_LEAD_TEMPLATE_NAME = "Лиды и рост продаж (PR)";

export const PR_LEAD_TEMPLATE_DESCRIPTION =
  "Многосекционный лендинг: hero с таймером и формой захвата, блоки «проблемы», «решение», преимущества, шаги, отзывы, повторный CTA, футер. Без Next.js — правки в src/App.tsx и при необходимости разбейте на файлы в src/components/.";

export const PR_LEAD_DEFAULT_USER_PROMPT = `Лендинг для лидогенерации на базе шаблона «Лиды и рост продаж».

Сделай:
- Замени заголовки, цифры, формулировки оффера и контакты в футере на бренд клиента.
- Сохрани структуру секций и логику формы (имитация отправки).
- Правь в основном \`src/App.tsx\` (или вынеси секции в отдельные файлы под \`src/components/\`).

Правь существующий код точечно, не переписывай проект с нуля.`;

export const PR_LEAD_TEMPLATE_RULES = `ИНСТРУКЦИЯ ПО ШАБЛОНУ «ЛИДЫ И РОСТ ПРОДАЖ (PR)»:
- Ниже — УЖЕ СОБРАННЫЙ мини-проект Vite+React+TS: файл src/main.tsx и src/App.tsx (все секции в одном файле). Tailwind через CDN в превью; используй стандартные утилиты (slate, blue, red, emerald), не полагайся на CSS-переменные shadcn.
- Разрешены: react, react-dom, lucide-react.
- Запрещены: Next.js, next/link, импорты с префиксом @ — только относительные пути (например ./App).
- Ответ модели: полные файлы в блоках кода вида три бэктика tsx и путь, только для изменённых файлов.
- puck.json — визуальный макет Puck; синхронизируй блоки со секциями лендинга при правках.${LMNT_LAYER_RULES_BLOCK_RU}`;

const MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

/** Один файл — упрощает esbuild-бандл и совпадает с исходной структурой страницы из папки pr (app/page.tsx + sections). */
const APP = `import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Gift,
  Headphones,
  HelpCircle,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Quote,
  RefreshCcw,
  Rocket,
  Shield,
  Star,
  Target,
  TrendingDown,
  Truck,
  Users
} from "lucide-react";

function CountdownTimer({ endMs }: { endMs: number }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, endMs - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000) % 24,
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000)
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  const block = (v: number, label: string) => (
    <div className="flex flex-col items-center">
      <div className="rounded-lg bg-red-600 px-3 py-2 text-center font-mono text-2xl font-bold tabular-nums text-white shadow-sm">
        {String(v).padStart(2, "0")}
      </div>
      <span className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-2">
      {block(timeLeft.h, "часов")}
      <span className="-mt-6 text-2xl font-bold text-red-600">:</span>
      {block(timeLeft.m, "минут")}
      <span className="-mt-6 text-2xl font-bold text-red-600">:</span>
      {block(timeLeft.s, "секунд")}
    </div>
  );
}

function LeadForm({
  variant = "default",
  buttonText = "Получить консультацию"
}: {
  variant?: "default" | "hero";
  buttonText?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1200));
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-600" />
        <h3 className="text-lg font-semibold text-slate-900">Заявка отправлена!</h3>
        <p className="mt-1 text-sm text-slate-600">Наш менеджер свяжется с вами в течение 15 минут</p>
      </div>
    );
  }

  const inputH = variant === "hero" ? "h-12 text-base" : "h-11";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ваше имя"
        className={\`rounded-lg border border-slate-200 bg-white px-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 \${inputH}\`}
      />
      <input
        required
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+7 (___) ___-__-__"
        className={\`rounded-lg border border-slate-200 bg-white px-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 \${inputH}\`}
      />
      <button
        type="submit"
        disabled={busy}
        className={\`flex items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-white shadow transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-70 \${variant === "hero" ? "h-14 text-lg" : "h-12 text-base"}\`}
      >
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Отправка...
          </>
        ) : (
          buttonText
        )}
      </button>
      <p className="text-center text-xs text-slate-500">
        Нажимая кнопку, вы соглашаетесь с{" "}
        <a href="#privacy" className="underline hover:text-slate-800">
          политикой конфиденциальности
        </a>
      </p>
    </form>
  );
}

export default function App() {
  const endMs = Date.now() + 24 * 60 * 60 * 1000;

  return (
    <main data-lmnt-layout-root className="min-h-screen bg-gradient-to-b from-blue-50/80 via-white to-slate-50 text-slate-900">
      <section data-lmnt-layer="base" className="relative flex min-h-screen items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.12),transparent_55%)]" />
        <div className="container relative z-10 mx-auto grid items-center gap-12 px-4 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              Осталось 5 мест по спеццене
            </div>
            <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              Увеличим продажи вашего бизнеса{" "}
              <span className="text-blue-600">на 150% за 14 дней</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">
              Получите персональную стратегию роста от экспертов с 10-летним опытом. Бесплатная консультация + пошаговый
              план действий в подарок.
            </p>
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="h-5 w-5 shrink-0 text-blue-600" />
                <span className="text-sm">
                  <strong className="text-slate-900">2 347</strong> клиентов
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Star className="h-5 w-5 shrink-0 fill-blue-600 text-blue-600" />
                <span className="text-sm">
                  <strong className="text-slate-900">4.9</strong> рейтинг
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Shield className="h-5 w-5 shrink-0 text-blue-600" />
                <span className="text-sm">
                  <strong className="text-slate-900">100%</strong> гарантия
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center lg:items-end">
            <div className="w-full max-w-md rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-2xl shadow-blue-500/10 md:p-8">
              <div className="mb-6 text-center">
                <h2 className="mb-2 text-xl font-bold text-slate-900">Получите бесплатную консультацию</h2>
                <p className="mb-4 text-sm text-slate-600">Акция действует только</p>
                <CountdownTimer endMs={endMs} />
              </div>
              <LeadForm variant="hero" buttonText="Записаться бесплатно" />
              <div className="mt-4 border-t border-slate-200 pt-4 text-center">
                <p className="flex items-center justify-center gap-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Ваши данные защищены
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section data-lmnt-layer="base" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center md:mb-16">
            <span className="text-sm font-medium uppercase tracking-wider text-blue-600">Знакомо?</span>
            <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">Эти проблемы мешают вашему росту</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {[
              [TrendingDown, "Продажи не растут", "Вкладываете в рекламу, но клиенты не покупают. Конверсия на сайте ниже 1%."],
              [Clock, "Нет времени на маркетинг", "Занимаетесь всем сами, а на привлечение клиентов времени не остаётся."],
              [HelpCircle, "Не знаете, с чего начать", "Советов много, но непонятно, что подойдёт именно вашему бизнесу."],
              [AlertTriangle, "Конкуренты обгоняют", "Пока вы думаете — конкуренты забирают ваших клиентов и долю рынка."]
            ].map(([Icon, title, desc], i) => (
              <div
                key={i}
                className="group flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:border-red-300 hover:bg-red-50/40"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 transition group-hover:bg-red-200">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="text-slate-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section data-lmnt-layer="base" className="bg-slate-100/80 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative">
              <div className="rounded-3xl bg-gradient-to-br from-blue-100/80 via-blue-50 to-cyan-50 p-8 md:p-12">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    [BarChart3, "+150%", "рост продаж"],
                    [Target, "14 дней", "до результата"],
                    [Rocket, "3x", "ROI рекламы"],
                    [CheckCircle2, "100%", "гарантия"]
                  ].map(([Ic, big, small], idx) => (
                    <div
                      key={idx}
                      className={idx === 1 || idx === 3 ? "rounded-2xl bg-white p-6 shadow-lg md:mt-8" : "rounded-2xl bg-white p-6 shadow-lg"}
                    >
                      <Ic className="mb-3 h-10 w-10 text-blue-600" />
                      <div className="text-3xl font-bold text-slate-900">{big}</div>
                      <div className="text-sm text-slate-500">{small}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium uppercase tracking-wider text-blue-600">Решение</span>
              <h2 className="mt-3 mb-6 text-balance text-3xl font-bold md:text-4xl">
                Комплексная система роста продаж для вашего бизнеса
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-slate-600">
                Мы разработаем индивидуальную стратегию под вашу нишу и аудиторию. Без шаблонов — только то, что
                работает для вас.
              </p>
              <ul className="space-y-4">
                {[
                  "Персональная стратегия под ваш бизнес",
                  "Аудит текущих каналов продаж",
                  "Пошаговый план внедрения",
                  "Поддержка на каждом этапе"
                ].map((line) => (
                  <li key={line} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="font-medium text-slate-900">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section data-lmnt-layer="base" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center md:mb-16">
            <span className="text-sm font-medium uppercase tracking-wider text-blue-600">Преимущества</span>
            <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">Почему выбирают нас</h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [Clock, "Результат за 14 дней", "Первые заявки уже через 2 недели"],
              [Shield, "Гарантия результата", "Если не будет роста — вернём деньги"],
              [Award, "10 лет опыта", "С 2014 года с бизнесом любого масштаба"],
              [RefreshCcw, "Бесплатные правки", "Доработаем стратегию до результата"],
              [Truck, "Быстрый старт", "Без лишней бюрократии"],
              [Headphones, "Поддержка 24/7", "Персональный менеджер на связи"]
            ].map(([Ic, t, d], i) => (
              <div
                key={i}
                className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center transition hover:border-blue-300 hover:shadow-lg"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition group-hover:bg-blue-200">
                  <Ic className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{t}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section data-lmnt-layer="base" className="bg-slate-100/80 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center md:mb-16">
            <span className="text-sm font-medium uppercase tracking-wider text-blue-600">Как это работает</span>
            <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">3 простых шага к результату</h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              ["01", Phone, "Оставьте заявку", "Свяжемся за 15 минут и уточним задачу."],
              ["02", FileText, "Получите стратегию", "На консультации — персональный план роста."],
              ["03", Rocket, "Начните расти", "Первые результаты — уже через 14 дней."]
            ].map(([num, Icon, ti, ds], idx) => (
              <div key={idx} className="relative text-center">
                <div className="relative mb-6 inline-flex">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/25">
                    <Icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-xs font-bold text-blue-600">
                    {num}
                  </div>
                </div>
                <h3 className="mb-3 text-xl font-semibold">{ti}</h3>
                <p className="mx-auto max-w-xs text-slate-600 leading-relaxed">{ds}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section data-lmnt-layer="base" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center md:mb-16">
            <span className="text-sm font-medium uppercase tracking-wider text-blue-600">Отзывы</span>
            <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">Что говорят клиенты</h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              ["А", "Алексей П.", "+180% продаж", "За месяц продажи выросли на 180%. Стало понятно, куда вкладывать рекламу."],
              ["М", "Мария С.", "3x заявок", "Через 2 недели в 3 раза больше заявок с того же сайта."],
              ["Д", "Дмитрий К.", "ROI 4.5x", "Скептически относился к обещаниям — результат впечатлил."]
            ].map(([av, name, badge, txt], idx) => (
              <div key={idx} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm hover:shadow-md">
                <Quote className="mb-4 h-8 w-8 text-blue-200" />
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-blue-500 text-blue-500" />
                  ))}
                </div>
                <p className="mb-6 text-slate-800 leading-relaxed">&quot;{txt}&quot;</p>
                <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {badge}
                </div>
                <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                    {av}
                  </div>
                  <div className="text-sm font-semibold">{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-lmnt-layer="base" className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border-2 border-blue-200 bg-white shadow-2xl">
            <div className="p-8 md:p-12">
              <div className="mb-8 text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                  <Gift className="h-4 w-4" />
                  Бонус: чек-лист «10 точек роста» в подарок
                </div>
                <h2 className="mb-4 text-balance text-3xl font-bold md:text-4xl">Получите бесплатную стратегию роста</h2>
                <p className="mx-auto max-w-xl text-lg text-slate-600">
                  Оставьте заявку — эксперт свяжется в течение 15 минут.
                </p>
              </div>
              <div className="mx-auto max-w-md">
                <LeadForm buttonText="Получить стратегию бесплатно" />
              </div>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:gap-8">
                {["Без скрытых платежей", "Отмена в любой момент", "Гарантия результата"].map((x) => (
                  <div key={x} className="flex items-center gap-2 text-sm text-slate-600">
                    <ArrowRight className="h-4 w-4 text-emerald-600" />
                    {x}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-12 text-slate-300">
        <div className="container mx-auto px-4">
          <div className="mb-8 grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-4 text-xl font-bold text-white">GrowthPro</h3>
              <p className="text-sm leading-relaxed opacity-90">
                Помогаем бизнесу расти с 2014 года. Более 2000 успешных проектов в России и СНГ.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Контакты</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="tel:+78001234567" className="flex items-center gap-2 hover:text-white">
                    <Phone className="h-4 w-4" />
                    8 (800) 123-45-67
                  </a>
                </li>
                <li>
                  <a href="mailto:info@growthpro.ru" className="flex items-center gap-2 hover:text-white">
                    <Mail className="h-4 w-4" />
                    info@growthpro.ru
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Москва, ул. Примерная, 1
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Информация</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#privacy" className="hover:text-white">
                    Политика конфиденциальности
                  </a>
                </li>
                <li>
                  <a href="#terms" className="hover:text-white">
                    Пользовательское соглашение
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <p className="border-t border-slate-700 pt-8 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} GrowthPro. Все права защищены.
          </p>
        </div>
      </footer>
    </main>
  );
}
`;

const PR_LEAD_PUCK_SNIPPET = {
  root: { props: { title: "PR лиды — макет" } },
  content: [
    { type: "Heading" as const, props: { text: "Hero + форма + таймер", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Оффер продаж и лид-форма с таймером.", size: "sm" } },
    { type: "Heading" as const, props: { text: "Проблемы · Решение · Преимущества · Шаги · Отзывы · CTA", level: "3" } },
    { type: "TextBlock" as const, props: { text: "Типовой лендинг из набора секций как в шаблоне из папки pr.", size: "sm" } }
  ]
};

export const PR_LEAD_PUCK_JSON = JSON.stringify(PR_LEAD_PUCK_SNIPPET);

export const PR_LEAD_PRESET_FILES: Record<string, string> = {
  "src/main.tsx": MAIN,
  "src/App.tsx": APP,
  "puck.json": PR_LEAD_PUCK_JSON
};
