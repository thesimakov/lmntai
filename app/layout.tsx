import type { Metadata } from "next";
import "./globals.css";
import { Rubik } from "next/font/google";
import { cookies } from "next/headers";

import { Providers } from "@/components/providers";
import { getSafeServerSession } from "@/lib/auth";
import { COOKIE_KEY, parseUiLanguage, type UiLanguage } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

const rubik = Rubik({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-rubik",
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
    <html lang={initialLang} className={rubik.variable} suppressHydrationWarning>
      <body className={`${rubik.className} min-h-screen w-full min-w-0 font-sans`}>
        <Providers initialLang={initialLang} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
