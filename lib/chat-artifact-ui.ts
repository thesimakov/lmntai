/**
 * Длинные ответы с многофайловым кодом не должны засорять чат:
 * полный код доступен во вкладке «Код» / в песочнице.
 */

const FENCE_WITH_PATH = /```[a-z0-9]*:[^\n`]+\n/i;

/** Сообщение похоже на дамп сгенерированного кода (Lovable / fenced files). */
/** Фрагмент дельты со строкой «блока с путём файла» Lovable (```tsx:src/…). */
export function isLovableFileFenceDelta(piece: string): boolean {
  return /```[a-z0-9]*:/i.test(piece);
}

export function shouldCollapseAssistantCodeDump(content: string): boolean {
  const t = content.trim();
  if (t.length < 320) return false;
  if (FENCE_WITH_PATH.test(t)) return true;
  if (t.includes("```tsx") || t.includes("```ts") || t.includes("```jsx")) return true;
  if (t.length > 2500 && t.includes("import ") && (t.includes("export ") || t.includes("function "))) {
    return true;
  }
  return false;
}
