"use client";

import type { Session } from "next-auth";
import { NextUIProvider } from "@nextui-org/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";

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
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        <NextUIRouterProvider locale={initialLang}>
          <I18nProvider initialLang={initialLang}>
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
