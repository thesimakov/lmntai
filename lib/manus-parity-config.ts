import type { ProjectKind } from "@/lib/manus-prompt-spec";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function toBool(value: string | null | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

function trimOrNull(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

export function isManusFullParityEnabledServer(): boolean {
  return toBool(process.env.MANUS_FULL_PARITY_ENABLED);
}

export function isManusFullParityEnabledClient(): boolean {
  return toBool(process.env.NEXT_PUBLIC_MANUS_FULL_PARITY_ENABLED);
}

export function getManusApiBaseUrl(): string | null {
  const raw = trimOrNull(process.env.MANUS_API_BASE_URL);
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function getManusApiBearerToken(): string | null {
  return trimOrNull(process.env.MANUS_API_BEARER_TOKEN);
}

export function getManusFrontendUrl(): string | null {
  return trimOrNull(process.env.NEXT_PUBLIC_MANUS_FRONTEND_URL);
}

export function buildManusFrontendLaunchUrl(input: {
  idea?: string | null;
  projectKind?: ProjectKind | null;
  sessionId?: string | null;
}): string | null {
  const base = getManusFrontendUrl();
  if (!base) return null;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }

  const idea = input.idea?.trim();
  if (idea) {
    url.searchParams.set("prompt", idea);
  }
  if (input.projectKind) {
    url.searchParams.set("projectKind", input.projectKind);
  }
  if (input.sessionId?.trim()) {
    url.searchParams.set("sessionId", input.sessionId.trim());
  }
  return url.toString();
}
