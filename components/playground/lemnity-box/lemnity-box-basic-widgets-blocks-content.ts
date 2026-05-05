/**
 * Базовые виджеты в духе Elementor Basic (ссылка на каталог: https://elementor.com/widgets/#basic ).
 * Обёртка: lemnity-basic-w + lemnity-section. Редактирование — как обычные секции в GrapesJS.
 */

const BASIC_WIDGET_CSS = `<style>
.lemnity-basic-w,.lemnity-basic-w *{box-sizing:border-box}
.lemnity-basic-w img{max-width:100%;height:auto;display:block}
.lemnity-basic-w .bw-row{display:flex;flex-wrap:wrap;gap:clamp(16px,3vw,28px);align-items:flex-start}
.lemnity-basic-w .bw-row--center{align-items:center}
.lemnity-basic-w .bw-col{flex:1 1 280px;min-width:0}
.lemnity-basic-w .bw-col--narrow{flex:0 0 260px;max-width:320px}
.lemnity-basic-w .bw-gallery{display:grid;gap:10px;grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:720px){.lemnity-basic-w .bw-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
.lemnity-basic-w .bw-carousel{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch}
.lemnity-basic-w .bw-carousel > *{flex:0 0 min(280px,85vw);scroll-snap-align:start;border-radius:12px;overflow:hidden}
.lemnity-basic-w .bw-progress{height:10px;border-radius:999px;background:#e5e7eb;overflow:hidden}
.lemnity-basic-w .bw-progress > span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#2563eb,#7c3aed);min-width:0;max-width:100%;box-sizing:border-box}
.lemnity-basic-w .bw-stars{color:#f59e0b;letter-spacing:2px;font-size:22px;line-height:1}
.lemnity-basic-w .bw-icon-circle{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#eff6ff;color:#1d4ed8;font-size:24px}
.lemnity-basic-w .bw-social{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.lemnity-basic-w .bw-social a{display:inline-flex;width:40px;height:40px;border-radius:50%;align-items:center;justify-content:center;background:#f1f5f9;color:#334155;text-decoration:none;font-weight:700;font-size:14px}
.lemnity-basic-w .bw-social a:hover{background:#e2e8f0}
@media (prefers-reduced-motion:reduce){
  .lemnity-basic-w .bw-carousel{scroll-behavior:auto}
}
.lemnity-basic-w .lemnity-tab-widget .lemnity-tab-head{display:flex;flex-wrap:wrap;gap:4px;border-bottom:2px solid #e2e8f0;margin-bottom:16px}
.lemnity-basic-w .lemnity-tab-widget .lemnity-tab-trigger{padding:10px 18px;font-weight:700;font-size:14px;border:none;background:transparent;cursor:pointer;color:#94a3b8;border-bottom:2px solid transparent;margin-bottom:-2px;font:inherit;line-height:inherit;border-radius:8px 8px 0 0}
.lemnity-basic-w .lemnity-tab-widget .lemnity-tab-trigger:hover{color:#64748b}
.lemnity-basic-w .lemnity-tab-widget .lemnity-tab-trigger--active{color:#2563eb;border-bottom-color:#2563eb}
.lemnity-basic-w .lemnity-tab-widget .lemnity-tab-panel{padding:16px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:0}
.lemnity-basic-w .lemnity-tab-widget .lemnity-tab-panel[hidden]{display:none !important}
</style>`;

