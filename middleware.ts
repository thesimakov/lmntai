import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isReservedAppHost, normalizeHost } from "@/lib/publish-domain";

/** Запрос в resolve API через канонический origin (NEXT_PUBLIC_SITE_URL), чтобы не упираться в поддомен публикации. */
function publishResolveFetchOrigin(req: NextRequest): string {
  const raw = typeof process.env.NEXT_PUBLIC_SITE_URL === "string" ? process.env.NEXT_PUBLIC_SITE_URL.trim() : "";
  if (raw.length > 0) {
    try {
      return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw).origin;
    } catch {
      /* fallthrough */
    }
  }
  return new URL(req.url).origin;
}

async function resolveSandboxIdForHost(req: NextRequest, host: string) {
  const url = new URL("/api/publish/resolve", `${publishResolveFetchOrigin(req)}/`);
  url.searchParams.set("host", host);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "x-publish-host": host }
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { sandboxId?: string | null } | null;
    const sandboxId = json?.sandboxId;
    return typeof sandboxId === "string" && sandboxId.length > 0 ? sandboxId : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const rawHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const host = normalizeHost(rawHost);
  if (!host || isReservedAppHost(host)) {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith("/share/")) {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  const sandboxId = await resolveSandboxIdForHost(req, host);
  if (!sandboxId) {
    return NextResponse.next();
  }

  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname = `/share/${encodeURIComponent(sandboxId)}`;
  return NextResponse.rewrite(rewriteUrl);
}

/**
 * Все запросы под `/_next/*` (static chunks, RSC `/_next/data/*`, HMR, image optimizer и т.д.)
 * должны обходить publish-domain rewrite. Иначе на кастомном домене с rewrite на `/share/:id`
 * HTML грузится с основного приложения, а `/_next/data/...` и часть внутренних `/_next/*`
 * уходили бы в ветку middleware → ломается загрузка чанков / App Router.
 */
export const config = {
  matcher: ["/((?!api|_next/|favicon.ico|robots.txt|sitemap.xml|assets|images|fonts).*)"]
};
