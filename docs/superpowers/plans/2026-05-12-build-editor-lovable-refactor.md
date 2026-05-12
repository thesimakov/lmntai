# Build Editor — Lovable-style Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разобрать монолит `build/page.tsx` (2601 строк, 30+ useState) на тонкую страницу (~250 строк) + 3 хука + расширенный Zustand store, удалив всю legacy-логику generate-stream.

**Architecture:** Store хранит весь shared state. Три хука инкапсулируют логику: `useAiSession` (SSE-стрим), `usePromptCoach` (stages + /api/prompt-coach), `useBuildHandoff` (landing handoff). Страница только рендерит UI и собирает `onSend`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Zustand, `fetch` + SSE, `AbortController`

---

## File Map

| Действие | Файл | Что делает |
|----------|------|------------|
| Modify | `lib/stores/use-build-editor-store.ts` | Добавить Chat, Coach, Stream, расширить UI/Session |
| Create | `hooks/use-ai-session.ts` | ensureSession + loadSession + sendChat + cancelStream |
| Create | `hooks/use-prompt-coach.ts` | runPromptCoach + slow-hint + stage management |
| Create | `hooks/use-build-handoff.ts` | Читает handoff из localStorage один раз при маунте |
| Rewrite | `app/(builder)/playground/build/page.tsx` | Тонкий render ~250 строк |

---

## Task 1: Extend `useBuildEditorStore` — добавить Chat, Coach, Stream, UI slices

**Files:**
- Modify: `lib/stores/use-build-editor-store.ts`

Заменяем весь файл целиком. Сохраняем все существующие слайсы (Session, UI, Template, Version) и добавляем новые.

- [ ] **Шаг 1.1: Заменить файл store**

Полностью заменяем `lib/stores/use-build-editor-store.ts`:

```typescript
"use client";

import { create } from "zustand";

import type { ChatMessage } from "@/components/playground/agent-chat";
import type { AgentPickerLabel } from "@/lib/agent-models";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";

// ─── Existing slices (preserved as-is) ────────────────────────────────────────

export type ProjectSnapshotMeta = {
  id: string;
  versionNum: number;
  promptText: string;
  createdAt: string;
};

interface SessionSlice {
  sandboxId: string | null;
  sessionId: string | null;
  previewUrl: string | null;
  projectKind: ProjectKind | null;
  setSandboxId: (id: string | null) => void;
  setSessionId: (id: string | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setProjectKind: (kind: ProjectKind | null) => void;
}

interface UiSlice {
  activeTab: "chat" | "files" | "preview";
  chatRailCollapsed: boolean;
  publishDialogOpen: boolean;
  historyOpen: boolean;
  // new in this task:
  leftCollapsed: boolean;
  leftWidth: number;
  tab: "preview" | "document" | "settings" | "code";
  agentHint: AgentPickerLabel;
  visualLayoutEditor: boolean;
  setActiveTab: (tab: "chat" | "files" | "preview") => void;
  setChatRailCollapsed: (v: boolean) => void;
  setPublishDialogOpen: (v: boolean) => void;
  setHistoryOpen: (v: boolean) => void;
  setLeftCollapsed: (v: boolean) => void;
  setLeftWidth: (v: number) => void;
  setTab: (v: "preview" | "document" | "settings" | "code") => void;
  setAgentHint: (v: AgentPickerLabel) => void;
  setVisualLayoutEditor: (v: boolean) => void;
}

interface TemplateSlice {
  templateDialogOpen: boolean;
  selectedTemplateId: string | null;
  setTemplateDialogOpen: (v: boolean) => void;
  setSelectedTemplateId: (id: string | null) => void;
}

interface VersionSlice {
  currentVersionId: string | null;
  versions: ProjectSnapshotMeta[];
  selectedElementId: string | null;
  setCurrentVersionId: (id: string | null) => void;
  setVersions: (versions: ProjectSnapshotMeta[]) => void;
  prependVersion: (version: ProjectSnapshotMeta) => void;
  setSelectedElementId: (id: string | null) => void;
}

// ─── New slices ────────────────────────────────────────────────────────────────

export type BuildStage = "idea" | "questions" | "ready" | "generating";

interface ChatSlice {
  messages: ChatMessage[];
  stage: BuildStage;
  idea: string;
  finalPrompt: string;
  setMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  appendMessage: (msg: ChatMessage) => void;
  updateMessageContent: (id: string, updater: (prev: string) => string) => void;
  setStage: (stage: BuildStage) => void;
  setIdea: (idea: string) => void;
  setFinalPrompt: (prompt: string) => void;
}

interface CoachSlice {
  coachAwaitingConfirm: boolean;
  pendingTechnicalPrompt: string | null;
  promptCoachLoading: boolean;
  coachSlowHint: boolean;
  promptCoachDebugLine: string | null;
  setCoachAwaitingConfirm: (v: boolean) => void;
  setPendingTechnicalPrompt: (v: string | null) => void;
  setPromptCoachLoading: (v: boolean) => void;
  setCoachSlowHint: (v: boolean) => void;
  setPromptCoachDebugLine: (v: string | null) => void;
}

export type BuildTemplate = {
  slug: string;
  name: string;
  defaultUserPrompt: string;
};

interface StreamSlice {
  isGenerating: boolean;
  progress: number;
  previewArtifactMime: string | null;
  previewDownloadFilename: string | null;
  presentationPdfExport: { url: string; filename: string } | null;
  lastBuildMs: number | null;
  streamArtifactChars: number;
  shareIsPublic: boolean;
  buildTemplate: BuildTemplate | null;
  setIsGenerating: (v: boolean) => void;
  setProgress: (v: number | ((prev: number) => number)) => void;
  setPreviewArtifactMime: (v: string | null) => void;
  setPreviewDownloadFilename: (v: string | null) => void;
  setPresentationPdfExport: (v: { url: string; filename: string } | null) => void;
  setLastBuildMs: (v: number | null) => void;
  setStreamArtifactChars: (v: number | ((prev: number) => number)) => void;
  setShareIsPublic: (v: boolean) => void;
  setBuildTemplate: (v: BuildTemplate | null) => void;
}

// ─── Composed store type ───────────────────────────────────────────────────────

type BuildEditorStore =
  SessionSlice &
  UiSlice &
  TemplateSlice &
  VersionSlice &
  ChatSlice &
  CoachSlice &
  StreamSlice;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBuildEditorStore = create<BuildEditorStore>((set) => ({
  // Session
  sandboxId: null,
  sessionId: null,
  previewUrl: null,
  projectKind: null,
  setSandboxId: (sandboxId) => set({ sandboxId }),
  setSessionId: (sessionId) => set({ sessionId }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setProjectKind: (projectKind) => set({ projectKind }),

  // UI
  activeTab: "chat",
  chatRailCollapsed: false,
  publishDialogOpen: false,
  historyOpen: false,
  leftCollapsed: false,
  leftWidth: 400,
  tab: "preview",
  agentHint: "DeepSeek",
  visualLayoutEditor: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setChatRailCollapsed: (chatRailCollapsed) => set({ chatRailCollapsed }),
  setPublishDialogOpen: (publishDialogOpen) => set({ publishDialogOpen }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  setLeftCollapsed: (leftCollapsed) => set({ leftCollapsed }),
  setLeftWidth: (leftWidth) => set({ leftWidth }),
  setTab: (tab) => set({ tab }),
  setAgentHint: (agentHint) => set({ agentHint }),
  setVisualLayoutEditor: (visualLayoutEditor) => set({ visualLayoutEditor }),

  // Template (legacy dialog)
  templateDialogOpen: false,
  selectedTemplateId: null,
  setTemplateDialogOpen: (templateDialogOpen) => set({ templateDialogOpen }),
  setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }),

  // Version
  currentVersionId: null,
  versions: [],
  selectedElementId: null,
  setCurrentVersionId: (currentVersionId) => set({ currentVersionId }),
  setVersions: (versions) => set({ versions }),
  prependVersion: (version) => set((s) => ({ versions: [version, ...s.versions] })),
  setSelectedElementId: (selectedElementId) => set({ selectedElementId }),

  // Chat
  messages: [],
  stage: "idea",
  idea: "",
  finalPrompt: "",
  setMessages: (msgs) =>
    set((s) => ({ messages: typeof msgs === "function" ? msgs(s.messages) : msgs })),
  appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessageContent: (id, updater) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: updater(m.content) } : m
      ),
    })),
  setStage: (stage) => set({ stage }),
  setIdea: (idea) => set({ idea }),
  setFinalPrompt: (finalPrompt) => set({ finalPrompt }),

  // Coach
  coachAwaitingConfirm: false,
  pendingTechnicalPrompt: null,
  promptCoachLoading: false,
  coachSlowHint: false,
  promptCoachDebugLine: null,
  setCoachAwaitingConfirm: (coachAwaitingConfirm) => set({ coachAwaitingConfirm }),
  setPendingTechnicalPrompt: (pendingTechnicalPrompt) => set({ pendingTechnicalPrompt }),
  setPromptCoachLoading: (promptCoachLoading) => set({ promptCoachLoading }),
  setCoachSlowHint: (coachSlowHint) => set({ coachSlowHint }),
  setPromptCoachDebugLine: (promptCoachDebugLine) => set({ promptCoachDebugLine }),

  // Stream
  isGenerating: false,
  progress: 0,
  previewArtifactMime: null,
  previewDownloadFilename: null,
  presentationPdfExport: null,
  lastBuildMs: null,
  streamArtifactChars: 0,
  shareIsPublic: false,
  buildTemplate: null,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setProgress: (v) =>
    set((s) => ({ progress: typeof v === "function" ? v(s.progress) : v })),
  setPreviewArtifactMime: (previewArtifactMime) => set({ previewArtifactMime }),
  setPreviewDownloadFilename: (previewDownloadFilename) => set({ previewDownloadFilename }),
  setPresentationPdfExport: (presentationPdfExport) => set({ presentationPdfExport }),
  setLastBuildMs: (lastBuildMs) => set({ lastBuildMs }),
  setStreamArtifactChars: (v) =>
    set((s) => ({ streamArtifactChars: typeof v === "function" ? v(s.streamArtifactChars) : v })),
  setShareIsPublic: (shareIsPublic) => set({ shareIsPublic }),
  setBuildTemplate: (buildTemplate) => set({ buildTemplate }),
}));
```

