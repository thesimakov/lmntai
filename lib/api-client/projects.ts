import { apiClient } from "./base";

export type Project = {
  id: string;
  name: string;
  subdomain: string | null;
  preferredEditor: string | null;
  createdAt: string;
  updatedAt: string;
};

export const projectsApi = {
  list: () => apiClient.get<{ projects: Project[] }>("/api/projects"),

  create: (title: string) =>
    apiClient.post<{ project: Project }>("/api/projects", { title }),

  update: (id: string, data: Partial<Pick<Project, "name" | "preferredEditor">>) =>
    apiClient.patch<{ project: Project }>(`/api/projects/${encodeURIComponent(id)}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/api/projects/${encodeURIComponent(id)}`),
};
