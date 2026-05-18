import type { ProjectBrandKitState } from "@/components/dashboard/project-brand-kit-fields";
import { projectStateToManifest } from "@/lib/brand-kit-library";
import type { BrandKitLibraryDto } from "@/lib/brand-kit-library";
import type { ProjectBrandKitLibraryDto } from "@/lib/project-brand-kit-library";

export const BRAND_KIT_LIBRARY_UPDATED_EVENT = "lemnity:brand-kit-library-updated";
export const PROJECT_BRAND_KIT_UPDATED_EVENT = "lemnity:project-brand-kit-updated";

function dispatchBrandKitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BRAND_KIT_LIBRARY_UPDATED_EVENT));
  }
}

type BrandKitGetResponse = {
  library: BrandKitLibraryDto | null;
  state: ProjectBrandKitState | null;
};

/** Ответ API проекта может содержать toneOfVoice/brandbook — в UI-форме они не используются. */
function apiStateToUiBrandKit(state: ProjectBrandKitState): ProjectBrandKitState {
  return {
    companyDescription: state.companyDescription,
    slogan: state.slogan,
    brandValues: state.brandValues,
    brandAesthetics: state.brandAesthetics,
    colors: state.colors,
    typography: state.typography,
    logos: state.logos,
    images: state.images,
  };
}

/** apiOk returns `{ library, state }` — not wrapped in `data`. */
function parseBrandKitApiBody(json: unknown): BrandKitGetResponse {
  if (!json || typeof json !== "object") {
    return { library: null, state: null };
  }
  const body = json as Record<string, unknown>;
  const payload =
    body.data && typeof body.data === "object"
      ? (body.data as BrandKitGetResponse)
      : (body as BrandKitGetResponse);
  return {
    library: payload.library ?? null,
    state: payload.state ? apiStateToUiBrandKit(payload.state) : null,
  };
}

export async function fetchBrandKitLibrary(): Promise<BrandKitGetResponse> {
  const res = await fetch("/api/brand-kit", { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to load brand kit");
  }
  const json = await res.json();
  return parseBrandKitApiBody(json);
}

export async function saveBrandKitLibrary(
  state: ProjectBrandKitState,
  pendingFiles: Map<string, File>
): Promise<BrandKitLibraryDto> {
  const base = projectStateToManifest(state);
  const form = new FormData();
  form.append(
    "data",
    JSON.stringify({
      ...base,
      logos: state.logos.map(({ id, name, fileName }) => ({ id, name, fileName })),
      images: state.images.map(({ id, name, fileName }) => ({ id, name, fileName })),
    })
  );
  for (const [id, file] of pendingFiles) {
    form.append(`asset_${id}`, file);
  }

  const res = await fetch("/api/brand-kit", {
    method: "PUT",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to save brand kit");
  }
  const json = await res.json();
  const { library } = parseBrandKitApiBody(json);
  if (!library) {
    throw new Error("Failed to save brand kit");
  }
  dispatchBrandKitUpdated();
  return library;
}

export async function deleteBrandKitLibrary(): Promise<void> {
  const res = await fetch("/api/brand-kit", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to delete brand kit");
  }
  dispatchBrandKitUpdated();
}

/** Есть ли в форме хоть что-то кроме дефолтной типографики. */
export function isBrandKitUiStateFilled(state: ProjectBrandKitState): boolean {
  return Boolean(
    state.companyDescription.trim() ||
      state.slogan.trim() ||
      state.brandValues.trim() ||
      state.brandAesthetics.trim() ||
      state.colors.length > 0 ||
      state.logos.length > 0 ||
      state.images.length > 0
  );
}

function projectBrandKitPutPayload(state: ProjectBrandKitState) {
  const base = projectStateToManifest(state);
  return {
    ...base,
    toneOfVoice: "",
    brandbook: null as null,
    logos: state.logos.map(({ id, name, fileName }) => ({ id, name, fileName })),
    images: state.images.map(({ id, name, fileName }) => ({ id, name, fileName })),
  };
}

function dispatchProjectBrandKitUpdated(projectId: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PROJECT_BRAND_KIT_UPDATED_EVENT, { detail: { projectId } })
    );
  }
}

export async function fetchProjectBrandKit(
  projectId: string
): Promise<BrandKitGetResponse> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/brand-kit`, {
    credentials: "include",
  });
  if (res.status === 404) {
    return { library: null, state: null };
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to load project brand kit");
  }
  const json = await res.json();
  return parseBrandKitApiBody(json);
}

export async function saveProjectBrandKit(
  projectId: string,
  state: ProjectBrandKitState,
  pendingFiles: Map<string, File>
): Promise<ProjectBrandKitLibraryDto> {
  const form = new FormData();
  form.append("data", JSON.stringify(projectBrandKitPutPayload(state)));
  for (const [id, file] of pendingFiles) {
    form.append(`asset_${id}`, file);
  }

  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/brand-kit`, {
    method: "PUT",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to save project brand kit");
  }
  const json = await res.json();
  const { library } = parseBrandKitApiBody(json);
  if (!library) {
    throw new Error("Failed to save project brand kit");
  }
  dispatchProjectBrandKitUpdated(projectId);
  return library as unknown as ProjectBrandKitLibraryDto;
}

export async function deleteProjectBrandKit(projectId: string): Promise<void> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/brand-kit`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to delete project brand kit");
  }
  dispatchProjectBrandKitUpdated(projectId);
}

/** Сохраняет черновик бренда в проект после POST /api/projects (мастер создания). */
export async function persistBrandKitDraftToProject(
  projectId: string,
  state: ProjectBrandKitState,
  pendingFiles: Map<string, File>
): Promise<void> {
  if (!isBrandKitUiStateFilled(state) && pendingFiles.size === 0) return;
  await saveProjectBrandKit(projectId, state, pendingFiles);
}
