"use client";

import { ArrowLeft, ArrowLeftRight, ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { AgentChat, type ChatMessage } from "@/components/playground/agent-chat";
import { BuildCode } from "@/components/playground/build-code";
import { BuildPublishDialog } from "@/components/playground/build-publish-dialog";
import { BuildPreviewChrome } from "@/components/playground/build-topbar";
import { BuildSettings } from "@/components/playground/build-settings";
import { MenuDrawer, StudioChatRailCollapseButton } from "@/components/playground/menu-drawer";
import { isPptxArtifact } from "@/components/playground/preview-frame";
import { RightPanel } from "@/components/playground/right-panel";
import { PageTransition } from "@/components/page-transition";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BuildSharePopover } from "@/components/playground/build-share-popover";
import { BuildStreamSteps } from "@/components/playground/build-stream-steps";
import { useBuildStreamLog } from "@/hooks/use-build-stream-log";
import { consumeDataSseBuffer } from "@/lib/client-sse";
import {
  BUILDER_LAST_PROCESSED_NAV_KEY,
  BUILDER_NAV_TOKEN_KEY,
  isHandoffTemplateDirectPreview,
  readBuilderHandoff,
  saveBuilderHandoff
} from "@/lib/landing-handoff";
import { rememberBuildSessionForPuckReturn } from "@/lib/lemnity-puck-build-nav";
import { useLemnityAiBridgeFromServer } from "@/hooks/use-lemnity-ai-bridge-from-server";
import {
  buildPublicSharePageUrl,
  deriveSandboxIdFromAppPreviewUrl,
  resolvePublishOpenUrl,
  resolveShareablePreviewUrl
} from "@/lib/preview-share";
import type { AgentUiLabel } from "@/lib/agent-models";
import { isAffirmativeUserReply } from "@/lib/affirmative-reply";
import {
  formatAttachmentsForLemnityChat,
  mergeUserMessageWithAttachments,
  playgroundUserDisplayContent
} from "@/lib/chat-attachments";
import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import type { PromptQA } from "@/types/prompt-builder";
import type { StreamEvent } from "@/types/build-stream";
import { isLovableFileFenceDelta, shouldCollapseAssistantCodeDump } from "@/lib/chat-artifact-ui";
import { formatBuildElapsed, formatBuildTotalDuration } from "@/lib/build-time-i18n";
import { sanitizeProjectTitleForUser } from "@/lib/display-title";
import { getStreamStepTitle } from "@/lib/stream-step-title";
import {
  formatLemnityAssistantStreamText,
  formatLemnityBridgeErrorBody,
  looksLikeHtmlGatewayGarbage
} from "@/lib/lemnity-bridge-error-format";

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

type LemnityAiChatMessageEvent = {
  role?: "user" | "assistant";
  content?: string;
};

type LemnityAiStepEvent = {
  id?: string;
  description?: string;
  status?: string;
};

type LemnityAiToolEvent = {
  name?: string;
  status?: string;
  function?: string;
  args?: Record<string, unknown>;
};

type LemnityAiPlanEvent = {
  steps?: Array<{ id?: string; description?: string; status?: string }>;
};

type LemnityAiPreviewEvent = {
  previewUrl?: string;
  sandboxId?: string;
  mimeType?: string;
  filename?: string | null;
  pdfExport?: { previewUrl?: string; filename?: string };
};

function mapLemnityAiStepStatus(status?: string): "pending" | "running" | "completed" | "failed" {
  if (!status) return "running";
  const s = status.toLowerCase();
  if (s === "pending" || s === "queued" || s === "waiting") return "pending";
  if (
    s === "completed" ||
    s === "complete" ||
    s === "done" ||
    s === "success" ||
    s === "succeeded" ||
    s === "finished" ||
    s === "ok"
  ) {
    return "completed";
  }
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") return "failed";
  if (s === "running" || s === "in_progress" || s === "in-progress" || s === "active" || s === "working") {
    return "running";
  }
  return "running";
}

function parseLemnityAiSseChunk(chunk: string): { event: string; data: string | null } | null {
  if (!chunk.trim()) return null;
  const lines = chunk.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }
  return { event, data: dataLines.length ? dataLines.join("\n") : null };
}

function sseEventName(event: string): string {
  return event.trim().toLowerCase();
}

/** Клиент: обновить список файлов превью (галерея, вкладка «Файлы проекта»). */
function emitSandboxFilesUpdated(sandboxId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const s = sandboxId != null ? String(sandboxId).trim() : "";
  if (!s) return;
  window.dispatchEvent(new CustomEvent("lemnity:sandbox-files-updated", { detail: { sandboxId: s } }));
}

