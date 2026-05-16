"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { useI18n } from "@/components/i18n-provider";

interface Props { projectId: string }

export function AnalyticsChatPanel({ projectId }: Props) {
  const { t, lang } = useI18n();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chatMessages,
    isChatStreaming,
    addChatMessage,
    updateLastAssistantMessage,
    setIsChatStreaming,
  } = useAnalyticsStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || isChatStreaming) return;
    setInput("");

    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: message };
    addChatMessage(userMsg);
    const assistantId = crypto.randomUUID();
    const historySnapshot = [...chatMessages];
    setIsChatStreaming(true);

    try {
      const res = await fetch(`/api/analytics/${projectId}/chat?lang=${encodeURIComponent(lang)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historySnapshot,
        }),
      });

      if (!res.body) {
        setIsChatStreaming(false);
        return;
      }
      addChatMessage({ id: assistantId, role: "assistant" as const, content: "" });
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
        } catch { /* ignore malformed SSE frame */ }
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
    <div className="flex flex-col h-full border-r bg-card">
      <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {t("analytics_bi_chat_header")}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">
            {t("analytics_bi_chat_empty")}
          </p>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
            <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-muted mt-0.5">
              {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
            </div>
            <div
              className={cn(
                "text-xs rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap leading-relaxed",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {msg.content || (isChatStreaming ? "▋" : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("analytics_bi_chat_placeholder")}
          className="text-xs resize-none min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
          }}
        />
        <Button size="icon" onClick={() => void sendMessage()} disabled={isChatStreaming || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
