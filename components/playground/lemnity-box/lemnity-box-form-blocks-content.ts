/** Общие стили для секций форм (класс lemnity-form-s у корневого section). */
const FORM_RESPONSIVE_CSS = `<style>
.lemnity-form-s,.lemnity-form-s *{box-sizing:border-box}
.lemnity-form-s{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}
.lemnity-form-s .lf-shell{position:relative;background:#eef0f4;border-radius:14px;padding:clamp(16px,3vw,24px);border:1px solid #fff;overflow:hidden}
.lemnity-form-s .lf-h2{margin:0 0 10px;font-size:clamp(22px,4vw,28px);font-weight:700;line-height:1.15}
.lemnity-form-s .lf-lead{margin:0 0 22px;font-size:14px;line-height:1.55;color:#64748b;max-width:48ch}
.lemnity-form-s .lf-lab{display:block;margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#64748b}
.lemnity-form-s .lf-inp{width:100%;padding:11px 12px;font-size:15px;font-weight:500;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a}
.lemnity-form-s .lf-inp:focus{outline:2px solid #94a3b8;outline-offset:1px;border-color:#94a3b8}
.lemnity-form-s .lf-ta{min-height:120px;resize:vertical}
.lemnity-form-s .lf-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.lemnity-form-s .lf-btn{display:block;width:100%;margin-top:20px;padding:14px 18px;text-align:center;border:0;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;background:#334155;color:#fff}
.lemnity-form-s .lf-btn:hover{filter:brightness(1.05)}
.lemnity-form-s .lf-btn--pill{border-radius:999px;background:#2563eb}
.lemnity-form-s .lf-line .lf-inp{border:0;border-radius:0;border-bottom:1px solid #94a3b8;background:transparent;padding-left:2px;padding-right:2px}
.lemnity-form-s .lf-line .lf-inp:focus{outline:none;border-bottom-color:#334155;background:rgba(248,250,252,.6)}
.lemnity-form-s .lf-split50{display:grid;grid-template-columns:1fr 1fr;min-height:380px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 36px rgba(15,23,42,.06)}
.lemnity-form-s .lf-split50-pad{background:#f1f5f9;padding:clamp(26px,4vw,40px);display:flex;flex-direction:column;justify-content:center}
.lemnity-form-s .lf-split50-img{min-height:260px;background:#cbd5e1}
.lemnity-form-s .lf-split50-img img{width:100%;height:100%;object-fit:cover;display:block;min-height:260px}
@media (max-width:640px){.lemnity-form-s .lf-row2{grid-template-columns:1fr}}
@media (max-width:720px){.lemnity-form-s .lf-split50{grid-template-columns:1fr}}
/* overlap */
.lemnity-form-s .lf-over{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;align-items:stretch;min-height:clamp(340px,50vh,480px)}
.lemnity-form-s .lf-over .lf-pane-card{background:#fff;border-radius:12px;padding:clamp(22px,3vw,32px);box-shadow:0 20px 50px rgba(15,23,42,.12);margin:clamp(28px,5vw,48px);margin-right:-12%;position:relative;z-index:2;align-self:center;max-width:min(460px,100%)}
.lemnity-form-s .lf-over .lf-pane-media{border-radius:0 12px 12px 0;overflow:hidden;min-height:280px;background:#cbd5e1}
.lemnity-form-s .lf-over .lf-pane-media img{width:100%;height:100%;object-fit:cover;display:block}
@media (max-width:900px){.lemnity-form-s .lf-over{grid-template-columns:1fr}.lemnity-form-s .lf-over .lf-pane-card{margin:20px;margin-right:20px;max-width:none}.lemnity-form-s .lf-over .lf-pane-media{border-radius:0 0 12px 12px;min-height:220px}}
/* job */
.lemnity-form-s .lf-job{display:grid;grid-template-columns:minmax(0,240px) minmax(0,1fr);min-height:400px;border-radius:12px;overflow:hidden;box-shadow:0 14px 40px rgba(15,23,42,.08)}
.lemnity-form-s .lf-job-aside{background:#111827;color:#fff;padding:clamp(20px,3vw,32px)}
.lemnity-form-s .lf-job-aside .lf-job-h{margin:0 0 14px;font-size:clamp(22px,3vw,26px);font-weight:700}
.lemnity-form-s .lf-job-aside hr{border:0;border-top:1px solid rgba(255,255,255,.25);margin:16px 0}
.lemnity-form-s .lf-job-aside .lf-job-p{margin:0;font-size:14px;line-height:1.55;opacity:.9}
.lemnity-form-s .lf-job-main{background:#f8fafc;padding:clamp(20px,3vw,28px)}
.lemnity-form-s .lf-job-main .lf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
@media (max-width:760px){.lemnity-form-s .lf-job{grid-template-columns:1fr}.lemnity-form-s .lf-job-main .lf-grid{grid-template-columns:1fr}}
/* две колонки: контент + форма */
.lemnity-form-s .lf-cols2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:clamp(20px,4vw,40px);align-items:start}
@media (max-width:900px){.lemnity-form-s .lf-cols2{grid-template-columns:1fr}}
.lemnity-form-s .lf-sub-actions{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;margin-top:16px}
@media (max-width:520px){.lemnity-form-s .lf-sub-actions{grid-template-columns:1fr}.lemnity-form-s .lf-sub-actions .lf-btn{width:100%}}
</style>`;

