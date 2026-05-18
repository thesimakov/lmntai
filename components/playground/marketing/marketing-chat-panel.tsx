"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMarketingStore } from "@/lib/stores/use-marketing-store";
import { useI18n } from "@/components/i18n-provider";

interface Props {
  projectId: string;
}

export function MarketingChatPanel({ projectId }: Props) {
  const { t, lang } = useI18n();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chatMessages,
    isChatStreaming,
    addChatMessage,
    updateLastAssistantMessage,
    setIsChatStreaming,
  } = useMarketingStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || isChatStreaming) return;
    setInput("");
    const historySnapshot = [...chatMessages];
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: message };
    addChatMessage(userMsg);
    setIsChatStreaming(true);
    try {
      const res = await fetch(`/api/marketing/${projectId}/chat?lang=${encodeURIComponent(lang)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: historySnapshot }),
      });
      if (!res.body) {
        setIsChatStreaming(false);
        return;
      }
      addChatMessage({ id: crypto.randomUUID(), role: "assistant" as const, content: "" });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";

      function processSseLine(line: string) {
        if (!line.startsWith("data: ")) return;
        try {
          const payload = JSON.parse(line.slice(6)) as { type: string; text?: string };
          if (payload.type === "delta" && payload.text) {
            accumulated += payload.text;
            updateLastAssistantMessage(accumulated);
          }
        } catch {
          /* ignore malformed SSE frame */
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buf) processSseLine(buf);
          break;
        }
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) processSseLine(line);
      }
    } finally {
      setIsChatStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 text-[15px] font-semibold tracking-wide text-muted-foreground">
        {t("marketing_bi_chat_header")}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {chatMessages.length === 0 && (
          <p className="pt-6 text-center text-[15px] text-muted-foreground">
            {t("marketing_bi_chat_empty")}
          </p>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
              {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
            </div>
            {msg.role === "user" ? (
              <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-[15px] leading-relaxed text-primary-foreground">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-[15px] leading-snug text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-50">
                {msg.content.trim()
                  ? t("marketing_bi_chat_sidebar_assistant_hint")
                  : isChatStreaming
                    ? t("marketing_bi_chat_sidebar_streaming")
                    : ""}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 border-t p-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("marketing_bi_chat_placeholder")}
          className="min-h-[60px] resize-none text-[15px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <Button
          size="icon"
          onClick={() => void sendMessage()}
          disabled={isChatStreaming || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
