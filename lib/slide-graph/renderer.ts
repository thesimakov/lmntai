import type { SlideGraph, Slide, SlideElement, SlideTheme } from "./types";

function esc(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderElement(el: SlideElement, theme: SlideTheme): string {
  const id = `data-lmnt-elem-id="${el.id}"`;
  const style = el.style
    ? ` style="${[
        el.style.color ? `color:${el.style.color}` : "",
        el.style.fontSize ? `font-size:${el.style.fontSize}` : "",
        el.style.fontWeight === "bold" ? "font-weight:700" : "",
        el.style.italic ? "font-style:italic" : "",
        el.style.textAlign ? `text-align:${el.style.textAlign}` : "",
        el.style.opacity != null ? `opacity:${el.style.opacity}` : "",
      ]
        .filter(Boolean)
        .join(";")
      }"`
    : "";

  switch (el.type) {
    case "heading":
      return `<h2 class="lmnt-slide__heading" ${id}${style}>${esc(el.content)}</h2>`;
    case "subheading":
      return `<p class="lmnt-slide__subheading" ${id}${style}>${esc(el.content)}</p>`;
    case "body":
      return `<p class="lmnt-slide__body" ${id}${style}>${esc(el.content)}</p>`;
    case "bullet-list": {
      const items = (el.items ?? []).map((item) => `<li>${esc(item)}</li>`).join("");
      return `<ul class="lmnt-slide__bullets" ${id}${style}>${items}</ul>`;
    }
    case "image":
      return `<img class="lmnt-slide__image" src="${esc(el.src)}" alt="${esc(el.alt)}" loading="lazy" ${id}${style} />`;
    case "quote":
      return `<blockquote class="lmnt-slide__quote" ${id}${style}>${esc(el.content)}</blockquote>`;
    case "caption":
      return `<p class="lmnt-slide__caption" ${id}${style}>${esc(el.content)}</p>`;
    case "label":
      return `<span class="lmnt-slide__label" ${id}${style}>${esc(el.content)}</span>`;
    default:
      return `<div ${id}>${esc((el as SlideElement).content ?? "")}</div>`;
  }
}

export function renderSlide(slide: Slide, theme: SlideTheme): string {
  const bgColor = slide.background?.color ?? theme.backgroundColor;
  const bgImage = slide.background?.image
    ? `background-image:url('${esc(slide.background.image)}');background-size:cover;`
    : "";
  const overlay =
    slide.background?.image && slide.background.overlay != null
      ? `<div class="lmnt-slide__overlay" style="background:rgba(0,0,0,${slide.background.overlay})"></div>`
      : "";

  const elements = slide.elements.map((el) => renderElement(el, theme)).join("\n");
  const layoutClass = `lmnt-slide--${slide.layout}`;

  return `<div class="lmnt-slide ${layoutClass}" data-lmnt-slide-id="${slide.id}" style="background-color:${bgColor};${bgImage}">
${overlay}
<div class="lmnt-slide__content">
${elements}
</div>
</div>`;
}

const CLICK_HANDLER_SCRIPT = `<script>(function(){var sel=null;function desel(){if(sel){sel.style.outline='';sel=null;}}document.addEventListener('click',function(e){var el=e.target;while(el&&el!==document.body){if(el.dataset&&el.dataset.lmntElemId){e.preventDefault();desel();sel=el;el.style.outline='2px solid #4F8EF7';var slide=el.closest('[data-lmnt-slide-id]');var slideId=slide?slide.dataset.lmntSlideId:null;window.parent.postMessage({type:'lmnt-elem-selected',slideId:slideId,elemId:el.dataset.lmntElemId},'*');return;}if(el.dataset&&el.dataset.lmntSlideId&&!el.dataset.lmntElemId){break;}el=el.parentElement;}desel();window.parent.postMessage({type:'lmnt-elem-deselected'},'*');});})();<\/script>`;

export function renderSlideGraph(graph: SlideGraph): string {
  const { meta, slides } = graph;
  const { theme, language } = meta;

  const baseStyles = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: #111; }
body { font-family: ${theme.fontFamily}; color: ${theme.textColor}; padding: 32px 0; }
.lmnt-deck { display: flex; flex-direction: column; align-items: center; gap: 24px; }
.lmnt-slide { width: 960px; aspect-ratio: 16/9; position: relative; overflow: hidden; border-radius: 4px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); cursor: default; }
.lmnt-slide__overlay { position: absolute; inset: 0; }
.lmnt-slide__content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 48px 64px; gap: 16px; }
.lmnt-slide__heading { font-size: 2.25rem; font-weight: 700; line-height: 1.2; }
.lmnt-slide__subheading { font-size: 1.25rem; opacity: 0.75; }
.lmnt-slide__body { font-size: 1.1rem; line-height: 1.7; opacity: 0.9; }
.lmnt-slide__bullets { font-size: 1.1rem; line-height: 1.7; padding-left: 1.5em; opacity: 0.9; }
.lmnt-slide__bullets li { margin-bottom: 8px; }
.lmnt-slide__bullets li::marker { color: ${theme.primaryColor}; }
.lmnt-slide__image { width: 100%; height: 100%; object-fit: cover; }
.lmnt-slide__quote { font-size: 1.5rem; font-style: italic; border-left: 4px solid ${theme.primaryColor}; padding-left: 24px; opacity: 0.9; }
.lmnt-slide__caption { font-size: 0.875rem; opacity: 0.6; }
.lmnt-slide__label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: ${theme.primaryColor}; }

/* Layout variants */
.lmnt-slide--title .lmnt-slide__content { align-items: center; text-align: center; }
.lmnt-slide--title .lmnt-slide__heading { font-size: 3rem; }
.lmnt-slide--section-divider .lmnt-slide__content { align-items: center; text-align: center; background: ${theme.primaryColor}10; }
.lmnt-slide--section-divider .lmnt-slide__heading { font-size: 2.5rem; color: ${theme.primaryColor}; }
.lmnt-slide--two-column .lmnt-slide__content { flex-direction: row; gap: 48px; align-items: flex-start; }
.lmnt-slide--image-left .lmnt-slide__content,
.lmnt-slide--image-right .lmnt-slide__content { flex-direction: row; gap: 0; padding: 0; }
.lmnt-slide--image-left .lmnt-slide__image,
.lmnt-slide--image-right .lmnt-slide__image { width: 50%; height: 100%; flex-shrink: 0; }
.lmnt-slide--quote .lmnt-slide__content { justify-content: center; align-items: center; }
.lmnt-slide--quote .lmnt-slide__quote { font-size: 2rem; text-align: center; border-left: none; border-top: 4px solid ${theme.primaryColor}; padding: 24px 0 0; }
[data-lmnt-elem-id] { cursor: pointer; transition: outline 0.1s; }
[data-lmnt-elem-id]:hover { outline: 2px dashed rgba(79,142,247,0.5); outline-offset: 2px; }
`.trim();

  const slidesHtml = slides.map((slide) => renderSlide(slide, theme)).join("\n");

  return `<!DOCTYPE html>
<html lang="${esc(language)}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(meta.title)}</title>
<style>${baseStyles}</style>
</head>
<body>
<div class="lmnt-deck">
${slidesHtml}
</div>
${CLICK_HANDLER_SCRIPT}
</body>
</html>`;
}
