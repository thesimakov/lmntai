"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { ChatMessage } from "@/components/playground/agent-chat";
import { useI18n } from "@/components/i18n-provider";
import { useBuildStreamLog } from "@/hooks/use-build-stream-log";
import { coalesceSandboxIdFromBridgePreview } from "@/lib/preview-share";
import {
  isLovableFileFenceDelta,
  shouldCollapseAssistantCodeDump,
} from "@/lib/chat-artifact-ui";
import {
  formatLemnityAssistantStreamText,
  formatLemnityBridgeErrorBody,
  looksLikeHtmlGatewayGarbage,
} from "@/lib/lemnity-bridge-error-format";
import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";
import {
  clearStoredLemnityBuildManusSessionId,
  readStoredLemnityBuildManusSessionId,
  writeStoredLemnityBuildManusSessionId,
} from "@/lib/lemnity-ai-build-session-storage";
import {
  buildArtifactPreviewUrl,
  buildSandboxPreviewUrl,
  extractLastBridgePreviewFromEvents,
  fetchSessionLinkForPathId,
  sandboxHasRenderablePreview,
  toBuildSessionLinkMeta,
} from "@/lib/lemnity-ai-build-session-restore";
import { useBuildEditorStore, type ProjectSnapshotMeta } from "@/lib/stores/use-build-editor-store";
import { useSandboxFilesStore } from "@/lib/stores/use-sandbox-files-store";

// ─── Module-level helpers ──────────────────────────────────────────────────────

function notifySandboxFilesUpdated(sandboxId: string): void {
  const s = sandboxId.trim();
  if (!s) return;
  useSandboxFilesStore.getState().notifyFilesUpdated(s);
}

async function bindPreviewToHostProject(
  hostProjectId: string,
  sourceSandboxId: string,
  html?: string
): Promise<void> {
  const host = hostProjectId.trim();
  if (!host) return;
  const body = html?.trim()
    ? { html: html.trim() }
    : (() => {
        const source = sourceSandboxId.trim();
        if (!source || host === source) return null;
        return { sourceSandboxId: source };
      })();
  if (!body) return;
  try {
    await fetch(`/api/projects/${encodeURIComponent(host)}/bind-preview`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* не блокируем основной поток */
  }
}

async function restoreFromLatestSnapshot(
  hostProjectId: string,
  applySandboxProjectPreview: (sandboxId: string) => void
): Promise<boolean> {
  const id = hostProjectId.trim();
  if (!id) return false;
  try {
    const listRes = await fetch(`/api/projects/${encodeURIComponent(id)}/snapshots`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!listRes.ok) return false;
    const listData = (await listRes.json().catch(() => null)) as {
      snapshots?: Array<{ id: string }>;
    } | null;
    const latest = listData?.snapshots?.[0];
    if (!latest?.id) return false;

    const fullRes = await fetch(
      `/api/projects/${encodeURIComponent(id)}/snapshots/${encodeURIComponent(latest.id)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!fullRes.ok) return false;
    const fullPayload = (await fullRes.json().catch(() => null)) as {
      snapshot?: { sandboxHtml?: string };
      data?: { snapshot?: { sandboxHtml?: string } };
    } | null;
    const html =
      fullPayload?.snapshot?.sandboxHtml?.trim() ??
      fullPayload?.data?.snapshot?.sandboxHtml?.trim() ??
      "";
    if (!html) return false;

    await bindPreviewToHostProject(id, id, html);
    applySandboxProjectPreview(id);
    return true;
  } catch {
    return false;
  }
}

async function saveSnapshot(
  hostProjectId: string,
  previewSandboxId: string,
  promptText: string,
  prependVersion: (v: ProjectSnapshotMeta) => void,
  setCurrentVersionId: (id: string) => void
): Promise<void> {
  const projectId = hostProjectId.trim() || previewSandboxId.trim();
  if (!projectId) return;
  try {
    const htmlRes = await fetch(`/api/sandbox/${encodeURIComponent(previewSandboxId)}`);
    if (!htmlRes.ok) return;
    const sandboxHtml = await htmlRes.text();
    const snapRes = await fetch(`/api/projects/${encodeURIComponent(projectId)}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        promptText: promptText.slice(0, 500),
        sandboxHtml,
        sandboxCss: "",
        sandboxId: previewSandboxId,
      }),
    });
    if (!snapRes.ok) return;
    const { snapshot } = (await snapRes.json()) as { snapshot: ProjectSnapshotMeta };
    prependVersion(snapshot);
    setCurrentVersionId(snapshot.id);
  } catch {
    // don't break main flow
  }
}

