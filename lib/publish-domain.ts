import { PUBLISH_BUILTIN_BASE_DOMAIN } from "@/lib/publish-host";

const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function hostFromUrlEnv(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const hostOnly = withoutProtocol.split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  const host = hostOnly.replace(/:\d+$/, "");
  if (!host || !/^[a-z0-9.-]+$/.test(host)) return null;
  /* localhost / loopback — без точки в имени; иначе middleware считает хост невалидным и отдаёт 404 */
  if (isLocalHost(host)) return host;
  if (!host.includes(".")) return null;
  if (host.startsWith(".") || host.endsWith(".")) return null;
  return host;
}

/** Регистрирует хост из URL и пару www ↔ apex, чтобы middleware не отдавал 404 при заходе на «другой» канонический вариант домена. */
function registerAppHostsFromUrlEnv(urlEnv: string | undefined, out: Set<string>): void {
  const host = hostFromUrlEnv(urlEnv);
  if (!host) return;
  const lower = host.toLowerCase();
  out.add(lower);
  const hostname = lower.replace(/:\d+$/, "");
  if (hostname.startsWith("www.")) {
    const apex = hostname.slice(4);
    out.add(apex);
  } else if (hostname.includes(".")) {
    out.add(`www.${hostname}`);
  }
}

export function getAppHosts(): Set<string> {
  const out = new Set<string>();
  registerAppHostsFromUrlEnv(process.env.NEXT_PUBLIC_SITE_URL, out);
  registerAppHostsFromUrlEnv(process.env.NEXTAUTH_URL, out);
  out.add("localhost:3000");
  out.add("127.0.0.1:3000");
  out.add("localhost:3001");
  out.add("127.0.0.1:3001");
  out.add("localhost:3030");
  out.add("127.0.0.1:3030");
  out.add("localhost");
  out.add("127.0.0.1");
  return out;
}

export function isLocalHost(host: string) {
  return LOCALHOSTS.has(host);
}

export function isBuiltInPublishHost(host: string): boolean {
  const base = PUBLISH_BUILTIN_BASE_DOMAIN.toLowerCase();
  return host.endsWith(`.${base}`);
}

export function isReservedAppHost(host: string): boolean {
  return getAppHosts().has(host);
}

export function canUseCustomDomain(plan: string): boolean {
  const p = plan.trim().toUpperCase();
  return p === "PRO" || p === "TEAM" || p === "BUSINESS";
}
