import type { UiLanguage } from "@/lib/i18n";

/** Таймер «мм:сс» или «N с» во время сборки */
export function formatBuildElapsed(ms: number, lang: UiLanguage): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) {
    if (lang === "en") return `${sec}s`;
    return `${sec} с`;
  }
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Итог «был собран за …» под чатом */
export function formatBuildTotalDuration(ms: number, lang: UiLanguage): string {
  if (ms < 1000) {
    if (lang === "en") return "less than 1 s";
    if (lang === "tg") return "камтар аз 1 с";
    return "менее 1 с";
  }
  const s = Math.round(ms / 1000);
  if (s < 60) {
    if (lang === "en") return `${s} s`;
    if (lang === "tg") return `${s} с`;
    return `${s} с`;
  }
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (lang === "en") {
    if (r === 0) return `${m} min`;
    return `${m} min ${r} s`;
  }
  if (lang === "tg") {
    if (r === 0) return `${m} дақ`;
    return `${m} дақ ${r} с`;
  }
  if (r === 0) return `${m} мин`;
  return `${m} мин ${r} с`;
}
