import { writeLemnityBoxCanvasDraft } from "@/lib/lemnity-box-editor-persistence";
import type { ZbElement } from "@/lib/zero-block-editor/types";

const SESSION_KEY = "lemnity.zero-block.session";

export type ZeroBlockSession = {
  blockId: string;
  sectionHtml: string;
  fullHtml: string;
  css: string;
  returnUrl: string;
  cmsSiteId?: string;
  cmsPageId?: string;
  cmsProjectId?: string;
  cmsPagePath?: string;
  startedAt: number;
  /** Serialized ZbElement[] — restored on re-entry to avoid lossy HTML round-trip. */
  elements?: ZbElement[];
};

export function startZeroBlockSession(data: Omit<ZeroBlockSession, "startedAt">): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, startedAt: Date.now() }));
  } catch {}
}

export function readZeroBlockSession(): ZeroBlockSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ZeroBlockSession) : null;
  } catch {
    return null;
  }
}

/** Save edited section back, patch the full canvas HTML draft, return updated session. */
export function commitZeroBlockEdit(
  blockId: string,
  newSectionHtml: string,
  css: string,
  elements?: ZbElement[],
): ZeroBlockSession | null {
  const session = readZeroBlockSession();
  if (!session || session.blockId !== blockId) return null;
  const patchedHtml = replaceZeroBlockSection(session.fullHtml, blockId, newSectionHtml);
  // Zero block editor only produces inline styles — preserve original canvas CSS (seed + template styles).
  // Using the incoming css (currently always "") would wipe standard block styles on reload.
  const canvasCss = css || session.css;
  writeLemnityBoxCanvasDraft({ html: patchedHtml, css: canvasCss });
  // Persist elements[] so re-entry restores exact state without lossy HTML round-trip.
  const updated: ZeroBlockSession = {
    ...session,
    sectionHtml: newSectionHtml,
    css: canvasCss,
    fullHtml: patchedHtml,
    ...(elements ? { elements } : {}),
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function clearZeroBlockSession(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

/** Extract section HTML from a full canvas HTML string by data-ln-zero-id. */
export function extractZeroBlockSection(fullHtml: string, blockId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${fullHtml}</div>`, "text/html");
    const section = doc.querySelector(
      `section.lemnity-zero-block[data-ln-zero-id="${CSS.escape(blockId)}"]`,
    );
    if (!section) return null;
    section.querySelectorAll("[data-ln-editor-hint='1']").forEach((el) => el.remove());
    section.removeAttribute("data-ln-zero-editing");
    section.removeAttribute("data-ln-zero-menu-open");
    section.removeAttribute("data-ln-zero-saving");
    return section.outerHTML;
  } catch {
    return null;
  }
}

function replaceZeroBlockSection(fullHtml: string, blockId: string, newHtml: string): string {
  if (typeof window === "undefined") return fullHtml;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${fullHtml}</div>`, "text/html");
    const section = doc.querySelector(
      `section.lemnity-zero-block[data-ln-zero-id="${CSS.escape(blockId)}"]`,
    );
    if (!section) return fullHtml;
    const temp = doc.createElement("div");
    temp.innerHTML = newHtml;
    const newSection = temp.firstElementChild;
    if (newSection) section.replaceWith(newSection);
    return doc.body.firstElementChild?.innerHTML ?? fullHtml;
  } catch {
    return fullHtml;
  }
}