- [ ] **Шаг 1.2: Type-check**

```bash
npx tsc --noEmit
```

Ожидаем: ошибок по store нет. Могут быть ошибки в `build/page.tsx` — они исчезнут после Task 5.

- [ ] **Шаг 1.3: Коммит**

```bash
git add lib/stores/use-build-editor-store.ts
git commit -m "refactor: extend build editor store with Chat/Coach/Stream/UI slices"
```

---

## Task 2: Создать `hooks/use-ai-session.ts`

**Files:**
- Create: `hooks/use-ai-session.ts`

Этот хук инкапсулирует всё взаимодействие с lemnity-ai: создание/загрузку сессии и SSE-стрим.

- [ ] **Шаг 2.1: Создать файл**

Создаём `hooks/use-ai-session.ts`:

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ChatMessage } from "@/components/playground/agent-chat";
import { useI18n } from "@/components/i18n-provider";
import { useBuildStreamLog } from "@/hooks/use-build-stream-log";
import {
  coalesceSandboxIdFromBridgePreview,
} from "@/lib/preview-share";
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
  readStoredLemnityBuildManusSessionId,
  writeStoredLemnityBuildManusSessionId,
} from "@/lib/lemnity-ai-build-session-storage";
import { useBuildEditorStore, type ProjectSnapshotMeta } from "@/lib/stores/use-build-editor-store";

// ─── Types for upstream SSE events ────────────────────────────────────────────

type LemnityAiBridgeEnvelope<T> = { code: number; msg: string; data: T };

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

