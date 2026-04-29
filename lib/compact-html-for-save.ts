/**
 * Уменьшает размер HTML перед PATCH: комментарии, затем безопасные пробелы между тегами
 * (контент в script/style/pre/textarea не трогаем).
 */
export function compactHtmlDocumentForPatch(html: string): string {
  let s = html.replace(/<!--([\s\S]*?)-->/g, "");
  const protectedBlocks: string[] = [];
  const token = (i: number) => `\x00LMNTBLK${i}_\x00`;
  const protectRe =
    /<(?:script|style|pre|textarea)\b[^>]*>[\s\S]*?<\/(?:script|style|pre|textarea)>/gi;
  s = s.replace(protectRe, (m) => {
    protectedBlocks.push(m);
    return token(protectedBlocks.length - 1);
  });
  s = s.replace(/>\s+</g, "><").trim();
  protectedBlocks.forEach((block, i) => {
    s = s.split(token(i)).join(block);
  });
  return s;
}
