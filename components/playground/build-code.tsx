"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileCode2, FolderOpen, ImageIcon } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import {
  parseGalleryMediaJson,
  projectImageGalleryDir,
  projectImageGalleryMediaPath,
  projectImageGalleryReadmePath
} from "@/lib/project-image-gallery";
import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";
import {
  extractLatestLemnityAiArtifactSandboxIdFromSessionEvents,
  sandboxFileMapLooksLikeJsonNotFound,
  textLooksLikeJsonApiNotFoundBody
} from "@/lib/lemnity-ai-bridge-session-artifact";
import { readStoredLemnityBuildManusSessionId } from "@/lib/lemnity-ai-build-session-storage";
import { cn } from "@/lib/utils";

type BridgeSessionsListEnvelope = {
  code?: number;
  data?: {
    sessions?: Array<{
      session_id?: string;
      project_id?: string;
      preview_artifact_id?: string | null;
    }>;
  };
};

/**
 * Восстанавливаем manus session id: сначала строка по Project.id, затем полный список пользователя.
 * Логирует HTTP/код/число строк — без этого невозможно отличить «нет строк в Prisma» от 401/404 моста.
 */
async function fetchManusSessionIdForEmptySandboxRepair(projectId: string): Promise<string | null> {
  // #region agent log
  const logListProbe = (data: Record<string, unknown>) => {
    fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9424d5" },
      body: JSON.stringify({
        sessionId: "9424d5",
        runId: "repair-v10",
        hypothesisId: "H_project_scope_sessions",
        location: "build-code.tsx:fetchManusSessionIdForEmptySandboxRepair",
        message: "manus_session_list_probe",
        data,
        timestamp: Date.now()
      })
    }).catch(() => {});
  };
  // #endregion

  async function loadSessions(url: string) {
    const res = await fetch(url, { method: "GET", credentials: "include" });
    const text = await res.text();
    let envelope: BridgeSessionsListEnvelope = {};
    try {
      envelope = JSON.parse(text) as BridgeSessionsListEnvelope;
    } catch {
      /* не JSON — оставляем envelope пустым */
    }
    const sessions = Array.isArray(envelope.data?.sessions) ? envelope.data!.sessions! : [];
    return { res, envelope, sessions, textHead: text.slice(0, 200) };
  }

  const scopedUrl = `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions?projectId=${encodeURIComponent(projectId)}`;
  let { res, envelope, sessions, textHead } = await loadSessions(scopedUrl);
  let tried: "project_param" | "project_then_all" = "project_param";

  const usable = res.ok && envelope.code === 0 && sessions.length > 0;
  if (!usable) {
    const fullUrl = `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`;
    const second = await loadSessions(fullUrl);
    tried = "project_then_all";
    res = second.res;
    envelope = second.envelope;
    sessions = second.sessions;
    textHead = second.textHead;
  }

  const ok = res.ok && envelope.code === 0 && sessions.length > 0;
  // #region agent log
  logListProbe({
    projectId,
    tried,
    httpStatus: res.status,
    apiCode: envelope.code ?? null,
    sessionCount: sessions.length,
    textHead: sessions.length ? "ok" : textHead
  });
  // #endregion

  if (!ok) return null;

  const byProject = sessions.find(
    (s) => typeof s.project_id === "string" && s.project_id === projectId
  );
  const withArtifact = sessions.find(
    (s) =>
      typeof s.preview_artifact_id === "string" && s.preview_artifact_id.trim().startsWith("artifact_")
  );
  const pick = byProject ?? withArtifact ?? sessions[0];
  const id = typeof pick?.session_id === "string" ? pick.session_id.trim() : "";

  // #region agent log
  logListProbe({
    projectId,
    tried,
    pickKind: byProject ? "by_project" : withArtifact ? "artifact" : "first",
    chosenPrefix: id ? id.slice(0, 14) : null
  });
  // #endregion

  return id || null;
}

type BuildCodeProps = {
  sandboxId: string | null;
  /** Превью из состояния страницы (для отладочных логов несогласованности id) */
  bridgePreviewUrl?: string | null;
  /** При «отравленной» песочнице пробуем восстановить HTML из события preview (artifact_*) */
  bridgeSessionRepair?: {
    upstreamSessionId: string;
  } | null;
  /** Если артефакт — бинарный (.pptx), исходник в редакторе не показываем */
  artifactMimeType?: string | null;
  className?: string;
};

function isPptxMime(m: string | null | undefined): boolean {
  if (!m) return false;
  return m.includes("presentationml") || m.includes("ms-powerpoint");
}

