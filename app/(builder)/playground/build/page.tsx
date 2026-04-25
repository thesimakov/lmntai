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
import { MenuDrawer } from "@/components/playground/menu-drawer";
import { isPptxArtifact } from "@/components/playground/preview-frame";
import { RightPanel } from "@/components/playground/right-panel";
import { PageTransition } from "@/components/page-transition";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BuildSharePopover } from "@/components/playground/build-share-popover";
import { BuildStreamSteps } from "@/components/playground/build-stream-steps";
import { useBuildStreamLog } from "@/hooks/use-build-stream-log";
import { consumeDataSseBuffer } from "@/lib/client-sse";
import {
  BUILDER_LAST_PROCESSED_NAV_KEY,
  BUILDER_NAV_TOKEN_KEY,
  readBuilderHandoff
} from "@/lib/landing-handoff";
import { useLemnityAiBridgeFromServer } from "@/hooks/use-lemnity-ai-bridge-from-server";
import { buildPublicSharePageUrl, resolveShareablePreviewUrl } from "@/lib/preview-share";
import type { AgentUiLabel } from "@/lib/agent-models";
import { isAffirmativeUserReply } from "@/lib/affirmative-reply";
import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import type { PromptQA } from "@/types/prompt-builder";
import type { StreamEvent } from "@/types/build-stream";

type LemnityAiBridgeEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

