"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Минимум ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    if (!token) {
      setError("Нет токена в ссылке. Запросите письмо ещё раз.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) {
        const code = body?.error;
        if (code === "expired") {
          setError("Ссылка устарела. Запросите новую на странице «Забыли пароль».");
        } else if (code === "weak_password") {
          setError(`Пароль слишком короткий (минимум ${MIN_PASSWORD_LENGTH}).`);
        } else {
          setError("Не удалось сменить пароль. Запросите новую ссылку.");
        }
        return;
      }
      router.push("/?reset=ok");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-border/80 px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2">
          <Image src="/logo-w.svg" alt="Lemnity" width={112} height={28} className="h-7 w-auto brightness-0 dark:invert" priority />
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Вход</Link>
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Новый пароль</h1>
        <p className="mt-2 text-sm text-muted-foreground">Задайте новый пароль для входа по email.</p>
        {!token ? (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            Откройте ссылку из письма или{" "}
            <Link href="/forgot-password" className="font-medium underline">
              запросите сброс
            </Link>{" "}
            снова.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="Новый пароль"
                minLength={MIN_PASSWORD_LENGTH}
                required
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute right-0 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md"
                onClick={() => setShow((s) => !s)}
                tabIndex={-1}
                aria-label={show ? "Скрыть пароль" : "Показать пароль"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Сохраняем…" : "Сохранить пароль"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
