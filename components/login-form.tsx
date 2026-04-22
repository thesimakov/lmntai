"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { SITE_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type LoginFeatures = {
  vk: boolean;
  yandex: boolean;
  emailMagic: boolean;
};

export function LoginForm({ features }: { features: LoginFeatures }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfo(null);

    const result = await signIn("credentials", {
      email,
      name,
      redirect: false
    });

    setIsLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push("/playground");
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

    const result = await signIn("email", {
      email: email.trim(),
      callbackUrl: `${SITE_URL}/playground`,
      redirect: false
    });

    setIsLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setInfo("Проверьте почту: мы отправили ссылку для входа.");
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
        <CardContent className="space-y-6">
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
                    void signIn("vk", { callbackUrl: `${SITE_URL}/playground` }).finally(() =>
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
                    void signIn("yandex", { callbackUrl: `${SITE_URL}/playground` }).finally(() =>
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
            <span className="text-muted-foreground absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs">
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
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              {info ? <p className="text-sm text-emerald-500">{info}</p> : null}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Выполняю вход…" : "Войти по email"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
