"use client";

import { create } from "zustand";

import { shareApi, type ShareState } from "@/lib/api-client/share";

interface ShareStore {
  sandboxId: string | null;
  isPublic: boolean;
  hideLemnityHeader: boolean;
  showLemnityBranding: boolean;
  isLoading: boolean;
  setSandboxId: (id: string | null) => void;
  fetchState: () => Promise<void>;
  makePublic: () => Promise<void>;
  makePrivate: () => Promise<void>;
  setHideHeader: (hide: boolean) => Promise<void>;
}

function applyShareState(state: ShareState): Partial<ShareStore> {
  return {
    isPublic: state.isPublic,
    hideLemnityHeader: state.hideLemnityHeader,
    showLemnityBranding: state.showLemnityBranding,
  };
}

export const useShareStore = create<ShareStore>((set, get) => ({
  sandboxId: null,
  isPublic: false,
  hideLemnityHeader: false,
  showLemnityBranding: true,
  isLoading: false,

  setSandboxId: (id) => set({ sandboxId: id }),

  fetchState: async () => {
    const { sandboxId } = get();
    if (!sandboxId) return;
    set({ isLoading: true });
    const result = await shareApi.getState(sandboxId);
    if (result.ok) set(applyShareState(result.data));
    set({ isLoading: false });
  },

  makePublic: async () => {
    const { sandboxId } = get();
    if (!sandboxId) return;
    set({ isLoading: true });
    const result = await shareApi.makePublic(sandboxId);
    if (result.ok) set({ isPublic: true });
    set({ isLoading: false });
  },

  makePrivate: async () => {
    const { sandboxId } = get();
    if (!sandboxId) return;
    set({ isLoading: true });
    const result = await shareApi.makePrivate(sandboxId);
    if (result.ok) set({ isPublic: false });
    set({ isLoading: false });
  },

  setHideHeader: async (hide: boolean) => {
    const { sandboxId } = get();
    if (!sandboxId) return;
    set({ isLoading: true });
    const result = await shareApi.setHideHeader(sandboxId, hide);
    if (result.ok) set(applyShareState(result.data));
    set({ isLoading: false });
  },
}));
