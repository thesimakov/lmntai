import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { BOX_IMAGE_LIBRARY_FALLBACK } from "@/lib/box-image-library-fallback";
import type { BoxImageLibraryHit, BoxImageLibraryResponse } from "@/lib/box-image-library-types";

const PAGE_SIZE = 30;

type UnsplashSearchPhoto = {
  id: string;
  urls?: { thumb?: string; small?: string; regular?: string; full?: string };
  alt_description?: string | null;
  links?: { download_location?: string; html?: string };
  user?: { name?: string; links?: { html?: string } };
};

type UnsplashSearchJson = { results?: UnsplashSearchPhoto[]; total_pages?: number };

async function triggerUnsplashDownload(downloadUrl: string, accessKey: string) {
  try {
    await fetch(downloadUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* Unsplash политики / лимиты */
  }
}

function fallbackHits(q: string, page: number): { results: BoxImageLibraryHit[]; hasMore: boolean; notice?: string } {
  const needle = q.trim().toLowerCase();
  const pool = needle
    ? BOX_IMAGE_LIBRARY_FALLBACK.filter((x) => x.alt.toLowerCase().includes(needle))
    : BOX_IMAGE_LIBRARY_FALLBACK;
  const start = Math.max(0, (page - 1) * PAGE_SIZE);
  const slice = pool.slice(start, start + PAGE_SIZE);
  const results: BoxImageLibraryHit[] = slice.map((x) => ({
    id: x.id,
    thumb: x.thumb,
    full: x.full,
    alt: x.alt,
  }));
  const hasMore = start + PAGE_SIZE < pool.length;
  return {
    results,
    hasMore,
    notice: "Без ключа UNSPLASH_ACCESS_KEY доступна только демо-подборка. Добавьте ключ в .env для полного поиска.",
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Math.min(250, Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1));
  const mode = req.nextUrl.searchParams.get("mode") ?? "search";

  if (req.nextUrl.searchParams.get("capabilities") === "1") {
    return NextResponse.json({
      unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim()),
    });
  }

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY?.trim();

  if (mode === "seed") {
    const fb = fallbackHits("", 1);
    const payload: BoxImageLibraryResponse = {
      source: "fallback",
      results: fb.results,
      page: 1,
      hasMore: fb.hasMore,
      ...(fb.notice && !unsplashKey ? { notice: fb.notice } : {}),
    };
    return NextResponse.json(payload);
  }

  if (!unsplashKey) {
    const fb = fallbackHits(q, page);
    const payload: BoxImageLibraryResponse = {
      source: "fallback",
      results: fb.results,
      page,
      hasMore: fb.hasMore,
      notice: fb.notice,
    };
    return NextResponse.json(payload);
  }

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", q || "natural landscape atmospheric");
    url.searchParams.set("per_page", String(PAGE_SIZE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("orientation", "landscape");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${unsplashKey}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`unsplash ${res.status}`);
    const data = (await res.json()) as UnsplashSearchJson;
    const photos = data.results ?? [];
    const downloads: string[] = [];

    const results: BoxImageLibraryHit[] = photos.map((p) => {
      const full = p.urls?.regular ?? p.urls?.small ?? "";
      const thumb = p.urls?.small ?? p.urls?.thumb ?? full;
      if (p.links?.download_location) downloads.push(p.links.download_location);

      const name = typeof p.user?.name === "string" ? p.user.name : "Unsplash";
      return {
        id: String(p.id),
        alt: typeof p.alt_description === "string" && p.alt_description.trim().length ? p.alt_description : "Unsplash photo",
        thumb,
        full,
        attribution: {
          name,
          profileUrl: p.user?.links?.html ?? "https://unsplash.com",
          photoUrl: p.links?.html ?? "https://unsplash.com",
        },
      };
    });

    await Promise.all(downloads.map((d) => triggerUnsplashDownload(d, unsplashKey)));

    const totalPages = typeof data.total_pages === "number" ? data.total_pages : page;
    const hasMore = page < totalPages && results.length > 0;

    const payload: BoxImageLibraryResponse = { source: "unsplash", results, page, hasMore };
    return NextResponse.json(payload);
  } catch {
    const fb = fallbackHits(q, page);
    const payload: BoxImageLibraryResponse = {
      source: "fallback",
      results: fb.results,
      page,
      hasMore: fb.hasMore,
      notice: "Не удалось загрузить Unsplash — показывается демо-подборка.",
    };
    return NextResponse.json(payload);
  }
}
