"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  modelLabel?: string;
  placeholder?: string;
};

export function AiPromptInput({
  onSubmit,
  disabled = false,
  modelLabel,
  placeholder = "Опишите следующее изменение...",
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-background p-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        className="resize-none text-[12px] leading-snug"
      />
      <div className="flex items-center justify-between gap-2">
        {modelLabel && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {modelLabel}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          disabled={disabled || !value.trim()}
          onClick={handleSubmit}
          className={cn("ml-auto h-7 gap-1 text-[11px]")}
        >
          <SendHorizontal className="h-3 w-3" />
          Отправить
        </Button>
      </div>
    </div>
  );
}