// ─── SSE helpers ───────────────────────────────────────────────────────────────

function mapStepStatus(status?: string): "pending" | "running" | "completed" | "failed" {
  if (!status) return "running";
  const s = status.toLowerCase();
  if (s === "pending" || s === "queued" || s === "waiting") return "pending";
  if (["completed", "complete", "done", "success", "succeeded", "finished", "ok"].includes(s)) return "completed";
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") return "failed";
  return "running";
}

function parseSseChunk(chunk: string): { event: string; data: string | null } | null {
  if (!chunk.trim()) return null;
  const lines = chunk.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim() || "message";
    else if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
  }
  return { event, data: dataLines.length ? dataLines.join("\n") : null };
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ─── Local types ───────────────────────────────────────────────────────────────

type LemnityAiBridgeEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

type LemnityAiSessionPayload = {
  session_id: string;
  title?: string | null;
  status?: string | null;
  events?: Array<{
    event?: string;
    data?: {
      role?: "user" | "assistant";
      content?: string;
      title?: string;
      previewUrl?: string;
      sandboxId?: string;
      mimeType?: string;
      filename?: string | null;
      pdfExport?: { previewUrl?: string; filename?: string };
      id?: string;
      description?: string;
      status?: string;
      name?: string;
      function?: string;
      args?: Record<string, unknown>;
      steps?: Array<{ id?: string; description?: string; status?: string }>;
    };
  }>;
};