const IMG = {
  dunes: "https://images.unsplash.com/photo-1509316785289-025f5b90b032?auto=format&fit=crop&w=900&q=80",
  dunes2: "https://images.unsplash.com/photo-1473580044384-619ba8314e67?auto=format&fit=crop&w=900&q=80",
  desk: "https://images.unsplash.com/photo-1499951360447-c88eaf6c683a?auto=format&fit=crop&w=900&q=80",
  leaf: "https://images.unsplash.com/photo-1533038590840-f1e6ccfdd78b?auto=format&fit=crop&w=560&q=80",
};

/** Варианты библиотеки «Формы» для Lemnity Box */
export const LEMNITY_FORM_BLOCK_VARIANTS = [
  {
    id: "form-contact-overlap",
    badge: "FM01",
    title: "Контакт: карточка и фото",
    hint: "форма пересекается с изображением",
    content: `${FORM_RESPONSIVE_CSS}<section data-gjs-name="Форма: контакт" class="lemnity-form-s lemnity-section">
  <div class="lf-shell">
    <div class="lf-over">
      <div class="lf-pane-card">
        <h2 class="lf-h2">Свяжитесь с нами</h2>
        <p class="lf-lead">Оставьте заявку в форме — ответим в ближайшее время.</p>
        <form>
          <div class="lf-row2">
            <div><span class="lf-lab">Имя</span><input class="lf-inp" name="first_name" placeholder=""/></div>
            <div><span class="lf-lab">Фамилия</span><input class="lf-inp" name="last_name" placeholder=""/></div>
          </div>
          <div style="margin-top:14px"><span class="lf-lab">Электропочта *</span><input class="lf-inp" name="email" type="email" required placeholder="you@company.ru"/></div>
          <button type="button" class="lf-btn">Отправить</button>
        </form>
      </div>
      <div class="lf-pane-media"><img src="${IMG.dunes}" alt="" width="640" height="480"/></div>
    </div>
  </div>
</section>`,
  },
  {
    id: "form-quote-split",
    badge: "FM02",
    title: "Запрос коммерческого предложения",
    hint: "карточка по центру над фото и серой подложкой",
    content: `${FORM_RESPONSIVE_CSS}<section data-gjs-name="Форма: КП" class="lemnity-form-s lemnity-section">
  <div style="position:relative;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="display:grid;grid-template-rows:auto 1fr;min-height:420px;">
      <div style="background:url(${IMG.dunes}) center/cover no-repeat;height:min(220px,32vh);min-height:140px"></div>
      <div style="background:#dfe3ea;padding:clamp(36px,6vw,56px) 18px;display:flex;align-items:flex-start;justify-content:center;">
        <div style="background:#fff;border-radius:12px;padding:clamp(22px,3vw,32px);max-width:460px;width:100%;box-shadow:0 18px 48px rgba(15,23,42,.08);margin-top:-72px;">
          <h2 class="lf-h2" style="text-align:center;">Запросить расчёт</h2>
          <p class="lf-lead" style="margin-left:auto;margin-right:auto;text-align:center;">Заполните форму — подготовим предложение.</p>
          <form>
            <div class="lf-row2"><div><span class="lf-lab">Имя</span><input class="lf-inp" name="first_name"/></div><div><span class="lf-lab">Фамилия</span><input class="lf-inp" name="last_name"/></div></div>
            <div style="margin-top:14px"><span class="lf-lab">Электропочта *</span><input class="lf-inp" type="email" required name="email"/></div>
            <div style="margin-top:14px"><span class="lf-lab">Тема *</span><input class="lf-inp" required name="subject"/></div>
            <div style="margin-top:14px"><span class="lf-lab">Сообщение</span><textarea class="lf-inp lf-ta" name="message" placeholder="Кратко опишите задачу"></textarea></div>
            <button type="button" class="lf-btn">Отправить</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "form-job-split",
    badge: "FM03",
    title: "Отклик на вакансию",
    hint: "тёмная колонка + сетка полей",
    content: `${FORM_RESPONSIVE_CSS}<section data-gjs-name="Форма: вакансия" class="lemnity-form-s lemnity-section">
  <div class="lf-shell" style="background:#e8eaef;">
    <div class="lf-job">
      <aside class="lf-job-aside">
        <p class="lf-job-h">Отклик</p><hr/><p class="lf-job-p">Заполните анкету — мы свяжемся с вами.</p>
      </aside>
      <div class="lf-job-main">
        <form>
          <div class="lf-grid">
            <div><span class="lf-lab">Имя</span><input class="lf-inp" name="first_name"/></div>
            <div><span class="lf-lab">Фамилия</span><input class="lf-inp" name="last_name"/></div>
            <div><span class="lf-lab">Дата рождения</span><input class="lf-inp" name="birth" type="date"/></div>
            <div><span class="lf-lab">Электропочта *</span><input class="lf-inp" type="email" required name="email"/></div>
            <div><span class="lf-lab">Телефон *</span><input class="lf-inp" type="tel" required name="phone"/></div>
            <div style="grid-column:1/-1"><span class="lf-lab">Позиция</span><select class="lf-inp" name="role"><option>Маркетинг</option><option>Разработка</option><option>Другое</option></select></div>
            <div><span class="lf-lab">Выход на работу</span><input class="lf-inp" name="start" type="date"/></div>
            <div style="grid-column:span 2"><span class="lf-lab">Ссылка на резюме *</span><input class="lf-inp" required name="cv" placeholder="https://"/></div>
          </div>
          <button type="button" class="lf-btn">Отправить</button>
        </form>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "form-signup-split",
    badge: "FM04",
    title: "Регистрация 50×50",
    hint: "форма и фото-пейзаж поровну",
    content: `${FORM_RESPONSIVE_CSS}<section data-gjs-name="Форма: регистрация" class="lemnity-form-s lemnity-section">
  <div class="lf-split50">
    <div class="lf-split50-pad">
      <h2 class="lf-h2" style="text-align:center;">Начните бесплатно</h2>
      <p class="lf-lead" style="text-align:center;margin-left:auto;margin-right:auto;">Укажите данные ниже.</p>
      <form style="margin-top:8px">
        <div class="lf-row2"><div><span class="lf-lab">Имя</span><input class="lf-inp" name="fn"/></div><div><span class="lf-lab">Фамилия</span><input class="lf-inp" name="ln"/></div></div>
        <div style="margin-top:14px"><span class="lf-lab">Электропочта *</span><input class="lf-inp" type="email" required name="email"/></div>
        <button type="button" class="lf-btn">Отправить</button>
      </form>
    </div>
    <div class="lf-split50-img"><img src="${IMG.dunes2}" alt=""/></div>
  </div>
</section>`,
  },
  {
    id: "form-message-gallery",
    badge: "FM05",
    title: "Сообщение и иллюстрации",
    hint: "текст слева, подчёркнутые поля справа",
    content: `${FORM_RESPONSIVE_CSS}<section data-gjs-name="Форма: сообщение" class="lemnity-form-s lemnity-section">
  <div class="lf-shell">
    <div class="lf-cols2">
      <div>
        <h2 class="lf-h2">Напишите нам — мы ответим как можно скорее.</h2>
        <p class="lf-lead" style="margin-bottom:18px">Можно приложить детали к заявке в поле ниже.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">
          <img src="${IMG.leaf}" alt="" style="width:min(200px,46%);border-radius:10px;object-fit:cover"/>
          <img src="${IMG.dunes}" alt="" style="width:min(220px,52%);border-radius:10px;object-fit:cover;margin-top:24px"/>
        </div>
      </div>
      <form class="lf-line" style="padding-top:8px">
        <div class="lf-row2"><div><span class="lf-lab">Имя</span><input class="lf-inp" name="fn"/></div><div><span class="lf-lab">Фамилия</span><input class="lf-inp" name="ln"/></div></div>
        <div style="margin-top:18px"><span class="lf-lab">Электропочта *</span><input class="lf-inp" type="email" required name="email"/></div>
        <div style="margin-top:18px"><span class="lf-lab">Тема</span><input class="lf-inp" name="subject"/></div>
        <div style="margin-top:18px"><span class="lf-lab">Сообщение</span><input class="lf-inp" name="message" placeholder="Текст сообщения"/></div>
        <button type="button" class="lf-btn">Отправить</button>
      </form>
    </div>
  </div>
</section>`,
  },
  {
    id: "form-newsletter-hero",
    badge: "FM06",
    title: "Подписка на рассылку",
    hint: "карточка на фоне пейзажа",
    content: `${FORM_RESPONSIVE_CSS}<section data-gjs-name="Форма: рассылка" class="lemnity-form-s lemnity-section">
  <div style="position:relative;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;min-height:380px">
    <div style="position:absolute;inset:0;background:url(${IMG.dunes2}) center/cover no-repeat;transform:scale(1.04);filter:blur(2px) brightness(.92)"></div>
    <div style="position:relative;z-index:1;padding:clamp(40px,8vw,72px) 18px;display:flex;justify-content:center;align-items:center">
      <div style="background:rgba(255,255,255,.94);backdrop-filter:blur(6px);padding:clamp(24px,4vw,36px);max-width:520px;width:100%;border-radius:12px;box-shadow:0 20px 50px rgba(15,23,42,.12)">
        <h2 class="lf-h2" style="text-align:center;">Подписка на новости</h2>
        <p class="lf-lead" style="text-align:center;margin-left:auto;margin-right:auto;font-size:13px">Получайте письма и доступ к материалам для подписчиков.</p>
        <form class="lf-line">
          <div class="lf-row2"><div><span class="lf-lab">Имя</span><input class="lf-inp" name="fn"/></div><div><span class="lf-lab">Фамилия</span><input class="lf-inp" name="ln"/></div></div>
          <div class="lf-sub-actions">
            <div><span class="lf-lab">Электропочта *</span><input class="lf-inp" type="email" required name="email"/></div>
            <button type="button" class="lf-btn" style="margin-top:0">Подписаться</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "form-lesson-split",
    badge: "FM07",
    title: "Запись на урок",
    hint: "фото рабочего места и поля с нижней границей",
    content: `${FORM_RESPONSIVE_CSS}<section data-gjs-name="Форма: урок" class="lemnity-form-s lemnity-section">
  <div class="lf-split50">
    <div class="lf-split50-img"><img src="${IMG.desk}" alt=""/></div>
    <div class="lf-split50-pad" style="background:#f8fafc;align-items:stretch;text-align:left">
      <h2 class="lf-h2" style="font-size:clamp(20px,3.5vw,26px);text-align:left">Бесплатный урок с преподавателем</h2>
      <p class="lf-lead" style="margin-bottom:20px;text-align:left">Приходите знакомиться с группой и школой.</p>
      <form class="lf-line">
        <div style="margin-top:14px"><input class="lf-inp" name="email" type="email" placeholder="Электропочта"/></div>
        <div style="margin-top:18px"><input class="lf-inp" name="fullname" placeholder="ФИО"/></div>
        <div style="margin-top:18px"><input class="lf-inp" name="phone" type="tel" placeholder="Телефон"/></div>
        <button type="button" class="lf-btn lf-btn--pill" style="width:auto;display:inline-block;min-width:160px;margin-top:24px">Записаться</button>
      </form>
    </div>
  </div>
</section>`,
  },
];
