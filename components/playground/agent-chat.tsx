"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Film,
  Image as ImageIcon,
  Mic,
  MoreHorizontal,
  Paperclip,
  SendHorizontal,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  TriangleRight,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
};

type ChatModel = "Gemini 3 Pro" | "GPT-4.1" | "Claude Sonnet";

type AgentChatProps = {
  title: string;
  messages: ChatMessage[];
  headerSlot?: React.ReactNode;
  /** Доп. строка под заголовком (шаг пайплайна) */
  subtitle?: string;
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  /** Раскладка «студии»: шапка как в Manus, поле ввода в одной капсуле */
  variant?: "default" | "studio";
  /** Над полем ввода — прогресс / статус */
  footerSlot?: React.ReactNode;
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
  footerSlot
}: AgentChatProps) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const modelAnchorRef = useRef<HTMLButtonElement | null>(null);
  const fileInputImageRef = useRef<HTMLInputElement | null>(null);
  const fileInputVideoRef = useRef<HTMLInputElement | null>(null);
  const fileInputAnyRef = useRef<HTMLInputElement | null>(null);

  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; type: "image" | "video" | "file" }>>([]);
  const [isEditor, setIsEditor] = useState(false);
  const [model, setModel] = useState<ChatModel>("Gemini 3 Pro");
  const [modelOpen, setModelOpen] = useState(false);
  const [modelMenuPos, setModelMenuPos] = useState<{ left: number; top: number } | null>(null);

  const visible = useMemo(() => messages.filter((m) => m.role !== "system"), [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visible.length]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lemnity.chat.model") as ChatModel | null;
      if (stored) setModel(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("lemnity.chat.model", model);
    } catch {
      // ignore
    }
  }, [model]);

  useEffect(() => {
    if (!modelOpen) return;

    function reposition() {
      const el = modelAnchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // open upward: menu bottom aligns with anchor top - 8px gap
      setModelMenuPos({ left: Math.round(r.left), top: Math.round(r.top - 8) });
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
    const meta =
      attachments.length || model || isEditor
        ? `\n\n---\nmodel: ${model}\neditor: ${isEditor ? "on" : "off"}\nattachments: ${
            attachments.length ? attachments.map((a) => `${a.type}:${a.name}`).join(", ") : "none"
          }`
        : "";
    setAttachments([]);
    setModelOpen(false);
    onSend(`${text}${meta}`);
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
          className="fixed z-[9999] w-56 -translate-y-full rounded-2xl border bg-popover text-popover-foreground p-1 shadow-xl"
          style={{ left: modelMenuPos.left, top: modelMenuPos.top }}
        >
          {(["Gemini 3 Pro", "GPT-4.1", "Claude Sonnet"] as ChatModel[]).map((m) => (
            <button
              key={m}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                m === model && "bg-accent text-accent-foreground"
              )}
              onClick={() => {
                setModel(m);
                setModelOpen(false);
              }}
            >
              <span className="truncate">{m}</span>
              {m === model ? <span className="text-xs text-muted-foreground">выбрано</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className={cn("border-b", isStudio ? "bg-background px-3 py-2.5" : "p-3")}>
        {headerSlot ? <div className={cn(isStudio ? "mb-2" : "mb-3")}>{headerSlot}</div> : null}
        {isStudio ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                ref={modelAnchorRef}
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                aria-label="Версия агента"
                onClick={() => setModelOpen((v) => !v)}
              >
                <span>Lemnity</span>
                <span className="text-muted-foreground">Lite</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <h2 className="truncate text-xs font-medium text-muted-foreground">{subtitle ?? title}</h2>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Начало беседы</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">{title}</h2>
          </>
        )}
      </div>

      <div ref={scrollRef} className={cn("flex-1 space-y-2 overflow-auto", isStudio ? "bg-muted/20 p-3" : "p-3")}>
        <AnimatePresence mode="popLayout">
          {visible.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <div
                className={cn(
                  "max-w-[92%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                  m.role === "assistant" && "mr-auto border-border/80 bg-background text-foreground",
                  m.role === "user" && "ml-auto bg-primary text-primary-foreground"
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
      </div>

      <div className={cn("border-t", isStudio ? "border-border bg-background p-3" : "p-2")}>
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
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 p-1.5 pl-2">
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-xl text-muted-foreground"
                  aria-label="Вложения"
                  onClick={() => fileInputAnyRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground" disabled aria-label="Голос">
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) submit();
                }}
                placeholder={placeholder}
                className="h-10 min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                disabled={disabled}
              />
              <Button
                type="button"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={() => {
                  if (disabled) return;
                  submit();
                }}
                disabled={!disabled && !value.trim()}
                aria-label={disabled ? "Остановить (скоро)" : "Отправить"}
              >
                {disabled ? <Square className="h-4 w-4 fill-current" /> : <SendHorizontal className="h-5 w-5" />}
              </Button>
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
                <div className="h-6 w-px bg-border" />
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-2 py-1 text-sm font-medium hover:bg-accent",
                    isEditor ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label="Редактор"
                  onClick={() => setIsEditor((v) => !v)}
                >
                  <TriangleRight className="h-4 w-4" />
                  Редактор
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

