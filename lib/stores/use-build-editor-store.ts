"use client";

import { create } from "zustand";

/**
 * Централизованное состояние build-редактора.
 * Заменяет 41 useState из app/(builder)/playground/build/page.tsx.
 * Миграция инкрементальная: сначала переносятся слайсы, которые пересекают компоненты.
 */

// --- Session slice ---
interface SessionSlice {
  sandboxId: string | null;
  sessionId: string | null;
  previewUrl: string | null;
  projectKind: "vite_react" | "html" | null;
  setSandboxId: (id: string | null) => void;
  setSessionId: (id: string | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setProjectKind: (kind: "vite_react" | "html" | null) => void;
}

// --- UI slice ---
interface UiSlice {
  activeTab: "chat" | "files" | "preview";
  chatRailCollapsed: boolean;
  publishDialogOpen: boolean;
  historyOpen: boolean;
  setActiveTab: (tab: "chat" | "files" | "preview") => void;
  setChatRailCollapsed: (v: boolean) => void;
  setPublishDialogOpen: (v: boolean) => void;
  setHistoryOpen: (v: boolean) => void;
}

// --- Template slice ---
interface TemplateSlice {
  templateDialogOpen: boolean;
  selectedTemplateId: string | null;
  setTemplateDialogOpen: (v: boolean) => void;
  setSelectedTemplateId: (id: string | null) => void;
}

// --- Version slice ---
export type ProjectSnapshotMeta = {
  id: string;
  versionNum: number;
  promptText: string;
  createdAt: string; // ISO
};

interface VersionSlice {
  currentVersionId: string | null;
  versions: ProjectSnapshotMeta[];
  selectedElementId: string | null;
  setCurrentVersionId: (id: string | null) => void;
  setVersions: (versions: ProjectSnapshotMeta[]) => void;
  prependVersion: (version: ProjectSnapshotMeta) => void;
  setSelectedElementId: (id: string | null) => void;
}

type BuildEditorStore = SessionSlice & UiSlice & TemplateSlice & VersionSlice;

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
  setActiveTab: (activeTab) => set({ activeTab }),
  setChatRailCollapsed: (chatRailCollapsed) => set({ chatRailCollapsed }),
  setPublishDialogOpen: (publishDialogOpen) => set({ publishDialogOpen }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),

  // Template
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
}));
