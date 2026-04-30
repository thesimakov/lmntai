/**
 * Перестановка элементов превью визуального редактора среди братьев / на уровень «в сторону».
 */

/** Поднять вверх среди братьев (раньше в потоке). */
export function reorderSiblingBeforePrevious(el: Element): boolean {
  const prev = el.previousElementSibling;
  if (!prev || !el.parentElement) return false;
  el.parentElement.insertBefore(el, prev);
  return true;
}

/** Опустить вниз среди братьев (позже в потоке). */
export function reorderSiblingAfterNext(el: Element): boolean {
  const next = el.nextElementSibling;
  if (!next || !el.parentElement) return false;
  el.parentElement.insertBefore(el, next.nextSibling);
  return true;
}

/**
 * Вынуть блок «влево»: стать узлом **перед** родительской обёрткой на уровень выше.
 */
export function reorderElementBeforeParent(el: Element): boolean {
  const parent = el.parentElement;
  if (!parent || parent.tagName === "BODY" || parent.tagName === "HTML") return false;
  const gp = parent.parentElement;
  if (!gp) return false;
  gp.insertBefore(el, parent);
  return true;
}

/**
 * «Вправо» / после обёртки: стать следующим узлом **после** родителя на уровне выше.
 */
export function reorderAsideFromParent(el: Element): boolean {
  const parent = el.parentElement;
  if (!parent || parent.tagName === "BODY" || parent.tagName === "HTML") return false;
  const gp = parent.parentElement;
  if (!gp) return false;
  gp.insertBefore(el, parent.nextSibling);
  return true;
}
