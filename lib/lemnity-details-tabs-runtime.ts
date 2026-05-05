/**
 * В GrapesJS клики по холсту часто перехватываются редактором — <details>/<summary>
 * и кастомные вкладки не реагируют. Делегирование в capture-фазе (как у карусели).
 * На опубликованных страницах скрипт нужен для вкладок (.lemnity-tab-widget);
 * <details class="lemnity-details-widget"> остаётся рабочим и без JS (нативное поведение).
 */

export const LEMNITY_DETAILS_TABS_JS = `
(function(){
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (!el || typeof el.closest !== "function") return;

    var sum = el.closest("summary");
    if (sum) {
      var det = sum.closest("details.lemnity-details-widget");
      if (det && det.contains(sum)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        det.open = !det.open;
        return;
      }
    }

    var trig = el.closest("[data-lemnity-tab]");
    if (!trig) return;
    var root = trig.closest(".lemnity-tab-widget");
    if (!root || !root.contains(trig)) return;
    var key = trig.getAttribute("data-lemnity-tab");
    if (key == null || key === "") return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    root.querySelectorAll("[data-lemnity-tab]").forEach(function (btn) {
      var on = btn.getAttribute("data-lemnity-tab") === key;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.classList.toggle("lemnity-tab-trigger--active", on);
    });
    root.querySelectorAll("[data-lemnity-tab-panel]").forEach(function (panel) {
      var show = panel.getAttribute("data-lemnity-tab-panel") === key;
      if (show) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
      panel.classList.toggle("lemnity-tab-panel--active", show);
    });
  }, true);
})();
`;

const BOOTSTRAP_ID = "lemnity-details-tabs-bootstrap";

export function htmlNeedsDetailsTabsRuntime(markup: string): boolean {
  return (
    markup.includes("lemnity-details-widget") ||
    markup.includes("lemnity-tab-widget") ||
    markup.includes("data-lemnity-tab")
  );
}

/** Превью / публикация: вкладки и фикс аккордеона в средах с перехватом событий */
export function injectDetailsTabsIntoHtmlDocument(html: string): string {
  const already = new RegExp(`id\\s*=\\s*["']${BOOTSTRAP_ID}["']`, "i").test(html);
  if (!htmlNeedsDetailsTabsRuntime(html) || already) {
    return html;
  }
  const injection = `<script id="${BOOTSTRAP_ID}">${LEMNITY_DETAILS_TABS_JS.trim()}<\/script>`;
  const lower = html.toLowerCase();
  const bi = lower.lastIndexOf("</body>");
  if (bi !== -1) {
    return `${html.slice(0, bi)}${injection}${html.slice(bi)}`;
  }
  return `${html}${injection}`;
}

/** Iframe GrapesJS: тот же скрипт без изменения сохранённого HTML */
export function attachLemnityDetailsTabsToCanvasFrame(win: Window | null | undefined): void {
  if (!win?.document?.body) return;
  if (win.document.getElementById(BOOTSTRAP_ID)) return;
  const scr = win.document.createElement("script");
  scr.id = BOOTSTRAP_ID;
  scr.textContent = LEMNITY_DETAILS_TABS_JS.trim();
  win.document.body.appendChild(scr);
}