type SsePreviewData = {
  previewUrl?: string;
  sandboxId?: string;
  mimeType?: string;
  filename?: string | null;
  pdfExport?: { previewUrl?: string; filename?: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStepStatus(status?: string): "pending" | "running" | "completed" | "failed" {
  if (!status) return "running";
  const s = status.toLowerCase();
  if (s === "pending" || s === "queued" || s === "waiting") return "pending";
  if (["completed", "complete", "done", "success", "succeeded", "finished", "ok"].includes(s)) {
    return "completed";
  }
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") return "failed";
  return "running";
}

function parseSseChunk(chunk: string): { event: string; data: string | null } | null {
  if (!chunk.trim()) return null;
  const lines = chunk.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim() || "message";
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }
  return { event, data: dataLines.length ? dataLines.join("\n") : null };
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type AiSessionSendOpts = {
  buildTemplateSlug?: string | null;
};

export function useAiSession() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const store = useBuildEditorStore();
  const {
    applyEvent: applyStreamLog,
    reset: resetStreamLog,
    markStreamFinished,
  } = useBuildStreamLog();

  // Internal refs — not shared state
  const abortRef = useRef<AbortController | null>(null);
  const streamSeqRef = useRef(0);
  const streamActiveRef = useRef(false);
  const lastSsePreviewSandboxIdRef = useRef<string | null>(null);
  const templatePreviewSandboxIdRef = useRef<string | null>(null);
  const bridgeAssistantIdRef = useRef<string | null>(null);
  const bridgeSawDeltaRef = useRef(false);
  const buildStartedAtRef = useRef<number | null>(null);
  const buildGotPreviewRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // ── Session ID resync when sessionId changes ──
  useEffect(() => {
    const s = store.sessionId?.trim();
    if (s) writeStoredLemnityBuildManusSessionId(s);
  }, [store.sessionId]);

  // ── Reset lastSsePreviewSandboxId when session changes ──
  useEffect(() => {
    lastSsePreviewSandboxIdRef.current = null;
  }, [store.sessionId]);

  // ── Artifact session summary sync (Prisma previewArtifactId) ──
  useEffect(() => {
    const { sessionId, sandboxId } = useBuildEditorStore.getState();
    if (!sessionId || !sandboxId?.startsWith("artifact_")) return;
    let cancelled = false;
    void fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
      credentials: "include",
      headers: { "X-Project-Id": sessionId },
    }).catch(() => undefined);
    return () => { cancelled = true; void cancelled; };
  }, [store.sandboxId, store.sessionId]);

  // ─── ensureSession ─────────────────────────────────────────────────────────

  const ensureSession = useCallback(async (): Promise<
    { ok: true; sessionId: string } | { ok: false; message: string }
  > => {
    const current = useBuildEditorStore.getState().sessionId?.trim();
    if (current) return { ok: true, sessionId: current };

    try {
      const res = await fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`, {
        method: "PUT",
        credentials: "include",
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
        return { ok: false, message: formatLemnityBridgeErrorBody(await res.text(), t) };
      }
      const envelope = (await res.json()) as LemnityAiBridgeEnvelope<{ session_id?: string }>;
      const createdId = envelope?.data?.session_id;
      if (!createdId) return { ok: false, message: t("playground_session_create_error") };
      writeStoredLemnityBuildManusSessionId(createdId);
      useBuildEditorStore.getState().setSessionId(createdId);
      router.replace(`/playground/build?sessionId=${encodeURIComponent(createdId)}`);
      return { ok: true, sessionId: createdId };
    } catch {
      return { ok: false, message: t("playground_session_create_error") };
    }
  }, [router, t]);

  // ─── loadSession ───────────────────────────────────────────────────────────

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(sessionId)}`,
        { method: "GET", credentials: "include", headers: { "X-Project-Id": sessionId } }
      );
      if (!res.ok || !mountedRef.current) return;

      const envelope = (await res.json()) as LemnityAiBridgeEnvelope<LemnityAiSessionPayload>;
      const payload = envelope?.data;
      if (!payload || !mountedRef.current) return;

      const events = Array.isArray(payload.events) ? payload.events : [];
      const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
      const statusIsRunning = ["running", "pending", "queued", "in_progress", "in-progress", "active", "working"].includes(status);

      const { setIdea, setMessages, setStage, setPreviewUrl, setSandboxId,
              setPreviewArtifactMime, setPreviewDownloadFilename, setPresentationPdfExport,
              setIsGenerating, setProgress, idea } = useBuildEditorStore.getState();

      if (payload.title?.trim() && !idea.trim()) {
        setIdea(payload.title.trim());
      }

      const msgEvents = events.filter(
        (e) => e?.event === "message" && typeof e.data?.content === "string"
      );
      if (msgEvents.length > 0) {
        const nextMessages: ChatMessage[] = msgEvents.map((e, i) => {
          const raw = String(e.data?.content ?? "");
          const content =
            e.data?.role === "user" || !shouldCollapseAssistantCodeDump(raw)
              ? raw
              : t("playground_chat_code_moved_to_code_tab");
          return {
            id: `${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`,
            role: e.data?.role === "user" ? ("user" as const) : ("assistant" as const),
            content,
            sentAt: Date.now() - (msgEvents.length - 1 - i) * 2000,
          };
        });
        setMessages(nextMessages);
        setStage("ready");
      }

      // Find last preview event after last user message
      const lastUserIdx = (() => {
        for (let i = events.length - 1; i >= 0; i--) {
          if (events[i]?.event === "message" && events[i]?.data?.role === "user") return i;
        }
        return -1;
      })();
      const relevantEvents = events.slice(Math.max(0, lastUserIdx));
      const lastPreview = [...relevantEvents]
        .reverse()
        .find((e) => e?.event === "preview" && typeof e.data?.previewUrl === "string")
        ?.data;

      if (lastPreview?.previewUrl && lastPreview.sandboxId) {
        const loadedSbx = String(lastPreview.sandboxId);
        const liveSse = lastSsePreviewSandboxIdRef.current;
        const tplSbx = templatePreviewSandboxIdRef.current;
        if ((!liveSse || liveSse === loadedSbx) && (!tplSbx || tplSbx === loadedSbx)) {
          templatePreviewSandboxIdRef.current = null;
          setPreviewUrl(lastPreview.previewUrl);
          setSandboxId(lastPreview.sandboxId);
          notifySandboxFilesUpdated(lastPreview.sandboxId);
          setPreviewArtifactMime(typeof lastPreview.mimeType === "string" ? lastPreview.mimeType : null);
          setPreviewDownloadFilename(typeof lastPreview.filename === "string" ? lastPreview.filename : null);
          const pe = lastPreview.pdfExport;
          setPresentationPdfExport(pe?.previewUrl && pe?.filename ? { url: pe.previewUrl, filename: pe.filename } : null);
          setIsGenerating(false);
          setProgress(100);
        }
      } else if (!streamActiveRef.current) {
        if (statusIsRunning) {
          setIsGenerating(true);
          setStage("generating");
        } else {
          setIsGenerating(false);
        }
      }

      // Replay plan/step/tool events into stream log
      resetStreamLog();
      for (const e of events) {
        if (e?.event === "plan") {
          for (const step of (e.data?.steps ?? [])) {
            if (!step.id && !step.description) continue;
            applyStreamLog({ type: "step", id: step.id || "step", description: step.description || "", status: mapStepStatus(step.status) });
          }
        }
        if (e?.event === "step") {
          applyStreamLog({ type: "step", id: e.data?.id || "step", description: e.data?.description || "", status: mapStepStatus(e.data?.status) });
        }
        if (e?.event === "tool") {
          applyStreamLog({ type: "tool", name: e.data?.name || "tool", status: e.data?.status === "called" ? "called" : "calling", detail: typeof e.data?.function === "string" ? e.data.function : undefined });
        }
      }
    } catch {
      // ignore
    }
  }, [applyStreamLog, resetStreamLog, t]);

  // ─── sendChat ──────────────────────────────────────────────────────────────

  const sendChat = useCallback(async (message: string, opts?: AiSessionSendOpts) => {
    const ensured = await ensureSession();
    if (!ensured.ok) {
      useBuildEditorStore.getState().appendMessage({
        id: createMessageId(), role: "assistant", content: `❌ ${ensured.message}`, sentAt: Date.now(),
      });
      return;
    }
    const sid = ensured.sessionId;

    const {
      buildTemplate, projectKind, agentHint, sandboxId,
      setIsGenerating, setStage, setProgress, setPreviewUrl, setSandboxId,
      setPreviewArtifactMime, setPreviewDownloadFilename, setPresentationPdfExport,
      setShareIsPublic, setStreamArtifactChars, appendMessage, updateMessageContent,
      prependVersion, setCurrentVersionId,
    } = useBuildEditorStore.getState();

    const effectiveSlug = opts?.buildTemplateSlug !== undefined
      ? opts.buildTemplateSlug
      : (buildTemplate?.slug ?? null);

    // ── Start ──
    buildStartedAtRef.current = Date.now();
    buildGotPreviewRef.current = false;
    streamActiveRef.current = true;
    setIsGenerating(true);
    setStage("generating");
    setProgress(10);
    setStreamArtifactChars(0);
    templatePreviewSandboxIdRef.current = null;
    setPreviewUrl(null);
    setPreviewArtifactMime(null);
    setPreviewDownloadFilename(null);
    setPresentationPdfExport(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++streamSeqRef.current;
    const isActive = () =>
      mountedRef.current &&
      !controller.signal.aborted &&
      abortRef.current === controller &&
      streamSeqRef.current === seq;

    bridgeAssistantIdRef.current = null;
    bridgeSawDeltaRef.current = false;
    resetStreamLog();

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
            event_id: `lmnt-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
            agent_hint: agentHint,
            project_kind: projectKind ?? undefined,
            ...(effectiveSlug ? { build_template_slug: effectiveSlug } : {}),
            ...(sandboxId && !sandboxId.startsWith("artifact_") ? { sandbox_id: sandboxId } : {}),
          }),
          signal: controller.signal,
        }
      );

      if (!isActive()) return;

      if (!response.ok || !response.body) {
        const raw = await response.text().catch(() => "");
        if (!isActive()) return;
        appendMessage({ id: createMessageId(), role: "assistant", content: `❌ ${formatLemnityBridgeErrorBody(raw, t)}`, sentAt: Date.now() });
        setStage("ready");
        return;
      }

      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      if (contentType.includes("text/html")) {
        const raw = await response.text();
        if (!isActive()) return;
        appendMessage({ id: createMessageId(), role: "assistant", content: `❌ ${formatLemnityBridgeErrorBody(raw, t)}`, sentAt: Date.now() });
        setStage("ready");
        return;
      }

      // ── SSE read loop ──
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleBlock = (raw: string) => {
        if (!isActive()) return;
        const chunk = parseSseChunk(raw);
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
            const piece = typeof data.content === "string" ? data.content : typeof data.text === "string" ? data.text : "";
            if (piece.length > 0) {
              setStreamArtifactChars((c) => c + piece.length);
              if (data.kind !== "artifact" && !isLovableFileFenceDelta(piece)) {
                bridgeSawDeltaRef.current = true;
                const formatted = formatLemnityAssistantStreamText(piece, t);
                const existingId = bridgeAssistantIdRef.current;
                if (existingId) {
                  updateMessageContent(existingId, (prev) => prev + formatted);
                } else {
                  const id = createMessageId();
                  bridgeAssistantIdRef.current = id;
                  appendMessage({ id, role: "assistant", content: formatted, sentAt: Date.now() });
                }
              }
              setProgress((p) => Math.min(95, Math.max(p, 45)));
            }
            return;
          }

          if (ev === "message") {
            const data = JSON.parse(chunk.data) as { role?: string; content?: string; text?: string };
            const role = data.role?.toLowerCase();
            if (role === "user") return;
            const raw = typeof data.content === "string" ? data.content : typeof data.text === "string" ? data.text : "";
            const trimmed = raw.trim();
            if (!trimmed) return;
            const visible = formatLemnityAssistantStreamText(trimmed, t);
            if (!visible.trim() || bridgeSawDeltaRef.current) return;
            const existingId = bridgeAssistantIdRef.current;
            if (existingId) {
              // Replace: finalised text overwrites streaming chunks
              const collapsed = shouldCollapseAssistantCodeDump(visible)
                ? t("playground_chat_code_moved_to_code_tab")
                : visible;
              updateMessageContent(existingId, () => collapsed);
            } else {
              const id = createMessageId();
              bridgeAssistantIdRef.current = id;
              appendMessage({ id, role: "assistant", content: visible, sentAt: Date.now() });
            }
            setProgress((p) => Math.min(95, Math.max(p, 45)));
            return;
          }

          if (ev === "step") {
            const data = JSON.parse(chunk.data) as { id?: string; description?: string; status?: string };
            applyStreamLog({ type: "step", id: data.id || "step", description: data.description || "", status: mapStepStatus(data.status) });
            setProgress((p) => Math.min(92, Math.max(p, p + 5)));
            return;
          }

          if (ev === "plan") {
            const data = JSON.parse(chunk.data) as { steps?: Array<{ id?: string; description?: string; status?: string }> };
            for (const step of data.steps ?? []) {
              applyStreamLog({ type: "step", id: step.id || "step", description: step.description || "", status: mapStepStatus(step.status) });
            }
            return;
          }

          if (ev === "tool") {
            const data = JSON.parse(chunk.data) as { name?: string; status?: string; function?: string; args?: Record<string, unknown> };
            const argDetail = data.args ? Object.values(data.args).find((v) => typeof v === "string") : undefined;
            applyStreamLog({
              type: "tool",
              name: data.name || "tool",
              status: data.status === "called" ? "called" : "calling",
              detail: typeof data.function === "string"
                ? `${data.function}${typeof argDetail === "string" ? ` ${argDetail}` : ""}`
                : typeof argDetail === "string" ? argDetail : undefined,
            });
            return;
          }

          if (ev === "title") {
            const data = JSON.parse(chunk.data) as { title?: string };
            if (data.title?.trim()) {
              const { idea, setIdea } = useBuildEditorStore.getState();
              if (!idea.trim()) setIdea(data.title.trim());
            }
            return;
          }

          if (ev === "error") {
            const data = JSON.parse(chunk.data) as { error?: string };
            const msg = typeof data.error === "string" && data.error.trim()
              ? formatLemnityBridgeErrorBody(data.error, t)
              : t("playground_lemnity_api_network_error");
            appendMessage({ id: createMessageId(), role: "assistant", content: `❌ ${msg}`, sentAt: Date.now() });
            setStage("ready");
            return;
          }

          if (ev === "preview") {
            const data = JSON.parse(chunk.data) as SsePreviewData;
            const coalesced = coalesceSandboxIdFromBridgePreview(data);
            if (data.previewUrl && coalesced) {
              writeStoredLemnityBuildManusSessionId(sid);
              buildGotPreviewRef.current = true;
              lastSsePreviewSandboxIdRef.current = String(coalesced);
              templatePreviewSandboxIdRef.current = null;
              setPreviewUrl(data.previewUrl);
              setSandboxId(coalesced);
              notifySandboxFilesUpdated(coalesced);
              setPreviewArtifactMime(typeof data.mimeType === "string" ? data.mimeType : null);
              setPreviewDownloadFilename(typeof data.filename === "string" ? data.filename : null);
              const pe = data.pdfExport;
              setPresentationPdfExport(pe?.previewUrl && pe?.filename ? { url: pe.previewUrl, filename: pe.filename } : null);
              setShareIsPublic(false);
              setStage("ready");
              setProgress(100);
              const isPptx = typeof data.mimeType === "string" && data.mimeType.includes("presentationml");
              appendMessage({
                id: createMessageId(),
                role: "assistant",
                content: isPptx
                  ? "✅ Презентация PowerPoint (.pptx) готова — скачай файл справа. Напиши, что поменять."
                  : "✅ Превью готово. Можешь написать, что изменить — я обновлю сборку следующим шагом.",
                sentAt: Date.now(),
              });
              // Save version snapshot
              void saveSnapshot(String(coalesced), message, prependVersion, setCurrentVersionId);
            }
          }
        } catch {
          // ignore invalid SSE payloads
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (!isActive()) break;
        if (value) buffer += decoder.decode(value, { stream: true });
        if (done) { buffer += decoder.decode(); break; }
        buffer = buffer.replace(/\r\n/g, "\n");
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const c of chunks) { if (c.trim()) handleBlock(c); }
      }
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.trim()) handleBlock(buffer);
    } catch (err) {
      if ((err as Error).name !== "AbortError" && isActive()) {
        useBuildEditorStore.getState().appendMessage({ id: createMessageId(), role: "assistant", content: "❌ Ошибка стрима Lemnity AI", sentAt: Date.now() });
      }
    } finally {
      if (isActive()) {
        const assistantId = bridgeAssistantIdRef.current;
        if (assistantId) {
          const { messages, updateMessageContent: umc, setMessages } = useBuildEditorStore.getState();
          const msg = messages.find((m) => m.id === assistantId);
          if (msg) {
            const c = msg.content;
            if (looksLikeHtmlGatewayGarbage(c)) {
              umc(assistantId, () => formatLemnityAssistantStreamText(c, t));
            } else if (shouldCollapseAssistantCodeDump(c)) {
              umc(assistantId, () => t("playground_chat_code_moved_to_code_tab"));
            }
          }
        }
        bridgeAssistantIdRef.current = null;
        bridgeSawDeltaRef.current = false;
        markStreamFinished();
        const { setIsGenerating, setStage, setLastBuildMs } = useBuildEditorStore.getState();
        const started = buildStartedAtRef.current;
        buildStartedAtRef.current = null;
        if (started != null && buildGotPreviewRef.current) {
          setLastBuildMs(Date.now() - started);
        } else {
          setLastBuildMs(null);
        }
        buildGotPreviewRef.current = false;
        setIsGenerating(false);
        setStage((prev: string) => (prev === "generating" ? "ready" : prev) as "ready" | "generating" | "idea" | "questions");
        void loadSession(sid);
      } else {
        buildStartedAtRef.current = null;
        buildGotPreviewRef.current = false;
      }
      streamActiveRef.current = false;
    }
  }, [applyStreamLog, ensureSession, lang, loadSession, markStreamFinished, resetStreamLog, t]);

  // ─── cancelStream ──────────────────────────────────────────────────────────

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ─── templatePreviewSandboxIdRef exposure (for useBuildHandoff) ───────────

  return {
    ensureSession,
    loadSession,
    sendChat,
    cancelStream,
    templatePreviewSandboxIdRef,
  };
}

// ─── Helpers (module-level) ───────────────────────────────────────────────────

function notifySandboxFilesUpdated(sandboxId: string): void {
  if (typeof window === "undefined") return;
  const s = sandboxId.trim();
  if (!s) return;
  window.dispatchEvent(new CustomEvent("lemnity:sandbox-files-updated", { detail: { sandboxId: s } }));
}

async function saveSnapshot(
  sandboxId: string,
  promptText: string,
  prependVersion: (v: import("@/lib/stores/use-build-editor-store").ProjectSnapshotMeta) => void,
  setCurrentVersionId: (id: string) => void
): Promise<void> {
  try {
    const htmlRes = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}`);
    if (!htmlRes.ok) return;
    const sandboxHtml = await htmlRes.text();
    const snapRes = await fetch(`/api/projects/${encodeURIComponent(sandboxId)}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptText: promptText.slice(0, 500), sandboxHtml, sandboxCss: "", sandboxId }),
    });
    if (!snapRes.ok) return;
    const { snapshot } = (await snapRes.json()) as { snapshot: ProjectSnapshotMeta };
    prependVersion(snapshot);
    setCurrentVersionId(snapshot.id);
  } catch {
    // don't break main flow
  }
}
```

- [ ] **Шаг 2.2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Шаг 2.3: Коммит**

```bash
git add hooks/use-ai-session.ts
git commit -m "feat: add useAiSession hook — SSE stream + session management"
```

---

## Task 3: Создать `hooks/use-prompt-coach.ts`

**Files:**
- Create: `hooks/use-prompt-coach.ts`

- [ ] **Шаг 3.1: Создать файл**

Создаём `hooks/use-prompt-coach.ts`:

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ChatMessage } from "@/components/playground/agent-chat";
import { useI18n } from "@/components/i18n-provider";
import { formatLemnityBridgeErrorBody } from "@/lib/lemnity-bridge-error-format";
import { useBuildEditorStore } from "@/lib/stores/use-build-editor-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptCoachResponse = {
  reply?: string;
  phase?: string;
  technical_prompt?: string | null;
  usage?: { total_tokens?: number };
  debug_model?: string;
  debug_attempted_models?: string[];
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePromptCoach() {
  const { t } = useI18n();
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  const slowHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (slowHintTimerRef.current) clearTimeout(slowHintTimerRef.current);
    };
  }, []);

  // ── Slow-hint timer: fires 12s after promptCoachLoading becomes true ──
  const store = useBuildEditorStore();
  useEffect(() => {
    if (slowHintTimerRef.current) clearTimeout(slowHintTimerRef.current);
    if (!store.promptCoachLoading) {
      store.setCoachSlowHint(false);
      return;
    }
    slowHintTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        useBuildEditorStore.getState().setCoachSlowHint(true);
      }
    }, 12_000);
    return () => {
      if (slowHintTimerRef.current) clearTimeout(slowHintTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.promptCoachLoading]);

  // ─── runPromptCoach ────────────────────────────────────────────────────────

  const runPromptCoach = useCallback(async (thread: ChatMessage[]) => {
    const {
      idea, projectKind, agentHint,
      setPromptCoachLoading, setCoachAwaitingConfirm, setPendingTechnicalPrompt,
      setFinalPrompt, setStage, setPromptCoachDebugLine,
      appendMessage,
    } = useBuildEditorStore.getState();

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    const isStale = () => seqRef.current !== seq;

    const apiMessages = thread
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.promptPlainText ?? m.content }));

    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      setPromptCoachLoading(true);
      setPromptCoachDebugLine(null);
      const started = performance.now();

      const res = await fetch("/api/prompt-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          idea: idea.trim() || undefined,
          projectKind: projectKind ?? undefined,
          agentHint,
        }),
        signal: controller.signal,
      });

      if (!mountedRef.current || controller.signal.aborted || isStale()) return;

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        if (!mountedRef.current || isStale()) return;
        appendMessage({ id: createId(), role: "assistant", content: `❌ ${formatLemnityBridgeErrorBody(msg || "", t)}`, sentAt: Date.now() });
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
        setStage("questions");
        return;
      }

      const data = (await res.json()) as PromptCoachResponse;
      const durationMs = Math.round(performance.now() - started);

      if (!mountedRef.current || isStale()) return;

      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) {
        appendMessage({ id: createId(), role: "assistant", content: "❌ Пустой ответ. Попробуй ещё раз.", sentAt: Date.now() });
        return;
      }

      if (process.env.NODE_ENV !== "production" && typeof data.debug_model === "string" && data.debug_model.trim()) {
        const attempted = Array.isArray(data.debug_attempted_models)
          ? data.debug_attempted_models.filter((x): x is string => typeof x === "string")
          : [];
        setPromptCoachDebugLine(
          attempted.length > 0
            ? `DEV · prompt model: ${data.debug_model} · chain: ${attempted.join(" -> ")}`
            : `DEV · prompt model: ${data.debug_model}`
        );
      }

      const technicalPrompt = typeof data.technical_prompt === "string" ? data.technical_prompt.trim() : "";
      const isFinalConfirm = data.phase === "confirm" && technicalPrompt.length > 0;

      appendMessage({
        id: createId(),
        role: "assistant",
        content: reply,
        sentAt: Date.now(),
        ...(isFinalConfirm
          ? {
              showActions: true,
              promptPlainText: technicalPrompt,
              actionMeta: { durationMs, totalTokens: typeof data.usage?.total_tokens === "number" ? data.usage.total_tokens : undefined },
            }
          : {}),
      });

      if (isFinalConfirm) {
        setFinalPrompt(technicalPrompt);
        setCoachAwaitingConfirm(true);
        setPendingTechnicalPrompt(technicalPrompt);
        setStage("ready");
      } else {
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
        setStage("questions");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (!mountedRef.current || seqRef.current !== seq) return;
      appendMessage({ id: `${Date.now()}-err`, role: "assistant", content: "❌ Ошибка запроса к коучу промпта", sentAt: Date.now() });
      setCoachAwaitingConfirm(false);
      setPendingTechnicalPrompt(null);
    } finally {
      if (mountedRef.current && seqRef.current === seq) {
        useBuildEditorStore.getState().setPromptCoachLoading(false);
      }
    }
  }, [t]);

  return { runPromptCoach };
}
```

- [ ] **Шаг 3.2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Шаг 3.3: Коммит**

```bash
git add hooks/use-prompt-coach.ts
git commit -m "feat: add usePromptCoach hook — stages, /api/prompt-coach, slow-hint"
```

---

## Task 4: Создать `hooks/use-build-handoff.ts`

**Files:**
- Create: `hooks/use-build-handoff.ts`

- [ ] **Шаг 4.1: Создать файл**

Создаём `hooks/use-build-handoff.ts`:

```typescript
"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/components/playground/agent-chat";
import {
  BUILDER_LAST_PROCESSED_NAV_KEY,
  BUILDER_NAV_TOKEN_KEY,
  isHandoffTemplateDirectPreview,
  readBuilderHandoff,
} from "@/lib/landing-handoff";
import { useBuildEditorStore } from "@/lib/stores/use-build-editor-store";

