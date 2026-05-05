import type { LemnityBoxCanvasContent, PageDocument } from "@/lib/lemnity-box-editor-schema";
import { emptyPageDocument } from "@/lib/lemnity-box-editor-schema";

type CmsPagePayload = {
  page?: {
    title?: string;
    draftContent?: unknown;
  };
};

export async function fetchCmsPageDocument(siteId: string, pageId: string): Promise<PageDocument | null> {
  try {
    const res = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as CmsPagePayload | null;
    const title = body?.page?.title?.trim() || "CMS page";
    const doc = emptyPageDocument(title);
    const draft = body?.page?.draftContent as Partial<LemnityBoxCanvasContent> | undefined;
    if (draft && typeof draft === "object" && typeof draft.html === "string" && typeof draft.css === "string") {
      doc.grapesjs = { html: draft.html, css: draft.css };
    }
    return doc;
  } catch {
    return null;
  }
}

export async function saveCmsPageDraft(
  siteId: string,
  pageId: string,
  content: LemnityBoxCanvasContent,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")) || res.statusText;
      return { ok: false, message: text || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
