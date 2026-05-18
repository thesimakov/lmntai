import type { SlideGraph, Slide, SlideElement, SlideTheme } from "./types";

function esc(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  ].filter(Boolean);
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

function renderElement(el: SlideElement, theme: SlideTheme): string {
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
    case "label":
      return `<span class="lmnt-slide__label" ${id}${s}>${esc(el.content)}</span>`;

    case "metric-card":
      return `<div class="lmnt-card lmnt-metric-card" ${id}${s}>
  <p class="lmnt-metric-card__label">${esc(el.label ?? el.content)}</p>
  <p class="lmnt-metric-card__description">${esc(el.description)}</p>
</div>`;

    case "stat-number":
      return `<div class="lmnt-stat-number" ${id}${s}>
  <span class="lmnt-stat-number__value">${esc(el.value)}</span>
  ${el.change ? `<span class="lmnt-stat-number__change">${esc(el.change)}</span>` : ""}
  <span class="lmnt-stat-number__label">${esc(el.label)}</span>
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

export function renderSlide(slide: Slide, theme: SlideTheme): string {
  const bgColor = slide.background?.color ?? theme.backgroundColor;
  const bgGradient = slide.background?.gradient ?? "";
  const bgImage = slide.background?.image
    ? `background-image:url('${esc(slide.background.image)}');background-size:cover;`
    : "";
  const overlay =
    slide.background?.image && slide.background.overlay != null
      ? `<div class="lmnt-slide__overlay" style="background:rgba(0,0,0,${slide.background.overlay})"></div>`
      : "";

  const layoutClass = `lmnt-slide--${slide.layout}`;
  const bgStyle = bgGradient
    ? `background:${bgGradient};`
    : `background-color:${bgColor};${bgImage}`;

  // Rich layouts use structured inner HTML
  const innerHtml = renderLayoutContent(slide, theme);

  return `<div class="lmnt-slide ${layoutClass}" data-lmnt-slide-id="${slide.id}" style="${bgStyle}">
${overlay}
${innerHtml}
</div>`;
}

function renderLayoutContent(slide: Slide, theme: SlideTheme): string {
  const { elements, layout } = slide;
  const { header, cards } = partitionElements(elements);

  const headerHtml = header.map((el) => renderElement(el, theme)).join("\n");
  const allHtml = elements.map((el) => renderElement(el, theme)).join("\n");

  switch (layout) {
    case "metrics-cards": {
      const metricCards = cards.filter((e) => e.type === "metric-card");
      const statNumbers = cards.filter((e) => e.type === "stat-number");
      const metricsHtml = metricCards.map((e) => renderElement(e, theme)).join("");
      const statsHtml = statNumbers.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-metrics-cards">
  <div class="lmnt-layout-metrics-cards__header">${headerHtml}</div>
  <div class="lmnt-layout-metrics-cards__cards">${metricsHtml}</div>
  <div class="lmnt-layout-metrics-cards__stats">${statsHtml}</div>
</div>`;
    }

    case "dark-solution": {
      const featureCards = cards.filter((e) => e.type === "feature-card");
      const cardsHtml = featureCards.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-dark-solution">
  <div class="lmnt-layout-dark-solution__header">${headerHtml}</div>
  <div class="lmnt-layout-dark-solution__cards">${cardsHtml}</div>
</div>`;
    }

    case "steps-grid": {
      const steps = cards.filter((e) => e.type === "step-card");
      const stepsHtml = steps.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-steps-grid">
  <div class="lmnt-layout-steps-grid__header">${headerHtml}</div>
  <div class="lmnt-layout-steps-grid__steps">${stepsHtml}</div>
</div>`;
    }

    case "feature-grid-6": {
      const features = cards.filter((e) => e.type === "feature-card");
      const featuresHtml = features.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-feature-grid-6">
  <div class="lmnt-layout-feature-grid-6__header">${headerHtml}</div>
  <div class="lmnt-layout-feature-grid-6__grid">${featuresHtml}</div>
</div>`;
    }

    case "dark-metrics": {
      const stats = cards.filter((e) => e.type === "stat-number");
      const metrics = cards.filter((e) => e.type === "metric-card");
      const statsHtml = stats.map((e) => renderElement(e, theme)).join("");
      const metricsHtml = metrics.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-dark-metrics">
  <div class="lmnt-layout-dark-metrics__header">${headerHtml}</div>
  <div class="lmnt-layout-dark-metrics__stats">${statsHtml}</div>
  <div class="lmnt-layout-dark-metrics__cards">${metricsHtml}</div>
</div>`;
    }

    case "pricing-3col": {
      const tiers = cards.filter((e) => e.type === "pricing-card");
      const tiersHtml = tiers.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-pricing-3col">
  <div class="lmnt-layout-pricing-3col__header">${headerHtml}</div>
  <div class="lmnt-layout-pricing-3col__tiers">${tiersHtml}</div>
</div>`;
    }

    case "market-split": {
      const stats = cards.filter((e) => e.type === "stat-number");
      const features = cards.filter((e) => e.type === "feature-card");
      const statsHtml = stats.map((e) => renderElement(e, theme)).join("");
      const featuresHtml = features.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-market-split">
  <div class="lmnt-layout-market-split__header">${headerHtml}</div>
  <div class="lmnt-layout-market-split__stats">${statsHtml}</div>
  <div class="lmnt-layout-market-split__features">${featuresHtml}</div>
</div>`;
    }

    case "timeline-4col": {
      const cols = cards.filter((e) => e.type === "timeline-col");
      const colsHtml = cols.map((e) => renderElement(e, theme)).join("");
      return `<div class="lmnt-slide__content lmnt-layout-timeline-4col">
  <div class="lmnt-layout-timeline-4col__header">${headerHtml}</div>
  <div class="lmnt-layout-timeline-4col__cols">${colsHtml}</div>
</div>`;
    }

    case "cta-split": {
      const rightCards = cards.filter((e) => e.type === "metric-card" || e.type === "pricing-card");
      const rightHtml = rightCards.map((e) => renderElement(e, theme)).join("");
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
  const primary = theme.primaryColor;
  const accent = theme.accentColor ?? "#FF6B8A";

  const baseStyles = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: #111; }
body { font-family: ${theme.fontFamily}; color: ${theme.textColor}; padding: 32px 0; }
.lmnt-deck { display: flex; flex-direction: column; align-items: center; gap: 24px; }
.lmnt-slide { width: 960px; aspect-ratio: 16/9; position: relative; overflow: hidden; border-radius: 8px; box-shadow: 0 8px 40px rgba(0,0,0,0.5); cursor: default; }
.lmnt-slide__overlay { position: absolute; inset: 0; }
.lmnt-slide__content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 40px 56px; gap: 12px; }

