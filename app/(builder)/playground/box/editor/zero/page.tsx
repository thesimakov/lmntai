"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ZbEditor, type ZbEditorHandle } from "@/components/zero-block-editor/zb-editor";
import { PageTransition } from "@/components/page-transition";
import { commitZeroBlockEdit, readZeroBlockSession, type ZeroBlockSession } from "@/lib/lemnity-zero-block-session";
import { pushLemnityBoxCanvasToSandbox } from "@/lib/lemnity-box-push-sandbox";
import { saveCmsPageDraft } from "@/lib/cms-editor-client";
import { zbParseHtmlToElements, zbParseSectionMeta } from "@/lib/zero-block-editor/html-import";
import type { ZbElement } from "@/lib/zero-block-editor/types";

export default function ZeroBlockEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const blockId = searchParams.get("blockId") ?? "";

  const editorRef = useRef<ZbEditorHandle>(null);
  const [session, setSession] = useState<ZeroBlockSession | null>(null);
  const [initialElements, setInitialElements] = useState<ZbElement[]>([]);
  const [canvasMeta, setCanvasMeta] = useState<{ background?: string; minHeight?: number }>({});
  const [ready, setReady] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    const s = readZeroBlockSession();
    if (!s || s.blockId !== blockId) {
      toast.error("Сессия нулевого блока не найдена");
      return;
    }
    setSession(s);
    // Prefer serialized elements[] over HTML round-trip to avoid position/responsive data loss.
    const elements = s.elements?.length ? s.elements : zbParseHtmlToElements(s.sectionHtml);
    setInitialElements(elements);
    setCanvasMeta(zbParseSectionMeta(s.sectionHtml));
    setReady(true);
  }, [blockId]);

  const handleSave = useCallback(async () => {
    if (!session) return;
    const handle = editorRef.current;
    if (!handle) {
      toast.error("Редактор не готов");
      return;
    }

    setSavePending(true);
    try {
      const { html, css } = handle.getHtmlCss(blockId);
      const currentElements = handle.getElements();

      const committed = commitZeroBlockEdit(blockId, html, css, currentElements);
      if (!committed) {
        toast.error("Сессия истекла — вернитесь и откройте блок снова");
        return;
      }

      if (session.cmsSiteId && session.cmsPageId) {
        const saved = await saveCmsPageDraft(session.cmsSiteId, session.cmsPageId, {
          html: committed.fullHtml,
          css: committed.css,
        });
        if (!saved.ok) {
          toast.error("Ошибка сохранения CMS-страницы", { description: saved.message });
        } else if (session.cmsProjectId) {
          await pushLemnityBoxCanvasToSandbox(
            session.cmsProjectId,
            { html: committed.fullHtml, css: committed.css },
            {
              cmsFormBridge: {
                siteId: session.cmsSiteId,
                pageId: session.cmsPageId,
                pagePath: session.cmsPagePath ?? "/",
              },
            },
          );
        }
      } else if (session.cmsProjectId) {
        await pushLemnityBoxCanvasToSandbox(session.cmsProjectId, {
          html: committed.fullHtml,
          css: committed.css,
        });
      }

      hasSavedRef.current = true;
      toast.success("Сохранено");
    } finally {
      setSavePending(false);
    }
  }, [blockId, session, router]);

  const handleClose = useCallback(() => {
    const returnUrl = session?.returnUrl;
    if (returnUrl) {
      if (hasSavedRef.current) {
        const sep = returnUrl.includes("?") ? "&" : "?";
        router.push(`${returnUrl}${sep}zeroBlockSaved=${encodeURIComponent(blockId)}`);
      } else {
        router.push(returnUrl);
      }
    } else {
      router.back();
    }
  }, [session, router, blockId]);

  if (!ready) {
    return (
      <PageTransition>
        <div className="flex h-screen items-center justify-center bg-[#f0f0f0]">
          <span className="text-sm text-muted-foreground">Загрузка нулевого блока…</span>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex h-screen flex-col overflow-hidden">
        <ZbEditor
          editorRef={editorRef}
          onSave={savePending ? undefined : handleSave}
          onClose={handleClose}
          initialElements={initialElements}
          canvasConfig={{
            gridWidth: 1200,
            background: canvasMeta.background ?? "#ffffff",
            ...(canvasMeta.minHeight ? { height: canvasMeta.minHeight } : {}),
          }}
        />
      </div>
    </PageTransition>
  );
}
