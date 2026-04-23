"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { authContinueCallbackUrl, consumePostLoginRedirect } from "@/lib/post-login-redirect";
import { claimPendingReferral } from "@/lib/referrals-client";
import { SITE_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type LoginFeatures = {
  vk: boolean;
  yandex: boolean;
  emailMagic: boolean;
  /** Демо: кнопка «заполнить» и опционально пароль (сервер: DEMO_LOGIN_*) */
  demo?: {
    email: string;
    name: string;
    requiresPassword: boolean;
  };
};

export function LoginForm({
  features,
  embedded = false
}: {
  features: LoginFeatures;
  /** Карточка без внешнего main/Card — для модального окна */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const result = await signIn("credentials", {
        email,
        name,
        password: features.demo?.requiresPassword ? password : "",
        redirect: false
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      await claimPendingReferral();
      router.push(consumePostLoginRedirect("/playground"));
    } catch {
      setError("Не удалось выполнить вход. Повторите попытку.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Укажите email");
      return;
    }
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const result = await signIn("email", {
        email: email.trim(),
        callbackUrl: authContinueCallbackUrl(SITE_URL),
        redirect: false
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setInfo("Проверьте почту: мы отправили ссылку для входа.");
    } catch {
      setError("Не удалось отправить magic link");
    } finally {
      setIsLoading(false);
    }
  }

  const formBody = (
    <>
          {features.demo ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                Демо-доступ: подставим email и имя
                {features.demo.requiresPassword
                  ? ". Пароль задаётся в `DEMO_LOGIN_PASSWORD` на сервере."
                  : "."}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isLoading}
                onClick={() => {
                  setEmail(features.demo!.email);
                  setName(features.demo!.name);
                  setError(null);
                }}
              >
                Заполнить демо
              </Button>
            </div>
          ) : null}

          {(features.vk || features.yandex) && (
            <div className="flex flex-col gap-2">
              {features.vk ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => {
                    setIsLoading(true);
                    void signIn("vk", { callbackUrl: authContinueCallbackUrl(SITE_URL) }).finally(() =>
                      setIsLoading(false)
                    );
                  }}
                >
                  ВКонтакте
                </Button>
              ) : null}
              {features.yandex ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => {
                    setIsLoading(true);
                    void signIn("yandex", { callbackUrl: authContinueCallbackUrl(SITE_URL) }).finally(() =>
                      setIsLoading(false)
                    );
                  }}
                >
                  Яндекс
                </Button>
              ) : null}
            </div>
          )}

          {features.emailMagic ? (
            <form className="space-y-3" onSubmit={handleMagicLink}>
              <p className="text-muted-foreground text-sm">Вход по ссылке на почту</p>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
              />
              <Button type="submit" variant="secondary" className="w-full" disabled={isLoading}>
                {isLoading ? "Отправляю…" : "Отправить ссылку"}
              </Button>
            </form>
          ) : null}

          <div className="border-border relative border-t pt-4">
            <span
              className={cn(
                "text-muted-foreground absolute left-1/2 top-0 z-[1] -translate-x-1/2 -translate-y-1/2 px-2 text-xs",
                embedded
                  ? "bg-white/20 backdrop-blur-sm dark:bg-zinc-950/30"
                  : "bg-card"
              )}
            >
              или быстрый вход
            </span>
            <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Имя (опционально)"
              />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
              />
              {features.demo?.requiresPassword ? (
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Пароль демо"
                  autoComplete="current-password"
                />
              ) : null}
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              {info ? <p className="text-sm text-emerald-500">{info}</p> : null}
              <Button
                type="submit"
                className={cn(
                  "w-full",
                  embedded &&
                    "rounded-xl bg-zinc-900 text-white shadow-md hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                )}
                disabled={isLoading}
              >
                {isLoading ? "Выполняю вход…" : "Войти по email"}
              </Button>
            </form>
          </div>
    </>
  );

  if (embedded) {
    return (
      <div className="pb-6">
        <CardHeader className="space-y-1 px-6 pb-2 pt-4">
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Начните создавать</p>
          <CardTitle id="login-dialog-title" className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Вход в аккаунт
          </CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400">
            Соцсети, ссылка на email или быстрый вход по email (демо).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-2">{formBody}</CardContent>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="glass w-full max-w-md rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Вход в Lemnity</CardTitle>
          <CardDescription>
            Войдите через соцсети, ссылку на email или мгновенно по email (демо-режим).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">{formBody}</CardContent>
      </Card>
    </main>
  );
}