/* === BASE ELEMENT STYLES === */
.lmnt-slide__heading { font-size: 2.25rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
.lmnt-slide__subheading { font-size: 1.15rem; opacity: 0.75; line-height: 1.5; }
.lmnt-slide__body { font-size: 1.05rem; line-height: 1.7; opacity: 0.88; }
.lmnt-slide__bullets { font-size: 1.05rem; line-height: 1.7; padding-left: 1.5em; opacity: 0.88; }
.lmnt-slide__bullets li { margin-bottom: 6px; }
.lmnt-slide__bullets li::marker { color: ${primary}; }
.lmnt-slide__image { width: 100%; height: 100%; object-fit: cover; }
.lmnt-slide__quote { font-size: 1.5rem; font-style: italic; border-left: 4px solid ${primary}; padding-left: 20px; opacity: 0.9; }
.lmnt-slide__caption { font-size: 0.8rem; opacity: 0.55; }
.lmnt-slide__label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: ${primary}; }
[data-lmnt-elem-id] { cursor: pointer; transition: outline 0.1s; }
[data-lmnt-elem-id]:hover { outline: 2px dashed rgba(79,142,247,0.5); outline-offset: 2px; }

/* === CARD BASE === */
.lmnt-card { border-radius: 12px; padding: 16px 20px; background: #fff; }

/* === METRIC CARD === */
.lmnt-metric-card { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
.lmnt-metric-card__label { font-size: 1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
.lmnt-metric-card__description { font-size: 0.85rem; color: #666; line-height: 1.4; }

/* === STAT NUMBER === */
.lmnt-stat-number { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.lmnt-stat-number__value { font-size: 2.8rem; font-weight: 900; color: ${primary}; line-height: 1; }
.lmnt-stat-number__change { font-size: 0.8rem; font-weight: 700; color: #22c55e; background: rgba(34,197,94,0.1); border-radius: 20px; padding: 2px 8px; }
.lmnt-stat-number__label { font-size: 0.75rem; color: #888; text-align: center; }

/* === FEATURE CARD === */
.lmnt-feature-card { display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
.lmnt-feature-card__badge { display: inline-block; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${primary}; background: rgba(196,30,58,0.1); border-radius: 20px; padding: 3px 8px; align-self: flex-start; margin-bottom: 2px; }
.lmnt-feature-card__title { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; }
.lmnt-feature-card__desc { font-size: 0.8rem; color: #666; line-height: 1.4; }

/* === STEP CARD === */
.lmnt-step-card { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
.lmnt-step-card__num { width: 36px; height: 36px; border-radius: 50%; background: ${primary}20; color: ${primary}; font-size: 1.1rem; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lmnt-step-card__title { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
.lmnt-step-card__desc { font-size: 0.82rem; color: #666; line-height: 1.4; }

/* === PRICING CARD === */
.lmnt-pricing-card { display: flex; flex-direction: column; gap: 8px; border: 1.5px solid #e5e7eb; }
.lmnt-pricing-card--popular { background: ${primary}; color: #fff; border-color: ${primary}; }
.lmnt-pricing-card--popular .lmnt-pricing-card__plan,
.lmnt-pricing-card--popular .lmnt-pricing-card__price,
.lmnt-pricing-card--popular .lmnt-pricing-card__feat { color: #fff; }
.lmnt-pricing-card--popular .lmnt-pricing-card__period { color: rgba(255,255,255,0.7); }
.lmnt-pricing-card__badge { display: inline-block; font-size: 0.65rem; font-weight: 700; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 2px 8px; align-self: flex-start; color: #fff; text-transform: uppercase; letter-spacing: 0.06em; }
.lmnt-pricing-card__plan { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; }
.lmnt-pricing-card__price { font-size: 1.8rem; font-weight: 900; color: ${primary}; line-height: 1.1; margin: 4px 0; }
.lmnt-pricing-card__period { font-size: 0.75rem; font-weight: 400; color: #888; }
.lmnt-pricing-card__feats { list-style: none; display: flex; flex-direction: column; gap: 4px; padding: 0; margin-top: 4px; }
.lmnt-pricing-card__feat { font-size: 0.8rem; color: #555; padding-left: 1.2em; position: relative; }
.lmnt-pricing-card__feat::before { content: "✓"; position: absolute; left: 0; color: #22c55e; font-weight: 700; }
.lmnt-pricing-card--popular .lmnt-pricing-card__feat { color: rgba(255,255,255,0.85); }
.lmnt-pricing-card--popular .lmnt-pricing-card__feat::before { color: rgba(255,255,255,0.6); }

/* === TIMELINE COL === */
.lmnt-timeline-col { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px; background: #f8f8f8; border: 1.5px solid #e5e7eb; flex: 1; }
.lmnt-timeline-col--highlighted { background: ${primary}; border-color: ${primary}; }
.lmnt-timeline-col--highlighted .lmnt-timeline-col__period,
.lmnt-timeline-col--highlighted .lmnt-timeline-col__title,
.lmnt-timeline-col--highlighted .lmnt-timeline-col__item { color: #fff; }
.lmnt-timeline-col__period { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${primary}; background: ${primary}15; border-radius: 20px; padding: 3px 10px; align-self: flex-start; }
.lmnt-timeline-col--highlighted .lmnt-timeline-col__period { background: rgba(255,255,255,0.2); color: #fff; }
.lmnt-timeline-col__title { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
.lmnt-timeline-col__items { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.lmnt-timeline-col__item { font-size: 0.78rem; color: #555; padding-left: 12px; position: relative; line-height: 1.4; }
.lmnt-timeline-col__item::before { content: "●"; position: absolute; left: 0; font-size: 0.5em; top: 4px; color: ${primary}; }
.lmnt-timeline-col--highlighted .lmnt-timeline-col__item { color: rgba(255,255,255,0.85); }
.lmnt-timeline-col--highlighted .lmnt-timeline-col__item::before { color: rgba(255,255,255,0.6); }

/* === LAYOUT: ORIGINAL === */
.lmnt-layout-title { justify-content: center; align-items: flex-start; }
.lmnt-layout-title .lmnt-slide__heading { font-size: 3rem; }
.lmnt-layout-section-divider { justify-content: center; align-items: flex-start; }
.lmnt-layout-section-divider .lmnt-slide__heading { font-size: 2.5rem; color: ${primary}; }
.lmnt-layout-two-column { flex-direction: row; gap: 48px; align-items: flex-start; }
.lmnt-layout-image-side { flex-direction: row; gap: 0; padding: 0; }
.lmnt-layout-image-side .lmnt-slide__image { width: 50%; height: 100%; flex-shrink: 0; object-fit: cover; }
.lmnt-layout-quote { justify-content: center; align-items: center; }
.lmnt-layout-quote .lmnt-slide__quote { font-size: 2rem; text-align: center; border-left: none; border-top: 4px solid ${primary}; padding: 24px 0 0; }

/* === LAYOUT: METRICS-CARDS === */
.lmnt-layout-metrics-cards { justify-content: flex-start; gap: 16px; }
.lmnt-layout-metrics-cards__header { display: flex; flex-direction: column; gap: 4px; }
.lmnt-layout-metrics-cards__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-metrics-cards__cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; flex: 1; }
.lmnt-layout-metrics-cards__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

/* === LAYOUT: DARK-SOLUTION === */
.lmnt-layout-dark-solution { justify-content: flex-start; gap: 16px; }
.lmnt-layout-dark-solution__header .lmnt-slide__heading { font-size: 2rem; color: #fff; }
.lmnt-layout-dark-solution__header .lmnt-slide__subheading { color: rgba(255,255,255,0.7); }
.lmnt-layout-dark-solution__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; flex: 1; }
.lmnt-layout-dark-solution__cards .lmnt-feature-card { background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); }
.lmnt-layout-dark-solution__cards .lmnt-feature-card__badge { background: rgba(255,255,255,0.2); color: ${accent}; }
.lmnt-layout-dark-solution__cards .lmnt-feature-card__title { color: #fff; }
.lmnt-layout-dark-solution__cards .lmnt-feature-card__desc { color: rgba(255,255,255,0.65); }

/* === LAYOUT: STEPS-GRID === */
.lmnt-layout-steps-grid { justify-content: flex-start; gap: 16px; }
.lmnt-layout-steps-grid__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-steps-grid__steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; flex: 1; }

/* === LAYOUT: FEATURE-GRID-6 === */
.lmnt-layout-feature-grid-6 { justify-content: flex-start; gap: 12px; }
.lmnt-layout-feature-grid-6__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-feature-grid-6__grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 12px; flex: 1; }
.lmnt-layout-feature-grid-6__grid .lmnt-feature-card { padding: 14px 16px; }

/* === LAYOUT: DARK-METRICS === */
.lmnt-layout-dark-metrics { justify-content: flex-start; gap: 14px; }
.lmnt-layout-dark-metrics__header .lmnt-slide__heading { font-size: 2rem; color: #fff; }
.lmnt-layout-dark-metrics__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lmnt-layout-dark-metrics__stats .lmnt-stat-number__value { color: #fff; }
.lmnt-layout-dark-metrics__stats .lmnt-stat-number__label { color: rgba(255,255,255,0.6); }
.lmnt-layout-dark-metrics__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; }
.lmnt-layout-dark-metrics__cards .lmnt-metric-card { background: rgba(255,255,255,0.08); }
.lmnt-layout-dark-metrics__cards .lmnt-metric-card__label { color: #fff; }
.lmnt-layout-dark-metrics__cards .lmnt-metric-card__description { color: rgba(255,255,255,0.6); }

/* === LAYOUT: PRICING-3COL === */
.lmnt-layout-pricing-3col { justify-content: flex-start; gap: 14px; }
.lmnt-layout-pricing-3col__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-pricing-3col__tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; flex: 1; }
.lmnt-layout-pricing-3col__tiers .lmnt-pricing-card { height: 100%; }

/* === LAYOUT: MARKET-SPLIT === */
.lmnt-layout-market-split { justify-content: flex-start; gap: 14px; }
.lmnt-layout-market-split__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-market-split__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lmnt-layout-market-split__features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; flex: 1; }

/* === LAYOUT: TIMELINE-4COL === */
.lmnt-layout-timeline-4col { justify-content: flex-start; gap: 14px; }
.lmnt-layout-timeline-4col__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-timeline-4col__cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; }

/* === LAYOUT: CTA-SPLIT === */
.lmnt-layout-cta-split { flex-direction: row; align-items: stretch; padding: 0; gap: 0; }
.lmnt-layout-cta-split__left { flex: 1.1; display: flex; flex-direction: column; justify-content: center; padding: 48px 48px; gap: 16px; background: ${primary}; }
.lmnt-layout-cta-split__left .lmnt-slide__heading { font-size: 2.4rem; color: #fff; }
.lmnt-layout-cta-split__left .lmnt-slide__subheading,
.lmnt-layout-cta-split__left .lmnt-slide__body { color: rgba(255,255,255,0.8); }
.lmnt-layout-cta-split__right { flex: 0.9; display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: 48px 40px; background: #fff; }
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

/** Render a single slide as a standalone HTML document (for iframe preview) */
export function renderSingleSlide(graph: SlideGraph, slideIndex: number): string {
  const { meta } = graph;
  const { theme, language } = meta;
  const slide = graph.slides[slideIndex];
  if (!slide) return "<html><body></body></html>";

  const fullHtml = renderSlideGraph({ ...graph, slides: [slide] });
  return fullHtml.replace(
    /<body>/,
    `<body style="padding:0;background:transparent;">`
  ).replace(
    '<div class="lmnt-deck">',
    '<div class="lmnt-deck" style="padding:0;gap:0;">'
  );
}
