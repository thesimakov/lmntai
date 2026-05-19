import type { ComponentGraph, ComponentNode, ComponentPage, StyleTokens } from "./types";

const GOOGLE_FONTS: Record<string, string> = {
  "Inter":             "Inter:wght@400;500;600;700",
  "Plus Jakarta Sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
  "Manrope":           "Manrope:wght@400;500;600;700",
  "Nunito":            "Nunito:wght@400;500;600;700",
  "Roboto":            "Roboto:wght@400;500;600;700",
  "Poppins":           "Poppins:wght@400;500;600;700",
  "Montserrat":        "Montserrat:wght@400;500;600;700",
  "DM Sans":           "DM+Sans:wght@400;500;600;700",
  "Geist":             "Geist:wght@400;500;600;700",
};

function googleFontLink(fontFamily: string): string {
  const name = fontFamily.split(",")[0].trim().replace(/['"]/g, "");
  const slug = GOOGLE_FONTS[name];
  if (!slug) return "";
  return [
    `<link rel="preconnect" href="https://fonts.googleapis.com" />`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
    `<link href="https://fonts.googleapis.com/css2?family=${slug}&display=swap" rel="stylesheet" />`,
  ].join("\n");
}

function sanitizeCssValue(v: string): string {
  return v.replace(/[{};]/g, "");
}

function stylesToCss(styles: StyleTokens): string {
  const map: Record<string, string | number | undefined> = {
    width: styles.width,
    height: styles.height,
    "min-height": styles.minHeight,
    padding: styles.padding,
    margin: styles.margin,
    display: styles.display,
    "flex-direction": styles.flexDirection,
    "flex-wrap": styles.flexWrap,
    gap: styles.gap,
    "align-items": styles.alignItems,
    "justify-content": styles.justifyContent,
    "background-color": styles.backgroundColor,
    "background-image": styles.backgroundImage
      ? `url('${styles.backgroundImage}')`
      : undefined,
    "background-size": styles.backgroundSize,
    color: styles.color,
    "border-radius": styles.borderRadius,
    border: styles.border,
    "box-shadow": styles.boxShadow,
    opacity: styles.opacity,
    overflow: styles.overflow,
    "font-size": styles.fontSize,
    "font-weight":
      styles.fontWeight === "medium"
        ? "500"
        : styles.fontWeight === "semibold"
        ? "600"
        : styles.fontWeight === "bold"
        ? "700"
        : styles.fontWeight,
    "line-height": styles.lineHeight,
    "text-align": styles.textAlign,
    "letter-spacing": styles.letterSpacing,
    "text-transform": styles.textTransform,
  };
  if (styles.gridColumns) {
    map["grid-template-columns"] = `repeat(${styles.gridColumns}, 1fr)`;
  }
  if (styles.paddingX) {
    map["padding-left"] = styles.paddingX;
    map["padding-right"] = styles.paddingX;
  }
  if (styles.paddingY) {
    map["padding-top"] = styles.paddingY;
    map["padding-bottom"] = styles.paddingY;
  }
  return Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function attr(styles: StyleTokens): string {
  const css = stylesToCss(styles);
  return css ? ` style="${css}"` : "";
}

function esc(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChildren(children?: ComponentNode[]): string {
  if (!children?.length) return "";
  return children.map(renderNode).join("\n");
}

export function renderNode(node: ComponentNode): string {
  let html = renderNodeInner(node);
  // Add data-lmnt-node-id attribute
  html = html.replace(/^(<[a-zA-Z][a-zA-Z0-9-]*)(\s|>)/, `$1 data-lmnt-node-id="${node.id}"$2`);
  // Inject animation CSS
  if (node.animation) {
    const { type, delay = 0, duration = 0.6 } = node.animation;
    const animCss = `animation:lmnt-${type} ${duration}s ease both ${delay}s`;
    if (html.includes(' style="')) {
      html = html.replace(' style="', ` style="${animCss};`);
    } else {
      html = html.replace(
        /^(<[a-zA-Z][a-zA-Z0-9-]* [^>]*)>/,
        `$1 style="${animCss}">`
      );
    }
  }
  return html;
}

function renderNodeInner(node: ComponentNode): string {
  const { type, props, styles, children } = node;
  const style = attr(styles);

  switch (type) {
    case "Hero": {
      const title = esc(props.title as string ?? "");
      const subtitle = esc(props.subtitle as string ?? "");
      const ctaText = esc(props.ctaText as string ?? "");
      const ctaHref = esc(props.ctaHref as string ?? "#");
      return `<section class="lmnt-hero"${style}>
  <div class="lmnt-container">
    <h1 class="lmnt-hero__title">${title}</h1>
    ${subtitle ? `<p class="lmnt-hero__subtitle">${subtitle}</p>` : ""}
    ${ctaText ? `<a href="${ctaHref}" class="lmnt-btn lmnt-btn--primary">${ctaText}</a>` : ""}
  </div>
  ${renderChildren(children)}
</section>`;
    }

    case "Features": {
      const items =
        (props.items as Array<{ icon?: string; title?: string; description?: string }>) ?? [];
      const itemsHtml = items
        .map(
          (item) =>
            `<div class="lmnt-feature-card">
  ${item.icon ? `<div class="lmnt-feature-card__icon">${esc(item.icon)}</div>` : ""}
  ${item.title ? `<h3 class="lmnt-feature-card__title">${esc(item.title)}</h3>` : ""}
  ${item.description ? `<p class="lmnt-feature-card__desc">${esc(item.description)}</p>` : ""}
</div>`
        )
        .join("\n");
      return `<section class="lmnt-features"${style}><div class="lmnt-container"><div class="lmnt-features__grid">${itemsHtml}</div>${renderChildren(children)}</div></section>`;
    }

    case "Pricing": {
      const plans =
        (props.plans as Array<{
          name?: string;
          price?: string;
          features?: string[];
          ctaText?: string;
          ctaHref?: string;
        }>) ?? [];
      const plansHtml = plans
        .map(
          (p) =>
            `<div class="lmnt-pricing-card">
  ${p.name ? `<h3>${esc(p.name)}</h3>` : ""}
  ${p.price ? `<div class="lmnt-pricing-card__price">${esc(p.price)}</div>` : ""}
  ${p.features?.length ? `<ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
  ${p.ctaText ? `<a href="${esc(p.ctaHref ?? "#")}" class="lmnt-btn lmnt-btn--primary">${esc(p.ctaText)}</a>` : ""}
</div>`
        )
        .join("\n");
      return `<section class="lmnt-pricing"${style}><div class="lmnt-container"><div class="lmnt-pricing__grid">${plansHtml}</div></div></section>`;
    }

    case "Testimonials": {
      const items =
        (props.items as Array<{ quote?: string; author?: string; role?: string }>) ?? [];
      const html = items
        .map(
          (t) =>
            `<blockquote class="lmnt-testimonial">
  ${t.quote ? `<p>${esc(t.quote)}</p>` : ""}
  ${t.author ? `<cite>${esc(t.author)}${t.role ? `, ${esc(t.role)}` : ""}</cite>` : ""}
</blockquote>`
        )
        .join("\n");
      return `<section class="lmnt-testimonials"${style}><div class="lmnt-container">${html}</div></section>`;
    }

    case "FAQ": {
      const items =
        (props.items as Array<{ question?: string; answer?: string }>) ?? [];
      const html = items
        .map(
          (q) =>
            `<details class="lmnt-faq-item">
  <summary>${esc(q.question ?? "")}</summary>
  <p>${esc(q.answer ?? "")}</p>
</details>`
        )
        .join("\n");
      return `<section class="lmnt-faq"${style}><div class="lmnt-container">${html}</div></section>`;
    }

    case "CTA": {
      return `<section class="lmnt-cta"${style}>
  <div class="lmnt-container">
    ${props.title ? `<h2>${esc(props.title as string)}</h2>` : ""}
    ${props.subtitle ? `<p>${esc(props.subtitle as string)}</p>` : ""}
    ${props.ctaText ? `<a href="${esc(props.ctaHref as string ?? "#")}" class="lmnt-btn lmnt-btn--primary">${esc(props.ctaText as string)}</a>` : ""}
    ${renderChildren(children)}
  </div>
</section>`;
    }

    case "Header":
    case "Nav": {
      const logo = esc(props.logo as string ?? "");
      const links = (props.links as Array<{ text?: string; href?: string }>) ?? [];
      const linksHtml = links
        .map((l) => `<a href="${esc(l.href ?? "#")}">${esc(l.text ?? "")}</a>`)
        .join("\n");
      return `<header class="lmnt-header"${style}>
  <div class="lmnt-container lmnt-header__inner">
    ${logo ? `<a class="lmnt-header__logo" href="/">${logo}</a>` : ""}
    <nav class="lmnt-header__nav">${linksHtml}</nav>
    ${renderChildren(children)}
  </div>
</header>`;
    }

    case "Footer": {
      const copy = esc(props.copyright as string ?? "");
      const links = (props.links as Array<{ text?: string; href?: string }>) ?? [];
      const linksHtml = links
        .map((l) => `<a href="${esc(l.href ?? "#")}">${esc(l.text ?? "")}</a>`)
        .join(" · ");
      return `<footer class="lmnt-footer"${style}>
  <div class="lmnt-container">
    ${linksHtml ? `<nav class="lmnt-footer__links">${linksHtml}</nav>` : ""}
    ${copy ? `<p class="lmnt-footer__copy">${copy}</p>` : ""}
    ${renderChildren(children)}
  </div>
</footer>`;
    }

    case "Heading": {
      const level = Math.min(Math.max(Number(props.level ?? 2), 1), 6);
      const content = esc(props.content as string ?? "");
      return `<h${level}${style}>${content}${renderChildren(children)}</h${level}>`;
    }

    case "Text": {
      return `<p${style}>${esc(props.content as string ?? "")}${renderChildren(children)}</p>`;
    }

    case "Button":
    case "Link": {
      const href = esc(props.href as string ?? "#");
      const text = esc(props.text as string ?? "");
      const variant =
        props.variant === "outline"
          ? "lmnt-btn--outline"
          : props.variant === "secondary"
          ? "lmnt-btn--secondary"
          : "lmnt-btn--primary";
      return `<a href="${href}" class="lmnt-btn ${variant}"${style}>${text}</a>`;
    }

    case "Image": {
      const src = esc(props.src as string ?? "");
      const alt = esc(props.alt as string ?? "");
      return `<img src="${src}" alt="${alt}" loading="lazy"${style} />`;
    }

    case "Card": {
      return `<div class="lmnt-card"${style}>
  ${props.image ? `<img src="${esc(props.image as string)}" alt="${esc(props.title as string ?? "")}" class="lmnt-card__image" />` : ""}
  ${props.title ? `<h3 class="lmnt-card__title">${esc(props.title as string)}</h3>` : ""}
  ${props.description ? `<p class="lmnt-card__desc">${esc(props.description as string)}</p>` : ""}
  ${renderChildren(children)}
</div>`;
    }

    case "Divider": {
      return `<hr${style} />`;
    }

    case "Spacer": {
      const h = (props.height as string) ?? styles.height ?? "40px";
      return `<div${attr({ ...styles, height: h })} aria-hidden="true"></div>`;
    }

    case "Grid": {
      const cols = styles.gridColumns ?? (props.columns as number) ?? 3;
      return `<div class="lmnt-grid"${attr({ ...styles, display: "grid", gridColumns: cols })}>${renderChildren(children)}</div>`;
    }

    case "Row": {
      return `<div class="lmnt-row"${attr({ ...styles, display: "flex", flexWrap: styles.flexWrap ?? "wrap" })}>${renderChildren(children)}</div>`;
    }

    case "Column": {
      return `<div class="lmnt-col"${style}>${renderChildren(children)}</div>`;
    }

    case "Container": {
      return `<div class="lmnt-container"${style}>${renderChildren(children)}</div>`;
    }

    case "Section":
    default: {
      return `<section${style}>${renderChildren(children)}</section>`;
    }
  }
}

function collectResponsiveCssNode(node: ComponentNode, acc: string[]): void {
  const { responsiveStyles } = node;
  if (responsiveStyles?.tablet) {
    const css = stylesToCss(responsiveStyles.tablet as StyleTokens);
    if (css) acc.push(`@media (max-width:1024px){[data-lmnt-node-id="${node.id}"]{${css}}}`);
  }
  if (responsiveStyles?.mobile) {
    const css = stylesToCss(responsiveStyles.mobile as StyleTokens);
    if (css) acc.push(`@media (max-width:768px){[data-lmnt-node-id="${node.id}"]{${css}}}`);
  }
  node.children?.forEach(c => collectResponsiveCssNode(c, acc));
}

function collectResponsiveCss(pages: ComponentPage[]): string {
  const acc: string[] = [];
  pages.forEach(p => p.nodes.forEach(n => collectResponsiveCssNode(n, acc)));
  return acc.join("\n");
}

function renderPage(nodes: ComponentNode[]): string {
  return nodes.map(renderNode).join("\n");
}

const CLICK_HANDLER_SCRIPT = `<script>(function(){var sel=null;document.addEventListener('click',function(e){var el=e.target;while(el&&el!==document.body){if(el.dataset&&el.dataset.lmntNodeId){e.preventDefault();if(sel){sel.style.outline='';sel.style.outlineOffset='';}sel=el;el.style.outline='2px solid #4F8EF7';el.style.outlineOffset='2px';window.parent.postMessage({type:'lmnt-node-selected',nodeId:el.dataset.lmntNodeId},'*');return;}el=el.parentElement;}if(sel){sel.style.outline='';sel.style.outlineOffset='';sel=null;}window.parent.postMessage({type:'lmnt-node-deselected'},'*');});})();<\/script>`;

const MULTI_PAGE_NAV_SCRIPT = `<script>(function(){function show(s){document.querySelectorAll('.lmnt-page').forEach(function(p){p.style.display='none';});var t=document.getElementById('lmnt-page-'+s);if(t){t.style.display='';}else{var f=document.querySelector('.lmnt-page');if(f)f.style.display='';}}function slug(){return location.hash.replace(/^#/,'');}document.addEventListener('click',function(e){var a=e.target;while(a&&a.tagName!=='A'){a=a.parentElement;}if(!a)return;var h=a.getAttribute('href')||'';if(h.charAt(0)==='/'&&h.charAt(1)!=='/'){var s=h.slice(1).split('/')[0]||'index';if(document.getElementById('lmnt-page-'+s)){e.preventDefault();show(s);history.pushState(null,'','#'+s);return;}}if(h.charAt(0)==='#'){var s=h.slice(1);if(document.getElementById('lmnt-page-'+s)){e.preventDefault();show(s);return;}}});window.addEventListener('hashchange',function(){var s=slug();if(s)show(s);});var init=slug();if(init)show(init);}());<\/script>`;

export function renderComponentGraph(graph: ComponentGraph): string {
  const { meta, pages } = graph;
  const { theme, language } = meta;
  const firstPage = pages[0];
  const multiPage = pages.length > 1;

  const primary = sanitizeCssValue(theme.primaryColor);
  const accent = sanitizeCssValue(theme.accentColor ?? theme.primaryColor);
  const bg = sanitizeCssValue(theme.backgroundColor);
  const text = sanitizeCssValue(theme.textColor);
  const radius = sanitizeCssValue(theme.borderRadius);
  const maxW = sanitizeCssValue(theme.maxWidth);

  const cssVars = `:root{--c-primary:${primary};--c-accent:${accent};--c-bg:${bg};--c-text:${text};--radius:${radius};--max-w:${maxW};}`;

  const baseStyles = `
html{scroll-behavior:smooth;}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${theme.fontFamily}; background-color: var(--c-bg); color: var(--c-text); line-height: 1.6; }
.lmnt-container { max-width: var(--max-w); margin: 0 auto; padding: 0 24px; }
.lmnt-btn{display:inline-block;padding:12px 28px;border-radius:var(--radius);text-decoration:none;font-weight:600;cursor:pointer;transition:opacity 0.18s,transform 0.18s;letter-spacing:0.01em;}
.lmnt-btn:hover{opacity:0.85;transform:translateY(-1px);}
.lmnt-btn:active{transform:translateY(0);}
.lmnt-btn--primary{background-color:var(--c-primary);color:#fff;}
.lmnt-btn--secondary{background-color:transparent;color:var(--c-primary);border:2px solid var(--c-primary);}
.lmnt-btn--outline{background-color:transparent;color:var(--c-text);border:2px solid currentColor;}
.lmnt-hero { padding: 80px 24px; text-align: center; }
.lmnt-hero__title{font-size:clamp(2rem,5vw,3.5rem);font-weight:700;margin-bottom:16px;}
.lmnt-hero__subtitle { font-size: 1.25rem; margin-bottom: 32px; opacity: 0.8; }
.lmnt-header{padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.08);position:sticky;top:0;background:var(--c-bg);z-index:100;backdrop-filter:saturate(1.8) blur(12px);-webkit-backdrop-filter:saturate(1.8) blur(12px);}
.lmnt-header__inner { display: flex; align-items: center; justify-content: space-between; }
.lmnt-header__logo { font-size: 1.25rem; font-weight: 700; text-decoration: none; color: var(--c-text); }
.lmnt-header__nav { display: flex; gap: 24px; }
.lmnt-header__nav a { text-decoration: none; color: var(--c-text); opacity: 0.75; font-weight: 500; transition: opacity 0.15s; }
.lmnt-header__nav a:hover { opacity: 1; }
.lmnt-features { padding: 80px 0; }
.lmnt-features__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 32px; }
.lmnt-feature-card{padding:28px;border-radius:var(--radius);border:1px solid rgba(0,0,0,0.08);box-shadow:0 2px 16px rgba(0,0,0,0.05);transition:box-shadow 0.2s,transform 0.2s;}
.lmnt-feature-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.1);}
.lmnt-feature-card__icon { font-size: 2rem; margin-bottom: 12px; }
.lmnt-feature-card__title { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; }
.lmnt-pricing { padding: 80px 0; }
.lmnt-pricing__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
.lmnt-pricing-card { padding: 32px; border-radius: var(--radius); border: 2px solid rgba(0,0,0,0.1); text-align: center; }
.lmnt-pricing-card__price { font-size: 2.5rem; font-weight: 700; color: var(--c-primary); margin: 16px 0; }
.lmnt-pricing-card ul { list-style: none; margin: 16px 0 24px; text-align: left; }
.lmnt-pricing-card ul li { padding: 4px 0; }
.lmnt-pricing-card ul li::before { content: "✓ "; color: var(--c-primary); }
.lmnt-testimonials { padding: 80px 0; }
.lmnt-testimonial { padding: 24px; border-left: 4px solid var(--c-primary); margin-bottom: 24px; }
.lmnt-testimonial p { font-size: 1.1rem; font-style: italic; margin-bottom: 12px; }
.lmnt-testimonial cite { font-weight: 600; font-style: normal; }
.lmnt-faq { padding: 80px 0; }
.lmnt-faq-item { border-bottom: 1px solid rgba(0,0,0,0.1); padding: 16px 0; }
.lmnt-faq-item summary { font-weight: 600; cursor: pointer; list-style: none; }
.lmnt-faq-item p { margin-top: 12px; opacity: 0.8; }
.lmnt-cta{padding:80px 0;text-align:center;background-color:var(--c-bg);background-color:color-mix(in srgb,var(--c-primary) 15%,transparent);}
.lmnt-cta h2 { font-size: 2rem; font-weight: 700; margin-bottom: 16px; }
.lmnt-cta p { font-size: 1.1rem; margin-bottom: 32px; }
.lmnt-footer { padding: 40px 0; border-top: 1px solid rgba(0,0,0,0.08); text-align: center; }
.lmnt-footer__links { margin-bottom: 16px; }
.lmnt-footer__links a { text-decoration: none; color: var(--c-text); opacity: 0.7; }
.lmnt-footer__copy { opacity: 0.5; font-size: 0.875rem; }
.lmnt-card{border-radius:var(--radius);overflow:hidden;border:1px solid rgba(0,0,0,0.08);box-shadow:0 2px 16px rgba(0,0,0,0.05);transition:box-shadow 0.2s,transform 0.2s;}
.lmnt-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.1);}
.lmnt-card__image { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
.lmnt-card__title { font-size: 1.1rem; font-weight: 600; padding: 16px 16px 8px; }
.lmnt-card__desc { padding: 0 16px 16px; opacity: 0.75; }
.lmnt-grid { display: grid; gap: 24px; }
.lmnt-row { display: flex; gap: 16px; flex-wrap: wrap; }
@media (max-width: 768px) {
  .lmnt-hero__title { font-size: 2rem; }
  .lmnt-header__nav { display: none; }
}
@keyframes lmnt-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes lmnt-slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes lmnt-slideLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
@keyframes lmnt-zoom{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
`.trim();

  const fullStyles = [cssVars, baseStyles].join("\n");
  const responsiveCss = collectResponsiveCss(pages);
  const fontLinks = googleFontLink(theme.fontFamily);

  const bodyContent = multiPage
    ? pages
        .map((page, i) =>
          `<div id="lmnt-page-${page.slug}" class="lmnt-page"${i > 0 ? ' style="display:none"' : ""}>\n${renderPage(page.nodes)}\n</div>`
        )
        .join("\n")
    : renderPage(firstPage.nodes);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(firstPage.title)}</title>
${firstPage.description ? `<meta name="description" content="${esc(firstPage.description)}" />` : ""}
${fontLinks ? fontLinks + "\n" : ""}<style>${fullStyles}\n${responsiveCss}</style>
</head>
<body>
${bodyContent}
${CLICK_HANDLER_SCRIPT}
${multiPage ? MULTI_PAGE_NAV_SCRIPT : ""}
</body>
</html>`;
}