type HandoffDeps = {
  /** True когда /api/lemnity-ai/bootstrap вернул данные */
  lemnityAiBridgeReady: boolean;
  /** True когда GET /api/projects/current завершился (успешно или нет) */
  projectScopeReady: boolean;
  /** ?sessionId из URL — если есть, handoff не применяется */
  requestedSessionId: string | null;
  /** Запустить превью шаблона по slug (из build/page.tsx) */
  runBuildTemplatePreview: (slug: string) => Promise<void>;
  /** runPromptCoach из usePromptCoach */
  runPromptCoach: (thread: ChatMessage[]) => Promise<void>;
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useBuildHandoff({
  lemnityAiBridgeReady,
  projectScopeReady,
  requestedSessionId,
  runBuildTemplatePreview,
  runPromptCoach,
}: HandoffDeps): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!lemnityAiBridgeReady || !projectScopeReady || requestedSessionId) return;
    if (firedRef.current) return;

    const handoff = readBuilderHandoff();
    if (!handoff?.idea?.trim()) return;

    // sessionStorage duplicate-fire guard
    const navToken = sessionStorage.getItem(BUILDER_NAV_TOKEN_KEY);
    const processed = sessionStorage.getItem(BUILDER_LAST_PROCESSED_NAV_KEY);
    if (navToken) {
      if (processed === navToken) return;
      sessionStorage.setItem(BUILDER_LAST_PROCESSED_NAV_KEY, navToken);
    } else {
      const onceKey = "lemnity.builder.bridgeHandoffOnce";
      const once = sessionStorage.getItem(onceKey);
      if (once === handoff.idea) return;
      sessionStorage.setItem(onceKey, handoff.idea);
    }

    firedRef.current = true;

    const {
      setProjectKind, setBuildTemplate, setIdea, setFinalPrompt,
      setStage, setCoachAwaitingConfirm, setPendingTechnicalPrompt,
      setPromptCoachLoading, setPromptCoachDebugLine, setMessages, appendMessage,
    } = useBuildEditorStore.getState();

    if (handoff.projectKind) setProjectKind(handoff.projectKind);

    if (isHandoffTemplateDirectPreview(handoff) && handoff.buildTemplate?.slug) {
      setBuildTemplate(handoff.buildTemplate);
      setIdea(handoff.buildTemplate.name?.trim() || handoff.buildTemplate.slug);
      setFinalPrompt("");
      setStage("ready");
      setCoachAwaitingConfirm(false);
      setPendingTechnicalPrompt(null);
      setPromptCoachLoading(false);
      setPromptCoachDebugLine(null);
      setMessages([]);
      void runBuildTemplatePreview(handoff.buildTemplate.slug);
      return;
    }

    if (handoff.buildTemplate) {
      setBuildTemplate(handoff.buildTemplate);
    } else {
      setBuildTemplate(null);
    }

    setIdea(handoff.idea);
    setStage("questions");
    setCoachAwaitingConfirm(false);
    setPendingTechnicalPrompt(null);
    setPromptCoachDebugLine(null);

    const msg: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: handoff.idea,
      sentAt: Date.now(),
    };
    setMessages([msg]);
    void runPromptCoach([msg]);
  }, [lemnityAiBridgeReady, projectScopeReady, requestedSessionId, runBuildTemplatePreview, runPromptCoach]);
}
```

- [ ] **Шаг 4.2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Шаг 4.3: Коммит**

```bash
git add hooks/use-build-handoff.ts
git commit -m "feat: add useBuildHandoff hook — landing handoff processing"
```

---

## Task 5: Переписать `build/page.tsx`

**Files:**
- Rewrite: `app/(builder)/playground/build/page.tsx`

Это главный шаг — заменяем 2601-строчный монолит.

- [ ] **Шаг 5.1: Сделать backup (на случай если что-то пошло не так)**

```bash
cp "app/(builder)/playground/build/page.tsx" "app/(builder)/playground/build/page.tsx.bak"
```

- [ ] **Шаг 5.2: Записать новый `build/page.tsx`**

Полностью заменяем файл:

```typescript
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowLeftRight, ChevronDown, Loader2 } from "lucide-react";

