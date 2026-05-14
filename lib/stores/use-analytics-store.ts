import { create } from "zustand";
import type { AnalysisDashboard } from "@/lib/analytics-schema";
import type { InvestorReport } from "@/lib/investor-schema";

export type AnalysisStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "ready"
  | "error";

export type InvestorStatus = "idle" | "generating" | "ready" | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface AnalyticsStore {
  projectId: string | null;
  dashboard: AnalysisDashboard | null;
  status: AnalysisStatus;
  progress: number;
  errorMessage: string | null;
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;

  investorReport: InvestorReport | null;
  investorStatus: InvestorStatus;
  investorError: string | null;

  setProjectId: (id: string) => void;
  setDashboard: (d: AnalysisDashboard) => void;
  setStatus: (s: AnalysisStatus) => void;
  setProgress: (p: number) => void;
  setError: (msg: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatStreaming: (v: boolean) => void;

  setInvestorReport: (r: InvestorReport) => void;
  setInvestorStatus: (s: InvestorStatus) => void;
  setInvestorError: (msg: string) => void;

  reset: () => void;
}

const initialState = {
  projectId: null,
  dashboard: null,
  status: "idle" as AnalysisStatus,
  progress: 0,
  errorMessage: null,
  chatMessages: [],
  isChatStreaming: false,
  investorReport: null,
  investorStatus: "idle" as InvestorStatus,
  investorError: null,
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),
  setDashboard: (dashboard) => set({ dashboard, status: "ready" }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (errorMessage) => set({ status: "error", errorMessage }),
  setIsChatStreaming: (isChatStreaming) => set({ isChatStreaming }),

  setInvestorReport: (investorReport) =>
    set({ investorReport, investorStatus: "ready", investorError: null }),
  setInvestorStatus: (investorStatus) => set({ investorStatus }),
  setInvestorError: (investorError) =>
    set({ investorStatus: "error", investorError }),

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
