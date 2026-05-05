import type { LemnityBoxCanvasContent } from "@/lib/lemnity-box-editor-schema";

const STORAGE_KEY = "lemnity.box.canvas.v1";

type Stored = {
  v: 1;
  html: string;
  css: string;
  savedAt: number;
};

export function readLemnityBoxCanvasDraft(): LemnityBoxCanvasContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== "object" || data === null) return null;
    const s = data as Partial<Stored>;
    if (s.v !== 1 || typeof s.html !== "string" || typeof s.css !== "string") return null;
    return { html: s.html, css: s.css };
  } catch {
    return null;
  }
}

export function writeLemnityBoxCanvasDraft(content: LemnityBoxCanvasContent): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Stored = {
      v: 1,
      html: content.html,
      css: content.css,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}
