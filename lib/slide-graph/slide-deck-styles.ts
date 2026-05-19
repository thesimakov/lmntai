import type { SlideTheme } from "./types";

export type SlideStyleVariant = "deck" | "editor" | "embed" | "react";

const PRESERVE_LINE_BREAKS_CSS = `
.lmnt-slide__heading, .lmnt-slide__subheading, .lmnt-slide__body, .lmnt-slide__quote, .lmnt-slide__caption, .lmnt-slide__label,
.lmnt-slide__bullets li,
.lmnt-metric-card__label, .lmnt-metric-card__description,
.lmnt-feature-card__title, .lmnt-feature-card__desc,
.lmnt-step-card__title, .lmnt-step-card__desc,
.lmnt-pricing-card__plan, .lmnt-pricing-card__feat,
.lmnt-timeline-col__title, .lmnt-timeline-col__item { white-space: pre-wrap; }
`.trim();

/** Layout + component CSS shared by deck export, editor iframe, and slide thumbnails. */
export function buildSlideDeckStyles(
  theme: SlideTheme,
  variant: SlideStyleVariant = "deck"
): string {
  const primary = theme.primaryColor;
  const accent = theme.accentColor ?? "#FF6B8A";

  if (variant === "react") {
    const scopedReset = `.lmnt-canvas-root *, .lmnt-canvas-root *::before, .lmnt-canvas-root *::after { box-sizing: border-box; margin: 0; padding: 0; }`;
    const full = buildSlideDeckStyles(theme, "deck");
    const stripped = full
      .replace(/\*,\s*\*::before,\s*\*::after\s*\{[^}]*\}/g, "")
      .replace(/body\s*\{[^}]*\}/g, "");
    return `${scopedReset}\n${stripped}`;
  }

  const core = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${theme.fontFamily}; color: ${theme.textColor}; }
.lmnt-slide { position: relative; overflow: hidden; cursor: default; background: ${theme.backgroundColor}; }
.lmnt-slide__overlay { position: absolute; inset: 0; z-index: 0; }
.lmnt-slide__content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 40px 56px; gap: 12px; }

