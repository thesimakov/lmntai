"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { LoginForm, type LoginFeatures } from "@/components/login-form";
import { Button } from "@/components/ui/button";

export function LoginPageShell({ features }: { features: LoginFeatures }) {
  const router = useRouter();

  const close = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-transparent p-4 sm:p-6">
      <button
        type="button"
        aria-label="Закрыть окно входа"
        className="absolute inset-0 bg-transparent transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
        onClick={close}
      />
      <div
        className="relative z-10 max-h-[min(100dvh-2rem,720px)] w-full max-w-md overflow-y-auto rounded-lg border-2 border-blue-500/70 bg-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl dark:border-blue-400/60 dark:bg-zinc-950/25"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-20 h-10 w-10 rounded-full text-zinc-500 hover:bg-white/15 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          onClick={close}
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </Button>

        <div className="flex items-center gap-2 px-6 pt-6">
          <Image
            src="/logo-w.svg"
            alt="Lemnity"
            width={112}
            height={28}
            className="h-7 w-auto brightness-0 dark:invert"
            priority
          />
        </div>

        <LoginForm features={features} embedded />
      </div>
      </div>
    </>
  );
}
