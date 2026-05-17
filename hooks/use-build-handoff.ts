"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/components/playground/agent-chat";
import {
  BUILDER_LAST_PROCESSED_NAV_KEY,
  BUILDER_NAV_TOKEN_KEY,
  isHandoffTemplateDirectPreview,
  readBuilderHandoff,
} from "@/lib/landing-handoff";
import { useBuildEditorStore } from "@/lib/stores/use-build-editor-store";

type HandoffDeps = {
  /** True when /api/lemnity-ai/bootstrap returned data */
  lemnityAiBridgeReady: boolean;
  /** True when GET /api/projects/current finished (success or failure) */
  projectScopeReady: boolean;
  /** ?sessionId | ?projectId | ?sandboxId from URL — if present, handoff is skipped */
  requestedProjectId: string | null;
  /** Run template preview by slug (from build/page.tsx) */
  runBuildTemplatePreview: (slug: string) => Promise<void>;
  /** runPromptCoach from usePromptCoach */
  runPromptCoach: (thread: ChatMessage[]) => Promise<void>;
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useBuildHandoff({
  lemnityAiBridgeReady,
  projectScopeReady,
  requestedProjectId,
  runBuildTemplatePreview,
  runPromptCoach,
}: HandoffDeps): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!lemnityAiBridgeReady || !projectScopeReady || requestedProjectId) return;
    if (firedRef.current) return;

    const handoff = readBuilderHandoff();
    if (!handoff?.idea?.trim()) return;

    // sessionStorage duplicate-fire guard
    const navToken = sessionStorage.getItem(BUILDER_NAV_TOKEN_KEY);
    const processed = sessionStorage.getItem(BUILDER_LAST_PROCESSED_NAV_KEY);
    if (navToken) {
      if (processed === navToken) return;
      sessionStorage.setItem(BUILDER_LAST_PROCESSED_NAV_KEY, navToken);
    } else {
      const onceKey = "lemnity.builder.bridgeHandoffOnce";
      const once = sessionStorage.getItem(onceKey);
      if (once === handoff.idea) return;
      sessionStorage.setItem(onceKey, handoff.idea);
    }

    firedRef.current = true;

    const {
      setProjectKind, setBuildTemplate, setIdea, setFinalPrompt,
      setStage, setCoachAwaitingConfirm, setPendingTechnicalPrompt,
      setPromptCoachLoading, setPromptCoachDebugLine, setMessages,
    } = useBuildEditorStore.getState();

    if (handoff.projectKind) setProjectKind(handoff.projectKind);

    if (isHandoffTemplateDirectPreview(handoff) && handoff.buildTemplate?.slug) {
      setBuildTemplate(handoff.buildTemplate);
      setIdea(handoff.buildTemplate.name?.trim() || handoff.buildTemplate.slug);
      setFinalPrompt("");
      setStage("ready");
      setCoachAwaitingConfirm(false);
      setPendingTechnicalPrompt(null);
      setPromptCoachLoading(false);
      setPromptCoachDebugLine(null);
      setMessages([]);
      void runBuildTemplatePreview(handoff.buildTemplate.slug);
      return;
    }

    if (handoff.buildTemplate) {
      setBuildTemplate(handoff.buildTemplate);
    } else {
      setBuildTemplate(null);
    }

    setIdea(handoff.idea);
    setStage("questions");
    setCoachAwaitingConfirm(false);
    setPendingTechnicalPrompt(null);
    setPromptCoachDebugLine(null);

    const msg: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: handoff.idea,
      sentAt: Date.now(),
    };
    setMessages([msg]);
    void runPromptCoach([msg]);
  }, [lemnityAiBridgeReady, projectScopeReady, requestedProjectId, runBuildTemplatePreview, runPromptCoach]);
}
