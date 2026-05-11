export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string };

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: (json as { error?: string }).error ?? `HTTP ${res.status}`,
        code: (json as { code?: string }).code,
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      message: e instanceof Error ? e.message : "Network error",
    };
  }
}

export const apiClient = {
  get: <T>(url: string, init?: Omit<RequestInit, "method">) =>
    request<T>(url, { ...init, method: "GET" }),
  post: <T>(url: string, body?: unknown, init?: Omit<RequestInit, "method" | "body">) =>
    request<T>(url, {
      ...init,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: unknown, init?: Omit<RequestInit, "method" | "body">) =>
    request<T>(url, {
      ...init,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown, init?: Omit<RequestInit, "method" | "body">) =>
    request<T>(url, {
      ...init,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string, init?: Omit<RequestInit, "method">) =>
    request<T>(url, { ...init, method: "DELETE" }),
};
