"use client";

import JSZip from "jszip";
import { Download, ExternalLink, Monitor, Presentation, Smartphone, Tablet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { downloadHtmlAsPdf } from "@/lib/export-html-pdf";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { attachVisualPreviewEditor, serializeIframeDocument } from "@/lib/visual-preview-editor";
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
  presentationPdfExport = null
}: PreviewFrameProps) {
  const { t } = useI18n();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [exportTask, setExportTask] = useState<ExportTask>(null);
  const [savePending, setSavePending] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(previewUrl);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const detachEditorRef = useRef<(() => void) | null>(null);
  const imgTargetRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isPptx = isPptxArtifact(mimeType);
  const exportBusy = exportTask !== null;

  const showResumeExports = projectKind === "resume" && !isPptx;
  const showPresentationHtmlPdf = projectKind === "presentation" && !isPptx;

  useEffect(() => {
    setIframeSrc(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!visualEditMode || isPptx) {
      detachEditorRef.current?.();
      detachEditorRef.current = null;
      setIframeBlocked(false);
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
      detachEditorRef.current?.();
      detachEditorRef.current = attachVisualPreviewEditor(doc, {
        onImageActivate: (img) => {
          imgTargetRef.current = img;
          fileInputRef.current?.click();
        }
      });
    }

    function onLoad() {
      const el = iframeRef.current;
      if (!el) return;
      const doc = el.contentDocument;
      if (!doc) {
        setIframeBlocked(true);
        detachEditorRef.current?.();
        detachEditorRef.current = null;
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
      detachEditorRef.current?.();
      detachEditorRef.current = null;
    };
  }, [visualEditMode, isPptx, iframeSrc]);

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
    setExportTask("pptx");
    try {
      const response = await fetch(previewUrl, { credentials: "include" });
      await downloadBlobFromResponse(
        response,
        downloadFilename?.trim() || `presentation-${sandboxId.slice(0, 8)}.pptx`
      );
    } catch (e) {
      toast.error(t("build_export_failed"), { description: (e as Error).message });
    } finally {
      setExportTask(null);
    }
  }

  async function handleDownloadServerPdf() {
    if (!presentationPdfExport) return;
    setExportTask("pdfServer");
    try {
      const response = await fetch(presentationPdfExport.url, { credentials: "include" });
      await downloadBlobFromResponse(response, presentationPdfExport.filename);
    } catch (e) {
      toast.error(t("build_export_failed"), { description: (e as Error).message });
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
      toast.error(t("build_export_failed"), { description: (e as Error).message });
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
      toast.error(t("build_export_docx_error"), { description: (e as Error).message });
    } finally {
      setExportTask(null);
    }
  }

  async function handleClientPdf() {
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
      toast.error(t("build_export_pdf_error"), { description: (e as Error).message });
    } finally {
      setExportTask(null);
    }
  }

  function bumpIframeCache(reason: "edit" | "recover") {
    const u = new URL(previewUrl, typeof window !== "undefined" ? window.location.href : "http://localhost");
    u.searchParams.set(reason === "edit" ? "_edit" : "_recover", String(Date.now()));
    setIframeSrc(`${u.pathname}${u.search}${u.hash}`);
  }

  async function handleSaveVisual() {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !visualEditPersist) return;

    setSavePending(true);
    try {
      const html = serializeIframeDocument(doc);
      const isBridgeArtifact =
        sandboxId.startsWith("artifact_") || previewUrl.includes("/api/lemnity-ai/artifacts/");
      const res = isBridgeArtifact
        ? await fetch(`/api/lemnity-ai/artifacts/${encodeURIComponent(sandboxId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ html })
          })
        : await fetch(`/api/sandbox/${sandboxId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ html })
          });
      if (!res.ok) {
        const msg =
          res.status === 413
            ? t("build_visual_html_too_large")
            : (await res.text().catch(() => "")) || res.statusText;
        throw new Error(msg);
      }
      toast.success(t("build_visual_saved"));
      bumpIframeCache("edit");
    } catch (e) {
      toast.error(t("build_visual_save_failed"), {
        description: (e as Error).message || undefined
      });
      bumpIframeCache("recover");
    } finally {
      setSavePending(false);
    }
  }

  function onImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const img = imgTargetRef.current;
    imgTargetRef.current = null;
    e.target.value = "";
    if (!file || !img) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("build_visual_replace_image"), { description: t("build_visual_image_type_error") });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        aria-label={t("build_visual_replace_image")}
        onChange={onImageFileChange}
      />

      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5">
        {!isPptx
          ? controlButtons.map((row) => {
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
              Файл PowerPoint (.pptx) — скачайте и откройте в Keynote / PowerPoint / Google Slides (импорт).
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
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={exportBusy}
              onClick={() => void handleClientPdf()}
            >
              {exportTask === "pdfClient" ? "…" : t("build_export_pdf")}
            </Button>
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
          ) : (
            <Button size="sm" className="h-8" onClick={() => void handleExportZip()} disabled={exportBusy}>
              <Download className="h-4 w-4" />
              {exportTask === "zip" ? "…" : t("build_export_zip")}
            </Button>
          )}
          {!isPptx ? (
            <Button size="sm" variant="outline" className="h-8" onClick={() => window.open(previewUrl, "_blank")}>
              <ExternalLink className="h-4 w-4" />
              {t("build_preview_open_tab")}
            </Button>
          ) : null}
        </div>
      </div>

      {visualEditMode && !isPptx ? (
        <p
          className={cn(
            "shrink-0 rounded-md border px-2 py-1.5 text-xs",
            iframeBlocked
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          {iframeBlocked
            ? t("build_visual_no_iframe_access")
            : visualEditPersist
              ? t("build_visual_edit_hint")
              : t("build_visual_read_only_hint")}
        </p>
      ) : null}

      {isPptx ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/20 p-8 text-center">
          <Presentation className="h-16 w-16 text-primary/80" strokeWidth={1.25} />
          <div className="max-w-md space-y-2">
            <p className="text-base font-medium text-foreground">Презентация готова</p>
            <p className="text-sm text-muted-foreground">
              Превью HTML для .pptx недоступно. Скачайте файл и откройте в редакторе презентаций.
            </p>
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-muted/20 p-2">
          <div className={cn(modeStyles[deviceMode], "relative min-h-0 flex-1")}>
            <iframe
              ref={iframeRef}
              key={iframeSrc}
              src={iframeSrc}
              title="Lemnity Preview"
              className="absolute inset-0 h-full w-full rounded-md border-0 bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}
