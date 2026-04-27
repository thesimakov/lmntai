"use client";

import JSZip from "jszip";
import { Download, ExternalLink, Monitor, Presentation, Smartphone, Tablet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { downloadHtmlAsPdf } from "@/lib/export-html-pdf";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { SITE_URL } from "@/lib/site";
import {
  attachVisualPreviewEditor,
  formatVisualPickLabel,
  serializeIframeDocument
} from "@/lib/visual-preview-editor";
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
  /** Редактор Puck (второй iframe при включённом визуальном режиме) */
  puckEditorHref?: string | null;
};

type ExportTask = "zip" | "pptx" | "pdfServer" | "docx" | "pdfClient" | null;
type VisualQuickStyles = {
  padding: string;
  margin: string;
  borderRadius: string;
  borderWidth: string;
  fontSize: string;
  width: string;
  height: string;
  color: string;
  backgroundColor: string;
  fontWeight: string;
  textAlign: "left" | "center" | "right" | "justify";
};

function pxToInput(value: string): string {
  const raw = value.trim();
  if (!raw || /\s/.test(raw)) return "";
  const m = raw.match(/^(-?\d+(?:\.\d+)?)px$/i);
  if (!m) return "";
  return String(Number(m[1]));
}

function readQuickStyles(el: HTMLElement): VisualQuickStyles {
  const doc = el.ownerDocument;
  const computed = doc.defaultView?.getComputedStyle(el);
  const alignRaw = (el.style.textAlign || computed?.textAlign || "left").trim().toLowerCase();
  const textAlign: VisualQuickStyles["textAlign"] =
    alignRaw === "center" || alignRaw === "right" || alignRaw === "justify" ? alignRaw : "left";
  return {
    padding: pxToInput(el.style.padding || computed?.padding || ""),
    margin: pxToInput(el.style.margin || computed?.margin || ""),
    borderRadius: pxToInput(el.style.borderRadius || computed?.borderRadius || ""),
    borderWidth: pxToInput(el.style.borderWidth || computed?.borderWidth || ""),
    fontSize: pxToInput(el.style.fontSize || computed?.fontSize || ""),
    width: pxToInput(el.style.width || computed?.width || ""),
    height: pxToInput(el.style.height || computed?.height || ""),
    color: (el.style.color || computed?.color || "").trim(),
    backgroundColor: (el.style.backgroundColor || computed?.backgroundColor || "").trim(),
    fontWeight: (el.style.fontWeight || computed?.fontWeight || "400").trim(),
    textAlign
  };
}

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
  previewVariant = "default",
  puckEditorHref = null
}: PreviewFrameProps) {
  const { t } = useI18n();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [exportTask, setExportTask] = useState<ExportTask>(null);
  const [savePending, setSavePending] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(previewUrl);
  const [visualPickLabel, setVisualPickLabel] = useState<string | null>(null);
  const [visualQuickStyles, setVisualQuickStyles] = useState<VisualQuickStyles | null>(null);
  const [visualSelectedCount, setVisualSelectedCount] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const detachEditorRef = useRef<(() => void) | null>(null);
  const imgTargetRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!visualEditMode || isPptx) {
      detachEditorRef.current?.();
      detachEditorRef.current = null;
      setIframeBlocked(false);
      setVisualPickLabel(null);
      setVisualQuickStyles(null);
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
      detachEditorRef.current?.();
      detachEditorRef.current = attachVisualPreviewEditor(doc, {
        onImageActivate: (img) => {
          imgTargetRef.current = img;
          fileInputRef.current?.click();
        },
        onSelectionChange: (info, element, elements) => {
          setVisualPickLabel(info ? formatVisualPickLabel(info) : null);
          setVisualSelectedCount(elements.length);
          if (element instanceof HTMLElement) {
            setVisualQuickStyles(readQuickStyles(element));
          } else {
            setVisualQuickStyles(null);
          }
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

  function getSelectedVisualElements(): HTMLElement[] {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return [];
    return Array.from(doc.querySelectorAll("[data-lemnity-selected='1']")).filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    );
  }

  function getSelectedVisualElement(): HTMLElement | null {
    const all = getSelectedVisualElements();
    return all.length > 0 ? all[all.length - 1] : null;
  }

  function applyQuickStyle(prop: keyof VisualQuickStyles, value: string) {
    const selected = getSelectedVisualElements();
    if (selected.length === 0) return;
    const normalized = value.trim();
    const cssPx = normalized === "" ? "" : `${normalized}px`;
    if (prop === "padding") {
      selected.forEach((el) => {
        if (cssPx) el.style.padding = cssPx;
        else el.style.removeProperty("padding");
      });
    }
    if (prop === "margin") {
      selected.forEach((el) => {
        if (cssPx) el.style.margin = cssPx;
        else el.style.removeProperty("margin");
      });
    }
    if (prop === "borderRadius") {
      selected.forEach((el) => {
        if (cssPx) el.style.borderRadius = cssPx;
        else el.style.removeProperty("border-radius");
      });
    }
    if (prop === "borderWidth") {
      selected.forEach((el) => {
        if (cssPx) el.style.borderWidth = cssPx;
        else el.style.removeProperty("border-width");
      });
    }
    if (prop === "fontSize") {
      selected.forEach((el) => {
        if (cssPx) el.style.fontSize = cssPx;
        else el.style.removeProperty("font-size");
      });
    }
    if (prop === "width") {
      selected.forEach((el) => {
        if (cssPx) el.style.width = cssPx;
        else el.style.removeProperty("width");
      });
    }
    if (prop === "height") {
      selected.forEach((el) => {
        if (cssPx) el.style.height = cssPx;
        else el.style.removeProperty("height");
      });
    }
    if (prop === "color") {
      selected.forEach((el) => {
        if (normalized) el.style.color = normalized;
        else el.style.removeProperty("color");
      });
    }
    if (prop === "backgroundColor") {
      selected.forEach((el) => {
        if (normalized) el.style.backgroundColor = normalized;
        else el.style.removeProperty("background-color");
      });
    }
    if (prop === "fontWeight") {
      selected.forEach((el) => {
        if (normalized) el.style.fontWeight = normalized;
        else el.style.removeProperty("font-weight");
      });
    }
    if (prop === "textAlign") {
      selected.forEach((el) => {
        if (normalized) el.style.textAlign = normalized as VisualQuickStyles["textAlign"];
        else el.style.removeProperty("text-align");
      });
    }
    setVisualQuickStyles((prev) => {
      const next: VisualQuickStyles = {
        ...(prev ?? {
          padding: "",
          margin: "",
          borderRadius: "",
          borderWidth: "",
          fontSize: "",
          width: "",
          height: "",
          color: "",
          backgroundColor: "",
          fontWeight: "400",
          textAlign: "left"
        })
      };
      if (prop === "padding") next.padding = normalized;
      else if (prop === "margin") next.margin = normalized;
      else if (prop === "borderRadius") next.borderRadius = normalized;
      else if (prop === "borderWidth") next.borderWidth = normalized;
      else if (prop === "fontSize") next.fontSize = normalized;
      else if (prop === "width") next.width = normalized;
      else if (prop === "height") next.height = normalized;
      else if (prop === "color") next.color = normalized;
      else if (prop === "backgroundColor") next.backgroundColor = normalized;
      else if (prop === "fontWeight") next.fontWeight = normalized || "400";
      else if (prop === "textAlign") {
        next.textAlign = normalized === "center" || normalized === "right" || normalized === "justify" ? normalized : "left";
      }
      return next;
    });
  }

  function resetQuickStyles() {
    const all = getSelectedVisualElements();
    if (all.length === 0) return;
    all.forEach((selected) => {
      selected.style.removeProperty("padding");
      selected.style.removeProperty("margin");
      selected.style.removeProperty("border-radius");
      selected.style.removeProperty("border-width");
      selected.style.removeProperty("font-size");
      selected.style.removeProperty("width");
      selected.style.removeProperty("height");
      selected.style.removeProperty("color");
      selected.style.removeProperty("background-color");
      selected.style.removeProperty("font-weight");
      selected.style.removeProperty("text-align");
    });
    const primary = getSelectedVisualElement();
    setVisualQuickStyles(primary ? readQuickStyles(primary) : null);
  }

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
      toast.error(t("build_export_failed"), { description: (e as Error).message });
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
              ? `${t("build_visual_edit_hint")}${visualPickLabel ? ` ${t("build_visual_pick_selected").replace("{tag}", visualPickLabel)}` : ""}`
              : `${t("build_visual_read_only_hint")}${visualPickLabel ? ` ${t("build_visual_pick_selected").replace("{tag}", visualPickLabel)}` : ""}`}
        </p>
      ) : null}
      {visualEditMode && !isPptx && visualEditPersist && !iframeBlocked && visualQuickStyles ? (
        <div className="shrink-0 rounded-md border border-border bg-muted/30 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{t("build_visual_quick_styles")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("build_visual_multi_select_hint")}
                {visualSelectedCount > 0
                  ? ` · ${t("build_visual_selected_count").replace("{count}", String(visualSelectedCount))}`
                  : ""}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={resetQuickStyles}>
              {t("build_visual_style_reset")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_padding")}</span>
              <input
                inputMode="decimal"
                value={visualQuickStyles.padding}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.-]/g, "");
                  setVisualQuickStyles((prev) => (prev ? { ...prev, padding: next } : prev));
                  applyQuickStyle("padding", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="0"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_margin")}</span>
              <input
                inputMode="decimal"
                value={visualQuickStyles.margin}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.-]/g, "");
                  setVisualQuickStyles((prev) => (prev ? { ...prev, margin: next } : prev));
                  applyQuickStyle("margin", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="0"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_radius")}</span>
              <input
                inputMode="decimal"
                value={visualQuickStyles.borderRadius}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.-]/g, "");
                  setVisualQuickStyles((prev) => (prev ? { ...prev, borderRadius: next } : prev));
                  applyQuickStyle("borderRadius", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="0"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_border_width")}</span>
              <input
                inputMode="decimal"
                value={visualQuickStyles.borderWidth}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.-]/g, "");
                  setVisualQuickStyles((prev) => (prev ? { ...prev, borderWidth: next } : prev));
                  applyQuickStyle("borderWidth", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="0"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_font_size")}</span>
              <input
                inputMode="decimal"
                value={visualQuickStyles.fontSize}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.-]/g, "");
                  setVisualQuickStyles((prev) => (prev ? { ...prev, fontSize: next } : prev));
                  applyQuickStyle("fontSize", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="16"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_font_weight")}</span>
              <select
                value={visualQuickStyles.fontWeight}
                onChange={(e) => {
                  const next = e.target.value;
                  setVisualQuickStyles((prev) => (prev ? { ...prev, fontWeight: next } : prev));
                  applyQuickStyle("fontWeight", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="800">800</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_width")}</span>
              <input
                inputMode="decimal"
                value={visualQuickStyles.width}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.-]/g, "");
                  setVisualQuickStyles((prev) => (prev ? { ...prev, width: next } : prev));
                  applyQuickStyle("width", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="auto"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_height")}</span>
              <input
                inputMode="decimal"
                value={visualQuickStyles.height}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.-]/g, "");
                  setVisualQuickStyles((prev) => (prev ? { ...prev, height: next } : prev));
                  applyQuickStyle("height", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="auto"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_color")}</span>
              <input
                value={visualQuickStyles.color}
                onChange={(e) => {
                  const next = e.target.value;
                  setVisualQuickStyles((prev) => (prev ? { ...prev, color: next } : prev));
                  applyQuickStyle("color", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="#111827 / rgb(17,24,39)"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_background")}</span>
              <input
                value={visualQuickStyles.backgroundColor}
                onChange={(e) => {
                  const next = e.target.value;
                  setVisualQuickStyles((prev) => (prev ? { ...prev, backgroundColor: next } : prev));
                  applyQuickStyle("backgroundColor", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="#ffffff / rgba(255,255,255,.9)"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[11px] text-muted-foreground">{t("build_visual_style_text_align")}</span>
              <select
                value={visualQuickStyles.textAlign}
                onChange={(e) => {
                  const next = e.target.value as VisualQuickStyles["textAlign"];
                  setVisualQuickStyles((prev) => (prev ? { ...prev, textAlign: next } : prev));
                  applyQuickStyle("textAlign", next);
                }}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="left">{t("build_visual_align_left")}</option>
                <option value="center">{t("build_visual_align_center")}</option>
                <option value="right">{t("build_visual_align_right")}</option>
                <option value="justify">{t("build_visual_align_justify")}</option>
              </select>
            </label>
          </div>
        </div>
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
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border p-2",
            isDocumentChrome ? "bg-zinc-200/70 dark:bg-zinc-900/60" : "bg-muted/20"
          )}
        >
          {visualEditMode && puckEditorHref && !isDocumentChrome ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
              <p className="shrink-0 text-[11px] leading-snug text-muted-foreground">{t("build_visual_puck_split_hint")}</p>
              <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
                <div className={cn("relative min-h-[200px] min-w-0 flex-1 lg:min-h-0", modeStyles[deviceMode])}>
                  <iframe
                    ref={iframeRef}
                    key={iframeSrc}
                    src={iframeSrc}
                    title="Lemnity Preview"
                    className="absolute inset-0 h-full w-full rounded-md border-0 bg-background"
                  />
                </div>
                <div className="relative flex min-h-[min(40vh,380px)] min-w-0 flex-1 flex-col border-t border-border pt-2 lg:min-h-0 lg:max-w-[min(100%,52%)] lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                  <iframe
                    src={puckEditorHref}
                    title={t("puck_page_title")}
                    className="h-full min-h-[280px] w-full flex-1 rounded-md border-0 bg-background lg:min-h-0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "relative min-h-0 flex-1",
                isDocumentChrome ? modeStyles.desktop : modeStyles[deviceMode],
                isDocumentChrome && "mx-auto w-full max-w-4xl shadow-xl ring-1 ring-black/5 dark:ring-white/10"
              )}
            >
              <iframe
                ref={iframeRef}
                key={iframeSrc}
                src={iframeSrc}
                title={isDocumentChrome ? "Lemnity Document" : "Lemnity Preview"}
                className={cn(
                  "absolute inset-0 h-full w-full border-0 bg-background",
                  isDocumentChrome ? "rounded-lg" : "rounded-md"
                )}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
