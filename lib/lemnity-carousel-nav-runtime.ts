/**
 * Горизонтальный скролл для рядов с `.lemnity-carousel-nav` и поведение стрелок.
 * Инжектится в iframe GrapesJS и в HTML превью/публикации (`/api/sandbox/...`).
 */

export const LEMNITY_CAROUSEL_NAV_STYLES = `
/* Общая раскладка карусели: ряд ↔ трек со скроллом — для любого блока с этими классами */
.lemnity-carousel-row {
  display: flex !important;
  align-items: stretch;
  gap: 8px;
  flex-wrap: nowrap;
}
.lemnity-carousel-row .lemnity-carousel-track {
  flex: 1 1 min(720px, 100%);
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  /* Скрываем системную нижнюю полосу; прокрутка стрелками/колесом/тач сохранена */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.lemnity-carousel-row .lemnity-carousel-track::-webkit-scrollbar {
  display: none;
  height: 0;
  width: 0;
}

/* Карусель: в треке — один горизонтальный ряд, не сетка «вниз» */
.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-4,
.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-5,
.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-3,
.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-2 {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  width: max-content !important;
  grid-template-columns: unset !important;
  grid-auto-columns: unset !important;
  grid-auto-flow: unset !important;
}

.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-5 > * {
  flex: 0 0 auto !important;
  box-sizing: border-box;
  width: clamp(118px, 30vw, 190px);
  max-width: 200px;
  min-width: 110px;
}

.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-4 > * {
  flex: 0 0 auto !important;
  box-sizing: border-box;
  width: clamp(146px, 36vw, 240px);
  max-width: 260px;
  min-width: 140px;
}

.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-3 > * {
  flex: 0 0 auto !important;
  box-sizing: border-box;
  width: clamp(158px, 34vw, 280px);
  max-width: 300px;
  min-width: 150px;
}

.lemnity-carousel-row .lemnity-carousel-track > .lemnity-cards-2 > * {
  flex: 0 0 auto !important;
  box-sizing: border-box;
  width: clamp(240px, 42vw, 420px);
  max-width: 440px;
  min-width: 220px;
}

.lemnity-carousel-row .lemnity-carousel-nav {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  display: flex;
  flex: 0 0 28px;
  flex-shrink: 0;
  width: 28px;
  min-height: 72px;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  line-height: 1;
  color: #57534e;
}
.lemnity-carousel-row .lemnity-carousel-nav.light {
  color: inherit;
  font-size: 20px;
}
@media (max-width: 768px) {
  .lemnity-carousel-row .lemnity-carousel-nav {
    display: none !important;
  }
}
`;

/** Тело без тегов <script> — вставляется в element.textContent */
export const LEMNITY_CAROUSEL_NAV_JS = `
(function(){
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (!el || typeof el.closest !== "function") return;
    var btn = el.closest(".lemnity-carousel-nav");
    if (!btn) return;
    var row = btn.closest(".lemnity-carousel-row");
    if (!row || !row.contains(btn)) return;
    var track = row.querySelector(".lemnity-carousel-track");
    if (!track || typeof track.scrollBy !== "function") return;
    var navs = row.querySelectorAll(".lemnity-carousel-nav");
    var idx = -1;
    for (var i = 0; i < navs.length; i++) {
      if (navs[i] === btn) { idx = i; break; }
    }
    var dir = idx <= 0 ? -1 : 1;
    var wbox = Math.max(track.clientWidth || 0, 200);
    var step = Math.max(140, Math.min(420, wbox * 0.85));
    track.scrollBy({ left: dir * step, behavior: "smooth" });
    e.preventDefault();
  }, true);
})();
`;

export function htmlContainsCarouselNav(markup: string): boolean {
  return markup.includes("lemnity-carousel-nav");
}

/**
 * Ответ превью/публикации: стили горизонтального скролла и делегирование клика по `.lemnity-carousel-nav`.
 */
export function injectCarouselNavIntoHtmlDocument(html: string): string {
  if (!htmlContainsCarouselNav(html) || /id\s*=\s*["']lemnity-carousel-nav-bootstrap["']/.test(html)) {
    return html;
  }
  const injection =
    `<style id="lemnity-carousel-nav-styles">${LEMNITY_CAROUSEL_NAV_STYLES.trim()}</style>` +
    `<script id="lemnity-carousel-nav-bootstrap">${LEMNITY_CAROUSEL_NAV_JS.trim()}<\/script>`;
  const lower = html.toLowerCase();
  const bi = lower.lastIndexOf("</body>");
  if (bi !== -1) {
    return `${html.slice(0, bi)}${injection}${html.slice(bi)}`;
  }
  return `${html}${injection}`;
}

/** Iframe GrapesJS: добавить те же правила без изменения сохранённого HTML. */
export function attachLemnityCarouselNavToCanvasFrame(win: Window | null | undefined): void {
  if (!win?.document?.head || !win.document.body) return;

  const sid = "lemnity-carousel-nav-styles";
  if (!win.document.getElementById(sid)) {
    const st = win.document.createElement("style");
    st.id = sid;
    st.textContent = LEMNITY_CAROUSEL_NAV_STYLES.trim();
    win.document.head?.appendChild(st);
  }

  const jid = "lemnity-carousel-nav-bootstrap";
  if (!win.document.getElementById(jid)) {
    const scr = win.document.createElement("script");
    scr.id = jid;
    scr.textContent = LEMNITY_CAROUSEL_NAV_JS.trim();
    win.document.body.appendChild(scr);
  }
}
