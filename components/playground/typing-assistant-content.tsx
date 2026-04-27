"use client";

import { useEffect, useRef, useState } from "react";

const CHARS_PER_INTERVAL = 2;
const INTERVAL_MS = 22;

type TypingAssistantContentProps = {
  text: string;
  messageId: string;
  className?: string;
};

/**
 * Показывает ответ ассистента с эффектом «набора» (как в мессенджере).
 * При дозаписи в том же сообщении (стрим) догоняет целевую длину без сброса.
 */
export function TypingAssistantContent({ text, messageId, className }: TypingAssistantContentProps) {
  const [visible, setVisible] = useState(0);
  const messageIdRef = useRef(messageId);
  const tailRef = useRef<HTMLSpanElement | null>(null);
  const scrollEveryRef = useRef(0);

  useEffect(() => {
    if (messageIdRef.current !== messageId) {
      messageIdRef.current = messageId;
      scrollEveryRef.current = 0;
      setVisible(0);
    }
  }, [messageId]);

  useEffect(() => {
    if (text.length < visible) {
      setVisible(text.length);
    }
  }, [text, text.length, visible]);

  /** Стрим отдаёт большие куски — догоняем, иначе «набор» сильно отстаёт. */
  useEffect(() => {
    if (text.length > visible + 100) {
      setVisible((v) => Math.max(v, text.length - 48));
    }
  }, [text, text.length, visible]);

  useEffect(() => {
    if (visible >= text.length) return;
    const t = window.setInterval(() => {
      setVisible((v) => Math.min(v + CHARS_PER_INTERVAL, text.length));
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [text, text.length, visible]);

  useEffect(() => {
    if (visible < text.length) {
      scrollEveryRef.current += 1;
      if (scrollEveryRef.current % 3 === 0) {
        tailRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
      }
    } else {
      tailRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [visible, text.length]);

  const atEnd = visible >= text.length;
  const slice = text.slice(0, visible);

  return (
    <span className={className}>
      {slice}
      {!atEnd ? (
        <span
          className="ml-0.5 inline-block h-4 w-px align-[-0.2em] animate-pulse bg-current opacity-60"
          aria-hidden
        />
      ) : null}
      <span ref={tailRef} className="inline-block h-px w-0" aria-hidden />
    </span>
  );
}
