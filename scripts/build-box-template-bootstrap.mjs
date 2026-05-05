/**
 * Собирает grapes-bootstrap.json из зеркала в public/box-templates/<slug>/:
 * тело <body> с абсолютными путями + склейка CSS (inline <style> по всему документу + локальные link stylesheet)
 * с url() под /box-templates/<slug>/…
 *
 * Запуск: node scripts/build-box-template-bootstrap.mjs [slug]
 * По умолчанию slug=wpriver-saveweb
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");

const slug = (process.argv[2] || "wpriver-saveweb").trim().replace(/^\/+|\/+$/g, "");
const ROOT = path.join(REPO, "public/box-templates", slug);
const OUT_FILE = path.join(ROOT, "grapes-bootstrap.json");
const BASE = `/box-templates/${slug}`;

function readUtf8(p) {
  return fs.readFileSync(p, "utf8");
}

function resolveCssUrl(cssFileAbs, rawUrl) {
  let u = rawUrl.trim().replace(/^["']|["']$/g, "");
  if (!u || u.startsWith("data:") || /^https?:\/\//i.test(u) || u.startsWith("//")) {
    return u;
  }
  if (u.startsWith(BASE)) return u;

  u = u.replace(/^\.\.\/img\//, "../images/");

  const dir = path.dirname(cssFileAbs);
  let abs = path.normalize(path.join(dir, u));

  if (!abs.startsWith(ROOT)) {
    abs = path.normalize(path.join(ROOT, u.replace(/^\.\//, "")));
  }

  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  if (!rel || rel.startsWith("..")) {
    console.warn(`[box-bootstrap:${slug}] unresolved url:`, rawUrl, "in", cssFileAbs);
    return u;
  }

  return `${BASE}/${rel}`;
}

function rewriteCssUrls(cssText, cssFileAbs) {
  return cssText.replace(/url\(\s*([^)]+)\s*\)/gi, (_, inner) => {
    const resolved = resolveCssUrl(cssFileAbs, inner);
    const safe = resolved.replace(/"/g, '\\"');
    return `url("${safe}")`;
  });
}

function rewriteSrcset(html) {
  return html.replace(/\ssrcset\s*=\s*(["'])([^"']+)\1/gi, (_full, quote, raw) => {
    const parts = raw.split(",").map((chunk) => {
      const trimmed = chunk.trim().split(/\s+/).filter(Boolean);
      if (!trimmed.length) return "";
      const [url, ...descriptors] = trimmed;
      if (!url || /^https?:\/\/|\/\/|\/box-templates\/|data:/i.test(url)) {
        return [url, ...descriptors].join(" ");
      }
      const tail = url.replace(/^\.\//, "").replace(/^\/+/, "");
      return [`${BASE}/${tail}`, ...descriptors].join(" ");
    });
    return ` srcset=${quote}${parts.filter(Boolean).join(", ")}${quote}`;
  });
}

function absolutizeHtmlAttributesDetailed(html, attrName) {
  const re = new RegExp(`(\\s${attrName}\\s*=\\s*)(["'])((?:(?!\\2).)*)(\\2)`, "gi");
  return html.replace(re, (full, pre, quote, rawVal) => {
    const v = rawVal.trim();
    if (!v || /^#/.test(v)) return full;
    if (/^(https?:)?\/\//i.test(v)) return full;
    if (/^\/box-templates\//i.test(v)) return full;
    if (/^(data:|mailto:|tel:|javascript:)/i.test(v)) return full;
    const tail = v.replace(/^\.\//, "").replace(/^\/+/, "");
    return `${pre}${quote}${BASE}/${tail}${quote}`;
  });
}

function resolveLocalStylesheetAbs(href) {
  let h = href.trim().split("?")[0].trim();
  if (!h || /^https?:\/\//i.test(h) || h.startsWith("//")) return null;
  if (h.startsWith("./")) h = h.slice(2);
  const abs = path.normalize(path.join(ROOT, h.replace(/^\/+/, "")));
  if (!abs.startsWith(ROOT)) return null;
  return fs.existsSync(abs) ? abs : null;
}

function main() {
  const indexPath = path.join(ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`[box-bootstrap:${slug}] Не найден:`, indexPath);
    process.exit(1);
  }

  const htmlFull = readUtf8(indexPath);
  const bodyMatch = htmlFull.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) {
    console.error(`[box-bootstrap:${slug}] Нет <body> в index.html`);
    process.exit(1);
  }

  let bodyHtml = bodyMatch[1];

  bodyHtml = absolutizeHtmlAttributesDetailed(bodyHtml, "href");
  bodyHtml = absolutizeHtmlAttributesDetailed(bodyHtml, "src");
  bodyHtml = rewriteSrcset(bodyHtml);

  const cssChunks = [];

  const stylesInline = [...htmlFull.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  for (const [, block] of stylesInline) {
    cssChunks.push(block.trim());
  }

  const links = [...htmlFull.matchAll(/<link\b([^>]+)>/gi)];
  for (const [, attrs] of links) {
    if (!/rel\s*=\s*["']stylesheet["']/i.test(attrs)) continue;
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    let href = hrefMatch[1].trim();
    if (href.startsWith("//")) href = `https:${href}`;

    if (/^https?:\/\//i.test(href)) {
      cssChunks.push(`/*! ext-css */ @import url(${JSON.stringify(href)});`);
      continue;
    }

    const cssAbs = resolveLocalStylesheetAbs(href);
    if (!cssAbs) {
      console.warn(`[box-bootstrap:${slug}] пропуск stylesheet (не файл под ROOT):`, href);
      continue;
    }

    let cssText = readUtf8(cssAbs);
    cssText = rewriteCssUrls(cssText, cssAbs);
    const relFromRoot = path.relative(ROOT, cssAbs).split(path.sep).join("/");
    cssChunks.push(`/*! file: ${relFromRoot} */\n${cssText}`);
  }

  const cssCombined = cssChunks.filter(Boolean).join("\n\n");

  const payload = {
    html: bodyHtml,
    css: cssCombined,
    base: BASE,
    meta: { slug, builtAt: new Date().toISOString() },
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload), "utf8");
  console.log(
    `[box-bootstrap:${slug}] Written:`,
    OUT_FILE,
    `html=${(payload.html.length / 1024).toFixed(0)}KB`,
    `css=${(payload.css.length / 1024).toFixed(0)}KB`,
  );
}

main();
