/**
 * Секция «Кнопка»: CTA, соцсети, баннеры, магазины приложений.
 * Обёртка: lemnity-btn-s + lemnity-section.
 */

const BTN_CSS = `<style>
.lemnity-btn-s,.lemnity-btn-s *{box-sizing:border-box}
.lemnity-btn-s a{text-decoration:none}
.leb-app-badges{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center}
.leb-app-badges a{display:block;line-height:0}
@media (max-width:520px){.leb-app-badges{flex-direction:column}}
.leb-cta-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:clamp(24px,5vw,48px);align-items:center;max-width:1140px;margin:0 auto}
@media (max-width:900px){.leb-cta-split{grid-template-columns:1fr}}
.leb-mock-browser{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.08)}
.leb-mock-bar{height:36px;background:#f3f4f6;display:flex;align-items:center;padding:0 12px;gap:6px;border-bottom:1px solid #e5e7eb}
.leb-mock-dot{width:9px;height:9px;border-radius:50%;background:#d1d5db}
.leb-dark-cta{position:relative;padding:clamp(48px,8vw,96px) clamp(20px,4vw,40px);text-align:center;background:#0f172a;color:#fff;font-family:system-ui,sans-serif}
.leb-dark-cta .leb-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.35}
.leb-dark-cta .leb-ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,.75),rgba(15,23,42,.88))}
.leb-dark-cta .leb-in{position:relative;z-index:1;max-width:640px;margin:0 auto}
</style>`;

const I_FB = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-9.294H6.877v-3.622h2.224v-2.71c0-2.073 1.327-3.769 3.599-3.769h2.775v3.486H12.82c-.314 0-.692.162-.692.82v1.647h3.148l-.367 3.624h-2.781V23.691H9.101z"/></svg>`;

const I_TW = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;

const I_WA = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>`;

const I_IG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>`;

const I_DL = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0l4-4m-4 4L8 11M5 21h14" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const I_UP = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const I_CHV = `<span style="opacity:.9;font-weight:700">›</span>`;

const IU = "https://images.unsplash.com";

