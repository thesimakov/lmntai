"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Copy,
  Film,
  Image as ImageIcon,
  MoreHorizontal,
  Paperclip,
  SendHorizontal,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import {
  getAgentOptionsForUi,
  parseAgentUiLabel,
  type AgentTask,
  type AgentUiLabel
} from "@/lib/agent-models";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
};

type AgentChatProps = {
  title: string;
  messages: ChatMessage[];
  headerSlot?: React.ReactNode;
  /** Доп. строка под заголовком (шаг пайплайна) */
  subtitle?: string;
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  /** Раскладка «студии»: шапка и поле ввода в одной капсуле */
  variant?: "default" | "studio";
  /** Над полем ввода — прогресс / статус */
  footerSlot?: React.ReactNode;
  /** Внутри прокрутки чата — над сообщениями (например карточка промпта) */
  threadPromptSlot?: React.ReactNode;
  /** Внутри прокрутки чата — под сообщениями (например шаги сборки) */
  threadStatusSlot?: React.ReactNode;
  /** Меняется при обновлении треда — докрутка вниз (длина не хватает для слотов) */
  threadScrollKey?: string | number;
  /** Многострочный режим ввода; при передаче `onIsEditorChange` состояние контролируется снаружи */
  isEditor?: boolean;
  onIsEditorChange?: (value: boolean) => void;
  /** Текущий план пользователя для ограничений trial/pro */
  plan?: string | null;
  /** Тип проекта для подбора рекомендованного агента */
  projectKind?: ProjectKind | null;
  /** Режим резолва в матрице агентов */
  agentTask?: AgentTask;
  /** Отдать выбранный агент как hint в родительский компонент */
  onModelHintChange?: (value: AgentUiLabel) => void;
};

