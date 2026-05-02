/** Общее хранилище настроек интеграций: студия /playground/build и страница /integrations */

export const INTEGRATION_SETTINGS_STORAGE_KEY = "lemnity.integration.settings.v1";

export const INTEGRATION_CONNECTIONS_STORAGE_KEY = "lemnity.integration.connections.v1";

export function readStoredIntegrationSettings(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INTEGRATION_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readStoredIntegrationConnections(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INTEGRATION_CONNECTIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function writeStoredIntegrationConnections(next: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INTEGRATION_CONNECTIONS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
