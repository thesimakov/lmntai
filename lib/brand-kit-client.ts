import type { ProjectBrandKitState } from "@/components/dashboard/project-brand-kit-fields";
import { projectStateToManifest } from "@/lib/brand-kit-library";
import type { BrandKitLibraryDto } from "@/lib/brand-kit-library";

export const BRAND_KIT_LIBRARY_UPDATED_EVENT = "lemnity:brand-kit-library-updated";

function dispatchBrandKitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BRAND_KIT_LIBRARY_UPDATED_EVENT));
  }
}

type BrandKitGetResponse = {
  library: BrandKitLibraryDto | null;
  state: ProjectBrandKitState | null;
};

export async function fetchBrandKitLibrary(): Promise<BrandKitGetResponse> {
  const res = await fetch("/api/brand-kit", { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to load brand kit");
  }
  const json = (await res.json()) as { data: BrandKitGetResponse };
  return json.data ?? { library: null, state: null };
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
  const json = (await res.json()) as { data: { library: BrandKitLibraryDto } };
  dispatchBrandKitUpdated();
  return json.data.library;
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
