import { create } from "zustand";
import type { MarketingDashboard } from "@/lib/marketing-schema";

export type MarketingStatus = "idle" | "uploading" | "analyzing" | "ready" | "error";

export interface MarketingChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface MarketingStore {
  projectId: string | null;
  dashboard: MarketingDashboard | null;
  status: MarketingStatus;
  errorMessage: string | null;
  chatMessages: MarketingChatMessage[];
  isChatStreaming: boolean;

  setProjectId: (id: string) => void;
  setDashboard: (d: MarketingDashboard) => void;
  setStatus: (s: MarketingStatus) => void;
  setError: (msg: string) => void;
  addChatMessage: (msg: MarketingChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatStreaming: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  projectId: null,
  dashboard: null,
  status: "idle" as MarketingStatus,
  errorMessage: null,
  chatMessages: [],
  isChatStreaming: false,
};

export const useMarketingStore = create<MarketingStore>((set) => ({
  ...initialState,

  setProjectId: (projectId) => set({ projectId }),
  setDashboard: (dashboard) => set({ dashboard, status: "ready", errorMessage: null }),
  setStatus: (status) => set({ status }),
  setError: (errorMessage) => set({ status: "error", errorMessage }),
  setIsChatStreaming: (isChatStreaming) => set({ isChatStreaming }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.chatMessages];
      let lastIdx = -1;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") { lastIdx = i; break; }
      }
      if (lastIdx >= 0) msgs[lastIdx] = { ...msgs[lastIdx], content };
      return { chatMessages: msgs };
    }),

  reset: () => set(initialState),
}));
