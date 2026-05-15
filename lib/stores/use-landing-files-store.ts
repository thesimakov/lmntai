import { create } from "zustand";

export type LandingPendingFile = {
  id: string;
  file: File;
  kind: "image" | "video" | "file";
};

type LandingFilesStore = {
  pendingFiles: LandingPendingFile[];
  setPendingFiles: (files: LandingPendingFile[]) => void;
  clearPendingFiles: () => void;
};

export const useLandingFilesStore = create<LandingFilesStore>((set) => ({
  pendingFiles: [],
  setPendingFiles: (files) => set({ pendingFiles: files }),
  clearPendingFiles: () => set({ pendingFiles: [] }),
}));

export function fileToLandingPendingFile(file: File): LandingPendingFile {
  const mime = file.type;
  const kind: LandingPendingFile["kind"] = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
      ? "video"
      : "file";
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    kind,
  };
}
