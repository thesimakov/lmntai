/** Фоновые кадры — стабильные Unsplash; в блоке можно заменить URL в Style Manager / коде. */
const IMG_MOUNTAIN = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&q=80";
const IMG_BLUE_LAGOON = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=2000&q=80";
const IMG_READING = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=2000&q=80";
const IMG_PEAKS = "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2000&q=80";

type CoverBlock = { id: string; label: string; content: string };

const COVER_BLOCKS: CoverBlock[] = [
  {
    id: "cover-cr01",
    label: "CR01 · Обложка: заголовок, подзаголовок и раздел",
    content: `<section class="lemnity-section" data-gjs-name="CR01 Обложка" style="position:relative;box-sizing:border-box;min-height:520px;display:flex;align-items:center;justify-content:center;padding:72px 28px;text-align:center;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172b url(${IMG_MOUNTAIN}) center/cover no-repeat;">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,0.45) 0%,rgba(15,23,42,0.72) 100%);pointer-events:none"></div>
  <div style="position:relative;z-index:1;max-width:760px;">
    <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;opacity:0.95">О компании</p>
    <h1 style="margin:0 0 22px;font-size:clamp(2rem,5.5vw,3.35rem);font-weight:800;line-height:1.08;letter-spacing:-0.02em">Воплотите свои идеи</h1>
    <p style="margin:0;font-size:clamp(1rem,2.2vw,1.2rem);line-height:1.65;opacity:0.93">Всё, о чём вы мечтали, становится возможным в тот момент, когда вы решили победить.</p>
  </div>
</section>`,
  },
  {
    id: "cover-cr02",
    label: "CR02 · Обложка: заголовок и описание",
    content: `<section class="lemnity-section" data-gjs-name="CR02 Обложка" style="position:relative;box-sizing:border-box;min-height:520px;display:flex;align-items:center;justify-content:center;padding:72px 28px;text-align:center;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0c1222 url(${IMG_BLUE_LAGOON}) center/cover no-repeat;">
  <div style="position:absolute;inset:0;background:rgba(12,18,34,0.55);pointer-events:none"></div>
  <div style="position:relative;z-index:1;max-width:820px;">
    <h1 style="margin:0 0 24px;font-size:clamp(2.4rem,6vw,4rem);font-weight:800;line-height:1;text-transform:uppercase;letter-spacing:0.06em">Открытия</h1>
    <p style="margin:0;font-size:clamp(1rem,2.2vw,1.2rem);line-height:1.7;opacity:0.92">Организуем незабываемые поездки по всему миру. Выберите готовое направление или предложите своё</p>
  </div>
</section>`,
  },
  {
    id: "cover-cr12",
    label: "CR12 · Обложка: кнопки, текст слева",
    content: `<section class="lemnity-section" data-gjs-name="CR12 Обложка" style="position:relative;box-sizing:border-box;min-height:480px;display:flex;flex-wrap:wrap;align-items:stretch;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#111827;">
  <div style="flex:1 1 320px;display:flex;flex-direction:column;justify-content:center;padding:56px 40px 56px 48px;text-align:left;box-sizing:border-box">
    <h2 style="margin:0 0 18px;font-size:clamp(1.75rem,3.5vw,2.35rem);font-weight:800;line-height:1.15">Мы создаём продукты, которыми гордимся</h2>
    <p style="margin:0 0 28px;font-size:1.05rem;line-height:1.65;opacity:0.9;max-width:520px">Делаем выразительные проекты и сервисы, которые помогают бизнесу работать надёжнее и удобнее для людей.</p>
    <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">
      <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 26px;border-radius:999px;background:#facc15;color:#111827;font-weight:700;font-size:14px;text-decoration:none">О нас</a>
      <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 26px;border-radius:999px;border:2px solid rgba(255,255,255,0.85);color:#fff;font-weight:600;font-size:14px;text-decoration:none;background:transparent">Чем занимаемся</a>
    </div>
  </div>
  <div style="flex:1 1 280px;min-height:280px;background:url(${IMG_READING}) center/cover no-repeat"></div>
</section>`,
  },
  {
    id: "cover-cr16",
    label: "CR16 · Обложка: кнопки, по центру",
    content: `<section class="lemnity-section" data-gjs-name="CR16 Обложка" style="position:relative;box-sizing:border-box;min-height:520px;display:flex;align-items:center;justify-content:center;padding:72px 28px;text-align:center;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#1e1b4b url(${IMG_PEAKS}) center/cover no-repeat;">
  <div style="position:absolute;inset:0;background:rgba(15,23,42,0.5);pointer-events:none"></div>
  <div style="position:relative;z-index:1;max-width:800px;">
    <h1 style="margin:0 0 20px;font-size:clamp(2rem,5vw,3.1rem);font-weight:800;line-height:1.12">Верьте в себя — и вы уже на полпути</h1>
    <p style="margin:0 0 32px;font-size:1.1rem;line-height:1.6;opacity:0.9">Во всё, о чём рассказываете, верьте всей душой.</p>
    <div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center">
      <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 28px;border-radius:999px;background:#f97316;color:#fff;font-weight:800;font-size:13px;letter-spacing:0.06em;text-decoration:none;text-transform:uppercase">Поехали!</a>
      <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 28px;border-radius:999px;background:#fff;color:#111827;font-weight:800;font-size:13px;letter-spacing:0.06em;text-decoration:none;text-transform:uppercase">Как это работает</a>
    </div>
  </div>
</section>`,
  },
];

const LANDING_HERO_SIMPLE: CoverBlock = {
  id: "landing-hero-simple",
  label: "Простой первый экран",
  content: `<section class="lemnity-section" data-gjs-name="Простой первый экран" style="min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;text-align:center;background:#eef2ff;color:#0f172a;font-family:system-ui,-apple-system,sans-serif">
  <h1 style="margin:0 0 16px;font-size:2.5rem;font-weight:800">Новый первый экран</h1>
  <p style="margin:0 0 24px;max-width:560px;color:#475569;font-size:1.1rem">Описание предложения или продукта.</p>
  <a href="#" style="display:inline-flex;padding:12px 24px;border-radius:999px;background:#0f172a;color:#fff;font-weight:700;text-decoration:none">Подробнее</a>
</section>`,
};

/** Варианты обложек и простого первого экрана — объединены с блоком «Главный экран» в реестре. */
export const TILDA_COVER_PICKER_ITEMS: ReadonlyArray<CoverBlock> = [...COVER_BLOCKS, LANDING_HERO_SIMPLE];
