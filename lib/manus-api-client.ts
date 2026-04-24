import { getManusApiBaseUrl, getManusApiBearerToken } from "@/lib/manus-parity-config";

export type ManusApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

export function buildManusApiUrl(pathname: string): string {
  const base = getManusApiBaseUrl();
  if (!base) {
    throw new Error("MANUS_API_BASE_URL не задан");
  }
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function withManusAuthHeaders(headers?: HeadersInit): Headers {
  const h = new Headers(headers);
  const token = getManusApiBearerToken();
  if (token) {
    h.set("Authorization", `Bearer ${token}`);
  }
  return h;
}

export async function manusApiFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const headers = withManusAuthHeaders(init?.headers);
  return fetch(buildManusApiUrl(pathname), {
    ...init,
    headers
  });
}

export async function readManusEnvelope<T>(res: Response): Promise<ManusApiEnvelope<T> | null> {
  try {
    const json = (await res.json()) as Partial<ManusApiEnvelope<T>>;
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
