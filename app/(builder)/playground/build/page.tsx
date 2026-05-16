"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowLeftRight, ChevronDown, Loader2, Layers } from "lucide-react";

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
import { useSandboxFilesStore } from "@/lib/stores/use-sandbox-files-store";
import {
  coalesceSandboxIdFromBridgePreview,
  resolvePublishOpenUrl,
  resolveShareablePreviewUrl,
} from "@/lib/preview-share";
import { formatAgentModelDisplayLabel, type AgentPickerLabel } from "@/lib/agent-models";
import { isAffirmativeUserReply } from "@/lib/affirmative-reply";
import {
  formatAttachmentsForLemnityChat,
  mergeUserMessageWithAttachments,
  playgroundUserDisplayContent,
} from "@/lib/chat-attachments";
import { readStoredLemnityBuildManusSessionId } from "@/lib/lemnity-ai-build-session-storage";
import { formatBuildElapsed, formatBuildTotalDuration } from "@/lib/build-time-i18n";
import { sanitizeProjectTitleForUser } from "@/lib/display-title";
import { getStreamStepTitle } from "@/lib/stream-step-title";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
import { isProjectKind } from "@/lib/lemnity-ai-prompt-spec";

export default function PromptBuildPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { ready: lemnityAiBridgeReady } = useLemnityAiBridgeFromServer();

  const requestedSessionId = searchParams.get("sessionId");
  const requestedProjectKind = searchParams.get("projectKind");

  // ── Store ──
  const sessionId = useBuildEditorStore((s) => s.sessionId);
  const sandboxId = useBuildEditorStore((s) => s.sandboxId);
  const previewUrl = useBuildEditorStore((s) => s.previewUrl);
  const projectKind = useBuildEditorStore((s) => s.projectKind);
  const shareIsPublic = useBuildEditorStore((s) => s.shareIsPublic);
  const messages = useBuildEditorStore((s) => s.messages);
  const stage = useBuildEditorStore((s) => s.stage);
  const idea = useBuildEditorStore((s) => s.idea);
  const finalPrompt = useBuildEditorStore((s) => s.finalPrompt);
  const buildTemplate = useBuildEditorStore((s) => s.buildTemplate);
  const isGenerating = useBuildEditorStore((s) => s.isGenerating);
  const progress = useBuildEditorStore((s) => s.progress);
  const previewArtifactMime = useBuildEditorStore((s) => s.previewArtifactMime);
  const previewDownloadFilename = useBuildEditorStore((s) => s.previewDownloadFilename);
  const presentationPdfExport = useBuildEditorStore((s) => s.presentationPdfExport);
  const lastBuildMs = useBuildEditorStore((s) => s.lastBuildMs);
  const streamArtifactChars = useBuildEditorStore((s) => s.streamArtifactChars);
  const coachAwaitingConfirm = useBuildEditorStore((s) => s.coachAwaitingConfirm);
  const pendingTechnicalPrompt = useBuildEditorStore((s) => s.pendingTechnicalPrompt);
  const promptCoachLoading = useBuildEditorStore((s) => s.promptCoachLoading);
  const coachSlowHint = useBuildEditorStore((s) => s.coachSlowHint);
  const promptCoachDebugLine = useBuildEditorStore((s) => s.promptCoachDebugLine);
  const leftCollapsed = useBuildEditorStore((s) => s.leftCollapsed);
  const leftWidth = useBuildEditorStore((s) => s.leftWidth);
  const contentTab = useBuildEditorStore((s) => s.contentTab);
  const agentHint = useBuildEditorStore((s) => s.agentHint);
  const visualLayoutEditor = useBuildEditorStore((s) => s.visualLayoutEditor);
  const publishDialogOpen = useBuildEditorStore((s) => s.publishDialogOpen);

  const setSessionId = useBuildEditorStore((s) => s.setSessionId);
  const setProjectKind = useBuildEditorStore((s) => s.setProjectKind);
  const setShareIsPublic = useBuildEditorStore((s) => s.setShareIsPublic);
  const setStage = useBuildEditorStore((s) => s.setStage);
  const setIdea = useBuildEditorStore((s) => s.setIdea);
  const setLeftCollapsed = useBuildEditorStore((s) => s.setLeftCollapsed);
  const setLeftWidth = useBuildEditorStore((s) => s.setLeftWidth);
  const setContentTab = useBuildEditorStore((s) => s.setContentTab);
  const setAgentHint = useBuildEditorStore((s) => s.setAgentHint);
  const setVisualLayoutEditor = useBuildEditorStore((s) => s.setVisualLayoutEditor);
  const setPublishDialogOpen = useBuildEditorStore((s) => s.setPublishDialogOpen);
  const setBuildTemplate = useBuildEditorStore((s) => s.setBuildTemplate);

  // ── Hooks ──
  const { steps: streamSteps, toolLine: streamToolLine } = useBuildStreamLog();
  const { sendChat, templatePreviewSandboxIdRef } = useAiSession();
  const { runPromptCoach } = usePromptCoach();

  // ── ComponentGraph generation (website projectKind) ──
  const sendGenerateGraph = useCallback(async (prompt: string) => {
    const projectId = useBuildEditorStore.getState().sessionId;
    if (!projectId) { toast.error("Проект не готов"); return; }
    const s = useBuildEditorStore.getState();
    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    s.setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/generate-graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        toast.error(err.error ?? t("playground_generation_failed"));
        s.setIsGenerating(false);
        return;
      }
      s.setSandboxId(projectId);
      s.setPreviewUrl(`/api/sandbox/${encodeURIComponent(projectId)}?t=${Date.now()}`);
      s.setProgress(100);
      s.setStage("ready");
      useSandboxFilesStore.getState().notifyFilesUpdated(projectId);
      s.appendMessage({ id: createId(), role: "assistant", content: "Сайт сгенерирован. Вы можете редактировать его в Lemnity Box.", sentAt: Date.now() });
    } catch {
      toast.error(t("playground_generation_failed"));
    } finally {
      s.setIsGenerating(false);
    }
  }, [t]);

  // ── SlideGraph generation (presentation projectKind) ──
  const sendGenerateSlides = useCallback(async (prompt: string) => {
    const projectId = useBuildEditorStore.getState().sessionId;
    if (!projectId) { toast.error("Проект не готов"); return; }
    const s = useBuildEditorStore.getState();
    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    s.setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/generate-slides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        toast.error(err.error ?? t("playground_generation_failed"));
        s.setIsGenerating(false);
        return;
      }
      s.setSandboxId(projectId);
      s.setPreviewUrl(`/api/sandbox/${encodeURIComponent(projectId)}?t=${Date.now()}`);
      s.setProgress(100);
      s.setStage("ready");
      useSandboxFilesStore.getState().notifyFilesUpdated(projectId);
      s.appendMessage({ id: createId(), role: "assistant", content: "Презентация сгенерирована. Кликайте по слайдам для редактирования.", sentAt: Date.now() });
    } catch {
      toast.error(t("playground_generation_failed"));
    } finally {
      s.setIsGenerating(false);
    }
  }, [t]);

  // ── SlideGraph chat (presentation projectKind, after slides generated) ──
  const sendSlidesChat = useCallback(async (text: string) => {
    const s = useBuildEditorStore.getState();
    const projectId = s.sessionId;
    if (!projectId) return false;
    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const history = s.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    s.setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/slides/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        toast.error(err.error ?? "Chat failed");
        return true;
      }
      const data = await res.json() as { message: string; patched: boolean };
      s.appendMessage({ id: createId(), role: "assistant", content: data.message, sentAt: Date.now() });
      if (data.patched) {
        s.setPreviewUrl(`/api/sandbox/${encodeURIComponent(projectId)}?t=${Date.now()}`);
      }
    } catch {
      toast.error("Chat failed. Please try again.");
    } finally {
      s.setIsGenerating(false);
    }
    return true;
  }, []);

  // ── ComponentGraph chat (website projectKind, after site is generated) ──
  const sendGraphChat = useCallback(async (text: string) => {
    const s = useBuildEditorStore.getState();
    const projectId = s.sessionId;
    if (!projectId) return false;
    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const history = s.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    s.setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/graph/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        toast.error(err.error ?? "Chat failed");
        return true;
      }
      const data = await res.json() as { message: string; patched: boolean };
      s.appendMessage({ id: createId(), role: "assistant", content: data.message, sentAt: Date.now() });
      if (data.patched) {
        // Force iframe reload by toggling previewUrl
        const url = `/api/sandbox/${encodeURIComponent(projectId)}?t=${Date.now()}`;
        s.setPreviewUrl(url);
      }
    } catch {
      toast.error("Chat failed. Please try again.");
    } finally {
      s.setIsGenerating(false);
    }
    return true;
  }, []);

  // ── Project scope ──
  const [projectScopeReady, setProjectScopeReady] = useState(false);
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

  // ── Load projectKind from URL param (e.g. ?projectKind=website) ──
  useEffect(() => {
    if (!requestedProjectKind?.trim()) return;
    if (isProjectKind(requestedProjectKind)) setProjectKind(requestedProjectKind);
  }, [requestedProjectKind, setProjectKind]);

  // ── Template preview ──
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
      const s = useBuildEditorStore.getState();
      templatePreviewSandboxIdRef.current = String(data.sandboxId);
      s.setPreviewUrl(data.previewUrl);
      s.setSandboxId(data.sandboxId);
      s.setPreviewArtifactMime(null);
      s.setPreviewDownloadFilename(null);
      s.setPresentationPdfExport(null);
      s.setShareIsPublic(false);
      s.setProgress(100);
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

  // ── Visual Runtime — selected graph node ──
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);
  const [inlineEditText, setInlineEditText] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "lmnt-node-selected") {
        setSelectedGraphNodeId(e.data.nodeId as string);
        setInlineEditText("");
        setTimeout(() => inlineInputRef.current?.focus(), 50);
      } else if (e.data?.type === "lmnt-node-deselected") {
        setSelectedGraphNodeId(null);
      } else if (e.data?.type === "lmnt-elem-selected") {
        const id = `${e.data.slideId as string}/${e.data.elemId as string}`;
        setSelectedGraphNodeId(id);
        setInlineEditText("");
        setTimeout(() => inlineInputRef.current?.focus(), 50);
      } else if (e.data?.type === "lmnt-elem-deselected") {
        setSelectedGraphNodeId(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleInlineEdit = useCallback(async () => {
    const trimmed = inlineEditText.trim();
    if (!trimmed || !selectedGraphNodeId || !sandboxId) return;
    const s = useBuildEditorStore.getState();
    if (!s.sessionId) return;
    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    s.appendMessage({ id: createId(), role: "user", content: trimmed, sentAt: Date.now() });
    setInlineEditText("");
    setSelectedGraphNodeId(null);
    if (projectKind === "presentation") {
      void sendSlidesChat(`[Элемент: ${selectedGraphNodeId}] ${trimmed}`);
    } else {
      void sendGraphChat(`[Блок: ${selectedGraphNodeId}] ${trimmed}`);
    }
  }, [inlineEditText, projectKind, sandboxId, selectedGraphNodeId, sendGraphChat, sendSlidesChat]);

  // ── Build timer ──
  const [buildTimerTick, setBuildTimerTick] = useState(0);
  const buildStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (isGenerating) {
      buildStartRef.current = Date.now();
      setBuildTimerTick(0);
      const id = window.setInterval(() => setBuildTimerTick((n) => n + 1), 250);
      return () => clearInterval(id);
    } else {
      buildStartRef.current = null;
    }
  }, [isGenerating]);

  // ── onSend ──
  const onSend = useCallback(async (text: string, files?: File[]) => {
    if (!lemnityAiBridgeReady && projectKind !== "website" && projectKind !== "presentation") { toast.message("Загрузка режима сборки…"); return; }
    if (isGenerating) return;
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
    const s = useBuildEditorStore.getState();

    // Short-circuit for ComponentGraph website projects — skip Bridge and prompt coach entirely
    if (projectKind === "website") {
      if (!s.sessionId) { toast.error("Проект не готов"); return; }
      s.appendMessage({ id: createId(), role: "user", content: displayContent, sentAt: Date.now(), ...userExtras });
      if (sandboxId) {
        const nodeContext = selectedGraphNodeId ? `[Блок: ${selectedGraphNodeId}] ` : "";
        setSelectedGraphNodeId(null);
        void sendGraphChat(nodeContext + userOutbound);
      } else {
        void sendGenerateGraph(userOutbound);
      }
      return;
    }

    // Short-circuit for SlideGraph presentation projects
    if (projectKind === "presentation") {
      if (!s.sessionId) { toast.error("Проект не готов"); return; }
      s.appendMessage({ id: createId(), role: "user", content: displayContent, sentAt: Date.now(), ...userExtras });
      if (sandboxId) {
        const elemContext = selectedGraphNodeId ? `[Элемент: ${selectedGraphNodeId}] ` : "";
        setSelectedGraphNodeId(null);
        void sendSlidesChat(elemContext + userOutbound);
      } else {
        void sendGenerateSlides(userOutbound);
      }
      return;
    }

    if (coachAwaitingConfirm) {
      if (!pendingTechnicalPrompt) return;
      const userMsg = { id: createId(), role: "user" as const, content: displayContent, sentAt: Date.now(), ...userExtras };
      if (isAffirmativeUserReply(trimmed)) {
        s.appendMessage(userMsg);
        s.setCoachAwaitingConfirm(false);
        s.setPendingTechnicalPrompt(null);
        s.setPromptCoachDebugLine(null);
        void sendChat(mergeUserMessageWithAttachments(pendingTechnicalPrompt, annex));
        return;
      }
      s.setCoachAwaitingConfirm(false);
      s.setPendingTechnicalPrompt(null);
      const next = [...messages, userMsg];
      s.setMessages(next);
      void runPromptCoach(next);
      return;
    }

    if (stage === "ready") {
      const built = finalPrompt.trim();
      const isDispatchingBuilt = !hasFiles && built.length > 0 && trimmed === built;
      if (isDispatchingBuilt) {
        s.appendMessage({ id: createId(), role: "assistant", content: t("playground_chat_assistant_dispatch_built_prompt"), sentAt: Date.now() });
      } else {
        s.appendMessage({ id: createId(), role: "user", content: displayContent, sentAt: Date.now(), ...userExtras });
      }
      s.setPromptCoachDebugLine(null);
      void sendChat(userOutbound);
      return;
    }

    const userMsg = { id: createId(), role: "user" as const, content: displayContent, sentAt: Date.now(), ...userExtras };
    const nextThread = [...messages, userMsg];
    s.setMessages(nextThread);
    if (!idea.trim()) setIdea(trimmed || displayContent);
    if (stage === "idea") setStage("questions");
    void runPromptCoach(nextThread);
  }, [
    buildTemplate, coachAwaitingConfirm, finalPrompt, idea, isGenerating,
    lemnityAiBridgeReady, messages, pendingTechnicalPrompt, projectKind, runPromptCoach,
    sandboxId, selectedGraphNodeId, sendChat, sendGenerateGraph, sendGenerateSlides,
    sendGraphChat, sendSlidesChat, setIdea, setStage, stage, t,
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
  useEffect(() => { if (!documentTabVisible && contentTab === "document") setContentTab("preview"); }, [documentTabVisible, contentTab, setContentTab]);
  useEffect(() => { if (contentTab === "document") setVisualLayoutEditor(true); }, [contentTab, setVisualLayoutEditor]);

  // ── Load snapshot versions on mount / when project changes ──
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    void fetch(`/api/projects/${encodeURIComponent(sessionId)}/snapshots`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = (await res.json().catch(() => null)) as { snapshots?: import("@/lib/stores/use-build-editor-store").ProjectSnapshotMeta[] } | null;
        if (Array.isArray(data?.snapshots) && !cancelled) {
          useBuildEditorStore.getState().setVersions(data.snapshots);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId]);

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

  const studioChatPlaceholder = useMemo(() => {
    if (projectKind === "website" && selectedGraphNodeId) return `Опишите изменения для блока ${selectedGraphNodeId}…`;
    if (projectKind === "website") return "Опишите сайт или желаемые изменения…";
    if (projectKind === "presentation" && selectedGraphNodeId) return `Опишите изменения для элемента…`;
    if (projectKind === "presentation") return "Опишите презентацию или желаемые изменения…";
    if (buildTemplate) return t("playground_chat_placeholder_template_focus");
    return t("playground_chat_input_placeholder_studio");
  }, [buildTemplate, projectKind, selectedGraphNodeId, t]);

  const interfaceBuildElapsedLabel = useMemo(() => {
    void buildTimerTick;
    if (!isGenerating || buildStartRef.current == null) return null;
    return formatBuildElapsed(Date.now() - buildStartRef.current, lang);
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
    } catch {
      toast.error(t("playground_build_share_error_instant"));
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
    setSelectedGraphNodeId(elementId);
    setInlineEditText("");
    setTimeout(() => inlineInputRef.current?.focus(), 50);
    toast.info(`Контекст: ${elementLabel}. Опишите правку.`);
  }, []);

  const handleBuildTemplateChange = useCallback((next: typeof buildTemplate) => {
    setBuildTemplate(next);
    if (!next) {
      templatePreviewAbortRef.current?.abort();
      const s = useBuildEditorStore.getState();
      if (templatePreviewSandboxIdRef.current && s.sandboxId === templatePreviewSandboxIdRef.current) {
        templatePreviewSandboxIdRef.current = null;
        s.setPreviewUrl(null);
        s.setSandboxId(null);
        s.setPreviewArtifactMime(null);
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
  }, [idea, projectKind, runBuildTemplatePreview, setBuildTemplate, setIdea, setStage, templatePreviewSandboxIdRef]);

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
            {projectKind === "presentation" && sandboxId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground"
                    onClick={() => router.push(`/playground/slides?projectId=${sessionId ?? ""}`)}
                  >
                    <Layers className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Визуальный редактор слайдов</TooltipContent>
              </Tooltip>
            )}
          </>
        }
        studioToolbarTrailingSlot={
          <StudioChatRailCollapseButton compact tooltipSide="bottom" leftCollapsed={leftHidden} onToggleCollapse={toggleLeft} />
        }
        messages={messages}
        disabled={isGenerating || Boolean(buildTemplate) || (projectKind !== "website" && projectKind !== "presentation" && (promptCoachLoading || !lemnityAiBridgeReady))}
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
          <>
          {(projectKind === "website" || projectKind === "presentation") && selectedGraphNodeId ? (
            <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-2 text-xs">
              <span className="text-sky-700 dark:text-sky-300">
                {projectKind === "presentation" ? "Слайд:" : "Редактировать:"}{" "}
                <code className="font-mono font-semibold">{selectedGraphNodeId}</code>
              </span>
              <button type="button" onClick={() => setSelectedGraphNodeId(null)} className="ml-auto rounded px-1 text-sky-600 hover:text-sky-800 dark:text-sky-400" aria-label="Снять выделение">×</button>
            </div>
          ) : null}
          {isGenerating ? (
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
          ) : null}
          </>
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
        tab={contentTab}
        documentTabVisible={documentTabVisible}
        onTabChange={(next) => { setContentTab(next); if (next !== "preview" && next !== "document") setVisualLayoutEditor(false); }}
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
        downloadSiteUrl={projectKind === "website" && sessionId && sandboxId ? `/api/projects/${encodeURIComponent(sessionId)}/export-site` : null}
        onHistoryClick={() => router.push("/projects")}
        previewEditorToggle={
          contentTab === "preview" || contentTab === "document"
            ? { active: visualLayoutEditor, onToggle: () => setVisualLayoutEditor(!visualLayoutEditor) }
            : undefined
        }
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {(projectKind === "website" || projectKind === "presentation") && selectedGraphNodeId && contentTab === "preview" && !isGenerating && (
          <div className="absolute bottom-5 left-1/2 z-50 w-[min(480px,90%)] -translate-x-1/2 pointer-events-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); void handleInlineEdit(); }}
              className="flex items-center gap-2 rounded-2xl border border-sky-400/40 bg-background/95 px-3 py-2 shadow-xl shadow-sky-500/10 ring-1 ring-border/60 backdrop-blur-md"
            >
              <span className="shrink-0 rounded-md bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                {selectedGraphNodeId}
              </span>
              <input
                ref={inlineInputRef}
                type="text"
                value={inlineEditText}
                onChange={(e) => setInlineEditText(e.target.value)}
                placeholder="Опишите изменение…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!inlineEditText.trim()}
                className="shrink-0 rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                AI Edit
              </button>
              <button
                type="button"
                onClick={() => setSelectedGraphNodeId(null)}
                className="shrink-0 rounded-md px-1.5 py-1 text-muted-foreground hover:text-foreground"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </form>
          </div>
        )}
        <div className={cn("flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background", contentTab !== "preview" && contentTab !== "document" ? "pointer-events-none invisible absolute inset-0 z-0" : "relative z-10")} aria-hidden={contentTab !== "preview" && contentTab !== "document"}>
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
            previewVariant={contentTab === "document" ? "document" : "default"}
            ensurePublicShareForPreviewTab={ensurePublicShareForPreviewTab}
            showOpenInBox={Boolean(previewUrl && sandboxId && !sandboxId.startsWith("artifact_") && projectKind !== "presentation" && projectKind !== "resume" && projectKind !== "lovable")}
            onAiEdit={visualLayoutEditor ? handleAiEdit : undefined}
          />
        </div>
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background m-2 mt-1", contentTab !== "settings" ? "pointer-events-none invisible absolute inset-0 z-0 m-2 mt-1" : "relative z-10")} aria-hidden={contentTab !== "settings"}>
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
        <div className={cn("flex h-full min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background p-2 sm:p-3", contentTab !== "code" ? "pointer-events-none invisible absolute inset-0 z-0 m-2 mt-1" : "relative z-10 m-2 mt-1")} aria-hidden={contentTab !== "code"}>
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

// ─── Coach loading footer ─────────────────────────────────────────────────────

function CoachLoadingFooter({
  coachSlowHint, coachAwaitingConfirm, agentHint, promptCoachDebugLine, t,
}: {
  coachSlowHint: boolean;
  coachAwaitingConfirm: boolean;
  agentHint: AgentPickerLabel;
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
