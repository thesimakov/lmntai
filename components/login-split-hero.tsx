"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const PROMPT = "Сайт для ресторана";

/**
 * Правая колонка страницы входа: градиент + декоративный prompt-bar (как в макете).
 */
export function LoginSplitHero() {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function sleep(ms: number) {
      await new Promise((r) => setTimeout(r, ms));
    }

    async function loop() {
      while (!cancelled) {
        for (let i = 0; i <= PROMPT.length; i++) {
          if (cancelled) return;
          setTyped(PROMPT.slice(0, i));
          await sleep(55);
        }
        await sleep(2200);
        for (let i = PROMPT.length; i >= 0; i--) {
          if (cancelled) return;
          setTyped(PROMPT.slice(0, i));
          await sleep(28);
        }
        await sleep(600);
      }
    }

    void loop();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex h-full min-h-[min(100dvh,640px)] w-full items-center justify-center overflow-hidden rounded-[1.75rem] p-6 shadow-inner sm:min-h-0 sm:rounded-[2rem] sm:p-8 lg:min-h-full">
      {/* Анимированная «сетка» градиента */}
      <div
        className="absolute inset-0 animate-login-hero-mesh bg-gradient-to-br from-sky-200/90 via-violet-100/85 to-rose-200/90 bg-[length:200%_200%]"
        aria-hidden
      />
      <div
        className="absolute inset-0 animate-login-hero-blob-a bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(255,255,255,0.5),transparent)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 animate-login-hero-blob-b bg-[radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(255,192,203,0.35),transparent)]"
        aria-hidden
      />

      <div className="relative z-[1] w-full max-w-lg">
        <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-lg shadow-violet-500/10 ring-1 ring-black/5 backdrop-blur-sm dark:border-white/20 dark:bg-zinc-900/85">
          <p className="min-w-0 flex-1 text-left text-sm text-zinc-600 dark:text-zinc-300 sm:text-base">
            <span className="text-zinc-700 dark:text-zinc-200">{typed}</span>
            <span
              className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-0.5 bg-violet-500 align-text-bottom motion-safe:animate-login-hero-cursor"
              aria-hidden
            />
          </p>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
            aria-hidden
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </span>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-600/80 dark:text-zinc-400/90">
          Опишите идею — в Playground появится черновик сайта
        </p>
      </div>
    </div>
  );
}
