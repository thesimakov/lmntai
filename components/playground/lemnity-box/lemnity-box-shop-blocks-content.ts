import { LEMNITY_CAROUSEL_NAV_STYLES } from "@/lib/lemnity-carousel-nav-runtime";

/** Адаптив магазинных секций: планшет / телефон (каждая секция с классом lemnity-shop-s). */
const SHOP_RESPONSIVE_CSS = `<style>
.lemnity-shop-s,.lemnity-shop-s *{box-sizing:border-box}
${LEMNITY_CAROUSEL_NAV_STYLES.trim()}
.lemnity-shop-s .lemnity-carousel-row .lemnity-carousel-nav{min-height:100px}
.lemnity-shop-s .lemnity-grid-a{display:grid;gap:clamp(12px,2.5vw,20px)}
.lemnity-shop-s .lemnity-grid-a.cols-3{grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))}
.lemnity-shop-s .lemnity-grid-a.cols-max3{grid-template-columns:repeat(3,minmax(0,1fr))}
@media (max-width:900px){.lemnity-shop-s .lemnity-grid-a.cols-max3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.lemnity-shop-s .lemnity-grid-a.cols-max3{grid-template-columns:1fr}}
.lemnity-shop-s .lemnity-cards-4{display:grid;gap:clamp(10px,2vw,14px);grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:900px){.lemnity-shop-s .lemnity-cards-4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.lemnity-shop-s .lemnity-cards-4{grid-template-columns:1fr}}
.lemnity-shop-s .lemnity-cards-5{display:grid;gap:12px;grid-template-columns:repeat(5,minmax(0,1fr))}
@media (max-width:1024px){.lemnity-shop-s .lemnity-cards-5{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.lemnity-shop-s .lemnity-cards-5{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:380px){.lemnity-shop-s .lemnity-cards-5{grid-template-columns:1fr}}
.lemnity-shop-s .lemnity-promo-strip{display:grid;gap:16px;grid-template-columns:repeat(3,1fr);text-align:center}
@media (max-width:640px){
  .lemnity-shop-s .lemnity-promo-strip{grid-template-columns:1fr}
  .lemnity-shop-s .lemnity-promo-strip > div{border-left:0!important;border-right:0!important;border-bottom:1px solid rgba(148,163,184,.35)!important;padding:12px 8px!important}
  .lemnity-shop-s .lemnity-promo-strip > div:last-child{border-bottom:0!important}
}
.lemnity-shop-s .lemnity-split-hero{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch}
@media (max-width:768px){.lemnity-shop-s .lemnity-split-hero{grid-template-columns:1fr}}
.lemnity-shop-s .lemnity-cards-3{display:grid;gap:18px;grid-template-columns:repeat(3,minmax(0,1fr))}
@media (max-width:768px){.lemnity-shop-s .lemnity-cards-3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:440px){.lemnity-shop-s .lemnity-cards-3{grid-template-columns:1fr}}
.lemnity-shop-s .lemnity-cards-2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media (max-width:560px){.lemnity-shop-s .lemnity-cards-2{grid-template-columns:1fr;gap:16px}}
.lemnity-shop-s .lemnity-filter-layout{display:flex;gap:clamp(16px,3vw,28px);flex-wrap:wrap}
.lemnity-shop-s .lemnity-filter-aside{flex:1 1 218px;max-width:100%;padding:18px;border:1px solid #e5e7eb;border-radius:12px;font-size:12px}
.lemnity-shop-s .lemnity-filter-main{flex:1 1 min(560px,calc(100% - 240px));min-width:min(100%,280px)}
.lemnity-shop-s .lemnity-catalog-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr))}
@media (min-width:900px){.lemnity-shop-s .lemnity-catalog-grid{grid-template-columns:repeat(3,1fr)}}
.lemnity-shop-s .lemnity-list-row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:clamp(12px,3vw,20px);padding:clamp(14px,3vw,22px) clamp(12px,3vw,24px);border-bottom:1px solid #e8e8e8}
.lemnity-shop-s .lemnity-list-row:last-child{border-bottom:0}
.lemnity-shop-s .lemnity-list-media{flex-shrink:0;width:min(128px,38vw);max-width:128px;aspect-ratio:1;border-radius:10px;overflow:hidden}
.lemnity-shop-s .lemnity-list-body{flex:1 1 min(280px,calc(100% - 140px));min-width:0}
.lemnity-shop-s .lemnity-list-price{flex-basis:auto;width:100%;text-align:left}
@media (min-width:560px){.lemnity-shop-s .lemnity-list-price{width:auto;text-align:right;align-self:flex-start;margin-left:auto}}
</style>`;