import { AiEditorShell, AiEditorVersionHistoryButton } from "@/components/ai-editor";
import { AgentChat } from "@/components/playground/agent-chat";
import { BuildCode } from "@/components/playground/build-code";
import { BuildPublishDialog } from "@/components/playground/build-publish-dialog";
import { BuildPreviewChrome } from "@/components/playground/build-topbar";
import { BuildSettings } from "@/components/playground/build-settings";
import { MenuDrawer, StudioChatRailCollapseButton } from "@/components/playground/menu-drawer";
import { isPptxArtifact } from "@/components/playground/preview-frame";
import { RightPanel } from "@/components/playground/right-panel";
import { BuildSharePopover } from "@/components/playground/build-share-popover";
import { BuildStreamSteps } from "@/components/playground/build-stream-steps";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { useBuildStreamLog } from "@/hooks/use-build-stream-log";
import { useLemnityAiBridgeFromServer } from "@/hooks/use-lemnity-ai-bridge-from-server";
import { useAiSession } from "@/hooks/use-ai-session";
import { usePromptCoach } from "@/hooks/use-prompt-coach";
import { useBuildHandoff } from "@/hooks/use-build-handoff";
import { useBuildEditorStore } from "@/lib/stores/use-build-editor-store";
import { coalesceSandboxIdFromBridgePreview, resolvePublishOpenUrl, resolveShareablePreviewUrl } from "@/lib/preview-share";
import { formatAgentModelDisplayLabel } from "@/lib/agent-models";
import { isAffirmativeUserReply } from "@/lib/affirmative-reply";
import { formatAttachmentsForLemnityChat, mergeUserMessageWithAttachments, playgroundUserDisplayContent } from "@/lib/chat-attachments";
import { readStoredLemnityBuildManusSessionId } from "@/lib/lemnity-ai-build-session-storage";
import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";
import { formatBuildElapsed, formatBuildTotalDuration } from "@/lib/build-time-i18n";
import { sanitizeProjectTitleForUser } from "@/lib/display-title";
import { getStreamStepTitle } from "@/lib/stream-step-title";
import { saveBuilderHandoff } from "@/lib/landing-handoff";

