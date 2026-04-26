"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Copy,
  Film,
  Image as ImageIcon,
  Lock,
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

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
import type { UiLanguage } from "@/lib/i18n";

function formatActionDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)} мс`;
  const sec = ms / 1000;
  const label = sec >= 10 ? `${Math.round(sec)}` : `${Math.round(sec * 10) / 10}`.replace(/\.0$/, "");
  return `${label} с`;
}

function formatTokenTotal(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("ru-RU");
}

function formatMessageClock(sentAt: number, lang: UiLanguage): string {
  const d = new Date(sentAt);
  const locale = lang === "en" ? "en-GB" : "ru";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  /** Лайк / меню — только у финального промпта, не под каждым ответом */
  showActions?: boolean;
  /** Полный текст промпта для копирования (если в `content` обрезка) */
  promptPlainText?: string;
  /** Для меню «⋯»: время запроса и токены с бэкенда */
  actionMeta?: {
    durationMs: number;
    totalTokens?: number;
  };
  /** Время отправки (ms), для подписи в стиле мессенджера */
  sentAt?: number;
};

type AgentChatProps = {
  title: string;
  messages: ChatMessage[];
  headerSlot?: React.ReactNode;
  /** Доп. строка под заголовком (шаг пайплайна) */
  subtitle?: string;
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string, files?: File[]) => void | Promise<void>;
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
  placeholder: placeholderProp,
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
  const { t, lang } = useI18n();
  const inputPlaceholder = placeholderProp ?? t("playground_chat_input_placeholder");
  const [value, setValue] = useState("");
  const [promptFeedback, setPromptFeedback] = useState<Record<string, "up" | "down">>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const modelAnchorRef = useRef<HTMLButtonElement | null>(null);
  const fileInputImageRef = useRef<HTMLInputElement | null>(null);
  const fileInputVideoRef = useRef<HTMLInputElement | null>(null);
  const fileInputAnyRef = useRef<HTMLInputElement | null>(null);

  const [attachments, setAttachments] = useState<
    Array<{ id: string; file: File; kind: "image" | "video" | "file" }>
  >([]);
  const isEditor = onIsEditorChange != null ? Boolean(isEditorProp) : false;
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
  const availableModelOptions = useMemo(
    () => modelOptions.filter((m) => m.available),
    [modelOptions]
  );
  const lockedModelOptions = useMemo(
    () => modelOptions.filter((m) => !m.available),
    [modelOptions]
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
      const isStoredAvailable = Boolean(
        stored && modelOptions.some((x) => x.label === stored && x.available)
      );
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
      const menuW = 240; // w-60
      const margin = 8;
      const estimatedH = 220;
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

  async function submit() {
    const text = value.trim();
    const files = attachments.map((a) => a.file);
    if ((!text && files.length === 0) || disabled) return;
    setValue("");
    setAttachments([]);
    setModelOpen(false);
    await Promise.resolve(onSend(text, files.length ? files : undefined));
  }

  function addFiles(files: FileList | null, kind: "image" | "video" | "file") {
    if (!files?.length) return;
    const next = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file: f,
      kind
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
          className="fixed z-[9999] max-h-[min(70vh,420px)] w-60 overflow-y-auto rounded-2xl border bg-popover text-popover-foreground p-1 shadow-xl"
          style={{
            left: modelMenuPos.left,
            top: modelMenuPos.top,
            transform: modelMenuPos.place === "above" ? "translateY(-100%)" : undefined
          }}
        >
          {availableModelOptions.length > 0 ? (
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("playground_agents_section_tariff")}
            </div>
          ) : null}
          {availableModelOptions.map((m) => (
            <button
              key={m.label}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                m.label === model && "bg-accent text-accent-foreground"
              )}
              onClick={() => {
                setModel(m.label);
                setModelOpen(false);
              }}
            >
              <span className="truncate">{m.label}</span>
              {m.label === model ? (
                <span className="text-xs text-muted-foreground">выбрано</span>
              ) : m.recommended ? (
                <span className="text-[10px] uppercase tracking-wide text-emerald-500">рекомендуем</span>
              ) : null}
            </button>
          ))}
          {lockedModelOptions.length > 0 ? (
            <>
              <div className="mx-1 my-1 h-px bg-border" />
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("playground_agents_section_pro")}
              </div>
              {lockedModelOptions.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground",
                    "cursor-not-allowed opacity-60 hover:bg-transparent"
                  )}
                  disabled
                >
                  <span className="truncate">{m.label}</span>
                  <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-purple-400">
                    Pro
                  </span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "border-b",
          isStudio ? "border-border/40 bg-background/80 px-3 py-2.5 backdrop-blur-sm" : "p-3"
        )}
      >
        {headerSlot ? <div className={cn(isStudio ? "mb-2" : "mb-3")}>{headerSlot}</div> : null}
        {isStudio ? (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wide text-violet-600/90 dark:text-violet-300/90">
              {t("playground_chat_brand")}
            </p>
            <h2 className="mt-0.5 truncate text-xs font-semibold text-foreground">{title}</h2>
            {subtitle?.trim() ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{subtitle}</p>
            ) : null}
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
          isStudio
            ? "scroll-smooth bg-gradient-to-b from-zinc-100 via-zinc-100 to-zinc-200/70 p-3 pt-2 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 [scrollbar-gutter:stable]"
            : "space-y-2 p-3"
        )}
      >
        {threadPromptSlot ? <div className="shrink-0">{threadPromptSlot}</div> : null}

        <AnimatePresence mode="popLayout">
          {visible.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              {isStudio && m.role === "assistant" ? (
                <div className="w-full min-w-0 pr-1">
                  <div className="min-w-0 max-w-[min(88%,32rem)]">
                    <p className="mb-0.5 pl-0.5 text-[11px] font-medium text-stone-600/90 dark:text-zinc-400">
                      {t("playground_chat_brand")}
                    </p>
                    <div
                      className={cn(
                        "whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-white/50 bg-white/95 px-3.5 py-2.5 text-sm leading-relaxed text-foreground [word-break:break-word] shadow-sm ring-1 ring-stone-900/[0.04] dark:border-zinc-700/80 dark:bg-zinc-800/95 dark:text-zinc-100 dark:ring-white/[0.04]"
                      )}
                    >
                      {m.content}
                    </div>
                    {m.sentAt != null ? (
                      <p className="mt-0.5 pl-1 text-[10px] tabular-nums text-stone-500/80 dark:text-zinc-500">
                        {formatMessageClock(m.sentAt, lang)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : isStudio && m.role === "user" ? (
                <div className="flex w-full min-w-0 flex-row items-end justify-end">
                  <div className="min-w-0 max-w-[min(88%,28rem)]">
                    <p className="mb-0.5 pr-0.5 text-right text-[11px] font-medium text-stone-600/90 dark:text-zinc-400">
                      {t("playground_chat_you")}
                    </p>
                    <div
                      className={cn(
                        "ml-auto whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-sky-700/20 bg-gradient-to-b from-[#0f8fff] to-[#0070ea] px-3.5 py-2.5 text-sm font-medium leading-relaxed text-white [word-break:break-word] shadow-md dark:border-sky-400/20 dark:from-sky-600 dark:to-blue-800"
                      )}
                    >
                      {m.content}
                    </div>
                    {m.sentAt != null ? (
                      <p className="mt-0.5 pr-1 text-right text-[10px] tabular-nums text-stone-500/80 dark:text-zinc-500">
                        {formatMessageClock(m.sentAt, lang)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[min(92%,32rem)] whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed [word-break:break-word]",
                    m.role === "assistant" &&
                      "mr-auto rounded-[1.25rem] border border-border/60 bg-background/95 text-foreground shadow-sm backdrop-blur-sm dark:border-border/50 dark:bg-zinc-900/90",
                    m.role === "user" &&
                      "ml-auto rounded-[1.25rem] border border-transparent bg-primary font-medium text-primary-foreground shadow-sm"
                  )}
                >
                  {m.content}
                </div>
              )}
              {m.role === "assistant" && m.showActions ? (
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1 text-muted-foreground",
                    isStudio && "pl-0.5"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "rounded-lg p-1.5 hover:bg-accent",
                      promptFeedback[m.id] === "up" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    )}
                    aria-label={t("playground_prompt_feedback_like")}
                    aria-pressed={promptFeedback[m.id] === "up"}
                    title={t("playground_prompt_feedback_like")}
                    onClick={() =>
                      setPromptFeedback((prev) => {
                        if (prev[m.id] === "up") {
                          const next = { ...prev };
                          delete next[m.id];
                          return next;
                        }
                        return { ...prev, [m.id]: "up" };
                      })
                    }
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-lg p-1.5 hover:bg-accent",
                      promptFeedback[m.id] === "down" && "bg-destructive/15 text-destructive"
                    )}
                    aria-label={t("playground_prompt_feedback_dislike")}
                    aria-pressed={promptFeedback[m.id] === "down"}
                    title={t("playground_prompt_feedback_dislike")}
                    onClick={() =>
                      setPromptFeedback((prev) => {
                        if (prev[m.id] === "down") {
                          const next = { ...prev };
                          delete next[m.id];
                          return next;
                        }
                        return { ...prev, [m.id]: "down" };
                      })
                    }
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 hover:bg-accent"
                        aria-label={t("playground_prompt_stats_title")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        {t("playground_prompt_stats_title")}
                      </DropdownMenuLabel>
                      <div className="space-y-1.5 px-2 py-1.5 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("playground_prompt_stats_duration")}</span>
                          <span className="tabular-nums text-foreground">
                            {m.actionMeta?.durationMs != null
                              ? formatActionDurationMs(m.actionMeta.durationMs) || t("playground_prompt_stats_na")
                              : t("playground_prompt_stats_na")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("playground_prompt_stats_tokens")}</span>
                          <span className="tabular-nums text-foreground">
                            {formatTokenTotal(m.actionMeta?.totalTokens) || t("playground_prompt_stats_na")}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2"
                        onSelect={() => {
                          const text = (m.promptPlainText ?? m.content).trim();
                          if (!text) return;
                          try {
                            void navigator.clipboard.writeText(text);
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        {t("playground_prompt_copy_full")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>

        {threadStatusSlot ? (
          <div
            className={cn(
              "shrink-0",
              isStudio
                ? "mx-0 max-w-[min(100%,36rem)] shrink-0 bg-transparent p-0 text-foreground"
                : "rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80"
            )}
          >
            {threadStatusSlot}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "border-t",
          isStudio ? "border-border/30 bg-gradient-to-b from-stone-200/30 to-stone-100/40 p-0 dark:from-zinc-900/80 dark:to-zinc-950" : "p-2"
        )}
      >
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
            <div className="@container flex min-h-0 flex-col overflow-hidden rounded-none border-0 bg-white/90 shadow-[0_2px_20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-sm dark:bg-zinc-900/90 dark:shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
              <div className="px-3.5 pb-2.5 pt-3">
              {isEditor ? (
                <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder={inputPlaceholder}
                  className="min-h-[96px] w-full resize-none rounded-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none placeholder:text-muted-foreground/90 focus-visible:ring-0"
                  disabled={disabled}
                />
              ) : (
                <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder={inputPlaceholder}
                  rows={2}
                  className="min-h-[72px] w-full resize-none rounded-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none placeholder:text-muted-foreground/90 focus-visible:ring-0"
                  disabled={disabled}
                />
              )}

              {attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex max-w-full items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground"
                      aria-label={`Файл прикреплён: ${a.file.name}`}
                    >
                      <Lock
                        className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-500"
                        aria-hidden
                      />
                      <span className="min-w-0 truncate" title={`${a.kind}: ${a.file.name}`}>
                        {a.kind}: {a.file.name}
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
              </div>

              <div className="flex min-h-10 items-center gap-0.5 border-t border-stone-200/70 px-2 pb-2 pt-1.5 dark:border-zinc-700/80">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-stone-100/90 hover:text-foreground dark:hover:bg-zinc-800/80"
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
                  className="h-10 w-10 shrink-0 rounded-full bg-sky-600 text-white shadow-md hover:bg-sky-600/90 dark:bg-sky-600"
                  onClick={() => {
                    if (disabled) return;
                    void submit();
                  }}
                  disabled={!disabled && !value.trim() && attachments.length === 0}
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
                    placeholder={inputPlaceholder}
                    className="min-h-[96px] px-3 py-2 shadow-none"
                    disabled={disabled}
                  />
                ) : (
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (!value.trim() && attachments.length === 0) return;
                        e.preventDefault();
                        void submit();
                      }
                    }}
                    placeholder={inputPlaceholder}
                    className="h-10 rounded-2xl px-3 shadow-none"
                    disabled={disabled}
                  />
                )}
              </div>

              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-2xl"
                onClick={() => void submit()}
                disabled={disabled || (!value.trim() && attachments.length === 0)}
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
                  aria-label={`Файл прикреплён: ${a.file.name}`}
                >
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-500"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate" title={`${a.kind}: ${a.file.name}`}>
                    {a.kind}: {a.file.name}
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

