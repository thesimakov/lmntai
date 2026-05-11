import { LEMNITY_CAROUSEL_NAV_STYLES } from "@/lib/lemnity-carousel-nav-runtime";

/**
 * Секции «Преимущества»: сетки, сплиты, бенто, цифры, карусель.
 * Класс корня: lemnity-benefits-s + lemnity-section.
 */

const IU = "https://images.unsplash.com";
export const BENEFITS_IMG = {
  living: `${IU}/photo-1497366754035-f200968a6e72?w=1200&q=80`,
  beige: `${IU}/photo-1586023492125-27b2c045efd7?w=1200&q=80`,
  green: `${IU}/photo-1618221195710-dd6b41faaea6?w=1200&q=80`,
};

const SUB =
  "Работая с нами, вы будете наслаждаться рядом преимуществ, которые сделают сотрудничество с нами особенным и выгодным.";

/** Компактные иконки в фирменном голубом */
const IC = {
  check: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
  arrow: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M16 6l2.29 2.29-4.88 4.88-4-4L6 13.41 10.59 18 18 10.59z"/></svg>`,
  chat: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
  lock: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10z"/></svg>`,
  menu: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
  shield: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`,
};

function bfCardRu(title: string, body: string, icon: string, iconCorner: "tl" | "tr" = "tr") {
  const pos = iconCorner === "tr" ? "top:14px;right:14px;" : "top:14px;left:14px;";
  return `<div style="position:relative;background:#f3f4f6;border-radius:16px;padding:clamp(18px,3vw,26px);min-height:min(160px,auto);text-align:left;">
  <span style="position:absolute;${pos}display:inline-flex;width:40px;height:40px;border-radius:12px;background:#dbeafe;align-items:center;justify-content:center;">${icon}</span>
  <h3 style="margin:${iconCorner === "tr" ? "0 52px 10px 0" : "0 0 10px 52px"};font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0f172a;line-height:1.25;">${title}</h3>
  <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">${body}</p>
</div>`;
}

function carouselNav() {
  return `<span class="lemnity-carousel-nav" aria-hidden="true">‹</span>`;
}

function carouselNavRight() {
  return `<span class="lemnity-carousel-nav" aria-hidden="true">›</span>`;
}

const BENEFITS_CSS = `<style>
.lemnity-benefits-s,.lemnity-benefits-s *{box-sizing:border-box}
.lemnity-benefits-s img{border-radius:inherit}
${LEMNITY_CAROUSEL_NAV_STYLES.trim()}
.lemnity-benefits-s .lemnity-carousel-row .lemnity-carousel-nav{min-height:108px}
.bf-num3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(24px,5vw,48px);max-width:1040px;margin:0 auto}
@media (max-width:720px){.bf-num3{grid-template-columns:1fr}}
.bf-ideal6{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,18px);max-width:1140px;margin:0 auto}
@media (max-width:900px){.bf-ideal6{grid-template-columns:1fr}}
.bf-head2x2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(14px,2.5vw,22px);max-width:920px;margin:0 auto}
@media (max-width:640px){.bf-head2x2{grid-template-columns:1fr}}
.bf-row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(14px,2.5vw,22px);max-width:1100px;margin:0 auto}
@media (max-width:820px){.bf-row3{grid-template-columns:1fr}}
.bf-split5020{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(28px,5vw,56px);align-items:center;max-width:1140px;margin:0 auto}
@media (max-width:880px){.bf-split5020{grid-template-columns:1fr}}
.bf-split-img{border-radius:16px;overflow:hidden;box-shadow:0 18px 44px rgba(15,23,42,.1)}
.bf-list-i{display:flex;gap:16px;align-items:flex-start;margin-bottom:clamp(18px,3vw,26px)}
.bf-list-i:last-child{margin-bottom:0}
.bf-dot{flex-shrink:0;width:44px;height:44px;border-radius:999px;background:#2563eb}
.bf-stat4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(16px,3vw,28px);max-width:1100px;margin:0 auto;text-align:center}
@media (max-width:900px){.bf-stat4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:440px){.bf-stat4{grid-template-columns:1fr}}
.bf-icon44{width:52px;height:52px;margin:0 auto 14px;border-radius:14px;background:#dbeafe;display:flex;align-items:center;justify-content:center}
.bf-bento8{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-rows:minmax(110px,auto);gap:clamp(12px,2vw,16px);max-width:1140px;margin:0 auto}
.bf-bento8 .bf-b-img1{grid-column:1/span 3;grid-row:1/span 2;border-radius:16px;overflow:hidden;min-height:220px}
.bf-bento8 .bf-b-img1 img{width:100%;height:100%;object-fit:cover;min-height:220px;border-radius:16px}
.bf-bento8 .bf-b-c2{grid-column:4/span 3;grid-row:1}
.bf-bento8 .bf-b-c3{grid-column:7/span 6;grid-row:1}
.bf-bento8 .bf-b-c4{grid-column:4/span 5;grid-row:2}
.bf-bento8 .bf-b-c5{grid-column:9/span 2;grid-row:2}
.bf-bento8 .bf-b-img2{grid-column:11/span 2;grid-row:2;border-radius:16px;overflow:hidden;min-height:120px}
.bf-bento8 .bf-b-img2 img{width:100%;height:100%;object-fit:cover;min-height:120px;border-radius:16px}
@media (max-width:900px){
  .bf-bento8{display:flex;flex-direction:column}
  .bf-bento8 .bf-b-img1,.bf-bento8 .bf-b-c2,.bf-bento8 .bf-b-c3,.bf-bento8 .bf-b-c4,.bf-bento8 .bf-b-c5,.bf-bento8 .bf-b-img2{grid-column:auto;grid-row:auto;min-height:0}
}
.bf-aside5020{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,0.95fr);gap:clamp(24px,4vw,44px);align-items:start;max-width:1140px;margin:0 auto}
@media (max-width:920px){.bf-aside5020{grid-template-columns:1fr}}
.bf-mini2x2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,18px)}
@media (max-width:480px){.bf-mini2x2{grid-template-columns:1fr}}
.bf-grid12{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(14px,2.2vw,22px);max-width:1140px;margin:0 auto}
@media (max-width:900px){.bf-grid12{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.bf-grid12{grid-template-columns:1fr}}
.bf-micon{width:36px;height:36px;border-radius:10px;background:#bfdbfe;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#1d4ed8}
</style>`;

export const LEMNITY_BENEFITS_BLOCK_VARIANTS = [
  {
    id: "benefits-bf01-numbers",
    badge: "BF01",
    title: "Три колонки: номер и текст",
    hint: "крупные 001–003, подписи",
    content: `<section data-gjs-name="Преимущества: номера" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,96px) clamp(18px,4vw,32px);background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
${BENEFITS_CSS}
<div class="bf-num3">
  <div>
    <p style="margin:0 0 14px;font-size:clamp(2.5rem,6vw,3.75rem);font-weight:800;line-height:1;letter-spacing:-0.02em;">001</p>
    <p style="margin:0 0 8px;font-size:clamp(15px,2vw,17px);font-weight:700;line-height:1.35;color:#111;">Фокус на результате</p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#525252;">Согласуем цели и метрики заранее и регулярно показываем прогресс без лишней бюрократии.</p>
  </div>
  <div>
    <p style="margin:0 0 14px;font-size:clamp(2.5rem,6vw,3.75rem);font-weight:800;line-height:1;letter-spacing:-0.02em;">002</p>
    <p style="margin:0 0 8px;font-size:clamp(15px,2vw,17px);font-weight:700;line-height:1.35;color:#111;">Прозрачные процессы</p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#525252;">Понятные этапы, сроки и ответственные — вы всегда знаете, что происходит с проектом.</p>
  </div>
  <div>
    <p style="margin:0 0 14px;font-size:clamp(2.5rem,6vw,3.75rem);font-weight:800;line-height:1;letter-spacing:-0.02em;">003</p>
    <p style="margin:0 0 8px;font-size:clamp(15px,2vw,17px);font-weight:700;line-height:1.35;color:#111;">Команда экспертов</p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#525252;">Подключаем специалистов под задачу и сохраняем единый стандарт качества на всех этапах.</p>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf02-grid-cta",
    badge: "BF02",
    title: "Сетка 3×2: CTA и карточки",
    hint: "идеальное решение, фото в ячейке",
    content: `<section data-gjs-name="Преимущества: сетка с CTA" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,88px) clamp(18px,4vw,28px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
${BENEFITS_CSS}
<div class="bf-ideal6">
  <div style="padding:clamp(8px,2vw,16px) 4px;display:flex;flex-direction:column;justify-content:center;gap:16px;">
    <h2 style="margin:0;font-size:clamp(16px,2.2vw,20px);font-weight:800;line-height:1.25;text-transform:uppercase;letter-spacing:0.04em;">Идеальное решение для вас</h2>
    <a href="#" style="align-self:flex-start;display:inline-flex;padding:12px 22px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">Подробнее</a>
  </div>
  ${bfCardRu("Доступность", "Предлагаем услуги и поддержку круглосуточно", IC.check)}
  ${bfCardRu("Высокий уровень", "Высокий уровень качества во всем, что делаем", IC.arrow)}
  ${bfCardRu("Персонализация", "Учитываем потребности и предпочтения", IC.chat)}
  ${bfCardRu("Надёжность", "Придерживаемся высоких стандартов надёжности", IC.lock)}
  <div class="bf-split-img" style="border-radius:16px;overflow:hidden;min-height:200px;">
    <img src="${BENEFITS_IMG.living}" alt="" style="width:100%;height:100%;min-height:220px;object-fit:cover;border-radius:16px;"/>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf03-cards-dots",
    badge: "BF03",
    title: "Заголовок и сетка 2×2",
    hint: "цветные маркеры и текстовые карточки",
    content: `<section data-gjs-name="Преимущества: 2×2" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,92px) clamp(18px,4vw,28px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<h2 style="margin:0 0 clamp(28px,5vw,44px);text-align:center;font-size:clamp(1.6rem,3.5vw,2.25rem);font-weight:800;color:#1e3a8a;">Заголовок секции</h2>
<div class="bf-head2x2">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px 20px 20px;box-shadow:0 8px 28px rgba(15,23,42,.06);">
    <span style="display:block;width:36px;height:36px;border-radius:999px;background:#fda4af;margin-bottom:16px;"></span>
    <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#0f172a;line-height:1.25;">Быстрый старт</h3>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Запускаем работу за несколько дней и сразу показываем первые ощутимые результаты.</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px 20px 20px;box-shadow:0 8px 28px rgba(15,23,42,.06);">
    <span style="display:block;width:36px;height:36px;border-radius:999px;background:#fde047;margin-bottom:16px;"></span>
    <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#0f172a;line-height:1.25;">Гибкий формат</h3>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Подстраиваем объём и ритм под вашу команду: проект, подписка или разовые задачи.</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px 20px 20px;box-shadow:0 8px 28px rgba(15,23,42,.06);">
    <span style="display:block;width:36px;height:36px;border-radius:999px;background:#f87171;margin-bottom:16px;"></span>
    <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#0f172a;line-height:1.25;">Поддержка 24/7</h3>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#64748b;">На связи в рабочее время и по срочным каналам — не оставляем вопросы без ответа.</p>
    <a href="#" style="display:inline-block;margin-top:2px;padding:8px 14px;border-radius:8px;background:#2563eb;color:#fff;font-size:12px;font-weight:700;text-decoration:none;">Подробнее</a>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px 20px 20px;box-shadow:0 8px 28px rgba(15,23,42,.06);">
    <span style="display:block;width:36px;height:36px;border-radius:999px;background:#4ade80;margin-bottom:16px;"></span>
    <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#0f172a;line-height:1.25;">Рост вместе с вами</h3>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#64748b;">Масштабируем решения по мере развития продукта и новых вызовов на рынке.</p>
    <a href="#" style="display:inline-block;margin-top:2px;padding:8px 14px;border-radius:8px;background:#2563eb;color:#fff;font-size:12px;font-weight:700;text-decoration:none;">Подробнее</a>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf04-stat-cards",
    badge: "BF04",
    title: "Три карточки: число и текст",
    hint: "первая с голубым фоном",
    content: `<section data-gjs-name="Преимущества: карточки со счётчиком" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,88px) clamp(18px,4vw,28px);background:#eef2f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<div class="bf-row3">
  <div style="background:#e0f2fe;border-radius:16px;padding:22px 20px 24px;border:1px solid #bae6fd;">
    <div class="bf-micon" style="margin-bottom:16px;">1</div>
    <p style="margin:0 0 18px;font-size:clamp(2rem,4vw,2.75rem);font-weight:800;color:#0f172a;">010</p>
    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.35;">Лет на рынке</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">Накопили методологию и кейсы в вашей нише — меньше рисков на старте.</p>
  </div>
  <div style="background:#fff;border-radius:16px;padding:22px 20px 24px;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(15,23,42,.06);">
    <div class="bf-micon" style="margin-bottom:16px;">2</div>
    <p style="margin:0 0 18px;font-size:clamp(2rem,4vw,2.75rem);font-weight:800;color:#0f172a;">010</p>
    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.35;">Специалистов в команде</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">Дизайн, разработка, аналитика и поддержка — всё в одной точке контакта.</p>
  </div>
  <div style="background:#fff;border-radius:16px;padding:22px 20px 24px;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(15,23,42,.06);">
    <div class="bf-micon" style="margin-bottom:16px;">3</div>
    <p style="margin:0 0 18px;font-size:clamp(2rem,4vw,2.75rem);font-weight:800;color:#0f172a;">010</p>
    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.35;">Успешных запусков</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">От лендингов до сервисов — доводим до релиза и измеряем эффект после.</p>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf05-stat-cards-alt",
    badge: "BF05",
    title: "Три карточки: акцент по центру",
    hint: "средняя выделена фоном",
    content: `<section data-gjs-name="Преимущества: карточки (вариант)" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,88px) clamp(18px,4vw,28px);background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<div class="bf-row3">
  <div style="background:#fff;border-radius:16px;padding:22px 20px 24px;border:1px solid #e5e7eb;">
    <div class="bf-micon" style="margin-bottom:16px;">25</div>
    <p style="margin:0 0 18px;font-size:clamp(2rem,4vw,2.75rem);font-weight:800;">025</p>
    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.35;">Стран и регионов</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">Работаем удалённо и с учётом локальных особенностей аудитории.</p>
  </div>
  <div style="background:#eff6ff;border-radius:16px;padding:22px 20px 24px;border:1px solid #bfdbfe;box-shadow:0 12px 32px rgba(37,99,235,.12);">
    <div class="bf-micon" style="margin-bottom:16px;">10</div>
    <p style="margin:0 0 18px;font-size:clamp(2rem,4vw,2.75rem);font-weight:800;">010</p>
    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.35;">Ключевых компетенций</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">Закрываем полный цикл: от стратегии и дизайна до внедрения и сопровождения.</p>
  </div>
  <div style="background:#fff;border-radius:16px;padding:22px 20px 24px;border:1px solid #e5e7eb;">
    <div class="bf-micon" style="margin-bottom:16px;">7</div>
    <p style="margin:0 0 18px;font-size:clamp(2rem,4vw,2.75rem);font-weight:800;">007</p>
    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.35;">Дней до первого прототипа</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">Быстро проверяем гипотезы на пользователях и корректируем курс.</p>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf06-split-list",
    badge: "BF06",
    title: "Заголовок, список и фото",
    hint: "текст слева, изображение справа",
    content: `<section data-gjs-name="Преимущества: сплит со списком" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,96px) clamp(18px,4vw,32px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
${BENEFITS_CSS}
<div class="bf-split5020">
  <div>
    <h2 style="margin:0 0 clamp(22px,4vw,32px);font-size:clamp(1.5rem,3vw,2rem);font-weight:800;color:#1e293b;">Заголовок</h2>
    <div class="bf-list-i"><div class="bf-dot"></div><div style="flex:1;min-width:0;"><p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">Индивидуальный подход</p><p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Подбираем формат работы под ваши цели, сроки и бюджет без шаблонных решений.</p></div></div>
    <div class="bf-list-i"><div class="bf-dot"></div><div style="flex:1;min-width:0;"><p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">Предсказуемые сроки</p><p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Фиксируем этапы и отчётность — вы заранее видите план и можете спокойно строить дорожную карту.</p></div></div>
    <div class="bf-list-i"><div class="bf-dot"></div><div style="flex:1;min-width:0;"><p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">Безопасность данных</p><p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Соблюдаем договорённости по NDA, доступам и хранению информации о проекте.</p></div></div>
  </div>
  <div class="bf-split-img">
    <img src="${BENEFITS_IMG.green}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;"/>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf07-carousel",
    badge: "BF07",
    title: "Карусель преимуществ",
    hint: "стрелки и горизонтальный скролл",
    content: `<section data-gjs-name="Преимущества: карусель" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,96px) clamp(18px,4vw,28px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<div style="max-width:1140px;margin:0 auto;">
  <h2 style="margin:0 0 12px;text-align:center;font-size:clamp(1.65rem,3.5vw,2.35rem);font-weight:800;color:#0f172a;">Наши преимущества</h2>
  <p style="margin:0 auto clamp(28px,5vw,40px);max-width:720px;text-align:center;font-size:15px;line-height:1.65;color:#64748b;">${SUB}</p>
  <div class="lemnity-carousel-row">
    ${carouselNav()}
    <div class="lemnity-carousel-track">
      <div class="lemnity-cards-3" style="gap:14px;">
        ${bfCardRu("Доступность", "Предлагаем услуги и поддержку круглосуточно", IC.check)}
        ${bfCardRu("Высокий уровень", "Высокий уровень качества во всем, что делаем", IC.arrow)}
        ${bfCardRu("Персонализация", "Учитываем потребности и предпочтения", IC.chat)}
        ${bfCardRu("Надёжность", "Придерживаемся высоких стандартов надёжности", IC.lock)}
        ${bfCardRu("Эффективность", "Оперативно предлагаем услуги и поддержку", IC.menu)}
        ${bfCardRu("Инновации", "Постоянное развитие и новые технологии", IC.shield)}
      </div>
    </div>
    ${carouselNavRight()}
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf08-bento",
    badge: "BF08",
    title: "Бенто-сетка и фото",
    hint: "асимметричные ячейки",
    content: `<section data-gjs-name="Преимущества: бенто" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,88px) clamp(16px,4vw,28px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<div class="bf-bento8">
  <div class="bf-b-img1"><img src="${BENEFITS_IMG.beige}" alt=""/></div>
  <div class="bf-b-c2">${bfCardRu("Доступность", "Предлагаем услуги и поддержку круглосуточно", IC.check)}</div>
  <div class="bf-b-c3">${bfCardRu("Высокий уровень", "Высокий уровень качества во всем, что делаем", IC.arrow)}</div>
  <div class="bf-b-c4">${bfCardRu("Персонализация", "Учитываем потребности и предпочтения", IC.chat)}</div>
  <div class="bf-b-c5">${bfCardRu("Надёжность", "Придерживаемся высоких стандартов надёжности", IC.lock)}</div>
  <div class="bf-b-img2"><img src="${BENEFITS_IMG.living}" alt=""/></div>
</div>
</section>`,
  },
  {
    id: "benefits-bf09-stats",
    badge: "BF09",
    title: "Результаты в цифрах",
    hint: "четыре показателя в ряд",
    content: `<section data-gjs-name="Преимущества: цифры" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,96px) clamp(18px,4vw,28px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<h2 style="margin:0 0 12px;text-align:center;font-size:clamp(1.55rem,3.2vw,2.15rem);font-weight:800;color:#0f172a;">Результаты в цифрах</h2>
<p style="margin:0 auto clamp(32px,6vw,48px);max-width:760px;text-align:center;font-size:15px;line-height:1.65;color:#64748b;">${SUB}</p>
<div class="bf-stat4">
  <div>
    <div class="bf-icon44">${IC.check}</div>
    <p style="margin:0 0 8px;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;">4 000 +</p>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Выполненных заказов</p>
  </div>
  <div>
    <div class="bf-icon44"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2h8V8h2v12z"/></svg></div>
    <p style="margin:0 0 8px;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;">20 456</p>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Товаров в нашем каталоге</p>
  </div>
  <div>
    <div class="bf-icon44"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#2563eb" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div>
    <p style="margin:0 0 8px;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;">2 дня</p>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Среднее время доставки</p>
  </div>
  <div>
    <div class="bf-icon44">${IC.arrow}</div>
    <p style="margin:0 0 8px;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;">98 %</p>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Клиентов рекомендуют</p>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf10-split-mirror",
    badge: "BF10",
    title: "Фото слева, текст справа",
    hint: "зеркально к сплиту BF06",
    content: `<section data-gjs-name="Преимущества: сплит (фото слева)" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,96px) clamp(18px,4vw,32px);background:#fafafa;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<div class="bf-split5020" style="direction:rtl;">
  <div style="direction:ltr;">
    <div class="bf-split-img">
      <img src="${BENEFITS_IMG.green}" alt="" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;border-radius:16px;"/>
    </div>
  </div>
  <div style="direction:ltr;">
    <h2 style="margin:0 0 clamp(22px,4vw,32px);font-size:clamp(1.5rem,3vw,2rem);font-weight:800;color:#1e293b;">Заголовок</h2>
    <div class="bf-list-i"><div class="bf-dot"></div><div style="flex:1;"><p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">Единая точка входа</p><p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Один менеджер ведёт проект и синхронизирует все роли — меньше согласований и потерь контекста.</p></div></div>
    <div class="bf-list-i"><div class="bf-dot"></div><div style="flex:1;"><p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">Измеримый эффект</p><p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Сводим цели к метрикам и регулярно показываем динамику: трафик, конверсии, загрузка, выручка.</p></div></div>
    <div class="bf-list-i"><div class="bf-dot"></div><div style="flex:1;"><p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">Долгосрочное партнёрство</p><p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Остаёмся рядом после запуска: доработки, эксперименты и развитие продукта по обратной связи.</p></div></div>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf11-aside-grid",
    badge: "BF11",
    title: "Текст и фото + сетка справа",
    hint: "две колонки, мини-карточки",
    content: `<section data-gjs-name="Преимущества: колонка и сетка" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,92px) clamp(18px,4vw,28px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<div class="bf-aside5020">
  <div>
    <h2 style="margin:0 0 14px;font-size:clamp(1.55rem,3vw,2.1rem);font-weight:800;color:#0f172a;">Наши преимущества</h2>
    <p style="margin:0 0 clamp(20px,4vw,28px);font-size:15px;line-height:1.65;color:#64748b;">${SUB}</p>
    <div class="bf-split-img" style="border-radius:14px;">
      <img src="${BENEFITS_IMG.beige}" alt="" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;border-radius:14px;"/>
    </div>
  </div>
  <div class="bf-mini2x2">
    <div style="text-align:center;padding:20px 14px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;">
      <div class="bf-icon44" style="margin-bottom:12px;">${IC.check}</div>
      <h3 style="margin:0 0 8px;font-size:15px;font-weight:800;color:#0f172a;">Доступность</h3>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Предлагаем услуги и поддержку круглосуточно</p>
    </div>
    <div style="text-align:center;padding:20px 14px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;">
      <div class="bf-icon44" style="margin-bottom:12px;">${IC.arrow}</div>
      <h3 style="margin:0 0 8px;font-size:15px;font-weight:800;color:#0f172a;">Высокий уровень</h3>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Высокий уровень качества во всем, что делаем</p>
    </div>
    <div style="text-align:center;padding:20px 14px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;">
      <div class="bf-icon44" style="margin-bottom:12px;">${IC.chat}</div>
      <h3 style="margin:0 0 8px;font-size:15px;font-weight:800;color:#0f172a;">Персонализация</h3>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Учитываем потребности и предпочтения</p>
    </div>
    <div style="text-align:center;padding:20px 14px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;">
      <div class="bf-icon44" style="margin-bottom:12px;">${IC.lock}</div>
      <h3 style="margin:0 0 8px;font-size:15px;font-weight:800;color:#0f172a;">Надёжность</h3>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Придерживаемся высоких стандартов надёжности</p>
    </div>
  </div>
</div>
</section>`,
  },
  {
    id: "benefits-bf12-grid-12",
    badge: "BF12",
    title: "Двенадцать преимуществ",
    hint: "сетка 3×4, адаптивно",
    content: `<section data-gjs-name="Преимущества: сетка 12" class="lemnity-benefits-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,100px) clamp(18px,4vw,28px);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${BENEFITS_CSS}
<h2 style="margin:0 0 12px;text-align:center;font-size:clamp(1.65rem,3.5vw,2.35rem);font-weight:800;color:#0f172a;">Наши преимущества</h2>
<p style="margin:0 auto clamp(32px,6vw,48px);max-width:760px;text-align:center;font-size:15px;line-height:1.65;color:#64748b;">${SUB}</p>
<div class="bf-grid12">
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.check}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Доступность</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Круглосуточная поддержка</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.arrow}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Высокий уровень</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Качество во всём, что делаем</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.chat}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Персонализация</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Учитываем ваши предпочтения</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.lock}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Надёжность</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Высокие стандарты</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.menu}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Эффективность</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Быстрые решения</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.shield}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Инновации</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Новые технологии</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.check}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Гибкость</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Подстраиваемся под задачи</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.chat}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Прозрачность</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Понятные условия</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.arrow}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Опыт</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Проверенная экспертиза</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.lock}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Сопровождение</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Рядом на каждом этапе</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.menu}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Масштаб</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Для бизнеса любого размера</p>
  </div>
  <div style="text-align:center;padding:10px 8px 18px;">
    <div class="bf-icon44">${IC.shield}</div>
    <h3 style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f172a;">Результат</h3>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">Фокус на метриках</p>
  </div>
</div>
</section>`,
  },
];
