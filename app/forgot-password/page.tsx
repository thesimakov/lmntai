"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      setDone(true);
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
        <h1 className="text-2xl font-bold tracking-tight">Забыли пароль?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Укажите email аккаунта с паролем. Если он есть в системе, отправим ссылку для сброса через почту (NotiSend).
        </p>
        {done ? (
          <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Если такой аккаунт с паролем найден, письмо со ссылкой отправлено. Проверьте почту и папку «Спам».
            <div className="mt-4">
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/")}>
                Ко входу
              </Button>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправляем…" : "Отправить ссылку"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
