import {
  getLemnityAiUpstreamBaseUrl,
  getLemnityAiUpstreamBearerToken
} from "@/lib/lemnity-ai-bridge-config";

export type LemnityAiUpstreamEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

export function buildLemnityAiUpstreamUrl(pathname: string): string {
  const base = getLemnityAiUpstreamBaseUrl();
  if (!base) {
    throw new Error("LEMNITY_AI_UPSTREAM_URL или MANUS_API_BASE_URL не задан");
  }
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function withLemnityAiUpstreamAuthHeaders(headers?: HeadersInit): Headers {
  const h = new Headers(headers);
  const token = getLemnityAiUpstreamBearerToken();
  if (token) {
    h.set("Authorization", `Bearer ${token}`);
  }
  return h;
}

export async function lemnityAiUpstreamFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const headers = withLemnityAiUpstreamAuthHeaders(init?.headers);
  return fetch(buildLemnityAiUpstreamUrl(pathname), {
    ...init,
    headers
  });
}

export async function readLemnityAiUpstreamEnvelope<T>(
  res: Response
): Promise<LemnityAiUpstreamEnvelope<T> | null> {
  try {
    const json = (await res.json()) as Partial<LemnityAiUpstreamEnvelope<T>>;
    if (typeof json !== "object" || json == null) return null;
    if (typeof json.code !== "number" || typeof json.msg !== "string") return null;
    return {
      code: json.code,
      msg: json.msg,
      data: (json.data as T) ?? (null as T)
    };
  } catch {
    return null;
  }
}
