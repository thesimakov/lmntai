import { headers } from "next/headers";

import type { LoginFeatures } from "@/components/login-form";

/** Иначе при `next build` на CI/без .env флаги провайдеров «запекаются», и кнопки (Яндекс и др.) исчезают на проде даже при .env на сервере. */
export const LOGIN_PAGE_DYNAMIC = "force-dynamic" as const;

function isRequestLocalhostHost(hostHeader: string | null): boolean {
  if (!hostHeader) {
    return false;
  }
  try {
    const { hostname } = new URL(`http://${hostHeader}`);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

/** Серверные флаги OAuth / демо / magic-link для главной страницы входа. */
export async function readLoginFeatures(): Promise<LoginFeatures> {
  const smtp =
    Boolean(process.env.EMAIL_SERVER_HOST) &&
    Boolean(process.env.EMAIL_SERVER_USER) &&
    Boolean(process.env.EMAIL_SERVER_PASSWORD) &&
    Boolean(process.env.EMAIL_FROM);

  const demoEnabled = process.env.DEMO_LOGIN_ENABLED === "true";
  const demoEmail = (process.env.DEMO_LOGIN_EMAIL ?? "").trim();
  const demoName = (process.env.DEMO_LOGIN_NAME ?? "Демо").trim();
  const demoPasswordRaw = process.env.DEMO_LOGIN_PASSWORD;
  const demoPasswordSet = Boolean(demoPasswordRaw);
  const demoPrefill = demoPasswordRaw?.trim() || undefined;
  const h = await headers();
  const allowDemoPrefill = isRequestLocalhostHost(h.get("x-forwarded-host") ?? h.get("host"));

  const gh =
    Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET) ||
    Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: gh,
    vk: Boolean(process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET),
    yandex: Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET),
    emailMagic: smtp,
    demo:
      demoEnabled && demoEmail
        ? {
            email: demoEmail,
            name: demoName,
            requiresPassword: demoPasswordSet,
            prefillPassword: allowDemoPrefill ? demoPrefill : undefined,
            showBypassDbHint: process.env.NODE_ENV === "development",
          }
        : undefined,
  };
}
