import type { SlideGraph, Slide, SlideElement, SlideTheme } from "./types";
import {
  SLIDE_CANVAS_H,
  SLIDE_CANVAS_W,
  defaultElementFrame,
  isSlideFreeform,
  slideNeedsFrameCapture,
} from "./freeform";
import { SLIDE_EDITOR_INTERACTION_SCRIPT } from "./slide-editor-runtime";
import { buildSlideDeckStyles } from "./slide-deck-styles";
import { labelStyleInlineCss } from "./label-style";

function esc(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cssColorAttr(color: string | undefined): string {
  if (!color?.trim()) return "";
  return ` style="color:${color.replace(/"/g, "&quot;")}"`;
}

function inlineStyle(el: SlideElement): string {
  if (!el.style) return "";
  const parts = [
    el.style.color ? `color:${el.style.color}` : "",
    el.style.fontSize ? `font-size:${el.style.fontSize}` : "",
    el.style.fontWeight === "bold" ? "font-weight:700" : "",
    el.style.italic ? "font-style:italic" : "",
    el.style.textAlign ? `text-align:${el.style.textAlign}` : "",
    el.style.opacity != null ? `opacity:${el.style.opacity}` : "",
    el.style.backgroundColor ? `background:${el.style.backgroundColor}` : "",
    el.style.borderRadius ? `border-radius:${el.style.borderRadius}` : "",
  ].filter(Boolean);
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

function renderElement(el: SlideElement): string {
  const id = `data-lmnt-elem-id="${el.id}"`;
  const s = inlineStyle(el);

  switch (el.type) {
    case "heading":
      return `<h2 class="lmnt-slide__heading" ${id}${s}>${esc(el.content)}</h2>`;
    case "subheading":
      return `<p class="lmnt-slide__subheading" ${id}${s}>${esc(el.content)}</p>`;
    case "body":
      return `<p class="lmnt-slide__body" ${id}${s}>${esc(el.content)}</p>`;
    case "bullet-list": {
      const items = (el.items ?? []).map((item) => `<li>${esc(item)}</li>`).join("");
      return `<ul class="lmnt-slide__bullets" ${id}${s}>${items}</ul>`;
    }
    case "image":
      return `<img class="lmnt-slide__image" src="${esc(el.src)}" alt="${esc(el.alt)}" loading="lazy" ${id}${s} />`;
    case "quote":
      return `<blockquote class="lmnt-slide__quote" ${id}${s}>${esc(el.content)}</blockquote>`;
    case "caption":
      return `<p class="lmnt-slide__caption" ${id}${s}>${esc(el.content)}</p>`;
    case "label": {
      const labelS = labelStyleInlineCss(el.style) || s;
      return `<span class="lmnt-slide__label" ${id}${labelS}>${esc(el.content)}</span>`;
    }

    case "metric-card":
      return `<div class="lmnt-card lmnt-metric-card" ${id}${s}>
  <p class="lmnt-metric-card__label"${cssColorAttr(el.style?.labelColor ?? el.style?.color)}>${esc(el.label ?? el.content)}</p>
  <p class="lmnt-metric-card__description"${cssColorAttr(el.style?.descriptionColor ?? el.style?.color)}>${esc(el.description)}</p>
</div>`;

    case "stat-number":
      return `<div class="lmnt-stat-number" ${id}${s}>
  <span class="lmnt-stat-number__value"${cssColorAttr(el.style?.valueColor ?? el.style?.color)}>${esc(el.value)}</span>
  ${el.change ? `<span class="lmnt-stat-number__change"${cssColorAttr(el.style?.changeColor)}>${esc(el.change)}</span>` : ""}
  <span class="lmnt-stat-number__label"${cssColorAttr(el.style?.labelColor ?? el.style?.color)}>${esc(el.label)}</span>
</div>`;

    case "feature-card": {
      const badge = el.badge ? `<span class="lmnt-feature-card__badge">${esc(el.badge)}</span>` : "";
      return `<div class="lmnt-card lmnt-feature-card" ${id}${s}>
  ${badge}
  <p class="lmnt-feature-card__title">${esc(el.content ?? el.label)}</p>
  <p class="lmnt-feature-card__desc">${esc(el.description)}</p>
</div>`;
    }

    case "step-card":
      return `<div class="lmnt-card lmnt-step-card" ${id}${s}>
  <div class="lmnt-step-card__num">${esc(String(el.stepNumber ?? ""))}</div>
  <p class="lmnt-step-card__title">${esc(el.content ?? el.label)}</p>
  <p class="lmnt-step-card__desc">${esc(el.description)}</p>
</div>`;

    case "pricing-card": {
      const featuresHtml = (el.features ?? [])
        .map((f) => `<li class="lmnt-pricing-card__feat">${esc(f)}</li>`)
        .join("");
      return `<div class="lmnt-card lmnt-pricing-card${el.popular ? " lmnt-pricing-card--popular" : ""}" ${id}${s}>
  <p class="lmnt-pricing-card__plan">${esc(el.planName ?? el.content)}</p>
  ${el.popular ? `<span class="lmnt-pricing-card__badge">ПОПУЛЯРНЫЙ</span>` : ""}
  <p class="lmnt-pricing-card__price">${esc(el.price)}<span class="lmnt-pricing-card__period"> ${esc(el.period)}</span></p>
  <ul class="lmnt-pricing-card__feats">${featuresHtml}</ul>
</div>`;
    }

    case "timeline-col": {
      const itemsHtml = (el.items ?? [])
        .map((item) => `<li class="lmnt-timeline-col__item">${esc(item)}</li>`)
        .join("");
      return `<div class="lmnt-timeline-col${el.highlighted ? " lmnt-timeline-col--highlighted" : ""}" ${id}${s}>
  <span class="lmnt-timeline-col__period">${esc(el.period ?? el.label)}</span>
  <p class="lmnt-timeline-col__title">${esc(el.content ?? el.planName)}</p>
  <ul class="lmnt-timeline-col__items">${itemsHtml}</ul>
</div>`;
    }

    default:
      return `<div ${id}>${esc((el as SlideElement).content ?? "")}</div>`;
  }
}

// Separate cards from heading/subheading elements for layout rendering
function partitionElements(elements: SlideElement[]): {
  header: SlideElement[];
  cards: SlideElement[];
} {
  const headerTypes: SlideElement["type"][] = ["heading", "subheading", "body", "label", "caption"];
  return {
    header: elements.filter((e) => headerTypes.includes(e.type)),
    cards: elements.filter((e) => !headerTypes.includes(e.type)),
  };
}

function renderFreeformElement(el: SlideElement, theme: SlideTheme, index: number): string {
  const frame = el.frame ?? defaultElementFrame(index, el.type);
  const z = frame.zIndex ?? index + 1;
  const inner = renderElement(el);
  return `<div class="lmnt-elem-frame" data-lmnt-elem-id="${esc(el.id)}" data-lmnt-frame-wrap="1" style="position:absolute;left:${frame.x}px;top:${frame.y}px;width:${frame.w}px;height:${frame.h}px;z-index:${z};box-sizing:border-box;cursor:grab;overflow:hidden;touch-action:none;">
  <div class="lmnt-elem-frame__inner" style="width:100%;height:100%;overflow:auto;pointer-events:none">${inner}</div>
</div>`;
}

export type RenderSlideOptions = {
  editor?: boolean;
  captureFrames?: boolean;
};

function slideBackgroundStyle(slide: Slide, theme: SlideTheme): string {
  const bgColor = slide.background?.color ?? theme.backgroundColor;
  const bgGradient = slide.background?.gradient ?? "";
  const bgImage = slide.background?.image
    ? `background-image:url('${esc(slide.background.image)}');background-size:cover;`
    : "";
  return bgGradient
    ? `background:${bgGradient};`
    : `background-color:${bgColor};${bgImage}`;
}

function slideOverlayHtml(slide: Slide): string {
  if (!slide.background?.image || slide.background.overlay == null) return "";
  return `<div class="lmnt-slide__overlay" style="background:rgba(0,0,0,${slide.background.overlay})"></div>`;
}

export function renderSlide(slide: Slide, theme: SlideTheme, opts?: RenderSlideOptions): string {
  const bgStyle = slideBackgroundStyle(slide, theme);
  const overlay = slideOverlayHtml(slide);
  const layoutClass = `lmnt-slide--${slide.layout}`;

  const editor = opts?.editor === true;
  const editorGridClass = editor ? " lmnt-slide--show-grid" : "";
  const capture = editor && (opts?.captureFrames === true || slideNeedsFrameCapture(slide));
  const useFreeformLayer = editor ? !capture : isSlideFreeform(slide);

  if (useFreeformLayer) {
    const freeformHtml = slide.elements
      .map((el, i) => renderFreeformElement(el, theme, i))
      .join("\n");
    const freeformAttr = editor ? ` data-lmnt-freeform="1"` : "";
    return `<div class="lmnt-slide lmnt-slide--freeform ${layoutClass}${editorGridClass}" data-lmnt-slide-id="${slide.id}"${freeformAttr} style="position:relative;width:${SLIDE_CANVAS_W}px;height:${SLIDE_CANVAS_H}px;${bgStyle}">
${overlay}
${freeformHtml}
</div>`;
  }

  const captureAttr = capture ? ` data-lmnt-capture-frames="1"` : "";
  const innerHtml = renderLayoutContent(slide);

  return `<div class="lmnt-slide ${layoutClass}${editorGridClass}" data-lmnt-slide-id="${slide.id}"${captureAttr} style="${bgStyle}">
${overlay}
${innerHtml}
</div>`;
}

function renderLayoutContent(slide: Slide): string {
  const { elements, layout } = slide;
  const { header, cards } = partitionElements(elements);

  const headerHtml = header.map((el) => renderElement(el)).join("\n");
  const allHtml = elements.map((el) => renderElement(el)).join("\n");

  switch (layout) {
    case "metrics-cards": {
      const metricCards = cards.filter((e) => e.type === "metric-card");
      const statNumbers = cards.filter((e) => e.type === "stat-number");
      const metricsHtml = metricCards.map((e) => renderElement(e)).join("");
      const statsHtml = statNumbers.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-metrics-cards">
  <div class="lmnt-layout-metrics-cards__header">${headerHtml}</div>
  <div class="lmnt-layout-metrics-cards__cards">${metricsHtml}</div>
  <div class="lmnt-layout-metrics-cards__stats">${statsHtml}</div>
</div>`;
    }

    case "dark-solution": {
      const featureCards = cards.filter((e) => e.type === "feature-card");
      const cardsHtml = featureCards.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-dark-solution">
  <div class="lmnt-layout-dark-solution__header">${headerHtml}</div>
  <div class="lmnt-layout-dark-solution__cards">${cardsHtml}</div>
</div>`;
    }

    case "steps-grid": {
      const steps = cards.filter((e) => e.type === "step-card");
      const stepsHtml = steps.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-steps-grid">
  <div class="lmnt-layout-steps-grid__header">${headerHtml}</div>
  <div class="lmnt-layout-steps-grid__steps">${stepsHtml}</div>
</div>`;
    }

    case "feature-grid-6": {
      const features = cards.filter((e) => e.type === "feature-card");
      const featuresHtml = features.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-feature-grid-6">
  <div class="lmnt-layout-feature-grid-6__header">${headerHtml}</div>
  <div class="lmnt-layout-feature-grid-6__grid">${featuresHtml}</div>
</div>`;
    }

    case "dark-metrics": {
      const stats = cards.filter((e) => e.type === "stat-number");
      const metrics = cards.filter((e) => e.type === "metric-card");
      const statsHtml = stats.map((e) => renderElement(e)).join("");
      const metricsHtml = metrics.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-dark-metrics">
  <div class="lmnt-layout-dark-metrics__header">${headerHtml}</div>
  <div class="lmnt-layout-dark-metrics__stats">${statsHtml}</div>
  <div class="lmnt-layout-dark-metrics__cards">${metricsHtml}</div>
</div>`;
    }

    case "pricing-3col": {
      const tiers = cards.filter((e) => e.type === "pricing-card");
      const tiersHtml = tiers.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-pricing-3col">
  <div class="lmnt-layout-pricing-3col__header">${headerHtml}</div>
  <div class="lmnt-layout-pricing-3col__tiers">${tiersHtml}</div>
</div>`;
    }

    case "market-split": {
      const stats = cards.filter((e) => e.type === "stat-number");
      const features = cards.filter((e) => e.type === "feature-card");
      const statsHtml = stats.map((e) => renderElement(e)).join("");
      const featuresHtml = features.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-market-split">
  <div class="lmnt-layout-market-split__header">${headerHtml}</div>
  <div class="lmnt-layout-market-split__stats">${statsHtml}</div>
  <div class="lmnt-layout-market-split__features">${featuresHtml}</div>
</div>`;
    }

    case "timeline-4col": {
      const cols = cards.filter((e) => e.type === "timeline-col");
      const colsHtml = cols.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-timeline-4col">
  <div class="lmnt-layout-timeline-4col__header">${headerHtml}</div>
  <div class="lmnt-layout-timeline-4col__cols">${colsHtml}</div>
</div>`;
    }

    case "cta-split": {
      const rightCards = cards.filter((e) => e.type === "metric-card" || e.type === "pricing-card");
      const rightHtml = rightCards.map((e) => renderElement(e)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-cta-split">
  <div class="lmnt-layout-cta-split__left">${headerHtml}</div>
  <div class="lmnt-layout-cta-split__right">${rightHtml}</div>
</div>`;
    }

    // Original layouts
    case "title":
      return `<div class="lmnt-slide__content lmnt-layout-title">${allHtml}</div>`;
    case "section-divider":
      return `<div class="lmnt-slide__content lmnt-layout-section-divider">${allHtml}</div>`;
    case "two-column":
      return `<div class="lmnt-slide__content lmnt-layout-two-column">${allHtml}</div>`;
    case "image-left":
    case "image-right":
      return `<div class="lmnt-slide__content lmnt-layout-image-side">${allHtml}</div>`;
    case "quote":
      return `<div class="lmnt-slide__content lmnt-layout-quote">${allHtml}</div>`;
    default:
      return `<div class="lmnt-slide__content">${allHtml}</div>`;
  }
}

const CLICK_HANDLER_SCRIPT = `<script>(function(){var sel=null;function desel(){if(sel){sel.style.outline='';sel=null;}}document.addEventListener('click',function(e){var el=e.target;while(el&&el!==document.body){if(el.dataset&&el.dataset.lmntElemId){e.preventDefault();desel();sel=el;el.style.outline='2px solid #4F8EF7';var slide=el.closest('[data-lmnt-slide-id]');var slideId=slide?slide.dataset.lmntSlideId:null;window.parent.postMessage({type:'lmnt-elem-selected',slideId:slideId,elemId:el.dataset.lmntElemId},'*');return;}if(el.dataset&&el.dataset.lmntSlideId&&!el.dataset.lmntElemId){break;}el=el.parentElement;}desel();window.parent.postMessage({type:'lmnt-elem-deselected'},'*');});})();<\/script>`;

export function renderSlideGraph(graph: SlideGraph): string {
  const { meta, slides } = graph;
  const { theme, language } = meta;
  const baseStyles = buildSlideDeckStyles(theme, "deck");

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

/** Render a single slide as a standalone HTML document (for iframe preview) */
export function renderSingleSlide(
  graph: SlideGraph,
  slideIndex: number,
  options?: { editor?: boolean }
): string {
  const { meta } = graph;
  const { theme, language } = meta;
  const slide = graph.slides[slideIndex];
  if (!slide) return "<html><body></body></html>";

  if (options?.editor) {
    const slideHtml = renderSlide(slide, theme, {
      editor: true,
      captureFrames: slideNeedsFrameCapture(slide),
    });
    return `<!DOCTYPE html>
<html lang="${esc(language)}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(meta.title)}</title>
<style>${buildSlideDeckStyles(theme, "editor")}</style>
</head>
<body>
<div class="lmnt-deck">
${slideHtml}
</div>
${SLIDE_EDITOR_INTERACTION_SCRIPT}
</body>
</html>`;
  }

  const fullHtml = renderSlideGraph({ ...graph, slides: [slide] });
  return fullHtml.replace(
    /<body>/,
    `<body style="padding:0;background:transparent;">`
  ).replace(
    '<div class="lmnt-deck">',
    '<div class="lmnt-deck" style="padding:0;gap:0;">'
  );
}
