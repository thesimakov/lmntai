/**
 * Апстрим иногда кладёт в `index.html` сырой markdown/текст ответа ассистента — в iframe это выглядит как «простыня».
 * Такой контент не считается превью-HTML и подменяется на пустой экран (лоадер) в роуте sandbox.
 */
export function isLikelySandboxPreviewHtml(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const t = raw.trim();
  if (t.length < 16) return false;
  /** Нужен хотя бы один тег/HTML-конструкция во вводном фрагменте */
  const head = t.slice(0, 2000);
  if (!head.includes("<")) return false;
  return /<(?:!DOCTYPE|!--|[a-zA-Z!?][a-zA-Z0-9:-]*)(\s|[\/?>])/i.test(head);
}
