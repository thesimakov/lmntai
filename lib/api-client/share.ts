import { apiClient } from "./base";

export type ShareState = {
  isPublic: boolean;
  hideLemnityHeader: boolean;
  showLemnityBranding: boolean;
};

export const shareApi = {
  getState: (sandboxId: string) =>
    apiClient.get<ShareState>(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`),

  makePublic: (sandboxId: string) =>
    apiClient.post<{ isPublic: boolean }>(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`),

  makePrivate: (sandboxId: string) =>
    apiClient.delete<{ isPublic: boolean }>(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`),

  setHideHeader: (sandboxId: string, hide: boolean) =>
    apiClient.patch<ShareState>(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { hide }),
};
