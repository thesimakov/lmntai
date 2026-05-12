"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ChatMessage } from "@/components/playground/agent-chat";
import { useI18n } from "@/components/i18n-provider";
import { formatLemnityBridgeErrorBody } from "@/lib/lemnity-bridge-error-format";
import { useBuildEditorStore } from "@/lib/stores/use-build-editor-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptCoachResponse = {
  reply?: string;
  phase?: string;
  technical_prompt?: string | null;
  usage?: { total_tokens?: number };
  debug_model?: string;
  debug_attempted_models?: string[];
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePromptCoach() {
  const { t } = useI18n();
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  const slowHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (slowHintTimerRef.current) clearTimeout(slowHintTimerRef.current);
    };
  }, []);

  // ── Slow-hint timer: fires 12s after promptCoachLoading becomes true ──
  const store = useBuildEditorStore();
  useEffect(() => {
    if (slowHintTimerRef.current) clearTimeout(slowHintTimerRef.current);
    if (!store.promptCoachLoading) {
      store.setCoachSlowHint(false);
      return;
    }
    slowHintTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        useBuildEditorStore.getState().setCoachSlowHint(true);
      }
    }, 12_000);
    return () => {
      if (slowHintTimerRef.current) clearTimeout(slowHintTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.promptCoachLoading]);

  // ─── runPromptCoach ────────────────────────────────────────────────────────

  const runPromptCoach = useCallback(async (thread: ChatMessage[]) => {
    const {
      idea, projectKind, agentHint,
      setPromptCoachLoading, setCoachAwaitingConfirm, setPendingTechnicalPrompt,
      setFinalPrompt, setStage, setPromptCoachDebugLine,
      appendMessage,
    } = useBuildEditorStore.getState();

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    const isStale = () => seqRef.current !== seq;

    const apiMessages = thread
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.promptPlainText ?? m.content }));

    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      setPromptCoachLoading(true);
      setPromptCoachDebugLine(null);
      const started = performance.now();

      const res = await fetch("/api/prompt-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          idea: idea.trim() || undefined,
          projectKind: projectKind ?? undefined,
          agentHint,
        }),
        signal: controller.signal,
      });

      if (!mountedRef.current || controller.signal.aborted || isStale()) return;

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        if (!mountedRef.current || isStale()) return;
        appendMessage({ id: createId(), role: "assistant", content: `❌ ${formatLemnityBridgeErrorBody(msg || "", t)}`, sentAt: Date.now() });
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
        setStage("questions");
        return;
      }

      const data = (await res.json()) as PromptCoachResponse;
      const durationMs = Math.round(performance.now() - started);

      if (!mountedRef.current || isStale()) return;

      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) {
        appendMessage({ id: createId(), role: "assistant", content: "❌ Пустой ответ. Попробуй ещё раз.", sentAt: Date.now() });
        return;
      }

      if (process.env.NODE_ENV !== "production" && typeof data.debug_model === "string" && data.debug_model.trim()) {
        const attempted = Array.isArray(data.debug_attempted_models)
          ? data.debug_attempted_models.filter((x): x is string => typeof x === "string")
          : [];
        setPromptCoachDebugLine(
          attempted.length > 0
            ? `DEV · prompt model: ${data.debug_model} · chain: ${attempted.join(" -> ")}`
            : `DEV · prompt model: ${data.debug_model}`
        );
      }

      const technicalPrompt = typeof data.technical_prompt === "string" ? data.technical_prompt.trim() : "";
      const isFinalConfirm = data.phase === "confirm" && technicalPrompt.length > 0;

      appendMessage({
        id: createId(),
        role: "assistant",
        content: reply,
        sentAt: Date.now(),
        ...(isFinalConfirm
          ? {
              showActions: true,
              promptPlainText: technicalPrompt,
              actionMeta: { durationMs, totalTokens: typeof data.usage?.total_tokens === "number" ? data.usage.total_tokens : undefined },
            }
          : {}),
      });

      if (isFinalConfirm) {
        setFinalPrompt(technicalPrompt);
        setCoachAwaitingConfirm(true);
        setPendingTechnicalPrompt(technicalPrompt);
        setStage("ready");
      } else {
        setCoachAwaitingConfirm(false);
        setPendingTechnicalPrompt(null);
        setStage("questions");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (!mountedRef.current || seqRef.current !== seq) return;
      appendMessage({ id: `${Date.now()}-err`, role: "assistant", content: "❌ Ошибка запроса к коучу промпта", sentAt: Date.now() });
      setCoachAwaitingConfirm(false);
      setPendingTechnicalPrompt(null);
    } finally {
      if (mountedRef.current && seqRef.current === seq) {
        useBuildEditorStore.getState().setPromptCoachLoading(false);
      }
    }
  }, [t]);

  return { runPromptCoach };
}