export default function PromptBuildPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { ready: lemnityAiBridgeReady, fullParity: shouldUseLemnityAiBridge } = useLemnityAiBridgeFromServer();
  const requestedSessionId = searchParams.get("sessionId");
  const requestedSandboxId = searchParams.get("sandboxId")?.trim() || null;
  const mountedRef = useRef(true);
  const requestAbortRef = useRef<AbortController | null>(null);
  const streamRequestSeqRef = useRef(0);
  const sessionLoadSeqRef = useRef(0);
  const streamActiveRef = useRef(false);
  /** id песочницы из live SSE `preview` — защищает от перезаписи устаревшим GET /sessions после стрима */
  const lastSsePreviewSandboxIdRef = useRef<string | null>(null);
  /** Песочница, созданная только для мгновенного превью стартового шаблона (до ответа агента). */
  const templatePreviewSandboxIdRef = useRef<string | null>(null);
  const pendingProjectIdRef = useRef<string | null>(requestedSandboxId);
  const [hostProjectId, setHostProjectId] = useState<string | null>(null);
  /** После первого завершения GET /api/projects/current (или ошибки сети) — чтобы handoff превью шаблона не летел до прихода контекста хост-проекта. */
  const [projectScopeReady, setProjectScopeReady] = useState(false);
  const hostProjectIdRef = useRef<string | null>(null);
  const sandboxIdReserveRef = useRef<string | null>(null);
  const templatePreviewAbortRef = useRef<AbortController | null>(null);
  const templatePreviewReqSeqRef = useRef(0);
  const bridgeAssistantMessageIdRef = useRef<string | null>(null);
  const bridgeSawDeltaRef = useRef(false);
  const coachRequestSeqRef = useRef(0);
  const [idea, setIdea] = useState("");
  const [stage, setStage] = useState<"idea" | "questions" | "ready" | "generating">("idea");
  const [questions, setQuestions] = useState<string[]>([]);
  const [qa, setQa] = useState<PromptQA[]>([]);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<"idle" | "generating" | "preview">("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [buildTimerTick, setBuildTimerTick] = useState(0);
  const [lastInterfaceBuildMs, setLastInterfaceBuildMs] = useState<number | null>(null);
  const interfaceBuildStartedAtRef = useRef<number | null>(null);
  const interfaceBuildGotPreviewRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [previewArtifactMime, setPreviewArtifactMime] = useState<string | null>(null);
  const [previewDownloadFilename, setPreviewDownloadFilename] = useState<string | null>(null);
  const [presentationPdfExport, setPresentationPdfExport] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const [shareIsPublic, setShareIsPublic] = useState(false);
  /** Стартовый шаблон Vite+TSX из БД — агент правит файлы, а не пишет с нуля */
  const [buildTemplate, setBuildTemplate] = useState<{
    slug: string;
    name: string;
    defaultUserPrompt: string;
  } | null>(null);
  /** Символы потока ответа (включая код), чтобы видеть ход генерации при шаблоне */
  const [streamArtifactChars, setStreamArtifactChars] = useState(0);
  /** `null` — ещё не подгрузили с GET /share; совпадает с футером /share. */
  const [studioSettingsOpenedAt] = useState(() => new Date());
  const [tab, setTab] = useState<"preview" | "document" | "settings" | "code">("preview");
  const [visualLayoutEditor, setVisualLayoutEditor] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(400);
  const [projectKind, setProjectKind] = useState<ProjectKind | null>(null);
  const [agentHint, setAgentHint] = useState<AgentUiLabel>("GPT-4.1");
  const [coachAwaitingConfirm, setCoachAwaitingConfirm] = useState(false);
  const [pendingTechnicalPrompt, setPendingTechnicalPrompt] = useState<string | null>(null);
  const [promptCoachLoading, setPromptCoachLoading] = useState(false);
  const [promptCoachDebugLine, setPromptCoachDebugLine] = useState<string | null>(null);
  const [promptBuilderDebugLine, setPromptBuilderDebugLine] = useState<string | null>(null);
  const [coachDetailOpen, setCoachDetailOpen] = useState(false);
  const [coachSlowHint, setCoachSlowHint] = useState(false);
  const [lemnityAiSessionId, setLemnityAiSessionId] = useState<string | null>(requestedSessionId);
  const [sessionNeedsResync, setSessionNeedsResync] = useState(false);
  const leftWidthBeforeCollapseRef = useRef(400);
  const togglePlaygroundLeftRail = useCallback(() => {
    setLeftCollapsed((v) => {
      const next = !v;
      if (next) {
        leftWidthBeforeCollapseRef.current = leftWidth;
      } else {
        setLeftWidth(leftWidthBeforeCollapseRef.current || 400);
      }
      return next;
    });
  }, [leftWidth]);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const {
    steps: streamSteps,
    toolLine: streamToolLine,
    reset: resetStreamLog,
    applyEvent: applyStreamLog,
    markStreamFinished
  } = useBuildStreamLog();

  const visualEditPersist = useMemo(() => {
    if (!sandboxId || typeof previewUrl !== "string") return false;
    if (isPptxArtifact(previewArtifactMime)) return false;
    if (sandboxId.startsWith("artifact_") && previewUrl.includes("/api/lemnity-ai/artifacts/")) {
      return true;
    }
    if (!sandboxId.startsWith("artifact_") && previewUrl.startsWith("/api/sandbox/")) {
      return true;
    }
    return false;
  }, [sandboxId, previewUrl, previewArtifactMime]);

  const beginInterfaceBuildTiming = useCallback(() => {
    interfaceBuildStartedAtRef.current = Date.now();
    interfaceBuildGotPreviewRef.current = false;
    setLastInterfaceBuildMs(null);
  }, []);

  const finalizeInterfaceBuildTiming = useCallback(() => {
    const start = interfaceBuildStartedAtRef.current;
    interfaceBuildStartedAtRef.current = null;
    if (start == null) return;
    const ms = Date.now() - start;
    if (interfaceBuildGotPreviewRef.current) {
      setLastInterfaceBuildMs(ms);
    } else {
      setLastInterfaceBuildMs(null);
    }
    interfaceBuildGotPreviewRef.current = false;
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const id = window.setInterval(() => setBuildTimerTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [isGenerating]);

  const interfaceBuildElapsedLabel = useMemo(() => {
    void buildTimerTick;
    const start = interfaceBuildStartedAtRef.current;
    if (!isGenerating || start == null) return null;
    return formatBuildElapsed(Date.now() - start, lang);
  }, [isGenerating, buildTimerTick, lang]);

  const streamHint = useMemo(() => {
    if (streamToolLine) return streamToolLine;
    const last = streamSteps[streamSteps.length - 1];
    if (!last) return null;
    return `${getStreamStepTitle(last.id, t)}: ${last.description}`;
  }, [streamToolLine, streamSteps, t]);

  const chatThreadScrollKey = useMemo(
    () =>
      `${stage}:${idea.length}:${finalPrompt.length}:${streamSteps.map((s) => `${s.id}:${s.status}`).join("|")}:${streamToolLine ?? ""}:${isGenerating}:${promptCoachLoading}:${Math.round(progress)}:${messages.length}:${coachAwaitingConfirm}`,
    [
      stage,
      idea,
      finalPrompt,
      streamSteps,
      streamToolLine,
      isGenerating,
      promptCoachLoading,
      progress,
      messages.length,
      coachAwaitingConfirm
    ]
  );

  const header = useMemo(() => {
    if (shouldUseLemnityAiBridge && buildTemplate) {
      return t("playground_build_chat_header_template_focus").replace(
        "{name}",
        buildTemplate.name.trim() || buildTemplate.slug
      );
    }
    if (shouldUseLemnityAiBridge && coachAwaitingConfirm) return "Шаг 2/3 — Подтверждение промпта";
    if (stage === "questions")
      return shouldUseLemnityAiBridge ? "Шаг 1/3 — Диалог с ИИ" : "Шаг 1/3 — Уточняющие вопросы";
    if (stage === "ready") return "Шаг 2/3 — Финальный промпт";
    if (stage === "generating") return "Шаг 3/3 — Генерация";
    return "Сборка промпта";
  }, [stage, shouldUseLemnityAiBridge, coachAwaitingConfirm, buildTemplate, t]);

  const studioChatPlaceholder = useMemo(() => {
    if (shouldUseLemnityAiBridge && buildTemplate) {
      return t("playground_chat_placeholder_template_focus");
    }
    return t("playground_chat_input_placeholder_studio");
  }, [shouldUseLemnityAiBridge, buildTemplate, t]);

  const handleChatVisualEditorToggle = useCallback(() => {
    if (!previewUrl) return;
    if (isPptxArtifact(previewArtifactMime)) return;
    if (tab === "code" || tab === "settings") {
      setTab("preview");
      setVisualLayoutEditor(true);
      return;
    }
    if (tab === "document") {
      setVisualLayoutEditor(true);
      return;
    }
    setVisualLayoutEditor((v) => !v);
  }, [previewUrl, previewArtifactMime, tab]);

  const visualEditorInChat = useMemo(() => {
    if (!previewUrl || isPptxArtifact(previewArtifactMime)) return null;
    return {
      active: (tab === "preview" || tab === "document") && visualLayoutEditor,
      onToggle: handleChatVisualEditorToggle
    };
  }, [previewUrl, previewArtifactMime, tab, visualLayoutEditor, handleChatVisualEditorToggle]);

  const settingsProjectTitle = useMemo(() => {
    const raw = finalPrompt.trim() || idea.trim();
    if (!raw) return "";
    const cleaned = sanitizeProjectTitleForUser(raw);
    if (cleaned.length > 120) return `${cleaned.slice(0, 117)}…`;
    return cleaned;
  }, [finalPrompt, idea]);

  const handlePublishPreview = useCallback(() => {
    setPublishDialogOpen(true);
  }, []);

  const handlePublishConfirm = useCallback(async (detail?: { openUrl?: string }) => {
    if (typeof window === "undefined") return;
    const rawOk = resolveShareablePreviewUrl(previewUrl, window.location.origin);
    if (!rawOk || !sandboxId) {
      toast.error(t("playground_build_publish_no_preview"));
      return;
    }
    const origin = window.location.origin;
    try {
      setPublishPending(true);
      if (!shareIsPublic) {
        let res = await fetch("/api/sandbox/share", { method: "POST" });
        if (res.status === 404) {
          res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { method: "POST" });
        }
        if (!res.ok) {
          const msg = await res.text();
          toast.error(msg || t("playground_build_share_error_instant"));
          return;
        }
        setShareIsPublic(true);
      }
      const publicUrl = resolvePublishOpenUrl(origin, sandboxId, detail?.openUrl);
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      setPublishDialogOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: "assistant" as const,
          content:
            "Ссылка на публичную страницу превью открыта. Управлять доступом можно в «Поделиться» (приват / публично).",
          sentAt: Date.now()
        }
      ]);
      toast.message(t("playground_build_publish_opened"));
    } finally {
      setPublishPending(false);
    }
  }, [previewUrl, sandboxId, shareIsPublic, t]);

  /** Перед открытием вкладки «Просмотр» — включаем публичный доступ как при публикации, чтобы загрузился /share/{sandboxId}. */
  const ensurePublicShareForPreviewTab = useCallback(async () => {
    if (!sandboxId) return false;
    if (shareIsPublic) return true;
    let res = await fetch("/api/sandbox/share", { method: "POST" });
    if (res.status === 404) {
      res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { method: "POST" });
    }
    if (!res.ok) return false;
    setShareIsPublic(true);
    return true;
  }, [sandboxId, shareIsPublic]);

  const planFromSession = String(session?.user?.plan ?? "");

  const hasCustomDomainAccess = planFromSession === "PRO" || planFromSession === "TEAM" || planFromSession === "BUSINESS";

  const documentTabVisible = useMemo(
    () =>
      Boolean(
        previewUrl &&
          sandboxId &&
          (projectKind === "resume" || projectKind === "presentation") &&
          !isPptxArtifact(previewArtifactMime)
      ),
    [previewUrl, sandboxId, projectKind, previewArtifactMime]
  );

  useEffect(() => {
    if (!documentTabVisible && tab === "document") {
      setTab("preview");
    }
  }, [documentTabVisible, tab]);

  useEffect(() => {
    if (tab === "document") {
      setVisualLayoutEditor(true);
    }
  }, [tab]);

  const createMessageId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  useEffect(() => {
    hostProjectIdRef.current = hostProjectId;
  }, [hostProjectId]);

  useEffect(() => {
    sandboxIdReserveRef.current = sandboxId;
  }, [sandboxId]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/projects/current", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const payload = (await res.json().catch(() => null)) as { project?: { id?: string } } | null;
        const id = typeof payload?.project?.id === "string" ? payload.project.id.trim() : "";
        if (!id || cancelled) return;
        setHostProjectId(id);
        pendingProjectIdRef.current = id;
      })
      .catch(() => {
        /* apex / ошибка — остаёмся без hostProjectId */
      })
      .finally(() => {
        if (!cancelled) setProjectScopeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reserveProjectId = useCallback(() => {
    const h = hostProjectIdRef.current?.trim();
    if (h) {
      pendingProjectIdRef.current = h;
      return h;
    }
    const sid = sandboxIdReserveRef.current?.trim();
    if (sid) {
      pendingProjectIdRef.current = sid;
      return sid;
    }
    if (pendingProjectIdRef.current?.trim()) {
      return pendingProjectIdRef.current.trim();
    }
    const next =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pendingProjectIdRef.current = next;
    return next;
  }, []);

  const push = useCallback(
    (
      role: ChatMessage["role"],
      content: string,
      opts?: {
        showActions?: boolean;
        promptPlainText?: string;
        actionMeta?: { durationMs: number; totalTokens?: number };
      }
    ) => {
      const ts = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role,
          content,
          sentAt: ts,
          ...(opts?.showActions ? { showActions: true as const } : {}),
          ...(opts?.promptPlainText ? { promptPlainText: opts.promptPlainText } : {}),
          ...(opts?.actionMeta ? { actionMeta: opts.actionMeta } : {})
        }
      ]);
    },
    [createMessageId]
  );

  const appendBridgeAssistantChunk = useCallback((chunk: string) => {
    if (!chunk) return;
    setMessages((prev) => {
      const existingId = bridgeAssistantMessageIdRef.current;
      if (existingId) {
        const idx = prev.findIndex((m) => m.id === existingId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], content: `${next[idx].content}${chunk}` };
          return next;
        }
      }
      const id = createMessageId();
      bridgeAssistantMessageIdRef.current = id;
      return [...prev, { id, role: "assistant", content: chunk, sentAt: Date.now() }];
    });
  }, [createMessageId]);

  const pushBridgeAssistantMessage = useCallback(
    (content: string) => {
    const normalized = content.trim();
    if (!normalized) return;
    const forChat = shouldCollapseAssistantCodeDump(normalized)
      ? t("playground_chat_code_moved_to_code_tab")
      : normalized;
    setMessages((prev) => {
      const existingId = bridgeAssistantMessageIdRef.current;
      if (!existingId) {
        const id = createMessageId();
        bridgeAssistantMessageIdRef.current = id;
        return [...prev, { id, role: "assistant", content: forChat, sentAt: Date.now() }];
      }

      const idx = prev.findIndex((m) => m.id === existingId);
      if (idx === -1) {
        const id = createMessageId();
        bridgeAssistantMessageIdRef.current = id;
        return [...prev, { id, role: "assistant", content: forChat, sentAt: Date.now() }];
      }

      if (!bridgeSawDeltaRef.current) {
        const next = [...prev];
        next[idx] = { ...next[idx], content: forChat };
        return next;
      }

      const current = prev[idx].content.trim();
      if (forChat === current) return prev;
      if (forChat.startsWith(current) || current.startsWith(forChat)) {
        const next = [...prev];
        next[idx] = { ...next[idx], content: forChat };
        return next;
      }

      const id = createMessageId();
      bridgeAssistantMessageIdRef.current = id;
      return [...prev, { id, role: "assistant", content: forChat, sentAt: Date.now() }];
    });
  },
    [createMessageId, t]
  );

  const loadLemnityAiSession = useCallback(
    async (sessionId: string) => {
      try {
        const loadSeq = ++sessionLoadSeqRef.current;
        const res = await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            headers: hostProjectId
              ? undefined
              : {
                  "X-Project-Id": sessionId
                }
          }
        );
        if (!res.ok) return;
        if (!mountedRef.current || sessionLoadSeqRef.current !== loadSeq) return;
        const envelope = (await res.json()) as LemnityAiBridgeEnvelope<LemnityAiSessionPayload>;
        const payload = envelope?.data;
        if (!payload) return;
        if (!mountedRef.current || sessionLoadSeqRef.current !== loadSeq) return;
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
        if (payload.title?.trim()) {
          setIdea((prev) => (prev.trim() ? prev : payload.title?.trim() || prev));
        }
        const evs =
          events.filter(
            (event) => event?.event === "message" && typeof event.data?.content === "string"
          ) ?? [];
        const nextMessages: ChatMessage[] = evs.map((event, i) => {
          const raw = typeof event.data?.content === "string" ? event.data.content : "";
          const content =
            event.data?.role === "user" || !shouldCollapseAssistantCodeDump(raw)
              ? raw
              : t("playground_chat_code_moved_to_code_tab");
          return {
            id: `${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`,
            role: event.data?.role === "user" ? "user" : "assistant",
            content,
            sentAt: Date.now() - (evs.length - 1 - i) * 2000
          };
        });
        if (nextMessages.length) {
          setMessages(nextMessages);
          setStage("ready");
        }
        const lastUserMessageIndex = (() => {
          for (let i = events.length - 1; i >= 0; i -= 1) {
            const event = events[i];
            if (event?.event === "message" && event.data?.role === "user") return i;
          }
          return -1;
        })();
        const relevantEvents = events.slice(Math.max(0, lastUserMessageIndex));
        const lastPreviewFromSlice = [...relevantEvents]
          .reverse()
          .find((event) => event?.event === "preview" && typeof event.data?.previewUrl === "string")?.data;
        const lastPreviewFromFullSession = [...events]
          .reverse()
          .find((event) => event?.event === "preview" && typeof event.data?.previewUrl === "string")?.data;
        type BridgePreviewPick = typeof lastPreviewFromSlice;
        const coerceBridgePreview = (raw: BridgePreviewPick): BridgePreviewPick => {
          if (!raw?.previewUrl) return undefined;
          const sid =
            typeof raw.sandboxId === "string" && raw.sandboxId.trim()
              ? raw.sandboxId.trim()
              : deriveSandboxIdFromAppPreviewUrl(raw.previewUrl);
          return sid ? { ...raw, sandboxId: sid } : undefined;
        };
        const coercedSlice = coerceBridgePreview(lastPreviewFromSlice);
        const coercedFull = coerceBridgePreview(lastPreviewFromFullSession);
        const previewPick =
          coercedSlice?.previewUrl && coercedSlice.sandboxId
            ? ({ source: "slice" as const, data: coercedSlice })
            : coercedFull?.previewUrl && coercedFull.sandboxId
              ? ({ source: "fullFallback" as const, data: coercedFull })
              : ({ source: "none" as const, data: undefined as BridgePreviewPick });
        const lastPreview = previewPick.data;

        if (lastPreview?.previewUrl && lastPreview.sandboxId) {
          const loadedSbx = String(lastPreview.sandboxId);
          const liveSse = lastSsePreviewSandboxIdRef.current;
          const templateCatalogSbx = templatePreviewSandboxIdRef.current;
          if (templateCatalogSbx && templateCatalogSbx !== loadedSbx) {
            // Превью открыто из каталога шаблонов; GET /sessions несёт устаревший last preview другой сборки — не затирать UI.
          } else if (liveSse && liveSse !== loadedSbx) {
            // Уже пришла более новая песочница по стриму; в GET ещё старый last preview — не откатывать UI.
          } else {
            templatePreviewSandboxIdRef.current = null;
            setPreviewUrl(lastPreview.previewUrl);
            setSandboxId(lastPreview.sandboxId);
            emitSandboxFilesUpdated(lastPreview.sandboxId);
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
            setMode("preview");
            setProgress(100);
            setIsGenerating(false);
            setSessionNeedsResync(false);
          }
        } else if (!streamActiveRef.current) {
          if (statusIsRunning) {
            setIsGenerating(true);
            setMode("generating");
            setStage("generating");
            setSessionNeedsResync(true);
          } else {
            setIsGenerating(false);
            setMode((prev) => (prev === "generating" ? "idle" : prev));
            setStage((prev) => (prev === "generating" ? "ready" : prev));
            setSessionNeedsResync(false);
          }
        }
        resetStreamLog();
        for (const event of events) {
          if (event?.event === "plan") {
            for (const step of event.data?.steps ?? []) {
              if (!step.id && !step.description) continue;
              applyStreamLog({
                type: "step",
                id: step.id || "step",
                description: step.description || "Шаг",
                status: mapLemnityAiStepStatus(step.status)
              });
            }
          }
          if (event?.event === "step") {
            applyStreamLog({
              type: "step",
              id: event.data?.id || "step",
              description: event.data?.description || "Шаг",
              status: mapLemnityAiStepStatus(event.data?.status)
            });
          }
          if (event?.event === "tool") {
            applyStreamLog({
              type: "tool",
              name: event.data?.name || "tool",
              status: event.data?.status === "called" ? "called" : "calling",
              detail:
                typeof event.data?.function === "string"
                  ? event.data.function
                  : undefined
            });
          }
        }
      } catch {
        // ignore
      }
    },
    [applyStreamLog, hostProjectId, resetStreamLog, t]
  );

  const ensureLemnityAiSession = useCallback(async (): Promise<
    { ok: true; sessionId: string } | { ok: false; message: string }
  > => {
    if (lemnityAiSessionId) return { ok: true, sessionId: lemnityAiSessionId };
    try {
      const res = await fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`, {
        method: "PUT",
        credentials: "include"
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
        const errText = await res.text();
        return { ok: false, message: formatLemnityBridgeErrorBody(errText, t) };
      }
      const envelope = (await res.json()) as LemnityAiBridgeEnvelope<{ session_id?: string }>;
      const createdId = envelope?.data?.session_id;
      if (!createdId) return { ok: false, message: t("playground_session_create_error") };
      setLemnityAiSessionId(createdId);
      router.replace(`/playground/build?sessionId=${encodeURIComponent(createdId)}`);
      return { ok: true, sessionId: createdId };
    } catch {
      return { ok: false, message: t("playground_session_create_error") };
    }
  }, [lemnityAiSessionId, router, t]);

  const sendLemnityAiChat = useCallback(
    async (messagePayload: string, opts?: { buildTemplateSlug?: string | null }) => {
      const effectiveBuildTemplateSlug =
        opts?.buildTemplateSlug !== undefined ? opts.buildTemplateSlug : (buildTemplate?.slug ?? null);
      pushRecent(
        messagePayload.slice(0, 120),
        effectiveBuildTemplateSlug?.trim()
          ? { templateSlug: effectiveBuildTemplateSlug.trim() }
          : undefined
      );
      const ensured = await ensureLemnityAiSession();
      if (ensured.ok === false) {
        push("assistant", `❌ ${ensured.message}`);
        return;
      }
      const sid = ensured.sessionId;

      beginInterfaceBuildTiming();
      streamActiveRef.current = true;
      setIsGenerating(true);
      setMode("generating");
      setStage("generating");
      setProgress(10);
      setStreamArtifactChars(0);
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
      const isCurrentRequest = () =>
        mountedRef.current &&
        !controller.signal.aborted &&
        requestAbortRef.current === controller &&
        streamRequestSeqRef.current === requestSeq;
      bridgeAssistantMessageIdRef.current = null;
      bridgeSawDeltaRef.current = false;
      try {
        const response = await fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(sid)}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "X-LMNT-UI-Lang": lang,
            ...(hostProjectId ? {} : { "X-Project-Id": sid })
          },
          credentials: "include",
          body: JSON.stringify({
            message: messagePayload,
            timestamp: Math.floor(Date.now() / 1000),
            event_id: eventId,
            agent_hint: agentHint,
            project_kind: projectKind ?? undefined,
            ...(effectiveBuildTemplateSlug ? { build_template_slug: effectiveBuildTemplateSlug } : {})
          }),
          signal: controller.signal
        });
        if (!isCurrentRequest()) return;
        if (!response.ok || !response.body) {
          const raw = await response.text().catch(() => "");
          if (!isCurrentRequest()) return;
          const message = formatLemnityBridgeErrorBody(raw, t);
          push("assistant", `❌ ${message}`);
          setMode("idle");
          setStage("ready");
          return;
        }

        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (contentType.includes("text/html")) {
          const raw = await response.text();
          if (!isCurrentRequest()) return;
          const message = formatLemnityBridgeErrorBody(raw, t);
          push("assistant", `❌ ${message}`);
          setMode("idle");
          setStage("ready");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleSseBlock = (rawChunk: string) => {
          if (!isCurrentRequest()) return;
          const chunk = parseLemnityAiSseChunk(rawChunk);
          if (!chunk) return;
          const ev = sseEventName(chunk.event);

          if (ev === "done") {
            markStreamFinished();
            setProgress(100);
            setMode("idle");
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
                setStreamArtifactChars((c) => c + piece.length);
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
              const data = JSON.parse(chunk.data) as LemnityAiChatMessageEvent & { text?: string };
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
              const data = JSON.parse(chunk.data) as LemnityAiStepEvent;
              applyStreamLog({
                type: "step",
                id: data.id || "step",
                description: data.description || "Шаг",
                status: mapLemnityAiStepStatus(data.status)
              });
              setProgress((prev) => Math.min(92, Math.max(prev, prev + 5)));
              return;
            }

            if (ev === "tool") {
              const data = JSON.parse(chunk.data) as LemnityAiToolEvent;
              const argDetail =
                data.args && typeof data.args === "object"
                  ? Object.values(data.args).find((value) => typeof value === "string")
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
                      : undefined
              });
              return;
            }

            if (ev === "plan") {
              const data = JSON.parse(chunk.data) as LemnityAiPlanEvent;
              for (const step of data.steps ?? []) {
                applyStreamLog({
                  type: "step",
                  id: step.id || "step",
                  description: step.description || "Шаг",
                  status: mapLemnityAiStepStatus(step.status)
                });
              }
              return;
            }

            if (ev === "title") {
              const data = JSON.parse(chunk.data) as { title?: string };
              if (data.title?.trim()) {
                setIdea((prev) => (prev.trim() ? prev : data.title!.trim()));
              }
              return;
            }

            if (ev === "error") {
              const data = JSON.parse(chunk.data) as { error?: string };
              const rawErr = typeof data.error === "string" ? data.error : "";
              const message = rawErr.trim()
                ? formatLemnityBridgeErrorBody(rawErr, t)
                : t("playground_lemnity_api_network_error");
              push("assistant", `❌ ${message}`);
              setMode("idle");
              setStage("ready");
              return;
            }

            if (ev === "preview") {
              const data = JSON.parse(chunk.data) as LemnityAiPreviewEvent;
              if (data.previewUrl && data.sandboxId) {
                interfaceBuildGotPreviewRef.current = true;
                lastSsePreviewSandboxIdRef.current = String(data.sandboxId);
                templatePreviewSandboxIdRef.current = null;
                setPreviewUrl(data.previewUrl);
                setSandboxId(data.sandboxId);
                emitSandboxFilesUpdated(data.sandboxId);
                setPreviewArtifactMime(typeof data.mimeType === "string" ? data.mimeType : null);
                setPreviewDownloadFilename(typeof data.filename === "string" ? data.filename : null);
                const pe = data.pdfExport;
                if (pe?.previewUrl && pe?.filename) {
                  setPresentationPdfExport({ url: pe.previewUrl, filename: pe.filename });
                } else {
                  setPresentationPdfExport(null);
                }
                setShareIsPublic(false);
                setMode("preview");
                setStage("ready");
                setProgress(100);
                const isPptx =
                  typeof data.mimeType === "string" && data.mimeType.includes("presentationml");
                push(
                  "assistant",
                  isPptx
                    ? "✅ Презентация PowerPoint (.pptx) готова — скачай файл справа. Напиши, что поменять в содержании или структуре слайдов."
                    : "✅ Превью готово. Можешь написать, что изменить — я обновлю сборку следующим шагом."
                );
              }
            }
          } catch {
            // ignore invalid sse payloads
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (!isCurrentRequest()) break;
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
        if (buffer.trim()) {
          handleSseBlock(buffer);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          if (!isCurrentRequest()) return;
          push("assistant", "❌ Ошибка стрима Lemnity AI");
        }
      } finally {
        if (isCurrentRequest()) {
          markStreamFinished();
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
                  content: formatLemnityAssistantStreamText(c, t)
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
          finalizeInterfaceBuildTiming();
          setIsGenerating(false);
          setMode((prev) => (prev === "generating" ? "idle" : prev));
          setStage((prev) => (prev === "generating" ? "ready" : prev));
          void loadLemnityAiSession(sid);
        } else {
          interfaceBuildStartedAtRef.current = null;
          interfaceBuildGotPreviewRef.current = false;
        }
        streamActiveRef.current = false;
      }
    },
    [
      agentHint,
      appendBridgeAssistantChunk,
      applyStreamLog,
      beginInterfaceBuildTiming,
      buildTemplate,
      ensureLemnityAiSession,
      finalizeInterfaceBuildTiming,
      loadLemnityAiSession,
      markStreamFinished,
      projectKind,
      push,
      pushBridgeAssistantMessage,
      t,
      lang,
      hostProjectId
    ]
  );

  const runBuildTemplatePreview = useCallback(
    async (slug: string) => {
      const projectId = reserveProjectId();
      templatePreviewAbortRef.current?.abort();
      const controller = new AbortController();
      templatePreviewAbortRef.current = controller;
      const seq = ++templatePreviewReqSeqRef.current;
      try {
        const res = await fetch("/api/build-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            slug,
            projectId
          }),
          signal: controller.signal
        });

        if (!mountedRef.current || templatePreviewReqSeqRef.current !== seq) return;
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          let detail = raw.trim();
          try {
            const j = JSON.parse(raw) as { error?: unknown };
            if (typeof j.error === "string" && j.error.trim()) {
              detail = j.error.trim();
            }
          } catch {
            /* ответ текстом/HTML */
          }
          toast.error(detail || t("playground_build_template_preview_error"));
          return;
        }
        let data: { previewUrl?: string; sandboxId?: string };
        try {
          data = (await res.json()) as { previewUrl?: string; sandboxId?: string };
        } catch {
          toast.error(t("playground_build_template_preview_error"));
          return;
        }
        if (!data.previewUrl || !data.sandboxId) {
          toast.error(t("playground_build_template_preview_error"));
          return;
        }
        if (!mountedRef.current || templatePreviewReqSeqRef.current !== seq) return;
        templatePreviewSandboxIdRef.current = String(data.sandboxId);
        setPreviewUrl(data.previewUrl);
        setSandboxId(data.sandboxId);
        emitSandboxFilesUpdated(data.sandboxId);
        setPreviewArtifactMime(null);
        setPreviewDownloadFilename(null);
        setPresentationPdfExport(null);
        setShareIsPublic(false);
        setMode("preview");
        setProgress(100);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (mountedRef.current) toast.error(t("playground_build_template_preview_error"));
      }
    },
    [reserveProjectId, t]
  );

  const handleBuildTemplateChange = useCallback(
    (next: { slug: string; name: string; defaultUserPrompt: string } | null) => {
      setBuildTemplate(next);
      if (shouldUseLemnityAiBridge && next) {
        setMessages([]);
      }
      if (!next) {
        templatePreviewAbortRef.current?.abort();
        if (
          templatePreviewSandboxIdRef.current &&
          sandboxId === templatePreviewSandboxIdRef.current
        ) {
          templatePreviewSandboxIdRef.current = null;
          setPreviewUrl(null);
          setSandboxId(null);
          setPreviewArtifactMime(null);
          setPreviewDownloadFilename(null);
          setPresentationPdfExport(null);
          setMode("idle");
        }
        if (idea.trim()) {
          try {
            saveBuilderHandoff(idea.trim(), projectKind ?? undefined, null);
          } catch {
            /* ignore */
          }
        }
        return;
      }
      void runBuildTemplatePreview(next.slug);
      if (shouldUseLemnityAiBridge) {
        // Превью шаблона без авто-сборки через чат: пользователь правит только превью.
        setFinalPrompt("");
        setIdea(next.name.trim() || next.slug);
        setStage("ready");
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
        setPromptCoachLoading(false);
        try {
          saveBuilderHandoff(
            next.name.trim() || next.slug,
            projectKind ?? undefined,
            next,
            { templateDirectPreview: true }
          );
        } catch {
          /* ignore */
        }
      } else {
        const text = next.defaultUserPrompt?.trim() ?? "";
        if (text) {
          setFinalPrompt(text);
          setIdea(text);
          setStage("ready");
          setCoachAwaitingConfirm(false);
          setPendingTechnicalPrompt(null);
          setPromptCoachLoading(false);
          try {
            saveBuilderHandoff(text, projectKind ?? undefined, next);
          } catch {
            /* ignore */
          }
        }
      }
    },
    [idea, projectKind, runBuildTemplatePreview, sandboxId, shouldUseLemnityAiBridge]
  );

  const runPromptCoach = useCallback(
    async (thread: ChatMessage[]) => {
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      const seq = ++coachRequestSeqRef.current;
      const isStaleCoachResponse = () => coachRequestSeqRef.current !== seq;

      const apiMessages = thread
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.promptPlainText ?? m.content
        }));

      try {
        setPromptCoachLoading(true);
        setPromptBuilderDebugLine(null);
        const coachStarted = performance.now();
        const res = await fetch("/api/prompt-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            idea: idea.trim() || undefined,
            projectKind: projectKind ?? undefined,
            agentHint
          }),
          signal: controller.signal
        });

        if (!mountedRef.current || controller.signal.aborted || isStaleCoachResponse()) return;

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          if (!mountedRef.current || controller.signal.aborted || isStaleCoachResponse()) return;
          push("assistant", `❌ ${formatLemnityBridgeErrorBody(msg || "", t)}`);
          setCoachAwaitingConfirm(false);
          setPendingTechnicalPrompt(null);
          setStage("questions");
          return;
        }

        const data = (await res.json()) as {
          reply?: string;
          phase?: string;
          technical_prompt?: string | null;
          usage?: { total_tokens?: number };
          debug_model?: string;
          debug_attempted_models?: string[];
        };
        const coachDurationMs = Math.round(performance.now() - coachStarted);

        if (!mountedRef.current || controller.signal.aborted || isStaleCoachResponse()) return;

        const reply = typeof data.reply === "string" ? data.reply.trim() : "";
        if (!reply) {
          if (!isStaleCoachResponse()) {
            push("assistant", "❌ Пустой ответ. Попробуй ещё раз.");
          }
          return;
        }

        if (isStaleCoachResponse()) return;

        if (process.env.NODE_ENV !== "production") {
          const debugModel =
            typeof data.debug_model === "string" && data.debug_model.trim()
              ? data.debug_model.trim()
              : null;
          const attempted =
            Array.isArray(data.debug_attempted_models) && data.debug_attempted_models.length > 0
              ? data.debug_attempted_models.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
              : [];
          if (debugModel) {
            setPromptCoachDebugLine(
              attempted.length > 0
                ? `DEV · prompt model: ${debugModel} · chain: ${attempted.join(" -> ")}`
                : `DEV · prompt model: ${debugModel}`
            );
          }
        }

        const technicalPromptTrimmed =
          typeof data.technical_prompt === "string" ? data.technical_prompt.trim() : "";
        const isFinalPromptConfirm =
          data.phase === "confirm" && technicalPromptTrimmed.length > 0;
        const tp = isFinalPromptConfirm ? technicalPromptTrimmed : "";
        push(
          "assistant",
          reply,
          isFinalPromptConfirm
            ? {
                showActions: true,
                promptPlainText: tp,
                actionMeta: {
                  durationMs: coachDurationMs,
                  totalTokens: typeof data.usage?.total_tokens === "number" ? data.usage.total_tokens : undefined
                }
              }
            : undefined
        );

        if (isFinalPromptConfirm) {
          setFinalPrompt(tp);
          setCoachAwaitingConfirm(true);
          setPendingTechnicalPrompt(tp);
          setStage("ready");
        } else {
          setCoachAwaitingConfirm(false);
          setPendingTechnicalPrompt(null);
          setStage("questions");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (!mountedRef.current || coachRequestSeqRef.current !== seq) return;
        push("assistant", "❌ Ошибка запроса к коучу промпта");
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
      } finally {
        if (mountedRef.current && coachRequestSeqRef.current === seq) {
          setPromptCoachLoading(false);
        }
      }
    },
    [agentHint, idea, projectKind, push, t]
  );

  useEffect(() => {
    if (!lemnityAiBridgeReady || !shouldUseLemnityAiBridge) return;
    if (requestedSessionId) return;
    if (!projectScopeReady) return;
    const handoff = readBuilderHandoff();
    if (!handoff) return;
    const fromStorage = handoff.idea?.trim();
    if (!fromStorage) return;

    const navToken = sessionStorage.getItem(BUILDER_NAV_TOKEN_KEY);
    const processed = sessionStorage.getItem(BUILDER_LAST_PROCESSED_NAV_KEY);
    if (navToken) {
      if (processed === navToken) return;
      sessionStorage.setItem(BUILDER_LAST_PROCESSED_NAV_KEY, navToken);
    } else {
      const onceKey = "lemnity.builder.bridgeHandoffOnce";
      const once = sessionStorage.getItem(onceKey);
      if (once === fromStorage) return;
      sessionStorage.setItem(onceKey, fromStorage);
    }

    if (isHandoffTemplateDirectPreview(handoff) && handoff.buildTemplate?.slug) {
      if (handoff.projectKind) setProjectKind(handoff.projectKind);
      setBuildTemplate(handoff.buildTemplate);
      setIdea(handoff.buildTemplate.name?.trim() || handoff.buildTemplate.slug);
      setFinalPrompt("");
      setStage("ready");
      setCoachAwaitingConfirm(false);
      setPendingTechnicalPrompt(null);
      setPromptCoachLoading(false);
      setPromptCoachDebugLine(null);
      setPromptBuilderDebugLine(null);
      setMessages([]);
      void runBuildTemplatePreview(handoff.buildTemplate.slug);
      return;
    }

    if (handoff?.projectKind) setProjectKind(handoff.projectKind);
    if (handoff?.buildTemplate) {
      setBuildTemplate(handoff.buildTemplate);
    } else {
      setBuildTemplate(null);
    }
    setIdea(fromStorage);
    setStage("questions");
    setCoachAwaitingConfirm(false);
    setPendingTechnicalPrompt(null);
    setPromptCoachDebugLine(null);
    setPromptBuilderDebugLine(null);
    const msg: ChatMessage = { id: createMessageId(), role: "user", content: fromStorage, sentAt: Date.now() };
    setMessages([msg]);
    void runPromptCoach([msg]);
  }, [
    lemnityAiBridgeReady,
    projectScopeReady,
    requestedSessionId,
    runPromptCoach,
    runBuildTemplatePreview,
    shouldUseLemnityAiBridge,
    createMessageId
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestAbortRef.current?.abort();
    };
  }, []);

  /** «Мои проекты» без моста: восстановить превью по ?sandboxId= */
  useEffect(() => {
    if (shouldUseLemnityAiBridge) return;
    if (!requestedSandboxId) return;
    templatePreviewSandboxIdRef.current = null;
    setSandboxId(requestedSandboxId);
    setPreviewUrl(`/api/sandbox/${encodeURIComponent(requestedSandboxId)}`);
    setPreviewArtifactMime(null);
    setPreviewDownloadFilename(null);
    setPresentationPdfExport(null);
    setMode("preview");
    setStage("ready");
    setIsGenerating(false);
    setProgress(100);
    setSessionNeedsResync(false);
    emitSandboxFilesUpdated(requestedSandboxId);
  }, [shouldUseLemnityAiBridge, requestedSandboxId]);

  useEffect(() => {
    const normalized = sandboxId?.trim();
    if (!normalized) return;
    pendingProjectIdRef.current = normalized;
  }, [sandboxId]);

  useEffect(() => {
    lastSsePreviewSandboxIdRef.current = null;
  }, [lemnityAiSessionId]);

  /** Подтягивает summary сессии в Prisma (previewArtifactId), чтобы PATCH артефакта не получал 404 сразу после превью. */
  useEffect(() => {
    if (!shouldUseLemnityAiBridge || !lemnityAiSessionId) return;
    if (!sandboxId?.startsWith("artifact_")) return;
    let cancelled = false;
    void (async () => {
      try {
        await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(lemnityAiSessionId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: hostProjectId
              ? undefined
              : {
                  "X-Project-Id": lemnityAiSessionId
                }
          }
        );
      } catch {
        // ignore
      }
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [sandboxId, lemnityAiSessionId, shouldUseLemnityAiBridge, hostProjectId]);

  useEffect(() => {
    if (!promptCoachLoading) {
      setCoachSlowHint(false);
      setCoachDetailOpen(false);
      return;
    }
    const t = window.setTimeout(() => setCoachSlowHint(true), 12_000);
    return () => window.clearTimeout(t);
  }, [promptCoachLoading]);

  useEffect(() => {
    if (!lemnityAiBridgeReady || !shouldUseLemnityAiBridge) return;
    if (!requestedSessionId) return;
    setLemnityAiSessionId(requestedSessionId);
    void loadLemnityAiSession(requestedSessionId);
  }, [loadLemnityAiSession, requestedSessionId, shouldUseLemnityAiBridge, lemnityAiBridgeReady]);

  useEffect(() => {
    if (!lemnityAiBridgeReady || !shouldUseLemnityAiBridge) return;
    if (!sessionNeedsResync) return;
    if (!lemnityAiSessionId) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const schedule = () => {
      if (cancelled) return;
      timeoutId = globalThis.setTimeout(async () => {
        if (cancelled) return;
        if (streamActiveRef.current) {
          schedule();
          return;
        }
        await loadLemnityAiSession(lemnityAiSessionId);
        schedule();
      }, 2500);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timeoutId != null) globalThis.clearTimeout(timeoutId);
    };
  }, [
    lemnityAiBridgeReady,
    shouldUseLemnityAiBridge,
    sessionNeedsResync,
    lemnityAiSessionId,
    loadLemnityAiSession
  ]);

  useEffect(() => {
    rememberBuildSessionForPuckReturn(lemnityAiSessionId);
  }, [lemnityAiSessionId]);

  useEffect(() => {
    if (!lemnityAiBridgeReady || shouldUseLemnityAiBridge) return;
    if (!projectScopeReady) return;
    /** Явный переход из «Истории» / проектов по sessionId — не перетирать чат landing-handoff */
    if (requestedSessionId?.trim()) return;
    if (requestedSandboxId) return;
    const handoff = readBuilderHandoff();
    if (!handoff) return;
    const fromStorage = handoff.idea;
    if (!fromStorage) return;
    const navToken = sessionStorage.getItem(BUILDER_NAV_TOKEN_KEY);
    const processed = sessionStorage.getItem(BUILDER_LAST_PROCESSED_NAV_KEY);
    if (navToken) {
      if (processed === navToken) return;
      sessionStorage.setItem(BUILDER_LAST_PROCESSED_NAV_KEY, navToken);
    } else {
      const onceKey = "lemnity.builder.legacyHandoffOnce";
      const once = sessionStorage.getItem(onceKey);
      if (once === fromStorage) return;
      sessionStorage.setItem(onceKey, fromStorage);
    }
    if (isHandoffTemplateDirectPreview(handoff) && handoff.buildTemplate?.slug) {
      if (handoff?.projectKind) setProjectKind(handoff.projectKind);
      setBuildTemplate(handoff.buildTemplate);
      setIdea(handoff.buildTemplate.name?.trim() || handoff.buildTemplate.slug);
      setFinalPrompt("");
      setStage("ready");
      setCoachAwaitingConfirm(false);
      setPendingTechnicalPrompt(null);
      setMessages([]);
      void runBuildTemplatePreview(handoff.buildTemplate.slug);
      return;
    }
    if (handoff?.projectKind) setProjectKind(handoff.projectKind);
    if (handoff?.buildTemplate) {
      setBuildTemplate(handoff.buildTemplate);
    } else {
      setBuildTemplate(null);
    }
    setIdea(fromStorage);
    setStage("questions");
    push("assistant", `Проект создан по запросу:\n\n“${fromStorage}”\n\nСейчас уточню детали и соберу идеальный промпт.`);
    void handleCreateQuestions(fromStorage, handoff?.projectKind);
  }, [
    lemnityAiBridgeReady,
    projectScopeReady,
    requestedSandboxId,
    requestedSessionId,
    runBuildTemplatePreview,
    shouldUseLemnityAiBridge
  ]);

  function pushRecent(item: string, opts?: { templateSlug?: string }) {
    try {
      const key = "lemnity.recent";
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
        t: number;
        text: string;
        templateSlug?: string;
      }>;
      const slugTrim = opts?.templateSlug?.trim();
      const nextItem: { t: number; text: string; templateSlug?: string } = {
        t: Date.now(),
        text: item
      };
      if (slugTrim) nextItem.templateSlug = slugTrim;
      const next = [
        nextItem,
        ...current.filter((x) => x.text !== item)
      ].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("lemnity:recent-updated"));
    } catch {
      // ignore
    }
  }

  async function handleCreateQuestions(overrideIdea?: string, projectKindForApi?: ProjectKind) {
    if (lemnityAiBridgeReady && shouldUseLemnityAiBridge) return;
    const currentIdea = (overrideIdea ?? idea).trim();
    if (!currentIdea) return;
    const kindForRequest = projectKindForApi !== undefined ? projectKindForApi : projectKind;
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;

    pushRecent(
      currentIdea,
      buildTemplate?.slug?.trim() ? { templateSlug: buildTemplate.slug.trim() } : undefined
    );
    setStage("questions");
    setPromptBuilderDebugLine(null);

    let res: Response;
    try {
      res = await fetch("/api/prompt-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "questions",
          idea: currentIdea,
          projectKind: kindForRequest ?? undefined,
          agentHint
        }),
        signal: controller.signal
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      push("assistant", "❌ Не удалось получить вопросы");
      setStage("idea");
      return;
    }
    if (!mountedRef.current || controller.signal.aborted) return;

    if (!res.ok) {
      const msg = await res.text();
      if (!mountedRef.current || controller.signal.aborted) return;
      push("assistant", `❌ ${formatLemnityBridgeErrorBody(msg || "", t)}`);
      setStage("idea");
      return;
    }

    const data = (await res.json()) as {
      questions: string[];
      debug_model?: string;
      debug_attempted_models?: string[];
    };
    if (process.env.NODE_ENV !== "production") {
      const debugModel =
        typeof data.debug_model === "string" && data.debug_model.trim()
          ? data.debug_model.trim()
          : null;
      const attempted =
        Array.isArray(data.debug_attempted_models) && data.debug_attempted_models.length > 0
          ? data.debug_attempted_models.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          : [];
      if (debugModel) {
        setPromptBuilderDebugLine(
          attempted.length > 0
            ? `DEV · prompt-builder model: ${debugModel} · chain: ${attempted.join(" -> ")}`
            : `DEV · prompt-builder model: ${debugModel}`
        );
      }
    }
    setQuestions(data.questions);
    setQa(data.questions.map((q) => ({ q, a: "" })));
    setQuestionIndex(0);
    push("assistant", data.questions[0] ?? "Опиши задачу подробнее.");
  }

  async function handleComposePrompt(qaOverride?: PromptQA[]) {
    if (lemnityAiBridgeReady && shouldUseLemnityAiBridge) return;
    push("assistant", "🧩 Собираю финальный промпт...");
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const qaPayload = qaOverride ?? qa;

    const composeStarted = performance.now();
    let res: Response;
    try {
      res = await fetch("/api/prompt-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "compose",
          idea,
          qa: qaPayload,
          projectKind: projectKind ?? undefined,
          agentHint
        }),
        signal: controller.signal
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      push("assistant", "❌ Не удалось собрать промпт");
      return;
    }
    if (!mountedRef.current || controller.signal.aborted) return;

    if (!res.ok) {
      const msg = await res.text();
      if (!mountedRef.current || controller.signal.aborted) return;
      push("assistant", `❌ ${formatLemnityBridgeErrorBody(msg || "", t)}`);
      return;
    }

    const data = (await res.json()) as {
      finalPrompt: string;
      usage?: { total_tokens?: number };
      debug_model?: string;
      debug_attempted_models?: string[];
    };
    const composeDurationMs = Math.round(performance.now() - composeStarted);
    if (process.env.NODE_ENV !== "production") {
      const debugModel =
        typeof data.debug_model === "string" && data.debug_model.trim()
          ? data.debug_model.trim()
          : null;
      const attempted =
        Array.isArray(data.debug_attempted_models) && data.debug_attempted_models.length > 0
          ? data.debug_attempted_models.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          : [];
      if (debugModel) {
        setPromptBuilderDebugLine(
          attempted.length > 0
            ? `DEV · prompt-builder model: ${debugModel} · chain: ${attempted.join(" -> ")}`
            : `DEV · prompt-builder model: ${debugModel}`
        );
      }
    }
    setFinalPrompt(data.finalPrompt);
    setStage("ready");
    push(
      "assistant",
      `✅ Промпт собран. Запускаю генерацию.\n\n${data.finalPrompt.length > 700 ? `${data.finalPrompt.slice(0, 700)}…` : data.finalPrompt}`,
      {
        showActions: true,
        promptPlainText: data.finalPrompt,
        actionMeta: {
          durationMs: composeDurationMs,
          totalTokens: typeof data.usage?.total_tokens === "number" ? data.usage.total_tokens : undefined
        }
      }
    );
    void handleGenerate(data.finalPrompt);
  }

  async function handleGenerate(promptOverride?: string) {
    if (lemnityAiBridgeReady && shouldUseLemnityAiBridge) return;
    const prompt = (promptOverride ?? finalPrompt).trim();
    if (!prompt) return;
    const projectId = reserveProjectId();

    pushRecent(
      idea.trim() || prompt.slice(0, 120),
      buildTemplate?.slug?.trim() ? { templateSlug: buildTemplate.slug.trim() } : undefined
    );
    resetStreamLog();
    beginInterfaceBuildTiming();
    streamActiveRef.current = true;
    setIsGenerating(true);
    setMode("generating");
    setStage("generating");
    setStreamArtifactChars(0);
    push("assistant", "🎯 Анализирую запрос…");
    setProgress(8);
    templatePreviewSandboxIdRef.current = null;
    setPreviewUrl(null);
    setPreviewArtifactMime(null);
    setPreviewDownloadFilename(null);
    setPresentationPdfExport(null);
    setShareIsPublic(false);

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const requestSeq = ++streamRequestSeqRef.current;
    const isCurrentRequest = () =>
      mountedRef.current &&
      !controller.signal.aborted &&
      requestAbortRef.current === controller &&
      streamRequestSeqRef.current === requestSeq;
    try {
      const response = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          projectId,
          projectKind: projectKind ?? undefined,
          agentHint,
          ...(buildTemplate?.slug ? { buildTemplateSlug: buildTemplate.slug } : {})
        }),
        signal: controller.signal
      });
      if (!isCurrentRequest()) return;

      if (!response.ok || !response.body) {
        const message = await response.text();
        if (!isCurrentRequest()) return;
        push("assistant", `❌ ${formatLemnityBridgeErrorBody(message || "", t)}`);
        setStage("ready");
        setMode("idle");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processEvent = (eventData: StreamEvent) => {
        applyStreamLog(eventData);
        if (eventData.type === "log") push("assistant", eventData.content);
        if (eventData.type === "progress") setProgress(eventData.value);
        if (eventData.type === "preview") {
          interfaceBuildGotPreviewRef.current = true;
          templatePreviewSandboxIdRef.current = null;
          setPreviewUrl(eventData.previewUrl);
          setSandboxId(eventData.sandboxId);
          emitSandboxFilesUpdated(eventData.sandboxId);
          setMode("preview");
          push("assistant", "✅ Превью готово. Можешь написать, что изменить — я внесу правки следующим шагом.");
        }
        if (eventData.type === "error") {
          push(
            "assistant",
            `❌ ${formatLemnityBridgeErrorBody(eventData.message || "", t)}`
          );
          setMode("idle");
          setStage("ready");
        }
        if (eventData.type === "done") {
          setProgress(100);
          setStage("ready");
          setMode((prev) => (prev === "generating" ? "idle" : prev));
        }
      };

      const flushBuffer = (isFinal = false) => {
        const parsed = consumeDataSseBuffer(buffer, isFinal);
        buffer = parsed.carry;
        for (const payload of parsed.events) {
          try {
            processEvent(JSON.parse(payload) as StreamEvent);
          } catch {
            // ignore
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (!isCurrentRequest()) break;
        if (value) {
          if (buildTemplate) {
            setStreamArtifactChars((c) => c + value.length);
          }
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
          break;
        }
        flushBuffer();
      }
      flushBuffer(true);
      if (!isCurrentRequest()) return;

      setProgress((v) => (v < 95 ? 95 : v));
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        if (!isCurrentRequest()) return;
        push("assistant", "❌ Ошибка генерации");
        setMode("idle");
        setStage("ready");
      }
    } finally {
      if (isCurrentRequest()) {
        finalizeInterfaceBuildTiming();
        setIsGenerating(false);
        setMode((prev) => (prev === "generating" ? "idle" : prev));
        setStage((prev) => (prev === "generating" ? "ready" : prev));
      } else {
        interfaceBuildStartedAtRef.current = null;
        interfaceBuildGotPreviewRef.current = false;
      }
      streamActiveRef.current = false;
    }
  }

  async function onSend(text: string, files?: File[]) {
    if (!lemnityAiBridgeReady) {
      toast.message("Загрузка режима сборки…");
      return;
    }
    if (shouldUseLemnityAiBridge) {
      if (buildTemplate) {
        return;
      }
      const trimmed = text.trim();
      const hasFiles = (files?.length ?? 0) > 0;
      if (!trimmed && !hasFiles) return;

      const annex = await formatAttachmentsForLemnityChat(files ?? []);
      const userOutbound = mergeUserMessageWithAttachments(trimmed, annex);
      if (!userOutbound.trim()) return;
      const displayContent = playgroundUserDisplayContent(text, files);
      const userExtras =
        userOutbound !== displayContent ? { promptPlainText: userOutbound } : {};

      if (coachAwaitingConfirm && pendingTechnicalPrompt) {
        const userMsg: ChatMessage = {
          id: createMessageId(),
          role: "user",
          content: displayContent,
          sentAt: Date.now(),
          ...userExtras
        };
        if (isAffirmativeUserReply(trimmed)) {
          setMessages((prev) => [...prev, userMsg]);
          const p = pendingTechnicalPrompt;
          setCoachAwaitingConfirm(false);
          setPendingTechnicalPrompt(null);
          setPromptCoachDebugLine(null);
          void sendLemnityAiChat(mergeUserMessageWithAttachments(p, annex));
          return;
        }
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
        setMessages((prev) => {
          const nextThread = [...prev, userMsg];
          queueMicrotask(() => {
            void runPromptCoach(nextThread);
          });
          return nextThread;
        });
        return;
      }

      if (stage === "ready") {
        const built = finalPrompt.trim();
        const isDispatchingAgreedPrompt =
          !hasFiles &&
          built.length > 0 &&
          trimmed === built;
        if (isDispatchingAgreedPrompt) {
          push("assistant", t("playground_chat_assistant_dispatch_built_prompt"));
        } else {
          push("user", displayContent, userExtras);
        }
        setPromptCoachDebugLine(null);
        void sendLemnityAiChat(userOutbound);
        return;
      }

      const userMsg: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: displayContent,
        sentAt: Date.now(),
        ...userExtras
      };
      setMessages((prev) => {
        const nextThread = [...prev, userMsg];
        queueMicrotask(() => {
          void runPromptCoach(nextThread);
        });
        return nextThread;
      });
      if (!idea.trim()) setIdea(trimmed || displayContent);
      if (stage === "idea") setStage("questions");
      return;
    }
    push("user", text);

    if (stage === "questions") {
      const q = questions[questionIndex];
      const next = [...qa];
      next[questionIndex] = { q, a: text };
      setQa(next);

      const nextIndex = questionIndex + 1;
      if (nextIndex < questions.length) {
        setQuestionIndex(nextIndex);
        push("assistant", questions[nextIndex]);
        return;
      }

      void handleComposePrompt(next);
      return;
    }

    if (stage === "idea") {
      setIdea(text);
      void handleCreateQuestions(text, projectKind ?? undefined);
      return;
    }

    if (stage === "ready") {
      void handleGenerate(text);
      return;
    }

    push("assistant", "⌛ Дождись завершения текущего шага и повтори запрос.");
  }

  /** Левая колонка чата («Сборка промпта»): скрываем при сворачивании или при активном каталожном шаблоне сборки */
  const leftPromptRailHidden = leftCollapsed || Boolean(buildTemplate);

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col bg-muted/40">
        <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-row items-stretch">
          <div
            className={cn(
              "relative z-30 min-h-0 shrink-0 grow-0 overflow-visible border-r border-border bg-background",
              "transition-[width,min-width,max-width,opacity] duration-300 ease-in-out motion-reduce:transition-none"
            )}
            aria-hidden={leftPromptRailHidden}
            style={{
              width: leftPromptRailHidden ? 0 : leftWidth,
              minWidth: leftPromptRailHidden ? 0 : 280,
              maxWidth: leftPromptRailHidden ? 0 : 560,
              opacity: leftPromptRailHidden ? 0 : 1,
              pointerEvents: leftPromptRailHidden ? "none" : "auto"
            }}
          >
            <AgentChat
              variant="studio"
              title={header}
              studioToolbarSlot={
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground"
                        aria-label={t("nav_home")}
                        onClick={() => router.push("/playground")}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                      {t("nav_home")}
                    </TooltipContent>
                  </Tooltip>
                  <MenuDrawer
                    compact
                    toolbarLayout="inline"
                    hideCollapseButton
                    lemnityAiBridgeReady={lemnityAiBridgeReady}
                    shouldUseLemnityAiBridge={shouldUseLemnityAiBridge}
                  />
                </>
              }
              studioToolbarTrailingSlot={
                <StudioChatRailCollapseButton
                  compact
                  tooltipSide="bottom"
                  leftCollapsed={leftPromptRailHidden}
                  onToggleCollapse={togglePlaygroundLeftRail}
                />
              }
              messages={messages}
              disabled={
                isGenerating ||
                promptCoachLoading ||
                !lemnityAiBridgeReady ||
                Boolean(shouldUseLemnityAiBridge && buildTemplate)
              }
              studioStreamActive={isGenerating}
              onSend={onSend}
              placeholder={studioChatPlaceholder}
              plan={session?.user?.plan ?? null}
              projectKind={projectKind}
              agentTask={shouldUseLemnityAiBridge ? "prompt-coach" : "generate-stream"}
              onModelHintChange={setAgentHint}
              buildTemplate={buildTemplate}
              onBuildTemplateChange={handleBuildTemplateChange}
              visualEditorInChat={visualEditorInChat}
              threadStatusSlot={
                streamSteps.length > 0 || streamToolLine ? (
                  <BuildStreamSteps steps={streamSteps} toolLine={streamToolLine} className="border-0 bg-transparent" />
                ) : null
              }
              threadScrollKey={chatThreadScrollKey}
              footerSlot={
                isGenerating ? (
                  <div className="space-y-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      <span className="min-w-0 truncate">
                        {t("playground_right_build_label")} · {interfaceBuildElapsedLabel ?? formatBuildElapsed(0, lang)}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-foreground/85">{t("playground_choose_assistant_hint")}</p>
                    {buildTemplate ? (
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {streamArtifactChars > 0
                          ? t("build_template_stream_progress").replace(
                              "__N__",
                              streamArtifactChars.toLocaleString(
                                lang === "en" ? "en-GB" : lang === "tg" ? "tg" : "ru-RU"
                              )
                            )
                          : t("build_template_stream_waiting")}
                      </p>
                    ) : null}
                  </div>
                ) : lastInterfaceBuildMs != null ? (
                  <div className="rounded-lg border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                    {t("build_footer_built_prefix")} {formatBuildTotalDuration(lastInterfaceBuildMs, lang)}
                  </div>
                ) : promptCoachLoading ? (
                  <div className="rounded-none border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 text-left"
                      aria-expanded={coachDetailOpen}
                      onClick={() => setCoachDetailOpen((v) => !v)}
                    >
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      <span className="min-w-0 flex-1">
                        {coachSlowHint ? t("playground_coach_loading_slow") : t("playground_coach_loading")}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 opacity-70 transition-transform",
                          coachDetailOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                    {coachDetailOpen ? (
                      <div className="mt-2 space-y-1.5 border-t border-border/70 pt-2 text-[11px] leading-snug">
                        <p>{t("playground_coach_details")}</p>
                        <p className="text-muted-foreground/95">
                          {coachAwaitingConfirm
                            ? t("playground_coach_stage_confirm")
                            : t("playground_coach_stage_questions")}
                        </p>
                        <p className="text-muted-foreground/95">
                          {t("playground_coach_model_prefix")} {agentHint}
                        </p>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                          onClick={() => setCoachDetailOpen(false)}
                        >
                          {t("playground_coach_collapse")}
                        </button>
                        {process.env.NODE_ENV !== "production" && promptCoachDebugLine ? (
                          <p className="font-mono text-[10px] text-muted-foreground">{promptCoachDebugLine}</p>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mt-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() => setCoachDetailOpen(true)}
                      >
                        {t("playground_coach_expand")}
                      </button>
                    )}
                  </div>
                ) : process.env.NODE_ENV !== "production" && promptCoachDebugLine ? (
                  <div className="truncate rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
                    {promptCoachDebugLine}
                  </div>
                ) : process.env.NODE_ENV !== "production" && promptBuilderDebugLine ? (
                  <div className="truncate rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
                    {promptBuilderDebugLine}
                  </div>
                ) : null
              }
            />

            {!leftPromptRailHidden ? (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Потянуть влево или вправо, чтобы изменить ширину чата"
                className="absolute right-0 top-0 z-10 flex h-full w-4 cursor-col-resize touch-none items-center justify-center"
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  dragStateRef.current = {
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startWidth: leftWidth
                  };
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!dragStateRef.current) return;
                  if (dragStateRef.current.pointerId !== e.pointerId) return;
                  const delta = e.clientX - dragStateRef.current.startX;
                  const next = Math.min(560, Math.max(280, dragStateRef.current.startWidth + delta));
                  setLeftWidth(next);
                }}
                onPointerUp={(e) => {
                  if (!dragStateRef.current) return;
                  if (dragStateRef.current.pointerId !== e.pointerId) return;
                  dragStateRef.current = null;
                  try {
                    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
              >
                <div className="pointer-events-none flex items-center justify-center rounded-md border border-border/80 bg-background/95 px-1 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10">
                  <ArrowLeftRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
              </div>
            ) : null}
          </div>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
            <BuildPreviewChrome
              tab={tab}
              documentTabVisible={documentTabVisible}
              onTabChange={(next) => {
                setTab(next);
                if (next !== "preview" && next !== "document") setVisualLayoutEditor(false);
              }}
              sandboxId={sandboxId}
              expandChatRailSlot={
                leftCollapsed && !buildTemplate ? (
                  <StudioChatRailCollapseButton
                    compact
                    tooltipSide="bottom"
                    leftCollapsed
                    onToggleCollapse={togglePlaygroundLeftRail}
                  />
                ) : null
              }
              shareMenu={
                <BuildSharePopover
                  sandboxId={sandboxId}
                  hasPreview={Boolean(previewUrl)}
                  shareIsPublic={shareIsPublic}
                  onShareIsPublicChange={setShareIsPublic}
                  t={t}
                />
              }
              onPublish={handlePublishPreview}
              publishDisabled={!previewUrl || !sandboxId}
              onHistoryClick={() => router.push("/projects")}
              previewEditorToggle={
                tab === "preview" || tab === "document"
                  ? {
                      active: visualLayoutEditor,
                      onToggle: () => setVisualLayoutEditor((v) => !v)
                    }
                  : undefined
              }
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Все вкладки остаются смонтированными: iframe превью не сбрасывается при уходе на «Код» / «Настройки». */}
              <div
                className={cn(
                  "flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-background",
                  tab !== "preview" && tab !== "document"
                    ? "pointer-events-none invisible absolute inset-0 z-0 min-h-0"
                    : "relative z-10"
                )}
                aria-hidden={tab !== "preview" && tab !== "document"}
              >
                <RightPanel
                  mode={mode}
                  progress={progress}
                  buildElapsedLabel={mode === "generating" ? interfaceBuildElapsedLabel : null}
                  previewUrl={previewUrl}
                  sandboxId={sandboxId}
                  projectKind={projectKind}
                  streamHint={mode === "generating" ? streamHint : null}
                  previewMimeType={previewArtifactMime}
                  previewDownloadFilename={previewDownloadFilename}
                  visualEditMode={visualLayoutEditor}
                  visualEditPersist={visualEditPersist}
                  presentationPdfExport={presentationPdfExport}
                  presentationExportsPaid={hasCustomDomainAccess}
                  previewVariant={tab === "document" ? "document" : "default"}
                  ensurePublicShareForPreviewTab={ensurePublicShareForPreviewTab}
                />
              </div>

              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background m-2 mt-1 min-h-[200px]",
                  tab !== "settings"
                    ? "pointer-events-none invisible absolute inset-0 z-0 m-2 mt-1"
                    : "relative z-10"
                )}
                aria-hidden={tab !== "settings"}
              >
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

              <div
                className={cn(
                  "flex h-full min-h-[280px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background p-2 sm:p-3",
                  tab !== "code"
                    ? "pointer-events-none invisible absolute inset-0 z-0 m-2 mt-1 min-h-[280px]"
                    : "relative z-10 m-2 mt-1"
                )}
                aria-hidden={tab !== "code"}
              >
                <BuildCode
                  className="min-h-0 flex-1"
                  sandboxId={sandboxId}
                  artifactMimeType={previewArtifactMime}
                />
              </div>
            </div>
          </section>
        </div>
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
