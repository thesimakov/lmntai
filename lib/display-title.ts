/**
 * Название проекта для пользовательского UI: без хвостов со стеком (React, TypeScript, Lovable…).
 */

export function sanitizeProjectTitleForUser(raw: string): string {
  const before = raw.trim();
  if (!before) return before;

  let s = before;

  s = s.replace(/\s*[–—-]\s*UI (на|on)\s+React.*/i, "");
  s = s.replace(/\s*[–—-]\s*React\+TypeScript.*/i, "");
  s = s.replace(/\s*[–—-]\s*React \+ TypeScript.*/i, "");
  s = s.replace(/\s*[–—-]\s*Lovable[^–—]*/i, "");
  s = s.replace(/\s*[–—-]\s*Vite[^–—]*/i, "");
  s = s.replace(/\s*\(\s*React\+TypeScript[^)]*\)/gi, "");
  s = s.replace(/\s*\(\s*React \+ TypeScript[^)]*\)/gi, "");
  s = s.replace(/\s*[–—-]\s*многофайловый.*/i, "");

  s = s.trim().replace(/\s*[–—-]\s*$/, "").trim();

  return s || before;
}
