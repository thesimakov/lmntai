const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function toBool(value: string | null | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

function trimOrNull(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

/** Публичный префикс моста Lemnity AI → upstream FastAPI. */
export const LEMNITY_AI_BRIDGE_API_PREFIX = "/api/lemnity-ai" as const;

export function isLemnityAiBridgeEnabledServer(): boolean {
  return (
    toBool(process.env.LEMNITY_AI_BRIDGE_ENABLED) || toBool(process.env.MANUS_FULL_PARITY_ENABLED)
  );
}

export function isLemnityAiBridgeEnabledClient(): boolean {
  return (
    toBool(process.env.NEXT_PUBLIC_LEMNITY_AI_BRIDGE_ENABLED) ||
    toBool(process.env.NEXT_PUBLIC_MANUS_FULL_PARITY_ENABLED)
  );
}

export function getLemnityAiUpstreamBaseUrl(): string | null {
  const raw =
    trimOrNull(process.env.LEMNITY_AI_UPSTREAM_URL) ?? trimOrNull(process.env.MANUS_API_BASE_URL);
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function getLemnityAiUpstreamBearerToken(): string | null {
  return (
    trimOrNull(process.env.LEMNITY_AI_UPSTREAM_BEARER_TOKEN) ??
    trimOrNull(process.env.MANUS_API_BEARER_TOKEN)
  );
}
