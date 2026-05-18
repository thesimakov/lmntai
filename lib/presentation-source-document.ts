import { PDFParse } from "pdf-parse";
import { docxToText } from "@/lib/docx-parser";
import { BI_UPLOAD_MAX_BYTES } from "@/lib/bi-upload-limits";

/** Max extracted text sent to the slide-generation prompt. */
export const PRESENTATION_SOURCE_MAX_CHARS = 24_000;

import { isPresentationSourceFile } from "@/lib/presentation-source-document-client";

export { isPresentationSourceFile } from "@/lib/presentation-source-document-client";

function isDocx(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  );
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isPlainText(file: File): boolean {
  return file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
}

function truncateSourceText(text: string): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= PRESENTATION_SOURCE_MAX_CHARS) {
    return { text: trimmed, truncated: false };
  }
  return {
    text: `${trimmed.slice(0, PRESENTATION_SOURCE_MAX_CHARS)}\n\n[… документ обрезан для лимита промпта]`,
    truncated: true,
  };
}

async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text.trim();
  if (text.length < 20) {
    throw new Error(`PDF «${filename}» пустой или содержит только изображения.`);
  }
  return text;
}

export async function extractPresentationSourceText(
  file: File
): Promise<{ fileName: string; text: string; truncated: boolean }> {
  if (file.size > BI_UPLOAD_MAX_BYTES) {
    throw new Error(`Файл слишком большой (макс. ${BI_UPLOAD_MAX_BYTES / (1024 * 1024)} МБ).`);
  }
  if (!isPresentationSourceFile(file)) {
    throw new Error("Поддерживаются DOCX, DOC, PDF и TXT.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let raw: string;

  if (isPlainText(file)) {
    raw = buffer.toString("utf-8");
  } else if (isPdf(file)) {
    raw = await extractPdfText(buffer, file.name);
  } else if (isDocx(file)) {
    raw = await docxToText(buffer);
    if (!raw.trim()) {
      throw new Error(`Документ «${file.name}» пустой или не удалось извлечь текст.`);
    }
  } else {
    throw new Error("Неподдерживаемый формат файла.");
  }

  const wrapped = `=== Источник: ${file.name} ===\n${raw}`;
  const { text, truncated } = truncateSourceText(wrapped);
  if (text.length < 20) {
    throw new Error("В файле недостаточно текста для генерации.");
  }

  return { fileName: file.name, text, truncated };
}