type LemnityAiPreviewEvent = {
  previewUrl?: string;
  sandboxId?: string;
  mimeType?: string;
  filename?: string | null;
  pdfExport?: { previewUrl?: string; filename?: string };
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAiSession() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const store = useBuildEditorStore;

  const { applyEvent: applyStreamLog, markStreamFinished, reset: resetStreamLog } = useBuildStreamLog();

  const mountedRef = useRef(true);
  const requestAbortRef = useRef<AbortController | null>(null);
  const streamRequestSeqRef = useRef(0);
  const lastSsePreviewSandboxIdRef = useRef<string | null>(null);
  const templatePreviewSandboxIdRef = useRef<string | null>(null);
  const bridgeAssistantMessageIdRef = useRef<string | null>(null);
  const bridgeSawDeltaRef = useRef(false);

  // ─── Mount/unmount ──────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestAbortRef.current?.abort();
    };
  }, []);

  // ─── sessionId side-effects ─────────────────────────────────────────────────

  useEffect(() => {
    let prevSessionId = store.getState().sessionId;
    return store.subscribe((state) => {
      const sessionId = state.sessionId;
      if (sessionId === prevSessionId) return;
      prevSessionId = sessionId;
      lastSsePreviewSandboxIdRef.current = null;
    });
  }, [store]);

  // ─── sandboxId → artifact sync ──────────────────────────────────────────────

  useEffect(() => {
    let prevSandboxId = store.getState().sandboxId;
    return store.subscribe((state) => {
      const sandboxId = state.sandboxId;
      if (sandboxId === prevSandboxId) return;
      prevSandboxId = sandboxId;
      const sid = store.getState().sessionId;
      if (!sandboxId?.startsWith("artifact_") || !sid) return;
      void fetch(
        `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(sid)}`,
        { method: "GET", credentials: "include", headers: { "X-Project-Id": sid } }
      ).then((res) => {
        if (res.status === 404) {
          const stored = readStoredLemnityBuildManusSessionId();
          if (stored === sid) clearStoredLemnityBuildManusSessionId();
        }
      });
    });
  }, [store]);

  // ─── appendBridgeAssistantChunk ─────────────────────────────────────────────

  const appendBridgeAssistantChunk = useCallback(
    (piece: string) => {
      const { appendMessage, updateMessageContent, messages } = store.getState();
      if (!bridgeAssistantMessageIdRef.current) {
        const id = createMessageId();
        bridgeAssistantMessageIdRef.current = id;
        appendMessage({ id, role: "assistant", content: piece, sentAt: Date.now() });
        return;
      }
      const id = bridgeAssistantMessageIdRef.current;
      const existing = messages.find((m) => m.id === id);
      if (!existing) {
        appendMessage({ id, role: "assistant", content: piece, sentAt: Date.now() });
        return;
      }
      updateMessageContent(id, (prev) => prev + piece);
    },
    [store]
  );

  const pushBridgeAssistantMessage = useCallback(
    (content: string) => {
      const { appendMessage, setMessages, messages } = store.getState();
      const id = bridgeAssistantMessageIdRef.current;
      if (!id) {
        const newId = createMessageId();
        bridgeAssistantMessageIdRef.current = newId;
        appendMessage({ id: newId, role: "assistant", content, sentAt: Date.now() });
        return;
      }
      const idx = messages.findIndex((m) => m.id === id);
      if (idx === -1) {
        appendMessage({ id, role: "assistant", content, sentAt: Date.now() });
        return;
      }
      setMessages((prev) => {
        const i = prev.findIndex((m) => m.id === id);
        if (i === -1) return prev;
        const next = [...prev];
        next[i] = { ...next[i], content };
        return next;
      });
    },
    [store]
  );

  // ─── ensureSession ──────────────────────────────────────────────────────────

  const ensureSession = useCallback(async (): Promise<
    { ok: true; sessionId: string } | { ok: false; message: string }
  > => {
    const existingId = store.getState().sessionId?.trim();
    if (existingId) {
      try {
        const warm = await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(existingId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "X-Project-Id": existingId },
          }
        );
        if (warm.ok) {
          return { ok: true, sessionId: existingId };
        }
        if (warm.status === 404) {
          const stored = readStoredLemnityBuildManusSessionId();
          if (stored && stored !== existingId) {
            const retry = await fetch(
              `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(stored)}`,
              {
                method: "GET",
                credentials: "include",
                headers: { "X-Project-Id": stored },
              }
            );
            if (retry.ok) {
              return { ok: true, sessionId: stored };
            }
          }
          if (stored === existingId) clearStoredLemnityBuildManusSessionId();
        } else if (!warm.ok) {
          return { ok: true, sessionId: existingId };
        }
      } catch {
        return { ok: true, sessionId: existingId };
      }
    }
    const hostProjectId = store.getState().sessionId?.trim() || "";
    try {
      const res = await fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`, {
        method: "PUT",
        credentials: "include",
        headers:
          hostProjectId.length > 0
            ? { "x-lemnity-host-project-id": hostProjectId }
            : undefined,
      });
      if (res.status === 403) {
        const j = (await res.json().catch(() => null)) as {
          msg?: string;
          data?: { message?: string };
        } | null;
        const msg =
          j?.msg === "PROJECT_LIMIT" && typeof j?.data?.message === "string"
            ? j.data.message
            : t("playground_session_create_error");
        return { ok: false, message: msg };
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return { ok: false, message: formatLemnityBridgeErrorBody(errText, t) };
      }
      const envelope = (await res.json()) as LemnityAiBridgeEnvelope<{ session_id?: string }>;
      const createdId = envelope?.data?.session_id;
      if (!createdId) {
        return { ok: false, message: t("playground_session_create_error") };
      }
      writeStoredLemnityBuildManusSessionId(createdId);
      const hostPid = hostProjectId.length > 0 && hostProjectId !== createdId ? hostProjectId : "";
      if (hostPid) {
        store.getState().setSessionId(hostPid);
        router.replace(`/playground/build?projectId=${encodeURIComponent(hostPid)}`);
      } else {
        store.getState().setSessionId(createdId);
        router.replace(`/playground/build?sessionId=${encodeURIComponent(createdId)}`);
      }
      return { ok: true, sessionId: createdId };
    } catch {
      return { ok: false, message: t("playground_session_create_error") };
    }
  }, [router, store, t]);

  // ─── loadSession ────────────────────────────────────────────────────────────

  const loadSession = useCallback(
    async (upstreamSessionId: string, hostProjectId?: string): Promise<boolean> => {
      let previewApplied = false;
      const headerProjectId = hostProjectId?.trim() || upstreamSessionId;
      try {
        const res = await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(upstreamSessionId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "X-Project-Id": headerProjectId },
          }
        );
        if (!res.ok) {
          if (res.status === 404) {
            const stored = readStoredLemnityBuildManusSessionId();
            if (stored === upstreamSessionId) clearStoredLemnityBuildManusSessionId();
          }
          return false;
        }
        if (!mountedRef.current) return false;
        const envelope = (await res.json()) as LemnityAiBridgeEnvelope<LemnityAiSessionPayload>;
        const payload = envelope?.data;
        if (!payload) return false;
        if (!mountedRef.current) return false;

        const {
          setIdea,
          idea,
          setMessages,
          setStage,
          setPreviewUrl,
          setSandboxId,
          setPreviewArtifactMime,
          setPreviewDownloadFilename,
          setPresentationPdfExport,
          setProgress,
          setIsGenerating,
          isGenerating,
        } = store.getState();

        const events = Array.isArray(payload.events) ? payload.events : [];
        const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
        const statusIsRunning =
          status === "running" ||
          status === "pending" ||
          status === "queued" ||
          status === "in_progress" ||
          status === "in-progress" ||
          status === "active" ||
          status === "working";

        if (payload.title?.trim() && !idea.trim()) {
          setIdea(payload.title.trim());
        }

        const messageEvents = events.filter(
          (ev) => ev?.event === "message" && typeof ev.data?.content === "string"
        );
        const nextMessages: ChatMessage[] = messageEvents.map((ev, i) => {
          const raw = typeof ev.data?.content === "string" ? ev.data.content : "";
          const content =
            ev.data?.role === "user" || !shouldCollapseAssistantCodeDump(raw)
              ? raw
              : t("playground_chat_code_moved_to_code_tab");
          return {
            id: `${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`,
            role: ev.data?.role === "user" ? "user" : ("assistant" as const),
            content,
            sentAt: Date.now() - (messageEvents.length - 1 - i) * 2000,
          };
        });

        if (!mountedRef.current) return false;
        if (nextMessages.length) {
          setMessages(nextMessages);
          setStage("ready");
        }

        // Find last preview after last user message
        const lastUserMessageIndex = (() => {
          for (let i = events.length - 1; i >= 0; i--) {
            if (events[i]?.event === "message" && events[i]?.data?.role === "user") return i;
          }
          return -1;
        })();
        const relevantEvents = events.slice(Math.max(0, lastUserMessageIndex));
        const lastPreviewFromSlice = [...relevantEvents]
          .reverse()
          .find((ev) => ev?.event === "preview" && typeof ev.data?.previewUrl === "string")?.data;
        const lastPreviewFromFull = [...events]
          .reverse()
          .find((ev) => ev?.event === "preview" && typeof ev.data?.previewUrl === "string")?.data;

        type BridgePreviewPick = typeof lastPreviewFromSlice;
        const coerceBridgePreview = (raw: BridgePreviewPick): BridgePreviewPick => {
          if (!raw?.previewUrl) return undefined;
          const sid = coalesceSandboxIdFromBridgePreview(raw);
          return sid ? { ...raw, sandboxId: sid } : undefined;
        };

        const coercedSlice = coerceBridgePreview(lastPreviewFromSlice);
        const coercedFull = coerceBridgePreview(lastPreviewFromFull);
        const lastPreview =
          coercedSlice?.previewUrl && coercedSlice.sandboxId
            ? coercedSlice
            : coercedFull?.previewUrl && coercedFull.sandboxId
              ? coercedFull
              : undefined;

        if (!mountedRef.current) return false;

        if (lastPreview?.previewUrl && lastPreview.sandboxId) {
          const loadedSbx = String(lastPreview.sandboxId);
          const liveSse = lastSsePreviewSandboxIdRef.current;
          const templateCatalogSbx = templatePreviewSandboxIdRef.current;
          if (templateCatalogSbx && templateCatalogSbx !== loadedSbx) {
            // catalog template preview — don't overwrite
          } else if (liveSse && liveSse !== loadedSbx) {
            // newer sandbox from live SSE — don't roll back
          } else {
            templatePreviewSandboxIdRef.current = null;
            setPreviewUrl(lastPreview.previewUrl);
            setSandboxId(lastPreview.sandboxId);
            notifySandboxFilesUpdated(lastPreview.sandboxId);
            setPreviewArtifactMime(typeof lastPreview.mimeType === "string" ? lastPreview.mimeType : null);
            setPreviewDownloadFilename(
              typeof lastPreview.filename === "string" ? lastPreview.filename : null
            );
            const pe = lastPreview.pdfExport;
            if (pe?.previewUrl && pe?.filename) {
              setPresentationPdfExport({ url: pe.previewUrl, filename: pe.filename });
            } else {
              setPresentationPdfExport(null);
            }
            setProgress(100);
            setIsGenerating(false);
            previewApplied = true;
          }
        } else if (!isGenerating) {
          if (statusIsRunning) {
            setIsGenerating(true);
            setStage("generating");
          } else {
            setIsGenerating(false);
            const currentStage = store.getState().stage;
            if (currentStage === "generating") setStage("ready");
          }
        }

        if (!previewApplied) {
          const fallback = extractLastBridgePreviewFromEvents(events);
          if (fallback?.previewUrl && fallback.sandboxId) {
            templatePreviewSandboxIdRef.current = null;
            setPreviewUrl(fallback.previewUrl);
            setSandboxId(fallback.sandboxId);
            notifySandboxFilesUpdated(fallback.sandboxId);
            setPreviewArtifactMime(fallback.mimeType ?? null);
            setPreviewDownloadFilename(fallback.filename ?? null);
            setPresentationPdfExport(null);
            setProgress(100);
            setIsGenerating(false);
            previewApplied = true;
          }
        }

        // Replay plan/step/tool events
        resetStreamLog();
        for (const ev of events) {
          if (!mountedRef.current) break;
          if (ev?.event === "plan") {
            for (const step of ev.data?.steps ?? []) {
              if (!step.id && !step.description) continue;
              applyStreamLog({
                type: "step",
                id: step.id || "step",
                description: step.description || "Шаг",
                status: mapStepStatus(step.status),
              });
            }
          }
          if (ev?.event === "step") {
            applyStreamLog({
              type: "step",
              id: ev.data?.id || "step",
              description: ev.data?.description || "Шаг",
              status: mapStepStatus(ev.data?.status),
            });
          }
          if (ev?.event === "tool") {
            applyStreamLog({
              type: "tool",
              name: ev.data?.name || "tool",
              status: ev.data?.status === "called" ? "called" : "calling",
              detail:
                typeof ev.data?.function === "string" ? ev.data.function : undefined,
            });
          }
        }
      } catch {
        // ignore
      }
      return previewApplied;
    },
    [applyStreamLog, resetStreamLog, store, t]
  );

  const applyArtifactPreview = useCallback(
    (artifactId: string) => {
      const id = artifactId.trim();
      if (!id.startsWith("artifact_")) return;
      const {
        setPreviewUrl,
        setSandboxId,
        setPreviewArtifactMime,
        setPreviewDownloadFilename,
        setPresentationPdfExport,
        setProgress,
        setIsGenerating,
        setStage,
      } = store.getState();
      templatePreviewSandboxIdRef.current = null;
      setSandboxId(id);
      setPreviewUrl(buildArtifactPreviewUrl(id));
      setPreviewArtifactMime("text/html");
      setPreviewDownloadFilename(null);
      setPresentationPdfExport(null);
      setProgress(100);
      setIsGenerating(false);
      setStage("ready");
    },
    [store]
  );

  const applySandboxProjectPreview = useCallback(
    (sandboxId: string) => {
      const id = sandboxId.trim();
      if (!id) return;
      const {
        setPreviewUrl,
        setSandboxId,
        setPreviewArtifactMime,
        setPreviewDownloadFilename,
        setPresentationPdfExport,
        setProgress,
        setIsGenerating,
        setStage,
      } = store.getState();
      templatePreviewSandboxIdRef.current = null;
      setSandboxId(id);
      setPreviewUrl(buildSandboxPreviewUrl(id));
      notifySandboxFilesUpdated(id);
      setPreviewArtifactMime(null);
      setPreviewDownloadFilename(null);
      setPresentationPdfExport(null);
      setProgress(100);
      setIsGenerating(false);
      setStage("ready");
    },
    [store]
  );

  /** Восстановление чата и превью при повторном входе в проект Lemnity AI. */
  const restoreBuildSession = useCallback(
    async (pathId: string) => {
      const id = pathId.trim();
      if (!id || !mountedRef.current) return;

      const linkRow = await fetchSessionLinkForPathId(id);
      const meta = linkRow ? toBuildSessionLinkMeta(linkRow) : null;
      const upstreamSessionId = meta?.upstreamSessionId ?? id;
      const hostProjectId = meta?.hostProjectId ?? id;

      if (hostProjectId !== store.getState().sessionId) {
        store.getState().setSessionId(hostProjectId);
      }
      writeStoredLemnityBuildManusSessionId(upstreamSessionId);

      const hadPreview = await loadSession(upstreamSessionId, hostProjectId);
      if (!mountedRef.current) return;

      if (hadPreview) {
        const previewSandboxId = store.getState().sandboxId;
        if (previewSandboxId) {
          void bindPreviewToHostProject(hostProjectId, String(previewSandboxId));
        }
        return;
      }

      if (meta?.previewArtifactId) {
        applyArtifactPreview(meta.previewArtifactId);
        void bindPreviewToHostProject(hostProjectId, meta.previewArtifactId);
        return;
      }

      if (await sandboxHasRenderablePreview(hostProjectId)) {
        applySandboxProjectPreview(hostProjectId);
        return;
      }

      await restoreFromLatestSnapshot(hostProjectId, applySandboxProjectPreview);
    },
    [applyArtifactPreview, applySandboxProjectPreview, loadSession, store]
  );

  // ─── sendChat ────────────────────────────────────────────────────────────────

  const sendChat = useCallback(
    async (message: string, opts?: { buildTemplateSlug?: string | null }) => {
      const ensured = await ensureSession();
      if (!ensured.ok) {
        store.getState().appendMessage({
          id: createMessageId(),
          role: "assistant",
          content: `❌ ${ensured.message}`,
          sentAt: Date.now(),
        });
        return;
      }
      const sid = ensured.sessionId;

      const {
        setIsGenerating,
        setStage,
        setProgress,
        setStreamArtifactChars,
        setPreviewUrl,
        setPreviewArtifactMime,
        setPreviewDownloadFilename,
        setPresentationPdfExport,
        setSandboxId,
        setShareIsPublic,
        setLastBuildMs,
        appendMessage,
        setMessages,
        agentHint,
        projectKind,
        sandboxId: currentSandboxId,
        buildTemplate,
      } = store.getState();

      const effectiveBuildTemplateSlug =
        opts?.buildTemplateSlug !== undefined
          ? opts.buildTemplateSlug
          : (buildTemplate?.slug ?? null);

      const buildStart = Date.now();

      setIsGenerating(true);
      setStage("generating");
      setProgress(10);
      setStreamArtifactChars(0);
      templatePreviewSandboxIdRef.current = null;
      setPreviewUrl(null);
      setPreviewArtifactMime(null);
      setPreviewDownloadFilename(null);
      setPresentationPdfExport(null);

      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      const requestSeq = ++streamRequestSeqRef.current;

      const eventId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `lmnt-${crypto.randomUUID()}`
          : `lmnt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const isActive = () =>
        mountedRef.current &&
        !controller.signal.aborted &&
        requestAbortRef.current === controller &&
        streamRequestSeqRef.current === requestSeq;

      bridgeAssistantMessageIdRef.current = null;
      bridgeSawDeltaRef.current = false;

      try {
        const response = await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(sid)}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              "X-LMNT-UI-Lang": lang,
              "X-Project-Id": sid,
            },
            credentials: "include",
            body: JSON.stringify({
              message,
              timestamp: Math.floor(Date.now() / 1000),
              event_id: eventId,
              agent_hint: agentHint,
              project_kind: projectKind ?? undefined,
              ...(effectiveBuildTemplateSlug ? { build_template_slug: effectiveBuildTemplateSlug } : {}),
              ...(currentSandboxId && !currentSandboxId.startsWith("artifact_")
                ? { sandbox_id: currentSandboxId }
                : {}),
            }),
            signal: controller.signal,
          }
        );

        if (!isActive()) return;

        if (!response.ok || !response.body) {
          const raw = await response.text().catch(() => "");
          if (!isActive()) return;
          appendMessage({
            id: createMessageId(),
            role: "assistant",
            content: `❌ ${formatLemnityBridgeErrorBody(raw, t)}`,
            sentAt: Date.now(),
          });
          setStage("ready");
          return;
        }

        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (contentType.includes("text/html")) {
          const raw = await response.text().catch(() => "");
          if (!isActive()) return;
          appendMessage({
            id: createMessageId(),
            role: "assistant",
            content: `❌ ${formatLemnityBridgeErrorBody(raw, t)}`,
            sentAt: Date.now(),
          });
          setStage("ready");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleSseBlock = (rawChunk: string) => {
          if (!isActive()) return;
          const chunk = parseSseChunk(rawChunk);
          if (!chunk) return;
          const ev = chunk.event.trim().toLowerCase();

          if (ev === "done") {
            markStreamFinished();
            setProgress(100);
            setStage("ready");
            return;
          }

          if (!chunk.data) return;

          try {
            if (ev === "delta") {
              const data = JSON.parse(chunk.data) as { content?: string; text?: string; kind?: string };
              const piece =
                typeof data.content === "string"
                  ? data.content
                  : typeof data.text === "string"
                    ? data.text
                    : "";
              if (piece.length > 0) {
                store.getState().setStreamArtifactChars((c) => c + piece.length);
                const isArtifactKind = data.kind === "artifact";
                const isFence = !isArtifactKind && isLovableFileFenceDelta(piece);
                if (!isArtifactKind && !isFence) {
                  bridgeSawDeltaRef.current = true;
                  appendBridgeAssistantChunk(formatLemnityAssistantStreamText(piece, t));
                }
                setProgress((prev) => Math.min(95, Math.max(prev, 45)));
              }
              return;
            }

            if (ev === "message") {
              const data = JSON.parse(chunk.data) as {
                role?: string;
                content?: string;
                text?: string;
              };
              const roleRaw = data.role?.toLowerCase();
              const content =
                typeof data.content === "string"
                  ? data.content
                  : typeof data.text === "string"
                    ? data.text
                    : "";
              const trimmed = content.trim();
              if (!trimmed) return;
              const visible = formatLemnityAssistantStreamText(trimmed, t);
              if (!visible.trim()) return;
              if (roleRaw === "user") return;
              if (roleRaw === "assistant" || roleRaw === undefined) {
                if (!bridgeSawDeltaRef.current) {
                  pushBridgeAssistantMessage(visible);
                }
                setProgress((prev) => Math.min(95, Math.max(prev, 45)));
              }
              return;
            }

            if (ev === "step") {
              const data = JSON.parse(chunk.data) as {
                id?: string;
                description?: string;
                status?: string;
              };
              applyStreamLog({
                type: "step",
                id: data.id || "step",
                description: data.description || "Шаг",
                status: mapStepStatus(data.status),
              });
              setProgress((prev) => Math.min(92, Math.max(prev, prev + 5)));
              return;
            }

            if (ev === "tool") {
              const data = JSON.parse(chunk.data) as {
                name?: string;
                status?: string;
                function?: string;
                args?: Record<string, unknown>;
              };
              const argDetail =
                data.args && typeof data.args === "object"
                  ? (Object.values(data.args).find((v) => typeof v === "string") as string | undefined)
                  : undefined;
              applyStreamLog({
                type: "tool",
                name: data.name || "tool",
                status: data.status === "called" ? "called" : "calling",
                detail:
                  typeof data.function === "string"
                    ? `${data.function}${typeof argDetail === "string" ? ` ${argDetail}` : ""}`
                    : typeof argDetail === "string"
                      ? argDetail
                      : undefined,
              });
              return;
            }

            if (ev === "plan") {
              const data = JSON.parse(chunk.data) as {
                steps?: Array<{ id?: string; description?: string; status?: string }>;
              };
              for (const step of data.steps ?? []) {
                applyStreamLog({
                  type: "step",
                  id: step.id || "step",
                  description: step.description || "Шаг",
                  status: mapStepStatus(step.status),
                });
              }
              return;
            }

            if (ev === "title") {
              const data = JSON.parse(chunk.data) as { title?: string };
              if (data.title?.trim()) {
                const { idea: currentIdea, setIdea } = store.getState();
                if (!currentIdea.trim()) {
                  setIdea(data.title.trim());
                }
              }
              return;
            }

            if (ev === "error") {
              const data = JSON.parse(chunk.data) as { error?: string };
              const rawErr = typeof data.error === "string" ? data.error : "";
              const errMessage = rawErr.trim()
                ? formatLemnityBridgeErrorBody(rawErr, t)
                : t("playground_lemnity_api_network_error");
              appendMessage({
                id: createMessageId(),
                role: "assistant",
                content: `❌ ${errMessage}`,
                sentAt: Date.now(),
              });
              setStage("ready");
              return;
            }

            if (ev === "preview") {
              const data = JSON.parse(chunk.data) as LemnityAiPreviewEvent;
              const coalescedSandboxId = coalesceSandboxIdFromBridgePreview(data);
              if (data.previewUrl && coalescedSandboxId) {
                lastSsePreviewSandboxIdRef.current = String(coalescedSandboxId);
                templatePreviewSandboxIdRef.current = null;
                setPreviewUrl(data.previewUrl);
                setSandboxId(coalescedSandboxId);
                notifySandboxFilesUpdated(coalescedSandboxId);
                setPreviewArtifactMime(typeof data.mimeType === "string" ? data.mimeType : null);
                setPreviewDownloadFilename(typeof data.filename === "string" ? data.filename : null);
                const pe = data.pdfExport;
                if (pe?.previewUrl && pe?.filename) {
                  setPresentationPdfExport({ url: pe.previewUrl, filename: pe.filename });
                } else {
                  setPresentationPdfExport(null);
                }
                setShareIsPublic(false);
                setStage("ready");
                setProgress(100);
                const isPptx =
                  typeof data.mimeType === "string" && data.mimeType.includes("presentationml");
                appendMessage({
                  id: createMessageId(),
                  role: "assistant",
                  content: isPptx
                    ? "✅ Презентация PowerPoint (.pptx) готова — скачай файл справа. Напиши, что поменять."
                    : "✅ Превью готово. Можешь написать, что изменить — я обновлю сборку следующим шагом.",
                  sentAt: Date.now(),
                });
                const { prependVersion, setCurrentVersionId, sessionId: hostPid } = store.getState();
                const hostProjectId = hostPid?.trim() || String(coalescedSandboxId);
                void bindPreviewToHostProject(hostProjectId, String(coalescedSandboxId));
                void saveSnapshot(
                  hostProjectId,
                  String(coalescedSandboxId),
                  message,
                  prependVersion,
                  setCurrentVersionId
                );
              }
            }
          } catch {
            // ignore invalid SSE payloads
          }
        };

        // SSE read loop
        while (true) {
          const { done, value } = await reader.read();
          if (!isActive()) break;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }
          if (done) {
            buffer += decoder.decode();
            break;
          }
          buffer = buffer.replace(/\r\n/g, "\n");
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const rawChunk of chunks) {
            if (rawChunk.trim()) handleSseBlock(rawChunk);
          }
        }

        buffer = buffer.replace(/\r\n/g, "\n");
        const finalChunks = buffer.split("\n\n");
        for (const rawChunk of finalChunks) {
          if (rawChunk.trim()) handleSseBlock(rawChunk);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          if (!isActive()) return;
          appendMessage({
            id: createMessageId(),
            role: "assistant",
            content: "❌ Ошибка стрима Lemnity AI",
            sentAt: Date.now(),
          });
        }
      } finally {
        if (isActive()) {
          // Collapse/cleanup bridge assistant message
          const bridgeIdToCollapse = bridgeAssistantMessageIdRef.current;
          if (bridgeIdToCollapse) {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === bridgeIdToCollapse);
              if (idx === -1) return prev;
              const c = prev[idx].content;
              if (looksLikeHtmlGatewayGarbage(c)) {
                const next = [...prev];
                next[idx] = {
                  ...next[idx],
                  content: formatLemnityAssistantStreamText(c, t),
                };
                return next;
              }
              if (!shouldCollapseAssistantCodeDump(c)) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], content: t("playground_chat_code_moved_to_code_tab") };
              return next;
            });
          }
          bridgeAssistantMessageIdRef.current = null;
          bridgeSawDeltaRef.current = false;
          markStreamFinished();
          setLastBuildMs(Date.now() - buildStart);
          store.getState().setIsGenerating(false);
          const currentStage = store.getState().stage;
          if (currentStage === "generating") store.getState().setStage("ready");
          void loadSession(sid);
        }
      }
    },
    [
      appendBridgeAssistantChunk,
      applyStreamLog,
      ensureSession,
      lang,
      loadSession,
      markStreamFinished,
      pushBridgeAssistantMessage,
      store,
      t,
    ]
  );

  // ─── cancelStream ────────────────────────────────────────────────────────────

  const cancelStream = useCallback(() => {
    requestAbortRef.current?.abort();
  }, []);

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    ensureSession,
    loadSession,
    restoreBuildSession,
    sendChat,
    cancelStream,
    templatePreviewSandboxIdRef,
  };
}
