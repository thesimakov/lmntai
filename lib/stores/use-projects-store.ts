"use client";

import { create } from "zustand";

/**
 * Заменяет custom events `playground-projects-refresh` и `lemnity:recent-updated`.
 * Компоненты подписываются через useEffect на refreshToken изменение.
 */
interface ProjectsStore {
  refreshToken: number;
  recentUpdatedAt: number;
  refresh: () => void;
  markRecentUpdated: () => void;
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  refreshToken: 0,
  recentUpdatedAt: 0,
  refresh: () => set((s) => ({ refreshToken: s.refreshToken + 1 })),
  markRecentUpdated: () => set({ recentUpdatedAt: Date.now() }),
}));
