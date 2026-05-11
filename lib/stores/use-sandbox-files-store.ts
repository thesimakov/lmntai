"use client";

import { create } from "zustand";

/**
 * Заменяет custom event `lemnity:sandbox-files-updated`.
 * Компоненты подписываются через useEffect на lastUpdatedAt изменение.
 */
interface SandboxFilesStore {
  lastUpdatedSandboxId: string | null;
  lastUpdatedAt: number;
  notifyFilesUpdated: (sandboxId: string) => void;
}

export const useSandboxFilesStore = create<SandboxFilesStore>((set) => ({
  lastUpdatedSandboxId: null,
  lastUpdatedAt: 0,
  notifyFilesUpdated: (sandboxId) =>
    set({ lastUpdatedSandboxId: sandboxId, lastUpdatedAt: Date.now() }),
}));
