import type { SlideLayout, SlideTheme } from "./types";

export interface SlideStructureHint {
  layout: SlideLayout;
  purpose: string;
  elementHints: string;
}

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  slideCount: number;
  slideStructure: SlideStructureHint[];
  theme: SlideTheme;
  systemPromptAddition: string;
}

const PITCH_DECK_STRUCTURE: SlideStructureHint[] = [
  {
    layout: "title",
    purpose: "Title slide — company name, tagline, type label",
    elementHints: 'heading (company name), label (industry tag, e.g. "DATING SAAS PLATFORM"), subheading (tagline), body (subtitle/year)',
  },
  {
    layout: "metrics-cards",
    purpose: "Problem slide — 3 problem metric-cards + 3 stat-numbers",
    elementHints: 'heading, subheading (optional), then 3 metric-card elements (label = problem title, description = explanation), then 3 stat-number elements (value = big number, change = optional percent badge, label = context)',
  },
  {
    layout: "dark-solution",
    purpose: "Solution slide — on colored background, 4 feature-cards",
    elementHints: 'heading, subheading (subtitle), then 4 feature-card elements (badge = category tag, content = feature title, description = explanation). Background color = primaryColor.',
  },
  {
    layout: "steps-grid",
    purpose: "How it works — 4 step-cards with numbered steps",
    elementHints: 'heading, then 4 step-card elements (stepNumber = 1..4, content = step title, description = explanation)',
  },
  {
    layout: "feature-grid-6",
    purpose: "Features slide — 6 feature-cards in 2x3 grid",
    elementHints: 'heading, then 6 feature-card elements (badge = category like CORE/AI/PREMIUM/COMING SOON, content = feature name, description = short text)',
  },
  {
    layout: "dark-metrics",
    purpose: "Growth metrics — dark background, 3 big stats + 4 small metric-cards",
    elementHints: 'heading, then 3 stat-number elements (value = big number with K/M/%, change = growth badge, label = metric name), then 4 metric-card elements (value = number, label = metric name, description = context). Background = dark (#1A1A2E).',
  },
  {
    layout: "pricing-3col",
    purpose: "Pricing slide — 3 pricing-card tiers",
    elementHints: 'heading, subheading (model description), then 3 pricing-card elements (planName = tier name, price = amount, period = billing period, features = array of 4-5 features, popular = true for middle tier)',
  },
  {
    layout: "market-split",
    purpose: "Market opportunity — 3 stat-numbers (TAM/SAM/SOM) + 3 feature-cards",
    elementHints: 'heading, then 3 stat-number elements (value = market size, label = market type), then 3 feature-card elements (content = trend title, description = explanation)',
  },
  {
    layout: "timeline-4col",
    purpose: "Roadmap — 4 timeline-col quarters",
    elementHints: 'heading, then 4 timeline-col elements (period = quarter label like "Q2 2026", content = phase title, items = array of 3-4 milestones, highlighted = true for current quarter)',
  },
  {
    layout: "cta-split",
    purpose: "CTA / Contact slide — left colored panel + right summary card",
    elementHints: 'heading (bold CTA text), subheading (call to action), body (email/contact), then 1-2 metric-card elements for the right panel (investment round info, fund usage)',
  },
];

const PRODUCT_DEMO_STRUCTURE: SlideStructureHint[] = [
  {
    layout: "title",
    purpose: "Title slide — product name and tagline",
    elementHints: 'heading (product name), label (product type), subheading (tagline)',
  },
  {
    layout: "content",
    purpose: "Product overview — what it is and who it is for",
    elementHints: 'heading, subheading, bullet-list (3-4 key points)',
  },
  {
    layout: "feature-grid-6",
    purpose: "Key features — 6 feature-cards",
    elementHints: 'heading, 6 feature-card elements (badge = category, content = feature name, description = benefit)',
  },
  {
    layout: "steps-grid",
    purpose: "How it works — 4 step-cards",
    elementHints: 'heading, 4 step-card elements (stepNumber 1-4, content = step, description = detail)',
  },
  {
    layout: "pricing-3col",
    purpose: "Pricing — 3 tiers",
    elementHints: 'heading, 3 pricing-card elements',
  },
  {
    layout: "cta-split",
    purpose: "Get started CTA",
    elementHints: 'heading, subheading, body (contact/link)',
  },
];