function sortFileKeys(
  keys: string[],
  galleryDir: string,
  galleryMediaPath: string,
  galleryReadmePath: string
): string[] {
  const galleryOrder = (p: string): number => {
    if (p === galleryMediaPath) return 0;
    if (p === galleryReadmePath) return 1;
    if (p.startsWith(`${galleryDir}/`)) return 2;
    if (p === "generated.txt") return 998;
    if (p === "puck.json") return 999;
    return 100;
  };
  return [...keys].sort((a, b) => {
    const ga = galleryOrder(a);
    const gb = galleryOrder(b);
    if (ga !== gb) return ga - gb;
    return a.localeCompare(b, "en", { sensitivity: "base" });
  });
}

export function BuildCode({
  sandboxId,
  bridgePreviewUrl,
  bridgeSessionRepair,
  artifactMimeType,
  className
}: BuildCodeProps) {
  const { t } = useI18n();
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPptxArtifact, setIsPptxArtifact] = useState(false);
  const [filesRefreshNonce, setFilesRefreshNonce] = useState(0);

  const galleryDir = useMemo(() => projectImageGalleryDir(sandboxId ?? "project"), [sandboxId]);
  const galleryMediaPath = useMemo(() => projectImageGalleryMediaPath(sandboxId ?? "project"), [sandboxId]);
  const galleryReadmePath = useMemo(() => projectImageGalleryReadmePath(sandboxId ?? "project"), [sandboxId]);

  const sortedKeys = useMemo(
    () => sortFileKeys(Object.keys(files), galleryDir, galleryMediaPath, galleryReadmePath),
    [files, galleryDir, galleryMediaPath, galleryReadmePath]
  );

  const gallery = useMemo(
    () => parseGalleryMediaJson(files[galleryMediaPath]),
    [files, galleryMediaPath]
  );

  const loadSandboxFiles = useCallback(async () => {
    if (!sandboxId) {
      setFiles({});
      setError(null);
      setIsPptxArtifact(false);
      setSelectedPath(null);
      return;
    }

    if (sandboxId.startsWith("artifact_") && isPptxMime(artifactMimeType)) {
      setFiles({});
      setError(null);
      setIsPptxArtifact(true);
      setSelectedPath(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsPptxArtifact(false);
    try {
      if (sandboxId.startsWith("artifact_")) {
        const artifactUrl = `/api/lemnity-ai/artifacts/${encodeURIComponent(sandboxId)}`;
        const res = await fetch(artifactUrl);
        const errBody = !res.ok ? await res.text() : "";
        // #region agent log
        fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9424d5" },
          body: JSON.stringify({
            sessionId: "9424d5",
            runId: "repair-v3",
            hypothesisId: "H1_H5",
            location: "build-code.tsx:loadSandboxFiles:artifact",
            message: "artifact_fetch",
            data: {
              sandboxId,
              url: artifactUrl,
              status: res.status,
              bodyPreview: errBody ? errBody.slice(0, 240) : "ok"
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        if (!res.ok) {
          throw new Error(errBody || res.statusText);
        }
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("presentationml") || ct.includes("ms-powerpoint")) {
          setIsPptxArtifact(true);
          setFiles({});
          return;
        }
        const text = await res.text();
        setFiles({ "index.html": text });
        setSelectedPath("index.html");
        return;
      }
      const sandboxUrl = `/api/sandbox/${sandboxId}?format=json`;
      const res = await fetch(sandboxUrl);
      const errBody = !res.ok ? await res.text() : "";
      if (!res.ok) {
        throw new Error(errBody || res.statusText);
      }
      const data = (await res.json()) as { files?: Record<string, string> };
      let filesOut: Record<string, string> = { ...(data.files ?? {}) };

      const poison = sandboxFileMapLooksLikeJsonNotFound(filesOut);
      const keyCount = Object.keys(filesOut).length;
      const baseRecoveryNeeds =
        !sandboxId.startsWith("artifact_") &&
        (poison || (keyCount === 0 && Boolean(bridgePreviewUrl?.trim())));
      let upstreamForRepair = bridgeSessionRepair?.upstreamSessionId?.trim() ?? "";
      let repairFromListFallback = false;
      /** Без привязки к fullParity: при пустой песочнице пробуем Prisma‑список сессий; при выключенном мосту GET просто вернёт 404. */
      if (!upstreamForRepair && baseRecoveryNeeds) {
        upstreamForRepair = (await fetchManusSessionIdForEmptySandboxRepair(sandboxId)) ?? "";
        repairFromListFallback = Boolean(upstreamForRepair);
      }
      const shouldTrySessionArtifactRecovery = Boolean(upstreamForRepair) && baseRecoveryNeeds;
      const ks = Object.keys(filesOut).slice(0, 10);
      const sampleHeads: Record<string, string> = {};
      for (const k of ks) {
        const raw = filesOut[k];
        if (typeof raw === "string") sampleHeads[k] = raw.slice(0, 160);
      }
      // #region agent log
      fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9424d5" },
        body: JSON.stringify({
          sessionId: "9424d5",
          runId: "repair-v9",
          hypothesisId: "H_list_fallback",
          location: "build-code.tsx:loadSandboxFiles:sandbox_json",
          message: "sandbox_json_parsed_probe",
          data: {
            sandboxId,
            bridgePreviewUrl: bridgePreviewUrl ?? null,
            url: sandboxUrl,
            status: res.status,
            bridgeRepairConfigured: Boolean(bridgeSessionRepair),
            repairUpstreamSessionId: upstreamForRepair || null,
            repairFromListFallback,
            storedManusPrefix: readStoredLemnityBuildManusSessionId()?.slice(0, 12) ?? null,
            keyCount,
            poisonWide: poison,
            tryArtifactRecovery: shouldTrySessionArtifactRecovery,
            sampleHeads
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      if (shouldTrySessionArtifactRecovery) {
        const sessRes = await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(upstreamForRepair)}`,
          {
            method: "GET",
            credentials: "include",
            /* На зарезервированном хосте без Host→project API требует заголовок (route.ts). На поддомене проекта резолв всё равно идёт по Host первым. */
            headers: { "X-Project-Id": upstreamForRepair }
          }
        );
        const sessBodyText = await sessRes.text();
        let artifactId: string | null = null;
        if (sessRes.ok) {
          try {
            const envelope = JSON.parse(sessBodyText) as { data?: { events?: unknown } };
            artifactId = extractLatestLemnityAiArtifactSandboxIdFromSessionEvents(envelope?.data?.events);
          } catch {
            artifactId = null;
          }
        }
        // #region agent log
        fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9424d5" },
          body: JSON.stringify({
            sessionId: "9424d5",
            runId: "repair-v9",
            hypothesisId: "H_session_not_sandbox_id",
            location: "build-code.tsx:loadSandboxFiles:repair",
            message: "sandbox_poison_session_lookup",
            data: {
              repairFromListFallback,
              sessionGetOk: sessRes.ok,
              sessionHttpStatus: sessRes.status,
              bodySnippet: sessBodyText.slice(0, 120),
              artifactId: artifactId ?? null,
              sandboxVsRepairUpstreamEqual: sandboxId === upstreamForRepair,
              sandboxPrefix: sandboxId?.slice(0, 14) ?? null,
              repairUpstreamPrefix: upstreamForRepair.slice(0, 14)
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion

        if (artifactId?.startsWith("artifact_")) {
          const artUrl = `/api/lemnity-ai/artifacts/${encodeURIComponent(artifactId)}`;
          const ar = await fetch(artUrl);
          const artErr = !ar.ok ? await ar.text() : "";
          if (ar.ok) {
            const ct = ar.headers.get("content-type") || "";
            if (!ct.includes("presentationml") && !ct.includes("ms-powerpoint")) {
              const text = await ar.text();
              if (text.trim().length > 0 && !textLooksLikeJsonApiNotFoundBody(text)) {
                filesOut = { "index.html": text };
                // #region agent log
                fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9424d5" },
                  body: JSON.stringify({
                    sessionId: "9424d5",
                    runId: "repair-v9",
                    hypothesisId: "poison_fallback",
                    location: "build-code.tsx:loadSandboxFiles:repair",
                    message: "sandbox_poison_repaired_from_artifact",
                    data: { artifactId, htmlChars: text.length, repairFromListFallback },
                    timestamp: Date.now()
                  })
                }).catch(() => {});
                // #endregion
              }
            }
          } else {
            // #region agent log
            fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9424d5" },
              body: JSON.stringify({
                sessionId: "9424d5",
                runId: "repair-v9",
                hypothesisId: "poison_fallback",
                location: "build-code.tsx:loadSandboxFiles:repair",
                message: "sandbox_poison_artifact_fetch_failed",
                data: { artifactId, status: ar.status, bodyPreview: artErr.slice(0, 120) },
                timestamp: Date.now()
              })
            }).catch(() => {});
            // #endregion
          }
        } else {
          // #region agent log
          fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9424d5" },
            body: JSON.stringify({
              sessionId: "9424d5",
              runId: "repair-v9",
              hypothesisId: "poison_fallback",
              location: "build-code.tsx:loadSandboxFiles:repair",
              message: "sandbox_recovery_missing_artifact_id",
              data: {
                repairFromListFallback,
                sessionGetOk: sessRes.ok,
                artifactProbe: artifactId ?? null,
                upstreamSessionIdPrefix: upstreamForRepair.slice(0, 12)
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
        }
      }

      setFiles(filesOut);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [sandboxId, bridgePreviewUrl, bridgeSessionRepair, artifactMimeType]);

  useEffect(() => {
    void loadSandboxFiles();
  }, [loadSandboxFiles, filesRefreshNonce]);

  useEffect(() => {
    function onFilesUpdated(ev: Event) {
      const d = (ev as CustomEvent<{ sandboxId?: string }>).detail?.sandboxId;
      if (!d || !sandboxId || String(d) !== String(sandboxId)) return;
      setFilesRefreshNonce((n) => n + 1);
    }
    window.addEventListener("lemnity:sandbox-files-updated", onFilesUpdated as EventListener);
    return () => window.removeEventListener("lemnity:sandbox-files-updated", onFilesUpdated as EventListener);
  }, [sandboxId]);

  useEffect(() => {
    if (sortedKeys.length && (selectedPath == null || !files[selectedPath])) {
      setSelectedPath(sortedKeys[0] ?? null);
    }
  }, [sortedKeys, files, selectedPath]);

  const activeBody = selectedPath && files[selectedPath] != null ? files[selectedPath]! : "";
  const onPickFile = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  if (!sandboxId) {
    return (
      <div className={cn("flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground", className)}>
        Сгенерируйте превью — здесь появится код из песочницы.
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground", className)}>
        Загрузка файлов…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive", className)}>
        {error}
      </div>
    );
  }

  if (isPptxArtifact && sandboxId.startsWith("artifact_")) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        <p className="font-medium text-foreground">Двоичный артефакт (.pptx)</p>
        <p>Исходный код недоступен. Скачай презентацию на вкладке «Превью».</p>
      </div>
    );
  }

  if (sortedKeys.length === 0) {
    return (
      <div className={cn("flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground", className)}>
        Пока нет файлов в песочнице.
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden sm:flex-row", className)}
    >
      <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-border sm:w-[min(12rem,40%)] sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/30 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          {t("playground_build_code_files")}
        </div>
        {gallery && gallery.items.length > 0 ? (
          <div className="border-b border-border/40 bg-muted/15 px-2 py-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("playground_build_code_gallery")}
            </p>
            <p className="mb-2 text-[10px] leading-snug text-muted-foreground/90">{t("playground_build_code_gallery_hint")}</p>
            <div className="flex max-h-[min(28vh,180px)] flex-wrap gap-1.5 overflow-y-auto">
              {gallery.items.map((it, idx) => (
                <button
                  key={`${it.path}-${idx}`}
                  type="button"
                  title={it.sourceUrl ?? it.path}
                  onClick={() => {
                    setSelectedPath(galleryMediaPath);
                  }}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-background ring-offset-background transition hover:ring-2 hover:ring-sky-500/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- same-origin API, динамические пути */}
                  <img src={it.path} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="h-[min(32vh,200px)] overflow-y-auto sm:h-full sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
          <nav className="flex flex-col p-1" aria-label={t("playground_build_code_files")}>
            {sortedKeys.map((path) => {
              const isGen = path === "generated.txt";
              const isSecondary = isGen || path === "puck.json";
              const inGallery =
                path === galleryMediaPath ||
                path === galleryReadmePath ||
                path.startsWith(`${galleryDir}/`);
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => onPickFile(path)}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs",
                    isSecondary && "text-muted-foreground",
                    selectedPath === path
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-muted/80"
                  )}
                  title={path}
                >
                  {inGallery ? (
                    <ImageIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  ) : (
                    <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono leading-snug">
                    {isGen ? t("playground_build_code_generated") : path}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border/60 bg-muted/20 px-2 py-1 text-[10px] font-mono text-muted-foreground">
          {selectedPath ?? "—"}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
          <p className="border-b border-border/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            {t("playground_build_code_visual_edit_hint")}
          </p>
          <pre className="m-0 p-3 text-xs leading-relaxed text-foreground">
            <code className="font-mono text-foreground [font-variant-ligatures:none]">{activeBody}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
