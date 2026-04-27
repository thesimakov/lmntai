/**
 * Пресет «Массажист» — адаптация Next-шаблона (см. исходник) в Vite+React+TSX для esbuild-превью.
 * Импорты: только `react`, `react-dom`, `lucide-react`.
 */

export const MASSAGE_TEMPLATE_SLUG = "massage";

export const MASSAGE_TEMPLATE_NAME = "Массажист";

export const MASSAGE_TEMPLATE_DESCRIPTION =
  "Лендинг мастера массажа: услуги, цены, обо мне, контакты. Подставьте тексты и реквизиты под своего клиента.";

export const MASSAGE_TEMPLATE_RULES = `ИНСТРУКЦИЯ ПО ШАБЛОНУ «МАССАЖИСТ»:
- Ниже — УЖЕ СОБРАННЫЙ мини-проект (Vite+React+TS, Tailwind через CDN). Ваша работа: РЕДАКТИРОВАТЬ эти файлы по запросу пользователя, а не писать проект с нуля.
- Сохраняйте иерархию секций и якоря: #services, #about, #contact — пока пользователь не просит иное.
- Меняйте копирайт, цены, телефон, адрес, название бренда, список услуг; при необходимости выносите повторяющиеся карточки в src/components.
- Не подключайте Next.js, next/image, shadcn из npm — только то, что уже в превью (react, react-dom, lucide-react при необходимости).
- Вывод: полные обновлённые файлы в фенсах \`\`\`tsx:путь\` … \`\`\` для КАЖДОГО изменённого файла. Если файл не трогали — не дублируйте.`;

const MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const APP = `import {
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Phone,
  Wind
} from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-2xl font-bold text-sky-700">Wellness Massage</div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#services" className="text-slate-800 transition hover:text-sky-600">
              Услуги
            </a>
            <a href="#about" className="text-slate-800 transition hover:text-sky-600">
              Обо мне
            </a>
            <a href="#contact" className="text-slate-800 transition hover:text-sky-600">
              Контакты
            </a>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Профессиональный <span className="text-sky-600">массаж</span> для вашего здоровья
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Универсальный подход к восстановлению и релаксации. Авторские техники, внимание к деталям и результат, который
              ощущается сразу.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#contact"
                className="inline-flex h-11 items-center justify-center rounded-md bg-sky-600 px-6 text-sm font-medium text-white shadow transition hover:bg-sky-600/90"
              >
                Записаться на сеанс
              </a>
              <a
                href="#about"
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Узнать больше
              </a>
            </div>
          </div>
          <div className="flex h-96 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-200/50 to-cyan-100/60">
            <div className="text-center text-sky-700">
              <Heart className="mx-auto mb-4 h-24 w-24 opacity-60" />
              <p className="text-lg font-semibold">Оздоровительный массаж</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-16 text-center text-3xl font-bold text-slate-900 md:text-4xl">Почему выбирают мои услуги</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <CheckCircle2 className="h-12 w-12 text-sky-600" />,
                title: "Индивидуальный подход",
                desc: "Учитываю особенности тела, состояние здоровья и пожелания"
              },
              {
                icon: <Heart className="h-12 w-12 text-cyan-600" />,
                title: "Авторские техники",
                desc: "Сочетание классики и современных методик"
              },
              {
                icon: <Wind className="h-12 w-12 text-sky-600" />,
                title: "Восстановление",
                desc: "Помогу снять стресс, напряжение и ускорить реабилитацию"
              }
            ].map((benefit, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex justify-center">{benefit.icon}</div>
                <h3 className="mb-3 text-xl font-semibold text-slate-900">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20">
        <h2 className="mb-16 text-center text-3xl font-bold text-slate-900 md:text-4xl">Спектр услуг</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {[
            { name: "Релаксационный массаж", desc: "Снятие стресса и восстановление энергии", price: "от 2 500 ₽" },
            { name: "Лечебный массаж", desc: "Восстановление после травм и заболеваний", price: "от 3 000 ₽" },
            { name: "Спортивный массаж", desc: "Подготовка и восстановление после нагрузок", price: "от 2 800 ₽" },
            { name: "Антицеллюлитный массаж", desc: "Работа с кожей и мягкими тканями", price: "от 3 500 ₽" },
            { name: "Лимфодренажный массаж", desc: "Улучшение оттока и самочувствия", price: "от 3 200 ₽" },
            { name: "Массаж лица и шеи", desc: "Тонус и кровообращение", price: "от 2 000 ₽" }
          ].map((service, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 border-l-4 border-l-sky-500 p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="mb-3 text-2xl font-bold text-slate-900">{service.name}</h3>
              <p className="mb-4 text-slate-600">{service.desc}</p>
              <p className="text-lg font-semibold text-sky-600">{service.price}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="flex h-96 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-200/50 to-cyan-100/60">
              <div className="text-center text-sky-700">
                <Wind className="mx-auto mb-4 h-24 w-24 opacity-50" />
                <p className="text-lg font-semibold">Профессионал в деле</p>
              </div>
            </div>
            <div>
              <h2 className="mb-6 text-3xl font-bold text-slate-900 md:text-4xl">Обо мне</h2>
              <p className="mb-4 text-lg leading-relaxed text-slate-600">
                Я — сертифицированный массажист с более чем 10-летним опытом. Постоянно учусь и совершенствую технику.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-slate-600">
                Каждый сеанс — внимание к деталям и вашему комфорту. Приоритет — здоровье клиента.
              </p>
              <ul className="space-y-3">
                {[
                  "Сертификат по классическому массажу",
                  "Авторские техники восстановления",
                  "Опыт работы со спортсменами",
                  "Индивидуальный план на сеанс"
                ].map((cert, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-800">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-sky-600" />
                    {cert}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20">
        <h2 className="mb-16 text-center text-3xl font-bold text-slate-900 md:text-4xl">Контакты</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: <Phone className="h-8 w-8" />, title: "Телефон", value: "+7 (999) 123-45-67", desc: "9:00–21:00" },
            { icon: <MapPin className="h-8 w-8" />, title: "Адрес", value: "ул. Примерная, 42", desc: "Москва" },
            { icon: <Clock className="h-8 w-8" />, title: "Часы", value: "9:00 – 21:00", desc: "Пн–Вс" }
          ].map((c, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex justify-center text-sky-600">{c.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">{c.title}</h3>
              <p className="mb-1 text-lg font-semibold text-slate-900">{c.value}</p>
              <p className="text-sm text-slate-500">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-sky-100/80 to-cyan-100/60 p-12 text-center">
          <h3 className="mb-4 text-2xl font-bold text-slate-900">Готовы начать?</h3>
          <p className="mb-8 text-lg text-slate-600">Запишитесь на первый сеанс и оцените разницу</p>
          <a
            href="tel:+79991234567"
            className="inline-flex h-12 items-center justify-center rounded-md bg-sky-600 px-8 text-sm font-medium text-white shadow transition hover:bg-sky-600/90"
          >
            Записаться на сеанс
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-slate-500">
          <p>© {new Date().getFullYear()} Wellness Massage. Все права защищены.</p>
          <p className="mt-2 text-sm">Профессиональный массаж для здоровья</p>
        </div>
      </footer>
    </div>
  );
}
`;

export const MASSAGE_PRESET_FILES: Record<string, string> = {
  "src/main.tsx": MAIN,
  "src/App.tsx": APP
};
