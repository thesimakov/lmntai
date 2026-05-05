/** Секции типа «Список»: сетки карточек, сплиты, статистика, тёмная полоса. Класс-обёртка: lemnity-list-s */

const LIST_RESPONSIVE_CSS = `<style>
.lemnity-list-s,.lemnity-list-s *{box-sizing:border-box}
.lemnity-list-s .list-cards-6{display:grid;gap:clamp(20px,3vw,32px);grid-template-columns:repeat(3,minmax(0,1fr));text-align:center}
@media (max-width:840px){.lemnity-list-s .list-cards-6{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:480px){.lemnity-list-s .list-cards-6{grid-template-columns:1fr}}
.lemnity-list-s .list-features-4{display:grid;gap:clamp(18px,3vw,28px);grid-template-columns:repeat(4,minmax(0,1fr));text-align:center}
@media (max-width:900px){.lemnity-list-s .list-features-4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.lemnity-list-s .list-features-4{grid-template-columns:1fr}}
.lemnity-list-s .list-split{display:grid;gap:clamp(28px,4vw,40px);grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);align-items:start;padding:clamp(24px,4vw,40px)}
@media (max-width:768px){.lemnity-list-s .list-split{grid-template-columns:1fr}}
.lemnity-list-s .list-num-grid{display:grid;gap:clamp(16px,2.5vw,24px);grid-template-columns:repeat(2,minmax(0,1fr));text-align:left}
@media (max-width:560px){.lemnity-list-s .list-num-grid{grid-template-columns:1fr}}
.lemnity-list-s .list-stat-row{display:grid;gap:clamp(16px,3vw,32px);grid-template-columns:repeat(4,minmax(0,1fr));text-align:center}
@media (max-width:800px){.lemnity-list-s .list-stat-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:400px){.lemnity-list-s .list-stat-row{grid-template-columns:1fr}}
@keyframes lemnity-list-stat-in{
  from{opacity:0;transform:translate3d(0,14px,0) scale(.86)}
  to{opacity:1;transform:translate3d(0,0,0) scale(1)}
}
.lemnity-list-s .list-stat-num{
  font-variant-numeric:tabular-nums;
  display:block;
  animation:lemnity-list-stat-in 0.72s cubic-bezier(0.22,1,0.36,1) both;
}
.lemnity-list-s .list-stat-row > div:nth-child(1) .list-stat-num{animation-delay:45ms}
.lemnity-list-s .list-stat-row > div:nth-child(2) .list-stat-num{animation-delay:150ms}
.lemnity-list-s .list-stat-row > div:nth-child(3) .list-stat-num{animation-delay:255ms}
.lemnity-list-s .list-stat-row > div:nth-child(4) .list-stat-num{animation-delay:360ms}
@media (prefers-reduced-motion:reduce){
  .lemnity-list-s .list-stat-num{animation:none!important;opacity:1!important;transform:none!important}
}
</style>`;

/** Круглые превью для сетки 3×2 */
const LIST_IMG_6 = [
  "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=320&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485998e?w=320&q=80",
  "https://images.unsplash.com/photo-1544986581-eacf120c9482?w=320&q=80",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=320&q=80",
  "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=320&q=80",
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=320&q=80",
];

/** Две картинки для варианта с перекрытием */
const LIST_IMG_OVERLAP_A = "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=900&q=80";
const LIST_IMG_OVERLAP_B = "https://images.unsplash.com/photo-1486325212027-8081e485998e?w=560&q=80";

function listItemCircle(imageUrl: string) {
  return `<div>
    <div style="width:min(132px,40vw);height:min(132px,40vw);max-width:132px;max-height:132px;margin:0 auto;border-radius:50%;overflow:hidden;border:1px solid #e5e7eb;background:#f1f5f9;">
      <img src="${imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/>
    </div>
    <h3 style="margin:14px 0 8px;font-size:16px;font-weight:700;color:#1e293b;">Название пункта</h3>
    <p style="margin:0 auto;max-width:280px;font-size:13px;line-height:1.55;color:#64748b;">Кратко опишите пункт: детали, выгоду или особенность. Нажмите для редактирования.</p>
  </div>`;
}