.lmnt-slide__heading { font-size: 2.25rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
.lmnt-slide__subheading { font-size: 1.15rem; opacity: 0.75; line-height: 1.5; }
.lmnt-slide__body { font-size: 1.05rem; line-height: 1.7; opacity: 0.88; }
.lmnt-slide__bullets { list-style: none; font-size: 1.05rem; line-height: 1.7; margin-top: 0.25rem; opacity: 0.88; }
.lmnt-slide__bullets li { padding: 0.35rem 0 0.35rem 1.5rem; position: relative; }
.lmnt-slide__bullets li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.85em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${primary};
  transform: translateY(-50%);
}
.lmnt-slide__image { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
.lmnt-slide__quote { font-size: 1.5rem; font-style: italic; border-left: 4px solid ${primary}; padding-left: 20px; opacity: 0.9; }
.lmnt-slide__caption { font-size: 0.8rem; opacity: 0.55; }
.lmnt-slide__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 28px;
  padding: 0 18px;
  box-sizing: border-box;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, ${primary} 38%, #4a6356);
  background: color-mix(in srgb, ${primary} 10%, #e9f3ec);
  border: none;
  border-radius: 9999px;
}
${PRESERVE_LINE_BREAKS_CSS}

.lmnt-card { border-radius: 12px; padding: 16px 20px; background: #fff; }

.lmnt-metric-card { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
.lmnt-metric-card__label { font-size: 1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
.lmnt-metric-card__description { font-size: 0.85rem; color: #666; line-height: 1.4; }

.lmnt-stat-number { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.lmnt-stat-number__value { font-size: 2.8rem; font-weight: 900; color: ${primary}; line-height: 1; }
.lmnt-stat-number__change { font-size: 0.8rem; font-weight: 700; color: #22c55e; background: rgba(34,197,94,0.1); border-radius: 20px; padding: 2px 8px; }
.lmnt-stat-number__label { font-size: 0.75rem; color: #888; text-align: center; }

.lmnt-feature-card { display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
.lmnt-feature-card__badge { display: inline-block; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${primary}; background: color-mix(in srgb, ${primary} 12%, transparent); border-radius: 20px; padding: 3px 8px; align-self: flex-start; margin-bottom: 2px; }
.lmnt-feature-card__title { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; }
.lmnt-feature-card__desc { font-size: 0.8rem; color: #666; line-height: 1.4; }

.lmnt-step-card { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
.lmnt-step-card__num { width: 36px; height: 36px; border-radius: 50%; background: color-mix(in srgb, ${primary} 14%, transparent); color: ${primary}; font-size: 1.1rem; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lmnt-step-card__title { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
.lmnt-step-card__desc { font-size: 0.82rem; color: #666; line-height: 1.4; }

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
.lmnt-pricing-card--popular .lmnt-pricing-card__feat::before { color: rgba(255,255,255,0.6); }

.lmnt-timeline-col { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px; background: #f8f8f8; border: 1.5px solid #e5e7eb; flex: 1; }
.lmnt-timeline-col--highlighted { background: ${primary}; border-color: ${primary}; }
.lmnt-timeline-col--highlighted .lmnt-timeline-col__period,
.lmnt-timeline-col--highlighted .lmnt-timeline-col__title,
.lmnt-timeline-col--highlighted .lmnt-timeline-col__item { color: #fff; }
.lmnt-timeline-col__period { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${primary}; background: color-mix(in srgb, ${primary} 10%, transparent); border-radius: 20px; padding: 3px 10px; align-self: flex-start; }
.lmnt-timeline-col--highlighted .lmnt-timeline-col__period { background: rgba(255,255,255,0.2); color: #fff; }
.lmnt-timeline-col__title { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
.lmnt-timeline-col__items { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.lmnt-timeline-col__item { font-size: 0.78rem; color: #555; padding-left: 12px; position: relative; line-height: 1.4; }
.lmnt-timeline-col__item::before { content: "●"; position: absolute; left: 0; font-size: 0.5em; top: 4px; color: ${primary}; }

.lmnt-layout-title { justify-content: center; align-items: flex-start; position: relative; }
.lmnt-layout-title::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, ${primary}, ${accent});
  z-index: 2;
}
.lmnt-layout-title .lmnt-slide__heading { font-size: 3rem; }
.lmnt-layout-section-divider { justify-content: center; align-items: flex-start; }
.lmnt-layout-section-divider .lmnt-slide__heading { font-size: 2.5rem; color: ${primary}; }
.lmnt-layout-two-column { flex-direction: row; gap: 48px; align-items: flex-start; }
.lmnt-layout-image-side { flex-direction: row; gap: 0; padding: 0; }
.lmnt-layout-image-side .lmnt-slide__image { width: 50%; height: 100%; flex-shrink: 0; object-fit: cover; border-radius: 0; }
.lmnt-layout-quote { justify-content: center; align-items: center; }
.lmnt-layout-quote .lmnt-slide__quote { font-size: 2rem; text-align: center; border-left: none; border-top: 4px solid ${primary}; padding: 24px 0 0; max-width: 40rem; margin: 0 auto; }

.lmnt-layout-metrics-cards { justify-content: flex-start; gap: 16px; }
.lmnt-layout-metrics-cards__header { display: flex; flex-direction: column; gap: 4px; }
.lmnt-layout-metrics-cards__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-metrics-cards__cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; flex: 1; }
.lmnt-layout-metrics-cards__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

.lmnt-layout-dark-solution { justify-content: flex-start; gap: 16px; }
.lmnt-layout-dark-solution__header .lmnt-slide__heading { font-size: 2rem; color: #fff; }
.lmnt-layout-dark-solution__header .lmnt-slide__subheading { color: rgba(255,255,255,0.7); }
.lmnt-layout-dark-solution__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; flex: 1; }
.lmnt-layout-dark-solution__cards .lmnt-feature-card { background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); }
.lmnt-layout-dark-solution__cards .lmnt-feature-card__badge { background: rgba(255,255,255,0.2); color: ${accent}; }
.lmnt-layout-dark-solution__cards .lmnt-feature-card__title { color: #fff; }
.lmnt-layout-dark-solution__cards .lmnt-feature-card__desc { color: rgba(255,255,255,0.65); }

.lmnt-layout-steps-grid { justify-content: flex-start; gap: 16px; }
.lmnt-layout-steps-grid__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-steps-grid__steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; flex: 1; }

.lmnt-layout-feature-grid-6 { justify-content: flex-start; gap: 12px; }
.lmnt-layout-feature-grid-6__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-feature-grid-6__grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 12px; flex: 1; }
.lmnt-layout-feature-grid-6__grid .lmnt-feature-card { padding: 14px 16px; }

.lmnt-layout-dark-metrics { justify-content: flex-start; gap: 14px; }
.lmnt-layout-dark-metrics__header .lmnt-slide__heading { font-size: 2rem; color: #fff; }
.lmnt-layout-dark-metrics__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lmnt-layout-dark-metrics__stats .lmnt-stat-number__value { color: #fff; }
.lmnt-layout-dark-metrics__stats .lmnt-stat-number__label { color: rgba(255,255,255,0.6); }
.lmnt-layout-dark-metrics__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; }
.lmnt-layout-dark-metrics__cards .lmnt-metric-card { background: rgba(255,255,255,0.08); }
.lmnt-layout-dark-metrics__cards .lmnt-metric-card__label { color: #fff; }
.lmnt-layout-dark-metrics__cards .lmnt-metric-card__description { color: rgba(255,255,255,0.6); }

.lmnt-layout-pricing-3col { justify-content: flex-start; gap: 14px; }
.lmnt-layout-pricing-3col__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-pricing-3col__tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; flex: 1; }
.lmnt-layout-pricing-3col__tiers .lmnt-pricing-card { height: 100%; }

.lmnt-layout-market-split { justify-content: flex-start; gap: 14px; }
.lmnt-layout-market-split__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-market-split__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lmnt-layout-market-split__features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; flex: 1; }

.lmnt-layout-timeline-4col { justify-content: flex-start; gap: 14px; }
.lmnt-layout-timeline-4col__header .lmnt-slide__heading { font-size: 2rem; }
.lmnt-layout-timeline-4col__cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; }

.lmnt-layout-cta-split { flex-direction: row; align-items: stretch; padding: 0; gap: 0; }
.lmnt-layout-cta-split__left { flex: 1.1; display: flex; flex-direction: column; justify-content: center; padding: 48px 48px; gap: 16px; background: ${primary}; }
.lmnt-layout-cta-split__left .lmnt-slide__heading { font-size: 2.4rem; color: #fff; }
.lmnt-layout-cta-split__left .lmnt-slide__subheading,
.lmnt-layout-cta-split__left .lmnt-slide__body { color: rgba(255,255,255,0.8); }
.lmnt-layout-cta-split__right { flex: 0.9; display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: 48px 40px; background: #fff; }

.lmnt-elem-frame { position: absolute; box-sizing: border-box; overflow: hidden; }
.lmnt-elem-frame__inner {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lmnt-elem-frame [data-lmnt-elem-id] {
  width: 100%;
  max-width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-break: break-word;
  overflow: hidden;
}
.lmnt-elem-frame .lmnt-slide__label { display: inline-flex; }
.lmnt-elem-frame .lmnt-slide__image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
.lmnt-elem-frame .lmnt-slide__bullets {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding-left: 1.25em;
  list-style-position: outside;
}
.lmnt-elem-frame .lmnt-card,
.lmnt-elem-frame .lmnt-metric-card,
.lmnt-elem-frame .lmnt-feature-card,
.lmnt-elem-frame .lmnt-pricing-card { height: 100%; width: 100%; }
`.trim();

  const editorExtras =
    variant === "editor"
      ? `
[data-lmnt-elem-id] { cursor: pointer; transition: outline 0.1s; }
[data-lmnt-elem-id]:hover { outline: 2px dashed rgba(79,142,247,0.5); outline-offset: 2px; }
.lmnt-slide.lmnt-slide--show-grid::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px),
    linear-gradient(to right, color-mix(in srgb, ${primary} 14%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, ${primary} 14%, transparent) 1px, transparent 1px);
  background-size: 40px 40px, 40px 40px, 80px 80px, 80px 80px;
}
.lmnt-slide.lmnt-slide--show-grid::after {
  content: "";
  position: absolute;
  inset: 40px 56px 40px 56px;
  z-index: 0;
  pointer-events: none;
  border: 1px dashed color-mix(in srgb, ${primary} 32%, transparent);
  border-radius: 4px;
}
`
      : variant === "deck"
        ? `
[data-lmnt-elem-id] { cursor: pointer; transition: outline 0.1s; }
[data-lmnt-elem-id]:hover { outline: 2px dashed rgba(79,142,247,0.5); outline-offset: 2px; }
`
        : "";

  const shell =
    variant === "deck"
      ? `
html, body { height: 100%; background: #111; }
body { padding: 32px 0; }
.lmnt-deck { display: flex; flex-direction: column; align-items: center; gap: 24px; }
.lmnt-slide { width: 960px; aspect-ratio: 16/9; border-radius: 8px; box-shadow: 0 8px 40px rgba(0,0,0,0.5); }
`
      : variant === "editor"
        ? `
html, body { height: 100%; background: #16161d; margin: 0; }
body { padding: 0; }
.lmnt-deck { display: flex; align-items: center; justify-content: center; min-height: 100%; width: 100%; }
.lmnt-slide { width: 960px; height: 540px; border-radius: 12px; box-shadow: 0 16px 56px rgba(0,0,0,0.45); }
`
        : `
html, body { width: 960px; height: 540px; overflow: hidden; }
.lmnt-slide { width: 960px; height: 540px; }
`;

  return [core, shell, editorExtras].filter(Boolean).join("\n");
}
