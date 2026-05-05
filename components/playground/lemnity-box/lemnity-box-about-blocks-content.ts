/**
 * Секции «О нас»: тексты, сплиты, коллажи, галереи. Обёртка: lemnity-about-s + lemnity-section.
 */

const ABOUT_CSS = `<style>
.lemnity-about-s,.lemnity-about-s *{box-sizing:border-box}
.lemnity-about-s img{max-width:100%;display:block;vertical-align:middle}
.about-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,4vw,48px);align-items:center}
@media (max-width:900px){.about-2{grid-template-columns:1fr}}
.about-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(16px,2.5vw,24px)}
@media (max-width:960px){.about-3{grid-template-columns:1fr}}
.about-proj{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr);gap:clamp(20px,3vw,32px);align-items:start}
@media (max-width:960px){.about-proj{grid-template-columns:1fr}}
.about-overlap{position:relative;min-height:clamp(260px,42vw,420px);max-width:100%}
.about-overlap .a-img-a{width:78%;position:relative;z-index:1}
.about-overlap .a-img-b{width:62%;position:absolute;right:0;bottom:clamp(-12px,-2vw,-4px);z-index:2;box-shadow:0 12px 32px rgba(0,0,0,.12)}
@media (max-width:900px){.about-overlap .a-img-b{width:70%;bottom:0}}
.about-card-os{position:relative;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:0;align-items:center;min-height:clamp(320px,48vh,520px)}
@media (max-width:900px){.about-card-os{grid-template-columns:1fr;min-height:0}}
.about-card-os .a-bg{min-height:clamp(280px,40vh,480px);background-size:cover;background-position:center}
.about-card-os .a-card{margin-left:clamp(-40px,-8vw,-24px);background:#fff;padding:clamp(24px,4vw,40px);max-width:min(400px,92vw);z-index:2;box-shadow:0 16px 48px rgba(15,23,42,.1)}
@media (max-width:900px){.about-card-os .a-card{margin:-48px auto 0;position:relative}}
.about-rest{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr) minmax(0,1fr);gap:0;align-items:stretch}
@media (max-width:960px){.about-rest{grid-template-columns:1fr}}
.about-rest .a-rail{display:flex;flex-direction:column;gap:clamp(10px,1.5vw,14px)}
.about-rest .a-mid{padding:clamp(28px,4vw,48px) clamp(20px,3vw,36px);display:flex;flex-direction:column;justify-content:center;text-align:center}
.about-sq2{display:grid;grid-template-columns:1fr 1fr;min-height:min(92vw,560px)}
@media (max-width:768px){.about-sq2{grid-template-columns:1fr;min-height:0}}
.about-sq2 .a-sq-img{aspect-ratio:1/1;object-fit:cover;width:100%;height:100%;min-height:min(92vw,360px)}
.about-collage{position:relative;min-height:clamp(300px,50vw,440px)}
.about-collage .c1{width:52%;position:relative;z-index:1}
.about-collage .c2{width:48%;position:absolute;left:0;bottom:0;z-index:2;max-width:68%}
.about-collage .c3{width:44%;position:absolute;right:0;top:12%;z-index:1}
@media (max-width:900px){.about-collage{min-height:380px}.about-collage .c2{width:55%}.about-collage .c3{width:42%;top:8%}}
.about-portrait{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;align-items:stretch}
@media (max-width:860px){.about-portrait{grid-template-columns:1fr}}
.about-portrait .a-bw{aspect-ratio:1/1;object-fit:cover;width:100%}
.about-portrait .a-ptxt{padding:clamp(32px,5vw,72px) clamp(24px,4vw,48px);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.about-meta dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#9ca3af;margin:0;padding:10px 0 4px}
.about-meta dd{margin:0;padding:0 0 12px;border-bottom:1px solid #e5e7eb;font-size:15px;color:#111;font-weight:600}
.about-imgs-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,20px)}
@media (max-width:720px){.about-imgs-3{grid-template-columns:1fr}}
.about-imgs-3 img{aspect-ratio:1/1;object-fit:cover;width:100%}
.about-stat3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(16px,3vw,28px);text-align:center}
@media (max-width:640px){.about-stat3{grid-template-columns:1fr}}
@keyframes about-au06-rise{from{opacity:0;transform:translate3d(0,20px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
.about-au06-wrap{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,0.88fr);gap:clamp(28px,5vw,56px);align-items:center}
@media (max-width:900px){.about-au06-wrap{grid-template-columns:1fr;gap:clamp(24px,5vw,36px)}}
.about-au06-collage{position:relative;width:100%;min-height:clamp(300px,48vw,460px);isolation:isolate}
.about-au06-main{position:absolute;left:0;top:0;width:50%;height:78%;object-fit:cover;border-radius:14px;z-index:1;box-shadow:0 14px 40px rgba(15,23,42,.12)}
.about-au06-patch{position:absolute;left:46%;top:0;width:40%;aspect-ratio:1/1;object-fit:cover;border-radius:12px;z-index:2;box-shadow:0 12px 32px rgba(15,23,42,.14)}
.about-au06-wide{position:absolute;left:6%;bottom:-2%;width:82%;height:34%;min-height:112px;object-fit:cover;border-radius:12px;z-index:3;box-shadow:0 16px 42px rgba(15,23,42,.16)}
.about-au06-main{animation:about-au06-rise .68s cubic-bezier(.22,1,.36,1) .12s both}
.about-au06-patch{animation:about-au06-rise .68s cubic-bezier(.22,1,.36,1) .26s both}
.about-au06-wide{animation:about-au06-rise .68s cubic-bezier(.22,1,.36,1) .4s both}
.about-au06-copy{animation:about-au06-rise .72s cubic-bezier(.22,1,.36,1) .52s both}
@media (prefers-reduced-motion:reduce){.about-au06-main,.about-au06-patch,.about-au06-wide,.about-au06-copy{animation:none!important;opacity:1!important;transform:none!important}}
@media (max-width:900px){
.about-au06-collage{min-height:0;padding-bottom:8px}
.about-au06-main,.about-au06-patch,.about-au06-wide{position:relative;left:auto;top:auto;bottom:auto;box-shadow:0 8px 24px rgba(15,23,42,.1)}
.about-au06-main{width:100%;height:auto;aspect-ratio:3/4;max-height:min(72vh,400px);margin:0 auto}
.about-au06-patch{width:min(260px,88%);margin:-36px 0 0 auto;aspect-ratio:1/1}
.about-au06-wide{width:100%;height:auto;aspect-ratio:16/9;margin-top:10px}
}
</style>`;

