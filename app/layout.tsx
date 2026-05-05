import type { Metadata } from "next";
import "./globals.css";
import { Rubik } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";

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
        {process.env.NODE_ENV === "development" ? (
          <Script id="dev-next-static-recover" strategy="beforeInteractive">
            {`(function(){
  var done=false;
  function isNextStatic(u){return typeof u==="string"&&u.indexOf("/_next/static/")!==-1;}
  window.addEventListener("error",function(e){
    if(done)return;
    var t=e.target;
    if(!t||t.tagName!=="SCRIPT"||!t.src||!isNextStatic(t.src))return;
    done=true;
    var u=new URL(location.href);
    u.searchParams.set("_nextStale",String(Date.now()));
    location.replace(u.href);
  },true);
})();`}
          </Script>
        ) : null}
        <Providers initialLang={initialLang} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
