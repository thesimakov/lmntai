const SUPPORTED_MIME = new Set([
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export function isPresentationSourceFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    SUPPORTED_MIME.has(file.type) ||
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    name.endsWith(".pdf") ||
    name.endsWith(".txt")
  );
}
