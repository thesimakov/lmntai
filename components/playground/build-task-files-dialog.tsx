"use client";

import { File, FileSearch, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type BuildTaskFilesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sandboxId: string | null;
};

export function BuildTaskFilesDialog({ open, onOpenChange, sandboxId }: BuildTaskFilesDialogProps) {
  const { t } = useI18n();
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sandboxId) return;
    setLoading(true);
    setError(null);
    setFiles(null);
    setActive(null);
    try {
      let res = await fetch("/api/sandbox?format=json", { credentials: "include" });
      if (res.status === 404) {
        res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}?format=json`, { credentials: "include" });
      }
      if (!res.ok) {
        if (res.status === 404) {
          setError(t("task_files_sandbox_error"));
        } else {
          setError(t("task_files_load_error"));
        }
        return;
      }
      const data = (await res.json()) as { files?: Record<string, string> };
      const f = data.files ?? {};
      setFiles(f);
      const keys = Object.keys(f);
      if (keys.length) setActive(keys[0] ?? null);
    } catch {
      setError(t("task_files_network_error"));
    } finally {
      setLoading(false);
    }
  }, [sandboxId, t]);

  useEffect(() => {
    if (open && sandboxId) {
      void load();
    }
  }, [open, sandboxId, load]);

  const names = files ? Object.keys(files).sort() : [];

  function downloadFile(name: string) {
    const text = files?.[name];
    if (text == null) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.split("/").pop() ?? name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,680px)] w-[min(100vw-1rem,600px)] flex-col gap-0 p-0 sm:max-w-[600px]">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 pb-3 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <FileSearch className="h-5 w-5 shrink-0 text-muted-foreground" />
            {t("task_files_title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t("task_files_subtitle")}</p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div
            className={cn(
              "flex max-h-[40vh] min-h-0 flex-col overflow-y-auto border-b border-border sm:max-h-none sm:w-[200px] sm:shrink-0 sm:border-b-0 sm:border-r"
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                {t("task_files_loading")}
              </div>
            ) : error ? (
              <p className="p-4 text-sm text-destructive">{error}</p>
            ) : names.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <File className="h-10 w-10 opacity-50" />
                <span>{t("task_files_empty")}</span>
              </div>
            ) : (
              <ul className="p-2">
                {names.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => setActive(name)}
                      className={cn(
                        "w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                        active === name && "bg-muted font-medium"
                      )}
                    >
                      <span className="line-clamp-2 break-all">{name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {active && files?.[active] != null ? (
              <>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <span className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={active}>
                    {active}
                  </span>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => downloadFile(active)}>
                    {t("task_files_download")}
                  </Button>
                </div>
                <pre className="m-0 max-h-[min(50vh,400px)] min-h-[120px] flex-1 overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed sm:max-h-[min(60vh,520px)]">
                  {files[active]}
                </pre>
              </>
            ) : !loading && !error && names.length > 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t("task_files_select")}</p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
