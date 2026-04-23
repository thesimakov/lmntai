"use client";

import { Sparkles, Wand2 } from "lucide-react";
import { useMemo } from "react";

import { LogViewer } from "@/components/playground/log-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PromptQA } from "@/types/prompt-builder";

const chips = ["Интернет-магазин", "Портфолио", "Блог", "Корпоративный сайт"];

type LeftPanelProps = {
  idea: string;
  onIdeaChange: (value: string) => void;
  stage: "idea" | "questions" | "ready" | "generating";
  questions: string[];
  qa: PromptQA[];
  onQaChange: (next: PromptQA[]) => void;
  finalPrompt: string;
  onCreateQuestions: () => void;
  onComposePrompt: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  logs: string[];
  onClearLogs: () => void;
};

export function LeftPanel({
  idea,
  onIdeaChange,
  stage,
  questions,
  qa,
  onQaChange,
  finalPrompt,
  onCreateQuestions,
  onComposePrompt,
  onGenerate,
  isGenerating,
  logs,
  onClearLogs
}: LeftPanelProps) {
  const canCreate = stage === "idea" && idea.trim().length > 0 && !isGenerating;
  const canCompose = stage === "questions" && qa.every((x) => x.a.trim().length > 0) && !isGenerating;
  const canGenerate = stage === "ready" && finalPrompt.trim().length > 0 && !isGenerating;

  const ideaHint = useMemo(
    () =>
      stage === "ready"
        ? "Промпт собран — можно запускать генерацию."
        : "Сначала опиши идею, затем соберём точный промпт через вопросы.",
    [stage]
  );

  return (
    <section className="space-y-4 rounded-3xl border border-black/10 bg-white/70 p-4">
      <h1 className="text-3xl font-semibold">Что создаём сегодня?</h1>
      <p className="text-sm text-zinc-600">
        {ideaHint}
      </p>

      <Textarea
        value={idea}
        onChange={(event) => onIdeaChange(event.target.value)}
        className="min-h-[180px]"
        placeholder="Опишите сайт, который хотите получить... (например, лендинг для кофейни в стиле минимализм)"
      />

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Button key={chip} variant="outline" size="sm" onClick={() => onIdeaChange(chip)}>
            {chip}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Button variant="outline" onClick={onCreateQuestions} disabled={!canCreate}>
          <Wand2 className="h-4 w-4" />
          Создать промпт
        </Button>
        <Button className="animate-pulse hover:animate-none" onClick={onGenerate} disabled={!canGenerate}>
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Генерирую..." : "Запустить генерацию"}
        </Button>
      </div>

      {stage === "questions" ? (
        <div className="space-y-3 rounded-3xl border border-black/10 bg-white/60 p-4">
          <h3 className="text-base font-semibold">Уточняющие вопросы</h3>
          <p className="text-xs text-zinc-600">
            Ответь максимально конкретно — мы соберём финальный промпт и только потом запустим генерацию.
          </p>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={`${q}-${idx}`} className="space-y-2">
                <p className="text-sm text-zinc-900">{q}</p>
                <Input
                  value={qa[idx]?.a ?? ""}
                  onChange={(e) => {
                    const next = [...qa];
                    next[idx] = { q, a: e.target.value };
                    onQaChange(next);
                  }}
                  placeholder="Ваш ответ..."
                />
              </div>
            ))}
          </div>

          <Button onClick={onComposePrompt} disabled={!canCompose}>
            Собрать промпт
          </Button>
        </div>
      ) : null}

      {stage === "ready" ? (
        <div className="space-y-2 rounded-3xl border border-black/10 bg-white/60 p-4">
          <h3 className="text-base font-semibold">Финальный промпт</h3>
          <Textarea value={finalPrompt} readOnly className="min-h-[140px]" />
          <p className="text-xs text-zinc-600">Дальше генерация пойдёт уже по этому промпту.</p>
        </div>
      ) : null}

      {logs.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Лог AI-агента</h3>
            <Button size="sm" variant="ghost" onClick={onClearLogs}>
              Скрыть логи
            </Button>
          </div>
          <LogViewer logs={logs} />
        </div>
      ) : null}
    </section>
  );
}