export const LEMNITY_BUTTON_BLOCK_VARIANTS = [
  {
    id: "btn-bf01-social-icons-row",
    badge: "BF01",
    title: "Иконки соцсетей в ряд",
    hint: "Facebook, X, WhatsApp, Instagram",
    content: `<section data-gjs-name="Кнопки: соцсети ряд" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,48px) 20px;background:#fff;font-family:system-ui,sans-serif;">
${BTN_CSS}
<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center">
<a href="#" aria-label="Facebook" style="width:52px;height:52px;border-radius:10px;background:#3b5998;color:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.12)">${I_FB}</a>
<a href="#" aria-label="X" style="width:52px;height:52px;border-radius:10px;background:#1da1f2;color:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.12)">${I_TW}</a>
<a href="#" aria-label="WhatsApp" style="width:52px;height:52px;border-radius:10px;background:#25d366;color:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.12)">${I_WA}</a>
<a href="#" aria-label="Instagram" style="width:52px;height:52px;border-radius:10px;background:#e1306c;color:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.12)">${I_IG}</a>
</div>
</section>`,
  },
  {
    id: "btn-bf02-social-list-vertical",
    badge: "BF02",
    title: "Соцсети колонкой",
    hint: "полоса: иконка, название, стрелка",
    content: `<section data-gjs-name="Кнопки: соцсети столбик" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,48px) clamp(16px,4vw,32px);background:#fff;font-family:system-ui,sans-serif;position:relative;">
${BTN_CSS}
<div style="position:absolute;top:20px;right:20px;color:#e5e7eb;font-size:18px;pointer-events:none" aria-hidden="true">★</div>
<div style="max-width:400px;margin:0 auto;display:flex;flex-direction:column;gap:10px">
<a href="#" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:10px;background:#3b5998;color:#fff;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.1)"><span style="display:flex;width:26px;justify-content:center">${I_FB}</span><span style="flex:1">Facebook</span>${I_CHV}</a>
<a href="#" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:10px;background:#1da1f2;color:#fff;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.1)"><span style="display:flex;width:26px;justify-content:center">${I_TW}</span><span style="flex:1">Twitter</span>${I_CHV}</a>
<a href="#" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:10px;background:#25d366;color:#fff;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.1)"><span style="display:flex;width:26px;justify-content:center">${I_WA}</span><span style="flex:1">WhatsApp</span>${I_CHV}</a>
<a href="#" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:10px;background:#e1306c;color:#fff;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.1)"><span style="display:flex;width:26px;justify-content:center">${I_IG}</span><span style="flex:1">Instagram</span>${I_CHV}</a>
</div>
</section>`,
  },
  {
    id: "btn-bf906-announcement-bar",
    badge: "BF906",
    title: "Панель для анонса",
    hint: "синяя полоса, текст и кнопка",
    content: `<section data-gjs-name="Кнопки: анонс" class="lemnity-btn-s lemnity-section" style="margin:0;padding:0;font-family:system-ui,sans-serif;">
${BTN_CSS}
<div style="background:#2563eb;color:#fff;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px;text-align:center">
<p style="margin:0;font-size:14px;font-weight:600;flex:1 1 220px">Скидка 15% до конца месяца. Успейте воспользоваться!</p>
<a href="#" style="display:inline-block;padding:10px 22px;background:#fff;color:#2563eb;font-weight:800;font-size:12px;letter-spacing:.06em;border-radius:999px;text-transform:uppercase;white-space:nowrap">Узнать больше</a>
</div>
</section>`,
  },
  {
    id: "btn-bf04-pdf-link",
    badge: "BF04",
    title: "Ссылка на файл PDF",
    hint: "иконка документа и подпись",
    content: `<section data-gjs-name="Кнопки: PDF" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(32px,6vw,56px) 20px;background:#fff;font-family:system-ui,sans-serif;">
${BTN_CSS}
<div style="display:flex;justify-content:center">
<a href="#" style="display:inline-flex;align-items:center;gap:12px;color:#111;font-weight:600;font-size:16px">
<span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:2px solid #ea580c;border-radius:8px;color:#ea580c;font-size:10px;font-weight:800">PDF</span>
Скачать файл
</a>
</div>
</section>`,
  },
  {
    id: "btn-bf05-app-stores",
    badge: "BF05",
    title: "Магазины приложений",
    hint: "заголовок и бейджи App Store / Google Play",
    content: `<section data-gjs-name="Кнопки: приложения" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(40px,7vw,80px) clamp(18px,4vw,32px);background:#fff;font-family:system-ui,sans-serif;position:relative;color:#111;">
${BTN_CSS}
<div style="position:absolute;top:22px;right:22px;color:#e5e7eb;font-size:20px;pointer-events:none" aria-hidden="true">★</div>
<div style="max-width:560px;margin:0 auto;text-align:center">
<h2 style="margin:0 0 14px;font-size:clamp(22px,3vw,32px);font-weight:800;line-height:1.2">Начните бесплатно</h2>
<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#6b7280">Приложение доступно в App Store и Google Play. Отслеживайте тренировки и прогресс каждый день.</p>
<div class="leb-app-badges">
<a href="#" style="min-width:140px;padding:12px 18px;background:#111;color:#fff;border-radius:12px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg><span style="text-align:left;line-height:1.2"><small style="display:block;font-size:9px;font-weight:500;opacity:.85">Загрузить в</small>App Store</span></a>
<a href="#" style="min-width:140px;padding:12px 18px;background:#111;color:#fff;border-radius:12px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ea4335" d="M3.6 3.6L12 12l-8.4 8.4z"/><path fill="#fbbc04" d="M20.4 12L12 12l8.4 8.4c1.3-1.3 2-3 2-4.8V8.8c0-1.8-.7-3.5-2-4.8z"/><path fill="#34a853" d="M12 12l8.4-8.4C19.1 1.8 17.3 1 15.2 1H8.8C6.7 1 4.9 1.8 3.6 3.6L12 12z"/><path fill="#4285f4" d="M3.6 3.6C2.3 4.9 1.6 6.6 1.6 8.4v7.2c0 1.8.7 3.5 2 4.8L12 12 3.6 3.6z"/></svg><span style="text-align:left;line-height:1.2"><small style="display:block;font-size:9px;font-weight:500;opacity:.85">Доступно в</small>Google Play</span></a>
</div>
</div>
</section>`,
  },
  {
    id: "btn-bf701-submit-corner",
    badge: "BF701",
    title: "Кнопка Submit в углу",
    hint: "макет окна браузера, чёрная кнопка",
    content: `<section data-gjs-name="Кнопки: submit угол" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px);background:#f8fafc;font-family:system-ui,sans-serif;">
${BTN_CSS}
<div class="leb-mock-browser" style="max-width:720px;margin:0 auto">
<div class="leb-mock-bar"><span class="leb-mock-dot"></span><span class="leb-mock-dot"></span><span class="leb-mock-dot"></span></div>
<div style="position:relative;min-height:160px;padding:20px;background:#fff">
<a href="#" style="position:absolute;top:16px;right:16px;display:inline-block;padding:12px 28px;background:#111;color:#fff;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;border-radius:4px">Отправить</a>
</div>
</div>
</section>`,
  },
  {
    id: "btn-bf07-career-laptop",
    badge: "BF07",
    title: "Карьера: текст и ноутбук",
    hint: "две кнопки-капсулы и фото",
    content: `<section data-gjs-name="Кнопки: карьера" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,72px) clamp(18px,4vw,36px);background:#f3f4f6;font-family:system-ui,sans-serif;color:#111;">
${BTN_CSS}
<div style="max-width:1080px;margin:0 auto;text-align:center">
<h2 style="margin:0 0 clamp(28px,4vw,40px);font-size:clamp(24px,3vw,34px);font-weight:800">Улучшите карьерные перспективы</h2>
<div class="leb-cta-split" style="text-align:left">
<div>
<p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4b5563">Мы подготовили профессиональный курс — первое занятие бесплатно. Посмотрите прямо сейчас!</p>
<div style="display:flex;flex-wrap:wrap;gap:12px">
<a href="#" style="display:inline-block;padding:14px 26px;background:#2563eb;color:#fff;font-weight:700;font-size:14px;border-radius:999px">Получить доступ</a>
<a href="#" style="display:inline-block;padding:14px 26px;background:#e5e7eb;color:#111;font-weight:700;font-size:14px;border-radius:999px">Подробнее</a>
</div>
<p style="margin:18px 0 0;font-size:12px;color:#9ca3af">Если не подойдёт — вернём оплату.</p>
</div>
<div style="border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,.12)">
<img src="${IU}/photo-1518770660439-4636190af475?w=900&q=80" alt="" style="width:100%;display:block;aspect-ratio:4/3;object-fit:cover"/>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "btn-bf08-download-filled",
    badge: "BF08",
    title: "Скачать файл (заливка)",
    hint: "чёрная кнопка с иконкой",
    content: `<section data-gjs-name="Кнопки: скачать заливка" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(36px,6vw,64px) 20px;background:#fff;font-family:system-ui,sans-serif;position:relative;">
${BTN_CSS}
<div style="position:absolute;top:18px;right:22px;color:#e5e7eb;font-size:18px;pointer-events:none" aria-hidden="true">★</div>
<div style="display:flex;justify-content:center">
<a href="#" style="display:inline-flex;align-items:center;gap:12px;padding:16px 28px;background:#111;color:#fff;font-weight:700;font-size:15px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.2)">${I_DL}<span>Скачать файл</span></a>
</div>
</section>`,
  },
  {
    id: "btn-bf09-back-top",
    badge: "BF09",
    title: "Наверх",
    hint: "круглая чёрная кнопка со стрелкой",
    content: `<section data-gjs-name="Кнопки: наверх" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(40px,8vw,80px) 20px;background:#fff;font-family:system-ui,sans-serif;position:relative;">
${BTN_CSS}
<div style="position:absolute;top:20px;right:24px;color:#e5e7eb;font-size:18px;pointer-events:none" aria-hidden="true">★</div>
<div style="display:flex;justify-content:center">
<a href="#" aria-label="Наверх" style="width:52px;height:52px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,.18)">${I_UP}</a>
</div>
</section>`,
  },
  {
    id: "btn-bf10-bar-serif",
    badge: "BF10",
    title: "Полоса: текст и кнопка",
    hint: "серый фон, кнопка справа",
    content: `<section data-gjs-name="Кнопки: полоса" class="lemnity-btn-s lemnity-section" style="margin:0;padding:0;font-family:Georgia,serif;">
${BTN_CSS}
<div style="background:#e5e7eb;padding:18px clamp(18px,4vw,36px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;max-width:1140px;margin:0 auto">
<p style="margin:0;font-size:clamp(15px,2vw,18px);color:#111;font-weight:500;flex:1 1 240px">Книга и дизайн — искусство вплетения содержания.</p>
<a href="#" style="font-family:system-ui,sans-serif;display:inline-block;padding:12px 26px;background:#2563eb;color:#fff;font-weight:700;font-size:14px;border-radius:4px;white-space:nowrap">Поехали!</a>
</div>
</section>`,
  },
  {
    id: "btn-bf11-dark-hero-cta",
    badge: "BF11",
    title: "Тёмный баннер с фото",
    hint: "подложка, заголовок и капсула",
    content: `<section data-gjs-name="Кнопки: тёмный баннер" class="leb-dark-cta lemnity-btn-s lemnity-section" style="margin:0;">
${BTN_CSS}
<div class="leb-bg" style="background-image:url(${IU}/photo-1497215728101-856f246ea633?w=1600&q=80)"></div>
<div class="leb-ov"></div>
<div class="leb-in">
<h2 style="margin:0 0 12px;font-size:clamp(22px,3.4vw,34px);font-weight:800;line-height:1.15">Улучшите карьерные перспективы</h2>
<p style="margin:0 0 28px;font-size:16px;line-height:1.6;opacity:.92">Мы подготовили новый курс — первая лекция бесплатно.</p>
<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px">
<svg width="56" height="40" viewBox="0 0 56 40" fill="none" aria-hidden="true" style="flex-shrink:0"><path d="M4 32c8-18 28-22 40-8" stroke="#facc15" stroke-width="2" stroke-linecap="round"/><path d="M44 20l8 4-6 6" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
<a href="#" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#fff;font-weight:700;font-size:15px;border-radius:999px">Бесплатный урок</a>
</div>
</div>
</section>`,
  },
  {
    id: "btn-bf802a-column-blue",
    badge: "BF802A",
    title: "Кнопки в одну колонку",
    hint: "синие полосы и стрелка",
    content: `<section data-gjs-name="Кнопки: колонка" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(32px,6vw,56px) clamp(16px,4vw,28px);background:#fff;font-family:system-ui,sans-serif;">
${BTN_CSS}
<div style="max-width:440px;margin:0 auto;display:flex;flex-direction:column;gap:10px">
<a href="#" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:#2563eb;color:#fff;font-weight:600;font-size:15px;border-radius:8px;box-shadow:0 2px 10px rgba(37,99,235,.3)"><span>Цифровая иллюстрация</span>${I_CHV}</a>
<a href="#" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:#2563eb;color:#fff;font-weight:600;font-size:15px;border-radius:8px;box-shadow:0 2px 10px rgba(37,99,235,.3)"><span>Веб-дизайн</span>${I_CHV}</a>
<a href="#" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:#2563eb;color:#fff;font-weight:600;font-size:15px;border-radius:8px;box-shadow:0 2px 10px rgba(37,99,235,.3)"><span>Коммуникационный дизайн</span>${I_CHV}</a>
<a href="#" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:#2563eb;color:#fff;font-weight:600;font-size:15px;border-radius:8px;box-shadow:0 2px 10px rgba(37,99,235,.3)"><span>Моушн-дизайн</span>${I_CHV}</a>
</div>
</section>`,
  },
  {
    id: "btn-bf104-giant",
    badge: "BF104",
    title: "Гигантская кнопка",
    hint: "на всю ширину контейнера",
    content: `<section data-gjs-name="Кнопки: гигант" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,48px) clamp(12px,3vw,24px);background:#fff;font-family:system-ui,sans-serif;">
${BTN_CSS}
<a href="#" style="display:block;width:100%;max-width:100%;padding:22px 20px;background:#2563eb;color:#fff;font-weight:800;font-size:clamp(17px,2.4vw,22px);text-align:center;border-radius:10px;box-shadow:0 8px 28px rgba(37,99,235,.35)">Купить билеты!</a>
</section>`,
  },
  {
    id: "btn-bf13-lesson-arrow",
    badge: "BF13",
    title: "Запись на урок",
    hint: "стрелка к синей капсуле",
    content: `<section data-gjs-name="Кнопки: урок" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(44px,7vw,88px) clamp(18px,4vw,32px);background:#f3f4f6;font-family:system-ui,sans-serif;color:#111;">
${BTN_CSS}
<div style="max-width:520px;margin:0 auto;text-align:center;position:relative">
<h2 style="margin:0 0 14px;font-size:clamp(22px,3vw,30px);font-weight:800">Запишитесь на бесплатный урок</h2>
<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#4b5563">Выберите удобное время и познакомьтесь с нашей онлайн-школой на пробном занятии.</p>
<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px">
<svg width="72" height="36" viewBox="0 0 72 36" fill="none" aria-hidden="true"><path d="M8 8c14 20 40 24 54 10" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/><path d="M58 12l10-2-2 10" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
<a href="#" style="display:inline-block;padding:14px 30px;background:#2563eb;color:#fff;font-weight:700;font-size:15px;border-radius:999px">Записаться</a>
</div>
</div>
</section>`,
  },
  {
    id: "btn-bf14-outline-center",
    badge: "BF14",
    title: "Контурная по центру",
    hint: "белая заливка, чёрная рамка",
    content: `<section data-gjs-name="Кнопки: контур" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(48px,10vw,100px) 20px;background:#fff;font-family:system-ui,sans-serif;">
${BTN_CSS}
<div style="display:flex;justify-content:center">
<a href="#" style="display:inline-block;padding:16px 36px;border:2px solid #111;color:#111;font-weight:700;font-size:16px;background:#fff;border-radius:4px">Поехали!</a>
</div>
</section>`,
  },
  {
    id: "btn-bf15-pair-filled-outline",
    badge: "BF15",
    title: "Две кнопки рядом",
    hint: "заливка и контур",
    content: `<section data-gjs-name="Кнопки: пара" class="lemnity-btn-s lemnity-section" style="margin:0;padding:clamp(36px,6vw,64px) 20px;background:#fff;font-family:system-ui,sans-serif;">
${BTN_CSS}
<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:center">
<a href="#" style="display:inline-block;padding:16px 32px;background:#0d9488;color:#fff;font-weight:800;font-size:15px;border-radius:2px">Поехали!</a>
<a href="#" style="display:inline-block;padding:16px 32px;background:#fff;color:#111;font-weight:800;font-size:15px;border:3px solid #111;border-radius:2px">Читать далее</a>
</div>
</section>`,
  },
];
