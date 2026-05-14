"use client";

import type { Session } from "next-auth";
import { NextUIProvider } from "@nextui-org/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";

import NextTopLoader from "nextjs-toploader";

import { ChunkLoadRecovery } from "@/components/chunk-load-recovery";
import { I18nProvider } from "@/components/i18n-provider";
import { ReferralCapture } from "@/components/referral-capture";
import { Toaster } from "@/components/ui/sonner";
import type { UiLanguage } from "@/lib/i18n";

type ProvidersProps = {
  children: React.ReactNode;
  initialLang: UiLanguage;
  session: Session | null;
};

function nextUiLocale(lang: UiLanguage): string {
  if (lang === "en") return "en-US";
  if (lang === "tg") return "tg-TJ";
  return "ru-RU";
}

function NextUIRouterProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: UiLanguage;
}) {
  const router = useRouter();
  return (
    <NextUIProvider
      locale={nextUiLocale(locale)}
      navigate={(href, options) => {
        void router.push(String(href), options ?? undefined);
      }}
    >
      {children}
    </NextUIProvider>
  );
}

export function Providers({ children, initialLang, session }: ProvidersProps) {
  const isProd = process.env.NODE_ENV === "production";
  /* Явный basePath: иначе клиент берёт path из NEXTAUTH_URL; при некорректном URL приложения
     запросы уходят не на /api/auth/* → HTML вместо JSON → CLIENT_FETCH_ERROR. */
  return (
    <SessionProvider
      session={session}
      basePath="/api/auth"
      /* В dev частый сценарий: фокус окна → refetch сессии пока сервер перезапускается → «Failed to fetch». */
      refetchOnWindowFocus={isProd}
      refetchWhenOffline={false}
    >
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        <NextUIRouterProvider locale={initialLang}>
          <I18nProvider initialLang={initialLang}>
            <NextTopLoader
              color="linear-gradient(90deg, #3b82f6, #818cf8, #c084fc, #6366f1)"
              height={3}
              showSpinner={false}
              easing="cubic-bezier(0.22,1,0.36,1)"
              speed={300}
              shadow="0 0 10px #6366f1, 0 0 5px #3b82f6"
            />
            <ChunkLoadRecovery />
            <ReferralCapture />
            {children}
            <Toaster richColors closeButton />
          </I18nProvider>
        </NextUIRouterProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
