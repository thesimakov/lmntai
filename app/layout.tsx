import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import { SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Lemnity Dashboard",
  description: "AI-дашборд генерации сайтов с централизованным биллингом"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
