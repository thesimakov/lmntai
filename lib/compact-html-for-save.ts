/**
 * Чуть уменьшает размер HTML перед PATCH (комментарии). Не ломает теги/пре-содержимое.
 */
export function compactHtmlDocumentForPatch(html: string): string {
  return html.replace(/<!--([\s\S]*?)-->/g, "");
}
