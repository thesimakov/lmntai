/** Подготовка вложений из чата для отправки в Lemnity AI (текст в промпт, изображения как data URL). */

const MAX_TEXT_CHARS = 120_000;
const MAX_IMAGE_BYTES = 400_000;
const MAX_TOTAL_ANNEX_CHARS = 180_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result;
      if (typeof s !== "string") {
        reject(new Error("read_failed"));
        return;
      }
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(r.error ?? new Error("read_failed"));
    r.readAsDataURL(blob);
  });
}

function looksTextLike(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t.startsWith("text/")) return true;
  if (
    /\.(txt|md|markdown|csv|json|html?|xml|tsx?|jsx?|css|log|yaml|yml|toml|env|ini|svg)$/i.test(
      file.name
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Человекочитаемый блок для добавления к полю `message` в /chat.
 * Ограничивает размер, чтобы не рвать лимиты провайдера.
 */
export async function formatAttachmentsForLemnityChat(files: File[]): Promise<string> {
  if (!files.length) return "";
  const parts: string[] = [];
  let total = 0;

  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) {
      parts.push(`- ${file.name}: пропущен (больше 8 МБ).`);
      continue;
    }

    try {
      if (looksTextLike(file)) {
        let text = await file.text();
        if (text.length > MAX_TEXT_CHARS) {
          text = `${text.slice(0, MAX_TEXT_CHARS)}\n\n… [файл обрезан, было ${file.size} байт]`;
        }
        const chunk = `- ${file.name} (текст):\n${text}`;
        if (total + chunk.length > MAX_TOTAL_ANNEX_CHARS) {
          parts.push(`- ${file.name}: не влезает в лимит вложений вместе с другими файлами.`);
          continue;
        }
        total += chunk.length;
        parts.push(chunk);
        continue;
      }

      if (file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_BYTES) {
          parts.push(
            `- ${file.name}: изображение слишком большое для вложения (макс. ~${Math.round(MAX_IMAGE_BYTES / 1024)} КБ).`
          );
          continue;
        }
        const b64 = await blobToBase64(file);
        const chunk = `- ${file.name} (изображение, ${file.type})\ndata:${file.type};base64,${b64}`;
        if (total + chunk.length > MAX_TOTAL_ANNEX_CHARS) {
          parts.push(`- ${file.name}: изображение не влезает в лимит вложений.`);
          continue;
        }
        total += chunk.length;
        parts.push(chunk);
        continue;
      }

      parts.push(
        `- ${file.name}: тип «${file.type || "неизвестен"}» — извлеките текст в .txt/.md или опишите содержимое в сообщении.`
      );
    } catch {
      parts.push(`- ${file.name}: не удалось прочитать файл.`);
    }
  }

  return parts.join("\n\n");
}

export function mergeUserMessageWithAttachments(text: string, annex: string): string {
  const t = text.trim();
  const a = annex.trim();
  if (!a) return t;
  if (!t) return `---\nВложения:\n${a}`;
  return `${t}\n\n---\nВложения:\n${a}`;
}

/** Короткая подпись сообщения в UI чата (тело файлов уходит в API отдельно). */
export function playgroundUserDisplayContent(text: string, files?: File[]): string {
  const t = text.trim();
  const names = (files ?? []).map((f) => f.name).join(", ");
  if (t && (files?.length ?? 0) > 0) return `${t}\n📎 ${names}`;
  if (t) return t;
  if ((files?.length ?? 0) > 0) return `📎 ${names}`;
  return "";
}