type LemnityAiSessionPayload = {
  session_id: string;
  title?: string | null;
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

/** Для строки «Был собран за …» */
function formatInterfaceBuildTotalRu(ms: number): string {
  if (ms < 1000) return "менее 1 с";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (r === 0) return `${m} мин`;
  return `${m} мин ${r} с`;
}

/** Тикер во время сборки (мм:сс или только секунды) */
function formatInterfaceBuildElapsedRu(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec} с`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function PromptBuildPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { ready: lemnityAiBridgeReady, fullParity: shouldUseLemnityAiBridge } = useLemnityAiBridgeFromServer();
  const requestedSessionId = searchParams.get("sessionId");
  const mountedRef = useRef(true);
  const requestAbortRef = useRef<AbortController | null>(null);
  const streamRequestSeqRef = useRef(0);
  const sessionLoadSeqRef = useRef(0);
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
  const [tab, setTab] = useState<"preview" | "settings" | "code">("preview");
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
  const leftWidthBeforeCollapseRef = useRef(400);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const { steps: streamSteps, toolLine: streamToolLine, reset: resetStreamLog, applyEvent: applyStreamLog } =
    useBuildStreamLog();

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
    return formatInterfaceBuildElapsedRu(Date.now() - start);
  }, [isGenerating, buildTimerTick]);

  const streamHint = useMemo(() => {
    if (streamToolLine) return streamToolLine;
    const last = streamSteps[streamSteps.length - 1];
    return last ? `${last.id}: ${last.description}` : null;
  }, [streamToolLine, streamSteps]);

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

  const chatPromptSlot = useMemo(() => {
    const promptText =
      stage === "ready" || stage === "generating"
        ? finalPrompt.trim() || idea.trim()
        : idea.trim();
    if (!promptText) return null;
    const label =
      stage === "questions"
        ? "Идея проекта"
        : stage === "idea"
          ? "Идея"
          : stage === "ready" || stage === "generating"
            ? "Промпт"
            : "Запрос";
    return (
      <div className="mr-auto w-full max-w-[min(92%,32rem)] rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/85">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground [word-break:break-word]">{promptText}</p>
      </div>
    );
  }, [stage, idea, finalPrompt]);

  const header = useMemo(() => {
    if (shouldUseLemnityAiBridge && coachAwaitingConfirm) return "Шаг 2/3 — Подтверждение промпта";
    if (stage === "questions")
      return shouldUseLemnityAiBridge ? "Шаг 1/3 — Диалог с ИИ" : "Шаг 1/3 — Уточняющие вопросы";
    if (stage === "ready") return "Шаг 2/3 — Финальный промпт";
    if (stage === "generating") return "Шаг 3/3 — Генерация";
    return "Сборка промпта";
  }, [stage, shouldUseLemnityAiBridge, coachAwaitingConfirm]);

  const addressPath = useMemo(() => {
    if (!previewUrl) return "/";
    try {
      const u = new URL(previewUrl);
      return u.pathname && u.pathname !== "" ? u.pathname : "/";
    } catch {
      return "/";
    }
  }, [previewUrl]);

  const handlePublishPreview = useCallback(() => {
    setPublishDialogOpen(true);
  }, []);

  const handlePublishConfirm = useCallback(async () => {
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
        const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { method: "POST" });
        if (!res.ok) {
          const msg = await res.text();
          toast.error(msg || t("playground_build_share_error_instant"));
          return;
        }
        setShareIsPublic(true);
      }
      const publicUrl = buildPublicSharePageUrl(origin, sandboxId);
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      setPublishDialogOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: "assistant" as const,
          content:
            "Ссылка на публичную страницу превью открыта. Управлять доступом можно в «Поделиться» (приват / публично)."
        }
      ]);
      toast.message(t("playground_build_publish_opened"));
    } finally {
      setPublishPending(false);
    }
  }, [previewUrl, sandboxId, shareIsPublic, t]);

  const hasCustomDomainAccess = session?.user?.plan === "PRO" || session?.user?.plan === "TEAM";

  const createMessageId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role,
          content,
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
      return [...prev, { id, role: "assistant", content: chunk }];
    });
  }, [createMessageId]);

  const pushBridgeAssistantMessage = useCallback((content: string) => {
    const normalized = content.trim();
    if (!normalized) return;
    setMessages((prev) => {
      const existingId = bridgeAssistantMessageIdRef.current;
      if (!existingId) {
        const id = createMessageId();
        bridgeAssistantMessageIdRef.current = id;
        return [...prev, { id, role: "assistant", content: normalized }];
      }

      const idx = prev.findIndex((m) => m.id === existingId);
      if (idx === -1) {
        const id = createMessageId();
        bridgeAssistantMessageIdRef.current = id;
        return [...prev, { id, role: "assistant", content: normalized }];
      }

      if (!bridgeSawDeltaRef.current) {
        const next = [...prev];
        next[idx] = { ...next[idx], content: normalized };
        return next;
      }

      const current = prev[idx].content.trim();
      if (normalized === current) return prev;
      if (normalized.startsWith(current) || current.startsWith(normalized)) {
        const next = [...prev];
        next[idx] = { ...next[idx], content: normalized };
        return next;
      }

      const id = createMessageId();
      bridgeAssistantMessageIdRef.current = id;
      return [...prev, { id, role: "assistant", content: normalized }];
    });
  }, [createMessageId]);

  const loadLemnityAiSession = useCallback(
    async (sessionId: string) => {
      try {
        const loadSeq = ++sessionLoadSeqRef.current;
        const res = await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(sessionId)}`,
          { method: "GET" }
        );
        if (!res.ok) return;
        if (!mountedRef.current || sessionLoadSeqRef.current !== loadSeq) return;
        const envelope = (await res.json()) as LemnityAiBridgeEnvelope<LemnityAiSessionPayload>;
        const payload = envelope?.data;
        if (!payload) return;
        if (!mountedRef.current || sessionLoadSeqRef.current !== loadSeq) return;
        if (payload.title?.trim()) {
          setIdea((prev) => (prev.trim() ? prev : payload.title?.trim() || prev));
        }
        const nextMessages: ChatMessage[] =
          payload.events
            ?.filter((event) => event?.event === "message" && typeof event.data?.content === "string")
            .map((event) => ({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              role: event.data?.role === "user" ? "user" : "assistant",
              content: event.data?.content || ""
            })) ?? [];
        if (nextMessages.length) {
          setMessages(nextMessages);
          setStage("ready");
        }
        const lastPreview = [...(payload.events ?? [])]
          .reverse()
          .find((event) => event?.event === "preview" && typeof event.data?.previewUrl === "string")?.data;
        if (lastPreview?.previewUrl && lastPreview.sandboxId) {
          setPreviewUrl(lastPreview.previewUrl);
          setSandboxId(lastPreview.sandboxId);
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
        }
        for (const event of payload.events ?? []) {
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
    [applyStreamLog]
  );

  const ensureLemnityAiSession = useCallback(async (): Promise<string | null> => {
    if (lemnityAiSessionId) return lemnityAiSessionId;
    try {
      const res = await fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`, {
        method: "PUT",
        credentials: "include"
      });
      if (!res.ok) return null;
      const envelope = (await res.json()) as LemnityAiBridgeEnvelope<{ session_id?: string }>;
      const createdId = envelope?.data?.session_id;
      if (!createdId) return null;
      setLemnityAiSessionId(createdId);
      router.replace(`/playground/build?sessionId=${encodeURIComponent(createdId)}`);
      return createdId;
    } catch {
      return null;
    }
  }, [lemnityAiSessionId, router]);

  const sendLemnityAiChat = useCallback(
    async (messageText: string) => {
      pushRecent(messageText.slice(0, 120));
      const sid = await ensureLemnityAiSession();
      if (!sid) {
        push("assistant", "❌ Не удалось создать сессию Lemnity AI.");
        return;
      }

      beginInterfaceBuildTiming();
      setIsGenerating(true);
      setMode("generating");
      setStage("generating");
      setProgress(10);
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
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          credentials: "include",
          body: JSON.stringify({
            message: messageText,
            timestamp: Math.floor(Date.now() / 1000),
            event_id: eventId,
            agent_hint: agentHint,
            project_kind: projectKind ?? undefined
          }),
          signal: controller.signal
        });
        if (!isCurrentRequest()) return;
        if (!response.ok || !response.body) {
          const message = await response.text().catch(() => "Ошибка API Lemnity AI");
          if (!isCurrentRequest()) return;
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
                if (data.kind !== "artifact") {
                  bridgeSawDeltaRef.current = true;
                  appendBridgeAssistantChunk(piece);
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
              if (roleRaw === "user") return;
              if (roleRaw === "assistant" || roleRaw === undefined) {
                if (!bridgeSawDeltaRef.current) {
                  pushBridgeAssistantMessage(trimmed);
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
              push("assistant", `❌ ${data.error || "Ошибка Lemnity AI"}`);
              setMode("idle");
              setStage("ready");
              return;
            }

            if (ev === "preview") {
              const data = JSON.parse(chunk.data) as LemnityAiPreviewEvent;
              if (data.previewUrl && data.sandboxId) {
                interfaceBuildGotPreviewRef.current = true;
                setPreviewUrl(data.previewUrl);
                setSandboxId(data.sandboxId);
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
      }
    },
    [
      agentHint,
      appendBridgeAssistantChunk,
      applyStreamLog,
      beginInterfaceBuildTiming,
      ensureLemnityAiSession,
      finalizeInterfaceBuildTiming,
      loadLemnityAiSession,
      projectKind,
      push,
      pushBridgeAssistantMessage
    ]
  );

  const runPromptCoach = useCallback(
    async (thread: ChatMessage[]) => {
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      const seq = ++coachRequestSeqRef.current;

      const apiMessages = thread
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

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

        if (!mountedRef.current || controller.signal.aborted) return;

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          if (!mountedRef.current || controller.signal.aborted) return;
          push("assistant", `❌ ${msg || "Не удалось получить ответ коуча"}`);
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

        if (!mountedRef.current || controller.signal.aborted) return;

        const reply = typeof data.reply === "string" ? data.reply.trim() : "";
        if (!reply) {
          push("assistant", "❌ Пустой ответ. Попробуй ещё раз.");
          return;
        }

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
        if (!mountedRef.current) return;
        push("assistant", "❌ Ошибка запроса к коучу промпта");
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
      } finally {
        if (mountedRef.current && coachRequestSeqRef.current === seq) {
          setPromptCoachLoading(false);
        }
      }
    },
    [agentHint, idea, projectKind, push]
  );

  useEffect(() => {
    if (!lemnityAiBridgeReady || !shouldUseLemnityAiBridge) return;
    if (requestedSessionId) return;
    const handoff = readBuilderHandoff();
    const fromStorage = handoff?.idea?.trim();
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

    if (handoff?.projectKind) setProjectKind(handoff.projectKind);
    setIdea(fromStorage);
    setStage("questions");
    setCoachAwaitingConfirm(false);
    setPendingTechnicalPrompt(null);
    setPromptCoachDebugLine(null);
    setPromptBuilderDebugLine(null);
    const msg: ChatMessage = { id: createMessageId(), role: "user", content: fromStorage };
    setMessages([msg]);
    void runPromptCoach([msg]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lemnityAiBridgeReady, shouldUseLemnityAiBridge, requestedSessionId, runPromptCoach]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestAbortRef.current?.abort();
    };
  }, []);

  /** Подтягивает summary сессии в Prisma (previewArtifactId), чтобы PATCH артефакта не получал 404 сразу после превью. */
  useEffect(() => {
    if (!shouldUseLemnityAiBridge || !lemnityAiSessionId) return;
    if (!sandboxId?.startsWith("artifact_")) return;
    let cancelled = false;
    void (async () => {
      try {
        await fetch(
          `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions/${encodeURIComponent(lemnityAiSessionId)}`,
          { method: "GET", credentials: "include" }
        );
      } catch {
        // ignore
      }
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [sandboxId, lemnityAiSessionId, shouldUseLemnityAiBridge]);

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
    if (!lemnityAiBridgeReady || shouldUseLemnityAiBridge) return;
    const handoff = readBuilderHandoff();
    const fromStorage = handoff?.idea;
    if (fromStorage) {
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
      if (handoff?.projectKind) setProjectKind(handoff.projectKind);
      setIdea(fromStorage);
      setStage("questions");
      push("assistant", `Проект создан по запросу:\n\n“${fromStorage}”\n\nСейчас уточню детали и соберу идеальный промпт.`);
      void handleCreateQuestions(fromStorage, handoff?.projectKind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lemnityAiBridgeReady, shouldUseLemnityAiBridge]);

  function pushRecent(item: string) {
    try {
      const key = "lemnity.recent";
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{ t: number; text: string }>;
      const next = [{ t: Date.now(), text: item }, ...current.filter((x) => x.text !== item)].slice(0, 8);
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

    pushRecent(currentIdea);
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
      push("assistant", `❌ ${msg || "Не удалось получить вопросы"}`);
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
      push("assistant", `❌ ${msg || "Не удалось собрать промпт"}`);
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

    pushRecent(idea.trim() || prompt.slice(0, 120));
    resetStreamLog();
    beginInterfaceBuildTiming();
    setIsGenerating(true);
    setMode("generating");
    setStage("generating");
    push("assistant", "🎯 Анализирую запрос…");
    setProgress(8);
    setPreviewUrl(null);
    setSandboxId(null);
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
          projectKind: projectKind ?? undefined,
          agentHint
        }),
        signal: controller.signal
      });
      if (!isCurrentRequest()) return;

      if (!response.ok || !response.body) {
        const message = await response.text();
        if (!isCurrentRequest()) return;
        push("assistant", `❌ ${message || "Ошибка генерации"}`);
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
          setPreviewUrl(eventData.previewUrl);
          setSandboxId(eventData.sandboxId);
          setMode("preview");
          push("assistant", "✅ Превью готово. Можешь написать, что изменить — я внесу правки следующим шагом.");
        }
        if (eventData.type === "error") {
          push("assistant", `❌ ${eventData.message}`);
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
    }
  }

  function onSend(text: string) {
    if (!lemnityAiBridgeReady) {
      toast.message("Загрузка режима сборки…");
      return;
    }
    if (shouldUseLemnityAiBridge) {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (coachAwaitingConfirm && pendingTechnicalPrompt) {
        const userMsg: ChatMessage = { id: createMessageId(), role: "user", content: trimmed };
        const nextThread = [...messages, userMsg];
        setMessages(nextThread);
        if (isAffirmativeUserReply(trimmed)) {
          const p = pendingTechnicalPrompt;
          setCoachAwaitingConfirm(false);
          setPendingTechnicalPrompt(null);
          setPromptCoachDebugLine(null);
          void sendLemnityAiChat(p);
          return;
        }
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
        void runPromptCoach(nextThread);
        return;
      }

      if (stage === "ready") {
        push("user", trimmed);
        setPromptCoachDebugLine(null);
        void sendLemnityAiChat(trimmed);
        return;
      }

      const userMsg: ChatMessage = { id: createMessageId(), role: "user", content: trimmed };
      const nextThread = [...messages, userMsg];
      setMessages(nextThread);
      if (!idea.trim()) setIdea(trimmed);
      if (stage === "idea") setStage("questions");
      void runPromptCoach(nextThread);
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

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 flex-1 flex-col bg-muted/40">
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[52px] shrink-0 flex-col items-center gap-2 border-r border-border bg-background py-3">
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground"
                    aria-label="Назад в Playground"
                    onClick={() => router.push("/playground")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  Назад в Playground
                </TooltipContent>
              </Tooltip>
              <MenuDrawer
                compact
                lemnityAiBridgeReady={lemnityAiBridgeReady}
                shouldUseLemnityAiBridge={shouldUseLemnityAiBridge}
                leftCollapsed={leftCollapsed}
                onToggleCollapse={() => {
                  setLeftCollapsed((v) => {
                    const next = !v;
                    if (next) {
                      leftWidthBeforeCollapseRef.current = leftWidth;
                    } else {
                      setLeftWidth(leftWidthBeforeCollapseRef.current || 400);
                    }
                    return next;
                  });
                }}
              />
            </TooltipProvider>
          </aside>

          <div
            className="relative min-h-0 overflow-hidden border-r border-border bg-background transition-[width,opacity] duration-200 ease-out"
            style={{
              width: leftCollapsed ? 0 : leftWidth,
              minWidth: leftCollapsed ? 0 : 280,
              maxWidth: leftCollapsed ? 0 : 560,
              opacity: leftCollapsed ? 0 : 1,
              pointerEvents: leftCollapsed ? "none" : "auto"
            }}
          >
            <AgentChat
              variant="studio"
              title={header}
              messages={messages}
              disabled={isGenerating || promptCoachLoading || !lemnityAiBridgeReady}
              onSend={onSend}
              placeholder="Отправить сообщение Lemnity…"
              plan={session?.user?.plan ?? null}
              projectKind={projectKind}
              agentTask={shouldUseLemnityAiBridge ? "prompt-coach" : "generate-stream"}
              onModelHintChange={setAgentHint}
              threadPromptSlot={chatPromptSlot}
              threadStatusSlot={
                streamSteps.length > 0 || streamToolLine ? (
                  <BuildStreamSteps steps={streamSteps} toolLine={streamToolLine} className="border-0 bg-transparent" />
                ) : null
              }
              threadScrollKey={chatThreadScrollKey}
              footerSlot={
                isGenerating ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    <span className="min-w-0 truncate">
                      Сборка интерфейса · {interfaceBuildElapsedLabel ?? "0 с"}
                    </span>
                  </div>
                ) : lastInterfaceBuildMs != null ? (
                  <div className="rounded-lg border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                    Был собран за {formatInterfaceBuildTotalRu(lastInterfaceBuildMs)}
                  </div>
                ) : promptCoachLoading ? (
                  <div className="rounded-lg border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
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

            {!leftCollapsed ? (
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

          <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-muted/30">
            <BuildPreviewChrome
              tab={tab}
              onTabChange={(next) => {
                setTab(next);
                if (next !== "preview") setVisualLayoutEditor(false);
              }}
              sandboxId={sandboxId}
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
              addressPath={addressPath}
              previewEditorToggle={
                tab === "preview"
                  ? {
                      active: visualLayoutEditor,
                      onToggle: () => setVisualLayoutEditor((v) => !v)
                    }
                  : undefined
              }
            />

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden",
                tab === "preview" ? "gap-0 p-0" : "gap-2 p-2 pt-1"
              )}
            >
              {tab === "preview" ? (
                <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-background">
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
                  />
                </div>
              ) : tab === "settings" ? (
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-background p-4">
                  <BuildSettings />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background p-4">
                  <BuildCode sandboxId={sandboxId} artifactMimeType={previewArtifactMime} />
                </div>
              )}
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
