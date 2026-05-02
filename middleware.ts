import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isReservedAppHost, normalizeHost, shouldBypassPublishDomainMiddleware } from "@/lib/publish-domain";

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

async function resolveProjectForHost(req: NextRequest, host: string) {
  const url = new URL("/api/publish/resolve", `${publishResolveFetchOrigin(req)}/`);
  url.searchParams.set("host", host);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "x-publish-host": host }
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as
      | { projectId?: string | null; subdomain?: string | null }
      | null;
    const projectId = json?.projectId;
    if (typeof projectId !== "string" || projectId.length === 0) return null;
    return {
      projectId,
      subdomain: typeof json?.subdomain === "string" && json.subdomain.trim() ? json.subdomain.trim() : null
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/publish/resolve")) {
    return NextResponse.next();
  }
  /** NextAuth: не прогонять через resolve публикации — иначе при «чужом» Host (LAN, staging) сессия не грузится. */
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  const rawHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const host = normalizeHost(rawHost);
  if (!host) {
    return new NextResponse("Project not found", { status: 404 });
  }
  if (shouldBypassPublishDomainMiddleware(host)) {
    return NextResponse.next();
  }
  if (isReservedAppHost(host)) {
    return NextResponse.next();
  }

  const project = await resolveProjectForHost(req, host);
  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-project-id", project.projectId);
  requestHeaders.set("x-project-host", host);
  if (project.subdomain) {
    requestHeaders.set("x-project-subdomain", project.subdomain);
  }

  if (
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname.startsWith("/share/")
  ) {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = "/share";
    return NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders
      }
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

/**
 * Все запросы под `/_next/*` (static chunks, RSC `/_next/data/*`, HMR, image optimizer и т.д.)
 * должны обходить publish-domain rewrite. Иначе на кастомном домене с rewrite на `/share/:id`
 * HTML грузится с основного приложения, а `/_next/data/...` и часть внутренних `/_next/*`
 * уходили бы в ветку middleware → ломается загрузка чанков / App Router.
 */
export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml|assets|images|fonts).*)"]
};
