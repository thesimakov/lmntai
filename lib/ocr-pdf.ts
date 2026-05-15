/**
 * OCR fallback for image-only PDFs using Claude's native PDF document support.
 * Called when pdf-parse extracts less than MIN_TEXT_LENGTH characters.
 */

const OCR_MODEL = "claude-haiku-4-5-20251001";
const MAX_PDF_BYTES_FOR_OCR = 20 * 1024 * 1024; // 20 MB — Claude's PDF limit
const OCR_PROMPT =
  "Extract all text from this document. " +
  "Include every number, label, table cell, heading, and paragraph exactly as shown. " +
  "Preserve table structure using tab or pipe characters. " +
  "Return plain text only — no markdown, no commentary.";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContent = AnthropicTextBlock[];
type AnthropicResponse = {
  content: AnthropicContent;
  usage?: { input_tokens: number; output_tokens: number };
};

export async function ocrPdfBuffer(buffer: Buffer): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  if (buffer.length > MAX_PDF_BYTES_FOR_OCR) return null;

  const base64 = buffer.toString("base64");

  const body = {
    model: OCR_MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: OCR_PROMPT },
        ],
      },
    ],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as AnthropicResponse;
  const text = data.content
    .filter((b): b is AnthropicTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text.length > 20 ? text : null;
}