/** Вкладки и простой аккордеон — каталог вариантов блока «Аккордеон» (левая панель), не «Базовые виджеты». */
export const LEMNITY_ACCORDION_LIBRARY_BASIC_WIDGET_VARIANTS = [
  {
    id: "bw-tabs",
    badge: "AC02",
    title: "Tabs — три панели",
    hint: "переключение по клику (на опубликованной странице подключается небольшой скрипт)",
    content: `<section data-gjs-name="Tabs" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div class="lemnity-tab-widget" style="max-width:720px;margin:0 auto;" aria-label="Вкладки">
    <div class="lemnity-tab-head" role="tablist">
      <button type="button" class="lemnity-tab-trigger lemnity-tab-trigger--active" data-lemnity-tab="1" role="tab" aria-selected="true">Вкладка 1</button>
      <button type="button" class="lemnity-tab-trigger" data-lemnity-tab="2" role="tab" aria-selected="false">Вкладка 2</button>
      <button type="button" class="lemnity-tab-trigger" data-lemnity-tab="3" role="tab" aria-selected="false">Вкладка 3</button>
    </div>
    <div class="lemnity-tab-panels">
      <div class="lemnity-tab-panel lemnity-tab-panel--active" data-lemnity-tab-panel="1" role="tabpanel">
        <p style="margin:0;font-size:15px;line-height:1.65;color:#334155;">Содержимое первой вкладки.</p>
      </div>
      <div class="lemnity-tab-panel" data-lemnity-tab-panel="2" role="tabpanel" hidden>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#334155;">Содержимое второй вкладки.</p>
      </div>
      <div class="lemnity-tab-panel" data-lemnity-tab-panel="3" role="tabpanel" hidden>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#334155;">Содержимое третьей вкладки.</p>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-accordion",
    badge: "AC03",
    title: "Accordion (simple)",
    hint: "details/summary",
    content: `<section data-gjs-name="Accordion" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#f8fafc;">
${BASIC_WIDGET_CSS}
  <div style="max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:10px;">
    ${["Первый пункт аккордеона", "Второй пункт аккордеона"]
      .map(
        (title, i) => `<details class="lemnity-details-widget" style="border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:4px 14px;">
      <summary style="cursor:pointer;font-weight:700;font-size:15px;padding:10px 0;color:#0f172a;">${title}</summary>
      <p style="margin:0;padding:0 0 14px;font-size:14px;line-height:1.6;color:#475569;">Ответ или текст раскрывающегося блока ${i + 1}. Отредактируйте через двойной клик.</p>
    </details>`,
      )
      .join("")}
  </div>
</section>`,
  },
];

const IMG = {
  a: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=75",
  b: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=75",
  c: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=75",
  d: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=75",
};

export const LEMNITY_BASIC_WIDGET_BLOCK_VARIANTS = [
  {
    id: "bw-inner-section",
    badge: "BW01",
    title: "Inner Section — две колонки",
    hint: "как внутренняя секция Elementor",
    content: `<section data-gjs-name="Inner Section" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;color:#0f172a;">
${BASIC_WIDGET_CSS}
  <div style="max-width:1100px;margin:0 auto;">
    <div class="bw-row">
      <div class="bw-col">
        <h3 style="margin:0 0 12px;font-size:20px;font-weight:700;">Колонка A</h3>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#475569;">Текст первой колонки. Замените заголовок и абзац.</p>
      </div>
      <div class="bw-col">
        <h3 style="margin:0 0 12px;font-size:20px;font-weight:700;">Колонка B</h3>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#475569;">Текст второй колонки.</p>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-container",
    badge: "BW02",
    title: "Container — ограничитель ширины",
    hint: "центрированный контейнер",
    content: `<section data-gjs-name="Container" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) 16px;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;">
${BASIC_WIDGET_CSS}
  <div style="max-width:720px;margin:0 auto;padding:clamp(24px,4vw,36px);background:#fff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(15,23,42,.06);">
    <p style="margin:0;font-size:15px;line-height:1.65;color:#475569;">Контент внутри контейнера. Настройте max-width через стили секции при необходимости.</p>
  </div>
</section>`,
  },
  {
    id: "bw-heading",
    badge: "BW03",
    title: "Heading",
    hint: "заголовок и подзаголовок",
    content: `<section data-gjs-name="Heading" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(32px,5vw,56px) clamp(16px,3vw,28px);font-family:system-ui,sans-serif;background:#fff;color:#0f172a;text-align:center;">
${BASIC_WIDGET_CSS}
  <div style="max-width:800px;margin:0 auto;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#64748b;">Подзаголовок</p>
    <h2 style="margin:0;font-size:clamp(26px,4vw,40px);font-weight:800;line-height:1.15;">Сильный заголовок секции</h2>
  </div>
</section>`,
  },
  {
    id: "bw-image",
    badge: "BW04",
    title: "Image",
    hint: "одно изображение",
    content: `<section data-gjs-name="Image" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:920px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <img src="${IMG.a}" alt="Пример изображения" width="920" height="520" style="width:100%;height:auto;object-fit:cover;"/>
  </div>
</section>`,
  },
  {
    id: "bw-text-editor",
    badge: "BW05",
    title: "Text Editor",
    hint: "несколько абзацев",
    content: `<section data-gjs-name="Text Editor" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,28px);font-family:system-ui,sans-serif;background:#fff;color:#0f172a;">
${BASIC_WIDGET_CSS}
  <div style="max-width:680px;margin:0 auto;">
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#334155;">Первый абзац: расскажите о продукте или услуге простым языком.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;color:#334155;">Второй абзац: добавьте детали, выгоды или призыв к действию.</p>
  </div>
</section>`,
  },
  {
    id: "bw-video",
    badge: "BW06",
    title: "Video",
    hint: "встраивание YouTube",
    content: `<section data-gjs-name="Video" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#0f172a;color:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:900px;margin:0 auto;">
    <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;background:#000;">
      <iframe style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="https://www.youtube-nocookie.com/embed/YE7VzlLtp-4" title="Видео" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
    <p style="margin:12px 0 0;font-size:13px;opacity:.75;text-align:center;">Замените ссылку на свой embed.</p>
  </div>
</section>`,
  },
  {
    id: "bw-button",
    badge: "BW07",
    title: "Button",
    hint: "основная кнопка",
    content: `<section data-gjs-name="Button" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,44px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fafafa;text-align:center;">
${BASIC_WIDGET_CSS}
  <div style="max-width:640px;margin:0 auto;">
    <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 28px;border-radius:999px;background:#2563eb;color:#fff;font-weight:700;font-size:15px;text-decoration:none;box-shadow:0 4px 14px rgba(37,99,235,.35);">Нажмите здесь</a>
  </div>
</section>`,
  },
  {
    id: "bw-star-rating",
    badge: "BW08",
    title: "Star Rating",
    hint: "оценка звёздами",
    content: `<section data-gjs-name="Star Rating" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) 16px;font-family:system-ui,sans-serif;background:#fff;text-align:center;">
${BASIC_WIDGET_CSS}
  <div class="bw-stars" aria-label="Рейтинг 5 из 5">★★★★★</div>
  <p style="margin:10px 0 0;font-size:14px;color:#64748b;">4.9 из 5 · 128 отзывов</p>
</section>`,
  },
  {
    id: "bw-divider",
    badge: "BW09",
    title: "Divider",
    hint: "линия-разделитель",
    content: `<section data-gjs-name="Divider" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(16px,3vw,28px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:960px;margin:0 auto;">
    <hr style="border:0;height:2px;background:linear-gradient(90deg,transparent,#cbd5e1,transparent);margin:0;"/>
  </div>
</section>`,
  },
  {
    id: "bw-google-maps",
    badge: "BW10",
    title: "Google Maps",
    hint: "iframe карты",
    content: `<section data-gjs-name="Google Maps" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#f1f5f9;">
${BASIC_WIDGET_CSS}
  <div style="max-width:960px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;height:320px;">
    <iframe title="Карта" src="https://maps.google.com/maps?q=Moscow&output=embed" style="width:100%;height:100%;border:0;"></iframe>
  </div>
</section>`,
  },
  {
    id: "bw-icon",
    badge: "BW11",
    title: "Icon",
    hint: "иконка в круге",
    content: `<section data-gjs-name="Icon" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,44px) 16px;font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="display:flex;justify-content:center;">
    <div class="bw-icon-circle" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg></div>
  </div>
</section>`,
  },
  {
    id: "bw-icon-box",
    badge: "BW12",
    title: "Icon Box ×3",
    hint: "иконка, заголовок, текст",
    content: `<section data-gjs-name="Icon Box" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(36px,5vw,56px) clamp(16px,3vw,28px);font-family:system-ui,sans-serif;background:#fff;color:#0f172a;">
${BASIC_WIDGET_CSS}
  <div style="max-width:1040px;margin:0 auto;">
    <div class="bw-row">
      ${[1, 2, 3]
        .map(
          (i) => `<div class="bw-col" style="text-align:center;">
        <div style="display:flex;justify-content:center;margin-bottom:14px;"><div class="bw-icon-circle">${i}</div></div>
        <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;">Заголовок ${i}</h3>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Краткое описание пункта.</p>
      </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-image-box",
    badge: "BW13",
    title: "Image Box",
    hint: "изображение + текст",
    content: `<section data-gjs-name="Image Box" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fafafa;">
${BASIC_WIDGET_CSS}
  <div style="max-width:960px;margin:0 auto;">
    <div class="bw-row bw-row--center">
      <div class="bw-col">
        <img src="${IMG.b}" alt="" width="420" height="280" style="border-radius:12px;border:1px solid #e2e8f0;"/>
      </div>
      <div class="bw-col">
        <h3 style="margin:0 0 12px;font-size:22px;font-weight:800;">Заголовок рядом с фото</h3>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#475569;">Текст блока Image Box: замените изображение через медиатеку редактора.</p>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-gallery",
    badge: "BW14",
    title: "Basic Gallery",
    hint: "сетка изображений",
    content: `<section data-gjs-name="Gallery" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:960px;margin:0 auto;">
    <div class="bw-gallery">
      ${[IMG.a, IMG.c, IMG.d, IMG.b]
        .map((src) => `<div style="aspect-ratio:1;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;"><img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;"/></div>`)
        .join("")}
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-carousel",
    badge: "BW15",
    title: "Image Carousel",
    hint: "горизонтальная прокрутка",
    content: `<section data-gjs-name="Carousel" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#f8fafc;">
${BASIC_WIDGET_CSS}
  <div style="max-width:1000px;margin:0 auto;">
    <div class="bw-carousel">
      ${[IMG.a, IMG.c, IMG.d]
        .map((src) => `<div><img src="${src}" alt="" style="width:100%;height:180px;object-fit:cover;"/></div>`)
        .join("")}
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-icon-list",
    badge: "BW16",
    title: "Icon List",
    hint: "список с маркерами",
    content: `<section data-gjs-name="Icon List" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,44px) clamp(16px,3vw,28px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:560px;margin:0 auto;">
    <ul style="margin:0;padding:0;list-style:none;">
      ${["Быстрый старт без лишней бюрократии", "Понятная отчётность по этапам", "Поддержка после запуска"]
        .map(
          (t) => `<li style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;font-size:15px;line-height:1.55;color:#334155;">
        <span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">✓</span>
        <span>${t}</span>
      </li>`,
        )
        .join("")}
    </ul>
  </div>
</section>`,
  },
  {
    id: "bw-counter",
    badge: "BW17",
    title: "Counter",
    hint: "числа в ряд",
    content: `<section data-gjs-name="Counter" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(32px,5vw,52px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#1e293b;color:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:900px;margin:0 auto;">
    <div class="bw-row" style="text-align:center;">
      <div class="bw-col">
        <div style="font-size:clamp(32px,5vw,44px);font-weight:800;font-variant-numeric:tabular-nums;">120+</div>
        <div style="margin-top:6px;font-size:13px;opacity:.85;">проектов</div>
      </div>
      <div class="bw-col">
        <div style="font-size:clamp(32px,5vw,44px);font-weight:800;font-variant-numeric:tabular-nums;">15</div>
        <div style="margin-top:6px;font-size:13px;opacity:.85;">лет опыта</div>
      </div>
      <div class="bw-col">
        <div style="font-size:clamp(32px,5vw,44px);font-weight:800;font-variant-numeric:tabular-nums;">98%</div>
        <div style="margin-top:6px;font-size:13px;opacity:.85;">довольных клиентов</div>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-spacer",
    badge: "BW18",
    title: "Spacer",
    hint: "вертикальный отступ",
    content: `<section data-gjs-name="Spacer" class="lemnity-basic-w lemnity-section" style="margin:0;padding:0;background:transparent;">
${BASIC_WIDGET_CSS}
  <div style="height:min(72px,12vw);min-height:32px;" aria-hidden="true"></div>
</section>`,
  },
  {
    id: "bw-testimonial",
    badge: "BW19",
    title: "Testimonial",
    hint: "цитата клиента",
    content: `<section data-gjs-name="Testimonial" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(36px,5vw,56px) clamp(16px,3vw,28px);font-family:system-ui,sans-serif;background:#fefce8;">
${BASIC_WIDGET_CSS}
  <div style="max-width:720px;margin:0 auto;text-align:center;">
    <p style="margin:0;font-size:clamp(17px,2.5vw,21px);line-height:1.55;font-weight:600;color:#422006;">«Команда закрыла задачу в срок и с отличной коммуникацией. Рекомендуем.»</p>
    <p style="margin:16px 0 0;font-size:14px;color:#854d0e;"><strong>Имя Фамилия</strong> · должность, компания</p>
  </div>
</section>`,
  },
  {
    id: "bw-toggle",
    badge: "BW21",
    title: "Toggle",
    hint: "один раскрывающийся блок",
    content: `<section data-gjs-name="Toggle" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,44px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:640px;margin:0 auto;">
    <details class="lemnity-details-widget" style="border:1px solid #e2e8f0;border-radius:10px;padding:4px 16px;background:#fafafa;">
      <summary style="cursor:pointer;font-weight:700;font-size:15px;padding:12px 0;">Показать подробности</summary>
      <p style="margin:0;padding:0 0 14px;font-size:14px;line-height:1.65;color:#475569;">Скрытый текст виджета Toggle.</p>
    </details>
  </div>
</section>`,
  },
  {
    id: "bw-social-icons",
    badge: "BW22",
    title: "Social Icons",
    hint: "иконки соцсетей",
    content: `<section data-gjs-name="Social Icons" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) 16px;font-family:system-ui,sans-serif;background:#fff;text-align:center;">
${BASIC_WIDGET_CSS}
  <div class="bw-social" style="justify-content:center;">
    <a href="#" aria-label="Telegram">TG</a>
    <a href="#" aria-label="VK">VK</a>
    <a href="#" aria-label="YouTube">YT</a>
    <a href="#" aria-label="GitHub">Gh</a>
  </div>
</section>`,
  },
  {
    id: "bw-progress",
    badge: "BW23",
    title: "Progress Bar",
    hint: "подпись и процент — двойной клик по тексту; длина полоски — выберите «Заполнение» и задайте width (%) в стилях",
    content: `<section data-gjs-name="Progress Bar" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,44px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div data-gjs-name="Progress — блок" style="max-width:480px;margin:0 auto;">
    <div data-gjs-name="Progress — строка текста" style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px;font-size:13px;font-weight:600;color:#475569;">
      <span data-gjs-name="Подпись">Готовность</span>
      <span data-gjs-name="Процент" style="font-variant-numeric:tabular-nums;">72%</span>
    </div>
    <div data-gjs-name="Трек" class="bw-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="72" aria-valuetext="72%" aria-label="Прогресс">
      <span data-gjs-name="Заполнение" style="width:72%;"></span>
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-soundcloud",
    badge: "BW24",
    title: "SoundCloud",
    hint: "встраивание трека",
    content: `<section data-gjs-name="SoundCloud" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fafafa;">
${BASIC_WIDGET_CSS}
  <div style="max-width:700px;margin:0 auto;height:166px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;background:#fff;">
    <iframe title="SoundCloud" width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%232563eb"></iframe>
  </div>
  <p style="margin:12px auto 0;max-width:700px;font-size:12px;color:#64748b;text-align:center;">Замените URL трека в коде iframe при необходимости.</p>
</section>`,
  },
  {
    id: "bw-shortcode",
    badge: "BW25",
    title: "Shortcode (заглушка)",
    hint: "без WordPress — замените на HTML или виджет",
    content: `<section data-gjs-name="Shortcode" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:560px;margin:0 auto;padding:20px;border-radius:12px;border:2px dashed #cbd5e1;background:#f8fafc;text-align:center;">
    <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">В WordPress здесь был бы шорткод. В Lemnity Box вставьте нужный HTML или подключите форму/блок из каталога.</p>
  </div>
</section>`,
  },
  {
    id: "bw-html",
    badge: "BW26",
    title: "HTML",
    hint: "произвольная разметка",
    content: `<section data-gjs-name="HTML" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;">
${BASIC_WIDGET_CSS}
  <div style="max-width:720px;margin:0 auto;font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.5;padding:16px;border-radius:10px;background:#1e293b;border:1px solid #334155;">
    &lt;!-- Ваш HTML или скрипт разметки --&gt;<br/>
    &lt;p&gt;Пример произвольного фрагмента&lt;/p&gt;
  </div>
</section>`,
  },
  {
    id: "bw-menu-anchor",
    badge: "BW27",
    title: "Menu Anchor",
    hint: "якорь для ссылок меню",
    content: `<section data-gjs-name="Menu Anchor" class="lemnity-basic-w lemnity-section" style="margin:0;padding:12px 16px;font-family:system-ui,sans-serif;background:transparent;">
${BASIC_WIDGET_CSS}
  <div style="max-width:960px;margin:0 auto;padding:10px 14px;border-radius:8px;background:#f1f5f9;font-size:12px;color:#64748b;display:flex;align-items:center;gap:10px;">
    <span style="font-weight:700;color:#334155;">Якорь:</span>
    <code style="background:#fff;padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0;">#sec-contact</code>
    <span id="sec-contact" style="flex:1;height:1px;background:transparent;"></span>
  </div>
</section>`,
  },
  {
    id: "bw-alert",
    badge: "BW28",
    title: "Alert",
    hint: "уведомление",
    content: `<section data-gjs-name="Alert" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(24px,4vw,40px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:640px;margin:0 auto;padding:16px 18px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:14px;line-height:1.55;">
    <strong>Внимание:</strong> здесь важное сообщение для посетителей. Замените текст и при необходимости цвет фона.
  </div>
</section>`,
  },
  {
    id: "bw-sidebar",
    badge: "BW29",
    title: "Sidebar layout",
    hint: "боковая колонка + контент",
    content: `<section data-gjs-name="Sidebar" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) clamp(16px,3vw,24px);font-family:system-ui,sans-serif;background:#f8fafc;">
${BASIC_WIDGET_CSS}
  <div style="max-width:1040px;margin:0 auto;">
    <div class="bw-row">
      <aside class="bw-col bw-col--narrow" style="padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase;">Сайдбар</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">Ссылки, виджеты или краткая навигация.</p>
      </aside>
      <div class="bw-col" style="padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
        <h3 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0f172a;">Основной контент</h3>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#475569;">Текст статьи или секции рядом с боковой колонкой.</p>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "bw-text-path",
    badge: "BW30",
    title: "Text Path (упрощённо)",
    hint: "текст по кривой SVG",
    content: `<section data-gjs-name="Text Path" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(28px,4vw,48px) 16px;font-family:system-ui,sans-serif;background:#111827;color:#fff;">
${BASIC_WIDGET_CSS}
  <div style="max-width:640px;margin:0 auto;">
    <svg viewBox="0 0 400 120" width="100%" height="120" aria-label="Текст по траектории">
      <defs>
        <path id="bw-tp-curve" d="M 20 80 Q 200 20 380 80" fill="none"/>
      </defs>
      <text font-size="22" font-weight="800" fill="#fff">
        <textPath href="#bw-tp-curve" startOffset="50%" text-anchor="middle">Lemnity · ваш бренд · motion</textPath>
      </text>
    </svg>
  </div>
</section>`,
  },
  {
    id: "bw-link-in-bio",
    badge: "BW31",
    title: "Link in Bio",
    hint: "профиль и кнопки-ссылки",
    content: `<section data-gjs-name="Link in Bio" class="lemnity-basic-w lemnity-section" style="margin:0;padding:clamp(36px,6vw,56px) 16px;font-family:system-ui,sans-serif;background:linear-gradient(165deg,#e0e7ff,#fdf4ff);">
${BASIC_WIDGET_CSS}
  <div style="max-width:400px;margin:0 auto;text-align:center;">
    <div style="width:88px;height:88px;margin:0 auto 14px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 8px 24px rgba(99,102,241,.25);">
      <img src="${IMG.d}" alt="" style="width:100%;height:100%;object-fit:cover;"/>
    </div>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e1b4b;">Ваше имя</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Короткий статус или описание</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${["Сайт", "Портфолио", "Написать"]
        .map(
          (label) => `<a href="#" style="display:block;padding:14px 18px;border-radius:999px;background:#fff;color:#312e81;font-weight:700;font-size:15px;text-decoration:none;border:1px solid #e9d5ff;box-shadow:0 2px 8px rgba(15,23,42,.06);">${label}</a>`,
        )
        .join("")}
    </div>
  </div>
</section>`,
  },
];
