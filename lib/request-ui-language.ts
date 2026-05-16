import type { NextRequest } from "next/server";

import {
  COOKIE_KEY,
  guessLanguageFromLocale,
  parseUiLanguage,
  type UiLanguage,
} from "@/lib/i18n";

export function resolveUiLanguageFromRequest(req: NextRequest): UiLanguage {
  const fromQuery = parseUiLanguage(req.nextUrl?.searchParams?.get("lang") ?? null);
  if (fromQuery) return fromQuery;

  const fromCookie = parseUiLanguage(req.cookies?.get(COOKIE_KEY)?.value);
  if (fromCookie) return fromCookie;

  const acceptLanguage = req.headers.get("accept-language");
  const primaryLocale = acceptLanguage?.split(",")[0]?.trim();
  return guessLanguageFromLocale(primaryLocale);
}