export default function PromptBuildPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { ready: lemnityAiBridgeReady } = useLemnityAiBridgeFromServer();

  const requestedSessionId = searchParams.get("sessionId");
  const requestedSandboxId = searchParams.get("sandboxId")?.trim() || null;

  // ── Store ──
  const {
    sessionId, sandboxId, previewUrl, projectKind, shareIsPublic,
    messages, stage, idea, finalPrompt, buildTemplate,
    isGenerating, progress, previewArtifactMime, previewDownloadFilename,
    presentationPdfExport, lastBuildMs, streamArtifactChars,
    coachAwaitingConfirm, pendingTechnicalPrompt, promptCoachLoading,
    coachSlowHint, promptCoachDebugLine,
    leftCollapsed, leftWidth, tab, agentHint, visualLayoutEditor,
    publishDialogOpen,
    setSessionId, setSandboxId, setPreviewUrl, setProjectKind,
    setMessages, setStage, setIdea, setShareIsPublic,
    setLeftCollapsed, setLeftWidth, setTab, setAgentHint, setVisualLayoutEditor,
    setPublishDialogOpen, setBuildTemplate,
    prependVersion, setCurrentVersionId,
  } = useBuildEditorStore();

  // ── Hooks ──
  const { steps: streamSteps, toolLine: streamToolLine, reset: resetStreamLog, applyEvent: applyStreamLog, markStreamFinished } = useBuildStreamLog();
  const { sendChat, cancelStream, templatePreviewSandboxIdRef } = useAiSession();
  const { runPromptCoach } = usePromptCoach();

  // ── Project scope ──
  const [projectScopeReady, setProjectScopeReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/projects/current", { method: "GET", credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok || cancelled || requestedSessionId) return;
        const payload = (await res.json().catch(() => null)) as { project?: { id?: string } } | null;
        const id = typeof payload?.project?.id === "string" ? payload.project.id.trim() : "";
        if (id && !cancelled) useBuildEditorStore.getState().setSessionId(id);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProjectScopeReady(true); });
    return () => { cancelled = true; };
  }, [requestedSessionId]);

  // ── Load session from URL param ──
  useEffect(() => {
    if (!requestedSessionId?.trim()) return;
    setSessionId(requestedSessionId.trim());
  }, [requestedSessionId, setSessionId]);

  // ── Template preview (for useBuildHandoff) ──
  const templatePreviewAbortRef = useRef<AbortController | null>(null);
  const runBuildTemplatePreview = useCallback(async (slug: string) => {
    templatePreviewAbortRef.current?.abort();
    const controller = new AbortController();
    templatePreviewAbortRef.current = controller;
    try {
      const res = await fetch("/api/build-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, projectId: useBuildEditorStore.getState().sessionId ?? slug }),
        signal: controller.signal,
      });
      if (!res.ok) {
        toast.error(t("playground_build_template_preview_error"));
        return;
      }
      const data = (await res.json()) as { previewUrl?: string; sandboxId?: string };
      if (!data.previewUrl || !data.sandboxId) {
        toast.error(t("playground_build_template_preview_error"));
        return;
      }
      const { setPreviewUrl: spv, setSandboxId: ssb, setPreviewArtifactMime, setPreviewDownloadFilename, setPresentationPdfExport, setShareIsPublic: ssp } = useBuildEditorStore.getState();
      templatePreviewSandboxIdRef.current = String(data.sandboxId);
      spv(data.previewUrl);
      ssb(data.sandboxId);
      setPreviewArtifactMime(null);
      setPreviewDownloadFilename(null);
      setPresentationPdfExport(null);
      ssp(false);
      useBuildEditorStore.getState().setProgress(100);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error(t("playground_build_template_preview_error"));
    }
  }, [t, templatePreviewSandboxIdRef]);

  // ── Handoff from landing ──
  useBuildHandoff({
    lemnityAiBridgeReady,
    projectScopeReady,
    requestedSessionId,
    runBuildTemplatePreview,
    runPromptCoach,
  });

  // ── Build timer ──
  const [buildTimerTick, setBuildTimerTick] = useState(0);
  useEffect(() => {
    if (!isGenerating) return;
    const id = window.setInterval(() => setBuildTimerTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [isGenerating]);

  // ── onSend ──
  const onSend = useCallback(async (text: string, files?: File[]) => {
    if (!lemnityAiBridgeReady) { toast.message("Загрузка режима сборки…"); return; }
    if (buildTemplate) return;

    const trimmed = text.trim();
    const hasFiles = (files?.length ?? 0) > 0;
    if (!trimmed && !hasFiles) return;

    const annex = await formatAttachmentsForLemnityChat(files ?? []);
    const userOutbound = mergeUserMessageWithAttachments(trimmed, annex);
    if (!userOutbound.trim()) return;

    const displayContent = playgroundUserDisplayContent(text, files);
    const userExtras = userOutbound !== displayContent ? { promptPlainText: userOutbound } : {};
    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (coachAwaitingConfirm && pendingTechnicalPrompt) {
      const userMsg = { id: createId(), role: "user" as const, content: displayContent, sentAt: Date.now(), ...userExtras };
      if (isAffirmativeUserReply(trimmed)) {
        useBuildEditorStore.getState().appendMessage(userMsg);
        useBuildEditorStore.getState().setCoachAwaitingConfirm(false);
        useBuildEditorStore.getState().setPendingTechnicalPrompt(null);
        useBuildEditorStore.getState().setPromptCoachDebugLine(null);
        void sendChat(mergeUserMessageWithAttachments(pendingTechnicalPrompt, annex));
        return;
      }
      useBuildEditorStore.getState().setCoachAwaitingConfirm(false);
      useBuildEditorStore.getState().setPendingTechnicalPrompt(null);
      const next = [...messages, userMsg];
      useBuildEditorStore.getState().setMessages(next);
      void runPromptCoach(next);
      return;
    }

    if (stage === "ready") {
      const built = finalPrompt.trim();
      const isDispatchingBuilt = !hasFiles && built.length > 0 && trimmed === built;
      if (isDispatchingBuilt) {
        useBuildEditorStore.getState().appendMessage({ id: createId(), role: "assistant", content: t("playground_chat_assistant_dispatch_built_prompt"), sentAt: Date.now() });
      } else {
        useBuildEditorStore.getState().appendMessage({ id: createId(), role: "user", content: displayContent, sentAt: Date.now(), ...userExtras });
      }
      useBuildEditorStore.getState().setPromptCoachDebugLine(null);
      void sendChat(userOutbound);
      return;
    }

    const userMsg = { id: createId(), role: "user" as const, content: displayContent, sentAt: Date.now(), ...userExtras };
    const nextThread = [...messages, userMsg];
    useBuildEditorStore.getState().setMessages(nextThread);
    if (!idea.trim()) setIdea(trimmed || displayContent);
    if (stage === "idea") setStage("questions");
    void runPromptCoach(nextThread);
  }, [
    annex, buildTemplate, coachAwaitingConfirm, finalPrompt, idea,
    lemnityAiBridgeReady, messages, pendingTechnicalPrompt, runPromptCoach,
    sendChat, setIdea, setStage, stage, t,
  ]);

  // ── Derived values ──
  const codePanelSandboxId = useMemo(
    () => coalesceSandboxIdFromBridgePreview({ previewUrl, sandboxId }) ?? sandboxId,
    [previewUrl, sandboxId]
  );
  const visualEditPersist = useMemo(() => {
    if (!sandboxId || typeof previewUrl !== "string") return false;
    if (isPptxArtifact(previewArtifactMime)) return false;
    if (sandboxId.startsWith("artifact_") && previewUrl.includes("/api/lemnity-ai/artifacts/")) return true;
    if (!sandboxId.startsWith("artifact_") && previewUrl.startsWith("/api/sandbox/")) return true;
    return false;
  }, [sandboxId, previewUrl, previewArtifactMime]);

  const documentTabVisible = useMemo(
    () => Boolean(previewUrl && sandboxId && (projectKind === "resume" || projectKind === "presentation") && !isPptxArtifact(previewArtifactMime)),
    [previewUrl, sandboxId, projectKind, previewArtifactMime]
  );
  useEffect(() => { if (!documentTabVisible && tab === "document") setTab("preview"); }, [documentTabVisible, tab, setTab]);
  useEffect(() => { if (tab === "document") setVisualLayoutEditor(true); }, [tab, setVisualLayoutEditor]);

  const planFromSession = String(session?.user?.plan ?? "");
  const hasCustomDomainAccess = planFromSession === "PRO" || planFromSession === "TEAM" || planFromSession === "BUSINESS";

  const streamHint = useMemo(() => {
    if (streamToolLine) return streamToolLine;
    const last = streamSteps[streamSteps.length - 1];
    if (!last) return null;
    return `${getStreamStepTitle(last.id, t)}: ${last.description}`;
  }, [streamToolLine, streamSteps, t]);

  const settingsProjectTitle = useMemo(() => {
    const raw = finalPrompt.trim() || idea.trim();
    if (!raw) return "";
    const cleaned = sanitizeProjectTitleForUser(raw);
    return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
  }, [finalPrompt, idea]);

  const header = useMemo(() => {
    if (buildTemplate) return t("playground_build_chat_header_template_focus").replace("{name}", buildTemplate.name.trim() || buildTemplate.slug);
    if (coachAwaitingConfirm) return "Шаг 2/3 — Подтверждение промпта";
    if (stage === "questions") return "Шаг 1/3 — Диалог с ИИ";
    if (stage === "ready") return "Шаг 2/3 — Финальный промпт";
    if (stage === "generating") return "Шаг 3/3 — Генерация";
    return "Сборка промпта";
  }, [stage, coachAwaitingConfirm, buildTemplate, t]);

  const studioChatPlaceholder = useMemo(
    () => buildTemplate ? t("playground_chat_placeholder_template_focus") : t("playground_chat_input_placeholder_studio"),
    [buildTemplate, t]
  );

  const interfaceBuildElapsedLabel = useMemo(() => {
    void buildTimerTick;
    if (!isGenerating) return null;
    return formatBuildElapsed(0, lang);
  }, [isGenerating, buildTimerTick, lang]);

  const chatThreadScrollKey = `${stage}:${idea.length}:${streamSteps.map((s) => `${s.id}:${s.status}`).join("|")}:${isGenerating}:${promptCoachLoading}:${messages.length}`;

  // ── Drag resizer ──
  const dragStateRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const leftWidthBeforeCollapseRef = useRef(400);
  const toggleLeft = useCallback(() => {
    if (!leftCollapsed) leftWidthBeforeCollapseRef.current = leftWidth;
    setLeftCollapsed(!leftCollapsed);
    if (leftCollapsed) setLeftWidth(leftWidthBeforeCollapseRef.current || 400);
  }, [leftCollapsed, leftWidth, setLeftCollapsed, setLeftWidth]);

  // ── Publish ──
  const [publishPending, setPublishPending] = useState(false);
  const [studioSettingsOpenedAt] = useState(() => new Date());

  const handlePublishConfirm = useCallback(async (detail?: { openUrl?: string }) => {
    if (typeof window === "undefined") return;
    const rawOk = resolveShareablePreviewUrl(previewUrl, window.location.origin);
    if (!rawOk || !sandboxId) { toast.error(t("playground_build_publish_no_preview")); return; }
    try {
      setPublishPending(true);
      if (!shareIsPublic) {
        const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { method: "POST" });
        if (!res.ok) { toast.error(await res.text() || t("playground_build_share_error_instant")); return; }
        setShareIsPublic(true);
      }
      const publicUrl = resolvePublishOpenUrl(window.location.origin, sandboxId, detail?.openUrl);
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      setPublishDialogOpen(false);
      useBuildEditorStore.getState().appendMessage({ id: `${Date.now()}`, role: "assistant", content: "Ссылка на публичную страницу превью открыта.", sentAt: Date.now() });
      toast.message(t("playground_build_publish_opened"));
    } finally { setPublishPending(false); }
  }, [previewUrl, sandboxId, shareIsPublic, setShareIsPublic, setPublishDialogOpen, t]);

  const ensurePublicShareForPreviewTab = useCallback(async () => {
    if (!sandboxId) return false;
    if (shareIsPublic) return true;
    const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { method: "POST" });
    if (!res.ok) return false;
    setShareIsPublic(true);
    return true;
  }, [sandboxId, shareIsPublic, setShareIsPublic]);

  const buildCodeBridgeSessionRepair = useMemo(() => {
    const id = sessionId?.trim() || readStoredLemnityBuildManusSessionId()?.trim() || "";
    if (!id) return null;
    return { upstreamSessionId: id };
  }, [sessionId]);

  const handleVersionRestoreHtml = useCallback((html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    useBuildEditorStore.getState().setPreviewUrl(URL.createObjectURL(blob));
  }, []);

  const handleAiEdit = useCallback((elementId: string, elementLabel: string) => {
    useBuildEditorStore.getState().setSelectedElementId(elementId);
    toast.info(`Контекст выбран: ${elementLabel}. Введите промпт для AI-правки.`);
  }, []);

  const handleBuildTemplateChange = useCallback((next: typeof buildTemplate) => {
    setBuildTemplate(next);
    if (!next) {
      templatePreviewAbortRef.current?.abort();
      const { sandboxId: sbx } = useBuildEditorStore.getState();
      if (templatePreviewSandboxIdRef.current && sbx === templatePreviewSandboxIdRef.current) {
        templatePreviewSandboxIdRef.current = null;
        useBuildEditorStore.getState().setPreviewUrl(null);
        useBuildEditorStore.getState().setSandboxId(null);
        useBuildEditorStore.getState().setPreviewArtifactMime(null);
      }
      if (idea.trim()) {
        try { saveBuilderHandoff(idea.trim(), projectKind ?? undefined, null); } catch { /* ignore */ }
      }
      return;
    }
    useBuildEditorStore.getState().setMessages([]);
    void runBuildTemplatePreview(next.slug);
    setIdea(next.name.trim() || next.slug);
    setStage("ready");
    useBuildEditorStore.getState().setCoachAwaitingConfirm(false);
    useBuildEditorStore.getState().setPendingTechnicalPrompt(null);
    try { saveBuilderHandoff(next.name.trim() || next.slug, projectKind ?? undefined, next, { templateDirectPreview: true }); } catch { /* ignore */ }
  }, [buildTemplate, idea, projectKind, runBuildTemplatePreview, setBuildTemplate, setIdea, setStage, templatePreviewSandboxIdRef]);

  // ── Layout ──
  const leftHidden = leftCollapsed || Boolean(buildTemplate);

  const chatSlot = (
    <div
      className={cn(
        "relative z-30 min-h-0 shrink-0 grow-0 overflow-visible border-r border-border bg-background",
        "transition-[width,min-width,max-width,opacity] duration-300 ease-in-out motion-reduce:transition-none"
      )}
      aria-hidden={leftHidden}
      style={{
        width: leftHidden ? 0 : leftWidth,
        minWidth: leftHidden ? 0 : 280,
        maxWidth: leftHidden ? 0 : 560,
        opacity: leftHidden ? 0 : 1,
        pointerEvents: leftHidden ? "none" : "auto",
      }}
    >
      <AgentChat
        variant="studio"
        title={header}
        studioToolbarSlot={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground" aria-label={t("nav_home")} onClick={() => router.push("/playground")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("nav_home")}</TooltipContent>
            </Tooltip>
            <MenuDrawer compact toolbarLayout="inline" hideCollapseButton lemnityAiBridgeReady={lemnityAiBridgeReady} shouldUseLemnityAiBridge={true} />
            <AiEditorVersionHistoryButton projectId={sessionId ?? ""} isGenerating={isGenerating} onVersionRestoreHtml={handleVersionRestoreHtml} />
          </>
        }
        studioToolbarTrailingSlot={
          <StudioChatRailCollapseButton compact tooltipSide="bottom" leftCollapsed={leftHidden} onToggleCollapse={toggleLeft} />
        }
        messages={messages}
        disabled={isGenerating || promptCoachLoading || !lemnityAiBridgeReady || Boolean(buildTemplate)}
        studioStreamActive={isGenerating}
        onSend={onSend}
        placeholder={studioChatPlaceholder}
        plan={session?.user?.plan ?? null}
        projectKind={projectKind}
        agentTask="prompt-coach"
        onModelHintChange={setAgentHint}
        buildTemplate={buildTemplate}
        onBuildTemplateChange={handleBuildTemplateChange}
        threadStatusSlot={
          streamSteps.length > 0 || streamToolLine
            ? <BuildStreamSteps steps={streamSteps} toolLine={streamToolLine} className="border-0 bg-transparent" />
            : null
        }
        threadScrollKey={chatThreadScrollKey}
        footerSlot={
          isGenerating ? (
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="min-w-0 truncate">{t("playground_right_build_label")} · {interfaceBuildElapsedLabel ?? formatBuildElapsed(0, lang)}</span>
              </div>
              <p className="text-[11px] leading-snug text-foreground/85">{t("playground_choose_assistant_hint")}</p>
              {buildTemplate && streamArtifactChars > 0 ? (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {t("build_template_stream_progress").replace("__N__", streamArtifactChars.toLocaleString(lang === "en" ? "en-GB" : "ru-RU"))}
                </p>
              ) : null}
            </div>
          ) : lastBuildMs != null ? (
            <div className="rounded-lg border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
              {t("build_footer_built_prefix")} {formatBuildTotalDuration(lastBuildMs, lang)}
            </div>
          ) : promptCoachLoading ? (
            <CoachLoadingFooter
              coachSlowHint={coachSlowHint}
              coachAwaitingConfirm={coachAwaitingConfirm}
              agentHint={agentHint}
              promptCoachDebugLine={promptCoachDebugLine}
              t={t}
            />
          ) : promptCoachDebugLine ? (
            <div className="truncate rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
              {promptCoachDebugLine}
            </div>
          ) : null
        }
      />
      {!leftHidden ? (
        <div
          role="separator"
          aria-orientation="vertical"
          className="absolute right-0 top-0 z-10 flex h-full w-4 cursor-col-resize touch-none items-center justify-center"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            dragStateRef.current = { pointerId: e.pointerId, startX: e.clientX, startWidth: leftWidth };
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return;
            setLeftWidth(Math.min(560, Math.max(280, dragStateRef.current.startWidth + e.clientX - dragStateRef.current.startX)));
          }}
          onPointerUp={(e) => {
            if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return;
            dragStateRef.current = null;
            try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
          }}
        >
          <div className="pointer-events-none flex items-center justify-center rounded-md border border-border/80 bg-background/95 px-1 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
            <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          </div>
        </div>
      ) : null}
    </div>
  );

  const previewSlot = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
      <BuildPreviewChrome
        tab={tab}
        documentTabVisible={documentTabVisible}
        onTabChange={(next) => { setTab(next); if (next !== "preview" && next !== "document") setVisualLayoutEditor(false); }}
        sandboxId={sandboxId}
        expandChatRailSlot={
          leftHidden && !buildTemplate
            ? <StudioChatRailCollapseButton compact tooltipSide="bottom" leftCollapsed onToggleCollapse={toggleLeft} />
            : null
        }
        shareMenu={
          <BuildSharePopover sandboxId={sandboxId} hasPreview={Boolean(previewUrl)} shareIsPublic={shareIsPublic} onShareIsPublicChange={setShareIsPublic} t={t} />
        }
        onPublish={() => setPublishDialogOpen(true)}
        publishDisabled={!previewUrl || !sandboxId}
        onHistoryClick={() => router.push("/projects")}
        previewEditorToggle={
          tab === "preview" || tab === "document"
            ? { active: visualLayoutEditor, onToggle: () => setVisualLayoutEditor(!visualLayoutEditor) }
            : undefined
        }
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={cn("flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background", tab !== "preview" && tab !== "document" ? "pointer-events-none invisible absolute inset-0 z-0" : "relative z-10")} aria-hidden={tab !== "preview" && tab !== "document"}>
          <RightPanel
            mode={isGenerating ? "generating" : previewUrl ? "preview" : "idle"}
            progress={progress}
            buildElapsedLabel={isGenerating ? interfaceBuildElapsedLabel : null}
            previewUrl={previewUrl}
            sandboxId={sandboxId}
            projectKind={projectKind}
            streamHint={isGenerating ? streamHint : null}
            previewMimeType={previewArtifactMime}
            previewDownloadFilename={previewDownloadFilename}
            visualEditMode={visualLayoutEditor}
            visualEditPersist={visualEditPersist}
            presentationPdfExport={presentationPdfExport}
            presentationExportsPaid={hasCustomDomainAccess}
            previewVariant={tab === "document" ? "document" : "default"}
            ensurePublicShareForPreviewTab={ensurePublicShareForPreviewTab}
            showOpenInBox={Boolean(previewUrl && sandboxId && !sandboxId.startsWith("artifact_") && projectKind !== "presentation" && projectKind !== "resume" && projectKind !== "lovable")}
            onAiEdit={visualLayoutEditor ? handleAiEdit : undefined}
          />
        </div>
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background m-2 mt-1", tab !== "settings" ? "pointer-events-none invisible absolute inset-0 z-0 m-2 mt-1" : "relative z-10")} aria-hidden={tab !== "settings"}>
          <BuildSettings
            className="min-h-0"
            projectTitle={settingsProjectTitle}
            studioOpenedAt={studioSettingsOpenedAt}
            sandboxId={sandboxId}
            hasPreview={Boolean(previewUrl)}
            shareIsPublic={shareIsPublic}
            onShareIsPublicChange={setShareIsPublic}
            hasProPlan={hasCustomDomainAccess}
            shareBrandingRemovalPaid={Boolean(session?.user?.shareBrandingRemovalPaid)}
            publishSeedText={idea}
            onOpenPublishDialog={() => setPublishDialogOpen(true)}
          />
        </div>
        <div className={cn("flex h-full min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background p-2 sm:p-3", tab !== "code" ? "pointer-events-none invisible absolute inset-0 z-0 m-2 mt-1" : "relative z-10 m-2 mt-1")} aria-hidden={tab !== "code"}>
          <BuildCode className="min-h-0 flex-1" sandboxId={codePanelSandboxId} artifactMimeType={previewArtifactMime} bridgePreviewUrl={previewUrl} bridgeSessionRepair={buildCodeBridgeSessionRepair} />
        </div>
      </div>
    </section>
  );

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col bg-transparent">
        <AiEditorShell chatSlot={chatSlot} previewSlot={previewSlot} />
      </div>
      <BuildPublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onPublish={handlePublishConfirm}
        publishPending={publishPending}
        sandboxId={sandboxId}
        seedText={idea}
        hasCustomDomainAccess={hasCustomDomainAccess}
      />
    </PageTransition>
  );
}

