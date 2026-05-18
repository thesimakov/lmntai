"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BuildPublishDialog } from "@/components/playground/build-publish-dialog";
import { BuildSharePopover } from "@/components/playground/build-share-popover";
import { PlaygroundSharePublishActions } from "@/components/playground/build-topbar";
import { LemnityBoxVisualEditor, type LemnityBoxVisualEditorHandle } from "@/components/playground/lemnity-box-visual-editor";
import { PlaygroundStudioChrome } from "@/components/playground/playground-studio-chrome";
import { PageTransition } from "@/components/page-transition";
import { useI18n } from "@/components/i18n-provider";
import { getEmptyBoxStarterCanvas } from "@/lib/box-new-page-starters";
import { fetchCmsPageDocument, saveCmsPageDraft } from "@/lib/cms-editor-client";
import { writeLemnityBoxCanvasDraft } from "@/lib/lemnity-box-editor-persistence";
import { emptyPageDocument, type PageDocument } from "@/lib/lemnity-box-editor-schema";
import { mergeLemnityBoxSectionMotionCss } from "@/lib/lemnity-box-section-motion";
import { pushLemnityBoxCanvasToSandbox } from "@/lib/lemnity-box-push-sandbox";
import { readBuilderHandoff } from "@/lib/landing-handoff";
import { resolvePublishOpenUrl, resolveShareablePreviewUrl } from "@/lib/preview-share";
import { startZeroBlockSession, extractZeroBlockSection } from "@/lib/lemnity-zero-block-session";

const BOX_TEMPLATE_BOOTSTRAP_JSON = {
  universal: "/box-templates/wpriver-saveweb/grapes-bootstrap.json",
  consultation: "/box-templates/consultation-masco/grapes-bootstrap.json",
} as const;

type RemoteBoxStarter = keyof typeof BOX_TEMPLATE_BOOTSTRAP_JSON;

function isRemoteBoxStarter(param: string | null): param is RemoteBoxStarter {
  return param !== null && Object.hasOwn(BOX_TEMPLATE_BOOTSTRAP_JSON, param);
}

export default function PlaygroundLemnityBoxEditorPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [editorFailed, setEditorFailed] = useState(false);
  const onInitError = useCallback(() => setEditorFailed(true), []);
  const [canvasKey, setCanvasKey] = useState(0);

  const sandboxId = searchParams.get("sandboxId")?.trim() || null;
  const projectIdParam = searchParams.get("projectId")?.trim() || null;
  const cmsSiteId = searchParams.get("siteId")?.trim() || null;
  const cmsPageId = searchParams.get("pageId")?.trim() || null;
  const cmsProjectId = searchParams.get("projectId")?.trim() || null;
  const cmsPagePathRaw = searchParams.get("pagePath")?.trim();
  const cmsPagePath = cmsPagePathRaw && cmsPagePathRaw.length > 0 ? cmsPagePathRaw : "/";
  const cmsMode = Boolean(cmsSiteId && cmsPageId);
  const boxStarterParam = searchParams.get("boxStarter")?.trim() ?? null;
  const effectiveSandboxId = sandboxId ?? projectIdParam;
  const previewUrlFromQuery = searchParams.get("previewUrl")?.trim() || null;
  const [cmsBootstrap, setCmsBootstrap] = useState<PageDocument | undefined>(undefined);
  const [cmsLoading, setCmsLoading] = useState(cmsMode);

  const previewUrl = useMemo(() => {
    if (previewUrlFromQuery) {
      try {
        return decodeURIComponent(previewUrlFromQuery);
      } catch {
        return previewUrlFromQuery;
      }
    }
    if (effectiveSandboxId) {
      return `/api/sandbox/${encodeURIComponent(effectiveSandboxId)}`;
    }
    return null;
  }, [effectiveSandboxId, previewUrlFromQuery]);

  const [shareIsPublic, setShareIsPublic] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [readyForPublish, setReadyForPublish] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const canvasRef = useRef<LemnityBoxVisualEditorHandle>(null);
  const canvasOptionsDockRef = useRef<HTMLDivElement | null>(null);
  const canvasDeviceDockRef = useRef<HTMLDivElement | null>(null);

  const seedText = useMemo(() => {
    const handoff = readBuilderHandoff();
    const idea = handoff?.idea?.trim();
    return idea && idea.length > 0 ? idea : "";
  }, []);

  const [sandboxBootstrapDocument, setSandboxBootstrapDocument] = useState<PageDocument | undefined>(undefined);

  useEffect(() => {
    if (cmsMode) {
      setSandboxBootstrapDocument(undefined);
      return;
    }
    if (boxStarterParam !== "empty" && !isRemoteBoxStarter(boxStarterParam)) {
      setSandboxBootstrapDocument(undefined);
      return;
    }

    const title = seedText.trim() || t("projects_box_default_title");

    if (boxStarterParam === "empty") {
      const doc = emptyPageDocument(title);
      doc.grapesjs = getEmptyBoxStarterCanvas();
      setSandboxBootstrapDocument(doc);
      return;
    }

    let cancelled = false;
    setSandboxBootstrapDocument(undefined);

    const bootstrapUrl = BOX_TEMPLATE_BOOTSTRAP_JSON[boxStarterParam];

    void fetch(bootstrapUrl)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ html: string; css: string }>;
      })
      .then((bundle) => {
        if (cancelled) return;
        const doc = emptyPageDocument(title);
        doc.grapesjs = {
          html: bundle.html,
          css: mergeLemnityBoxSectionMotionCss(bundle.css),
        };
        setSandboxBootstrapDocument(doc);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error(t("projects_box_saveweb_load_failed"));
        const doc = emptyPageDocument(title);
        doc.grapesjs = getEmptyBoxStarterCanvas();
        setSandboxBootstrapDocument(doc);
      });

    return () => {
      cancelled = true;
    };
  }, [boxStarterParam, cmsMode, seedText, t]);

  const templateBootstrapPending =
    !cmsMode && isRemoteBoxStarter(boxStarterParam) && sandboxBootstrapDocument === undefined;

  const planFromSession = String(session?.user?.plan ?? "");
  const hasCustomDomainAccess = planFromSession === "PRO" || planFromSession === "TEAM" || planFromSession === "BUSINESS";

  const hasPreview = Boolean(previewUrl);
  const publishDisabled = cmsMode ? !readyForPublish : !previewUrl || !effectiveSandboxId || !readyForPublish;

  const handlePublishOpen = useCallback(async () => {
    if (cmsMode && cmsSiteId) {
      try {
        setPublishPending(true);
        const res = await fetch(`/api/cms/sites/${encodeURIComponent(cmsSiteId)}/publish`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const msg = (await res.text().catch(() => "")) || "Не удалось опубликовать CMS-сайт";
          toast.error(msg);
          return;
        }
        toast.success("CMS-сайт опубликован");
      } finally {
        setPublishPending(false);
      }
      return;
    }
    setPublishDialogOpen(true);
  }, [cmsMode, cmsSiteId]);

  const handleSave = useCallback(async () => {
    setSavePending(true);
    try {
      const snap = canvasRef.current?.flushCanvasSnapshot();
      if (!snap) {
        toast.error(t("build_box_status_error"));
        setReadyForPublish(false);
        return;
      }
      writeLemnityBoxCanvasDraft(snap);

      if (cmsMode && cmsSiteId && cmsPageId) {
        const saved = await saveCmsPageDraft(cmsSiteId, cmsPageId, snap);
        if (!saved.ok) {
          toast.error(t("playground_box_save_push_failed"), { description: saved.message });
          setReadyForPublish(false);
          return;
        }
        toast.success("Черновик CMS-страницы сохранён");
        if (cmsProjectId) {
          const pushed = await pushLemnityBoxCanvasToSandbox(cmsProjectId, snap, {
            title: cmsBootstrap?.title?.trim() || undefined,
            cmsFormBridge: { siteId: cmsSiteId, pageId: cmsPageId, pagePath: cmsPagePath },
          });
          if (!pushed.ok) {
            toast.warning("Превью не обновлено", {
              description:
                pushed.message ||
                "Не удалось записать index.html в проект — формы на превью могут не отправляться.",
            });
          } else if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("lemnity:sandbox-files-updated", { detail: { sandboxId: String(cmsProjectId) } }),
            );
          }
        }
      } else if (effectiveSandboxId) {
        const pushed = await pushLemnityBoxCanvasToSandbox(effectiveSandboxId, snap);
        if (!pushed.ok) {
          toast.error(t("playground_box_save_push_failed"), { description: pushed.message });
          setReadyForPublish(false);
          return;
        }
        toast.success(t("playground_box_save_pushed_toast"));
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("lemnity:sandbox-files-updated", { detail: { sandboxId: String(effectiveSandboxId) } })
          );
        }
      } else {
        toast.success(t("playground_box_saved_toast"));
      }
      setReadyForPublish(true);
    } finally {
      setSavePending(false);
    }
  }, [
    cmsBootstrap?.title,
    cmsMode,
    cmsPageId,
    cmsPagePath,
    cmsProjectId,
    cmsSiteId,
    effectiveSandboxId,
    t,
  ]);

  const handleOpenZeroBlockEditor = useCallback(async (blockId: string) => {
    if (typeof window === "undefined") return;
    const snap = canvasRef.current?.flushCanvasSnapshot();
    if (!snap) { toast.error(t("build_box_status_error")); return; }
    writeLemnityBoxCanvasDraft(snap);
    const sectionHtml = extractZeroBlockSection(snap.html, blockId);
    if (!sectionHtml) { toast.error("Нулевой блок не найден в документе"); return; }
    const canvasBodyWidth = canvasRef.current?.getCanvasBodyWidth?.() ?? 1200;
    startZeroBlockSession({
      blockId,
      sectionHtml,
      fullHtml: snap.html,
      css: snap.css,
      returnUrl: window.location.href,
      canvasBodyWidth,
      ...(cmsMode && cmsSiteId ? { cmsSiteId } : {}),
      ...(cmsMode && cmsPageId ? { cmsPageId } : {}),
      ...(effectiveSandboxId ? { cmsProjectId: effectiveSandboxId } : {}),
      ...(cmsMode ? { cmsPagePath } : {}),
    });
    router.push(`/playground/box/editor/zero?blockId=${encodeURIComponent(blockId)}`);
  }, [cmsMode, cmsPageId, cmsPagePath, cmsSiteId, effectiveSandboxId, router, t]);

  const handlePublishConfirm = useCallback(
    async (detail: { openUrl: string }) => {
      if (typeof window === "undefined") return;
      const rawOk = resolveShareablePreviewUrl(previewUrl, window.location.origin);
      if (!rawOk || !effectiveSandboxId) {
        toast.error(t("playground_build_publish_no_preview"));
        return;
      }
      const origin = window.location.origin;
      try {
        setPublishPending(true);
        if (!shareIsPublic) {
          let res = await fetch("/api/sandbox/share", { method: "POST" });
          if (res.status === 404) {
            res = await fetch(`/api/sandbox/${encodeURIComponent(effectiveSandboxId)}/share`, { method: "POST" });
          }
          if (!res.ok) {
            const msg = await res.text();
            toast.error(msg || t("playground_build_share_error_instant"));
            return;
          }
          setShareIsPublic(true);
        }
        const publicUrl = resolvePublishOpenUrl(origin, effectiveSandboxId, detail?.openUrl);
        window.open(publicUrl, "_blank", "noopener,noreferrer");
        setPublishDialogOpen(false);
        toast.message(t("playground_build_publish_opened"));
      } finally {
        setPublishPending(false);
      }
    },
    [previewUrl, effectiveSandboxId, shareIsPublic, t]
  );

  useEffect(() => {
    if (!effectiveSandboxId) {
      setShareIsPublic(false);
    }
  }, [effectiveSandboxId]);

  // After returning from zero block editor: force canvas remount to pick up patched localStorage draft
  useEffect(() => {
    const saved = searchParams.get("zeroBlockSaved");
    if (!saved) return;
    setCanvasKey((k) => k + 1);
    // Clean the URL param without re-navigating
    const url = new URL(window.location.href);
    url.searchParams.delete("zeroBlockSaved");
    window.history.replaceState(null, "", url.toString());
  }, [searchParams]);

  useEffect(() => {
    if (!cmsMode || !cmsSiteId || !cmsPageId) {
      setCmsLoading(false);
      setCmsBootstrap(undefined);
      return;
    }
    let active = true;
    setCmsLoading(true);
    setCmsBootstrap(undefined);
    void fetchCmsPageDocument(cmsSiteId, cmsPageId)
      .then((doc) => {
        if (!active) return;
        if (doc) setCmsBootstrap(doc);
      })
      .finally(() => {
        if (active) setCmsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cmsMode, cmsPageId, cmsSiteId]);

  const cmsHeaderPageTitle =
    cmsMode && !cmsLoading && cmsBootstrap?.title?.trim().length ? cmsBootstrap.title.trim() : null;

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-2">
        <PlaygroundStudioChrome
          backHref="/playground"
          backLabel={t("playground_box_editor_back")}
          contextLine={
            cmsHeaderPageTitle ? (
              <span className="truncate text-muted-foreground" title={cmsHeaderPageTitle}>
                · {cmsHeaderPageTitle}
              </span>
            ) : null
          }
          endSlot={
            <div className="max-w-[100vw] sm:max-w-none">
              <PlaygroundSharePublishActions
                leadingSlot={
                  <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                    <div
                      ref={canvasDeviceDockRef}
                      className="playground-box-device-dock flex min-w-0 shrink-0 items-center"
                      aria-label="Вид макета"
                    />
                    <div
                      ref={canvasOptionsDockRef}
                      className="playground-box-options-dock flex min-w-0 shrink-0 flex-wrap items-center gap-0.5"
                      aria-label="Режимы редактора"
                    />
                  </div>
                }
                sandboxId={effectiveSandboxId}
                onSave={handleSave}
                saveDisabled={savePending}
                savePending={savePending}
                shareMenu={
                  cmsMode ? null : (
                    <BuildSharePopover
                      sandboxId={effectiveSandboxId}
                      hasPreview={hasPreview}
                      shareIsPublic={shareIsPublic}
                      onShareIsPublicChange={setShareIsPublic}
                      t={t}
                    />
                  )
                }
                onPublish={handlePublishOpen}
                publishDisabled={publishDisabled}
                showStudioMenu={false}
              />
            </div>
          }
        />

        {editorFailed ? <p className="shrink-0 text-sm text-destructive">{t("build_box_status_error")}</p> : null}
        {cmsLoading ? <p className="shrink-0 text-sm text-muted-foreground">Загрузка CMS-страницы…</p> : null}
        {templateBootstrapPending ? (
          <p className="inline-flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            {t("projects_box_saveweb_loading")}
          </p>
        ) : null}

        <div className="flex min-h-[min(100dvh,900px)] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card/40 shadow-sm md:min-h-[50vh]">
          {!cmsBootstrap && templateBootstrapPending ? (
            <div className="flex min-h-[360px] flex-1 items-center justify-center bg-muted/20">
              <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : (
            <LemnityBoxVisualEditor
            key={canvasKey}
            ref={canvasRef}
            canvasTopDeviceDockRef={canvasDeviceDockRef}
            canvasTopOptionsDockRef={canvasOptionsDockRef}
            {...(cmsBootstrap
              ? { bootstrapDocument: cmsBootstrap }
              : sandboxBootstrapDocument
                ? { bootstrapDocument: sandboxBootstrapDocument }
                : {})}
            className="h-full min-h-[360px] w-full flex-1"
            onInitError={onInitError}
            onCanvasChange={() => setReadyForPublish(false)}
            onOpenZeroBlockEditor={handleOpenZeroBlockEditor}
            />
          )}
        </div>
      </div>

      {!cmsMode ? (
        <BuildPublishDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          onPublish={handlePublishConfirm}
          publishPending={publishPending}
          sandboxId={effectiveSandboxId}
          seedText={seedText}
          hasCustomDomainAccess={hasCustomDomainAccess}
        />
      ) : null}
    </PageTransition>
  );
}
