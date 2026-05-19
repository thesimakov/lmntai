"use client";

import { useState, useRef } from "react";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { Send, Loader2 } from "lucide-react";

interface AiInlineBarProps {
  projectId: string
}

export function AiInlineBar({ projectId }: AiInlineBarProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const setGraph = useSlideStore((s) => s.setGraph);
  const graph = useSlideStore((s) => s.graph);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const selectedElemId = useEditorStore((s) => s.selectedElemId);

  const currentSlideId = graph.slides[activeSlideIndex]?.id;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        message: text,
        slideId: currentSlideId,
      };
      if (selectedElemId) body.elemId = selectedElemId;

      const res = await fetch(`/api/projects/${projectId}/slides/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { data?: { graph?: unknown } };
      if (data.data?.graph) {
        setGraph(data.data.graph as Parameters<typeof setGraph>[0]);
      }
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-border bg-card flex items-center gap-3 px-4 py-2.5">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-[9px] font-black text-white shrink-0">
        AI
      </div>
      <input
        id="ai-inline-bar-input"
        ref={inputRef}
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        placeholder="Редактировать слайд с AI... (или нажми / на элемент)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
        disabled={loading}
      />
      {error && <span className="text-[11px] text-destructive shrink-0">{error}</span>}
      <button
        type="button"
        className="text-primary hover:opacity-70 disabled:opacity-40 shrink-0"
        onClick={() => void send()}
        disabled={loading || !input.trim()}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  );
}
