import { apiClient } from "./base";

export type SandboxFiles = { files: Record<string, string> };

export type PublishDomainBinding = {
  host: string;
  verifiedAt: string | null;
  provisionedAt: string | null;
};

export const sandboxApi = {
  getFiles: (sandboxId: string) =>
    apiClient.get<SandboxFiles>(`/api/sandbox/${encodeURIComponent(sandboxId)}?format=json`),

  updateHtml: (sandboxId: string, html: string) =>
    apiClient.patch<void>(`/api/sandbox/${encodeURIComponent(sandboxId)}`, { html }),

  getPublishDomain: (sandboxId: string) =>
    apiClient.get<PublishDomainBinding | null>(
      `/api/sandbox/${encodeURIComponent(sandboxId)}/publish-domain`,
    ),

  bindPublishDomain: (sandboxId: string, host: string) =>
    apiClient.post<PublishDomainBinding>(
      `/api/sandbox/${encodeURIComponent(sandboxId)}/publish-domain`,
      { host },
    ),

  removePublishDomain: (sandboxId: string) =>
    apiClient.delete<void>(`/api/sandbox/${encodeURIComponent(sandboxId)}/publish-domain`),
};
