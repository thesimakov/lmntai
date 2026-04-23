"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { authContinueCallbackUrl, consumePostLoginRedirect } from "@/lib/post-login-redirect";
import { claimPendingReferral } from "@/lib/referrals-client";
import { SITE_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.833.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.448-1.27.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.748-1.025 2.748-1.025.546 1.379.202 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.339 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.021C22 6.484 17.522 2 12 2Z"
      />
    </svg>
  );
}

export type LoginFeatures = {
  google: boolean;
  github: boolean;
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
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<
    "idle" | "oauth" | "credentials" | "register" | "magic"
  >("idle");
  const [activeProvider, setActiveProvider] = useState<"google" | "github" | "vk" | "yandex" | null>(null);
  const isLoading = loadingState !== "idle";

  async function handleOAuthSignIn(
    provider: "google" | "github" | "vk" | "yandex",
    label: string
  ) {
    setError(null);
    setInfo(null);
    setActiveProvider(provider);
    setLoadingState("oauth");

    try {
      const result = await signIn(provider, {
        callbackUrl: authContinueCallbackUrl(SITE_URL),
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
        setLoadingState("idle");
        setActiveProvider(null);
        return;
      }

      if (result?.url) {
        window.location.assign(result.url);
        return;
      }

      setError(`Не удалось начать вход через ${label}. Повторите попытку.`);
    } catch {
      setError(`Не удалось начать вход через ${label}. Повторите попытку.`);
    }

    setLoadingState("idle");
    setActiveProvider(null);
  }

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingState("credentials");
    setError(null);
    setInfo(null);

    try {
      const result = await signIn("credentials", {
        email,
        name,
        company: "",
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
      setLoadingState("idle");
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();
    if (!trimmedName) {
      setError("Укажите имя — так мы обратимся к вам в сервисе.");
      return;
    }
    if (!trimmedEmail) {
      setError("Укажите email.");
      return;
    }
    setLoadingState("register");
    setError(null);
    setInfo(null);

    try {
      const result = await signIn("credentials", {
        email: trimmedEmail,
        name: trimmedName,
        company: regCompany.trim() || undefined,
        password: features.demo?.requiresPassword ? regPassword : "",
        redirect: false
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      await claimPendingReferral();
      router.push(consumePostLoginRedirect("/playground"));
    } catch {
      setError("Не удалось создать аккаунт. Повторите попытку.");
    } finally {
      setLoadingState("idle");
    }
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Укажите email");
      return;
    }
    setLoadingState("magic");
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
      setLoadingState("idle");
    }
  }

  const hasOAuth =
    features.google || features.github || features.vk || features.yandex;

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

          {hasOAuth ? (
            <div className="flex flex-col gap-2">
              {features.google ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isLoading}
                  onClick={() => {
                    void handleOAuthSignIn("google", "Google");
                  }}
                >
                  {loadingState === "oauth" && activeProvider === "google" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Перенаправляем в Google...
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="size-4" />
                      Google
                    </>
                  )}
                </Button>
              ) : null}
              {features.github ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isLoading}
                  onClick={() => {
                    void handleOAuthSignIn("github", "GitHub");
                  }}
                >
                  {loadingState === "oauth" && activeProvider === "github" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Перенаправляем в GitHub...
                    </>
                  ) : (
                    <>
                      <GitHubIcon className="size-4" />
                      GitHub
                    </>
                  )}
                </Button>
              ) : null}
              {features.vk ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => {
                    void handleOAuthSignIn("vk", "ВКонтакте");
                  }}
                >
                  {loadingState === "oauth" && activeProvider === "vk" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Перенаправляем во ВКонтакте...
                    </>
                  ) : (
                    "ВКонтакте"
                  )}
                </Button>
              ) : null}
              {features.yandex ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => {
                    void handleOAuthSignIn("yandex", "Яндекс");
                  }}
                >
                  {loadingState === "oauth" && activeProvider === "yandex" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Перенаправляем в Яндекс...
                    </>
                  ) : (
                    "Яндекс"
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}

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
                {loadingState === "magic" ? "Отправляю…" : "Отправить ссылку"}
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
              {hasOAuth || features.emailMagic ? "или быстрый вход" : "Вход по email"}
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
                {loadingState === "credentials" ? "Выполняю вход…" : "Войти по email"}
              </Button>
            </form>
          </div>

          <div className="border-border relative border-t pt-4">
            <span
              className={cn(
                "text-muted-foreground absolute left-1/2 top-0 z-[1] -translate-x-1/2 -translate-y-1/2 px-2 text-xs",
                embedded
                  ? "bg-white/20 backdrop-blur-sm dark:bg-zinc-950/30"
                  : "bg-card"
              )}
            >
              Регистрация
            </span>
            <p className="text-muted-foreground mb-3 text-sm">
              Нет аккаунта? Укажите данные — мы создадим профиль с бесплатным пакетом токенов.
            </p>
            <form className="space-y-3" onSubmit={handleRegisterSubmit}>
              <Input
                value={regName}
                onChange={(event) => setRegName(event.target.value)}
                placeholder="Имя и фамилия"
                autoComplete="name"
                required
              />
              <Input
                type="email"
                value={regEmail}
                onChange={(event) => setRegEmail(event.target.value)}
                placeholder="Email"
                autoComplete="email"
                required
              />
              <Input
                value={regCompany}
                onChange={(event) => setRegCompany(event.target.value)}
                placeholder="Компания (необязательно)"
                autoComplete="organization"
              />
              {features.demo?.requiresPassword ? (
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(event) => setRegPassword(event.target.value)}
                  placeholder="Пароль демо"
                  autoComplete="new-password"
                />
              ) : null}
              <Button
                type="submit"
                variant="secondary"
                className={cn(
                  "w-full",
                  embedded && "rounded-xl"
                )}
                disabled={isLoading}
              >
                {loadingState === "register" ? "Создаём профиль…" : "Создать аккаунт"}
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
            Соцсети, ссылка на email, вход или регистрация по email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-2">{formBody}</CardContent>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border/80 bg-card/50 px-4 py-3 backdrop-blur-sm sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          <Image
            src="/logo-w.svg"
            alt="Lemnity"
            width={112}
            height={28}
            className="h-7 w-auto brightness-0 dark:invert"
            priority
          />
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">На главную</Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:justify-center sm:py-10">
        <Card className="glass w-full max-w-md rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Вход в Lemnity</CardTitle>
            <CardDescription>
              Войдите или зарегистрируйтесь через соцсети, ссылку на email или email (демо).
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[min(70dvh,560px)] space-y-6 overflow-y-auto sm:max-h-none sm:overflow-visible">
            {formBody}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