export function AgentChat({
  title,
  messages,
  headerSlot,
  subtitle,
  placeholder = "Спросить Lemnity…",
  disabled,
  onSend,
  variant = "default",
  footerSlot,
  threadPromptSlot,
  threadStatusSlot,
  threadScrollKey,
  isEditor: isEditorProp,
  onIsEditorChange,
  plan = null,
  projectKind = null,
  agentTask = "generate-stream",
  onModelHintChange
}: AgentChatProps) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const modelAnchorRef = useRef<HTMLButtonElement | null>(null);
  const fileInputImageRef = useRef<HTMLInputElement | null>(null);
  const fileInputVideoRef = useRef<HTMLInputElement | null>(null);
  const fileInputAnyRef = useRef<HTMLInputElement | null>(null);

  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; type: "image" | "video" | "file" }>>([]);
  const [internalEditor, setInternalEditor] = useState(false);
  const editorControlled = onIsEditorChange != null;
  const isEditor = editorControlled ? Boolean(isEditorProp) : internalEditor;
  const setEditor = (next: boolean) => {
    if (editorControlled) onIsEditorChange(next);
    else setInternalEditor(next);
  };
  const [model, setModel] = useState<AgentUiLabel>("GPT-4.1");
  const [modelOpen, setModelOpen] = useState(false);
  const [modelMenuPos, setModelMenuPos] = useState<{
    left: number;
    top: number;
    place: "above" | "below";
  } | null>(null);
  const modelStarGradientId = `agentchat-model-star-${useId().replace(/:/g, "")}`;
  const modelOptions = useMemo(
    () => getAgentOptionsForUi({ plan, projectKind, task: agentTask }),
    [plan, projectKind, agentTask]
  );
  const recommendedModel = useMemo<AgentUiLabel>(() => {
    return modelOptions.find((x) => x.recommended && x.available)?.label ?? "GPT-4.1";
  }, [modelOptions]);

  const visible = useMemo(() => messages.filter((m) => m.role !== "system"), [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visible.length, threadScrollKey]);

  useEffect(() => {
    try {
      const stored = parseAgentUiLabel(localStorage.getItem("lemnity.chat.model"));
      const isStoredAvailable = Boolean(stored && modelOptions.some((x) => x.label === stored && x.available));
      setModel(isStoredAvailable && stored ? stored : recommendedModel);
    } catch {
      setModel(recommendedModel);
    }
  }, [modelOptions, recommendedModel]);

  useEffect(() => {
    if (!modelOptions.some((x) => x.label === model && x.available)) {
      setModel(recommendedModel);
    }
  }, [model, modelOptions, recommendedModel]);

  useEffect(() => {
    try {
      localStorage.setItem("lemnity.chat.model", model);
    } catch {
      // ignore
    }
  }, [model]);

  useEffect(() => {
    onModelHintChange?.(model);
  }, [model, onModelHintChange]);

  useEffect(() => {
    if (!modelOpen) return;

    function reposition() {
      const el = modelAnchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 8;
      const menuW = 224; // w-56
      const margin = 8;
      const estimatedH = 120;
      const left = Math.round(
        Math.min(Math.max(r.left, margin), window.innerWidth - menuW - margin)
      );
      const spaceAbove = r.top;
      const spaceBelow = window.innerHeight - r.bottom;
      const preferAbove = spaceAbove >= estimatedH + gap || spaceAbove > spaceBelow;

      if (preferAbove) {
        setModelMenuPos({ left, top: Math.round(r.top - gap), place: "above" });
      } else {
        setModelMenuPos({ left, top: Math.round(r.bottom + gap), place: "below" });
      }
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [modelOpen]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    setAttachments([]);
    setModelOpen(false);
    onSend(text);
  }

  function addFiles(files: FileList | null, kind: "image" | "video" | "file") {
    if (!files?.length) return;
    const next = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: f.name,
      type: kind
    }));
    setAttachments((prev) => [...prev, ...next].slice(0, 10));
  }

  const isStudio = variant === "studio";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        isStudio ? "rounded-none border-0 bg-transparent shadow-none" : "rounded-3xl border bg-card/70 shadow-sm"
      )}
    >
      {modelOpen && modelMenuPos ? (
        <div
          className="fixed z-[9999] w-56 rounded-2xl border bg-popover text-popover-foreground p-1 shadow-xl"
          style={{
            left: modelMenuPos.left,
            top: modelMenuPos.top,
            transform: modelMenuPos.place === "above" ? "translateY(-100%)" : undefined
          }}
        >
          {modelOptions.map((m) => (
            <button
              key={m.label}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                m.label === model && "bg-accent text-accent-foreground",
                !m.available && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground"
              )}
              disabled={!m.available}
              onClick={() => {
                if (!m.available) return;
                setModel(m.label);
                setModelOpen(false);
              }}
            >
              <span className="truncate">{m.label}</span>
              {m.label === model ? (
                <span className="text-xs text-muted-foreground">выбрано</span>
              ) : !m.available || m.proOnly ? (
                <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-purple-400">
                  Pro
                </span>
              ) : m.recommended ? (
                <span className="text-[10px] uppercase tracking-wide text-emerald-500">рекомендуем</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className={cn("border-b", isStudio ? "bg-background px-3 py-2.5" : "p-3")}>
        {headerSlot ? <div className={cn(isStudio ? "mb-2" : "mb-3")}>{headerSlot}</div> : null}
        {isStudio ? (
          <div className="flex flex-col gap-1">
            <h2 className="truncate text-xs font-semibold text-foreground">{title}</h2>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Начало беседы</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">{title}</h2>
          </>
        )}
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-auto",
          isStudio ? "bg-gradient-to-b from-zinc-100/40 to-zinc-50/30 p-3 dark:from-zinc-950/40 dark:to-zinc-900/30" : "space-y-2 p-3"
        )}
      >
        {threadPromptSlot ? <div className="shrink-0">{threadPromptSlot}</div> : null}

        <AnimatePresence mode="popLayout">
          {visible.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <div
                className={cn(
                  "max-w-[min(92%,32rem)] whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed [word-break:break-word]",
                  m.role === "assistant" &&
                    cn(
                      "mr-auto rounded-[1.25rem] border border-border/60 bg-background/95 text-foreground shadow-sm backdrop-blur-sm dark:border-border/50 dark:bg-zinc-900/90",
                      isStudio && "rounded-2xl border-zinc-200/80 bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/85"
                    ),
                  m.role === "user" &&
                    cn(
                      "ml-auto rounded-[1.25rem] border border-transparent font-medium text-zinc-50 shadow-sm dark:text-zinc-900",
                      isStudio
                        ? "bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-100 dark:to-zinc-200"
                        : "bg-primary text-primary-foreground"
                    )
                )}
              >
                {m.content}
              </div>
              {m.role === "assistant" ? (
                <div className="mr-auto mt-2 flex items-center gap-2 text-muted-foreground">
                  <button type="button" className="rounded-lg p-1 hover:bg-accent" aria-label="Лайк">
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded-lg p-1 hover:bg-accent" aria-label="Дизлайк">
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1 hover:bg-accent"
                    aria-label="Копировать"
                    onClick={() => {
                      try {
                        void navigator.clipboard.writeText(m.content);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded-lg p-1 hover:bg-accent" aria-label="Ещё">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>

        {threadStatusSlot ? (
          <div
            className={cn(
              "shrink-0 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80",
              isStudio && "border-zinc-200/80"
            )}
          >
            {threadStatusSlot}
          </div>
        ) : null}
      </div>

      <div className={cn("border-t", isStudio ? "border-0 bg-background p-0" : "p-2")}>
        {footerSlot ? <div className="mb-2">{footerSlot}</div> : null}
        <div className={cn(!isStudio && "p-1")}>
          <input
            ref={fileInputImageRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.currentTarget.files, "image");
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={fileInputVideoRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.currentTarget.files, "video");
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={fileInputAnyRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.currentTarget.files, "file");
              e.currentTarget.value = "";
            }}
          />

          {isStudio ? (
            <div className="@container flex h-full min-h-full flex-col bg-zinc-100 px-4 pb-3 pt-3.5 dark:bg-zinc-900/45">
              {isEditor ? (
                <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={placeholder}
                  className="min-h-[96px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                  disabled={disabled}
                />
              ) : (
                <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={placeholder}
                  rows={2}
                  className="min-h-[72px] w-full resize-none rounded-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                  disabled={disabled}
                />
              )}

              {attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex max-w-full items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      <span className="truncate">
                        {a.type}: {a.name}
                      </span>
                      <button
                        type="button"
                        className="rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        aria-label="Убрать вложение"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex min-h-10 items-center gap-0.5 border-t border-border/60">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="Добавить изображение"
                  onClick={() => fileInputImageRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5 stroke-[1.5]" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="Добавить видео"
                  onClick={() => fileInputVideoRef.current?.click()}
                >
                  <Film className="h-5 w-5 stroke-[1.5]" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="Прикрепить файл"
                  onClick={() => fileInputAnyRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5 stroke-[1.5]" />
                </Button>

                <div className="mx-1.5 h-5 w-px shrink-0 bg-border" aria-hidden />

                <button
                  ref={modelAnchorRef}
                  type="button"
                  className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl px-1.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 @min-[360px]:px-2 @min-[360px]:max-w-[min(200px,46%)]"
                  aria-label={`Выбор модели, сейчас: ${model}`}
                  onClick={() => setModelOpen((v) => !v)}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient
                          id={modelStarGradientId}
                          x1="4"
                          y1="3"
                          x2="20"
                          y2="21"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#a855f7" />
                          <stop offset="0.45" stopColor="#3b82f6" />
                          <stop offset="1" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M12 2.25 13.55 9.45 20.75 12 13.55 14.55 12 21.75 10.45 14.55 3.25 12 10.45 9.45 12 2.25Z"
                        fill={`url(#${modelStarGradientId})`}
                        stroke={`url(#${modelStarGradientId})`}
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="hidden min-w-0 max-w-[min(11rem,46%)] truncate @min-[360px]:inline">
                    {model}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>

                <span className="min-w-2 flex-1" />

                <Button
                  type="button"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
                  onClick={() => {
                    if (disabled) return;
                    submit();
                  }}
                  disabled={!disabled && !value.trim()}
                  aria-label={disabled ? "Остановить (скоро)" : "Отправить"}
                >
                  {disabled ? <Square className="h-4 w-4 fill-current" /> : <ArrowUp className="h-5 w-5 stroke-[2.5]" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                {isEditor ? (
                  <Textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="min-h-[96px] px-3 py-2 shadow-none"
                    disabled={disabled}
                  />
                ) : (
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                    }}
                    placeholder={placeholder}
                    className="h-10 rounded-2xl px-3 shadow-none"
                    disabled={disabled}
                  />
                )}
              </div>

              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-2xl"
                onClick={submit}
                disabled={disabled || !value.trim()}
                aria-label="Начать"
              >
                <SendHorizontal className="h-5 w-5" />
              </Button>
            </div>
          )}

          {attachments.length > 0 && !isStudio ? (
            <div className="mt-2 flex flex-wrap gap-2 px-1">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex max-w-full items-center gap-2 rounded-2xl border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <span className="truncate">
                    {a.type}: {a.name}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    aria-label="Убрать вложение"
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {!isStudio ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-2xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Добавить изображение"
                  onClick={() => fileInputImageRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-2xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Добавить видео"
                  onClick={() => fileInputVideoRef.current?.click()}
                >
                  <Film className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-2xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Прикрепить файл"
                  onClick={() => fileInputAnyRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <div className="h-6 w-px bg-border" />
                <div className="relative">
                  <button
                    ref={modelAnchorRef}
                    type="button"
                    className="flex min-w-0 items-center gap-2 rounded-2xl px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
                    aria-label="Выбор модели"
                    onClick={() => setModelOpen((v) => !v)}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="truncate">{model}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

