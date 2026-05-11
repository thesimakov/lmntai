import { apiClient } from "./base";

export type CmsPage = {
  id: string;
  title: string;
  slug: string;
  path: string;
  status: string;
  parentId: string | null;
  isHome: boolean;
  noIndex: boolean;
  updatedAt: string;
};

export type CmsEntry = {
  id: string;
  slug: string;
  status: string;
  updatedAt: string;
  draftVersion: { id: string; version: number; createdAt: string; data: unknown } | null;
  publishedVersion: { id: string; version: number; createdAt: string; data: unknown } | null;
};

export const cmsApi = {
  pages: {
    list: (siteId: string) =>
      apiClient.get<{ pages: CmsPage[] }>(`/api/cms/sites/${encodeURIComponent(siteId)}/pages`),

    create: (siteId: string, body: { title: string; slug?: string; parentId?: string }) =>
      apiClient.post<{ page: CmsPage }>(`/api/cms/sites/${encodeURIComponent(siteId)}/pages`, body),

    update: (
      siteId: string,
      pageId: string,
      body: Partial<Pick<CmsPage, "title" | "slug" | "parentId">>,
    ) =>
      apiClient.patch<{ page: CmsPage }>(
        `/api/cms/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`,
        body,
      ),

    delete: (siteId: string, pageId: string) =>
      apiClient.delete<void>(
        `/api/cms/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`,
      ),

    publish: (siteId: string, pageId: string) =>
      apiClient.post<{ ok: boolean }>(
        `/api/cms/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}/publish`,
      ),
  },

  entries: {
    list: (siteId: string, typeId: string) =>
      apiClient.get<{ entries: CmsEntry[] }>(
        `/api/cms/sites/${encodeURIComponent(siteId)}/content-types/${encodeURIComponent(typeId)}/entries`,
      ),

    save: (
      siteId: string,
      typeId: string,
      body: { id?: string; slug: string; data?: Record<string, unknown> },
    ) =>
      apiClient.post<{ entry: CmsEntry }>(
        `/api/cms/sites/${encodeURIComponent(siteId)}/content-types/${encodeURIComponent(typeId)}/entries`,
        body,
      ),

    publish: (siteId: string, typeId: string, entryId: string) =>
      apiClient.post<{ ok: boolean; entry: Pick<CmsEntry, "id" | "status"> }>(
        `/api/cms/sites/${encodeURIComponent(siteId)}/content-types/${encodeURIComponent(typeId)}/entries/${encodeURIComponent(entryId)}/publish`,
      ),
  },
};
