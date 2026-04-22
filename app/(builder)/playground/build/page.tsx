"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AgentChat, type ChatMessage } from "@/components/playground/agent-chat";
import { BuildCode } from "@/components/playground/build-code";
import { BuildPreviewChrome } from "@/components/playground/build-topbar";
import { BuildSettings } from "@/components/playground/build-settings";
import { MenuDrawer } from "@/components/playground/menu-drawer";
import { RightPanel } from "@/components/playground/right-panel";
import { PageTransition } from "@/components/page-transition";
import type { PromptQA } from "@/components/playground/left-panel";
import { Button } from "@/components/ui/button";
import { BuildStreamSteps } from "@/components/playground/build-stream-steps";
import { useBuildStreamLog } from "@/hooks/use-build-stream-log";
import type { StreamEvent } from "@/types/build-stream";

function readIdea() {
  try {
    const data = JSON.parse(localStorage.getItem("lemnity.builder") ?? "{}") as { idea?: string };
    return data.idea ?? "";
  } catch {
    return "";
  }
}

export default function PromptBuildPage() {
  const router = useRouter();
  const didInitRef = useRef(false);
  const [idea, setIdea] = useState("");
  const [stage, setStage] = useState<"idea" | "questions" | "ready" | "generating">("idea");
  const [questions, setQuestions] = useState<string[]>([]);
  const [qa, setQa] = useState<PromptQA[]>([]);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<"idle" | "generating" | "preview">("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [tab, setTab] = useState<"preview" | "settings" | "code">("preview");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(400);
  const leftWidthBeforeCollapseRef = useRef(400);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const { steps: streamSteps, toolLine: streamToolLine, reset: resetStreamLog, applyEvent: applyStreamLog } =
    useBuildStreamLog();

  const streamHint = useMemo(() => {
    if (streamToolLine) return streamToolLine;
    const last = streamSteps[streamSteps.length - 1];
    return last ? `${last.id}: ${last.description}` : null;
  }, [streamToolLine, streamSteps]);

  const header = useMemo(() => {
    if (stage === "questions") return "Шаг 1/3 — Уточняющие вопросы";
    if (stage === "ready") return "Шаг 2/3 — Финальный промпт";
    if (stage === "generating") return "Шаг 3/3 — Генерация";
    return "Сборка промпта";
  }, [stage]);

  const addressPath = useMemo(() => {
    if (!previewUrl) return "/";
    try {
      const u = new URL(previewUrl);
      return u.pathname && u.pathname !== "" ? u.pathname : "/";
    } catch {
      return "/";
    }
  }, [previewUrl]);

  function push(role: ChatMessage["role"], content: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        content
      }
    ]);
  }

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const fromStorage = readIdea();
    if (fromStorage) {
      setIdea(fromStorage);
      setStage("questions");
      push("assistant", `Проект создан по запросу:\n\n“${fromStorage}”\n\nСейчас уточню детали и соберу идеальный промпт.`);
      void handleCreateQuestions(fromStorage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushRecent(item: string) {
    try {
      const key = "lemnity.recent";
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{ t: number; text: string }>;
      const next = [{ t: Date.now(), text: item }, ...current.filter((x) => x.text !== item)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("lemnity:recent-updated"));
    } catch {
      // ignore
    }
  }

  async function handleCreateQuestions(overrideIdea?: string) {
    const currentIdea = (overrideIdea ?? idea).trim();
    if (!currentIdea) return;
    pushRecent(currentIdea);
    setStage("questions");

    const res = await fetch("/api/prompt-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "questions", idea: currentIdea })
    });

    if (!res.ok) {
      const msg = await res.text();
      push("assistant", `❌ ${msg || "Не удалось получить вопросы"}`);
      setStage("idea");
      return;
    }

    const data = (await res.json()) as { questions: string[] };
    setQuestions(data.questions);
    setQa(data.questions.map((q) => ({ q, a: "" })));
    setQuestionIndex(0);
    push("assistant", data.questions[0] ?? "Опиши задачу подробнее.");
  }

  async function handleComposePrompt() {
    push("assistant", "🧩 Собираю финальный промпт...");
    const res = await fetch("/api/prompt-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "compose", idea, qa })
    });

    if (!res.ok) {
      const msg = await res.text();
      push("assistant", `❌ ${msg || "Не удалось собрать промпт"}`);
      return;
    }

    const data = (await res.json()) as { finalPrompt: string };
    setFinalPrompt(data.finalPrompt);
    setStage("ready");
    push(
      "assistant",
      `✅ Промпт собран. Запускаю генерацию.\n\n${data.finalPrompt.length > 700 ? `${data.finalPrompt.slice(0, 700)}…` : data.finalPrompt}`
    );
    void handleGenerate(data.finalPrompt);
  }

  async function handleGenerate(promptOverride?: string) {
    const prompt = (promptOverride ?? finalPrompt).trim();
    if (!prompt) return;

    pushRecent(idea.trim() || prompt.slice(0, 120));
    resetStreamLog();
    setIsGenerating(true);
    setMode("generating");
    setStage("generating");
    push("assistant", "🎯 Анализирую запрос…");
    setProgress(8);
    setPreviewUrl(null);
    setSandboxId(null);

    const response = await fetch("/api/generate-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok || !response.body) {
      const message = await response.text();
      push("assistant", `❌ ${message || "Ошибка генерации"}`);
      setIsGenerating(false);
      setStage("ready");
      setMode("idle");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processEvent = (eventData: StreamEvent) => {
      applyStreamLog(eventData);
      if (eventData.type === "log") push("assistant", eventData.content);
      if (eventData.type === "progress") setProgress(eventData.value);
      if (eventData.type === "preview") {
        setPreviewUrl(eventData.previewUrl);
        setSandboxId(eventData.sandboxId);
        setMode("preview");
        push("assistant", "✅ Превью готово. Можешь написать, что изменить — я внесу правки следующим шагом.");
      }
      if (eventData.type === "error") {
        push("assistant", `❌ ${eventData.message}`);
        setMode("idle");
      }
      if (eventData.type === "done") setProgress(100);
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.split("\n").find((x) => x.startsWith("data: "));
        if (!line) continue;
        try {
          processEvent(JSON.parse(line.slice(6)) as StreamEvent);
        } catch {
          // ignore
        }
      }
    }

    setIsGenerating(false);
    setProgress((v) => (v < 95 ? 95 : v));
  }

  function onSend(text: string) {
    push("user", text);

    if (stage === "questions") {
      const q = questions[questionIndex];
      const next = [...qa];
      next[questionIndex] = { q, a: text };
      setQa(next);

      const nextIndex = questionIndex + 1;
      if (nextIndex < questions.length) {
        setQuestionIndex(nextIndex);
        push("assistant", questions[nextIndex]);
        return;
      }

      void handleComposePrompt();
      return;
    }

    push("assistant", "Принято. Следующим шагом сделаю итеративные правки (пока прототип).");
  }

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 flex-1 flex-col bg-muted/40">
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[52px] shrink-0 flex-col items-center gap-2 border-r border-border bg-background py-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground"
              aria-label="Назад в Playground"
              onClick={() => router.push("/playground")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <MenuDrawer
              compact
              leftCollapsed={leftCollapsed}
              onToggleCollapse={() => {
                setLeftCollapsed((v) => {
                  const next = !v;
                  if (next) {
                    leftWidthBeforeCollapseRef.current = leftWidth;
                  } else {
                    setLeftWidth(leftWidthBeforeCollapseRef.current || 400);
                  }
                  return next;
                });
              }}
            />
          </aside>

          <div
            className="relative min-h-0 overflow-hidden border-r border-border bg-background transition-[width,opacity] duration-200 ease-out"
            style={{
              width: leftCollapsed ? 0 : leftWidth,
              minWidth: leftCollapsed ? 0 : 280,
              maxWidth: leftCollapsed ? 0 : 560,
              opacity: leftCollapsed ? 0 : 1,
              pointerEvents: leftCollapsed ? "none" : "auto"
            }}
          >
            <AgentChat
              variant="studio"
              title={header}
              subtitle={idea.trim() ? idea.trim().slice(0, 96) + (idea.trim().length > 96 ? "…" : "") : undefined}
              messages={messages}
              disabled={isGenerating}
              onSend={onSend}
              placeholder="Отправить сообщение Lemnity…"
              footerSlot={
                isGenerating ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    <span className="min-w-0 truncate">Сборка интерфейса · {Math.round(progress)}%</span>
                  </div>
                ) : null
              }
            />

            {!leftCollapsed ? (
              <div
                role="separator"
                aria-orientation="vertical"
                className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none"
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  dragStateRef.current = {
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startWidth: leftWidth
                  };
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!dragStateRef.current) return;
                  if (dragStateRef.current.pointerId !== e.pointerId) return;
                  const delta = e.clientX - dragStateRef.current.startX;
                  const next = Math.min(560, Math.max(280, dragStateRef.current.startWidth + delta));
                  setLeftWidth(next);
                }}
                onPointerUp={(e) => {
                  if (!dragStateRef.current) return;
                  if (dragStateRef.current.pointerId !== e.pointerId) return;
                  dragStateRef.current = null;
                  try {
                    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
              />
            ) : null}
          </div>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
            <BuildPreviewChrome
              tab={tab}
              onTabChange={setTab}
              onPublish={() => push("assistant", "Публикация будет подключена позже (заглушка).")}
              addressPath={addressPath}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 pt-1">
              {tab === "preview" ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                  <BuildStreamSteps steps={streamSteps} toolLine={streamToolLine} className="rounded-t-xl border-0" />
                  <RightPanel
                    mode={mode}
                    progress={progress}
                    previewUrl={previewUrl}
                    sandboxId={sandboxId}
                    streamHint={mode === "generating" ? streamHint : null}
                  />
                </div>
              ) : tab === "settings" ? (
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-background p-4">
                  <BuildSettings />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background p-4">
                  <BuildCode sandboxId={sandboxId} />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
