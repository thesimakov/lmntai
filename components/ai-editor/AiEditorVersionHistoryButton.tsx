"use client";

import { useCallback, useState } from "react";
import { History } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { AiVersionList } from "@/components/ai-editor/AiVersionList";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useBuildEditorStore,
  type ProjectSnapshotMeta,
} from "@/lib/stores/use-build-editor-store";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  isGenerating: boolean;
  onVersionRestoreHtml: (html: string, css: string) => void;
};

export function AiEditorVersionHistoryButton({
  projectId,
  isGenerating,
  onVersionRestoreHtml,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const setCurrentVersionId = useBuildEditorStore((s) => s.setCurrentVersionId);
  const versions = useBuildEditorStore((s) => s.versions);
  const disabled = !projectId.trim();

  const handleSelectVersion = useCallback(
    async (snapshot: ProjectSnapshotMeta) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/snapshots/${snapshot.id}`);
        if (!res.ok) {
          toast.error("Не удалось загрузить версию");
          return;
        }
        const data = (await res.json()) as {
          snapshot: { sandboxHtml: string; sandboxCss: string };
        };
        setCurrentVersionId(snapshot.id);
        onVersionRestoreHtml(data.snapshot.sandboxHtml, data.snapshot.sandboxCss);
      } catch {
        toast.error("Ошибка при загрузке версии");
      }
    },
    [projectId, setCurrentVersionId, onVersionRestoreHtml],
  );

  const button = (
    <Button
      type="button"
      size="icon"
      variant="outline"
      disabled={disabled}
      className={cn("relative h-9 w-9 shrink-0 rounded-2xl")}
      aria-label={t("build_aria_preview_snapshots")}
    >
      <History className="h-4 w-4" />
      {versions.length > 0 ? (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground">
          {versions.length > 99 ? "99+" : versions.length}
        </span>
      ) : null}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{button}</PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          {t("build_preview_snapshots_tooltip")}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-64 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border/60 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("build_preview_snapshots_header")}
          </p>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-1">
          <AiVersionList
            onSelect={(v) => {
              void handleSelectVersion(v);
              setOpen(false);
            }}
            disabled={disabled || isGenerating}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