/** Простые светло-серые иконки в ряд к фичам (тёмный фон). */
function featureIcon(which: 1 | 2 | 3 | 4): string {
  const stroke = "#9ca3af";
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">`;
  if (which === 1)
    return `${s}<path d="M26 38V14M13 38V22M39 38V18" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/></svg>`;
  if (which === 2)
    return `${s}<path d="M26 42c11 0 16-17 16-26H10c0 9 5 26 16 26z" stroke="${stroke}" stroke-width="2"/></svg>`;
  if (which === 3)
    return `${s}<ellipse cx="26" cy="18" rx="14" ry="8" stroke="${stroke}" stroke-width="2"/><ellipse cx="26" cy="34" rx="14" ry="8" stroke="${stroke}" stroke-width="2"/></svg>`;
  return `${s}<path d="M18 38V14h16v24M26 38v9" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

export const LEMNITY_LIST_BLOCK_VARIANTS = [
  {
    id: "list-center-circles",
    badge: "LS01",
    title: "Список: сетка из 6 позиций",
    hint: "круглые фото, центр заголовка",
    content: `<section data-gjs-name="Список: сетка" class="lemnity-list-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,64px) clamp(18px,4vw,28px);font-family:system-ui,sans-serif;background:#ececec;color:#111;">
  ${LIST_RESPONSIVE_CSS}
  <div style="max-width:1040px;margin:0 auto;text-align:center;">
    <h2 style="margin:0 0 16px;font-size:clamp(24px,4vw,34px);font-weight:800;color:#1e293b;">Заголовок списка</h2>
    <p style="margin:0 auto;max-width:640px;font-size:15px;line-height:1.65;color:#64748b;">
      Добавьте описание блока: общая мысль, контекст для пунктов ниже. Дважды кликните текст для правки — как в Тильде.
    </p>
    <div class="list-cards-6" style="margin-top:clamp(36px,5vw,48px);">
      ${LIST_IMG_6.map((src) => listItemCircle(src)).join("")}
    </div>
  </div>
</section>`,
  },
  {
    id: "list-features-dark-row",
    badge: "LS02",
    title: "Список: 4 блока на тёмном фоне",
    hint: "иконки, название и текст",
    content: `<section data-gjs-name="Список: особенности" class="lemnity-list-s lemnity-section" style="margin:0;padding:clamp(44px,6vw,64px) clamp(20px,4vw,36px);font-family:system-ui,sans-serif;background:#1c1c1c;color:#fafafa;">
  ${LIST_RESPONSIVE_CSS}
    <div style="max-width:1100px;margin:0 auto;border-radius:14px;background:#282828;padding:clamp(32px,5vw,48px) clamp(20px,4vw,40px);">
    <div class="list-features-4">
      ${([1, 2, 3, 4] as const)
        .map(
          (i) => `<div>
        <div style="display:flex;justify-content:center;">${featureIcon(i)}</div>
        <h3 style="margin:14px 0 10px;font-size:17px;font-weight:700;color:#fff;">Название пункта</h3>
        <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(250,250,250,0.78);max-width:220px;margin-left:auto;margin-right:auto;">Добавьте описание: детали, выгоды, уточнения. Нажмите текст для редактирования.</p>
      </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`,
  },
  {
    id: "list-split-numbered",
    badge: "LS03",
    title: "Список: заголовок слева, нумерация справа",
    hint: "две колонки",
    content: `<section data-gjs-name="Список: колонки" class="lemnity-list-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,48px) clamp(16px,4vw,24px);font-family:system-ui,sans-serif;background:#ededed;color:#111;">
  ${LIST_RESPONSIVE_CSS}
  <div style="max-width:1000px;margin:0 auto;border:1px solid #d9d9d9;border-radius:16px;background:#fafafa;">
    <div class="list-split">
      <div>
        <h2 style="margin:0;font-size:clamp(24px,3.5vw,32px);font-weight:800;line-height:1.2;color:#0f172a;">Заголовок списка</h2>
      </div>
      <div style="display:flex;flex-direction:column;gap:clamp(28px,4vw,40px);">
        ${[
          ["1", "Название пункта"],
          ["2", "Название пункта"],
          ["3", "Название пункта"],
        ]
          .map(
            ([n, t]) => `<div>
          <p style="margin:0 0 8px;font-size:clamp(17px,2.5vw,20px);font-weight:700;color:#1e293b;">${n} / ${t}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Кратко опишите пункт: детали, шаг процесса или преимущество. Нажмите для редактирования.</p>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "list-overlap-photos-numbers",
    badge: "LS04",
    title: "Список: изображения + сетка 2×2",
    hint: "номера 01–04",
    content: `<section data-gjs-name="Список: фото и шаги" class="lemnity-list-s lemnity-section" style="margin:0;padding:clamp(32px,5vw,48px) clamp(16px,4vw,24px);font-family:system-ui,sans-serif;background:#e8e8e8;color:#111;">
  ${LIST_RESPONSIVE_CSS}
  <div style="max-width:920px;margin:0 auto;background:#fafafa;border:1px solid #ddd;border-radius:16px;padding:clamp(28px,4vw,40px);">
    <h2 style="margin:0 0 28px;text-align:center;font-size:clamp(24px,4vw,32px);font-weight:800;color:#1e293b;">Заголовок списка</h2>
    <div style="display:flex;justify-content:center;margin-bottom:24px;">
      <div style="position:relative;width:min(520px,100%);aspect-ratio:1.45;padding:0;">
        <div style="position:absolute;left:0;top:8%;width:72%;aspect-ratio:1.1;border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.06);">
          <img src="${LIST_IMG_OVERLAP_A}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/>
        </div>
        <div style="position:absolute;right:0;bottom:0;width:52%;aspect-ratio:1;border-radius:12px;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,0.15);border:1px solid rgba(0,0,0,0.06);">
          <img src="${LIST_IMG_OVERLAP_B}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/>
        </div>
      </div>
    </div>
    <p style="margin:0 auto 32px;text-align:center;max-width:600px;font-size:14px;line-height:1.65;color:#64748b;">
      Дополнительный абзац: введите читателя в блок ниже или поясните формат пунктов списка. Дважды кликните текст для правки.
    </p>
    <div style="background:#eaeaea;border-radius:12px;padding:clamp(20px,3vw,32px);">
      <div class="list-num-grid">
        ${["01", "02", "03", "04"]
          .map(
            (code) => `<article>
          <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:0.06em;color:#64748b;">${code}</p>
          <h3 style="margin:0 0 10px;font-size:clamp(17px,2vw,18px);font-weight:700;color:#0f172a;">Название пункта</h3>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
            Добавьте описание: факты, шаг процесса или выгоду. Дважды кликните для редактирования.
          </p>
        </article>`,
          )
          .join("")}
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "list-stats-row",
    badge: "LS05",
    title: "Список: цифры и подписи",
    hint: "статистика в ряд",
    content: `<section data-gjs-name="Список: цифры" class="lemnity-list-s lemnity-section" style="margin:0;padding:clamp(40px,5vw,56px) clamp(18px,4vw,28px);font-family:system-ui,sans-serif;background:#f1f5f9;color:#1e293b;">
  ${LIST_RESPONSIVE_CSS}
  <div style="max-width:1000px;margin:0 auto;background:#eef2f6;border-radius:14px;border:1px solid #dfe4eb;padding:clamp(32px,4vw,44px) clamp(20px,4vw,36px);">
    <h2 style="margin:0 0 clamp(28px,4vw,40px);text-align:center;font-size:clamp(22px,3.5vw,28px);font-weight:800;">Заголовок списка</h2>
    <div class="list-stat-row">
      ${(
        [
          ["83", "Кратко поясните первый показатель: что означает цифра для посетителя."],
          ["240", "Второй столбец — свой текст под метрикой, можно про объём или результат."],
          ["15", "Третья метрика: дней, версий продукта или этапов — как удобно."],
          ["7", "Четвёртый блок: завершите ряд финальным тезисом или разделом."],
        ] as const
      )
        .map(
          ([num, txt]) =>
            `<div>
          <p class="list-stat-num" style="margin:0 0 10px;font-size:clamp(34px,5vw,52px);font-weight:900;color:#0f172a;line-height:1;">${num}</p>
          <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;max-width:220px;margin-left:auto;margin-right:auto;">${txt}</p>
        </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`,
  },
];
