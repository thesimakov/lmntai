import type { Metadata } from "next";
import "./globals.css";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";

import { Providers } from "@/components/providers";
import { getSafeServerSession } from "@/lib/auth";
import { CHUNK_RECOVERY_INLINE_SCRIPT } from "@/lib/chunk-load-recovery";
import { COOKIE_KEY, parseUiLanguage, type UiLanguage } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Lemnity Dashboard",
  description: "AI-дашборд генерации сайтов с централизованным биллингом"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLang: UiLanguage = parseUiLanguage(cookieStore.get(COOKIE_KEY)?.value) ?? "ru";
  const session = await getSafeServerSession();

  return (
    <html lang={initialLang} className={manrope.variable} suppressHydrationWarning>
      <body className={`${manrope.className} min-h-screen w-full min-w-0 font-sans`}>
        <Script id="next-static-chunk-recover" strategy="beforeInteractive">
          {CHUNK_RECOVERY_INLINE_SCRIPT}
        </Script>
        <Providers initialLang={initialLang} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