const REPORT_STRUCTURE: SlideStructureHint[] = [
  {
    layout: "title",
    purpose: "Report title slide",
    elementHints: 'heading (report title), label (department/period), subheading (summary)',
  },
  {
    layout: "metrics-cards",
    purpose: "Executive summary — 3 key metrics + 3 stats",
    elementHints: '3 metric-card elements (key results), 3 stat-number elements (main KPIs)',
  },
  {
    layout: "content",
    purpose: "Data analysis section",
    elementHints: 'heading, body, bullet-list (findings)',
  },
  {
    layout: "dark-metrics",
    purpose: "Performance data — detailed metrics",
    elementHints: 'heading, 3 stat-number (top metrics), 4 metric-card (breakdowns)',
  },
  {
    layout: "content",
    purpose: "Conclusions and recommendations",
    elementHints: 'heading, bullet-list (recommendations)',
  },
];

const PITCH_THEME: SlideTheme = {
  primaryColor: "#C41E3A",
  accentColor: "#FF6B8A",
  backgroundColor: "#FFF5F7",
  textColor: "#1A1A2E",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const BLUE_THEME: SlideTheme = {
  primaryColor: "#2563EB",
  accentColor: "#60A5FA",
  backgroundColor: "#F0F6FF",
  textColor: "#0F172A",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const DARK_THEME: SlideTheme = {
  primaryColor: "#6366F1",
  accentColor: "#A5B4FC",
  backgroundColor: "#0F0F1A",
  textColor: "#F8FAFC",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

export const PRESENTATION_TEMPLATES: PresentationTemplate[] = [
  {
    id: "pitch-deck",
    name: "Инвестиционная презентация",
    description: "Питч-дек для инвесторов: проблема, решение, метрики, монетизация, роадмап",
    thumbnail: "📊",
    slideCount: 10,
    slideStructure: PITCH_DECK_STRUCTURE,
    theme: PITCH_THEME,
    systemPromptAddition: `This is an INVESTOR PITCH DECK. Use crimson/red color theme (primaryColor: "#C41E3A").
Make slides visually impactful: bold numbers, clear value proposition, credible metrics.
The dark-solution slide MUST use background color "#C41E3A".
The dark-metrics slide MUST use background color "#1A1A2E".`,
  },
  {
    id: "product-demo",
    name: "Презентация продукта",
    description: "Демо продукта: обзор, фичи, как работает, тарифы, CTA",
    thumbnail: "🚀",
    slideCount: 6,
    slideStructure: PRODUCT_DEMO_STRUCTURE,
    theme: BLUE_THEME,
    systemPromptAddition: `This is a PRODUCT DEMO presentation. Use blue theme (primaryColor: "#2563EB").
Focus on user benefits, clear feature descriptions, and simple pricing.`,
  },
  {
    id: "report",
    name: "Бизнес-отчёт",
    description: "Структурированный отчёт: результаты, метрики, анализ, выводы",
    thumbnail: "📈",
    slideCount: 5,
    slideStructure: REPORT_STRUCTURE,
    theme: DARK_THEME,
    systemPromptAddition: `This is a BUSINESS REPORT. Use dark/purple theme (primaryColor: "#6366F1", backgroundColor: "#0F0F1A", textColor: "#F8FAFC").
Be data-focused with specific numbers and actionable insights.`,
  },
];

export function getTemplate(id: string): PresentationTemplate | undefined {
  return PRESENTATION_TEMPLATES.find((t) => t.id === id);
}