// ─── Coach loading footer (extracted to keep page lean) ───────────────────────

function CoachLoadingFooter({
  coachSlowHint, coachAwaitingConfirm, agentHint, promptCoachDebugLine, t,
}: {
  coachSlowHint: boolean;
  coachAwaitingConfirm: boolean;
  agentHint: import("@/lib/agent-models").AgentPickerLabel;
  promptCoachDebugLine: string | null;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-none border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
      <button type="button" className="flex w-full items-center gap-2 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span className="min-w-0 flex-1">{coachSlowHint ? t("playground_coach_loading_slow") : t("playground_coach_loading")}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="mt-2 space-y-1.5 border-t border-border/70 pt-2 text-[11px] leading-snug">
          <p>{t("playground_coach_details")}</p>
          <p className="text-muted-foreground/95">{coachAwaitingConfirm ? t("playground_coach_stage_confirm") : t("playground_coach_stage_questions")}</p>
          <p className="text-muted-foreground/95">{t("playground_coach_model_prefix")} {formatAgentModelDisplayLabel(agentHint, t)}</p>
          <button type="button" className="text-[11px] font-medium text-primary underline-offset-2 hover:underline" onClick={() => setOpen(false)}>{t("playground_coach_collapse")}</button>
          {process.env.NODE_ENV !== "production" && promptCoachDebugLine ? (
            <p className="font-mono text-[10px] text-muted-foreground">{promptCoachDebugLine}</p>
          ) : null}
        </div>
      ) : (
        <button type="button" className="mt-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline" onClick={() => setOpen(true)}>{t("playground_coach_expand")}</button>
      )}
    </div>
  );
}
```

- [ ] **Шаг 5.3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -60
```

