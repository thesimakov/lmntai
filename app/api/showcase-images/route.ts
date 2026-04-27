import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import {
  LANDING_SHOWCASE_ITEMS,
  SHOWCASE_UNSPLASH_QUERY_BY_SLUG,
  showcaseLocalFallbackUrl,
  type ShowcaseImageEntry
} from "@/lib/landing-showcase";

function hashSlug(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function localShowcasePayload(): { source: "local"; bySlug: Record<string, ShowcaseImageEntry> } {
  const bySlug: Record<string, ShowcaseImageEntry> = {};
  for (const item of LANDING_SHOWCASE_ITEMS) {
    bySlug[item.slug] = { url: showcaseLocalFallbackUrl(item.slug) };
  }
  return { source: "local", bySlug };
}

type UnsplashSearchPhoto = {
  urls: { regular?: string; small?: string };
  links: { download_location?: string; html?: string };
  user: { name: string; links: { html?: string } };
};

type UnsplashSearchJson = { results?: UnsplashSearchPhoto[] };

async function triggerDownload(downloadUrl: string, accessKey: string) {
  try {
    await fetch(downloadUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    /* Unsplash: лимиты / сеть — не блокируем ответ */
  }
}

async function loadShowcaseImages(): Promise<{
  source: "unsplash" | "local";
  bySlug: Record<string, ShowcaseImageEntry>;
}> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) return localShowcasePayload();

  const bySlug: Record<string, ShowcaseImageEntry> = {};
  const downloadUrls: string[] = [];

  for (const item of LANDING_SHOWCASE_ITEMS) {
    const query =
      SHOWCASE_UNSPLASH_QUERY_BY_SLUG[item.slug] ?? item.slug.replace(/-/g, " ");
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "20");
    url.searchParams.set("orientation", "landscape");

    let results: UnsplashSearchPhoto[] = [];
    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 3600 }
      });
      if (!res.ok) throw new Error(`unsplash ${res.status}`);
      const data = (await res.json()) as UnsplashSearchJson;
      results = data.results ?? [];
    } catch {
      bySlug[item.slug] = { url: showcaseLocalFallbackUrl(item.slug) };
      continue;
    }

    if (results.length === 0) {
      bySlug[item.slug] = { url: showcaseLocalFallbackUrl(item.slug) };
      continue;
    }

    const idx = hashSlug(item.slug) % results.length;
    const ph = results[idx];
    const imgUrl = ph.urls.regular ?? ph.urls.small;
    if (!imgUrl) {
      bySlug[item.slug] = { url: showcaseLocalFallbackUrl(item.slug) };
      continue;
    }

    bySlug[item.slug] = {
      url: imgUrl,
      credit: {
        name: ph.user.name,
        profileUrl: ph.user.links.html ?? "https://unsplash.com",
        photoPageUrl: ph.links.html ?? "https://unsplash.com"
      }
    };

    if (ph.links.download_location) downloadUrls.push(ph.links.download_location);
  }

  await Promise.all(downloadUrls.map((u) => triggerDownload(u, accessKey)));

  return { source: "unsplash", bySlug };
}

const getCachedShowcaseImages = unstable_cache(loadShowcaseImages, ["showcase-images-v2"], {
  revalidate: 3600
});

export async function GET() {
  try {
    const payload = await getCachedShowcaseImages();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(localShowcasePayload());
  }
}