export const SHOP_IMG = {
  vase: "https://images.unsplash.com/photo-1578500494198-246f612d84b3?w=500&q=80",
  tote: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80",
  serum: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
  sweater: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80",
  glasses: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80",
  chair: "https://images.unsplash.com/photo-1506439779439-ae6ef2c9d4c2?w=500&q=80",
  watch: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80",
  pouch: "https://images.unsplash.com/photo-1597484661640-2a800746deec?w=500&q=80",
  notebook: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80",
};

function carouselNav() {
  return `<span class="lemnity-carousel-nav" aria-hidden>‹</span>`;
}

function carouselNavRight() {
  return `<span class="lemnity-carousel-nav" aria-hidden>›</span>`;
}

function formatPriceRow(
  current: string,
  oldPrice?: string,
  opts?: {
    align?: "center" | "end" | "start";
    currentSize?: string;
    oldSize?: string;
    currentColor?: string;
    oldColor?: string;
  },
) {
  const align = opts?.align ?? "center";
  const curSize = opts?.currentSize ?? "inherit";
  const oldSize = opts?.oldSize ?? "12px";
  const curColor = opts?.currentColor ?? "inherit";
  const oldCol = opts?.oldColor ?? "#94a3b8";
  const justify =
    align === "end" ? "flex-end" : align === "start" ? "flex-start" : "center";
  if (!oldPrice) {
    return `<span style="font-weight:800;font-size:${curSize};color:${curColor};">${current}</span>`;
  }
  return `<span style="display:inline-flex;flex-wrap:wrap;align-items:baseline;justify-content:${justify};gap:6px 8px;">
    <span style="font-weight:500;font-size:${oldSize};color:${oldCol};text-decoration:line-through;">${oldPrice}</span>
    <span style="font-weight:800;font-size:${curSize};color:${curColor};">${current}</span>
  </span>`;
}

function productCardCarousel(src: string, price: string, badge?: string, withCart?: boolean, oldPrice?: string) {
  const b = badge
    ? `<span style="position:absolute;top:8px;left:8px;background:#1f2937;color:#fff;font-size:9px;font-weight:700;padding:3px 7px;text-transform:none;">${badge}</span>`
    : "";
  const cart = withCart
    ? `<a href="#" style="margin:8px 10px 12px;display:block;text-align:center;padding:10px 8px;background:#374151;color:#fff;text-decoration:none;font-size:11px;font-weight:700;border-radius:4px;">В корзину</a>`
    : "";
  const priceInner = formatPriceRow(price, oldPrice);
  return `<article style="position:relative;border:1px solid #e5e7eb;border-radius:12px;background:#fff;overflow:hidden;text-align:center;box-sizing:border-box;">
    <div style="position:relative;aspect-ratio:1;overflow:hidden;background:#f9fafb;">
      ${b}
      <img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/>
    </div>
    <div style="padding:10px 8px 0;">
      <p style="margin:0;font-size:12px;color:#57534e;">Товар</p>
      <p style="margin:6px 0 0;font-size:13px;color:#111;">${priceInner}</p>
    </div>
    ${cart}
  </article>`;
}

