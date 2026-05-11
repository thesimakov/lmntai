/**
 * Якорные метки `data-ln-anchor`: отступ при скролле под фиксированную шапку и плавный переход по внутренним ссылкам #id.
 */

export const LEMNITY_ANCHOR_CSS = `
:root {
  --lemnity-anchor-offset: min(96px, 18vh);
}
[data-ln-anchor="1"] {
  scroll-margin-top: var(--lemnity-anchor-offset);
  box-sizing: border-box;
}
[data-ln-anchor="1"] > .lemnity-anchor-editor-only {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
}
`;

/** Только холст редактора: подпись якоря остаётся видимой (не скрываем editor-only). */
export const LEMNITY_ANCHOR_CANVAS_CSS = `
:root {
  --lemnity-anchor-offset: min(96px, 18vh);
}
[data-ln-anchor="1"] {
  scroll-margin-top: var(--lemnity-anchor-offset);
  box-sizing: border-box;
}
`;

export const LEMNITY_ANCHOR_JS = `
(function(){
  function scrollToId(rawId, smooth) {
    var id = String(rawId || "").replace(/^#/, "");
    if (!id) return false;
    var el = document.getElementById(id);
    if (!el || typeof el.scrollIntoView !== "function") return false;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    return true;
  }
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (!t || typeof t.closest !== "function") return;
      var a = t.closest('a[href^="#"]');
      if (!a || a.getAttribute("href") === "#") return;
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      var id = href.slice(1);
      if (!id || href.indexOf("/") !== -1) return;
      if (scrollToId(id, true)) e.preventDefault();
    },
    true
  );
  function onLoadHash() {
    var id = (location.hash || "").replace(/^#/, "");
    if (!id) return;
    requestAnimationFrame(function () {
      scrollToId(id, false);
    });
  }
  if (document.readyState === "complete") onLoadHash();
  else window.addEventListener("load", onLoadHash);
})();
`;

export function htmlContainsLemnityAnchors(markup: string): boolean {
  return markup.includes('data-ln-anchor="1"');
}

export function injectLemnityAnchorsIntoHtmlDocument(html: string): string {
  if (!htmlContainsLemnityAnchors(html) || /id\s*=\s*["']lemnity-anchor-bootstrap["']/.test(html)) {
    return html;
  }
  const injection =
    `<style id="lemnity-anchor-styles">${LEMNITY_ANCHOR_CSS.trim()}</style>` +
    `<script id="lemnity-anchor-bootstrap">${LEMNITY_ANCHOR_JS.trim()}<\/script>`;
  const lower = html.toLowerCase();
  const bi = lower.lastIndexOf("</body>");
  if (bi !== -1) {
    return `${html.slice(0, bi)}${injection}${html.slice(bi)}`;
  }
  return `${html}${injection}`;
}

export function attachLemnityAnchorsToCanvasFrame(win: Window | null | undefined): void {
  if (!win?.document?.head || !win.document.body) return;

  const sid = "lemnity-anchor-styles";
  if (!win.document.getElementById(sid)) {
    const st = win.document.createElement("style");
    st.id = sid;
    st.textContent = LEMNITY_ANCHOR_CANVAS_CSS.trim();
    win.document.head.appendChild(st);
  }

  const jid = "lemnity-anchor-bootstrap";
  if (!win.document.getElementById(jid)) {
    const scr = win.document.createElement("script");
    scr.id = jid;
    scr.textContent = LEMNITY_ANCHOR_JS.trim();
    win.document.body.appendChild(scr);
  }
}
