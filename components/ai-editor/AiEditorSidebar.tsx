"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useBuildEditorStore, type ProjectSnapshotMeta } from "@/lib/stores/use-build-editor-store";
import { AiVersionList } from "./AiVersionList";
import { AiPromptInput } from "./AiPromptInput";

type Props = {
  projectName: string;
  projectId: string;
  isGenerating: boolean;
  modelLabel?: string;
  onSubmitPrompt: (prompt: string) => void;
  onVersionRestoreHtml: (html: string, css: string) => void;
  chatSlot?: React.ReactNode;
};

export function AiEditorSidebar({
  projectName,
  projectId,
  isGenerating,
  modelLabel,
  onSubmitPrompt,
  onVersionRestoreHtml,
  chatSlot,
}: Props) {
  const setCurrentVersionId = useBuildEditorStore((s) => s.setCurrentVersionId);

  const handleSelectVersion = useCallback(
    async (snapshot: ProjectSnapshotMeta) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/snapshots/${snapshot.id}`, { credentials: "include" });
        if (!res.ok) {
          toast.error("Не удалось загрузить версию");
          return;
        }
        const data = (await res.json()) as { snapshot: { sandboxHtml: string; sandboxCss: string } };
        setCurrentVersionId(snapshot.id);
        onVersionRestoreHtml(data.snapshot.sandboxHtml, data.snapshot.sandboxCss);
      } catch {
        toast.error("Ошибка при загрузке версии");
      }
    },
    [projectId, setCurrentVersionId, onVersionRestoreHtml],
  );

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="truncate text-[12px] font-semibold text-foreground">{projectName}</span>
      </div>

      <div className="flex flex-col overflow-hidden">
        <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Версии
        </p>
        <div className="max-h-[220px] overflow-y-auto">
          <AiVersionList onSelect={(v) => { void handleSelectVersion(v); }} disabled={isGenerating} />
        </div>
      </div>

      {chatSlot && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border">
          {chatSlot}
        </div>
      )}

      <AiPromptInput
        onSubmit={onSubmitPrompt}
        disabled={isGenerating}
        modelLabel={modelLabel}
      />
    </aside>
  );
}
