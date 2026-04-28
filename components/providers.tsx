"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

import { I18nProvider } from "@/components/i18n-provider";
import { ReferralCapture } from "@/components/referral-capture";
import { Toaster } from "@/components/ui/sonner";
import type { UiLanguage } from "@/lib/i18n";

type ProvidersProps = {
  children: React.ReactNode;
  initialLang: UiLanguage;
  session: Session | null;
};

export function Providers({ children, initialLang, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        <I18nProvider initialLang={initialLang}>
          <ReferralCapture />
          {children}
          <Toaster richColors closeButton />
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
