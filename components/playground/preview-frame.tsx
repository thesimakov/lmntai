"use client";

import JSZip from "jszip";
import { Download, ExternalLink, Monitor, Presentation, Smartphone, Tablet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ElementEditorPanel,
  type ElementEditorPanelHandle
} from "@/components/editor/ElementEditorPanel";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { downloadHtmlAsPdf } from "@/lib/export-html-pdf";
import type { VisualEditorSubmitPayload } from "@/lib/editor/AICommandBuilder";
import { applyVisualUpdatesToElement } from "@/lib/editor/apply-visual-updates";
import { buildLayoutSnapshot, stripLmntElementIdsFromSubtree, type LayoutElementSnapshot } from "@/lib/editor/layout-element";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import {
  attachVisualPreviewEditor,
  serializeIframeDocument,
  type VisualPreviewEditorHandle
} from "@/lib/visual-preview-editor";
import { buildVisualSavePatchBody } from "@/lib/visual-save-client-body";
import { cn } from "@/lib/utils";

type DeviceMode = "desktop" | "tablet" | "mobile";

const modeStyles: Record<DeviceMode, string> = {
  desktop: "h-full min-h-0 w-full",
  tablet: "mx-auto h-full min-h-0 w-[768px] max-w-full",
  mobile: "mx-auto h-full min-h-0 w-[390px] max-w-full"
};

export function isPptxArtifact(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.includes("presentationml") || mimeType.includes("ms-powerpoint");
}

type PreviewFrameProps = {
  previewUrl: string;
  sandboxId: string;
  /** С сервера (SSE preview): для .pptx не показываем iframe */
  mimeType?: string | null;
  /** Имя файла для скачивания */
  downloadFilename?: string | null;
  /** Режим визуального редактора (текст / картинки в iframe) */
  visualEditMode?: boolean;
  /** Сохранение в песочницу через PATCH /api/sandbox/:id */
  visualEditPersist?: boolean;
  /** Тип проекта (экспорт DOC/PDF) */
  projectKind?: ProjectKind | null;
  /** PDF той же презентации с сервера (Lemnity AI) */
  presentationPdfExport?: { url: string; filename: string } | null;
  /** Экспорт презентации в PDF / скачивание .pptx (тарифы Pro и Team) */
  presentationExportsPaid?: boolean;
  /** Отдельный режим «Редактор документа»: без эмуляции устройств, фокус на печатной области */
  previewVariant?: "default" | "document";
};

type ExportTask = "zip" | "pptx" | "pdfServer" | "docx" | "pdfClient" | null;

