"use client";

import { useEffect, useRef, useState } from "react";

const BASE_CHARS_PER_TICK = 2;
const BASE_INTERVAL_MS = 24;
/** В режиме стрима: если отстаём больше — ускоряем набор, но не показываем весь текст сразу. */
const STREAM_LAG_SOFT = 72;
const STREAM_LAG_HARD = 160;
const STREAM_TAIL_CHARS = 40;

type TypingAssistantContentProps = {
  text: string;
  messageId: string;
  className?: string;
  /** Последнее сообщение ассистента во время SSE — догоняем целевой текст без сброса. */
  streaming?: boolean;
};

function charsPerTick(lag: number, streaming: boolean, textLength: number): number {
  if (streaming) {
    if (lag > STREAM_LAG_HARD) return 10;
    if (lag > STREAM_LAG_SOFT) return 5;
    return BASE_CHARS_PER_TICK;
  }
  if (textLength > 2400) return 5;
  if (textLength > 900) return 3;
  return BASE_CHARS_PER_TICK;
}

/**
 * Показывает ответ ассистента с эффектом «набора» (как в мессенджере).
 * При дозаписи в том же сообщении (стрим) догоняет целевую длину без сброса.
 */
export function TypingAssistantContent({
  text,
  messageId,
  className,
  streaming = false,
}: TypingAssistantContentProps) {
  const [visible, setVisible] = useState(0);
  const messageIdRef = useRef(messageId);
  const tailRef = useRef<HTMLSpanElement | null>(null);
  const scrollEveryRef = useRef(0);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  }, [text, visible]);

  /** Только в стриме: мягко подтягиваем хвост, чтобы не отставать на минуты. */
  useEffect(() => {
    if (!streaming || reduceMotion) return;
    const lag = text.length - visible;
    if (lag > STREAM_LAG_HARD) {
      setVisible((v) => Math.max(v, text.length - STREAM_TAIL_CHARS));
    }
  }, [streaming, text.length, visible, reduceMotion, text]);

  useEffect(() => {
    if (reduceMotion) {
      setVisible(text.length);
      return;
    }
    if (visible >= text.length) return;
    const t = window.setInterval(() => {
      setVisible((v) => {
        const nextLag = text.length - v;
        const tick = charsPerTick(nextLag, streaming, text.length);
        return Math.min(v + tick, text.length);
      });
    }, BASE_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [text, text.length, visible, streaming, reduceMotion]);

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
  const slice = reduceMotion ? text : text.slice(0, visible);

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