const IU = "https://images.unsplash.com";

export const LEMNITY_ABOUT_BLOCK_VARIANTS = [
  {
    id: "about-au01-split-overlap",
    badge: "AU01",
    title: "Текст и коллаж фото",
    hint: "две колонки, перекрывающиеся снимки",
    content: `<section data-gjs-name="О нас: текст и коллаж" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,88px) clamp(18px,4vw,40px);background:#fff;font-family:system-ui,sans-serif;color:#111;">
${ABOUT_CSS}
<div class="about-2" style="max-width:1140px;margin:0 auto;">
<div>
<h2 style="margin:0 0 16px;font-size:clamp(26px,3.6vw,40px);font-weight:800;line-height:1.15;">Несколько слов о нас</h2>
<p style="margin:0;font-size:16px;line-height:1.65;color:#374151;">Мы — студия интерьеров из Уэльса. Работаем в трёх стилях: функциональный минимализм, эко и современный модерн. У нас своя база дизайнеров и архитекторов — внутри команды и вне её.</p>
</div>
<div class="about-overlap">
<img class="a-img-a" src="${IU}/photo-1586023492125-27b2c045efd7?w=720&q=80" alt=""/>
<img class="a-img-b" src="${IU}/photo-1501004318641-b39e6451bec6?w=600&q=80" alt=""/>
</div>
</div>
</section>`,
  },
  {
    id: "about-au02-projects",
    badge: "AU02",
    title: "Проект и двойное фото",
    hint: "метаданные, кнопка, сетка",
    content: `<section data-gjs-name="О нас: проекты" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,80px) clamp(18px,4vw,36px);background:#fff;font-family:system-ui,sans-serif;color:#111;">
${ABOUT_CSS}
<p style="margin:0 0 8px;font-size:12px;color:#9ca3af;max-width:1140px;margin-left:auto;margin-right:auto;">Актуальные проекты сезона</p>
<div style="max-width:1140px;margin:0 auto;">
<h2 style="margin:0 0 8px;font-size:clamp(26px,3.5vw,38px);font-weight:800;">Наши проекты</h2>
<p style="margin:0 0 clamp(28px,4vw,40px);max-width:640px;font-size:15px;line-height:1.6;color:#4b5563;">Подборка визуалов, отражающих характер проекта и креативное направление.</p>
<div class="about-proj">
<div>
<h3 style="margin:0 0 12px;font-size:20px;font-weight:800;">Название проекта</h3>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563;">Короткое описание: задача, контекст и ключевой результат для клиента.</p>
<dl class="about-meta" style="margin:0 0 20px;">
<dt>Категория</dt><dd>Отельный бизнес</dd>
<dt>Услуги</dt><dd>Маркетинг / разработка</dd>
<dt>Месяц</dt><dd>Январь</dd>
</dl>
<a href="#" style="display:inline-block;padding:12px 22px;background:#1f2937;color:#fff;text-decoration:none;font-size:13px;font-weight:700;">Подробнее</a>
</div>
<img src="${IU}/photo-1586023492125-27b2c045efd7?w=520&q=80" alt="" style="width:100%;aspect-ratio:3/4;object-fit:cover;"/>
<img src="${IU}/photo-1618221195710-dd6b41faaea6?w=520&q=80" alt="" style="width:100%;aspect-ratio:3/4;object-fit:cover;"/>
</div>
</div>
</section>`,
  },
  {
    id: "about-au03-card-over",
    badge: "AU03",
    title: "Фото и карточка",
    hint: "белая панель поверх снимка",
    content: `<section data-gjs-name="О нас: карточка на фото" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(36px,6vw,72px) clamp(16px,4vw,32px);background:#f9fafb;font-family:system-ui,sans-serif;">
${ABOUT_CSS}
<div class="about-card-os" style="max-width:1200px;margin:0 auto;">
<div class="a-bg" style="background-image:url(${IU}/photo-1631889993955-f29f49a0bafc?w=1200&q=80);border-radius:0;"></div>
<div class="a-card">
<p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;">Дизайн</p>
<h2 style="margin:0 0 14px;font-size:clamp(22px,2.8vw,28px);font-weight:800;color:#111;">Интерьерный дизайн</h2>
<p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:#4b5563;">Создаём функциональные проекты — от квартир до общественных пространств. Знаем, как выжать максимум из любой площади.</p>
<a href="#" style="display:inline-block;padding:12px 26px;background:#2563eb;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Узнать больше</a>
</div>
</div>
</section>`,
  },
  {
    id: "about-au04-restaurant-3",
    badge: "AU04",
    title: "Текст между колонками фото",
    hint: "три колонки, кремовый центр",
    content: `<section data-gjs-name="О нас: галерея вокруг текста" class="lemnity-about-s lemnity-section" style="margin:0;padding:0;font-family:system-ui,sans-serif;color:#111;">
${ABOUT_CSS}
<div class="about-rest">
<div class="a-rail">
<img src="${IU}/photo-1577219491135-391407c8ae3b?w=540&q=80" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;"/>
<img src="${IU}/photo-1414235077428-338989a2e8c0?w=540&q=80" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;"/>
</div>
<div class="a-mid" style="background:#faf9f6;">
<h2 style="margin:0 0 6px;font-size:clamp(28px,4vw,40px);font-weight:500;font-family:Georgia,serif;color:#b45309;">О нас</h2>
<p style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#111;">Подзаголовок — нажмите, чтобы изменить</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">Добавьте свой текст: история бренда, ценности и атмосфера. Блок адаптируется под мобильные: колонки складываются в столбик.</p>
<a href="#" style="font-size:14px;font-weight:600;color:#b45309;text-decoration:none;">Читать далее ›</a>
</div>
<div class="a-rail">
<img src="${IU}/photo-1556910103-1c02745ae307?w=540&q=80" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;"/>
<img src="${IU}/photo-1556911220-bff31c812dba?w=540&q=80" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;"/>
</div>
</div>
</section>`,
  },
  {
    id: "about-au05-square-green",
    badge: "AU05",
    title: "Квадрат: фото и фон",
    hint: "50/50, монстера и шалфей",
    content: `<section data-gjs-name="О нас: квадратный сплит" class="lemnity-about-s lemnity-section" style="margin:0;padding:0;font-family:system-ui,sans-serif;">
${ABOUT_CSS}
<div class="about-sq2" style="max-width:1100px;margin:0 auto;">
<img class="a-sq-img" src="${IU}/photo-1614594975525-e45190c55d0b?w=800&q=80" alt=""/>
<div style="background:#6b996b;color:#fff;padding:clamp(28px,5vw,48px);display:flex;flex-direction:column;justify-content:center;">
<h2 style="margin:0 0 14px;font-size:clamp(22px,3vw,30px);font-weight:600;">О нас</h2>
<div style="width:40px;height:2px;background:#fff;opacity:.9;margin-bottom:18px;"></div>
<p style="margin:0;font-size:15px;line-height:1.7;opacity:.95;font-weight:300;">Термин «ремёсла» часто относят к любительским работам. Здесь — ваш текст о студии, процессе и людях.</p>
</div>
</div>
</section>`,
  },
  {
    id: "about-au07-portrait-bw",
    badge: "AU07",
    title: "Портрет и текст",
    hint: "ч/б фото, текст по центру справа",
    content: `<section data-gjs-name="О нас: портрет" class="lemnity-about-s lemnity-section" style="margin:0;padding:0;background:#fff;font-family:system-ui,sans-serif;color:#111;">
${ABOUT_CSS}
<div class="about-portrait" style="max-width:1080px;margin:0 auto;">
<img class="a-bw" src="${IU}/photo-1534528741775-53994a69daeb?w=800&q=80" alt="" style="filter:grayscale(1);"/>
<div class="a-ptxt">
<h2 style="margin:0 0 10px;font-size:clamp(22px,3vw,30px);font-weight:800;">О нашей компании</h2>
<p style="margin:0 0 16px;font-size:14px;color:#6b7280;max-width:420px;">Профессиональная съёмка, организация сета, обработка кадров</p>
<div style="width:48px;height:1px;background:#111;margin:0 auto 18px;"></div>
<p style="margin:0;max-width:440px;font-size:15px;line-height:1.7;color:#111;">Меня зовут Кортни, я фотограф в Берлине. Специализируюсь на портретах, студийной и документальной съёмке.</p>
</div>
</div>
</section>`,
  },
  {
    id: "about-au08-expo-split",
    badge: "AU08",
    title: "Текст и полноразмерное фото",
    hint: "архитектура справа",
    content: `<section data-gjs-name="О нас: сплит с фото" class="lemnity-about-s lemnity-section" style="margin:0;padding:0;font-family:system-ui,sans-serif;">
${ABOUT_CSS}
<div class="about-2" style="gap:0;align-items:stretch;max-width:1280px;margin:0 auto;">
<div style="padding:clamp(32px,6vw,72px) clamp(22px,4vw,56px);display:flex;flex-direction:column;justify-content:center;background:#fff;">
<h2 style="margin:0 0 18px;font-size:clamp(22px,3vw,30px);font-weight:600;">О выставке</h2>
<p style="margin:0;font-size:15px;line-height:1.75;color:#374151;">В этом году Architecture Expo пройдёт в городском зале Гонконга. Экспозиция объединяет девелоперов и архитекторов; в программе — рекордные 230 экспонентов и 25 спикеров из более чем 30 стран.</p>
</div>
<div style="position:relative;min-height:min(420px,70vw);">
<img src="${IU}/photo-1486718448742-163732cd1544?w=900&q=80" alt="" style="width:100%;height:100%;object-fit:cover;min-height:min(420px,70vw);"/>
</div>
</div>
</section>`,
  },
  {
    id: "about-au09-meridians",
    badge: "AU09",
    title: "Заголовок и три фото",
    hint: "светло-серый фон, квадраты",
    content: `<section data-gjs-name="О нас: три кадра" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(44px,6vw,88px) clamp(18px,4vw,32px);background:#f3f4f6;font-family:system-ui,sans-serif;color:#111;">
${ABOUT_CSS}
<div style="max-width:960px;margin:0 auto;text-align:center;">
<h2 style="margin:0 0 16px;font-size:clamp(24px,3.2vw,34px);font-weight:800;">О Meridians</h2>
<p style="margin:0 auto 36px;max-width:720px;font-size:15px;line-height:1.7;color:#4b5563;">Страсть к путешествиям — в центре философии. Форматы туров и новые направления рядом с привычными маршрутами. Групповые заезды или индивидуальный план.</p>
<div class="about-imgs-3">
<img src="${IU}/photo-1540959733332-eab4deabeeaf?w=400&q=80" alt=""/>
<img src="${IU}/photo-1513635269975-59663e0ac1ad?w=400&q=80" alt=""/>
<img src="${IU}/photo-1549693578-d683be217e5e?w=400&q=80" alt=""/>
</div>
</div>
</section>`,
  },
  {
    id: "about-au10-blue-studio",
    badge: "AU10",
    title: "Синий экран с контактами",
    hint: "крупный центрированный текст",
    content: `<section data-gjs-name="О нас: синий блок" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(56px,10vw,120px) clamp(20px,5vw,48px);background:#3b59ff;font-family:system-ui,sans-serif;color:#fff;text-align:center;">
${ABOUT_CSS}
<p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.95;">О студии Leonard</p>
<h2 style="margin:0 auto 28px;max-width:min(920px,96%);font-size:clamp(20px,3.8vw,36px);font-weight:800;line-height:1.25;">Снимаем документалистику, рекламу, клипы. Снимаем события. Мечтаем о коротком метре. Уже скоро.</h2>
<p style="margin:0;font-size:14px;opacity:.9;">Контакт: +1 777 000 0000 / email / facebook</p>
</section>`,
  },
  {
    id: "about-au11-divider-light",
    badge: "AU11",
    title: "Заголовок, линия, текст",
    hint: "центр, светлый фон",
    content: `<section data-gjs-name="О нас: линия-разделитель" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,100px) clamp(20px,4vw,32px);background:#f4f4f4;font-family:system-ui,sans-serif;color:#111;text-align:center;">
${ABOUT_CSS}
<h2 style="margin:0 0 16px;font-size:clamp(24px,3.5vw,36px);font-weight:800;">О наших занятиях</h2>
<div style="width:56px;height:2px;background:#111;margin:0 auto 22px;"></div>
<p style="margin:0 auto;max-width:720px;font-size:16px;line-height:1.65;">Программа открывает мир танца: связывает молодёжь и сообщества с практикой, вдохновляет и даёт доступ к качественным активностям в стране и за рубежом.</p>
</section>`,
  },
  {
    id: "about-au12-two-col-heading",
    badge: "AU12",
    title: "Заголовок и текст в ряд",
    hint: "серый фон",
    content: `<section data-gjs-name="О нас: две колонки" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(48px,7vw,100px) clamp(20px,4vw,40px);background:#f3f3f3;font-family:system-ui,sans-serif;color:#111;">
${ABOUT_CSS}
<div class="about-2" style="max-width:1080px;margin:0 auto;align-items:start;">
<div>
<h2 style="margin:0 0 10px;font-size:clamp(24px,3.4vw,38px);font-weight:800;line-height:1.2;">О нашем месте и миссии</h2>
<p style="margin:0;font-size:16px;color:#666;">Кофе и кофейни</p>
</div>
<div>
<p style="margin:0;font-size:16px;line-height:1.65;color:#1f2937;">Кофейня и кофе-бар — родственные форматы. Добавьте свой текст о концепции, зерне и атмосфере. На узких экранах блоки выстраиваются столбиком.</p>
</div>
</div>
</section>`,
  },
  {
    id: "about-au13-long-title-cta",
    badge: "AU13",
    title: "Длинный заголовок и кнопка",
    hint: "синяя линия, pill",
    content: `<section data-gjs-name="О нас: заголовок и CTA" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,104px) clamp(20px,4vw,36px);background:#fff;font-family:system-ui,sans-serif;text-align:center;">
${ABOUT_CSS}
<h2 style="margin:0 auto 18px;max-width:min(900px,96%);font-size:clamp(18px,2.8vw,28px);font-weight:800;color:#111;line-height:1.3;">О распространённом мифе, что органические продукты безопаснее и вкуснее обычных</h2>
<div style="width:48px;height:3px;background:#2563eb;margin:0 auto 22px;border-radius:2px;"></div>
<p style="margin:0 auto 28px;max-width:680px;font-size:15px;line-height:1.7;color:#4b5563;">Органическое земледелие — система выращивания с жёсткими стандартами. Здесь можно пояснить сертификацию и отличия от конвенциональных продуктов.</p>
<a href="#" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">Смотреть ещё</a>
</section>`,
  },
  {
    id: "about-au14-classes-button",
    badge: "AU14",
    title: "Текст и прямоугольная кнопка",
    hint: "серый фон",
    content: `<section data-gjs-name="О нас: текст и кнопка" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,96px) clamp(20px,4vw,32px);background:#f3f4f6;font-family:system-ui,sans-serif;text-align:center;">
${ABOUT_CSS}
<h2 style="margin:0 0 18px;font-size:clamp(24px,3.5vw,36px);font-weight:800;color:#111;">О наших занятиях</h2>
<p style="margin:0 auto 28px;max-width:720px;font-size:16px;line-height:1.65;color:#4b5563;">Программа открывает мир танца и сообществ — практика, вдохновение и качественные активности по всему миру.</p>
<a href="#" style="display:inline-block;padding:14px 32px;background:#3b82f6;color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:4px;">Подробнее</a>
</section>`,
  },
  {
    id: "about-au15-blue-eyebrow",
    badge: "AU15",
    title: "Синий блок с подзаголовком",
    hint: "верхний капс",
    content: `<section data-gjs-name="О нас: синий с подписью" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(52px,9vw,112px) clamp(22px,5vw,40px);background:#2e5bff;font-family:system-ui,sans-serif;color:#fff;text-align:center;">
${ABOUT_CSS}
<p style="margin:0 0 12px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.95;">Латиноамериканские танцы в Манхэттене</p>
<h2 style="margin:0 0 22px;font-size:clamp(26px,4vw,40px);font-weight:800;">О наших занятиях</h2>
<p style="margin:0 auto;max-width:min(640px,94%);font-size:16px;line-height:1.65;opacity:.95;">Наши курсы — вход в мир танца: практика для молодёжи и районов, вдохновение и сильная программа внутри страны и за её пределами.</p>
</section>`,
  },
  {
    id: "about-au16-bold-paragraph",
    badge: "AU16",
    title: "Один акцентный абзац",
    hint: "жирный текст по центру",
    content: `<section data-gjs-name="О нас: акцентный абзац" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(56px,10vw,120px) clamp(20px,4vw,28px);background:#f5f5f5;font-family:system-ui,sans-serif;">
${ABOUT_CSS}
<p style="margin:0 auto;max-width:820px;text-align:center;font-size:clamp(16px,2.2vw,20px);font-weight:700;line-height:1.55;color:#111;">О дизайн-мышлении. Его ещё не полностью приняли лидеры как способ ориентироваться в постоянных изменениях. Этот процесс — инструмент, который даёт предпринимателям преимущество.</p>
</section>`,
  },
  {
    id: "about-au17-stats",
    badge: "AU17",
    title: "Три цифры",
    hint: "краткая статистика",
    content: `<section data-gjs-name="О нас: цифры" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,72px) clamp(18px,4vw,32px);background:#fff;font-family:system-ui,sans-serif;">
${ABOUT_CSS}
<div style="max-width:900px;margin:0 auto;">
<h2 style="margin:0 0 8px;font-size:clamp(22px,3vw,30px);font-weight:800;text-align:center;">О компании в цифрах</h2>
<p style="margin:0 0 32px;text-align:center;font-size:14px;color:#6b7280;">Кратко подпишите раздел</p>
<div class="about-stat3">
<div>
<div style="font-size:clamp(32px,5vw,48px);font-weight:800;color:#2563eb;">12+</div>
<p style="margin:8px 0 0;font-size:14px;color:#374151;">лет на рынке</p>
</div>
<div>
<div style="font-size:clamp(32px,5vw,48px);font-weight:800;color:#2563eb;">48</div>
<p style="margin:8px 0 0;font-size:14px;color:#374151;">проектов в год</p>
</div>
<div>
<div style="font-size:clamp(32px,5vw,48px);font-weight:800;color:#2563eb;">100%</div>
<p style="margin:8px 0 0;font-size:14px;color:#374151;">прозрачные этапы</p>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "about-au18-quote-split",
    badge: "AU18",
    title: "Цитата и изображение",
    hint: "крупный текст и фото",
    content: `<section data-gjs-name="О нас: цитата" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,80px) clamp(18px,4vw,36px);background:#fafafa;font-family:system-ui,sans-serif;">
${ABOUT_CSS}
<div class="about-2" style="max-width:1100px;margin:0 auto;">
<blockquote style="margin:0;padding:0;border:0;font-size:clamp(20px,2.8vw,28px);font-weight:700;line-height:1.35;color:#0f172a;">«Делать сложное простым — наша ежедневная работа с продуктом и командой.»</blockquote>
<div>
<img src="${IU}/photo-1522071820081-009f0129c71c?w=640&q=80" alt="" style="width:100%;border-radius:12px;object-fit:cover;aspect-ratio:4/3;"/>
<p style="margin:14px 0 0;font-size:13px;color:#6b7280;">Подпись или роль спикера</p>
</div>
</div>
</section>`,
  },
  {
    id: "about-au19-timeline",
    badge: "AU19",
    title: "Три шага",
    hint: "вертикальная линия",
    content: `<section data-gjs-name="О нас: шаги" class="lemnity-about-s lemnity-section" style="margin:0;padding:clamp(44px,6vw,80px) clamp(18px,4vw,32px);background:#fff;font-family:system-ui,sans-serif;color:#111;">
${ABOUT_CSS}
<div style="max-width:720px;margin:0 auto;">
<h2 style="margin:0 0 28px;font-size:clamp(22px,3vw,30px);font-weight:800;text-align:center;">Как мы работаем</h2>
<div style="border-left:2px solid #e5e7eb;padding-left:clamp(20px,3vw,28px);margin-left:12px;">
<div style="margin-bottom:28px;position:relative;">
<span style="position:absolute;left:calc(-1 * (12px + 10px));top:6px;width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 2px #2563eb;"></span>
<h3 style="margin:0 0 6px;font-size:16px;font-weight:800;">01. Бриф</h3>
<p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">Собираем цели, ограничения и референсы.</p>
</div>
<div style="margin-bottom:28px;">
<h3 style="margin:0 0 6px;font-size:16px;font-weight:800;">02. Концепция</h3>
<p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">Предлагаем структуру и визуальное направление.</p>
</div>
<div>
<h3 style="margin:0 0 6px;font-size:16px;font-weight:800;">03. Запуск</h3>
<p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">Верстаем, тестируем, передаём материалы.</p>
</div>
</div>
</div>
</section>`,
  },
];
