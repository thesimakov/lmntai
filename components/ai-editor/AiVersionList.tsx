"use client";

import { cn } from "@/lib/utils";
import { useBuildEditorStore, type ProjectSnapshotMeta } from "@/lib/stores/use-build-editor-store";
import { AiVersionDiffBadge } from "./AiVersionDiffBadge";

type Props = {
  onSelect: (snapshot: ProjectSnapshotMeta) => void;
  disabled?: boolean;
};

export function AiVersionList({ onSelect, disabled = false }: Props) {
  const versions = useBuildEditorStore((s) => s.versions);
  const currentVersionId = useBuildEditorStore((s) => s.currentVersionId);

  if (versions.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] text-muted-foreground">
        Версии появятся после первой генерации
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 px-2">
      {versions.map((v) => {
        const isActive = v.id === currentVersionId;
        return (
          <li key={v.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(v)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-[11px] transition-colors",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border border-blue-300 bg-blue-50 dark:bg-blue-950/40"
                  : "border border-transparent bg-transparent",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <AiVersionDiffBadge versionNum={v.versionNum} createdAt={v.createdAt} />
                {isActive && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    сейчас
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-foreground/80">{v.promptText}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
