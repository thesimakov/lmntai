import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isReservedAppHost, normalizeHost } from "@/lib/publish-domain";

async function resolveSandboxIdForHost(req: NextRequest, host: string) {
  const url = new URL("/api/publish/resolve", req.url);
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

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|fonts).*)"
  ]
};
