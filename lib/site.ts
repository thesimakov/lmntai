/** Публичный origin сайта (OAuth, ссылки, metadata). */
const rawSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
export const SITE_URL = (rawSite && rawSite.length > 0 ? rawSite : "https://lemnity.com").replace(/\/$/, "");
