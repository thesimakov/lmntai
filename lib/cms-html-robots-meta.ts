/**
 * Директивы индексации/обхода ссылок для опубликованного HTML превью CMS.
 * @see https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
 */

function escapeHtmlAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Значение для meta name="robots" и HTTP X-Robots-Tag, или null если ограничений нет */
export function cmsRobotsDirectiveValue(
  noIndex?: boolean | null,
  seoNoFollow?: boolean | null,
): string | null {
  const ni = Boolean(noIndex);
  const nf = Boolean(seoNoFollow);
  if (!ni && !nf) return null;
  const parts = [...(ni ? ["noindex"] : []), ...(nf ? ["nofollow"] : [])];
  return parts.join(", ");
}

/** Одна строка `<meta … />` или пустая строка */
export function cmsRobotsMetaTag(noIndex?: boolean | null, seoNoFollow?: boolean | null): string {
  const v = cmsRobotsDirectiveValue(noIndex, seoNoFollow);
  if (!v) return "";
  return `<meta name="robots" content="${escapeHtmlAttr(v)}" data-lemnity-cms-robots="1" />\n`;
}

const LEMNITY_ROBOTS_META_RE = /<meta\b[^>]*\bdata-lemnity-cms-robots\s*=\s*["']?1["']?[^>]*>\s*/gi;

/** Убираем прежнюю нашу метку и при необходимости вставляем актуальную перед </head>. */
export function injectCmsRobotsMetaIntoHtmlDocument(
  html: string,
  opts: { noIndex?: boolean | null; noFollow?: boolean | null },
): string {
  const out = html.replace(LEMNITY_ROBOTS_META_RE, "");
  const tag = cmsRobotsMetaTag(opts.noIndex, opts.noFollow).trimEnd();
  if (!tag) return out;

  const headClose = /<\/head>/i;
  if (headClose.test(out)) {
    return out.replace(headClose, `  ${tag}\n</head>`);
  }
  return `${tag}\n${out}`;
}