export function PreviewFrame({
  previewUrl,
  sandboxId,
  mimeType,
  downloadFilename,
  visualEditMode = false,
  visualEditPersist = false,
  projectKind = null,
  presentationPdfExport = null,
  presentationExportsPaid = false,
  previewVariant = "default"
}: PreviewFrameProps) {
  const { t } = useI18n();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [exportTask, setExportTask] = useState<ExportTask>(null);
  const [savePending, setSavePending] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(previewUrl);
  const [visualSnapshot, setVisualSnapshot] = useState<LayoutElementSnapshot | null>(null);
  const [visualSelectedCount, setVisualSelectedCount] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const visualEditorPanelRef = useRef<ElementEditorPanelHandle | null>(null);
  const visualEditorHandleRef = useRef<VisualPreviewEditorHandle | null>(null);
  const visualSelectedPrimaryRef = useRef<Element | null>(null);

  const isPptx = isPptxArtifact(mimeType);
  const exportBusy = exportTask !== null;

  const showResumeExports = projectKind === "resume" && !isPptx;
  const showPresentationHtmlPdf = projectKind === "presentation" && !isPptx;
  const isDocumentChrome = previewVariant === "document" && !isPptx;

  function guardPresentationExportPaid(): boolean {
    if (presentationExportsPaid) return true;
    toast.error(t("build_export_presentation_pro_required"), {
      description: t("build_export_presentation_pro_required_desc")
    });
    return false;
  }

  function handlePresentationPptxFromHtmlHint() {
    if (!guardPresentationExportPaid()) return;
    toast.message(t("build_export_pptx_html_hint_title"), {
      description: t("build_export_pptx_html_hint_desc")
    });
  }

  useEffect(() => {
    setIframeSrc(previewUrl);
  }, [previewUrl]);

  /** Визуальный редактор: слушатель `load` привязан к одному узлу iframe; `key={iframeSrc}` пересоздавал iframe без нового эффекта. После сохранения — снова bumpIframeCache + стабильный `key={sandboxId}`. */
  useEffect(() => {
    if (!visualEditMode || isPptx) {
      visualEditorHandleRef.current?.detach();
      visualEditorHandleRef.current = null;
      visualSelectedPrimaryRef.current = null;
      setIframeBlocked(false);
      setVisualSnapshot(null);
      setVisualSelectedCount(0);
      return;
    }

    function attachFromDoc() {
      const el = iframeRef.current;
      if (!el) return;
      const doc = el.contentDocument;
      if (!doc?.body) {
        setIframeBlocked(true);
        return;
      }
      setIframeBlocked(false);
      visualEditorHandleRef.current?.detach();
      visualEditorHandleRef.current = attachVisualPreviewEditor(doc, {
        onSelectionChange: (snapshot, _legacy, element, elements) => {
          visualSelectedPrimaryRef.current = element;
          setVisualSnapshot(snapshot);
          setVisualSelectedCount(elements.length);
        }
      });
    }

    function onLoad() {
      const el = iframeRef.current;
      if (!el) return;
      const doc = el.contentDocument;
      if (!doc) {
        setIframeBlocked(true);
        visualEditorHandleRef.current?.detach();
        visualEditorHandleRef.current = null;
        return;
      }
      attachFromDoc();
    }

    const mountEl = iframeRef.current;
    if (mountEl) {
      mountEl.addEventListener("load", onLoad);
      if (mountEl.contentDocument?.readyState === "complete" && mountEl.contentDocument.body) {
        onLoad();
      }
    }

    return () => {
      mountEl?.removeEventListener("load", onLoad);
      visualEditorHandleRef.current?.detach();
      visualEditorHandleRef.current = null;
      visualSelectedPrimaryRef.current = null;
    };
  }, [visualEditMode, isPptx, sandboxId]);

  const controlButtons = useMemo(
    () => [
      { id: "desktop" as const, icon: Monitor, label: "Десктоп" },
      { id: "tablet" as const, icon: Tablet, label: "Планшет" },
      { id: "mobile" as const, icon: Smartphone, label: "Мобайл" }
    ],
    []
  );

  async function downloadBlobFromResponse(response: Response, filename: string) {
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPptx() {
    if (!guardPresentationExportPaid()) return;
    setExportTask("pptx");
    try {
      const response = await fetch(previewUrl, { credentials: "include" });
      await downloadBlobFromResponse(
        response,
        downloadFilename?.trim() || `presentation-${sandboxId.slice(0, 8)}.pptx`
      );
    } catch (e) {
      toast.error(t("build_export_failed"), { description: unknownToErrorMessage(e) });
    } finally {
      setExportTask(null);
    }
  }

  async function handleDownloadServerPdf() {
    if (!guardPresentationExportPaid()) return;
    if (!presentationPdfExport) return;
    setExportTask("pdfServer");
    try {
      const response = await fetch(presentationPdfExport.url, { credentials: "include" });
      await downloadBlobFromResponse(response, presentationPdfExport.filename);
    } catch (e) {
      toast.error(t("build_export_failed"), { description: unknownToErrorMessage(e) });
    } finally {
      setExportTask(null);
    }
  }

  async function handleExportZip() {
    setExportTask("zip");
    try {
      const zip = new JSZip();
      if (previewUrl.includes("/api/lemnity-ai/artifacts/") || sandboxId.startsWith("artifact_")) {
        const response = await fetch(previewUrl, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }
        zip.file("index.html", await response.text());
      } else {
        const response = await fetch(`/api/sandbox/${sandboxId}?format=json`, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }
        const payload = (await response.json()) as { files: Record<string, string> };
        Object.entries(payload.files ?? {}).forEach(([path, content]) => {
          zip.file(path, content);
        });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lemnity-project-${sandboxId.slice(0, 8)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(t("build_export_failed"), { description: unknownToErrorMessage(e) });
    } finally {
      setExportTask(null);
    }
  }

  async function handleExportDocx() {
    setExportTask("docx");
    try {
      const htmlRes = await fetch(previewUrl, { credentials: "include" });
      if (!htmlRes.ok) throw new Error(String(htmlRes.status));
      const html = await htmlRes.text();
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ html, filename: "resume.docx" })
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(t("build_export_docx_error"), { description: unknownToErrorMessage(e) });
    } finally {
      setExportTask(null);
    }
  }

  async function handleClientPdf() {
    if (projectKind === "presentation" && !presentationExportsPaid) {
      guardPresentationExportPaid();
      return;
    }
    const doc = iframeRef.current?.contentDocument;
    const root = doc?.body;
    if (!root) {
      toast.error(t("build_export_pdf_error"), { description: t("build_visual_no_iframe_access") });
      return;
    }
    setExportTask("pdfClient");
    try {
      const base =
        projectKind === "resume"
          ? "resume"
          : projectKind === "presentation"
            ? "presentation"
            : "export";
      await downloadHtmlAsPdf(root, `${base}.pdf`);
    } catch (e) {
      toast.error(t("build_export_pdf_error"), { description: unknownToErrorMessage(e) });
    } finally {
      setExportTask(null);
    }
  }

  function bumpIframeCache(reason: "edit" | "recover") {
    const u = new URL(previewUrl, typeof window !== "undefined" ? window.location.href : "http://localhost");
    u.searchParams.set(reason === "edit" ? "_edit" : "_recover", String(Date.now()));
    setIframeSrc(`${u.pathname}${u.search}${u.hash}`);
  }

  /** Превью в новой вкладке: `_open` ломает HTTP-кэш, иначе возможен старый HTML после PATCH. */
  function openPreviewInNewTab() {
    const u = new URL(previewUrl, typeof window !== "undefined" ? window.location.href : "http://localhost");
    u.searchParams.set("_open", String(Date.now()));
    const href = `${u.pathname}${u.search}${u.hash}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function handleDismissVisualEditor() {
    visualEditorHandleRef.current?.clearSelection();
  }

  async function handleSaveVisual() {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !visualEditPersist) return;

    visualEditorPanelRef.current?.flushPendingApply();

    setSavePending(true);
    try {
      const { html, replacedHeavyInlineAssets } = serializeIframeDocument(doc);
      const isBridgeArtifact =
        sandboxId.startsWith("artifact_") || previewUrl.includes("/api/lemnity-ai/artifacts/");
      const { body: patchBody, headers: patchHeaders, wireBytes } = await buildVisualSavePatchBody(html);
      // #region agent log
      fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0211ce" },
        body: JSON.stringify({
          sessionId: "0211ce",
          location: "preview-frame.tsx:handleSaveVisual:preflight",
          message: "visual save request preflight",
          data: {
            hypothesisId: "H0-start",
            htmlChars: html.length,
            wireBytes,
            endpoint: isBridgeArtifact ? "artifact" : "sandbox",
            replacedHeavyInlineAssets,
            sandboxIdPrefix: String(sandboxId).slice(0, 28)
          },
          timestamp: Date.now(),
          runId: "post-fix-gzip"
        })
      }).catch(() => {});
      // #endregion
      const res = isBridgeArtifact
        ? await fetch(`/api/lemnity-ai/artifacts/${encodeURIComponent(sandboxId)}`, {
            method: "PATCH",
            headers: patchHeaders,
            credentials: "include",
            body: patchBody
          })
        : await fetch(`/api/sandbox/${sandboxId}`, {
            method: "PATCH",
            headers: patchHeaders,
            credentials: "include",
            body: patchBody
          });
      // #region agent log
      {
        const st = res.status;
        const hid =
          st === 413
            ? "H1-413"
            : st === 401 || st === 403
              ? "H2-auth"
              : st === 404
                ? "H2-notfound"
                : st >= 500
                  ? "H3-upstream5xx"
                  : st >= 400
                    ? "H4-client4xx"
                    : "H5-ok";
        fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0211ce" },
          body: JSON.stringify({
            sessionId: "0211ce",
            location: "preview-frame.tsx:handleSaveVisual:response",
            message: "visual save PATCH response",
            data: {
              hypothesisId: hid,
              status: st,
              ok: res.ok,
              endpoint: isBridgeArtifact ? "artifact" : "sandbox",
              htmlChars: html.length,
              wireBytes,
              replacedHeavyInlineAssets,
              sandboxIdPrefix: String(sandboxId).slice(0, 28)
            },
            timestamp: Date.now(),
            runId: "post-fix-gzip"
          })
        }).catch(() => {});
      }
      // #endregion
      if (!res.ok) {
        if (res.status === 413) {
          toast.error(t("build_visual_html_too_large"), {
            description: t("build_visual_html_too_large_hint"),
            duration: 12_000
          });
          bumpIframeCache("recover");
          return;
        }
        const msg = (await res.text().catch(() => "")) || res.statusText;
        // #region agent log
        fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0211ce" },
          body: JSON.stringify({
            sessionId: "0211ce",
            location: "preview-frame.tsx:handleSaveVisual:notOkBody",
            message: "visual save error body peek",
            data: {
              hypothesisId: "H-nonOk-detail",
              status: res.status,
              bodyPeek: typeof msg === "string" ? msg.slice(0, 400) : ""
            },
            timestamp: Date.now(),
            runId: "save-debug"
          })
        }).catch(() => {});
        // #endregion
        throw new Error(msg);
      }
      toast.success(t("build_visual_saved"));
      if (replacedHeavyInlineAssets) {
        toast.message(t("build_visual_save_shrunk_inline"), {
          description: t("build_visual_save_shrunk_inline_desc"),
          duration: 10_000
        });
      }
      bumpIframeCache("edit");
    } catch (e) {
      // #region agent log
      fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0211ce" },
        body: JSON.stringify({
          sessionId: "0211ce",
          location: "preview-frame.tsx:handleSaveVisual:catch",
          message: "visual save catch",
          data: {
            hypothesisId: "H4-throw-or-network",
            err: unknownToErrorMessage(e).slice(0, 400)
          },
          timestamp: Date.now(),
          runId: "save-debug"
        })
      }).catch(() => {});
      // #endregion
      toast.error(t("build_visual_save_failed"), {
        description: unknownToErrorMessage(e)
      });
      bumpIframeCache("recover");
    } finally {
      setSavePending(false);
    }
  }

  function handleApplyVisualEdit(payload: VisualEditorSubmitPayload) {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const el = visualSelectedPrimaryRef.current;
    if (!doc?.body || !el || el.ownerDocument !== doc) {
      toast.error(t("build_visual_apply_failed"));
      return;
    }
    if (!payload.structured.updates.length) return;
    applyVisualUpdatesToElement(el, payload.structured.element_type, payload.structured.updates);
    setVisualSnapshot(buildLayoutSnapshot(el));
  }

  function handleVisualDeleteBlock() {
    const doc = iframeRef.current?.contentDocument;
    const el = visualSelectedPrimaryRef.current;
    if (!doc?.body || !el || el.ownerDocument !== doc) {
      toast.error(t("build_visual_apply_failed"));
      return;
    }
    const tag = el.tagName.toUpperCase();
    if (tag === "BODY" || tag === "HTML") {
      toast.error(t("build_visual_cannot_delete_root"));
      return;
    }
    visualEditorPanelRef.current?.flushPendingApply();
    el.remove();
    visualSelectedPrimaryRef.current = null;
    visualEditorHandleRef.current?.clearSelection();
    setVisualSnapshot(null);
    setVisualSelectedCount(0);
    toast.success(t("build_visual_block_deleted"));
  }

  function handleVisualCloneBlock() {
    const doc = iframeRef.current?.contentDocument;
    const el = visualSelectedPrimaryRef.current;
    if (!doc?.body || !el || el.ownerDocument !== doc) {
      toast.error(t("build_visual_apply_failed"));
      return;
    }
    const tag = el.tagName.toUpperCase();
    if (tag === "BODY" || tag === "HTML") {
      toast.error(t("build_visual_cannot_clone_root"));
      return;
    }
    const parent = el.parentNode;
    if (!parent) {
      toast.error(t("build_visual_clone_failed"));
      return;
    }
    visualEditorPanelRef.current?.flushPendingApply();
    const clone = el.cloneNode(true) as Element;
    stripLmntElementIdsFromSubtree(clone);
    parent.insertBefore(clone, el.nextSibling);
    visualEditorHandleRef.current?.selectElement(clone);
    toast.success(t("build_visual_block_cloned"));
  }

  const editorPanelLabels = useMemo(
    () => ({
      title: t("build_visual_editor_panel_title"),
      empty: t("build_visual_editor_panel_empty"),
      submit: t("build_visual_editor_submit"),
      close: t("build_visual_editor_panel_close"),
      deleteBlock: t("build_visual_delete_block"),
      cloneBlock: t("build_visual_clone_block"),
      fields: {
        text: t("build_visual_field_text"),
        color: t("build_visual_field_color"),
        size: t("build_visual_field_size"),
        alignment: t("build_visual_field_alignment"),
        href: t("build_visual_field_href"),
        icon: t("build_visual_field_icon"),
        iconColor: t("build_visual_field_icon_color"),
        variant: t("build_visual_field_variant"),
        src: t("build_visual_field_src"),
        alt: t("build_visual_field_alt"),
        width: t("build_visual_field_width"),
        height: t("build_visual_field_height"),
        borderRadius: t("build_visual_field_border_radius"),
        backgroundImage: t("build_visual_field_background_image")
      },
      buttonVariantOptions: [
        { value: "default", label: t("build_visual_variant_opt_default") },
        { value: "destructive", label: t("build_visual_variant_opt_destructive") },
        { value: "outline", label: t("build_visual_variant_opt_outline") },
        { value: "secondary", label: t("build_visual_variant_opt_secondary") },
        { value: "ghost", label: t("build_visual_variant_opt_ghost") },
        { value: "link", label: t("build_visual_variant_opt_link") }
      ],
      iconLibraryHint: t("build_visual_icon_library_hint"),
      iconManualHint: t("build_visual_icon_manual_hint"),
      iconClear: t("build_visual_icon_clear"),
      iconColorPlaceholder: t("build_visual_icon_color_placeholder"),
      upload: t("build_visual_upload_image"),
      uploading: t("build_visual_uploading"),
      imageTypeError: t("build_visual_image_type_error")
    }),
    [t]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5">
        {!isPptx
          ? isDocumentChrome
            ? (
                <div className="flex min-w-0 max-w-full flex-1 flex-col gap-0.5 py-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <p className="shrink-0 text-xs font-semibold text-foreground">{t("build_document_editor_title")}</p>
                  <p className="min-w-0 text-[11px] leading-snug text-muted-foreground">{t("build_document_editor_subtitle")}</p>
                </div>
              )
            : controlButtons.map((row) => {
                const RowIcon = row.icon;
                return (
                  <Button
                    key={row.id}
                    size="sm"
                    variant={deviceMode === row.id ? "default" : "outline"}
                    className="h-8"
                    onClick={() => setDeviceMode(row.id)}
                  >
                    <RowIcon className="h-4 w-4" />
                    {row.label}
                  </Button>
                );
              })
          : (
            <span className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Presentation className="h-4 w-4 shrink-0 text-primary" />
              {t("build_pptx_file_banner")}
            </span>
            )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {visualEditMode && !isPptx ? (
            <>
              {visualEditPersist ? (
                <Button
                  size="sm"
                  className="h-8"
                  disabled={savePending || iframeBlocked}
                  onClick={() => void handleSaveVisual()}
                >
                  {savePending ? t("build_visual_saving") : t("build_visual_save")}
                </Button>
              ) : null}
            </>
          ) : null}
          {showResumeExports ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="h-8"
                disabled={exportBusy}
                onClick={() => void handleExportDocx()}
              >
                {exportTask === "docx" ? "…" : t("build_export_docx")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8"
                disabled={exportBusy}
                onClick={() => void handleClientPdf()}
              >
                {exportTask === "pdfClient" ? "…" : t("build_export_pdf")}
              </Button>
            </>
          ) : null}
          {showPresentationHtmlPdf ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="h-8"
                disabled={exportBusy}
                onClick={() => void handleClientPdf()}
              >
                {exportTask === "pdfClient" ? "…" : t("build_export_pdf")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8"
                disabled={exportBusy}
                onClick={() => handlePresentationPptxFromHtmlHint()}
              >
                {t("build_export_pptx")}
              </Button>
            </>
          ) : null}
          {isPptx ? (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-8"
                disabled={exportBusy}
                onClick={() => void handleDownloadPptx()}
              >
                {exportTask === "pptx" ? "…" : t("build_export_pptx")}
              </Button>
              {presentationPdfExport ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  disabled={exportBusy}
                  onClick={() => void handleDownloadServerPdf()}
                >
                  {exportTask === "pdfServer" ? "…" : t("build_export_pdf")}
                </Button>
              ) : null}
            </>
          ) : !isDocumentChrome ? (
            <Button size="sm" className="h-8" onClick={() => void handleExportZip()} disabled={exportBusy}>
              <Download className="h-4 w-4" />
              {exportTask === "zip" ? "…" : t("build_export_zip")}
            </Button>
          ) : null}
          {!isPptx ? (
            <Button size="sm" variant="outline" className="h-8" type="button" onClick={openPreviewInNewTab}>
              <ExternalLink className="h-4 w-4" />
              {t("build_preview_open_tab")}
            </Button>
          ) : null}
        </div>
      </div>

      {visualEditMode && !isPptx && iframeBlocked ? (
        <p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          {t("build_visual_no_iframe_access")}
        </p>
      ) : null}
      {isPptx ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/20 p-8 text-center">
          <Presentation className="h-16 w-16 text-primary/80" strokeWidth={1.25} />
          <div className="max-w-md space-y-2">
            <p className="text-base font-medium text-foreground">{t("build_pptx_ready_title")}</p>
            <p className="text-sm text-muted-foreground">{t("build_pptx_ready_desc")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" onClick={() => void handleDownloadPptx()} disabled={exportBusy} className="gap-2">
              <Download className="h-4 w-4" />
              {exportTask === "pptx" ? "…" : t("build_export_pptx")}
            </Button>
            {presentationPdfExport ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => void handleDownloadServerPdf()}
                disabled={exportBusy}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exportTask === "pdfServer" ? "…" : t("build_export_pdf")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {visualEditMode && !iframeBlocked && visualSelectedCount > 1 ? (
            <p className="shrink-0 rounded-md border border-border/50 bg-muted/35 px-2 py-1.5 text-[11px] text-muted-foreground">
              {t("build_visual_multi_select_hint")}{" "}
              {t("build_visual_selected_count").replace("{count}", String(visualSelectedCount))}
            </p>
          ) : null}
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border p-2",
              isDocumentChrome ? "bg-zinc-200/70 dark:bg-zinc-900/60" : "bg-muted/20"
            )}
          >
            <div
              className={cn(
                "relative min-h-0 flex-1",
                isDocumentChrome ? modeStyles.desktop : modeStyles[deviceMode],
                isDocumentChrome && "mx-auto w-full max-w-4xl shadow-xl ring-1 ring-black/5 dark:ring-white/10"
              )}
            >
              <iframe
                ref={iframeRef}
                key={sandboxId}
                src={iframeSrc}
                title={isDocumentChrome ? "Lemnity Document" : "Lemnity Preview"}
                className={cn(
                  "absolute inset-0 h-full w-full border-0 bg-background",
                  isDocumentChrome ? "rounded-lg" : "rounded-md"
                )}
              />
              {visualEditMode && !iframeBlocked ? (
                <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center p-2 sm:justify-end sm:p-4">
                  <div className="pointer-events-auto flex w-full max-w-md flex-col gap-1.5">
                    <ElementEditorPanel
                      ref={visualEditorPanelRef}
                      snapshot={visualSelectedCount <= 1 ? visualSnapshot : null}
                      sandboxId={sandboxId}
                      labels={editorPanelLabels}
                      onSubmitPayload={handleApplyVisualEdit}
                      onDeleteBlock={handleVisualDeleteBlock}
                      onCloneBlock={handleVisualCloneBlock}
                      onClose={handleDismissVisualEditor}
                    />
                    <p className="rounded-md border border-border/45 bg-background/92 px-2.5 py-1.5 text-center text-[10px] leading-snug text-muted-foreground shadow-md backdrop-blur-sm dark:bg-zinc-950/92">
                      {t("build_visual_agent_hint")}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