export const LEMNITY_SHOP_BLOCK_VARIANTS = [
  {
    id: "shop-grid",
    badge: "SG01",
    title: "Сетка карточек товаров",
    hint: "три столбца, цена и кнопка",
    content: `<section class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(36px,5vw,56px) clamp(16px,4vw,24px);font-family:system-ui,sans-serif;background:#fafafa;color:#111;">
  ${SHOP_RESPONSIVE_CSS}
  <h2 style="margin:0 0 28px;text-align:center;font-size:clamp(22px,5vw,28px);font-weight:800;">Каталог</h2>
  <div class="lemnity-grid-a cols-max3" style="max-width:980px;margin:0 auto;">
    <article style="background:#fff;border-radius:14px;padding:18px;border:1px solid #e8e8e8;text-align:center;">
      <div style="height:140px;border-radius:10px;background:linear-gradient(145deg,#e2e8f0,#f8fafc);margin-bottom:12px;"></div>
      <h3 style="margin:0 0 8px;font-size:16px;">Товар A</h3>
      <p style="margin:0 0 12px;font-size:17px;display:flex;justify-content:center;">${formatPriceRow("2 490 ₽", "3 190 ₽", { currentColor: "#059669", currentSize: "17px", oldSize: "14px" })}</p>
      <a href="#" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#111;color:#fff;font-size:13px;font-weight:700;text-decoration:none;">В корзину</a>
    </article>
    <article style="background:#fff;border-radius:14px;padding:18px;border:1px solid #e8e8e8;text-align:center;">
      <div style="height:140px;border-radius:10px;background:linear-gradient(145deg,#fef3c7,#fffbeb);margin-bottom:12px;"></div>
      <h3 style="margin:0 0 8px;font-size:16px;">Товар B</h3>
      <p style="margin:0 0 12px;font-size:17px;display:flex;justify-content:center;">${formatPriceRow("3 100 ₽", "3 890 ₽", { currentColor: "#059669", currentSize: "17px", oldSize: "14px" })}</p>
      <a href="#" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#111;color:#fff;font-size:13px;font-weight:700;text-decoration:none;">В корзину</a>
    </article>
    <article style="background:#fff;border-radius:14px;padding:18px;border:1px solid #e8e8e8;text-align:center;">
      <div style="height:140px;border-radius:10px;background:linear-gradient(145deg,#fce7f3,#fdf4ff);margin-bottom:12px;"></div>
      <h3 style="margin:0 0 8px;font-size:16px;">Товар C</h3>
      <p style="margin:0 0 12px;font-size:17px;display:flex;justify-content:center;">${formatPriceRow("1 790 ₽", "2 290 ₽", { currentColor: "#059669", currentSize: "17px", oldSize: "14px" })}</p>
      <a href="#" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#111;color:#fff;font-size:13px;font-weight:700;text-decoration:none;">В корзину</a>
    </article>
  </div>
</section>`,
  },
  {
    id: "shop-featured",
    badge: "SG02",
    title: "Акцент: один товар",
    hint: "широкий баннер с фото и CTA",
    content: `<section class="lemnity-shop-s lemnity-section" style="margin:0;padding:0;font-family:system-ui,sans-serif;">
  ${SHOP_RESPONSIVE_CSS}
  <div class="lemnity-split-hero" style="max-width:1100px;margin:0 auto;background:#fff;">
    <div style="min-height:min(320px,50vw);background:linear-gradient(135deg,#0f172a,#334155);"></div>
    <div style="padding:clamp(28px,5vw,48px) clamp(22px,4vw,40px);display:flex;flex-direction:column;justify-content:center;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Хит продаж</p>
      <h2 style="margin:0 0 16px;font-size:clamp(26px,3vw,34px);font-weight:900;line-height:1.15;color:#0f172a;">Название товара</h2>
      <p style="margin:0 0 20px;line-height:1.6;color:#475569;font-size:15px;">Кратко опишите пользу или акцию на эту позицию.</p>
      <p style="margin:0 0 22px;font-size:26px;display:flex;flex-wrap:wrap;align-items:baseline;">${formatPriceRow("4 599 ₽", "5 499 ₽", { align: "start", currentColor: "#059669", currentSize: "26px", oldSize: "18px" })}</p>
      <a href="#" style="align-self:flex-start;display:inline-flex;padding:14px 28px;border-radius:999px;background:#0f172a;color:#fff;font-weight:700;text-decoration:none;">Купить</a>
    </div>
  </div>
</section>`,
  },
  {
    id: "shop-strip",
    badge: "SG03",
    title: "Лента промо-блоков",
    hint: "доставка, оплата, возврат",
    content: `<section class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(16px,4vw,24px) clamp(14px,3vw,20px);font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;">
  ${SHOP_RESPONSIVE_CSS}
  <div class="lemnity-promo-strip" style="max-width:1000px;margin:0 auto;">
    <div style="padding:16px;"><p style="margin:0 0 6px;font-weight:800;font-size:14px;color:#fff;">Доставка</p><p style="margin:0;font-size:13px;color:#94a3b8;">От 290 ₽</p></div>
    <div style="padding:16px;border-left:1px solid rgba(148,163,184,0.35);border-right:1px solid rgba(148,163,184,0.35);"><p style="margin:0 0 6px;font-weight:800;font-size:14px;color:#fff;">Оплата</p><p style="margin:0;font-size:13px;color:#94a3b8;">Карты, СБП</p></div>
    <div style="padding:16px;"><p style="margin:0 0 6px;font-weight:800;font-size:14px;color:#fff;">Возврат</p><p style="margin:0;font-size:13px;color:#94a3b8;">14 дней</p></div>
  </div>
</section>`,
  },
  {
    id: "shop-explore-carousel",
    badge: "SG04",
    title: "Витрина: коллекция и карусель",
    hint: "заголовок, текст, ряд карточек, CTA",
    content: `<section data-gjs-name="Магазин: коллекция" class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(24px,5vw,36px) clamp(14px,4vw,20px);background:#e8eaef;font-family:system-ui,sans-serif;color:#111;">
  ${SHOP_RESPONSIVE_CSS}
  <div style="max-width:1040px;margin:0 auto;background:#fafafa;border:1px solid #e5e7eb;border-radius:16px;padding:clamp(22px,4vw,36px) clamp(16px,4vw,28px) 28px;">
    <h2 style="margin:0 0 8px;text-align:center;font-size:clamp(22px,4vw,28px);font-weight:800;line-height:1.15;">Коллекция</h2>
    <p style="margin:0 auto;max-width:520px;text-align:center;font-size:14px;line-height:1.55;color:#64748b;">Короткий абзац-пояснение. Расскажите посетителям о сезонной линии.</p>
    <div class="lemnity-carousel-row" style="margin-top:28px;">
      ${carouselNav()}
      <div class="lemnity-carousel-track"><div class="lemnity-cards-4">
        ${productCardCarousel(SHOP_IMG.vase, "6 490 ₽", undefined, undefined, "7 990 ₽")}
        ${productCardCarousel(SHOP_IMG.tote, "1 890 ₽", undefined, undefined, "2 390 ₽")}
        ${productCardCarousel(SHOP_IMG.serum, "990 ₽", undefined, undefined, "1 290 ₽")}
        ${productCardCarousel(SHOP_IMG.sweater, "2 290 ₽", undefined, undefined, "2 990 ₽")}
      </div></div>
      ${carouselNavRight()}
    </div>
    <div style="margin-top:28px;text-align:center;">
      <a href="#" style="display:inline-flex;padding:12px 32px;background:#374151;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:2px;">В магазин</a>
    </div>
  </div>
</section>`,
  },
  {
    id: "shop-bestsellers",
    badge: "SG05",
    title: "Хиты продаж: полоса и стрелки",
    hint: "заголовок по центру, белая карточка-слайдер",
    content: `<section data-gjs-name="Магазин: хиты" class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,40px) clamp(14px,4vw,20px);background:#e5e7eb;font-family:system-ui,sans-serif;color:#111;">
  ${SHOP_RESPONSIVE_CSS}
  <div style="max-width:1020px;margin:0 auto;border-radius:14px;background:#fafafa;padding:clamp(22px,4vw,36px);border:1px solid #ddd;">
    <h2 style="margin:0 0 24px;text-align:center;font-size:clamp(20px,4vw,26px);font-weight:800;color:#374151;">Хиты продаж</h2>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:clamp(12px,3vw,20px) clamp(8px,2vw,12px);">
      <div class="lemnity-carousel-row">
        ${carouselNav()}
        <div class="lemnity-carousel-track"><div class="lemnity-cards-4" style="gap:16px;">
          ${productCardCarousel(SHOP_IMG.vase, "6 490 ₽", undefined, undefined, "7 990 ₽")}
          ${productCardCarousel(SHOP_IMG.tote, "1 890 ₽", undefined, undefined, "2 390 ₽")}
          ${productCardCarousel(SHOP_IMG.serum, "990 ₽", "Хит", undefined, "1 490 ₽")}
          ${productCardCarousel(SHOP_IMG.sweater, "2 290 ₽", undefined, undefined, "2 990 ₽")}
        </div></div>
        ${carouselNavRight()}
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "shop-special-offers",
    badge: "SG06",
    title: "Спецпредложения: корзина в карточке",
    hint: "заголовок, «Все товары», пять позиций",
    content: `<section data-gjs-name="Магазин: спецпредложения" class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(24px,5vw,36px) clamp(14px,4vw,18px);background:#e8eaef;font-family:system-ui,sans-serif;color:#111;">
  ${SHOP_RESPONSIVE_CSS}
  <div style="max-width:1080px;margin:0 auto;background:#fafafa;border:1px solid #e5e7eb;border-radius:16px;padding:clamp(20px,4vw,28px) clamp(14px,3vw,22px);">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
      <h2 style="margin:0;font-size:clamp(20px,4vw,24px);font-weight:800;color:#111;">Спецпредложения</h2>
      <a href="#" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;color:#374151;background:#fafafa;">Все товары</a>
    </div>
    <div class="lemnity-carousel-row" style="gap:6px;">
      ${carouselNav()}
      <div class="lemnity-carousel-track"><div class="lemnity-cards-5">
        ${productCardCarousel(SHOP_IMG.vase, "6 490 ₽", undefined, true, "7 990 ₽")}
        ${productCardCarousel(SHOP_IMG.tote, "1 890 ₽", undefined, true, "2 390 ₽")}
        ${productCardCarousel(SHOP_IMG.serum, "990 ₽", "Хит", true, "1 490 ₽")}
        ${productCardCarousel(SHOP_IMG.sweater, "2 290 ₽", undefined, true, "2 990 ₽")}
        ${productCardCarousel(SHOP_IMG.glasses, "3 790 ₽", undefined, true, "4 790 ₽")}
      </div></div>
      ${carouselNavRight()}
    </div>
  </div>
</section>`,
  },
  {
    id: "shop-new-arrivals",
    badge: "SG07",
    title: "Новинки: тёмная витрина",
    hint: "две крупные карточки, светлый текст",
    content: `<section data-gjs-name="Магазин: новинки" class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,40px) clamp(16px,4vw,24px);background:#d4d4d8;font-family:system-ui,sans-serif;">
  ${SHOP_RESPONSIVE_CSS}
  <div style="max-width:880px;margin:0 auto;border-radius:14px;background:#374151;padding:clamp(24px,4vw,36px);border:2px solid #f5f5f5;">
    <h2 style="margin:0 0 28px;text-align:center;color:#fafafa;font-size:clamp(22px,4vw,26px);font-weight:800;">Новинки</h2>
    <div class="lemnity-carousel-row" style="color:#fafafa;gap:10px;">
      <span class="lemnity-carousel-nav light" aria-hidden>‹</span>
      <div class="lemnity-carousel-track"><div class="lemnity-cards-2">
        <article style="text-align:center;">
          <div style="border-radius:12px;overflow:hidden;border:1px solid rgba(250,250,250,0.2);aspect-ratio:1;"><img src="${SHOP_IMG.vase}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>
          <p style="margin:12px 0 4px;color:#fafafa;font-size:14px;">Товар</p>
          <p style="margin:0;font-size:14px;display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;">${formatPriceRow("6 490 ₽", "8 200 ₽", { oldColor: "rgba(250,250,250,0.42)", currentColor: "rgba(250,250,250,0.95)", currentSize: "14px", oldSize: "13px" })}</p>
        </article>
        <article style="text-align:center;">
          <div style="border-radius:12px;overflow:hidden;border:1px solid rgba(250,250,250,0.2);aspect-ratio:1;"><img src="${SHOP_IMG.tote}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>
          <p style="margin:12px 0 4px;color:#fafafa;font-size:14px;">Товар</p>
          <p style="margin:0;font-size:14px;display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;">${formatPriceRow("1 890 ₽", "2 590 ₽", { oldColor: "rgba(250,250,250,0.42)", currentColor: "rgba(250,250,250,0.95)", currentSize: "14px", oldSize: "13px" })}</p>
        </article>
      </div></div>
      <span class="lemnity-carousel-nav light" aria-hidden>›</span>
    </div>
  </div>
</section>`,
  },
  {
    id: "shop-essentials-row",
    badge: "SG08",
    title: "Базовый набор из трёх товаров",
    hint: "шапка + тёмная кнопка «Все товары»",
    content: `<section data-gjs-name="Магазин: базовый набор" class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(24px,5vw,36px) clamp(14px,4vw,20px);background:#e8eaef;font-family:system-ui,sans-serif;color:#111;">
  ${SHOP_RESPONSIVE_CSS}
  <div style="max-width:900px;margin:0 auto;background:#fafafa;border:1px solid #e5e7eb;border-radius:16px;padding:clamp(20px,4vw,28px) clamp(16px,4vw,24px);">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
      <h2 style="margin:0;font-size:clamp(18px,3.5vw,22px);font-weight:800;color:#374151;">Базовые позиции</h2>
      <a href="#" style="padding:11px 24px;background:#374151;color:#fff;text-decoration:none;font-size:13px;font-weight:700;border-radius:4px;">Все товары</a>
    </div>
    <div class="lemnity-carousel-row">
      ${carouselNav()}
      <div class="lemnity-carousel-track"><div class="lemnity-cards-3">
        ${productCardCarousel(SHOP_IMG.vase, "6 490 ₽", undefined, undefined, "7 990 ₽")}
        ${productCardCarousel(SHOP_IMG.tote, "1 890 ₽", undefined, undefined, "2 390 ₽")}
        ${productCardCarousel(SHOP_IMG.serum, "990 ₽", "Хит", undefined, "1 490 ₽")}
      </div></div>
      ${carouselNavRight()}
    </div>
  </div>
</section>`,
  },
  {
    id: "shop-filter-grid",
    badge: "ST32",
    title: "Каталог: фильтры и сетка",
    hint: "боковая колонка, поиск, сортировка, сетка 3×2",
    content: `<section data-gjs-name="Магазин: фильтры" class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(18px,4vw,28px) clamp(14px,3vw,20px);background:#fff;font-family:system-ui,sans-serif;color:#111;">
  ${SHOP_RESPONSIVE_CSS}
  <div class="lemnity-filter-layout" style="max-width:1080px;margin:0 auto;">
    <aside class="lemnity-filter-aside">
      <p style="margin:0 0 14px;font-weight:800;text-transform:none;">Категории</p>
      <a href="#" style="display:block;padding:8px 0;color:#374151;text-decoration:none;">Все</a>
      <a href="#" style="display:block;padding:8px 0;color:#64748b;text-decoration:none;">Часы</a>
      <a href="#" style="display:block;padding:8px 0;color:#64748b;text-decoration:none;">Аксессуары</a>
      <a href="#" style="display:block;padding:8px 0;color:#64748b;text-decoration:none;">Для дома</a>
      <p style="margin:20px 0 10px;font-weight:700;">Цена</p>
      <div style="height:8px;background:#e5e7eb;border-radius:4px;"></div>
      <p style="margin:10px 0 0;color:#64748b;">8 ₽ — 18 990 ₽</p>
      <p style="margin:18px 0 8px;font-weight:700;">Бренды</p>
      <label style="display:flex;gap:8px;margin:8px 0;align-items:center;"><input type="checkbox"/> Brend A</label>
      <label style="display:flex;gap:8px;margin:8px 0;align-items:center;"><input type="checkbox"/> Brend B</label>
      <label style="display:flex;gap:8px;margin:14px 0;align-items:center;"><input type="checkbox"/> Только в наличии</label>
    </aside>
    <div class="lemnity-filter-main">
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <input placeholder="Поиск" style="flex:1;min-width:min(180px,100%);padding:11px 14px;border:1px solid #e5e7eb;border-radius:8px;"/>
        <select style="padding:11px 14px;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:140px;">
          <option>По умолчанию</option>
        </select>
      </div>
      <div class="lemnity-catalog-grid">
        <article style="text-align:center;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
          <div style="aspect-ratio:1;padding:14px;display:flex;align-items:center;justify-content:center;position:relative;">
            <span style="position:absolute;top:10px;right:10px;background:#111;color:#fff;width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:9px;font-weight:700;">Sale</span>
            <img src="${SHOP_IMG.notebook}" alt="" style="max-width:80%;max-height:80%;object-fit:contain;display:block;border-radius:6px;" />
          </div>
          <p style="margin:12px;font-size:13px;font-weight:700;">Блокнот</p>
          <p style="margin:0 12px 16px;">${formatPriceRow("590 ₽", "890 ₽", { align: "center", currentSize: "15px", oldSize: "13px" })}</p>
        </article>
        <article style="text-align:center;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
          <div style="aspect-ratio:1;padding:10px;display:flex;align-items:center;justify-content:center;"><img src="${SHOP_IMG.vase}" alt="" style="width:92%;height:92%;object-fit:cover;display:block;border-radius:8px;"/></div>
          <p style="margin:12px;font-size:13px;font-weight:700;">Ваза</p>
          <p style="margin:0 12px 16px;">${formatPriceRow("3 490 ₽", "4 600 ₽", { align: "center", currentSize: "15px", oldSize: "13px" })}</p>
        </article>
        <article style="text-align:center;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
          <div style="aspect-ratio:1;padding:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);"></div>
          <p style="margin:12px;font-size:13px;font-weight:700;">Часы</p>
          <p style="margin:0 12px 16px;">${formatPriceRow("31 900 ₽", "38 500 ₽", { align: "center", currentSize: "15px", oldSize: "13px" })}</p>
        </article>
        <article style="text-align:center;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
          <div style="aspect-ratio:1;padding:10px;display:flex;align-items:center;justify-content:center;"><img src="${SHOP_IMG.glasses}" alt="" style="width:88%;height:88%;object-fit:contain;display:block;"/></div>
          <p style="margin:12px;font-size:13px;font-weight:700;">Очки</p>
          <p style="margin:0 12px 16px;">${formatPriceRow("12 490 ₽", "16 900 ₽", { align: "center", currentSize: "15px", oldSize: "13px" })}</p>
        </article>
        <article style="text-align:center;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
          <div style="aspect-ratio:1;padding:10px;display:flex;align-items:center;justify-content:center;background:#fafafa;"></div>
          <p style="margin:12px;font-size:13px;font-weight:700;">Часы Minimal</p>
          <p style="margin:0 12px 16px;">${formatPriceRow("8 900 ₽", "11 200 ₽", { align: "center", currentSize: "15px", oldSize: "13px" })}</p>
        </article>
        <article style="text-align:center;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
          <div style="aspect-ratio:1;padding:10px;display:flex;align-items:center;justify-content:center;background:#f8fafc;"></div>
          <p style="margin:12px;font-size:13px;font-weight:700;">Часы Duo</p>
          <p style="margin:0 12px 16px;">${formatPriceRow("9 200 ₽", "10 990 ₽", { align: "center", currentSize: "15px", oldSize: "13px" })}</p>
        </article>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "shop-list-rows",
    badge: "ST33",
    title: "Вертикальный список позиций",
    hint: "фото слева, описание по центру, цена справа",
    content: `<section data-gjs-name="Магазин: список" class="lemnity-shop-s lemnity-section" style="margin:0;padding:clamp(20px,4vw,32px) clamp(14px,3vw,20px);background:#f8fafc;font-family:system-ui,sans-serif;color:#111;">
  ${SHOP_RESPONSIVE_CSS}
  <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
    <article class="lemnity-list-row">
      <div class="lemnity-list-media" style="position:relative;background:#f1f5f9;">
        <img src="${SHOP_IMG.chair}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />
        <span style="position:absolute;top:8px;left:8px;background:#ea580c;color:#fff;font-size:9px;font-weight:800;padding:3px 6px;text-transform:none;">−50%</span>
      </div>
      <div class="lemnity-list-body"><h3 style="margin:4px 0 8px;font-size:clamp(15px,3.5vw,17px);font-weight:800;">Стул обеденный</h3><p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Гибкая посадка и стойкая обивка под ежедневное использование.</p></div>
      <div class="lemnity-list-price"><p style="margin:0;display:flex;flex-wrap:wrap;justify-content:flex-end;">${formatPriceRow("7 990 ₽", "15 980 ₽", { align: "end", oldSize: "14px", currentSize: "17px", currentColor: "#111" })}</p></div>
    </article>
    <article class="lemnity-list-row">
      <div class="lemnity-list-media"><img src="${SHOP_IMG.watch}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;background:#ececec"/></div>
      <div class="lemnity-list-body"><h3 style="margin:4px 0 8px;font-size:clamp(15px,3.5vw,17px);font-weight:800;">Часы Ceramic</h3><p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Циферблат диаметром 41 мм.</p></div>
      <div class="lemnity-list-price"><p style="margin:0;display:flex;flex-wrap:wrap;justify-content:flex-end;">${formatPriceRow("9 000 ₽", "13 900 ₽", { align: "end", oldSize: "14px", currentSize: "17px", currentColor: "#111" })}</p></div>
    </article>
    <article class="lemnity-list-row">
      <div class="lemnity-list-media"><img src="${SHOP_IMG.pouch}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;background:#eef2ff"/></div>
      <div class="lemnity-list-body"><h3 style="margin:4px 0 8px;font-size:clamp(15px,3.5vw,17px);font-weight:800;">Рюкзак-мини</h3><p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Подходит как для офиса, так и для прогулок.</p></div>
      <div class="lemnity-list-price"><p style="margin:0;display:flex;flex-wrap:wrap;justify-content:flex-end;">${formatPriceRow("10 800 ₽", "15 400 ₽", { align: "end", oldSize: "14px", currentSize: "17px", currentColor: "#111" })}</p></div>
    </article>
  </div>
</section>`,
  },
];