Исправляем все TypeScript ошибки которые появились. Типичные:
- Если `annex` используется в `onSend` deps — вынести объявление наружу или убрать из deps
- Если `setStage` подразумевает `(prev) => ...` форму — добавить перегрузку в store
- Если `coalesceSandboxIdFromBridgePreview` принимает другой тип — привести к `as`

- [ ] **Шаг 5.4: Удалить backup после успешного type-check**

```bash
rm "app/(builder)/playground/build/page.tsx.bak"
```

- [ ] **Шаг 5.5: Коммит**

```bash
git add "app/(builder)/playground/build/page.tsx"
git commit -m "refactor: rewrite build/page.tsx as thin render layer (~300 lines)"
```

---

## Task 6: Финальная проверка и cleanup

**Files:**
- Modify: `app/(builder)/playground/build/page.tsx` (мелкие фиксы если нужны)

- [ ] **Шаг 6.1: Полный type-check**

```bash
npx tsc --noEmit
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 6.2: Проверить, что нет window.dispatchEvent CustomEvent в новых файлах (кроме allowed в use-ai-session.ts)**

```bash
grep -r "dispatchEvent.*CustomEvent" hooks/ lib/stores/ "app/(builder)/playground/build/"
```

Ожидаем: только `hooks/use-ai-session.ts` строка `notifySandboxFilesUpdated`.

- [ ] **Шаг 6.3: Проверить отсутствие legacy generate-stream импортов на странице**

```bash
grep "generate-stream\|shouldUseLemnityAiBridge\|handleGenerate\|handleCreateQuestions\|handleComposePrompt" "app/(builder)/playground/build/page.tsx"
```

Ожидаем: пустой вывод.

- [ ] **Шаг 6.4: Smoke test (ручной)**

1. Открыть `/playground/build`
2. Ввести идею → должен запуститься промпт-коуч (stage: questions)
3. Ответить на вопросы → должен появиться финальный промпт с `showActions`
4. Подтвердить → должна запуститься генерация, SSE-стрим, появиться превью
5. Написать правку в чате после превью → должна запуститься новая генерация
6. Перейти в каталог шаблонов → выбрать шаблон → превью должно загрузиться без промпт-коуча
7. Обновить страницу с `?sessionId=...` в URL → история чата должна восстановиться

- [ ] **Шаг 6.5: Коммит**

```bash
git add -A
git commit -m "chore: remove legacy build page backup, finalize Lovable-style refactor"
```

---

## Self-Review checklist

**Spec coverage:**
- [x] Store extended — Task 1
- [x] useAiSession (ensureSession, loadSession, sendChat, cancelStream, SSE parser) — Task 2
- [x] usePromptCoach (runPromptCoach, stages, slow-hint) — Task 3
- [x] useBuildHandoff (handoff из landing) — Task 4
- [x] build/page.tsx переписана (~300 строк) — Task 5
- [x] Удалён legacy generate-stream — в Task 5 onSend, Task 6 проверка
- [x] Session ID только в store (нет activeLemnityAiBridgeSessionRef) — Task 2 и Task 5
- [x] window.dispatchEvent → только в use-ai-session.ts — Task 6 проверка
- [x] Snapshot сохранение после preview — Task 2 (saveSnapshot)
- [x] loadSession после завершения стрима — Task 2 (finally block)
- [x] Template preview (runBuildTemplatePreview) остаётся в странице — Task 5
- [x] useBuildHandoff получает runBuildTemplatePreview как callback — Task 4

**Placeholder scan:** нет TBD / TODO / "реализовать позже" — весь код конкретный.

**Type consistency:**
- `appendMessage` определён в Task 1, используется в Task 2, 3, 5 — совпадает.
- `updateMessageContent` определён в Task 1, используется в Task 2 — совпадает.
- `setProgress` принимает `number | ((prev: number) => number)` — Task 1 и Task 2 совпадают.
- `BuildTemplate` тип экспортируется из store — Task 1, используется в Task 5.
