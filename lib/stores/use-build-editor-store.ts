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
  // Extended UI state (was local useState in build/page.tsx):
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
